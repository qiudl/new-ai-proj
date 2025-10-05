package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// AIProvider 定义AI服务提供商类型
type AIProvider string

const (
	ProviderOpenAI   AIProvider = "openai"
	ProviderClaude   AIProvider = "claude"
	ProviderDeepSeek AIProvider = "deepseek"
)

// AIConfigMetadata 存储额外的配置元数据
type AIConfigMetadata struct {
	Features       []string               `json:"features,omitempty"`        // 支持的功能
	RateLimit      *RateLimitConfig       `json:"rate_limit,omitempty"`      // 速率限制
	CustomHeaders  map[string]string      `json:"custom_headers,omitempty"`  // 自定义请求头
	Timeout        int                    `json:"timeout,omitempty"`         // 超时时间(秒)
	RetryConfig    *RetryConfig           `json:"retry_config,omitempty"`    // 重试配置
	CostTracking   *CostTrackingConfig    `json:"cost_tracking,omitempty"`   // 成本跟踪
	SecurityConfig *SecurityConfig        `json:"security_config,omitempty"` // 安全配置
	Extra          map[string]interface{} `json:"extra,omitempty"`           // 其他配置
}

// RateLimitConfig 速率限制配置
type RateLimitConfig struct {
	RequestsPerMinute int `json:"requests_per_minute"`
	TokensPerMinute   int `json:"tokens_per_minute"`
	RequestsPerDay    int `json:"requests_per_day"`
}

// RetryConfig 重试配置
type RetryConfig struct {
	MaxRetries      int     `json:"max_retries"`
	BackoffMs       int     `json:"backoff_ms"`
	ExponentialBase float64 `json:"exponential_base"`
}

// CostTrackingConfig 成本跟踪配置
type CostTrackingConfig struct {
	InputTokenCost  float64 `json:"input_token_cost"`  // 每1K输入token成本
	OutputTokenCost float64 `json:"output_token_cost"` // 每1K输出token成本
	Currency        string  `json:"currency"`          // 货币单位
	MonthlyBudget   float64 `json:"monthly_budget"`    // 月度预算
}

// SecurityConfig 安全配置
type SecurityConfig struct {
	AllowedIPs        []string `json:"allowed_ips,omitempty"` // 允许的IP地址
	RequireHTTPS      bool     `json:"require_https"`         // 要求HTTPS
	LogRequests       bool     `json:"log_requests"`          // 记录请求日志
	SanitizeResponses bool     `json:"sanitize_responses"`    // 清理响应内容
}

// Scan 实现database/sql Scanner接口
func (m *AIConfigMetadata) Scan(value interface{}) error {
	if value == nil {
		*m = AIConfigMetadata{}
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, m)
	case string:
		return json.Unmarshal([]byte(v), m)
	default:
		return errors.New("cannot scan AIConfigMetadata")
	}
}

// Value 实现database/sql/driver Valuer接口
func (m AIConfigMetadata) Value() (driver.Value, error) {
	// 检查是否为空结构体
	if m.Features == nil && m.RateLimit == nil && m.CustomHeaders == nil &&
		m.RetryConfig == nil && m.CostTracking == nil && m.SecurityConfig == nil &&
		m.Extra == nil && m.Timeout == 0 {
		return nil, nil
	}
	return json.Marshal(m)
}

