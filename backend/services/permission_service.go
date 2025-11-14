package services

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/monitoring"
)

// PermissionService provides core permission management functionality
type PermissionService struct {
	permRepo database.PermissionRepository
	db       *sql.DB // For direct SQL queries when needed
}

// NewPermissionService creates a new permission service instance
func NewPermissionService(permRepo database.PermissionRepository, db *sql.DB) *PermissionService {
	return &PermissionService{
		permRepo: permRepo,
		db:       db,
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
	ResourceSystem      ResourceType = "system"
	ResourceCompany     ResourceType = "company"
	ResourceProject     ResourceType = "project"
	ResourceTask        ResourceType = "task"
	ResourceDocument    ResourceType = "document"
	ResourceUser        ResourceType = "user"
	ResourceTimer       ResourceType = "timer"
	ResourceReport      ResourceType = "report"
	ResourceApiKey      ResourceType = "api_key"
	ResourceRequirement ResourceType = "requirement"
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

		// Requirement permissions
		{
			Code: "requirement.read", Name: "查看需求", Description: "查看需求信息",
			Category: CategoryProject, Resource: ResourceRequirement, Action: ActionRead, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "requirement.create", Name: "创建需求", Description: "创建新需求",
			Category: CategoryProject, Resource: ResourceRequirement, Action: ActionCreate, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "requirement.update", Name: "编辑需求", Description: "编辑需求信息",
			Category: CategoryProject, Resource: ResourceRequirement, Action: ActionUpdate, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "requirement.delete", Name: "删除需求", Description: "删除需求",
			Category: CategoryProject, Resource: ResourceRequirement, Action: ActionDelete, Scope: ScopeCompany, IsSystem: false,
		},
		{
			Code: "requirement.manage", Name: "管理需求", Description: "完整的需求管理权限",
			Category: CategoryProject, Resource: ResourceRequirement, Action: ActionManage, Scope: ScopeCompany, IsSystem: false,
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
			"requirement.read", "requirement.create", "requirement.update", "requirement.delete", "requirement.manage",
		},
		RoleTypeProjectManager: {
			"project.read", "project.update", "task.read", "task.create",
			"task.update", "task.delete", "task.assign", "document.read",
			"document.create", "document.update", "timer.read", "timer.update",
			"report.read", "report.generate", "finance.read",
			"requirement.read", "requirement.create", "requirement.update", "requirement.manage",
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
	start := time.Now()
	monitoring.PermissionActiveRequests.WithLabelValues("CheckPermission").Inc()
	defer monitoring.PermissionActiveRequests.WithLabelValues("CheckPermission").Dec()

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
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("CheckPermission", duration, true, 0)
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
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("CheckPermission", duration, true, 0)
		return result, nil
	}

	// 2. Check project-specific permissions
	if permCtx.ProjectID != nil {
		if hasProject, source, reason := s.checkProjectPermissions(ctx, permCtx, permissionCode); hasProject {
			result.HasPermission = true
			result.Source = source
			result.Reason = reason
			duration := time.Since(start).Seconds()
			monitoring.RecordPermissionCheck("CheckPermission", duration, true, 0)
			return result, nil
		}
	}

	// 3. Check role-based permissions
	if hasRole, source, reason := s.checkRolePermissions(ctx, permCtx, permissionCode); hasRole {
		result.HasPermission = true
		result.Source = source
		result.Reason = reason
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("CheckPermission", duration, true, 0)
		return result, nil
	}

	// 4. Check dynamic permissions (delegations, temporary)
	if hasDynamic, source, reason := s.checkDynamicPermissions(ctx, permCtx, permissionCode); hasDynamic {
		result.HasPermission = true
		result.Source = source
		result.Reason = reason
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("CheckPermission", duration, true, 0)
		return result, nil
	}

	// 5. Check policy-based permissions
	if hasPolicy, source, reason := s.checkPolicyPermissions(ctx, permCtx, permissionCode); hasPolicy {
		result.HasPermission = true
		result.Source = source
		result.Reason = reason
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("CheckPermission", duration, true, 0)
		return result, nil
	}

	// Default deny
	result.Reason = "permission denied - no matching grants found"
	duration := time.Since(start).Seconds()
	monitoring.RecordPermissionCheck("CheckPermission", duration, true, 0)
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
	start := time.Now()
	queryCount := 0
	success := false

	defer func() {
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("isSystemAdmin", duration, success, queryCount)
	}()

	if userID == 0 {
		success = true
		return false
	}

	// Use CheckUserPermission to verify system admin status
	result, err := s.permRepo.CheckUserPermission(ctx, userID, "system.admin", nil)
	queryCount++

	if err != nil {
		monitoring.RecordPermissionError("isSystemAdmin", "db_error")
		return false
	}

	success = true
	return result != nil && result.HasPermission
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
	start := time.Now()
	queryCount := 0
	success := false

	defer func() {
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("GetUserAccessibleProjects", duration, success, queryCount)
	}()

	// Direct SQL query to get projects user has access to
	// Combines projects where user has explicit permissions AND projects with assigned tasks
	query := `
		SELECT DISTINCT p.id
		FROM projects p
		LEFT JOIN company_user_project_permissions cupp ON p.id = cupp.project_id
		LEFT JOIN company_users cu ON cupp.company_user_id = cu.id
		WHERE cu.user_id = $1 AND cupp.can_view_project = true
		UNION
		SELECT DISTINCT project_id
		FROM tasks
		WHERE assignee_id = $1
		ORDER BY id
	`

	rows, err := s.db.QueryContext(ctx, query, userID)
	queryCount++

	if err != nil {
		monitoring.RecordPermissionError("GetUserAccessibleProjects", "db_error")
		return nil, fmt.Errorf("failed to query accessible projects: %w", err)
	}
	defer rows.Close()

	var projectIDs []int
	for rows.Next() {
		var projectID int
		if err := rows.Scan(&projectID); err != nil {
			monitoring.RecordPermissionError("GetUserAccessibleProjects", "scan_error")
			return nil, fmt.Errorf("failed to scan project ID: %w", err)
		}
		projectIDs = append(projectIDs, projectID)
	}

	if err := rows.Err(); err != nil {
		monitoring.RecordPermissionError("GetUserAccessibleProjects", "rows_error")
		return nil, fmt.Errorf("rows error: %w", err)
	}

	success = true
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
	start := time.Now()
	queryCount := 0
	success := false

	defer func() {
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("checkCustomPermissions", duration, success, queryCount)
	}()

	// Use PermissionRepository to get custom permission overrides
	overrides, err := s.permRepo.GetUserPermissionOverrides(ctx, permCtx.UserID)
	queryCount++

	if err != nil {
		monitoring.RecordPermissionError("checkCustomPermissions", "db_error")
		return false, "", ""
	}

	// Check if this permission has an override
	if isGranted, exists := overrides[permissionCode]; exists {
		success = true
		if isGranted {
			return true, "custom_override", "granted by custom permission override"
		}
		return false, "custom_override", "denied by custom permission override"
	}

	success = true
	return false, "", ""
}

// checkProjectPermissions checks project-specific permissions
func (s *PermissionService) checkProjectPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	start := time.Now()
	queryCount := 0
	success := false

	defer func() {
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("checkProjectPermissions", duration, success, queryCount)
	}()

	if permCtx.ProjectID == nil {
		success = true
		return false, "", ""
	}

	// Get project-specific permissions directly using userID
	permissions, err := s.permRepo.GetUserProjectPermissions(ctx, permCtx.UserID, *permCtx.ProjectID)
	queryCount++

	if err != nil {
		monitoring.RecordPermissionError("checkProjectPermissions", "db_error")
		return false, "", ""
	}
	if permissions == nil {
		success = true
		return false, "", ""
	}

	// Map permission codes to project permissions (business logic stays in service)
	switch permissionCode {
	case "project.read":
		if permissions.CanViewProject {
			success = true
			return true, "project_permission", "granted by project-specific permission"
		}
	case "project.update":
		if permissions.CanEditProject {
			success = true
			return true, "project_permission", "granted by project-specific permission"
		}
	case "project.delete":
		if permissions.CanDeleteProject {
			success = true
			return true, "project_permission", "granted by project-specific permission"
		}
	case "task.read", "task.create", "task.update", "task.delete", "task.assign":
		if permissions.CanManageTasks {
			success = true
			return true, "project_permission", "granted by project task management permission"
		}
	case "finance.read", "finance.manage":
		if permissions.CanViewFinancials {
			success = true
			return true, "project_permission", "granted by project financial permission"
		}
	case "user.read", "user.manage":
		if permissions.CanManageMembers {
			success = true
			return true, "project_permission", "granted by project member management permission"
		}
	}

	success = true
	return false, "", ""
}

