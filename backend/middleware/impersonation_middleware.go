package middleware

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
	"ai-project-backend/utils"
)

// ImpersonationMiddleware 处理模拟状态的中间件
func ImpersonationMiddleware(auditService AuditServiceInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取Claims - 优先尝试ExtendedClaims，如果不存在则跳过
		claimsInterface, exists := c.Get("claims")
		if !exists {
			c.Next()
			return
		}

		claims, ok := claimsInterface.(*models.ExtendedClaims)
		if !ok {
			// 如果不是ExtendedClaims类型，说明不是模拟状态，直接跳过
			c.Next()
			return
		}

		// 如果处于模拟状态
		if claims.IsImpersonating() {
			ctx := claims.ImpersonationContext

			// 1. 设置企业上下文
			c.Set("enterprise_id", ctx.EnterpriseID)
			c.Set("enterprise_name", ctx.EnterpriseName)
			c.Set("is_impersonating", true)

			// 2. 设置原始用户信息（用于审计）
			c.Set("original_user_id", ctx.OriginalUserID)
			c.Set("original_username", ctx.OriginalUsername)
			c.Set("impersonation_session_id", ctx.SessionID)

			// 3. 检查模拟会话是否过期
			if time.Now().After(ctx.ExpiresAt) {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Impersonation session expired",
					"code":  "IMPERSONATION_EXPIRED",
				})
				c.Abort()
				return
			}

			// 4. 记录访问日志（异步）
			if auditService != nil {
				go auditService.LogEvent(c.Request.Context(), &models.AuditEventData{
					UserID:       &ctx.OriginalUserID,
					UserName:     ctx.OriginalUsername,
					Action:       "impersonation_access",
					ResourceType: "api_endpoint",
					ResourceID:   c.Request.URL.Path,
					Description:  "API access during impersonation",
					Status:       "success",
					IPAddress:    c.ClientIP(),
					UserAgent:    c.Request.UserAgent(),
					SessionID:    ctx.SessionID,
					Metadata: map[string]interface{}{
						"enterprise_id":   ctx.EnterpriseID,
						"enterprise_name": ctx.EnterpriseName,
						"method":         c.Request.Method,
						"path":           c.Request.URL.Path,
						"session_id":     ctx.SessionID,
					},
				})
			}
		}

		c.Next()
	}
}

// RequireNonImpersonation 禁止模拟状态访问的中间件
func RequireNonImpersonation() gin.HandlerFunc {
	return func(c *gin.Context) {
		if isImpersonating, exists := c.Get("is_impersonating"); exists && isImpersonating.(bool) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "This action is not allowed in impersonation mode",
				"code":  "IMPERSONATION_FORBIDDEN",
				"details": gin.H{
					"message": "You cannot perform this action while impersonating an enterprise",
					"suggestion": "Exit impersonation mode first",
				},
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireSystemAdmin 要求系统管理员权限的中间件
func RequireSystemAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 添加详细的调试日志
		log.Printf("[RequireSystemAdmin] Starting permission check")
		
		// 优先尝试从token_claims获取（标准JWT claims）
		var role, userType string
		
		if claimsInterface, exists := c.Get("token_claims"); exists {
			log.Printf("[RequireSystemAdmin] Found token_claims, type: %T", claimsInterface)
			// 处理标准JWT claims
			if claims, ok := claimsInterface.(*utils.JWTClaims); ok {
				log.Printf("[RequireSystemAdmin] Successfully cast to utils.JWTClaims: role=%s, userType=%s", claims.Role, claims.UserType)
				role = claims.Role
				userType = claims.UserType
			} else {
				log.Printf("[RequireSystemAdmin] Failed to cast token_claims to utils.JWTClaims")
			}
		} else {
			log.Printf("[RequireSystemAdmin] No token_claims found in context")
		}
		
		// 如果没有找到标准claims，尝试扩展claims
		if role == "" {
			log.Printf("[RequireSystemAdmin] No role from token_claims, trying claims")
			if claimsInterface, exists := c.Get("claims"); exists {
				log.Printf("[RequireSystemAdmin] Found claims, type: %T", claimsInterface)
				if claims, ok := claimsInterface.(*models.ExtendedClaims); ok {
					log.Printf("[RequireSystemAdmin] Successfully cast to models.ExtendedClaims: role=%s, userType=%s", claims.Role, claims.UserType)
					// 检查是否为系统管理员（原始权限，不考虑模拟状态）
					role = claims.Role
					userType = claims.UserType

					// 如果处于模拟状态，使用原始用户的权限
					if claims.IsImpersonating() {
						log.Printf("[RequireSystemAdmin] User is impersonating, using original role: %s", claims.ImpersonationContext.OriginalRole)
						role = claims.ImpersonationContext.OriginalRole
						userType = "system" // 模拟只能由系统用户发起
					}
				} else {
					log.Printf("[RequireSystemAdmin] Failed to cast claims to models.ExtendedClaims")
					c.JSON(http.StatusInternalServerError, gin.H{
						"error": "Invalid claims type",
						"code":  "INVALID_CLAIMS",
						"debug": gin.H{
							"claims_type": fmt.Sprintf("%T", claimsInterface),
						},
					})
					c.Abort()
					return
				}
			} else {
				log.Printf("[RequireSystemAdmin] No claims found in context")
			}
		}
		
		log.Printf("[RequireSystemAdmin] Final check: role=%s, userType=%s", role, userType)
		
		// 如果仍然没有找到claims
		if role == "" {
			log.Printf("[RequireSystemAdmin] No valid claims found")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "No authentication claims found",
				"code":  "UNAUTHENTICATED",
			})
			c.Abort()
			return
		}

		if role != "admin" || userType != "system" {
			log.Printf("[RequireSystemAdmin] Insufficient privileges: role=%s (need admin), userType=%s (need system)", role, userType)
			c.JSON(http.StatusForbidden, gin.H{
				"error": "System administrator privileges required",
				"code":  "INSUFFICIENT_PRIVILEGES",
				"details": gin.H{
					"required_role": "admin",
					"required_user_type": "system",
					"current_role": role,
					"current_user_type": userType,
				},
			})
			c.Abort()
			return
		}

		log.Printf("[RequireSystemAdmin] Permission check passed")
		c.Next()
	}
}

// RequireEnterpriseAdmin 要求企业管理员权限的中间件
func RequireEnterpriseAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsInterface, exists := c.Get("claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "No authentication claims found",
				"code":  "UNAUTHENTICATED",
			})
			c.Abort()
			return
		}

		claims, ok := claimsInterface.(*models.ExtendedClaims)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid claims type",
				"code":  "INVALID_CLAIMS",
			})
			c.Abort()
			return
		}

		// 检查权限：系统管理员或企业管理员（包括模拟状态）
		hasPermission := false

		if claims.Role == "admin" && claims.UserType == "system" {
			// 系统管理员有所有权限
			hasPermission = true
		} else if claims.Role == "enterprise_admin" {
			// 企业管理员或模拟状态的系统管理员
			hasPermission = true
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Enterprise administrator privileges required",
				"code":  "INSUFFICIENT_PRIVILEGES",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Define interface for audit service dependency injection
type AuditServiceInterface interface {
	LogEvent(ctx interface{}, data *models.AuditEventData) error
}