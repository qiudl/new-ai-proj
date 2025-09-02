package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"ai-project-backend/models"
)

// PermissionService provides core permission management functionality
type PermissionService struct {
	db *sql.DB
}

// NewPermissionService creates a new permission service instance
func NewPermissionService(db *sql.DB) *PermissionService {
	return &PermissionService{
		db: db,
	}
}

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

// Role types enumeration
type RoleType string

const (
	RoleTypeSystemAdmin    RoleType = "system_admin"
	RoleTypeCompanyAdmin   RoleType = "company_admin"
	RoleTypeProjectManager RoleType = "project_manager"
	RoleTypeDeveloper      RoleType = "developer"
	RoleTypeProductManager RoleType = "product_manager"
	RoleTypeQAEngineer     RoleType = "qa_engineer"
	RoleTypeDesigner       RoleType = "designer"
	RoleTypeViewer         RoleType = "viewer"
	RoleTypeGuest          RoleType = "guest"
)

// Permission categories enumeration
type PermissionCategory string

const (
	CategorySystem   PermissionCategory = "system"
	CategoryCompany  PermissionCategory = "company"
	CategoryProject  PermissionCategory = "project"
	CategoryTask     PermissionCategory = "task"
	CategoryDocument PermissionCategory = "document"
	CategoryUser     PermissionCategory = "user"
	CategoryReport   PermissionCategory = "report"
	CategoryFinance  PermissionCategory = "finance"
	CategorySecurity PermissionCategory = "security"
)

// Resource types enumeration
type ResourceType string

const (
	ResourceSystem   ResourceType = "system"
	ResourceCompany  ResourceType = "company"
	ResourceProject  ResourceType = "project"
	ResourceTask     ResourceType = "task"
	ResourceDocument ResourceType = "document"
	ResourceUser     ResourceType = "user"
	ResourceTimer    ResourceType = "timer"
	ResourceReport   ResourceType = "report"
	ResourceApiKey   ResourceType = "api_key"
)

// Permission actions enumeration
type PermissionAction string

const (
	ActionRead    PermissionAction = "read"
	ActionCreate  PermissionAction = "create"
	ActionUpdate  PermissionAction = "update"
	ActionDelete  PermissionAction = "delete"
	ActionManage  PermissionAction = "manage"
	ActionAssign  PermissionAction = "assign"
	ActionExecute PermissionAction = "execute"
	ActionExport  PermissionAction = "export"
	ActionImport  PermissionAction = "import"
	ActionShare   PermissionAction = "share"
)

// Permission scope enumeration
type PermissionScope string

const (
	ScopeGlobal  PermissionScope = "global"  // System-wide permission
	ScopeCompany PermissionScope = "company" // Company-level permission
	ScopeProject PermissionScope = "project" // Project-level permission
	ScopeOwner   PermissionScope = "owner"   // Owner-only permission
)

// ============================================================================
// CORE PERMISSION STRUCTURES
// ============================================================================

