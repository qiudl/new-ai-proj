package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"database/sql"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware JWT认证中间件
func AuthMiddleware(jwtManager *utils.JWTManager, db database.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 调试日志
		log.Printf("[AUTH] Processing request: %s %s", c.Request.Method, c.Request.URL.Path)

		// 获取Authorization header
		authHeader := c.GetHeader("Authorization")
		log.Printf("[AUTH] Authorization header: %s", authHeader)
		if authHeader == "" {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"Missing authorization header",
				"Authorization header is required",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// 检查Bearer token格式
		if !strings.HasPrefix(authHeader, "Bearer ") {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"Invalid authorization format",
				"Authorization header must start with 'Bearer '",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// 提取token
		tokenString := authHeader[7:] // Remove "Bearer " prefix
		if tokenString == "" {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"Empty token",
				"Token cannot be empty",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// 验证token
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"Invalid token",
				err.Error(),
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// 将用户信息设置到上下文中，供后续中间件使用
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("user_role", claims.Role)         // 为 RoleBasedAccessMiddleware 使用
		c.Set("current_user_role", claims.Role) // 保持向后兼容
		c.Set("user_type", claims.UserType)
		c.Set("current_user_type", claims.UserType) // 为 SystemUserOnlyMiddleware 使用
		c.Set("token_claims", claims)

		// 企业数据隔离支持 - 为企业用户查询并设置enterprise_id
		if claims.UserType == "enterprise" && (claims.Role == "enterprise_admin" || claims.Role == "enterprise_user") {
			var enterpriseID int
			query := `SELECT enterprise_id FROM enterprise_users WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`
			err := db.QueryRow(query, claims.UserID).Scan(&enterpriseID)
			if err == nil {
				c.Set("enterprise_id", enterpriseID)
				log.Printf("[AUTH] Set enterprise_id=%d for user_id=%d", enterpriseID, claims.UserID)
			} else if err != sql.ErrNoRows {
				log.Printf("[AUTH] Warning: Failed to query enterprise_id for user_id=%d: %v", claims.UserID, err)
			}
		}

		// 兼容扩展的ExtendedClaims（包含模拟上下文）。若解析成功，则用其覆盖通用的 'claims'，以便后续中间件识别模拟状态
		if extClaims, err := jwtManager.ValidateTokenExtendedClaims(tokenString); err == nil && extClaims != nil {
			c.Set("claims", extClaims)
		} else {
			// 回退：保持与旧逻辑兼容
			c.Set("claims", claims)
		}

		// 调试日志 - 确认设置的变量
		log.Printf("[AUTH] Set context variables: user_id=%d, username=%s, user_role=%s, user_type=%s",
			claims.UserID, claims.Username, claims.Role, claims.UserType)

		// 继续处理请求
		c.Next()
	}
}
