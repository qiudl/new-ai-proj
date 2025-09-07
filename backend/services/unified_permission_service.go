package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

// UnifiedPermissionService provides centralized permission management
// Integrates enterprise users, system users, and legacy permission systems
type UnifiedPermissionService struct {
	db    *sql.DB
	cache *redis.Client
	
	// Configuration
	config *PermissionServiceConfig
	
	// Sub-services for different permission sources
	// These will be implemented later
	// enterprisePermissions *EnterprisePermissionService  
	// systemPermissions     *SystemPermissionService
	// legacyPermissions     *LegacyPermissionService
	
	// Permission calculators for different inheritance levels
	calculators      map[PermissionLevel]PermissionCalculator
	hierarchyManager *PermissionHierarchyManager
	optimizer        *PermissionOptimizer
}

// PermissionServiceConfig configures the unified permission service
type PermissionServiceConfig struct {
	// Cache configuration
	CacheEnabled         bool          `json:"cache_enabled"`
	CacheTTL            time.Duration `json:"cache_ttl"`
	CacheKeyPrefix      string        `json:"cache_key_prefix"`
	
	// Performance tuning
	MaxInheritanceDepth int           `json:"max_inheritance_depth"`
	BatchCheckLimit     int           `json:"batch_check_limit"`
	
	// Feature flags
	EnableAuditLogging  bool          `json:"enable_audit_logging"`
	EnableRiskAnalysis  bool          `json:"enable_risk_analysis"`
	EnableDelegation    bool          `json:"enable_delegation"`
}

// ============================================================================
// UNIFIED PERMISSION MODEL
// ============================================================================

// PermissionSubject represents any entity that can have permissions
type PermissionSubject struct {
	Type       SubjectType            `json:"type"`        // system_user, enterprise_user, api_key
	ID         int                    `json:"id"`          // Primary ID
	Context    map[string]interface{} `json:"context"`     // Additional context
	
	// Enterprise-specific fields
	EnterpriseID   *int `json:"enterprise_id,omitempty"`
	DepartmentID   *int `json:"department_id,omitempty"`
	PositionID     *int `json:"position_id,omitempty"`
	AccessLevel    *int `json:"access_level,omitempty"`
}

// PermissionObject represents any resource that can be protected
type PermissionObject struct {
	Type       UnifiedResourceType    `json:"type"`        // system, enterprise, project, task, document
	ID         *int                   `json:"id"`          // Resource ID (optional for type-level permissions)
	Context    map[string]interface{} `json:"context"`     // Additional context
	
	// Hierarchy information
	ParentType *UnifiedResourceType `json:"parent_type,omitempty"`
	ParentID   *int                 `json:"parent_id,omitempty"`
}

// PermissionLevel represents the inheritance hierarchy level
type PermissionLevel string

const (
	LevelSystem     PermissionLevel = "system"     // System-wide permissions
	LevelEnterprise PermissionLevel = "enterprise" // Enterprise-level permissions
	LevelDepartment PermissionLevel = "department" // Department-level permissions
	LevelPosition   PermissionLevel = "position"   // Position/Role-level permissions
	LevelProject    PermissionLevel = "project"    // Project-specific permissions
	LevelUser       PermissionLevel = "user"       // User-specific overrides
	LevelDelegated  PermissionLevel = "delegated"  // Delegated permissions
	LevelPolicy     PermissionLevel = "policy"     // Policy-based permissions
)

// SubjectType represents different types of permission subjects
type SubjectType string

const (
	SubjectSystemUser     SubjectType = "system_user"
	SubjectEnterpriseUser SubjectType = "enterprise_user"
	SubjectAPIKey         SubjectType = "api_key"
	SubjectServiceAccount SubjectType = "service_account"
)

// UnifiedResourceType represents different types of resources in unified model
type UnifiedResourceType string

const (
	UnifiedResourceSystem     UnifiedResourceType = "system"
	UnifiedResourceEnterprise UnifiedResourceType = "enterprise"
	UnifiedResourceDepartment UnifiedResourceType = "department"
	UnifiedResourceProject    UnifiedResourceType = "project"
	UnifiedResourceTask       UnifiedResourceType = "task"
	UnifiedResourceDocument   UnifiedResourceType = "document"
	UnifiedResourceUser       UnifiedResourceType = "user"
	UnifiedResourceReport     UnifiedResourceType = "report"
	UnifiedResourceAPIKey     UnifiedResourceType = "api_key"
)

// UnifiedPermissionAction represents actions that can be performed
type UnifiedPermissionAction string

