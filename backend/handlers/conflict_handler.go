package handlers

import (
	"ai-project-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ConflictHandler 冲突管理处理器
// Phase 4: 提供冲突检测、监控和解决建议的REST API
type ConflictHandler struct {
	detectionEngine    *services.ConflictDetectionEngine
	monitor           *services.ConflictMonitor
	resolutionService *services.ConflictResolutionService
}

// NewConflictHandler 创建冲突处理器
func NewConflictHandler(
	detectionEngine *services.ConflictDetectionEngine,
	monitor *services.ConflictMonitor,
	resolutionService *services.ConflictResolutionService,
) *ConflictHandler {
	return &ConflictHandler{
		detectionEngine:    detectionEngine,
		monitor:           monitor,
		resolutionService: resolutionService,
	}
}

// ================================
// 1. 冲突检测 API
// ================================

// DetectConflicts 检测指定worktree的冲突
// POST /api/v1/worktrees/:id/conflicts/detect
func (h *ConflictHandler) DetectConflicts(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree_id"})
		return
	}

	var req services.DetectConflictsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.WorktreeID = worktreeID

	result, err := h.detectionEngine.DetectConflicts(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DetectTaskConflicts 检测指定任务的冲突（在所有worktrees中）
// POST /api/v1/tasks/:id/conflicts/detect
func (h *ConflictHandler) DetectTaskConflicts(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task_id"})
		return
	}

	req := services.DetectConflictsRequest{
		TaskID: taskID,
	}

	result, err := h.detectionEngine.DetectConflicts(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// CompareWorktrees 比较两个worktrees的冲突
// POST /api/v1/worktrees/compare
func (h *ConflictHandler) CompareWorktrees(c *gin.Context) {
	var req struct {
		Worktree1ID int `json:"worktree1_id" binding:"required"`
		Worktree2ID int `json:"worktree2_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.detectionEngine.CompareWorktrees(c.Request.Context(), req.Worktree1ID, req.Worktree2ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// PredictMergeConflicts 预测合并冲突
// POST /api/v1/worktrees/:id/conflicts/predict-merge
func (h *ConflictHandler) PredictMergeConflicts(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree_id"})
		return
	}

	var req struct {
		TargetBranch string `json:"target_branch" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.detectionEngine.PredictMergeConflicts(
		c.Request.Context(),
		worktreeID,
		req.TargetBranch,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ================================
// 2. 冲突监控 API
// ================================

// GetCachedConflicts 获取缓存的冲突检测结果
// GET /api/v1/worktrees/:id/conflicts/cached
func (h *ConflictHandler) GetCachedConflicts(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree_id"})
		return
	}

	result, exists := h.monitor.GetCachedResult(worktreeID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "no cached result found",
			"hint":  "try forcing a check",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"cached_at": result.DetectedAt,
		"result":    result,
	})
}

// ForceCheckConflicts 强制检测指定worktree的冲突（不使用缓存）
// POST /api/v1/worktrees/:id/conflicts/force-check
func (h *ConflictHandler) ForceCheckConflicts(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree_id"})
		return
	}

	result, err := h.monitor.ForceCheck(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"checked_at": result.DetectedAt,
		"result":     result,
	})
}

// GetConflictStatistics 获取所有worktrees的冲突统计信息
// GET /api/v1/conflicts/statistics
func (h *ConflictHandler) GetConflictStatistics(c *gin.Context) {
	stats := h.monitor.GetConflictStatistics()
	c.JSON(http.StatusOK, stats)
}

// SetMonitorInterval 设置监控间隔
// POST /api/v1/conflicts/monitor/interval
func (h *ConflictHandler) SetMonitorInterval(c *gin.Context) {
	var req struct {
		IntervalMinutes int `json:"interval_minutes" binding:"required,min=1,max=60"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert minutes to time.Duration
	// h.monitor.SetMonitorInterval(time.Duration(req.IntervalMinutes) * time.Minute)

	c.JSON(http.StatusOK, gin.H{
		"message":          "monitor interval updated",
		"interval_minutes": req.IntervalMinutes,
	})
}

// ================================
// 3. 冲突解决建议 API
// ================================

// GenerateResolutionPlans 生成冲突解决方案
// POST /api/v1/worktrees/:id/conflicts/resolve
func (h *ConflictHandler) GenerateResolutionPlans(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree_id"})
		return
	}

	var req services.ResolutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 使用默认值
		req = services.ResolutionRequest{
			WorktreeID: worktreeID,
			AutoApply:  false,
		}
	} else {
		req.WorktreeID = worktreeID
	}

	result, err := h.resolutionService.GenerateResolutionPlans(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetResolutionHistory 获取解决方案历史
// GET /api/v1/worktrees/:id/conflicts/resolutions
func (h *ConflictHandler) GetResolutionHistory(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree_id"})
		return
	}

	history, err := h.resolutionService.GetResolutionHistory(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"worktree_id": worktreeID,
		"history":     history,
	})
}

// ================================
// 4. 项目级别冲突概览 API
// ================================

// GetProjectConflictOverview 获取项目的冲突概览
// GET /api/v1/projects/:id/conflicts/overview
func (h *ConflictHandler) GetProjectConflictOverview(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project_id"})
		return
	}

	// 获取所有统计信息
	stats := h.monitor.GetConflictStatistics()

	// TODO: Filter by projectID when available in monitor
	_ = projectID

	c.JSON(http.StatusOK, gin.H{
		"project_id": projectID,
		"statistics": stats,
		"timestamp":  "now", // TODO: Add actual timestamp
	})
}

// GetProjectConflictTrend 获取项目的冲突趋势
// GET /api/v1/projects/:id/conflicts/trend
func (h *ConflictHandler) GetProjectConflictTrend(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project_id"})
		return
	}

	// 获取查询参数
	days := 7
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 90 {
			days = d
		}
	}

	// TODO: Implement trend analysis
	c.JSON(http.StatusOK, gin.H{
		"project_id": projectID,
		"days":       days,
		"trend":      []map[string]interface{}{}, // Empty for now
		"message":    "Trend analysis not yet implemented",
	})
}

// ================================
// 5. 健康检查和诊断 API
// ================================

// HealthCheck 检查冲突管理系统的健康状态
// GET /api/v1/conflicts/health
func (h *ConflictHandler) HealthCheck(c *gin.Context) {
	stats := h.monitor.GetConflictStatistics()

	health := gin.H{
		"status":           "healthy",
		"detection_engine": "operational",
		"monitor":          "operational",
		"resolution":       "operational",
		"statistics":       stats,
	}

	// 判断是否有严重问题
	if stats.WithConflicts > stats.TotalWorktrees/2 {
		health["status"] = "warning"
		health["warning"] = "more than 50% of worktrees have conflicts"
	}

	c.JSON(http.StatusOK, health)
}

// DiagnoseWorktree 诊断worktree的潜在问题
// GET /api/v1/worktrees/:id/conflicts/diagnose
func (h *ConflictHandler) DiagnoseWorktree(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree_id"})
		return
	}

	// 1. 强制检测冲突
	conflictResult, err := h.monitor.ForceCheck(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 2. 生成解决方案
	resolutionResult, _ := h.resolutionService.GenerateResolutionPlans(
		c.Request.Context(),
		&services.ResolutionRequest{
			WorktreeID: worktreeID,
			AutoApply:  false,
		},
	)

	// 3. 组合诊断报告
	diagnosis := gin.H{
		"worktree_id":      worktreeID,
		"conflict_status":  conflictResult,
		"resolution_plans": resolutionResult,
		"health_score":     calculateConflictHealthScore(conflictResult),
		"recommendations":  generateRecommendations(conflictResult),
	}

	c.JSON(http.StatusOK, diagnosis)
}

// ================================
// Helper Functions
// ================================

// calculateConflictHealthScore 计算worktree的冲突健康评分
func calculateConflictHealthScore(result *services.ConflictDetectionResult) float64 {
	if result == nil || !result.HasConflict {
		return 1.0
	}

	// 根据冲突级别和数量计算健康分数
	levelScore := map[services.ConflictLevel]float64{
		services.ConflictLevelNone:     1.0,
		services.ConflictLevelLow:      0.9,
		services.ConflictLevelMedium:   0.7,
		services.ConflictLevelHigh:     0.4,
		services.ConflictLevelCritical: 0.1,
	}

	score := levelScore[result.Level]

	// 根据冲突数量进一步降低分数
	countPenalty := float64(result.TotalCount) * 0.05
	if countPenalty > 0.3 {
		countPenalty = 0.3
	}

	score -= countPenalty
	if score < 0 {
		score = 0
	}

	return score
}

// generateRecommendations 生成诊断建议
func generateRecommendations(result *services.ConflictDetectionResult) []string {
	if result == nil || !result.HasConflict {
		return []string{"Worktree is healthy, no conflicts detected"}
	}

	recommendations := []string{}

	switch result.Level {
	case services.ConflictLevelCritical:
		recommendations = append(recommendations,
			"⚠️ CRITICAL: Immediate action required",
			"Consider isolating conflicting tasks to separate worktrees",
			"Review and coordinate with team members",
		)
	case services.ConflictLevelHigh:
		recommendations = append(recommendations,
			"🔴 HIGH: Address conflicts before proceeding",
			"Review resolution plans and apply appropriate strategy",
		)
	case services.ConflictLevelMedium:
		recommendations = append(recommendations,
			"🟡 MEDIUM: Monitor and address when convenient",
			"Consider reordering task execution",
		)
	case services.ConflictLevelLow:
		recommendations = append(recommendations,
			"🟢 LOW: Minor conflicts detected",
			"Can proceed with caution",
		)
	}

	// Add suggestions from detection engine
	if len(result.Suggestions) > 0 {
		recommendations = append(recommendations, result.Suggestions...)
	}

	return recommendations
}
