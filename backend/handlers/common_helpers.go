package handlers

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

// GetUserIDFromContextAsUint 从上下文获取用户ID并返回uint类型
func GetUserIDFromContextAsUint(c *gin.Context) uint {
	if userID, exists := c.Get("user_id"); exists {
		// 尝试多种类型转换
		switch v := userID.(type) {
		case uint:
			return v
		case int:
			return uint(v)
		case float64:
			return uint(v)
		case int64:
			return uint(v)
		}
	}
	return 0 // 返回0表示未找到
}

// GetUserIDFromContextAsInt 从上下文获取用户ID并返回int类型
func GetUserIDFromContextAsInt(c *gin.Context) int {
	if userID, exists := c.Get("user_id"); exists {
		// 尝试多种类型转换
		switch v := userID.(type) {
		case int:
			return v
		case uint:
			return int(v)
		case float64:
			return int(v)
		case int64:
			return int(v)
		}
	}
	return 0 // 返回0表示未找到
}

// CheckEnterpriseAccess 检查用户是否有权访问指定企业ID的资源
// 返回 (hasAccess bool, errorMessage string)
// - hasAccess: true表示有权访问, false表示无权访问
// - errorMessage: 如果无权访问,返回错误消息;否则为空字符串
func CheckEnterpriseAccess(c *gin.Context, resourceEnterpriseID *int) (bool, string) {
	userRole, exists := c.Get("user_role")
	if !exists {
		log.Printf("[CheckEnterpriseAccess] Cannot get user_role from context")
		return false, "无法获取用户角色"
	}

	roleStr, ok := userRole.(string)
	if !ok {
		log.Printf("[CheckEnterpriseAccess] user_role is not string type")
		return false, "用户角色格式错误"
	}

	// Admin和super_admin可以访问所有资源
	if roleStr == "admin" || roleStr == "super_admin" {
		return true, ""
	}

	// 对于企业用户,检查是否属于同一企业
	if roleStr == "enterprise_admin" || roleStr == "enterprise_user" {
		enterpriseIDInterface, exists := c.Get("enterprise_id")
		if !exists {
			log.Printf("[CheckEnterpriseAccess] Enterprise user but no enterprise_id in context")
			return false, "无法获取用户企业ID"
		}

		userEnterpriseID, ok := enterpriseIDInterface.(int)
		if !ok || userEnterpriseID <= 0 {
			log.Printf("[CheckEnterpriseAccess] Invalid enterprise_id: %v", enterpriseIDInterface)
			return false, "用户企业ID无效"
		}

		// 检查资源是否属于用户的企业
		if resourceEnterpriseID == nil {
			// 资源没有enterprise_id,可能是旧数据或公共资源,暂时允许访问
			return true, ""
		}

		if *resourceEnterpriseID != userEnterpriseID {
			log.Printf("[CheckEnterpriseAccess] Access denied: user enterprise_id=%d, resource enterprise_id=%d",
				userEnterpriseID, *resourceEnterpriseID)
			return false, fmt.Sprintf("该资源属于企业%d,您只能访问企业%d的资源",
				*resourceEnterpriseID, userEnterpriseID)
		}

		// 企业ID匹配,允许访问
		return true, ""
	}

	// 对于公司用户,检查是否属于同一公司 (TODO: 实现company_id检查)
	if roleStr == "company_admin" || roleStr == "company_user" {
		// 暂时允许访问,后续可以添加company_id检查
		return true, ""
	}

	// 其他角色暂时允许访问
	return true, ""
}
