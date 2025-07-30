package middleware

import (
	"ai-project-backend/models"
	"log"
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
		// 调试日志
		log.Printf("[SYSTEM_MIDDLEWARE] Checking user type access")
		log.Printf("[SYSTEM_MIDDLEWARE] Context keys: %v", gin.H(c.Keys))
		
		userType, exists := c.Get("current_user_type")
		log.Printf("[SYSTEM_MIDDLEWARE] current_user_type: %v, exists: %v", userType, exists)
		
		// 如果current_user_type不存在，尝试从user_type获取
		if !exists {
			userType, exists = c.Get("user_type")
			log.Printf("[SYSTEM_MIDDLEWARE] fallback user_type: %v, exists: %v", userType, exists)
		}
		
		if !exists || userType != "system" {
			log.Printf("[SYSTEM_MIDDLEWARE] Access denied for user_type: %v", userType)
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"Access denied",
				"This endpoint is only available for system users",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		log.Printf("[SYSTEM_MIDDLEWARE] Access granted for system user")
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

// CompanyUserPermissionMiddleware 企业用户权限验证中间件
// 确保企业用户只能访问自己企业的项目和数据
func CompanyUserPermissionMiddleware() gin.HandlerFunc {
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

		userCompanyIDInt, ok := userCompanyID.(int)
		if !ok {
			response := models.NewErrorResponse(
				models.ErrCodeInternal,
				"Invalid company ID format",
				"Please contact administrator",
			)
			c.JSON(http.StatusInternalServerError, response)
			c.Abort()
			return
		}

		// 检查项目访问权限（如果路径中包含项目ID）
		if projectID := getProjectIDFromPath(c); projectID != 0 {
			if !checkCompanyProjectAccess(userCompanyIDInt, projectID) {
				response := models.NewErrorResponse(
					models.ErrCodeAuthorization,
					"Access denied",
					"You can only access projects belonging to your company",
				)
				c.JSON(http.StatusForbidden, response)
				c.Abort()
				return
			}
		}

		// 检查企业用户特定权限
		if !checkCompanyUserPermissions(c, userCompanyIDInt) {
			response := models.NewErrorResponse(
				models.ErrCodeAuthorization,
				"Access denied",
				"Insufficient permissions for this operation",
			)
			c.JSON(http.StatusForbidden, response)
			c.Abort()
			return
		}

		c.Next()
	}
}

// getProjectIDFromPath 从路径中提取项目ID
func getProjectIDFromPath(c *gin.Context) int {
	if projectIDStr := c.Param("id"); projectIDStr != "" {
		// 检查是否在项目相关的路径上
		path := c.Request.URL.Path
		if contains(path, "/projects/") {
			if projectID, err := strconv.Atoi(projectIDStr); err == nil {
				return projectID
			}
		}
	}
	return 0
}

// checkCompanyProjectAccess 检查企业是否有访问特定项目的权限
func checkCompanyProjectAccess(companyID, projectID int) bool {
	// TODO: 实现实际的数据库查询
	// 这里应该查询项目是否属于该企业
	// 临时实现：总是返回true，实际应该查询数据库
	return true
}

// checkCompanyUserPermissions 检查企业用户的特定权限
func checkCompanyUserPermissions(c *gin.Context, companyID int) bool {
	// 检查企业用户是否有执行当前操作的权限
	method := c.Request.Method
	path := c.Request.URL.Path

	// 企业用户权限规则：
	// 1. 可以查看项目进展和详情
	// 2. 可以查看/下载项目文档
	// 3. 可以创建任务并指派给项目经理
	// 4. 可以查看项目时间统计
	// 5. 不能访问系统管理功能
	// 6. 不能访问其他企业的数据

	// 禁止访问系统管理路径
	if contains(path, "/admin/") || contains(path, "/system/") {
		return false
	}

	// 禁止访问权限管理
	if contains(path, "/permissions/") {
		return false
	}

	// 根据方法和路径检查权限
	switch method {
	case "GET":
		// 企业用户可以查看大部分资源
		return true
	case "POST":
		// 企业用户可以创建任务和上传文档
		if contains(path, "/tasks") || contains(path, "/documents") {
			return true
		}
		// 禁止其他POST操作
		return false
	case "PUT", "PATCH":
		// 企业用户可以更新任务状态和自己的信息
		if contains(path, "/tasks") || contains(path, "/profile") {
			return true
		}
		return false
	case "DELETE":
		// 企业用户通常不能删除资源
		return false
	default:
		return false
	}
}

// contains 检查字符串是否包含子字符串
func contains(s, substr string) bool {
	return len(s) >= len(substr) && 
		   (s == substr || (len(s) > len(substr) && 
		   (s[:len(substr)] == substr || 
		    s[len(s)-len(substr):] == substr || 
		    containsMiddle(s, substr))))
}

// containsMiddle 检查字符串中间是否包含子字符串
func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
