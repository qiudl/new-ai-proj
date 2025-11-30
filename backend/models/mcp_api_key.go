package models

import (
	"time"
)

// MCPAPIKey MCP API Key 模型
type MCPAPIKey struct {
	ID           int        `json:"id" gorm:"primaryKey;autoIncrement"`
	KeyID        string     `json:"key_id" gorm:"column:key_id;type:varchar(32);not null;uniqueIndex"`
	KeyHash      string     `json:"-" gorm:"column:key_hash;type:varchar(64);not null;uniqueIndex"` // 不输出到JSON
	KeyPrefix    string     `json:"key_prefix" gorm:"column:key_prefix;type:varchar(24);not null"`
	UserID       int        `json:"user_id" gorm:"column:user_id;not null;index"`
	EnterpriseID *int       `json:"enterprise_id,omitempty" gorm:"column:enterprise_id;index"`
	Name         string     `json:"name" gorm:"column:name;type:varchar(128);not null"`
	Description  *string    `json:"description,omitempty" gorm:"column:description;type:text"`
	Status       string     `json:"status" gorm:"column:status;type:varchar(20);not null;default:'active';index"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty" gorm:"column:expires_at"`
	LastUsedAt   *time.Time `json:"last_used_at,omitempty" gorm:"column:last_used_at"`
	TotalRequests int64     `json:"total_requests" gorm:"column:total_requests;not null;default:0"`
	TotalErrors   int64     `json:"total_errors" gorm:"column:total_errors;not null;default:0"`
	CreatedAt    time.Time  `json:"created_at" gorm:"column:created_at;not null;default:now()"`
	UpdatedAt    time.Time  `json:"updated_at" gorm:"column:updated_at;not null;default:now()"`
	RevokedAt    *time.Time `json:"revoked_at,omitempty" gorm:"column:revoked_at"`
	RevokedBy    *int       `json:"revoked_by,omitempty" gorm:"column:revoked_by"`

	// 关联
	User       *User       `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Enterprise *Enterprise `json:"enterprise,omitempty" gorm:"foreignKey:EnterpriseID"`
	RevokedByUser *User    `json:"revoked_by_user,omitempty" gorm:"foreignKey:RevokedBy"`
}

// TableName 指定表名
func (MCPAPIKey) TableName() string {
	return "mcp_api_keys"
}

// IsActive 检查 Key 是否活跃
func (k *MCPAPIKey) IsActive() bool {
	if k.Status != "active" {
		return false
	}
	if k.ExpiresAt != nil && k.ExpiresAt.Before(time.Now()) {
		return false
	}
	return true
}

// IsExpired 检查 Key 是否已过期
func (k *MCPAPIKey) IsExpired() bool {
	return k.ExpiresAt != nil && k.ExpiresAt.Before(time.Now())
}

// MCPAPIKeyStatus API Key 状态常量
const (
	MCPAPIKeyStatusActive  = "active"
	MCPAPIKeyStatusRevoked = "revoked"
	MCPAPIKeyStatusExpired = "expired"
)

// MCPAPIKeyLog MCP API Key 调用日志模型
type MCPAPIKeyLog struct {
	ID             int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	APIKeyID       int        `json:"api_key_id" gorm:"column:api_key_id;not null;index"`
	UserID         int        `json:"user_id" gorm:"column:user_id;not null;index"`
	RequestID      string     `json:"request_id" gorm:"column:request_id;type:varchar(36);not null"`
	ToolName       string     `json:"tool_name" gorm:"column:tool_name;type:varchar(64);not null;index"`
	ToolArguments  *string    `json:"tool_arguments,omitempty" gorm:"column:tool_arguments;type:jsonb"`
	ResponseStatus string     `json:"response_status" gorm:"column:response_status;type:varchar(20);not null;index"`
	ResponseError  *string    `json:"response_error,omitempty" gorm:"column:response_error;type:text"`
	DurationMs     int        `json:"duration_ms" gorm:"column:duration_ms;not null;default:0"`
	ClientIP       *string    `json:"client_ip,omitempty" gorm:"column:client_ip;type:inet"`
	UserAgent      *string    `json:"user_agent,omitempty" gorm:"column:user_agent;type:varchar(512)"`
	CreatedAt      time.Time  `json:"created_at" gorm:"column:created_at;not null;default:now();index"`

	// 关联
	APIKey *MCPAPIKey `json:"api_key,omitempty" gorm:"foreignKey:APIKeyID"`
}

// TableName 指定表名
func (MCPAPIKeyLog) TableName() string {
	return "mcp_api_key_logs"
}

// MCPAPIKeyLogStatus 日志响应状态常量
const (
	MCPAPIKeyLogStatusSuccess = "success"
	MCPAPIKeyLogStatusError   = "error"
	MCPAPIKeyLogStatusTimeout = "timeout"
)

// MCPSSESession MCP SSE 连接会话模型
type MCPSSESession struct {
	ID              int        `json:"id" gorm:"primaryKey;autoIncrement"`
	APIKeyID        int        `json:"api_key_id" gorm:"column:api_key_id;not null;index"`
	UserID          int        `json:"user_id" gorm:"column:user_id;not null;index"`
	SessionID       string     `json:"session_id" gorm:"column:session_id;type:varchar(36);not null;uniqueIndex"`
	ClientIP        *string    `json:"client_ip,omitempty" gorm:"column:client_ip;type:inet"`
	UserAgent       *string    `json:"user_agent,omitempty" gorm:"column:user_agent;type:varchar(512)"`
	Status          string     `json:"status" gorm:"column:status;type:varchar(20);not null;default:'active';index"`
	ConnectedAt     time.Time  `json:"connected_at" gorm:"column:connected_at;not null;default:now()"`
	DisconnectedAt  *time.Time `json:"disconnected_at,omitempty" gorm:"column:disconnected_at"`
	LastActivity    time.Time  `json:"last_activity" gorm:"column:last_activity;not null;default:now()"`
	MessagesSent    int        `json:"messages_sent" gorm:"column:messages_sent;not null;default:0"`
	MessagesReceived int       `json:"messages_received" gorm:"column:messages_received;not null;default:0"`

	// 关联
	APIKey *MCPAPIKey `json:"api_key,omitempty" gorm:"foreignKey:APIKeyID"`
}

// TableName 指定表名
func (MCPSSESession) TableName() string {
	return "mcp_sse_sessions"
}

// MCPSSESessionStatus 会话状态常量
const (
	MCPSSESessionStatusActive = "active"
	MCPSSESessionStatusClosed = "closed"
)

// ========== 请求/响应结构体 ==========

// CreateMCPAPIKeyRequest 创建 API Key 请求
type CreateMCPAPIKeyRequest struct {
	Name        string     `json:"name" binding:"required,max=128"`
	Description *string    `json:"description,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

// CreateMCPAPIKeyResponse 创建 API Key 响应
type CreateMCPAPIKeyResponse struct {
	ID        int        `json:"id"`
	KeyID     string     `json:"key_id"`
	PlainKey  string     `json:"plain_key"` // 明文 Key，仅在创建时返回一次
	Name      string     `json:"name"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// UpdateMCPAPIKeyRequest 更新 API Key 请求
type UpdateMCPAPIKeyRequest struct {
	Name        *string    `json:"name,omitempty" binding:"omitempty,max=128"`
	Description *string    `json:"description,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

// ListMCPAPIKeysRequest 列出 API Keys 请求
type ListMCPAPIKeysRequest struct {
	Page           int    `form:"page,default=1" binding:"omitempty,min=1"`
	Limit          int    `form:"limit,default=20" binding:"omitempty,min=1,max=100"`
	IncludeRevoked bool   `form:"include_revoked,default=false"`
	Status         string `form:"status,omitempty"`
	All            bool   `form:"all,default=false"`  // 管理员查看所有用户的 Keys
	UserID         int    `form:"user_id,omitempty"`  // 按用户 ID 过滤（仅管理员可用）
}

// ListMCPAPIKeysResponse 列出 API Keys 响应
type ListMCPAPIKeysResponse struct {
	Keys  []MCPAPIKey `json:"keys"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

// MCPAPIKeyStats API Key 使用统计
type MCPAPIKeyStats struct {
	TotalRequests  int64                   `json:"total_requests"`
	TotalErrors    int64                   `json:"total_errors"`
	SuccessRate    float64                 `json:"success_rate"`
	AvgDurationMs  float64                 `json:"avg_duration_ms"`
	ToolsUsage     []MCPToolUsageStat      `json:"tools_usage"`
	DailyRequests  []MCPDailyRequestStat   `json:"daily_requests"`
}

// MCPToolUsageStat 工具使用统计
type MCPToolUsageStat struct {
	ToolName string `json:"tool"`
	Count    int64  `json:"count"`
}

// MCPDailyRequestStat 每日请求统计
type MCPDailyRequestStat struct {
	Date     string `json:"date"`
	Requests int64  `json:"requests"`
	Errors   int64  `json:"errors"`
}

// ListMCPAPIKeyLogsRequest 列出调用日志请求
type ListMCPAPIKeyLogsRequest struct {
	Page     int    `form:"page,default=1" binding:"omitempty,min=1"`
	Limit    int    `form:"limit,default=50" binding:"omitempty,min=1,max=100"`
	ToolName string `form:"tool,omitempty"`
	Status   string `form:"status,omitempty"`
}

// ListMCPAPIKeyLogsResponse 列出调用日志响应
type ListMCPAPIKeyLogsResponse struct {
	Logs  []MCPAPIKeyLog `json:"logs"`
	Total int64          `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}