// PermissionDefinition represents a complete permission definition
type PermissionDefinition struct {
	Code        string             `json:"code"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    PermissionCategory `json:"category"`
	Resource    ResourceType       `json:"resource"`
	Action      PermissionAction   `json:"action"`
	Scope       PermissionScope    `json:"scope"`
	IsSystem    bool               `json:"is_system"`
	IsActive    bool               `json:"is_active"`
}

// UserPermissionContext contains all context needed for permission checking
type UserPermissionContext struct {
	UserID        int                    `json:"user_id"`
	CompanyUserID *int                   `json:"company_user_id,omitempty"`
	CompanyID     *int                   `json:"company_id,omitempty"`
	ProjectID     *int                   `json:"project_id,omitempty"`
	ResourceID    *int                   `json:"resource_id,omitempty"`
	ResourceType  ResourceType           `json:"resource_type"`
	Action        PermissionAction       `json:"action"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

// PermissionCheckResult represents the result of a permission check
type PermissionCheckResult struct {
	HasPermission bool                   `json:"has_permission"`
	Source        string                 `json:"source"` // role, custom, project, delegation, policy
	Reason        string                 `json:"reason"`
	Context       map[string]interface{} `json:"context,omitempty"`
	CheckedAt     time.Time              `json:"checked_at"`
}

// ============================================================================
// PREDEFINED PERMISSIONS
// ============================================================================

// GetSystemPermissions returns all system-defined permissions
func (s *PermissionService) GetSystemPermissions() []PermissionDefinition {
	return []PermissionDefinition{
		// System permissions
		{
			Code: "system.admin", Name: "系统管理", Description: "完整的系统管理权限",
			Category: CategorySystem, Resource: ResourceSystem, Action: ActionManage, Scope: ScopeGlobal, IsSystem: true,
		},
		{
			Code: "system.config", Name: "系统配置", Description: "修改系统配置",
			Category: CategorySystem, Resource: ResourceSystem, Action: ActionUpdate, Scope: ScopeGlobal, IsSystem: true,
		},
		{
			Code: "system.audit", Name: "审计日志", Description: "查看系统审计日志",
			Category: CategorySecurity, Resource: ResourceSystem, Action: ActionRead, Scope: ScopeGlobal, IsSystem: true,
		},

		// Company permissions
		{
			Code: "company.read", Name: "查看企业", Description: "查看企业信息",
			Category: CategoryCompany, Resource: ResourceCompany, Action: ActionRead, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "company.update", Name: "编辑企业", Description: "编辑企业信息",
			Category: CategoryCompany, Resource: ResourceCompany, Action: ActionUpdate, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "company.manage", Name: "管理企业", Description: "完整的企业管理权限",
			Category: CategoryCompany, Resource: ResourceCompany, Action: ActionManage, Scope: ScopeCompany, IsSystem: false,
		},

		// User management permissions
		{
			Code: "user.read", Name: "查看用户", Description: "查看用户信息",
			Category: CategoryUser, Resource: ResourceUser, Action: ActionRead, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "user.create", Name: "创建用户", Description: "创建新用户",
			Category: CategoryUser, Resource: ResourceUser, Action: ActionCreate, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "user.update", Name: "编辑用户", Description: "编辑用户信息",
			Category: CategoryUser, Resource: ResourceUser, Action: ActionUpdate, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "user.delete", Name: "删除用户", Description: "删除用户",
			Category: CategoryUser, Resource: ResourceUser, Action: ActionDelete, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "user.manage", Name: "管理用户", Description: "完整的用户管理权限",
			Category: CategoryUser, Resource: ResourceUser, Action: ActionManage, Scope: ScopeCompany, IsSystem: false,
		},

		// Project permissions
		{
			Code: "project.read", Name: "查看项目", Description: "查看项目信息",
			Category: CategoryProject, Resource: ResourceProject, Action: ActionRead, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "project.create", Name: "创建项目", Description: "创建新项目",
			Category: CategoryProject, Resource: ResourceProject, Action: ActionCreate, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "project.update", Name: "编辑项目", Description: "编辑项目信息",
			Category: CategoryProject, Resource: ResourceProject, Action: ActionUpdate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "project.delete", Name: "删除项目", Description: "删除项目",
			Category: CategoryProject, Resource: ResourceProject, Action: ActionDelete, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "project.manage", Name: "管理项目", Description: "完整的项目管理权限",
			Category: CategoryProject, Resource: ResourceProject, Action: ActionManage, Scope: ScopeProject, IsSystem: false,
		},

		// Task permissions
		{
			Code: "task.read", Name: "查看任务", Description: "查看任务信息",
			Category: CategoryTask, Resource: ResourceTask, Action: ActionRead, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "task.create", Name: "创建任务", Description: "创建新任务",
			Category: CategoryTask, Resource: ResourceTask, Action: ActionCreate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "task.update", Name: "编辑任务", Description: "编辑任务信息",
			Category: CategoryTask, Resource: ResourceTask, Action: ActionUpdate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "task.delete", Name: "删除任务", Description: "删除任务",
			Category: CategoryTask, Resource: ResourceTask, Action: ActionDelete, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "task.assign", Name: "分配任务", Description: "分配任务给用户",
			Category: CategoryTask, Resource: ResourceTask, Action: ActionAssign, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "task.execute", Name: "执行任务", Description: "执行和完成任务",
			Category: CategoryTask, Resource: ResourceTask, Action: ActionExecute, Scope: ScopeProject, IsSystem: false,
		},

		// Document permissions
		{
			Code: "document.read", Name: "查看文档", Description: "查看文档内容",
			Category: CategoryDocument, Resource: ResourceDocument, Action: ActionRead, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "document.create", Name: "创建文档", Description: "创建新文档",
			Category: CategoryDocument, Resource: ResourceDocument, Action: ActionCreate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "document.update", Name: "编辑文档", Description: "编辑文档内容",
			Category: CategoryDocument, Resource: ResourceDocument, Action: ActionUpdate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "document.delete", Name: "删除文档", Description: "删除文档",
			Category: CategoryDocument, Resource: ResourceDocument, Action: ActionDelete, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "document.share", Name: "分享文档", Description: "分享文档给其他用户",
			Category: CategoryDocument, Resource: ResourceDocument, Action: ActionShare, Scope: ScopeProject, IsSystem: false,
		},

		// Timer permissions
		{
			Code: "timer.read", Name: "查看计时", Description: "查看计时记录",
			Category: CategoryTask, Resource: ResourceTimer, Action: ActionRead, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "timer.create", Name: "开始计时", Description: "开始计时",
			Category: CategoryTask, Resource: ResourceTimer, Action: ActionCreate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "timer.update", Name: "编辑计时", Description: "编辑计时记录",
			Category: CategoryTask, Resource: ResourceTimer, Action: ActionUpdate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "timer.delete", Name: "删除计时", Description: "删除计时记录",
			Category: CategoryTask, Resource: ResourceTimer, Action: ActionDelete, Scope: ScopeProject, IsSystem: false,
		},

		// Report permissions
		{
			Code: "report.read", Name: "查看报告", Description: "查看各类报告",
			Category: CategoryReport, Resource: ResourceReport, Action: ActionRead, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "report.generate", Name: "生成报告", Description: "生成各类报告",
			Category: CategoryReport, Resource: ResourceReport, Action: ActionCreate, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "report.export", Name: "导出报告", Description: "导出报告数据",
			Category: CategoryReport, Resource: ResourceReport, Action: ActionExport, Scope: ScopeProject, IsSystem: false,
		},

		// Finance permissions
		{
			Code: "finance.read", Name: "查看财务", Description: "查看财务信息",
			Category: CategoryFinance, Resource: ResourceProject, Action: ActionRead, Scope: ScopeProject, IsSystem: false,
		},
		{
			Code: "finance.manage", Name: "管理财务", Description: "管理财务信息",
			Category: CategoryFinance, Resource: ResourceProject, Action: ActionManage, Scope: ScopeProject, IsSystem: false,
		},

		// API Key permissions
		{
			Code: "apikey.read", Name: "查看API密钥", Description: "查看API密钥",
			Category: CategorySecurity, Resource: ResourceApiKey, Action: ActionRead, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "apikey.create", Name: "创建API密钥", Description: "创建新的API密钥",
			Category: CategorySecurity, Resource: ResourceApiKey, Action: ActionCreate, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "apikey.delete", Name: "删除API密钥", Description: "删除API密钥",
			Category: CategorySecurity, Resource: ResourceApiKey, Action: ActionDelete, Scope: ScopeCompany, IsSystem: false,
		},
	}
}

// ============================================================================
// PREDEFINED ROLE TEMPLATES
// ============================================================================

// GetRoleTemplates returns predefined role templates with their permissions
func (s *PermissionService) GetRoleTemplates() map[RoleType][]string {
	return map[RoleType][]string{
		RoleTypeSystemAdmin: {
			"system.admin", "system.config", "system.audit",
			"company.manage", "user.manage", "project.manage", "task.manage",
			"document.manage", "report.generate", "finance.manage", "apikey.create",
		},
		RoleTypeCompanyAdmin: {
			"company.manage", "user.manage", "project.create", "project.read",
			"project.update", "project.delete", "task.read", "task.create", "task.update",
			"task.assign", "document.read", "document.create", "document.update",
			"report.read", "report.generate", "finance.read", "apikey.read",
		},
		RoleTypeProjectManager: {
			"project.read", "project.update", "task.read", "task.create",
			"task.update", "task.delete", "task.assign", "document.read",
			"document.create", "document.update", "timer.read", "timer.update",
			"report.read", "report.generate", "finance.read",
		},
		RoleTypeDeveloper: {
			"project.read", "task.read", "task.update", "task.execute",
			"document.read", "document.create", "document.update", "timer.read",
			"timer.create", "timer.update", "timer.delete",
		},
		RoleTypeProductManager: {
			"project.read", "project.update", "task.read", "task.create",
			"task.update", "task.assign", "document.read", "document.create",
			"document.update", "report.read", "report.generate",
		},
		RoleTypeQAEngineer: {
			"project.read", "task.read", "task.update", "task.execute",
			"document.read", "document.create", "timer.read", "timer.create",
			"timer.update",
		},
		RoleTypeDesigner: {
			"project.read", "task.read", "task.update", "task.execute",
			"document.read", "document.create", "document.update", "document.share",
			"timer.read", "timer.create", "timer.update",
		},
		RoleTypeViewer: {
			"project.read", "task.read", "document.read", "report.read", "timer.read",
		},
		RoleTypeGuest: {
			"project.read", "task.read", "document.read",
		},
	}
}

// ============================================================================
// CORE PERMISSION CHECKING METHODS
// ============================================================================

// CheckPermission is the main entry point for permission checking
func (s *PermissionService) CheckPermission(ctx context.Context, permCtx *UserPermissionContext) (*PermissionCheckResult, error) {
	result := &PermissionCheckResult{
		HasPermission: false,
		CheckedAt:     time.Now(),
		Context:       make(map[string]interface{}),
	}

	// Build permission code from context
	permissionCode := s.buildPermissionCode(permCtx.ResourceType, permCtx.Action)
	result.Context["permission_code"] = permissionCode

	// Admin override: if user is system admin (users.role = 'admin'), grant all
	if s.isSystemAdmin(ctx, permCtx.UserID) {
		result.HasPermission = true
		result.Source = "admin_override"
		result.Reason = "System admin has all permissions"
		return result, nil
	}

	// Check permissions in order of precedence:
	// 1. Custom/Override permissions (highest priority)
	// 2. Project-specific permissions
	// 3. Role-based permissions
	// 4. Dynamic permissions (delegations, temporary permissions)
	// 5. Policy-based permissions

	// 1. Check custom permissions
	if hasCustom, source, reason := s.checkCustomPermissions(ctx, permCtx, permissionCode); hasCustom {
		result.HasPermission = true
		result.Source = source
		result.Reason = reason
		return result, nil
	}

	// 2. Check project-specific permissions
	if permCtx.ProjectID != nil {
		if hasProject, source, reason := s.checkProjectPermissions(ctx, permCtx, permissionCode); hasProject {
			result.HasPermission = true
			result.Source = source
			result.Reason = reason
			return result, nil
		}
	}

	// 3. Check role-based permissions
	if hasRole, source, reason := s.checkRolePermissions(ctx, permCtx, permissionCode); hasRole {
		result.HasPermission = true
		result.Source = source
		result.Reason = reason
		return result, nil
	}

	// 4. Check dynamic permissions (delegations, temporary)
	if hasDynamic, source, reason := s.checkDynamicPermissions(ctx, permCtx, permissionCode); hasDynamic {
		result.HasPermission = true
		result.Source = source
		result.Reason = reason
		return result, nil
	}

	// 5. Check policy-based permissions
	if hasPolicy, source, reason := s.checkPolicyPermissions(ctx, permCtx, permissionCode); hasPolicy {
		result.HasPermission = true
		result.Source = source
		result.Reason = reason
		return result, nil
	}

	// Default deny
	result.Reason = "permission denied - no matching grants found"
	return result, nil
}

// CheckUserPermission is a convenience method for simple permission checking
func (s *PermissionService) CheckUserPermission(ctx context.Context, userID int, permissionCode string) (bool, error) {
	// Parse permission code
	parts := strings.Split(permissionCode, ".")
	if len(parts) != 2 {
		return false, fmt.Errorf("invalid permission code format: %s", permissionCode)
	}

	resourceType := ResourceType(parts[0])
	action := PermissionAction(parts[1])

	permCtx := &UserPermissionContext{
		UserID:       userID,
		ResourceType: resourceType,
		Action:       action,
	}

	result, err := s.CheckPermission(ctx, permCtx)
	if err != nil {
		return false, err
	}

	return result.HasPermission, nil
}

// CheckProjectPermission checks if user has permission for a specific project
func (s *PermissionService) CheckProjectPermission(ctx context.Context, userID int, projectID int, action PermissionAction) (bool, error) {
	permCtx := &UserPermissionContext{
		UserID:       userID,
		ProjectID:    &projectID,
		ResourceType: ResourceProject,
		Action:       action,
	}

	result, err := s.CheckPermission(ctx, permCtx)
	if err != nil {
		return false, err
	}

	return result.HasPermission, nil
}

// CheckTaskPermission checks if user has permission for task operations
func (s *PermissionService) CheckTaskPermission(ctx context.Context, userID int, taskID int, projectID int, action PermissionAction) (bool, error) {
	permCtx := &UserPermissionContext{
		UserID:       userID,
		ProjectID:    &projectID,
		ResourceID:   &taskID,
		ResourceType: ResourceTask,
		Action:       action,
	}

	result, err := s.CheckPermission(ctx, permCtx)
	if err != nil {
		return false, err
	}

	return result.HasPermission, nil
}

// CheckDocumentPermission checks if user has permission for document operations
func (s *PermissionService) CheckDocumentPermission(ctx context.Context, userID int, documentID int, projectID *int, action PermissionAction) (bool, error) {
	permCtx := &UserPermissionContext{
		UserID:       userID,
		ProjectID:    projectID,
		ResourceID:   &documentID,
		ResourceType: ResourceDocument,
		Action:       action,
	}

	result, err := s.CheckPermission(ctx, permCtx)
	if err != nil {
		return false, err
	}

	return result.HasPermission, nil
}

// ============================================================================
// BULK PERMISSION CHECKING
// ============================================================================

// CheckMultiplePermissions checks multiple permissions at once for efficiency
func (s *PermissionService) CheckMultiplePermissions(ctx context.Context, userID int, permissionCodes []string) (map[string]bool, error) {
	results := make(map[string]bool)

	for _, permCode := range permissionCodes {
		hasPermission, err := s.CheckUserPermission(ctx, userID, permCode)
		if err != nil {
			return nil, fmt.Errorf("error checking permission %s: %w", permCode, err)
		}
		results[permCode] = hasPermission
	}

	return results, nil
}

// GetUserEffectivePermissions returns all effective permissions for a user
func (s *PermissionService) GetUserEffectivePermissions(ctx context.Context, userID int, projectID *int) ([]string, error) {
	var effectivePermissions []string

	// Get all system permissions
	systemPermissions := s.GetSystemPermissions()

	for _, perm := range systemPermissions {
		// Check if user has this permission
		permCtx := &UserPermissionContext{
			UserID:       userID,
			ProjectID:    projectID,
			ResourceType: perm.Resource,
			Action:       perm.Action,
		}

		result, err := s.CheckPermission(ctx, permCtx)
		if err != nil {
			continue // Skip on error
		}

		if result.HasPermission {
			effectivePermissions = append(effectivePermissions, perm.Code)
		}
	}

	return effectivePermissions, nil
}

// isSystemAdmin checks if a user is a system-level admin in users table
func (s *PermissionService) isSystemAdmin(ctx context.Context, userID int) bool {
	if userID == 0 || s.db == nil {
		return false
	}
	var role, status string
	query := `SELECT role, status FROM users WHERE id = $1 LIMIT 1`
	err := s.db.QueryRowContext(ctx, query, userID).Scan(&role, &status)
	if err != nil {
		return false
	}
	if status != "active" {
		return false
	}
	return role == "admin"
}

// ============================================================================
// PERMISSION FILTER METHODS
// ============================================================================

// FilterResourcesByPermission filters a list of resources based on user permissions
func (s *PermissionService) FilterResourcesByPermission(ctx context.Context, userID int, resources []map[string]interface{}, resourceType ResourceType, action PermissionAction) ([]map[string]interface{}, error) {
	var filteredResources []map[string]interface{}

	for _, resource := range resources {
		// Extract resource ID and project ID if available
		var resourceID *int
		var projectID *int

		if id, ok := resource["id"].(int); ok {
			resourceID = &id
		}
		if projID, ok := resource["project_id"].(int); ok {
			projectID = &projID
		}

		// Check permission for this resource
		permCtx := &UserPermissionContext{
			UserID:       userID,
			ProjectID:    projectID,
			ResourceID:   resourceID,
			ResourceType: resourceType,
			Action:       action,
		}

		result, err := s.CheckPermission(ctx, permCtx)
		if err != nil {
			continue // Skip on error
		}

		if result.HasPermission {
			filteredResources = append(filteredResources, resource)
		}
	}

	return filteredResources, nil
}

// GetUserAccessibleProjects returns projects that user has access to
func (s *PermissionService) GetUserAccessibleProjects(ctx context.Context, userID int) ([]int, error) {
	// Query to get all projects user has access to
	query := `
		SELECT DISTINCT p.id 
		FROM project p
		LEFT JOIN company_user_project_permission cupp ON p.id = cupp.project_id
		LEFT JOIN company_user cu ON cupp.company_user_id = cu.id
		WHERE cu.user_id = $1 AND cupp.can_view_project = true
		OR p.id IN (
			SELECT DISTINCT project_id 
			FROM task 
			WHERE assignee_id = $1
		)
	`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query accessible projects: %w", err)
	}
	defer rows.Close()

	var projectIDs []int
	for rows.Next() {
		var projectID int
		if err := rows.Scan(&projectID); err != nil {
			return nil, fmt.Errorf("failed to scan project ID: %w", err)
		}
		projectIDs = append(projectIDs, projectID)
	}

	return projectIDs, nil
}

