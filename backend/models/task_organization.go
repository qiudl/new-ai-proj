package models

import "time"

// OrphanScanResult 孤立任务扫描结果
type OrphanScanResult struct {
	TotalOrphans int           `json:"total_orphans"` // 孤立任务总数
	Organizable  int           `json:"organizable"`   // 可组织任务数
	Archived     int           `json:"archived"`      // 已归档任务数
	Preview      []WeekPreview `json:"preview"`       // 预览数据
}

// TaskBrief 任务简要信息
type TaskBrief struct {
	ID     int64  `json:"id"`     // 任务ID
	Title  string `json:"title"`  // 任务标题
	Status string `json:"status"` // 任务状态
}

// WeekPreview 周汇总预览信息
type WeekPreview struct {
	WeekNumber int         `json:"week_number"` // ISO周次
	WeekRange  string      `json:"week_range"`  // 日期范围 (MM/DD-MM/DD)
	ParentID   *int        `json:"parent_id"`   // 父任务ID (null表示需要创建)
	TaskCount  int         `json:"task_count"`  // 任务数量
	TaskIDs    []int       `json:"task_ids"`    // 任务ID列表
	Tasks      []TaskBrief `json:"tasks"`       // 任务详情列表
}

// WeekSummaryInfo 周汇总任务信息
type WeekSummaryInfo struct {
	TaskID     int    `json:"task_id"`
	WeekNumber int    `json:"week_number"`
	WeekRange  string `json:"week_range"`
	Title      string `json:"title"`
}

// OrganizeRequest 组织任务请求
type OrganizeRequest struct {
	TaskIDs         []int `json:"task_ids" binding:"required"`         // 要组织的任务ID列表
	AutoCreateWeeks bool  `json:"auto_create_weeks"`                   // 是否自动创建周汇总任务
}

// OrganizeResult 组织任务结果
type OrganizeResult struct {
	Organized int              `json:"organized"` // 成功组织数量
	Skipped   int              `json:"skipped"`   // 跳过数量
	Failed    int              `json:"failed"`    // 失败数量
	Details   []OrganizeDetail `json:"details"`   // 详细结果
}

// OrganizeDetail 单个任务组织详情
type OrganizeDetail struct {
	TaskID    int    `json:"task_id"`             // 任务ID
	TaskTitle string `json:"task_title,omitempty"` // 任务标题
	Success   bool   `json:"success"`             // 是否成功
	Message   string `json:"message"`             // 消息
	ParentID  *int   `json:"parent_id,omitempty"` // 父任务ID
}

// TaskOrganizationInfo 任务组织信息（用于内部处理）
type TaskOrganizationInfo struct {
	TaskID      int
	Title       string
	Status      string
	CreatedAt   time.Time
	ParentID    *int
	WeekNumber  int
	WeekRange   string
}
