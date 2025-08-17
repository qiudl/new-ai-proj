package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// TaskHandler handles all task-related operations
type TaskHandler struct {
	db database.DB
}

// NewTaskHandler creates a new task handler
func NewTaskHandler(db database.DB, logger *log.Logger, validate interface{}) *TaskHandler {
	return &TaskHandler{db: db}
}

// GetTasks handles GET /api/v1/projects/:projectId/tasks
func (h *TaskHandler) GetTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	search := c.Query("search")
	status := c.Query("status")
	assigneeID := c.Query("assignee_id")
	priority := c.Query("priority")
	sortBy := c.DefaultQuery("sort_by", "updated_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 50
	}

	offset := (page - 1) * pageSize

	filters := map[string]interface{}{
		"search":      search,
		"status":      status,
		"assignee_id": assigneeID,
		"priority":    priority,
	}

	tasks, total, err := h.db.Tasks().GetByProject(c.Request.Context(), projectID, offset, pageSize, filters, sortBy, sortOrder)
	if err != nil {
		log.Printf("Error getting tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取任务列表失败"))
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	responseData := map[string]interface{}{
		"data": tasks,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取任务列表成功"))
}

// GetAllTasks handles GET /api/v1/tasks
func (h *TaskHandler) GetAllTasks(c *gin.Context) {
	userID := c.GetInt("user_id")
	
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	search := c.Query("search")
	status := c.Query("status")
	projectID := c.Query("project_id")
	assigneeID := c.Query("assignee_id")
	priority := c.Query("priority")
	sortBy := c.DefaultQuery("sort_by", "updated_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 50
	}

	offset := (page - 1) * pageSize

	filters := map[string]interface{}{
		"search":      search,
		"status":      status,
		"project_id":  projectID,
		"assignee_id": assigneeID,
		"priority":    priority,
		"user_id":     userID, // For access control
	}

	tasks, total, err := h.db.Tasks().GetAll(c.Request.Context(), offset, pageSize, filters, sortBy, sortOrder)
	if err != nil {
		log.Printf("Error getting all tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取任务列表失败"))
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	responseData := map[string]interface{}{
		"data": tasks,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取任务列表成功"))
}

// CreateTask handles POST /api/v1/projects/:projectId/tasks
func (h *TaskHandler) CreateTask(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	userID := c.GetInt("user_id")

	var req struct {
		Title         string                 `json:"title" binding:"required,min=1,max=255"`
		Description   string                 `json:"description"`
		Status        string                 `json:"status"`
		Priority      string                 `json:"priority"`
		AssigneeID    *int                   `json:"assignee_id"`
		ParentID      *int                   `json:"parent_id"`
		DueDate       *string                `json:"due_date"`
		Tags          []string               `json:"tags"`
		CustomFields  map[string]interface{} `json:"custom_fields"`
		EstimatedTime *int                   `json:"estimated_time"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	// Parse due date
	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02T15:04:05Z", *req.DueDate); err == nil {
			dueDate = &parsed
		} else if parsed, err := time.Parse("2006-01-02", *req.DueDate); err == nil {
			dueDate = &parsed
		}
	}

	// Convert custom fields to JSON
	var customFieldsJSON []byte
	if req.CustomFields != nil {
		customFieldsJSON, _ = json.Marshal(req.CustomFields)
	}

	task := &models.Task{
		Title:         req.Title,
		Description:   req.Description,
		Status:        models.TaskStatus(req.Status),
		Priority:      models.TaskPriority(req.Priority),
		ProjectID:     projectID,
		AssigneeID:    req.AssigneeID,
		ParentID:      req.ParentID,
		DueDate:       dueDate,
		EstimatedTime: req.EstimatedTime,
		CreatedBy:     userID,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if len(customFieldsJSON) > 0 {
		task.CustomFields = customFieldsJSON
	}

	createdTask, err := h.db.Tasks().Create(c.Request.Context(), task)
	if err != nil {
		log.Printf("Error creating task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("创建任务失败"))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(createdTask.ToResponse(), "任务创建成功"))
}

// BulkImportTasks handles POST /api/v1/projects/:projectId/tasks/bulk-import
func (h *TaskHandler) BulkImportTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	userID := c.GetInt("user_id")

	var req struct {
		Tasks []struct {
			Title         string                 `json:"title" binding:"required"`
			Description   string                 `json:"description"`
			Status        string                 `json:"status"`
			Priority      string                 `json:"priority"`
			AssigneeID    *int                   `json:"assignee_id"`
			ParentID      *int                   `json:"parent_id"`
			DueDate       *string                `json:"due_date"`
			CustomFields  map[string]interface{} `json:"custom_fields"`
			EstimatedTime *int                   `json:"estimated_time"`
		} `json:"tasks" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	var createdTasks []models.TaskResponse
	var errors []string

	for i, taskReq := range req.Tasks {
		// Parse due date
		var dueDate *time.Time
		if taskReq.DueDate != nil && *taskReq.DueDate != "" {
			if parsed, err := time.Parse("2006-01-02T15:04:05Z", *taskReq.DueDate); err == nil {
				dueDate = &parsed
			} else if parsed, err := time.Parse("2006-01-02", *taskReq.DueDate); err == nil {
				dueDate = &parsed
			}
		}

		// Convert custom fields to JSON
		var customFieldsJSON []byte
		if taskReq.CustomFields != nil {
			customFieldsJSON, _ = json.Marshal(taskReq.CustomFields)
		}

		task := &models.Task{
			Title:         taskReq.Title,
			Description:   taskReq.Description,
			Status:        models.TaskStatus(taskReq.Status),
			Priority:      models.TaskPriority(taskReq.Priority),
			ProjectID:     projectID,
			AssigneeID:    taskReq.AssigneeID,
			ParentID:      taskReq.ParentID,
			DueDate:       dueDate,
			EstimatedTime: taskReq.EstimatedTime,
			CreatedBy:     userID,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		if len(customFieldsJSON) > 0 {
			task.CustomFields = customFieldsJSON
		}

		createdTask, err := h.db.Tasks().Create(c.Request.Context(), task)
		if err != nil {
			errors = append(errors, fmt.Sprintf("任务 %d: %v", i+1, err))
			continue
		}

		createdTasks = append(createdTasks, createdTask.ToResponse())
	}

	responseData := map[string]interface{}{
		"created_tasks": createdTasks,
		"created_count": len(createdTasks),
		"total_count":   len(req.Tasks),
		"errors":        errors,
	}

	message := fmt.Sprintf("批量导入完成，成功创建 %d/%d 个任务", len(createdTasks), len(req.Tasks))
	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, message))
}

// GetTask handles GET /api/v1/projects/:projectId/tasks/:id
func (h *TaskHandler) GetTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的任务ID"))
		return
	}

	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse("任务不存在"))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取任务失败"))
		}
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(task.ToResponse(), "获取任务成功"))
}

