package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ImpersonationAuditLog 模拟审计日志
type ImpersonationAuditLog struct {
	ID           int       `db:"id" json:"id"`
	SessionID    string    `db:"session_id" json:"session_id"`
	UserID       int       `db:"user_id" json:"user_id"`
	Username     string    `db:"username" json:"username"`
	EnterpriseID int       `db:"enterprise_id" json:"enterprise_id"`
	Action       string    `db:"action" json:"action"` // start, access, modify, end
	ResourceType string    `db:"resource_type" json:"resource_type"`
	ResourceID   *int      `db:"resource_id" json:"resource_id,omitempty"`
	Method       string    `db:"method" json:"method"`
	Path         string    `db:"path" json:"path"`
	IPAddress    string    `db:"ip_address" json:"ip_address"`
	UserAgent    string    `db:"user_agent" json:"user_agent"`
	Details      JSONBMap  `db:"details" json:"details"`
	Status       string    `db:"status" json:"status"`
	ErrorMessage *string   `db:"error_message" json:"error_message,omitempty"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

// ImpersonationSession 模拟会话记录
type ImpersonationSession struct {
	ID             int        `db:"id" json:"id"`
	SessionID      string     `db:"session_id" json:"session_id"`
	UserID         int        `db:"user_id" json:"user_id"`
	Username       string     `db:"username" json:"username"`
	EnterpriseID   int        `db:"enterprise_id" json:"enterprise_id"`
	EnterpriseName string     `db:"enterprise_name" json:"enterprise_name"`
	EnterpriseCode string     `db:"enterprise_code" json:"enterprise_code"`
	Reason         string     `db:"reason" json:"reason"`
	StartedAt      time.Time  `db:"started_at" json:"started_at"`
	EndedAt        *time.Time `db:"ended_at" json:"ended_at,omitempty"`
	ExpiresAt      time.Time  `db:"expires_at" json:"expires_at"`
	IPAddress      string     `db:"ip_address" json:"ip_address"`
	UserAgent      string     `db:"user_agent" json:"user_agent"`
	Status         string     `db:"status" json:"status"` // active, expired, ended
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// JSONBMap 处理PostgreSQL的JSONB类型
type JSONBMap map[string]interface{}

// Value implements driver.Valuer interface for JSONBMap
func (j JSONBMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements sql.Scanner interface for JSONBMap
func (j *JSONBMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into JSONBMap", value)
	}

	result := make(map[string]interface{})
	err := json.Unmarshal(bytes, &result)
	*j = result
	return err
}

// ImpersonationAuditFilter 审计日志查询过滤器
type ImpersonationAuditFilter struct {
	SessionID    *string    `json:"session_id,omitempty"`
	UserID       *int       `json:"user_id,omitempty"`
	EnterpriseID *int       `json:"enterprise_id,omitempty"`
	Action       *string    `json:"action,omitempty"`
	DateFrom     *time.Time `json:"date_from,omitempty"`
	DateTo       *time.Time `json:"date_to,omitempty"`
	IPAddress    *string    `json:"ip_address,omitempty"`
	Status       *string    `json:"status,omitempty"`
	Limit        int        `json:"limit,omitempty"`
	Offset       int        `json:"offset,omitempty"`
}

// ImpersonationSessionFilter 会话查询过滤器
type ImpersonationSessionFilter struct {
	UserID       *int       `json:"user_id,omitempty"`
	EnterpriseID *int       `json:"enterprise_id,omitempty"`
	Status       *string    `json:"status,omitempty"`
	DateFrom     *time.Time `json:"date_from,omitempty"`
	DateTo       *time.Time `json:"date_to,omitempty"`
	Limit        int        `json:"limit,omitempty"`
	Offset       int        `json:"offset,omitempty"`
}

// ImpersonationStats 模拟统计信息
type ImpersonationStats struct {
	TotalSessions     int                         `json:"total_sessions"`
	ActiveSessions    int                         `json:"active_sessions"`
	SessionsByUser    []ImpersonationUserStats    `json:"sessions_by_user"`
	SessionsByEnterprise []ImpersonationEnterpriseStats `json:"sessions_by_enterprise"`
	RecentActivities  []ImpersonationAuditLog     `json:"recent_activities"`
	AverageSessionDuration float64                `json:"average_session_duration_minutes"`
}

// ImpersonationUserStats 按用户统计
type ImpersonationUserStats struct {
	UserID       int    `json:"user_id"`
	Username     string `json:"username"`
	SessionCount int    `json:"session_count"`
	LastSession  *time.Time `json:"last_session,omitempty"`
}

// ImpersonationEnterpriseStats 按企业统计
type ImpersonationEnterpriseStats struct {
	EnterpriseID   int    `json:"enterprise_id"`
	EnterpriseName string `json:"enterprise_name"`
	SessionCount   int    `json:"session_count"`
	LastAccess     *time.Time `json:"last_access,omitempty"`
}

// ToSessionRecord 转换为会话记录
func (ctx *ImpersonationContext) ToSessionRecord() *ImpersonationSession {
	status := "active"
	if time.Now().After(ctx.ExpiresAt) {
		status = "expired"
	}

	return &ImpersonationSession{
		SessionID:      ctx.SessionID,
		UserID:         ctx.OriginalUserID,
		Username:       ctx.OriginalUsername,
		EnterpriseID:   ctx.EnterpriseID,
		EnterpriseName: ctx.EnterpriseName,
		EnterpriseCode: ctx.EnterpriseCode,
		Reason:         ctx.Reason,
		StartedAt:      ctx.StartedAt,
		ExpiresAt:      ctx.ExpiresAt,
		IPAddress:      ctx.IPAddress,
		Status:         status,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

// IsActive 检查会话是否活跃
func (s *ImpersonationSession) IsActive() bool {
	return s.Status == "active" && time.Now().Before(s.ExpiresAt)
}

// IsExpired 检查会话是否过期
func (s *ImpersonationSession) IsExpired() bool {
	return s.Status == "expired" || time.Now().After(s.ExpiresAt)
}

// Duration 计算会话持续时间
func (s *ImpersonationSession) Duration() time.Duration {
	end := time.Now()
	if s.EndedAt != nil {
		end = *s.EndedAt
	}
	return end.Sub(s.StartedAt)
}