// ============================================================================
// INTERNAL PERMISSION CHECKING IMPLEMENTATIONS
// ============================================================================

// buildPermissionCode builds a permission code from resource type and action
func (s *PermissionService) buildPermissionCode(resourceType ResourceType, action PermissionAction) string {
	return fmt.Sprintf("%s.%s", resourceType, action)
}

// checkCustomPermissions checks for user-specific permission overrides
func (s *PermissionService) checkCustomPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	// Query for custom permission overrides
	query := `
		SELECT is_granted 
		FROM user_custom_permission 
		WHERE user_id = $1 AND permission_code = $2 AND is_active = true
		ORDER BY created_at DESC 
		LIMIT 1
	`

	var isGranted bool
	err := s.db.QueryRowContext(ctx, query, permCtx.UserID, permissionCode).Scan(&isGranted)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, "", ""
		}
		return false, "", ""
	}

	if isGranted {
		return true, "custom_override", "granted by custom permission override"
	}

	return false, "custom_override", "denied by custom permission override"
}

// checkProjectPermissions checks project-specific permissions
func (s *PermissionService) checkProjectPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	if permCtx.ProjectID == nil {
		return false, "", ""
	}

	// Get user's company_user_id first
	var companyUserID int
	err := s.db.QueryRowContext(ctx,
		"SELECT id FROM company_user WHERE user_id = $1 LIMIT 1",
		permCtx.UserID).Scan(&companyUserID)
	if err != nil {
		return false, "", ""
	}

	// Check project-specific permissions
	query := `
		SELECT 
			can_view_project, can_edit_project, can_delete_project,
			can_manage_tasks, can_view_financials, can_manage_members
		FROM company_user_project_permission 
		WHERE company_user_id = $1 AND project_id = $2
		AND (permission_end_date IS NULL OR permission_end_date > NOW())
	`

	var canView, canEdit, canDelete, canManageTasks, canViewFinancials, canManageMembers bool
	err = s.db.QueryRowContext(ctx, query, companyUserID, *permCtx.ProjectID).Scan(
		&canView, &canEdit, &canDelete, &canManageTasks, &canViewFinancials, &canManageMembers)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, "", ""
		}
		return false, "", ""
	}

	// Map permission codes to project permissions
	switch permissionCode {
	case "project.read":
		if canView {
			return true, "project_permission", "granted by project-specific permission"
		}
	case "project.update":
		if canEdit {
			return true, "project_permission", "granted by project-specific permission"
		}
	case "project.delete":
		if canDelete {
			return true, "project_permission", "granted by project-specific permission"
		}
	case "task.read", "task.create", "task.update", "task.delete", "task.assign":
		if canManageTasks {
			return true, "project_permission", "granted by project task management permission"
		}
	case "finance.read", "finance.manage":
		if canViewFinancials {
			return true, "project_permission", "granted by project financial permission"
		}
	case "user.read", "user.manage":
		if canManageMembers {
			return true, "project_permission", "granted by project member management permission"
		}
	}

	return false, "", ""
}

