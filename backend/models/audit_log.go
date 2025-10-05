package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// JSONB represents a PostgreSQL JSONB type
type JSONB map[string]interface{}

// Value implements driver.Valuer interface for JSONB
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements sql.Scanner interface for JSONB
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into JSONB", value)
	}

	result := make(map[string]interface{})
	err := json.Unmarshal(bytes, &result)
	*j = result
	return err
}

// StringArray represents a PostgreSQL text array
type StringArray []string

// Value implements driver.Valuer interface for StringArray
func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}

	// PostgreSQL array format: {value1,value2,value3}
	if len(s) == 0 {
		return "{}", nil
	}

	result := "{"
	for i, v := range s {
		if i > 0 {
			result += ","
		}
		// Escape quotes and backslashes
		escaped := fmt.Sprintf(`"%s"`, v)
		result += escaped
	}
	result += "}"

	return result, nil
}

// Scan implements sql.Scanner interface for StringArray
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return s.scanFromBytes(v)
	case string:
		return s.scanFromBytes([]byte(v))
	default:
		return fmt.Errorf("cannot scan %T into StringArray", value)
	}
}

func (s *StringArray) scanFromBytes(data []byte) error {
	str := string(data)

	// Handle empty array
	if str == "{}" {
		*s = []string{}
		return nil
	}

	// Remove braces
	if len(str) >= 2 && str[0] == '{' && str[len(str)-1] == '}' {
		str = str[1 : len(str)-1]
	}

	if str == "" {
		*s = []string{}
		return nil
	}

	// Simple parsing - split by comma and remove quotes
	var result []string
	parts := strings.Split(str, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		// Remove quotes if present
		if len(part) >= 2 && part[0] == '"' && part[len(part)-1] == '"' {
			part = part[1 : len(part)-1]
		}
		if part != "" {
			result = append(result, part)
		}
	}

	*s = result
	return nil
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID        int64     `json:"id" db:"id"`
	EventID   string    `json:"event_id" db:"event_id"`
	Timestamp time.Time `json:"timestamp,omitempty" db:"timestamp"`
	CreatedAt time.Time `json:"created_at" db:"timestamp"` // 前端兼容字段

	// User information
	UserID    *int   `json:"user_id" db:"user_id"`
	UserEmail string `json:"user_email" db:"user_email"`
	UserName  string `json:"user_name" db:"user_name"`
	UserRole  string `json:"user_role" db:"user_role"`

	// Operation information
	Action       string `json:"action" db:"action"`
	ResourceType string `json:"resource_type,omitempty" db:"resource_type"`
	EntityType   string `json:"entity_type" db:"resource_type"` // 前端兼容字段
	ResourceID   string `json:"resource_id,omitempty" db:"resource_id"`
	EntityID     string `json:"entity_id" db:"resource_id"` // 前端兼容字段（注意：前端期望number但后端是string）
	ResourceName string `json:"resource_name" db:"resource_name"`

	// Request information
	IPAddress string `json:"ip_address" db:"ip_address"`
	UserAgent string `json:"user_agent" db:"user_agent"`
	SessionID string `json:"session_id" db:"session_id"`
	RequestID string `json:"request_id" db:"request_id"`

	// Operation details
	Description string `json:"description" db:"description"`
	BeforeData  JSONB  `json:"before_data" db:"before_data"`
	AfterData   JSONB  `json:"after_data" db:"after_data"`
	EntityData  JSONB  `json:"entity_data" db:"after_data"` // 前端兼容字段，映射到after_data
	Changes     JSONB  `json:"changes" db:"changes"`

	// Status information
	Status       string `json:"status" db:"status"`
	ErrorMessage string `json:"error_message" db:"error_message"`

	// Context information
	ProjectID     *int   `json:"project_id" db:"project_id"`
	ParentEventID string `json:"parent_event_id" db:"parent_event_id"`
	CorrelationID string `json:"correlation_id" db:"correlation_id"`

	// Metadata
	Metadata JSONB       `json:"metadata" db:"metadata"`
	Tags     StringArray `json:"tags" db:"tags"`
}

// AuditConfig represents audit configuration for different operations
type AuditConfig struct {
	ID              int         `json:"id" db:"id"`
	ResourceType    string      `json:"resource_type" db:"resource_type"`
	Action          string      `json:"action" db:"action"`
	Enabled         bool        `json:"enabled" db:"enabled"`
	LogBeforeData   bool        `json:"log_before_data" db:"log_before_data"`
	LogAfterData    bool        `json:"log_after_data" db:"log_after_data"`
	LogChanges      bool        `json:"log_changes" db:"log_changes"`
	RetentionDays   int         `json:"retention_days" db:"retention_days"`
	SensitiveFields StringArray `json:"sensitive_fields" db:"sensitive_fields"`
	CreatedAt       time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at" db:"updated_at"`
}

