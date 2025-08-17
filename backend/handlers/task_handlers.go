package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// TaskHandler 任务处理器
type TaskHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewTaskHandler 创建任务处理器
func NewTaskHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *TaskHandler {
	return &TaskHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetTasks 获取任务列表
func (h *TaskHandler) GetTasks(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination and filter parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Get tasks from database
	tasks, total, err := h.db.Tasks().GetByProjectID(c.Request.Context(), projectID, pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       tasks,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetAllTasks 获取所有任务列表（跨项目）
func (h *TaskHandler) GetAllTasks(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Get all tasks from database
	tasks, total, err := h.db.Tasks().GetAll(c.Request.Context(), pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting all tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       tasks,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "All tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetTask 获取单个任务
func (h *TaskHandler) GetTask(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting task: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(task, "Task retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateTask 创建任务
func (h *TaskHandler) CreateTask(c *gin.Context) {
	var req models.TaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate required fields
	if req.Title == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Task title is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Use due date directly from request
	var dueDate *time.Time
	if req.DueDate != nil {
		dueDate = req.DueDate
	}

	// Set default values
	status := req.Status
	if status == "" {
		status = "todo"
	}
	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}

	// Create task model - need to get project ID from URL or request
	var projectID int
	if req.ParentID != nil {
		// If it's a subtask, inherit project from parent
		parent, err := h.db.Tasks().GetByID(c.Request.Context(), *req.ParentID)
		if err == nil && parent != nil {
			projectID = parent.ProjectID
		}
	}
	
	// Try to get project ID from URL parameter if not set
	if projectID == 0 {
		if projectIDStr := c.Param("projectId"); projectIDStr != "" {
			if pid, err := strconv.Atoi(projectIDStr); err == nil {
				projectID = pid
			}
		}
	}
	
	task := &models.Task{
		Title:       req.Title,
		Description: req.Description,
		Status:      status,
		Priority:    priority,
		ProjectID:   projectID,
		AssigneeID:  req.AssigneeID,
		ParentID:    req.ParentID,
		DueDate:     dueDate,
		Tags:        req.Tags,
	}

	// Validate task
	if err := h.validator.Struct(task); err != nil {
		h.logger.Printf("Task validation failed: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Create task in database
	createdTask, err := h.db.Tasks().Create(c.Request.Context(), task)
	if err != nil {
		h.logger.Printf("Error creating task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdTask, "Task created successfully")
	c.JSON(http.StatusCreated, response)
}

// UpdateTask 更新任务
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.TaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing task
	existing, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting task for update: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Update fields
	if req.Title != "" {
		existing.Title = req.Title
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Status != "" {
		existing.Status = req.Status
	}
	if req.Priority != "" {
		existing.Priority = req.Priority
	}
	if req.AssigneeID != nil {
		existing.AssigneeID = req.AssigneeID
	}
	if req.ParentID != nil {
		existing.ParentID = req.ParentID
	}
	if req.Tags != nil {
		existing.Tags = req.Tags
	}

	// Update due date
	if req.DueDate != nil {
		existing.DueDate = req.DueDate
	}

	// Validate updated task
	if err := h.validator.Struct(existing); err != nil {
		h.logger.Printf("Task validation failed: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Update in database
	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), existing)
	if err != nil {
		h.logger.Printf("Error updating task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedTask, "Task updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteTask 删除任务
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.db.Tasks().Delete(c.Request.Context(), taskID)
	if err != nil {
		if err.Error() == "task not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error deleting task: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete task", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(nil, "Task deleted successfully")
	c.JSON(http.StatusOK, response)
}