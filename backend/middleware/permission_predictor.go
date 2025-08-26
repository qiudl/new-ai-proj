package middleware

import (
	"ai-project-backend/database"
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"
)

// PermissionPredictor predicts permissions based on user patterns and role analysis
type PermissionPredictor struct {
	permissionRepo database.PermissionRepository
	userPatterns   map[int][]string // User ID -> frequently used permissions
	rolePatterns   map[string][]string // Role code -> common permissions
	lastUpdate     time.Time
	updateInterval time.Duration
}

// PermissionPattern represents a permission usage pattern
type PermissionPattern struct {
	PermissionCode string  `json:"permission_code"`
	Frequency      float64 `json:"frequency"`
	LastUsed       time.Time `json:"last_used"`
	UserCount      int     `json:"user_count"`
}

// UserPermissionProfile represents a user's permission usage profile
type UserPermissionProfile struct {
	CompanyUserID      int                 `json:"company_user_id"`
	RoleCode           string              `json:"role_code"`
	FrequentPermissions []PermissionPattern `json:"frequent_permissions"`
	PredictedPermissions []string           `json:"predicted_permissions"`
	LastAnalyzed       time.Time           `json:"last_analyzed"`
	AccuracyScore      float64             `json:"accuracy_score"`
}

// PermissionPredictionConfig configures the permission predictor
type PermissionPredictionConfig struct {
	PermissionRepo database.PermissionRepository
	UpdateInterval time.Duration // How often to refresh patterns
	MinFrequency   float64       // Minimum frequency to consider a pattern
	MaxPredictions int           // Maximum number of predictions per user
}

// NewPermissionPredictor creates a new permission predictor
func NewPermissionPredictor(config *PermissionPredictionConfig) *PermissionPredictor {
	if config.UpdateInterval == 0 {
		config.UpdateInterval = 1 * time.Hour // Default update interval
	}
	if config.MinFrequency == 0 {
		config.MinFrequency = 0.1 // Default 10% frequency threshold
	}
	if config.MaxPredictions == 0 {
		config.MaxPredictions = 20 // Default max predictions
	}

	predictor := &PermissionPredictor{
		permissionRepo: config.PermissionRepo,
		userPatterns:   make(map[int][]string),
		rolePatterns:   make(map[string][]string),
		updateInterval: config.UpdateInterval,
	}

	// Start background pattern analysis
	go predictor.startPatternAnalysis()

	return predictor
}

// startPatternAnalysis runs periodic pattern analysis
func (p *PermissionPredictor) startPatternAnalysis() {
	ticker := time.NewTicker(p.updateInterval)
	defer ticker.Stop()

	// Initial analysis
	ctx := context.Background()
	if err := p.analyzePermissionPatterns(ctx); err != nil {
		log.Printf("[PERMISSION_PREDICTOR] Initial pattern analysis failed: %v", err)
	}

	// Periodic updates
	for range ticker.C {
		if err := p.analyzePermissionPatterns(ctx); err != nil {
			log.Printf("[PERMISSION_PREDICTOR] Pattern analysis failed: %v", err)
		}
	}
}

// analyzePermissionPatterns analyzes permission usage patterns from audit logs
func (p *PermissionPredictor) analyzePermissionPatterns(ctx context.Context) error {
	log.Println("[PERMISSION_PREDICTOR] Starting permission pattern analysis...")

	// This is a simplified implementation. In a real system, you would:
	// 1. Analyze audit logs to find permission usage patterns
	// 2. Group permissions by role and user
	// 3. Calculate frequency and correlation scores
	// 4. Update prediction models

	// For now, we'll create some basic patterns based on common role permissions
	if err := p.updateRoleBasedPatterns(ctx); err != nil {
		return fmt.Errorf("failed to update role patterns: %w", err)
	}

	p.lastUpdate = time.Now()
	log.Printf("[PERMISSION_PREDICTOR] Pattern analysis completed at %v", p.lastUpdate)

	return nil
}

// updateRoleBasedPatterns updates role-based permission patterns
func (p *PermissionPredictor) updateRoleBasedPatterns(ctx context.Context) error {
	// Get all roles
	roles, err := p.permissionRepo.GetRoles(ctx, nil)
	if err != nil {
		return err
	}

	// Analyze patterns for each role
	for _, role := range roles {
		patterns, err := p.analyzeRolePermissions(ctx, role.RoleCode)
		if err != nil {
			log.Printf("[PERMISSION_PREDICTOR] Failed to analyze role %s: %v", role.RoleCode, err)
			continue
		}
		p.rolePatterns[role.RoleCode] = patterns
	}

	return nil
}

