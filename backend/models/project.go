// Model Version: v1.0.0-frozen
// Architecture Freeze: 2024-08-24
// DO NOT make breaking changes to this model without version bump
// See ARCHITECTURE-BLUEPRINT-V1.md for change policies
package models

import (
	"time"
)

// Project represents a project in the system
type Project struct {
	ID            int        `json:"id" db:"id"`
	ProjectNumber *string    `json:"project_number,omitempty" db:"project_number"`
	Name          string     `json:"name" db:"name" validate:"required,min=1,max=100"`
	Description   string     `json:"description" db:"description"`
	OwnerID       int        `json:"owner_id" db:"owner_id"`
	CompanyID     *int       `json:"company_id,omitempty" db:"company_id"`     // 主客户ID（向后兼容）
	EnterpriseID  *int       `json:"enterprise_id,omitempty" db:"enterprise_id"` // 企业ID（新架构）
	Status        string     `json:"status" db:"status" validate:"oneof=planning active on_hold completed cancelled"`
	Priority      string     `json:"priority" db:"priority" validate:"oneof=high medium low"`
	Progress      int        `json:"progress" db:"progress" validate:"min=0,max=100"`
	StartDate     *time.Time `json:"start_date,omitempty" db:"start_date"`
	EndDate       *time.Time `json:"end_date,omitempty" db:"end_date"`
	Budget        *float64   `json:"budget,omitempty" db:"budget"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// ProjectRequest represents a project creation/update request
type ProjectRequest struct {
	ProjectNumber *string  `json:"project_number,omitempty"`
	Name          string   `json:"name" validate:"required,min=1,max=100"`
	Description   string   `json:"description"`
	CompanyID     *int     `json:"company_id,omitempty"`    // 主客户ID（向后兼容）
	CompanyIDs    []int    `json:"company_ids,omitempty"`   // 多客户ID列表
	EnterpriseID  *int     `json:"enterprise_id,omitempty"` // 企业ID（新架构）
	UserIDs       []int    `json:"user_ids,omitempty"`    // 项目用户ID列表
	Status        string   `json:"status" validate:"omitempty,oneof=planning active on_hold completed cancelled"`
	Priority      string   `json:"priority" validate:"omitempty,oneof=high medium low"`
	Progress      int      `json:"progress" validate:"min=0,max=100"`
	StartDate     *string  `json:"start_date,omitempty"` // 使用字符串接收，后续转换为time.Time
	EndDate       *string  `json:"end_date,omitempty"`   // 使用字符串接收，后续转换为time.Time
	Budget        *float64 `json:"budget,omitempty"`
}

// ProjectResponse represents a project response with additional info
type ProjectResponse struct {
	ID            int        `json:"id"`
	ProjectNumber *string    `json:"project_number,omitempty"`
	Name          string     `json:"name"`
	Description   string     `json:"description"`
	OwnerID       int        `json:"owner_id"`
	OwnerName     string     `json:"owner_name,omitempty"`
	CompanyID     *int       `json:"company_id,omitempty"`
	CompanyName   string     `json:"company_name,omitempty"`   // 客户名称（向后兼容）
	EnterpriseID  *int       `json:"enterprise_id,omitempty"` // 企业ID（新架构）
	EnterpriseName string    `json:"enterprise_name,omitempty"` // 企业名称（新架构）
	Status        string     `json:"status,omitempty"`
	Priority      string     `json:"priority,omitempty"`
	Progress      int        `json:"progress"`
	StartDate     *time.Time `json:"start_date,omitempty"`
	EndDate       *time.Time `json:"end_date,omitempty"`
	Budget        *float64   `json:"budget,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	TaskStats     *TaskStats `json:"task_stats,omitempty"`
}

// TaskStats represents task statistics for a project
type TaskStats struct {
	TotalTasks      int     `json:"total_tasks"`
	CompletedTasks  int     `json:"completed_tasks"`
	InProgressTasks int     `json:"in_progress_tasks"`
	TodoTasks       int     `json:"todo_tasks"`
	CompletionRate  float64 `json:"completion_rate"`
}

// RecycledProject represents a deleted project in the recycle bin
type RecycledProject struct {
	ID                int       `json:"id" db:"id"`
	Name              string    `json:"name" db:"name"`
	Description       string    `json:"description" db:"description"`
	OwnerID           int       `json:"owner_id" db:"owner_id"`
	OwnerUsername     string    `json:"owner_username" db:"owner_username"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
	DeletedAt         time.Time `json:"deleted_at" db:"deleted_at"`
	DeletedTasksCount int       `json:"deleted_tasks_count" db:"deleted_tasks_count"`
}

// ProjectCompany represents the relationship between a project and a company
type ProjectCompany struct {
	ID        int       `json:"id" db:"id"`
	ProjectID int       `json:"project_id" db:"project_id"`
	CompanyID int       `json:"company_id" db:"company_id"`
	Role      *string   `json:"role,omitempty" db:"role"`   // 角色：如"主客户"、"合作伙伴"等
	IsPrimary bool      `json:"is_primary" db:"is_primary"` // 是否为主客户
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ProjectUser represents the relationship between a project and a user
type ProjectUser struct {
	ID        int       `json:"id" db:"id"`
	ProjectID int       `json:"project_id" db:"project_id"`
	UserID    int       `json:"user_id" db:"user_id"`
	Role      string    `json:"role" db:"role" validate:"oneof=manager developer designer consultant customer"`
	IsPrimary bool      `json:"is_primary" db:"is_primary"` // 是否为主要负责人
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ProjectUserResponse represents a project user with additional info
type ProjectUserResponse struct {
	ID         int       `json:"id"`
	ProjectID  int       `json:"project_id"`
	UserID     int       `json:"user_id"`
	Role       string    `json:"role"`
	RoleName   string    `json:"role_name"`
	IsPrimary  bool      `json:"is_primary"`
	UserName   string    `json:"user_name,omitempty"`
	UserEmail  string    `json:"user_email,omitempty"`
	UserAvatar string    `json:"user_avatar,omitempty"`
	Department string    `json:"department,omitempty"`
	Phone      string    `json:"phone,omitempty"`
	JoinedAt   time.Time `json:"joined_at"`
}

// ProjectWithCompany 是一个扩展结构体，用于在数据库查询时包含客户信息
type ProjectWithCompany struct {
	Project
	CompanyName *string `db:"company_name"` // 来自 companies 表的客户名称
}

// ToResponse converts Project to ProjectResponse
func (p *Project) ToResponse() ProjectResponse {
	return ProjectResponse{
		ID:            p.ID,
		ProjectNumber: p.ProjectNumber,
		Name:          p.Name,
		Description:   p.Description,
		OwnerID:       p.OwnerID,
		CompanyID:     p.CompanyID,
		EnterpriseID:  p.EnterpriseID,
		Status:        p.Status,
		Priority:      p.Priority,
		Progress:      p.Progress,
		StartDate:     p.StartDate,
		EndDate:       p.EndDate,
		Budget:        p.Budget,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
	}
}

// ToResponseWithCompany converts ProjectWithCompany to ProjectResponse with company name
func (pwc *ProjectWithCompany) ToResponse() ProjectResponse {
	response := pwc.Project.ToResponse()

	// 设置客户名称
	if pwc.CompanyName != nil {
		response.CompanyName = *pwc.CompanyName
	} else {
		response.CompanyName = "未分配客户"
	}

	return response
}