// AuditEventData represents data for creating an audit log entry
type AuditEventData struct {
	UserID        *int
	UserEmail     string
	UserName      string
	UserRole      string
	Action        string
	ResourceType  string
	ResourceID    string
	ResourceName  string
	IPAddress     string
	UserAgent     string
	SessionID     string
	RequestID     string
	Description   string
	BeforeData    interface{}
	AfterData     interface{}
	ProjectID     *int
	Status        string
	ErrorMessage  string
	Metadata      map[string]interface{}
	Tags          []string
	ParentEventID string
	CorrelationID string
}

// AuditLogFilter represents filter criteria for querying audit logs
type AuditLogFilter struct {
	UserID       *int      `json:"user_id"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resource_type"`
	ResourceID   string    `json:"resource_id"`
	ProjectID    *int      `json:"project_id"`
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	Status       string    `json:"status"`
	IPAddress    string    `json:"ip_address"`
	SessionID    string    `json:"session_id"`
	RequestID    string    `json:"request_id"`
	Description  string    `json:"description"` // For search functionality
	Tags         []string  `json:"tags"`
	Offset       int       `json:"offset"`
	Limit        int       `json:"limit"`
}

// AuditStatsRequest represents a request for audit statistics
type AuditStatsRequest struct {
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	GroupBy   string    `json:"group_by"` // user, action, resource_type, hour, day
}

// AuditStats represents audit statistics result
type AuditStats struct {
	Label string      `json:"label"`
	Count int64       `json:"count"`
	Extra interface{} `json:"extra,omitempty"`
}

// Action constants for different operations
const (
	// User actions
	ActionUserLogin          = "user.login"
	ActionUserLogout         = "user.logout"
	ActionUserRegister       = "user.register"
	ActionUserUpdateProfile  = "user.update_profile"
	ActionUserChangePassword = "user.change_password"
	ActionUserResetPassword  = "user.reset_password"

	// Project actions
	ActionProjectCreate            = "project.create"
	ActionProjectUpdate            = "project.update"
	ActionProjectDelete            = "project.delete"
	ActionProjectArchive           = "project.archive"
	ActionProjectRestore           = "project.restore"
	ActionProjectAddMember         = "project.add_member"
	ActionProjectRemoveMember      = "project.remove_member"
	ActionProjectUpdatePermissions = "project.update_permissions"

	// Task actions
	ActionTaskCreate       = "task.create"
	ActionTaskUpdate       = "task.update"
	ActionTaskDelete       = "task.delete"
	ActionTaskStatusChange = "task.status_change"
	ActionTaskAssign       = "task.assign"
	ActionTaskUnassign     = "task.unassign"
	ActionTaskMove         = "task.move"
	ActionTaskDuplicate    = "task.duplicate"
	ActionTaskBulkUpdate   = "task.bulk_update"
	ActionTaskBulkDelete   = "task.bulk_delete"
	ActionTaskRestore      = "task.restore"

	// System actions
	ActionSystemBackup       = "system.backup"
	ActionSystemRestore      = "system.restore"
	ActionSystemConfigChange = "system.config_change"
	ActionSystemMaintenance  = "system.maintenance"

	// AI Configuration actions
	ActionAIConfigCreate           = "ai_config.create"
	ActionAIConfigUpdate           = "ai_config.update"
	ActionAIConfigDelete           = "ai_config.delete"
	ActionAIConfigView             = "ai_config.view"
	ActionAIConfigToggle           = "ai_config.toggle"
	ActionAIConfigTest             = "ai_config.test"
	ActionAIConfigRotateKey        = "ai_config.rotate_key"
	ActionAIConfigSetExpiry        = "ai_config.set_expiry"
	ActionAIConfigEnableAutoRotate = "ai_config.enable_auto_rotate"
	ActionAIConfigDisableAutoRotate = "ai_config.disable_auto_rotate"
	ActionAIConfigDisableExpired   = "ai_config.disable_expired"
	ActionAIConfigSendWarnings     = "ai_config.send_warnings"
)

// Resource type constants
const (
	ResourceTypeUser     = "user"
	ResourceTypeProject  = "project"
	ResourceTypeTask     = "task"
	ResourceTypeSystem   = "system"
	ResourceTypeAIConfig = "ai_config"
)

// Status constants
const (
	StatusSuccess = "success"
	StatusFailed  = "failed"
	StatusPending = "pending"
)

