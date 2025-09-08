package models

import (
	"time"

	"github.com/lib/pq"
)

// EnterprisePosition 企业岗位模型
type EnterprisePosition struct {
	ID           int                `json:"id" db:"id"`
	EnterpriseID int                `json:"enterprise_id" db:"enterprise_id"`
	PositionCode string             `json:"position_code" db:"position_code"`
	PositionName string             `json:"position_name" db:"position_name"`
	PositionLevel int               `json:"position_level" db:"position_level"`
	DepartmentID *int               `json:"department_id" db:"department_id"`
	ParentPositionID *int           `json:"parent_position_id" db:"parent_position_id"`
	
	// 岗位描述
	Description     *string `json:"description" db:"description"`
	Responsibilities *string `json:"responsibilities" db:"responsibilities"`
	Requirements    *string `json:"requirements" db:"requirements"`
	
	// 关联角色模板
	RoleTemplateID *int `json:"role_template_id" db:"role_template_id"`
	
	// 权限配置
	BasePermissions       pq.StringArray `json:"base_permissions" db:"base_permissions"`
	AdditionalPermissions pq.StringArray `json:"additional_permissions" db:"additional_permissions"`
	RestrictedPermissions pq.StringArray `json:"restricted_permissions" db:"restricted_permissions"`
	
	// 配置信息
	MaxHeadcount    int  `json:"max_headcount" db:"max_headcount"`
	CurrentHeadcount int  `json:"current_headcount" db:"current_headcount"`
	IsKeyPosition   bool `json:"is_key_position" db:"is_key_position"`
	ApprovalRequired bool `json:"approval_required" db:"approval_required"`
	
	// 状态
	Status string `json:"status" db:"status"`
	
	// 审计字段
	CreatedBy *int       `json:"created_by" db:"created_by"`
	UpdatedBy *int       `json:"updated_by" db:"updated_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at" db:"deleted_at"`
	
	// 关联数据（查询时填充）
	Enterprise      *Enterprise           `json:"enterprise,omitempty"`
	Department      *EnterpriseDepartment `json:"department,omitempty"`
	ParentPosition  *EnterprisePosition   `json:"parent_position,omitempty"`
	ChildPositions  []EnterprisePosition  `json:"child_positions,omitempty"`
	RoleTemplate    *RoleTemplate         `json:"role_template,omitempty"`
	Users           []EnterpriseUser      `json:"users,omitempty"`
}

// EnterpriseRole 企业角色模型
type EnterpriseRole struct {
	ID           int    `json:"id" db:"id"`
	EnterpriseID int    `json:"enterprise_id" db:"enterprise_id"`
	RoleCode     string `json:"role_code" db:"role_code"`
	RoleName     string `json:"role_name" db:"role_name"`
	RoleDescription *string `json:"role_description" db:"role_description"`
	
	// 角色类型
	RoleType string `json:"role_type" db:"role_type"` // system, template, custom
	
	// 如果基于模板创建
	TemplateID *int `json:"template_id" db:"template_id"`
	
	// 权限配置
	Permissions pq.StringArray `json:"permissions" db:"permissions"`
	
	// 层级信息
	RoleLevel    int  `json:"role_level" db:"role_level"`
	ParentRoleID *int `json:"parent_role_id" db:"parent_role_id"`
	
	// 配置
	IsDefault  bool `json:"is_default" db:"is_default"`
	AutoAssign bool `json:"auto_assign" db:"auto_assign"`
	MaxUsers   *int `json:"max_users" db:"max_users"`
	
	// 状态
	IsActive bool `json:"is_active" db:"is_active"`
	
	// 审计字段
	CreatedBy *int       `json:"created_by" db:"created_by"`
	UpdatedBy *int       `json:"updated_by" db:"updated_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at" db:"deleted_at"`
	
	// 关联数据（查询时填充）
	Enterprise   *Enterprise     `json:"enterprise,omitempty"`
	Template     *RoleTemplate   `json:"template,omitempty"`
	ParentRole   *EnterpriseRole `json:"parent_role,omitempty"`
	ChildRoles   []EnterpriseRole `json:"child_roles,omitempty"`
	Users        []EnterpriseUser `json:"users,omitempty"`
	UserCount    int             `json:"user_count,omitempty"`
}

