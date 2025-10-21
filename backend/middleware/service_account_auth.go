package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// ServiceAccountAuthMiddleware API Key认证中间件（用于服务账号）
// 用于MCP等外部服务访问，基于service_api_keys表
func ServiceAccountAuthMiddleware(db database.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[SERVICE_ACCOUNT_AUTH] Processing request: %s %s", c.Request.Method, c.Request.URL.Path)

		// 获取X-API-Key header
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			log.Printf("[SERVICE_ACCOUNT_AUTH] Missing X-API-Key header")
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"Missing API key",
				"X-API-Key header is required",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// 从API Key中提取前缀（用于快速查找）
		prefix := extractServiceAPIKeyPrefix(apiKey)
		log.Printf("[SERVICE_ACCOUNT_AUTH] Extracted prefix: %s", prefix)

		// 验证API Key并获取用户信息
		user, err := validateServiceAPIKeyAndGetUser(db, apiKey, prefix)
		if err != nil {
			log.Printf("[SERVICE_ACCOUNT_AUTH] API Key validation failed: %v", err)
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"Invalid API key",
				err.Error(),
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// 验证用户类型为system（服务账号）
		if user.UserType != "system" {
			log.Printf("[SERVICE_ACCOUNT_AUTH] User is not a service account: %s (type: %s)", user.Username, user.UserType)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"Access denied",
				"API Key is not associated with a service account",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		// 设置用户信息到上下文（与JWT认证中间件保持一致）
		c.Set("user_id", user.ID)
		c.Set("username", user.Username)
		c.Set("user_role", user.Role)
		c.Set("current_user_role", user.Role)
		c.Set("user_type", user.UserType)
		c.Set("current_user_type", user.UserType)
		c.Set("auth_method", "service_api_key") // 标记认证方式

		log.Printf("[SERVICE_ACCOUNT_AUTH] Authentication successful: user_id=%d, username=%s, role=%s, type=%s",
			user.ID, user.Username, user.Role, user.UserType)

		// 更新API Key最后使用时间（异步）
		go updateServiceAPIKeyLastUsed(db, apiKey)

		c.Next()
	}
}

// extractServiceAPIKeyPrefix 从API Key中提取前缀
// 支持格式: mcpsk_prod_<hash> -> mcpskprod
func extractServiceAPIKeyPrefix(apiKey string) string {
	// 移除分隔符并取前缀
	parts := strings.Split(apiKey, "_")
	if len(parts) >= 2 {
		// mcpsk_prod_xxx -> mcpskprod
		prefix := strings.Join(parts[:len(parts)-1], "")
		if len(prefix) > 20 {
			prefix = prefix[:20]
		}
		return prefix
	}

	// 纯hash，取前8个字符
	if len(apiKey) >= 8 {
		return apiKey[:8]
	}

	return apiKey
}

// validateServiceAPIKeyAndGetUser 验证服务账号API Key并返回关联的用户
func validateServiceAPIKeyAndGetUser(db database.DB, apiKey, prefix string) (*models.User, error) {
	// 优先从环境变量验证（开发环境）
	envKey := os.Getenv("MCP_SERVICE_API_KEY")
	envUsername := os.Getenv("MCP_SERVICE_USERNAME")
	if envKey != "" && apiKey == envKey && envUsername != "" {
		log.Printf("[SERVICE_ACCOUNT_AUTH] Using environment variable API key for user: %s", envUsername)
		user, err := db.Users().GetByUsername(nil, envUsername)
		if err != nil {
			return nil, err
		}
		return user, nil
	}

	// 计算API Key的SHA256哈希值
	hash := sha256.Sum256([]byte(apiKey))
	apiKeyHash := hex.EncodeToString(hash[:])

	// 从数据库验证API Key并获取用户信息
	query := `
		SELECT u.id, u.username, u.email, u.role, u.user_type, u.status
		FROM service_api_keys sak
		JOIN users u ON sak.user_id = u.id
		WHERE sak.api_key_hash = $1
		  AND sak.api_key_prefix = $2
		  AND sak.is_active = TRUE
		  AND (sak.expires_at IS NULL OR sak.expires_at > NOW())
		  AND u.status = 'active'
		LIMIT 1
	`

	var user models.User
	err := db.QueryRow(query, apiKeyHash, prefix).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Role,
		&user.UserType,
		&user.Status,
	)

	if err != nil {
		log.Printf("[SERVICE_ACCOUNT_AUTH] Database query error: %v", err)
		return nil, err
	}

	return &user, nil
}

// updateServiceAPIKeyLastUsed 更新API Key的最后使用时间
func updateServiceAPIKeyLastUsed(db database.DB, apiKey string) {
	hash := sha256.Sum256([]byte(apiKey))
	apiKeyHash := hex.EncodeToString(hash[:])

	query := `
		UPDATE service_api_keys
		SET last_used_at = NOW()
		WHERE api_key_hash = $1
	`

	_, err := db.Exec(query, apiKeyHash)
	if err != nil {
		log.Printf("[SERVICE_ACCOUNT_AUTH] Failed to update last_used_at: %v", err)
	}
}

// ServiceAccountOrJWTAuthMiddleware 支持服务账号API Key或JWT两种认证方式的组合中间件
// 优先检查API Key，如果没有则回退到JWT认证
func ServiceAccountOrJWTAuthMiddleware(db database.DB, jwtMiddleware gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查是否有X-API-Key header
		if apiKey := c.GetHeader("X-API-Key"); apiKey != "" {
			log.Printf("[SERVICE_ACCOUNT_OR_JWT] Using service account API Key authentication")
			// 使用服务账号API Key认证
			ServiceAccountAuthMiddleware(db)(c)
			return
		}

		// 回退到JWT认证
		log.Printf("[SERVICE_ACCOUNT_OR_JWT] Falling back to JWT authentication")
		jwtMiddleware(c)
	}
}
