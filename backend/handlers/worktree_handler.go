package handlers

import (
	"net/http"
	"strconv"

	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
)

// WorktreeHandler handles worktree HTTP requests
type WorktreeHandler struct {
	service *services.WorktreeService
}

// NewWorktreeHandler creates a new worktree handler
func NewWorktreeHandler(service *services.WorktreeService) *WorktreeHandler {
	return &WorktreeHandler{
		service: service,
	}
}

// ============================================
// CRUD Endpoints
// ============================================

// CreateWorktree handles POST /api/v1/worktrees
func (h *WorktreeHandler) CreateWorktree(c *gin.Context) {
	var req services.CreateWorktreeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	req.CreatedBy = userID.(int)

	worktree, err := h.service.CreateWorktree(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": worktree})
}

// GetWorktree handles GET /api/v1/worktrees/:id
func (h *WorktreeHandler) GetWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	worktree, err := h.service.GetWorktree(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": worktree})
}

// ListWorktrees handles GET /api/v1/worktrees
func (h *WorktreeHandler) ListWorktrees(c *gin.Context) {
	opts := &services.ListWorktreesOptions{
		Limit:  20,
		Offset: 0,
	}

	// Parse query parameters
	if projectID := c.Query("project_id"); projectID != "" {
		id, err := strconv.Atoi(projectID)
		if err == nil {
			opts.ProjectID = &id
		}
	}

	if status := c.Query("status"); status != "" {
		opts.Status = &status
	}

	if expertID := c.Query("expert_id"); expertID != "" {
		opts.ExpertID = &expertID
	}

	if aiUserID := c.Query("ai_user_id"); aiUserID != "" {
		id, err := strconv.Atoi(aiUserID)
		if err == nil {
			opts.AIUserID = &id
		}
	}

	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			opts.Limit = l
		}
	}

	if offset := c.Query("offset"); offset != "" {
		if o, err := strconv.Atoi(offset); err == nil {
			opts.Offset = o
		}
	}

	worktrees, total, err := h.service.ListWorktrees(c.Request.Context(), opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  worktrees,
		"total": total,
		"limit": opts.Limit,
		"offset": opts.Offset,
	})
}

// UpdateWorktree handles PUT /api/v1/worktrees/:id
func (h *WorktreeHandler) UpdateWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	var req services.UpdateWorktreeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	worktree, err := h.service.UpdateWorktree(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": worktree})
}

// DeleteWorktree handles DELETE /api/v1/worktrees/:id
func (h *WorktreeHandler) DeleteWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.service.DeleteWorktree(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree deleted successfully"})
}

// ============================================
// Lifecycle Endpoints
// ============================================

// InitializeWorktree handles POST /api/v1/worktrees/:id/initialize
func (h *WorktreeHandler) InitializeWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.service.InitializeWorktree(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree initialized successfully"})
}

// ActivateWorktreeRequest represents activate request
type ActivateWorktreeRequest struct {
	AIUserID int  `json:"ai_user_id" binding:"required"`
	TaskID   *int `json:"task_id"`
}

// ActivateWorktree handles POST /api/v1/worktrees/:id/activate
func (h *WorktreeHandler) ActivateWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	var req ActivateWorktreeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ActivateWorktree(c.Request.Context(), id, req.AIUserID, req.TaskID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree activated successfully"})
}

// DeactivateWorktree handles POST /api/v1/worktrees/:id/deactivate
func (h *WorktreeHandler) DeactivateWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.service.DeactivateWorktree(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree deactivated successfully"})
}

// CompleteWorktree handles POST /api/v1/worktrees/:id/complete
func (h *WorktreeHandler) CompleteWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.service.CompleteWorktree(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree completed successfully"})
}

// ArchiveWorktree handles POST /api/v1/worktrees/:id/archive
func (h *WorktreeHandler) ArchiveWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.service.ArchiveWorktree(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree archived successfully"})
}

// LockWorktreeRequest represents lock request
type LockWorktreeRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// LockWorktree handles POST /api/v1/worktrees/:id/lock
func (h *WorktreeHandler) LockWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	var req LockWorktreeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.LockWorktree(c.Request.Context(), id, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree locked successfully"})
}