const (
	UnifiedActionRead     UnifiedPermissionAction = "read"
	UnifiedActionCreate   UnifiedPermissionAction = "create"
	UnifiedActionUpdate   UnifiedPermissionAction = "update"
	UnifiedActionDelete   UnifiedPermissionAction = "delete"
	UnifiedActionManage   UnifiedPermissionAction = "manage"
	UnifiedActionAssign   UnifiedPermissionAction = "assign"
	UnifiedActionExecute  UnifiedPermissionAction = "execute"
	UnifiedActionApprove  UnifiedPermissionAction = "approve"
	UnifiedActionExport   UnifiedPermissionAction = "export"
	UnifiedActionImport   UnifiedPermissionAction = "import"
	UnifiedActionShare    UnifiedPermissionAction = "share"
	UnifiedActionDelegate UnifiedPermissionAction = "delegate"
)

// PermissionCheck represents a permission check request
type PermissionCheck struct {
	Subject    PermissionSubject        `json:"subject"`
	Object     PermissionObject         `json:"object"`
	Action     UnifiedPermissionAction  `json:"action"`
	Context    map[string]interface{}   `json:"context,omitempty"`
	
	// Request metadata
	RequestID  string    `json:"request_id,omitempty"`
	RequestedAt time.Time `json:"requested_at"`
	ClientIP   string    `json:"client_ip,omitempty"`
	UserAgent  string    `json:"user_agent,omitempty"`
}

// PermissionResult represents the result of a permission check
type PermissionResult struct {
	Granted     bool                   `json:"granted"`
	Source      PermissionLevel        `json:"source"`
	Reason      string                 `json:"reason"`
	Evidence    []PermissionEvidence   `json:"evidence"`
	
	// Performance metrics
	CheckDuration time.Duration        `json:"check_duration"`
	CacheHit      bool                 `json:"cache_hit"`
	
	// Risk and compliance
	RiskScore     *int                 `json:"risk_score,omitempty"`
	ComplianceFlags []string           `json:"compliance_flags,omitempty"`
	
	// Audit information
	CheckedAt     time.Time            `json:"checked_at"`
	CheckedBy     string               `json:"checked_by"` // Service identifier
}

// PermissionEvidence represents evidence supporting the permission decision
type PermissionEvidence struct {
	Level       PermissionLevel        `json:"level"`
	Source      string                 `json:"source"`
	RuleID      *string                `json:"rule_id,omitempty"`
	Granted     bool                   `json:"granted"`
	Priority    int                    `json:"priority"`
	Conditions  map[string]interface{} `json:"conditions,omitempty"`
	ExpiresAt   *time.Time            `json:"expires_at,omitempty"`
}

// ============================================================================
// PERMISSION CALCULATOR INTERFACE
// ============================================================================

// PermissionCalculator defines interface for permission calculation at different levels
type PermissionCalculator interface {
	// Calculate checks permission at this specific level
	Calculate(ctx context.Context, check *PermissionCheck) (*PermissionResult, error)
	
	// GetPriority returns the priority of this calculator (higher = more important)
	GetPriority() int
	
	// GetLevel returns the permission level this calculator handles
	GetLevel() PermissionLevel
	
	// SupportsSubject checks if this calculator supports the given subject type
	SupportsSubject(subjectType SubjectType) bool
}

// ============================================================================
// INHERITANCE HIERARCHY MANAGEMENT
// ============================================================================

// InheritanceRule defines how permissions inherit between levels
type InheritanceRule struct {
	ID             int                    `json:"id"`
	FromLevel      PermissionLevel        `json:"from_level"`
	ToLevel        PermissionLevel        `json:"to_level"`
	InheritanceType InheritanceType       `json:"inheritance_type"`
	Conditions     map[string]interface{} `json:"conditions,omitempty"`
	Priority       int                    `json:"priority"`
	IsActive       bool                   `json:"is_active"`
}

// InheritanceType defines how permissions are inherited
type InheritanceType string

const (
	InheritanceAdditive    InheritanceType = "additive"    // Permissions are added
	InheritanceOverride    InheritanceType = "override"    // Lower level overrides higher
	InheritanceRestrictive InheritanceType = "restrictive" // Only intersection is granted
	InheritanceConditional InheritanceType = "conditional" // Based on conditions
)

// ============================================================================
// CORE SERVICE METHODS
// ============================================================================

