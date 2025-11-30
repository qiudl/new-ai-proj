package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"ai-project-backend/models"
	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// MCPAPIKeyAuthConfig MCP API Key 认证中间件配置
type MCPAPIKeyAuthConfig struct {
	APIKeyService *services.MCPAPIKeyService

	// 认证头
	APIKeyHeader        string // 默认: X-API-Key
	AuthorizationHeader string // 默认: Authorization

	// 是否记录调用日志
	EnableLogging bool

	// 错误消息
	UnauthorizedMessage string
	ExpiredMessage      string
	RevokedMessage      string
}

// MCPAPIKeyAuthMiddleware MCP API Key 认证中间件
type MCPAPIKeyAuthMiddleware struct {
	config *MCPAPIKeyAuthConfig
}

// NewMCPAPIKeyAuthMiddleware 创建 MCP API Key 认证中间件
func NewMCPAPIKeyAuthMiddleware(config *MCPAPIKeyAuthConfig) *MCPAPIKeyAuthMiddleware {
	// 设置默认值
	if config.APIKeyHeader == "" {
		config.APIKeyHeader = "X-API-Key"
	}
	if config.AuthorizationHeader == "" {
		config.AuthorizationHeader = "Authorization"
	}
	if config.UnauthorizedMessage == "" {
		config.UnauthorizedMessage = "Invalid or missing API key"
	}
	if config.ExpiredMessage == "" {
		config.ExpiredMessage = "API key has expired"
	}
	if config.RevokedMessage == "" {
		config.RevokedMessage = "API key has been revoked"
	}

	return &MCPAPIKeyAuthMiddleware{
		config: config,
	}
}

// Middleware 返回 Gin 中间件函数
func (m *MCPAPIKeyAuthMiddleware) Middleware() gin.HandlerFunc {
	return m.authenticate
}

// authenticate 执行认证逻辑
func (m *MCPAPIKeyAuthMiddleware) authenticate(c *gin.Context) {
	startTime := time.Now()
	requestID := uuid.New().String()

	// 设置请求 ID
	c.Set("mcp_request_id", requestID)

	log.Printf("[MCP_AUTH] Processing request: %s %s, request_id=%s", c.Request.Method, c.Request.URL.Path, requestID)

	// 1. 提取 API Key
	apiKey, err := m.extractAPIKey(c.Request)
	if err != nil || apiKey == "" {
		log.Printf("[MCP_AUTH] API Key extraction failed: %v", err)
		m.respondWithError(c, http.StatusUnauthorized, m.config.UnauthorizedMessage, "missing_api_key")
		return
	}

	// 2. 验证 API Key
	keyRecord, err := m.config.APIKeyService.ValidateAPIKey(c.Request.Context(), apiKey)
	if err != nil {
		log.Printf("[MCP_AUTH] API Key validation failed: %v", err)
		m.handleValidationError(c, err)
		return
	}

	// 3. 更新最后使用时间（异步）
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := m.config.APIKeyService.UpdateLastUsed(ctx, keyRecord.ID); err != nil {
			log.Printf("[MCP_AUTH] Failed to update last used: %v", err)
		}
	}()

	// 4. 设置上下文信息（供后续处理使用）
	m.setContextValues(c, keyRecord, requestID, startTime)

	log.Printf("[MCP_AUTH] Authentication successful: key_id=%s, user_id=%d", keyRecord.KeyID, keyRecord.UserID)

	// 5. 继续处理请求
	c.Next()

	// 6. 请求完成后记录日志（如果启用）
	if m.config.EnableLogging {
		go m.logAPICall(c, keyRecord, requestID, startTime)
	}
}

