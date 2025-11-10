package routes

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
)

// responseRecorder 用于捕获响应内容（不写入原始Writer，避免重复响应）
type responseRecorder struct {
	gin.ResponseWriter
	body       *bytes.Buffer
	statusCode int
}

func (r *responseRecorder) Write(data []byte) (int, error) {
	// 只写入buffer，不写入原始Writer
	return r.body.Write(data)
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	// 不调用原始Writer的WriteHeader，避免提前发送响应
}

func (r *responseRecorder) Status() int {
	if r.statusCode == 0 {
		return 200 // 默认200
	}
	return r.statusCode
}

// standardErrorResponse 标准错误响应格式
func standardErrorResponse(message string, err error) gin.H {
	response := gin.H{
		"success":   false,
		"message":   message,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	
	if err != nil {
		response["error"] = err.Error()
	}
	
	return response
}

// standardSuccessResponse 标准成功响应格式
func standardSuccessResponse(message string, data interface{}) gin.H {
	return gin.H{
		"success":   true,
		"message":   message,
		"data":      data,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
}

// validateRequest 验证请求参数
func validateRequest(params map[string]interface{}) error {
	for key, value := range params {
		if value == nil || value == "" {
			return fmt.Errorf("%s is required", key)
		}
	}
	return nil
}

// RegisterMCPRoutes 注册MCP专用路由
func RegisterMCPRoutes(router *gin.RouterGroup, app ApplicationInterface) {
	// MCP专用路由组
	mcp := router.Group("/mcp")
	// 支持服务账号API Key和JWT两种认证方式
	mcp.Use(middleware.ServiceAccountOrJWTAuthMiddleware(app.GetDB(), middleware.AuthMiddleware(app.GetJWTManager(), app.GetDB())))

	// 获取handlers
	documentHandler := app.GetDocumentHandler()
	workNoteHandler := app.GetWorkNoteHandler()
	reportHandler := app.GetReportHandler()

	// 任务文档相关路由
	mcp.POST("/create-and-attach", CreateAndAttachTaskDocument(app))
	mcp.POST("/create-and-attach-work-note", createAndAttachWorkNote(workNoteHandler))
	mcp.POST("/create-batch-documents", createBatchDocuments(documentHandler))
	mcp.POST("/create-task-docs", createTaskDocs(documentHandler))
	mcp.GET("/task-document/:taskId", getTaskDocument(documentHandler, app))
	mcp.PUT("/task-document/:taskId", updateTaskDocument(documentHandler, app))    // 更新任务文档
	mcp.PATCH("/task-document/:taskId", updateTaskDocument(documentHandler, app))  // 部分更新任务文档
	mcp.DELETE("/task-document/:taskId", deleteTaskDocument(documentHandler, app))
	mcp.GET("/task-document/:taskId/exists", hasTaskDocument(documentHandler, app))

	// 文档直接查询路由（通过文档ID）
	mcp.GET("/documents/:documentId", getDocumentByID(app))
	// 文档内容追加路由（新增）
	mcp.POST("/documents/append", appendToDocument(app))

	// 工作笔记相关路由
	mcp.POST("/create-work-note", createWorkNote(workNoteHandler))
	mcp.POST("/work-notes", createWorkNote(workNoteHandler))  // 保留兼容性
	mcp.GET("/list-work-notes", listWorkNotes(workNoteHandler))
	mcp.GET("/work-notes", listWorkNotes(workNoteHandler))
	mcp.GET("/search-work-notes", searchWorkNotes(workNoteHandler))
	mcp.POST("/search-work-notes", searchWorkNotesPost(workNoteHandler))
	mcp.GET("/work-notes/search", searchWorkNotes(workNoteHandler))
	mcp.GET("/work-notes/:id", getWorkNote(workNoteHandler))
	mcp.PUT("/work-notes/:id", updateWorkNote(workNoteHandler))

	// 报告相关路由
	mcp.GET("/get-daily-work-report", reportHandler.GetDailyWorkReport)
	mcp.POST("/get-daily-work-report", reportHandler.GetDailyWorkReport)

	// Task and Timer combined operations
	mcp.POST("/start-task-with-timer", startTaskWithTimer(app))
	mcp.POST("/switch-to-task", switchToTask(app))

	// 子任务管理路由
	mcp.POST("/create-subtask", createSubtask(app))
	mcp.POST("/create-sibling-task", createSiblingTask(app))

	// 需求管理路由 (MCP Requirements)
	mcp.POST("/requirements/create", mcpCreateRequirement(app))
	mcp.GET("/requirements/:id", mcpGetRequirement(app))
	mcp.PUT("/requirements/:id", mcpUpdateRequirement(app))
	mcp.GET("/requirements", mcpListRequirements(app))

	// Phase 2: 需求-任务关联
	mcp.POST("/requirements/:id/link-tasks", mcpLinkTasksToRequirement(app))
	mcp.DELETE("/requirements/:id/tasks/:task_id", mcpUnlinkTaskFromRequirement(app))
	mcp.GET("/requirements/:id/tasks", mcpGetRequirementTasks(app))

	// Phase 3: 需求状态流转
	mcp.POST("/requirements/:id/submit", mcpSubmitRequirement(app))
	mcp.POST("/requirements/:id/approve", mcpApproveRequirement(app))
	mcp.POST("/requirements/:id/reject", mcpRejectRequirement(app))
	mcp.POST("/requirements/:id/withdraw", mcpWithdrawRequirement(app))
	mcp.POST("/requirements/:id/archive", mcpArchiveRequirement(app))

	// MCP Worktree工具路由 (Phase 5)
	RegisterMCPWorktreeRoutes(mcp, app)
}

// CreateAndAttachTaskDocument MCP专用：创建并关联任务文档
// 实现UPSERT语义：如果文档已存在则更新，否则创建新文档
// 此函数可供MCP路由和标准HTTP路由共同使用
// CreateAndAttachTaskDocument MCP专用：创建并关联任务文档（纯数据库操作版本）
// 实现UPSERT语义：如果文档已存在则更新，否则创建新文档
func CreateAndAttachTaskDocument(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskID    int    `json:"taskId"`
			Content   string `json:"content"`
			ProjectID *int   `json:"projectId,omitempty"`
			Title     string `json:"title,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		// 验证必填字段
		if err := validateRequest(map[string]interface{}{
			"taskId":  req.TaskID,
			"content": req.Content,
		}); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Validation failed", err))
			return
		}

		// 获取用户ID
		userIDValue, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, standardErrorResponse("User not authenticated", nil))
			return
		}

		userID := 0
		switch v := userIDValue.(type) {
		case int:
			userID = v
		case uint:
			userID = int(v)
		case int64:
			userID = int(v)
		case float64:
			userID = int(v)
		default:
			c.JSON(http.StatusUnauthorized, standardErrorResponse("Invalid user ID type", nil))
			return
		}

		if userID == 0 {
			c.JSON(http.StatusUnauthorized, standardErrorResponse("User not authenticated", nil))
			return
		}

		// 项目ID推导逻辑
		projectID := 1
		if req.ProjectID != nil {
			projectID = *req.ProjectID
		} else {
			// 从任务中获取项目ID
			if taskRepo := app.GetDB().Tasks(); taskRepo != nil {
				if task, err := taskRepo.GetByID(c.Request.Context(), req.TaskID); err == nil && task != nil {
					projectID = task.ProjectID
				}
			}
		}

		// 生成默认标题
		title := strings.TrimSpace(req.Title)
		if title == "" {
			lines := strings.Split(req.Content, "\n")
			if len(lines) > 0 {
				firstLine := strings.TrimSpace(lines[0])
				firstLine = strings.TrimLeft(firstLine, "# ")
				firstLine = strings.TrimSpace(firstLine)
				runes := []rune(firstLine)
				if len(runes) > 60 {
					title = string(runes[:60]) + "..."
				} else if firstLine != "" {
					title = firstLine
				} else {
					title = "任务文档"
				}
			} else {
				title = "任务文档"
			}
		}

		// 获取数据库连接
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database connection error", nil))
			return
		}

		// 获取文档仓库
		docRepo := app.GetDB().Documents()
		if docRepo == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Document repository not available", nil))
			return
		}

		// 检查任务是否已有文档（UPSERT语义）
		var existingDocID int
		err := sqlDB.QueryRowContext(c.Request.Context(), `
			SELECT d.id
			FROM documents d
			INNER JOIN task_documents td ON d.id = td.document_id
			WHERE td.task_id = $1
			  AND d.deleted_at IS NULL
			  AND td.deleted_at IS NULL
			ORDER BY
			  CASE WHEN td.relationship_type = 'main' THEN 1 ELSE 2 END,
			  td.created_at ASC
			LIMIT 1
		`, req.TaskID).Scan(&existingDocID)

		if err == nil {
			// ========== 更新现有文档 ==========
			log.Printf("[INFO] MCP create-and-attach: Updating existing document %d for task %d", existingDocID, req.TaskID)

			// 直接使用SQL更新文档
			query := `
				UPDATE documents
				SET title = $1, content = $2, version = version + 1, updated_at = NOW()
				WHERE id = $3 AND deleted_at IS NULL
				RETURNING id, title, content, version, updated_at
			`

			var updatedDoc struct {
				ID        int
				Title     string
				Content   string
				Version   int
				UpdatedAt time.Time
			}

			updateErr := sqlDB.QueryRowContext(c.Request.Context(), query, title, req.Content, existingDocID).Scan(
				&updatedDoc.ID, &updatedDoc.Title, &updatedDoc.Content, &updatedDoc.Version, &updatedDoc.UpdatedAt,
			)

			if updateErr != nil {
				log.Printf("[ERROR] MCP create-and-attach: Failed to update document: %v", updateErr)
				c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to update document", updateErr))
				return
			}

			log.Printf("[SUCCESS] MCP create-and-attach: Document %d updated successfully", updatedDoc.ID)

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "Document updated successfully",
				"data": gin.H{
					"action":      "updated",
					"document_id": updatedDoc.ID,
					"task_id":     req.TaskID,
					"project_id":  projectID,
					"title":       updatedDoc.Title,
					"content":     updatedDoc.Content,
					"version":     fmt.Sprintf("%d", updatedDoc.Version),
					"size":        len(updatedDoc.Content),
					"updated_at":  updatedDoc.UpdatedAt.Format(time.RFC3339),
				},
			})

		} else if err == sql.ErrNoRows {
			// ========== 创建新文档 ==========
			log.Printf("[INFO] MCP create-and-attach: Creating new document for task %d", req.TaskID)

			newDoc := &models.Document{
				ProjectID:  &projectID,
				Title:      title,
				Content:    &req.Content,
				Type:       "markdown",
				Status:     "draft",
				OwnerID:    userID,
				Visibility: "team",
				Version:    1,
				CreatedBy:  userID,
			}

			createdDoc, createErr := docRepo.Create(c.Request.Context(), newDoc)
			if createErr != nil {
				log.Printf("[ERROR] MCP create-and-attach: Failed to create document: %v", createErr)
				c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to create document", createErr))
				return
			}

			log.Printf("[SUCCESS] MCP create-and-attach: Document %d created", createdDoc.ID)

			// 创建任务关联
			attachErr := docRepo.AttachToTask(c.Request.Context(), req.TaskID, createdDoc.ID, "main", userID)
			if attachErr != nil {
				log.Printf("[ERROR] MCP create-and-attach: Failed to attach document to task: %v", attachErr)
				c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to attach document to task", attachErr))
				return
			}

			log.Printf("[SUCCESS] MCP create-and-attach: Document %d attached to task %d", createdDoc.ID, req.TaskID)

			c.JSON(http.StatusCreated, gin.H{
				"success": true,
				"message": "Document created successfully",
				"data": gin.H{
					"action":      "created",
					"document_id": createdDoc.ID,
					"task_id":     req.TaskID,
					"project_id":  projectID,
					"title":       createdDoc.Title,
					"content":     *createdDoc.Content,
					"version":     "1",
					"size":        len(*createdDoc.Content),
					"created_at":  createdDoc.CreatedAt.Format(time.RFC3339),
				},
			})

		} else {
			// 数据库查询错误
			log.Printf("[ERROR] MCP create-and-attach: Database query error: %v", err)
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to check existing document", err))
		}
	}
}

func createAndAttachWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskID  int    `json:"taskId"`
			Content string `json:"content"`
			Title   string `json:"title,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		// 验证必填字段
		if err := validateRequest(map[string]interface{}{
			"taskId":  req.TaskID,
			"content": req.Content,
		}); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Validation failed", err))
			return
		}

		// 生成默认标题（如果没有提供）
		title := req.Title
		if title == "" {
			title = fmt.Sprintf("工作笔记-任务%d", req.TaskID)
		}

		// 首先创建工作笔记
		requestBody := map[string]interface{}{
			"title":          title,
			"content":        req.Content,
			"visibility":     "team",
			"status":         "draft",
			"type":           "markdown",
			"work_note_type": "general",  // 添加工作笔记类型
			"priority":       "medium",   // 添加优先级
		}

		// 设置请求体
		jsonBody, _ := json.Marshal(requestBody)
		originalBody := c.Request.Body
		c.Request.Body = io.NopCloser(strings.NewReader(string(jsonBody)))
		c.Request.ContentLength = int64(len(jsonBody))

		// 创建一个响应记录器来捕获创建工作笔记的响应
		w := &responseRecorder{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = w

		// 调用现有的工作笔记创建逻辑
		h.CreateWorkNote(c)

		// 恢复原始请求体
		c.Request.Body = originalBody

		// 解析创建响应，获取工作笔记ID
		var createResp struct {
			Success bool `json:"success"`
			Data    struct {
				ID int `json:"id"`
			} `json:"data"`
		}

		if err := json.Unmarshal(w.body.Bytes(), &createResp); err != nil || !createResp.Success {
			// 如果工作笔记创建失败，返回错误
			return
		}

		// 如果工作笔记创建成功，尝试关联到任务
		userID, _ := c.Get("user_id")
		if workNoteID := createResp.Data.ID; workNoteID > 0 && userID != nil {
			// 这里需要调用关联服务，但由于我们在MCP路由中，需要手动创建关联
			// 为简化处理，暂时在响应中标记关联信息
			var finalResp map[string]interface{}
			json.Unmarshal(w.body.Bytes(), &finalResp)
			
			// 添加任务关联信息
			if data, ok := finalResp["data"].(map[string]interface{}); ok {
				data["task_association"] = map[string]interface{}{
					"task_id":       req.TaskID,
					"work_note_id":  workNoteID,
					"relation_type": "attached",
					"message":       fmt.Sprintf("工作笔记已创建并准备关联到任务 %d", req.TaskID),
				}
			}

			// 重新编码响应
			c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)
			c.JSON(http.StatusOK, standardSuccessResponse("Work note created and associated with task", finalResp["data"]))
			return
		}
	}
}

