package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"new-ai-proj/backend/models"
	"new-ai-proj/backend/services"
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
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/task-relationships [post]
func (h *TaskRelationshipHandler) CreateRelationship(c *gin.Context) {
	var req models.TaskRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Success: false,
			Message: "Authentication required",
		})
		return
	}

	// Validate relationship doesn't create cycles for dependency types
	if req.RelationshipType == "depends_on" || req.RelationshipType == "blocks" {
		hasCycle, err := h.service.CheckForCycles(req.SourceTaskID, req.TargetTaskID, req.RelationshipType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, ErrorResponse{
				Success: false,
				Message: "Failed to validate relationship",
				Error:   err.Error(),
			})
			return
		}
		if hasCycle {
			c.JSON(http.StatusBadRequest, ErrorResponse{
				Success: false,
				Message: "Relationship would create a circular dependency",
			})
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
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to create relationship",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, SuccessResponse{
		Success: true,
		Message: "Task relationship created successfully",
		Data:    relationship,
	})
}

// GetTaskRelationships retrieves all relationships for a specific task
// @Summary Get task relationships
// @Description Get all relationships for a specific task
// @Tags task-relationships
// @Produce json
// @Param task_id path int true "Task ID"
// @Param type query string false "Filter by relationship type"
// @Success 200 {object} SuccessResponse{data=[]models.TaskRelationship}
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/tasks/{task_id}/relationships [get]
func (h *TaskRelationshipHandler) GetTaskRelationships(c *gin.Context) {
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid task ID",
		})
		return
	}

	relationshipType := c.Query("type")
	
	relationships, err := h.service.GetTaskRelationships(taskID, relationshipType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to retrieve relationships",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Task relationships retrieved successfully",
		Data:    relationships,
	})
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
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/task-relationships/{id} [put]
func (h *TaskRelationshipHandler) UpdateRelationship(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid relationship ID",
		})
		return
	}

	var req models.TaskRelationshipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	relationship, err := h.service.UpdateRelationship(id, req.RelationshipStatus, req.Metadata)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to update relationship",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Task relationship updated successfully",
		Data:    relationship,
	})
}

// DeleteRelationship deletes a task relationship (soft delete)
// @Summary Delete task relationship
// @Description Soft delete a task relationship
// @Tags task-relationships
// @Produce json
// @Param id path int true "Relationship ID"
// @Success 200 {object} SuccessResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/task-relationships/{id} [delete]
func (h *TaskRelationshipHandler) DeleteRelationship(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid relationship ID",
		})
		return
	}

	err = h.service.DeleteRelationship(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to delete relationship",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Task relationship deleted successfully",
	})
}

// GetTaskWithAllRelationships retrieves a task with all its relationships
// @Summary Get task with relationships
// @Description Get a task with all its incoming and outgoing relationships
// @Tags task-relationships
// @Produce json
// @Param task_id path int true "Task ID"
// @Success 200 {object} models.TaskWithRelationships
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/tasks/{task_id}/with-relationships [get]
func (h *TaskRelationshipHandler) GetTaskWithAllRelationships(c *gin.Context) {
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid task ID",
		})
		return
	}

	taskWithRels, err := h.service.GetTaskWithAllRelationships(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to retrieve task with relationships",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Task with relationships retrieved successfully",
		Data:    taskWithRels,
	})
}

// GetParallelDevelopmentGroups retrieves parallel development groups
// @Summary Get parallel development groups
// @Description Get all parallel development groups with their tasks and status
// @Tags task-relationships
// @Produce json
// @Param project_id query int false "Filter by project ID"
// @Success 200 {object} SuccessResponse{data=[]models.ParallelDevelopmentGroup}
// @Failure 500 {object} ErrorResponse
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
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to retrieve parallel development groups",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Parallel development groups retrieved successfully",
		Data:    groups,
	})
}

// ValidateParallelTasksCanStart checks if parallel tasks can be started
// @Summary Validate parallel task startup
// @Description Check if a group of parallel tasks can be started based on dependencies
// @Tags task-relationships
// @Accept json
// @Produce json
// @Param tasks body []int true "Array of task IDs to validate"
// @Success 200 {object} SuccessResponse{data=object}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/parallel-groups/validate [post]
func (h *TaskRelationshipHandler) ValidateParallelTasksCanStart(c *gin.Context) {
	var taskIDs []int
	if err := c.ShouldBindJSON(&taskIDs); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	validation, err := h.service.ValidateParallelTasksCanStart(taskIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to validate parallel tasks",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Parallel tasks validation completed",
		Data:    validation,
	})
}

// GetTaskDependencyGraph generates a dependency graph for visualization
// @Summary Get task dependency graph
// @Description Generate dependency graph data for task visualization
// @Tags task-relationships
// @Produce json
// @Param project_id query int false "Filter by project ID"
// @Param root_task_id query int false "Root task ID for subgraph"
// @Success 200 {object} models.TaskDependencyGraph
// @Failure 500 {object} ErrorResponse
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
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to generate dependency graph",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Message: "Task dependency graph generated successfully",
		Data:    graph,
	})
}

// BulkCreateRelationships creates multiple task relationships in batch
// @Summary Bulk create relationships
// @Description Create multiple task relationships in a single batch operation
// @Tags task-relationships
// @Accept json
// @Produce json
// @Param relationships body []models.TaskRelationshipRequest true "Array of relationship requests"
// @Success 201 {object} SuccessResponse{data=[]models.TaskRelationship}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/v1/task-relationships/batch [post]
func (h *TaskRelationshipHandler) BulkCreateRelationships(c *gin.Context) {
	var requests []models.TaskRelationshipRequest
	if err := c.ShouldBindJSON(&requests); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Success: false,
			Message: "Invalid request format",
			Error:   err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{
			Success: false,
			Message: "Authentication required",
		})
		return
	}

	relationships, errors, err := h.service.BulkCreateRelationships(requests, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Success: false,
			Message: "Failed to create relationships",
			Error:   err.Error(),
		})
		return
	}

	response := map[string]interface{}{
		"created_relationships": relationships,
		"total_created":        len(relationships),
		"total_requested":      len(requests),
		"errors":              errors,
	}

	statusCode := http.StatusCreated
	if len(errors) > 0 {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, SuccessResponse{
		Success: true,
		Message: "Bulk relationship creation completed",
		Data:    response,
	})
}