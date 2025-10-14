package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// RequirementHandler handles all requirement-related operations
type RequirementHandler struct {
	db database.DB
}

// NewRequirementHandler creates a new requirement handler
func NewRequirementHandler(db database.DB, logger *log.Logger, validate interface{}) *RequirementHandler {
	return &RequirementHandler{db: db}
}

// GetRequirements handles GET /api/v1/requirements
func (h *RequirementHandler) GetRequirements(c *gin.Context) {
	// Get user info from context
	userID := c.GetInt("user_id")
	userRole, _ := c.Get("user_role")

	// Parse pagination and filter parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Build filters
	filters := &models.RequirementFilters{
		Page:      page,
		PageSize:  pageSize,
		Search:    search,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	// Filter by status
	if statusStr := c.Query("status"); statusStr != "" {
		filters.Status = []string{statusStr}
	}

	// Filter by priority
	if priorityStr := c.Query("priority"); priorityStr != "" {
		filters.Priority = []string{priorityStr}
	}

	// Filter by category
	if categoryStr := c.Query("category"); categoryStr != "" {
		filters.Category = []string{categoryStr}
	}

	// Filter by submitter
	if submitterIDStr := c.Query("submitter_id"); submitterIDStr != "" {
		if submitterID, err := strconv.Atoi(submitterIDStr); err == nil {
			filters.SubmitterID = &submitterID
		}
	}

	// Filter by reviewer
	if reviewerIDStr := c.Query("reviewer_id"); reviewerIDStr != "" {
		if reviewerID, err := strconv.Atoi(reviewerIDStr); err == nil {
			filters.ReviewerID = &reviewerID
		}
	}

	// Filter by project
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		if projectID, err := strconv.Atoi(projectIDStr); err == nil {
			filters.ProjectID = &projectID
		}
	}

	// Apply enterprise filter based on user role
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	// System users (admin, project_manager) can see all requirements
	if roleStr != "admin" && roleStr != "super_admin" {
		// For company users, filter by their enterprise
		user, err := h.db.Users().GetByID(c.Request.Context(), userID)
		if err == nil && user.CompanyID != nil {
			filters.EnterpriseID = user.CompanyID
		}
	}

	// Query requirements
	response, err := h.db.Requirements().List(c.Request.Context(), filters)
	if err != nil {
		log.Printf("Error getting requirements: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求列表失败", nil))
		return
	}

	totalPages := (response.Total + pageSize - 1) / pageSize
	hasNext := page < totalPages
	hasPrev := page > 1 && totalPages > 0

	responseData := map[string]interface{}{
		"data": response.Data,
		"pagination": map[string]interface{}{
			"page":        response.Page,
			"page_size":   response.PageSize,
			"total":       response.Total,
			"total_pages": totalPages,
			"has_next":    hasNext,
			"has_prev":    hasPrev,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取需求列表成功"))
}

// CreateRequirement handles POST /api/v1/requirements
func (h *RequirementHandler) CreateRequirement(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req models.CreateRequirementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", nil))
		return
	}

	// Validate required fields
	if req.Title == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "需求标题不能为空", nil))
		return
	}

	// Get user's enterprise ID
	user, err := h.db.Users().GetByID(c.Request.Context(), userID)
	if err != nil {
		log.Printf("Error getting user: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取用户信息失败", nil))
		return
	}

	if user.CompanyID == nil {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "用户未关联企业，无法创建需求", nil))
		return
	}

	// Create requirement object
	requirement := &models.Requirement{
		Title:              req.Title,
		Description:        req.Description,
		ProjectID:          req.ProjectID,
		EnterpriseID:       *user.CompanyID,
		SubmitterID:        userID,
		Status:             string(models.RequirementStatusPending),
		Priority:           req.Priority,
		Category:           req.Category,
		BusinessValue:      req.BusinessValue,
		ExpectedOutcome:    req.ExpectedOutcome,
		AcceptanceCriteria: req.AcceptanceCriteria,
		Attachments:        req.Attachments,
		DueDate:            req.DueDate,
		SubmittedAt:        &time.Time{},
	}

	now := time.Now()
	requirement.SubmittedAt = &now

	// Create in database
	createdRequirement, err := h.db.Requirements().Create(c.Request.Context(), requirement)
	if err != nil {
		log.Printf("Error creating requirement: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建需求失败", nil))
		return
	}

	// Create history record
	history := &models.RequirementHistory{
		RequirementID: createdRequirement.ID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionCreated),
		Comment:       nil,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusCreated, models.NewSuccessResponse(createdRequirement.ToResponse(), "需求创建成功"))
}

// GetRequirement handles GET /api/v1/requirements/:id
func (h *RequirementHandler) GetRequirement(c *gin.Context) {
	userID := c.GetInt("user_id")

	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	// Check access permission
	hasAccess, err := h.db.Requirements().CheckAccess(c.Request.Context(), requirementID, userID)
	if err != nil {
		log.Printf("Error checking access: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "检查权限失败", nil))
		return
	}

	if !hasAccess {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限访问此需求", nil))
		return
	}

	// Get requirement
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		if err.Error() == fmt.Sprintf("需求不存在 (ID: %d)", requirementID) {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		} else {
			log.Printf("Error getting requirement: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求失败", nil))
		}
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(requirement.ToResponse(), "获取需求成功"))
}

