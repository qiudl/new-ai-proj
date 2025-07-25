package handlers

import (
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
)

// SimpleDocumentHandler 简化的文档处理器
type SimpleDocumentHandler struct {
	db database.DB
}

// NewSimpleDocumentHandler 创建新的简化文档处理器
func NewSimpleDocumentHandler(db database.DB) *SimpleDocumentHandler {
	return &SimpleDocumentHandler{
		db: db,
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
		FolderName:  stringPtr("Current Folder"),
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Documents retrieved successfully",
		"data":    documents,
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

// 辅助函数
func intPtr(i int) *int {
	return &i
}

func int64Ptr(i int64) *int64 {
	return &i
}