// UnlockWorktree handles POST /api/v1/worktrees/:id/unlock
func (h *WorktreeHandler) UnlockWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.service.UnlockWorktree(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree unlocked successfully"})
}

// ============================================
// Status Query Endpoints
// ============================================

// GetWorktreeStats handles GET /api/v1/projects/:id/worktrees/stats
func (h *WorktreeHandler) GetWorktreeStats(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	stats, err := h.service.GetWorktreeStats(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

// GetActiveWorktrees handles GET /api/v1/projects/:id/worktrees/active
func (h *WorktreeHandler) GetActiveWorktrees(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	worktrees, err := h.service.GetActiveWorktrees(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": worktrees})
}

// GetWorktreesByExpert handles GET /api/v1/projects/:id/worktrees/expert/:expertId
func (h *WorktreeHandler) GetWorktreesByExpert(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	expertID := c.Param("expertId")
	if expertID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expert ID is required"})
		return
	}

	worktrees, err := h.service.GetWorktreesByExpert(c.Request.Context(), projectID, expertID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": worktrees})
}

// ============================================
// Health and Sync Endpoints
// ============================================

// HealthCheckWorktree handles GET /api/v1/worktrees/:id/health
func (h *WorktreeHandler) HealthCheckWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	result, err := h.service.HealthCheck(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// SyncWorktree handles POST /api/v1/worktrees/:id/sync
func (h *WorktreeHandler) SyncWorktree(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	if err := h.service.SyncWorktree(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "worktree synced successfully"})
}

// SyncAllWorktrees handles POST /api/v1/projects/:id/worktrees/sync
func (h *WorktreeHandler) SyncAllWorktrees(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid project ID"})
		return
	}

	if err := h.service.SyncAllWorktrees(c.Request.Context(), projectID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "all worktrees synced successfully"})
}

// ============================================
// Task Binding Endpoints
// ============================================

// BindTaskRequest represents bind task request
type BindTaskRequest struct {
	TaskID       int    `json:"task_id" binding:"required"`
	RelationType string `json:"relation_type" binding:"required"`
}

// BindTask handles POST /api/v1/worktrees/:id/tasks
func (h *WorktreeHandler) BindTask(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	var req BindTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.BindTask(c.Request.Context(), worktreeID, req.TaskID, req.RelationType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task bound successfully"})
}

// UnbindTask handles DELETE /api/v1/worktrees/:id/tasks/:taskId
func (h *WorktreeHandler) UnbindTask(c *gin.Context) {
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

	if err := h.service.UnbindTask(c.Request.Context(), worktreeID, taskID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task unbound successfully"})
}

// GetWorktreeTasks handles GET /api/v1/worktrees/:id/tasks
func (h *WorktreeHandler) GetWorktreeTasks(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	tasks, err := h.service.GetWorktreeTasks(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tasks})
}

// ============================================
// Activity Log Endpoints
// ============================================

// GetWorktreeActivities handles GET /api/v1/worktrees/:id/activities
func (h *WorktreeHandler) GetWorktreeActivities(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	limit := 20
	offset := 0

	if l := c.Query("limit"); l != "" {
		if parsedLimit, err := strconv.Atoi(l); err == nil {
			limit = parsedLimit
		}
	}

	if o := c.Query("offset"); o != "" {
		if parsedOffset, err := strconv.Atoi(o); err == nil {
			offset = parsedOffset
		}
	}

	activities, total, err := h.service.GetWorktreeActivities(c.Request.Context(), worktreeID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":   activities,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ============================================
// Workspace Assignment Endpoints
// ============================================

// GetWorkspaceAssignment handles GET /api/v1/worktrees/:id/assignment
func (h *WorktreeHandler) GetWorkspaceAssignment(c *gin.Context) {
	worktreeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid worktree ID"})
		return
	}

	assignment, err := h.service.GetWorkspaceAssignment(c.Request.Context(), worktreeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assignment})
}

// GetAIUserWorkspaces handles GET /api/v1/ai-users/:id/workspaces
func (h *WorktreeHandler) GetAIUserWorkspaces(c *gin.Context) {
	aiUserID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid AI user ID"})
		return
	}

	workspaces, err := h.service.GetAIUserWorkspaces(c.Request.Context(), aiUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": workspaces})
}
