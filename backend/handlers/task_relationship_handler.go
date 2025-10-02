package handlers

import (
	"net/http"
	"strconv"

	"ai-project-backend/models"
	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// TaskRelationshipHandler handles task relationship API requests
type TaskRelationshipHandler struct {
	service services.TaskRelationshipService
}

// NewTaskRelationshipHandler creates a new task relationship handler
func NewTaskRelationshipHandler(service services.TaskRelationshipService) *TaskRelationshipHandler {
	return &TaskRelationshipHandler{
		service: service,
	}
}

// CreateRelationship creates a new task relationship
// @Summary Create task relationship
// @Description Create a new relationship between two tasks
// @Tags task-relationships
// @Accept json
// @Produce json
// @Param relationship body models.TaskRelationshipRequest true "Task relationship data"
// @Success 201 {object} models.TaskRelationship
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/task-relationships [post]
func (h *TaskRelationshipHandler) CreateRelationship(c *gin.Context) {
	var req models.TaskRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error()))
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, *models.NewErrorResponse(models.ErrCodeUnauthorized, "Authentication required", nil))
		return
	}

	// Validate relationship doesn't create cycles for dependency types
	if req.RelationshipType == "depends_on" || req.RelationshipType == "blocks" {
		hasCycle, err := h.service.CheckForCycles(req.SourceTaskID, req.TargetTaskID, req.RelationshipType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to validate relationship", err.Error()))
			return
		}
		if hasCycle {
			c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Relationship would create a circular dependency", nil))
			return
		}
	}

	// Create the relationship
	relationship, err := h.service.CreateRelationship(
		req.SourceTaskID,
		req.TargetTaskID,
		req.RelationshipType,
		req.RelationshipStatus,
		userID.(int),
		req.Metadata,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to create relationship", err.Error()))
		return
	}

	c.JSON(http.StatusCreated, *models.NewSuccessResponse(relationship, "Task relationship created successfully"))
}

// GetTaskRelationships retrieves all relationships for a specific task
// @Summary Get task relationships
// @Description Get all relationships for a specific task
// @Tags task-relationships
// @Produce json
// @Param task_id path int true "Task ID"
// @Param type query string false "Filter by relationship type"
// @Success 200 {object} models.APIResponse{data=[]models.TaskRelationship}
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/tasks/{task_id}/relationships [get]
func (h *TaskRelationshipHandler) GetTaskRelationships(c *gin.Context) {
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil))
		return
	}

	relationshipType := c.Query("type")

	relationships, err := h.service.GetTaskRelationships(taskID, relationshipType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve relationships", err.Error()))
		return
	}

	c.JSON(http.StatusOK, *models.NewSuccessResponse(relationships, "Task relationships retrieved successfully"))
}

// UpdateRelationship updates an existing task relationship
// @Summary Update task relationship
// @Description Update an existing relationship between tasks
// @Tags task-relationships
// @Accept json
// @Produce json
// @Param id path int true "Relationship ID"
// @Param relationship body models.TaskRelationshipRequest true "Updated relationship data"
// @Success 200 {object} models.TaskRelationship
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/task-relationships/{id} [put]
func (h *TaskRelationshipHandler) UpdateRelationship(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid relationship ID", nil))
		return
	}

	var req models.TaskRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error()))
		return
	}

	relationship, err := h.service.UpdateRelationship(id, req.RelationshipStatus, req.Metadata)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to update relationship", err.Error()))
		return
	}

	c.JSON(http.StatusOK, *models.NewSuccessResponse(relationship, "Task relationship updated successfully"))
}

// DeleteRelationship deletes a task relationship (soft delete)
// @Summary Delete task relationship
// @Description Soft delete a task relationship
// @Tags task-relationships
// @Produce json
// @Param id path int true "Relationship ID"
// @Success 200 {object} models.APIResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/task-relationships/{id} [delete]
func (h *TaskRelationshipHandler) DeleteRelationship(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid relationship ID", nil))
		return
	}

	err = h.service.DeleteRelationship(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete relationship", err.Error()))
		return
	}

	c.JSON(http.StatusOK, *models.NewSuccessResponse(nil, "Task relationship deleted successfully"))
}

