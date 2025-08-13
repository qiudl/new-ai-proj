package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// CustomFields represents JSONB custom fields
type CustomFields map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (cf CustomFields) Value() (driver.Value, error) {
	if cf == nil {
		return nil, nil
	}
	return json.Marshal(cf)
}

// Scan implements the sql.Scanner interface for database retrieval
func (cf *CustomFields) Scan(value interface{}) error {
	if value == nil {
		*cf = CustomFields{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into CustomFields", value)
	}

	// First try to unmarshal as normal map
	var temp map[string]interface{}
	if err := json.Unmarshal(bytes, &temp); err == nil {
		*cf = CustomFields(temp)
		return nil
	}

	// If that fails, try to handle as array (for backward compatibility)
	var arr []interface{}
	if err := json.Unmarshal(bytes, &arr); err == nil {
		// Convert array to map by merging non-nil map elements
		result := make(CustomFields)
		for _, item := range arr {
			if itemMap, ok := item.(map[string]interface{}); ok {
				for k, v := range itemMap {
					if v != nil && k != "" {
						result[k] = v
					}
				}
			}
		}
		*cf = result
		return nil
	}

	// If both fail, try to unmarshal directly to CustomFields
	return json.Unmarshal(bytes, cf)
}

// Dependencies represents a list of task IDs that this task depends on
type Dependencies []int

// Value implements the driver.Valuer interface for database storage
func (d Dependencies) Value() (driver.Value, error) {
	if d == nil {
		return "[]", nil
	}
	return json.Marshal(d)
}

// Scan implements the sql.Scanner interface for database retrieval
func (d *Dependencies) Scan(value interface{}) error {
	if value == nil {
		*d = Dependencies{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into Dependencies", value)
	}

	return json.Unmarshal(bytes, d)
}

// Tags represents a list of tags for task categorization
type Tags []string

// Value implements the driver.Valuer interface for database storage
func (t Tags) Value() (driver.Value, error) {
	if t == nil {
		return "[]", nil
	}
	return json.Marshal(t)
}

// Scan implements the sql.Scanner interface for database retrieval
func (t *Tags) Scan(value interface{}) error {
	if value == nil {
		*t = Tags{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into Tags", value)
	}

	return json.Unmarshal(bytes, t)
}

// Task represents a task in the system
type Task struct {
	ID                int          `json:"id" db:"id"`
	ProjectID         int          `json:"project_id" db:"project_id" validate:"required"`
	Title             string       `json:"title" db:"title" validate:"required,min=1,max=255"`
	Description       string       `json:"description" db:"description"`
	Status            string       `json:"status" db:"status" validate:"required,oneof=todo in_progress completed cancelled"`
	AssigneeID        *int         `json:"assignee_id" db:"assignee_id"`
	DueDate           *time.Time   `json:"due_date" db:"due_date"`
	CustomFields      CustomFields `json:"custom_fields" db:"custom_fields"`
	ParentID          *int         `json:"parent_id" db:"parent_id"`
	TaskLevel         int          `json:"task_level" db:"task_level"`
	SortOrder         int          `json:"sort_order" db:"sort_order"`
	TotalTimeSeconds  int          `json:"total_time_seconds" db:"total_time_seconds"`
	// AI-enhanced fields
	Dependencies      Dependencies `json:"dependencies" db:"dependencies"`
	EstimatedHours    *float64     `json:"estimated_hours" db:"estimated_hours"`
	Priority          string       `json:"priority" db:"priority" validate:"oneof=low medium high"`
	Tags              Tags         `json:"tags" db:"tags"`
	CreatedAt         time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt         *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
}

// TaskRequest represents a task creation/update request
type TaskRequest struct {
	Title          string       `json:"title" validate:"required,min=1,max=255"`
	Description    string       `json:"description"`
	Status         string       `json:"status" validate:"required,oneof=todo in_progress completed cancelled"`
	AssigneeID     *int         `json:"assignee_id"`
	DueDate        *time.Time   `json:"due_date"`
	CustomFields   CustomFields `json:"custom_fields"`
	ParentID       *int         `json:"parent_id"`
	SortOrder      int          `json:"sort_order"`
	// AI-enhanced fields
	Dependencies   Dependencies `json:"dependencies"`
	EstimatedHours *float64     `json:"estimated_hours" validate:"min=0"` 
	Priority       string       `json:"priority" validate:"oneof=low medium high"` 
	Tags           Tags         `json:"tags"` 
	// Legacy fields (keeping for backward compatibility)
	ActualHours    *float64     `json:"actual_hours" validate:"min=0"` 
	Progress       *int         `json:"progress" validate:"min=0,max=100"` 
	Metadata       CustomFields `json:"metadata"`
}

// TaskResponse represents a task response with additional info
type TaskResponse struct {
	ID             int          `json:"id"`
	ProjectID      int          `json:"project_id"`
	ProjectName    string       `json:"project_name,omitempty"`
	Title          string       `json:"title"`
	Description    string       `json:"description"`
	Status         string       `json:"status"`
	AssigneeID     *int         `json:"assignee_id"`
	AssigneeName   string       `json:"assignee_name,omitempty"`
	DueDate        *time.Time   `json:"due_date"`
	CustomFields   CustomFields `json:"custom_fields"`
	ParentID       *int         `json:"parent_id"`
	TaskLevel      int          `json:"task_level"`
	SortOrder      int          `json:"sort_order"`
	ParentTitle    string       `json:"parent_title,omitempty"`
	ChildrenCount  int          `json:"children_count"`
	Depth          int          `json:"depth"`
	HasChildren    bool         `json:"has_children"`
	// AI-enhanced fields
	Dependencies   Dependencies `json:"dependencies"`
	EstimatedHours *float64     `json:"estimated_hours"`
	Priority       string       `json:"priority"`
	Tags           Tags         `json:"tags"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

// BulkImportRequest represents a bulk task import request
type BulkImportRequest struct {
	Tasks []TaskRequest `json:"tasks" validate:"required,min=1,max=1000,dive"`
}

// BulkImportResponse represents a bulk import response
type BulkImportResponse struct {
	TotalTasks    int   `json:"total_tasks"`
	SuccessCount  int   `json:"success_count"`
	FailureCount  int   `json:"failure_count"`
	FailedTasks   []int `json:"failed_tasks,omitempty"`
	ImportedTasks []int `json:"imported_tasks"`
}

// TaskFilter represents task filtering options
type TaskFilter struct {
	Status     string `form:"status"`
	AssigneeID *int   `form:"assignee_id"`
	DueAfter   string `form:"due_after"`
	DueBefore  string `form:"due_before"`
	Search     string `form:"search"`
}

// BatchUpdateTasksRequest represents a batch update request for multiple tasks
type BatchUpdateTasksRequest struct {
	TaskIDs   []int   `json:"task_ids" validate:"required,min=1"`
	Status    *string `json:"status,omitempty" validate:"omitempty,oneof=todo in_progress completed cancelled"`
	ParentID  *int    `json:"parent_id,omitempty"`
	UpdatedBy *int    `json:"updated_by,omitempty"`
}

// BatchUpdateTasksResponse represents the response for batch update operation
type BatchUpdateTasksResponse struct {
	UpdatedCount int              `json:"updated_count"`
	FailedTasks  []BatchTaskError `json:"failed_tasks,omitempty"`
	Message      string           `json:"message"`
}

// BatchTaskError represents an error for a specific task during batch operation
type BatchTaskError struct {
	TaskID int    `json:"task_id"`
	Error  string `json:"error"`
}


// TaskUpdate represents a task update history record
type TaskUpdate struct {
	ID          int       `json:"id" db:"id"`
	TaskID      int       `json:"task_id" db:"task_id"`
	UpdateType  string    `json:"update_type" db:"update_type"`
	OldValue    *string   `json:"old_value" db:"old_value"`
	NewValue    *string   `json:"new_value" db:"new_value"`
	UpdatedBy   *int      `json:"updated_by" db:"updated_by"`
	Notes       *string   `json:"notes" db:"notes"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedByUsername *string `json:"updated_by_username,omitempty" db:"updated_by_username"`
}

// TimelineEvent represents a task timeline event
type TimelineEvent struct {
	ID          int             `json:"id" db:"id"`
	TaskID      int             `json:"task_id" db:"task_id"`
	EventType   string          `json:"event_type" db:"event_type"`
	EventDate   time.Time       `json:"event_date" db:"event_date"`
	Description string          `json:"description" db:"description"`
	UserID      *int            `json:"user_id" db:"user_id"`
	Metadata    CustomFields    `json:"metadata" db:"metadata"`
	Username    *string         `json:"username,omitempty" db:"username"`
	TaskTitle   string          `json:"task_title,omitempty" db:"task_title"`
}

// HierarchicalTask represents a task with its children
type HierarchicalTask struct {
	*Task
	Children []*HierarchicalTask `json:"children,omitempty"`
}

// RecycledTask represents a deleted task in the recycle bin
type RecycledTask struct {
	ID               int          `json:"id" db:"id"`
	ProjectID        int          `json:"project_id" db:"project_id"`
	Title            string       `json:"title" db:"title"`
	Description      string       `json:"description" db:"description"`
	Status           string       `json:"status" db:"status"`
	AssigneeID       *int         `json:"assignee_id" db:"assignee_id"`
	DueDate          *time.Time   `json:"due_date" db:"due_date"`
	CustomFields     CustomFields `json:"custom_fields" db:"custom_fields"`
	ParentID         *int         `json:"parent_id" db:"parent_id"`
	TaskLevel        int          `json:"task_level" db:"task_level"`
	CreatedAt        time.Time    `json:"created_at" db:"created_at"`
	DeletedAt        time.Time    `json:"deleted_at" db:"deleted_at"`
	ProjectName      string       `json:"project_name" db:"project_name"`
	AssigneeUsername *string      `json:"assignee_username" db:"assignee_username"`
	ParentTaskTitle  *string      `json:"parent_task_title" db:"parent_task_title"`
}

// ToResponse converts Task to TaskResponse
func (t *Task) ToResponse() TaskResponse {
	return TaskResponse{
		ID:           t.ID,
		ProjectID:    t.ProjectID,
		Title:        t.Title,
		Description:  t.Description,
		Status:       t.Status,
		AssigneeID:   t.AssigneeID,
		DueDate:      t.DueDate,
		CustomFields: t.CustomFields,
		ParentID:     t.ParentID,
		TaskLevel:    t.TaskLevel,
		SortOrder:    t.SortOrder,
		Depth:        t.TaskLevel, // 默认使用 TaskLevel 作为 Depth
		HasChildren:  false,       // 默认值，需要在查询时设置
		CreatedAt:    t.CreatedAt,
		UpdatedAt:    t.UpdatedAt,
	}
}

// ToResponseWithRelations converts Task to TaskResponse with additional relation info
func (t *Task) ToResponseWithRelations(projectName, assigneeName, parentTitle string, childrenCount int, depth int) TaskResponse {
	response := t.ToResponse()
	response.ProjectName = projectName
	response.AssigneeName = assigneeName
	response.ParentTitle = parentTitle
	response.ChildrenCount = childrenCount
	response.Depth = depth
	response.HasChildren = childrenCount > 0
	return response
}

// TaskDocument 任务文档统一模型
type TaskDocument struct {
	ID           int                  `json:"id" db:"id"`
	TaskID       int                  `json:"task_id" db:"task_id"`
	ProjectID    int                  `json:"project_id" db:"project_id"`
	DocumentID   int                  `json:"document_id" db:"document_id"`
	Title        string               `json:"title" db:"title"`
	Content      *string              `json:"content" db:"content"`
	Type         string               `json:"type" db:"type"`
	Status       string               `json:"status" db:"status"`
	Version      int                  `json:"version" db:"version"`
	Metadata     CustomFields         `json:"metadata" db:"metadata"`
	OwnerID      int                  `json:"owner_id" db:"owner_id"`
	CreatedBy    int                  `json:"created_by" db:"created_by"`
	CreatedAt    time.Time            `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time            `json:"updated_at" db:"updated_at"`
	
	// 关联字段
	TaskTitle    string               `json:"task_title,omitempty" db:"task_title"`
	ProjectName  string               `json:"project_name,omitempty" db:"project_name"`
	OwnerName    *string              `json:"owner_name,omitempty" db:"owner_name"`
	CreatorName  *string              `json:"creator_name,omitempty" db:"creator_name"`
	DocumentExists bool               `json:"document_exists,omitempty"`
}

// CreateTaskDocumentRequest 创建任务文档请求
type CreateTaskDocumentRequest struct {
	Content     *string              `json:"content"`
	Title       *string              `json:"title"`
	Metadata    CustomFields         `json:"metadata"`
	IsTemplate  bool                 `json:"is_template"`
}

// UpdateTaskDocumentRequest 更新任务文档请求
type UpdateTaskDocumentRequest struct {
	Content     *string              `json:"content"`
	Title       *string              `json:"title"`
	Status      *string              `json:"status"`
	Metadata    *CustomFields        `json:"metadata"`
}

// TaskDocumentResponse 任务文档响应
type TaskDocumentResponse struct {
	TaskDocument
	CanEdit      bool                 `json:"can_edit"`
	CanDelete    bool                 `json:"can_delete"`
	Relations    []DocumentRelation   `json:"relations,omitempty"`
	LastModified *time.Time           `json:"last_modified,omitempty"`
}

// TaskDocumentListItem 任务文档列表项
type TaskDocumentListItem struct {
	TaskID       int       `json:"task_id"`
	ProjectID    int       `json:"project_id"`
	TaskTitle    string    `json:"task_title"`
	ProjectName  string    `json:"project_name"`
	TaskStatus   string    `json:"task_status"`
	DocumentID   *int      `json:"document_id"`
	DocumentExists bool    `json:"document_exists"`
	LastModified *time.Time `json:"last_modified"`
	ContentSize  *int64    `json:"content_size"`
	CreatedAt    time.Time `json:"created_at"`
}

// TaskDocumentStats 任务文档统计
type TaskDocumentStats struct {
	TotalTasks      int `json:"total_tasks"`
	WithDocument    int `json:"with_document"`
	WithoutDocument int `json:"without_document"`
	RecentlyUpdated int `json:"recently_updated"`
}

// TaskRelationship represents a relationship between tasks for parallel development
type TaskRelationship struct {
	ID                 int          `json:"id" db:"id"`
	SourceTaskID       int          `json:"source_task_id" db:"source_task_id"`
	TargetTaskID       int          `json:"target_task_id" db:"target_task_id"`
	RelationshipType   string       `json:"relationship_type" db:"relationship_type"`
	RelationshipStatus string       `json:"relationship_status" db:"relationship_status"`
	CreatedBy          int          `json:"created_by" db:"created_by"`
	Metadata           CustomFields `json:"metadata" db:"metadata"`
	CreatedAt          time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt          *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
	
	// Related task information (populated in queries)
	SourceTaskTitle    string `json:"source_task_title,omitempty" db:"source_task_title"`
	TargetTaskTitle    string `json:"target_task_title,omitempty" db:"target_task_title"`
	CreatedByUsername  string `json:"created_by_username,omitempty" db:"created_by_username"`
}

// TaskStatusHistory represents the history of task status changes
type TaskStatusHistory struct {
	ID                 int       `json:"id" db:"id"`
	TaskID             int       `json:"task_id" db:"task_id"`
	OldStatus          *string   `json:"old_status" db:"old_status"`
	NewStatus          string    `json:"new_status" db:"new_status"`
	ChangeReason       *string   `json:"change_reason" db:"change_reason"`
	ChangeType         string    `json:"change_type" db:"change_type"`
	ChangedBy          int       `json:"changed_by" db:"changed_by"`
	RelatedTaskIDs     []int     `json:"related_task_ids" db:"related_task_ids"`
	WorkflowStage      *string   `json:"workflow_stage" db:"workflow_stage"`
	ParallelGroupID    *string   `json:"parallel_group_id" db:"parallel_group_id"`
	DependencyResolved bool      `json:"dependency_resolved" db:"dependency_resolved"`
	Metadata           CustomFields `json:"metadata" db:"metadata"`
	ChangeTimestamp    time.Time    `json:"change_timestamp" db:"change_timestamp"`
	CreatedAt          time.Time    `json:"created_at" db:"created_at"`
	
	// Related information (populated in queries)
	TaskTitle          string `json:"task_title,omitempty" db:"task_title"`
	ChangedByUsername  string `json:"changed_by_username,omitempty" db:"changed_by_username"`
}

// RelationshipTypes defines valid task relationship types
var RelationshipTypes = []string{
	"depends_on",     // 依赖关系（A依赖于B）
	"blocks",         // 阻塞关系（A阻塞B）  
	"parallel_with",  // 并行关系（A与B并行）
	"follows",        // 顺序关系（A跟随B）
	"related_to",     // 相关关系（A与B相关）
	"child_of",       // 子任务关系（A是B的子任务）
	"parent_of",      // 父任务关系（A是B的父任务）
	"sibling_of",     // 兄弟关系（A与B是兄弟任务）
}

// ChangeTypes defines valid status change types
var ChangeTypes = []string{
	"manual",              // 手动更改
	"automatic",           // 自动更改
	"dependency_resolved", // 依赖解决触发
	"parallel_sync",       // 并行同步触发
	"workflow_transition", // 工作流转换
	"bulk_update",         // 批量更新
	"system_migration",    // 系统迁移
}

// TaskRelationshipRequest represents a request to create/update task relationships
type TaskRelationshipRequest struct {
	SourceTaskID       int          `json:"source_task_id" validate:"required"`
	TargetTaskID       int          `json:"target_task_id" validate:"required"`
	RelationshipType   string       `json:"relationship_type" validate:"required,oneof=depends_on blocks parallel_with follows related_to child_of parent_of sibling_of"`
	RelationshipStatus string       `json:"relationship_status" validate:"omitempty,oneof=active inactive completed cancelled"`
	Metadata           CustomFields `json:"metadata"`
}

// TaskWithRelationships extends Task with relationship information
type TaskWithRelationships struct {
	Task
	Dependencies      []TaskRelationship `json:"dependencies,omitempty"`
	Dependents        []TaskRelationship `json:"dependents,omitempty"`
	ParallelTasks     []TaskRelationship `json:"parallel_tasks,omitempty"`
	RelatedTasks      []TaskRelationship `json:"related_tasks,omitempty"`
	BlockedBy         []TaskRelationship `json:"blocked_by,omitempty"`
	Blocking          []TaskRelationship `json:"blocking,omitempty"`
	StatusHistory     []TaskStatusHistory `json:"status_history,omitempty"`
}

// ParallelDevelopmentGroup represents a group of tasks that can be developed in parallel
type ParallelDevelopmentGroup struct {
	GroupID           string      `json:"group_id"`
	GroupName         string      `json:"group_name"`
	Tasks             []Task      `json:"tasks"`
	TotalTasks        int         `json:"total_tasks"`
	CompletedTasks    int         `json:"completed_tasks"`
	InProgressTasks   int         `json:"in_progress_tasks"`
	TodoTasks         int         `json:"todo_tasks"`
	CompletionPercent float64     `json:"completion_percent"`
	LastUpdate        time.Time   `json:"last_update"`
	CanStartParallel  bool        `json:"can_start_parallel"`
	Dependencies      []int       `json:"dependencies,omitempty"`
}

// WorkflowStage represents a stage in the parallel development workflow
type WorkflowStage struct {
	StageID           string    `json:"stage_id"`
	StageName         string    `json:"stage_name"`
	StageDescription  string    `json:"stage_description"`
	CanRunInParallel  bool      `json:"can_run_in_parallel"`
	Dependencies      []string  `json:"dependencies,omitempty"`
	EstimatedHours    float64   `json:"estimated_hours"`
	Tasks             []int     `json:"tasks,omitempty"`
}

// TaskDependencyGraph represents the dependency graph for visualization
type TaskDependencyGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

// GraphNode represents a task node in the dependency graph
type GraphNode struct {
	ID          int     `json:"id"`
	Title       string  `json:"title"`
	Status      string  `json:"status"`
	NodeType    string  `json:"node_type"` // task, milestone, group
	Level       int     `json:"level"`
	CanStart    bool    `json:"can_start"`
	IsBlocked   bool    `json:"is_blocked"`
	Coordinates struct {
		X int `json:"x"`
		Y int `json:"y"`
	} `json:"coordinates"`
}

// GraphEdge represents a relationship edge in the dependency graph
type GraphEdge struct {
	Source           int    `json:"source"`
	Target           int    `json:"target"`
	RelationshipType string `json:"relationship_type"`
	EdgeStyle        string `json:"edge_style"` // solid, dashed, dotted
	Weight           int    `json:"weight"`
}

// ParallelExecutionRequest represents a request to initiate parallel task execution
type ParallelExecutionRequest struct {
	TaskIDs         []int        `json:"task_ids" validate:"required,min=1"`
	ParallelGroupID string       `json:"parallel_group_id"`
	InitiatedBy     int          `json:"initiated_by" validate:"required"`
	ExecutionMode   string       `json:"execution_mode" validate:"oneof=async sync"`
	MaxConcurrency  int          `json:"max_concurrency" validate:"min=1,max=10"`
	Metadata        CustomFields `json:"metadata"`
}

// ParallelExecutionStatus represents the status of parallel task execution
type ParallelExecutionStatus struct {
	ExecutionID      string       `json:"execution_id"`
	ParallelGroupID  string       `json:"parallel_group_id"`
	TaskIDs          []int        `json:"task_ids"`
	Status           string       `json:"status"` // running, completed, failed, partial_failure, blocked
	StartTime        time.Time    `json:"start_time"`
	LastUpdate       time.Time    `json:"last_update"`
	CompletionTime   *time.Time   `json:"completion_time,omitempty"`
	InitiatedBy      int          `json:"initiated_by"`
	TotalTasks       int          `json:"total_tasks"`
	CompletedTasks   int          `json:"completed_tasks"`
	InProgressTasks  int          `json:"in_progress_tasks"`
	FailedTasks      int          `json:"failed_tasks"`
	BlockedTasks     []int        `json:"blocked_tasks,omitempty"`
	Message          string       `json:"message,omitempty"`
	ExecutionMetrics CustomFields `json:"execution_metrics,omitempty"`
}

// ParallelSyncResult represents the result of parallel task synchronization
type ParallelSyncResult struct {
	ParallelGroupID string                 `json:"parallel_group_id"`
	SyncedTasks     []ParallelTaskSyncInfo `json:"synced_tasks"`
	SyncIssues      []ParallelSyncIssue    `json:"sync_issues"`
	TotalTasks      int                    `json:"total_tasks"`
	IssuesFound     int                    `json:"issues_found"`
	SyncTimestamp   time.Time              `json:"sync_timestamp"`
	SyncStatus      string                 `json:"sync_status"` // synchronized, partial, failed
	Resolution      []string               `json:"resolution,omitempty"`
}

// ParallelTaskSyncInfo represents synchronization info for a single task
type ParallelTaskSyncInfo struct {
	TaskID     int       `json:"task_id"`
	TaskTitle  string    `json:"task_title"`
	Status     string    `json:"status"`
	LastUpdate time.Time `json:"last_update"`
	SyncStatus string    `json:"sync_status"`
}

// ParallelSyncIssue represents an issue found during parallel task synchronization
type ParallelSyncIssue struct {
	IssueType   string `json:"issue_type"` // dependency_conflict, status_mismatch, timing_issue
	TaskID      int    `json:"task_id"`
	TaskTitle   string `json:"task_title"`
	Description string `json:"description"`
	Severity    string `json:"severity"` // low, medium, high, critical
	Suggestion  string `json:"suggestion,omitempty"`
}

// CycleAnalysisResult represents the result of dependency cycle analysis
type CycleAnalysisResult struct {
	HasCycles       bool                     `json:"has_cycles"`
	CycleCount      int                      `json:"cycle_count"`
	DetectedCycles  []DependencyCycle        `json:"detected_cycles"`
	AffectedTasks   []int                    `json:"affected_tasks"`
	AnalysisTime    time.Time                `json:"analysis_time"`
	Recommendations []CycleResolutionAdvice  `json:"recommendations"`
}

// DependencyCycle represents a detected dependency cycle
type DependencyCycle struct {
	CycleID     string `json:"cycle_id"`
	TaskPath    []int  `json:"task_path"`
	TaskTitles  []string `json:"task_titles"`
	CycleLength int    `json:"cycle_length"`
	Severity    string `json:"severity"`
}

// CycleResolutionAdvice provides advice for resolving dependency cycles
type CycleResolutionAdvice struct {
	CycleID     string `json:"cycle_id"`
	Action      string `json:"action"` // remove_dependency, change_relationship, split_task
	TaskID      int    `json:"task_id"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
}

// CriticalPathResult represents the result of critical path analysis
type CriticalPathResult struct {
	CriticalPath        []CriticalPathTask `json:"critical_path"`
	TotalDuration       float64           `json:"total_duration_hours"`
	StartTask           int               `json:"start_task"`
	EndTask             int               `json:"end_task"`
	AnalysisTime        time.Time         `json:"analysis_time"`
	AlternativePaths    []AlternativePath `json:"alternative_paths,omitempty"`
	BottleneckTasks     []int             `json:"bottleneck_tasks"`
	OptimizationAdvice  []string          `json:"optimization_advice"`
}

// CriticalPathTask represents a task in the critical path
type CriticalPathTask struct {
	TaskID            int     `json:"task_id"`
	TaskTitle         string  `json:"task_title"`
	EstimatedHours    float64 `json:"estimated_hours"`
	EarliestStart     time.Time `json:"earliest_start"`
	LatestFinish      time.Time `json:"latest_finish"`
	Slack             float64 `json:"slack_hours"`
	IsCritical        bool    `json:"is_critical"`
	DependencyCount   int     `json:"dependency_count"`
}

// AlternativePath represents an alternative path in project timeline
type AlternativePath struct {
	PathID       string             `json:"path_id"`
	Tasks        []CriticalPathTask `json:"tasks"`
	Duration     float64           `json:"duration_hours"`
	Probability  float64           `json:"probability"`
	RiskLevel    string            `json:"risk_level"`
}

// DocumentRelation represents a relationship between documents
type DocumentRelation struct {
	RelationType string `json:"relation_type"`
	RelatedID    int    `json:"related_id"`
	RelatedTitle string `json:"related_title"`
}

// 删除任务文档默认模板功能 - 防止意外覆盖用户数据
// GetTaskDocumentDefaultTemplate 功能已删除，避免模板覆盖用户内容