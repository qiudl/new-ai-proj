package services

import (
	"database/sql"
	"errors"
	"fmt"
)

// TaskValidationService provides validation logic for task operations
type TaskValidationService struct {
	db *sql.DB
}

// NewTaskValidationService creates a new task validation service instance
func NewTaskValidationService(db *sql.DB) *TaskValidationService {
	return &TaskValidationService{
		db: db,
	}
}

// ValidationError represents a validation error with details
type ValidationError struct {
	TaskID  int
	Message string
	Code    string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("Task %d validation failed: %s", e.TaskID, e.Message)
}

// ValidateTaskHierarchy validates that setting a new parent won't violate hierarchy rules
func (s *TaskValidationService) ValidateTaskHierarchy(taskID int, newParentID int) error {
	// Check if the new parent would create excessive depth
	parentDepth, err := s.calculateTaskDepth(newParentID)
	if err != nil {
		return fmt.Errorf("failed to calculate parent depth: %w", err)
	}

	// Maximum allowed depth is 4 levels (0-indexed: 0, 1, 2, 3)
	// If parent is at depth 3, child would be at depth 4, which is the maximum
	const maxDepth = 3
	if parentDepth >= maxDepth {
		return ValidationError{
			TaskID:  taskID,
			Message: fmt.Sprintf("设置此父任务会导致层级过深。当前父任务已在第%d级，最大允许%d级", parentDepth+1, maxDepth+1),
			Code:    "HIERARCHY_TOO_DEEP",
		}
	}

	// Check if the task has children and if setting this parent would make them too deep
	childrenCount, err := s.getChildrenCount(taskID)
	if err != nil {
		return fmt.Errorf("failed to check children count: %w", err)
	}

	if childrenCount > 0 {
		maxChildDepth, err := s.calculateMaxChildDepth(taskID)
		if err != nil {
			return fmt.Errorf("failed to calculate max child depth: %w", err)
		}

		// New depth of this task would be parentDepth + 1
		// Children would be at least at newDepth + maxChildDepth + 1
		newTaskDepth := parentDepth + 1
		deepestChildDepth := newTaskDepth + maxChildDepth + 1

		if deepestChildDepth > maxDepth {
			return ValidationError{
				TaskID:  taskID,
				Message: fmt.Sprintf("设置此父任务会导致子任务层级过深。子任务最深将达到第%d级，超过最大允许的%d级", deepestChildDepth+1, maxDepth+1),
				Code:    "CHILDREN_TOO_DEEP",
			}
		}
	}

	return nil
}

// ValidateBatchParentUpdate validates a batch parent update operation
func (s *TaskValidationService) ValidateBatchParentUpdate(taskIDs []int, parentID int) error {
	for _, taskID := range taskIDs {
		if err := s.ValidateTaskHierarchy(taskID, parentID); err != nil {
			return fmt.Errorf("validation failed for task %d: %w", taskID, err)
		}
	}
	return nil
}

// calculateTaskDepth recursively calculates the depth of a task in the hierarchy
// Returns 0 for root tasks (no parent), 1 for first level children, etc.
func (s *TaskValidationService) calculateTaskDepth(taskID int) (int, error) {
	if taskID == 0 {
		return -1, nil // Special case: setting parent to null means root level
	}

	var parentID sql.NullInt32
	err := s.db.QueryRow("SELECT parent_id FROM tasks WHERE id = $1 AND deleted_at IS NULL", taskID).Scan(&parentID)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ValidationError{
				TaskID:  taskID,
				Message: "任务不存在或已被删除",
				Code:    "TASK_NOT_FOUND",
			}
		}
		return 0, fmt.Errorf("database error while calculating depth: %w", err)
	}

	// If this task has no parent, it's at root level (depth 0)
	if !parentID.Valid {
		return 0, nil
	}

	// Recursively calculate parent's depth and add 1
	parentDepth, err := s.calculateTaskDepth(int(parentID.Int32))
	if err != nil {
		return 0, err
	}

	return parentDepth + 1, nil
}

