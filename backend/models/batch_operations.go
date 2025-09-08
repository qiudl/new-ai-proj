package models

import (
	"time"
)

// BatchOperationType represents the type of batch operation
type BatchOperationType string

const (
	BatchOperationStatusUpdate    BatchOperationType = "status_update"
	BatchOperationParentChange    BatchOperationType = "parent_change"
	BatchOperationAssignee        BatchOperationType = "assignee_change"
	BatchOperationPriority        BatchOperationType = "priority_change"
	BatchOperationDueDate         BatchOperationType = "due_date_change"
	BatchOperationArchive         BatchOperationType = "archive"
	BatchOperationRestore         BatchOperationType = "restore"
	BatchOperationDelete          BatchOperationType = "delete"
	BatchOperationMove            BatchOperationType = "move"
	BatchOperationDuplicate       BatchOperationType = "duplicate"
	BatchOperationTagsAdd         BatchOperationType = "tags_add"
	BatchOperationTagsRemove      BatchOperationType = "tags_remove"
	BatchOperationCustomFields    BatchOperationType = "custom_fields_update"
)

// BatchOperationStatus represents the status of a batch operation
type BatchOperationStatus string

const (
	BatchStatusPending    BatchOperationStatus = "pending"
	BatchStatusRunning    BatchOperationStatus = "running"
	BatchStatusCompleted  BatchOperationStatus = "completed"
	BatchStatusFailed     BatchOperationStatus = "failed"
	BatchStatusCancelled  BatchOperationStatus = "cancelled"
	BatchStatusPartial    BatchOperationStatus = "partial"
)

// BatchOperationRequest represents a generic batch operation request
type BatchOperationRequest struct {
	OperationType BatchOperationType             `json:"operation_type" validate:"required"`
	TaskIDs       []int                          `json:"task_ids" validate:"required,min=1,max=1000"`
	Parameters    map[string]interface{}         `json:"parameters,omitempty"`
	Options       BatchOperationOptions          `json:"options,omitempty"`
	Metadata      map[string]interface{}         `json:"metadata,omitempty"`
	RequestedBy   int                            `json:"requested_by" validate:"required"`
	RequestID     string                         `json:"request_id,omitempty"`
}

// BatchOperationOptions represents options for batch operations
type BatchOperationOptions struct {
	DryRun              bool   `json:"dry_run"`                         // 是否仅预览不执行
	ContinueOnError     bool   `json:"continue_on_error"`               // 遇到错误是否继续
	ValidateOnly        bool   `json:"validate_only"`                   // 仅验证不执行
	SendNotifications   bool   `json:"send_notifications"`              // 是否发送通知
	CreateBackup        bool   `json:"create_backup"`                   // 是否创建备份
	MaxConcurrency      int    `json:"max_concurrency" validate:"min=1,max=10"`  // 最大并发数
	TimeoutSeconds      int    `json:"timeout_seconds" validate:"min=1,max=3600"` // 操作超时时间
	PreventDuplicates   bool   `json:"prevent_duplicates"`              // 防止重复操作
	RequireConfirmation bool   `json:"require_confirmation"`            // 需要确认
	Priority            string `json:"priority" validate:"oneof=low normal high urgent"` // 操作优先级
}

// BatchOperationResponse represents the response of a batch operation
type BatchOperationResponse struct {
	OperationID       string                 `json:"operation_id"`
	OperationType     BatchOperationType     `json:"operation_type"`
	Status            BatchOperationStatus   `json:"status"`
	TotalTasks        int                    `json:"total_tasks"`
	ProcessedTasks    int                    `json:"processed_tasks"`
	SuccessfulTasks   int                    `json:"successful_tasks"`
	FailedTasks       int                    `json:"failed_tasks"`
	SkippedTasks      int                    `json:"skipped_tasks"`
	StartTime         time.Time              `json:"start_time"`
	EndTime           *time.Time             `json:"end_time,omitempty"`
	Duration          int64                  `json:"duration_ms"`
	Errors            []BatchOperationError  `json:"errors,omitempty"`
	Warnings          []BatchOperationWarning `json:"warnings,omitempty"`
	Results           interface{}            `json:"results,omitempty"`
	Progress          BatchOperationProgress `json:"progress"`
	Message           string                 `json:"message"`
	RequestedBy       int                    `json:"requested_by"`
	ExecutedBy        int                    `json:"executed_by,omitempty"`
}

// BatchOperationError represents an error that occurred during batch operation
type BatchOperationError struct {
	TaskID      int    `json:"task_id"`
	TaskTitle   string `json:"task_title,omitempty"`
	ErrorCode   string `json:"error_code"`
	ErrorMsg    string `json:"error_message"`
	Severity    string `json:"severity" validate:"oneof=low medium high critical"`
	Recoverable bool   `json:"recoverable"`
	Timestamp   time.Time `json:"timestamp"`
}

// BatchOperationWarning represents a warning during batch operation
type BatchOperationWarning struct {
	TaskID    int       `json:"task_id"`
	TaskTitle string    `json:"task_title,omitempty"`
	Warning   string    `json:"warning"`
	Impact    string    `json:"impact"`
	Timestamp time.Time `json:"timestamp"`
}