// EnterpriseUserPosition 用户岗位关联
type EnterpriseUserPosition struct {
	ID                int       `json:"id" db:"id"`
	EnterpriseUserID  int       `json:"enterprise_user_id" db:"enterprise_user_id"`
	PositionID        int       `json:"position_id" db:"position_id"`
	AppointmentType   string    `json:"appointment_type" db:"appointment_type"` // primary, secondary, acting, temporary
	StartDate         time.Time `json:"start_date" db:"start_date"`
	EndDate           *time.Time `json:"end_date" db:"end_date"`
	IsActive          bool      `json:"is_active" db:"is_active"`
	AppointedBy       *int      `json:"appointed_by" db:"appointed_by"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
	
	// 关联数据
	User     *EnterpriseUser     `json:"user,omitempty"`
	Position *EnterprisePosition `json:"position,omitempty"`
}

// EnterpriseUserRole 用户角色关联
type EnterpriseUserRole struct {
	ID               int       `json:"id" db:"id"`
	EnterpriseUserID int       `json:"enterprise_user_id" db:"enterprise_user_id"`
	RoleID           int       `json:"role_id" db:"role_id"`
	AssignedDate     time.Time `json:"assigned_date" db:"assigned_date"`
	ExpiryDate       *time.Time `json:"expiry_date" db:"expiry_date"`
	IsActive         bool      `json:"is_active" db:"is_active"`
	AssignedBy       *int      `json:"assigned_by" db:"assigned_by"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
	
	// 关联数据
	User *EnterpriseUser `json:"user,omitempty"`
	Role *EnterpriseRole `json:"role,omitempty"`
}

// PositionPermission 岗位权限信息
type PositionPermission struct {
	Source         string `json:"source"`          // position_base, position_additional, role_template
	PermissionCode string `json:"permission_code"`
	PermissionName string `json:"permission_name"`
	PermissionID   int    `json:"permission_id"`
}

// UserEffectivePermission 用户有效权限
type UserEffectivePermission struct {
	Source         string `json:"source"`           // position, enterprise_role
	PermissionCode string `json:"permission_code"`
	PermissionName string `json:"permission_name"`
	GrantedThrough string `json:"granted_through"`  // 权限来源名称
	PermissionID   int    `json:"permission_id"`
}

// PositionHierarchy 岗位层级结构
type PositionHierarchy struct {
	Position *EnterprisePosition   `json:"position"`
	Children []PositionHierarchy   `json:"children,omitempty"`
	Level    int                   `json:"level"`
	Path     string               `json:"path"`
}

// RoleHierarchy 角色层级结构
type RoleHierarchy struct {
	Role     *EnterpriseRole     `json:"role"`
	Children []RoleHierarchy     `json:"children,omitempty"`
	Level    int                 `json:"level"`
	Path     string             `json:"path"`
}

// 请求和响应模型

// CreatePositionRequest 创建岗位请求
type CreatePositionRequest struct {
	EnterpriseID      int      `json:"enterprise_id" validate:"required"`
	PositionCode      string   `json:"position_code" validate:"required,max=50"`
	PositionName      string   `json:"position_name" validate:"required,max=100"`
	PositionLevel     int      `json:"position_level" validate:"min=1,max=10"`
	DepartmentID      *int     `json:"department_id"`
	ParentPositionID  *int     `json:"parent_position_id"`
	Description       *string  `json:"description"`
	Responsibilities  *string  `json:"responsibilities"`
	Requirements      *string  `json:"requirements"`
	RoleTemplateID    *int     `json:"role_template_id"`
	BasePermissions   []string `json:"base_permissions"`
	AdditionalPermissions []string `json:"additional_permissions"`
	RestrictedPermissions []string `json:"restricted_permissions"`
	MaxHeadcount      int      `json:"max_headcount" validate:"min=1"`
	IsKeyPosition     bool     `json:"is_key_position"`
	ApprovalRequired  bool     `json:"approval_required"`
}