// checkRolePermissions checks role-based permissions
func (s *PermissionService) checkRolePermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	// Get user's role permissions
	query := `
		SELECT DISTINCT p.permission_code, rp.is_granted
		FROM company_user cu
		JOIN company_role cr ON cu.role_id = cr.id
		JOIN role_permission rp ON cr.id = rp.role_id  
		JOIN permission p ON rp.permission_id = p.id
		WHERE cu.user_id = $1 AND cr.is_active = true AND p.is_active = true
	`

	rows, err := s.db.QueryContext(ctx, query, permCtx.UserID)
	if err != nil {
		return false, "", ""
	}
	defer rows.Close()

	for rows.Next() {
		var permCode string
		var isGranted bool
		if err := rows.Scan(&permCode, &isGranted); err != nil {
			continue
		}

		if permCode == permissionCode {
			if isGranted {
				return true, "role_permission", "granted by user role"
			} else {
				return false, "role_permission", "denied by user role"
			}
		}
	}

	return false, "", ""
}

// checkDynamicPermissions checks for delegated or temporary permissions
func (s *PermissionService) checkDynamicPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	// Check for active delegations
	query := `
		SELECT delegator_name, reason
		FROM permission_delegation pd
		WHERE pd.delegate_id = $1 
		AND pd.is_active = true 
		AND pd.valid_from <= NOW() 
		AND pd.valid_until > NOW()
		AND $2 = ANY(pd.permission_codes)
	`

	if permCtx.ProjectID != nil {
		query += " AND (pd.resource_type = 'project' AND pd.resource_id = $3)"

		var delegatorName, reason string
		err := s.db.QueryRowContext(ctx, query, permCtx.UserID, permissionCode, *permCtx.ProjectID).Scan(&delegatorName, &reason)
		if err == nil {
			return true, "delegation", fmt.Sprintf("delegated by %s: %s", delegatorName, reason)
		}
	} else {
		var delegatorName, reason string
		err := s.db.QueryRowContext(ctx, query, permCtx.UserID, permissionCode).Scan(&delegatorName, &reason)
		if err == nil {
			return true, "delegation", fmt.Sprintf("delegated by %s: %s", delegatorName, reason)
		}
	}

	// Check for temporary permissions from approved requests
	tempQuery := `
		SELECT pr.justification
		FROM permission_request pr
		WHERE pr.requester_id = $1 
		AND pr.permission_code = $2
		AND pr.status = 'approved'
		AND pr.expires_at > NOW()
	`

	var justification string
	err := s.db.QueryRowContext(ctx, tempQuery, permCtx.UserID, permissionCode).Scan(&justification)
	if err == nil {
		return true, "temporary_permission", fmt.Sprintf("temporary permission: %s", justification)
	}

	return false, "", ""
}