// BatchOperationProgress represents the progress of a batch operation
type BatchOperationProgress struct {
	Percentage      float64   `json:"percentage"`
	CurrentTask     int       `json:"current_task"`
	CurrentTaskID   int       `json:"current_task_id"`
	EstimatedRemain int64     `json:"estimated_remaining_ms"`
	Phase           string    `json:"phase"` // validation, execution, cleanup
	LastUpdate      time.Time `json:"last_update"`
}

// BatchValidationResult represents the result of batch operation validation
type BatchValidationResult struct {
	Valid              bool                     `json:"valid"`
	TotalTasks         int                      `json:"total_tasks"`
	ValidTasks         int                      `json:"valid_tasks"`
	InvalidTasks       int                      `json:"invalid_tasks"`
	WarningsCount      int                      `json:"warnings_count"`
	ValidationErrors   []BatchValidationError   `json:"validation_errors,omitempty"`
	ValidationWarnings []BatchValidationWarning `json:"validation_warnings,omitempty"`
	EstimatedDuration  int64                    `json:"estimated_duration_ms"`
	RiskLevel          string                   `json:"risk_level" validate:"oneof=low medium high critical"`
	CanProceed         bool                     `json:"can_proceed"`
	Requirements       []string                 `json:"requirements,omitempty"`
}

// BatchValidationError represents a validation error for a specific task
type BatchValidationError struct {
	TaskID      int       `json:"task_id"`
	TaskTitle   string    `json:"task_title,omitempty"`
	Field       string    `json:"field,omitempty"`
	ErrorCode   string    `json:"error_code"`
	ErrorMsg    string    `json:"error_message"`
	Suggestions []string  `json:"suggestions,omitempty"`
	Timestamp   time.Time `json:"timestamp"`
}

// BatchValidationWarning represents a validation warning for a specific task
type BatchValidationWarning struct {
	TaskID      int       `json:"task_id"`
	TaskTitle   string    `json:"task_title,omitempty"`
	WarningCode string    `json:"warning_code"`
	Warning     string    `json:"warning"`
	Impact      string    `json:"impact"`
	Severity    string    `json:"severity" validate:"oneof=info low medium high"`
	Timestamp   time.Time `json:"timestamp"`
}

