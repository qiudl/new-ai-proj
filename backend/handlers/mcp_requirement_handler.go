package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// MCPRequirementHandler handles MCP-specific requirement operations
// Provides simplified, Claude Code-friendly interfaces for requirement management
type MCPRequirementHandler struct {
	db                       database.DB
	logger                   *log.Logger
	requirementHandler       *RequirementHandler
	requirementTaskHandler   *RequirementTaskHandler
	requirementStatusHandler *RequirementStatusHandler
}

// NewMCPRequirementHandler creates a new MCP requirement handler
func NewMCPRequirementHandler(
	db database.DB,
	logger *log.Logger,
	requirementHandler *RequirementHandler,
	requirementTaskHandler *RequirementTaskHandler,
	requirementStatusHandler *RequirementStatusHandler,
) *MCPRequirementHandler {
	return &MCPRequirementHandler{
		db:                       db,
		logger:                   logger,
		requirementHandler:       requirementHandler,
		requirementTaskHandler:   requirementTaskHandler,
		requirementStatusHandler: requirementStatusHandler,
	}
}

// ============================================================================
// Helper Methods - Smart Inference
// ============================================================================

// inferEnterpriseID gets enterprise ID from user context
func (h *MCPRequirementHandler) inferEnterpriseID(c *gin.Context) (int, error) {
	// Try to get from user's company_id
	userID := c.GetInt("user_id")
	if userID == 0 {
		return 0, fmt.Errorf("user not authenticated")
	}

	user, err := h.db.Users().GetByID(context.Background(), userID)
	if err != nil {
		return 0, fmt.Errorf("failed to get user: %v", err)
	}

	// v1.5: Use GetEnterpriseID() for backward compatibility
	if enterpriseID := user.GetEnterpriseID(); enterpriseID != nil && *enterpriseID > 0 {
		return *enterpriseID, nil
	}

	return 0, fmt.Errorf("user has no enterprise assigned")
}

// inferEnterpriseFromProject gets enterprise ID from project
func (h *MCPRequirementHandler) inferEnterpriseFromProject(ctx context.Context, projectID int) (int, error) {
	project, err := h.db.Projects().GetByID(ctx, projectID)
	if err != nil {
		return 0, fmt.Errorf("failed to get project: %v", err)
	}

	if project == nil {
		return 0, fmt.Errorf("project %d not found", projectID)
	}

	if project.EnterpriseID == nil || *project.EnterpriseID == 0 {
		return 0, fmt.Errorf("project %d has no enterprise assigned", projectID)
	}

	return *project.EnterpriseID, nil
}

// inferProjectID gets project ID from various sources
func (h *MCPRequirementHandler) inferProjectID(c *gin.Context, enterpriseID int) (*int, error) {
	// 1. Try from query parameter
	if projectIDStr := c.Query("project_id"); projectIDStr != "" {
		if projectID, err := strconv.Atoi(projectIDStr); err == nil {
			return &projectID, nil
		}
	}

	// 2. Try from request body (if available)
	var reqBody map[string]interface{}
	if c.Request.Body != nil {
		if err := c.ShouldBindJSON(&reqBody); err == nil {
			if projectID, ok := reqBody["projectId"].(float64); ok {
				pid := int(projectID)
				return &pid, nil
			}
			if projectID, ok := reqBody["project_id"].(float64); ok {
				pid := int(projectID)
				return &pid, nil
			}
		}
	}

	// No project ID found - that's okay, project_id is optional for requirements
	return nil, nil
}

// ============================================================================
// Response Helpers
// ============================================================================

func (h *MCPRequirementHandler) successResponse(c *gin.Context, data interface{}, message string) {
	c.JSON(http.StatusOK, models.NewSuccessResponse(data, message))
}

func (h *MCPRequirementHandler) errorResponse(c *gin.Context, code int, errCode string, message string, detail interface{}) {
	c.JSON(code, models.NewErrorResponse(errCode, message, detail))
}

// ============================================================================
// Phase 1: Core CRUD Operations
// ============================================================================

