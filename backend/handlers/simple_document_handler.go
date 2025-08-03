package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
)

// SimpleDocumentHandler 简化的文档处理器
type SimpleDocumentHandler struct {
	// 临时内存存储，后续可以替换为数据库
	documents map[int]*models.Document
	nextID    int
}

// NewSimpleDocumentHandler 创建新的简化文档处理器
func NewSimpleDocumentHandler() *SimpleDocumentHandler {
	documents := make(map[int]*models.Document)

	// 初始化一些示例数据
	documents[1] = &models.Document{
		ID:          1,
		FolderID:    intPtr(1),
		Title:       "项目技术方案",
		Content:     stringPtr("# 项目技术方案\n\n这是一个项目的技术方案文档。\n\n## 技术栈\n- Go + Gin\n- React + TypeScript\n- PostgreSQL\n\n## 架构设计\n...\n"),
		Type:        models.DocumentTypeMarkdown,
		Status:      models.DocumentStatusPublished,
		Description: stringPtr("项目的核心技术方案"),
		Tags:        []string{"技术", "方案", "架构"},
		OwnerID:     1,
		Visibility:  models.VisibilityTeam,
		Version:     1,
		IsTemplate:  false,
		CreatedAt:   time.Now().Add(-7 * 24 * time.Hour),
		UpdatedAt:   time.Now().Add(-1 * 24 * time.Hour),
		CreatedBy:   1,
		OwnerName:   stringPtr("Admin"),
		FolderName:  stringPtr("项目文档"),
	}

	documents[2] = &models.Document{
		ID:          2,
		FolderID:    intPtr(2),
		Title:       "API文档",
		Content:     stringPtr("# API文档\n\n## 认证接口\n\n### POST /api/v1/auth/login\n\n登录接口\n\n#### 请求参数\n```json\n{\n  \"username\": \"admin\",\n  \"password\": \"password123\"\n}\n```\n\n#### 响应\n```json\n{\n  \"success\": true,\n  \"data\": {\n    \"token\": \"jwt_token_here\"\n  }\n}\n```\n"),
		Type:        models.DocumentTypeMarkdown,
		Status:      models.DocumentStatusDraft,
		Description: stringPtr("后端API接口文档"),
		Tags:        []string{"API", "文档", "后端"},
		OwnerID:     1,
		Visibility:  models.VisibilityPublic,
		Version:     1,
		IsTemplate:  false,
		CreatedAt:   time.Now().Add(-3 * 24 * time.Hour),
		UpdatedAt:   time.Now().Add(-6 * time.Hour),
		CreatedBy:   1,
		OwnerName:   stringPtr("Admin"),
		FolderName:  stringPtr("技术文档"),
	}

	documents[3] = &models.Document{
		ID:          3,
		FolderID:    intPtr(1),
		Title:       "用户手册",
		Content:     stringPtr("# 用户手册\n\n## 快速开始\n\n1. 登录系统\n2. 创建项目\n3. 添加任务\n4. 管理进度\n\n## 功能介绍\n\n### 项目管理\n- 创建项目\n- 编辑项目信息\n- 删除项目\n\n### 任务管理\n- 创建任务\n- 分配任务\n- 跟踪进度\n"),
		Type:        models.DocumentTypeMarkdown,
		Status:      models.DocumentStatusPublished,
		Description: stringPtr("系统使用手册"),
		Tags:        []string{"用户手册", "教程", "帮助"},
		OwnerID:     1,
		Visibility:  models.VisibilityPublic,
		Version:     2,
		IsTemplate:  false,
		CreatedAt:   time.Now().Add(-5 * 24 * time.Hour),
		UpdatedAt:   time.Now().Add(-2 * time.Hour),
		CreatedBy:   1,
		OwnerName:   stringPtr("Admin"),
		FolderName:  stringPtr("项目文档"),
	}

	return &SimpleDocumentHandler{
		documents: documents,
		nextID:    4,
	}
}

// CreateDocument 创建文档
func (h *SimpleDocumentHandler) CreateDocument(c *gin.Context) {
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
		ID:          h.nextID,
		FolderID:    req.FolderID,
		Title:       req.Title,
		Content:     req.Content,
		Type:        req.Type,
		Status:      req.Status,
		Description: req.Description,
		Tags:        req.Tags,
		OwnerID:     userID.(int),
		Visibility:  req.Visibility,
		Version:     1,
		IsTemplate:  req.IsTemplate,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   userID.(int),
		OwnerName:   stringPtr("Admin"),
		FolderName:  stringPtr("当前文件夹"),
	}

	h.documents[h.nextID] = document
	h.nextID++

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document created successfully",
		"data":    document,
	})
}

