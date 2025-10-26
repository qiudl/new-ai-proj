package services

import (
	"ai-project-backend/database"
	"ai-project-backend/utils"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// SystemAdminService handles business logic for system administrator management
type SystemAdminService struct {
	repo  *database.SystemAdminRepository
	cache *utils.TaskQueryCache
}

// NewSystemAdminService creates a new system admin service
func NewSystemAdminService(db *sql.DB) *SystemAdminService {
	return &SystemAdminService{
		repo:  database.NewSystemAdminRepository(db),
		cache: utils.NewTaskQueryCache(5 * time.Minute), // 5 minutes TTL
	}
}

// CheckSystemAdmin checks if a user is a system administrator
// Returns admin info if the user is an admin, or error if not
func (s *SystemAdminService) CheckSystemAdmin(ctx context.Context, userID int) (*database.SystemAdminInfo, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("system_admin:user:%d", userID)
	if cached, found := s.cache.Get(cacheKey); found {
		if adminInfo, ok := cached.(*database.SystemAdminInfo); ok {
			return adminInfo, nil
		}
	}

	// Fetch from database
	adminInfo, err := s.repo.GetSystemAdminByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Verify admin status
	if !adminInfo.IsSystemAdmin {
		return nil, fmt.Errorf("user %d is not a system administrator", userID)
	}

	// Check if admin is deactivated
	if adminInfo.AdminDeactivatedAt != nil {
		return nil, fmt.Errorf("system admin privileges have been deactivated")
	}

	// Cache the result
	s.cache.Set(cacheKey, adminInfo)

	return adminInfo, nil
}

// CheckSystemAdminByUsername checks system admin by username
func (s *SystemAdminService) CheckSystemAdminByUsername(ctx context.Context, username string) (*database.SystemAdminInfo, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("system_admin:username:%s", username)
	if cached, found := s.cache.Get(cacheKey); found {
		if adminInfo, ok := cached.(*database.SystemAdminInfo); ok {
			return adminInfo, nil
		}
	}

	// Fetch from database
	adminInfo, err := s.repo.GetSystemAdminByUsername(ctx, username)
	if err != nil {
		return nil, err
	}

	// Verify admin status
	if !adminInfo.IsSystemAdmin {
		return nil, fmt.Errorf("user %s is not a system administrator", username)
	}

	// Check if admin is deactivated
	if adminInfo.AdminDeactivatedAt != nil {
		return nil, fmt.Errorf("system admin privileges have been deactivated")
	}

	// Cache the result
	s.cache.Set(cacheKey, adminInfo)

	return adminInfo, nil
}

// ListSystemAdmins retrieves all active system administrators
func (s *SystemAdminService) ListSystemAdmins(ctx context.Context, filters database.SystemAdminFilters) ([]*database.SystemAdminInfo, error) {
	return s.repo.ListSystemAdmins(ctx, filters)
}

// GrantSystemAdmin grants system administrator privileges to a user
func (s *SystemAdminService) GrantSystemAdmin(ctx context.Context, req *GrantSystemAdminRequest) error {
	// Validate request
	if err := s.validateGrantRequest(req); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	// Prepare repository request
	repoReq := &database.GrantSystemAdminRequest{
		TargetUserID:     req.TargetUserID,
		AdminLevel:       req.AdminLevel,
		AdminScopes:      req.AdminScopes,
		SystemRoleID:     req.SystemRoleID,
		Notes:            req.Notes,
		OperatorUserID:   req.OperatorUserID,
		OperatorUsername: req.OperatorUsername,
	}

	// Grant privileges
	if err := s.repo.GrantSystemAdmin(ctx, repoReq); err != nil {
		return err
	}

	// Invalidate cache
	s.invalidateAdminCache(req.TargetUserID)

	return nil
}

// GrantSystemAdminRequest represents request to grant system admin privileges
type GrantSystemAdminRequest struct {
	TargetUserID     int                    `json:"target_user_id"`
	AdminLevel       int                    `json:"admin_level"`
	ScopeType        string                 `json:"scope_type"` // "global" or "scoped"
	ProjectIDs       []string               `json:"project_ids,omitempty"`
	Permissions      []string               `json:"permissions,omitempty"`
	AdminScopes      map[string]interface{} `json:"admin_scopes"`
	SystemRoleID     *int                   `json:"system_role_id,omitempty"`
	Notes            string                 `json:"notes"`
	OperatorUserID   int                    `json:"operator_user_id"`
	OperatorUsername string                 `json:"operator_username"`
}

// validateGrantRequest validates grant system admin request
func (s *SystemAdminService) validateGrantRequest(req *GrantSystemAdminRequest) error {
	// Validate admin level (1-10, where 1 is superadmin)
	if req.AdminLevel < 1 || req.AdminLevel > 10 {
		return fmt.Errorf("admin_level must be between 1 and 10")
	}

	// Level 1 (superadmin) can only be granted by another Level 1
	if req.AdminLevel == 1 {
		operatorInfo, err := s.repo.GetSystemAdminByUserID(context.Background(), req.OperatorUserID)
		if err != nil || operatorInfo.AdminLevel != 1 {
			return fmt.Errorf("only Level 1 superadmins can grant Level 1 privileges")
		}
	}

	// Validate scope configuration
	if req.AdminScopes == nil || len(req.AdminScopes) == 0 {
		return fmt.Errorf("admin_scopes cannot be empty")
	}

	return nil
}

// RevokeSystemAdmin revokes system administrator privileges from a user
func (s *SystemAdminService) RevokeSystemAdmin(ctx context.Context, req *RevokeSystemAdminRequest) error {
	// Validate request
	if req.TargetUserID <= 0 {
		return fmt.Errorf("invalid target_user_id")
	}

	if req.Reason == "" {
		return fmt.Errorf("reason is required for revoking system admin privileges")
	}

	// Check if target is Level 1 (superadmin) - they cannot be revoked except by themselves
	targetInfo, err := s.repo.GetSystemAdminByUserID(ctx, req.TargetUserID)
	if err != nil {
		return fmt.Errorf("failed to get target user info: %w", err)
	}

	if targetInfo.AdminLevel == 1 && req.TargetUserID != req.OperatorUserID {
		return fmt.Errorf("Level 1 superadmin privileges can only be revoked by the user themselves")
	}

	// Prepare repository request
	repoReq := &database.RevokeSystemAdminRequest{
		TargetUserID:     req.TargetUserID,
		Reason:           req.Reason,
		OperatorUserID:   req.OperatorUserID,
		OperatorUsername: req.OperatorUsername,
	}

	// Revoke privileges
	if err := s.repo.RevokeSystemAdmin(ctx, repoReq); err != nil {
		return err
	}

	// Invalidate cache
	s.invalidateAdminCache(req.TargetUserID)

	return nil
}

// RevokeSystemAdminRequest represents request to revoke system admin privileges
type RevokeSystemAdminRequest struct {
	TargetUserID     int    `json:"target_user_id"`
	Reason           string `json:"reason"`
	OperatorUserID   int    `json:"operator_user_id"`
	OperatorUsername string `json:"operator_username"`
}

// CheckScopePermission checks if an admin has permission for a specific resource
func (s *SystemAdminService) CheckScopePermission(
	ctx context.Context,
	adminInfo *database.SystemAdminInfo,
	resourceType string,
	resourceID int,
	requiredPermission string,
) (bool, error) {
	// Level 1 (superadmin) has all permissions
	if adminInfo.AdminLevel == 1 {
		return true, nil
	}

	// Check if global scope
	if globalScope, ok := adminInfo.AdminScopes["global_scope"].(bool); ok && globalScope {
		return true, nil
	}

	// Check scoped permissions
	scopes, ok := adminInfo.AdminScopes["scopes"].([]interface{})
	if !ok || len(scopes) == 0 {
		return false, nil
	}

	for _, scopeInterface := range scopes {
		scope, ok := scopeInterface.(map[string]interface{})
		if !ok {
			continue
		}

		// Check resource type
		scopeType, ok := scope["type"].(string)
		if !ok || scopeType != resourceType {
			continue
		}

		// Check resource IDs
		resourceIDs, ok := scope["resource_ids"].([]interface{})
		if !ok {
			continue
		}

		// Check if resource ID is in the list
		resourceIDStr := fmt.Sprintf("%d", resourceID)
		hasResourceID := false
		for _, idInterface := range resourceIDs {
			idStr, ok := idInterface.(string)
			if ok && idStr == resourceIDStr {
				hasResourceID = true
				break
			}
		}

		if !hasResourceID {
			continue
		}

		// Check permissions
		permissions, ok := scope["permissions"].([]interface{})
		if !ok {
			continue
		}

		for _, permInterface := range permissions {
			perm, ok := permInterface.(string)
			if ok && perm == requiredPermission {
				return true, nil
			}
		}
	}

	return false, nil
}

// GetAccessibleProjects returns list of project IDs that the admin can access
func (s *SystemAdminService) GetAccessibleProjects(ctx context.Context, adminInfo *database.SystemAdminInfo) ([]int, error) {
	// Level 1 or global scope - can access all projects
	if adminInfo.AdminLevel == 1 {
		return []int{}, nil // Empty array means "all projects"
	}

	if globalScope, ok := adminInfo.AdminScopes["global_scope"].(bool); ok && globalScope {
		return []int{}, nil // Empty array means "all projects"
	}

	// Extract project IDs from scoped permissions
	projectIDs := []int{}
	scopes, ok := adminInfo.AdminScopes["scopes"].([]interface{})
	if !ok {
		return projectIDs, nil
	}

	for _, scopeInterface := range scopes {
		scope, ok := scopeInterface.(map[string]interface{})
		if !ok {
			continue
		}

		// Check if this is a project scope
		scopeType, ok := scope["type"].(string)
		if !ok || scopeType != "project" {
			continue
		}

		// Extract resource IDs
		resourceIDs, ok := scope["resource_ids"].([]interface{})
		if !ok {
			continue
		}

		for _, idInterface := range resourceIDs {
			idStr, ok := idInterface.(string)
			if !ok {
				continue
			}

			var projectID int
			fmt.Sscanf(idStr, "%d", &projectID)
			if projectID > 0 {
				projectIDs = append(projectIDs, projectID)
			}
		}
	}

	return projectIDs, nil
}

// GetAuditLogs retrieves audit logs
func (s *SystemAdminService) GetAuditLogs(ctx context.Context, filters database.AuditLogFilters) ([]*database.AuditLogRecord, int, error) {
	return s.repo.GetAuditLogs(ctx, filters)
}

// invalidateAdminCache invalidates cache entries for a specific admin
func (s *SystemAdminService) invalidateAdminCache(userID int) {
	cacheKey := fmt.Sprintf("system_admin:user:%d", userID)
	s.cache.Delete(cacheKey)
}

// GrantScopedAdmin is a helper method to grant scoped admin with specific projects
func (s *SystemAdminService) GrantScopedAdmin(ctx context.Context, req *GrantScopedAdminRequest) error {
	// Build admin_scopes from request
	adminScopes := map[string]interface{}{}

	if req.ScopeType == "global" {
		adminScopes["global_scope"] = true
		adminScopes["scopes"] = []interface{}{}
	} else {
		adminScopes["global_scope"] = false

		// Build project scope
		projectScope := map[string]interface{}{
			"type":         "project",
			"resource_ids": req.ProjectIDs,
			"permissions":  req.Permissions,
		}

		adminScopes["scopes"] = []interface{}{projectScope}
	}

	// Grant admin
	grantReq := &GrantSystemAdminRequest{
		TargetUserID:     req.TargetUserID,
		AdminLevel:       req.AdminLevel,
		AdminScopes:      adminScopes,
		SystemRoleID:     req.SystemRoleID,
		Notes:            req.Notes,
		OperatorUserID:   req.OperatorUserID,
		OperatorUsername: req.OperatorUsername,
	}

	return s.GrantSystemAdmin(ctx, grantReq)
}

// GrantScopedAdminRequest represents request to grant scoped admin
type GrantScopedAdminRequest struct {
	TargetUserID     int      `json:"target_user_id"`
	AdminLevel       int      `json:"admin_level"`
	ScopeType        string   `json:"scope_type"` // "global" or "projects"
	ProjectIDs       []string `json:"project_ids,omitempty"`
	Permissions      []string `json:"permissions"`
	SystemRoleID     *int     `json:"system_role_id,omitempty"`
	Notes            string   `json:"notes"`
	OperatorUserID   int      `json:"operator_user_id"`
	OperatorUsername string   `json:"operator_username"`
}

// IsSystemAdminActive checks if a user is an active system administrator (cached)
func (s *SystemAdminService) IsSystemAdminActive(ctx context.Context, userID int) bool {
	adminInfo, err := s.CheckSystemAdmin(ctx, userID)
	if err != nil {
		return false
	}

	return adminInfo.IsSystemAdmin && adminInfo.AdminDeactivatedAt == nil
}

// CheckAdminLevel checks if an admin has sufficient level
func (s *SystemAdminService) CheckAdminLevel(ctx context.Context, userID int, requiredLevel int) bool {
	adminInfo, err := s.CheckSystemAdmin(ctx, userID)
	if err != nil {
		return false
	}

	// Lower number = higher level (1 is superadmin)
	return adminInfo.AdminLevel <= requiredLevel
}

// CompareAdminLevels compares two admin levels
// Returns true if adminA has higher or equal level than adminB
func CompareAdminLevels(levelA, levelB int) bool {
	return levelA <= levelB
}

// GetAdminLevelName returns human-readable name for admin level
func GetAdminLevelName(level int) string {
	switch level {
	case 1:
		return "Level 1 - 超级管理员 (SuperAdmin)"
	case 2:
		return "Level 2 - 系统管理员 (System Admin)"
	case 3:
		return "Level 3 - 系统操作员 (System Operator)"
	case 4:
		return "Level 4 - 系统审计员 (System Auditor)"
	case 5:
		return "Level 5 - 系统支持员 (System Support)"
	default:
		return fmt.Sprintf("Level %d - 自定义级别", level)
	}
}

// ValidateAdminScopes validates the format of admin_scopes
func ValidateAdminScopes(scopes map[string]interface{}) error {
	// Check if global_scope exists
	if _, ok := scopes["global_scope"]; !ok {
		return fmt.Errorf("admin_scopes must have 'global_scope' field")
	}

	// Check if scopes array exists
	scopesArray, ok := scopes["scopes"]
	if !ok {
		return fmt.Errorf("admin_scopes must have 'scopes' array")
	}

	// Validate scopes array
	if scopesArray != nil {
		scopesList, ok := scopesArray.([]interface{})
		if !ok {
			return fmt.Errorf("'scopes' must be an array")
		}

		for i, scopeInterface := range scopesList {
			scope, ok := scopeInterface.(map[string]interface{})
			if !ok {
				return fmt.Errorf("scope at index %d is not an object", i)
			}

			// Validate required fields
			if _, ok := scope["type"]; !ok {
				return fmt.Errorf("scope at index %d missing 'type' field", i)
			}

			if _, ok := scope["resource_ids"]; !ok {
				return fmt.Errorf("scope at index %d missing 'resource_ids' field", i)
			}

			if _, ok := scope["permissions"]; !ok {
				return fmt.Errorf("scope at index %d missing 'permissions' field", i)
			}
		}
	}

	return nil
}

// FormatAdminScopeSummary formats admin scope for display
func FormatAdminScopeSummary(scopes map[string]interface{}) string {
	if globalScope, ok := scopes["global_scope"].(bool); ok && globalScope {
		return "全局权限 - 可访问所有项目"
	}

	scopesArray, ok := scopes["scopes"].([]interface{})
	if !ok || len(scopesArray) == 0 {
		return "无权限范围"
	}

	var parts []string
	for _, scopeInterface := range scopesArray {
		scope, ok := scopeInterface.(map[string]interface{})
		if !ok {
			continue
		}

		scopeType, _ := scope["type"].(string)
		resourceIDs, _ := scope["resource_ids"].([]interface{})

		parts = append(parts, fmt.Sprintf("%s: %d个资源", scopeType, len(resourceIDs)))
	}

	return strings.Join(parts, "; ")
}
