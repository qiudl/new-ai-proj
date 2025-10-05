package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// HTTPSEnforcer 强制HTTPS中间件
// 对敏感API端点要求必须使用HTTPS协议
func HTTPSEnforcer() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查是否为敏感API
		if isSensitiveEndpoint(c.Request.URL.Path) {
			// 检查协议 (通过X-Forwarded-Proto头或直接检查)
			proto := c.Request.Header.Get("X-Forwarded-Proto")
			if proto == "" {
				// 如果没有代理，检查TLS
				if c.Request.TLS == nil {
					proto = "http"
				} else {
					proto = "https"
				}
			}

			// 在生产环境强制HTTPS
			if proto != "https" && gin.Mode() == gin.ReleaseMode {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "HTTPS_REQUIRED",
						"message": "HTTPS is required for sensitive operations",
					},
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// isSensitiveEndpoint 检查是否为敏感端点
func isSensitiveEndpoint(path string) bool {
	sensitivePatterns := []string{
		"/api/v1/system/ai-configs",
		"/api/v1/system/api-keys",
		"/api/v1/auth/login",
		"/api/v1/auth/register",
	}

	for _, pattern := range sensitivePatterns {
		if strings.Contains(path, pattern) {
			return true
		}
	}

	return false
}

// SecurityHeadersMiddleware 添加安全响应头
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 强制HTTPS (HSTS)
		if gin.Mode() == gin.ReleaseMode {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// 防止XSS攻击
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")

		// CSP策略
		c.Header("Content-Security-Policy", "default-src 'self'")

		// 引用策略
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		c.Next()
	}
}
