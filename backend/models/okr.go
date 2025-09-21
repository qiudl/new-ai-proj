package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// FlexibleDate handles multiple date formats in JSON
type FlexibleDate struct {
	time.Time
}

// UnmarshalJSON implements json.Unmarshaler for flexible date parsing
func (fd *FlexibleDate) UnmarshalJSON(data []byte) error {
	str := strings.Trim(string(data), `"`)
	fmt.Printf("FlexibleDate.UnmarshalJSON: trying to parse '%s'\n", str)
	
	if str == "null" || str == "" {
		fd.Time = time.Time{}
		return nil
	}
	
	// Try different date formats
	dateFormats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
		"2006-01-02T15:04:05",
	}
	
	for _, format := range dateFormats {
		if t, err := time.Parse(format, str); err == nil {
			fd.Time = t
			fmt.Printf("FlexibleDate: successfully parsed '%s' with format '%s'\n", str, format)
			return nil
		}
	}
	
	fmt.Printf("FlexibleDate: failed to parse '%s'\n", str)
	return fmt.Errorf("unable to parse date: %s", str)
}

// MarshalJSON implements json.Marshaler
func (fd FlexibleDate) MarshalJSON() ([]byte, error) {
	if fd.Time.IsZero() {
		return []byte("null"), nil
	}
	return json.Marshal(fd.Time.Format(time.RFC3339))
}

// OKRObjectiveStatus represents the status of an OKR objective
type OKRObjectiveStatus string

const (
	OKRStatusDraft     OKRObjectiveStatus = "draft"
	OKRStatusActive    OKRObjectiveStatus = "active"
	OKRStatusCompleted OKRObjectiveStatus = "completed"
	OKRStatusCancelled OKRObjectiveStatus = "cancelled"
)

// KeyResultType represents the type of a key result
type KeyResultType string

const (
	KRTypePercentage KeyResultType = "percentage"
	KRTypeNumber     KeyResultType = "number"
	KRTypeBoolean    KeyResultType = "boolean"
)

// KeyResultStatus represents the status of a key result
type KeyResultStatus string

const (
	KRStatusNotStarted KeyResultStatus = "not_started"
	KRStatusInProgress KeyResultStatus = "in_progress"
	KRStatusCompleted  KeyResultStatus = "completed"
	KRStatusAtRisk     KeyResultStatus = "at_risk"
)

// Value implements driver.Valuer for OKRObjectiveStatus
func (s OKRObjectiveStatus) Value() (driver.Value, error) {
	return string(s), nil
}

// Scan implements sql.Scanner for OKRObjectiveStatus
func (s *OKRObjectiveStatus) Scan(value interface{}) error {
	if value == nil {
		*s = OKRStatusActive
		return nil
	}
	if str, ok := value.(string); ok {
		*s = OKRObjectiveStatus(str)
		return nil
	}
	return fmt.Errorf("cannot scan %T into OKRObjectiveStatus", value)
}

// Value implements driver.Valuer for KeyResultType
func (t KeyResultType) Value() (driver.Value, error) {
	return string(t), nil
}

// Scan implements sql.Scanner for KeyResultType
func (t *KeyResultType) Scan(value interface{}) error {
	if value == nil {
		*t = KRTypePercentage
		return nil
	}
	if str, ok := value.(string); ok {
		*t = KeyResultType(str)
		return nil
	}
	return fmt.Errorf("cannot scan %T into KeyResultType", value)
}

// Value implements driver.Valuer for KeyResultStatus
func (s KeyResultStatus) Value() (driver.Value, error) {
	return string(s), nil
}

// Scan implements sql.Scanner for KeyResultStatus
func (s *KeyResultStatus) Scan(value interface{}) error {
	if value == nil {
		*s = KRStatusNotStarted
		return nil
	}
	if str, ok := value.(string); ok {
		*s = KeyResultStatus(str)
		return nil
	}
	return fmt.Errorf("cannot scan %T into KeyResultStatus", value)
}

