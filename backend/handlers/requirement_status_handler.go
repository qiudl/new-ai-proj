package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// RequirementStatusHandler handles requirement status transition operations
type RequirementStatusHandler struct {
	db                database.DB
	permissionService *services.RequirementPermissionService
}

// NewRequirementStatusHandler creates a new requirement status handler
func NewRequirementStatusHandler(db database.DB, permissionService *services.RequirementPermissionService) *RequirementStatusHandler {
	return &RequirementStatusHandler{
		db:                db,
		permissionService: permissionService,
	}
}

// UpdateRequirementStatusEnhanced godoc
// @Summary Update requirement status
// @Description Update requirement status with permission validation and workflow checks
// @Tags requirement-status
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{status=string,comment=string} true "Status update data"
// @Success 200 {object} models.APIResponse{data=object{requirement_id=int,old_status=string,new_status=string,changed_at=string,changed_by=int}}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/status [put]
// @Security BearerAuth
func (h *RequirementStatusHandler) UpdateRequirementStatusEnhanced(c *gin.Context) {
	userID := c.GetInt("user_id")

	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	var req struct {
		Status  string  `json:"status" binding:"required"`
		Comment *string `json:"comment"` // Optional comment for status change
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", nil))
		return
	}

	// Validate status value
	validStatuses := map[string]bool{
		string(models.RequirementStatusDraft):     true,
		string(models.RequirementStatusPending):   true,
		string(models.RequirementStatusReviewing): true,
		string(models.RequirementStatusNeedMore):  true,
		string(models.RequirementStatusApproved):  true,
		string(models.RequirementStatusRejected):  true,
		string(models.RequirementStatusConverted): true,
		string(models.RequirementStatusArchived):  true,
	}

	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的状态值", nil))
		return
	}

	// Get existing requirement
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	oldStatus := requirement.Status

	// If status is not changing, return early
	if oldStatus == req.Status {
		c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "需求状态未变化"))
		return
	}

	// Check if user can perform this status transition using RequirementPermissionService
	canTransition, reason, err := h.permissionService.CheckRequirementStatusTransition(
		c.Request.Context(),
		userID,
		requirementID,
		oldStatus,
		req.Status,
	)

	if err != nil {
		log.Printf("Error checking status transition permission: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "检查权限失败", nil))
		return
	}

	if !canTransition {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			models.ErrCodeAuthorization,
			fmt.Sprintf("无权限执行此状态转换: %s", reason),
			nil,
		))
		return
	}

	// Update status in database
	err = h.db.Requirements().UpdateStatus(c.Request.Context(), requirementID, req.Status, userID)
	if err != nil {
		log.Printf("Error updating requirement status: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "更新需求状态失败", nil))
		return
	}

	// Create history record with status transition details
	fieldName := "status"
	history := &models.RequirementHistory{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionStatusChanged),
		FieldName:     &fieldName,
		OldValue:      &oldStatus,
		NewValue:      &req.Status,
		Comment:       req.Comment,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	responseData := map[string]interface{}{
		"requirement_id": requirementID,
		"old_status":     oldStatus,
		"new_status":     req.Status,
		"changed_at":     time.Now(),
		"changed_by":     userID,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "需求状态更新成功"))
}

// SubmitRequirement godoc
// @Summary Submit requirement for review
// @Description Submit a draft requirement for review (changes status from draft to pending)
// @Tags requirement-status
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/submit [post]
// @Security BearerAuth
func (h *RequirementStatusHandler) SubmitRequirement(c *gin.Context) {
	h.transitionToStatus(c, string(models.RequirementStatusPending), "提交需求审核")
}

// ApproveRequirement godoc
// @Summary Approve requirement
// @Description Approve a requirement (only reviewers/admins can approve)
// @Tags requirement-status
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional approval comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/approve [post]
// @Security BearerAuth
func (h *RequirementStatusHandler) ApproveRequirement(c *gin.Context) {
	var req struct {
		Comment *string `json:"comment"` // Optional approval comment
	}
	_ = c.ShouldBindJSON(&req)

	userID := c.GetInt("user_id")
	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	// Get requirement
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// Check if user can approve
	canApprove, err := h.permissionService.CanUserApproveRequirement(c.Request.Context(), userID, requirementID)
	if err != nil {
		log.Printf("Error checking approval permission: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "检查权限失败", nil))
		return
	}

	if !canApprove {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限批准此需求", nil))
		return
	}

	// Check status transition
	oldStatus := requirement.Status
	newStatus := string(models.RequirementStatusApproved)

	canTransition, reason, err := h.permissionService.CheckRequirementStatusTransition(
		c.Request.Context(), userID, requirementID, oldStatus, newStatus,
	)

	if err != nil || !canTransition {
		msg := "无法批准需求"
		if reason != "" {
			msg = fmt.Sprintf("%s: %s", msg, reason)
		}
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, msg, nil))
		return
	}

	// Update status
	err = h.db.Requirements().UpdateStatus(c.Request.Context(), requirementID, newStatus, userID)
	if err != nil {
		log.Printf("Error approving requirement: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "批准需求失败", nil))
		return
	}

	// Create history record
	fieldName := "status"
	history := &models.RequirementHistory{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionApproved),
		FieldName:     &fieldName,
		OldValue:      &oldStatus,
		NewValue:      &newStatus,
		Comment:       req.Comment,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "需求已批准"))
}