// extractAPIKey 从请求中提取 API Key
func (m *MCPAPIKeyAuthMiddleware) extractAPIKey(r *http.Request) (string, error) {
	// 尝试 X-API-Key 头
	if apiKey := r.Header.Get(m.config.APIKeyHeader); apiKey != "" {
		return apiKey, nil
	}

	// 尝试 Authorization 头（Bearer 格式）
	if auth := r.Header.Get(m.config.AuthorizationHeader); auth != "" {
		// 支持 "Bearer aiproj_pk_xxx" 格式
		if strings.HasPrefix(auth, "Bearer ") {
			token := strings.TrimPrefix(auth, "Bearer ")
			// 检查是否是 MCP API Key（以 aiproj_pk_ 开头）
			if strings.HasPrefix(token, services.APIKeyPrefix) {
				return token, nil
			}
		}
		// 支持 "ApiKey aiproj_pk_xxx" 格式
		if strings.HasPrefix(auth, "ApiKey ") {
			return strings.TrimPrefix(auth, "ApiKey "), nil
		}
	}

	// 尝试 URL 参数（用于 SSE 连接）
	if apiKey := r.URL.Query().Get("api_key"); apiKey != "" {
		return apiKey, nil
	}

	return "", nil
}

// handleValidationError 处理验证错误
func (m *MCPAPIKeyAuthMiddleware) handleValidationError(c *gin.Context, err error) {
	switch err {
	case services.ErrAPIKeyNotFound:
		m.respondWithError(c, http.StatusUnauthorized, m.config.UnauthorizedMessage, "invalid_api_key")
	case services.ErrAPIKeyRevoked:
		m.respondWithError(c, http.StatusUnauthorized, m.config.RevokedMessage, "revoked_api_key")
	case services.ErrAPIKeyExpired:
		m.respondWithError(c, http.StatusUnauthorized, m.config.ExpiredMessage, "expired_api_key")
	case services.ErrAPIKeyInactive:
		m.respondWithError(c, http.StatusUnauthorized, "API key is not active", "inactive_api_key")
	default:
		m.respondWithError(c, http.StatusUnauthorized, m.config.UnauthorizedMessage, "validation_failed")
	}
}

// setContextValues 设置上下文信息
func (m *MCPAPIKeyAuthMiddleware) setContextValues(c *gin.Context, keyRecord *models.MCPAPIKey, requestID string, startTime time.Time) {
	// MCP API Key 相关
	c.Set("mcp_api_key_id", keyRecord.ID)
	c.Set("mcp_api_key_key_id", keyRecord.KeyID)
	c.Set("mcp_api_key", keyRecord)

	// 用户信息（API Key 绑定的用户，权限继承）
	c.Set("user_id", keyRecord.UserID)
	c.Set("auth_type", "mcp_api_key")

	// 企业信息（如有）
	if keyRecord.EnterpriseID != nil {
		c.Set("enterprise_id", *keyRecord.EnterpriseID)
	}

	// 预加载的用户对象（如有）
	if keyRecord.User != nil {
		c.Set("username", keyRecord.User.Username)
		c.Set("user_role", keyRecord.User.Role)
		c.Set("user_type", keyRecord.User.UserType)
		c.Set("current_user_role", keyRecord.User.Role)
		c.Set("current_user_type", keyRecord.User.UserType)
	}

	// 请求追踪
	c.Set("mcp_request_start_time", startTime)
}

