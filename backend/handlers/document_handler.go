package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// DocumentHandler 文档处理器（保留用于兼容性）
// @Deprecated: HybridDocumentHandler已删除，此Handler保留用于兼容旧路由
// TODO: 将所有GetDocumentHandler()调用迁移到GetUnifiedDocumentHandler()
type DocumentHandler struct {
	db              database.DB
	relationService *services.WorkNoteTaskRelationService
	docsBasePath    string
	redisClient     *redis.Client
}

// NewDocumentHandler 创建文档处理器（保留用于兼容性）
func NewDocumentHandler(db database.DB, docsBasePath string, redisClient ...*redis.Client) *DocumentHandler {
	var rc *redis.Client
	if len(redisClient) > 0 {
		rc = redisClient[0]
	}

	return &DocumentHandler{
		db:           db,
		docsBasePath: docsBasePath,
		redisClient:  rc,
	}
}

// 以下方法为占位符实现，返回未实现错误
// TODO: 迁移所有调用到UnifiedDocumentHandler后删除此文件

func (h *DocumentHandler) GetDocuments(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) CreateDocument(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) GetDocument(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) GetAllTaskDocuments(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) GetTaskDocuments(c *gin.Context) {
	// 获取参数
	taskIDStr := c.Param("taskId")

	// 解析taskID
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 获取document repository
	docRepo := h.db.Documents()

	// 获取任务文档
	docs, err := docRepo.GetTaskDocuments(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": err.Error()})
		return
	}

	// 返回文档列表
	c.JSON(200, gin.H{
		"success": true,
		"documents": docs,
		"total": len(docs),
	})
}

func (h *DocumentHandler) HasTaskDocument(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) CreateAndAttachDocument(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

func (h *DocumentHandler) GetTaskDocumentsWithoutProject(c *gin.Context) {
	// 短路由: /tasks/:id/documents
	taskIDStr := c.Param("id")

	// 解析taskID
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 获取document repository
	docRepo := h.db.Documents()

	// 获取任务文档
	docs, err := docRepo.GetTaskDocuments(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": err.Error()})
		return
	}

	// 返回文档列表
	c.JSON(200, gin.H{
		"success": true,
		"documents": docs,
		"total": len(docs),
	})
}

func (h *DocumentHandler) CreateTaskDocumentWithoutProject(c *gin.Context) {
	c.JSON(501, gin.H{"error": "Not implemented - use UnifiedDocumentHandler"})
}

// UpsertTaskDocument 保存任务文档（自动判断创建或更新）
// POST /api/v1/projects/:id/tasks/:taskId/document
func (h *DocumentHandler) UpsertTaskDocument(c *gin.Context) {
	// 获取路径参数
	taskIDStr := c.Param("taskId")

	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(400, gin.H{"success": false, "message": "Invalid task ID"})
		return
	}

	// 获取用户ID
	userID := uint(0)
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(uint); ok {
			userID = u
		}
	}

	// 解析请求体
	var req struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"success": false, "message": "Invalid request body"})
		return
	}

	if req.Content == "" {
		c.JSON(400, gin.H{"success": false, "message": "Content cannot be empty"})
		return
	}

	// 获取document repository
	docRepo := h.db.Documents()

	// 检查任务是否已有文档
	existingDocs, err := docRepo.GetTaskDocuments(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "Failed to check existing documents", "error": err.Error()})
		return
	}

	// 如果文档已存在，更新第一个文档
	if len(existingDocs) > 0 {
		doc := existingDocs[0]
		doc.Content = &req.Content

		// 调用Update方法（会触发自动版本创建！）
		updatedDoc, err := docRepo.Update(c.Request.Context(), doc)
		if err != nil {
			c.JSON(500, gin.H{"success": false, "message": "Failed to update document", "error": err.Error()})
			return
		}

		c.JSON(200, gin.H{
			"success": true,
			"message": "Document updated successfully",
			"document": updatedDoc,
		})
		return
	}

	// 文档不存在，创建新文档
	newDoc := &models.Document{
		Title:     "Task " + strconv.Itoa(taskID) + " Document",
		Content:   &req.Content,
		CreatedBy: int(userID),
		OwnerID:   int(userID),
		Type:      "task",
	}

	createdDoc, err := docRepo.Create(c.Request.Context(), newDoc)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "Failed to create document", "error": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"success": true,
		"message": "Document created successfully",
		"document": createdDoc,
	})
}