// checkPolicyPermissions checks policy-based permissions
func (s *PermissionService) checkPolicyPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	// This is a placeholder for policy-based permission checking
	// In a full implementation, this would evaluate complex policies based on:
	// - Time of day
	// - User location
	// - Resource sensitivity
	// - Business rules
	// - Risk assessment

	return false, "", ""
}

// ============================================================================
// ADMINISTRATIVE METHODS
// ============================================================================

// InitializeSystemPermissions creates all system-defined permissions in the database
func (s *PermissionService) InitializeSystemPermissions(ctx context.Context) error {
	permissions := s.GetSystemPermissions()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for _, perm := range permissions {
		// Insert or update permission
		query := `
			INSERT INTO permission (
				permission_code, permission_name, permission_description, 
				module, resource, action, is_active, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
			ON CONFLICT (permission_code) DO UPDATE SET
				permission_name = EXCLUDED.permission_name,
				permission_description = EXCLUDED.permission_description,
				module = EXCLUDED.module,
				resource = EXCLUDED.resource,
				action = EXCLUDED.action,
				is_active = EXCLUDED.is_active
		`

		_, err := tx.ExecContext(ctx, query,
			perm.Code, perm.Name, perm.Description,
			string(perm.Category), string(perm.Resource), string(perm.Action), perm.IsActive)
		if err != nil {
			return fmt.Errorf("failed to insert permission %s: %w", perm.Code, err)
		}
	}

	return tx.Commit()
}