// analyzeRolePermissions analyzes common permissions for a role
func (p *PermissionPredictor) analyzeRolePermissions(ctx context.Context, roleCode string) ([]string, error) {
	// This is a simplified implementation
	// In practice, you would analyze actual usage patterns from audit logs

	commonPatterns := map[string][]string{
		"company_admin": {
			"project.list.read", "project.detail.read", "project.create", "project.update",
			"task.create", "task.update", "task.delete", "task.assign",
			"company.users.create", "company.users.update", "company.users.read",
			"finance.contracts.read", "project.members.manage",
		},
		"project_manager": {
			"project.list.read", "project.detail.read", "project.update",
			"task.create", "task.update", "task.assign",
			"project.members.manage", "task.list.read",
		},
		"developer": {
			"project.list.read", "project.detail.read",
			"task.list.read", "task.update", "task.create",
		},
		"viewer": {
			"project.list.read", "project.detail.read",
			"task.list.read",
		},
	}

	if patterns, exists := commonPatterns[roleCode]; exists {
		return patterns, nil
	}

	// Default pattern for unknown roles
	return []string{"project.list.read", "task.list.read"}, nil
}

// PredictUserPermissions predicts permissions a user is likely to need
func (p *PermissionPredictor) PredictUserPermissions(ctx context.Context, companyUserID int) ([]string, error) {
	// Get user's role
	userPermissions, err := p.permissionRepo.GetUserPermissions(ctx, companyUserID)
	if err != nil {
		return nil, err
	}

	var roleCode string
	if userPermissions.Role != nil {
		roleCode = userPermissions.Role.RoleCode
	}

	// Start with role-based predictions
	predictions := make([]string, 0)
	if patterns, exists := p.rolePatterns[roleCode]; exists {
		predictions = append(predictions, patterns...)
	}

	// Add user-specific patterns if available
	if userPatterns, exists := p.userPatterns[companyUserID]; exists {
		predictions = append(predictions, userPatterns...)
	}

	// Remove duplicates and limit results
	predictions = p.deduplicateAndLimit(predictions, 20)

	log.Printf("[PERMISSION_PREDICTOR] Predicted %d permissions for user %d (role: %s)", 
		len(predictions), companyUserID, roleCode)

	return predictions, nil
}

// GetUserPermissionProfile creates a detailed permission profile for a user
func (p *PermissionPredictor) GetUserPermissionProfile(ctx context.Context, companyUserID int) (*UserPermissionProfile, error) {
	// Get user permissions
	userPermissions, err := p.permissionRepo.GetUserPermissions(ctx, companyUserID)
	if err != nil {
		return nil, err
	}

	var roleCode string
	if userPermissions.Role != nil {
		roleCode = userPermissions.Role.RoleCode
	}

	// Get predictions
	predicted, err := p.PredictUserPermissions(ctx, companyUserID)
	if err != nil {
		return nil, err
	}

	// Create frequency patterns (simplified - in practice you'd analyze actual usage)
	frequentPatterns := make([]PermissionPattern, 0)
	for i, perm := range predicted {
		frequency := 1.0 - (float64(i) * 0.1) // Decreasing frequency
		if frequency < 0.1 {
			frequency = 0.1
		}

		pattern := PermissionPattern{
			PermissionCode: perm,
			Frequency:      frequency,
			LastUsed:       time.Now().Add(-time.Duration(i) * time.Hour),
			UserCount:      10 - i, // Simulated user count
		}
		frequentPatterns = append(frequentPatterns, pattern)
	}

	profile := &UserPermissionProfile{
		CompanyUserID:       companyUserID,
		RoleCode:           roleCode,
		FrequentPermissions: frequentPatterns,
		PredictedPermissions: predicted,
		LastAnalyzed:       time.Now(),
		AccuracyScore:      0.85, // Simulated accuracy score
	}

	return profile, nil
}

