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

// TaskUpdateHandler 任务更新处理器
type TaskUpdateHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewTaskUpdateHandler 创建任务更新处理器
func NewTaskUpdateHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *TaskUpdateHandler {
	return &TaskUpdateHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetTaskUpdates 获取任务更新记录
func (h *TaskUpdateHandler) GetTaskUpdates(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Get task updates from database
	updates, total, err := h.db.Tasks().GetTaskUpdates(c.Request.Context(), taskID, limit, offset)
	if err != nil {
		h.logger.Printf("Error getting task updates for task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get task updates", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Return paginated response
	response := models.NewSuccessResponse(map[string]interface{}{
		"updates": updates,
		"total":   total,
		"page":    page,
		"limit":   limit,
	}, "Task updates retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateTaskUpdate 更新任务更新记录
func (h *TaskUpdateHandler) UpdateTaskUpdate(c *gin.Context) {
	updateIDStr := c.Param("update_id")
	updateID, err := strconv.Atoi(updateIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid update ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		Notes string `json:"notes" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Update task update notes
	err = h.db.Tasks().UpdateTaskUpdateNotes(c.Request.Context(), updateID, req.Notes)
	if err != nil {
		h.logger.Printf("Error updating task update %d: %v", updateID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update task update", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Task update updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteTaskUpdate 删除任务更新记录
func (h *TaskUpdateHandler) DeleteTaskUpdate(c *gin.Context) {
	updateIDStr := c.Param("update_id")
	updateID, err := strconv.Atoi(updateIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid update ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Delete task update
	err = h.db.Tasks().DeleteTaskUpdate(c.Request.Context(), updateID)
	if err != nil {
		h.logger.Printf("Error deleting task update %d: %v", updateID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete task update", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Task update deleted successfully")
	c.JSON(http.StatusOK, response)
}

// GetTaskTimeline 获取任务时间线
func (h *TaskUpdateHandler) GetTaskTimeline(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	offset := (page - 1) * limit

	// Get task timeline from database
	events, total, err := h.db.Tasks().GetTaskTimeline(c.Request.Context(), taskID, limit, offset)
	if err != nil {
		h.logger.Printf("Error getting task timeline for task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get task timeline", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Return paginated response
	response := models.NewSuccessResponse(map[string]interface{}{
		"events": events,
		"total":  total,
		"page":   page,
		"limit":  limit,
	}, "Task timeline retrieved successfully")
	c.JSON(http.StatusOK, response)
} // Force rebuild Sun Aug 17 22:42:39 CST 2025