// CreateRequirementRequest represents MCP requirement creation request
type CreateRequirementRequest struct {
	Title              string   `json:"title" binding:"required,min=1,max=500"`
	Description        *string  `json:"description"`
	ProjectID          *int     `json:"projectId"`
	EnterpriseID       *int     `json:"enterpriseId"`
	Priority           *string  `json:"priority"`
	Category           *string  `json:"category"`
	BusinessValue      *string  `json:"businessValue"`
	Complexity         *string  `json:"complexity"`
	EstimatedHours     *float64 `json:"estimatedHours"`
	ReviewerID         *int     `json:"reviewerId"`
	Tags               []string            `json:"tags"`
	DueDate            *string             `json:"dueDate"`
	AcceptanceCriteria *string             `json:"acceptanceCriteria"`
	CustomFields       models.CustomFields `json:"customFields,omitempty"`
}

// CreateRequirement godoc
// @Summary Create a new requirement (MCP)
// @Description Create a new requirement with smart inference of enterprise and project
// @Tags mcp
// @Accept json
// @Produce json
// @Param request body CreateRequirementRequest true "Requirement creation request"
// @Success 200 {object} models.APIResponse{data=models.Requirement}
// @Failure 400 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/create [post]
// @Security Bearer
func (h *MCPRequirementHandler) CreateRequirement(c *gin.Context) {
	var req CreateRequirementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "请求数据格式错误", err.Error())
		return
	}

	ctx := c.Request.Context()
	userID := c.GetInt("user_id")

	// Smart inference: Enterprise ID with cascading strategy
	// Priority: 1. Explicit enterpriseId -> 2. From projectId -> 3. From user
	enterpriseID := 0
	var err error

	if req.EnterpriseID != nil && *req.EnterpriseID > 0 {
		// Strategy 1: Explicitly provided
		enterpriseID = *req.EnterpriseID
		h.logger.Printf("[MCP] Using explicitly provided enterprise_id: %d", enterpriseID)
	} else if req.ProjectID != nil && *req.ProjectID > 0 {
		// Strategy 2: Infer from project_id
		enterpriseID, err = h.inferEnterpriseFromProject(ctx, *req.ProjectID)
		if err != nil {
			// Fallback to user inference if project inference fails
			h.logger.Printf("[MCP] Warning: Failed to infer enterprise from project %d: %v, trying user inference", *req.ProjectID, err)
			enterpriseID, err = h.inferEnterpriseID(c)
			if err != nil {
				h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation,
					"无法推断企业ID（从项目和用户都失败）", err.Error())
				return
			}
			h.logger.Printf("[MCP] Inferred enterprise_id from user: %d", enterpriseID)
		} else {
			h.logger.Printf("[MCP] Inferred enterprise_id from project %d: %d", *req.ProjectID, enterpriseID)
		}
	} else {
		// Strategy 3: Infer from user
		enterpriseID, err = h.inferEnterpriseID(c)
		if err != nil {
			h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation,
				"无法推断企业ID（需要提供enterprise_id或project_id，或用户需有企业关联）", err.Error())
			return
		}
		h.logger.Printf("[MCP] Inferred enterprise_id from user: %d", enterpriseID)
	}

	// Smart inference: Project ID
	var projectID *int
	if req.ProjectID != nil && *req.ProjectID > 0 {
		projectID = req.ProjectID
	} else {
		inferredProjectID, _ := h.inferProjectID(c, enterpriseID)
		projectID = inferredProjectID
	}

	// Set defaults
	priority := "medium"
	if req.Priority != nil {
		priority = *req.Priority
	}

	status := string(models.RequirementStatusDraft)

	// Build requirement object
	requirement := &models.Requirement{
		Title:              req.Title,
		Description:        req.Description,
		ProjectID:          projectID,
		EnterpriseID:       enterpriseID,
		SubmitterID:        userID,
		ReviewerID:         req.ReviewerID,
		Status:             status,
		Priority:           priority,
		Category:           req.Category,
		BusinessValue:      req.BusinessValue,
		Complexity:         req.Complexity,
		EstimatedHours:     req.EstimatedHours,
		AcceptanceCriteria: req.AcceptanceCriteria,
		CustomFields:       req.CustomFields,
	}

	// Parse due date if provided
	if req.DueDate != nil && *req.DueDate != "" {
		if dueDate, err := time.Parse("2006-01-02", *req.DueDate); err == nil {
			requirement.DueDate = &dueDate
		}
	}

	// Create requirement
	createdReq, err := h.db.Requirements().Create(ctx, requirement)
	if err != nil {
		h.logger.Printf("Error creating requirement: %v", err)
		h.errorResponse(c, http.StatusInternalServerError, models.ErrCodeInternal, "创建需求失败", err.Error())
		return
	}

	// Record history
	_ = RecordRequirementHistory(
		h.db,
		createdReq.ID,
		userID,
		"created",
		nil,
		&createdReq.Status,
		nil,
		nil,
	)

	// Get full requirement with relations
	fullReq, err := h.db.Requirements().GetByID(ctx, createdReq.ID)
	if err != nil {
		h.logger.Printf("Error getting created requirement: %v", err)
		// Still return created requirement even if can't fetch full details
		h.successResponse(c, createdReq, "成功创建需求")
		return
	}

	h.successResponse(c, fullReq, "成功创建需求")
}

