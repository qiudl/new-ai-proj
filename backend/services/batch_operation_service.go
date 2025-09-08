package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// BatchOperationService handles all batch operations
type BatchOperationService struct {
	db             database.DB
	logger         *log.Logger
	mutex          sync.RWMutex
	activeOps      map[string]*models.BatchOperationResponse
	maxConcurrency int
}

// NewBatchOperationService creates a new batch operation service
func NewBatchOperationService(db database.DB, logger *log.Logger) *BatchOperationService {
	return &BatchOperationService{
		db:             db,
		logger:         logger,
		activeOps:      make(map[string]*models.BatchOperationResponse),
		maxConcurrency: 5,
	}
}

// ValidateBatchOperation validates a batch operation request
func (s *BatchOperationService) ValidateBatchOperation(ctx context.Context, req *models.BatchOperationRequest) (*models.BatchValidationResult, error) {
	s.logger.Printf("Validating batch operation: type=%s, tasks=%d", req.OperationType, len(req.TaskIDs))

	result := &models.BatchValidationResult{
		TotalTasks:         len(req.TaskIDs),
		ValidTasks:         0,
		InvalidTasks:       0,
		WarningsCount:      0,
		ValidationErrors:   []models.BatchValidationError{},
		ValidationWarnings: []models.BatchValidationWarning{},
		EstimatedDuration:  int64(len(req.TaskIDs)) * 100, // 100ms per task estimate
		RiskLevel:          "low",
		CanProceed:         true,
	}

	// Validate task IDs exist and are accessible
	for _, taskID := range req.TaskIDs {
		task, err := s.db.Tasks().GetByID(ctx, taskID)
		if err != nil {
			result.ValidationErrors = append(result.ValidationErrors, models.BatchValidationError{
				TaskID:    taskID,
				ErrorCode: "TASK_NOT_FOUND",
				ErrorMsg:  fmt.Sprintf("Task with ID %d not found", taskID),
				Timestamp: time.Now(),
			})
			result.InvalidTasks++
			continue
		}

		// Validate operation-specific constraints
		if err := s.validateTaskForOperation(task, req.OperationType, req.Parameters); err != nil {
			result.ValidationErrors = append(result.ValidationErrors, models.BatchValidationError{
				TaskID:    taskID,
				TaskTitle: task.Title,
				ErrorCode: "OPERATION_NOT_ALLOWED",
				ErrorMsg:  err.Error(),
				Timestamp: time.Now(),
			})
			result.InvalidTasks++
			continue
		}

		result.ValidTasks++

		// Add warnings if needed
		if warnings := s.getTaskWarnings(task, req.OperationType, req.Parameters); len(warnings) > 0 {
			for _, warning := range warnings {
				result.ValidationWarnings = append(result.ValidationWarnings, models.BatchValidationWarning{
					TaskID:      taskID,
					TaskTitle:   task.Title,
					WarningCode: warning.Code,
					Warning:     warning.Message,
					Impact:      warning.Impact,
					Severity:    warning.Severity,
					Timestamp:   time.Now(),
				})
				result.WarningsCount++
			}
		}
	}

	result.Valid = result.InvalidTasks == 0
	result.CanProceed = result.Valid || (result.InvalidTasks < result.TotalTasks/2) // Allow if less than 50% invalid

	// Determine risk level
	if result.InvalidTasks > 0 || result.WarningsCount > 5 {
		result.RiskLevel = "medium"
	}
	if result.InvalidTasks > result.TotalTasks/4 { // More than 25% invalid
		result.RiskLevel = "high"
	}

	s.logger.Printf("Validation completed: valid=%d, invalid=%d, warnings=%d",
		result.ValidTasks, result.InvalidTasks, result.WarningsCount)

	return result, nil
}