// UpdateRequirement handles PUT /api/v1/requirements/:id
func (h *RequirementHandler) UpdateRequirement(c *gin.Context) {
	userID := c.GetInt("user_id")

	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	var req models.UpdateRequirementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", nil))
		return
	}

	// Get existing requirement
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		if err.Error() == fmt.Sprintf("需求不存在 (ID: %d)", requirementID) {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		} else {
			log.Printf("Error getting requirement: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求失败", nil))
		}
		return
	}

	// Check permission: only submitter or system admin can update
	userRole, _ := c.Get("user_role")
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	isSubmitter := requirement.SubmitterID == userID
	isAdmin := roleStr == "admin" || roleStr == "super_admin" || roleStr == "project_manager"

	if !isSubmitter && !isAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限修改此需求", nil))
		return
	}

	// Update fields
	if req.Title != nil {
		requirement.Title = *req.Title
	}
	if req.Description != nil {
		requirement.Description = req.Description
	}
	if req.ProjectID != nil {
		requirement.ProjectID = req.ProjectID
	}
	if req.Priority != nil {
		requirement.Priority = *req.Priority
	}
	if req.Category != nil {
		requirement.Category = req.Category
	}
	if req.BusinessValue != nil {
		requirement.BusinessValue = req.BusinessValue
	}
	if req.ExpectedOutcome != nil {
		requirement.ExpectedOutcome = req.ExpectedOutcome
	}
	if req.AcceptanceCriteria != nil {
		requirement.AcceptanceCriteria = req.AcceptanceCriteria
	}
	if req.Attachments != nil {
		requirement.Attachments = *req.Attachments
	}
	if req.DueDate != nil {
		requirement.DueDate = req.DueDate
	}

	// Update in database
	updatedRequirement, err := h.db.Requirements().Update(c.Request.Context(), requirement)
	if err != nil {
		log.Printf("Error updating requirement: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "更新需求失败", nil))
		return
	}

	// Create history record
	history := &models.RequirementHistory{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionUpdated),
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedRequirement.ToResponse(), "需求更新成功"))
}

// DeleteRequirement handles DELETE /api/v1/requirements/:id
func (h *RequirementHandler) DeleteRequirement(c *gin.Context) {
	userID := c.GetInt("user_id")

	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	// Get existing requirement
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		if err.Error() == fmt.Sprintf("需求不存在 (ID: %d)", requirementID) {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		} else {
			log.Printf("Error getting requirement: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求失败", nil))
		}
		return
	}

	// Check permission: only submitter or system admin can delete
	userRole, _ := c.Get("user_role")
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	isSubmitter := requirement.SubmitterID == userID
	isAdmin := roleStr == "admin" || roleStr == "super_admin"

	if !isSubmitter && !isAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限删除此需求", nil))
		return
	}

	// Delete requirement
	err = h.db.Requirements().Delete(c.Request.Context(), requirementID)
	if err != nil {
		log.Printf("Error deleting requirement: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "删除需求失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "需求删除成功"))
}

// UpdateRequirementStatus handles PUT /api/v1/requirements/:id/status
func (h *RequirementHandler) UpdateRequirementStatus(c *gin.Context) {
	userID := c.GetInt("user_id")

	requirementID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的需求ID", nil))
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", nil))
		return
	}

	// Validate status
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

	// Check permission based on status transition
	userRole, _ := c.Get("user_role")
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	// Only project managers can approve/reject
	if (req.Status == string(models.RequirementStatusApproved) || req.Status == string(models.RequirementStatusRejected)) {
		if roleStr != "admin" && roleStr != "project_manager" {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "只有项目经理可以审批需求", nil))
			return
		}
	}

	oldStatus := requirement.Status

	// Update status
	err = h.db.Requirements().UpdateStatus(c.Request.Context(), requirementID, req.Status, userID)
	if err != nil {
		log.Printf("Error updating requirement status: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "更新需求状态失败", nil))
		return
	}

	// Create history record
	fieldName := "status"
	history := &models.RequirementHistory{
		RequirementID: requirementID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionStatusChanged),
		FieldName:     &fieldName,
		OldValue:      &oldStatus,
		NewValue:      &req.Status,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "需求状态更新成功"))
}

// GetRequirementStats handles GET /api/v1/requirements/stats
func (h *RequirementHandler) GetRequirementStats(c *gin.Context) {
	userID := c.GetInt("user_id")
	userRole, _ := c.Get("user_role")

	// Determine enterprise filter
	var enterpriseIDPtr *int
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	// System users see all stats, company users see only their enterprise
	if roleStr != "admin" && roleStr != "super_admin" {
		user, err := h.db.Users().GetByID(c.Request.Context(), userID)
		if err == nil && user.CompanyID != nil {
			enterpriseIDPtr = user.CompanyID
		}
	}

	// Get statistics
	stats, err := h.db.Requirements().GetStats(c.Request.Context(), enterpriseIDPtr)
	if err != nil {
		log.Printf("Error getting requirement stats: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求统计失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(stats, "获取需求统计成功"))
}
