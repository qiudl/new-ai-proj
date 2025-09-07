package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/go-redis/redis/v8"
)

// PermissionHierarchyManager manages the permission inheritance hierarchy
type PermissionHierarchyManager struct {
	db    *sql.DB
	cache *redis.Client
	ttl   time.Duration
}

// PermissionHierarchyNode represents a node in the permission hierarchy
type PermissionHierarchyNode struct {
	Level       PermissionLevel    `json:"level"`
	Priority    int                `json:"priority"`
	Subject     PermissionSubject  `json:"subject"`
	Permissions map[string]bool    `json:"permissions"`
	Children    []*PermissionHierarchyNode `json:"children,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// PermissionInheritance represents permission inheritance relationship
type PermissionInheritance struct {
	ParentLevel PermissionLevel   `json:"parent_level"`
	ParentID    int               `json:"parent_id"`
	ChildLevel  PermissionLevel   `json:"child_level"`
	ChildID     int               `json:"child_id"`
	PermissionCode string         `json:"permission_code"`
	InheritType InheritanceType   `json:"inherit_type"`
	IsActive    bool              `json:"is_active"`
	Conditions  map[string]interface{} `json:"conditions,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// Additional inheritance types for hierarchy management
const (
	InheritanceAllow    InheritanceType = "allow"    // Allow child to inherit permission
	InheritanceDeny     InheritanceType = "deny"     // Explicitly deny inheritance
	InheritanceDelegate InheritanceType = "delegate" // Delegate permission to child
)

// NewPermissionHierarchyManager creates a new permission hierarchy manager
func NewPermissionHierarchyManager(db *sql.DB, cache *redis.Client) *PermissionHierarchyManager {
	return &PermissionHierarchyManager{
		db:    db,
		cache: cache,
		ttl:   30 * time.Minute, // Default cache TTL
	}
}

// BuildPermissionHierarchy builds the complete permission hierarchy for a subject
func (h *PermissionHierarchyManager) BuildPermissionHierarchy(ctx context.Context, subject *PermissionSubject) (*PermissionHierarchyNode, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("permission_hierarchy:%s:%d", subject.Type, subject.ID)
	if h.cache != nil {
		cachedHierarchy, err := h.cache.Get(ctx, cacheKey).Result()
		if err == nil {
			var node PermissionHierarchyNode
			if err := json.Unmarshal([]byte(cachedHierarchy), &node); err == nil {
				log.Printf("[PERMISSION_HIERARCHY] Cache hit for subject %s:%d", subject.Type, subject.ID)
				return &node, nil
			}
		}
	}

	// Build hierarchy from database
	node, err := h.buildHierarchyNode(ctx, subject, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to build hierarchy for subject %s:%d: %w", subject.Type, subject.ID, err)
	}

	// Cache the result
	if h.cache != nil && node != nil {
		if hierarchyJSON, err := json.Marshal(node); err == nil {
			h.cache.Set(ctx, cacheKey, hierarchyJSON, h.ttl)
			log.Printf("[PERMISSION_HIERARCHY] Cached hierarchy for subject %s:%d", subject.Type, subject.ID)
		}
	}

	return node, nil
}

// buildHierarchyNode recursively builds a hierarchy node
func (h *PermissionHierarchyManager) buildHierarchyNode(ctx context.Context, subject *PermissionSubject, depth int) (*PermissionHierarchyNode, error) {
	if depth > 10 { // Prevent infinite recursion
		return nil, fmt.Errorf("maximum hierarchy depth exceeded for subject %s:%d", subject.Type, subject.ID)
	}

	level := h.getPermissionLevelFromSubjectType(subject.Type)
	node := &PermissionHierarchyNode{
		Level:       level,
		Priority:    h.getLevelPriority(level),
		Subject:     *subject,
		Permissions: make(map[string]bool),
		Children:    []*PermissionHierarchyNode{},
		Metadata:    make(map[string]interface{}),
	}

	// Load direct permissions for this subject
	permissions, err := h.loadSubjectPermissions(ctx, subject)
	if err != nil {
		log.Printf("[PERMISSION_HIERARCHY] Failed to load permissions for subject %s:%d: %v", subject.Type, subject.ID, err)
	} else {
		node.Permissions = permissions
	}

	// Load child relationships
	children, err := h.loadChildSubjects(ctx, subject)
	if err != nil {
		log.Printf("[PERMISSION_HIERARCHY] Failed to load child subjects for %s:%d: %v", subject.Type, subject.ID, err)
	} else {
		for _, child := range children {
			childNode, err := h.buildHierarchyNode(ctx, child, depth+1)
			if err != nil {
				log.Printf("[PERMISSION_HIERARCHY] Failed to build child node %s:%d: %v", child.Type, child.ID, err)
				continue
			}
			node.Children = append(node.Children, childNode)
		}
	}

	// Sort children by priority
	sort.Slice(node.Children, func(i, j int) bool {
		return node.Children[i].Priority > node.Children[j].Priority
	})

	// Add metadata
	node.Metadata["depth"] = depth
	node.Metadata["children_count"] = len(node.Children)
	node.Metadata["direct_permissions"] = len(permissions)

	return node, nil
}

// ResolvePermissionInheritance resolves permission through the inheritance hierarchy
func (h *PermissionHierarchyManager) ResolvePermissionInheritance(ctx context.Context, hierarchy *PermissionHierarchyNode, permissionCode string, object *PermissionObject) (*PermissionResolution, error) {
	resolution := &PermissionResolution{
		PermissionCode: permissionCode,
		Object:         object,
		Steps:          []PermissionResolutionStep{},
		FinalResult:    false,
		Source:         "none",
		Reason:         "no matching permission found",
	}

	// Traverse hierarchy depth-first, checking inheritance rules
	h.traverseForPermission(hierarchy, permissionCode, object, resolution, 0)

	return resolution, nil
}

// PermissionResolution represents the result of permission resolution through hierarchy
type PermissionResolution struct {
	PermissionCode string                      `json:"permission_code"`
	Object         *PermissionObject          `json:"object"`
	Steps          []PermissionResolutionStep `json:"steps"`
	FinalResult    bool                       `json:"final_result"`
	Source         string                     `json:"source"`
	Reason         string                     `json:"reason"`
}

// PermissionResolutionStep represents a step in permission resolution
type PermissionResolutionStep struct {
	Level         PermissionLevel      `json:"level"`
	Subject       PermissionSubject    `json:"subject"`
	HasPermission bool                 `json:"has_permission"`
	InheritType   InheritanceType      `json:"inherit_type"`
	Source        string               `json:"source"`
	Reason        string               `json:"reason"`
	IsOverride    bool                 `json:"is_override"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// traverseForPermission traverses the hierarchy looking for permission resolution
func (h *PermissionHierarchyManager) traverseForPermission(node *PermissionHierarchyNode, permissionCode string, object *PermissionObject, resolution *PermissionResolution, depth int) {
	// Check direct permission at current level
	if hasPermission, exists := node.Permissions[permissionCode]; exists {
		step := PermissionResolutionStep{
			Level:         node.Level,
			Subject:       node.Subject,
			HasPermission: hasPermission,
			InheritType:   InheritanceAllow,
			Source:        fmt.Sprintf("direct_%s_permission", node.Level),
			Reason:        fmt.Sprintf("Direct permission found at %s level", node.Level),
			IsOverride:    false,
			Metadata: map[string]interface{}{
				"depth": depth,
				"priority": node.Priority,
			},
		}
		resolution.Steps = append(resolution.Steps, step)

		if hasPermission {
			resolution.FinalResult = true
			resolution.Source = step.Source
			resolution.Reason = step.Reason
			return // Found explicit grant, stop traversing
		}
	}

	// Check inheritance from children (higher priority first)
	for _, child := range node.Children {
		// Check if inheritance is allowed
		inheritanceRules, err := h.loadInheritanceRules(context.Background(), &node.Subject, &child.Subject, permissionCode)
		if err != nil {
			log.Printf("[PERMISSION_HIERARCHY] Failed to load inheritance rules: %v", err)
			continue
		}

		// Apply inheritance rules
		canInherit := true
		inheritType := InheritanceAllow
		
		for _, rule := range inheritanceRules {
			if rule.InheritType == InheritanceDeny {
				canInherit = false
				inheritType = InheritanceDeny
				break
			}
			if rule.InheritType == InheritanceOverride {
				inheritType = InheritanceOverride
			}
		}

		if canInherit {
			// Recursively check child hierarchy
			h.traverseForPermission(child, permissionCode, object, resolution, depth+1)
		}

		// Record inheritance step
		step := PermissionResolutionStep{
			Level:         child.Level,
			Subject:       child.Subject,
			HasPermission: canInherit && resolution.FinalResult,
			InheritType:   inheritType,
			Source:        fmt.Sprintf("inherited_from_%s", child.Level),
			Reason:        fmt.Sprintf("Permission inherited from %s level", child.Level),
			IsOverride:    inheritType == InheritanceOverride,
			Metadata: map[string]interface{}{
				"depth":        depth + 1,
				"can_inherit":  canInherit,
				"child_result": resolution.FinalResult,
			},
		}
		resolution.Steps = append(resolution.Steps, step)

		if resolution.FinalResult && canInherit {
			return // Found inherited permission
		}
	}
}

// InvalidateHierarchyCache invalidates cached hierarchy for a subject
func (h *PermissionHierarchyManager) InvalidateHierarchyCache(ctx context.Context, subject *PermissionSubject) error {
	if h.cache == nil {
		return nil
	}

	cacheKey := fmt.Sprintf("permission_hierarchy:%s:%d", subject.Type, subject.ID)
	return h.cache.Del(ctx, cacheKey).Err()
}

// GetHierarchyStats returns statistics about the permission hierarchy
func (h *PermissionHierarchyManager) GetHierarchyStats(ctx context.Context, hierarchy *PermissionHierarchyNode) *HierarchyStats {
	stats := &HierarchyStats{
		TotalNodes:       0,
		MaxDepth:         0,
		TotalPermissions: 0,
		LevelCounts:      make(map[PermissionLevel]int),
	}

	h.calculateHierarchyStats(hierarchy, stats, 0)
	return stats
}

// HierarchyStats contains statistics about a permission hierarchy
type HierarchyStats struct {
	TotalNodes       int                        `json:"total_nodes"`
	MaxDepth         int                        `json:"max_depth"`
	TotalPermissions int                        `json:"total_permissions"`
	LevelCounts      map[PermissionLevel]int    `json:"level_counts"`
}

// calculateHierarchyStats recursively calculates hierarchy statistics
func (h *PermissionHierarchyManager) calculateHierarchyStats(node *PermissionHierarchyNode, stats *HierarchyStats, depth int) {
	stats.TotalNodes++
	stats.TotalPermissions += len(node.Permissions)
	stats.LevelCounts[node.Level]++
	
	if depth > stats.MaxDepth {
		stats.MaxDepth = depth
	}

	for _, child := range node.Children {
		h.calculateHierarchyStats(child, stats, depth+1)
	}
}

// Helper methods for hierarchy management

func (h *PermissionHierarchyManager) getPermissionLevelFromSubjectType(subjectType SubjectType) PermissionLevel {
	switch subjectType {
	case SubjectSystemUser:
		return LevelSystem
	case SubjectEnterpriseUser:
		return LevelEnterprise
	case SubjectAPIKey:
		return LevelSystem
	case SubjectServiceAccount:
		return LevelSystem
	default:
		return LevelUser
	}
}

func (h *PermissionHierarchyManager) getLevelPriority(level PermissionLevel) int {
	priorities := map[PermissionLevel]int{
		LevelSystem:     1000,
		LevelEnterprise: 900,
		LevelDepartment: 800,
		LevelPosition:   700,
		LevelProject:    600,
		LevelUser:       500,
		LevelDelegated:  400,
		LevelPolicy:     300,
	}
	return priorities[level]
}

func (h *PermissionHierarchyManager) loadSubjectPermissions(ctx context.Context, subject *PermissionSubject) (map[string]bool, error) {
	// This would load permissions from the database based on subject type
	// For now, return empty map - to be implemented based on actual database schema
	permissions := make(map[string]bool)
	
	// TODO: Implement actual database queries based on subject type
	switch subject.Type {
	case SubjectSystemUser:
		// Load system user permissions
	case SubjectEnterpriseUser:
		// Load enterprise user permissions
	case SubjectAPIKey:
		// Load API key permissions
	case SubjectServiceAccount:
		// Load service account permissions
	}
	
	return permissions, nil
}

func (h *PermissionHierarchyManager) loadChildSubjects(ctx context.Context, subject *PermissionSubject) ([]*PermissionSubject, error) {
	// This would load child subjects based on hierarchy relationships
	// For now, return empty slice - to be implemented based on actual database schema
	children := []*PermissionSubject{}
	
	// TODO: Implement actual database queries to find child subjects
	// This would vary based on the subject type and organizational structure
	
	return children, nil
}

func (h *PermissionHierarchyManager) loadInheritanceRules(ctx context.Context, parent *PermissionSubject, child *PermissionSubject, permissionCode string) ([]*PermissionInheritance, error) {
	// This would load inheritance rules from the database
	// For now, return default allow rules - to be implemented
	rules := []*PermissionInheritance{
		{
			ParentLevel:    h.getPermissionLevelFromSubjectType(parent.Type),
			ParentID:       parent.ID,
			ChildLevel:     h.getPermissionLevelFromSubjectType(child.Type),
			ChildID:        child.ID,
			PermissionCode: permissionCode,
			InheritType:    InheritanceAllow,
			IsActive:       true,
		},
	}
	
	return rules, nil
}