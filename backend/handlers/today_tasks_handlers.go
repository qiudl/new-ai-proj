package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
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

	// DEBUG: Force visible logging for debugging
	fmt.Printf("\n=== DEBUG: Stats map contents BEFORE response ===\n")
	for key, value := range stats {
		fmt.Printf("Key: %s, Value: %v\n", key, value)
	}
	fmt.Printf("Total map keys: %d\n", len(stats))
	
	if totalPlanned, exists := stats["totalPlannedTime"]; exists {
		fmt.Printf("totalPlannedTime EXISTS: %v\n", totalPlanned)
	} else {
		fmt.Printf("totalPlannedTime does NOT exist in stats map\n")
	}
	fmt.Printf("=== END DEBUG ===\n\n")

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
		"updated_today_count": 0,
		"high_priority_count": 0,
		"priority_stats": map[string]int{
			"high":   0,
			"medium": 0,
			"low":    0,
		},
		
		// 时间统计 - 精准时间支持
		"totalPlannedTime":   0.0,   // 分钟 (精准到分钟)
		"totalActualTime":    0.0,   // 分钟 (精准到分钟)  
		"totalRemainingTime": 0.0,   // 分钟 (精准到分钟)
		"timeEfficiency":     0.0,   // 百分比
		
		// 新增：精准时间格式统计
		"totalPlannedTimeFormatted":   "0分钟",   // 格式化显示
		"totalActualTimeFormatted":    "0分钟",   // 格式化显示
		"totalRemainingTimeFormatted": "0分钟",   // 格式化显示
		
		// 时间分布统计
		"timeDistribution": map[string]float64{
			"short":  0, // 0-2小时
			"medium": 0, // 2-8小时
			"long":   0, // 8小时以上
			"huge":   0, // 1天以上
		},
	}

	today := time.Now().Format("2006-01-02")
	priorityStats := stats["priority_stats"].(map[string]int)
	timeDistribution := stats["timeDistribution"].(map[string]float64)
	
	var totalPlannedMinutes, totalActualMinutes float64

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
		
		// Updated today (where updated_at ≠ created_at)
		if task.UpdatedAt.Format("2006-01-02") == today && !task.UpdatedAt.Equal(task.CreatedAt) {
			stats["updated_today_count"] = stats["updated_today_count"].(int) + 1
		}

		// Priority counts
		if task.CustomFields != nil {
			if priority, exists := task.CustomFields["priority"]; exists {
				if priorityStr, ok := priority.(string); ok {
					if count, exists := priorityStats[priorityStr]; exists {
						priorityStats[priorityStr] = count + 1
					}
					// High priority count
					if priorityStr == "high" {
						stats["high_priority_count"] = stats["high_priority_count"].(int) + 1
					}
				}
			}
			
			// 时间统计处理 - 支持精准时间
			h.processTaskTimeStats(task, &totalPlannedMinutes, &totalActualMinutes, timeDistribution)
		}
	}

	// Calculate completion rate
	if stats["total_count"].(int) > 0 {
		completionRate := float64(stats["completed_count"].(int)) / float64(stats["total_count"].(int)) * 100
		stats["completion_rate"] = completionRate
	} else {
		stats["completion_rate"] = 0.0
	}
	
	// 完成时间统计计算
	h.finalizeTimeStats(stats, totalPlannedMinutes, totalActualMinutes)

	// 调试日志：显示最终stats内容
	h.logger.Printf("DEBUG: Final stats keys: %v", getMapKeys(stats))
	if totalPlanned, exists := stats["totalPlannedTime"]; exists {
		h.logger.Printf("DEBUG: Final totalPlannedTime: %v", totalPlanned)
	}

	return stats
}

