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

// GetRequirements godoc
// @Summary Get requirements list
// @Description Get paginated list of requirements with filtering and sorting
// @Tags requirements
// @Accept json
// @Produce json
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param search query string false "Search in title/description"
// @Param status query string false "Filter by status (draft, pending, reviewing, need_more_info, approved, rejected, converted, archived)"
// @Param priority query string false "Filter by priority (low, medium, high, critical)"
// @Param category query string false "Filter by category"
// @Param submitter_id query int false "Filter by submitter user ID"
// @Param reviewer_id query int false "Filter by reviewer user ID"
// @Param project_id query int false "Filter by project ID"
// @Param sort_by query string false "Sort field (created_at, updated_at, priority, status)" default(created_at)
// @Param sort_order query string false "Sort order (asc, desc)" default(desc)
// @Success 200 {object} models.APIResponse{data=models.RequirementListResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements [get]
// @Security BearerAuth
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

// CreateRequirement godoc
// @Summary Create new requirement
// @Description Create a new requirement in the system
// @Tags requirements
// @Accept json
// @Produce json
// @Param request body models.CreateRequirementRequest true "Requirement data"
// @Success 201 {object} models.APIResponse{data=models.RequirementResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements [post]
// @Security BearerAuth
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

	// Determine enterprise ID
	var enterpriseID int
	if user.CompanyID == nil {
		// System admin without company association
		if user.UserType == "system" && req.EnterpriseID != nil {
			// System admin can specify enterprise_id in request
			enterpriseID = *req.EnterpriseID
		} else if user.UserType == "system" {
			// System admin must specify enterprise_id
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "系统管理员创建需求时必须指定企业ID", nil))
			return
		} else {
			// Regular user must have company association
			c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "用户未关联企业，无法创建需求", nil))
			return
		}
	} else {
		// User has company association, use it
		enterpriseID = *user.CompanyID
	}

	// Create requirement object
	requirement := &models.Requirement{
		Title:              req.Title,
		Description:        req.Description,
		ProjectID:          req.ProjectID,
		EnterpriseID:       enterpriseID,
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

// GetRequirement godoc
// @Summary Get requirement by ID
// @Description Get detailed information about a specific requirement
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Success 200 {object} models.APIResponse{data=models.RequirementResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id} [get]
// @Security BearerAuth
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

// UpdateRequirement godoc
// @Summary Update requirement
// @Description Update an existing requirement (only submitter or admin can update)
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body models.UpdateRequirementRequest true "Update data"
// @Success 200 {object} models.APIResponse{data=models.RequirementResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id} [put]
// @Security BearerAuth
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

// DeleteRequirement godoc
// @Summary Delete requirement
// @Description Delete a requirement (only submitter or admin can delete)
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id} [delete]
// @Security BearerAuth
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

	// Soft delete requirement
	err = h.db.Requirements().Delete(c.Request.Context(), requirementID, userID)
	if err != nil {
		log.Printf("Error deleting requirement: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "删除需求失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "需求已移至回收站"))
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

// GetRequirementStats godoc
// @Summary Get requirement statistics
// @Description Get statistical overview of requirements (grouped by status, priority, etc.)
// @Tags requirements
// @Accept json
// @Produce json
// @Success 200 {object} models.APIResponse{data=models.RequirementStats}
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/stats [get]
// @Security BearerAuth
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