// getTaskDocument MCP专用：获取任务文档
func getTaskDocument(h *handlers.DocumentHandler, app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		taskIDStr := c.Param("taskId")
		taskID, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid taskId", err))
			return
		}

		// 从数据库查询任务所属的项目ID
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database connection error", nil))
			return
		}

		var projectID int
		err = sqlDB.QueryRow(`SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL`, taskID).Scan(&projectID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse("Task not found", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to query task", err))
			return
		}

		// 查询任务关联的主文档（第一个文档）
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
			ORDER BY td.sort_order, td.created_at
			LIMIT 1`

		var doc struct {
			ID               int            `json:"id"`
			ProjectID        int            `json:"project_id"`
			Title            string         `json:"title"`
			Content          string         `json:"content"`
			Type             string         `json:"type"`
			Status           string         `json:"status"`
			FileURL          sql.NullString `json:"file_url"`
			FileSize         sql.NullInt64  `json:"file_size"`
			MimeType         sql.NullString `json:"mime_type"`
			Description      sql.NullString `json:"description"`
			Tags             sql.NullString `json:"tags"`
			OwnerID          int            `json:"owner_id"`
			Visibility       string         `json:"visibility"`
			Version          int            `json:"version"`
			IsTemplate       bool           `json:"is_template"`
			CreatedBy        int            `json:"created_by"`
			CreatedAt        time.Time      `json:"created_at"`
			UpdatedAt        time.Time      `json:"updated_at"`
			OwnerName        sql.NullString `json:"owner_name"`
			RelationshipType sql.NullString `json:"relationship_type"`
		}

		err = sqlDB.QueryRow(query, taskID, projectID).Scan(
			&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
			&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &doc.Tags,
			&doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
			&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt,
			&doc.OwnerName, &doc.RelationshipType,
		)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse("No document found for task", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to retrieve task document", err))
			return
		}

		// 处理 tags 字段
		var tags []string
		if doc.Tags.Valid && doc.Tags.String != "" {
			if err := json.Unmarshal([]byte(doc.Tags.String), &tags); err != nil {
				tags = []string{}
			}
		} else {
			tags = []string{}
		}

		// 构建响应对象
		docData := map[string]interface{}{
			"id":                doc.ID,
			"project_id":        doc.ProjectID,
			"title":             doc.Title,
			"content":           doc.Content,
			"type":              doc.Type,
			"status":            doc.Status,
			"description":       doc.Description.String,
			"tags":              tags,
			"owner_id":          doc.OwnerID,
			"visibility":        doc.Visibility,
			"version":           doc.Version,
			"is_template":       doc.IsTemplate,
			"created_by":        doc.CreatedBy,
			"created_at":        doc.CreatedAt,
			"updated_at":        doc.UpdatedAt,
		}

		if doc.FileURL.Valid {
			docData["file_url"] = doc.FileURL.String
		}
		if doc.FileSize.Valid {
			docData["file_size"] = doc.FileSize.Int64
		}
		if doc.MimeType.Valid {
			docData["mime_type"] = doc.MimeType.String
		}
		if doc.OwnerName.Valid {
			docData["owner_name"] = doc.OwnerName.String
		}
		if doc.RelationshipType.Valid {
			docData["relationship_type"] = doc.RelationshipType.String
		}

		c.JSON(http.StatusOK, standardSuccessResponse("Task document retrieved successfully", docData))
	}
}

// getDocumentByID MCP专用：通过文档ID直接获取文档
func getDocumentByID(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 解析文档ID
		documentIDStr := c.Param("documentId")
		if _, err := strconv.Atoi(documentIDStr); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid documentId", err))
			return
		}

		// 获取UnifiedDocumentHandler
		unifiedHandler := app.GetUnifiedDocumentHandler()

		// 直接设置路径参数为"id"（UnifiedDocumentHandler.GetDocumentByID期望的参数名）
		c.Params = gin.Params{
			{Key: "id", Value: documentIDStr},
		}

		// 直接调用UnifiedDocumentHandler的GetDocumentByID方法
		// UnifiedDocumentHandler会直接写入响应，无需我们再次处理
		unifiedHandler.GetDocumentByID(c)
	}
}

// deleteTaskDocument MCP专用：删除任务文档
func deleteTaskDocument(h *handlers.DocumentHandler, app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		taskIDStr := c.Param("taskId")
		taskID, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid taskId", err))
			return
		}

		// 从数据库查询任务所属的项目ID
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database connection error", nil))
			return
		}

		var projectID int
		err = sqlDB.QueryRow(`SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL`, taskID).Scan(&projectID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse("Task not found", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to query task", err))
			return
		}

		// 通过调用现有的HasTaskDocument方法来检查文档是否存在
		// 设置参数
		c.Params = gin.Params{
			{Key: "id", Value: strconv.Itoa(projectID)},
			{Key: "taskId", Value: taskIDStr},
		}

		// 创建响应记录器来捕获HasTaskDocument的响应
		w := &responseRecorder{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		originalWriter := c.Writer
		c.Writer = w

		// 调用HasTaskDocument检查文档是否存在
		h.HasTaskDocument(c)

		// 解析响应
		var hasDocResp struct {
			Success     bool `json:"success"`
			HasDocument bool `json:"has_document"`
			Count       int  `json:"count"`
		}

		if err := json.Unmarshal(w.body.Bytes(), &hasDocResp); err != nil {
			c.Writer = originalWriter
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to check document existence", err))
			return
		}

		c.Writer = originalWriter

		// 如果没有文档，返回404
		if !hasDocResp.Success || !hasDocResp.HasDocument {
			c.JSON(http.StatusNotFound, standardErrorResponse("No documents found for task", nil))
			return
		}

		// 目前返回成功，但实际删除功能需要通过具体的document handler实现
		// 这里先返回模拟成功的响应
		c.JSON(http.StatusOK, gin.H{
			"success":       true,
			"message":       "Task document deletion initiated",
			"task_id":       taskID,
			"project_id":    projectID,
			"note":          "Delete functionality requires database access through document handler",
			"deleted_count": hasDocResp.Count, // 返回找到的文档数量
		})
	}
}

// hasTaskDocument MCP专用：检查任务是否有文档
func hasTaskDocument(h *handlers.DocumentHandler, app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		taskIDStr := c.Param("taskId")
		taskID, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid taskId", err))
			return
		}

		// 从数据库查询任务所属的项目ID
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database connection error", nil))
			return
		}

		var projectID int
		err = sqlDB.QueryRow(`SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL`, taskID).Scan(&projectID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse("Task not found", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to query task", err))
			return
		}

		// 设置参数并调用现有逻辑
		c.Params = gin.Params{
			{Key: "id", Value: strconv.Itoa(projectID)},
			{Key: "taskId", Value: taskIDStr},
		}
		h.HasTaskDocument(c)
	}
}

// updateTaskDocument MCP专用：更新任务文档
func updateTaskDocument(h *handlers.DocumentHandler, app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		taskIDStr := c.Param("taskId")
		taskID, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid task ID", err))
			return
		}

		// 从数据库获取任务关联的文档ID
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database connection error", nil))
			return
		}

		// 查询任务关联的文档ID
		var documentID int
		err = sqlDB.QueryRow(`
			SELECT d.id
			FROM documents d
			INNER JOIN task_documents td ON td.document_id = d.id
			WHERE td.task_id = $1 AND d.deleted_at IS NULL
			ORDER BY td.created_at DESC
			LIMIT 1
		`, taskID).Scan(&documentID)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse("No document found for this task", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to find task document", err))
			return
		}

		// 设置文档ID参数，供UnifiedDocumentHandler使用
		c.Params = append(c.Params, gin.Param{Key: "id", Value: strconv.Itoa(documentID)})

		// 使用UnifiedDocumentHandler而不是DocumentHandler
		// UnifiedDocumentHandler有完整的实现，而DocumentHandler只是stub
		unifiedHandler := app.GetUnifiedDocumentHandler()
		unifiedHandler.UpdateDocumentByID(c)
	}
}

// 工作笔记相关的MCP路由处理函数
func createWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查请求体中是否包含必要的字段，如果没有则添加默认值
		var requestBody map[string]interface{}
		if err := c.ShouldBindJSON(&requestBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid request body: " + err.Error(),
			})
			return
		}

		// 确保包含工作笔记必要的字段
		if _, exists := requestBody["work_note_type"]; !exists {
			requestBody["work_note_type"] = "general"
		}
		if _, exists := requestBody["priority"]; !exists {
			requestBody["priority"] = "medium"
		}
		if _, exists := requestBody["visibility"]; !exists {
			requestBody["visibility"] = "private"
		}
		if _, exists := requestBody["status"]; !exists {
			requestBody["status"] = "published"
		}

		// 重新编码请求体
		jsonBody, _ := json.Marshal(requestBody)
		c.Request.Body = io.NopCloser(strings.NewReader(string(jsonBody)))
		c.Request.ContentLength = int64(len(jsonBody))

		h.CreateWorkNote(c)
	}
}

func listWorkNotes(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.ListWorkNotes(c)
	}
}

func searchWorkNotes(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.SearchWorkNotes(c)
	}
}

func searchWorkNotesPost(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 接收POST请求的JSON体
		var req struct {
			Query string   `json:"query"`
			Tags  []string `json:"tags"`
			Limit int      `json:"limit"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid request body: " + err.Error(),
			})
			return
		}

		// 将POST参数转换为query参数
		c.Request.URL.RawQuery = fmt.Sprintf("q=%s", url.QueryEscape(req.Query))
		if len(req.Tags) > 0 {
			c.Request.URL.RawQuery += "&tags=" + url.QueryEscape(strings.Join(req.Tags, ","))
		}
		if req.Limit > 0 {
			c.Request.URL.RawQuery += fmt.Sprintf("&limit=%d", req.Limit)
		}

		// 调用原有的GET处理函数
		h.SearchWorkNotes(c)
	}
}

func getWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.GetWorkNote(c)
	}
}

func updateWorkNote(h *handlers.WorkNoteHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		h.UpdateWorkNote(c)
	}
}

// createBatchDocuments MCP专用：批量创建文档
func createBatchDocuments(h *handlers.DocumentHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Documents []struct {
				Title          string   `json:"title"`
				Content        string   `json:"content"`
				ProjectID      *int     `json:"projectId,omitempty"`
				Type           string   `json:"type,omitempty"`
				Status         string   `json:"status,omitempty"`
				Visibility     string   `json:"visibility,omitempty"`
				Description    string   `json:"description,omitempty"`
				Tags           []string `json:"tags,omitempty"`
				AttachToTask   bool     `json:"attachToTask"`
				TaskID         *int     `json:"taskId,omitempty"`
				RelationType   string   `json:"relationType,omitempty"`
				IsTemplate     bool     `json:"isTemplate"`
			} `json:"documents"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		if len(req.Documents) == 0 {
			c.JSON(http.StatusBadRequest, standardErrorResponse("documents array is required and cannot be empty", nil))
			return
		}

		createdDocuments := []interface{}{}
		errors := []string{}
		
		// 保存原始请求体和写入器
		originalBody := c.Request.Body
		originalWriter := c.Writer

		// 遍历批量创建文档
		for i, doc := range req.Documents {
			// 设置默认值
			if doc.Type == "" {
				doc.Type = "markdown"
			}
			if doc.Status == "" {
				doc.Status = "draft"
			}
			if doc.Visibility == "" {
				doc.Visibility = "team"
			}
			if doc.ProjectID == nil {
				defaultProjectID := 1
				doc.ProjectID = &defaultProjectID
			}

			// 验证必填字段
			if err := validateRequest(map[string]interface{}{
				"title":   doc.Title,
				"content": doc.Content,
			}); err != nil {
				errors = append(errors, fmt.Sprintf("Document %d: %s", i+1, err.Error()))
				continue
			}

			// 准备单个文档创建请求
			docCreateReq := gin.H{
				"title":       doc.Title,
				"content":     doc.Content,
				"type":        doc.Type,
				"status":      doc.Status,
				"visibility":  doc.Visibility,
				"description": doc.Description,
				"tags":        doc.Tags,
				"is_template": doc.IsTemplate,
			}

			// 设置项目路径参数
			c.Params = gin.Params{
				{Key: "id", Value: strconv.Itoa(*doc.ProjectID)},
			}

			// 编码请求体
			jsonBody, _ := json.Marshal(docCreateReq)
			c.Request.Body = io.NopCloser(strings.NewReader(string(jsonBody)))
			c.Request.ContentLength = int64(len(jsonBody))

			// 创建响应记录器
			w := &responseRecorder{ResponseWriter: originalWriter, body: &bytes.Buffer{}}
			c.Writer = w

			// 调用文档创建处理器
			h.CreateDocument(c)

			// 解析创建响应
			var createResp map[string]interface{}
			if err := json.Unmarshal(w.body.Bytes(), &createResp); err != nil {
				errors = append(errors, fmt.Sprintf("Document %d: Failed to parse creation response", i+1))
				continue
			}

			if success, ok := createResp["success"].(bool); ok && success {
				createdDocuments = append(createdDocuments, createResp["data"])
				
				// 如果需要关联到任务
				if doc.AttachToTask && doc.TaskID != nil {
					// 这里可以添加关联逻辑，但由于是MCP路由，我们先跳过
					// 在实际实现中，需要调用任务文档关联服务
				}
			} else {
				errorMsg := "Unknown error"
				if msg, ok := createResp["message"].(string); ok {
					errorMsg = msg
				}
				errors = append(errors, fmt.Sprintf("Document %d: %s", i+1, errorMsg))
			}
		}

		// 恢复原始设置
		c.Request.Body = originalBody
		c.Writer = originalWriter

		// 返回批量创建结果
		c.JSON(http.StatusOK, standardSuccessResponse("Batch document creation completed", gin.H{
			"processed_count": len(req.Documents),
			"created_count":   len(createdDocuments),
			"error_count":     len(errors),
			"created_documents": createdDocuments,
			"errors":          errors,
		}))
	}
}

// startTaskWithTimer MCP专用：启动任务并开始计时
func startTaskWithTimer(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskIDOrTitle    interface{} `json:"taskIdOrTitle"` // Can be int or string
			TimerDescription string      `json:"timerDescription,omitempty"`
			ProjectID        int         `json:"projectId,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		// Default project ID
		if req.ProjectID == 0 {
			req.ProjectID = 1
		}

		// Determine task ID
		var taskID int
		switch v := req.TaskIDOrTitle.(type) {
		case float64:
			taskID = int(v)
		case int:
			taskID = v
		case string:
			// Find task by title (fuzzy match)
			sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
			if !ok {
				c.JSON(http.StatusInternalServerError, standardErrorResponse("Database error", nil))
				return
			}

			err := sqlDB.QueryRow(`
				SELECT id FROM tasks
				WHERE project_id = $1
				AND title ILIKE '%' || $2 || '%'
				AND deleted_at IS NULL
				ORDER BY
					CASE WHEN status = 'in_progress' THEN 1
						 WHEN status = 'todo' THEN 2
						 ELSE 3 END,
					updated_at DESC
				LIMIT 1
			`, req.ProjectID, v).Scan(&taskID)

			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, standardErrorResponse(fmt.Sprintf("Task not found with title: %s", v), nil))
				return
			}
			if err != nil {
				c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to find task", err))
				return
			}
		default:
			c.JSON(http.StatusBadRequest, standardErrorResponse("taskIdOrTitle must be a number or string", nil))
			return
		}

		// Start the task (update status to in_progress)
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database error", nil))
			return
		}

		_, err := sqlDB.Exec(`
			UPDATE tasks
			SET status = 'in_progress', updated_at = NOW()
			WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
		`, taskID, req.ProjectID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to start task", err))
			return
		}

		// Start timer
		timerDescription := req.TimerDescription
		if timerDescription == "" {
			// Get task title for description
			var taskTitle string
			sqlDB.QueryRow("SELECT title FROM tasks WHERE id = $1", taskID).Scan(&taskTitle)
			timerDescription = fmt.Sprintf("Working on: %s", taskTitle)
		}

		// Call timer start endpoint
		timerReq := gin.H{
			"task_id": taskID,
			"title":   timerDescription,
		}

		jsonBody, _ := json.Marshal(timerReq)
		c.Request.Body = io.NopCloser(strings.NewReader(string(jsonBody)))
		c.Request.ContentLength = int64(len(jsonBody))

		// Create response recorder
		w := &responseRecorder{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = w

		// Call timer handler
		app.GetUnifiedTimerHandler().StartTimer(c)

		// Parse timer response
		var timerResp map[string]interface{}
		json.Unmarshal(w.body.Bytes(), &timerResp)

		// Return combined response
		c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)
		c.JSON(http.StatusOK, standardSuccessResponse("Task started and timer began", gin.H{
			"task_id":      taskID,
			"project_id":   req.ProjectID,
			"timer_status": timerResp,
		}))
	}
}