// GetTaskWithAllRelationships retrieves a task with all its relationships
// @Summary Get task with relationships
// @Description Get a task with all its incoming and outgoing relationships
// @Tags task-relationships
// @Produce json
// @Param task_id path int true "Task ID"
// @Success 200 {object} models.TaskWithRelationships
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/tasks/{task_id}/with-relationships [get]
func (h *TaskRelationshipHandler) GetTaskWithAllRelationships(c *gin.Context) {
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil))
		return
	}

	taskWithRels, err := h.service.GetTaskWithAllRelationships(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task with relationships", err.Error()))
		return
	}

	c.JSON(http.StatusOK, *models.NewSuccessResponse(taskWithRels, "Task with relationships retrieved successfully"))
}

// GetParallelDevelopmentGroups retrieves parallel development groups
// @Summary Get parallel development groups
// @Description Get all parallel development groups with their tasks and status
// @Tags task-relationships
// @Produce json
// @Param project_id query int false "Filter by project ID"
// @Success 200 {object} models.APIResponse{data=[]models.ParallelDevelopmentGroup}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/parallel-groups [get]
func (h *TaskRelationshipHandler) GetParallelDevelopmentGroups(c *gin.Context) {
	projectIDStr := c.Query("project_id")
	var projectID *int
	if projectIDStr != "" {
		if id, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = &id
		}
	}

	groups, err := h.service.GetParallelDevelopmentGroups(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve parallel development groups", err.Error()))
		return
	}

	c.JSON(http.StatusOK, *models.NewSuccessResponse(groups, "Parallel development groups retrieved successfully"))
}

// ValidateParallelTasksCanStart checks if parallel tasks can be started
// @Summary Validate parallel task startup
// @Description Check if a group of parallel tasks can be started based on dependencies
// @Tags task-relationships
// @Accept json
// @Produce json
// @Param tasks body []int true "Array of task IDs to validate"
// @Success 200 {object} models.APIResponse{data=object}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/parallel-groups/validate [post]
func (h *TaskRelationshipHandler) ValidateParallelTasksCanStart(c *gin.Context) {
	var taskIDs []int
	if err := c.ShouldBindJSON(&taskIDs); err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error()))
		return
	}

	validation, err := h.service.ValidateParallelTasksCanStart(taskIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to validate parallel tasks", err.Error()))
		return
	}

	c.JSON(http.StatusOK, *models.NewSuccessResponse(validation, "Parallel tasks validation completed"))
}

// GetTaskDependencyGraph generates a dependency graph for visualization
// @Summary Get task dependency graph
// @Description Generate dependency graph data for task visualization
// @Tags task-relationships
// @Produce json
// @Param project_id query int false "Filter by project ID"
// @Param root_task_id query int false "Root task ID for subgraph"
// @Success 200 {object} models.TaskDependencyGraph
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/task-dependency-graph [get]
func (h *TaskRelationshipHandler) GetTaskDependencyGraph(c *gin.Context) {
	projectIDStr := c.Query("project_id")
	rootTaskIDStr := c.Query("root_task_id")

	var projectID, rootTaskID *int
	if projectIDStr != "" {
		if id, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = &id
		}
	}
	if rootTaskIDStr != "" {
		if id, err := strconv.Atoi(rootTaskIDStr); err == nil {
			rootTaskID = &id
		}
	}

	graph, err := h.service.GenerateTaskDependencyGraph(projectID, rootTaskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate dependency graph", err.Error()))
		return
	}

	c.JSON(http.StatusOK, *models.NewSuccessResponse(graph, "Task dependency graph generated successfully"))
}

// BulkCreateRelationships creates multiple task relationships in batch
// @Summary Bulk create relationships
// @Description Create multiple task relationships in a single batch operation
// @Tags task-relationships
// @Accept json
// @Produce json
// @Param relationships body []models.TaskRelationshipRequest true "Array of relationship requests"
// @Success 201 {object} models.APIResponse{data=[]models.TaskRelationship}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/task-relationships/batch [post]
func (h *TaskRelationshipHandler) BulkCreateRelationships(c *gin.Context) {
	var requests []models.TaskRelationshipRequest
	if err := c.ShouldBindJSON(&requests); err != nil {
		c.JSON(http.StatusBadRequest, *models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error()))
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, *models.NewErrorResponse(models.ErrCodeUnauthorized, "Authentication required", nil))
		return
	}

	relationships, errors, err := h.service.BulkCreateRelationships(requests, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, *models.NewErrorResponse(models.ErrCodeInternal, "Failed to create relationships", err.Error()))
		return
	}

	response := map[string]interface{}{
		"created_relationships": relationships,
		"total_created":         len(relationships),
		"total_requested":       len(requests),
		"errors":                errors,
	}

	statusCode := http.StatusCreated
	if len(errors) > 0 {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, *models.NewSuccessResponse(response, "Bulk relationship creation completed"))
}