// checkRolePermissions checks role-based permissions
func (s *PermissionService) checkRolePermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	start := time.Now()
	queryCount := 0
	success := false

	defer func() {
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("checkRolePermissions", duration, success, queryCount)
	}()

	// Get user's complete permission summary
	summary, err := s.permRepo.GetUserPermissions(ctx, permCtx.UserID)
	queryCount++

	if err != nil {
		monitoring.RecordPermissionError("checkRolePermissions", "db_error")
		return false, "", ""
	}

	// Check effective permissions list
	for _, perm := range summary.EffectivePermissions {
		if perm.PermissionCode == permissionCode && perm.IsActive {
			roleName := "unknown"
			if summary.Role != nil {
				roleName = summary.Role.RoleName
			}
			success = true
			return true, "role_permission", fmt.Sprintf("granted by role: %s", roleName)
		}
	}

	success = true
	return false, "", ""
}

// checkDynamicPermissions checks for delegated or temporary permissions
func (s *PermissionService) checkDynamicPermissions(ctx context.Context, permCtx *UserPermissionContext, permissionCode string) (bool, string, string) {
	// TODO: Implement delegation and temporary permission checking
	// These features require additional tables and are not yet implemented in PermissionRepository
	// For now, we skip these checks and return false
	//
	// Future implementation should:
	// 1. Add permission_delegations table support
	// 2. Add temporary_permissions table support
	// 3. Add corresponding methods to PermissionRepository

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
	start := time.Now()
	queryCount := 0
	success := false

	defer func() {
		duration := time.Since(start).Seconds()
		monitoring.RecordPermissionCheck("InitializeSystemPermissions", duration, success, queryCount)
	}()

	permissions := s.GetSystemPermissions()

	// Direct SQL upsert for each permission
	query := `
		INSERT INTO permissions (code, name, description, module, resource, action, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (code)
		DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			module = EXCLUDED.module,
			resource = EXCLUDED.resource,
			action = EXCLUDED.action,
			is_active = EXCLUDED.is_active,
			updated_at = CURRENT_TIMESTAMP
	`

	for _, perm := range permissions {
		_, err := s.db.ExecContext(ctx, query,
			perm.Code, perm.Name, perm.Description,
			string(perm.Category), string(perm.Resource), string(perm.Action), perm.IsActive)
		queryCount++
		if err != nil {
			monitoring.RecordPermissionError("InitializeSystemPermissions", "db_error")
			return fmt.Errorf("failed to upsert permission %s: %w", perm.Code, err)
		}
	}

	success = true
	return nil
}

