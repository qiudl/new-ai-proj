package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"ai-project-backend/cache"
	"ai-project-backend/database"
	"ai-project-backend/services"
)

// AIDocumentHandler AI文档生成处理器
type AIDocumentHandler struct {
	db              database.DB
	docGenService   *services.AIDocumentGenerationService
	aiGenerateService *services.AIGenerateService
	promptRepo      *database.PromptRepository
}

// NewAIDocumentHandler 创建AI文档处理器
func NewAIDocumentHandler(db database.DB, cacheService *cache.AICacheService) *AIDocumentHandler {
	sqlDB := db.GetDB().(*sql.DB)
	aiGenerateService := services.NewAIGenerateService(sqlDB)
	promptRepo := database.NewPromptRepository(sqlDB)
	docGenService := services.NewAIDocumentGenerationService(sqlDB, aiGenerateService, promptRepo, cacheService)

	return &AIDocumentHandler{
		db:                db,
		docGenService:     docGenService,
		aiGenerateService: aiGenerateService,
		promptRepo:        promptRepo,
	}
}

// GenerateDocumentRequest 生成文档请求
type GenerateDocumentRequest struct {
	TaskID       int                              `json:"task_id" binding:"required"`
	Model        string                           `json:"model" binding:"required"`
	CustomPrompt *string                          `json:"custom_prompt"`
	DocumentType string                           `json:"document_type" binding:"required"`
	Options      *services.DocumentGenOptions    `json:"options"`
}

// GenerateDocumentResponse 生成文档响应
type GenerateDocumentResponse struct {
	Document    *services.DocumentData `json:"document"`
	ModelUsed   string                 `json:"model_used"`
	GeneratedAt time.Time              `json:"generated_at"`
}

// GenerateDocument 生成文档
// @Summary 生成文档
// @Description 使用AI为指定任务生成技术文档
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateDocumentRequest true "生成文档请求"
// @Success 200 {object} GenerateDocumentResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/ai/generate-document [post]
func (h *AIDocumentHandler) GenerateDocument(c *gin.Context) {
	var req GenerateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// 验证document_type
	validTypes := map[string]bool{
		"design": true, "requirements": true,
		"test_plan": true, "api_doc": true,
	}
	if !validTypes[req.DocumentType] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的document_type",
			"error":   "document_type must be one of: design, requirements, test_plan, api_doc",
		})
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "用户ID类型错误",
		})
		return
	}

	// 设置默认选项
	if req.Options == nil {
		req.Options = &services.DocumentGenOptions{
			IncludeSubtasks:     false,
			IncludeCodeExamples: false,
			Language:            "zh",
		}
	}

	// 构建参数
	params := &services.DocumentGenParams{
		TaskID:       req.TaskID,
		UserID:       userIDInt,
		Model:        req.Model,
		CustomPrompt: req.CustomPrompt,
		DocumentType: req.DocumentType,
		Options:      req.Options,
	}

	// 调用文档生成服务
	log.Printf("[AIDocumentHandler] Generating document for task %d, type: %s, model: %s",
		req.TaskID, req.DocumentType, req.Model)

	docData, err := h.docGenService.GenerateDocument(c.Request.Context(), params)
	if err != nil {
		log.Printf("[AIDocumentHandler] Generate document error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "生成文档失败",
			"error":   err.Error(),
		})
		return
	}

	log.Printf("[AIDocumentHandler] Document generated successfully: title=%s, word_count=%d",
		docData.Title, docData.Metadata.WordCount)

	// 返回响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": &GenerateDocumentResponse{
			Document:    docData,
			ModelUsed:   req.Model,
			GeneratedAt: time.Now(),
		},
	})
}

// GetDocumentTemplates 获取文档模板列表
// @Summary 获取文档模板
// @Description 获取所有可用的文档生成模板
// @Tags AI
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/ai/document-templates [get]
func (h *AIDocumentHandler) GetDocumentTemplates(c *gin.Context) {
	// 获取document类型的模板
	templates, err := h.promptRepo.GetTemplatesByType("document")
	if err != nil {
		log.Printf("[AIDocumentHandler] Get templates error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取模板失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"templates": templates,
			"total":     len(templates),
		},
	})
}

