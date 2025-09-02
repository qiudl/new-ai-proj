package handlers

import (
	"ai-project-backend/models"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// MoveTask handles moving a task to a different project or parent
// @Summary Move task to different project or parent
// @Description Move a task to a different project and/or change its parent
// @Tags Tasks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Param taskId path int true "Task ID"
// @Param request body models.MoveTaskRequest true "Move task request"
// @Success 200 {object} models.APIResponse "Task moved successfully"
// @Failure 400 {object} models.APIResponse "Bad request"
// @Failure 401 {object} models.APIResponse "Unauthorized"
// @Failure 404 {object} models.APIResponse "Task not found"
// @Failure 500 {object} models.APIResponse "Internal server error"
// @Router /projects/{id}/tasks/{taskId}/move [post]
func (h *TaskHandler) MoveTask(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_project_id", "项目ID必须是有效的数字", nil))
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_task_id", "任务ID必须是有效的数字", nil))
		return
	}

	var request struct {
		TargetProjectID *int `json:"target_project_id"`
		TargetParentID  *int `json:"target_parent_id"`
		NewPosition     *int `json:"new_position"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_request", "请求格式不正确: "+err.Error(), nil))
		return
	}

	// Validate that at least one target is specified
	if request.TargetProjectID == nil && request.TargetParentID == nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("missing_target", "必须指定目标项目或父任务", nil))
		return
	}

	// Get current task info
	currentTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("task_not_found", "任务不存在", nil))
			return
		}
		log.Printf("Failed to fetch task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("database_error", "查询任务失败", nil))
		return
	}

	// Check if task belongs to the specified project
	if currentTask.ProjectID != projectID {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("task_not_found", "任务不存在或不属于指定项目", nil))
		return
	}

	// Set target values
	targetProjectID := currentTask.ProjectID
	if request.TargetProjectID != nil {
		targetProjectID = *request.TargetProjectID
	}

	var targetParentID *int
	if request.TargetParentID != nil {
		targetParentID = request.TargetParentID
	}

	newPosition := 0
	if request.NewPosition != nil {
		newPosition = *request.NewPosition
	}

	// Update the task using repository pattern
	updateTask := *currentTask // Copy the current task
	updateTask.ProjectID = targetProjectID
	updateTask.ParentID = targetParentID
	updateTask.SortOrder = newPosition

	_, err = h.db.Tasks().Update(c.Request.Context(), &updateTask)
	if err != nil {
		log.Printf("Failed to update task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("update_failed", "移动任务失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"task_id":        taskID,
		"old_project_id": currentTask.ProjectID,
		"new_project_id": targetProjectID,
		"old_parent_id":  currentTask.ParentID,
		"new_parent_id":  targetParentID,
		"new_position":   newPosition,
	}, fmt.Sprintf("任务 \"%s\" 移动成功", currentTask.Title)))
}

// ReorderTask handles changing the position/order of a task within its current parent
// @Summary Reorder task position
// @Description Change the position of a task within its current parent/project
// @Tags Tasks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Param taskId path int true "Task ID"
// @Param request body models.ReorderTaskRequest true "Reorder task request"
// @Success 200 {object} models.APIResponse "Task reordered successfully"
// @Failure 400 {object} models.APIResponse "Bad request"
// @Failure 401 {object} models.APIResponse "Unauthorized"
// @Failure 404 {object} models.APIResponse "Task not found"
// @Failure 500 {object} models.APIResponse "Internal server error"
// @Router /projects/{id}/tasks/{taskId}/reorder [post]
func (h *TaskHandler) ReorderTask(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_project_id", "项目ID必须是有效的数字", nil))
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_task_id", "任务ID必须是有效的数字", nil))
		return
	}

	var request struct {
		NewPosition int    `json:"new_position"`
		Direction   string `json:"direction,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_request", "请求格式不正确: "+err.Error(), nil))
		return
	}

	// Get current task info
	currentTask, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.NewErrorResponse("task_not_found", "任务不存在", nil))
			return
		}
		log.Printf("Failed to fetch task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("database_error", "查询任务失败", nil))
		return
	}

	// Check if task belongs to the specified project
	if currentTask.ProjectID != projectID {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("task_not_found", "任务不存在或不属于指定项目", nil))
		return
	}

	// Calculate target position based on direction
	targetPosition := request.NewPosition
	if request.Direction != "" {
		switch request.Direction {
		case "up":
			if currentTask.SortOrder > 0 {
				targetPosition = currentTask.SortOrder - 1
			} else {
				targetPosition = 0
			}
		case "down":
			targetPosition = currentTask.SortOrder + 1
		case "first":
			targetPosition = 0
		case "last":
			// This would require a more complex query to find the maximum position
			targetPosition = currentTask.SortOrder + 100 // Simple approximation
		}
	}

	// If position hasn't changed, return success
	if targetPosition == currentTask.SortOrder {
		c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
			"task_id":      taskID,
			"old_position": currentTask.SortOrder,
			"new_position": targetPosition,
		}, "任务位置未改变"))
		return
	}

	// Update the task
	updateTask := *currentTask // Copy the current task
	updateTask.SortOrder = targetPosition

	_, err = h.db.Tasks().Update(c.Request.Context(), &updateTask)
	if err != nil {
		log.Printf("Failed to update task: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("update_failed", "更新任务位置失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"task_id":      taskID,
		"old_position": currentTask.SortOrder,
		"new_position": targetPosition,
	}, fmt.Sprintf("任务 \"%s\" 重排序成功", currentTask.Title)))
}

