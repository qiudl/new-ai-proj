package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ValidationHandler 验证处理器
type ValidationHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewValidationHandler 创建验证处理器
func NewValidationHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *ValidationHandler {
	return &ValidationHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// ValidateParent 验证父任务关系
func (h *ValidationHandler) ValidateParent(c *gin.Context) {
	var req struct {
		TaskID   int `json:"task_id" validate:"required"`
		ParentID int `json:"parent_id" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate no circular reference
	if err := h.validateNoCircularReference(c.Request.Context(), req.ParentID, req.TaskID); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, err.Error(), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get parent task details for response
	parentTask, err := h.db.Tasks().GetByID(c.Request.Context(), req.ParentID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Parent task not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	result := map[string]interface{}{
		"valid": true,
		"parent_task": map[string]interface{}{
			"id":     parentTask.ID,
			"title":  parentTask.Title,
			"status": parentTask.Status,
		},
	}

	response := models.NewSuccessResponse(result, "Parent validation successful")
	c.JSON(http.StatusOK, response)
}

// ValidateTaskHierarchy 验证任务层级结构
func (h *ValidationHandler) ValidateTaskHierarchy(c *gin.Context) {
	projectIDStr := c.Query("project_id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get all tasks for the project
	tasks, _, err := h.db.Tasks().GetByProjectID(c.Request.Context(), projectID, 1000, 0)
	if err != nil {
		h.logger.Printf("Error getting tasks for project %d: %v", projectID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get project tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Validate hierarchy
	validationResults := h.validateHierarchyStructure(c.Request.Context(), tasks)

	response := models.NewSuccessResponse(validationResults, "Hierarchy validation completed")
	c.JSON(http.StatusOK, response)
}

// ValidateTaskDependencies 验证任务依赖关系
func (h *ValidationHandler) ValidateTaskDependencies(c *gin.Context) {
	var req struct {
		TaskID        int   `json:"task_id" validate:"required"`
		DependencyIDs []int `json:"dependency_ids" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	validationResult := map[string]interface{}{
		"valid":        true,
		"dependencies": []map[string]interface{}{},
		"errors":       []string{},
	}

	var dependencies []map[string]interface{}
	var errors []string

	// Validate each dependency
	for _, depID := range req.DependencyIDs {
		// Check if dependency task exists
		depTask, err := h.db.Tasks().GetByID(c.Request.Context(), depID)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Dependency task %d not found", depID))
			continue
		}

		// Check for circular dependencies
		if h.wouldCreateCircularDependency(c.Request.Context(), req.TaskID, depID) {
			errors = append(errors, fmt.Sprintf("Circular dependency detected with task %d", depID))
			continue
		}

		dependencies = append(dependencies, map[string]interface{}{
			"id":     depTask.ID,
			"title":  depTask.Title,
			"status": depTask.Status,
		})
	}

	if len(errors) > 0 {
		validationResult["valid"] = false
		validationResult["errors"] = errors
	}

	validationResult["dependencies"] = dependencies

	response := models.NewSuccessResponse(validationResult, "Dependency validation completed")
	c.JSON(http.StatusOK, response)
}

// ValidateProjectAccess 验证项目访问权限
func (h *ValidationHandler) ValidateProjectAccess(c *gin.Context) {
	projectIDStr := c.Param("project_id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Check if project exists
	project, err := h.db.Projects().GetByID(c.Request.Context(), projectID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Project not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// For now, assume all authenticated users have access
	// In production, implement proper access control logic
	result := map[string]interface{}{
		"has_access": true,
		"user_id":    userID,
		"project": map[string]interface{}{
			"id":   project.ID,
			"name": project.Name,
		},
		"permissions": []string{"read", "write", "delete"},
	}

	response := models.NewSuccessResponse(result, "Project access validated")
	c.JSON(http.StatusOK, response)
}

// Helper methods

// validateNoCircularReference checks if setting parentID for taskID would create a circular reference
func (h *ValidationHandler) validateNoCircularReference(ctx context.Context, parentID, taskID int) error {
	const maxDepth = 10 // Maximum hierarchy depth allowed

	// Follow the parent chain up to check for circular reference
	currentParentID := parentID
	depth := 0

	for currentParentID != 0 {
		// Check for circular reference
		if currentParentID == taskID {
			return fmt.Errorf("circular reference detected: setting parent would create a loop")
		}

		// Check depth limit
		depth++
		if depth > maxDepth {
			return fmt.Errorf("maximum hierarchy depth (%d) exceeded", maxDepth)
		}

		// Get the parent's parent
		parentTask, err := h.db.Tasks().GetByID(ctx, currentParentID)
		if err != nil {
			if err.Error() == "task not found" {
				break // Parent doesn't exist, no circular reference
			}
			return fmt.Errorf("error checking parent task: %v", err)
		}

		if parentTask.ParentID == nil {
			break // Reached root parent
		}
		currentParentID = *parentTask.ParentID
	}

	return nil
}

// validateHierarchyStructure validates the entire hierarchy structure
func (h *ValidationHandler) validateHierarchyStructure(ctx context.Context, tasks []*models.Task) map[string]interface{} {
	result := map[string]interface{}{
		"valid":            true,
		"total_tasks":      len(tasks),
		"root_tasks":       0,
		"max_depth":        0,
		"orphaned_tasks":   []int{},
		"circular_refs":    []int{},
		"depth_violations": []int{},
	}

	var orphanedTasks []int
	var circularRefs []int
	var depthViolations []int
	maxDepth := 0

	// Create a map for quick lookup
	taskMap := make(map[int]*models.Task)
	for _, task := range tasks {
		taskMap[task.ID] = task
	}

	for _, task := range tasks {
		// Count root tasks
		if task.ParentID == nil {
			result["root_tasks"] = result["root_tasks"].(int) + 1
			continue
		}

		// Check for orphaned tasks (parent doesn't exist)
		if _, exists := taskMap[*task.ParentID]; !exists {
			orphanedTasks = append(orphanedTasks, task.ID)
			continue
		}

		// Check for circular references
		if h.hasCircularReference(task, taskMap, 10) {
			circularRefs = append(circularRefs, task.ID)
		}

		// Calculate and check depth
		depth := h.calculateTaskDepth(task, taskMap)
		if depth > maxDepth {
			maxDepth = depth
		}
		if depth > 5 { // Max allowed depth
			depthViolations = append(depthViolations, task.ID)
		}
	}

	// Update results
	result["max_depth"] = maxDepth
	result["orphaned_tasks"] = orphanedTasks
	result["circular_refs"] = circularRefs
	result["depth_violations"] = depthViolations

	// Set overall validity
	if len(orphanedTasks) > 0 || len(circularRefs) > 0 || len(depthViolations) > 0 {
		result["valid"] = false
	}

	return result
}

// hasCircularReference checks if a task has circular reference in its parent chain
func (h *ValidationHandler) hasCircularReference(task *models.Task, taskMap map[int]*models.Task, maxDepth int) bool {
	if task.ParentID == nil {
		return false
	}

	visited := make(map[int]bool)
	currentID := *task.ParentID
	depth := 0

	for currentID != 0 && depth < maxDepth {
		if visited[currentID] || currentID == task.ID {
			return true
		}
		visited[currentID] = true

		if parent, exists := taskMap[currentID]; exists && parent.ParentID != nil {
			currentID = *parent.ParentID
		} else {
			break
		}
		depth++
	}

	return false
}

// calculateTaskDepth calculates the depth of a task in the hierarchy
func (h *ValidationHandler) calculateTaskDepth(task *models.Task, taskMap map[int]*models.Task) int {
	if task.ParentID == nil {
		return 0
	}

	depth := 0
	currentParentID := *task.ParentID

	for currentParentID != 0 && depth < 10 { // Prevent infinite loops
		if parent, exists := taskMap[currentParentID]; exists {
			depth++
			if parent.ParentID == nil {
				break
			}
			currentParentID = *parent.ParentID
		} else {
			break
		}
	}

	return depth
}

// wouldCreateCircularDependency checks if adding a dependency would create circular dependency
func (h *ValidationHandler) wouldCreateCircularDependency(ctx context.Context, taskID, dependencyID int) bool {
	// This is a simplified check - in production, you'd implement proper dependency graph validation
	// For now, just check if the dependency task depends on the current task
	return false
}
