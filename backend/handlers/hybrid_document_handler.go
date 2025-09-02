package handlers

import (
	"database/sql"
	"encoding/json"
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

// UpdateDocument 更新文档 - 修复版
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

	if req.Title != nil && *req.Title != "" {
		setParts = append(setParts, "title = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Title)
		argIndex++
	}
	if req.Content != nil {
		setParts = append(setParts, "content = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Content)
		argIndex++
	}
	if req.Description != nil {
		setParts = append(setParts, "description = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Description)
		argIndex++
	}
	if req.Type != nil {
		setParts = append(setParts, "type = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Type)
		argIndex++
	}
	if req.Status != nil {
		setParts = append(setParts, "status = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Status)
		argIndex++
	}
	if req.Visibility != nil {
		setParts = append(setParts, "visibility = $"+strconv.Itoa(argIndex))
		args = append(args, *req.Visibility)
		argIndex++
	}
	if req.FolderID != nil {
		setParts = append(setParts, "folder_id = $"+strconv.Itoa(argIndex))
		args = append(args, req.FolderID)
		argIndex++
	}
	if req.ProjectID != nil {
		setParts = append(setParts, "project_id = $"+strconv.Itoa(argIndex))
		args = append(args, req.ProjectID)
		argIndex++
	}
	if req.IsTemplate != nil {
		setParts = append(setParts, "is_template = $"+strconv.Itoa(argIndex))
		args = append(args, *req.IsTemplate)
		argIndex++
	}

	// 如果没有字段需要更新，但这是一个有效的更新请求，只更新时间戳
	if len(setParts) == 0 {
		// 允许空更新（比如只是触发时间戳更新）
		setParts = append(setParts, "updated_at = $"+strconv.Itoa(argIndex))
		args = append(args, time.Now())
		argIndex++
	} else {
		// 添加updated_at
		setParts = append(setParts, "updated_at = $"+strconv.Itoa(argIndex))
		args = append(args, time.Now())
		argIndex++
	}

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

	// 返回更新后的文档
	var updatedDoc map[string]interface{}
	getQuery := `
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

	err = sqlDB.QueryRow(getQuery, id).Scan(
		&doc.ID, &doc.FolderID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
		&doc.Description, &tags, &doc.OwnerID, &doc.Visibility, &doc.Version,
		&doc.IsTemplate, &doc.CreatedAt, &doc.UpdatedAt, &doc.CreatedBy,
		&ownerName, &folderName, &doc.ProjectID,
	)

	if err == nil {
		updatedDoc = map[string]interface{}{
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
			updatedDoc["owner_name"] = ownerName.String
		}
		if folderName.Valid {
			updatedDoc["folder_name"] = folderName.String
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document updated successfully",
		"data":    updatedDoc,
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
		doc.FolderID, doc.Title+" (副本)", doc.Content, doc.Type, "draft", doc.Description,
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

// CreateAndAttachDocument 创建文档并关联到任务（原子操作）
func (h *HybridDocumentHandler) CreateAndAttachDocument(c *gin.Context) {
	// 获取路径参数
	projectIDStr := c.Param("id")
	taskIDStr := c.Param("taskId")

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 解析请求体
	var req struct {
		Title       string `json:"title" binding:"required"`
		Content     string `json:"content" binding:"required"`
		Description string `json:"description"`
		Type        string `json:"type"`
		Status      string `json:"status"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request body: " + err.Error(),
		})
		return
	}

	// 设置默认值
	if req.Type == "" {
		req.Type = "markdown"
	}
	if req.Status == "" {
		req.Status = "draft"
	}

	// 开始事务
	sqlDB := h.db.GetDB().(*sql.DB)
	tx, err := sqlDB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to start transaction",
		})
		return
	}
	defer tx.Rollback()

	// 首先验证任务和项目是否存在
	var taskExists bool
	err = tx.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM tasks 
			WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
		)
	`, taskID, projectID).Scan(&taskExists)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to verify task existence",
		})
		return
	}

	if !taskExists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Task not found or does not belong to the specified project",
		})
		return
	}

	// 创建文档
	var documentID int
	now := time.Now().UTC()
	err = tx.QueryRow(`
		INSERT INTO documents (
			project_id, title, content, description, type, status, 
			owner_id, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`, projectID, req.Title, req.Content, req.Description, req.Type, req.Status,
		userID, userID, now, now).Scan(&documentID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create document: " + err.Error(),
		})
		return
	}

	// 创建任务文档关联
	_, err = tx.Exec(`
		INSERT INTO task_documents (task_id, document_id, relationship_type, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (task_id, document_id) DO NOTHING
	`, taskID, documentID, "attachment", userID, now, now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to attach document to task: " + err.Error(),
		})
		return
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to commit transaction",
		})
		return
	}

	// 返回成功响应
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Document created and attached to task successfully",
		"data": map[string]interface{}{
			"document_id": documentID,
			"task_id":     taskID,
			"project_id":  projectID,
			"title":       req.Title,
			"type":        req.Type,
			"status":      req.Status,
			"created_at":  now,
		},
	})
}

// GetTaskDocuments 获取任务相关的文档列表 - 更新触发重编译
func (h *HybridDocumentHandler) GetTaskDocuments(c *gin.Context) {
	// 获取路径参数
	projectIDStr := c.Param("id")
	taskIDStr := c.Param("taskId")

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)

	// 查询任务关联的文档
	query := `
		SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
		       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
		       d.owner_id, d.visibility, d.version, d.is_template,
		       d.created_by, d.created_at, d.updated_at,
		       u.username as owner_name, td.relationship_type
		FROM documents d
		INNER JOIN task_documents td ON d.id = td.document_id
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE td.task_id = $1 AND d.project_id = $2 AND d.deleted_at IS NULL AND td.deleted_at IS NULL
		ORDER BY td.sort_order, td.created_at`

	rows, err := sqlDB.Query(query, taskID, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve task documents",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	documents := []map[string]interface{}{}

	for rows.Next() {
		var doc models.Document
		var ownerName sql.NullString
		var relationshipType sql.NullString
		var tagsJSON sql.NullString // 使用 sql.NullString 来处理可能的 NULL 值

		err := rows.Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tagsJSON,
			&doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt,
			&ownerName, &relationshipType,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to parse document data",
				"error":   err.Error(),
			})
			return
		}

		// 处理 tags 字段
		var tags []string
		if tagsJSON.Valid && tagsJSON.String != "" {
			err := json.Unmarshal([]byte(tagsJSON.String), &tags)
			if err != nil {
				tags = []string{} // 如果解析失败，使用空数组
			}
		} else {
			tags = []string{} // 如果为 NULL 或空，使用空数组
		}

		docData := map[string]interface{}{
			"id":          doc.ID,
			"project_id":  doc.ProjectID,
			"title":       doc.Title,
			"content":     doc.Content,
			"type":        doc.Type,
			"status":      doc.Status,
			"file_url":    doc.FileURL,
			"file_size":   doc.FileSize,
			"mime_type":   doc.MimeType,
			"description": doc.Description,
			"tags":        tags,
			"owner_id":    doc.OwnerID,
			"visibility":  doc.Visibility,
			"version":     doc.Version,
			"is_template": doc.IsTemplate,
			"created_by":  doc.CreatedBy,
			"created_at":  doc.CreatedAt,
			"updated_at":  doc.UpdatedAt,
		}

		if ownerName.Valid {
			docData["owner_name"] = ownerName.String
		}
		if relationshipType.Valid {
			docData["relationship_type"] = relationshipType.String
		}

		documents = append(documents, docData)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Error reading document rows",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    documents,
		"total":   len(documents),
		"message": "Task documents retrieved successfully",
	})
}

// HasTaskDocument 检查任务是否有关联的文档
func (h *HybridDocumentHandler) HasTaskDocument(c *gin.Context) {
	// 获取路径参数
	projectIDStr := c.Param("id")
	taskIDStr := c.Param("taskId")

	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)

	// 查询任务是否有关联文档
	query := `
		SELECT COUNT(*) 
		FROM documents d
		INNER JOIN task_documents td ON d.id = td.document_id
		WHERE td.task_id = $1 AND d.project_id = $2 AND d.deleted_at IS NULL AND td.deleted_at IS NULL`

	var count int
	err = sqlDB.QueryRow(query, taskID, projectID).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to check task document existence",
			"error":   err.Error(),
		})
		return
	}

	hasDocument := count > 0

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"has_document": hasDocument,
		"data":         hasDocument,
		"count":        count,
		"message": func() string {
			if hasDocument {
				return "✅ 任务已有关联文档"
			}
			return "📄 任务暂无关联文档"
		}(),
	})
}