// RejectRequirement godoc
// @Summary Reject requirement
// @Description Reject a requirement with mandatory rejection reason
// @Tags requirement-status
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} true "Rejection reason (required)"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/reject [post]
// @Security BearerAuth
func (h *RequirementStatusHandler) RejectRequirement(c *gin.Context) {
	var req struct {
		Comment *string `json:"comment" binding:"required"` // Rejection reason is required
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "拒绝需求时必须提供拒绝理由", nil))
		return
	}

	userID := c.GetInt("user_id")
	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	// Get requirement
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// Check if user can reject
	canReject, err := h.permissionService.CanUserRejectRequirement(c.Request.Context(), userID, requirementID)
	if err != nil {
		log.Printf("Error checking rejection permission: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "检查权限失败", nil))
		return
	}

	if !canReject {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限拒绝此需求", nil))
		return
	}

	// Check status transition
	oldStatus := requirement.Status
	newStatus := string(models.RequirementStatusRejected)

	canTransition, reason, err := h.permissionService.CheckRequirementStatusTransition(
		c.Request.Context(), userID, requirementID, oldStatus, newStatus,
	)

	if err != nil || !canTransition {
		msg := "无法拒绝需求"
		if reason != "" {
			msg = fmt.Sprintf("%s: %s", msg, reason)
		}
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, msg, nil))
		return
	}

	// Update status
	err = h.db.Requirements().UpdateStatus(c.Request.Context(), requirementID, newStatus, userID)
	if err != nil {
		log.Printf("Error rejecting requirement: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "拒绝需求失败", nil))
		return
	}

	// Create history record
	fieldName := "status"
	history := &models.RequirementHistory{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionRejected),
		FieldName:     &fieldName,
		OldValue:      &oldStatus,
		NewValue:      &newStatus,
		Comment:       req.Comment,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "需求已拒绝"))
}

// WithdrawRequirement godoc
// @Summary Withdraw requirement
// @Description Withdraw a submitted requirement back to draft status
// @Tags requirement-status
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/withdraw [post]
// @Security BearerAuth
func (h *RequirementStatusHandler) WithdrawRequirement(c *gin.Context) {
	h.transitionToStatus(c, string(models.RequirementStatusDraft), "撤回需求")
}

// ArchiveRequirement godoc
// @Summary Archive requirement
// @Description Archive a requirement for historical record keeping
// @Tags requirement-status
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/archive [post]
// @Security BearerAuth
func (h *RequirementStatusHandler) ArchiveRequirement(c *gin.Context) {
	h.transitionToStatus(c, string(models.RequirementStatusArchived), "归档需求")
}

// transitionToStatus is a helper method for simple status transitions
func (h *RequirementStatusHandler) transitionToStatus(c *gin.Context, targetStatus string, actionDescription string) {
	userID := c.GetInt("user_id")
	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	var req struct {
		Comment *string `json:"comment"` // Optional comment
	}
	_ = c.ShouldBindJSON(&req)

	// Get requirement
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	oldStatus := requirement.Status

	// If already in target status, return early
	if oldStatus == targetStatus {
		c.JSON(http.StatusOK, models.NewSuccessResponse(nil, fmt.Sprintf("需求已经处于%s状态", targetStatus)))
		return
	}

	// Check status transition permission
	canTransition, reason, err := h.permissionService.CheckRequirementStatusTransition(
		c.Request.Context(), userID, requirementID, oldStatus, targetStatus,
	)

	if err != nil {
		log.Printf("Error checking status transition: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "检查权限失败", nil))
		return
	}

	if !canTransition {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			models.ErrCodeAuthorization,
			fmt.Sprintf("无法%s: %s", actionDescription, reason),
			nil,
		))
		return
	}

	// Update status
	err = h.db.Requirements().UpdateStatus(c.Request.Context(), requirementID, targetStatus, userID)
	if err != nil {
		log.Printf("Error transitioning requirement status: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, fmt.Sprintf("%s失败", actionDescription), nil))
		return
	}

	// Create history record
	fieldName := "status"
	action := string(models.RequirementHistoryActionStatusChanged)
	history := &models.RequirementHistory{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        action,
		FieldName:     &fieldName,
		OldValue:      &oldStatus,
		NewValue:      &targetStatus,
		Comment:       req.Comment,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, fmt.Sprintf("%s成功", actionDescription)))
}

// GetRequirementPermissions godoc
// @Summary Get requirement permissions
// @Description Get what actions the current user can perform on the requirement
// @Tags requirement-status
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Success 200 {object} models.APIResponse{data=object{can_access=bool,can_update=bool,can_delete=bool,can_approve=bool,can_reject=bool,can_comment=bool,is_submitter=bool,is_reviewer=bool,is_enterprise_user=bool,reason=string}}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/permissions [get]
// @Security BearerAuth
func (h *RequirementStatusHandler) GetRequirementPermissions(c *gin.Context) {
	userID := c.GetInt("user_id")
	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	// Get comprehensive access information
	access, err := h.permissionService.GetRequirementAccess(c.Request.Context(), userID, requirementID)
	if err != nil {
		log.Printf("Error getting requirement access: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取权限信息失败", nil))
		return
	}

	permissionsData := map[string]interface{}{
		"can_access":          access.CanAccess,
		"can_update":          access.CanUpdate,
		"can_delete":          access.CanDelete,
		"can_approve":         access.CanApprove,
		"can_reject":          access.CanReject,
		"can_comment":         access.CanComment,
		"is_submitter":        access.IsSubmitter,
		"is_reviewer":         access.IsReviewer,
		"is_enterprise_user":  access.IsEnterpriseUser,
		"reason":              access.Reason,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(permissionsData, "获取权限信息成功"))
}
