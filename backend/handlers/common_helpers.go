package handlers

import (
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
