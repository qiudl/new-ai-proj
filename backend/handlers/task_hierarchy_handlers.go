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

// TaskHierarchyHandler 任务层次结构处理器
type TaskHierarchyHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewTaskHierarchyHandler 创建任务层次结构处理器
func NewTaskHierarchyHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *TaskHierarchyHandler {
	return &TaskHierarchyHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetTaskTree 获取任务树结构
func (h *TaskHierarchyHandler) GetTaskTree(c *gin.Context) {
	
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get task tree from database
	taskTree, err := h.db.Tasks().GetTaskTree(c.Request.Context(), projectID)
	if err != nil {
		h.logger.Printf("Error getting task tree: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task tree", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(taskTree, "Task tree retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetRootTasks 获取根任务列表（没有父任务的任务）
func (h *TaskHierarchyHandler) GetRootTasks(c *gin.Context) {
	
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

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

	// Get root tasks from database
	tasks, total, err := h.db.Tasks().GetRootTasks(c.Request.Context(), projectID, pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting root tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve root tasks", nil)
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

	response := models.NewSuccessResponse(paginatedResponse, "Root tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// SearchParentTasks 搜索可用作父任务的任务列表
func (h *TaskHierarchyHandler) SearchParentTasks(c *gin.Context) {
	query := c.Query("query")
	// Allow empty query - return all potential parent tasks when no search term provided

	// Get project ID from path parameter
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	currentTaskIDStr := c.Query("current_task_id")
	var currentTaskID *int
	if currentTaskIDStr != "" {
		if ctid, err := strconv.Atoi(currentTaskIDStr); err == nil {
			currentTaskID = &ctid
		}
	}

	// Search for potential parent tasks - use default values for missing parameters
	excludeTaskIDs := []int{}
	if currentTaskID != nil {
		excludeTaskIDs = append(excludeTaskIDs, *currentTaskID)
	}
	
	searchProjectID := projectID
	
	tasks, _, err := h.db.Tasks().SearchParentTasks(c.Request.Context(), searchProjectID, query, excludeTaskIDs, 5, 50, 0)
	if err != nil {
		h.logger.Printf("Error searching parent tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to search parent tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(tasks, "Parent tasks search completed successfully")
	c.JSON(http.StatusOK, response)
}

// GetTaskChildren 获取任务的子任务列表
func (h *TaskHierarchyHandler) GetTaskChildren(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

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

	// Get child tasks from database
	children, err := h.db.Tasks().GetChildren(c.Request.Context(), taskID)
	if err != nil {
		h.logger.Printf("Error getting task children: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task children", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	
	// Since GetChildren doesn't support pagination, we'll simulate it
	total := len(children)
	start := offset
	end := start + pagination.PageSize
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}
	
	paginatedChildren := children[start:end]

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
		Data:       paginatedChildren,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Task children retrieved successfully")
	c.JSON(http.StatusOK, response)
}