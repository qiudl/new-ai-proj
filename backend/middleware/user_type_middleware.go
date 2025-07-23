package middleware

import (
	"ai-project-backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserTypeAccessMiddleware 基于用户类型的访问控制中间件
func UserTypeAccessMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从上下文获取用户信息（假设已经通过认证中间件设置）
		userID, exists := c.Get("user_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"User not authenticated",
				"Please login first",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		userType, exists := c.Get("user_type")
		if !exists {
			// 如果没有用户类型信息，默认为system用户（向后兼容）
			userType = "system"
		}

		// 设置用户信息到上下文，供后续使用
		c.Set("current_user_id", userID)
		c.Set("current_user_type", userType)

		c.Next()
	}
}

// CompanyAccessMiddleware 企业用户数据隔离中间件
func CompanyAccessMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userType, exists := c.Get("current_user_type")
		if !exists || userType != "company" {
			// 非企业用户，跳过检查
			c.Next()
			return
		}

		// 获取用户的企业ID
		userCompanyID, exists := c.Get("company_id")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"Company user must have company association",
				"Please contact administrator",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		// 检查请求中的企业相关参数
		requestCompanyID := getRequestCompanyID(c)
		if requestCompanyID != 0 && userCompanyID != requestCompanyID {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"Access denied",
				"You can only access your own company's data",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		c.Next()
	}
}

// getRequestCompanyID 从请求中提取企业ID
func getRequestCompanyID(c *gin.Context) int {
	// 从路径参数中获取企业ID
	if companyIDStr := c.Param("companyId"); companyIDStr != "" {
		if companyID, err := strconv.Atoi(companyIDStr); err == nil {
			return companyID
		}
	}

	// 从查询参数中获取企业ID
	if companyIDStr := c.Query("company_id"); companyIDStr != "" {
		if companyID, err := strconv.Atoi(companyIDStr); err == nil {
			return companyID
		}
	}

	// 从表单数据中获取企业ID
	if companyIDStr := c.PostForm("company_id"); companyIDStr != "" {
		if companyID, err := strconv.Atoi(companyIDStr); err == nil {
			return companyID
		}
	}

	// TODO: 从JSON请求体中获取企业ID（如果需要）

	return 0
}

// SystemUserOnlyMiddleware 限制只有系统用户才能访问的中间件
func SystemUserOnlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userType, exists := c.Get("current_user_type")
		if !exists || userType != "system" {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"Access denied",
				"This endpoint is only available for system users",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminOnlyMiddleware 限制只有管理员才能访问的中间件
func AdminOnlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists || userRole != "admin" {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"Access denied",
				"This endpoint requires administrator privileges",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RoleBasedAccessMiddleware 基于角色的访问控制中间件
func RoleBasedAccessMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"User role not found",
				"Please login again",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		roleStr := userRole.(string)
		for _, allowedRole := range allowedRoles {
			if roleStr == allowedRole {
				c.Next()
				return
			}
		}

		response := models.NewErrorResponse(
			models.ErrCodeAuthorization,
			"Access denied",
			"Insufficient permissions",
		)
		c.JSON(http.StatusForbidden, response)
		c.Abort()
	}
}
