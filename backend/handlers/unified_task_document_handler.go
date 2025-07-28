package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// UnifiedTaskDocumentHandler 统一任务文档处理器
type UnifiedTaskDocumentHandler struct {
	taskDocService *services.TaskDocumentService
}

// NewUnifiedTaskDocumentHandler 创建统一任务文档处理器实例
func NewUnifiedTaskDocumentHandler(taskDocService *services.TaskDocumentService) *UnifiedTaskDocumentHandler {
	return &UnifiedTaskDocumentHandler{
		taskDocService: taskDocService,
	}
}

// GetTaskDocument 获取任务文档
// GET /api/v1/projects/:id/tasks/:taskId/document
func (h *UnifiedTaskDocumentHandler) GetTaskDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	// 获取用户ID（从认证中间件）
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	document, err := h.taskDocService.GetTaskDocument(c.Request.Context(), projectID, taskID, userID)
	if err != nil {
		if err.Error() == "task not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 为了保持与旧API的兼容性，返回简化格式
	response := gin.H{
		"content": "",
	}
	
	if document.Content != nil {
		response["content"] = *document.Content
	}

	c.JSON(http.StatusOK, response)
}

// SaveTaskDocument 保存任务文档
// PUT /api/v1/projects/:id/tasks/:taskId/document  
func (h *UnifiedTaskDocumentHandler) SaveTaskDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	// 解析请求体 - 兼容旧格式
	var legacyRequest struct {
		Content string `json:"content"`
	}
	
	if err := c.ShouldBindJSON(&legacyRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 获取用户ID
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// 转换为新的请求格式
	updateRequest := models.UpdateTaskDocumentRequest{
		Content: &legacyRequest.Content,
	}

	document, err := h.taskDocService.CreateOrUpdateTaskDocument(c.Request.Context(), projectID, taskID, updateRequest, userID)
	if err != nil {
		if err.Error() == "task not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"document_id": document.DocumentID,
	})
}

// CheckTaskDocument 检查任务文档是否存在
// HEAD /api/v1/projects/:id/tasks/:taskId/document
func (h *UnifiedTaskDocumentHandler) CheckTaskDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	exists, err := h.taskDocService.CheckTaskDocumentExists(c.Request.Context(), projectID, taskID)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}

	if exists {
		c.Status(http.StatusOK)
	} else {
		c.Status(http.StatusNotFound)
	}
}

// GetTaskDocumentAdvanced 获取任务文档（增强版）
// GET /api/v1/projects/:id/tasks/:taskId/document/advanced
func (h *UnifiedTaskDocumentHandler) GetTaskDocumentAdvanced(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	document, err := h.taskDocService.GetTaskDocument(c.Request.Context(), projectID, taskID, userID)
	if err != nil {
		if err.Error() == "task not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, document)
}

// UpdateTaskDocumentAdvanced 更新任务文档（增强版）
// PATCH /api/v1/projects/:id/tasks/:taskId/document/advanced
func (h *UnifiedTaskDocumentHandler) UpdateTaskDocumentAdvanced(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var updateRequest models.UpdateTaskDocumentRequest
	if err := c.ShouldBindJSON(&updateRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	document, err := h.taskDocService.CreateOrUpdateTaskDocument(c.Request.Context(), projectID, taskID, updateRequest, userID)
	if err != nil {
		if err.Error() == "task not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, document)
}

// DeleteTaskDocument 删除任务文档
// DELETE /api/v1/projects/:id/tasks/:taskId/document
func (h *UnifiedTaskDocumentHandler) DeleteTaskDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	err = h.taskDocService.DeleteTaskDocument(c.Request.Context(), projectID, taskID, userID)
	if err != nil {
		if err.Error() == "task not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
			return
		}
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetTaskDocumentList 获取任务文档列表
// GET /api/v1/task-documents
func (h *UnifiedTaskDocumentHandler) GetTaskDocumentList(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var projectID *int
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		if pid, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = &pid
		}
	}

	documents, err := h.taskDocService.GetTaskDocumentList(c.Request.Context(), userID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"documents": documents,
		"total":     len(documents),
	})
}

// GetTaskDocumentStats 获取任务文档统计
// GET /api/v1/task-documents/stats
func (h *UnifiedTaskDocumentHandler) GetTaskDocumentStats(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var projectID *int
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		if pid, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = &pid
		}
	}

	stats, err := h.taskDocService.GetTaskDocumentStats(c.Request.Context(), userID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ====================
// 辅助方法
// ====================

// getUserIDFromContext 从Gin上下文获取用户ID
func getUserIDFromContext(c *gin.Context) int {
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(int); ok {
			return uid
		}
	}
	
	// 临时方案：从Header获取用户ID（实际项目中应该从JWT或session获取）
	if userIDStr := c.GetHeader("X-User-ID"); userIDStr != "" {
		if uid, err := strconv.Atoi(userIDStr); err == nil {
			return uid
		}
	}
	
	return 0
}

// 向后兼容的处理器映射

// LegacyGetTaskDocument 兼容旧版API的获取任务文档
func (h *UnifiedTaskDocumentHandler) LegacyGetTaskDocument(c *gin.Context) {
	h.GetTaskDocument(c)
}

// LegacySaveTaskDocument 兼容旧版API的保存任务文档  
func (h *UnifiedTaskDocumentHandler) LegacySaveTaskDocument(c *gin.Context) {
	h.SaveTaskDocument(c)
}

// LegacyCheckTaskDocument 兼容旧版API的检查任务文档
func (h *UnifiedTaskDocumentHandler) LegacyCheckTaskDocument(c *gin.Context) {
	h.CheckTaskDocument(c)
}