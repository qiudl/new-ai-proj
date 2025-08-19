package handlers

import (
	"net/http"
	"strconv"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
)

// DocumentHandler 基于数据库的文档处理器
type DocumentHandler struct {
	db database.DB
	docRepo database.DocumentRepositoryNew
}

// NewDocumentHandler 创建新的文档处理器
func NewDocumentHandler(db database.DB) *DocumentHandler {
	return &DocumentHandler{
		db: db, 
		docRepo: db.(*database.PostgresDB).NewDocuments(),
	}
}

// CreateDocument 创建文档
func (h *DocumentHandler) CreateDocument(c *gin.Context) {
	var req models.CreateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	// 设置默认值
	if req.Status == "" {
		req.Status = models.DocumentStatusDraft
	}
	if req.Type == "" {
		req.Type = models.DocumentTypeMarkdown
	}
	if req.Visibility == "" {
		req.Visibility = models.VisibilityTeam
	}

	document := &models.Document{
		ProjectID:   req.ProjectID,
		FolderID:    req.FolderID,
		Title:       req.Title,
		Content:     req.Content,
		Type:        req.Type,
		Status:      req.Status,
		FileURL:     req.FileURL,
		FileSize:    req.FileSize,
		MimeType:    req.MimeType,
		Description: req.Description,
		Tags:        req.Tags,
		Metadata:    req.Metadata,
		OwnerID:     userID.(int),
		Visibility:  req.Visibility,
		Version:     1,
		IsTemplate:  req.IsTemplate,
		CreatedBy:   userID.(int),
	}

	createdDoc, err := h.docRepo.Create(c.Request.Context(), document)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document created successfully",
		"data":    createdDoc,
	})
}

// GetDocuments 获取文档列表
func (h *DocumentHandler) GetDocuments(c *gin.Context) {
	filter := &models.DocumentFilter{}

	// 解析查询参数
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		if projectID, err := strconv.Atoi(projectIDStr); err == nil {
			filter.ProjectID = &projectID
		}
	}
	if ownerIDStr := c.Query("owner_id"); ownerIDStr != "" {
		if ownerID, err := strconv.Atoi(ownerIDStr); err == nil {
			filter.OwnerID = &ownerID
		}
	}

	filter.Search = c.Query("search")
	filter.Type = c.Query("type")
	filter.Status = c.Query("status")
	filter.Visibility = c.Query("visibility")
	filter.SortBy = c.DefaultQuery("sort_by", "updated_at")
	filter.Order = c.DefaultQuery("order", "desc")

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			filter.Page = page
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}

	documents, total, err := h.docRepo.List(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get documents",
			"error":   err.Error(),
		})
		return
	}

	response := models.DocumentListResponse{
		Documents: make([]models.Document, len(documents)),
		Total:     total,
		Page:      filter.Page,
		PageSize:  filter.Limit,
	}

	// 转换为非指针类型
	for i, doc := range documents {
		response.Documents[i] = *doc
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Documents retrieved successfully",
		"data":    response,
	})
}

// GetDocument 获取单个文档
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	document, err := h.docRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document retrieved successfully",
		"data":    document,
	})
}

// UpdateDocument 更新文档
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	var req models.UpdateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	updatedDoc, err := h.docRepo.Update(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document updated successfully",
		"data":    updatedDoc,
	})
}

// DeleteDocument 删除文档
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	err = h.docRepo.Delete(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document deleted successfully",
	})
}

// SearchDocuments 搜索文档
func (h *DocumentHandler) SearchDocuments(c *gin.Context) {
	req := &models.DocumentSearchRequest{
		Query:         c.Query("query"),
		SortBy:        c.DefaultQuery("sort_by", "relevance"),
		Order:         c.DefaultQuery("order", "desc"),
		Page:          1,
		Limit:         20,
		IncludeContent: c.Query("include_content") == "true",
	}

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			req.Page = page
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			req.Limit = limit
		}
	}

	if typeStr := c.Query("type"); typeStr != "" {
		docType := models.DocumentType(typeStr)
		req.Type = &docType
	}
	if statusStr := c.Query("status"); statusStr != "" {
		docStatus := models.DocumentStatus(statusStr)
		req.Status = &docStatus
	}
	if ownerIDStr := c.Query("owner_id"); ownerIDStr != "" {
		if ownerID, err := strconv.Atoi(ownerIDStr); err == nil {
			req.OwnerID = &ownerID
		}
	}

	documents, total, err := h.docRepo.Search(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Search failed",
			"error":   err.Error(),
		})
		return
	}

	response := models.DocumentSearchResponse{
		Documents:   make([]models.Document, len(documents)),
		TotalCount:  total,
		Page:        req.Page,
		Limit:       req.Limit,
		HasNextPage: (req.Page * req.Limit) < total,
		HasPrevPage: req.Page > 1,
	}

	// 转换为非指针类型
	for i, doc := range documents {
		response.Documents[i] = *doc
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Search completed successfully",
		"data":    response,
	})
}

// 任务文档相关API

// GetTaskDocuments 获取任务的文档列表
func (h *DocumentHandler) GetTaskDocuments(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	documents, err := h.docRepo.GetTaskDocuments(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get task documents",
			"error":   err.Error(),
		})
		return
	}

	// 转换为前端期望的格式
	result := make([]interface{}, len(documents))
	for i, doc := range documents {
		result[i] = *doc
	}

	response := map[string]interface{}{
		"documents":   result,
		"total_count": len(documents),
		"has_more":    false,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Task documents retrieved successfully",
		"data":    response,
	})
}

// AttachDocumentToTask 将文档关联到任务
func (h *DocumentHandler) AttachDocumentToTask(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	documentIDStr := c.Param("documentId")
	documentID, err := strconv.Atoi(documentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	var req struct {
		RelationshipType string `json:"relationship_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		req.RelationshipType = "attachment" // 默认关系类型
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	err = h.docRepo.AttachToTask(c.Request.Context(), taskID, documentID, req.RelationshipType, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to attach document to task",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document attached to task successfully",
	})
}

// DetachDocumentFromTask 将文档从任务中移除
func (h *DocumentHandler) DetachDocumentFromTask(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	documentIDStr := c.Param("documentId")
	documentID, err := strconv.Atoi(documentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	err = h.docRepo.DetachFromTask(c.Request.Context(), taskID, documentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to detach document from task",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document detached from task successfully",
	})
}

// GetDocumentVersions 获取文档版本历史
func (h *DocumentHandler) GetDocumentVersions(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	versions, err := h.docRepo.GetVersions(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get document versions",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document versions retrieved successfully",
		"data":    versions,
	})
}

// CreateDocumentVersion 手动创建文档版本
func (h *DocumentHandler) CreateDocumentVersion(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	version, err := h.docRepo.CreateVersion(c.Request.Context(), id, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create document version",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document version created successfully",
		"data":    version,
	})
}