// processTaskTimeStats 处理单个任务的时间统计
func (h *TodayTasksHandler) processTaskTimeStats(task *models.Task, totalPlannedMinutes, totalActualMinutes *float64, timeDistribution map[string]float64) {
	if task.CustomFields == nil {
		return
	}
	
	// 提取精准时间数据 (estimatedMinutes)
	var plannedMinutes float64
	if estimatedMinutes, exists := task.CustomFields["estimatedMinutes"]; exists {
		if minutes, ok := estimatedMinutes.(float64); ok {
			plannedMinutes = minutes
		} else if minutesInt, ok := estimatedMinutes.(int); ok {
			plannedMinutes = float64(minutesInt)
		}
	}
	
	// 如果没有estimatedMinutes，尝试从estimated_hours获取（向后兼容）
	if plannedMinutes == 0 {
		if estimatedHours, exists := task.CustomFields["estimated_hours"]; exists {
			if hours, ok := estimatedHours.(float64); ok {
				plannedMinutes = hours * 60
			} else if hoursInt, ok := estimatedHours.(int); ok {
				plannedMinutes = float64(hoursInt) * 60
			}
		}
	}
	
	// 提取实际时间数据
	var actualMinutes float64
	if actualTime, exists := task.CustomFields["actual_time"]; exists {
		if minutes, ok := actualTime.(float64); ok {
			actualMinutes = minutes
		} else if minutesInt, ok := actualTime.(int); ok {
			actualMinutes = float64(minutesInt)
		}
	}
	
	*totalPlannedMinutes += plannedMinutes
	*totalActualMinutes += actualMinutes
	
	// 时间分布统计 (基于计划时间)
	if plannedMinutes > 0 {
		if plannedMinutes <= 120 { // 0-2小时
			timeDistribution["short"] += plannedMinutes
		} else if plannedMinutes <= 480 { // 2-8小时
			timeDistribution["medium"] += plannedMinutes
		} else if plannedMinutes <= 1440 { // 8小时-1天
			timeDistribution["long"] += plannedMinutes
		} else { // 1天以上
			timeDistribution["huge"] += plannedMinutes
		}
	}
}

// finalizeTimeStats 完成时间统计的最终计算
func (h *TodayTasksHandler) finalizeTimeStats(stats map[string]interface{}, totalPlannedMinutes, totalActualMinutes float64) {
	// 调试日志
	h.logger.Printf("DEBUG: finalizeTimeStats - totalPlannedMinutes: %f, totalActualMinutes: %f", totalPlannedMinutes, totalActualMinutes)
	
	// 设置原始分钟数
	stats["totalPlannedTime"] = totalPlannedMinutes
	stats["totalActualTime"] = totalActualMinutes
	
	// 计算剩余时间
	totalRemainingMinutes := totalPlannedMinutes - totalActualMinutes
	if totalRemainingMinutes < 0 {
		totalRemainingMinutes = 0
	}
	stats["totalRemainingTime"] = totalRemainingMinutes
	
	// 计算时间效率
	var timeEfficiency float64
	if totalPlannedMinutes > 0 {
		timeEfficiency = (totalActualMinutes / totalPlannedMinutes) * 100
		if timeEfficiency > 100 {
			timeEfficiency = 100
		}
	}
	stats["timeEfficiency"] = timeEfficiency
	
	// 生成格式化的时间字符串
	stats["totalPlannedTimeFormatted"] = h.formatMinutesToReadable(totalPlannedMinutes)
	stats["totalActualTimeFormatted"] = h.formatMinutesToReadable(totalActualMinutes)
	stats["totalRemainingTimeFormatted"] = h.formatMinutesToReadable(totalRemainingMinutes)
}

// formatMinutesToReadable 将分钟数格式化为可读的时间字符串
func (h *TodayTasksHandler) formatMinutesToReadable(minutes float64) string {
	if minutes == 0 {
		return "0分钟"
	}
	
	if minutes < 60 {
		return strconv.FormatFloat(minutes, 'f', 0, 64) + "分钟"
	}
	
	hours := minutes / 60
	if hours < 24 {
		if hours == float64(int(hours)) {
			return strconv.Itoa(int(hours)) + "小时"
		}
		return strconv.FormatFloat(hours, 'f', 1, 64) + "小时"
	}
	
	days := hours / 24
	if days == float64(int(days)) {
		return strconv.Itoa(int(days)) + "天"
	}
	return strconv.FormatFloat(days, 'f', 1, 64) + "天"
}

// getMapKeys 获取map的所有键（用于调试）
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}