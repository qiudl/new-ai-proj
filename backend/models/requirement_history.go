package models

import (
	"time"
)

// RequirementHistoryAction represents the type of action performed on a requirement
type RequirementHistoryAction string

const (
	RequirementHistoryActionCreated        RequirementHistoryAction = "created"         // 创建
	RequirementHistoryActionUpdated        RequirementHistoryAction = "updated"         // 更新
	RequirementHistoryActionStatusChanged  RequirementHistoryAction = "status_changed"  // 状态变更
	RequirementHistoryActionReviewed       RequirementHistoryAction = "reviewed"        // 评审
	RequirementHistoryActionApproved       RequirementHistoryAction = "approved"        // 批准
	RequirementHistoryActionRejected       RequirementHistoryAction = "rejected"        // 拒绝
	RequirementHistoryActionConverted      RequirementHistoryAction = "converted"       // 转化为任务
	RequirementHistoryActionCommented      RequirementHistoryAction = "commented"       // 评论
	RequirementHistoryActionAssigned       RequirementHistoryAction = "assigned"        // 分配
	RequirementHistoryActionPriorityChanged RequirementHistoryAction = "priority_changed" // 优先级变更
	RequirementHistoryActionDueDateChanged RequirementHistoryAction = "due_date_changed" // 截止日期变更
	RequirementHistoryActionArchived       RequirementHistoryAction = "archived"        // 归档
	RequirementHistoryActionRestored       RequirementHistoryAction = "restored"        // 恢复
	RequirementHistoryActionDeleted        RequirementHistoryAction = "deleted"         // 删除
)

// RequirementHistory represents a history record of changes to a requirement
type RequirementHistory struct {
	// 主键
	ID int `json:"id" db:"id"`

	// 关联字段
	RequirementID int `json:"requirement_id" db:"requirement_id" validate:"required"`
	UserID        int `json:"user_id" db:"user_id" validate:"required"`

	// 变更信息
	Action    string  `json:"action" db:"action" validate:"required"`
	FieldName *string `json:"field_name,omitempty" db:"field_name"`
	OldValue  *string `json:"old_value,omitempty" db:"old_value"`
	NewValue  *string `json:"new_value,omitempty" db:"new_value"`
	Comment   *string `json:"comment,omitempty" db:"comment"`

	// 时间戳
	CreatedAt time.Time `json:"created_at" db:"created_at"`

	// 关联对象（不存储在数据库，通过JOIN查询填充）
	Username   *string `json:"username,omitempty" db:"username"`
	UserAvatar *string `json:"user_avatar,omitempty" db:"user_avatar"`
	UserType   *string `json:"user_type,omitempty" db:"user_type"`
}

// CreateRequirementHistoryRequest represents a request to create a history record
type CreateRequirementHistoryRequest struct {
	RequirementID int     `json:"requirement_id" validate:"required"`
	UserID        int     `json:"user_id" validate:"required"`
	Action        string  `json:"action" validate:"required"`
	FieldName     *string `json:"field_name,omitempty"`
	OldValue      *string `json:"old_value,omitempty"`
	NewValue      *string `json:"new_value,omitempty"`
	Comment       *string `json:"comment,omitempty"`
}