// UpdateTask handles PUT /api/v1/projects/:projectId/tasks/:id
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的任务ID"))
		return
	}

	var req struct {
		Title         string                 `json:"title" binding:"required,min=1,max=255"`
		Description   string                 `json:"description"`
		Status        string                 `json:"status"`
		Priority      string                 `json:"priority"`
		AssigneeID    *int                   `json:"assignee_id"`
		ParentID      *int                   `json:"parent_id"`
		DueDate       *string                `json:"due_date"`
		CustomFields  map[string]interface{} `json:"custom_fields"`
		EstimatedTime *int                   `json:"estimated_time"`
		ActualTime    *int                   `json:"actual_time"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	// Get existing task
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse("任务不存在"))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取任务失败"))
		}
		return
	}

	// Update fields
	task.Title = req.Title
	task.Description = req.Description
	task.Status = models.TaskStatus(req.Status)
	task.Priority = models.TaskPriority(req.Priority)
	task.AssigneeID = req.AssigneeID
	task.ParentID = req.ParentID
	task.EstimatedTime = req.EstimatedTime
	task.ActualTime = req.ActualTime
	task.UpdatedAt = time.Now()

	// Parse due date
	if req.DueDate != nil && *req.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02T15:04:05Z", *req.DueDate); err == nil {
			task.DueDate = &parsed
		} else if parsed, err := time.Parse("2006-01-02", *req.DueDate); err == nil {
			task.DueDate = &parsed
		}
	} else {
		task.DueDate = nil
	}

	// Convert custom fields to JSON
	if req.CustomFields != nil {
		if customFieldsJSON, err := json.Marshal(req.CustomFields); err == nil {
			task.CustomFields = customFieldsJSON
		}
	}

	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		log.Printf("Error updating task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("更新任务失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask.ToResponse(), "任务更新成功"))
}

// DeleteTask handles DELETE /api/v1/projects/:projectId/tasks/:id
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的任务ID"))
		return
	}

	err = h.db.Tasks().Delete(c.Request.Context(), taskID)
	if err != nil {
		log.Printf("Error deleting task: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("删除任务失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "任务删除成功"))
}

// GetTaskTree handles GET /api/v1/projects/:projectId/tasks/tree
func (h *TaskHandler) GetTaskTree(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	tree, err := h.db.Tasks().GetTree(c.Request.Context(), projectID)
	if err != nil {
		log.Printf("Error getting task tree: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取任务树失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(tree, "获取任务树成功"))
}

// GetRootTasks handles GET /api/v1/projects/:projectId/tasks/roots
func (h *TaskHandler) GetRootTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
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

	offset := (page - 1) * pageSize

	tasks, total, err := h.db.Tasks().GetRoots(c.Request.Context(), projectID, offset, pageSize)
	if err != nil {
		log.Printf("Error getting root tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取根任务失败"))
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	responseData := map[string]interface{}{
		"data": tasks,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取根任务成功"))
}

// SearchParentTasks handles GET /api/v1/projects/:projectId/tasks/search-parents
func (h *TaskHandler) SearchParentTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的项目ID"))
		return
	}

	query := c.Query("query")
	excludeID := c.Query("exclude_id")

	var excludeIDInt *int
	if excludeID != "" {
		if id, err := strconv.Atoi(excludeID); err == nil {
			excludeIDInt = &id
		}
	}

	tasks, err := h.db.Tasks().SearchParents(c.Request.Context(), projectID, query, excludeIDInt)
	if err != nil {
		log.Printf("Error searching parent tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("搜索父任务失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(tasks, "搜索父任务成功"))
}

// GetTaskChildren handles GET /api/v1/projects/:projectId/tasks/:id/children
func (h *TaskHandler) GetTaskChildren(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的任务ID"))
		return
	}

	children, err := h.db.Tasks().GetChildren(c.Request.Context(), taskID)
	if err != nil {
		log.Printf("Error getting task children: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取子任务失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(children, "获取子任务成功"))
}

// GetTaskUpdates handles GET /api/v1/projects/:projectId/tasks/:id/updates
func (h *TaskHandler) GetTaskUpdates(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的任务ID"))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	updates, total, err := h.db.Tasks().GetUpdates(c.Request.Context(), taskID, offset, pageSize)
	if err != nil {
		log.Printf("Error getting task updates: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取任务更新失败"))
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	responseData := map[string]interface{}{
		"data": updates,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, "获取任务更新成功"))
}

// UpdateTaskUpdate handles PUT /api/v1/projects/:projectId/tasks/:id/updates/:updateId
func (h *TaskHandler) UpdateTaskUpdate(c *gin.Context) {
	updateID, err := strconv.Atoi(c.Param("updateId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的更新ID"))
		return
	}

	var req struct {
		Notes string `json:"notes" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	err = h.db.Tasks().UpdateUpdate(c.Request.Context(), updateID, req.Notes)
	if err != nil {
		log.Printf("Error updating task update: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("更新任务更新失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "任务更新更新成功"))
}