// GetRequirement godoc
// @Summary Get a requirement by ID (MCP)
// @Description Get detailed information about a requirement
// @Tags mcp
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Success 200 {object} models.APIResponse{data=models.Requirement}
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id} [get]
// @Security Bearer
func (h *MCPRequirementHandler) GetRequirement(c *gin.Context) {
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "无效的需求ID", nil)
		return
	}

	ctx := c.Request.Context()

	requirement, err := h.db.Requirements().GetByID(ctx, requirementID)
	if err != nil {
		h.logger.Printf("Error getting requirement %d: %v", requirementID, err)
		h.errorResponse(c, http.StatusInternalServerError, models.ErrCodeInternal, "获取需求失败", nil)
		return
	}

	if requirement == nil {
		h.errorResponse(c, http.StatusNotFound, models.ErrCodeNotFound, "需求不存在", nil)
		return
	}

	h.successResponse(c, requirement, "成功获取需求")
}

// UpdateRequirementRequest represents MCP requirement update request
type UpdateRequirementRequest struct {
	Title              *string  `json:"title"`
	Description        *string  `json:"description"`
	ProjectID          *int     `json:"projectId"`
	Priority           *string  `json:"priority"`
	Category           *string  `json:"category"`
	BusinessValue      *string  `json:"businessValue"`
	Complexity         *string  `json:"complexity"`
	EstimatedHours     *float64 `json:"estimatedHours"`
	ReviewerID         *int     `json:"reviewerId"`
	DueDate            *string  `json:"dueDate"`
	AcceptanceCriteria *string  `json:"acceptanceCriteria"`
	Status             *string  `json:"status"`
}

