package models

import (
	"time"
)

// CompanyRole represents a role within a company
type CompanyRole struct {
	ID              int       `json:"id" db:"id"`
	RoleCode        string    `json:"role_code" db:"role_code" validate:"required,min=1,max=50"`
	RoleName        string    `json:"role_name" db:"role_name" validate:"required,min=1,max=100"`
	RoleDescription *string   `json:"role_description" db:"role_description"`
	IsSystemRole    bool      `json:"is_system_role" db:"is_system_role"`
	IsActive        bool      `json:"is_active" db:"is_active"`
	EnterpriseID    *int      `json:"enterprise_id,omitempty" db:"enterprise_id"` // NULL for system roles, enterprise ID for enterprise roles
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// Permission represents a system permission
type Permission struct {
	ID                    int       `json:"id" db:"id"`
	PermissionCode        string    `json:"permission_code" db:"permission_code" validate:"required,min=1,max=100"`
	PermissionName        string    `json:"permission_name" db:"permission_name" validate:"required,min=1,max=100"`
	PermissionDescription *string   `json:"permission_description" db:"permission_description"`
	Module                string    `json:"module" db:"module" validate:"required"`
	Resource              string    `json:"resource" db:"resource" validate:"required"`
	Action                string    `json:"action" db:"action" validate:"required"`
	IsActive              bool      `json:"is_active" db:"is_active"`
	IsGranted             bool      `json:"is_granted,omitempty" db:"-"` // Used for permission context
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
}

// RolePermission represents the association between roles and permissions
type RolePermission struct {
	ID           int       `json:"id" db:"id"`
	RoleID       int       `json:"role_id" db:"role_id"`
	PermissionID int       `json:"permission_id" db:"permission_id"`
	IsGranted    bool      `json:"is_granted" db:"is_granted"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// CompanyUserProjectPermission represents project-specific permissions for a company user
type CompanyUserProjectPermission struct {
	ID                  int        `json:"id" db:"id"`
	CompanyUserID       int        `json:"company_user_id" db:"company_user_id"`
	ProjectID           int        `json:"project_id" db:"project_id"`
	CanViewProject      bool       `json:"can_view_project" db:"can_view_project"`
	CanEditProject      bool       `json:"can_edit_project" db:"can_edit_project"`
	CanDeleteProject    bool       `json:"can_delete_project" db:"can_delete_project"`
	CanManageTasks      bool       `json:"can_manage_tasks" db:"can_manage_tasks"`
	CanViewFinancials   bool       `json:"can_view_financials" db:"can_view_financials"`
	CanManageMembers    bool       `json:"can_manage_members" db:"can_manage_members"`
	PermissionStartDate time.Time  `json:"permission_start_date" db:"permission_start_date"`
	PermissionEndDate   *time.Time `json:"permission_end_date" db:"permission_end_date"`
	CreatedBy           *int       `json:"created_by" db:"created_by"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at" db:"updated_at"`
}

// PermissionAuditLog represents permission change audit logs
type PermissionAuditLog struct {
	ID             int          `json:"id" db:"id"`
	CompanyUserID  *int         `json:"company_user_id" db:"company_user_id"`
	TargetUserID   *int         `json:"target_user_id" db:"target_user_id"`
	ActionType     string       `json:"action_type" db:"action_type"`
	PermissionCode *string      `json:"permission_code" db:"permission_code"`
	ResourceType   *string      `json:"resource_type" db:"resource_type"`
	ResourceID     *int         `json:"resource_id" db:"resource_id"`
	OldValue       CustomFields `json:"old_value" db:"old_value"`
	NewValue       CustomFields `json:"new_value" db:"new_value"`
	Reason         *string      `json:"reason" db:"reason"`
	PerformedBy    *int         `json:"performed_by" db:"performed_by"`
	PerformedAt    time.Time    `json:"performed_at" db:"performed_at"`
	IPAddress      *string      `json:"ip_address" db:"ip_address"`
	UserAgent      *string      `json:"user_agent" db:"user_agent"`
}

// Permission context for checking user permissions
type PermissionContext struct {
	UserID        int    `json:"user_id"`
	CompanyUserID *int   `json:"company_user_id"`
	CompanyID     *int   `json:"company_id"`
	ProjectID     *int   `json:"project_id"`
	Resource      string `json:"resource"`
	Action        string `json:"action"`
}

// Permission check result
type PermissionResult struct {
	HasPermission bool   `json:"hasPermission"`
	Reason        string `json:"reason"`
	Source        string `json:"source"` // role, custom, project
}

// Request/Response models

// CompanyRoleRequest represents a request to create or update a company role
type CompanyRoleRequest struct {
	RoleCode        string   `json:"role_code" validate:"required,min=1,max=50"`
	RoleName        string   `json:"role_name" validate:"required,min=1,max=100"`
	RoleDescription *string  `json:"role_description"`
	PermissionCodes []string `json:"permission_codes"` // List of permission codes to assign
}

// CompanyRoleResponse represents a company role with permissions
type CompanyRoleResponse struct {
	ID              int                  `json:"id"`
	RoleCode        string               `json:"roleCode"`
	RoleName        string               `json:"roleName"`
	RoleDescription *string              `json:"roleDescription"`
	IsSystemRole    bool                 `json:"isSystemRole"`
	IsActive        bool                 `json:"isActive"`
	EnterpriseID    *int                 `json:"enterpriseId,omitempty"` // NULL for system roles
	Permissions     []PermissionResponse `json:"permissions"`
	UserCount       int                  `json:"userCount"` // Number of users with this role
	CreatedAt       time.Time            `json:"createdAt"`
	UpdatedAt       time.Time            `json:"updatedAt"`
}

// PermissionResponse represents a permission with additional context
type PermissionResponse struct {
	ID                    int     `json:"id"`
	PermissionCode        string  `json:"permissionCode"`
	PermissionName        string  `json:"permissionName"`
	PermissionDescription *string `json:"permissionDescription"`
	Module                string  `json:"module"`
	ModuleName            string  `json:"moduleName"` // Localized module name
	Resource              string  `json:"resource"`
	Action                string  `json:"action"`
	ActionName            string  `json:"actionName"` // Localized action name
	IsActive              bool    `json:"isActive"`
	IsGranted             bool    `json:"isGranted"` // Whether this permission is granted in current context
}

// UserPermissionRequest represents a request to update user permissions
type UserPermissionRequest struct {
	RoleID             *int                    `json:"role_id"`
	CustomPermissions  map[string]bool         `json:"custom_permissions"` // permission_code -> granted
	ProjectPermissions []ProjectPermissionItem `json:"project_permissions"`
}

// ProjectPermissionItem represents project-specific permission for a user
type ProjectPermissionItem struct {
	ProjectID           int        `json:"project_id"`
	CanViewProject      bool       `json:"can_view_project"`
	CanEditProject      bool       `json:"can_edit_project"`
	CanDeleteProject    bool       `json:"can_delete_project"`
	CanManageTasks      bool       `json:"can_manage_tasks"`
	CanViewFinancials   bool       `json:"can_view_financials"`
	CanManageMembers    bool       `json:"can_manage_members"`
	PermissionStartDate *time.Time `json:"permission_start_date"`
	PermissionEndDate   *time.Time `json:"permission_end_date"`
}

// UserPermissionSummary represents a comprehensive view of user permissions
type UserPermissionSummary struct {
	CompanyUserID        int                            `json:"company_user_id"`
	UserName             string                         `json:"user_name"`
	Role                 *CompanyRoleResponse           `json:"role"`
	CustomPermissions    map[string]bool                `json:"custom_permissions"`
	ProjectPermissions   []CompanyUserProjectPermission `json:"project_permissions"`
	EffectivePermissions []PermissionResponse           `json:"effective_permissions"`
	LastUpdated          time.Time                      `json:"last_updated"`
}

// PermissionCheckRequest represents a request to check permissions
type PermissionCheckRequest struct {
	PermissionCode string `json:"permission_code" validate:"required"`
	ResourceID     *int   `json:"resource_id"`
}

// Localization helpers
func GetModuleName(module string) string {
	moduleNames := map[string]string{
		"company": "企业管理",
		"project": "项目管理",
		"task":    "任务管理",
		"finance": "财务管理",
		"system":  "系统管理",
	}
	if name, ok := moduleNames[module]; ok {
		return name
	}
	return module
}

func GetActionName(action string) string {
	actionNames := map[string]string{
		"read":   "查看",
		"create": "创建",
		"update": "编辑",
		"delete": "删除",
		"manage": "管理",
		"assign": "分配",
	}
	if name, ok := actionNames[action]; ok {
		return name
	}
	return action
}

// ToResponse converts CompanyRole to CompanyRoleResponse
func (cr *CompanyRole) ToResponse() CompanyRoleResponse {
	return CompanyRoleResponse{
		ID:              cr.ID,
		RoleCode:        cr.RoleCode,
		RoleName:        cr.RoleName,
		RoleDescription: cr.RoleDescription,
		IsSystemRole:    cr.IsSystemRole,
		IsActive:        cr.IsActive,
		EnterpriseID:    cr.EnterpriseID,
		Permissions:     []PermissionResponse{}, // Will be populated separately
		CreatedAt:       cr.CreatedAt,
		UpdatedAt:       cr.UpdatedAt,
	}
}

// ToResponse converts Permission to PermissionResponse
func (p *Permission) ToResponse() PermissionResponse {
	return PermissionResponse{
		ID:                    p.ID,
		PermissionCode:        p.PermissionCode,
		PermissionName:        p.PermissionName,
		PermissionDescription: p.PermissionDescription,
		Module:                p.Module,
		ModuleName:            GetModuleName(p.Module),
		Resource:              p.Resource,
		Action:                p.Action,
		ActionName:            GetActionName(p.Action),
		IsActive:              p.IsActive,
		IsGranted:             false, // Will be set based on context
	}
}

// Additional API Request/Response models for permission system

// CreateRoleRequest represents a request to create a new role
type CreateRoleRequest struct {
	RoleCode        string   `json:"role_code" binding:"required,min=1,max=50"`
	RoleName        string   `json:"role_name" binding:"required,min=1,max=100"`
	RoleDescription string   `json:"role_description"`
	PermissionCodes []string `json:"permission_codes"`
}

// UpdateRoleRequest represents a request to update an existing role
type UpdateRoleRequest struct {
	RoleName        string   `json:"role_name" binding:"required,min=1,max=100"`
	RoleDescription string   `json:"role_description"`
	PermissionCodes []string `json:"permission_codes"`
}

// GetRolesResponse represents the response for getting roles
type GetRolesResponse struct {
	Roles []CompanyRole `json:"roles"`
}

// GetPermissionsResponse represents the response for getting permissions
type GetPermissionsResponse struct {
	Permissions []Permission `json:"permissions"`
}

// GetRolePermissionsResponse represents the response for getting role permissions
type GetRolePermissionsResponse struct {
	Permissions []Permission `json:"permissions"`
}

// CheckPermissionResponse represents the response for permission checks
type CheckPermissionResponse struct {
	HasPermission bool   `json:"has_permission"`
	Source        string `json:"source"`
	Reason        string `json:"reason"`
}

// GetUserPermissionsResponse represents the response for getting user permissions
type GetUserPermissionsResponse struct {
	Permissions *UserPermissionsSummary `json:"permissions"`
}

// AssignRoleRequest represents a request to assign a role to a user
type AssignRoleRequest struct {
	RoleID int `json:"role_id" validate:"required"`
}

// ProjectPermissionUpdate represents an update to project-specific permissions
type ProjectPermissionUpdate struct {
	PermissionCode string `json:"permission_code"`
	IsGranted      bool   `json:"is_granted"`
}

// UpdateUserPermissionsRequest represents a request to update user permissions
type UpdateUserPermissionsRequest struct {
	ProjectID   int                       `json:"project_id"`
	Permissions []ProjectPermissionUpdate `json:"permissions"`
}

// UserPermissionsSummary represents a summary of user permissions with expanded data
type UserPermissionsSummary struct {
	Role                 *CompanyRole                   `json:"role"`
	RolePermissions      []Permission                   `json:"role_permissions"`
	ProjectPermissions   []CompanyUserProjectPermission `json:"project_permissions"`
	EffectivePermissions []Permission                   `json:"effective_permissions"`
}

// Permission inheritance and override models

// PermissionInheritanceTrace represents the detailed trace of permission resolution
type PermissionInheritanceTrace struct {
	CompanyUserID  int              `json:"company_user_id"`
	PermissionCode string           `json:"permission_code"`
	ResourceID     *int             `json:"resource_id,omitempty"`
	Steps          []PermissionStep `json:"steps"`
	FinalResult    bool             `json:"final_result"`
	FinalSource    string           `json:"final_source"`
}

// PermissionStep represents a step in permission resolution
type PermissionStep struct {
	Level         string `json:"level"`  // "custom", "project", "role"
	Source        string `json:"source"` // Detailed source description
	HasPermission bool   `json:"has_permission"`
	Reason        string `json:"reason"`
	IsOverride    bool   `json:"is_override"` // Whether this step overrides others
}

// PermissionOverrideRequest represents a request to set permission override
type PermissionOverrideRequest struct {
	PermissionCode string `json:"permission_code" validate:"required"`
	IsGranted      bool   `json:"is_granted"`
	Reason         string `json:"reason"`
}

// PermissionAnalysis represents analysis of user permission conflicts and issues
type PermissionAnalysis struct {
	CompanyUserID int                    `json:"company_user_id"`
	Conflicts     []PermissionConflict   `json:"conflicts"`
	Redundancies  []PermissionRedundancy `json:"redundancies"`
	Gaps          []PermissionGap        `json:"gaps"`
}

// PermissionConflict represents a conflict between different permission sources
type PermissionConflict struct {
	PermissionCode string `json:"permission_code"`
	RoleGrants     bool   `json:"role_grants"`
	CustomOverride *bool  `json:"custom_override,omitempty"`
	ProjectGrants  *bool  `json:"project_grants,omitempty"`
	Description    string `json:"description"`
}

// PermissionRedundancy represents redundant permission grants
type PermissionRedundancy struct {
	PermissionCode string   `json:"permission_code"`
	GrantedBy      []string `json:"granted_by"`
	Description    string   `json:"description"`
}

// PermissionGap represents missing permission that might be needed
type PermissionGap struct {
	PermissionCode string `json:"permission_code"`
	RequiredFor    string `json:"required_for"`
	Suggestion     string `json:"suggestion"`
}

// Permission inheritance API responses

// GetPermissionTraceResponse represents response for permission trace
type GetPermissionTraceResponse struct {
	Trace *PermissionInheritanceTrace `json:"trace"`
}

// GetPermissionAnalysisResponse represents response for permission analysis
type GetPermissionAnalysisResponse struct {
	Analysis *PermissionAnalysis `json:"analysis"`
}
