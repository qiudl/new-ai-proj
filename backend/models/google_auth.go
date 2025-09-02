package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// OAuthState OAuth状态信息，用于CSRF保护
type OAuthState struct {
	ID        int       `json:"id" db:"id"`
	State     string    `json:"state" db:"state"`
	UserID    int       `json:"user_id" db:"user_id"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// GoogleToken Google访问令牌信息
type GoogleToken struct {
	ID                    int        `json:"id" db:"id"`
	UserID                int        `json:"user_id" db:"user_id"`
	AccessTokenEncrypted  string     `json:"-" db:"access_token_encrypted"`  // 不在JSON中暴露
	RefreshTokenEncrypted string     `json:"-" db:"refresh_token_encrypted"` // 不在JSON中暴露
	TokenType             string     `json:"token_type" db:"token_type"`
	ExpiresAt             time.Time  `json:"expires_at" db:"expires_at"`
	Scopes                Scopes     `json:"scopes" db:"scopes"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
	LastRefreshAt         *time.Time `json:"last_refresh_at" db:"last_refresh_at"`

	// 运行时字段，不存储在数据库中
	AccessToken  string `json:"access_token,omitempty" db:"-"`
	RefreshToken string `json:"refresh_token,omitempty" db:"-"`
}

// GoogleCalendarSync Google日历同步配置
type GoogleCalendarSync struct {
	ID            int        `json:"id" db:"id"`
	UserID        int        `json:"user_id" db:"user_id"`
	CalendarID    string     `json:"calendar_id" db:"calendar_id"`
	CalendarName  string     `json:"calendar_name" db:"calendar_name"`
	IsPrimary     bool       `json:"is_primary" db:"is_primary"`
	SyncEnabled   bool       `json:"sync_enabled" db:"sync_enabled"`
	LastSyncAt    *time.Time `json:"last_sync_at" db:"last_sync_at"`
	SyncDirection string     `json:"sync_direction" db:"sync_direction"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

// GoogleEventMapping 任务与Google事件的映射关系
type GoogleEventMapping struct {
	ID               int       `json:"id" db:"id"`
	UserID           int       `json:"user_id" db:"user_id"`
	TaskID           int       `json:"task_id" db:"task_id"`
	GoogleEventID    string    `json:"google_event_id" db:"google_event_id"`
	GoogleCalendarID string    `json:"google_calendar_id" db:"google_calendar_id"`
	LastSyncedAt     time.Time `json:"last_synced_at" db:"last_synced_at"`
	SyncStatus       string    `json:"sync_status" db:"sync_status"`
	ErrorMessage     *string   `json:"error_message" db:"error_message"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
}

// GoogleSyncLog Google同步日志
type GoogleSyncLog struct {
	ID              int                    `json:"id" db:"id"`
	UserID          int                    `json:"user_id" db:"user_id"`
	Operation       string                 `json:"operation" db:"operation"`
	ResourceType    string                 `json:"resource_type" db:"resource_type"`
	ResourceID      string                 `json:"resource_id" db:"resource_id"`
	Status          string                 `json:"status" db:"status"`
	Message         *string                `json:"message" db:"message"`
	Details         map[string]interface{} `json:"details" db:"details"`
	ExecutionTimeMs *int                   `json:"execution_time_ms" db:"execution_time_ms"`
	CreatedAt       time.Time              `json:"created_at" db:"created_at"`
}

// Scopes 自定义类型用于处理JSON数组
type Scopes []string

// Value 实现 driver.Valuer 接口
func (s Scopes) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	return json.Marshal(s)
}

// Scan 实现 sql.Scanner 接口
func (s *Scopes) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into Scopes", value)
	}

	return json.Unmarshal(bytes, s)
}

// GoogleSyncPreferences Google同步偏好设置
type GoogleSyncPreferences struct {
	AutoSync               bool   `json:"auto_sync"`
	SyncTasksToCalendar    bool   `json:"sync_tasks_to_calendar"`
	SyncEventsToTasks      bool   `json:"sync_events_to_tasks"`
	DefaultCalendarID      string `json:"default_calendar_id"`
	SyncCompletedTasks     bool   `json:"sync_completed_tasks"`
	EventVisibility        string `json:"event_visibility"` // default, public, private
	EventColorID           string `json:"event_color_id"`
	NotificationMinutes    int    `json:"notification_minutes"`
	IncludeTaskDescription bool   `json:"include_task_description"`
}

// Value 实现 driver.Valuer 接口
func (gsp GoogleSyncPreferences) Value() (driver.Value, error) {
	return json.Marshal(gsp)
}

// Scan 实现 sql.Scanner 接口
func (gsp *GoogleSyncPreferences) Scan(value interface{}) error {
	if value == nil {
		*gsp = GoogleSyncPreferences{
			AutoSync:               true,
			SyncTasksToCalendar:    true,
			SyncEventsToTasks:      false,
			SyncCompletedTasks:     false,
			EventVisibility:        "default",
			NotificationMinutes:    15,
			IncludeTaskDescription: true,
		}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into GoogleSyncPreferences", value)
	}

	return json.Unmarshal(bytes, gsp)
}

// Constants for sync operations
const (
	// Sync directions
	SyncDirectionToGoogle      = "to_google"
	SyncDirectionFromGoogle    = "from_google"
	SyncDirectionBidirectional = "bidirectional"

	// Sync statuses
	SyncStatusSynced  = "synced"
	SyncStatusPending = "pending"
	SyncStatusError   = "error"

	// Operations
	OperationSyncToGoogle   = "sync_to_google"
	OperationSyncFromGoogle = "sync_from_google"
	OperationCreateEvent    = "create_event"
	OperationUpdateEvent    = "update_event"
	OperationDeleteEvent    = "delete_event"

	// Resource types for Google sync
	GoogleResourceTypeTask  = "task"
	GoogleResourceTypeEvent = "event"

	// Log statuses
	LogStatusSuccess = "success"
	LogStatusError   = "error"
	LogStatusWarning = "warning"

	// OAuth state expiration (15 minutes)
	OAuthStateExpirationMinutes = 15
)

// IsExpired 检查OAuth状态是否过期
func (os *OAuthState) IsExpired() bool {
	return time.Now().After(os.ExpiresAt)
}

// IsTokenExpired 检查访问令牌是否过期
func (gt *GoogleToken) IsTokenExpired() bool {
	// 提前5分钟检查过期，给刷新令牌留出时间
	return time.Now().Add(5 * time.Minute).After(gt.ExpiresAt)
}

// NeedsRefresh 检查是否需要刷新令牌
func (gt *GoogleToken) NeedsRefresh() bool {
	if gt.IsTokenExpired() {
		return true
	}

	// 如果距离过期时间不到10分钟，建议刷新
	return time.Until(gt.ExpiresAt) < 10*time.Minute
}

// HasScope 检查是否包含指定的权限范围
func (gt *GoogleToken) HasScope(scope string) bool {
	for _, s := range gt.Scopes {
		if s == scope {
			return true
		}
	}
	return false
}

// TableName 指定表名
func (OAuthState) TableName() string {
	return "oauth_states"
}

func (GoogleToken) TableName() string {
	return "google_tokens"
}

func (GoogleCalendarSync) TableName() string {
	return "google_calendar_sync"
}

func (GoogleEventMapping) TableName() string {
	return "google_event_mappings"
}

func (GoogleSyncLog) TableName() string {
	return "google_sync_logs"
}