// calculateMaxChildDepth calculates the maximum depth among all children of a task
func (s *TaskValidationService) calculateMaxChildDepth(taskID int) (int, error) {
	rows, err := s.db.Query("SELECT id FROM tasks WHERE parent_id = $1 AND deleted_at IS NULL", taskID)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch children: %w", err)
	}
	defer rows.Close()

	var childIDs []int
	for rows.Next() {
		var childID int
		if err := rows.Scan(&childID); err != nil {
			return 0, fmt.Errorf("failed to scan child ID: %w", err)
		}
		childIDs = append(childIDs, childID)
	}

	if len(childIDs) == 0 {
		return 0, nil // No children, depth is 0
	}

	maxDepth := 0
	for _, childID := range childIDs {
		childDepth, err := s.calculateMaxChildDepth(childID)
		if err != nil {
			return 0, err
		}
		if childDepth > maxDepth {
			maxDepth = childDepth
		}
	}

	return maxDepth + 1, nil // Add 1 for the current level
}

// getChildrenCount returns the count of direct children for a task
func (s *TaskValidationService) getChildrenCount(taskID int) (int, error) {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM tasks WHERE parent_id = $1 AND deleted_at IS NULL", taskID).Scan(&count)

	if err != nil {
		return 0, fmt.Errorf("failed to count children: %w", err)
	}

	return count, nil
}

// ValidateTaskExists checks if a task exists and is not deleted
func (s *TaskValidationService) ValidateTaskExists(taskID int) error {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM tasks WHERE id = $1 AND deleted_at IS NULL", taskID).Scan(&count)

	if err != nil {
		return fmt.Errorf("database error checking task existence: %w", err)
	}

	if count == 0 {
		return ValidationError{
			TaskID:  taskID,
			Message: "任务不存在或已被删除",
			Code:    "TASK_NOT_FOUND",
		}
	}

	return nil
}

// ValidateTasksExist validates that all tasks in the list exist and are not deleted
func (s *TaskValidationService) ValidateTasksExist(taskIDs []int) error {
	for _, taskID := range taskIDs {
		if err := s.ValidateTaskExists(taskID); err != nil {
			return err
		}
	}
	return nil
}

// ValidateProjectConsistency ensures all tasks belong to the same project
func (s *TaskValidationService) ValidateProjectConsistency(taskIDs []int, projectID int) error {
	for _, taskID := range taskIDs {
		var taskProjectID int
		err := s.db.QueryRow("SELECT project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL", taskID).Scan(&taskProjectID)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ValidationError{
					TaskID:  taskID,
					Message: "任务不存在或已被删除",
					Code:    "TASK_NOT_FOUND",
				}
			}
			return fmt.Errorf("database error checking project consistency: %w", err)
		}

		if taskProjectID != projectID {
			return ValidationError{
				TaskID:  taskID,
				Message: fmt.Sprintf("任务属于项目%d，不能在项目%d中操作", taskProjectID, projectID),
				Code:    "PROJECT_MISMATCH",
			}
		}
	}
	return nil
}

// GetTaskHierarchyInfo returns hierarchy information for a task
type TaskHierarchyInfo struct {
	TaskID       int    `json:"task_id"`
	CurrentDepth int    `json:"current_depth"`
	ParentID     *int   `json:"parent_id"`
	ParentTitle  string `json:"parent_title,omitempty"`
	ChildrenCount int   `json:"children_count"`
	MaxChildDepth int   `json:"max_child_depth"`
}

// DetectCircularDependency checks if setting a new parent would create a circular dependency
func (s *TaskValidationService) DetectCircularDependency(taskID int, newParentID int) error {
	if newParentID == 0 {
		return nil // Setting parent to null (root) cannot create circular dependency
	}

	// Check if the new parent is the same as the task itself
	if taskID == newParentID {
		return ValidationError{
			TaskID:  taskID,
			Message: "任务不能设置自己为父任务",
			Code:    "SELF_REFERENCE",
		}
	}

	// Check if there's a path from newParentID to taskID
	// If such path exists, setting taskID's parent to newParentID would create a cycle
	visited := make(map[int]bool)
	if s.findPathToTask(newParentID, taskID, visited) {
		return ValidationError{
			TaskID:  taskID,
			Message: fmt.Sprintf("设置此父任务会创建循环依赖。任务%d已经是任务%d的祖先", newParentID, taskID),
			Code:    "CIRCULAR_DEPENDENCY",
		}
	}

	return nil
}

