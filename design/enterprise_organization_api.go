// 企业组织架构管理模块后端API设计
// 文件: enterprise_organization_api.go
// 描述: 企业组织架构管理的Go数据模型和API接口设计
// 作者: Claude AI
// 创建时间: 2025-09-04
// 任务: #1210 - 设计企业组织架构管理模块

package models

import (
	"time"
)

// =============================================================================
// 数据模型定义
// =============================================================================

// Department 部门模型
type Department struct {
	ID                   int       `json:"id" db:"id"`
	CompanyID            int       `json:"company_id" db:"company_id"`
	ParentDepartmentID   *int      `json:"parent_department_id,omitempty" db:"parent_department_id"`
	DepartmentCode       string    `json:"department_code" db:"department_code" validate:"required,max=50"`
	DepartmentName       string    `json:"department_name" db:"department_name" validate:"required,max=100"`
	DepartmentDescription *string  `json:"department_description,omitempty" db:"department_description"`
	DepartmentType       string    `json:"department_type" db:"department_type" validate:"oneof=business technical support management"`
	Level                int       `json:"level" db:"level"`
	SortOrder            int       `json:"sort_order" db:"sort_order"`
	IsActive             bool      `json:"is_active" db:"is_active"`
	ManagerUserID        *int      `json:"manager_user_id,omitempty" db:"manager_user_id"`
	DeputyManagerUserID  *int      `json:"deputy_manager_user_id,omitempty" db:"deputy_manager_user_id"`
	ContactPhone         *string   `json:"contact_phone,omitempty" db:"contact_phone"`
	ContactEmail         *string   `json:"contact_email,omitempty" db:"contact_email"`
	OfficeLocation       *string   `json:"office_location,omitempty" db:"office_location"`
	BudgetLimit          *float64  `json:"budget_limit,omitempty" db:"budget_limit"`
	EmployeeCount        int       `json:"employee_count" db:"employee_count"`
	CreatedBy            *int      `json:"created_by,omitempty" db:"created_by"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

// Position 岗位模型
type Position struct {
	ID                   int       `json:"id" db:"id"`
	CompanyID            int       `json:"company_id" db:"company_id"`
	PositionCode         string    `json:"position_code" db:"position_code" validate:"required,max=50"`
	PositionName         string    `json:"position_name" db:"position_name" validate:"required,max=100"`
	PositionDescription  *string   `json:"position_description,omitempty" db:"position_description"`
	PositionCategory     *string   `json:"position_category,omitempty" db:"position_category"`
	PositionLevel        int       `json:"position_level" db:"position_level" validate:"min=1,max=10"`
	SalaryRangeMin       *float64  `json:"salary_range_min,omitempty" db:"salary_range_min"`
	SalaryRangeMax       *float64  `json:"salary_range_max,omitempty" db:"salary_range_max"`
	RequiredSkills       []string  `json:"required_skills,omitempty" db:"required_skills"`
	RequiredEducation    *string   `json:"required_education,omitempty" db:"required_education"`
	RequiredExperience   *int      `json:"required_experience,omitempty" db:"required_experience"`
	ReportsToPositionID  *int      `json:"reports_to_position_id,omitempty" db:"reports_to_position_id"`
	IsManagementPosition bool      `json:"is_management_position" db:"is_management_position"`
	IsActive             bool      `json:"is_active" db:"is_active"`
	EmployeeCount        int       `json:"employee_count" db:"employee_count"`
	MaxEmployeeCount     *int      `json:"max_employee_count,omitempty" db:"max_employee_count"`
	CreatedBy            *int      `json:"created_by,omitempty" db:"created_by"`
	CreatedAt            time.Time `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time `json:"updated_at" db:"updated_at"`
}