// OKRObjective represents an OKR objective
type OKRObjective struct {
	ID           int                `json:"id" db:"id"`
	Title        string             `json:"title" db:"title" validate:"required,max=255"`
	Description  string             `json:"description" db:"description"`
	Quarter      string             `json:"quarter" db:"quarter" validate:"required"`
	Status       OKRObjectiveStatus `json:"status" db:"status"`
	Progress     int                `json:"progress" db:"progress"`
	AssigneeID   *int               `json:"assigneeId" db:"assignee_id"`
	EnterpriseID *int               `json:"enterpriseId" db:"enterprise_id"`
	StartDate    time.Time          `json:"startDate" db:"start_date"`
	EndDate      time.Time          `json:"endDate" db:"end_date"`
	CreatedBy    *int               `json:"createdBy" db:"created_by"`
	CreatedAt    time.Time          `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time          `json:"updatedAt" db:"updated_at"`
	DeletedAt    *time.Time         `json:"deletedAt,omitempty" db:"deleted_at"`
	KeyResults   []OKRKeyResult     `json:"keyResults,omitempty"`
}

// OKRKeyResult represents a key result for an OKR objective
type OKRKeyResult struct {
	ID           int             `json:"id" db:"id"`
	ObjectiveID  int             `json:"objectiveId" db:"objective_id"`
	Title        string          `json:"title" db:"title" validate:"required,max=255"`
	Description  string          `json:"description" db:"description"`
	Type         KeyResultType   `json:"type" db:"type"`
	TargetValue  float64         `json:"targetValue" db:"target_value"`
	CurrentValue float64         `json:"currentValue" db:"current_value"`
	Unit         string          `json:"unit" db:"unit"`
	Progress     int             `json:"progress" db:"progress"`
	Status       KeyResultStatus `json:"status" db:"status"`
	CreatedAt    time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time       `json:"updatedAt" db:"updated_at"`
	DeletedAt    *time.Time      `json:"deletedAt,omitempty" db:"deleted_at"`
}

// Request and response models
type CreateOKRObjectiveRequest struct {
	Title       string                     `json:"title" validate:"required,max=255"`
	Description string                     `json:"description"`
	Quarter     string                     `json:"quarter" validate:"required"`
	StartDate   time.Time                  `json:"startDate" validate:"required"`
	EndDate     time.Time                  `json:"endDate" validate:"required"`
	KeyResults  []CreateKeyResultRequest   `json:"keyResults"`
}

type CreateKeyResultRequest struct {
	Title       string        `json:"title" validate:"required,max=255"`
	Description string        `json:"description"`
	Type        KeyResultType `json:"type" validate:"required"`
	TargetValue float64       `json:"targetValue" validate:"required"`
	Unit        string        `json:"unit"`
}

type UpdateOKRObjectiveRequest struct {
	Title       *string               `json:"title,omitempty"`
	Description *string               `json:"description,omitempty"`
	Status      *OKRObjectiveStatus   `json:"status,omitempty"`
	Progress    *int                  `json:"progress,omitempty"`
	StartDate   *FlexibleDate         `json:"startDate,omitempty"`
	EndDate     *FlexibleDate         `json:"endDate,omitempty"`
}

type UpdateKeyResultRequest struct {
	Title        *string          `json:"title,omitempty"`
	Description  *string          `json:"description,omitempty"`
	CurrentValue *float64         `json:"currentValue,omitempty"`
	Progress     *int             `json:"progress,omitempty"`
	Status       *KeyResultStatus `json:"status,omitempty"`
}

type OKRListResponse struct {
	Objectives []OKRObjective `json:"objectives"`
	Total      int            `json:"total"`
	Quarter    string         `json:"quarter"`
}

type OKRStatsResponse struct {
	TotalObjectives     int     `json:"totalObjectives"`
	CompletedObjectives int     `json:"completedObjectives"`
	AverageProgress     float64 `json:"averageProgress"`
	AtRiskCount         int     `json:"atRiskCount"`
	Quarter             string  `json:"quarter"`
	RemainingDays       int     `json:"remainingDays"`
}

// OKRProgressLog records progress updates for objectives and key results (audit log)
type OKRProgressLog struct {
	ID            int     `json:"id" db:"id"`
	ObjectiveID   *int    `json:"objective_id" db:"objective_id"`     // NULL for key result logs
	KeyResultID   *int    `json:"key_result_id" db:"key_result_id"`   // NULL for objective logs
	UserID        int     `json:"user_id" db:"user_id"`               // User who made the change
	ChangeType    string  `json:"change_type" db:"change_type"`       // manual, auto, sync, system, import
	FieldName     string  `json:"field_name" db:"field_name"`         // Field that changed
	PreviousValue *string `json:"previous_value" db:"previous_value"` // Previous value as string
	NewValue      *string `json:"new_value" db:"new_value"`           // New value as string
	Reason        *string `json:"reason" db:"reason"`                 // Reason for change
	IPAddress     *string `json:"ip_address" db:"ip_address"`         // Client IP address
	UserAgent     *string `json:"user_agent" db:"user_agent"`         // Client user agent
	CreatedAt     time.Time `json:"created_at" db:"created_at"`       // When the change occurred
}

// ChangeType constants for OKRProgressLog
const (
	ChangeTypeManual string = "manual" // User manually updated
	ChangeTypeAuto   string = "auto"   // Automatically calculated
	ChangeTypeSync   string = "sync"   // Synced from task system
	ChangeTypeSystem string = "system" // System operation
	ChangeTypeImport string = "import" // Bulk import operation
)

// Helper methods
func (obj *OKRObjective) IsCompleted() bool {
	return obj.Status == OKRStatusCompleted
}

func (obj *OKRObjective) IsActive() bool {
	return obj.Status == OKRStatusActive
}

func (kr *OKRKeyResult) IsCompleted() bool {
	return kr.Status == KRStatusCompleted
}

func (kr *OKRKeyResult) IsAtRisk() bool {
	return kr.Status == KRStatusAtRisk
}

// CalculateObjectiveProgress calculates the overall progress of an objective based on its key results
func (obj *OKRObjective) CalculateProgress() int {
	if len(obj.KeyResults) == 0 {
		return obj.Progress
	}

	totalProgress := 0
	for _, kr := range obj.KeyResults {
		totalProgress += kr.Progress
	}

	return totalProgress / len(obj.KeyResults)
}

// GetQuarterFromDate returns the quarter string for a given date
func GetQuarterFromDate(date time.Time) string {
	year := date.Year()
	month := date.Month()
	quarter := (int(month) + 2) / 3
	return fmt.Sprintf("%d-Q%d", year, quarter)
}

// GetCurrentQuarter returns the current quarter string
func GetCurrentQuarter() string {
	return GetQuarterFromDate(time.Now())
}

// ParseQuarter parses a quarter string and returns the start and end dates
func ParseQuarter(quarter string) (time.Time, time.Time, error) {
	var year, q int
	_, err := fmt.Sscanf(quarter, "%d-Q%d", &year, &q)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid quarter format: %s", quarter)
	}

	if q < 1 || q > 4 {
		return time.Time{}, time.Time{}, fmt.Errorf("invalid quarter number: %d", q)
	}

	startMonth := (q-1)*3 + 1
	endMonth := q * 3

	startDate := time.Date(year, time.Month(startMonth), 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(year, time.Month(endMonth+1), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)

	return startDate, endDate, nil
}

// GetRemainingDaysInQuarter returns the number of remaining days in the current quarter
func GetRemainingDaysInQuarter(quarter string) int {
	_, endDate, err := ParseQuarter(quarter)
	if err != nil {
		return 0
	}

	now := time.Now()
	if now.After(endDate) {
		return 0
	}

	duration := endDate.Sub(now)
	return int(duration.Hours() / 24)
}

// TaskKeyResultAssociation represents the relationship between tasks and key results
type TaskKeyResultAssociation struct {
	ID           int       `json:"id" db:"id"`
	TaskID       int       `json:"task_id" db:"task_id"`
	KeyResultID  int       `json:"key_result_id" db:"key_result_id"`
	Weight       float64   `json:"weight" db:"weight"`
	SyncMode     string    `json:"sync_mode" db:"sync_mode"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// Request models for task-KR associations
type CreateTaskKRAssociationRequest struct {
	TaskID      int     `json:"task_id" validate:"required"`
	KeyResultID int     `json:"key_result_id" validate:"required"`
	Weight      float64 `json:"weight" validate:"min=0,max=100"`
	SyncMode    string  `json:"sync_mode" validate:"oneof=auto manual"`
}

type UpdateTaskKRAssociationRequest struct {
	Weight   *float64 `json:"weight,omitempty" validate:"omitempty,min=0,max=100"`
	SyncMode *string  `json:"sync_mode,omitempty" validate:"omitempty,oneof=auto manual"`
}

// Response models with task information
type TaskKRAssociationWithTask struct {
	TaskKeyResultAssociation
	TaskTitle  string `json:"task_title"`
	TaskStatus string `json:"task_status"`
	TaskProgress *int `json:"task_progress,omitempty"`
}

// Response models with KR information  
type TaskKRAssociationWithKR struct {
	TaskKeyResultAssociation
	KRTitle       string  `json:"kr_title"`
	KRTargetValue float64 `json:"kr_target_value"`
	KRCurrentValue float64 `json:"kr_current_value"`
	KRProgress    int     `json:"kr_progress"`
}

// ==================== Phase 3: Advanced Analytics Models ====================

// OKRPerformanceMetrics tracks comprehensive performance data for objectives
type OKRPerformanceMetrics struct {
	ID                    int       `json:"id" db:"id"`
	ObjectiveID           int       `json:"objective_id" db:"objective_id"`
	Quarter               string    `json:"quarter" db:"quarter"`
	UserID                int       `json:"user_id" db:"user_id"`
	EnterpriseID          *int      `json:"enterprise_id" db:"enterprise_id"`
	
	// Performance metrics
	CompletionRate        float64   `json:"completion_rate" db:"completion_rate"`
	AverageKRProgress     float64   `json:"average_kr_progress" db:"average_kr_progress"`
	TimeToCompletion      *int      `json:"time_to_completion" db:"time_to_completion"`
	ConsistencyScore      float64   `json:"consistency_score" db:"consistency_score"`
	QualityScore          float64   `json:"quality_score" db:"quality_score"`
	
	// Behavioral metrics
	UpdatesFrequency      int       `json:"updates_frequency" db:"updates_frequency"`
	CollaborationScore    float64   `json:"collaboration_score" db:"collaboration_score"`
	AlignmentScore        float64   `json:"alignment_score" db:"alignment_score"`
	
	// Final assessment
	FinalScore            float64   `json:"final_score" db:"final_score"`
	Grade                 string    `json:"grade" db:"grade"`
	
	CreatedAt             time.Time `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time `json:"updated_at" db:"updated_at"`
}

// OKRAnalyticsSnapshot captures aggregate analytics data at a point in time
type OKRAnalyticsSnapshot struct {
	ID                      int       `json:"id" db:"id"`
	EnterpriseID            *int      `json:"enterprise_id" db:"enterprise_id"`
	UserID                  *int      `json:"user_id" db:"user_id"`
	Quarter                 string    `json:"quarter" db:"quarter"`
	SnapshotDate            time.Time `json:"snapshot_date" db:"snapshot_date"`
	
	// Aggregate statistics
	TotalObjectives         int       `json:"total_objectives" db:"total_objectives"`
	CompletedObjectives     int       `json:"completed_objectives" db:"completed_objectives"`
	AtRiskObjectives        int       `json:"at_risk_objectives" db:"at_risk_objectives"`
	TotalKeyResults         int       `json:"total_key_results" db:"total_key_results"`
	CompletedKeyResults     int       `json:"completed_key_results" db:"completed_key_results"`
	
	// Performance indicators
	OverallCompletionRate   float64   `json:"overall_completion_rate" db:"overall_completion_rate"`
	AverageQualityScore     float64   `json:"average_quality_score" db:"average_quality_score"`
	TeamAlignmentScore      float64   `json:"team_alignment_score" db:"team_alignment_score"`
	QuarterProgressRate     float64   `json:"quarter_progress_rate" db:"quarter_progress_rate"`
	
	// Predictive metrics
	ProjectedCompletionRate float64   `json:"projected_completion_rate" db:"projected_completion_rate"`
	RiskAssessment          string    `json:"risk_assessment" db:"risk_assessment"`
	
	CreatedAt               time.Time `json:"created_at" db:"created_at"`
}

// OKRTeamCollaboration manages team access and collaboration on objectives
type OKRTeamCollaboration struct {
	ID                  int        `json:"id" db:"id"`
	ObjectiveID         int        `json:"objective_id" db:"objective_id"`
	CollaboratorUserID  int        `json:"collaborator_user_id" db:"collaborator_user_id"`
	CollaborationType   string     `json:"collaboration_type" db:"collaboration_type"`
	PermissionLevel     string     `json:"permission_level" db:"permission_level"`
	
	// Collaboration metrics
	ContributionScore   float64    `json:"contribution_score" db:"contribution_score"`
	FeedbackCount       int        `json:"feedback_count" db:"feedback_count"`
	LastInteractionAt   *time.Time `json:"last_interaction_at" db:"last_interaction_at"`
	
	Status              string     `json:"status" db:"status"`
	InvitedBy           *int       `json:"invited_by" db:"invited_by"`
	InvitedAt           time.Time  `json:"invited_at" db:"invited_at"`
	AcceptedAt          *time.Time `json:"accepted_at" db:"accepted_at"`
	
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at" db:"updated_at"`
}

// OKRComment represents comments and feedback on objectives or key results
type OKRComment struct {
	ID                int        `json:"id" db:"id"`
	ObjectiveID       *int       `json:"objective_id" db:"objective_id"`
	KeyResultID       *int       `json:"key_result_id" db:"key_result_id"`
	UserID            int        `json:"user_id" db:"user_id"`
	
	CommentText       string     `json:"comment_text" db:"comment_text"`
	CommentType       string     `json:"comment_type" db:"comment_type"`
	Visibility        string     `json:"visibility" db:"visibility"`
	
	// Thread support
	ParentCommentID   *int       `json:"parent_comment_id" db:"parent_comment_id"`
	ThreadLevel       int        `json:"thread_level" db:"thread_level"`
	
	// Engagement metrics
	LikesCount        int        `json:"likes_count" db:"likes_count"`
	RepliesCount      int        `json:"replies_count" db:"replies_count"`
	
	IsResolved        bool       `json:"is_resolved" db:"is_resolved"`
	ResolvedBy        *int       `json:"resolved_by" db:"resolved_by"`
	ResolvedAt        *time.Time `json:"resolved_at" db:"resolved_at"`
	
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at" db:"deleted_at"`
}

// OKRExportTemplate defines templates for exporting OKR reports
type OKRExportTemplate struct {
	ID                int        `json:"id" db:"id"`
	UserID            int        `json:"user_id" db:"user_id"`
	TemplateName      string     `json:"template_name" db:"template_name"`
	Description       string     `json:"description" db:"description"`
	
	// Export configuration
	ExportFormat      string     `json:"export_format" db:"export_format"`
	IncludeMetrics    bool       `json:"include_metrics" db:"include_metrics"`
	IncludeComments   bool       `json:"include_comments" db:"include_comments"`
	IncludeTimeline   bool       `json:"include_timeline" db:"include_timeline"`
	IncludeAnalytics  bool       `json:"include_analytics" db:"include_analytics"`
	
	// Template settings (JSON)
	TemplateConfig    string     `json:"template_config" db:"template_config"`
	
	IsDefault         bool       `json:"is_default" db:"is_default"`
	IsShared          bool       `json:"is_shared" db:"is_shared"`
	
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt         *time.Time `json:"deleted_at" db:"deleted_at"`
}

// ==================== Phase 3: Request/Response Models ====================

// Advanced Analytics Requests
type CreatePerformanceMetricsRequest struct {
	ObjectiveID        int     `json:"objective_id" validate:"required"`
	Quarter            string  `json:"quarter" validate:"required"`
	CompletionRate     float64 `json:"completion_rate"`
	ConsistencyScore   float64 `json:"consistency_score"`
	QualityScore       float64 `json:"quality_score"`
	CollaborationScore float64 `json:"collaboration_score"`
	AlignmentScore     float64 `json:"alignment_score"`
}

type AnalyticsSnapshotRequest struct {
	Quarter      string `json:"quarter" validate:"required"`
	EnterpriseID *int   `json:"enterprise_id"`
	UserID       *int   `json:"user_id"`
}

// Team Collaboration Requests
type CreateCollaborationRequest struct {
	ObjectiveID        int    `json:"objective_id" validate:"required"`
	CollaboratorUserID int    `json:"collaborator_user_id" validate:"required"`
	CollaborationType  string `json:"collaboration_type" validate:"required"`
	PermissionLevel    string `json:"permission_level" validate:"required"`
}

type UpdateCollaborationRequest struct {
	CollaborationType  *string `json:"collaboration_type,omitempty"`
	PermissionLevel    *string `json:"permission_level,omitempty"`
	Status             *string `json:"status,omitempty"`
}

// Comment Requests (OKR-specific)
type OKRCreateCommentRequest struct {
	ObjectiveID *int   `json:"objective_id"`
	KeyResultID *int   `json:"key_result_id"`
	CommentText string `json:"comment_text" validate:"required"`
	CommentType string `json:"comment_type"`
	Visibility  string `json:"visibility"`
	ParentCommentID *int `json:"parent_comment_id"`
}

type OKRUpdateCommentRequest struct {
	CommentText *string `json:"comment_text,omitempty"`
	CommentType *string `json:"comment_type,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
	IsResolved  *bool   `json:"is_resolved,omitempty"`
}

// Export Template Requests
type CreateExportTemplateRequest struct {
	TemplateName     string `json:"template_name" validate:"required"`
	Description      string `json:"description"`
	ExportFormat     string `json:"export_format" validate:"required"`
	IncludeMetrics   bool   `json:"include_metrics"`
	IncludeComments  bool   `json:"include_comments"`
	IncludeTimeline  bool   `json:"include_timeline"`
	IncludeAnalytics bool   `json:"include_analytics"`
	TemplateConfig   string `json:"template_config"`
	IsShared         bool   `json:"is_shared"`
}

// ==================== Phase 3: Response Models ====================

type AdvancedAnalyticsResponse struct {
	PerformanceMetrics   *OKRPerformanceMetrics `json:"performance_metrics"`
	AnalyticsSnapshot    *OKRAnalyticsSnapshot  `json:"analytics_snapshot"`
	TrendData            []AnalyticsTrendPoint  `json:"trend_data"`
	Insights             []AnalyticsInsight     `json:"insights"`
}

type AnalyticsTrendPoint struct {
	Date        time.Time `json:"date"`
	Completion  float64   `json:"completion"`
	Quality     float64   `json:"quality"`
	Alignment   float64   `json:"alignment"`
}

type AnalyticsInsight struct {
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Severity    string    `json:"severity"`
	Suggestion  string    `json:"suggestion"`
	CreatedAt   time.Time `json:"created_at"`
}

type CollaborationResponse struct {
	Collaborations []OKRTeamCollaboration `json:"collaborations"`
	TotalCount     int                    `json:"total_count"`
	TeamSize       int                    `json:"team_size"`
	ActiveUsers    int                    `json:"active_users"`
}

type CommentsResponse struct {
	Comments     []OKRComment `json:"comments"`
	TotalCount   int          `json:"total_count"`
	ThreadCount  int          `json:"thread_count"`
	UnresolvedCount int       `json:"unresolved_count"`
}

// ==================== Phase 3: Constants ====================

// Collaboration types
const (
	CollabTypeContributor = "contributor"
	CollabTypeStakeholder = "stakeholder"
	CollabTypeReviewer    = "reviewer"
	CollabTypeMentor      = "mentor"
)

// Permission levels (OKR-specific aliases to avoid conflicts)
const (
	OKRPermissionRead    = "read"
	OKRPermissionComment = "comment"
	OKRPermissionEdit    = "edit"
)

// Comment types
const (
	CommentTypeGeneral    = "general"
	CommentTypeFeedback   = "feedback"
	CommentTypeQuestion   = "question"
	CommentTypeSuggestion = "suggestion"
	CommentTypeBlocker    = "blocker"
)

// Risk assessment levels
const (
	RiskLow    = "low"
	RiskMedium = "medium"
	RiskHigh   = "high"
)

// Export formats
const (
	ExportFormatPDF        = "pdf"
	ExportFormatExcel      = "excel"
	ExportFormatPowerPoint = "powerpoint"
	ExportFormatJSON       = "json"
)