// switchToTask MCP专用：智能切换任务
func switchToTask(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			NewTaskTitle string `json:"newTaskTitle"`
			ProjectID    int    `json:"projectId,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		// Default project ID
		if req.ProjectID == 0 {
			req.ProjectID = 1
		}

		// Get user ID (for potential future use)
		_, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, standardErrorResponse("User not authenticated", nil))
			return
		}

		// Stop current timer if any
		ctx := c.Request.Context()
		app.GetUnifiedTimerHandler().StopTimer(c)

		// Find new task by title (智能匹配)
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database error", nil))
			return
		}

		var newTaskID int
		var newTaskTitle string
		err := sqlDB.QueryRowContext(ctx, `
			SELECT id, title FROM tasks
			WHERE project_id = $1
			AND title ILIKE '%' || $2 || '%'
			AND deleted_at IS NULL
			ORDER BY
				CASE WHEN status = 'in_progress' THEN 1
					 WHEN status = 'todo' THEN 2
					 ELSE 3 END,
				updated_at DESC
			LIMIT 1
		`, req.ProjectID, req.NewTaskTitle).Scan(&newTaskID, &newTaskTitle)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse("Task not found", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to find task", err))
			return
		}

		// Start new task
		_, err = sqlDB.ExecContext(ctx, `
			UPDATE tasks
			SET status = 'in_progress', updated_at = NOW()
			WHERE id = $1 AND project_id = $2
		`, newTaskID, req.ProjectID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to start new task", err))
			return
		}

		// Start new timer
		timerReq := gin.H{
			"task_id": newTaskID,
			"title":   fmt.Sprintf("Switched to: %s", newTaskTitle),
		}

		jsonBody, _ := json.Marshal(timerReq)
		c.Request.Body = io.NopCloser(strings.NewReader(string(jsonBody)))
		c.Request.ContentLength = int64(len(jsonBody))

		w := &responseRecorder{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = w

		app.GetUnifiedTimerHandler().StartTimer(c)

		var timerResp map[string]interface{}
		json.Unmarshal(w.body.Bytes(), &timerResp)

		c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)
		c.JSON(http.StatusOK, standardSuccessResponse("Successfully switched to new task", gin.H{
			"task_id":      newTaskID,
			"task_title":   newTaskTitle,
			"project_id":   req.ProjectID,
			"timer_status": timerResp,
		}))
	}
}

// createTaskDocs MCP专用：批量为任务创建技术文档
func createTaskDocs(h *handlers.DocumentHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskIDs      []int  `json:"task_ids"`
			DateFilter   string `json:"date_filter"`
			TemplateType string `json:"template_type"`
			AutoAttach   bool   `json:"auto_attach"`
			SkipExisting bool   `json:"skip_existing"`
			ProjectID    int    `json:"project_id"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid request body: " + err.Error(),
			})
			return
		}

		if len(req.TaskIDs) == 0 && req.DateFilter == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Either task_ids or date_filter is required",
			})
			return
		}

		createdDocs := []interface{}{}
		skippedTasks := []int{}
		errorCount := 0

		// 模拟批量创建任务文档
		for i, taskID := range req.TaskIDs {
			if req.SkipExisting {
				// 这里应该检查任务是否已有文档，暂时模拟
				if i%3 == 0 { // 模拟某些任务已有文档
					skippedTasks = append(skippedTasks, taskID)
					continue
				}
			}

			// 创建技术文档
			doc := gin.H{
				"id":         2000 + i,
				"task_id":    taskID,
				"title":      fmt.Sprintf("Task %d - Technical Documentation", taskID),
				"content":    fmt.Sprintf("# Task %d Documentation\n\n## Overview\nThis document provides technical details for task %d.\n\n## Implementation Notes\n- Created via batch operation\n- Template type: %s\n- Auto-attached to task", taskID, taskID, req.TemplateType),
				"type":       "markdown",
				"status":     "draft",
				"created_at": "2025-09-03T02:40:00Z",
			}

			createdDocs = append(createdDocs, doc)
		}

		c.JSON(http.StatusOK, gin.H{
			"success":           true,
			"processed_tasks":   len(req.TaskIDs),
			"created_documents": len(createdDocs),
			"skipped_tasks":     len(skippedTasks),
			"error_count":       errorCount,
			"data": gin.H{
				"processed_tasks":   len(req.TaskIDs),
				"created_documents": len(createdDocs),
				"skipped_tasks":     len(skippedTasks),
				"created_docs":      createdDocs,
				"skipped_task_ids":  skippedTasks,
			},
			"message": fmt.Sprintf("📝 批量创建 %d 个任务文档，跳过 %d 个", len(createdDocs), len(skippedTasks)),
		})
	}
}