// AIConfig AI配置数据模型
type AIConfig struct {
	ID                    int              `json:"id" db:"id"`
	Provider              AIProvider       `json:"provider" db:"provider" binding:"required" validate:"required,oneof=openai claude deepseek"`
	APIKeyEncrypted       string           `json:"-" db:"api_key_encrypted"`     // 加密的API密钥，不返回给前端
	APIKeyHash            string           `json:"-" db:"api_key_hash"`          // API密钥哈希值，不返回给前端
	APIKeyMasked          string           `json:"api_key_masked" db:"-"`        // 脱敏显示的API密钥
	Model                 string           `json:"model" db:"model" binding:"required" validate:"required"`
	BaseURL               *string          `json:"base_url" db:"base_url"`
	Temperature           float64          `json:"temperature" db:"temperature" validate:"min=0,max=2"`
	MaxTokens             int              `json:"max_tokens" db:"max_tokens" validate:"min=1,max=32000"`
	Enabled               bool             `json:"enabled" db:"enabled"`
	Metadata              AIConfigMetadata `json:"metadata" db:"metadata"`
	CreatedBy             int              `json:"created_by" db:"created_by"`
	UpdatedBy             int              `json:"updated_by" db:"updated_by"`
	CreatedAt             time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time        `json:"updated_at" db:"updated_at"`
	LastTestedAt          *time.Time       `json:"last_tested_at" db:"last_tested_at"`
	TestSuccessCount      int              `json:"test_success_count" db:"test_success_count"`
	TestFailureCount      int              `json:"test_failure_count" db:"test_failure_count"`
	// API密钥轮换和过期管理字段
	APIKeyExpiresAt       *time.Time       `json:"api_key_expires_at" db:"api_key_expires_at"`
	APIKeyCreatedAt       *time.Time       `json:"api_key_created_at" db:"api_key_created_at"`
	APIKeyRotatedAt       *time.Time       `json:"api_key_rotated_at" db:"api_key_rotated_at"`
	APIKeyRotationCount   int              `json:"api_key_rotation_count" db:"api_key_rotation_count"`
	APIKeyVersion         int              `json:"api_key_version" db:"api_key_version"`
	ExpiryWarningSent     bool             `json:"expiry_warning_sent" db:"expiry_warning_sent"`
	AutoRotate            bool             `json:"auto_rotate" db:"auto_rotate"`
	RotationIntervalDays  int              `json:"rotation_interval_days" db:"rotation_interval_days"`
}

// AIConfigRequest 创建/更新AI配置的请求模型
type AIConfigRequest struct {
	Provider    AIProvider       `json:"provider" binding:"required" validate:"required,oneof=openai claude deepseek"`
	APIKey      string           `json:"api_key" binding:"required" validate:"required,min=10"`
	Model       string           `json:"model" binding:"required" validate:"required"`
	BaseURL     *string          `json:"base_url"`
	Temperature float64          `json:"temperature" validate:"min=0,max=2"`
	MaxTokens   int              `json:"max_tokens" validate:"min=1,max=32000"`
	Enabled     bool             `json:"enabled"`
	Metadata    AIConfigMetadata `json:"metadata"`
}

// AIConfigUpdateRequest 更新AI配置的请求模型 (provider可选，从URL获取)
type AIConfigUpdateRequest struct {
	Provider    AIProvider       `json:"provider,omitempty" validate:"omitempty,oneof=openai claude deepseek"`
	APIKey      string           `json:"api_key" validate:"omitempty,min=10"` // 可选，为空时保持现有密钥
	Model       string           `json:"model" binding:"required" validate:"required"`
	BaseURL     *string          `json:"base_url"`
	Temperature float64          `json:"temperature" validate:"min=0,max=2"`
	MaxTokens   int              `json:"max_tokens" validate:"min=1,max=32000"`
	Enabled     bool             `json:"enabled"`
	Metadata    AIConfigMetadata `json:"metadata"`
}

// AIConfigResponse 返回给前端的AI配置响应模型
type AIConfigResponse struct {
	ID                   int              `json:"id"`
	Provider             AIProvider       `json:"provider"`
	APIKeyMasked         string           `json:"api_key_masked"` // 脱敏后的API密钥
	Model                string           `json:"model"`
	BaseURL              *string          `json:"base_url"`
	Temperature          float64          `json:"temperature"`
	MaxTokens            int              `json:"max_tokens"`
	Enabled              bool             `json:"enabled"`
	Metadata             AIConfigMetadata `json:"metadata"`
	CreatedBy            int              `json:"created_by"`
	UpdatedBy            int              `json:"updated_by"`
	CreatedAt            time.Time        `json:"created_at"`
	UpdatedAt            time.Time        `json:"updated_at"`
	LastTestedAt         *time.Time       `json:"last_tested_at"`
	TestSuccessCount     int              `json:"test_success_count"`
	TestFailureCount     int              `json:"test_failure_count"`
	Status               string           `json:"status"`     // active, inactive, error
	LastError            string           `json:"last_error"` // 最后的错误信息
	// API密钥过期和轮换信息
	APIKeyExpiresAt      *time.Time       `json:"api_key_expires_at"`
	APIKeyCreatedAt      *time.Time       `json:"api_key_created_at"`
	APIKeyRotatedAt      *time.Time       `json:"api_key_rotated_at"`
	APIKeyRotationCount  int              `json:"api_key_rotation_count"`
	APIKeyVersion        int              `json:"api_key_version"`
	AutoRotate           bool             `json:"auto_rotate"`
	RotationIntervalDays int              `json:"rotation_interval_days"`
	ExpiryStatus         string           `json:"expiry_status"`       // never_expires, valid, expiring_later, expiring_soon, expired
	DaysUntilExpiry      *int             `json:"days_until_expiry"`   // 距离过期还有多少天
}