// GetDocumentTypeInfo 获取文档类型信息
// @Summary 获取文档类型信息
// @Description 获取所有支持的文档类型及其说明
// @Tags AI
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/ai/document-types [get]
func (h *AIDocumentHandler) GetDocumentTypeInfo(c *gin.Context) {
	types := []map[string]string{
		{
			"type":        "design",
			"name":        "技术设计文档",
			"description": "详细描述系统架构、技术选型、接口设计、数据模型、核心算法等",
		},
		{
			"type":        "requirements",
			"name":        "需求规格说明书",
			"description": "明确功能需求、非功能需求、验收标准、约束条件等",
		},
		{
			"type":        "test_plan",
			"name":        "测试计划文档",
			"description": "测试策略、测试用例、覆盖率要求、测试环境、风险评估等",
		},
		{
			"type":        "api_doc",
			"name":        "API接口文档",
			"description": "端点定义、请求/响应格式、参数说明、错误码、使用示例等",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"types": types,
			"total": len(types),
		},
	})
}

// SaveDocumentToTask 将生成的文档保存到任务
// @Summary 保存文档到任务
// @Description 将AI生成的文档保存为任务文档
// @Tags AI
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "保存文档请求"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/ai/save-document [post]
func (h *AIDocumentHandler) SaveDocumentToTask(c *gin.Context) {
	var req struct {
		TaskID      int    `json:"task_id" binding:"required"`
		Title       string `json:"title" binding:"required"`
		Content     string `json:"content" binding:"required"`
		ProjectID   *int   `json:"project_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "用户ID类型错误",
		})
		return
	}

	// 如果未提供project_id，从任务中获取
	projectID := 1 // 默认项目ID
	if req.ProjectID != nil {
		projectID = *req.ProjectID
	} else {
		// 从数据库查询任务的项目ID
		var taskProjectID int
		query := `SELECT project_id FROM tasks WHERE id = $1`
		err := h.db.GetDB().(*sql.DB).QueryRow(query, req.TaskID).Scan(&taskProjectID)
		if err == nil {
			projectID = taskProjectID
		}
	}

	// 开始事务
	tx, err := h.db.GetDB().(*sql.DB).Begin()
	if err != nil {
		log.Printf("[AIDocumentHandler] Begin transaction error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "开始事务失败",
			"error":   err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// 1. 保存文档到documents表
	insertDocQuery := `
		INSERT INTO documents (
			title, content, type, project_id,
			owner_id, created_by, status, visibility,
			generated_by_ai
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`

	var docID int
	var createdAt time.Time
	err = tx.QueryRow(
		insertDocQuery,
		req.Title,
		req.Content,
		"markdown",
		projectID,
		userIDInt,
		userIDInt,
		"published",
		"team",
		true, // generated_by_ai
	).Scan(&docID, &createdAt)

	if err != nil {
		log.Printf("[AIDocumentHandler] Save document error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "保存文档失败",
			"error":   err.Error(),
		})
		return
	}

	// 2. 在task_documents关联表中创建记录
	insertRelQuery := `
		INSERT INTO task_documents (
			task_id, document_id, relationship_type, created_by
		) VALUES ($1, $2, $3, $4)
	`

	_, err = tx.Exec(insertRelQuery, req.TaskID, docID, "attachment", userIDInt)
	if err != nil {
		log.Printf("[AIDocumentHandler] Create task-document relationship error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "关联文档到任务失败",
			"error":   err.Error(),
		})
		return
	}

	// 提交事务
	if err = tx.Commit(); err != nil {
		log.Printf("[AIDocumentHandler] Commit transaction error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "提交事务失败",
			"error":   err.Error(),
		})
		return
	}

	log.Printf("[AIDocumentHandler] Document saved: id=%d, task_id=%d", docID, req.TaskID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"document_id": docID,
			"task_id":     req.TaskID,
			"created_at":  createdAt,
		},
		"message": fmt.Sprintf("文档已保存并关联到任务（文档ID: %d）", docID),
	})
}
