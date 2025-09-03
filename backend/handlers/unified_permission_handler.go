package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// UnifiedPermissionHandler 处理统一权限检查相关的HTTP请求
// 这个处理器专门为MCP服务器和Claude Tools提供统一的权限检查API
type UnifiedPermissionHandler struct {
	unifiedPermissionManager *middleware.UnifiedPermissionManager
	permissionRepo           database.PermissionRepository
	enableDebugLog           bool
}

// NewUnifiedPermissionHandler 创建新的统一权限处理器
func NewUnifiedPermissionHandler(
	unifiedPermissionManager *middleware.UnifiedPermissionManager,
	permissionRepo database.PermissionRepository,
) *UnifiedPermissionHandler {
	return &UnifiedPermissionHandler{
		unifiedPermissionManager: unifiedPermissionManager,
		permissionRepo:           permissionRepo,
		enableDebugLog:           true, // 开发阶段启用调试日志
	}
}

// PermissionCheckRequest 权限检查请求结构
type PermissionCheckRequest struct {
	PermissionCode string `json:"permission_code" binding:"required"`
	ResourceID     *int   `json:"resource_id,omitempty"`
	ResourceType   string `json:"resource_type,omitempty"`
}

// PermissionCheckResponse 权限检查响应结构
type PermissionCheckResponse struct {
	HasPermission     bool     `json:"has_permission"`
	Reason            string   `json:"reason,omitempty"`
	Source            string   `json:"source,omitempty"`
	UserPermissions   []string `json:"user_permissions,omitempty"`
	UserID            *int     `json:"user_id,omitempty"`
	UserRole          string   `json:"user_role,omitempty"`
	IsSuperAdmin      bool     `json:"is_super_admin,omitempty"`
	RequestContext    string   `json:"request_context,omitempty"`
}

// BatchPermissionRequest 批量权限检查请求结构
type BatchPermissionRequest struct {
	Permissions []PermissionCheckRequest `json:"permissions" binding:"required"`
}

// BatchPermissionResponse 批量权限检查响应结构
type BatchPermissionResponse struct {
	Results map[string]PermissionCheckResponse `json:"results"`
}