// UpdateRequirement godoc
// @Summary Update a requirement (MCP)
// @Description Update requirement fields
// @Tags mcp
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body UpdateRequirementRequest true "Requirement update request"
// @Success 200 {object} models.APIResponse{data=models.Requirement}
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id} [put]
// @Security Bearer
func (h *MCPRequirementHandler) UpdateRequirement(c *gin.Context) {
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "无效的需求ID", nil)
		return
	}

	var req UpdateRequirementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "请求数据格式错误", err.Error())
		return
	}

	ctx := c.Request.Context()
	userID := c.GetInt("user_id")

	// Get existing requirement
	existing, err := h.db.Requirements().GetByID(ctx, requirementID)
	if err != nil {
		h.logger.Printf("Error getting requirement %d: %v", requirementID, err)
		h.errorResponse(c, http.StatusInternalServerError, models.ErrCodeInternal, "获取需求失败", nil)
		return
	}

	if existing == nil {
		h.errorResponse(c, http.StatusNotFound, models.ErrCodeNotFound, "需求不存在", nil)
		return
	}

	// Save original status for history tracking
	originalStatus := existing.Status

	// Apply updates to existing requirement
	hasUpdates := false

	if req.Title != nil {
		existing.Title = *req.Title
		hasUpdates = true
	}
	if req.Description != nil {
		existing.Description = req.Description
		hasUpdates = true
	}
	if req.ProjectID != nil {
		existing.ProjectID = req.ProjectID
		hasUpdates = true
	}
	if req.Priority != nil {
		existing.Priority = *req.Priority
		hasUpdates = true
	}
	if req.Category != nil {
		existing.Category = req.Category
		hasUpdates = true
	}
	if req.BusinessValue != nil {
		existing.BusinessValue = req.BusinessValue
		hasUpdates = true
	}
	if req.Complexity != nil {
		existing.Complexity = req.Complexity
		hasUpdates = true
	}
	if req.EstimatedHours != nil {
		existing.EstimatedHours = req.EstimatedHours
		hasUpdates = true
	}
	if req.ReviewerID != nil {
		existing.ReviewerID = req.ReviewerID
		hasUpdates = true
	}
	if req.AcceptanceCriteria != nil {
		existing.AcceptanceCriteria = req.AcceptanceCriteria
		hasUpdates = true
	}
	if req.Status != nil {
		existing.Status = *req.Status
		hasUpdates = true
	}

	// Parse due date if provided
	if req.DueDate != nil && *req.DueDate != "" {
		if dueDate, err := time.Parse("2006-01-02", *req.DueDate); err == nil {
			existing.DueDate = &dueDate
			hasUpdates = true
		}
	}

	if !hasUpdates {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "没有提供要更新的字段", nil)
		return
	}

	// Update requirement
	_, err = h.db.Requirements().Update(ctx, existing)
	if err != nil {
		h.logger.Printf("Error updating requirement %d: %v", requirementID, err)
		h.errorResponse(c, http.StatusInternalServerError, models.ErrCodeInternal, "更新需求失败", err.Error())
		return
	}

	// Record history for status change
	if req.Status != nil && *req.Status != originalStatus {
		_ = RecordRequirementHistory(
			h.db,
			requirementID,
			userID,
			"status_changed",
			&originalStatus,
			req.Status,
			nil,
			nil,
		)
	}

	// Get updated requirement
	updated, err := h.db.Requirements().GetByID(ctx, requirementID)
	if err != nil {
		h.logger.Printf("Error getting updated requirement: %v", err)
		h.errorResponse(c, http.StatusInternalServerError, models.ErrCodeInternal, "获取更新后的需求失败", nil)
		return
	}

	h.successResponse(c, updated, "成功更新需求")
}

// ListRequirementsRequest represents MCP requirements list request
type ListRequirementsRequest struct {
	Page      int      `form:"page"`
	PageSize  int      `form:"pageSize"`
	Search    string   `form:"search"`
	Status    []string `form:"status"`
	Priority  []string `form:"priority"`
	ProjectID *int     `form:"projectId"`
	SortBy    string   `form:"sortBy"`
	SortOrder string   `form:"sortOrder"`
}

// ListRequirements godoc
// @Summary List requirements (MCP)
// @Description Get a paginated list of requirements with filtering
// @Tags mcp
// @Accept json
// @Produce json
// @Param page query int false "Page number (default: 1)"
// @Param pageSize query int false "Page size (default: 20)"
// @Param search query string false "Search in title/description"
// @Param status query []string false "Filter by status"
// @Param priority query []string false "Filter by priority"
// @Param projectId query int false "Filter by project ID"
// @Param assigneeId query int false "Filter by assignee ID"
// @Param sortBy query string false "Sort field (default: created_at)"
// @Param sortOrder query string false "Sort order (default: desc)"
// @Success 200 {object} models.APIResponse{data=models.RequirementListResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/mcp/requirements [get]
// @Security Bearer
func (h *MCPRequirementHandler) ListRequirements(c *gin.Context) {
	var req ListRequirementsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "请求参数错误", err.Error())
		return
	}

	// Set defaults
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 || req.PageSize > 100 {
		req.PageSize = 20
	}
	if req.SortBy == "" {
		req.SortBy = "created_at"
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	ctx := c.Request.Context()

	// Build filters
	filters := &models.RequirementFilters{
		Page:      req.Page,
		PageSize:  req.PageSize,
		Search:    req.Search,
		Status:    req.Status,
		Priority:  req.Priority,
		ProjectID: req.ProjectID,
		SortBy:    req.SortBy,
		SortOrder: req.SortOrder,
	}

	// Get requirements
	response, err := h.db.Requirements().List(ctx, filters)
	if err != nil {
		h.logger.Printf("Error listing requirements: %v", err)
		h.errorResponse(c, http.StatusInternalServerError, models.ErrCodeInternal, "获取需求列表失败", nil)
		return
	}

	h.successResponse(c, response, "成功获取需求列表")
}

// ============================================================================
// Phase 2: Requirement-Task Linking
// ============================================================================