// AITestRequest AI连接测试请求
type AITestRequest struct {
	Provider AIProvider `json:"provider" binding:"required"`
	APIKey   string     `json:"api_key"` // 可选，如果为空则使用已保存的配置
	Model    string     `json:"model" binding:"required"`
	BaseURL  *string    `json:"base_url"`
	TestText string     `json:"test_text"` // 可选的测试文本
}

// AITestResponse AI连接测试响应
type AITestResponse struct {
	Success      bool                   `json:"success"`
	Message      string                 `json:"message"`
	ResponseTime int                    `json:"response_time"` // 毫秒
	ModelInfo    *AIModelInfo           `json:"model_info,omitempty"`
	Conversation *AITestConversation    `json:"conversation,omitempty"`
	Error        string                 `json:"error,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// AIModelInfo AI模型信息
type AIModelInfo struct {
	Name           string   `json:"name"`
	Version        string   `json:"version"`
	ContextLength  int      `json:"context_length,omitempty"`
	SupportedTasks []string `json:"supported_tasks,omitempty"`
	TokenLimit     int      `json:"token_limit,omitempty"`
}

// AITestConversation 测试对话
type AITestConversation struct {
	Question string             `json:"question"`
	Answer   string             `json:"answer"`
	Model    string             `json:"model"`
	Usage    *AIUsageStatistics `json:"usage,omitempty"`
}

// AIUsageStatistics AI使用统计
type AIUsageStatistics struct {
	PromptTokens     int     `json:"prompt_tokens"`
	CompletionTokens int     `json:"completion_tokens"`
	TotalTokens      int     `json:"total_tokens"`
	Cost             float64 `json:"cost,omitempty"`
}

// EncryptionKey 加密密钥模型
type EncryptionKey struct {
	ID        int       `json:"id" db:"id"`
	KeyName   string    `json:"key_name" db:"key_name"`
	KeyValue  string    `json:"-" db:"key_value"` // Base64编码的密钥，不返回给前端
	Algorithm string    `json:"algorithm" db:"algorithm"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	IsActive  bool      `json:"is_active" db:"is_active"`
}

// Validate 验证AI配置请求
func (req *AIConfigRequest) Validate() error {
	if req.Provider == "" {
		return errors.New("provider is required")
	}

	if req.APIKey == "" {
		return errors.New("api_key is required")
	}

	if req.Model == "" {
		return errors.New("model is required")
	}

	// 验证provider枚举值
	switch req.Provider {
	case ProviderOpenAI, ProviderClaude, ProviderDeepSeek:
		// 有效值
	default:
		return errors.New("invalid provider")
	}

	// 验证参数范围
	if req.Temperature < 0 || req.Temperature > 2 {
		return errors.New("temperature must be between 0 and 2")
	}

	if req.MaxTokens < 1 || req.MaxTokens > 32000 {
		return errors.New("max_tokens must be between 1 and 32000")
	}

	return nil
}

// ToAIConfigRequest 将更新请求转换为标准请求
func (req *AIConfigUpdateRequest) ToAIConfigRequest(provider AIProvider) *AIConfigRequest {
	return &AIConfigRequest{
		Provider:    provider,
		APIKey:      req.APIKey,
		Model:       req.Model,
		BaseURL:     req.BaseURL,
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
		Enabled:     req.Enabled,
		Metadata:    req.Metadata,
	}
}

// ValidateForUpdate 验证更新请求（API密钥可以为空）
func (req *AIConfigUpdateRequest) ValidateForUpdate() error {
	if req.Model == "" {
		return errors.New("model is required")
	}

	// API密钥可以为空（保持现有密钥），但如果提供则需要验证格式
	if req.APIKey != "" && len(req.APIKey) < 10 {
		return errors.New("api_key must be at least 10 characters if provided")
	}

	// 验证参数范围
	if req.Temperature < 0 || req.Temperature > 2 {
		return errors.New("temperature must be between 0 and 2")
	}

	if req.MaxTokens < 1 || req.MaxTokens > 32000 {
		return errors.New("max_tokens must be between 1 and 32000")
	}

	return nil
}

