package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"sort"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus"
)

// DocumentHandler 基于数据库的文档处理器
type DocumentHandler struct {
	db database.DB
	docRepo database.DocumentRepositoryNew
	// metrics
	metricArchiveReq    *prometheus.CounterVec
	metricUnarchiveReq  *prometheus.CounterVec
	metricArchiveDur    *prometheus.HistogramVec
	metricUnarchiveDur  *prometheus.HistogramVec
	gaugeArchived       *prometheus.GaugeVec
}

// CreateAndAttachDocumentRequest 原子创建并关联的请求体
// 非必填字段将使用与 CreateDocument 一致的默认值
type CreateAndAttachDocumentRequest struct {
	Title       string                 `json:"title"`
	Content     string                 `json:"content"`
	Type        models.DocumentType    `json:"type"`
	Status      models.DocumentStatus  `json:"status"`
	Description *string                `json:"description,omitempty"`
	Tags        []string               `json:"tags,omitempty"`
	Visibility  models.Visibility      `json:"visibility"`
	IsTemplate  bool                   `json:"is_template"`
	Metadata    models.DocumentMetadata `json:"metadata,omitempty"`
	RelationshipType string            `json:"relationship_type"` // 默认 attachment
}

// NewDocumentHandler 创建新的文档处理器
func NewDocumentHandler(db database.DB) *DocumentHandler {
	h := &DocumentHandler{
		db: db,
		docRepo: db.(*database.PostgresDB).NewDocuments(),
		metricArchiveReq: prometheus.NewCounterVec(
			prometheus.CounterOpts{Name: "document_archive_requests_total", Help: "Total archive requests"},
			[]string{"status", "source"},
		),
		metricUnarchiveReq: prometheus.NewCounterVec(
			prometheus.CounterOpts{Name: "document_unarchive_requests_total", Help: "Total unarchive requests"},
			[]string{"status", "source"},
		),
		metricArchiveDur: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{Name: "document_archive_duration_seconds", Help: "Archive duration seconds"},
			[]string{"status"},
		),
		metricUnarchiveDur: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{Name: "document_unarchive_duration_seconds", Help: "Unarchive duration seconds"},
			[]string{"status"},
		),
		gaugeArchived: prometheus.NewGaugeVec(
			prometheus.GaugeOpts{Name: "documents_archived", Help: "Current archived documents count"},
			[]string{"project_id", "task_id"},
		),
	}
	// register metrics (ignore duplicate registration errors in production setups)
	prometheus.MustRegister(h.metricArchiveReq)
	prometheus.MustRegister(h.metricUnarchiveReq)
	prometheus.MustRegister(h.metricArchiveDur)
	prometheus.MustRegister(h.metricUnarchiveDur)
	prometheus.MustRegister(h.gaugeArchived)
	return h
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