// LinkTasksRequest represents the request to link tasks to a requirement
type LinkTasksRequest struct {
	TaskIDs     []int   `json:"taskIds" binding:"required,min=1"`
	LinkComment *string `json:"linkComment"`
}

// LinkTasksToRequirement links multiple tasks to a requirement
// @Summary Link tasks to requirement (MCP)
// @Description Link one or more existing tasks to a requirement (MCP interface)
// @Tags mcp
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body LinkTasksRequest true "Tasks to link"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/link-tasks [post]
// @Security Bearer
func (h *MCPRequirementHandler) LinkTasksToRequirement(c *gin.Context) {
	// Parse requirement ID
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "无效的需求ID", nil)
		return
	}

	// Parse request
	var req LinkTasksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "请求数据格式错误", err.Error())
		return
	}

	ctx := c.Request.Context()
	userID := c.GetInt("user_id")

	// Verify requirement exists
	requirement, err := h.db.Requirements().GetByID(ctx, requirementID)
	if err != nil || requirement == nil {
		h.errorResponse(c, http.StatusNotFound, models.ErrCodeNotFound, "需求不存在", nil)
		return
	}

	// Link each task
	linkedCount := 0
	errors := []string{}

	for _, taskID := range req.TaskIDs {
		// Create link request
		linkReq := models.CreateRequirementTaskLinkRequest{
			RequirementID: requirementID,
			TaskID:        taskID,
			LinkType:      string(models.RequirementTaskLinkManual),
			LinkComment:   req.LinkComment,
		}

		// Create link
		link := &models.RequirementTask{
			RequirementID: linkReq.RequirementID,
			TaskID:        linkReq.TaskID,
			LinkType:      linkReq.LinkType,
			LinkedBy:      userID,
			LinkComment:   linkReq.LinkComment,
		}

		_, err := h.db.RequirementTasks().Create(ctx, link)
		if err != nil {
			h.logger.Printf("Error linking task %d to requirement %d: %v", taskID, requirementID, err)
			errors = append(errors, fmt.Sprintf("任务%d关联失败: %v", taskID, err))
		} else {
			linkedCount++
		}
	}

	// Prepare response
	responseMsg := fmt.Sprintf("成功关联 %d/%d 个任务", linkedCount, len(req.TaskIDs))
	if len(errors) > 0 {
		h.successResponse(c, map[string]interface{}{
			"linked_count": linkedCount,
			"total_count":  len(req.TaskIDs),
			"errors":       errors,
		}, responseMsg)
	} else {
		h.successResponse(c, map[string]interface{}{
			"linked_count": linkedCount,
			"total_count":  len(req.TaskIDs),
		}, responseMsg)
	}
}

// UnlinkTaskFromRequirement unlinks a task from a requirement
// @Summary Unlink task from requirement (MCP)
// @Description Remove the link between a task and a requirement (MCP interface)
// @Tags mcp
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param task_id path int true "Task ID"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/tasks/{task_id} [delete]
// @Security Bearer
func (h *MCPRequirementHandler) UnlinkTaskFromRequirement(c *gin.Context) {
	// Delegate to existing handler
	h.requirementTaskHandler.UnlinkTaskFromRequirement(c)
}

// GetRequirementTasks gets all tasks linked to a requirement
// @Summary Get requirement tasks (MCP)
// @Description Get all tasks linked to a specific requirement (MCP interface)
// @Tags mcp
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/tasks [get]
// @Security Bearer
func (h *MCPRequirementHandler) GetRequirementTasks(c *gin.Context) {
	// Delegate to existing handler
	h.requirementTaskHandler.GetRequirementTasks(c)
}

// ============================================================================
// Phase 3: Requirement Status Workflow
// ============================================================================

// SubmitRequirement - Submit requirement for review (draft -> pending)
// @Summary Submit requirement for review (MCP)
// @Description Submit a draft requirement for review, changing status from draft to pending
// @Tags mcp-requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/submit [post]
// @Security Bearer
func (h *MCPRequirementHandler) SubmitRequirement(c *gin.Context) {
	h.requirementStatusHandler.SubmitRequirement(c)
}

// ApproveRequirement - Approve requirement
// @Summary Approve requirement (MCP)
// @Description Approve a requirement (reviewers/admins only)
// @Tags mcp-requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional approval comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/approve [post]
// @Security Bearer
func (h *MCPRequirementHandler) ApproveRequirement(c *gin.Context) {
	h.requirementStatusHandler.ApproveRequirement(c)
}