// UpdatePositionRequest 更新岗位请求
type UpdatePositionRequest struct {
	PositionName      *string  `json:"position_name,omitempty" validate:"omitempty,max=100"`
	PositionLevel     *int     `json:"position_level,omitempty" validate:"omitempty,min=1,max=10"`
	DepartmentID      *int     `json:"department_id,omitempty"`
	ParentPositionID  *int     `json:"parent_position_id,omitempty"`
	Description       *string  `json:"description,omitempty"`
	Responsibilities  *string  `json:"responsibilities,omitempty"`
	Requirements      *string  `json:"requirements,omitempty"`
	RoleTemplateID    *int     `json:"role_template_id,omitempty"`
	BasePermissions   []string `json:"base_permissions,omitempty"`
	AdditionalPermissions []string `json:"additional_permissions,omitempty"`
	RestrictedPermissions []string `json:"restricted_permissions,omitempty"`
	MaxHeadcount      *int     `json:"max_headcount,omitempty" validate:"omitempty,min=1"`
	CurrentHeadcount  *int     `json:"current_headcount,omitempty" validate:"omitempty,min=0"`
	IsKeyPosition     *bool    `json:"is_key_position,omitempty"`
	ApprovalRequired  *bool    `json:"approval_required,omitempty"`
	Status            *string  `json:"status,omitempty" validate:"omitempty,oneof=active inactive frozen"`
}


// AssignPositionRequest 分配岗位请求
type AssignPositionRequest struct {
	EnterpriseUserID int       `json:"enterprise_user_id" validate:"required"`
	PositionID       int       `json:"position_id" validate:"required"`
	AppointmentType  string    `json:"appointment_type" validate:"required,oneof=primary secondary acting temporary"`
	StartDate        time.Time `json:"start_date"`
	EndDate          *time.Time `json:"end_date"`
}


// PositionListResponse 岗位列表响应
type PositionListResponse struct {
	Positions []EnterprisePosition `json:"positions"`
	Total     int                  `json:"total"`
	Page      int                  `json:"page"`
	PageSize  int                  `json:"page_size"`
}

// RoleListResponse 角色列表响应
type RoleListResponse struct {
	Roles    []EnterpriseRole `json:"roles"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"page_size"`
}

// 工具方法

// GetEffectivePermissions 获取岗位的有效权限
func (p *EnterprisePosition) GetEffectivePermissions() []string {
	var permissions []string
	
	// 添加基础权限
	permissions = append(permissions, p.BasePermissions...)
	
	// 添加额外权限
	permissions = append(permissions, p.AdditionalPermissions...)
	
	// 移除限制权限
	if len(p.RestrictedPermissions) > 0 {
		filtered := make([]string, 0, len(permissions))
		restrictedMap := make(map[string]bool)
		for _, restricted := range p.RestrictedPermissions {
			restrictedMap[restricted] = true
		}
		
		for _, perm := range permissions {
			if !restrictedMap[perm] {
				filtered = append(filtered, perm)
			}
		}
		permissions = filtered
	}
	
	return permissions
}

// IsExpired 检查角色分配是否过期
func (eur *EnterpriseUserRole) IsExpired() bool {
	if eur.ExpiryDate == nil {
		return false
	}
	return time.Now().After(*eur.ExpiryDate)
}

// IsExpired 检查岗位任职是否过期
func (eup *EnterpriseUserPosition) IsExpired() bool {
	if eup.EndDate == nil {
		return false
	}
	return time.Now().After(*eup.EndDate)
}