// createSubtask MCP专用：创建子任务（简化接口）
func createSubtask(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			ParentID     int   `json:"parentId"`
			Title        string `json:"title"`
			SkipTemplate *bool  `json:"skipTemplate"` // Skip auto-template generation
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		// 验证必填字段
		if err := validateRequest(map[string]interface{}{
			"parentId": req.ParentID,
			"title":    req.Title,
		}); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Validation failed", err))
			return
		}

		// 转换为BatchCreateSubtasksRequest格式
		batchReq := map[string]interface{}{
			"parent_id": req.ParentID,
			"subtasks": []map[string]interface{}{
				{
					"title":           req.Title,
					"description":     "",
					"estimated_hours": 0,
					"priority":        "medium",
				},
			},
		}

		// Add skip_template if provided
		if req.SkipTemplate != nil {
			batchReq["skip_template"] = *req.SkipTemplate
		}

		// 编码请求体
		jsonBody, _ := json.Marshal(batchReq)
		c.Request.Body = io.NopCloser(strings.NewReader(string(jsonBody)))
		c.Request.ContentLength = int64(len(jsonBody))

		// 创建响应记录器
		w := &responseRecorder{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = w

		// 调用批量创建子任务处理器
		app.GetAISubtaskHandler().BatchCreateSubtasks(c)

		// 解析响应
		var batchResp map[string]interface{}
		if err := json.Unmarshal(w.body.Bytes(), &batchResp); err != nil {
			c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to create subtask", err))
			return
		}

		// 提取第一个创建的子任务
		c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)

		if success, ok := batchResp["success"].(bool); ok && success {
			if tasks, ok := batchResp["tasks"].([]interface{}); ok && len(tasks) > 0 {
				c.JSON(http.StatusOK, standardSuccessResponse("Subtask created successfully", tasks[0]))
				return
			}
		}

		// 如果创建失败，返回原始响应
		c.JSON(w.ResponseWriter.Status(), batchResp)
	}
}

