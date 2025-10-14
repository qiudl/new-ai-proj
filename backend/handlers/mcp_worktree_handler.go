package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// MCPWorktreeHandler MCP Worktree工具处理器
// Phase 5: 为Claude Code提供原生Worktree支持
type MCPWorktreeHandler struct {
	worktreeService         *services.WorktreeService
	coordinatorService      *services.AIWorkspaceCoordinator
	bindingService          *services.TaskBindingCoordinator
	conflictEngine          *services.ConflictDetectionEngine
	conflictMonitor         *services.ConflictMonitor
	resolutionService       *services.ConflictResolutionService
}

// NewMCPWorktreeHandler 创建MCP Worktree处理器
func NewMCPWorktreeHandler(
	worktreeService *services.WorktreeService,
	coordinatorService *services.AIWorkspaceCoordinator,
	bindingService *services.TaskBindingCoordinator,
	conflictEngine *services.ConflictDetectionEngine,
	conflictMonitor *services.ConflictMonitor,
	resolutionService *services.ConflictResolutionService,
) *MCPWorktreeHandler {
	return &MCPWorktreeHandler{
		worktreeService:    worktreeService,
		coordinatorService: coordinatorService,
		bindingService:     bindingService,
		conflictEngine:     conflictEngine,
		conflictMonitor:    conflictMonitor,
		resolutionService:  resolutionService,
	}
}

// ============================================================================
// Tool 1: wt_create - 创建新的Worktree
// ============================================================================

func (h *MCPWorktreeHandler) WtCreate(c *gin.Context) {
	var req struct {
		ProjectID   int    `json:"project_id" binding:"required"`
		Branch      string `json:"branch" binding:"required"`
		Name        string `json:"name"`
		Description string `json:"description"`
		ExpertID    string `json:"expert_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	worktree, err := h.worktreeService.CreateWorktree(c.Request.Context(), &services.CreateWorktreeRequest{
		ProjectID:   req.ProjectID,
		Branch:      req.Branch,
		Name:        req.Name,
		Description: req.Description,
		ExpertID:    req.ExpertID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    worktree,
		"message": "Worktree created successfully",
	})
}

// ============================================================================
// Tool 2: wt_assign - 分配Worktree给AI用户
// ============================================================================

func (h *MCPWorktreeHandler) WtAssign(c *gin.Context) {
	var req struct {
		WorktreeID int  `json:"worktree_id" binding:"required"`
		AIUserID   int  `json:"ai_user_id" binding:"required"`
		TaskID     *int `json:"task_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	err := h.worktreeService.ActivateWorktree(c.Request.Context(), req.WorktreeID, req.AIUserID, req.TaskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"worktree_id":  req.WorktreeID,
		"ai_user_id":   req.AIUserID,
		"message":      "Worktree assigned successfully",
	})
}

// ============================================================================
// Tool 3: wt_status - 查看Worktree状态
// ============================================================================

func (h *MCPWorktreeHandler) WtStatus(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid worktree_id"})
		return
	}

	worktree, err := h.worktreeService.GetWorktree(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}

	// 获取绑定的任务
	bindings, err := h.bindingService.GetWorktreeBindings(c.Request.Context(), worktreeID)
	if err != nil {
		bindings = []*models.WorktreeTaskBinding{} // 忽略错误，使用空列表
	}

	// 检查冲突
	cachedConflict, hasConflict := h.conflictMonitor.GetCachedResult(worktreeID)

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"worktree":      worktree,
		"bindings":      bindings,
		"has_conflict":  hasConflict && cachedConflict.HasConflict,
		"conflict_info": cachedConflict,
	})
}

// ============================================================================
// Tool 4: wt_list - 列出所有Worktrees
// ============================================================================

func (h *MCPWorktreeHandler) WtList(c *gin.Context) {
	projectID := c.Query("project_id")
	status := c.Query("status")
	expertID := c.Query("expert_id")

	var projectIDPtr *int
	if projectID != "" {
		if pid, err := strconv.Atoi(projectID); err == nil {
			projectIDPtr = &pid
		}
	}

	var statusPtr *string
	if status != "" {
		statusPtr = &status
	}

	var expertIDPtr *string
	if expertID != "" {
		expertIDPtr = &expertID
	}

	worktrees, total, err := h.worktreeService.ListWorktrees(c.Request.Context(), &services.ListWorktreesOptions{
		ProjectID: projectIDPtr,
		Status:    statusPtr,
		ExpertID:  expertIDPtr,
		Limit:     100,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"worktrees":  worktrees,
		"total":      total,
	})
}

// ============================================================================
// Tool 5: wt_bind_task - 绑定任务到Worktree
// ============================================================================

