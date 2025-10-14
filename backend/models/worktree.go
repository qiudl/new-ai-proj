package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ====================
// 1. WorktreeConfig - 项目级Worktree配置
// ====================

// AIExpertConfig represents AI expert configuration in worktree config
type AIExpertConfig map[string]interface{}

// WorktreeConfig represents project-level worktree configuration
type WorktreeConfig struct {
	ID           int             `json:"id" db:"id"`
	ProjectID    int             `json:"project_id" db:"project_id"`
	WorktreeRoot string          `json:"worktree_root" db:"worktree_root"`
	AutoCleanup  bool            `json:"auto_cleanup" db:"auto_cleanup"`
	MaxWorktrees int             `json:"max_worktrees" db:"max_worktrees"`
	AIExperts    AIExpertConfig  `json:"ai_experts" db:"ai_experts"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

// Value implements the driver.Valuer interface for AIExpertConfig
func (a AIExpertConfig) Value() (driver.Value, error) {
	if a == nil {
		return "{}", nil
	}
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface for AIExpertConfig
func (a *AIExpertConfig) Scan(value interface{}) error {
	if value == nil {
		*a = AIExpertConfig{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into AIExpertConfig", value)
	}

	return json.Unmarshal(bytes, a)
}

// WorktreeConfigRequest represents a request to create/update worktree config
type WorktreeConfigRequest struct {
	WorktreeRoot string          `json:"worktree_root" validate:"required"`
	AutoCleanup  bool            `json:"auto_cleanup"`
	MaxWorktrees int             `json:"max_worktrees" validate:"min=1,max=50"`
	AIExperts    AIExpertConfig  `json:"ai_experts" validate:"required"`
}

// ====================
// 2. Worktree - 主表
// ====================

// Worktree represents a git worktree instance
type Worktree struct {
	ID             int          `json:"id" db:"id"`
	ProjectID      int          `json:"project_id" db:"project_id"`
	ExpertID       string       `json:"expert_id" db:"expert_id"`
	Name           string       `json:"name" db:"name"`
	Description    string       `json:"description" db:"description"`
	WorktreePath   string       `json:"worktree_path" db:"worktree_path"`
	Branch         string       `json:"branch" db:"branch"`
	Status         string       `json:"status" db:"status"`
	IsLocked       bool         `json:"is_locked" db:"is_locked"`

	// Git状态
	LastCommitHash *string `json:"last_commit_hash,omitempty" db:"last_commit_hash"`
	HasUncommitted bool    `json:"has_uncommitted" db:"has_uncommitted"`
	AheadCount     int     `json:"ahead_count" db:"ahead_count"`
	BehindCount    int     `json:"behind_count" db:"behind_count"`

	// 关联信息
	CurrentAIID  *int `json:"current_ai_id,omitempty" db:"current_ai_id"`
	ActiveTaskID *int `json:"active_task_id,omitempty" db:"active_task_id"`

	// 监控信息
	DiskUsageMB  int64      `json:"disk_usage_mb" db:"disk_usage_mb"`
	LastSyncAt   *time.Time `json:"last_sync_at,omitempty" db:"last_sync_at"`
	LastActiveAt *time.Time `json:"last_active_at,omitempty" db:"last_active_at"`

	// 配置
	WorkingDir  string `json:"working_dir" db:"working_dir"`
	AutoSync    bool   `json:"auto_sync" db:"auto_sync"`
	AutoCleanup bool   `json:"auto_cleanup" db:"auto_cleanup"`

	// 元数据
	Metadata  CustomFields `json:"metadata" db:"metadata"`
	CreatedBy int          `json:"created_by" db:"created_by"`
	CreatedAt time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
}

// WorktreeStatus constants
const (
	WorktreeStatusPending   = "pending"
	WorktreeStatusReady     = "ready"
	WorktreeStatusActive    = "active"
	WorktreeStatusCompleted = "completed"
	WorktreeStatusFailed    = "failed"
	WorktreeStatusLocked    = "locked"
	WorktreeStatusArchived  = "archived"
)

// CreateWorktreeRequest represents a request to create a worktree
type CreateWorktreeRequest struct {
	ProjectID   int    `json:"project_id" validate:"required"`
	ExpertID    string `json:"expert_id" validate:"required"`
	Branch      string `json:"branch" validate:"required"`
	Force       bool   `json:"force"`
	Description string `json:"description"`
}

// UpdateWorktreeRequest represents a request to update a worktree
type UpdateWorktreeRequest struct {
	Name        *string       `json:"name,omitempty"`
	Description *string       `json:"description,omitempty"`
	Status      *string       `json:"status,omitempty" validate:"omitempty,oneof=pending ready active completed failed locked archived"`
	IsLocked    *bool         `json:"is_locked,omitempty"`
	AutoSync    *bool         `json:"auto_sync,omitempty"`
	AutoCleanup *bool         `json:"auto_cleanup,omitempty"`
	Metadata    *CustomFields `json:"metadata,omitempty"`
}

// WorktreeResponse represents a worktree response with additional info
type WorktreeResponse struct {
	Worktree
	ProjectName    string  `json:"project_name,omitempty"`
	CurrentAIName  *string `json:"current_ai_name,omitempty"`
	ActiveTaskName *string `json:"active_task_name,omitempty"`
}

// WorktreeStatusInfo represents detailed git status information
type WorktreeStatusInfo struct {
	WorktreeID       int        `json:"worktree_id"`
	Status           string     `json:"status"`
	Branch           string     `json:"branch"`
	IsClean          bool       `json:"is_clean"`
	UncommittedFiles int        `json:"uncommitted_files"`
	AheadCount       int        `json:"ahead_count"`
	BehindCount      int        `json:"behind_count"`
	LastCommit       *GitCommit `json:"last_commit,omitempty"`
	DiskUsageMB      int64      `json:"disk_usage_mb"`
	Health           string     `json:"health"` // healthy, warning, error
	Issues           []string   `json:"issues,omitempty"`
}

// GitCommit represents git commit information
type GitCommit struct {
	Hash      string    `json:"hash"`
	Message   string    `json:"message"`
	Author    string    `json:"author"`
	Timestamp time.Time `json:"timestamp"`
}

// ====================
// 3. WorktreeTaskBinding - 任务绑定
// ====================

// WorktreeTaskBinding represents the binding between tasks and worktrees
type WorktreeTaskBinding struct {
	ID           int     `json:"id" db:"id"`
	WorktreeID   int     `json:"worktree_id" db:"worktree_id"`
	TaskID       int     `json:"task_id" db:"task_id"`
	RelationType string  `json:"relation_type" db:"relation_type"`
	Priority     int     `json:"priority" db:"priority"`
	IsActive     bool    `json:"is_active" db:"is_active"`

	// 任务状态
	TaskStatus  string     `json:"task_status,omitempty" db:"task_status"`
	StartedAt   *time.Time `json:"started_at,omitempty" db:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty" db:"completed_at"`

	CreatedBy int       `json:"created_by" db:"created_by"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// RelationType constants (formerly BindingType)
const (
	RelationTypePrimary   = "primary"
	RelationTypeSecondary = "secondary"
	RelationTypeReadonly  = "readonly"
)

// CreateBindingRequest represents a request to bind a task to a worktree
type CreateBindingRequest struct {
	TaskID       int    `json:"task_id" validate:"required"`
	RelationType string `json:"relation_type" validate:"required,oneof=primary secondary readonly"`
	Priority     int    `json:"priority"`
}

// BindingResponse represents a binding response with additional info
type BindingResponse struct {
	WorktreeTaskBinding
	WorktreeName string `json:"worktree_name,omitempty"`
	TaskTitle    string `json:"task_title,omitempty"`
}

// ====================
// 4. AIWorkspaceAssignment - AI工作空间分配
// ====================

// AIWorkspaceAssignment tracks AI's workspace assignments
type AIWorkspaceAssignment struct {
	ID             int          `json:"id" db:"id"`
	AIUserID       int          `json:"ai_user_id" db:"ai_user_id"`
	WorktreeID     int          `json:"worktree_id" db:"worktree_id"`
	TaskID         *int         `json:"task_id,omitempty" db:"task_id"`
	AssignedAt     time.Time    `json:"assigned_at" db:"assigned_at"`
	ReleasedAt     *time.Time   `json:"released_at,omitempty" db:"released_at"`
	AssignmentData CustomFields `json:"assignment_data" db:"assignment_data"`
	CreatedAt      time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at" db:"updated_at"`
}