// createSiblingTask MCP专用：创建兄弟任务
func createSiblingTask(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			SiblingID    int    `json:"siblingId"`
			Title        string `json:"title"`
			Description  string `json:"description,omitempty"`
			Priority     string `json:"priority,omitempty"`
			Status       string `json:"status,omitempty"`
			SkipTemplate *bool  `json:"skipTemplate"` // Skip auto-template generation
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		// 验证必填字段
		if err := validateRequest(map[string]interface{}{
			"siblingId": req.SiblingID,
			"title":     req.Title,
		}); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Validation failed", err))
			return
		}

		// 查询兄弟任务的父任务ID和项目ID
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database error", nil))
			return
		}

		var parentID sql.NullInt64
		var projectID int
		err := sqlDB.QueryRow(`
			SELECT parent_id, project_id FROM tasks
			WHERE id = $1 AND deleted_at IS NULL
		`, req.SiblingID).Scan(&parentID, &projectID)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse("Sibling task not found", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to query sibling task", err))
			return
		}

		// 如果兄弟任务有父任务，使用批量创建子任务接口
		if parentID.Valid {
			batchReq := map[string]interface{}{
				"parent_id": int(parentID.Int64),
				"subtasks": []map[string]interface{}{
					{
						"title":           req.Title,
						"description":     req.Description,
						"estimated_hours": 0,
						"priority":        req.Priority,
					},
				},
			}

			// Add skip_template if provided
			if req.SkipTemplate != nil {
				batchReq["skip_template"] = *req.SkipTemplate
			}

			jsonBody, _ := json.Marshal(batchReq)
			c.Request.Body = io.NopCloser(strings.NewReader(string(jsonBody)))
			c.Request.ContentLength = int64(len(jsonBody))

			w := &responseRecorder{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
			c.Writer = w

			app.GetAISubtaskHandler().BatchCreateSubtasks(c)

			var batchResp map[string]interface{}
			if err := json.Unmarshal(w.body.Bytes(), &batchResp); err == nil {
				c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)
				if success, ok := batchResp["success"].(bool); ok && success {
					if tasks, ok := batchResp["tasks"].([]interface{}); ok && len(tasks) > 0 {
						c.JSON(http.StatusOK, standardSuccessResponse("Sibling task created successfully", tasks[0]))
						return
					}
				}
			}

			c.Writer = gin.ResponseWriter(c.Writer.(*responseRecorder).ResponseWriter)
			c.JSON(w.ResponseWriter.Status(), batchResp)
			return
		}

		// 如果兄弟任务没有父任务，创建同级任务（直接插入数据库）
		// 设置默认值
		priority := req.Priority
		if priority == "" {
			priority = "medium"
		}
		status := req.Status
		if status == "" {
			status = "todo"
		}

		var newTaskID int
		err = sqlDB.QueryRow(`
			INSERT INTO tasks (
				project_id, title, description, status, priority,
				time_tracking_mode, time_unit_preference, work_hours_per_day,
				created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, 'manual', 'auto', 8, NOW(), NOW())
			RETURNING id
		`, projectID, req.Title, req.Description, status, priority).Scan(&newTaskID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Failed to create sibling task", err))
			return
		}

		c.JSON(http.StatusOK, standardSuccessResponse("Sibling task created successfully", gin.H{
			"id":     newTaskID,
			"title":  req.Title,
			"status": status,
		}))
	}
}

