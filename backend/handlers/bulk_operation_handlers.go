package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"encoding/csv"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// BulkOperationHandler 批量操作处理器
type BulkOperationHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
	batchService *services.BatchOperationService
}

// NewBulkOperationHandler 创建批量操作处理器
func NewBulkOperationHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *BulkOperationHandler {
	return &BulkOperationHandler{
		db:           db,
		logger:       logger,
		validator:    validator,
		batchService: services.NewBatchOperationService(db, logger),
	}
}

// BulkImportTasks 批量导入任务
func (h *BulkOperationHandler) BulkImportTasks(c *gin.Context) {
	type TaskBatch struct {
		Title       string `json:"title" validate:"required"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
		DueDate     string `json:"due_date"`
		AssigneeID  int    `json:"assignee_id"`
	}

	var req struct {
		ProjectID int         `json:"project_id" validate:"required"`
		Tasks     []TaskBatch `json:"tasks" validate:"required,dive"`
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

	// Convert batch tasks to regular tasks
	var tasks []*models.Task
	for _, batchTask := range req.Tasks {
		desc := batchTask.Description
		task := &models.Task{
			Title:              batchTask.Title,
			Description:        &desc,
			Status:             "todo",
			Priority:           batchTask.Priority,
			ProjectID:          req.ProjectID,
			TimeTrackingMode:   "manual", // 设置默认时间追踪模式
			TimeUnitPreference: "auto",   // 设置默认时间单位偏好
			WorkHoursPerDay:    8.0,      // 设置默认每日工作时长
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		if batchTask.DueDate != "" {
			if dueDate, err := time.Parse("2006-01-02", batchTask.DueDate); err == nil {
				task.DueDate = &dueDate
			}
		}

		if batchTask.AssigneeID > 0 {
			task.AssigneeID = &batchTask.AssigneeID
		}

		tasks = append(tasks, task)
	}

	// Bulk create tasks
	createdTasks, err := h.db.Tasks().BulkCreate(c.Request.Context(), tasks)
	if err != nil {
		h.logger.Printf("Error bulk creating tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(map[string]interface{}{
		"created_count": len(createdTasks),
		"tasks":         createdTasks,
	}, "Tasks imported successfully")
	c.JSON(http.StatusCreated, response)
}

// BulkDeleteTasks 批量删除任务
func (h *BulkOperationHandler) BulkDeleteTasks() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			TaskIDs []int `json:"task_ids" validate:"required,min=1"`
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

		// Perform bulk delete
		err := h.db.Tasks().BulkDelete(c.Request.Context(), req.TaskIDs)
		if err != nil {
			h.logger.Printf("Error bulk deleting tasks: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete tasks", nil)
			c.JSON(http.StatusInternalServerError, response)
			return
		}

		response := models.NewSuccessResponse(map[string]interface{}{
			"deleted_count": len(req.TaskIDs),
		}, "Tasks deleted successfully")
		c.JSON(http.StatusOK, response)
	}
}

// BatchValidateTasksPreview 批量验证任务预览
func (h *BulkOperationHandler) BatchValidateTasksPreview() gin.HandlerFunc {
	return func(c *gin.Context) {
		type TaskValidation struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			ProjectID   int    `json:"project_id"`
			AssigneeID  int    `json:"assignee_id"`
			DueDate     string `json:"due_date"`
			Priority    string `json:"priority"`
		}

		var req struct {
			Tasks []TaskValidation `json:"tasks" validate:"required,dive"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}

		var validationResults []map[string]interface{}
		var validCount, invalidCount int

		for i, taskReq := range req.Tasks {
			result := map[string]interface{}{
				"index":  i,
				"valid":  true,
				"errors": []string{},
			}

			errors := []string{}

			// Validate required fields
			if taskReq.Title == "" {
				errors = append(errors, "Title is required")
			}

			if taskReq.ProjectID <= 0 {
				errors = append(errors, "Valid project ID is required")
			}

			// Validate project exists
			if taskReq.ProjectID > 0 {
				if _, err := h.db.Projects().GetByID(c.Request.Context(), taskReq.ProjectID); err != nil {
					errors = append(errors, "Project not found")
				}
			}

			// Validate assignee if provided
			if taskReq.AssigneeID > 0 {
				if _, err := h.db.Users().GetByID(c.Request.Context(), taskReq.AssigneeID); err != nil {
					errors = append(errors, "Assignee not found")
				}
			}

			// Validate due date format if provided
			if taskReq.DueDate != "" {
				if _, err := time.Parse("2006-01-02", taskReq.DueDate); err != nil {
					errors = append(errors, "Invalid due date format (use YYYY-MM-DD)")
				}
			}

			// Validate priority
			if taskReq.Priority != "" {
				validPriorities := []string{"low", "medium", "high"}
				isValidPriority := false
				for _, p := range validPriorities {
					if taskReq.Priority == p {
						isValidPriority = true
						break
					}
				}
				if !isValidPriority {
					errors = append(errors, "Priority must be low, medium, or high")
				}
			}

			if len(errors) > 0 {
				result["valid"] = false
				result["errors"] = errors
				invalidCount++
			} else {
				validCount++
			}

			validationResults = append(validationResults, result)
		}

		summary := map[string]interface{}{
			"total_tasks":   len(req.Tasks),
			"valid_tasks":   validCount,
			"invalid_tasks": invalidCount,
			"can_proceed":   invalidCount == 0,
		}

		response := models.NewSuccessResponse(map[string]interface{}{
			"summary": summary,
			"results": validationResults,
		}, "Batch validation completed")
		c.JSON(http.StatusOK, response)
	}
}

