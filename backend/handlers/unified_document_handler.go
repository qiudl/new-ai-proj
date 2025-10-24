package handlers

import (
	"ai-project-backend/interfaces"
	"fmt"
	"net/http"
	"strconv"
	"strings"
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
		Title      string `json:"title,omitempty"` // 支持前端传入的title字段
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"code":    "INVALID_REQUEST",
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
		Title:      request.Title, // 传递title字段到服务层
	}

	if req.Format == "" {
		req.Format = "markdown"
	}

	// 调用服务
	if err := h.documentService.CreateDocument(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create document",
			"code":    "CREATE_FAILED",
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
		// 检查是否为文档不存在错误（使用字符串包含检查）
		if strings.Contains(err.Error(), "document not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to read document",
				"code":    "READ_FAILED",
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
			"error":   "Invalid request body",
			"code":    "INVALID_REQUEST",
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
		if strings.Contains(err.Error(), "document not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to update document",
				"code":    "UPDATE_FAILED",
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
		if strings.Contains(err.Error(), "document not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to delete document",
				"code":    "DELETE_FAILED",
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
			"error":   "Failed to get document history",
			"code":    "HISTORY_FAILED",
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
		if strings.Contains(err.Error(), "document not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
				"code":  "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to archive document",
				"code":    "ARCHIVE_FAILED",
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
			"error":   "Invalid request body",
			"code":    "INVALID_REQUEST",
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
			"error":   "Failed to migrate document",
			"code":    "MIGRATE_FAILED",
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

	// 合并一致性指标（与 routes.RegisterDocumentHealthRoute 中保持一致）
	orphanDocs := 0
	orphanLinks := 0
	// mirror_writable: 当前统一文档服务为本地只读镜像写入禁用，固定 false
	mirrorWritable := false

	// 返回响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document service is healthy",
		"data": gin.H{
			"status":           "healthy",
			"timestamp":        time.Now().Format(time.RFC3339),
			"orphan_documents": orphanDocs,
			"orphan_links":     orphanLinks,
			"mirror_writable":  mirrorWritable,
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

// ========== Phase 2: 版本管理功能 ==========

// CompareVersions 比较文档版本
func (h *UnifiedDocumentHandler) CompareVersions(c *gin.Context) {
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

	fromVersion := c.Query("from_version")
	toVersion := c.Query("to_version")
	if fromVersion == "" || toVersion == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from_version and to_version are required"})
		return
	}

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	req := &interfaces.CompareVersionsRequest{
		ProjectID:   projectID,
		TaskID:      taskID,
		UserID:      userID,
		FromVersion: fromVersion,
		ToVersion:   toVersion,
	}

	response, err := h.documentService.CompareVersions(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to compare versions", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetDocumentAtVersion 获取特定版本的文档
func (h *UnifiedDocumentHandler) GetDocumentAtVersion(c *gin.Context) {
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

	version := c.Param("version")
	if version == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Version is required"})
		return
	}

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	req := &interfaces.VersionRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
		Version:   version,
	}

	response, err := h.documentService.GetDocumentAtVersion(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get document version", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ResolveConflict 解决文档冲突
func (h *UnifiedDocumentHandler) ResolveConflict(c *gin.Context) {
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

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requestBody struct {
		BaseVersion    string                            `json:"base_version"`
		ConflictBlocks []interfaces.ConflictBlock        `json:"conflict_blocks"`
		Resolution     interfaces.ConflictResolutionType `json:"resolution"`
		Message        string                            `json:"message"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	req := &interfaces.ConflictResolutionRequest{
		ProjectID:      projectID,
		TaskID:         taskID,
		UserID:         userID,
		BaseVersion:    requestBody.BaseVersion,
		ConflictBlocks: requestBody.ConflictBlocks,
		Resolution:     requestBody.Resolution,
		Message:        requestBody.Message,
	}

	err = h.documentService.ResolveConflict(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve conflict", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Conflict resolved successfully",
	})
}

// ========== Phase 2: 高级搜索功能 ==========

// SearchDocuments 搜索文档
func (h *UnifiedDocumentHandler) SearchDocuments(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	query := c.Query("query")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing query parameter"})
		return
	}

	// 解析可选参数
	var projectIDs []int
	if projectIDsStr := c.Query("project_ids"); projectIDsStr != "" {
		for _, idStr := range strings.Split(projectIDsStr, ",") {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				projectIDs = append(projectIDs, id)
			}
		}
	}

	var taskIDs []int
	if taskIDsStr := c.Query("task_ids"); taskIDsStr != "" {
		for _, idStr := range strings.Split(taskIDsStr, ",") {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				taskIDs = append(taskIDs, id)
			}
		}
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	// 构建过滤器
	filters := make(map[string]string)
	if format := c.Query("format"); format != "" {
		filters["format"] = format
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}

	req := &interfaces.SearchRequest{
		UserID:     userID,
		Query:      query,
		ProjectIDs: projectIDs,
		TaskIDs:    taskIDs,
		Filters:    filters,
		SortBy:     c.Query("sort_by"),
		SortOrder:  c.Query("sort_order"),
		Limit:      limit,
		Offset:     offset,
	}

	response, err := h.documentService.SearchDocuments(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// IndexDocument 索引文档
func (h *UnifiedDocumentHandler) IndexDocument(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requestBody struct {
		ProjectID int `json:"project_id"`
		TaskID    int `json:"task_id"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		// 如果没有请求体，尝试从URL参数获取
		if projectIDStr := c.Query("project_id"); projectIDStr != "" {
			if id, err := strconv.Atoi(projectIDStr); err == nil {
				requestBody.ProjectID = id
			}
		}
		if taskIDStr := c.Query("task_id"); taskIDStr != "" {
			if id, err := strconv.Atoi(taskIDStr); err == nil {
				requestBody.TaskID = id
			}
		}
	}

	req := &interfaces.IndexRequest{
		ProjectID: requestBody.ProjectID,
		TaskID:    requestBody.TaskID,
		UserID:    userID,
	}

	err := h.documentService.IndexDocument(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Index failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document indexed successfully",
	})
}

// ========== Phase 2: 批量操作功能 ==========

// BatchCreateDocuments 批量创建文档
func (h *UnifiedDocumentHandler) BatchCreateDocuments(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requestBody struct {
		Documents []interfaces.CreateDocumentRequest `json:"documents"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	req := &interfaces.BatchCreateRequest{
		UserID:    userID,
		Documents: requestBody.Documents,
	}

	response, err := h.documentService.BatchCreateDocuments(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Batch create failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// BatchUpdateDocuments 批量更新文档
func (h *UnifiedDocumentHandler) BatchUpdateDocuments(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requestBody struct {
		Documents []interfaces.UpdateDocumentRequest `json:"documents"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	req := &interfaces.BatchUpdateRequest{
		UserID:    userID,
		Documents: requestBody.Documents,
	}

	response, err := h.documentService.BatchUpdateDocuments(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Batch update failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// BatchDeleteDocuments 批量删除文档
func (h *UnifiedDocumentHandler) BatchDeleteDocuments(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requestBody struct {
		Documents []interfaces.DeleteDocumentRequest `json:"documents"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	req := &interfaces.BatchDeleteRequest{
		UserID:    userID,
		Documents: requestBody.Documents,
	}

	response, err := h.documentService.BatchDeleteDocuments(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Batch delete failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ========== Phase 2: 导入导出功能 ==========

// ExportDocuments 导出文档
func (h *UnifiedDocumentHandler) ExportDocuments(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requestBody struct {
		ProjectIDs  []int  `json:"project_ids"`
		TaskIDs     []int  `json:"task_ids"`
		Format      string `json:"format"`
		IncludeMeta bool   `json:"include_meta"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	req := &interfaces.ExportRequest{
		UserID:      userID,
		ProjectIDs:  requestBody.ProjectIDs,
		TaskIDs:     requestBody.TaskIDs,
		Format:      requestBody.Format,
		IncludeMeta: requestBody.IncludeMeta,
	}

	response, err := h.documentService.ExportDocuments(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Export failed", "details": err.Error()})
		return
	}

	// 设置下载响应头
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", response.FileName))
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", fmt.Sprintf("%d", response.Size))

	c.Data(http.StatusOK, "application/octet-stream", response.Data)
}

// ImportDocuments 导入文档
func (h *UnifiedDocumentHandler) ImportDocuments(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	projectID, err := strconv.Atoi(c.PostForm("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	format := c.PostForm("format")
	if format == "" {
		format = "zip" // 默认格式
	}

	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File upload failed", "details": err.Error()})
		return
	}

	// 读取文件数据
	fileContent, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file", "details": err.Error()})
		return
	}
	defer fileContent.Close()

	// 读取文件内容到字节数组
	data := make([]byte, file.Size)
	_, err = fileContent.Read(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file content", "details": err.Error()})
		return
	}

	// 解析导入选项
	options := interfaces.ImportOptions{
		OverwriteExisting: c.PostForm("overwrite_existing") == "true",
		CreateProjects:    c.PostForm("create_projects") == "true",
		CreateTasks:       c.PostForm("create_tasks") == "true",
	}

	req := &interfaces.ImportRequest{
		UserID:    userID,
		ProjectID: projectID,
		Data:      data,
		Format:    format,
		Options:   options,
	}

	response, err := h.documentService.ImportDocuments(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Import failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ========== Phase 2: 协作功能 ==========

// LockDocument 锁定文档
func (h *UnifiedDocumentHandler) LockDocument(c *gin.Context) {
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

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var requestBody struct {
		LockType string `json:"lock_type"`
		TTL      int    `json:"ttl"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	if requestBody.LockType == "" {
		requestBody.LockType = "write" // 默认写锁
	}
	if requestBody.TTL == 0 {
		requestBody.TTL = 300 // 默认5分钟
	}

	req := &interfaces.DocumentLockRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
		LockType:  requestBody.LockType,
		TTL:       requestBody.TTL,
	}

	err = h.documentService.LockDocument(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to lock document", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document locked successfully",
	})
}

// UnlockDocument 解锁文档
func (h *UnifiedDocumentHandler) UnlockDocument(c *gin.Context) {
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

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	req := &interfaces.DocumentLockRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
	}

	err = h.documentService.UnlockDocument(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlock document", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document unlocked successfully",
	})
}

// GetDocumentLockStatus 获取文档锁定状态
func (h *UnifiedDocumentHandler) GetDocumentLockStatus(c *gin.Context) {
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

	userID := c.GetInt("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	req := &interfaces.LockStatusRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
	}

	response, err := h.documentService.GetDocumentLockStatus(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get lock status", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ============================================================================
// 从HybridDocumentHandler迁移的方法
// TODO: 这些方法临时使用documentService接口实现，未来需要重构为统一的接口调用
// ============================================================================

// CopyDocument 复制文档
// @Migrated from HybridDocumentHandler.CopyDocument
// POST /api/v1/documents/:id/copy
func (h *UnifiedDocumentHandler) CopyDocument(c *gin.Context) {
	idStr := c.Param("id")
	docID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
			"code":    "INVALID_DOCUMENT_ID",
		})
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
			"code":    "NOT_AUTHENTICATED",
		})
		return
	}

	// TODO: 通过documentService接口实现，目前使用临时方案
	// 调用Service层的CopyDocument方法
	req := &interfaces.CopyDocumentRequest{
		DocumentID: docID,
		UserID:     userID.(int),
	}

	newDocID, err := h.documentService.CopyDocument(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to copy document",
			"code":    "COPY_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document copied successfully",
		"data": gin.H{
			"id": newDocID,
		},
	})
}

// ToggleTemplate 切换文档模板状态
// @Migrated from HybridDocumentHandler.ToggleTemplate
// POST /api/v1/documents/:id/toggle-template
func (h *UnifiedDocumentHandler) ToggleTemplate(c *gin.Context) {
	idStr := c.Param("id")
	docID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
			"code":    "INVALID_DOCUMENT_ID",
		})
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
			"code":    "NOT_AUTHENTICATED",
		})
		return
	}

	// TODO: 通过documentService接口实现
	req := &interfaces.ToggleTemplateRequest{
		DocumentID: docID,
		UserID:     userID.(int),
	}

	isTemplate, err := h.documentService.ToggleTemplate(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to toggle template status",
			"code":    "TOGGLE_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Template status toggled successfully",
		"data": gin.H{
			"is_template": isTemplate,
		},
	})
}

// UpdateDocumentByID 通过文档ID更新文档
// PUT /api/v1/documents/:id
// 用于全局文档路由，自动查找文档所属的项目和任务
func (h *UnifiedDocumentHandler) UpdateDocumentByID(c *gin.Context) {
	// 解析文档ID
	docID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
			"code":    "INVALID_DOCUMENT_ID",
		})
		return
	}

	// 获取用户ID (JWT中间件设置的是int类型)
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
			"code":    "NOT_AUTHENTICATED",
		})
		return
	}

	// 类型断言为int
	userID, ok := userIDRaw.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": fmt.Sprintf("Invalid user ID type: expected int, got %T", userIDRaw),
			"code":    "INVALID_USER_ID",
		})
		return
	}

	// 解析请求体
	var request struct {
		Content string `json:"content" binding:"required"`
		Message string `json:"message,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body",
			"code":    "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}

	// 调用Service层的UpdateDocumentByID方法
	req := &interfaces.UpdateDocumentByIDRequest{
		DocumentID: docID,
		Content:    request.Content,
		UserID:     int(userID),  // 转换uint为int
		Message:    request.Message,
	}

	if err := h.documentService.UpdateDocumentByID(c.Request.Context(), req); err != nil {
		if strings.Contains(err.Error(), "document not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Document not found",
				"code":    "DOCUMENT_NOT_FOUND",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to update document",
				"code":    "UPDATE_FAILED",
				"details": err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document updated successfully",
		"data": gin.H{
			"document_id": docID,
		},
	})
}
