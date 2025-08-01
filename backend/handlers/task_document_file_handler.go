package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// TaskDocumentFileHandler 基于文件的任务文档处理器
type TaskDocumentFileHandler struct {
	DocumentService *services.TaskDocumentFileService
}

// NewTaskDocumentFileHandler 创建新的文档处理器
func NewTaskDocumentFileHandler(documentService *services.TaskDocumentFileService) *TaskDocumentFileHandler {
	return &TaskDocumentFileHandler{
		DocumentService: documentService,
	}
}

// GetTaskDocument 获取任务文档内容
// GET /api/v1/projects/:projectId/tasks/:taskId/document
func (h *TaskDocumentFileHandler) GetTaskDocument(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	content, err := h.DocumentService.ReadTaskDocument(taskID, projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Document not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task_id":    taskID,
			"project_id": projectID,
			"content":    content,
			"format":     "markdown",
		},
	})
}

// GetPersonalTaskDocument 获取个人任务文档内容
// GET /api/v1/user/timer-tasks/:taskId/document
func (h *TaskDocumentFileHandler) GetPersonalTaskDocument(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	content, err := h.DocumentService.ReadPersonalTaskDocument(taskID, uid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Personal document not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task_id": taskID,
			"user_id": uid,
			"content": content,
			"format":  "markdown",
		},
	})
}

// UpdateTaskDocument 更新任务文档内容
// PUT /api/v1/projects/:projectId/tasks/:taskId/document
func (h *TaskDocumentFileHandler) UpdateTaskDocument(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取用户ID用于权限检查
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	
	// 更新文档内容
	if err := h.DocumentService.UpdateDocumentContent(taskID, projectID, req.Content, false, uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update document",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document updated successfully",
	})
}

// UpdatePersonalTaskDocument 更新个人任务文档内容
// PUT /api/v1/user/timer-tasks/:taskId/document
func (h *TaskDocumentFileHandler) UpdatePersonalTaskDocument(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uid := userID.(int)
	
	// 更新个人任务文档内容
	if err := h.DocumentService.UpdateDocumentContent(taskID, 0, req.Content, true, uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update personal document",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Personal document updated successfully",
	})
}

// GetDocumentHistory 获取文档版本历史
// GET /api/v1/projects/:projectId/tasks/:taskId/document/history
func (h *TaskDocumentFileHandler) GetDocumentHistory(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// 检查是否为个人任务
	isPersonal := c.Query("personal") == "true"
	userID := 0
	if isPersonal {
		if uid, exists := c.Get("user_id"); exists {
			userID = uid.(int)
		}
	}

	history, err := h.DocumentService.GetDocumentHistory(taskID, projectID, isPersonal, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get document history",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"task_id":    taskID,
			"project_id": projectID,
			"history":    history,
		},
	})
}

// CompareDocumentVersions 比较文档版本
// GET /api/v1/projects/:projectId/tasks/:taskId/document/compare
func (h *TaskDocumentFileHandler) CompareDocumentVersions(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	fromHash := c.Query("from")
	toHash := c.Query("to")

	if fromHash == "" || toHash == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Both 'from' and 'to' hash parameters are required"})
		return
	}

	// 检查是否为个人任务
	isPersonal := c.Query("personal") == "true"
	userID := 0
	if isPersonal {
		if uid, exists := c.Get("user_id"); exists {
			userID = uid.(int)
		}
	}

	diff, err := h.DocumentService.CompareDocumentVersions(taskID, projectID, fromHash, toHash, isPersonal, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to compare document versions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": diff,
	})
}

// CreateTaskDocumentFromTask 根据任务信息创建文档
// POST /api/v1/projects/:projectId/tasks/:taskId/document/create
func (h *TaskDocumentFileHandler) CreateTaskDocumentFromTask(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	// 这里需要从数据库获取任务信息，但由于我们没有直接的数据库访问
	// 这个方法需要配合现有的任务服务使用
	// 暂时返回成功状态，实际实现需要集成到现有的任务创建流程中
	
	// 创建一个基本的任务对象用于演示
	task := &models.Task{
		ID:          taskID,
		Title:       "任务标题",
		Description: "任务描述",
		Status:      "todo",
	}

	ctx := context.Background()
	if err := h.DocumentService.CreateTaskDocument(ctx, task, projectID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create task document",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Task document created successfully",
		"data": gin.H{
			"task_id":    taskID,
			"project_id": projectID,
		},
	})
}

// ArchiveTaskDocument 归档任务文档
// POST /api/v1/projects/:projectId/tasks/:taskId/document/archive
func (h *TaskDocumentFileHandler) ArchiveTaskDocument(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	if err := h.DocumentService.ArchiveTaskDocument(taskID, projectID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to archive task document",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Task document archived successfully",
	})
}