// CheckPermission 处理单个权限检查 POST /api/v1/auth/check-permission
func (h *UnifiedPermissionHandler) CheckPermission(c *gin.Context) {
	ctx := c.Request.Context()
	
	if h.enableDebugLog {
		log.Printf("[UNIFIED_PERM] 收到权限检查请求: %s %s", c.Request.Method, c.Request.URL.Path)
	}

	var req PermissionCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"Invalid request format",
			err.Error(),
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 提取用户上下文
	userCtx := h.extractUserContext(c)
	
	if h.enableDebugLog {
		log.Printf("[UNIFIED_PERM] 权限检查请求 - 用户ID: %v, 权限: %s, 资源: %v",
			userCtx["user_id"], req.PermissionCode, req.ResourceID)
	}

	// 执行权限检查
	result, err := h.performPermissionCheck(ctx, req, userCtx)
	if err != nil {
		log.Printf("[UNIFIED_PERM] 权限检查失败: %v", err)
		response := models.NewErrorResponse(
			models.ErrCodeInternal,
			"Permission check failed",
			err.Error(),
		)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 构造响应
	response := models.NewSuccessResponse(result, "Permission check completed")
	c.JSON(http.StatusOK, response)
}

// CheckBatchPermissions 处理批量权限检查 POST /api/v1/auth/check-batch-permissions
func (h *UnifiedPermissionHandler) CheckBatchPermissions(c *gin.Context) {
	ctx := c.Request.Context()
	
	if h.enableDebugLog {
		log.Printf("[UNIFIED_PERM] 收到批量权限检查请求: %s %s", c.Request.Method, c.Request.URL.Path)
	}

	var req BatchPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"Invalid request format",
			err.Error(),
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if len(req.Permissions) == 0 {
		response := models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"Empty permissions list",
			"At least one permission must be provided",
		)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 提取用户上下文
	userCtx := h.extractUserContext(c)
	
	if h.enableDebugLog {
		log.Printf("[UNIFIED_PERM] 批量权限检查请求 - 用户ID: %v, 权限数量: %d",
			userCtx["user_id"], len(req.Permissions))
	}

	// 执行批量权限检查
	results := make(map[string]PermissionCheckResponse)
	
	for _, permissionReq := range req.Permissions {
		result, err := h.performPermissionCheck(ctx, permissionReq, userCtx)
		if err != nil {
			log.Printf("[UNIFIED_PERM] 批量权限检查中的权限 %s 失败: %v", permissionReq.PermissionCode, err)
			// 对于批量检查，单个权限失败不应该终止整个请求
			result = &PermissionCheckResponse{
				HasPermission: false,
				Reason:        "Permission check failed: " + err.Error(),
				Source:        "error",
			}
		}
		results[permissionReq.PermissionCode] = *result
	}

	// 构造响应
	batchResponse := BatchPermissionResponse{
		Results: results,
	}
	
	response := models.NewSuccessResponse(batchResponse, "Batch permission check completed")
	c.JSON(http.StatusOK, response)
}

// GetUserPermissions 获取用户权限列表 GET /api/v1/auth/user-permissions
func (h *UnifiedPermissionHandler) GetUserPermissions(c *gin.Context) {
	ctx := c.Request.Context()
	
	if h.enableDebugLog {
		log.Printf("[UNIFIED_PERM] 收到用户权限列表请求: %s %s", c.Request.Method, c.Request.URL.Path)
	}

	// 提取用户上下文
	userCtx := h.extractUserContext(c)
	userID, hasUserID := userCtx["user_id"].(int)
	
	if !hasUserID {
		response := models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"User not authenticated",
			"Cannot determine user identity",
		)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	username := getStringFromContext(userCtx, "username")
	userRole := getStringFromContext(userCtx, "user_role")
	userType := getStringFromContext(userCtx, "user_type")
	isSuperAdmin := h.checkSuperAdmin(userCtx)

	// 基于角色和类型生成权限列表
	permissions := h.generatePermissionsByRole(userRole, userType, isSuperAdmin)

	// 如果有权限仓库，尝试从数据库获取更详细的权限信息
	var allPermissions []string
	if h.permissionRepo != nil {
		// 获取系统中所有可用的权限
		if systemPermissions, err := h.permissionRepo.GetPermissions(ctx); err == nil {
			// 基于用户角色过滤权限
			for _, perm := range systemPermissions {
				if h.hasPermissionForRole(perm.PermissionCode, userRole, userType, isSuperAdmin) {
					allPermissions = append(allPermissions, perm.PermissionCode)
				}
			}
			if len(allPermissions) > 0 {
				permissions = allPermissions
			}
		} else {
			log.Printf("[UNIFIED_PERM] 无法从数据库获取权限: %v", err)
		}
	}

	userPermissions := struct {
		UserID       int      `json:"user_id"`
		Username     string   `json:"username"`
		UserRole     string   `json:"user_role"`
		UserType     string   `json:"user_type"`
		IsSuperAdmin bool     `json:"is_super_admin"`
		Permissions  []string `json:"permissions"`
	}{
		UserID:       userID,
		Username:     username,
		UserRole:     userRole,
		UserType:     userType,
		IsSuperAdmin: isSuperAdmin,
		Permissions:  permissions,
	}

	if h.enableDebugLog {
		log.Printf("[UNIFIED_PERM] 用户权限 - ID: %d, 角色: %s, 权限数量: %d", userID, userRole, len(permissions))
	}

	response := models.NewSuccessResponse(userPermissions, "User permissions retrieved")
	c.JSON(http.StatusOK, response)
}

// 私有辅助方法

// extractUserContext 从Gin上下文中提取用户信息
func (h *UnifiedPermissionHandler) extractUserContext(c *gin.Context) map[string]interface{} {
	userCtx := make(map[string]interface{})
	
	// 从认证中间件设置的上下文中提取用户信息
	if userID, exists := c.Get("user_id"); exists {
		userCtx["user_id"] = userID
	}
	
	if username, exists := c.Get("username"); exists {
		userCtx["username"] = username
	}
	
	if userRole, exists := c.Get("user_role"); exists {
		userCtx["user_role"] = userRole
	}
	
	if userType, exists := c.Get("user_type"); exists {
		userCtx["user_type"] = userType
	}
	
	// 添加请求信息用于调试
	userCtx["request_path"] = c.Request.URL.Path
	userCtx["request_method"] = c.Request.Method
	userCtx["remote_addr"] = c.ClientIP()
	
	return userCtx
}

// performPermissionCheck 执行实际的权限检查逻辑
func (h *UnifiedPermissionHandler) performPermissionCheck(
	ctx context.Context,
	req PermissionCheckRequest,
	userCtx map[string]interface{},
) (*PermissionCheckResponse, error) {
	
	// 检查是否为超级管理员
	if h.checkSuperAdmin(userCtx) {
		return &PermissionCheckResponse{
			HasPermission: true,
			Reason:        "Super admin access",
			Source:        "super_admin",
			UserID:        getIntPtrFromContext(userCtx, "user_id"),
			UserRole:      getStringFromContext(userCtx, "user_role"),
			IsSuperAdmin:  true,
		}, nil
	}

	// 使用UnifiedPermissionManager进行权限检查
	if h.unifiedPermissionManager != nil {
		// 这里需要调用UnifiedPermissionManager的权限检查方法
		// 由于当前UnifiedPermissionManager接口可能不直接支持这种调用方式，
		// 我们先实现基本的权限检查逻辑
		
		userID, hasUserID := userCtx["user_id"].(int)
		if !hasUserID {
			return &PermissionCheckResponse{
				HasPermission: false,
				Reason:        "User not authenticated",
				Source:        "auth_required",
			}, nil
		}

		// 基本权限检查逻辑（临时实现）
		hasPermission := h.basicPermissionCheck(req.PermissionCode, userCtx)
		
		return &PermissionCheckResponse{
			HasPermission: hasPermission,
			Reason:        h.getPermissionReason(hasPermission, req.PermissionCode),
			Source:        "unified_manager",
			UserID:        &userID,
			UserRole:      getStringFromContext(userCtx, "user_role"),
			IsSuperAdmin:  false,
		}, nil
	}

	// 回退逻辑：如果没有权限管理器，根据用户角色进行基本检查
	return h.fallbackPermissionCheck(req, userCtx), nil
}

// checkSuperAdmin 检查用户是否为超级管理员
func (h *UnifiedPermissionHandler) checkSuperAdmin(userCtx map[string]interface{}) bool {
	// 使用UnifiedPermissionManager的超级管理员检查逻辑
	if h.unifiedPermissionManager != nil {
		// TODO: 这里应该调用UnifiedPermissionManager的方法
		// 目前先使用简单的检查逻辑
	}
	
	// 基本的超级管理员检查：admin用户 + system用户类型
	username := getStringFromContext(userCtx, "username")
	userRole := getStringFromContext(userCtx, "user_role")
	userType := getStringFromContext(userCtx, "user_type")
	
	return (username == "admin" || userRole == "admin") && userType == "system"
}

// basicPermissionCheck 基本权限检查逻辑
func (h *UnifiedPermissionHandler) basicPermissionCheck(permissionCode string, userCtx map[string]interface{}) bool {
	userRole := getStringFromContext(userCtx, "user_role")
	userType := getStringFromContext(userCtx, "user_type")
	
	// Admin用户拥有所有权限
	if userRole == "admin" {
		return true
	}
	
	// System用户拥有大部分权限
	if userType == "system" {
		return true
	}
	
	// 基于权限码的基本检查
	switch permissionCode {
	case "task.read", "task.list.read", "document.read", "worknote.list.read":
		return true // 读权限对所有认证用户开放
	case "task.create", "task.update", "document.create", "worknote.create":
		return userRole == "admin" || userRole == "editor"
	case "task.delete", "document.delete":
		return userRole == "admin"
	default:
		return userRole == "admin" // 未知权限默认需要管理员权限
	}
}

// getPermissionReason 获取权限检查结果的原因
func (h *UnifiedPermissionHandler) getPermissionReason(hasPermission bool, permissionCode string) string {
	if hasPermission {
		return "Permission granted"
	}
	return "Insufficient permissions for " + permissionCode
}

// fallbackPermissionCheck 回退权限检查逻辑
func (h *UnifiedPermissionHandler) fallbackPermissionCheck(
	req PermissionCheckRequest,
	userCtx map[string]interface{},
) *PermissionCheckResponse {
	
	userID, hasUserID := userCtx["user_id"].(int)
	if !hasUserID {
		return &PermissionCheckResponse{
			HasPermission: false,
			Reason:        "Authentication required",
			Source:        "fallback",
		}
	}

	// 简单的回退逻辑：已认证用户拥有基本权限
	hasPermission := h.basicPermissionCheck(req.PermissionCode, userCtx)
	
	return &PermissionCheckResponse{
		HasPermission: hasPermission,
		Reason:        h.getPermissionReason(hasPermission, req.PermissionCode),
		Source:        "fallback",
		UserID:        &userID,
		UserRole:      getStringFromContext(userCtx, "user_role"),
		IsSuperAdmin:  false,
	}
}

// generatePermissionsByRole 基于用户角色生成权限列表
func (h *UnifiedPermissionHandler) generatePermissionsByRole(userRole, userType string, isSuperAdmin bool) []string {
	if isSuperAdmin {
		return []string{
			"task.create", "task.read", "task.update", "task.delete", "task.list.read",
			"document.create", "document.read", "document.update", "document.delete", 
			"worknote.create", "worknote.read", "worknote.update", "worknote.delete", "worknote.list.read",
			"project.create", "project.read", "project.update", "project.delete",
			"user.create", "user.read", "user.update", "user.delete",
			"permission.manage", "role.manage", "system.admin",
		}
	}

	// 基于角色分配权限
	switch strings.ToLower(userRole) {
	case "admin":
		return []string{
			"task.create", "task.read", "task.update", "task.delete", "task.list.read",
			"document.create", "document.read", "document.update", "document.delete", 
			"worknote.create", "worknote.read", "worknote.update", "worknote.delete", "worknote.list.read",
			"project.create", "project.read", "project.update", "project.delete",
			"user.read", "user.update",
		}
	case "editor":
		return []string{
			"task.create", "task.read", "task.update", "task.list.read",
			"document.create", "document.read", "document.update", 
			"worknote.create", "worknote.read", "worknote.update", "worknote.list.read",
			"project.read", "project.update",
		}
	case "viewer":
		return []string{
			"task.read", "task.list.read",
			"document.read", 
			"worknote.read", "worknote.list.read",
			"project.read",
		}
	default:
		// 默认权限（认证用户的最基本权限）
		return []string{
			"task.read", "task.list.read",
			"document.read",
			"worknote.read", "worknote.list.read",
		}
	}
}

// hasPermissionForRole 检查特定角色是否拥有特定权限
func (h *UnifiedPermissionHandler) hasPermissionForRole(permissionCode, userRole, userType string, isSuperAdmin bool) bool {
	// 超级管理员拥有所有权限
	if isSuperAdmin {
		return true
	}

	userPermissions := h.generatePermissionsByRole(userRole, userType, isSuperAdmin)
	for _, perm := range userPermissions {
		if perm == permissionCode {
			return true
		}
	}
	return false
}

// 辅助函数

func getStringFromContext(ctx map[string]interface{}, key string) string {
	if val, exists := ctx[key]; exists {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func getIntPtrFromContext(ctx map[string]interface{}, key string) *int {
	if val, exists := ctx[key]; exists {
		if intVal, ok := val.(int); ok {
			return &intVal
		}
		if strVal, ok := val.(string); ok {
			if intVal, err := strconv.Atoi(strVal); err == nil {
				return &intVal
			}
		}
	}
	return nil
}