// DevCreateWorkNote 开发环境：更宽松的创建接口，自动补齐默认值
func (h *DocumentHandler) DevCreateWorkNote(c *gin.Context) {
	// 仅开发环境可用，由路由层控制
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}
	uid := userID.(int)

	var req struct {
		ProjectID   *int                   `json:"project_id"`
		Title       string                 `json:"title"`
		Content     *string                `json:"content"`
		Type        *models.DocumentType   `json:"type"`
		Status      *models.DocumentStatus `json:"status"`
		Visibility  *models.Visibility     `json:"visibility"`
		Tags        []string               `json:"tags"`
		Metadata    models.DocumentMetadata `json:"metadata"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request format", "error": err.Error()})
		return
	}
	// 默认值
	proj := 1
	if req.ProjectID != nil { proj = *req.ProjectID }
	ctype := models.DocumentTypeMarkdown
	if req.Type != nil { ctype = *req.Type }
	cstatus := models.DocumentStatusDraft
	if req.Status != nil { cstatus = *req.Status }
	vis := models.VisibilityTeam
	if req.Visibility != nil { vis = *req.Visibility }
	content := ""
	if req.Content != nil { content = *req.Content }

	// 确保 tags 与 metadata 有默认值，避免 NOT NULL 约束报错
	if req.Tags == nil {
		req.Tags = []string{}
	}
	if req.Metadata == nil {
		req.Metadata = make(models.DocumentMetadata)
	}
	
	doc := &models.Document{
		ProjectID:   &proj,
		Title:       req.Title,
		Content:     &content,
		Type:        ctype,
		Status:      cstatus,
		Tags:        req.Tags,
		Metadata:    req.Metadata,
		OwnerID:     uid,
		Visibility:  vis,
		Version:     1,
		IsTemplate:  false,
		CreatedBy:   uid,
	}
	created, err := h.docRepo.Create(c.Request.Context(), doc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create document", "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": created})
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
	if archivedStr := c.Query("archived"); archivedStr != "" {
		if archivedStr == "true" {
			b := true; filter.Archived = &b
		} else if archivedStr == "false" {
			b := false; filter.Archived = &b
		}
	}

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

// ListWorkNotes 获取工作笔记列表（与前端预期一致的分页结构）
func (h *DocumentHandler) ListWorkNotes(c *gin.Context) {
	// 复用 GetDocuments 的逻辑，确保返回 data: {documents,total,page,page_size}
	h.GetDocuments(c)
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
	// 优先使用便捷路由上的 :documentId，其次回退到标准路由的 :id
	idStr := c.Param("documentId")
	if idStr == "" {
		idStr = c.Param("id")
	}
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
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

// SearchWorkNotes 搜索工作笔记（数据库）
// GET /api/v1/work-notes/search?query=...&page=...&limit=...
func (h *DocumentHandler) SearchWorkNotes(c *gin.Context) {
	// 使用仓库的 Search 接口以支持按 query 搜索标题/内容
	req := &models.DocumentSearchRequest{
		Query: c.Query("query"),
		SortBy: c.DefaultQuery("sort_by", "updated_at"),
		Order: c.DefaultQuery("order", "desc"),
		Page: 1,
		Limit: 20,
	}
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil { req.Page = page }
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil { req.Limit = limit }
	}
	if typeStr := c.Query("type"); typeStr != "" { dt := models.DocumentType(typeStr); req.Type = &dt }
	if statusStr := c.Query("status"); statusStr != "" { ds := models.DocumentStatus(statusStr); req.Status = &ds }

	documents, total, err := h.docRepo.Search(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Search failed", "error": err.Error()})
		return
	}

	// Development-only fallback: if no results in development, perform direct SQL search on title/content
	if total == 0 && strings.ToLower(os.Getenv("APP_ENV")) == "development" && req.Query != "" {
		if h.db != nil && h.db.GetDB() != nil {
			if sqlDB, ok := h.db.GetDB().(*sql.DB); ok {
				where := "d.deleted_at IS NULL AND (d.title ILIKE $1 OR d.content ILIKE $1)"
				args := []interface{}{"%" + req.Query + "%"}
				// Count
				countSQL := "SELECT COUNT(*) FROM documents d WHERE " + where
				var devTotal int
				if err := sqlDB.QueryRowContext(c.Request.Context(), countSQL, args...).Scan(&devTotal); err == nil && devTotal > 0 {
					// Pagination
					limit := req.Limit
					if limit <= 0 { limit = 20 }
					offset := 0
					if req.Page > 0 { offset = (req.Page - 1) * limit }
					query := "SELECT d.id, d.project_id, d.title, d.content, d.type, d.status, d.file_url, d.file_size, d.mime_type, d.description, d.tags, d.metadata, d.owner_id, d.visibility, d.version, d.is_template, d.created_by, d.created_at, d.updated_at, d.deleted_at FROM documents d WHERE " + where + " ORDER BY d.updated_at DESC LIMIT $2 OFFSET $3"
					rows, qerr := sqlDB.QueryContext(c.Request.Context(), query, append(args, limit, offset)...)
					if qerr == nil {
						defer rows.Close()
						devDocs := []*models.Document{}
						for rows.Next() {
							d := &models.Document{}
							var tags pq.StringArray
							if err := rows.Scan(&d.ID, &d.ProjectID, &d.Title, &d.Content, &d.Type, &d.Status, &d.FileURL, &d.FileSize, &d.MimeType, &d.Description, &tags, &d.Metadata, &d.OwnerID, &d.Visibility, &d.Version, &d.IsTemplate, &d.CreatedBy, &d.CreatedAt, &d.UpdatedAt, &d.DeletedAt); err == nil {
								d.Tags = []string(tags)
								devDocs = append(devDocs, d)
							}
						}
						if len(devDocs) > 0 {
							documents = devDocs
							total = devTotal
						}
					}
				}
			}
		}
	}

	response := models.DocumentListResponse{
		Documents: make([]models.Document, len(documents)),
		Total: total,
		Page: req.Page,
		PageSize: req.Limit,
	}
	for i, doc := range documents { response.Documents[i] = *doc }
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Work notes searched successfully", "data": response})
}

// DeleteDocument 删除文档（软删除）
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
	if err := h.docRepo.Delete(c.Request.Context(), id); err != nil {
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
		"data": gin.H{"id": id},
	})
}

// HasTaskDocument 一致性读取：检查任务是否存在关联文档（统一通过 Repository）
func (h *DocumentHandler) HasTaskDocument(c *gin.Context) {
	// taskId from path
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}
	// 统一从仓库读取，避免直连 SQL 分叉
	docs, err := h.docRepo.GetTaskDocuments(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to read task documents", "error": err.Error()})
		return
	}
	exists := len(docs) > 0
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{"has_document": exists},
	})
}

// ListTaskDocuments 一致性读取：列出任务的所有文档（统一通过 Repository；按更新时间倒序）
func (h *DocumentHandler) ListTaskDocuments(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}
	// 统一从仓库读取
	documents, err := h.docRepo.GetTaskDocuments(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to get task documents", "error": err.Error()})
		return
	}
	// 简化字段输出，并进行按 updated_at 降序排序（若无则稳定输出）
	type item struct {
		ID         int         `json:"id"`
		Title      string      `json:"title"`
		Type       string      `json:"type"`
		Status     string      `json:"status"`
		Visibility string      `json:"visibility"`
		Version    int         `json:"version"`
		UpdatedAt  time.Time   `json:"updated_at"`
	}
	list := make([]item, 0, len(documents))
	for _, d := range documents {
		it := item{ID: d.ID, Title: d.Title, Type: string(d.Type), Status: string(d.Status), Visibility: string(d.Visibility), Version: d.Version}
		// UpdatedAt 在模型中为 time.Time 非指针
		it.UpdatedAt = d.UpdatedAt
		list = append(list, it)
	}
	// 排序（有 UpdatedAt 的在前）
	sort.SliceStable(list, func(i, j int) bool {
		return list[i].UpdatedAt.After(list[j].UpdatedAt)
	})
	res := make([]map[string]interface{}, len(list))
	for i, it := range list {
		res[i] = map[string]interface{}{
			"id":         it.ID,
			"title":      it.Title,
			"type":       it.Type,
			"status":     it.Status,
			"visibility": it.Visibility,
			"version":    it.Version,
			"updated_at": it.UpdatedAt,
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{"documents": res, "total": len(res)},
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

// UpsertTaskDocument 兼容旧的单数路由：当任务无文档则创建并关联；存在则更新首选文档内容
// 支持：POST /api/v1/projects/:id/tasks/:taskId/document 与 PUT /api/v1/projects/:id/tasks/:taskId/document
func (h *DocumentHandler) UpsertTaskDocument(c *gin.Context) {
	// 路径参数
	projectIDStr := c.Param("id")
	taskIDStr := c.Param("taskId")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil || projectID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid project ID"})
		return
	}
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil || taskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 用户
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}
	uid := userID.(int)

	// 请求体
	var body struct {
		Title   string `json:"title"`
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request format", "error": err.Error()})
		return
	}

	// 读取当前任务文档
	docs, err := h.docRepo.GetTaskDocuments(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to read task documents", "error": err.Error()})
		return
	}

	if len(docs) == 0 {
		// 创建并关联（非事务最小实现）
		// 默认元数据
		title := body.Title
		if strings.TrimSpace(title) == "" {
			title = "Task Document"
		}
		content := body.Content
		doc := &models.Document{
			ProjectID:  &projectID,
			Title:      title,
			Content:    &content,
			Type:       models.DocumentTypeMarkdown,
			Status:     models.DocumentStatusDraft,
			OwnerID:    uid,
			Visibility: models.VisibilityTeam,
			Version:    1,
			IsTemplate: false,
			CreatedBy:  uid,
		}
		created, err := h.docRepo.Create(c.Request.Context(), doc)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create document", "error": err.Error()})
			return
		}
		if err := h.docRepo.AttachToTask(c.Request.Context(), taskID, created.ID, "attachment", uid); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Document created but failed to attach to task", "error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Document created and attached successfully", "data": gin.H{"document_id": created.ID, "task_id": taskID, "project_id": projectID}})
		return
	}

	// 选择一个要更新的文档（按 UpdatedAt 最大）
	pick := docs[0]
	for _, d := range docs {
		if d.UpdatedAt.After(pick.UpdatedAt) {
			pick = d
		}
	}
	upd := &models.UpdateDocumentRequest{Content: &body.Content}
	updated, err := h.docRepo.Update(c.Request.Context(), pick.ID, upd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update document", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Document updated successfully", "data": updated})
}

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

// ArchiveDocument 归档文档
func (h *DocumentHandler) ArchiveDocument(c *gin.Context) {
	start := time.Now()
	statusLabel := "success"
	defer func() {
		h.metricArchiveDur.WithLabelValues(statusLabel).Observe(time.Since(start).Seconds())
	}()
	idStr := c.Param("documentId")
	if idStr == "" { idStr = c.Param("id") }
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid document ID"})
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}
	var req struct { Reason string `json:"reason"` }
	_ = c.ShouldBindJSON(&req)

	sqlDB, ok := h.db.GetDB().(*sql.DB)
	if !ok || sqlDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "DB not initialized"})
		return
	}
	query := `UPDATE documents SET archived = TRUE, archived_at = CURRENT_TIMESTAMP, archived_by = $2 WHERE id = $1 AND deleted_at IS NULL AND archived = FALSE RETURNING archived_at`
	var archivedAt time.Time
	err = sqlDB.QueryRowContext(c.Request.Context(), query, id, userID.(int)).Scan(&archivedAt)
	if err != nil {
		statusLabel = "error"
		h.metricArchiveReq.WithLabelValues("error", "api").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Archive failed or already archived", "error": err.Error()})
		return
	}
	h.metricArchiveReq.WithLabelValues("success", "api").Inc()
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Archived", "data": gin.H{"document_id": id, "archived": true, "archived_at": archivedAt}})
}

// UnarchiveDocument 解归档文档
func (h *DocumentHandler) UnarchiveDocument(c *gin.Context) {
	start := time.Now()
	statusLabel := "success"
	defer func() {
		h.metricUnarchiveDur.WithLabelValues(statusLabel).Observe(time.Since(start).Seconds())
	}()
	idStr := c.Param("documentId")
	if idStr == "" { idStr = c.Param("id") }
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid document ID"})
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}
	var req struct { Reason string `json:"reason"` }
	_ = c.ShouldBindJSON(&req)

	sqlDB, ok := h.db.GetDB().(*sql.DB)
	if !ok || sqlDB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "DB not initialized"})
		return
	}
	query := `UPDATE documents SET archived = FALSE, unarchived_at = CURRENT_TIMESTAMP, unarchived_by = $2 WHERE id = $1 AND deleted_at IS NULL AND archived = TRUE RETURNING unarchived_at`
	var unarchivedAt time.Time
	err = sqlDB.QueryRowContext(c.Request.Context(), query, id, userID.(int)).Scan(&unarchivedAt)
	if err != nil {
		statusLabel = "error"
		h.metricUnarchiveReq.WithLabelValues("error", "api").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Unarchive failed or not archived", "error": err.Error()})
		return
	}
	h.metricUnarchiveReq.WithLabelValues("success", "api").Inc()
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Unarchived", "data": gin.H{"document_id": id, "archived": false, "unarchived_at": unarchivedAt}})
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

// CreateAndAttachDocument 原子创建文档并关联到任务
// 事务边界：INSERT documents -> INSERT task_documents，任一失败则回滚
func (h *DocumentHandler) CreateAndAttachDocument(c *gin.Context) {
	// 路径参数
	projectIDStr := c.Param("id")
	taskIDStr := c.Param("taskId")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil || projectID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid project ID"})
		return
	}
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil || taskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 用户
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
		return
	}
	uid := userID.(int)

	// 请求体
	var req CreateAndAttachDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request format", "error": err.Error()})
		return
	}
	// 默认值与校正
	if req.Status == "" { req.Status = models.DocumentStatusDraft }
	if req.Type == "" { req.Type = models.DocumentTypeMarkdown }
	if req.Visibility == "" { req.Visibility = models.VisibilityTeam }
	if req.RelationshipType == "" { req.RelationshipType = "attachment" }

	// 打开事务
	var sqlDB *sql.DB
	if h.db == nil || h.db.GetDB() == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "DB not initialized"})
		return
	}
	var ok bool
	sqlDB, ok = h.db.GetDB().(*sql.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Invalid DB driver"})
		return
	}
	tx, err := sqlDB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to begin transaction", "error": err.Error()})
		return
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	// 插入 documents
	var docID int
	var createdAt, updatedAt time.Time
	insertDoc := `
		INSERT INTO documents (
			project_id, title, content, type, status, file_url, file_size,
			mime_type, description, tags, metadata, owner_id, visibility,
			version, is_template, created_by
		) VALUES (
			$1, $2, $3, $4, $5, NULL, 0,
			NULL, $6, $7, $8, $9, $10,
			1, $11, $12
		) RETURNING id, created_at, updated_at`

	// 处理可空字段
	desc := sql.NullString{}
	if req.Description != nil { desc = sql.NullString{String: *req.Description, Valid: true} }
	metaJSON := req.Metadata
	if metaJSON == nil { metaJSON = make(models.DocumentMetadata) }

	// 使用 github.com/lib/pq 处理 tags 数组
	// 注意：需在顶部 import 中加入 "github.com/lib/pq"
	_, _ = desc, metaJSON // 避免未使用告警（Scan 处使用）
	
	err = tx.QueryRowContext(c.Request.Context(), insertDoc,
		projectID, req.Title, req.Content, req.Type, req.Status,
		desc, pq.Array(req.Tags), metaJSON, uid, req.Visibility,
		req.IsTemplate, uid,
	).Scan(&docID, &createdAt, &updatedAt)
	if err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create document", "error": err.Error()})
		return
	}

	// 插入 task_documents 关联
	insertLink := `
		INSERT INTO task_documents (task_id, document_id, relationship_type, created_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (task_id, document_id)
		DO UPDATE SET relationship_type = EXCLUDED.relationship_type, updated_at = CURRENT_TIMESTAMP`
	if _, err := tx.ExecContext(c.Request.Context(), insertLink, taskID, docID, req.RelationshipType, uid); err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to attach document to task", "error": err.Error()})
		return
	}

	// 提交
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to commit transaction", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document created and attached successfully",
		"data": gin.H{
			"document_id": docID,
			"task_id": taskID,
			"project_id": projectID,
			"created_at": createdAt,
			"updated_at": updatedAt,
			"relationship_type": req.RelationshipType,
		},
	})
}

// CreateBatchDocuments 批量创建文档
func (h *DocumentHandler) CreateBatchDocuments(c *gin.Context) {
	var req models.CreateBatchDocumentsRequest
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

	// 验证批量请求限制
	if len(req.Documents) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No documents provided",
		})
		return
	}

	if len(req.Documents) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Too many documents in batch (max: 50)",
		})
		return
	}

	// 初始化结果
	result := &models.BatchDocumentResult{
		CreatedDocuments: []models.Document{},
		Errors:          []models.BatchCreateError{},
		SuccessCount:    0,
		ErrorCount:      0,
	}

	// 逐一处理文档创建
	for i, item := range req.Documents {
		// 应用批量选项默认值
		if req.Options.DefaultStatus != "" && item.Status == "" {
			if status := models.DocumentStatus(req.Options.DefaultStatus); status != "" {
				item.Status = status
			}
		}
		if req.Options.DefaultVisibility != "" && item.Visibility == "" {
			if visibility := models.Visibility(req.Options.DefaultVisibility); visibility != "" {
				item.Visibility = visibility
			}
		}

		// 设置默认值
		if item.Status == "" {
			item.Status = models.DocumentStatusDraft
		}
		if item.Type == "" {
			item.Type = models.DocumentTypeMarkdown
		}
		if item.Visibility == "" {
			item.Visibility = models.VisibilityTeam
		}

		// 智能模板处理
		if req.Templates.EnableSmartTemplate || item.TemplateType != "" {
			if processedItem, err := h.applySmartTemplate(&item, &req.Templates, &req.Options); err != nil {
				result.Errors = append(result.Errors, models.BatchCreateError{
					Index: i,
					Title: item.Title,
					Error: "Template processing failed: " + err.Error(),
					Code:  "TEMPLATE_ERROR",
				})
				result.ErrorCount++
				continue
			} else {
				item = *processedItem
			}
		}

		// 检查是否跳过已存在文档的任务
		if req.Options.SkipExisting && item.TaskID != nil {
			exists, err := h.checkTaskHasDocuments(*item.TaskID)
			if err == nil && exists {
				result.Errors = append(result.Errors, models.BatchCreateError{
					Index: i,
					Title: item.Title,
					Error: "Task already has documents and skip_existing is enabled",
					Code:  "SKIPPED",
				})
				continue
			}
		}

		// 创建文档对象
		document := &models.Document{
			ProjectID:   item.ProjectID,
			Title:       item.Title,
			Content:     item.Content,
			Type:        item.Type,
			Status:      item.Status,
			Description: item.Description,
			Tags:        item.Tags,
			Metadata:    item.Metadata,
			OwnerID:     userID.(int),
			Visibility:  item.Visibility,
			Version:     1,
			IsTemplate:  item.IsTemplate,
			CreatedBy:   userID.(int),
		}

		// 尝试创建文档
		createdDoc, err := h.docRepo.Create(c.Request.Context(), document)
		if err != nil {
			// 记录创建失败的文档
			result.Errors = append(result.Errors, models.BatchCreateError{
				Index: i,
				Title: item.Title,
				Error: err.Error(),
				Code:  "CREATE_FAILED",
			})
			result.ErrorCount++
			continue
		}

		// 如果需要关联到任务，尝试创建关联
		if item.AttachToTask && item.TaskID != nil {
			relationType := item.RelationType
			if relationType == "" {
				relationType = "attachment"
			}

			err = h.docRepo.AttachToTask(c.Request.Context(), *item.TaskID, createdDoc.ID, relationType, userID.(int))
			if err != nil {
				// 文档创建成功但关联失败，记录警告但不算错误
				result.Errors = append(result.Errors, models.BatchCreateError{
					Index: i,
					Title: item.Title,
					Error: "Document created but failed to attach to task: " + err.Error(),
					Code:  "ATTACH_WARNING",
				})
			}
		}

		// 记录成功创建的文档
		result.CreatedDocuments = append(result.CreatedDocuments, *createdDoc)
		result.SuccessCount++
	}

	// 确定响应状态码
	statusCode := http.StatusCreated
	if result.ErrorCount > 0 && result.SuccessCount == 0 {
		// 全部失败
		statusCode = http.StatusInternalServerError
	} else if result.ErrorCount > 0 {
		// 部分成功
		statusCode = http.StatusMultiStatus
	}

	c.JSON(statusCode, gin.H{
		"success": result.SuccessCount > 0,
		"message": generateBatchMessage(result.SuccessCount, result.ErrorCount),
		"data":    result,
	})
}

// generateBatchMessage 生成批量操作结果消息
func generateBatchMessage(successCount, errorCount int) string {
	if errorCount == 0 {
		return "All documents created successfully"
	}
	if successCount == 0 {
		return "All documents failed to create"
	}
	return "Batch operation completed with partial success"
}

// applySmartTemplate 应用智能模板处理
func (h *DocumentHandler) applySmartTemplate(item *models.BatchDocumentItem, templates *models.TemplateConfiguration, options *models.BatchCreateOptions) (*models.BatchDocumentItem, error) {
	processedItem := *item

	// 如果没有指定模板类型，尝试智能检测
	templateType := item.TemplateType
	if templateType == "" && templates.EnableSmartTemplate {
		templateType = h.detectTemplateType(item)
	}

	// 如果仍然没有模板类型，使用默认模板
	if templateType == "" && templates.DefaultTemplate != "" {
		templateType = templates.DefaultTemplate
	}

	// 应用模板
	if templateType != "" {
		if template, exists := getBuiltinTemplate(templateType); exists {
			processedItem = h.applyTemplate(&processedItem, template, templates.GlobalVariables)
		} else if template, exists := templates.CustomTemplates[templateType]; exists {
			processedItem = h.applyCustomTemplate(&processedItem, template, templates.GlobalVariables)
		}
	}

	return &processedItem, nil
}

// detectTemplateType 智能检测模板类型
func (h *DocumentHandler) detectTemplateType(item *models.BatchDocumentItem) string {
	title := strings.ToLower(item.Title)
	description := ""
	if item.Description != nil {
		description = strings.ToLower(*item.Description)
	}

	// Bug修复模板检测
	if strings.Contains(title, "bug") || strings.Contains(title, "修复") || strings.Contains(title, "fix") ||
		strings.Contains(description, "bug") || strings.Contains(description, "修复") {
		return "bug_fix"
	}

	// 项目阶段模板检测
	if strings.Contains(title, "第") && strings.Contains(title, "阶段") ||
		strings.Contains(title, "phase") || strings.Contains(description, "阶段") {
		return "project_phase"
	}

	// 部署模板检测
	if strings.Contains(title, "部署") || strings.Contains(title, "deploy") ||
		strings.Contains(description, "部署") || strings.Contains(description, "deploy") {
		return "deployment"
	}

	// 文档模板检测
	if strings.Contains(title, "文档") || strings.Contains(title, "document") ||
		strings.Contains(description, "文档") {
		return "documentation"
	}

	// 默认为功能开发模板
	return "feature"
}

// getBuiltinTemplate 获取内置模板
func getBuiltinTemplate(templateType string) (models.TemplateDefinition, bool) {
	builtinTemplates := map[string]models.TemplateDefinition{
		"bug_fix": {
			Name:          "Bug修复文档",
			TitleTemplate: "{{.title}}",
			ContentTemplate: `# {{.title}}

## 🎯 修复总结
**修复时间**: {{.created_time}}
**状态**: {{.status}}

## 🐛 问题分析
{{.description}}

## 🔍 根本原因
需要分析和记录问题的根本原因

## 🔧 修复方案
详细描述修复的技术方案和实施步骤

## 📁 修复文件
列出修改的文件和关键代码位置

## ✅ 测试验证
- [ ] 功能测试通过
- [ ] 回归测试通过
- [ ] 代码审查完成

## 📊 影响分析
- **修复范围**: 
- **影响用户**: 
- **风险评估**: 

---
*文档生成时间: {{.created_time}}*`,
		},
		"feature": {
			Name:          "功能开发文档",
			TitleTemplate: "{{.title}} - 技术实现文档",
			ContentTemplate: `# {{.title}}

## 📋 功能概述
**任务ID**: {{.task_id}}
**状态**: {{.status}}
**优先级**: {{.priority}}

## 🎯 需求分析
{{.description}}

## 🔧 技术设计
### 架构设计
待补充技术架构说明

### 接口设计
待补充API接口设计

### 数据库设计
待补充数据库变更（如需要）

## 📋 实施计划
1. **需求分析** - 明确功能需求和验收标准
2. **技术设计** - 完善架构和接口设计
3. **开发实现** - 编码实现核心功能
4. **测试验证** - 功能测试和集成测试
5. **文档完善** - 更新相关技术文档

## ✅ 验收标准
- [ ] 功能按需求正确实现
- [ ] 用户界面友好易用
- [ ] 性能指标满足要求
- [ ] 代码质量符合规范

## ⏱️ 预估工时
{{.estimated_hours}}小时

---
*文档生成时间: {{.created_time}}*`,
		},
		"project_phase": {
			Name:          "项目阶段文档",
			TitleTemplate: "{{.title}}",
			ContentTemplate: `# {{.title}}

## 🎯 阶段目标
**阶段**: {{.phase}}
**预估工时**: {{.estimated_hours}}小时
**状态**: {{.status}}

## 📋 核心任务
{{.description}}

## 🔧 技术要点
### 关键技术栈
- 前端技术
- 后端技术
- 数据库方案

### 架构设计
待补充详细的架构设计和技术选型

## 📅 实施计划
### 分阶段实施
1. **需求梳理** - 详细需求分析和整理
2. **方案设计** - 技术方案设计和评审
3. **开发实现** - 按计划推进开发工作
4. **测试验证** - 全面的功能和性能测试
5. **部署上线** - 生产环境部署和验证

## 📊 成功指标
- [ ] 阶段目标100%达成
- [ ] 代码质量满足标准
- [ ] 性能指标达标
- [ ] 用户验收通过

## 🎯 后续规划
描述下一阶段的规划和目标

---
*文档生成时间: {{.created_time}}*`,
		},
	}

	template, exists := builtinTemplates[templateType]
	return template, exists
}

// applyTemplate 应用内置模板
func (h *DocumentHandler) applyTemplate(item *models.BatchDocumentItem, template models.TemplateDefinition, globalVars map[string]interface{}) models.BatchDocumentItem {
	result := *item
	
	// 准备模板变量
	vars := make(map[string]interface{})
	for k, v := range globalVars {
		vars[k] = v
	}
	for k, v := range item.Variables {
		vars[k] = v
	}
	
	// 添加基础变量
	vars["title"] = item.Title
	vars["task_id"] = item.TaskID
	vars["created_time"] = time.Now().Format("2006-01-02 15:04:05")
	if item.Description != nil {
		vars["description"] = *item.Description
	} else {
		vars["description"] = "待补充详细描述"
	}
	
	// 应用标题模板
	if template.TitleTemplate != "" {
		result.Title = h.processTemplate(template.TitleTemplate, vars)
	}
	
	// 应用内容模板
	if template.ContentTemplate != "" && (item.Content == nil || *item.Content == "") {
		content := h.processTemplate(template.ContentTemplate, vars)
		result.Content = &content
	}
	
	return result
}

// applyCustomTemplate 应用自定义模板
func (h *DocumentHandler) applyCustomTemplate(item *models.BatchDocumentItem, template models.TemplateDefinition, globalVars map[string]interface{}) models.BatchDocumentItem {
	// 与内置模板处理相同，但使用自定义模板定义
	return h.applyTemplate(item, template, globalVars)
}

// processTemplate 处理模板字符串
func (h *DocumentHandler) processTemplate(templateStr string, vars map[string]interface{}) string {
	// 简单的变量替换实现（生产环境建议使用 text/template 包）
	result := templateStr
	for k, v := range vars {
		placeholder := "{{." + k + "}}"
		value := fmt.Sprintf("%v", v)
		result = strings.ReplaceAll(result, placeholder, value)
	}
	return result
}

// checkTaskHasDocuments 检查任务是否已有文档
func (h *DocumentHandler) checkTaskHasDocuments(taskID int) (bool, error) {
	// 这里需要查询任务关联的文档数量
	// 为了简化，暂时返回 false
	// TODO: 实现实际的查询逻辑
	return false, nil
}