// AssignWorkspaceRequest represents a request to assign AI to a workspace
type AssignWorkspaceRequest struct {
	AIUserID   int  `json:"ai_user_id" validate:"required"`
	TaskID     *int `json:"task_id,omitempty"`
	WorktreeID *int `json:"worktree_id,omitempty"`
}

// WorkspaceAssignmentResponse represents a workspace assignment response
type WorkspaceAssignmentResponse struct {
	AIWorkspaceAssignment
	AIName       string  `json:"ai_name,omitempty"`
	WorktreeName string  `json:"worktree_name,omitempty"`
	WorktreePath string  `json:"worktree_path,omitempty"`
	TaskTitle    *string `json:"task_title,omitempty"`
}

// ====================
// 5. WorktreeConflict - 冲突管理
// ====================

// WorktreeConflict represents detected conflicts between worktrees
type WorktreeConflict struct {
	ID           int    `json:"id" db:"id"`
	WorktreeID   int    `json:"worktree_id" db:"worktree_id"`
	TaskID       *int   `json:"task_id,omitempty" db:"task_id"`
	ConflictType string `json:"conflict_type" db:"conflict_type"`
	Severity     string `json:"severity,omitempty" db:"severity"`
	Status       string `json:"status" db:"status"`

	// 冲突详情
	FilePath        *string      `json:"file_path,omitempty" db:"file_path"`
	ConflictDetails CustomFields `json:"conflict_details" db:"conflict_details"`

	// 检测信息
	DetectedBy *int      `json:"detected_by,omitempty" db:"detected_by"`
	DetectedAt time.Time `json:"detected_at" db:"detected_at"`

	// 解决方案
	ResolvedBy *int       `json:"resolved_by,omitempty" db:"resolved_by"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	Resolution *string    `json:"resolution,omitempty" db:"resolution"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// ConflictType constants
const (
	ConflictTypeFile       = "file"
	ConflictTypeDependency = "dependency"
	ConflictTypeMerge      = "merge"
	ConflictTypeDatabase   = "database"
)

// ConflictSeverity constants
const (
	ConflictSeverityCritical = "critical"
	ConflictSeverityWarning  = "warning"
	ConflictSeverityInfo     = "info"
)

// ConflictStatus constants
const (
	ConflictStatusDetected     = "detected"
	ConflictStatusAcknowledged = "acknowledged"
	ConflictStatusResolved     = "resolved"
	ConflictStatusIgnored      = "ignored"
)

// DetectConflictRequest represents a request to detect conflicts
type DetectConflictRequest struct {
	WorktreeID   int    `json:"worktree_id" validate:"required"`
	TaskID       *int   `json:"task_id,omitempty"`
	ConflictType string `json:"conflict_type,omitempty" validate:"omitempty,oneof=file dependency merge database"`
}

// ConflictReport represents a conflict detection report
type ConflictReport struct {
	Conflicts []WorktreeConflict `json:"conflicts"`
	Summary   ConflictSummary    `json:"summary"`
}

// ConflictSummary represents summary statistics for conflicts
type ConflictSummary struct {
	TotalConflicts int `json:"total_conflicts"`
	Critical       int `json:"critical"`
	Warnings       int `json:"warnings"`
	Info           int `json:"info"`
}

// MergeConflictPrediction represents predicted merge conflicts
type MergeConflictPrediction struct {
	HasConflicts        bool                     `json:"has_conflicts"`
	ConflictProbability float64                  `json:"conflict_probability"`
	PotentialConflicts  []PotentialConflict      `json:"potential_conflicts"`
	SafeToMerge         bool                     `json:"safe_to_merge"`
}

// PotentialConflict represents a potential conflict
type PotentialConflict struct {
	File         string     `json:"file"`
	ConflictType string     `json:"conflict_type"`
	Severity     string     `json:"severity"`
	LineRanges   [][]int    `json:"line_ranges"`
	Suggestion   string     `json:"suggestion"`
}

// ====================
// 6. WorktreeActivity - 活动日志
// ====================

// WorktreeActivity tracks activities in worktrees
type WorktreeActivity struct {
	ID           int     `json:"id" db:"id"`
	WorktreeID   int     `json:"worktree_id" db:"worktree_id"`
	ActivityType string  `json:"activity_type" db:"activity_type"`
	Description  *string `json:"description,omitempty" db:"description"`

	// 关联信息
	AIUserID *int `json:"ai_user_id,omitempty" db:"ai_user_id"`
	TaskID   *int `json:"task_id,omitempty" db:"task_id"`

	// 活动详情
	ActivityData CustomFields `json:"activity_data" db:"activity_data"`
	BeforeState  *string      `json:"before_state,omitempty" db:"before_state"`
	AfterState   *string      `json:"after_state,omitempty" db:"after_state"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ActivityType constants
const (
	ActivityTypeCreated      = "created"
	ActivityTypeActivated    = "activated"
	ActivityTypeDeactivated  = "deactivated"
	ActivityTypeCommitted    = "committed"
	ActivityTypeSynced       = "synced"
	ActivityTypeConflict     = "conflict"
	ActivityTypeResolved     = "resolved"
	ActivityTypeLocked       = "locked"
	ActivityTypeUnlocked     = "unlocked"
	ActivityTypeRemoved      = "removed"
	ActivityTypeTaskBound    = "task_bound"
	ActivityTypeTaskUnbound  = "task_unbound"
	ActivityTypeAIAssigned   = "ai_assigned"
	ActivityTypeAIReleased   = "ai_released"
)

// WorktreeActivityResponse represents an activity with additional info
type WorktreeActivityResponse struct {
	WorktreeActivity
	WorktreeName string  `json:"worktree_name,omitempty"`
	AIUsername   *string `json:"ai_username,omitempty"`
	TaskTitle    *string `json:"task_title,omitempty"`
}

// ====================
// 辅助结构和函数
// ====================

// WorktreeListOptions represents options for listing worktrees
type WorktreeListOptions struct {
	ProjectID   *int
	Status      []string
	ExpertID    string
	CurrentAIID *int
	IsLocked    *bool
	SortBy      string // created_at, last_active_at, name
	SortOrder   string // asc, desc
	Page        int
	PageSize    int
}

// WorktreeSyncRequest represents a request to sync a worktree
type WorktreeSyncRequest struct {
	Pull   bool `json:"pull"`
	Push   bool `json:"push"`
	Rebase bool `json:"rebase"`
}

// WorktreeSyncResult represents the result of a worktree sync
type WorktreeSyncResult struct {
	Synced        bool     `json:"synced"`
	PulledCommits int      `json:"pulled_commits"`
	PushedCommits int      `json:"pushed_commits"`
	Conflicts     []string `json:"conflicts,omitempty"`
	Message       string   `json:"message"`
}

// WorktreeHealthCheck represents a health check report
type WorktreeHealthCheckReport struct {
	WorktreeID  int       `json:"worktree_id"`
	Health      string    `json:"health"` // healthy, warning, error
	Issues      []string  `json:"issues"`
	LastSync    *time.Time `json:"last_sync,omitempty"`
	DiskUsageMB int64     `json:"disk_usage_mb"`
	CheckedAt   time.Time `json:"checked_at"`
}

// WorktreeMonitorReport represents a monitoring report for all worktrees
type WorktreeMonitorReport struct {
	ProjectID       int                          `json:"project_id"`
	TotalWorktrees  int                          `json:"total_worktrees"`
	ActiveWorktrees int                          `json:"active_worktrees"`
	HealthyCount    int                          `json:"healthy_count"`
	WarningCount    int                          `json:"warning_count"`
	ErrorCount      int                          `json:"error_count"`
	Worktrees       []WorktreeHealthCheckReport  `json:"worktrees"`
	GeneratedAt     time.Time                    `json:"generated_at"`
}

// WorktreeStatistics represents statistics for worktree usage
type WorktreeStatistics struct {
	TotalWorktrees    int     `json:"total_worktrees"`
	ActiveWorktrees   int     `json:"active_worktrees"`
	TotalDiskUsageMB  int64   `json:"total_disk_usage_mb"`
	TotalCommits      int     `json:"total_commits"`
	TotalTasks        int     `json:"total_tasks"`
	AvgTasksPerTree   float64 `json:"avg_tasks_per_tree"`
	MostActiveTree    *string `json:"most_active_tree,omitempty"`
	LeastActiveTree   *string `json:"least_active_tree,omitempty"`
}

// ====================
// Repository Layer Types
// ====================

// WorktreeGitStatus represents Git status information for a worktree
type WorktreeGitStatus struct {
	LastCommitHash *string `json:"last_commit_hash,omitempty"`
	HasUncommitted bool    `json:"has_uncommitted"`
	AheadCount     int     `json:"ahead_count"`
	BehindCount    int     `json:"behind_count"`
}

// WorktreeStatsResponse represents statistics for worktrees
type WorktreeStatsResponse struct {
	TotalWorktrees       int        `json:"total_worktrees"`
	ActiveWorktrees      int        `json:"active_worktrees"`
	ReadyWorktrees       int        `json:"ready_worktrees"`
	LockedWorktrees      int        `json:"locked_worktrees"`
	UncommittedWorktrees int        `json:"uncommitted_worktrees"`
	TotalDiskUsageMB     int64      `json:"total_disk_usage_mb"`
	ActiveAICount        int        `json:"active_ai_count"`
	LastSyncAt           *time.Time `json:"last_sync_at,omitempty"`
}

// WorktreeUsageStats represents usage statistics for a worktree
type WorktreeUsageStats struct {
	WorktreeID         int        `json:"worktree_id"`
	TotalAssignments   int        `json:"total_assignments"`
	UniqueAICount      int        `json:"unique_ai_count"`
	AvgDurationSeconds float64    `json:"avg_duration_seconds"`
	LastAssignedAt     *time.Time `json:"last_assigned_at,omitempty"`
}

// WorktreeConflictStats represents conflict statistics
type WorktreeConflictStats struct {
	TotalConflicts int            `json:"total_conflicts"`
	PendingCount   int            `json:"pending_count"`
	ResolvedCount  int            `json:"resolved_count"`
	IgnoredCount   int            `json:"ignored_count"`
	ByType         map[string]int `json:"by_type"`
}

// WorktreeActivityFilter represents filtering options for activities
type WorktreeActivityFilter struct {
	WorktreeID    *int     `json:"worktree_id,omitempty"`
	AIUserID      *int     `json:"ai_user_id,omitempty"`
	TaskID        *int     `json:"task_id,omitempty"`
	ActivityTypes []string `json:"activity_types,omitempty"`
	StartDate     *string  `json:"start_date,omitempty"`
	EndDate       *string  `json:"end_date,omitempty"`
	Page          int      `json:"page"`
	PageSize      int      `json:"page_size"`
}

// WorktreeActivityStats represents activity statistics
type WorktreeActivityStats struct {
	TotalActivities int            `json:"total_activities"`
	ActiveWorktrees int            `json:"active_worktrees"`
	ActiveAIUsers   int            `json:"active_ai_users"`
	ByType          map[string]int `json:"by_type"`
}

// AIActivitySummary represents activity summary for an AI user
type AIActivitySummary struct {
	AIUserID        int            `json:"ai_user_id"`
	TotalActivities int            `json:"total_activities"`
	WorktreesUsed   int            `json:"worktrees_used"`
	TasksWorked     int            `json:"tasks_worked"`
	ByType          map[string]int `json:"by_type"`
}