// GetDocuments 获取文档列表
func (h *SimpleDocumentHandler) GetDocuments(c *gin.Context) {
	// 获取查询参数
	folderIDStr := c.Query("folder_id")
	
	documents := make([]*models.Document, 0)
	
	if folderIDStr != "" {
		folderID, err := strconv.Atoi(folderIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid folder ID",
			})
			return
		}
		
		// 按文件夹过滤
		for _, doc := range h.documents {
			if doc.FolderID != nil && *doc.FolderID == folderID {
				documents = append(documents, doc)
			}
		}
	} else {
		// 返回所有文档
		for _, doc := range h.documents {
			documents = append(documents, doc)
		}
	}

	response := models.DocumentListResponse{
		Documents: make([]models.Document, len(documents)),
		Total:     len(documents),
		Page:      1,
		PageSize:  50,
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
func (h *SimpleDocumentHandler) GetDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	document, exists := h.documents[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
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
func (h *SimpleDocumentHandler) UpdateDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	document, exists := h.documents[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
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

	// 更新字段
	if req.Title != nil {
		document.Title = *req.Title
	}
	if req.Content != nil {
		document.Content = req.Content
	}
	if req.Status != nil {
		document.Status = *req.Status
	}
	if req.Description != nil {
		document.Description = req.Description
	}
	if req.Tags != nil {
		document.Tags = *req.Tags
	}
	if req.Visibility != nil {
		document.Visibility = *req.Visibility
	}
	if req.FolderID != nil {
		document.FolderID = req.FolderID
	}
	
	document.UpdatedAt = time.Now()
	document.Version++

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document updated successfully",
		"data":    document,
	})
}

// DeleteDocument 删除文档
func (h *SimpleDocumentHandler) DeleteDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	_, exists := h.documents[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
		})
		return
	}

	delete(h.documents, id)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document deleted successfully",
	})
}

// CopyDocument 复制文档
func (h *SimpleDocumentHandler) CopyDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	original, exists := h.documents[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
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

	// 创建副本
	copied := &models.Document{
		ID:          h.nextID,
		FolderID:    original.FolderID,
		Title:       original.Title + " - 副本",
		Content:     original.Content,
		Type:        original.Type,
		Status:      models.DocumentStatusDraft,
		Description: original.Description,
		Tags:        original.Tags,
		OwnerID:     userID.(int),
		Visibility:  original.Visibility,
		Version:     1,
		IsTemplate:  false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   userID.(int),
		OwnerName:   stringPtr("Admin"),
		FolderName:  original.FolderName,
	}

	h.documents[h.nextID] = copied
	h.nextID++

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document copied successfully",
		"data":    copied,
	})
}

// ToggleTemplate 切换模板状态
func (h *SimpleDocumentHandler) ToggleTemplate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	document, exists := h.documents[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
		})
		return
	}

	document.IsTemplate = !document.IsTemplate
	document.UpdatedAt = time.Now()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Template status updated",
		"data":    document,
	})
}

// SearchDocuments 搜索文档
func (h *SimpleDocumentHandler) SearchDocuments(c *gin.Context) {
	query := c.Query("query")
	documents := make([]*models.Document, 0)

	// 简单的搜索实现：在标题和内容中搜索
	for _, doc := range h.documents {
		if query == "" || 
		   containsIgnoreCase(doc.Title, query) ||
		   (doc.Content != nil && containsIgnoreCase(*doc.Content, query)) ||
		   (doc.Description != nil && containsIgnoreCase(*doc.Description, query)) {
			documents = append(documents, doc)
		}
	}

	response := models.DocumentSearchResponse{
		Documents:   make([]models.Document, len(documents)),
		TotalCount:  len(documents),
		Page:        1,
		Limit:       50,
		HasNextPage: false,
		HasPrevPage: false,
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

// GetFolderDocuments 获取文件夹下的文档
func (h *SimpleDocumentHandler) GetFolderDocuments(c *gin.Context) {
	folderIDStr := c.Param("id")
	
	documents := make([]*models.Document, 0)
	
	if folderIDStr == "root" {
		// 根目录：返回没有folder_id的文档
		for _, doc := range h.documents {
			if doc.FolderID == nil {
				documents = append(documents, doc)
			}
		}
	} else {
		folderID, err := strconv.Atoi(folderIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid folder ID",
			})
			return
		}
		
		// 按文件夹过滤
		for _, doc := range h.documents {
			if doc.FolderID != nil && *doc.FolderID == folderID {
				documents = append(documents, doc)
			}
		}
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
		"message": "Folder documents retrieved successfully",
		"data":    response,
	})
}

// 辅助函数在其他文件中已定义

func containsIgnoreCase(str, substr string) bool {
	// 简单的忽略大小写搜索
	str = strings.ToLower(str)
	substr = strings.ToLower(substr)
	return strings.Contains(str, substr)
}