// ExecuteBatchOperation executes a validated batch operation
func (s *BatchOperationService) ExecuteBatchOperation(ctx context.Context, req *models.BatchOperationRequest) (*models.BatchOperationResponse, error) {
	operationID := uuid.New().String()
	s.logger.Printf("Starting batch operation %s: type=%s, tasks=%d", operationID, req.OperationType, len(req.TaskIDs))

	response := &models.BatchOperationResponse{
		OperationID:   operationID,
		OperationType: req.OperationType,
		Status:        models.BatchStatusRunning,
		TotalTasks:    len(req.TaskIDs),
		StartTime:     time.Now(),
		RequestedBy:   req.RequestedBy,
		ExecutedBy:    req.RequestedBy,
		Errors:        []models.BatchOperationError{},
		Warnings:      []models.BatchOperationWarning{},
		Progress: models.BatchOperationProgress{
			Percentage:  0,
			CurrentTask: 0,
			Phase:       "execution",
			LastUpdate:  time.Now(),
		},
	}

	// Store in active operations
	s.mutex.Lock()
	s.activeOps[operationID] = response
	s.mutex.Unlock()

	// Execute operation based on type
	switch req.OperationType {
	case models.BatchOperationStatusUpdate:
		err := s.executeBatchStatusUpdate(ctx, req, response)
		if err != nil {
			s.logger.Printf("Batch status update failed: %v", err)
			response.Status = models.BatchStatusFailed
			response.Message = err.Error()
		}
	case models.BatchOperationParentChange:
		err := s.executeBatchParentChange(ctx, req, response)
		if err != nil {
			s.logger.Printf("Batch parent change failed: %v", err)
			response.Status = models.BatchStatusFailed
			response.Message = err.Error()
		}
	case models.BatchOperationAssignee:
		err := s.executeBatchAssigneeChange(ctx, req, response)
		if err != nil {
			s.logger.Printf("Batch assignee change failed: %v", err)
			response.Status = models.BatchStatusFailed
			response.Message = err.Error()
		}
	case models.BatchOperationPriority:
		err := s.executeBatchPriorityChange(ctx, req, response)
		if err != nil {
			s.logger.Printf("Batch priority change failed: %v", err)
			response.Status = models.BatchStatusFailed
			response.Message = err.Error()
		}
	case models.BatchOperationDelete:
		err := s.executeBatchDelete(ctx, req, response)
		if err != nil {
			s.logger.Printf("Batch delete failed: %v", err)
			response.Status = models.BatchStatusFailed
			response.Message = err.Error()
		}
	case models.BatchOperationArchive:
		err := s.executeBatchArchive(ctx, req, response)
		if err != nil {
			s.logger.Printf("Batch archive failed: %v", err)
			response.Status = models.BatchStatusFailed
			response.Message = err.Error()
		}
	default:
		response.Status = models.BatchStatusFailed
		response.Message = fmt.Sprintf("Unsupported operation type: %s", req.OperationType)
	}

	// Finalize response
	endTime := time.Now()
	response.EndTime = &endTime
	response.Duration = endTime.Sub(response.StartTime).Milliseconds()

	if response.Status == models.BatchStatusRunning {
		if response.FailedTasks > 0 && response.SuccessfulTasks > 0 {
			response.Status = models.BatchStatusPartial
			response.Message = fmt.Sprintf("Partially completed: %d successful, %d failed", response.SuccessfulTasks, response.FailedTasks)
		} else if response.SuccessfulTasks > 0 {
			response.Status = models.BatchStatusCompleted
			response.Message = fmt.Sprintf("Successfully processed %d tasks", response.SuccessfulTasks)
		} else {
			response.Status = models.BatchStatusFailed
			response.Message = "No tasks were processed successfully"
		}
	}

	response.Progress.Percentage = 100
	response.Progress.LastUpdate = time.Now()

	s.logger.Printf("Batch operation %s completed: status=%s, success=%d, failed=%d",
		operationID, response.Status, response.SuccessfulTasks, response.FailedTasks)

	return response, nil
}

// GetBatchOperationStatus returns the current status of a batch operation
func (s *BatchOperationService) GetBatchOperationStatus(operationID string) (*models.BatchOperationResponse, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	if op, exists := s.activeOps[operationID]; exists {
		return op, nil
	}

	return nil, fmt.Errorf("operation %s not found", operationID)
}

