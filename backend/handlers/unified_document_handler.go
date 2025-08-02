package handlers

import (
	"ai-project-backend/interfaces"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// UnifiedDocumentHandler 统一文档处理器
type UnifiedDocumentHandler struct {
	documentService interfaces.DocumentServiceInterface
}

// NewUnifiedDocumentHandler 创建统一文档处理器实例
func NewUnifiedDocumentHandler(documentService interfaces.DocumentServiceInterface) *UnifiedDocumentHandler {
	return &UnifiedDocumentHandler{
		documentService: documentService,
	}
}

// CreateDocument 创建文档
// POST /api/v1/projects/:id/tasks/:taskId/documents
func (h *UnifiedDocumentHandler) CreateDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"code":  "INVALID_TASK_ID",
		})
		return
	}

	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "NOT_AUTHENTICATED",
		})
		return
	}

	var request struct {
		Content    string `json:"content" binding:"required"`
		Format     string `json:"format,omitempty"`
		TemplateID string `json:"template_id,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}

	// 构建请求
	req := &interfaces.CreateDocumentRequest{
		ProjectID:  projectID,
		TaskID:     taskID,
		Content:    request.Content,
		Format:     request.Format,
		UserID:     userID.(int),
		TemplateID: request.TemplateID,
	}

	if req.Format == "" {
		req.Format = "markdown"
	}

	// 调用服务
	if err := h.documentService.CreateDocument(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create document",
			"code":  "CREATE_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document created successfully",
		"data": gin.H{
			"project_id": projectID,
			"task_id":    taskID,
			"format":     req.Format,
		},
	})
}

// GetDocument 获取文档
// GET /api/v1/projects/:id/tasks/:taskId/documents
func (h *UnifiedDocumentHandler) GetDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"code":  "INVALID_TASK_ID",
		})
		return
	}

	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "NOT_AUTHENTICATED",
		})
		return
	}

	// 构建请求
	req := &interfaces.ReadDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID.(int),
	}

	// 调用服务
	response, err := h.documentService.ReadDocument(c.Request.Context(), req)
	if err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to read document",
				"code":  "READ_FAILED",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// UpdateDocument 更新文档
// PUT /api/v1/projects/:id/tasks/:taskId/documents
func (h *UnifiedDocumentHandler) UpdateDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"code":  "INVALID_TASK_ID",
		})
		return
	}

	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "NOT_AUTHENTICATED",
		})
		return
	}

	var request struct {
		Content string `json:"content" binding:"required"`
		Message string `json:"message,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}

	// 构建请求
	req := &interfaces.UpdateDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		Content:   request.Content,
		UserID:    userID.(int),
		Message:   request.Message,
	}

	// 调用服务
	if err := h.documentService.UpdateDocument(c.Request.Context(), req); err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to update document",
				"code":  "UPDATE_FAILED",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document updated successfully",
		"data": gin.H{
			"project_id": projectID,
			"task_id":    taskID,
		},
	})
}

// DeleteDocument 删除文档
// DELETE /api/v1/projects/:id/tasks/:taskId/documents
func (h *UnifiedDocumentHandler) DeleteDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"code":  "INVALID_TASK_ID",
		})
		return
	}

	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "NOT_AUTHENTICATED",
		})
		return
	}

	var request struct {
		Reason string `json:"reason,omitempty"`
	}

	// 删除操作的请求体是可选的
	c.ShouldBindJSON(&request)

	// 构建请求
	req := &interfaces.DeleteDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID.(int),
		Reason:    request.Reason,
	}

	// 调用服务
	if err := h.documentService.DeleteDocument(c.Request.Context(), req); err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to delete document",
				"code":  "DELETE_FAILED",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document deleted successfully",
		"data": gin.H{
			"project_id": projectID,
			"task_id":    taskID,
		},
	})
}

// GetDocumentHistory 获取文档历史
// GET /api/v1/projects/:id/tasks/:taskId/documents/history
func (h *UnifiedDocumentHandler) GetDocumentHistory(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"code":  "INVALID_TASK_ID",
		})
		return
	}

	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "NOT_AUTHENTICATED",
		})
		return
	}

	// 获取查询参数
	limit := 10 // 默认值
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := 0 // 默认值
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// 构建请求
	req := &interfaces.HistoryRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID.(int),
		Limit:     limit,
		Offset:    offset,
	}

	// 调用服务
	history, err := h.documentService.GetDocumentHistory(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get document history",
			"code":  "HISTORY_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"history": history,
			"meta": gin.H{
				"limit":  limit,
				"offset": offset,
				"count":  len(history),
			},
		},
	})
}

