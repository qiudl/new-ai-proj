package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// EfficiencyHandler 效率分析处理器
type EfficiencyHandler struct {
	efficiencyRepo *database.EfficiencyRepository
}

// NewEfficiencyHandler 创建效率分析处理器
func NewEfficiencyHandler(efficiencyRepo *database.EfficiencyRepository) *EfficiencyHandler {
	return &EfficiencyHandler{
		efficiencyRepo: efficiencyRepo,
	}
}

// GetEfficiencyTrend 获取效率趋势
// GET /api/v1/analytics/efficiency/trend?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&project_id=N
func (h *EfficiencyHandler) GetEfficiencyTrend(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "未授权",
		})
		return
	}

	// 解析参数
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "start_date和end_date参数是必需的",
		})
		return
	}

	// 验证日期格式
	if _, err := time.Parse("2006-01-02", startDate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "start_date格式无效，应为YYYY-MM-DD",
		})
		return
	}

	if _, err := time.Parse("2006-01-02", endDate); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "end_date格式无效，应为YYYY-MM-DD",
		})
		return
	}

	// 可选的项目ID过滤
	var projectID *int
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		id, err := strconv.Atoi(projectIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "project_id格式无效",
			})
			return
		}
		projectID = &id
	}

	// 查询效率趋势
	trend, err := h.efficiencyRepo.GetEfficiencyTrend(userID.(int), startDate, endDate, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取效率趋势失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    trend,
	})
}

// GetSmartSuggestions 获取智能建议
// GET /api/v1/analytics/efficiency/suggestions?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&priority=high
func (h *EfficiencyHandler) GetSmartSuggestions(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "未授权",
		})
		return
	}

	// 解析参数
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "start_date和end_date参数是必需的",
		})
		return
	}

	// 可选的项目ID过滤
	var projectID *int
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		id, err := strconv.Atoi(projectIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "project_id格式无效",
			})
			return
		}
		projectID = &id
	}

	// 获取效率指标数据
	metrics, err := h.efficiencyRepo.GetDailyEfficiencyMetrics(userID.(int), startDate, endDate, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取效率数据失败",
			"details": err.Error(),
		})
		return
	}

	// 生成智能建议
	response := h.efficiencyRepo.GenerateSmartSuggestions(metrics)

	// 可选的优先级过滤
	if priority := c.Query("priority"); priority != "" {
		filteredSuggestions := []models.SmartSuggestion{}
		for _, sug := range response.Suggestions {
			if sug.Priority == priority {
				filteredSuggestions = append(filteredSuggestions, sug)
			}
		}
		response.Suggestions = filteredSuggestions
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetEfficiencyAnalysis 获取效率综合分析
// GET /api/v1/analytics/efficiency/analysis?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
func (h *EfficiencyHandler) GetEfficiencyAnalysis(c *gin.Context) {
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "未授权",
		})
		return
	}

	// 解析参数
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "start_date和end_date参数是必需的",
		})
		return
	}

	// 可选的项目ID过滤
	var projectID *int
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		id, err := strconv.Atoi(projectIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "project_id格式无效",
			})
			return
		}
		projectID = &id
	}

	// 获取效率趋势
	trend, err := h.efficiencyRepo.GetEfficiencyTrend(userID.(int), startDate, endDate, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取效率趋势失败",
			"details": err.Error(),
		})
		return
	}

	// 生成智能建议
	suggestions := h.efficiencyRepo.GenerateSmartSuggestions(trend.DailyData)

	// 组合综合分析
	analysis := gin.H{
		"trend":       trend,
		"suggestions": suggestions.Suggestions,
		"insights":    suggestions.Insights,
		"summary":     suggestions.Summary,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    analysis,
	})
}