// NewUnifiedPermissionService creates a new unified permission service
func NewUnifiedPermissionService(db *sql.DB, cache *redis.Client, config *PermissionServiceConfig) *UnifiedPermissionService {
	if config == nil {
		config = &PermissionServiceConfig{
			CacheEnabled:        true,
			CacheTTL:           15 * time.Minute,
			CacheKeyPrefix:     "unified_perm:",
			MaxInheritanceDepth: 10,
			BatchCheckLimit:     100,
			EnableAuditLogging:  true,
			EnableRiskAnalysis:  false,
			EnableDelegation:    false,
		}
	}
	
	service := &UnifiedPermissionService{
		db:               db,
		cache:            cache,
		config:           config,
		calculators:      make(map[PermissionLevel]PermissionCalculator),
		hierarchyManager: NewPermissionHierarchyManager(db, cache),
		optimizer:        NewPermissionOptimizer(cache, &OptimizerConfig{
			CacheEnabled:           config.CacheEnabled,
			CacheTTL:              config.CacheTTL,
			BatchProcessingEnabled: true,
			MaxBatchSize:          config.BatchCheckLimit,
		}),
	}
	
	// Initialize sub-services (TODO: implement these services later)
	// service.enterprisePermissions = NewEnterprisePermissionService(db, cache)
	// service.systemPermissions = NewSystemPermissionService(db, cache)  
	// service.legacyPermissions = NewLegacyPermissionService(db, cache)
	
	// Register permission calculators
	service.registerCalculators()
	
	return service
}

// CheckPermission checks if a subject has permission to perform an action on an object
func (s *UnifiedPermissionService) CheckPermission(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	// Validate input
	if err := s.validatePermissionCheck(check); err != nil {
		return nil, fmt.Errorf("invalid permission check: %w", err)
	}
	
	// Set request metadata
	if check.RequestedAt.IsZero() {
		check.RequestedAt = time.Now()
	}
	
	// Use optimizer for improved performance
	return s.optimizer.OptimizePermissionCheck(ctx, check, s.performRawPermissionCheck)
}

// performRawPermissionCheck performs the actual permission check without caching/optimization
func (s *UnifiedPermissionService) performRawPermissionCheck(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	startTime := time.Now()
	
	// Perform permission calculation
	result, err := s.calculatePermission(ctx, check)
	if err != nil {
		return nil, err
	}
	
	// Set performance metrics
	result.CheckDuration = time.Since(startTime)
	result.CacheHit = false
	result.CheckedAt = startTime
	result.CheckedBy = "unified_permission_service"
	
	// Audit logging
	if s.config.EnableAuditLogging {
		go s.logPermissionCheck(ctx, check, result)
	}
	
	return result, nil
}

// CheckMultiplePermissions checks multiple permissions in a single call
func (s *UnifiedPermissionService) CheckMultiplePermissions(ctx context.Context, checks []*PermissionCheck) ([]*PermissionResult, error) {
	if len(checks) > s.config.BatchCheckLimit {
		return nil, fmt.Errorf("batch check limit exceeded: %d > %d", len(checks), s.config.BatchCheckLimit)
	}
	
	results := make([]*PermissionResult, len(checks))
	
	// Process checks in parallel for better performance
	type checkResult struct {
		index  int
		result *PermissionResult
		err    error
	}
	
	resultChan := make(chan checkResult, len(checks))
	
	for i, check := range checks {
		go func(idx int, c *PermissionCheck) {
			result, err := s.CheckPermission(ctx, c)
			resultChan <- checkResult{index: idx, result: result, err: err}
		}(i, check)
	}
	
	// Collect results
	for i := 0; i < len(checks); i++ {
		res := <-resultChan
		if res.err != nil {
			return nil, fmt.Errorf("check %d failed: %w", res.index, res.err)
		}
		results[res.index] = res.result
	}
	
	return results, nil
}

// GetEffectivePermissions returns all effective permissions for a subject
func (s *UnifiedPermissionService) GetEffectivePermissions(ctx context.Context, subject *PermissionSubject) ([]string, error) {
	// Implementation will collect all permissions from different levels
	// and return the final effective set
	
	// This is a complex operation that will:
	// 1. Get all role-based permissions
	// 2. Get all custom overrides
	// 3. Get all project-specific permissions
	// 4. Apply inheritance rules
	// 5. Return the final effective set
	
	return nil, fmt.Errorf("not implemented yet")
}

// ============================================================================
// PRIVATE HELPER METHODS
// ============================================================================

// calculatePermission performs the actual permission calculation using the hierarchy
func (s *UnifiedPermissionService) calculatePermission(ctx context.Context, check *PermissionCheck) (*PermissionResult, error) {
	evidence := []PermissionEvidence{}
	finalSource := LevelSystem
	
	// Get ordered list of calculators by priority
	calculators := s.getOrderedCalculators()
	
	// Check each level in order
	for _, calc := range calculators {
		if !calc.SupportsSubject(check.Subject.Type) {
			continue
		}
		
		result, err := calc.Calculate(ctx, check)
		if err != nil {
			continue // Log error but continue with other calculators
		}
		
		if result != nil && len(result.Evidence) > 0 {
			evidence = append(evidence, result.Evidence...)
			
			// Update final result based on priority and inheritance rules
			if result.Granted {
				finalSource = calc.GetLevel()
			}
		}
	}
	
	// Apply inheritance rules to determine final result
	finalResult := s.applyInheritanceRules(evidence)
	
	return &PermissionResult{
		Granted:  finalResult,
		Source:   finalSource,
		Reason:   s.buildReasonString(evidence, finalResult),
		Evidence: evidence,
	}, nil
}