// CreateRole creates a new role with specified permissions
func (s *PermissionService) CreateRole(ctx context.Context, roleCode, roleName, description string, permissionCodes []string) (*models.CompanyRole, error) {
	// Create role using PermissionRepository
	role := &models.CompanyRole{
		RoleCode:        roleCode,
		RoleName:        roleName,
		RoleDescription: &description,
		IsSystemRole:    false,
		IsActive:        true,
	}

	createdRole, err := s.permRepo.CreateRole(ctx, role)
	if err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	// Get permission IDs from permission codes
	// TODO: This requires a method to map permission codes to IDs
	// For now, we'll need to query the permissions table directly
	var permissionIDs []int
	for _, permCode := range permissionCodes {
		var permID int
		query := `SELECT id FROM permissions WHERE code = $1 AND is_active = true`
		err := s.db.QueryRowContext(ctx, query, permCode).Scan(&permID)
		if err == nil {
			permissionIDs = append(permissionIDs, permID)
		}
	}

	// Set role permissions
	if len(permissionIDs) > 0 {
		err = s.permRepo.SetRolePermissions(ctx, createdRole.ID, permissionIDs)
		if err != nil {
			return nil, fmt.Errorf("failed to set role permissions: %w", err)
		}
	}

	return createdRole, nil
}

// AssignRoleToUser assigns a role to a user
func (s *PermissionService) AssignRoleToUser(ctx context.Context, userID int, roleID int) error {
	// PermissionRepository.UpdateUserRole uses companyUserID (which is the user_id in our case)
	// We pass userID directly as it's actually the companyUserID in the repository context
	roleIDPtr := &roleID
	err := s.permRepo.UpdateUserRole(ctx, userID, roleIDPtr)
	if err != nil {
		return fmt.Errorf("failed to assign role to user: %w", err)
	}
	return nil
}

// GrantProjectPermission grants specific permissions to a user for a project
func (s *PermissionService) GrantProjectPermission(ctx context.Context, userID int, projectID int, permissions map[string]bool) error {
	// Convert map to CompanyUserProjectPermission struct
	// userID here is actually the companyUserID in the repository context
	permission := &models.CompanyUserProjectPermission{
		CompanyUserID:    userID,
		ProjectID:        projectID,
		CanViewProject:   permissions["can_view_project"],
		CanEditProject:   permissions["can_edit_project"],
		CanDeleteProject: permissions["can_delete_project"],
		CanManageTasks:   permissions["can_manage_tasks"],
		CanViewFinancials: permissions["can_view_financials"],
		CanManageMembers: permissions["can_manage_members"],
	}

	// Use PermissionRepository to set project permissions
	err := s.permRepo.SetUserProjectPermissions(ctx, permission)
	if err != nil {
		return fmt.Errorf("failed to grant project permission: %w", err)
	}

	return nil
}
