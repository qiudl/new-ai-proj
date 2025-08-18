package handlers

import (
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// EnhancedPermissionHandler handles advanced permission management
type EnhancedPermissionHandler struct {
	permissionService *services.EnhancedPermissionService
}

// NewEnhancedPermissionHandler creates a new enhanced permission handler
func NewEnhancedPermissionHandler(permissionService *services.EnhancedPermissionService) *EnhancedPermissionHandler {
	return &EnhancedPermissionHandler{
		permissionService: permissionService,
	}
}

// GetRoleTemplates godoc
// @Summary Get role templates
// @Description Get available role templates for quick role creation
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/role-templates [get]
func (h *EnhancedPermissionHandler) GetRoleTemplates(c *gin.Context) {
	templates := h.permissionService.GetBuiltInRoleTemplates()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取角色模板成功",
		"data":    templates,
	})
}

// GetPermissionTemplates godoc
// @Summary Get permission templates
// @Description Get available permission templates for quick permission setup
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/permission-templates [get]
func (h *EnhancedPermissionHandler) GetPermissionTemplates(c *gin.Context) {
	templates := h.permissionService.GetPermissionTemplates()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取权限模板成功",
		"data":    templates,
	})
}

// CreateRoleFromTemplate godoc
// @Summary Create role from template
// @Description Create a new role based on a predefined template
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Role creation request"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/roles/from-template [post]
func (h *EnhancedPermissionHandler) CreateRoleFromTemplate(c *gin.Context) {
	var request struct {
		TemplateID      int            `json:"template_id" binding:"required"`
		RoleName        string         `json:"role_name" binding:"required"`
		Customizations  map[string]bool `json:"customizations"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	role, err := h.permissionService.CreateRoleFromTemplate(
		c.Request.Context(),
		request.TemplateID,
		request.RoleName,
		request.Customizations,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建角色失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "角色创建成功",
		"data":    role.ToResponse(),
	})
}

// RequestPermission godoc
// @Summary Request temporary permission
// @Description Request temporary access to specific permissions
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Permission request"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/request [post]
func (h *EnhancedPermissionHandler) RequestPermission(c *gin.Context) {
	var request struct {
		PermissionCode  string `json:"permission_code" binding:"required"`
		ResourceType    string `json:"resource_type" binding:"required"`
		ResourceID      *int   `json:"resource_id"`
		Justification   string `json:"justification" binding:"required"`
		DurationHours   int    `json:"duration_hours" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// Get requester ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	duration := time.Duration(request.DurationHours) * time.Hour
	permissionRequest, err := h.permissionService.RequestPermission(
		c.Request.Context(),
		userID.(int),
		request.PermissionCode,
		request.ResourceType,
		request.ResourceID,
		request.Justification,
		duration,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建权限请求失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "权限请求已提交",
		"data":    permissionRequest,
	})
}

// GetPermissionRequests godoc
// @Summary Get permission requests
// @Description Get permission requests with filtering options
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param status query string false "Filter by status"
// @Param user_id query int false "Filter by user ID"
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/requests [get]
func (h *EnhancedPermissionHandler) GetPermissionRequests(c *gin.Context) {
	filter := make(map[string]interface{})
	
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}
	
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter["user_id"] = userID
		}
	}

	requests, err := h.permissionService.GetPermissionRequests(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取权限请求失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取权限请求成功",
		"data":    requests,
	})
}