// ImportTasksFromCSV 从CSV导入任务
func (h *BulkOperationHandler) ImportTasksFromCSV(c *gin.Context) {
	// Get project ID from form
	projectIDStr := c.PostForm("project_id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get uploaded file
	file, _, err := c.Request.FormFile("csv_file")
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "CSV file is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}
	defer file.Close()

	// Parse CSV
	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Failed to parse CSV file", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if len(records) == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "CSV file is empty", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Skip header row if present
	dataStart := 0
	if len(records) > 0 && strings.ToLower(records[0][0]) == "title" {
		dataStart = 1
	}

	var tasks []*models.Task
	var errors []string

	for i := dataStart; i < len(records); i++ {
		record := records[i]
		if len(record) < 2 { // At least title and description
			errors = append(errors, "Row %d: insufficient columns")
			continue
		}

		desc := strings.TrimSpace(record[1])
		task := &models.Task{
			Title:              strings.TrimSpace(record[0]),
			Description:        &desc,
			Status:             "todo",
			Priority:           "medium",
			ProjectID:          projectID,
			TimeTrackingMode:   "manual", // 设置默认时间追踪模式
			TimeUnitPreference: "auto",   // 设置默认时间单位偏好
			WorkHoursPerDay:    8.0,      // 设置默认每日工作时长
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		// Optional priority column
		if len(record) > 2 && strings.TrimSpace(record[2]) != "" {
			priority := strings.ToLower(strings.TrimSpace(record[2]))
			if priority == "low" || priority == "medium" || priority == "high" {
				task.Priority = priority
			}
		}

		// Optional due date column
		if len(record) > 3 && strings.TrimSpace(record[3]) != "" {
			if dueDate, err := time.Parse("2006-01-02", strings.TrimSpace(record[3])); err == nil {
				task.DueDate = &dueDate
			}
		}

		tasks = append(tasks, task)
	}

	if len(tasks) == 0 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "No valid tasks found in CSV", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Bulk create tasks
	createdTasks, err := h.db.Tasks().BulkCreate(c.Request.Context(), tasks)
	if err != nil {
		h.logger.Printf("Error bulk creating tasks from CSV: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	result := map[string]interface{}{
		"created_count": len(createdTasks),
		"total_rows":    len(records) - dataStart,
	}

	if len(errors) > 0 {
		result["errors"] = errors
	}

	response := models.NewSuccessResponse(result, "Tasks imported from CSV successfully")
	c.JSON(http.StatusCreated, response)
}

// BulkUpdateTaskStatus 批量更新任务状态 (保持向后兼容)
func (h *BulkOperationHandler) BulkUpdateTaskStatus(c *gin.Context) {
	var req struct {
		TaskIDs   []int  `json:"task_ids" validate:"required,min=1"`
		NewStatus string `json:"new_status" validate:"required,oneof=draft planning todo in_progress testing completed cancelled on_hold suspended blocked archived"`
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

	var successCount int
	var errors []string

	for _, taskID := range req.TaskIDs {
		if err := h.db.Tasks().UpdateStatus(c.Request.Context(), taskID, req.NewStatus); err != nil {
			errors = append(errors, err.Error())
		} else {
			successCount++
		}
	}

	result := map[string]interface{}{
		"success_count": successCount,
		"total_count":   len(req.TaskIDs),
	}

	if len(errors) > 0 {
		result["errors"] = errors
	}

	response := models.NewSuccessResponse(result, "Bulk status update completed")
	c.JSON(http.StatusOK, response)
}

// BulkUpdateTasks 批量更新任务 (支持状态和父任务更新)
func (h *BulkOperationHandler) BulkUpdateTasks(c *gin.Context) {
	var req models.BatchUpdateTasksRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error binding request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		h.logger.Printf("Validation error: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", map[string]interface{}{
			"validation_errors": err.Error(),
		})
		c.JSON(http.StatusBadRequest, response)
		return
	}

	h.logger.Printf("Processing batch update request: taskIds=%v, status=%v, parentId=%v",
		req.TaskIDs, req.Status, req.ParentID)

	var updatedCount int
	var failedTasks []models.BatchTaskError

	// 处理每个任务
	for _, taskID := range req.TaskIDs {
		h.logger.Printf("Processing task ID: %d", taskID)

		// 获取当前任务信息
		currentTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
		if err != nil {
			h.logger.Printf("Error getting task %d: %v", taskID, err)
			failedTasks = append(failedTasks, models.BatchTaskError{
				TaskID: taskID,
				Error:  "Task not found",
			})
			continue
		}

		// 更新父任务
		if req.ParentID != nil {
			h.logger.Printf("Updating parent for task %d: %v -> %v", taskID, currentTask.ParentID, *req.ParentID)

			// 验证父任务是否存在（如果不是设置为null）
			if *req.ParentID != 0 {
				parentTask, err := h.db.Tasks().GetByID(c.Request.Context(), *req.ParentID)
				if err != nil {
					h.logger.Printf("Parent task %d not found for task %d: %v", *req.ParentID, taskID, err)
					failedTasks = append(failedTasks, models.BatchTaskError{
						TaskID: taskID,
						Error:  "Parent task not found",
					})
					continue
				}

				// 验证不能设置自己为父任务
				if *req.ParentID == taskID {
					h.logger.Printf("Task %d cannot be its own parent", taskID)
					failedTasks = append(failedTasks, models.BatchTaskError{
						TaskID: taskID,
						Error:  "Task cannot be its own parent",
					})
					continue
				}

				// 验证项目一致性
				if parentTask.ProjectID != currentTask.ProjectID {
					h.logger.Printf("Parent task %d is in different project than task %d", *req.ParentID, taskID)
					failedTasks = append(failedTasks, models.BatchTaskError{
						TaskID: taskID,
						Error:  "Parent task must be in the same project",
					})
					continue
				}
			}
		}

		// 执行更新
		// 先获取完整的任务信息用于更新
		taskToUpdate, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
		if err != nil {
			h.logger.Printf("Error re-getting task %d for update: %v", taskID, err)
			failedTasks = append(failedTasks, models.BatchTaskError{
				TaskID: taskID,
				Error:  "Failed to get task for update",
			})
			continue
		}

		// 应用更新
		if req.Status != nil {
			taskToUpdate.Status = *req.Status
		}

		if req.ParentID != nil {
			if *req.ParentID == 0 {
				taskToUpdate.ParentID = nil
			} else {
				taskToUpdate.ParentID = req.ParentID
			}
		}

		taskToUpdate.UpdatedAt = time.Now()

		// 使用完整的Update方法
		_, err = h.db.Tasks().Update(c.Request.Context(), taskToUpdate)
		if err != nil {
			h.logger.Printf("Error updating task %d: %v", taskID, err)
			failedTasks = append(failedTasks, models.BatchTaskError{
				TaskID: taskID,
				Error:  err.Error(),
			})
			continue
		}

		updatedCount++
		h.logger.Printf("Successfully updated task %d", taskID)
	}

	// 构建响应
	response := models.BatchUpdateTasksResponse{
		UpdatedCount: updatedCount,
		FailedTasks:  failedTasks,
		Message:      "Batch update completed",
	}

	if len(failedTasks) > 0 {
		h.logger.Printf("Batch update completed with errors: %d success, %d failed", updatedCount, len(failedTasks))
	} else {
		h.logger.Printf("Batch update completed successfully: %d tasks updated", updatedCount)
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, response.Message))
}

// Enhanced Batch Operation Handlers using the new service

// ValidateBatchOperation validates a batch operation request
func (h *BulkOperationHandler) ValidateBatchOperation(c *gin.Context) {
	var req models.BatchOperationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error binding batch validation request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		h.logger.Printf("Validation error for batch operation: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	result, err := h.batchService.ValidateBatchOperation(c.Request.Context(), &req)
	if err != nil {
		h.logger.Printf("Error validating batch operation: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to validate batch operation", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	statusCode := http.StatusOK
	if !result.Valid {
		statusCode = http.StatusUnprocessableEntity
	}

	c.JSON(statusCode, models.NewSuccessResponse(result, "Batch operation validation completed"))
}

// ExecuteBatchOperation executes a validated batch operation
func (h *BulkOperationHandler) ExecuteBatchOperation(c *gin.Context) {
	var req models.BatchOperationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error binding batch execution request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		h.logger.Printf("Validation error for batch execution: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate before execution unless validation is skipped
	if !req.Options.ValidateOnly {
		validationResult, err := h.batchService.ValidateBatchOperation(c.Request.Context(), &req)
		if err != nil {
			h.logger.Printf("Error validating batch operation before execution: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Pre-execution validation failed", nil)
			c.JSON(http.StatusInternalServerError, response)
			return
		}

		if !validationResult.CanProceed {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Batch operation cannot proceed due to validation errors", validationResult)
			c.JSON(http.StatusBadRequest, response)
			return
		}
	}

	result, err := h.batchService.ExecuteBatchOperation(c.Request.Context(), &req)
	if err != nil {
		h.logger.Printf("Error executing batch operation: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to execute batch operation", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	statusCode := http.StatusOK
	if result.Status == models.BatchStatusFailed {
		statusCode = http.StatusInternalServerError
	} else if result.Status == models.BatchStatusPartial {
		statusCode = http.StatusPartialContent
	}

	c.JSON(statusCode, models.NewSuccessResponse(result, "Batch operation executed"))
}

// GetBatchOperationStatus returns the current status of a batch operation
func (h *BulkOperationHandler) GetBatchOperationStatus(c *gin.Context) {
	operationID := c.Param("operation_id")
	if operationID == "" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Operation ID is required", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	result, err := h.batchService.GetBatchOperationStatus(operationID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Operation not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "Batch operation status retrieved"))
}

// PreviewBatchOperation generates a preview of what the batch operation would do
func (h *BulkOperationHandler) PreviewBatchOperation(c *gin.Context) {
	var req models.BatchOperationRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error binding batch preview request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		h.logger.Printf("Validation error for batch preview: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	preview, err := h.batchService.PreviewBatchOperation(c.Request.Context(), &req)
	if err != nil {
		h.logger.Printf("Error generating batch operation preview: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate preview", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(preview, "Batch operation preview generated"))
}

// Specific batch operation handlers

// BatchStatusUpdate handles batch status updates
func (h *BulkOperationHandler) BatchStatusUpdate(c *gin.Context) {
	var reqData models.BatchStatusUpdateRequest

	if err := c.ShouldBindJSON(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Convert to generic batch request
	batchReq := models.BatchOperationRequest{
		OperationType: models.BatchOperationStatusUpdate,
		TaskIDs:       reqData.TaskIDs,
		Parameters: map[string]interface{}{
			"new_status": reqData.NewStatus,
			"force":      reqData.Force,
		},
		RequestedBy: 1, // TODO: Get from auth context
	}

	result, err := h.batchService.ExecuteBatchOperation(c.Request.Context(), &batchReq)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to execute batch status update", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "Batch status update completed"))
}

// BatchParentChange handles batch parent changes
func (h *BulkOperationHandler) BatchParentChange(c *gin.Context) {
	var reqData models.BatchParentChangeRequest

	if err := c.ShouldBindJSON(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Convert to generic batch request
	batchReq := models.BatchOperationRequest{
		OperationType: models.BatchOperationParentChange,
		TaskIDs:       reqData.TaskIDs,
		Parameters: map[string]interface{}{
			"new_parent_id":    reqData.NewParentID,
			"maintain_order":   reqData.MaintainOrder,
		},
		RequestedBy: 1, // TODO: Get from auth context
	}

	result, err := h.batchService.ExecuteBatchOperation(c.Request.Context(), &batchReq)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to execute batch parent change", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "Batch parent change completed"))
}

// BatchAssigneeChange handles batch assignee changes
func (h *BulkOperationHandler) BatchAssigneeChange(c *gin.Context) {
	var reqData models.BatchAssigneeChangeRequest

	if err := c.ShouldBindJSON(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	batchReq := models.BatchOperationRequest{
		OperationType: models.BatchOperationAssignee,
		TaskIDs:       reqData.TaskIDs,
		Parameters: map[string]interface{}{
			"new_assignee_id": reqData.NewAssigneeID,
			"notify_users":    reqData.NotifyUsers,
		},
		RequestedBy: 1, // TODO: Get from auth context
	}

	result, err := h.batchService.ExecuteBatchOperation(c.Request.Context(), &batchReq)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to execute batch assignee change", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "Batch assignee change completed"))
}

// BatchDelete handles batch delete operations
func (h *BulkOperationHandler) BatchDelete(c *gin.Context) {
	var reqData models.BatchDeleteRequest

	if err := c.ShouldBindJSON(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	batchReq := models.BatchOperationRequest{
		OperationType: models.BatchOperationDelete,
		TaskIDs:       reqData.TaskIDs,
		Parameters: map[string]interface{}{
			"delete_children": reqData.DeleteChildren,
			"hard_delete":     reqData.HardDelete,
			"backup_first":    reqData.BackupFirst,
			"reason":          reqData.Reason,
		},
		RequestedBy: 1, // TODO: Get from auth context
	}

	result, err := h.batchService.ExecuteBatchOperation(c.Request.Context(), &batchReq)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to execute batch delete", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "Batch delete completed"))
}

// BatchArchive handles batch archive operations  
func (h *BulkOperationHandler) BatchArchive(c *gin.Context) {
	var reqData models.BatchArchiveRequest

	if err := c.ShouldBindJSON(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	if err := h.validator.Struct(&reqData); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	batchReq := models.BatchOperationRequest{
		OperationType: models.BatchOperationArchive,
		TaskIDs:       reqData.TaskIDs,
		Parameters: map[string]interface{}{
			"archive_children": reqData.ArchiveChildren,
			"reason":           reqData.Reason,
		},
		RequestedBy: 1, // TODO: Get from auth context
	}

	result, err := h.batchService.ExecuteBatchOperation(c.Request.Context(), &batchReq)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to execute batch archive", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "Batch archive completed"))
}
