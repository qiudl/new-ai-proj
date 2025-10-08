package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// MCPTemplateHandler MCP模板文档处理器
type MCPTemplateHandler struct {
	generator *services.TemplateGenerator
	db        database.DB
}

// NewMCPTemplateHandler 创建MCP模板处理器实例
func NewMCPTemplateHandler(db database.DB) *MCPTemplateHandler {
	return &MCPTemplateHandler{
		generator: services.NewTemplateGenerator(),
		db:        db,
	}
}

// GenerateDocumentFromTemplate 根据模板生成文档
// @Summary		根据模板类型生成文档内容
// @Description	根据指定的模板类型和上下文信息智能生成Markdown格式的文档内容。支持8种预定义模板类型，可选择性地自动创建文档并关联到任务。
// @Description
// @Description	支持的模板类型:
// @Description	- bug_report: Bug报告模板
// @Description	- feature_spec: 功能规格说明模板
// @Description	- technical_design: 技术设计文档模板
// @Description	- meeting_notes: 会议纪要模板
// @Description	- project_plan: 项目计划模板
// @Description	- api_documentation: API文档模板
// @Description	- test_plan: 测试计划模板
// @Description	- user_story: 用户故事模板
// @Description
// @Description	autoCreate功能说明:
// @Description	- 当autoCreate=true时，需要提供taskId或projectId参数
// @Description	- 系统将自动创建文档记录并关联到指定任务
// @Description	- 返回的document_id可用于后续文档操作
// @Tags			MCP
// @Accept			json
// @Produce		json
// @Param			request	body		models.GenerateDocumentRequest	true	"文档生成请求参数"
// @Success		200		{object}	models.APIResponse{data=models.GenerateDocumentResponse}	"成功生成文档，返回内容和元数据"
// @Failure		400		{object}	models.APIResponse	"请求参数错误，如模板类型无效或autoCreate缺少必要参数"
// @Failure		401		{object}	models.APIResponse	"未认证，autoCreate功能需要用户登录"
// @Failure		500		{object}	models.APIResponse	"服务器内部错误，如文档生成失败或数据库操作失败"
// @Router			/api/v1/mcp/generate-document-from-template [post]
// @Security		BearerAuth
func (h *MCPTemplateHandler) GenerateDocumentFromTemplate(c *gin.Context) {
	var req models.GenerateDocumentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"请求参数格式错误: "+err.Error(),
			nil,
		))
		return
	}

	// 验证模板类型
	if !models.IsValidTemplateType(req.TemplateType) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeBadRequest,
			"不支持的模板类型: "+req.TemplateType,
			map[string]interface{}{
				"valid_types": models.ValidTemplateTypes,
			},
		))
		return
	}

	// 生成文档内容
	content, metadata, err := h.generator.Generate(
		models.TemplateType(req.TemplateType),
		req.Context,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternal,
			"生成文档失败: "+err.Error(),
			nil,
		))
		return
	}

	response := models.GenerateDocumentResponse{
		Content:  content,
		Metadata: metadata,
	}

	// 如果需要自动创建文档
	if req.AutoCreate {
		// 验证必须有taskId或projectId
		if req.Context.TaskID == nil && req.Context.ProjectID == nil {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				models.ErrCodeBadRequest,
				"autoCreate功能需要提供taskId或projectId",
				nil,
			))
			return
		}

		// 获取当前用户ID
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"用户未认证",
				nil,
			))
			return
		}

		// 创建文档
		docID, err := h.createDocument(c.Request.Context(), req.Context, content, userID.(int))
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				models.ErrCodeInternal,
				"自动创建文档失败: "+err.Error(),
				nil,
			))
			return
		}

		response.DocumentID = &docID
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(
		response,
		"文档生成成功",
	))
}

// createDocument 创建文档并关联到任务（内部方法）
func (h *MCPTemplateHandler) createDocument(ctx context.Context, templateCtx models.TemplateContext, content string, userID int) (int, error) {
	// 获取SQL连接
	sqlDB, ok := h.db.GetDB().(*sql.DB)
	if !ok {
		return 0, fmt.Errorf("无法获取数据库连接")
	}

	// 开始事务
	tx, err := sqlDB.BeginTx(ctx, nil)
	if err != nil {
		return 0, fmt.Errorf("启动事务失败: %w", err)
	}
	defer tx.Rollback()

	// 确定项目ID和任务ID
	var projectID, taskID int
	if templateCtx.TaskID != nil {
		taskID = *templateCtx.TaskID
		// 从任务中获取项目ID
		err = tx.QueryRowContext(ctx, `
			SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL
		`, taskID).Scan(&projectID)
		if err != nil {
			return 0, fmt.Errorf("任务不存在或已删除: %w", err)
		}
	} else if templateCtx.ProjectID != nil {
		projectID = *templateCtx.ProjectID
	}

	// 生成文档标题
	title := "模板生成文档"
	if templateCtx.Title != nil && *templateCtx.Title != "" {
		title = *templateCtx.Title
	}

	// 创建文档
	var documentID int
	now := time.Now().UTC()
	err = tx.QueryRowContext(ctx, `
		INSERT INTO documents (
			project_id, title, content, type, status,
			owner_id, created_by, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`, projectID, title, content, "markdown", "draft", userID, userID, now, now).Scan(&documentID)

	if err != nil {
		return 0, fmt.Errorf("创建文档失败: %w", err)
	}

	// 如果有任务ID，创建任务文档关联
	if taskID > 0 {
		_, err = tx.ExecContext(ctx, `
			INSERT INTO task_documents (task_id, document_id, relationship_type, created_by, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (task_id, document_id) DO NOTHING
		`, taskID, documentID, "attachment", userID, now, now)

		if err != nil {
			return 0, fmt.Errorf("关联文档到任务失败: %w", err)
		}
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("提交事务失败: %w", err)
	}

	return documentID, nil
}
