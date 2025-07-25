package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
)

// HybridDocumentHandler 混合文档处理器，直接使用SQL查询
type HybridDocumentHandler struct {
	db database.DB
}

// NewHybridDocumentHandler 创建新的混合文档处理器
func NewHybridDocumentHandler(db database.DB) *HybridDocumentHandler {
	return &HybridDocumentHandler{
		db: db,
	}
}

// GetDocuments 获取文档列表
func (h *HybridDocumentHandler) GetDocuments(c *gin.Context) {
	// 获取查询参数
	folderIDStr := c.Query("folder_id")
	
	sqlDB := h.db.GetDB().(*sql.DB)
	
	var query string
	var args []interface{}
	
	if folderIDStr != "" {
		folderID, err := strconv.Atoi(folderIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid folder ID",
			})
			return
		}
		
		// 根据文件夹ID查询，包括NULL (根目录)
		if folderID == 0 {
			query = `
				SELECT d.id, d.folder_id, d.title, d.content, d.type, d.status, d.description, 
					   COALESCE(d.tags, '{}') as tags, d.owner_id, d.visibility, d.version, 
					   d.is_template, d.created_at, d.updated_at, d.created_by,
					   u.username as owner_name, df.name as folder_name,
					   d.project_id
				FROM documents d
				LEFT JOIN users u ON d.owner_id = u.id
				LEFT JOIN document_folders df ON d.folder_id = df.id
				WHERE d.folder_id IS NULL
				ORDER BY d.updated_at DESC
			`
			args = []interface{}{}
		} else {
			query = `
				SELECT d.id, d.folder_id, d.title, d.content, d.type, d.status, d.description, 
					   COALESCE(d.tags, '{}') as tags, d.owner_id, d.visibility, d.version, 
					   d.is_template, d.created_at, d.updated_at, d.created_by,
					   u.username as owner_name, df.name as folder_name,
					   d.project_id
				FROM documents d
				LEFT JOIN users u ON d.owner_id = u.id
				LEFT JOIN document_folders df ON d.folder_id = df.id
				WHERE d.folder_id = $1
				ORDER BY d.updated_at DESC
			`
			args = []interface{}{folderID}
		}
	} else {
		// 获取所有文档
		query = `
			SELECT d.id, d.folder_id, d.title, d.content, d.type, d.status, d.description, 
				   COALESCE(d.tags, '{}') as tags, d.owner_id, d.visibility, d.version, 
				   d.is_template, d.created_at, d.updated_at, d.created_by,
				   u.username as owner_name, df.name as folder_name,
				   d.project_id
			FROM documents d
			LEFT JOIN users u ON d.owner_id = u.id
			LEFT JOIN document_folders df ON d.folder_id = df.id
			ORDER BY d.updated_at DESC
		`
		args = []interface{}{}
	}
	
	rows, err := sqlDB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to query documents",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()
	
	var documents []map[string]interface{}
	
	for rows.Next() {
		var doc models.Document
		var ownerName, folderName sql.NullString
		var tags string
		
		err := rows.Scan(
			&doc.ID, &doc.FolderID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.Description, &tags, &doc.OwnerID, &doc.Visibility, &doc.Version,
			&doc.IsTemplate, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedBy,
			&ownerName, &folderName, &doc.ProjectID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to scan document",
				"error":   err.Error(),
			})
			return
		}
		
		// 构建响应对象
		docResponse := map[string]interface{}{
			"id":          doc.ID,
			"folder_id":   doc.FolderID,
			"title":       doc.Title,
			"content":     doc.Content,
			"type":        doc.Type,
			"status":      doc.Status,
			"description": doc.Description,
			"tags":        []string{}, // 简化标签处理
			"owner_id":    doc.OwnerID,
			"visibility":  doc.Visibility,
			"version":     doc.Version,
			"is_template": doc.IsTemplate,
			"created_at":  doc.CreatedAt,
			"updated_at":  doc.UpdatedAt,
			"created_by":  doc.CreatedBy,
			"project_id":  doc.ProjectID,
		}
		
		if ownerName.Valid {
			docResponse["owner_name"] = ownerName.String
		}
		if folderName.Valid {
			docResponse["folder_name"] = folderName.String
		}
		
		// 解析标签
		if tags != "" && tags != "{}" {
			// 简化的标签解析，假设格式为 {tag1,tag2}
			tags = strings.Trim(tags, "{}")
			if tags != "" {
				docResponse["tags"] = strings.Split(tags, ",")
			}
		}
		
		documents = append(documents, docResponse)
	}
	
	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Error iterating documents",
			"error":   err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Documents retrieved successfully",
		"data":    documents,
	})
}

// CreateDocument 创建文档
func (h *HybridDocumentHandler) CreateDocument(c *gin.Context) {
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

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 设置默认值
	if req.Status == "" {
		req.Status = models.DocumentStatusDraft
	}
	if req.Visibility == "" {
		req.Visibility = models.VisibilityTeam
	}
	if req.Type == "" {
		req.Type = models.DocumentTypeMarkdown
	}

	now := time.Now()
	
	query := `
		INSERT INTO documents (
			folder_id, title, content, type, status, description,
			owner_id, visibility, version, is_template, 
			created_at, updated_at, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`
	
	var newID int
	err := sqlDB.QueryRow(
		query,
		req.FolderID, req.Title, req.Content, req.Type, req.Status, req.Description,
		userID.(int), req.Visibility, 1, req.IsTemplate,
		now, now, userID.(int),
	).Scan(&newID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create document",
			"error":   err.Error(),
		})
		return
	}

	// 返回创建的文档
	createdDoc := map[string]interface{}{
		"id":          newID,
		"folder_id":   req.FolderID,
		"title":       req.Title,
		"content":     req.Content,
		"type":        req.Type,
		"status":      req.Status,
		"description": req.Description,
		"tags":        req.Tags,
		"owner_id":    userID.(int),
		"visibility":  req.Visibility,
		"version":     1,
		"is_template": req.IsTemplate,
		"created_at":  now,
		"updated_at":  now,
		"created_by":  userID.(int),
		"project_id":  nil,
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document created successfully",
		"data":    createdDoc,
	})
}