// ArchiveDocument 归档文档
// POST /api/v1/projects/:id/tasks/:taskId/documents/archive
func (h *UnifiedDocumentHandler) ArchiveDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"code":  "INVALID_TASK_ID",
		})
		return
	}

	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "NOT_AUTHENTICATED",
		})
		return
	}

	var request struct {
		Reason string `json:"reason,omitempty"`
	}

	// 归档操作的请求体是可选的
	c.ShouldBindJSON(&request)

	// 构建请求
	req := &interfaces.ArchiveRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID.(int),
		Reason:    request.Reason,
	}

	// 调用服务
	if err := h.documentService.ArchiveDocument(c.Request.Context(), req); err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to archive document",
				"code":  "ARCHIVE_FAILED",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document archived successfully",
		"data": gin.H{
			"project_id": projectID,
			"task_id":    taskID,
		},
	})
}

// MigrateDocument 迁移文档
// POST /api/v1/projects/:id/tasks/:taskId/documents/migrate
func (h *UnifiedDocumentHandler) MigrateDocument(c *gin.Context) {
	// 从JWT中获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
			"code":  "NOT_AUTHENTICATED",
		})
		return
	}

	var request struct {
		SourcePath string `json:"source_path" binding:"required"`
		TargetPath string `json:"target_path" binding:"required"`
		DryRun     bool   `json:"dry_run,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}

	// 构建请求
	req := &interfaces.MigrateRequest{
		SourcePath: request.SourcePath,
		TargetPath: request.TargetPath,
		UserID:     userID.(int),
		DryRun:     request.DryRun,
	}

	// 调用服务
	if err := h.documentService.MigrateDocument(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to migrate document",
			"code":  "MIGRATE_FAILED",
			"details": err.Error(),
		})
		return
	}

	message := "Document migrated successfully"
	if request.DryRun {
		message = "Dry run completed successfully"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"source_path": request.SourcePath,
			"target_path": request.TargetPath,
			"dry_run":     request.DryRun,
		},
	})
}

// HealthCheck 健康检查
// GET /documents/health
func (h *UnifiedDocumentHandler) HealthCheck(c *gin.Context) {
	if err := h.documentService.HealthCheck(c.Request.Context()); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   "Service unhealthy",
			"code":    "SERVICE_UNHEALTHY",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document service is healthy",
		"data": gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
		},
	})
}

// 向后兼容方法 - 支持旧的API格式

// GetTaskDocument 向后兼容 - 旧的获取任务文档API
// GET /api/v1/projects/:id/tasks/:taskId/document
func (h *UnifiedDocumentHandler) GetTaskDocument(c *gin.Context) {
	// 重定向到新的API
	h.GetDocument(c)
}

// SaveTaskDocument 向后兼容 - 旧的保存任务文档API
// PUT /api/v1/projects/:id/tasks/:taskId/document
func (h *UnifiedDocumentHandler) SaveTaskDocument(c *gin.Context) {
	// 重定向到新的API，但需要适配请求格式
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

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// 兼容旧的请求格式
	var request struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 先尝试读取文档，判断是更新还是创建
	readReq := &interfaces.ReadDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID.(int),
	}

	_, err = h.documentService.ReadDocument(c.Request.Context(), readReq)
	if err != nil {
		// 文档不存在，创建新文档
		createReq := &interfaces.CreateDocumentRequest{
			ProjectID: projectID,
			TaskID:    taskID,
			Content:   request.Content,
			Format:    "markdown",
			UserID:    userID.(int),
		}

		if err := h.documentService.CreateDocument(c.Request.Context(), createReq); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create document"})
			return
		}
	} else {
		// 文档存在，更新文档
		updateReq := &interfaces.UpdateDocumentRequest{
			ProjectID: projectID,
			TaskID:    taskID,
			Content:   request.Content,
			UserID:    userID.(int),
		}

		if err := h.documentService.UpdateDocument(c.Request.Context(), updateReq); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update document"})
			return
		}
	}

	// 返回旧格式的响应
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// CheckTaskDocument 向后兼容 - 检查任务文档是否存在
// HEAD /api/v1/projects/:id/tasks/:taskId/document
func (h *UnifiedDocumentHandler) CheckTaskDocument(c *gin.Context) {
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

	userID, exists := c.Get("user_id")
	if !exists {
		c.Status(http.StatusUnauthorized)
		return
	}

	req := &interfaces.ReadDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID.(int),
	}

	_, err = h.documentService.ReadDocument(c.Request.Context(), req)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}

	c.Status(http.StatusOK)
}