// BulkReorderTasks handles reordering multiple tasks at once
// @Summary Bulk reorder tasks
// @Description Reorder multiple tasks in a single operation
// @Tags Tasks
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Project ID"
// @Param request body models.BulkReorderTasksRequest true "Bulk reorder request"
// @Success 200 {object} models.APIResponse "Tasks reordered successfully"
// @Failure 400 {object} models.APIResponse "Bad request"
// @Failure 401 {object} models.APIResponse "Unauthorized"
// @Failure 500 {object} models.APIResponse "Internal server error"
// @Router /projects/{id}/tasks/bulk-reorder [post]
func (h *TaskHandler) BulkReorderTasks(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_project_id", "项目ID必须是有效的数字", nil))
		return
	}

	var request struct {
		TaskOrders []struct {
			TaskID      int `json:"task_id"`
			NewPosition int `json:"new_position"`
		} `json:"task_orders"`
		ParentID *int `json:"parent_id"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("invalid_request", "请求格式不正确: "+err.Error(), nil))
		return
	}

	if len(request.TaskOrders) == 0 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("empty_orders", "任务排序列表不能为空", nil))
		return
	}

	// Process each task update
	updatedTasks := make([]map[string]interface{}, 0, len(request.TaskOrders))
	for _, order := range request.TaskOrders {
		// Get current task info
		currentTask, err := h.db.Tasks().GetByID(c.Request.Context(), order.TaskID)
		if err != nil {
			log.Printf("Failed to fetch task %d: %v", order.TaskID, err)
			continue
		}

		// Check if task belongs to the specified project
		if currentTask.ProjectID != projectID {
			continue
		}

		// Update task if position changed
		if order.NewPosition != currentTask.SortOrder {
			updateTask := *currentTask // Copy the current task
			updateTask.SortOrder = order.NewPosition

			_, err = h.db.Tasks().Update(c.Request.Context(), &updateTask)
			if err != nil {
				log.Printf("Failed to update task %d: %v", order.TaskID, err)
				continue
			}

			updatedTasks = append(updatedTasks, map[string]interface{}{
				"task_id":      order.TaskID,
				"title":        currentTask.Title,
				"old_position": currentTask.SortOrder,
				"new_position": order.NewPosition,
			})
		}
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
		"project_id":    projectID,
		"parent_id":     request.ParentID,
		"updated_tasks": updatedTasks,
		"total_updated": len(updatedTasks),
	}, fmt.Sprintf("成功重排序 %d 个任务", len(updatedTasks))))
}
