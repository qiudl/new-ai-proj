package models

import (
	"time"
)

// DailyFocusTask 今日主要任务模型
type DailyFocusTask struct {
	ID                        int        `json:"id" db:"id"`
	TaskID                    int        `json:"task_id" db:"task_id"`
	UserID                    int        `json:"user_id" db:"user_id"`
	ProjectID                 int        `json:"project_id" db:"project_id"`
	FocusDate                 time.Time  `json:"focus_date" db:"focus_date"`
	SortOrder                 int        `json:"sort_order" db:"sort_order"`
	PriorityLevel             string     `json:"priority_level" db:"priority_level"`
	IsAutoSuggested           bool       `json:"is_auto_suggested" db:"is_auto_suggested"`
	SuggestionReason          *string    `json:"suggestion_reason" db:"suggestion_reason"`
	SuggestionScore           *float64   `json:"suggestion_score" db:"suggestion_score"`
	Status                    string     `json:"status" db:"status"`
	CompletedAt               *time.Time `json:"completed_at" db:"completed_at"`
	CarriedFromDate           *time.Time `json:"carried_from_date" db:"carried_from_date"`
	UserNotes                 *string    `json:"user_notes" db:"user_notes"`
	EstimatedDurationMinutes  *int       `json:"estimated_duration_minutes" db:"estimated_duration_minutes"`
	CreatedAt                 time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt                 *time.Time `json:"updated_at" db:"updated_at"`
	CreatedBy                 *int       `json:"created_by" db:"created_by"`

	// 关联的任务信息 (通过JOIN获取)
	Task    *Task    `json:"task,omitempty"`
	Project *Project `json:"project,omitempty"`
}

// DailyFocusTaskWithDetails 包含详细信息的今日主要任务
type DailyFocusTaskWithDetails struct {
	DailyFocusTask
	TaskTitle       *string    `json:"task_title" db:"task_title"`
	TaskDescription *string    `json:"task_description" db:"task_description"`
	TaskStatus      *string    `json:"task_status" db:"task_status"`
	TaskPriority    *string    `json:"task_priority" db:"task_priority"`
	TaskDueDate     *time.Time `json:"task_due_date" db:"task_due_date"`
	TaskAssigneeID  *int       `json:"task_assignee_id" db:"task_assignee_id"`
	ProjectName     *string    `json:"project_name" db:"project_name"`
	ProjectCode     *string    `json:"project_code" db:"project_code"`
}

// TaskSuggestion 智能推荐任务
type TaskSuggestion struct {
	TaskID                   int     `json:"task_id" db:"task_id"`
	SuggestionReason         string  `json:"suggestion_reason" db:"suggestion_reason"`
	SuggestionScore          float64 `json:"suggestion_score" db:"suggestion_score"`
	EstimatedDurationMinutes int     `json:"estimated_duration_minutes" db:"estimated_duration_minutes"`
	Task                     *Task   `json:"task,omitempty"`
}

// CreateDailyFocusTaskRequest 创建今日主要任务请求
type CreateDailyFocusTaskRequest struct {
	TaskID                   int     `json:"task_id" validate:"required"`
	PriorityLevel            string  `json:"priority_level" validate:"omitempty,oneof=low medium high"`
	EstimatedDurationMinutes *int    `json:"estimated_duration_minutes" validate:"omitempty,min=0"`
	UserNotes                *string `json:"user_notes"`
	FocusDate                *string `json:"focus_date" validate:"omitempty"`
}

// UpdateDailyFocusTaskRequest 更新今日主要任务请求
type UpdateDailyFocusTaskRequest struct {
	PriorityLevel            *string `json:"priority_level" validate:"omitempty,oneof=low medium high"`
	EstimatedDurationMinutes *int    `json:"estimated_duration_minutes" validate:"omitempty,min=0"`
	UserNotes                *string `json:"user_notes"`
}

// ReorderTaskItem 重排序任务项
type ReorderTaskItem struct {
	ID        int `json:"id" validate:"required"`
	SortOrder int `json:"sort_order" validate:"required,min=0"`
}

// ReorderTasksRequest 批量重排序请求
type ReorderTasksRequest struct {
	ReorderItems []ReorderTaskItem `json:"reorder_items" validate:"required,min=1"`
}

// AcceptSuggestionsRequest 采用推荐任务请求
type AcceptSuggestionsRequest struct {
	TaskIDs   []int   `json:"task_ids" validate:"required,min=1"`
	FocusDate *string `json:"focus_date" validate:"omitempty"`
}

// CarryOverTasksRequest 延续任务请求
type CarryOverTasksRequest struct {
	FromDate string `json:"from_date" validate:"required"`
	ToDate   string `json:"to_date" validate:"required"`
	TaskIDs  []int  `json:"task_ids" validate:"omitempty"`
}

// DailyFocusTaskListResponse 今日主要任务列表响应
type DailyFocusTaskListResponse struct {
	FocusDate              string                      `json:"focus_date"`
	TotalCount             int                         `json:"total_count"`
	ActiveCount            int                         `json:"active_count"`
	CompletedCount         int                         `json:"completed_count"`
	EstimatedTotalMinutes  int                         `json:"estimated_total_minutes"`
	Tasks                  []DailyFocusTaskWithDetails `json:"tasks"`
	Suggestions            []TaskSuggestion            `json:"suggestions,omitempty"`
}