// PrewarmPermissionCache preloads predicted permissions into cache
func (p *PermissionPredictor) PrewarmPermissionCache(ctx context.Context, cacheMiddleware *PermissionCacheMiddleware, companyUserID int) error {
	if cacheMiddleware == nil {
		return fmt.Errorf("cache middleware not available")
	}

	// Get predicted permissions
	predictions, err := p.PredictUserPermissions(ctx, companyUserID)
	if err != nil {
		return err
	}

	// Preload permissions into cache
	preloadCount := 0
	for _, permissionCode := range predictions {
		// Check permission and cache result
		result, err := cacheMiddleware.CheckCachedPermission(ctx, companyUserID, permissionCode, nil)
		if err != nil {
			log.Printf("[PERMISSION_PREDICTOR] Failed to preload permission %s for user %d: %v", 
				permissionCode, companyUserID, err)
			continue
		}

		if result != nil {
			preloadCount++
		}
	}

	log.Printf("[PERMISSION_PREDICTOR] Prewarmed %d permissions for user %d", preloadCount, companyUserID)
	return nil
}

// AnalyzePermissionCorrelations analyzes correlations between permissions
func (p *PermissionPredictor) AnalyzePermissionCorrelations(ctx context.Context) (map[string][]string, error) {
	correlations := make(map[string][]string)

	// Define some common permission correlations
	// In practice, this would be derived from usage pattern analysis
	commonCorrelations := map[string][]string{
		"project.detail.read": {"task.list.read", "project.list.read"},
		"task.create": {"task.list.read", "project.detail.read", "task.update"},
		"task.update": {"task.list.read", "project.detail.read"},
		"task.delete": {"task.update", "task.list.read", "project.detail.read"},
		"project.create": {"project.list.read", "project.update", "task.create"},
		"project.update": {"project.detail.read", "project.list.read", "task.update"},
		"project.members.manage": {"project.detail.read", "company.users.read"},
	}

	// Copy correlations
	for perm, correlated := range commonCorrelations {
		correlations[perm] = make([]string, len(correlated))
		copy(correlations[perm], correlated)
	}

	return correlations, nil
}

// GetPermissionRecommendations provides permission recommendations for a user
func (p *PermissionPredictor) GetPermissionRecommendations(ctx context.Context, companyUserID int) ([]string, error) {
	// Get current user permissions
	userPermissions, err := p.permissionRepo.GetUserPermissions(ctx, companyUserID)
	if err != nil {
		return nil, err
	}

	// Get predictions
	predictions, err := p.PredictUserPermissions(ctx, companyUserID)
	if err != nil {
		return nil, err
	}

	// Get correlations
	correlations, err := p.AnalyzePermissionCorrelations(ctx)
	if err != nil {
		return nil, err
	}

	recommendedSet := make(map[string]bool)

	// Add base predictions
	for _, perm := range predictions {
		recommendedSet[perm] = true
	}

	// Add correlated permissions
	for _, perm := range predictions {
		if correlated, exists := correlations[perm]; exists {
			for _, correlatedPerm := range correlated {
				recommendedSet[correlatedPerm] = true
			}
		}
	}

	// Convert to slice and limit
	recommendations := make([]string, 0, len(recommendedSet))
	for perm := range recommendedSet {
		recommendations = append(recommendations, perm)
	}

	// Sort for consistency
	sort.Strings(recommendations)

	// Limit results
	if len(recommendations) > 25 {
		recommendations = recommendations[:25]
	}

	return recommendations, nil
}

// UpdateUserPattern updates a user's permission usage pattern
func (p *PermissionPredictor) UpdateUserPattern(companyUserID int, permissionCode string) {
	// This would typically be called when a user successfully uses a permission
	if _, exists := p.userPatterns[companyUserID]; !exists {
		p.userPatterns[companyUserID] = make([]string, 0)
	}

	patterns := p.userPatterns[companyUserID]
	
	// Check if permission already exists
	exists := false
	for _, existingPerm := range patterns {
		if existingPerm == permissionCode {
			exists = true
			break
		}
	}

	// Add to patterns if not exists
	if !exists {
		p.userPatterns[companyUserID] = append(patterns, permissionCode)
		
		// Limit pattern size
		if len(p.userPatterns[companyUserID]) > 50 {
			p.userPatterns[companyUserID] = p.userPatterns[companyUserID][1:] // Remove oldest
		}
	}
}

// GetPredictorStats returns statistics about the permission predictor
func (p *PermissionPredictor) GetPredictorStats() map[string]interface{} {
	userPatternCount := len(p.userPatterns)
	rolePatternCount := len(p.rolePatterns)
	
	totalUserPermissions := 0
	for _, patterns := range p.userPatterns {
		totalUserPermissions += len(patterns)
	}

	totalRolePermissions := 0
	for _, patterns := range p.rolePatterns {
		totalRolePermissions += len(patterns)
	}

	return map[string]interface{}{
		"user_pattern_count":      userPatternCount,
		"role_pattern_count":      rolePatternCount,
		"total_user_permissions":  totalUserPermissions,
		"total_role_permissions":  totalRolePermissions,
		"last_update":            p.lastUpdate,
		"update_interval_minutes": p.updateInterval.Minutes(),
	}
}