// ToAuditEventData converts AuditLog to AuditEventData
func (a *AuditLog) ToAuditEventData() *AuditEventData {
	return &AuditEventData{
		UserID:        a.UserID,
		UserEmail:     a.UserEmail,
		UserName:      a.UserName,
		UserRole:      a.UserRole,
		Action:        a.Action,
		ResourceType:  a.ResourceType,
		ResourceID:    a.ResourceID,
		ResourceName:  a.ResourceName,
		IPAddress:     a.IPAddress,
		UserAgent:     a.UserAgent,
		SessionID:     a.SessionID,
		RequestID:     a.RequestID,
		Description:   a.Description,
		BeforeData:    a.BeforeData,
		AfterData:     a.AfterData,
		ProjectID:     a.ProjectID,
		Status:        a.Status,
		ErrorMessage:  a.ErrorMessage,
		Metadata:      a.Metadata,
		Tags:          []string(a.Tags),
		ParentEventID: a.ParentEventID,
		CorrelationID: a.CorrelationID,
	}
}

// DefaultAuditConfigs returns default audit configurations
func DefaultAuditConfigs() []*AuditConfig {
	return []*AuditConfig{
		// Task operations
		{ResourceType: ResourceTypeTask, Action: ActionTaskCreate, Enabled: true, LogBeforeData: false, LogAfterData: true, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeTask, Action: ActionTaskUpdate, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeTask, Action: ActionTaskDelete, Enabled: true, LogBeforeData: true, LogAfterData: false, LogChanges: false, RetentionDays: 2555},
		{ResourceType: ResourceTypeTask, Action: ActionTaskStatusChange, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeTask, Action: ActionTaskAssign, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeTask, Action: ActionTaskBulkUpdate, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeTask, Action: ActionTaskBulkDelete, Enabled: true, LogBeforeData: true, LogAfterData: false, LogChanges: false, RetentionDays: 2555},

		// Project operations
		{ResourceType: ResourceTypeProject, Action: ActionProjectCreate, Enabled: true, LogBeforeData: false, LogAfterData: true, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeProject, Action: ActionProjectUpdate, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeProject, Action: ActionProjectDelete, Enabled: true, LogBeforeData: true, LogAfterData: false, LogChanges: false, RetentionDays: 2555},
		{ResourceType: ResourceTypeProject, Action: ActionProjectArchive, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 365},

		// User operations
		{ResourceType: ResourceTypeUser, Action: ActionUserLogin, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: false, RetentionDays: 90, SensitiveFields: StringArray{"password", "token"}},
		{ResourceType: ResourceTypeUser, Action: ActionUserLogout, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: false, RetentionDays: 90},
		{ResourceType: ResourceTypeUser, Action: ActionUserRegister, Enabled: true, LogBeforeData: false, LogAfterData: true, LogChanges: false, RetentionDays: 2555, SensitiveFields: StringArray{"password", "password_hash"}},
		{ResourceType: ResourceTypeUser, Action: ActionUserUpdateProfile, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 365},
		{ResourceType: ResourceTypeUser, Action: ActionUserChangePassword, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: false, RetentionDays: 365, SensitiveFields: StringArray{"password", "password_hash", "current_password", "new_password"}},

		// System operations
		{ResourceType: ResourceTypeSystem, Action: ActionSystemConfigChange, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555},
		{ResourceType: ResourceTypeSystem, Action: ActionSystemBackup, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: false, RetentionDays: 365},
		{ResourceType: ResourceTypeSystem, Action: ActionSystemMaintenance, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: false, RetentionDays: 365},

		// AI Configuration operations - 高安全级别，长期保留
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigCreate, Enabled: true, LogBeforeData: false, LogAfterData: true, LogChanges: true, RetentionDays: 2555, SensitiveFields: StringArray{"api_key", "api_key_encrypted", "secret"}},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigUpdate, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555, SensitiveFields: StringArray{"api_key", "api_key_encrypted", "secret"}},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigDelete, Enabled: true, LogBeforeData: true, LogAfterData: false, LogChanges: false, RetentionDays: 2555, SensitiveFields: StringArray{"api_key", "api_key_encrypted", "secret"}},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigView, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: false, RetentionDays: 365},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigToggle, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigTest, Enabled: true, LogBeforeData: false, LogAfterData: false, LogChanges: false, RetentionDays: 90},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigRotateKey, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555, SensitiveFields: StringArray{"api_key", "new_api_key", "api_key_encrypted", "secret"}},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigSetExpiry, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigEnableAutoRotate, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigDisableAutoRotate, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigDisableExpired, Enabled: true, LogBeforeData: true, LogAfterData: true, LogChanges: true, RetentionDays: 2555},
		{ResourceType: ResourceTypeAIConfig, Action: ActionAIConfigSendWarnings, Enabled: true, LogBeforeData: false, LogAfterData: true, LogChanges: false, RetentionDays: 365},
	}
}