// TaskSuggestionsResponse 智能推荐响应
type TaskSuggestionsResponse struct {
	Suggestions []TaskSuggestion `json:"suggestions"`
}

// DailyFocusBatchResponse 今日主要任务批量操作响应
type DailyFocusBatchResponse struct {
	ProcessedCount int                        `json:"processed_count"`
	FailedCount    int                        `json:"failed_count"`
	FailedTasks    []DailyFocusBatchError     `json:"failed_tasks,omitempty"`
}

// DailyFocusBatchError 今日主要任务批量操作错误
type DailyFocusBatchError struct {
	TaskID int    `json:"task_id"`
	Error  string `json:"error"`
}

// DailyStatistics 每日统计
type DailyStatistics struct {
	Date           string  `json:"date"`
	Total          int     `json:"total"`
	Completed      int     `json:"completed"`
	CompletionRate float64 `json:"completion_rate"`
}

// StatisticsResponse 统计数据响应
type StatisticsResponse struct {
	Period                        string            `json:"period"`
	TotalFocusTasks               int               `json:"total_focus_tasks"`
	CompletedTasks                int               `json:"completed_tasks"`
	CompletionRate                float64           `json:"completion_rate"`
	AvgDailyTasks                 float64           `json:"avg_daily_tasks"`
	AvgCompletionTimeMinutes      float64           `json:"avg_completion_time_minutes"`
	DailyStats                    []DailyStatistics `json:"daily_stats"`
}

// DailyFocusTaskQuery 查询参数
type DailyFocusTaskQuery struct {
	Date               *string `form:"date"`
	Status             *string `form:"status" validate:"omitempty,oneof=active completed removed"`
	IncludeSuggestions *bool   `form:"include_suggestions"`
	Limit              *int    `form:"limit" validate:"omitempty,min=1,max=20"`
}

// TaskSuggestionQuery 推荐查询参数
type TaskSuggestionQuery struct {
	Date  *string `form:"date"`
	Limit *int    `form:"limit" validate:"omitempty,min=1,max=20"`
}

// StatisticsQuery 统计查询参数
type StatisticsQuery struct {
	StartDate string  `form:"start_date" validate:"required"`
	EndDate   string  `form:"end_date" validate:"required"`
	Period    *string `form:"period" validate:"omitempty,oneof=daily weekly monthly"`
}

// 常量定义
const (
	// 优先级常量
	PriorityLow    = "low"
	PriorityMedium = "medium"
	PriorityHigh   = "high"

	// 状态常量
	StatusActive      = "active"
	StatusCompleted   = "completed"
	StatusRemoved     = "removed"
	StatusCarriedOver = "carried_over"

	// 推荐原因常量
	SuggestionReasonManual              = "manual"
	SuggestionReasonDeadlineToday       = "deadline_today"
	SuggestionReasonDeadlineApproaching = "deadline_approaching"
	SuggestionReasonHighPriority        = "high_priority"
	SuggestionReasonOverdue             = "overdue"
	SuggestionReasonSuggested           = "suggested"

	// 默认配置
	DefaultDailyLimit = 10
	DefaultPageLimit  = 20
	MaxSuggestions    = 20
)

// 验证方法

// IsValidPriority 验证优先级
func IsValidPriority(priority string) bool {
	return priority == PriorityLow || priority == PriorityMedium || priority == PriorityHigh
}

// IsValidDailyFocusStatus 验证今日主要任务状态
func IsValidDailyFocusStatus(status string) bool {
	return status == StatusActive || status == StatusCompleted || 
		   status == StatusRemoved || status == StatusCarriedOver
}

// IsValidSuggestionReason 验证推荐原因
func IsValidSuggestionReason(reason string) bool {
	validReasons := []string{
		SuggestionReasonManual,
		SuggestionReasonDeadlineToday,
		SuggestionReasonDeadlineApproaching,
		SuggestionReasonHighPriority,
		SuggestionReasonOverdue,
		SuggestionReasonSuggested,
	}
	
	for _, validReason := range validReasons {
		if reason == validReason {
			return true
		}
	}
	return false
}

// ToTaskInfo 转换为任务信息
func (dft *DailyFocusTaskWithDetails) ToTaskInfo() *Task {
	if dft.TaskTitle == nil {
		return nil
	}
	
	task := &Task{
		ID:          dft.TaskID,
		Title:       *dft.TaskTitle,
		AssigneeID:  dft.TaskAssigneeID,
	}
	
	if dft.TaskDescription != nil {
		task.Description = dft.TaskDescription
	}
	if dft.TaskStatus != nil {
		task.Status = *dft.TaskStatus
	}
	if dft.TaskPriority != nil {
		task.Priority = *dft.TaskPriority
	}
	if dft.TaskDueDate != nil {
		task.DueDate = dft.TaskDueDate
	}
	
	return task
}

// ToProjectInfo 转换为项目信息
func (dft *DailyFocusTaskWithDetails) ToProjectInfo() *Project {
	if dft.ProjectName == nil {
		return nil
	}
	
	project := &Project{
		ID:   dft.ProjectID,
		Name: *dft.ProjectName,
	}
	
	if dft.ProjectCode != nil {
		project.ProjectNumber = dft.ProjectCode
	}
	
	return project
}

// CalculateCompletionRate 计算完成率
func CalculateCompletionRate(completed, total int) float64 {
	if total == 0 {
		return 0.0
	}
	return float64(completed) / float64(total)
}