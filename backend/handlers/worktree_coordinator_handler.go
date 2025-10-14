package handlers

import (
	"ai-project-backend/services"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// WorktreeCoordinatorHandler 工作空间协调处理器
// 提供智能分配、任务绑定、资源回收等高级功能的REST API
type WorktreeCoordinatorHandler struct {
	coordinator     *services.AIWorkspaceCoordinator
	bindingCoordinator *services.TaskBindingCoordinator
	reclaimService  *services.WorkspaceReclaimService
}

// NewWorktreeCoordinatorHandler 创建工作空间协调处理器
func NewWorktreeCoordinatorHandler(
	coordinator *services.AIWorkspaceCoordinator,
	bindingCoordinator *services.TaskBindingCoordinator,
	reclaimService *services.WorkspaceReclaimService,
) *WorktreeCoordinatorHandler {
	return &WorktreeCoordinatorHandler{
		coordinator:     coordinator,
		bindingCoordinator: bindingCoordinator,
		reclaimService:  reclaimService,
	}
}

// ==================== 智能分配 API ====================

// AllocateWorkspace 为任务分配最优工作空间
// POST /api/v1/worktrees/allocate
func (h *WorktreeCoordinatorHandler) AllocateWorkspace(c *gin.Context) {
	var req services.AllocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 从上下文获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// 如果请求中没有指定AIUserID，使用当前用户ID
	if req.AIUserID == 0 {
		req.AIUserID = userID.(int)
	}

	decision, err := h.coordinator.AllocateWorkspace(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": decision})
}

// ReleaseWorkspace 释放AI工作空间
// POST /api/v1/worktrees/:id/release
func (h *WorktreeCoordinatorHandler) ReleaseWorkspace(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.coordinator.ReleaseWorkspace(c.Request.Context(), worktreeID, userID.(int)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "workspace released successfully"})
}

// GetAllocationHistory 获取任务的分配历史
// GET /api/v1/tasks/:taskId/allocation-history
func (h *WorktreeCoordinatorHandler) GetAllocationHistory(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	history, err := h.coordinator.GetAllocationHistory(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": history})
}

// RecommendWorktrees 推荐适合多个任务的worktree组合
// POST /api/v1/worktrees/recommend
func (h *WorktreeCoordinatorHandler) RecommendWorktrees(c *gin.Context) {
	var req struct {
		TaskIDs  []int `json:"task_ids" binding:"required"`
		AIUserID int   `json:"ai_user_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	if req.AIUserID == 0 {
		req.AIUserID = userID.(int)
	}

	recommendations, err := h.coordinator.RecommendWorktrees(c.Request.Context(), req.TaskIDs, req.AIUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": recommendations})
}

// ==================== 任务绑定 API ====================

// SmartBindTask 智能绑定任务到worktree
// POST /api/v1/worktrees/:id/tasks/smart-bind
func (h *WorktreeCoordinatorHandler) SmartBindTask(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	var req services.SmartBindRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.WorktreeID = worktreeID

	result, err := h.bindingCoordinator.SmartBind(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !result.Success {
		c.JSON(http.StatusOK, gin.H{"data": result, "message": "binding not created due to conflicts"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": result})
}

// BatchBindTasks 批量绑定任务
// POST /api/v1/worktrees/:id/tasks/batch-bind
func (h *WorktreeCoordinatorHandler) BatchBindTasks(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	var req services.BatchBindRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.WorktreeID = worktreeID

	result, err := h.bindingCoordinator.BatchBind(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// UnbindTask 解除任务绑定
// DELETE /api/v1/worktrees/:id/tasks/:taskId/unbind
func (h *WorktreeCoordinatorHandler) UnbindTask(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	if err := h.bindingCoordinator.UnbindTask(c.Request.Context(), worktreeID, taskID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task unbound successfully"})
}

// GetTaskBindings 获取任务的所有绑定
// GET /api/v1/tasks/:taskId/bindings
func (h *WorktreeCoordinatorHandler) GetTaskBindings(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	bindings, err := h.bindingCoordinator.GetTaskBindings(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": bindings})
}

// ReorganizeBindings 重组worktree的绑定关系
// POST /api/v1/worktrees/:id/bindings/reorganize
func (h *WorktreeCoordinatorHandler) ReorganizeBindings(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.bindingCoordinator.ReorganizeBindings(c.Request.Context(), worktreeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "bindings reorganized successfully"})
}

// SuggestBindings 为任务推荐绑定的worktree
// GET /api/v1/tasks/:taskId/suggested-worktrees
func (h *WorktreeCoordinatorHandler) SuggestBindings(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid task ID"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	suggestions, err := h.bindingCoordinator.SuggestBindings(c.Request.Context(), taskID, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": suggestions})
}

// AutoBindRelatedTasks 自动绑定相关任务
// POST /api/v1/worktrees/:id/tasks/auto-bind-related
func (h *WorktreeCoordinatorHandler) AutoBindRelatedTasks(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	result, err := h.bindingCoordinator.AutoBindRelatedTasks(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// ==================== 资源回收 API ====================

// ScanAndReclaim 扫描并回收工作空间
// POST /api/v1/projects/:projectId/worktrees/reclaim
func (h *WorktreeCoordinatorHandler) ScanAndReclaim(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	var policy services.ReclaimPolicy
	if err := c.ShouldBindJSON(&policy); err != nil {
		// 使用默认策略
		policy = *services.DefaultReclaimPolicy
	}

	result, err := h.reclaimService.ScanAndReclaim(c.Request.Context(), projectID, &policy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GetIdleWorktrees 获取空闲的worktrees
// GET /api/v1/projects/:projectId/worktrees/idle
func (h *WorktreeCoordinatorHandler) GetIdleWorktrees(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	// 从查询参数获取阈值（默认2小时）
	thresholdStr := c.DefaultQuery("threshold", "2h")
	threshold, err := time.ParseDuration(thresholdStr)
	if err != nil {
		threshold = 2 * time.Hour
	}

	worktrees, err := h.reclaimService.GetIdleWorktrees(c.Request.Context(), projectID, threshold)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": worktrees})
}

// GetArchivableWorktrees 获取可归档的worktrees
// GET /api/v1/projects/:projectId/worktrees/archivable
func (h *WorktreeCoordinatorHandler) GetArchivableWorktrees(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	worktrees, err := h.reclaimService.GetArchivableWorktrees(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": worktrees})
}

// ForceReleaseWorktree 强制释放worktree
// POST /api/v1/worktrees/:id/force-release
func (h *WorktreeCoordinatorHandler) ForceReleaseWorktree(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.reclaimService.ForceReleaseWorktree(c.Request.Context(), worktreeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree force released successfully"})
}

// CleanupArchivedWorktrees 清理已归档的worktrees
// DELETE /api/v1/projects/:projectId/worktrees/archived/cleanup
func (h *WorktreeCoordinatorHandler) CleanupArchivedWorktrees(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	// 从查询参数获取时间阈值（默认30天）
	olderThanStr := c.DefaultQuery("older_than", "720h") // 30 days
	olderThan, err := time.ParseDuration(olderThanStr)
	if err != nil {
		olderThan = 30 * 24 * time.Hour
	}

	count, err := h.reclaimService.CleanupArchivedWorktrees(c.Request.Context(), projectID, olderThan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "cleanup completed",
		"deleted_count": count,
	})
}

// GenerateHealthReport 生成工作空间健康报告
// GET /api/v1/projects/:projectId/worktrees/health-report
func (h *WorktreeCoordinatorHandler) GenerateHealthReport(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	report, err := h.reclaimService.GenerateHealthReport(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": report})
}

// ScheduledCleanup 定时清理任务
// POST /api/v1/projects/:projectId/worktrees/scheduled-cleanup
func (h *WorktreeCoordinatorHandler) ScheduledCleanup(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	result, err := h.reclaimService.ScheduledCleanup(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// DryRunReclaim 模拟回收（不实际执行）
// POST /api/v1/projects/:projectId/worktrees/dry-run-reclaim
func (h *WorktreeCoordinatorHandler) DryRunReclaim(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("projectId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	var policy services.ReclaimPolicy
	if err := c.ShouldBindJSON(&policy); err != nil {
		policy = *services.DefaultReclaimPolicy
	}

	result, err := h.reclaimService.DryRunReclaim(c.Request.Context(), projectID, &policy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