// ToResponse 将内部模型转换为响应模型
func (config *AIConfig) ToResponse(encryptionService interface{}) *AIConfigResponse {
	response := &AIConfigResponse{
		ID:                   config.ID,
		Provider:             config.Provider,
		APIKeyMasked:         config.APIKeyMasked,
		Model:                config.Model,
		BaseURL:              config.BaseURL,
		Temperature:          config.Temperature,
		MaxTokens:            config.MaxTokens,
		Enabled:              config.Enabled,
		Metadata:             config.Metadata,
		CreatedBy:            config.CreatedBy,
		UpdatedBy:            config.UpdatedBy,
		CreatedAt:            config.CreatedAt,
		UpdatedAt:            config.UpdatedAt,
		LastTestedAt:         config.LastTestedAt,
		TestSuccessCount:     config.TestSuccessCount,
		TestFailureCount:     config.TestFailureCount,
		APIKeyExpiresAt:      config.APIKeyExpiresAt,
		APIKeyCreatedAt:      config.APIKeyCreatedAt,
		APIKeyRotatedAt:      config.APIKeyRotatedAt,
		APIKeyRotationCount:  config.APIKeyRotationCount,
		APIKeyVersion:        config.APIKeyVersion,
		AutoRotate:           config.AutoRotate,
		RotationIntervalDays: config.RotationIntervalDays,
	}

	// 设置状态
	if !config.Enabled {
		response.Status = "inactive"
	} else if config.TestFailureCount > config.TestSuccessCount {
		response.Status = "error"
	} else {
		response.Status = "active"
	}

	// 计算过期状态
	response.ExpiryStatus, response.DaysUntilExpiry = config.CalculateExpiryStatus()

	return response
}

// CalculateExpiryStatus 计算密钥过期状态
func (config *AIConfig) CalculateExpiryStatus() (status string, daysUntilExpiry *int) {
	if config.APIKeyExpiresAt == nil {
		return "never_expires", nil
	}

	now := time.Now()
	expiresAt := *config.APIKeyExpiresAt
	daysRemaining := int(expiresAt.Sub(now).Hours() / 24)

	if expiresAt.Before(now) {
		return "expired", &daysRemaining
	} else if daysRemaining < 7 {
		return "expiring_soon", &daysRemaining
	} else if daysRemaining < 30 {
		return "expiring_later", &daysRemaining
	}

	return "valid", &daysRemaining
}

// IsExpired 检查密钥是否已过期
func (config *AIConfig) IsExpired() bool {
	if config.APIKeyExpiresAt == nil {
		return false
	}
	return config.APIKeyExpiresAt.Before(time.Now())
}

// ShouldWarn 检查是否应该发送过期警告 (7天内过期)
func (config *AIConfig) ShouldWarn() bool {
	if config.APIKeyExpiresAt == nil || config.ExpiryWarningSent {
		return false
	}
	daysUntilExpiry := int(config.APIKeyExpiresAt.Sub(time.Now()).Hours() / 24)
	return daysUntilExpiry > 0 && daysUntilExpiry <= 7
}

// DefaultMetadata 返回默认的元数据配置
func DefaultMetadata(provider AIProvider) AIConfigMetadata {
	metadata := AIConfigMetadata{
		Features: []string{"chat", "completion"},
		Timeout:  30,
		RetryConfig: &RetryConfig{
			MaxRetries:      3,
			BackoffMs:       1000,
			ExponentialBase: 2.0,
		},
		SecurityConfig: &SecurityConfig{
			RequireHTTPS:      true,
			LogRequests:       false,
			SanitizeResponses: true,
		},
	}

	switch provider {
	case ProviderOpenAI:
		metadata.RateLimit = &RateLimitConfig{
			RequestsPerMinute: 60,
			TokensPerMinute:   90000,
			RequestsPerDay:    1000,
		}
		metadata.CostTracking = &CostTrackingConfig{
			InputTokenCost:  0.001,
			OutputTokenCost: 0.002,
			Currency:        "USD",
		}
	case ProviderClaude:
		metadata.RateLimit = &RateLimitConfig{
			RequestsPerMinute: 50,
			TokensPerMinute:   40000,
			RequestsPerDay:    1000,
		}
		metadata.CostTracking = &CostTrackingConfig{
			InputTokenCost:  0.00025,
			OutputTokenCost: 0.00125,
			Currency:        "USD",
		}
	case ProviderDeepSeek:
		metadata.RateLimit = &RateLimitConfig{
			RequestsPerMinute: 60,
			TokensPerMinute:   60000,
			RequestsPerDay:    2000,
		}
		metadata.CostTracking = &CostTrackingConfig{
			InputTokenCost:  0.0001,
			OutputTokenCost: 0.0002,
			Currency:        "USD",
		}
	}

	return metadata
}