// registerCalculators registers all permission calculators
func (s *UnifiedPermissionService) registerCalculators() {
	// Register calculators for each permission level
	s.calculators[LevelSystem] = NewSystemPermissionCalculator(s.db, s.cache)
	s.calculators[LevelEnterprise] = NewEnterprisePermissionCalculator(s.db, s.cache)
	s.calculators[LevelDepartment] = NewDepartmentPermissionCalculator(s.db, s.cache)
	s.calculators[LevelPosition] = NewPositionPermissionCalculator(s.db, s.cache)
	s.calculators[LevelProject] = NewProjectPermissionCalculator(s.db, s.cache)
	s.calculators[LevelUser] = NewUserPermissionCalculator(s.db, s.cache)
	
	if s.config.EnableDelegation {
		s.calculators[LevelDelegated] = NewDelegatedPermissionCalculator(s.db, s.cache)
	}
	
	if s.config.EnableRiskAnalysis {
		s.calculators[LevelPolicy] = NewPolicyPermissionCalculator(s.db, s.cache)
	}
}

// getOrderedCalculators returns calculators ordered by priority
func (s *UnifiedPermissionService) getOrderedCalculators() []PermissionCalculator {
	calculators := make([]PermissionCalculator, 0, len(s.calculators))
	for _, calc := range s.calculators {
		calculators = append(calculators, calc)
	}
	
	// Sort by priority (higher priority first)
	// Implementation depends on sorting algorithm
	
	return calculators
}

// validatePermissionCheck validates the permission check request
func (s *UnifiedPermissionService) validatePermissionCheck(check *PermissionCheck) error {
	if check == nil {
		return fmt.Errorf("permission check is nil")
	}
	
	if check.Subject.Type == "" || check.Subject.ID == 0 {
		return fmt.Errorf("invalid subject")
	}
	
	if check.Object.Type == "" {
		return fmt.Errorf("invalid object")
	}
	
	if check.Action == "" {
		return fmt.Errorf("invalid action")
	}
	
	return nil
}

// getCachedResult retrieves permission result from cache
func (s *UnifiedPermissionService) getCachedResult(ctx context.Context, check *PermissionCheck) (*PermissionResult, bool) {
	key := s.buildCacheKey(check)
	
	data, err := s.cache.Get(ctx, key).Result()
	if err != nil {
		return nil, false
	}
	
	var result PermissionResult
	if err := json.Unmarshal([]byte(data), &result); err != nil {
		return nil, false
	}
	
	return &result, true
}

// setCachedResult stores permission result in cache
func (s *UnifiedPermissionService) setCachedResult(ctx context.Context, check *PermissionCheck, result *PermissionResult) {
	key := s.buildCacheKey(check)
	
	data, err := json.Marshal(result)
	if err != nil {
		return
	}
	
	s.cache.Set(ctx, key, data, s.config.CacheTTL)
}

// buildCacheKey builds a cache key for the permission check
func (s *UnifiedPermissionService) buildCacheKey(check *PermissionCheck) string {
	return fmt.Sprintf("%s%s:%d:%s:%s:%s",
		s.config.CacheKeyPrefix,
		check.Subject.Type,
		check.Subject.ID,
		check.Object.Type,
		check.Action,
		s.hashContext(check.Context),
	)
}

// hashContext creates a hash of the context for cache key
func (s *UnifiedPermissionService) hashContext(context map[string]interface{}) string {
	// Simple hash implementation for context
	// In production, use a proper hash function
	if len(context) == 0 {
		return "empty"
	}
	return "context_hash"
}

// applyInheritanceRules applies inheritance rules to determine final permission
func (s *UnifiedPermissionService) applyInheritanceRules(evidence []PermissionEvidence) bool {
	// Implementation of inheritance rule application
	// This is where the complex logic of permission inheritance happens
	
	// For now, simple logic: if any evidence grants permission, grant it
	for _, ev := range evidence {
		if ev.Granted {
			return true
		}
	}
	
	return false
}

// buildReasonString builds a human-readable reason for the permission decision
func (s *UnifiedPermissionService) buildReasonString(evidence []PermissionEvidence, granted bool) string {
	if granted {
		return "Permission granted by inheritance rules"
	}
	return "Permission denied - no matching grants found"
}

// logPermissionCheck logs the permission check for audit purposes
func (s *UnifiedPermissionService) logPermissionCheck(ctx context.Context, check *PermissionCheck, result *PermissionResult) {
	// Implementation of audit logging
	// This should be asynchronous and not affect performance
}