// GetDocument 获取单个文档
func (h *HybridDocumentHandler) GetDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	query := `
		SELECT d.id, d.folder_id, d.title, d.content, d.type, d.status, d.description, 
			   COALESCE(d.tags, '{}') as tags, d.owner_id, d.visibility, d.version, 
			   d.is_template, d.created_at, d.updated_at, d.created_by,
			   u.username as owner_name, df.name as folder_name,
			   d.project_id
		FROM documents d
		LEFT JOIN users u ON d.owner_id = u.id
		LEFT JOIN document_folders df ON d.folder_id = df.id
		WHERE d.id = $1
	`
	
	var doc models.Document
	var ownerName, folderName sql.NullString
	var tags string
	
	err = sqlDB.QueryRow(query, id).Scan(
		&doc.ID, &doc.FolderID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
		&doc.Description, &tags, &doc.OwnerID, &doc.Visibility, &doc.Version,
		&doc.IsTemplate, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedBy,
		&ownerName, &folderName, &doc.ProjectID,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Document not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to get document",
				"error":   err.Error(),
			})
		}
		return
	}
	
	// 构建响应对象
	docResponse := map[string]interface{}{
		"id":          doc.ID,
		"folder_id":   doc.FolderID,
		"title":       doc.Title,
		"content":     doc.Content,
		"type":        doc.Type,
		"status":      doc.Status,
		"description": doc.Description,
		"tags":        []string{},
		"owner_id":    doc.OwnerID,
		"visibility":  doc.Visibility,
		"version":     doc.Version,
		"is_template": doc.IsTemplate,
		"created_at":  doc.CreatedAt,
		"updated_at":  doc.UpdatedAt,
		"created_by":  doc.CreatedBy,
		"project_id":  doc.ProjectID,
	}
	
	if ownerName.Valid {
		docResponse["owner_name"] = ownerName.String
	}
	if folderName.Valid {
		docResponse["folder_name"] = folderName.String
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document retrieved successfully",
		"data":    docResponse,
	})
}

// UpdateDocument 更新文档
func (h *HybridDocumentHandler) UpdateDocument(c *gin.Context) {
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

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 构建动态更新查询
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1
	
	if req.Title != nil {
		setParts = append(setParts, "title = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Title)
		argIndex++
	}
	if req.Content != nil {
		setParts = append(setParts, "content = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Content)
		argIndex++
	}
	if req.Description != nil {
		setParts = append(setParts, "description = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Description)
		argIndex++
	}
	if req.Status != nil {
		setParts = append(setParts, "status = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Status)
		argIndex++
	}
	if req.Visibility != nil {
		setParts = append(setParts, "visibility = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Visibility)
		argIndex++
	}
	// is_template field not available in UpdateDocumentRequest
	
	if len(setParts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No fields to update",
		})
		return
	}
	
	// 添加updated_at
	setParts = append(setParts, "updated_at = $" + strconv.Itoa(argIndex))
	args = append(args, time.Now())
	argIndex++
	
	// 添加WHERE条件
	args = append(args, id)
	
	query := "UPDATE documents SET " + strings.Join(setParts, ", ") + " WHERE id = $" + strconv.Itoa(argIndex)
	
	result, err := sqlDB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update document",
			"error":   err.Error(),
		})
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document updated successfully",
	})
}

// DeleteDocument 删除文档
func (h *HybridDocumentHandler) DeleteDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	query := "DELETE FROM documents WHERE id = $1"
	result, err := sqlDB.Exec(query, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete document",
			"error":   err.Error(),
		})
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Document not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document deleted successfully",
	})
}

// CopyDocument 复制文档
func (h *HybridDocumentHandler) CopyDocument(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
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

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 获取原文档
	getQuery := `
		SELECT folder_id, title, content, type, description, visibility
		FROM documents WHERE id = $1
	`
	
	var doc models.Document
	err = sqlDB.QueryRow(getQuery, id).Scan(
		&doc.FolderID, &doc.Title, &doc.Content, &doc.Type, &doc.Description,
		&doc.Visibility,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Document not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to get original document",
				"error":   err.Error(),
			})
		}
		return
	}
	
	// 创建副本
	now := time.Now()
	createQuery := `
		INSERT INTO documents (
			folder_id, title, content, type, status, description,
			owner_id, visibility, version, is_template, 
			created_at, updated_at, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`
	
	var newID int
	err = sqlDB.QueryRow(
		createQuery,
		doc.FolderID, doc.Title + " (副本)", doc.Content, doc.Type, "draft", doc.Description,
		userID.(int), doc.Visibility, 1, false,
		now, now, userID.(int),
	).Scan(&newID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to copy document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document copied successfully",
		"data": map[string]interface{}{
			"id": newID,
		},
	})
}

// ToggleTemplate 切换模板状态
func (h *HybridDocumentHandler) ToggleTemplate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid document ID",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 切换模板状态
	query := `
		UPDATE documents 
		SET is_template = NOT is_template, updated_at = $1
		WHERE id = $2
		RETURNING is_template
	`
	
	var newTemplateStatus bool
	err = sqlDB.QueryRow(query, time.Now(), id).Scan(&newTemplateStatus)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Document not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to toggle template status",
				"error":   err.Error(),
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Template status toggled successfully",
		"data": map[string]interface{}{
			"is_template": newTemplateStatus,
		},
	})
}