// logAPICall 记录 API 调用日志
func (m *MCPAPIKeyAuthMiddleware) logAPICall(c *gin.Context, keyRecord *models.MCPAPIKey, requestID string, startTime time.Time) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	duration := time.Since(startTime)
	statusCode := c.Writer.Status()

	// 确定响应状态
	responseStatus := models.MCPAPIKeyLogStatusSuccess
	var responseError *string
	if statusCode >= 400 {
		responseStatus = models.MCPAPIKeyLogStatusError
		errMsg := "HTTP " + http.StatusText(statusCode)
		responseError = &errMsg
	}

	// 获取工具名称（从路径或上下文中提取）
	toolName := c.GetString("mcp_tool_name")
	if toolName == "" {
		toolName = "unknown"
	}

	// 获取客户端信息
	clientIP := c.ClientIP()
	userAgent := c.Request.UserAgent()
	if len(userAgent) > 512 {
		userAgent = userAgent[:512]
	}

	logEntry := &models.MCPAPIKeyLog{
		APIKeyID:       keyRecord.ID,
		UserID:         keyRecord.UserID,
		RequestID:      requestID,
		ToolName:       toolName,
		ResponseStatus: responseStatus,
		ResponseError:  responseError,
		DurationMs:     int(duration.Milliseconds()),
		ClientIP:       &clientIP,
		UserAgent:      &userAgent,
		CreatedAt:      time.Now(),
	}

	// 增加请求计数
	isError := statusCode >= 400
	go func() {
		ctxInc, cancelInc := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancelInc()
		if err := m.config.APIKeyService.IncrementRequestCount(ctxInc, keyRecord.ID, isError); err != nil {
			log.Printf("[MCP_AUTH] Failed to increment request count: %v", err)
		}
	}()

	// 保存日志
	if err := m.config.APIKeyService.LogAPIKeyCall(ctx, logEntry); err != nil {
		log.Printf("[MCP_AUTH] Failed to log API call: %v", err)
	}
}

// respondWithError 返回错误响应
func (m *MCPAPIKeyAuthMiddleware) respondWithError(c *gin.Context, statusCode int, message string, errorCode string) {
	c.JSON(statusCode, gin.H{
		"jsonrpc": "2.0",
		"error": gin.H{
			"code":    -32001,
			"message": message,
			"data": gin.H{
				"error_code": errorCode,
			},
		},
		"id": nil,
	})
	c.Abort()
}

// MCPAPIKeyAuth 创建 MCP API Key 认证中间件（便捷函数）
func MCPAPIKeyAuth(apiKeyService *services.MCPAPIKeyService, enableLogging bool) gin.HandlerFunc {
	config := &MCPAPIKeyAuthConfig{
		APIKeyService: apiKeyService,
		EnableLogging: enableLogging,
	}
	middleware := NewMCPAPIKeyAuthMiddleware(config)
	return middleware.Middleware()
}

// MCPSetToolName 设置当前请求的工具名称（用于日志记录）
func MCPSetToolName(toolName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("mcp_tool_name", toolName)
		c.Next()
	}
}

// GetMCPAPIKeyFromContext 从上下文中获取 MCP API Key
func GetMCPAPIKeyFromContext(c *gin.Context) (*models.MCPAPIKey, bool) {
	val, exists := c.Get("mcp_api_key")
	if !exists {
		return nil, false
	}
	key, ok := val.(*models.MCPAPIKey)
	return key, ok
}

// GetMCPRequestID 从上下文中获取请求 ID
func GetMCPRequestID(c *gin.Context) string {
	return c.GetString("mcp_request_id")
}

// IsMCPAPIKeyAuth 检查当前请求是否通过 MCP API Key 认证
func IsMCPAPIKeyAuth(c *gin.Context) bool {
	authType := c.GetString("auth_type")
	return authType == "mcp_api_key"
}

// ========== Test Helper Methods ==========
// These methods are exported for testing purposes

// ExtractAPIKeyForTest extracts API key (exported for testing)
func (m *MCPAPIKeyAuthMiddleware) ExtractAPIKeyForTest(r *http.Request) (string, error) {
	return m.extractAPIKey(r)
}

// HandleValidationErrorForTest handles validation error (exported for testing)
func (m *MCPAPIKeyAuthMiddleware) HandleValidationErrorForTest(c *gin.Context, err error) {
	m.handleValidationError(c, err)
}

// SetContextValuesForTest sets context values (exported for testing)
func (m *MCPAPIKeyAuthMiddleware) SetContextValuesForTest(c *gin.Context, keyRecord *models.MCPAPIKey, requestID string, startTime time.Time) {
	m.setContextValues(c, keyRecord, requestID, startTime)
}
