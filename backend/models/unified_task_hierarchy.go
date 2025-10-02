package models

import "time"

// UnifiedTaskNode represents a task node in hierarchy responses
// This unified model supports both descendants (minimal) and children (full) API responses
type UnifiedTaskNode struct {
	// Core fields - always present (compatible with TaskDescendantNode)
	ID          int    `json:"id" db:"id"`
	ParentID    *int   `json:"parent_id" db:"parent_id"`
	ProjectID   int    `json:"project_id" db:"project_id"`
	Title       string `json:"title" db:"title"`
	Status      string `json:"status" db:"status"`
	Level       int    `json:"level" db:"level"`
	HasChildren bool   `json:"has_children" db:"has_children"`
	SortOrder   int    `json:"sort_order" db:"sort_order"`

	// Extended fields - present when requesting full task details (children API)
	Description      *string       `json:"description,omitempty" db:"description"`
	AssigneeID       *int          `json:"assignee_id,omitempty" db:"assignee_id"`
	AssigneeName     *string       `json:"assignee_name,omitempty"`
	DueDate          *time.Time    `json:"due_date,omitempty" db:"due_date"`
	Priority         *string       `json:"priority,omitempty"`
	CustomFields     *CustomFields `json:"custom_fields,omitempty" db:"custom_fields"`
	TotalTimeSeconds *int          `json:"total_time_seconds,omitempty" db:"total_time_seconds"`
	ChildrenCount    *int          `json:"children_count,omitempty" db:"children_count"`
	ProgressPercent  *int          `json:"progress_percent,omitempty"`

	// Timestamps - optional
	CreatedAt *time.Time `json:"created_at,omitempty" db:"created_at"`
	UpdatedAt *time.Time `json:"updated_at,omitempty" db:"updated_at"`

	// Enhanced time management fields - optional
	StartDatetime      *time.Time `json:"start_datetime,omitempty" db:"start_datetime"`
	DueDatetime        *time.Time `json:"due_datetime,omitempty" db:"due_datetime"`
	EstimatedMinutes   *int       `json:"estimated_minutes,omitempty" db:"estimated_minutes"`
	ActualMinutes      *int       `json:"actual_minutes,omitempty" db:"actual_minutes"`
	TimeUnitPreference *string    `json:"time_unit_preference,omitempty" db:"time_unit_preference"`
	WorkHoursPerDay    *float64   `json:"work_hours_per_day,omitempty" db:"work_hours_per_day"`
	TimeTrackingMode   *string    `json:"time_tracking_mode,omitempty" db:"time_tracking_mode"`

	// AI-enhanced fields - optional
	Dependencies   *Dependencies `json:"dependencies,omitempty" db:"dependencies"`
	EstimatedHours *float64      `json:"estimated_hours,omitempty" db:"estimated_hours"`
	Tags           *Tags         `json:"tags,omitempty" db:"tags"`
}

// TaskHierarchyResponse represents the unified response structure for task hierarchy APIs
type TaskHierarchyResponse struct {
	Root     *TaskRootInfo       `json:"root,omitempty"`
	Data     []*UnifiedTaskNode  `json:"data"`
	Meta     *TaskHierarchyMeta  `json:"meta"`
	PageInfo *TaskHierarchyPage  `json:"page_info,omitempty"`
	Pagination *Pagination       `json:"pagination,omitempty"`
}

// TaskRootInfo represents root task information
type TaskRootInfo struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Status      string `json:"status,omitempty"`
}

// TaskHierarchyMeta represents metadata about the hierarchy response
type TaskHierarchyMeta struct {
	RequestedDepth        int    `json:"requested_depth"`
	MaxDepthReached       bool   `json:"max_depth_reached"`
	Truncated             bool   `json:"truncated"`
	TotalReturned         int    `json:"total_returned"`
	HiddenNodesTruncated  bool   `json:"hidden_nodes_truncated"`
	ResponseType          string `json:"response_type"` // "descendants" or "children"
	IncludeExtendedFields bool   `json:"include_extended_fields"`
}

// TaskHierarchyPage represents pagination info for hierarchy responses
type TaskHierarchyPage struct {
	HasMore    bool        `json:"has_more"`
	NextCursor interface{} `json:"next_cursor"`
	Page       *int        `json:"page,omitempty"`
	PageSize   *int        `json:"page_size,omitempty"`
	Total      *int        `json:"total,omitempty"`
}

// NewUnifiedTaskNodeFromTask creates a UnifiedTaskNode from a full Task model
func NewUnifiedTaskNodeFromTask(task *Task, level int) *UnifiedTaskNode {
	node := &UnifiedTaskNode{
		// Core fields
		ID:          task.ID,
		ParentID:    task.ParentID,
		ProjectID:   task.ProjectID,
		Title:       task.Title,
		Status:      task.Status,
		Level:       level,
		HasChildren: task.HasChildren,
		SortOrder:   task.SortOrder,

		// Extended fields
		Description:      task.Description,
		AssigneeID:       task.AssigneeID,
		DueDate:          task.DueDate,
		CustomFields:     &task.CustomFields,
		TotalTimeSeconds: &task.TotalTimeSeconds,
		ChildrenCount:    &task.ChildrenCount,
		CreatedAt:        &task.CreatedAt,
		UpdatedAt:        &task.UpdatedAt,

		// Enhanced time management
		StartDatetime:      task.StartDatetime,
		DueDatetime:        task.DueDatetime,
		EstimatedMinutes:   &task.EstimatedMinutes,
		ActualMinutes:      &task.ActualMinutes,
		TimeUnitPreference: &task.TimeUnitPreference,
		WorkHoursPerDay:    &task.WorkHoursPerDay,
		TimeTrackingMode:   &task.TimeTrackingMode,

		// AI-enhanced fields
		Dependencies:   &task.Dependencies,
		EstimatedHours: task.EstimatedHours,
		Tags:           &task.Tags,
	}

	// Add assignee name from custom fields if available
	if task.CustomFields != nil {
		if assigneeName, exists := task.CustomFields["assignee_name"]; exists {
			if name, ok := assigneeName.(string); ok && name != "" {
				node.AssigneeName = &name
			}
		}
		if priority, exists := task.CustomFields["priority"]; exists {
			if p, ok := priority.(string); ok && p != "" {
				node.Priority = &p
			}
		}
		if progress, exists := task.CustomFields["progress"]; exists {
			if p, ok := progress.(float64); ok {
				progressInt := int(p)
				node.ProgressPercent = &progressInt
			}
		}
	}

	return node
}

// NewUnifiedTaskNodeFromDescendant creates a UnifiedTaskNode from a TaskDescendantNode (minimal fields)
func NewUnifiedTaskNodeFromDescendant(descendant *TaskDescendantNode) *UnifiedTaskNode {
	return &UnifiedTaskNode{
		// Core fields only
		ID:          descendant.ID,
		ParentID:    &descendant.ParentID,
		ProjectID:   descendant.ProjectID,
		Title:       descendant.Title,
		Status:      descendant.Status,
		Level:       descendant.Level,
		HasChildren: descendant.HasChildren,
		SortOrder:   descendant.SortOrder,
		// Extended fields are nil for descendants response
	}
}

// NewTaskHierarchyResponse creates a new TaskHierarchyResponse
func NewTaskHierarchyResponse(responseType string, includeExtendedFields bool) *TaskHierarchyResponse {
	return &TaskHierarchyResponse{
		Data: make([]*UnifiedTaskNode, 0),
		Meta: &TaskHierarchyMeta{
			ResponseType:          responseType,
			IncludeExtendedFields: includeExtendedFields,
		},
	}
}