// DetectBatchCircularDependency checks for circular dependencies in a batch parent update
func (s *TaskValidationService) DetectBatchCircularDependency(taskIDs []int, parentID int) error {
	for _, taskID := range taskIDs {
		if err := s.DetectCircularDependency(taskID, parentID); err != nil {
			return fmt.Errorf("circular dependency detected for task %d: %w", taskID, err)
		}
	}

	// Additional check: ensure tasks in the batch are not interdependent
	// If we're setting multiple tasks to have the same parent, we need to make sure
	// none of them are currently ancestors of each other
	for i, taskID1 := range taskIDs {
		for j, taskID2 := range taskIDs {
			if i != j {
				visited := make(map[int]bool)
				if s.findPathToTask(taskID1, taskID2, visited) {
					// taskID1 is an ancestor of taskID2
					// If both are being set to the same parent, this would be inconsistent
					return ValidationError{
						TaskID:  taskID2,
						Message: fmt.Sprintf("批量操作中发现层级冲突：任务%d当前是任务%d的祖先，不能同时设置为同一父任务的子任务", taskID1, taskID2),
						Code:    "BATCH_HIERARCHY_CONFLICT",
					}
				}
			}
		}
	}

	return nil
}

// findPathToTask recursively searches for a path from fromTaskID to toTaskID
// Returns true if a path exists, false otherwise
func (s *TaskValidationService) findPathToTask(fromTaskID, toTaskID int, visited map[int]bool) bool {
	// Prevent infinite loops
	if visited[fromTaskID] {
		return false
	}
	visited[fromTaskID] = true

	// If we've reached the target, we found a path
	if fromTaskID == toTaskID {
		return true
	}

	// Get all children of the current task
	rows, err := s.db.Query("SELECT id FROM tasks WHERE parent_id = $1 AND deleted_at IS NULL", fromTaskID)
	if err != nil {
		// If there's a database error, assume no path exists for safety
		return false
	}
	defer rows.Close()

	var childIDs []int
	for rows.Next() {
		var childID int
		if err := rows.Scan(&childID); err != nil {
			// If there's a scan error, assume no path exists for safety
			return false
		}
		childIDs = append(childIDs, childID)
	}

	// Recursively search through all children
	for _, childID := range childIDs {
		if s.findPathToTask(childID, toTaskID, visited) {
			return true
		}
	}

	return false
}

// ValidateCompleteHierarchy performs all hierarchy validations for a batch update
func (s *TaskValidationService) ValidateCompleteHierarchy(taskIDs []int, newParentID int, projectID int) error {
	// 1. Validate all tasks exist and belong to the correct project
	if err := s.ValidateTasksExist(taskIDs); err != nil {
		return fmt.Errorf("task existence validation failed: %w", err)
	}

	if err := s.ValidateProjectConsistency(taskIDs, projectID); err != nil {
		return fmt.Errorf("project consistency validation failed: %w", err)
	}

	// 2. If setting a specific parent (not root), validate the parent exists
	if newParentID != 0 {
		if err := s.ValidateTaskExists(newParentID); err != nil {
			return fmt.Errorf("parent task validation failed: %w", err)
		}

		// Ensure parent belongs to the same project
		if err := s.ValidateProjectConsistency([]int{newParentID}, projectID); err != nil {
			return fmt.Errorf("parent project consistency validation failed: %w", err)
		}
	}

	// 3. Check for circular dependencies
	if err := s.DetectBatchCircularDependency(taskIDs, newParentID); err != nil {
		return fmt.Errorf("circular dependency validation failed: %w", err)
	}

	// 4. Check hierarchy depth constraints
	if newParentID != 0 {
		if err := s.ValidateBatchParentUpdate(taskIDs, newParentID); err != nil {
			return fmt.Errorf("hierarchy depth validation failed: %w", err)
		}
	}

	return nil
}

// GetBatchUpdatePreview provides a preview of what would happen in a batch update
type BatchUpdatePreview struct {
	TotalTasks    int                    `json:"total_tasks"`
	ValidTasks    []int                  `json:"valid_tasks"`
	InvalidTasks  []TaskValidationIssue  `json:"invalid_tasks"`
	Warnings      []string               `json:"warnings"`
	NewParentInfo *TaskHierarchyInfo     `json:"new_parent_info,omitempty"`
}

type TaskValidationIssue struct {
	TaskID  int    `json:"task_id"`
	Error   string `json:"error"`
	Code    string `json:"code"`
}

