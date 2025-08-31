package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	// "ai-project-backend/models"
	"ai-project-backend/services"
)

// SmartTemplateHandler 智能模板处理器
type SmartTemplateHandler struct {
	templateService *services.SmartTemplateService
}

// NewSmartTemplateHandler 创建智能模板处理器实例
func NewSmartTemplateHandler(templateService *services.SmartTemplateService) *SmartTemplateHandler {
	return &SmartTemplateHandler{
		templateService: templateService,
	}
}

// ====================
// 模板推荐相关
// ====================

// GetRecommendedTemplates 获取推荐模板
// GET /api/v1/projects/:id/tasks/:taskId/templates/recommendations
func (h *SmartTemplateHandler) GetRecommendedTemplates(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	userID := GetUserIDFromContextAsUint(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// 构建推荐请求
	req := services.TemplateGenerationRequest{
		TaskID:    taskID,
		ProjectID: projectID,
		Category:  c.Query("category"),
		Priority:  c.Query("priority"),
	}

	recommendations, err := h.templateService.GetRecommendedTemplates(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"count":          len(recommendations),
	})
}

// GenerateFromTemplate 从模板生成文档
// POST /api/v1/templates/:id/generate
func (h *SmartTemplateHandler) GenerateFromTemplate(c *gin.Context) {
	templateID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	var request struct {
		Variables map[string]interface{} `json:"variables"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := GetUserIDFromContextAsUint(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	content, err := h.templateService.GenerateDocumentFromTemplate(c.Request.Context(), templateID, request.Variables)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"content": content,
		"template_id": templateID,
		"variables": request.Variables,
	})
}

// ====================
// 模板CRUD操作
// ====================

// GetTemplates 获取模板列表
// GET /api/v1/templates
func (h *SmartTemplateHandler) GetTemplates(c *gin.Context) {
	userID := GetUserIDFromContextAsUint(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	templates, err := h.templateService.GetActiveTemplates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 按分类分组
	grouped := make(map[string][]services.TaskDocumentTemplate)
	for _, template := range templates {
		category := template.Category
		if category == "" {
			category = "未分类"
		}
		grouped[category] = append(grouped[category], template)
	}

	c.JSON(http.StatusOK, gin.H{
		"templates":   templates,
		"grouped":     grouped,
		"total":       len(templates),
	})
}

// GetTemplateByID 获取特定模板
// GET /api/v1/templates/:id
func (h *SmartTemplateHandler) GetTemplateByID(c *gin.Context) {
	templateID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	userID := GetUserIDFromContextAsUint(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	template, err := h.templateService.GetTemplateByID(c.Request.Context(), templateID)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, template)
}

// CreateTemplate 创建新模板
// POST /api/v1/templates
func (h *SmartTemplateHandler) CreateTemplate(c *gin.Context) {
	userID := GetUserIDFromContextAsUint(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var template services.TaskDocumentTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 设置创建者
	template.CreatedBy = int(userID)
	template.IsActive = true

	createdTemplate, err := h.templateService.CreateTemplate(c.Request.Context(), template)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, createdTemplate)
}

// ====================
// 模板统计和分析
// ====================

// GetTemplateStats 获取模板统计信息
// GET /api/v1/templates/stats
func (h *SmartTemplateHandler) GetTemplateStats(c *gin.Context) {
	userID := GetUserIDFromContextAsUint(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	templates, err := h.templateService.GetActiveTemplates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 统计信息
	stats := gin.H{
		"total_templates": len(templates),
		"categories":      make(map[string]int),
		"types":          make(map[string]int),
		"most_used":      []services.TaskDocumentTemplate{},
		"recent":         []services.TaskDocumentTemplate{},
	}

	categoryCount := make(map[string]int)
	typeCount := make(map[string]int)
	var mostUsed []services.TaskDocumentTemplate
	var recent []services.TaskDocumentTemplate

	for _, template := range templates {
		// 分类统计
		category := template.Category
		if category == "" {
			category = "未分类"
		}
		categoryCount[category]++

		// 类型统计
		typeCount[string(template.Type)]++

		// 最常用模板（取前5个）
		if len(mostUsed) < 5 {
			mostUsed = append(mostUsed, template)
		}

		// 最近创建的模板（取前5个）
		if len(recent) < 5 {
			recent = append(recent, template)
		}
	}

	stats["categories"] = categoryCount
	stats["types"] = typeCount
	stats["most_used"] = mostUsed
	stats["recent"] = recent

	c.JSON(http.StatusOK, stats)
}

// ====================
// 辅助函数
// ====================

// 使用通用的helper函数 GetUserIDFromContextAsInt