// PreviewBatchOperation generates a preview of what the batch operation would do
func (s *BatchOperationService) PreviewBatchOperation(ctx context.Context, req *models.BatchOperationRequest) (*models.BatchOperationPreview, error) {
	preview := &models.BatchOperationPreview{
		OperationType: req.OperationType,
		TotalTasks:    len(req.TaskIDs),
		AffectedTasks: []models.TaskPreview{},
		Changes:       []models.ChangePreview{},
		EstimatedTime: int64(len(req.TaskIDs)) * 150, // 150ms estimate per task
		RiskLevel:     "low",
		CanProceed:    true,
	}

	for _, taskID := range req.TaskIDs {
		task, err := s.db.Tasks().GetByID(ctx, taskID)
		if err != nil {
			continue
		}

		taskPreview := models.TaskPreview{
			ID:         task.ID,
			Title:      task.Title,
			Status:     task.Status,
			ProjectID:  task.ProjectID,
			ParentID:   task.ParentID,
			Changes:    make(map[string]interface{}),
			CanProcess: true,
		}

		// Generate preview based on operation type
		switch req.OperationType {
		case models.BatchOperationStatusUpdate:
			if newStatus, ok := req.Parameters["new_status"].(string); ok {
				taskPreview.Changes["status"] = map[string]interface{}{
					"from": task.Status,
					"to":   newStatus,
				}
				preview.Changes = append(preview.Changes, models.ChangePreview{
					Field:    "status",
					OldValue: task.Status,
					NewValue: newStatus,
					Impact:   "Status change",
				})
			}
		case models.BatchOperationParentChange:
			if newParentID, ok := req.Parameters["new_parent_id"]; ok {
				taskPreview.Changes["parent_id"] = map[string]interface{}{
					"from": task.ParentID,
					"to":   newParentID,
				}
				preview.Changes = append(preview.Changes, models.ChangePreview{
					Field:    "parent_id",
					OldValue: task.ParentID,
					NewValue: newParentID,
					Impact:   "Hierarchy change",
				})
			}
		}

		preview.AffectedTasks = append(preview.AffectedTasks, taskPreview)
	}

	return preview, nil
}

// executeBatchStatusUpdate executes a batch status update operation
func (s *BatchOperationService) executeBatchStatusUpdate(ctx context.Context, req *models.BatchOperationRequest, response *models.BatchOperationResponse) error {
	newStatus, ok := req.Parameters["new_status"].(string)
	if !ok {
		return fmt.Errorf("missing or invalid new_status parameter")
	}

	for i, taskID := range req.TaskIDs {
		// Update progress
		response.Progress.Percentage = float64(i) / float64(len(req.TaskIDs)) * 100
		response.Progress.CurrentTask = i + 1
		response.Progress.CurrentTaskID = taskID
		response.Progress.LastUpdate = time.Now()
		response.ProcessedTasks = i + 1

		err := s.db.Tasks().UpdateStatus(ctx, taskID, newStatus)
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				ErrorCode:   "UPDATE_FAILED",
				ErrorMsg:    err.Error(),
				Severity:    "medium",
				Recoverable: true,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
		} else {
			response.SuccessfulTasks++
		}

		// Add small delay to prevent overwhelming the database
		time.Sleep(10 * time.Millisecond)
	}

	return nil
}

// executeBatchParentChange executes a batch parent change operation
func (s *BatchOperationService) executeBatchParentChange(ctx context.Context, req *models.BatchOperationRequest, response *models.BatchOperationResponse) error {
	var newParentID *int
	if parentID, exists := req.Parameters["new_parent_id"]; exists && parentID != nil {
		if id, ok := parentID.(float64); ok {
			parentIDInt := int(id)
			newParentID = &parentIDInt
		}
	}

	for i, taskID := range req.TaskIDs {
		// Update progress
		response.Progress.Percentage = float64(i) / float64(len(req.TaskIDs)) * 100
		response.Progress.CurrentTask = i + 1
		response.Progress.CurrentTaskID = taskID
		response.Progress.LastUpdate = time.Now()
		response.ProcessedTasks = i + 1

		// Get current task
		task, err := s.db.Tasks().GetByID(ctx, taskID)
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				ErrorCode:   "TASK_NOT_FOUND",
				ErrorMsg:    err.Error(),
				Severity:    "high",
				Recoverable: false,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
			continue
		}

		// Update parent ID
		task.ParentID = newParentID
		task.UpdatedAt = time.Now()

		_, err = s.db.Tasks().Update(ctx, task)
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				TaskTitle:   task.Title,
				ErrorCode:   "UPDATE_FAILED",
				ErrorMsg:    err.Error(),
				Severity:    "medium",
				Recoverable: true,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
		} else {
			response.SuccessfulTasks++
		}

		time.Sleep(10 * time.Millisecond)
	}

	return nil
}

