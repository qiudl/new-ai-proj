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
	
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	// Parse query parameters (for future implementation)
	search := c.Query("search")
	status := c.Query("status")
	assigneeID := c.Query("assignee_id")
	priority := c.Query("priority")
	sortBy := c.DefaultQuery("sort_by", "updated_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	_ = search
	_ = status
	_ = assigneeID
	_ = priority
	_ = sortBy
	_ = sortOrder

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 50
	}

	offset := (page - 1) * pageSize

	tasks, total, err := h.db.Tasks().GetByProjectID(c.Request.Context(), projectID, pageSize, offset)
	if err != nil {
		log.Printf("Error getting tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务列表失败", nil))
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
	userID := c.GetInt("user_id") // For future implementation
	_ = userID
	
	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	// Parse query parameters (for future implementation)
	search := c.Query("search")
	status := c.Query("status")
	projectID := c.Query("project_id")
	assigneeID := c.Query("assignee_id")
	priority := c.Query("priority")
	sortBy := c.DefaultQuery("sort_by", "updated_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")
	_ = search
	_ = status
	_ = projectID
	_ = assigneeID
	_ = priority
	_ = sortBy
	_ = sortOrder

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 50
	}

	offset := (page - 1) * pageSize


	tasks, total, err := h.db.Tasks().GetAll(c.Request.Context(), pageSize, offset)
	if err != nil {
		log.Printf("Error getting all tasks: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务列表失败", nil))
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
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	userID := c.GetInt("user_id") // For future implementation
	_ = userID

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
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
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
		Status:        req.Status,
		Priority:      req.Priority,
		ProjectID:     projectID,
		AssigneeID:    req.AssigneeID,
		ParentID:      req.ParentID,
		DueDate:       dueDate,
	}

	if len(customFieldsJSON) > 0 {
		task.CustomFields = models.CustomFields{}
		if err := json.Unmarshal(customFieldsJSON, &task.CustomFields); err == nil {
			// CustomFields successfully unmarshaled
		}
	}

	createdTask, err := h.db.Tasks().Create(c.Request.Context(), task)
	if err != nil {
		log.Printf("Error creating task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建任务失败", nil))
		return
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(createdTask.ToResponse(), "任务创建成功"))
}

// BulkImportTasks handles POST /api/v1/projects/:projectId/tasks/bulk-import
func (h *TaskHandler) BulkImportTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	userID := c.GetInt("user_id") // For future implementation
	_ = userID

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
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
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
			Title:       taskReq.Title,
			Description: taskReq.Description,
			Status:      taskReq.Status,
			Priority:    taskReq.Priority,
			ProjectID:   projectID,
			AssigneeID:  taskReq.AssigneeID,
			ParentID:    taskReq.ParentID,
			DueDate:     dueDate,
		}

		if len(customFieldsJSON) > 0 {
			task.CustomFields = models.CustomFields{}
			if err := json.Unmarshal(customFieldsJSON, &task.CustomFields); err == nil {
				// CustomFields successfully unmarshaled
			}
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
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeInternal, "任务不存在", nil))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		}
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(task.ToResponse(), "获取任务成功"))
}

// UpdateTask handles PUT /api/v1/projects/:projectId/tasks/:id
func (h *TaskHandler) UpdateTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
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
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
		return
	}

	// Get existing task
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeInternal, "任务不存在", nil))
		} else {
			log.Printf("Error getting task: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取任务失败", nil))
		}
		return
	}

	// Update fields
	task.Title = req.Title
	task.Description = req.Description
	task.Status = req.Status
	task.Priority = req.Priority
	task.AssigneeID = req.AssigneeID
	task.ParentID = req.ParentID

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
			var customFields models.CustomFields
			if err := json.Unmarshal(customFieldsJSON, &customFields); err == nil {
				task.CustomFields = customFields
			}
		}
	}

	updatedTask, err := h.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		log.Printf("Error updating task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "更新任务失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(updatedTask.ToResponse(), "任务更新成功"))
}

// DeleteTask handles DELETE /api/v1/projects/:projectId/tasks/:id
func (h *TaskHandler) DeleteTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	err = h.db.Tasks().Delete(c.Request.Context(), taskID)
	if err != nil {
		log.Printf("Error deleting task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "删除任务失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "任务删除成功"))
}

// GetTaskTree handles GET /api/v1/projects/:projectId/tasks/tree
func (h *TaskHandler) GetTaskTree(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	// TODO: Implement GetTree method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetRootTasks handles GET /api/v1/projects/:projectId/tasks/roots
func (h *TaskHandler) GetRootTasks(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
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

	_ = (page - 1) * pageSize // offset for future implementation

	// TODO: Implement GetRoots method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// SearchParentTasks handles GET /api/v1/projects/:projectId/tasks/search-parents
func (h *TaskHandler) SearchParentTasks(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的项目ID", nil))
		return
	}

	_ = c.Query("query")      // query for future implementation
	_ = c.Query("exclude_id") // excludeID for future implementation

	// TODO: Implement SearchParents method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetTaskChildren handles GET /api/v1/projects/:projectId/tasks/:id/children
func (h *TaskHandler) GetTaskChildren(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id")) // taskID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	// TODO: Implement GetChildren method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetTaskUpdates handles GET /api/v1/projects/:projectId/tasks/:id/updates
func (h *TaskHandler) GetTaskUpdates(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id")) // taskID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
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

	_ = (page - 1) * pageSize // offset for future implementation

	// TODO: Implement GetUpdates method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))}

// UpdateTaskUpdate handles PUT /api/v1/projects/:projectId/tasks/:id/updates/:updateId
func (h *TaskHandler) UpdateTaskUpdate(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("updateId")) // updateID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的更新ID", nil))
		return
	}

	var req struct {
		Notes string `json:"notes" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
		return
	}

	// TODO: Implement UpdateUpdate method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// DeleteTaskUpdate handles DELETE /api/v1/projects/:projectId/tasks/:id/updates/:updateId
func (h *TaskHandler) DeleteTaskUpdate(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("updateId")) // updateID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的更新ID", nil))
		return
	}

	// TODO: Implement DeleteUpdate method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// GetTaskTimeline handles GET /api/v1/projects/:projectId/tasks/:id/timeline
func (h *TaskHandler) GetTaskTimeline(c *gin.Context) {
	_, err := strconv.Atoi(c.Param("id")) // taskID for future implementation
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "无效的任务ID", nil))
		return
	}

	// Parse query parameters (for future implementation)
	_ = c.DefaultQuery("limit", "20")
	_ = c.DefaultQuery("offset", "0")

	// TODO: Implement GetTimeline method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}

// ValidateParent handles POST /api/v1/projects/:projectId/tasks/validate-parent
func (h *TaskHandler) ValidateParent(c *gin.Context) {
	var req struct {
		ParentID int `json:"parent_id" binding:"required"`
		ChildID  int `json:"child_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeInternal, "请求数据格式错误", nil))
		return
	}

	// TODO: Implement ValidateParentChild method in TaskRepository
	c.JSON(http.StatusNotImplemented, models.NewErrorResponse("NOT_IMPLEMENTED", "功能暂未实现", nil))
}