func (h *MCPWorktreeHandler) WtBindTask(c *gin.Context) {
	var req struct {
		WorktreeID   int     `json:"worktree_id" binding:"required"`
		TaskID       int     `json:"task_id" binding:"required"`
		RelationType string  `json:"relation_type"`
		Priority     int     `json:"priority"`
		AutoActivate bool    `json:"auto_activate"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	if req.RelationType == "" {
		req.RelationType = "primary"
	}
	if req.Priority == 0 {
		req.Priority = 5
	}

	result, err := h.bindingService.SmartBind(c.Request.Context(), &services.SmartBindRequest{
		WorktreeID: req.WorktreeID,
		TaskID:     req.TaskID,
		Strategy: &services.BindingStrategy{
			RelationType: req.RelationType,
			Priority:     req.Priority,
			AutoActivate: req.AutoActivate,
		},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
		"message": "Task bound to worktree successfully",
	})
}

// ============================================================================
// Tool 6: wt_unbind_task - 解绑任务
// ============================================================================

func (h *MCPWorktreeHandler) WtUnbindTask(c *gin.Context) {
	var req struct {
		WorktreeID int `json:"worktree_id" binding:"required"`
		TaskID     int `json:"task_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	err := h.bindingService.UnbindTask(c.Request.Context(), req.WorktreeID, req.TaskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"worktree_id": req.WorktreeID,
		"task_id":     req.TaskID,
		"message":     "Task unbound from worktree successfully",
	})
}

// ============================================================================
// Tool 7: wt_conflict_check - 检测冲突
// ============================================================================

func (h *MCPWorktreeHandler) WtConflictCheck(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid worktree_id"})
		return
	}

	result, err := h.conflictMonitor.ForceCheck(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}

// ============================================================================
// Tool 8: wt_conflict_resolve - 生成解决方案
// ============================================================================

func (h *MCPWorktreeHandler) WtConflictResolve(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid worktree_id"})
		return
	}

	result, err := h.resolutionService.GenerateResolutionPlans(c.Request.Context(), &services.ResolutionRequest{
		WorktreeID: worktreeID,
		AutoApply:  false,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}

// ============================================================================
// Tool 9: wt_allocate - 智能分配工作空间
// ============================================================================

func (h *MCPWorktreeHandler) WtAllocate(c *gin.Context) {
	var req struct {
		TaskID      int    `json:"task_id" binding:"required"`
		AIUserID    int    `json:"ai_user_id" binding:"required"`
		ExpertID    string `json:"expert_id"`
		PreferReuse bool   `json:"prefer_reuse"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	decision, err := h.coordinatorService.AllocateWorkspace(c.Request.Context(), &services.AllocationRequest{
		TaskID:      req.TaskID,
		AIUserID:    req.AIUserID,
		ExpertID:    req.ExpertID,
		PreferReuse: req.PreferReuse,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"decision": decision,
		"message":  "Workspace allocated successfully",
	})
}

// ============================================================================
// Tool 10: wt_release - 释放工作空间
// ============================================================================

func (h *MCPWorktreeHandler) WtRelease(c *gin.Context) {
	var req struct {
		WorktreeID int `json:"worktree_id" binding:"required"`
		AIUserID   int `json:"ai_user_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	err := h.coordinatorService.ReleaseWorkspace(c.Request.Context(), req.WorktreeID, req.AIUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"worktree_id": req.WorktreeID,
		"ai_user_id":  req.AIUserID,
		"message":     "Workspace released successfully",
	})
}

// ============================================================================
// Tool 11: wt_sync - 同步Worktree代码
// ============================================================================

func (h *MCPWorktreeHandler) WtSync(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid worktree_id"})
		return
	}

	err = h.worktreeService.SyncWorktree(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"worktree_id": worktreeID,
		"message":     "Worktree synced successfully",
	})
}

// ============================================================================
// Tool 12: wt_health - 健康检查
// ============================================================================

func (h *MCPWorktreeHandler) WtHealth(c *gin.Context) {
	projectIDStr := c.Query("project_id")

	var projectID *int
	if projectIDStr != "" {
		if pid, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = &pid
		}
	}

	// TODO: Filter statistics by projectID when available in monitor
	_ = projectID

	// 获取冲突统计
	stats := h.conflictMonitor.GetConflictStatistics()

	// 简单的健康评分
	healthScore := 1.0
	if stats.TotalWorktrees > 0 {
		conflictRate := float64(stats.WithConflicts) / float64(stats.TotalWorktrees)
		healthScore = 1.0 - (conflictRate * 0.5)
	}

	status := "healthy"
	if healthScore < 0.5 {
		status = "warning"
	}
	if healthScore < 0.3 {
		status = "critical"
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"status":       status,
		"health_score": healthScore,
		"statistics":   stats,
		"timestamp":    "now",
	})
}