// executeBatchAssigneeChange executes a batch assignee change operation
func (s *BatchOperationService) executeBatchAssigneeChange(ctx context.Context, req *models.BatchOperationRequest, response *models.BatchOperationResponse) error {
	var newAssigneeID *int
	if assigneeID, exists := req.Parameters["new_assignee_id"]; exists && assigneeID != nil {
		if id, ok := assigneeID.(float64); ok {
			assigneeIDInt := int(id)
			newAssigneeID = &assigneeIDInt
		}
	}

	for i, taskID := range req.TaskIDs {
		response.Progress.Percentage = float64(i) / float64(len(req.TaskIDs)) * 100
		response.Progress.CurrentTask = i + 1
		response.Progress.CurrentTaskID = taskID
		response.Progress.LastUpdate = time.Now()
		response.ProcessedTasks = i + 1

		task, err := s.db.Tasks().GetByID(ctx, taskID)
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				ErrorCode:   "TASK_NOT_FOUND",
				ErrorMsg:    err.Error(),
				Severity:    "high",
				Recoverable: false,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
			continue
		}

		task.AssigneeID = newAssigneeID
		task.UpdatedAt = time.Now()

		_, err = s.db.Tasks().Update(ctx, task)
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				TaskTitle:   task.Title,
				ErrorCode:   "UPDATE_FAILED",
				ErrorMsg:    err.Error(),
				Severity:    "medium",
				Recoverable: true,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
		} else {
			response.SuccessfulTasks++
		}

		time.Sleep(10 * time.Millisecond)
	}

	return nil
}

// executeBatchPriorityChange executes a batch priority change operation
func (s *BatchOperationService) executeBatchPriorityChange(ctx context.Context, req *models.BatchOperationRequest, response *models.BatchOperationResponse) error {
	newPriority, ok := req.Parameters["new_priority"].(string)
	if !ok {
		return fmt.Errorf("missing or invalid new_priority parameter")
	}

	for i, taskID := range req.TaskIDs {
		response.Progress.Percentage = float64(i) / float64(len(req.TaskIDs)) * 100
		response.Progress.CurrentTask = i + 1
		response.Progress.CurrentTaskID = taskID
		response.Progress.LastUpdate = time.Now()
		response.ProcessedTasks = i + 1

		task, err := s.db.Tasks().GetByID(ctx, taskID)
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				ErrorCode:   "TASK_NOT_FOUND",
				ErrorMsg:    err.Error(),
				Severity:    "high",
				Recoverable: false,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
			continue
		}

		task.Priority = newPriority
		task.UpdatedAt = time.Now()

		_, err = s.db.Tasks().Update(ctx, task)
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				TaskTitle:   task.Title,
				ErrorCode:   "UPDATE_FAILED",
				ErrorMsg:    err.Error(),
				Severity:    "medium",
				Recoverable: true,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
		} else {
			response.SuccessfulTasks++
		}

		time.Sleep(10 * time.Millisecond)
	}

	return nil
}

// executeBatchDelete executes a batch delete operation
func (s *BatchOperationService) executeBatchDelete(ctx context.Context, req *models.BatchOperationRequest, response *models.BatchOperationResponse) error {
	hardDelete := false
	if hd, exists := req.Parameters["hard_delete"]; exists {
		if hdBool, ok := hd.(bool); ok {
			hardDelete = hdBool
		}
	}

	for i, taskID := range req.TaskIDs {
		response.Progress.Percentage = float64(i) / float64(len(req.TaskIDs)) * 100
		response.Progress.CurrentTask = i + 1
		response.Progress.CurrentTaskID = taskID
		response.Progress.LastUpdate = time.Now()
		response.ProcessedTasks = i + 1

		var err error
		// HardDelete method is not available, only using soft delete for now
		err = s.db.Tasks().Delete(ctx, taskID)

		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				ErrorCode:   "DELETE_FAILED",
				ErrorMsg:    err.Error(),
				Severity:    "medium",
				Recoverable: !hardDelete,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
		} else {
			response.SuccessfulTasks++
		}

		time.Sleep(10 * time.Millisecond)
	}

	return nil
}