// BatchOperationHistory represents a record of batch operations
type BatchOperationHistory struct {
	ID            int                    `json:"id" db:"id"`
	OperationID   string                 `json:"operation_id" db:"operation_id"`
	OperationType BatchOperationType     `json:"operation_type" db:"operation_type"`
	Status        BatchOperationStatus   `json:"status" db:"status"`
	RequestedBy   int                    `json:"requested_by" db:"requested_by"`
	ExecutedBy    *int                   `json:"executed_by" db:"executed_by"`
	TotalTasks    int                    `json:"total_tasks" db:"total_tasks"`
	SuccessTasks  int                    `json:"success_tasks" db:"success_tasks"`
	FailedTasks   int                    `json:"failed_tasks" db:"failed_tasks"`
	Parameters    CustomFields           `json:"parameters" db:"parameters"`
	Results       CustomFields           `json:"results" db:"results"`
	StartTime     time.Time              `json:"start_time" db:"start_time"`
	EndTime       *time.Time             `json:"end_time" db:"end_time"`
	Duration      *int64                 `json:"duration_ms" db:"duration_ms"`
	ErrorLog      *string                `json:"error_log" db:"error_log"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time              `json:"updated_at" db:"updated_at"`
}

// SpecificBatchOperationRequests - 具体的批量操作请求类型

// BatchStatusUpdateRequest represents a request to update task statuses in batch
type BatchStatusUpdateRequest struct {
	TaskIDs   []int  `json:"task_ids" validate:"required,min=1,max=1000"`
	NewStatus string `json:"new_status" validate:"required,oneof=draft planning todo in_progress testing completed cancelled on_hold suspended blocked archived"`
	Force     bool   `json:"force"`  // 强制更新，即使状态转换无效
}

// BatchParentChangeRequest represents a request to change parent tasks in batch
type BatchParentChangeRequest struct {
	TaskIDs      []int `json:"task_ids" validate:"required,min=1,max=1000"`
	NewParentID  *int  `json:"new_parent_id"`  // nil表示设置为根任务
	MaintainOrder bool `json:"maintain_order"` // 是否保持原有顺序
}

// BatchAssigneeChangeRequest represents a request to change task assignees in batch
type BatchAssigneeChangeRequest struct {
	TaskIDs       []int `json:"task_ids" validate:"required,min=1,max=1000"`
	NewAssigneeID *int  `json:"new_assignee_id"`  // nil表示取消分配
	NotifyUsers   bool  `json:"notify_users"`     // 是否通知相关用户
}

// BatchPriorityChangeRequest represents a request to change task priorities in batch
type BatchPriorityChangeRequest struct {
	TaskIDs     []int  `json:"task_ids" validate:"required,min=1,max=1000"`
	NewPriority string `json:"new_priority" validate:"required,oneof=low medium high urgent"`
}

// BatchDueDateChangeRequest represents a request to change task due dates in batch
type BatchDueDateChangeRequest struct {
	TaskIDs    []int      `json:"task_ids" validate:"required,min=1,max=1000"`
	NewDueDate *time.Time `json:"new_due_date"`  // nil表示清除截止日期
	Offset     *int       `json:"offset_days"`   // 相对现有截止日期的天数偏移
}

// BatchArchiveRequest represents a request to archive tasks in batch
type BatchArchiveRequest struct {
	TaskIDs         []int  `json:"task_ids" validate:"required,min=1,max=1000"`
	ArchiveChildren bool   `json:"archive_children"`  // 是否同时归档子任务
	Reason          string `json:"reason,omitempty"`   // 归档原因
}

// BatchDeleteRequest represents a request to delete tasks in batch
type BatchDeleteRequest struct {
	TaskIDs         []int  `json:"task_ids" validate:"required,min=1,max=1000"`
	DeleteChildren  bool   `json:"delete_children"`   // 是否同时删除子任务
	HardDelete      bool   `json:"hard_delete"`       // 是否永久删除
	BackupFirst     bool   `json:"backup_first"`      // 删除前是否备份
	Reason          string `json:"reason,omitempty"`   // 删除原因
}

// BatchMoveRequest represents a request to move tasks to different project or parent
type BatchMoveRequest struct {
	TaskIDs           []int `json:"task_ids" validate:"required,min=1,max=1000"`
	TargetProjectID   *int  `json:"target_project_id,omitempty"`
	TargetParentID    *int  `json:"target_parent_id,omitempty"`
	MoveChildren      bool  `json:"move_children"`      // 是否同时移动子任务
	UpdateReferences  bool  `json:"update_references"`  // 是否更新相关引用
}

// BatchTagsUpdateRequest represents a request to update tags in batch
type BatchTagsUpdateRequest struct {
	TaskIDs   []int    `json:"task_ids" validate:"required,min=1,max=1000"`
	Operation string   `json:"operation" validate:"required,oneof=add remove replace"`
	Tags      []string `json:"tags" validate:"required,min=1"`
}

// BatchCustomFieldsUpdateRequest represents a request to update custom fields in batch
type BatchCustomFieldsUpdateRequest struct {
	TaskIDs      []int                  `json:"task_ids" validate:"required,min=1,max=1000"`
	Operation    string                 `json:"operation" validate:"required,oneof=set merge remove"`
	CustomFields map[string]interface{} `json:"custom_fields" validate:"required"`
}

// BatchOperationPreview represents a preview of what a batch operation would do
type BatchOperationPreview struct {
	OperationType   BatchOperationType     `json:"operation_type"`
	TotalTasks      int                    `json:"total_tasks"`
	AffectedTasks   []TaskPreview          `json:"affected_tasks"`
	Changes         []ChangePreview        `json:"changes"`
	Warnings        []string               `json:"warnings,omitempty"`
	EstimatedTime   int64                  `json:"estimated_time_ms"`
	RiskLevel       string                 `json:"risk_level"`
	Prerequisites   []string               `json:"prerequisites,omitempty"`
	CanProceed      bool                   `json:"can_proceed"`
}

// TaskPreview represents a preview of a task that will be affected
type TaskPreview struct {
	ID          int                    `json:"id"`
	Title       string                 `json:"title"`
	Status      string                 `json:"status"`
	ProjectID   int                    `json:"project_id"`
	ParentID    *int                   `json:"parent_id"`
	Changes     map[string]interface{} `json:"changes"`
	Warnings    []string               `json:"warnings,omitempty"`
	CanProcess  bool                   `json:"can_process"`
}

// ChangePreview represents a preview of a change that will be made
type ChangePreview struct {
	Field    string      `json:"field"`
	OldValue interface{} `json:"old_value"`
	NewValue interface{} `json:"new_value"`
	Impact   string      `json:"impact"`
}

// BatchOperationQueue represents a queued batch operation
type BatchOperationQueue struct {
	ID            int                      `json:"id" db:"id"`
	OperationID   string                   `json:"operation_id" db:"operation_id"`
	OperationType BatchOperationType       `json:"operation_type" db:"operation_type"`
	Status        BatchOperationStatus     `json:"status" db:"status"`
	Priority      int                      `json:"priority" db:"priority"`
	RequestedBy   int                      `json:"requested_by" db:"requested_by"`
	TaskIDs       []int                    `json:"task_ids" db:"task_ids"`
	Parameters    CustomFields             `json:"parameters" db:"parameters"`
	Options       CustomFields             `json:"options" db:"options"`
	ScheduledAt   *time.Time               `json:"scheduled_at" db:"scheduled_at"`
	StartedAt     *time.Time               `json:"started_at" db:"started_at"`
	CompletedAt   *time.Time               `json:"completed_at" db:"completed_at"`
	RetryCount    int                      `json:"retry_count" db:"retry_count"`
	MaxRetries    int                      `json:"max_retries" db:"max_retries"`
	LastError     *string                  `json:"last_error" db:"last_error"`
	CreatedAt     time.Time                `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time                `json:"updated_at" db:"updated_at"`
}