// AIConfigStats AI配置统计
type AIConfigStats struct {
	TotalConfigs   int `json:"total_configs" db:"total_configs"`
	EnabledConfigs int `json:"enabled_configs" db:"enabled_configs"`
	TestedConfigs  int `json:"tested_configs" db:"tested_configs"`
}

// AITestLog AI测试日志
type AITestLog struct {
	ID           int       `json:"id" db:"id"`
	ConfigID     int       `json:"config_id" db:"config_id"`
	Provider     string    `json:"provider" db:"provider"`
	Success      bool      `json:"success" db:"success"`
	ResponseTime int       `json:"response_time" db:"response_time_ms"`
	ErrorMessage string    `json:"error_message" db:"error_message"`
	TestedAt     time.Time `json:"tested_at" db:"tested_at"`
}

// AIUsageStats AI使用统计
type AIUsageStats struct {
	ID           int     `json:"id" db:"id"`
	ConfigID     int     `json:"config_id" db:"config_id"`
	Provider     string  `json:"provider" db:"provider"`
	UsageDate    string  `json:"usage_date" db:"usage_date"`
	RequestCount int     `json:"request_count" db:"request_count"`
	TokenCount   int     `json:"token_count" db:"token_count"`
	CostAmount   float64 `json:"cost_amount" db:"cost_amount"`
}

// AIConfigKeyHistory API密钥轮换历史记录
type AIConfigKeyHistory struct {
	ID             int        `json:"id" db:"id"`
	ConfigID       int        `json:"config_id" db:"config_id"`
	Provider       string     `json:"provider" db:"provider"`
	APIKeyHash     string     `json:"-" db:"api_key_hash"` // 不返回给前端
	APIKeyVersion  int        `json:"api_key_version" db:"api_key_version"`
	RotatedBy      *int       `json:"rotated_by" db:"rotated_by"`
	RotationReason *string    `json:"rotation_reason" db:"rotation_reason"`
	RotationType   string     `json:"rotation_type" db:"rotation_type"` // manual, auto, expired, compromised
	ValidFrom      time.Time  `json:"valid_from" db:"valid_from"`
	ValidUntil     *time.Time `json:"valid_until" db:"valid_until"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
}

// AIConfigExpiryNotification API密钥过期通知记录
type AIConfigExpiryNotification struct {
	ID               int        `json:"id" db:"id"`
	ConfigID         int        `json:"config_id" db:"config_id"`
	Provider         string     `json:"provider" db:"provider"`
	NotificationType string     `json:"notification_type" db:"notification_type"` // warning, expired, rotated
	NotificationTime time.Time  `json:"notification_time" db:"notification_time"`
	DaysUntilExpiry  *int       `json:"days_until_expiry" db:"days_until_expiry"`
	NotifiedUsers    []int      `json:"notified_users" db:"notified_users"`
	NotificationSent bool       `json:"notification_sent" db:"notification_sent"`
	NotificationError *string   `json:"notification_error" db:"notification_error"`
}

// RotateKeyRequest API密钥轮换请求
type RotateKeyRequest struct {
	NewAPIKey          string  `json:"new_api_key" binding:"required" validate:"required,min=10"`
	RotationReason     *string `json:"rotation_reason"`
	SetExpiryDays      *int    `json:"set_expiry_days"` // 设置新密钥的过期天数
	EnableAutoRotate   *bool   `json:"enable_auto_rotate"`
	RotationIntervalDays *int  `json:"rotation_interval_days"`
}

// APIKeyExpiryStatus API密钥过期状态
type APIKeyExpiryStatus struct {
	ConfigID        int        `json:"config_id"`
	Provider        string     `json:"provider"`
	ExpiryStatus    string     `json:"expiry_status"` // never_expires, valid, expiring_later, expiring_soon, expired
	DaysUntilExpiry *int       `json:"days_until_expiry"`
	ExpiresAt       *time.Time `json:"expires_at"`
	RotationCount   int        `json:"rotation_count"`
	LastRotatedAt   *time.Time `json:"last_rotated_at"`
}