// executeBatchArchive executes a batch archive operation
func (s *BatchOperationService) executeBatchArchive(ctx context.Context, req *models.BatchOperationRequest, response *models.BatchOperationResponse) error {
	for i, taskID := range req.TaskIDs {
		response.Progress.Percentage = float64(i) / float64(len(req.TaskIDs)) * 100
		response.Progress.CurrentTask = i + 1
		response.Progress.CurrentTaskID = taskID
		response.Progress.LastUpdate = time.Now()
		response.ProcessedTasks = i + 1

		err := s.db.Tasks().UpdateStatus(ctx, taskID, "archived")
		if err != nil {
			response.Errors = append(response.Errors, models.BatchOperationError{
				TaskID:      taskID,
				ErrorCode:   "ARCHIVE_FAILED",
				ErrorMsg:    err.Error(),
				Severity:    "medium",
				Recoverable: true,
				Timestamp:   time.Now(),
			})
			response.FailedTasks++
		} else {
			response.SuccessfulTasks++
		}

		time.Sleep(10 * time.Millisecond)
	}

	return nil
}

// validateTaskForOperation validates if a specific operation can be performed on a task
func (s *BatchOperationService) validateTaskForOperation(task *models.Task, opType models.BatchOperationType, params map[string]interface{}) error {
	switch opType {
	case models.BatchOperationStatusUpdate:
		// Check if status transition is valid
		newStatus, ok := params["new_status"].(string)
		if !ok {
			return fmt.Errorf("missing new_status parameter")
		}
		if !s.isValidStatusTransition(task.Status, newStatus) {
			return fmt.Errorf("invalid status transition from %s to %s", task.Status, newStatus)
		}
	case models.BatchOperationParentChange:
		// Check for circular dependencies
		if parentID, exists := params["new_parent_id"]; exists && parentID != nil {
			if id, ok := parentID.(float64); ok && int(id) == task.ID {
				return fmt.Errorf("task cannot be its own parent")
			}
		}
	case models.BatchOperationDelete:
		// Check if task can be deleted
		if task.Status == "in_progress" {
			return fmt.Errorf("cannot delete task in progress")
		}
	}

	return nil
}

// getTaskWarnings returns warnings for a task operation
func (s *BatchOperationService) getTaskWarnings(task *models.Task, opType models.BatchOperationType, params map[string]interface{}) []struct {
	Code     string
	Message  string
	Impact   string
	Severity string
} {
	var warnings []struct {
		Code     string
		Message  string
		Impact   string
		Severity string
	}

	switch opType {
	case models.BatchOperationDelete:
		// Check if task has children
		children, err := s.db.Tasks().GetChildren(context.Background(), task.ID)
		if err == nil && len(children) > 0 {
			warnings = append(warnings, struct {
				Code     string
				Message  string
				Impact   string
				Severity string
			}{
				Code:     "HAS_CHILDREN",
				Message:  fmt.Sprintf("Task has %d child tasks", len(children)),
				Impact:   "Child tasks will become orphaned",
				Severity: "medium",
			})
		}
	}

	return warnings
}

// isValidStatusTransition checks if a status transition is valid
func (s *BatchOperationService) isValidStatusTransition(from, to string) bool {
	// Define valid transitions
	validTransitions := map[string][]string{
		"draft":       {"planning", "todo", "cancelled"},
		"planning":    {"todo", "draft", "cancelled"},
		"todo":        {"in_progress", "cancelled", "on_hold"},
		"in_progress": {"testing", "completed", "on_hold", "blocked"},
		"testing":     {"completed", "in_progress", "blocked"},
		"completed":   {"archived"},
		"cancelled":   {"todo", "archived"},
		"on_hold":     {"todo", "in_progress", "cancelled"},
		"suspended":   {"todo", "cancelled"},
		"blocked":     {"todo", "in_progress"},
		"archived":    {}, // No transitions from archived
	}

	if allowedStates, exists := validTransitions[from]; exists {
		for _, state := range allowedStates {
			if state == to {
				return true
			}
		}
	}

	// Allow same status (no-op)
	return from == to
}