// CreateRole creates a new role with specified permissions
func (s *PermissionService) CreateRole(ctx context.Context, roleCode, roleName, description string, permissionCodes []string) (*models.CompanyRole, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Create role
	var roleID int
	err = tx.QueryRowContext(ctx, `
		INSERT INTO company_role (role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, false, true, NOW(), NOW())
		RETURNING id
	`, roleCode, roleName, description).Scan(&roleID)
	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	// Add permissions to role
	for _, permCode := range permissionCodes {
		var permID int
		err = tx.QueryRowContext(ctx,
			"SELECT id FROM permission WHERE permission_code = $1", permCode).Scan(&permID)
		if err != nil {
			continue // Skip invalid permissions
		}

		_, err = tx.ExecContext(ctx, `
			INSERT INTO role_permission (role_id, permission_id, is_granted, created_at)
			VALUES ($1, $2, true, NOW())
		`, roleID, permID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign permission %s to role: %w", permCode, err)
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return the created role
	role := &models.CompanyRole{
		ID:              roleID,
		RoleCode:        roleCode,
		RoleName:        roleName,
		RoleDescription: &description,
		IsSystemRole:    false,
		IsActive:        true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	return role, nil
}

// AssignRoleToUser assigns a role to a user
func (s *PermissionService) AssignRoleToUser(ctx context.Context, userID int, roleID int) error {
	query := `
		UPDATE company_user 
		SET role_id = $1, updated_at = NOW()
		WHERE user_id = $2
	`

	_, err := s.db.ExecContext(ctx, query, roleID, userID)
	if err != nil {
		return fmt.Errorf("failed to assign role to user: %w", err)
	}

	return nil
}

// GrantProjectPermission grants specific permissions to a user for a project
func (s *PermissionService) GrantProjectPermission(ctx context.Context, userID int, projectID int, permissions map[string]bool) error {
	// Get user's company_user_id
	var companyUserID int
	err := s.db.QueryRowContext(ctx,
		"SELECT id FROM company_user WHERE user_id = $1 LIMIT 1",
		userID).Scan(&companyUserID)
	if err != nil {
		return fmt.Errorf("failed to get company user ID: %w", err)
	}

	// Insert or update project permissions
	query := `
		INSERT INTO company_user_project_permission (
			company_user_id, project_id, can_view_project, can_edit_project,
			can_delete_project, can_manage_tasks, can_view_financials, 
			can_manage_members, permission_start_date, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
		ON CONFLICT (company_user_id, project_id) DO UPDATE SET
			can_view_project = EXCLUDED.can_view_project,
			can_edit_project = EXCLUDED.can_edit_project,
			can_delete_project = EXCLUDED.can_delete_project,
			can_manage_tasks = EXCLUDED.can_manage_tasks,
			can_view_financials = EXCLUDED.can_view_financials,
			can_manage_members = EXCLUDED.can_manage_members,
			updated_at = NOW()
	`

	_, err = s.db.ExecContext(ctx, query, companyUserID, projectID,
		permissions["can_view_project"],
		permissions["can_edit_project"],
		permissions["can_delete_project"],
		permissions["can_manage_tasks"],
		permissions["can_view_financials"],
		permissions["can_manage_members"])

	if err != nil {
		return fmt.Errorf("failed to grant project permission: %w", err)
	}

	return nil
}