// RejectRequirement - Reject requirement
// @Summary Reject requirement (MCP)
// @Description Reject a requirement with mandatory rejection reason
// @Tags mcp-requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} true "Rejection reason (required)"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/reject [post]
// @Security Bearer
func (h *MCPRequirementHandler) RejectRequirement(c *gin.Context) {
	h.requirementStatusHandler.RejectRequirement(c)
}

// WithdrawRequirement - Withdraw requirement
// @Summary Withdraw requirement (MCP)
// @Description Withdraw a submitted requirement back to draft status
// @Tags mcp-requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/withdraw [post]
// @Security Bearer
func (h *MCPRequirementHandler) WithdrawRequirement(c *gin.Context) {
	h.requirementStatusHandler.WithdrawRequirement(c)
}

// ArchiveRequirement - Archive requirement
// @Summary Archive requirement (MCP)
// @Description Archive a requirement for historical record keeping
// @Tags mcp-requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param request body object{comment=string} false "Optional comment"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/archive [post]
// @Security Bearer
func (h *MCPRequirementHandler) ArchiveRequirement(c *gin.Context) {
	h.requirementStatusHandler.ArchiveRequirement(c)
}

// ============================================================================
// Phase 4: Advanced Query and Statistics
// ============================================================================

// GetRequirementHistory - Get requirement operation history
// @Summary Get requirement history (MCP)
// @Description Get detailed operation history for a specific requirement
// @Tags mcp-requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/history [get]
// @Security Bearer
func (h *MCPRequirementHandler) GetRequirementHistory(c *gin.Context) {
	// Create a temporary RequirementHistoryHandler if needed
	historyHandler := NewRequirementHistoryHandler(h.db, h.logger, nil)
	historyHandler.GetRequirementHistory(c)
}

// GetRequirementStatistics - Get requirement statistics
// @Summary Get requirement statistics (MCP)
// @Description Get comprehensive statistics for a requirement including comments, tasks, history
// @Tags mcp-requirements
// @Accept json
// @Produce json
// @Param id path int true "Requirement ID"
// @Success 200 {object} models.APIResponse{data=object{comment_count=int,task_count=int,history_count=int,created_at=string,updated_at=string,status=string}}
// @Failure 400 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Router /api/v1/mcp/requirements/{id}/statistics [get]
// @Security Bearer
func (h *MCPRequirementHandler) GetRequirementStatistics(c *gin.Context) {
	requirementIDStr := c.Param("id")
	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		h.errorResponse(c, http.StatusBadRequest, models.ErrCodeValidation, "无效的需求ID", nil)
		return
	}

	ctx := c.Request.Context()

	// Get requirement
	requirement, err := h.db.Requirements().GetByID(ctx, requirementID)
	if err != nil {
		h.errorResponse(c, http.StatusNotFound, models.ErrCodeNotFound, "需求不存在", nil)
		return
	}

	// Get comment count
	var commentCount int64
	h.db.GetDB().(*sql.DB).QueryRow("SELECT COUNT(*) FROM requirement_comments WHERE requirement_id = $1 AND deleted_at IS NULL", requirementID).Scan(&commentCount)

	// Get task count
	var taskCount int64
	h.db.GetDB().(*sql.DB).QueryRow("SELECT COUNT(*) FROM requirement_tasks WHERE requirement_id = $1 AND deleted_at IS NULL", requirementID).Scan(&taskCount)

	// Get history count
	var historyCount int64
	h.db.GetDB().(*sql.DB).QueryRow("SELECT COUNT(*) FROM requirement_history WHERE requirement_id = $1", requirementID).Scan(&historyCount)

	// Build response
	responseData := map[string]interface{}{
		"requirement_id":  requirementID,
		"comment_count":   commentCount,
		"task_count":      taskCount,
		"history_count":   historyCount,
		"status":          requirement.Status,
		"priority":        requirement.Priority,
		"category":        requirement.Category,
		"created_at":      requirement.CreatedAt,
		"updated_at":      requirement.UpdatedAt,
		"display_id":      requirement.DisplayID,
	}

	h.successResponse(c, responseData, "获取需求统计信息成功")
}
