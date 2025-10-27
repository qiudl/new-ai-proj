package utils

import (
	"errors"
	"log"
	"github.com/gin-gonic/gin"
)

// IsSystemAdmin 检查用户是否为系统管理员
// 系统管理员的定义：user_type = "system" 且 role = "admin"
func IsSystemAdmin(c *gin.Context) bool {
	userType, typeExists := c.Get("user_type")
	role, roleExists := c.Get("user_role")

	if !typeExists || !roleExists {
		return false
	}

	// 系统管理员必须同时满足：user_type = "system" 且 role = "admin"
	return userType == "system" && role == "admin"
}

// GetUserType 获取用户类型
func GetUserType(c *gin.Context) string {
	userType, exists := c.Get("user_type")
	if !exists {
		return ""
	}
	if ut, ok := userType.(string); ok {
		return ut
	}
	return ""
}

// GetUserRole 获取用户角色
func GetUserRole(c *gin.Context) string {
	role, exists := c.Get("user_role")
	if !exists {
		return ""
	}
	if r, ok := role.(string); ok {
		return r
	}
	return ""
}

// GetUserID 获取用户ID
func GetUserID(c *gin.Context) (int64, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	switch v := userID.(type) {
	case int64:
		return v, true
	case int:
		return int64(v), true
	case float64:
		return int64(v), true
	default:
		return 0, false
	}
}

// CheckPublicNotePermission 检查公开笔记操作权限
// operation: "create", "edit", "delete", "publish"
func CheckPublicNotePermission(c *gin.Context, operation string) error {
	// 公开笔记的写操作只允许系统管理员
	writeOps := map[string]bool{
		"create":  true,
		"edit":    true,
		"delete":  true,
		"publish": true,
	}

	userType := GetUserType(c)
	userRole := GetUserRole(c)
	isAdmin := IsSystemAdmin(c)

	// 添加DEBUG日志
	log.Printf("[PERMISSION CHECK] operation=%s, user_type=%s, role=%s, isSystemAdmin=%v",
		operation, userType, userRole, isAdmin)

	if writeOps[operation] && !isAdmin {
		log.Printf("[PERMISSION DENIED] User is not system admin")
		return errors.New("只有系统管理员可以执行公开笔记的写操作")
	}

	log.Printf("[PERMISSION GRANTED] System admin check passed")
	return nil
}

// CheckPublicFolderPermission 检查公开目录操作权限
// operation: "create", "edit", "delete", "move"
func CheckPublicFolderPermission(c *gin.Context, operation string) error {
	// 公开目录的所有管理操作只允许系统管理员
	if !IsSystemAdmin(c) {
		return errors.New("只有系统管理员可以管理公开目录")
	}
	return nil
}

// CanViewPublicNote 检查是否可以查看公开笔记
// 所有已登录用户都可以查看公开笔记
func CanViewPublicNote(c *gin.Context) bool {
	_, exists := c.Get("user_id")
	return exists
}

// CanCommentPublicNote 检查是否可以评论公开笔记
// 所有已登录用户都可以评论公开笔记
func CanCommentPublicNote(c *gin.Context) bool {
	_, exists := c.Get("user_id")
	return exists
}

// CheckNoteOwnership 检查笔记所有权
// 用于验证用户是否为笔记的创建者
func CheckNoteOwnership(c *gin.Context, creatorID int64) bool {
	userID, exists := GetUserID(c)
	if !exists {
		return false
	}
	return userID == creatorID
}

// CheckFolderOwnership 检查目录所有权
// 用于验证用户是否为目录的创建者
func CheckFolderOwnership(c *gin.Context, creatorID int64) bool {
	userID, exists := GetUserID(c)
	if !exists {
		return false
	}
	return userID == creatorID
}

// CheckNoteVisibilityPermission 检查笔记可见性权限
// visibility: "private", "team", "public"
// creatorID: 笔记创建者ID
func CheckNoteVisibilityPermission(c *gin.Context, visibility string, creatorID int64) error {
	switch visibility {
	case "private":
		// 私有笔记只有创建者可以访问
		if !CheckNoteOwnership(c, creatorID) {
			return errors.New("无权访问此私有笔记")
		}
	case "team":
		// 团队笔记需要团队成员权限
		// TODO: 实现团队成员验证逻辑
		// 暂时允许所有登录用户访问
	case "public":
		// 公开笔记所有登录用户可以访问
		if !CanViewPublicNote(c) {
			return errors.New("请先登录")
		}
	default:
		return errors.New("无效的可见性设置")
	}
	return nil
}

// CheckFolderTreePermission 检查文件夹树权限
// treeType: "private", "team", "public"
// creatorID: 目录创建者ID
func CheckFolderTreePermission(c *gin.Context, treeType string, creatorID int64, operation string) error {
	switch treeType {
	case "private":
		// 私有树只有创建者可以管理
		if !CheckFolderOwnership(c, creatorID) {
			return errors.New("无权管理此私有目录")
		}
	case "team":
		// 团队树需要团队成员权限
		// TODO: 实现团队成员验证逻辑
		// 暂时允许所有登录用户访问
	case "public":
		// 公开树只有系统管理员可以管理
		if err := CheckPublicFolderPermission(c, operation); err != nil {
			return err
		}
	default:
		return errors.New("无效的树类型")
	}
	return nil
}