// EmployeeAssignment 员工分配模型
type EmployeeAssignment struct {
	ID                  int       `json:"id" db:"id"`
	CompanyUserID       int       `json:"company_user_id" db:"company_user_id"`
	DepartmentID        int       `json:"department_id" db:"department_id"`
	PositionID          int       `json:"position_id" db:"position_id"`
	IsPrimaryAssignment bool      `json:"is_primary_assignment" db:"is_primary_assignment"`
	AssignmentType      string    `json:"assignment_type" db:"assignment_type" validate:"oneof=permanent temporary concurrent"`
	StartDate           time.Time `json:"start_date" db:"start_date"`
	EndDate             *time.Time `json:"end_date,omitempty" db:"end_date"`
	ReportingManagerID  *int      `json:"reporting_manager_id,omitempty" db:"reporting_manager_id"`
	WorkLocation        *string   `json:"work_location,omitempty" db:"work_location"`
	WorkSchedule        *string   `json:"work_schedule,omitempty" db:"work_schedule"`
	EmploymentStatus    string    `json:"employment_status" db:"employment_status" validate:"oneof=active inactive on_leave terminated"`
	Salary              *float64  `json:"salary,omitempty" db:"salary"`
	BonusEligible       bool      `json:"bonus_eligible" db:"bonus_eligible"`
	Notes               *string   `json:"notes,omitempty" db:"notes"`
	CreatedBy           *int      `json:"created_by,omitempty" db:"created_by"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// =============================================================================
// 请求/响应模型
// =============================================================================

// DepartmentCreateRequest 创建部门请求
type DepartmentCreateRequest struct {
	ParentDepartmentID   *int    `json:"parent_department_id,omitempty"`
	DepartmentCode       string  `json:"department_code" validate:"required,max=50"`
	DepartmentName       string  `json:"department_name" validate:"required,max=100"`
	DepartmentDescription *string `json:"department_description,omitempty"`
	DepartmentType       string  `json:"department_type" validate:"required,oneof=business technical support management"`
	ManagerUserID        *int    `json:"manager_user_id,omitempty"`
	DeputyManagerUserID  *int    `json:"deputy_manager_user_id,omitempty"`
	ContactPhone         *string `json:"contact_phone,omitempty"`
	ContactEmail         *string `json:"contact_email,omitempty"`
	OfficeLocation       *string `json:"office_location,omitempty"`
	BudgetLimit          *float64 `json:"budget_limit,omitempty"`
}

// DepartmentUpdateRequest 更新部门请求
type DepartmentUpdateRequest struct {
	DepartmentName       *string  `json:"department_name,omitempty" validate:"omitempty,max=100"`
	DepartmentDescription *string `json:"department_description,omitempty"`
	DepartmentType       *string  `json:"department_type,omitempty" validate:"omitempty,oneof=business technical support management"`
	ManagerUserID        *int     `json:"manager_user_id,omitempty"`
	DeputyManagerUserID  *int     `json:"deputy_manager_user_id,omitempty"`
	ContactPhone         *string  `json:"contact_phone,omitempty"`
	ContactEmail         *string  `json:"contact_email,omitempty"`
	OfficeLocation       *string  `json:"office_location,omitempty"`
	BudgetLimit          *float64 `json:"budget_limit,omitempty"`
	IsActive             *bool    `json:"is_active,omitempty"`
}

// PositionCreateRequest 创建岗位请求
type PositionCreateRequest struct {
	PositionCode         string   `json:"position_code" validate:"required,max=50"`
	PositionName         string   `json:"position_name" validate:"required,max=100"`
	PositionDescription  *string  `json:"position_description,omitempty"`
	PositionCategory     *string  `json:"position_category,omitempty"`
	PositionLevel        int      `json:"position_level" validate:"min=1,max=10"`
	SalaryRangeMin       *float64 `json:"salary_range_min,omitempty"`
	SalaryRangeMax       *float64 `json:"salary_range_max,omitempty"`
	RequiredSkills       []string `json:"required_skills,omitempty"`
	RequiredEducation    *string  `json:"required_education,omitempty"`
	RequiredExperience   *int     `json:"required_experience,omitempty"`
	ReportsToPositionID  *int     `json:"reports_to_position_id,omitempty"`
	IsManagementPosition bool     `json:"is_management_position"`
	MaxEmployeeCount     *int     `json:"max_employee_count,omitempty"`
}

// PositionUpdateRequest 更新岗位请求
type PositionUpdateRequest struct {
	PositionName         *string  `json:"position_name,omitempty" validate:"omitempty,max=100"`
	PositionDescription  *string  `json:"position_description,omitempty"`
	PositionCategory     *string  `json:"position_category,omitempty"`
	PositionLevel        *int     `json:"position_level,omitempty" validate:"omitempty,min=1,max=10"`
	SalaryRangeMin       *float64 `json:"salary_range_min,omitempty"`
	SalaryRangeMax       *float64 `json:"salary_range_max,omitempty"`
	RequiredSkills       []string `json:"required_skills,omitempty"`
	RequiredEducation    *string  `json:"required_education,omitempty"`
	RequiredExperience   *int     `json:"required_experience,omitempty"`
	ReportsToPositionID  *int     `json:"reports_to_position_id,omitempty"`
	IsManagementPosition *bool    `json:"is_management_position,omitempty"`
	IsActive             *bool    `json:"is_active,omitempty"`
	MaxEmployeeCount     *int     `json:"max_employee_count,omitempty"`
}

// EmployeeAssignmentRequest 员工分配请求
type EmployeeAssignmentRequest struct {
	CompanyUserID       int        `json:"company_user_id" validate:"required"`
	DepartmentID        int        `json:"department_id" validate:"required"`
	PositionID          int        `json:"position_id" validate:"required"`
	IsPrimaryAssignment bool       `json:"is_primary_assignment"`
	AssignmentType      string     `json:"assignment_type" validate:"required,oneof=permanent temporary concurrent"`
	StartDate           time.Time  `json:"start_date"`
	EndDate             *time.Time `json:"end_date,omitempty"`
	ReportingManagerID  *int       `json:"reporting_manager_id,omitempty"`
	WorkLocation        *string    `json:"work_location,omitempty"`
	WorkSchedule        *string    `json:"work_schedule,omitempty"`
	Salary              *float64   `json:"salary,omitempty"`
	BonusEligible       bool       `json:"bonus_eligible"`
	Notes               *string    `json:"notes,omitempty"`
}

// =============================================================================
// 响应模型
// =============================================================================

// DepartmentResponse 部门响应模型
type DepartmentResponse struct {
	Department
	ParentDepartment *DepartmentResponse   `json:"parent_department,omitempty"`
	ChildDepartments []DepartmentResponse  `json:"child_departments,omitempty"`
	Manager          *CompanyUserResponse  `json:"manager,omitempty"`
	DeputyManager    *CompanyUserResponse  `json:"deputy_manager,omitempty"`
	Positions        []PositionResponse    `json:"positions,omitempty"`
	EmployeeStats    *DepartmentStats      `json:"employee_stats,omitempty"`
}

// PositionResponse 岗位响应模型
type PositionResponse struct {
	Position
	ReportsToPosition *PositionResponse     `json:"reports_to_position,omitempty"`
	Departments       []DepartmentResponse  `json:"departments,omitempty"`
	Employees         []CompanyUserResponse `json:"employees,omitempty"`
	EmployeeStats     *PositionStats        `json:"employee_stats,omitempty"`
}

// EmployeeAssignmentResponse 员工分配响应模型
type EmployeeAssignmentResponse struct {
	EmployeeAssignment
	Employee         CompanyUserResponse `json:"employee"`
	Department       DepartmentResponse  `json:"department"`
	Position         PositionResponse    `json:"position"`
	ReportingManager *CompanyUserResponse `json:"reporting_manager,omitempty"`
}

// =============================================================================
// 统计模型
// =============================================================================

// DepartmentStats 部门统计
type DepartmentStats struct {
	TotalEmployees        int     `json:"total_employees"`
	PrimaryEmployees      int     `json:"primary_employees"`
	PositionCount         int     `json:"position_count"`
	ChildDepartmentCount  int     `json:"child_department_count"`
	AverageSalary         float64 `json:"average_salary"`
	BudgetUtilization     float64 `json:"budget_utilization"`
}

// PositionStats 岗位统计
type PositionStats struct {
	CurrentEmployees  int     `json:"current_employees"`
	MaxEmployees      int     `json:"max_employees"`
	DepartmentCount   int     `json:"department_count"`
	AverageSalary     float64 `json:"average_salary"`
	UtilizationRate   float64 `json:"utilization_rate"`
}

// OrganizationStats 组织架构统计
type OrganizationStats struct {
	TotalDepartments     int                    `json:"total_departments"`
	TotalPositions       int                    `json:"total_positions"`
	TotalEmployees       int                    `json:"total_employees"`
	DepartmentsByType    map[string]int         `json:"departments_by_type"`
	PositionsByCategory  map[string]int         `json:"positions_by_category"`
	EmployeesByLevel     map[int]int            `json:"employees_by_level"`
	OrganizationDepth    int                    `json:"organization_depth"`
}

// =============================================================================
// API路由设计
// =============================================================================

/*
企业组织架构管理API路由设计：

部门管理：
GET    /api/v1/companies/:companyId/departments           获取部门列表（树形结构）
POST   /api/v1/companies/:companyId/departments           创建部门
GET    /api/v1/companies/:companyId/departments/:id       获取部门详情
PUT    /api/v1/companies/:companyId/departments/:id       更新部门信息
DELETE /api/v1/companies/:companyId/departments/:id       删除部门
PATCH  /api/v1/companies/:companyId/departments/:id/move  移动部门到新的父部门

岗位管理：
GET    /api/v1/companies/:companyId/positions             获取岗位列表
POST   /api/v1/companies/:companyId/positions             创建岗位
GET    /api/v1/companies/:companyId/positions/:id         获取岗位详情
PUT    /api/v1/companies/:companyId/positions/:id         更新岗位信息
DELETE /api/v1/companies/:companyId/positions/:id         删除岗位

员工分配管理：
GET    /api/v1/companies/:companyId/assignments           获取员工分配列表
POST   /api/v1/companies/:companyId/assignments           创建员工分配
GET    /api/v1/companies/:companyId/assignments/:id       获取分配详情
PUT    /api/v1/companies/:companyId/assignments/:id       更新员工分配
DELETE /api/v1/companies/:companyId/assignments/:id       删除员工分配
POST   /api/v1/companies/:companyId/assignments/transfer  员工调动

组织架构查询：
GET    /api/v1/companies/:companyId/organization          获取完整组织架构
GET    /api/v1/companies/:companyId/organization/tree     获取组织架构树
GET    /api/v1/companies/:companyId/organization/stats    获取组织架构统计

用户组织关系：
GET    /api/v1/companies/:companyId/users/:userId/organization  获取用户组织关系
GET    /api/v1/companies/:companyId/departments/:id/employees   获取部门员工列表
GET    /api/v1/companies/:companyId/positions/:id/employees     获取岗位员工列表

历史记录：
GET    /api/v1/companies/:companyId/organization/history  获取组织架构变更历史

权限管理：
GET    /api/v1/companies/:companyId/organization/permissions        获取组织架构权限
POST   /api/v1/companies/:companyId/organization/permissions        设置组织架构权限
DELETE /api/v1/companies/:companyId/organization/permissions/:id   删除权限
*/

// =============================================================================
// 查询参数模型
// =============================================================================

// DepartmentListParams 部门列表查询参数
type DepartmentListParams struct {
	ParentID       *int   `form:"parent_id"`
	DepartmentType string `form:"department_type"`
	IsActive       *bool  `form:"is_active"`
	IncludeStats   bool   `form:"include_stats"`
	IncludeTree    bool   `form:"include_tree"`
	Search         string `form:"search"`
}

// PositionListParams 岗位列表查询参数
type PositionListParams struct {
	Category         string `form:"category"`
	Level            *int   `form:"level"`
	IsActive         *bool  `form:"is_active"`
	IsManagement     *bool  `form:"is_management"`
	DepartmentID     *int   `form:"department_id"`
	IncludeStats     bool   `form:"include_stats"`
	Search           string `form:"search"`
}

// AssignmentListParams 分配列表查询参数
type AssignmentListParams struct {
	DepartmentID     *int   `form:"department_id"`
	PositionID       *int   `form:"position_id"`
	UserID           *int   `form:"user_id"`
	AssignmentType   string `form:"assignment_type"`
	EmploymentStatus string `form:"employment_status"`
	IsPrimary        *bool  `form:"is_primary"`
	ManagerID        *int   `form:"manager_id"`
	StartDate        string `form:"start_date"`
	EndDate          string `form:"end_date"`
}