// DeleteTaskUpdate handles DELETE /api/v1/projects/:projectId/tasks/:id/updates/:updateId
func (h *TaskHandler) DeleteTaskUpdate(c *gin.Context) {
	updateID, err := strconv.Atoi(c.Param("updateId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的更新ID"))
		return
	}

	err = h.db.Tasks().DeleteUpdate(c.Request.Context(), updateID)
	if err != nil {
		log.Printf("Error deleting task update: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("删除任务更新失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "任务更新删除成功"))
}

// GetTaskTimeline handles GET /api/v1/projects/:projectId/tasks/:id/timeline
func (h *TaskHandler) GetTaskTimeline(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("无效的任务ID"))
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	timeline, err := h.db.Tasks().GetTimeline(c.Request.Context(), taskID, limit, offset)
	if err != nil {
		log.Printf("Error getting task timeline: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("获取任务时间线失败"))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(timeline, "获取任务时间线成功"))
}

// ValidateParent handles POST /api/v1/projects/:projectId/tasks/validate-parent
func (h *TaskHandler) ValidateParent(c *gin.Context) {
	var req struct {
		ParentID int `json:"parent_id" binding:"required"`
		ChildID  int `json:"child_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse("请求数据格式错误"))
		return
	}

	isValid, err := h.db.Tasks().ValidateParentChild(c.Request.Context(), req.ParentID, req.ChildID)
	if err != nil {
		log.Printf("Error validating parent-child relationship: %v", err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse("验证失败"))
		return
	}

	responseData := map[string]interface{}{
		"is_valid": isValid,
	}

	message := "验证成功"
	if !isValid {
		message = "无效的父子关系"
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(responseData, message))
}