// GetBatchUpdatePreview analyzes a batch update and returns detailed information
func (s *TaskValidationService) GetBatchUpdatePreview(taskIDs []int, newParentID int, projectID int) (*BatchUpdatePreview, error) {
	preview := &BatchUpdatePreview{
		TotalTasks:   len(taskIDs),
		ValidTasks:   make([]int, 0),
		InvalidTasks: make([]TaskValidationIssue, 0),
		Warnings:     make([]string, 0),
	}

	// Get new parent info if setting a specific parent
	if newParentID != 0 {
		parentInfo, err := s.GetTaskHierarchyInfo(newParentID)
		if err == nil {
			preview.NewParentInfo = parentInfo
		} else {
			preview.InvalidTasks = append(preview.InvalidTasks, TaskValidationIssue{
				TaskID: newParentID,
				Error:  fmt.Sprintf("Parent task validation failed: %v", err),
				Code:   "PARENT_INVALID",
			})
			return preview, nil
		}
	}

	// Validate each task individually
	for _, taskID := range taskIDs {
		if err := s.ValidateCompleteHierarchy([]int{taskID}, newParentID, projectID); err != nil {
			var validationErr ValidationError
			if errors.As(err, &validationErr) {
				preview.InvalidTasks = append(preview.InvalidTasks, TaskValidationIssue{
					TaskID: validationErr.TaskID,
					Error:  validationErr.Message,
					Code:   validationErr.Code,
				})
			} else {
				preview.InvalidTasks = append(preview.InvalidTasks, TaskValidationIssue{
					TaskID: taskID,
					Error:  err.Error(),
					Code:   "UNKNOWN_ERROR",
				})
			}
		} else {
			preview.ValidTasks = append(preview.ValidTasks, taskID)
		}
	}

	// Add warnings for tasks that will have their hierarchy significantly changed
	if newParentID != 0 && preview.NewParentInfo != nil {
		for _, taskID := range preview.ValidTasks {
			taskInfo, err := s.GetTaskHierarchyInfo(taskID)
			if err == nil {
				newDepth := preview.NewParentInfo.CurrentDepth + 1
				depthChange := newDepth - taskInfo.CurrentDepth

				if depthChange > 2 {
					preview.Warnings = append(preview.Warnings, 
						fmt.Sprintf("任务%d的层级将从第%d级变更到第%d级，层级变化较大", 
							taskID, taskInfo.CurrentDepth+1, newDepth+1))
				}

				if taskInfo.ChildrenCount > 0 {
					maxChildDepthAfter := newDepth + taskInfo.MaxChildDepth + 1
					if maxChildDepthAfter >= 3 { // Approaching max depth
						preview.Warnings = append(preview.Warnings, 
							fmt.Sprintf("任务%d的子任务在变更后将达到第%d级，接近最大层级限制", 
								taskID, maxChildDepthAfter+1))
					}
				}
			}
		}
	}

	return preview, nil
}

// GetTaskHierarchyInfo retrieves detailed hierarchy information for a task
func (s *TaskValidationService) GetTaskHierarchyInfo(taskID int) (*TaskHierarchyInfo, error) {
	// Get basic task info
	var parentID sql.NullInt32
	var title string

	err := s.db.QueryRow("SELECT parent_id, title FROM tasks WHERE id = $1 AND deleted_at IS NULL", taskID).Scan(&parentID, &title)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ValidationError{
				TaskID:  taskID,
				Message: "任务不存在或已被删除",
				Code:    "TASK_NOT_FOUND",
			}
		}
		return nil, fmt.Errorf("failed to fetch task info: %w", err)
	}

	info := &TaskHierarchyInfo{
		TaskID: taskID,
	}

	// Set parent ID if valid
	if parentID.Valid {
		parentIDInt := int(parentID.Int32)
		info.ParentID = &parentIDInt
	}

	// Calculate current depth
	info.CurrentDepth, err = s.calculateTaskDepth(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate task depth: %w", err)
	}

	// Get parent title if exists
	if info.ParentID != nil {
		err = s.db.QueryRow("SELECT title FROM tasks WHERE id = $1", *info.ParentID).Scan(&info.ParentTitle)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("failed to fetch parent title: %w", err)
		}
	}

	// Get children count
	info.ChildrenCount, err = s.getChildrenCount(taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children count: %w", err)
	}

	// Get max child depth
	if info.ChildrenCount > 0 {
		info.MaxChildDepth, err = s.calculateMaxChildDepth(taskID)
		if err != nil {
			return nil, fmt.Errorf("failed to calculate max child depth: %w", err)
		}
	}

	return info, nil
}