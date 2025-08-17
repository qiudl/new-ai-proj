package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// TodayTasksHandler 今日任务处理器
type TodayTasksHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewTodayTasksHandler 创建今日任务处理器
func NewTodayTasksHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *TodayTasksHandler {
	return &TodayTasksHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetTodayTasks 获取今日任务
func (h *TodayTasksHandler) GetTodayTasks(c *gin.Context) {
	// Parse query parameters
	projectID := c.Query("project_id")
	userID := c.Query("user_id")
	status := c.Query("status")
	priority := c.Query("priority")
	sortBy := c.DefaultQuery("sort", "created_at")
	sortOrder := c.DefaultQuery("order", "desc")

	// Get all tasks first (this should be optimized with proper filtering in production)
	tasks, _, err := h.db.Tasks().GetAll(c.Request.Context(), 1000, 0)
	if err != nil {
		h.logger.Printf("Error getting tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Apply filters and today's logic
	todayTasks := h.filterTodayTasks(tasks, projectID, userID, status, priority)

	// Apply sorting
	h.sortTasks(todayTasks, sortBy, sortOrder)

	// Convert to response format
	var responseTasks []map[string]interface{}
	for _, task := range todayTasks {
		taskMap := h.taskToMap(task)
		responseTasks = append(responseTasks, taskMap)
	}

	response := models.NewSuccessResponse(responseTasks, "Today's tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetTodayTasksStats 获取今日任务统计
func (h *TodayTasksHandler) GetTodayTasksStats(c *gin.Context) {
	// Get all tasks for stats calculation
	tasks, _, err := h.db.Tasks().GetAll(c.Request.Context(), 1000, 0)
	if err != nil {
		h.logger.Printf("Error getting tasks for stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get task stats", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Filter today's tasks
	todayTasks := h.filterTodayTasks(tasks, "", "", "", "")

	// Calculate statistics
	stats := h.calculateTodayStats(todayTasks)

	response := models.NewSuccessResponse(stats, "Today's task statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// MarkTodayTaskCompleted 标记今日任务为完成
func (h *TodayTasksHandler) MarkTodayTaskCompleted(c *gin.Context) {
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Update task status to completed
	err = h.db.Tasks().UpdateStatus(c.Request.Context(), taskID, "completed")
	if err != nil {
		h.logger.Printf("Error marking task %d as completed: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to mark task as completed", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Task marked as completed successfully")
	c.JSON(http.StatusOK, response)
}

// PostponeTodayTask 推迟今日任务
func (h *TodayTasksHandler) PostponeTodayTask(c *gin.Context) {
	taskIDStr := c.Param("task_id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req struct {
		NewDueDate string `json:"new_due_date" validate:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse the new due date
	newDueDate, err := time.Parse("2006-01-02", req.NewDueDate)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid date format", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get the task and update its due date
	task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		h.logger.Printf("Error getting task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Task not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	task.DueDate = &newDueDate
	_, err = h.db.Tasks().Update(c.Request.Context(), task)
	if err != nil {
		h.logger.Printf("Error postponing task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to postpone task", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Task postponed successfully")
	c.JSON(http.StatusOK, response)
}

// BulkOperationTodayTasks 批量操作今日任务
func (h *TodayTasksHandler) BulkOperationTodayTasks(c *gin.Context) {
	var req struct {
		TaskIDs   []int  `json:"task_ids" validate:"required"`
		Operation string `json:"operation" validate:"required,oneof=complete postpone delete"`
		NewDueDate string `json:"new_due_date,omitempty"`
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
		switch req.Operation {
		case "complete":
			if err := h.db.Tasks().UpdateStatus(c.Request.Context(), taskID, "completed"); err != nil {
				errors = append(errors, err.Error())
			} else {
				successCount++
			}
		case "postpone":
			if req.NewDueDate == "" {
				errors = append(errors, "new_due_date is required for postpone operation")
				continue
			}
			newDueDate, err := time.Parse("2006-01-02", req.NewDueDate)
			if err != nil {
				errors = append(errors, "invalid date format")
				continue
			}
			task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
			if err != nil {
				errors = append(errors, err.Error())
				continue
			}
			task.DueDate = &newDueDate
			if _, err := h.db.Tasks().Update(c.Request.Context(), task); err != nil {
				errors = append(errors, err.Error())
			} else {
				successCount++
			}
		case "delete":
			if err := h.db.Tasks().Delete(c.Request.Context(), taskID); err != nil {
				errors = append(errors, err.Error())
			} else {
				successCount++
			}
		}
	}

	result := map[string]interface{}{
		"success_count": successCount,
		"total_count":   len(req.TaskIDs),
	}

	if len(errors) > 0 {
		result["errors"] = errors
	}

	response := models.NewSuccessResponse(result, "Bulk operation completed")
	c.JSON(http.StatusOK, response)
}

// Helper methods

func (h *TodayTasksHandler) filterTodayTasks(tasks []*models.Task, projectID, userID, status, priority string) []*models.Task {
	var todayTasks []*models.Task
	today := time.Now().Format("2006-01-02")

	for _, task := range tasks {
		// Skip cancelled tasks
		if task.Status == "cancelled" {
			continue
		}

		// Apply basic filters first
		if projectID != "" {
			if pid, err := strconv.Atoi(projectID); err == nil && task.ProjectID != pid {
				continue
			}
		}

		if userID != "" {
			if uid, err := strconv.Atoi(userID); err == nil && (task.AssigneeID == nil || *task.AssigneeID != uid) {
				continue
			}
		}

		if status != "" && task.Status != status {
			continue
		}

		if priority != "" {
			if task.CustomFields != nil {
				if taskPriority, exists := task.CustomFields["priority"]; !exists || taskPriority != priority {
					continue
				}
			} else if priority != "" {
				continue
			}
		}

		// Apply today's filtering logic
		isToday := false

		// 1. Tasks with status "in_progress"
		if task.Status == "in_progress" {
			isToday = true
		}

		// 2. Tasks due today
		if task.DueDate != nil && task.DueDate.Format("2006-01-02") == today {
			isToday = true
		}

		// 3. Tasks created today
		if task.CreatedAt.Format("2006-01-02") == today {
			isToday = true
		}

		// 4. Tasks updated today (where updated_at ≠ created_at)
		if task.UpdatedAt.Format("2006-01-02") == today && !task.UpdatedAt.Equal(task.CreatedAt) {
			isToday = true
		}

		// 5. Overdue tasks that are not completed
		if task.DueDate != nil {
			dueDate := task.DueDate.Format("2006-01-02")
			if dueDate < today && task.Status != "completed" && task.Status != "cancelled" {
				isToday = true
			}
		}

		if isToday {
			todayTasks = append(todayTasks, task)
		}
	}

	return todayTasks
}

func (h *TodayTasksHandler) sortTasks(tasks []*models.Task, sortBy, sortOrder string) {
	switch sortBy {
	case "created_at":
		if sortOrder == "desc" {
			sort.Slice(tasks, func(i, j int) bool {
				return tasks[i].CreatedAt.After(tasks[j].CreatedAt)
			})
		} else {
			sort.Slice(tasks, func(i, j int) bool {
				return tasks[i].CreatedAt.Before(tasks[j].CreatedAt)
			})
		}
	case "updated_at":
		if sortOrder == "desc" {
			sort.Slice(tasks, func(i, j int) bool {
				return tasks[i].UpdatedAt.After(tasks[j].UpdatedAt)
			})
		} else {
			sort.Slice(tasks, func(i, j int) bool {
				return tasks[i].UpdatedAt.Before(tasks[j].UpdatedAt)
			})
		}
	case "due_date":
		if sortOrder == "desc" {
			sort.Slice(tasks, func(i, j int) bool {
				if tasks[i].DueDate == nil && tasks[j].DueDate == nil {
					return false
				}
				if tasks[i].DueDate == nil {
					return false
				}
				if tasks[j].DueDate == nil {
					return true
				}
				return tasks[i].DueDate.After(*tasks[j].DueDate)
			})
		} else {
			sort.Slice(tasks, func(i, j int) bool {
				if tasks[i].DueDate == nil && tasks[j].DueDate == nil {
					return false
				}
				if tasks[i].DueDate == nil {
					return false
				}
				if tasks[j].DueDate == nil {
					return true
				}
				return tasks[i].DueDate.Before(*tasks[j].DueDate)
			})
		}
	case "priority":
		priorityOrder := map[string]int{"high": 3, "medium": 2, "low": 1}
		if sortOrder == "desc" {
			sort.Slice(tasks, func(i, j int) bool {
				iPriority := 0
				jPriority := 0
				if tasks[i].CustomFields != nil {
					if p, exists := tasks[i].CustomFields["priority"]; exists {
						if pStr, ok := p.(string); ok {
							iPriority = priorityOrder[pStr]
						}
					}
				}
				if tasks[j].CustomFields != nil {
					if p, exists := tasks[j].CustomFields["priority"]; exists {
						if pStr, ok := p.(string); ok {
							jPriority = priorityOrder[pStr]
						}
					}
				}
				return iPriority > jPriority
			})
		} else {
			sort.Slice(tasks, func(i, j int) bool {
				iPriority := 0
				jPriority := 0
				if tasks[i].CustomFields != nil {
					if p, exists := tasks[i].CustomFields["priority"]; exists {
						if pStr, ok := p.(string); ok {
							iPriority = priorityOrder[pStr]
						}
					}
				}
				if tasks[j].CustomFields != nil {
					if p, exists := tasks[j].CustomFields["priority"]; exists {
						if pStr, ok := p.(string); ok {
							jPriority = priorityOrder[pStr]
						}
					}
				}
				return iPriority < jPriority
			})
		}
	}
}

func (h *TodayTasksHandler) taskToMap(task *models.Task) map[string]interface{} {
	taskMap := map[string]interface{}{
		"id":          task.ID,
		"title":       task.Title,
		"description": task.Description,
		"status":      task.Status,
		"priority":    task.Priority,
		"created_at":  task.CreatedAt,
		"updated_at":  task.UpdatedAt,
	}

	if task.ProjectID != 0 {
		taskMap["project_id"] = task.ProjectID
	}
	if task.AssigneeID != nil {
		taskMap["assignee_id"] = *task.AssigneeID
	}
	if task.ParentID != nil {
		taskMap["parent_id"] = *task.ParentID
	}
	if task.DueDate != nil {
		taskMap["due_date"] = task.DueDate.Format(time.RFC3339)
	}
	if task.CustomFields != nil {
		taskMap["custom_fields"] = task.CustomFields
	}

	return taskMap
}

func (h *TodayTasksHandler) calculateTodayStats(tasks []*models.Task) map[string]interface{} {
	stats := map[string]interface{}{
		"total_count":     len(tasks),
		"completed_count": 0,
		"in_progress_count": 0,
		"pending_count":   0,
		"overdue_count":   0,
		"due_today_count": 0,
		"created_today_count": 0,
		"priority_stats": map[string]int{
			"high":   0,
			"medium": 0,
			"low":    0,
		},
	}

	today := time.Now().Format("2006-01-02")
	priorityStats := stats["priority_stats"].(map[string]int)

	for _, task := range tasks {
		// Status counts
		switch task.Status {
		case "completed":
			stats["completed_count"] = stats["completed_count"].(int) + 1
		case "in_progress":
			stats["in_progress_count"] = stats["in_progress_count"].(int) + 1
		case "pending":
			stats["pending_count"] = stats["pending_count"].(int) + 1
		}

		// Due date analysis
		if task.DueDate != nil {
			dueDate := task.DueDate.Format("2006-01-02")
			if dueDate == today {
				stats["due_today_count"] = stats["due_today_count"].(int) + 1
			} else if dueDate < today && task.Status != "completed" {
				stats["overdue_count"] = stats["overdue_count"].(int) + 1
			}
		}

		// Created today
		if task.CreatedAt.Format("2006-01-02") == today {
			stats["created_today_count"] = stats["created_today_count"].(int) + 1
		}

		// Priority counts
		if task.CustomFields != nil {
			if priority, exists := task.CustomFields["priority"]; exists {
				if priorityStr, ok := priority.(string); ok {
					if count, exists := priorityStats[priorityStr]; exists {
						priorityStats[priorityStr] = count + 1
					}
				}
			}
		}
	}

	// Calculate completion rate
	if stats["total_count"].(int) > 0 {
		completionRate := float64(stats["completed_count"].(int)) / float64(stats["total_count"].(int)) * 100
		stats["completion_rate"] = completionRate
	} else {
		stats["completion_rate"] = 0.0
	}

	return stats
}