// deduplicateAndLimit removes duplicates and limits the slice size
func (p *PermissionPredictor) deduplicateAndLimit(permissions []string, limit int) []string {
	seen := make(map[string]bool)
	result := make([]string, 0)

	for _, perm := range permissions {
		if !seen[perm] {
			seen[perm] = true
			result = append(result, perm)
			
			if len(result) >= limit {
				break
			}
		}
	}

	return result
}

// ValidatePredictionAccuracy validates the accuracy of predictions against actual usage
func (p *PermissionPredictor) ValidatePredictionAccuracy(ctx context.Context, companyUserID int, actualPermissions []string) float64 {
	predictions, err := p.PredictUserPermissions(ctx, companyUserID)
	if err != nil {
		return 0.0
	}

	if len(predictions) == 0 || len(actualPermissions) == 0 {
		return 0.0
	}

	// Calculate accuracy using Jaccard similarity
	predictionSet := make(map[string]bool)
	for _, perm := range predictions {
		predictionSet[perm] = true
	}

	actualSet := make(map[string]bool)
	for _, perm := range actualPermissions {
		actualSet[perm] = true
	}

	// Calculate intersection
	intersection := 0
	for perm := range predictionSet {
		if actualSet[perm] {
			intersection++
		}
	}

	// Calculate union
	union := len(predictionSet)
	for perm := range actualSet {
		if !predictionSet[perm] {
			union++
		}
	}

	if union == 0 {
		return 0.0
	}

	accuracy := float64(intersection) / float64(union)
	
	log.Printf("[PERMISSION_PREDICTOR] Prediction accuracy for user %d: %.2f (intersection: %d, union: %d)", 
		companyUserID, accuracy, intersection, union)

	return accuracy
}

// GetMostUsedPermissions returns the most frequently used permissions across all users
func (p *PermissionPredictor) GetMostUsedPermissions() []PermissionPattern {
	permissionCounts := make(map[string]int)
	
	// Count permissions across all user patterns
	for _, patterns := range p.userPatterns {
		for _, perm := range patterns {
			permissionCounts[perm]++
		}
	}

	// Count permissions across all role patterns
	for _, patterns := range p.rolePatterns {
		for _, perm := range patterns {
			permissionCounts[perm] += 5 // Weight role patterns higher
		}
	}

	// Convert to PermissionPattern slice
	patterns := make([]PermissionPattern, 0)
	totalCount := 0
	for _, count := range permissionCounts {
		totalCount += count
	}

	for perm, count := range permissionCounts {
		frequency := float64(count) / float64(totalCount)
		pattern := PermissionPattern{
			PermissionCode: perm,
			Frequency:      frequency,
			UserCount:      count,
			LastUsed:       time.Now(), // Simplified
		}
		patterns = append(patterns, pattern)
	}

	// Sort by frequency (descending)
	sort.Slice(patterns, func(i, j int) bool {
		return patterns[i].Frequency > patterns[j].Frequency
	})

	// Limit to top 50
	if len(patterns) > 50 {
		patterns = patterns[:50]
	}

	return patterns
}

// OptimizeCacheStrategy suggests cache optimization based on permission patterns
func (p *PermissionPredictor) OptimizeCacheStrategy(ctx context.Context) map[string]interface{} {
	mostUsed := p.GetMostUsedPermissions()
	
	// Suggest high-priority permissions for aggressive caching
	highPriority := make([]string, 0)
	mediumPriority := make([]string, 0)
	
	for i, pattern := range mostUsed {
		if i < 10 && pattern.Frequency > 0.1 {
			highPriority = append(highPriority, pattern.PermissionCode)
		} else if i < 25 && pattern.Frequency > 0.05 {
			mediumPriority = append(mediumPriority, pattern.PermissionCode)
		}
	}

	recommendations := map[string]interface{}{
		"high_priority_cache": highPriority,
		"medium_priority_cache": mediumPriority,
		"suggested_ttl": map[string]interface{}{
			"high_priority_minutes":   30, // Cache high-priority permissions longer
			"medium_priority_minutes": 15,
			"default_minutes":         5,
		},
		"preload_recommendations": highPriority[:min(len(highPriority), 5)],
	}

	return recommendations
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
