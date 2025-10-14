package handlers

import (
	"ai-project-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// WorktreeMonitoringHandler 监控处理器
// Phase 6: 系统监控、资源管理、健康检查
type WorktreeMonitoringHandler struct {
	monitoringService *services.WorktreeMonitoringService
}

// NewWorktreeMonitoringHandler 创建监控处理器
func NewWorktreeMonitoringHandler(monitoringService *services.WorktreeMonitoringService) *WorktreeMonitoringHandler {
	return &WorktreeMonitoringHandler{
		monitoringService: monitoringService,
	}
}

// ============================================================================
// 1. 指标收集 API
// ============================================================================

// GetSystemMetrics 获取系统指标
// GET /api/v1/monitoring/metrics
func (h *WorktreeMonitoringHandler) GetSystemMetrics(c *gin.Context) {
	metrics, err := h.monitoringService.CollectSystemMetrics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    metrics,
	})
}

// ============================================================================
// 2. 健康检查 API
// ============================================================================

// CheckHealth 系统健康检查
// GET /api/v1/monitoring/health
func (h *WorktreeMonitoringHandler) CheckHealth(c *gin.Context) {
	health, err := h.monitoringService.CheckSystemHealth(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 根据健康状态返回适当的HTTP状态码
	statusCode := http.StatusOK
	if health.Status == "degraded" {
		statusCode = http.StatusOK // 仍返回200，但在响应中标记degraded
	} else if health.Status == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, gin.H{
		"success": true,
		"data":    health,
	})
}

// ============================================================================
// 3. 资源分析 API
// ============================================================================

// AnalyzeResources 分析worktree资源使用
// GET /api/v1/monitoring/resources
func (h *WorktreeMonitoringHandler) AnalyzeResources(c *gin.Context) {
	var projectID *int
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		if pid, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = &pid
		}
	}

	resources, err := h.monitoringService.AnalyzeWorktreeResources(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resources,
		"count":   len(resources),
	})
}

// ============================================================================
// 4. 配置管理 API
// ============================================================================

// GetAlertThresholds 获取告警阈值配置
// GET /api/v1/monitoring/thresholds
func (h *WorktreeMonitoringHandler) GetAlertThresholds(c *gin.Context) {
	thresholds := h.monitoringService.GetAlertThresholds()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    thresholds,
	})
}

// UpdateAlertThresholds 更新告警阈值配置
// PUT /api/v1/monitoring/thresholds
func (h *WorktreeMonitoringHandler) UpdateAlertThresholds(c *gin.Context) {
	var req services.WorktreeAlertThresholds

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "invalid request body: " + err.Error(),
		})
		return
	}

	h.monitoringService.UpdateAlertThresholds(&req)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Alert thresholds updated successfully",
		"data":    &req,
	})
}

// InvalidateCache 清除指标缓存
// POST /api/v1/monitoring/cache/invalidate
func (h *WorktreeMonitoringHandler) InvalidateCache(c *gin.Context) {
	h.monitoringService.InvalidateCache()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Metrics cache invalidated successfully",
	})
}

// ============================================================================
// 5. 简化的健康检查端点（用于负载均衡器/监控系统）
// ============================================================================

// SimpleHealthCheck 简单健康检查（快速响应）
// GET /api/v1/monitoring/ping
func (h *WorktreeMonitoringHandler) SimpleHealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"timestamp": gin.H{
			"server_time": "now",
		},
	})
}