// RequirementHistoryResponse represents a history record response with additional info
type RequirementHistoryResponse struct {
	ID            int        `json:"id"`
	RequirementID int        `json:"requirement_id"`
	UserID        int        `json:"user_id"`
	Username      *string    `json:"username,omitempty"`
	UserAvatar    *string    `json:"user_avatar,omitempty"`
	UserType      *string    `json:"user_type,omitempty"`
	Action        string     `json:"action"`
	FieldName     *string    `json:"field_name,omitempty"`
	OldValue      *string    `json:"old_value,omitempty"`
	NewValue      *string    `json:"new_value,omitempty"`
	Comment       *string    `json:"comment,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	ActionDisplay string     `json:"action_display"` // Human-readable action description
}

// RequirementHistoryListResponse represents a paginated list of history records
type RequirementHistoryListResponse struct {
	Data     []RequirementHistoryResponse `json:"data"`
	Total    int                          `json:"total"`
	Page     int                          `json:"page"`
	PageSize int                          `json:"page_size"`
}

// RequirementHistoryFilters represents filtering options for history records
type RequirementHistoryFilters struct {
	RequirementID *int       `form:"requirement_id"`
	UserID        *int       `form:"user_id"`
	Actions       []string   `form:"action"`
	FieldName     *string    `form:"field_name"`
	CreatedAfter  *time.Time `form:"created_after"`
	CreatedBefore *time.Time `form:"created_before"`
	Page          int        `form:"page" validate:"min=1"`
	PageSize      int        `form:"page_size" validate:"min=1,max=100"`
	SortOrder     string     `form:"sort_order" validate:"oneof=asc desc"`
}

// RequirementHistoryStats represents requirement history statistics
type RequirementHistoryStats struct {
	TotalActions           int            `json:"total_actions"`
	ByAction               map[string]int `json:"by_action"`
	TodaysActions          int            `json:"todays_actions"`
	ThisWeeksActions       int            `json:"this_weeks_actions"`
	MostActiveUsers        []UserActivity `json:"most_active_users"`
	RecentStatusChanges    int            `json:"recent_status_changes"`
	AverageActionsPerRequirement float64  `json:"average_actions_per_requirement"`
}

// UserActivity represents user activity statistics
type UserActivity struct {
	UserID     int     `json:"user_id"`
	Username   string  `json:"username"`
	ActionCount int     `json:"action_count"`
}

// ToResponse converts RequirementHistory to RequirementHistoryResponse
func (h *RequirementHistory) ToResponse() RequirementHistoryResponse {
	return RequirementHistoryResponse{
		ID:            h.ID,
		RequirementID: h.RequirementID,
		UserID:        h.UserID,
		Username:      h.Username,
		UserAvatar:    h.UserAvatar,
		UserType:      h.UserType,
		Action:        h.Action,
		FieldName:     h.FieldName,
		OldValue:      h.OldValue,
		NewValue:      h.NewValue,
		Comment:       h.Comment,
		CreatedAt:     h.CreatedAt,
		ActionDisplay: GetActionDisplay(h.Action, h.FieldName, h.OldValue, h.NewValue),
	}
}

// GetActionDisplay returns a human-readable description of the action
func GetActionDisplay(action string, fieldName *string, oldValue *string, newValue *string) string {
	switch RequirementHistoryAction(action) {
	case RequirementHistoryActionCreated:
		return "创建了需求"
	case RequirementHistoryActionUpdated:
		if fieldName != nil {
			return "更新了字段: " + *fieldName
		}
		return "更新了需求"
	case RequirementHistoryActionStatusChanged:
		if oldValue != nil && newValue != nil {
			return "将状态从 '" + *oldValue + "' 变更为 '" + *newValue + "'"
		}
		return "变更了状态"
	case RequirementHistoryActionReviewed:
		return "评审了需求"
	case RequirementHistoryActionApproved:
		return "批准了需求"
	case RequirementHistoryActionRejected:
		return "拒绝了需求"
	case RequirementHistoryActionConverted:
		if newValue != nil {
			return "将需求转化为任务 #" + *newValue
		}
		return "将需求转化为任务"
	case RequirementHistoryActionCommented:
		return "添加了评论"
	case RequirementHistoryActionAssigned:
		if newValue != nil {
			return "分配评审人: " + *newValue
		}
		return "分配了评审人"
	case RequirementHistoryActionPriorityChanged:
		if oldValue != nil && newValue != nil {
			return "将优先级从 '" + *oldValue + "' 变更为 '" + *newValue + "'"
		}
		return "变更了优先级"
	case RequirementHistoryActionDueDateChanged:
		if oldValue != nil && newValue != nil {
			return "将截止日期从 '" + *oldValue + "' 变更为 '" + *newValue + "'"
		}
		return "变更了截止日期"
	case RequirementHistoryActionArchived:
		return "归档了需求"
	case RequirementHistoryActionRestored:
		return "恢复了需求"
	case RequirementHistoryActionDeleted:
		return "删除了需求"
	default:
		return action
	}
}

// ValidateHistoryAction validates if the action is valid
func ValidateRequirementHistoryAction(action string) bool {
	validActions := []string{
		string(RequirementHistoryActionCreated),
		string(RequirementHistoryActionUpdated),
		string(RequirementHistoryActionStatusChanged),
		string(RequirementHistoryActionReviewed),
		string(RequirementHistoryActionApproved),
		string(RequirementHistoryActionRejected),
		string(RequirementHistoryActionConverted),
		string(RequirementHistoryActionCommented),
		string(RequirementHistoryActionAssigned),
		string(RequirementHistoryActionPriorityChanged),
		string(RequirementHistoryActionDueDateChanged),
		string(RequirementHistoryActionArchived),
		string(RequirementHistoryActionRestored),
		string(RequirementHistoryActionDeleted),
	}
	for _, a := range validActions {
		if a == action {
			return true
		}
	}
	return false
}

// CreateHistoryRecord creates a standardized history record
func CreateHistoryRecord(requirementID, userID int, action RequirementHistoryAction, fieldName, oldValue, newValue, comment *string) CreateRequirementHistoryRequest {
	return CreateRequirementHistoryRequest{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        string(action),
		FieldName:     fieldName,
		OldValue:      oldValue,
		NewValue:      newValue,
		Comment:       comment,
	}
}

// Helper functions to create common history records
func NewCreatedHistoryRecord(requirementID, userID int) CreateRequirementHistoryRequest {
	return CreateHistoryRecord(requirementID, userID, RequirementHistoryActionCreated, nil, nil, nil, nil)
}

func NewStatusChangedHistoryRecord(requirementID, userID int, oldStatus, newStatus string, comment *string) CreateRequirementHistoryRequest {
	fieldName := "status"
	return CreateHistoryRecord(requirementID, userID, RequirementHistoryActionStatusChanged, &fieldName, &oldStatus, &newStatus, comment)
}

func NewApprovedHistoryRecord(requirementID, userID int, comment *string) CreateRequirementHistoryRequest {
	return CreateHistoryRecord(requirementID, userID, RequirementHistoryActionApproved, nil, nil, nil, comment)
}

func NewRejectedHistoryRecord(requirementID, userID int, comment *string) CreateRequirementHistoryRequest {
	return CreateHistoryRecord(requirementID, userID, RequirementHistoryActionRejected, nil, nil, nil, comment)
}

func NewConvertedHistoryRecord(requirementID, userID, taskID int) CreateRequirementHistoryRequest {
	fieldName := "converted_task_id"
	taskIDStr := string(rune(taskID))
	return CreateHistoryRecord(requirementID, userID, RequirementHistoryActionConverted, &fieldName, nil, &taskIDStr, nil)
}

func NewPriorityChangedHistoryRecord(requirementID, userID int, oldPriority, newPriority string) CreateRequirementHistoryRequest {
	fieldName := "priority"
	return CreateHistoryRecord(requirementID, userID, RequirementHistoryActionPriorityChanged, &fieldName, &oldPriority, &newPriority, nil)
}