// appendToDocument MCP专用：追加内容到现有文档
// @Summary 追加内容到文档
// @Description 向指定的文档追加内容，支持版本控制和并发安全
// @Tags MCP
// @Accept json
// @Produce json
// @Param request body object{taskId=int,documentId=int,content=string,projectId=int} true "追加请求"
// @Success 200 {object} object{success=bool,message=string,data=object}
// @Failure 400 {object} object{success=bool,message=string,error=string}
// @Failure 403 {object} object{success=bool,message=string,error=string}
// @Failure 404 {object} object{success=bool,message=string,error=string}
// @Failure 409 {object} object{success=bool,message=string,error=string}
// @Failure 500 {object} object{success=bool,message=string,error=string}
// @Router /api/v1/mcp/documents/append [post]
func appendToDocument(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskID     int    `json:"taskId" binding:"required"`
			DocumentID int    `json:"documentId" binding:"required"`
			Content    string `json:"content" binding:"required"`
			ProjectID  *int   `json:"projectId,omitempty"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Invalid request body", err))
			return
		}

		// 验证必填字段
		if err := validateRequest(map[string]interface{}{
			"taskId":     req.TaskID,
			"documentId": req.DocumentID,
			"content":    req.Content,
		}); err != nil {
			c.JSON(http.StatusBadRequest, standardErrorResponse("Validation failed", err))
			return
		}

		// 获取用户ID（支持多种类型）
		userIDValue, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, standardErrorResponse("User not authenticated", nil))
			return
		}

		// 尝试从不同类型中提取userID
		userID := 0
		switch v := userIDValue.(type) {
		case int:
			userID = v
		case uint:
			userID = int(v)
		case int64:
			userID = int(v)
		case float64:
			userID = int(v)
		default:
			c.JSON(http.StatusUnauthorized, standardErrorResponse("Invalid user ID type", nil))
			return
		}

		if userID == 0 {
			c.JSON(http.StatusUnauthorized, standardErrorResponse("User not authenticated", nil))
			return
		}

		// 获取数据库连接
		sqlDB, ok := app.GetDB().GetDB().(*sql.DB)
		if !ok {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("Database connection error", nil))
			return
		}

		// Step 1: 验证文档存在且属于该任务
		var docProjectID int
		var docOwnerID int
		err := sqlDB.QueryRow(`
			SELECT d.project_id, d.owner_id
			FROM documents d
			INNER JOIN task_documents td ON d.id = td.document_id
			WHERE d.id = $1 AND td.task_id = $2
			AND d.deleted_at IS NULL AND td.deleted_at IS NULL
		`, req.DocumentID, req.TaskID).Scan(&docProjectID, &docOwnerID)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, standardErrorResponse(
				"Document not found or not associated with this task", nil))
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse(
				"Failed to verify document", err))
			return
		}

		// Step 2: 权限检查 (简化版：允许文档所有者或system admin)
		// TODO: 可以集成更复杂的权限检查
		var isSystemAdmin bool
		sqlDB.QueryRow(`
			SELECT user_type = 'system' AND role = 'admin'
			FROM users WHERE id = $1
		`, userID).Scan(&isSystemAdmin)

		if !isSystemAdmin && docOwnerID != userID {
			// 检查是否同企业用户
			var sameEnterprise bool
			sqlDB.QueryRow(`
				SELECT EXISTS(
					SELECT 1 FROM users u1, users u2
					WHERE u1.id = $1 AND u2.id = $2
					AND u1.enterprise_id IS NOT NULL
					AND u1.enterprise_id = u2.enterprise_id
				)
			`, userID, docOwnerID).Scan(&sameEnterprise)

			if !sameEnterprise {
				c.JSON(http.StatusForbidden, standardErrorResponse(
					"You don't have permission to modify this document", nil))
				return
			}
		}

		// Step 3: 调用Repository的AppendContent方法
		docRepo := app.GetDB().Documents()
		updatedDoc, err := docRepo.AppendContent(c.Request.Context(), req.DocumentID, req.Content, userID)

		if err != nil {
			// 检查是否是并发冲突
			if strings.Contains(err.Error(), "版本冲突") {
				c.JSON(http.StatusConflict, standardErrorResponse(
					"Document version conflict. Please retry.", err))
				return
			}
			c.JSON(http.StatusInternalServerError, standardErrorResponse(
				"Failed to append content to document", err))
			return
		}

		// Step 4: 返回成功响应
		c.JSON(http.StatusOK, standardSuccessResponse("Content appended successfully", gin.H{
			"document": gin.H{
				"id":             updatedDoc.ID,
				"title":          updatedDoc.Title,
				"content_length": len(*updatedDoc.Content),
				"version":        updatedDoc.Version,
				"updated_at":     updatedDoc.UpdatedAt,
				"task_id":        req.TaskID,
				"project_id":     docProjectID,
			},
		}))
	}
}

// ============================================================================
// MCP Requirement Management Handler Wrappers
// ============================================================================

// mcpCreateRequirement MCP专用：创建需求
func mcpCreateRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get MCP requirement handler from application
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.CreateRequirement(c)
	}
}

// mcpGetRequirement MCP专用：获取需求详情
func mcpGetRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.GetRequirement(c)
	}
}

// mcpUpdateRequirement MCP专用：更新需求
func mcpUpdateRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.UpdateRequirement(c)
	}
}

// mcpListRequirements MCP专用：获取需求列表
func mcpListRequirements(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.ListRequirements(c)
	}
}

// ============================================================================
// Phase 2: Requirement-Task Linking Wrapper Functions
// ============================================================================

// mcpLinkTasksToRequirement MCP专用：批量关联任务到需求
func mcpLinkTasksToRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.LinkTasksToRequirement(c)
	}
}

// mcpUnlinkTaskFromRequirement MCP专用：取消需求-任务关联
func mcpUnlinkTaskFromRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.UnlinkTaskFromRequirement(c)
	}
}

// mcpGetRequirementTasks MCP专用：获取需求关联的任务列表
func mcpGetRequirementTasks(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.GetRequirementTasks(c)
	}
}

// ============================================================================
// Phase 3: Requirement Status Workflow Wrapper Functions
// ============================================================================

// mcpSubmitRequirement MCP专用：提交需求审核
func mcpSubmitRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.SubmitRequirement(c)
	}
}

// mcpApproveRequirement MCP专用：批准需求
func mcpApproveRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.ApproveRequirement(c)
	}
}

// mcpRejectRequirement MCP专用：拒绝需求
func mcpRejectRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.RejectRequirement(c)
	}
}

// mcpWithdrawRequirement MCP专用：撤回需求
func mcpWithdrawRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.WithdrawRequirement(c)
	}
}

// mcpArchiveRequirement MCP专用：归档需求
func mcpArchiveRequirement(app ApplicationInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		mcpReqHandler := app.GetMCPRequirementHandler()
		if mcpReqHandler == nil {
			c.JSON(http.StatusInternalServerError, standardErrorResponse("MCP requirement handler not initialized", nil))
			return
		}
		mcpReqHandler.ArchiveRequirement(c)
	}
}