// ApprovePermissionRequest godoc
// @Summary Approve permission request
// @Description Approve a pending permission request
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param id path int true "Request ID"
// @Param body body map[string]interface{} true "Approval data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/requests/{id}/approve [post]
func (h *EnhancedPermissionHandler) ApprovePermissionRequest(c *gin.Context) {
	requestID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求ID",
		})
		return
	}

	var request struct {
		Comments string `json:"comments"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// Get approver ID from context
	approverID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	err = h.permissionService.ApprovePermissionRequest(
		c.Request.Context(),
		requestID,
		approverID.(int),
		request.Comments,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "批准权限请求失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限请求已批准",
	})
}

// RejectPermissionRequest godoc
// @Summary Reject permission request
// @Description Reject a pending permission request
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param id path int true "Request ID"
// @Param body body map[string]interface{} true "Rejection data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/requests/{id}/reject [post]
func (h *EnhancedPermissionHandler) RejectPermissionRequest(c *gin.Context) {
	requestID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求ID",
		})
		return
	}

	var request struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// Get approver ID from context
	approverID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	err = h.permissionService.RejectPermissionRequest(
		c.Request.Context(),
		requestID,
		approverID.(int),
		request.Reason,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "拒绝权限请求失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限请求已拒绝",
	})
}

// DelegatePermissions godoc
// @Summary Delegate permissions
// @Description Delegate permissions to another user temporarily
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Delegation data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/delegate [post]
func (h *EnhancedPermissionHandler) DelegatePermissions(c *gin.Context) {
	var request struct {
		DelegateID      int      `json:"delegate_id" binding:"required"`
		PermissionCodes []string `json:"permission_codes" binding:"required"`
		ResourceType    string   `json:"resource_type" binding:"required"`
		ResourceID      *int     `json:"resource_id"`
		ValidHours      int      `json:"valid_hours" binding:"required"`
		Reason          string   `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// Get delegator ID from context
	delegatorID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	validUntil := time.Now().Add(time.Duration(request.ValidHours) * time.Hour)
	delegation, err := h.permissionService.DelegatePermissions(
		c.Request.Context(),
		delegatorID.(int),
		request.DelegateID,
		request.PermissionCodes,
		request.ResourceType,
		request.ResourceID,
		validUntil,
		request.Reason,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "权限委派失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "权限委派成功",
		"data":    delegation,
	})
}

// GetUserDelegations godoc
// @Summary Get user delegations
// @Description Get all delegations for a user (both given and received)
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/users/{id}/delegations [get]
func (h *EnhancedPermissionHandler) GetUserDelegations(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的用户ID",
		})
		return
	}

	delegations, err := h.permissionService.GetUserDelegations(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取权限委派失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取权限委派成功",
		"data":    delegations,
	})
}

// RevokeDelegation godoc
// @Summary Revoke delegation
// @Description Revoke a permission delegation
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param id path int true "Delegation ID"
// @Param body body map[string]interface{} true "Revocation data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/delegations/{id}/revoke [post]
func (h *EnhancedPermissionHandler) RevokeDelegation(c *gin.Context) {
	delegationID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的委派ID",
		})
		return
	}

	var request struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// Get revoker ID from context
	revokerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	err = h.permissionService.RevokeDelegation(
		c.Request.Context(),
		delegationID,
		revokerID.(int),
		request.Reason,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "撤销权限委派失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限委派已撤销",
	})
}

// AnalyzePermissionUsage godoc
// @Summary Analyze permission usage
// @Description Analyze permission usage patterns for a user
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Param time_range query string false "Time range for analysis"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/users/{id}/usage-analysis [get]
func (h *EnhancedPermissionHandler) AnalyzePermissionUsage(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的用户ID",
		})
		return
	}

	timeRange := c.DefaultQuery("time_range", "30d")
	
	analysis, err := h.permissionService.AnalyzePermissionUsage(c.Request.Context(), userID, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "权限使用分析失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限使用分析成功",
		"data":    analysis,
	})
}

// SuggestRoleOptimization godoc
// @Summary Suggest role optimization
// @Description Suggest role optimizations based on usage patterns
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/users/{id}/optimization-suggestions [get]
func (h *EnhancedPermissionHandler) SuggestRoleOptimization(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的用户ID",
		})
		return
	}

	suggestions, err := h.permissionService.SuggestRoleOptimization(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "角色优化建议生成失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "角色优化建议生成成功",
		"data":    suggestions,
	})
}

// CheckDynamicPermission godoc
// @Summary Check dynamic permission
// @Description Check if user has dynamic permission (delegated, temporary, etc.)
// @Tags Enhanced Permissions
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Permission check request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/permissions/check-dynamic [post]
func (h *EnhancedPermissionHandler) CheckDynamicPermission(c *gin.Context) {
	var request struct {
		UserID         int                    `json:"user_id" binding:"required"`
		PermissionCode string                 `json:"permission_code" binding:"required"`
		ResourceType   string                 `json:"resource_type" binding:"required"`
		ResourceID     *int                   `json:"resource_id"`
		Context        map[string]interface{} `json:"context"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	hasPermission, reason, err := h.permissionService.CheckDynamicPermission(
		c.Request.Context(),
		request.UserID,
		request.PermissionCode,
		request.ResourceType,
		request.ResourceID,
		request.Context,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "动态权限检查失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "动态权限检查完成",
		"data": gin.H{
			"has_permission": hasPermission,
			"reason":         reason,
			"check_type":     "dynamic",
		},
	})
}