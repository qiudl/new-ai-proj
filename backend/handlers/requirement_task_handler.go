package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// RequirementTaskHandler handles requirement-task link operations
type RequirementTaskHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewRequirementTaskHandler creates a new requirement-task link handler
func NewRequirementTaskHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *RequirementTaskHandler {
	return &RequirementTaskHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// LinkTaskToRequirement godoc
// @Summary Link an existing task to a requirement
// @Description Create a manual link between an existing task and a requirement
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body models.CreateRequirementTaskLinkRequest true "Link request"
// @Success 200 {object} models.APIResponse{data=models.RequirementTaskResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/tasks [post]
// @Security Bearer
func (h *RequirementTaskHandler) LinkTaskToRequirement(c *gin.Context) {
	userID := c.GetInt("user_id")

	// Parse requirement ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的需求ID", nil))
		return
	}

	// Parse request body
	var req models.CreateRequirementTaskLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "请求数据格式错误", err.Error()))
		return
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "数据验证失败", err.Error()))
		return
	}

	// Override requirement_id from path parameter
	req.RequirementID = requirementID

	// Set default link type if not provided
	if req.LinkType == "" {
		req.LinkType = string(models.RequirementTaskLinkManual)
	}

	ctx := c.Request.Context()

	// Verify requirement exists
	requirement, err := h.db.Requirements().GetByID(ctx, requirementID)
	if err != nil {
		h.logger.Printf("Error getting requirement %d: %v", requirementID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取需求失败", nil))
		return
	}
	if requirement == nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// Verify task exists
	task, err := h.db.Tasks().GetByID(ctx, req.TaskID)
	if err != nil {
		h.logger.Printf("Error getting task %d: %v", req.TaskID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		return
	}
	if task == nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "任务不存在", nil))
		return
	}

	// Create the link
	link := &models.RequirementTask{
		RequirementID: req.RequirementID,
		TaskID:        req.TaskID,
		LinkType:      req.LinkType,
		LinkedBy:      userID,
		LinkComment:   req.LinkComment,
	}

	createdLink, err := h.db.RequirementTasks().Create(ctx, link)
	if err != nil {
		h.logger.Printf("Error creating requirement-task link: requirement=%d, task=%d, error=%v",
			requirementID, req.TaskID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建关联失败", err.Error()))
		return
	}

	// Get the full link details with joined data
	linkDetails, err := h.db.RequirementTasks().GetByID(ctx, createdLink.ID)
	if err != nil {
		h.logger.Printf("Error getting link details: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取关联详情失败", nil))
		return
	}

	// Return success response
	c.JSON(http.StatusOK, models.NewSuccessResponse(linkDetails, "成功创建需求-任务关联"))
}

// UnlinkTaskFromRequirement godoc
// @Summary Unlink a task from a requirement
// @Description Remove the link between a task and a requirement
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param task_id path int true "Task ID"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/tasks/{task_id} [delete]
// @Security Bearer
func (h *RequirementTaskHandler) UnlinkTaskFromRequirement(c *gin.Context) {
	// Parse requirement ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的需求ID", nil))
		return
	}

	// Parse task ID
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的任务ID", nil))
		return
	}

	ctx := c.Request.Context()

	// Verify link exists
	link, err := h.db.RequirementTasks().GetByRequirementAndTask(ctx, requirementID, taskID)
	if err != nil {
		h.logger.Printf("Error checking link existence: requirement=%d, task=%d, error=%v",
			requirementID, taskID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "检查关联失败", nil))
		return
	}
	if link == nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "关联不存在", nil))
		return
	}

	// Prevent deletion of "converted" type links
	if link.LinkType == string(models.RequirementTaskLinkConverted) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation,
			"无法删除需求转任务的关联，该关联为系统自动创建", nil))
		return
	}

	// Delete the link
	err = h.db.RequirementTasks().DeleteByRequirementAndTask(ctx, requirementID, taskID)
	if err != nil {
		h.logger.Printf("Error deleting link: requirement=%d, task=%d, error=%v",
			requirementID, taskID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "删除关联失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "成功删除需求-任务关联"))
}

// GetRequirementTasks godoc
// @Summary Get tasks linked to a requirement
// @Description Get all tasks that are linked to a specific requirement
// @Tags requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param link_type query string false "Filter by link type (manual, converted, related)"
// @Success 200 {object} models.APIResponse{data=models.RequirementTaskListResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/{id}/tasks [get]
// @Security Bearer
func (h *RequirementTaskHandler) GetRequirementTasks(c *gin.Context) {
	// Parse requirement ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的需求ID", nil))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Parse filters
	linkType := c.Query("link_type")

	ctx := c.Request.Context()

	// Build filters
	filters := &models.RequirementTaskFilters{
		RequirementID: &requirementID,
		Page:          page,
		PageSize:      pageSize,
	}

	if linkType != "" {
		filters.LinkType = []string{linkType}
	}

	// Get links
	response, err := h.db.RequirementTasks().List(ctx, filters)
	if err != nil {
		h.logger.Printf("Error getting requirement tasks: requirement=%d, error=%v", requirementID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取关联任务失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "成功获取需求关联任务"))
}

// GetTaskRequirements godoc
// @Summary Get requirements linked to a task
// @Description Get all requirements that are linked to a specific task
// @Tags tasks
// @Accept json
// @Produce json
// @Param id path int true "Task ID"
// @Param page query int false "Page number (default: 1)"
// @Param page_size query int false "Page size (default: 20, max: 100)"
// @Param link_type query string false "Filter by link type (manual, converted, related)"
// @Success 200 {object} models.APIResponse{data=models.RequirementTaskListResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/tasks/{id}/requirements [get]
// @Security Bearer
func (h *RequirementTaskHandler) GetTaskRequirements(c *gin.Context) {
	// Parse task ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的任务ID", nil))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Parse filters
	linkType := c.Query("link_type")

	ctx := c.Request.Context()

	// Build filters
	filters := &models.RequirementTaskFilters{
		TaskID:   &taskID,
		Page:     page,
		PageSize: pageSize,
	}

	if linkType != "" {
		filters.LinkType = []string{linkType}
	}

	// Get links
	response, err := h.db.RequirementTasks().List(ctx, filters)
	if err != nil {
		h.logger.Printf("Error getting task requirements: task=%d, error=%v", taskID, err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取关联需求失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "成功获取任务关联需求"))
}