// ConvertRequirementToTask godoc
// @Summary Convert requirement to task
// @Description Convert an approved requirement into a task (only approved requirements can be converted)
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body models.ConvertToTaskRequest true "Conversion options"
// @Success 200 {object} models.APIResponse{data=object{task_id=int,task_title=string,requirement_id=int,message=string}}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/convert-to-task [post]
// @Security BearerAuth
func (h *RequirementHandler) ConvertRequirementToTask(c *gin.Context) {
	userID := c.GetInt("user_id")

	// Parse requirement ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的需求ID", nil))
		return
	}

	// Parse request body
	var req models.ConvertToTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "请求数据格式错误", err.Error()))
		return
	}

	ctx := c.Request.Context()

	// Get requirement
	requirement, err := h.db.Requirements().GetByID(ctx, requirementID)
	if err != nil {
		log.Printf("Error getting requirement %d: %v", requirementID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求失败", nil))
		return
	}
	if requirement == nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// Check if already converted
	if requirement.ConvertedTaskID != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation,
			fmt.Sprintf("该需求已转换为任务 (任务ID: %d)", *requirement.ConvertedTaskID), nil))
		return
	}

	// Verify requirement is approved
	if requirement.Status != string(models.RequirementStatusApproved) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation,
			"只有已通过评审的需求才能转换为任务", map[string]interface{}{
				"current_status": requirement.Status,
				"required_status": "approved",
			}))
		return
	}

	// Prepare task data
	projectID := req.ProjectID
	if projectID == nil {
		projectID = requirement.ProjectID
	}
	if projectID == nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "请指定任务所属项目", nil))
		return
	}

	// Task title: use provided or default to requirement title
	taskTitle := requirement.Title
	if req.TaskTitle != nil && *req.TaskTitle != "" {
		taskTitle = *req.TaskTitle
	}

	// Task description: combine requirement info
	taskDescription := ""
	if req.Description != nil {
		taskDescription = *req.Description
	} else {
		// Auto-generate description from requirement
		taskDescription = fmt.Sprintf("## 需求来源\n需求编号: %s\n\n", requirement.DisplayID)
		if requirement.Description != nil {
			taskDescription += fmt.Sprintf("## 需求描述\n%s\n\n", *requirement.Description)
		}
		if requirement.AcceptanceCriteria != nil {
			taskDescription += fmt.Sprintf("## 验收标准\n%s\n\n", *requirement.AcceptanceCriteria)
		}
		if requirement.BusinessValue != nil {
			taskDescription += fmt.Sprintf("## 商业价值\n%s\n", *requirement.BusinessValue)
		}
	}

	// Task priority
	taskPriority := "medium"
	if req.Priority != nil {
		taskPriority = *req.Priority
	} else if requirement.Priority != "" {
		taskPriority = requirement.Priority
	}

	// Create task
	task := &models.Task{
		Title:              taskTitle,
		Description:        &taskDescription,
		ProjectID:          *projectID,
		Status:             "todo",
		Priority:           taskPriority,
		CustomFields:       models.CustomFields{}, // Initialize empty JSON fields
		Dependencies:       models.Dependencies{}, // Initialize empty dependencies
		Tags:               models.Tags{},         // Initialize empty tags
		TimeTrackingMode:   "manual",              // Set default time tracking mode
		TimeUnitPreference: "auto",                // Set default time unit preference
		WorkHoursPerDay:    8.0,                   // Set default work hours per day
		TaskLevel:          0,                     // Set default task level
		EstimatedMinutes:   0,                     // Set default estimated minutes
		ActualMinutes:      0,                     // Set default actual minutes
	}

	if req.AssigneeID != nil {
		task.AssigneeID = req.AssigneeID
	}

	if req.DueDate != nil {
		task.DueDate = req.DueDate
	} else if requirement.DueDate != nil {
		task.DueDate = requirement.DueDate
	}

	// Create task in database
	createdTask, err := h.db.Tasks().Create(ctx, task)
	if err != nil {
		log.Printf("Error creating task from requirement %d: %v", requirementID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建任务失败", nil))
		return
	}

	// Create requirement-task link using raw SQL
	linkComment := ""
	if req.LinkRequirement {
		linkComment = "需求自动转换为任务"
	}

	insertQuery := `
		INSERT INTO requirement_tasks (
			requirement_id, task_id, link_type, linked_by, link_comment, created_at, updated_at
		) VALUES ($1, $2, $3, $4, NULLIF($5, ''), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`

	executor, ok := h.db.GetDB().(database.DBExecutor)
	if !ok {
		log.Printf("Error getting database executor for requirement-task link creation")
		// Continue even if link creation fails
	} else {
		_, err = executor.ExecContext(
			ctx,
			insertQuery,
			requirementID,
			createdTask.ID,
			string(models.RequirementTaskLinkConverted),
			userID,
			linkComment,
		)
		if err != nil {
			log.Printf("Error creating requirement-task link: requirement=%d, task=%d, error=%v",
				requirementID, createdTask.ID, err)
			// Continue even if link creation fails
		}
	}

	// Update requirement status and converted fields using SetConvertedTask
	err = h.db.Requirements().SetConvertedTask(ctx, requirementID, createdTask.ID, userID)
	if err != nil {
		log.Printf("Error updating requirement %d after conversion: %v", requirementID, err)
		// Continue even if update fails - task is created
	}

	// TODO: Create subtasks if requested
	// This would be implemented based on req.CreateSubtasks flag

	// Return success response
	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"task_id":        createdTask.ID,
		"task_title":     createdTask.Title,
		"requirement_id": requirementID,
		"message":        "需求已成功转换为任务",
	}, "需求转换成功"))
}
