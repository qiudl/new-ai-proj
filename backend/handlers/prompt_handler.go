package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// PromptHandler 提示词处理器
type PromptHandler struct {
	promptRepo            *database.PromptRepository
	recommendationService *services.PromptRecommendationService
}

// NewPromptHandler 创建处理器实例
func NewPromptHandler(db *sql.DB) *PromptHandler {
	return &PromptHandler{
		promptRepo:            database.NewPromptRepository(db),
		recommendationService: services.NewPromptRecommendationService(db),
	}
}

// GetTemplates 获取提示词模板列表
func (h *PromptHandler) GetTemplates(c *gin.Context) {
	category := c.Query("category")
	aiProvider := c.Query("ai_provider")

	var templates []models.PromptTemplate
	var err error

	if category != "" {
		// 按分类获取
		templates, err = h.promptRepo.GetTemplatesByCategory(category)
	} else {
		// 获取所有启用的模板
		templates, err = h.promptRepo.GetActiveTemplates()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取模板失败", nil))
		return
	}

	// 如果指定了AI提供商，过滤模板
	if aiProvider != "" {
		filtered := make([]models.PromptTemplate, 0)
		for _, t := range templates {
			for _, model := range t.RecommendedModels {
				if model == aiProvider {
					filtered = append(filtered, t)
					break
				}
			}
		}
		templates = filtered
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(templates, "获取模板成功"))
}

// GetUserHistory 获取用户的提示词历史
func (h *PromptHandler) GetUserHistory(c *gin.Context) {
	// 从JWT获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "未授权", nil))
		return
	}

	// 获取查询参数
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	aiProvider := c.Query("ai_provider")

	// 查询历史记录
	histories, err := h.promptRepo.GetUserPromptHistory(userID.(int), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取历史失败", nil))
		return
	}

	// 如果指定了AI提供商，过滤记录
	if aiProvider != "" {
		filtered := make([]models.UserPromptHistory, 0)
		for _, hist := range histories {
			if hist.AIProvider == aiProvider {
				filtered = append(filtered, hist)
			}
		}
		histories = filtered
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(histories, "获取历史成功"))
}

// CreateHistoryRequest 创建历史请求体
type CreateHistoryRequest struct {
	ParentTaskID        int      `json:"parent_task_id" binding:"required"`
	PromptText          string   `json:"prompt_text" binding:"required,min=5"`
	TemplateID          *int     `json:"template_id"`
	AIProvider          string   `json:"ai_provider" binding:"required"`
	AIModel             string   `json:"ai_model" binding:"required"`
	SubtasksGenerated   int      `json:"subtasks_generated"`
	TotalEstimatedHours *float64 `json:"total_estimated_hours"`
}

// CreateHistory 创建提示词历史记录
func (h *PromptHandler) CreateHistory(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "未授权", nil))
		return
	}

	// 解析请求
	var req CreateHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求参数错误", nil))
		return
	}

	// 构建历史记录
	history := &models.UserPromptHistory{
		UserID:              userID.(int),
		ParentTaskID:        req.ParentTaskID,
		PromptText:          req.PromptText,
		TemplateID:          req.TemplateID,
		AIProvider:          req.AIProvider,
		AIModel:             req.AIModel,
		SubtasksGenerated:   req.SubtasksGenerated,
		TotalEstimatedHours: req.TotalEstimatedHours,
	}

	// 保存到数据库
	err := h.promptRepo.CreatePromptHistory(history)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建历史记录失败", nil))
		return
	}

	// 如果使用了模板，增加模板使用次数
	if req.TemplateID != nil {
		_ = h.promptRepo.IncrementTemplateUsage(*req.TemplateID)
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(gin.H{
		"id":         history.ID,
		"created_at": history.CreatedAt,
	}, "历史记录创建成功"))
}

// UpdateResultRequest 更新结果请求体
type UpdateResultRequest struct {
	SubtasksAccepted int     `json:"subtasks_accepted" binding:"required,min=0"`
	IsSuccessful     bool    `json:"is_successful"`
	UserRating       *int    `json:"user_rating" binding:"omitempty,min=1,max=5"`
	UserFeedback     *string `json:"user_feedback"`
}

// UpdateHistoryResult 更新历史记录结果
func (h *PromptHandler) UpdateHistoryResult(c *gin.Context) {
	// 获取历史记录ID
	historyID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的历史记录ID", nil))
		return
	}

	// 解析请求
	var req UpdateResultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求参数错误", nil))
		return
	}

	// 更新数据库
	err = h.promptRepo.UpdatePromptHistoryResult(historyID, req.SubtasksAccepted, req.IsSuccessful)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "更新结果失败", nil))
		return
	}

	// 如果有评分或反馈，额外更新
	if req.UserRating != nil || req.UserFeedback != nil {
		rating := 0
		if req.UserRating != nil {
			rating = *req.UserRating
		}
		feedback := ""
		if req.UserFeedback != nil {
			feedback = *req.UserFeedback
		}
		err = h.promptRepo.UpdatePromptHistoryFeedback(historyID, rating, feedback)
		if err != nil {
			// 记录错误但不影响主流程
			c.Error(err)
		}
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "结果更新成功"))
}

// GetRecommendations 获取智能推荐
func (h *PromptHandler) GetRecommendations(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "未授权", nil))
		return
	}

	// 获取参数
	taskDesc := c.Query("task_description")
	if taskDesc == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "缺少任务描述", nil))
		return
	}

	aiProvider := c.Query("ai_provider")
	limit := 5
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 20 {
			limit = l
		}
	}

	// 调用推荐服务
	recommendations, err := h.recommendationService.RecommendPrompts(
		userID.(int),
		taskDesc,
		aiProvider,
		limit,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "推荐失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(recommendations, "推荐成功"))
}
