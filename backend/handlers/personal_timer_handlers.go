package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// PersonalTimerHandler handles personal timer operations (start/stop/pause)
type PersonalTimerHandler struct {
	db database.DB
}

// NewPersonalTimerHandler creates a new PersonalTimerHandler
func NewPersonalTimerHandler(db database.DB) *PersonalTimerHandler {
	return &PersonalTimerHandler{db: db}
}

// StartPersonalTimer handles POST /api/v1/user/timer/start-personal
func (h *PersonalTimerHandler) StartPersonalTimer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		TaskID         int  `json:"task_id" validate:"required"`
		AutoStopOthers bool `json:"auto_stop_others"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if req.TaskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid task ID",
			"details": "Task ID must be a positive integer",
		})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Use transaction for concurrent safety
	tx, err := h.db.GetDB().(*sql.DB).BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start transaction",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// Get user with lock
	user, err := h.getUserWithLock(ctx, tx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user",
			"details": err.Error(),
		})
		return
	}

	// Check if user owns the personal timer task
	owned, err := h.db.UserTimer().CheckUserOwnership(ctx, req.TaskID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to verify task ownership",
			"details": err.Error(),
		})
		return
	}

	if !owned {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this task"})
		return
	}

	// Get personal timer task
	task, err := h.db.UserTimer().GetByID(ctx, req.TaskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Personal timer task not found"})
		return
	}

	// Check if user already has this personal task running
	if user.TimingStatus == string(models.TimingStatusRunning) &&
		user.CurrentUserTimerTaskID != nil && *user.CurrentUserTimerTaskID == req.TaskID {
		// Same personal task is already running, return current state
		c.JSON(http.StatusOK, models.TimerStartResponse{
			TaskID:    req.TaskID,
			TaskTitle: task.Title,
			StartTime: *user.TimingStartTime,
			Status:    "already_running",
			Message:   "Timer is already running for this personal task",
		})
		return
	}

	// Stop current timer if running and auto_stop_others is true
	if user.TimingStatus == string(models.TimingStatusRunning) {
		if req.AutoStopOthers {
			if err := h.stopCurrentTimerWithTx(ctx, tx, user); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to stop current timer",
					"details": err.Error(),
				})
				return
			}
		} else {
			// Return error if another timer is running and auto_stop_others is false
			currentTaskName := "Unknown Task"
			if user.CurrentUserTimerTaskID != nil {
				if currentTask, err := h.db.UserTimer().GetByID(ctx, *user.CurrentUserTimerTaskID); err == nil {
					currentTaskName = currentTask.Title
				}
			} else if user.CurrentTimingTaskID != nil {
				if currentTask, err := h.db.Tasks().GetByID(ctx, *user.CurrentTimingTaskID); err == nil {
					currentTaskName = currentTask.Title
				}
			}

			c.JSON(http.StatusConflict, gin.H{
				"error":   "Another timer is already running",
				"message": "您当前正在为 \"" + currentTaskName + "\" 计时，请先停止当前计时或设置自动停止",
				"current_task": gin.H{
					"name": currentTaskName,
					"type": func() string {
						if user.CurrentUserTimerTaskID != nil {
							return "personal"
						}
						return "project"
					}(),
				},
			})
			return
		}
	}

	// Start new personal timer
	now := time.Now()
	user.CurrentUserTimerTaskID = &req.TaskID
	user.CurrentTimingTaskID = nil // Clear project task
	user.TimingStartTime = &now
	user.TimingStatus = string(models.TimingStatusRunning)

	if err := h.updateUserWithTx(ctx, tx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start personal timer",
			"details": err.Error(),
		})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to commit timer start",
			"details": err.Error(),
		})
		return
	}

	response := models.TimerStartResponse{
		TaskID:    req.TaskID,
		TaskTitle: task.Title,
		StartTime: now,
		Status:    "running",
		Message:   "Personal timer started successfully",
	}

	c.JSON(http.StatusOK, response)
}

// StartProjectTimer handles POST /api/v1/user/timer/start-project  
func (h *PersonalTimerHandler) StartProjectTimer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		TaskID         int  `json:"task_id" validate:"required"`
		AutoStopOthers bool `json:"auto_stop_others"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	if req.TaskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid task ID",
			"details": "Task ID must be a positive integer",
		})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Use transaction for concurrent safety
	tx, err := h.db.GetDB().(*sql.DB).BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start transaction",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// Get user with lock
	user, err := h.getUserWithLock(ctx, tx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user",
			"details": err.Error(),
		})
		return
	}

	// Get project task to verify it exists and user has access
	task, err := h.getProjectTaskWithAccess(ctx, tx, req.TaskID, uid)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Project task not found",
				"details": "Task does not exist or you don't have access to it",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to verify project task",
			"details": err.Error(),
		})
		return
	}

	// Check if user already has this project task running
	if user.TimingStatus == string(models.TimingStatusRunning) &&
		user.CurrentTimingTaskID != nil && *user.CurrentTimingTaskID == req.TaskID {
		// Same project task is already running, return current state
		c.JSON(http.StatusOK, models.TimerStartResponse{
			TaskID:    req.TaskID,
			TaskTitle: task.Title,
			StartTime: *user.TimingStartTime,
			Status:    "already_running",
			Message:   "Timer is already running for this project task",
		})
		return
	}

	// Stop current timer if running and auto_stop_others is true
	if user.TimingStatus == string(models.TimingStatusRunning) {
		if req.AutoStopOthers {
			if err := h.stopCurrentTimerWithTx(ctx, tx, user); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to stop current timer",
					"details": err.Error(),
				})
				return
			}
		} else {
			// Return error if another timer is running
			currentTaskName := "Unknown Task"
			if user.CurrentUserTimerTaskID != nil {
				if currentTask, err := h.db.UserTimer().GetByID(ctx, *user.CurrentUserTimerTaskID); err == nil {
					currentTaskName = currentTask.Title
				}
			} else if user.CurrentTimingTaskID != nil {
				if currentTask, err := h.db.Tasks().GetByID(ctx, *user.CurrentTimingTaskID); err == nil {
					currentTaskName = currentTask.Title
				}
			}

			c.JSON(http.StatusConflict, gin.H{
				"error":   "Another timer is already running",
				"message": "您当前正在为 \"" + currentTaskName + "\" 计时，请先停止当前计时或设置自动停止",
				"current_task": gin.H{
					"name": currentTaskName,
					"type": func() string {
						if user.CurrentUserTimerTaskID != nil {
							return "personal"
						}
						return "project"
					}(),
				},
			})
			return
		}
	}

	// Start new project timer
	now := time.Now()
	user.CurrentTimingTaskID = &req.TaskID
	user.CurrentUserTimerTaskID = nil // Clear personal task
	user.TimingStartTime = &now
	user.TimingStatus = string(models.TimingStatusRunning)

	if err := h.updateUserWithTx(ctx, tx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start project timer",
			"details": err.Error(),
		})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to commit timer start",
			"details": err.Error(),
		})
		return
	}

	response := models.TimerStartResponse{
		TaskID:    req.TaskID,
		TaskTitle: task.Title,
		StartTime: now,
		Status:    "running",
		Message:   "Project timer started successfully",
	}

	c.JSON(http.StatusOK, response)
}

// StopTimer handles POST /api/v1/user/timer/stop
func (h *PersonalTimerHandler) StopTimer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Use transaction for concurrent safety
	tx, err := h.db.GetDB().(*sql.DB).BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start transaction",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// Get user with lock
	user, err := h.getUserWithLock(ctx, tx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user",
			"details": err.Error(),
		})
		return
	}

	// Check if timer is running
	if user.TimingStatus != string(models.TimingStatusRunning) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "No timer is currently running",
			"details": "Cannot stop timer that is not running",
		})
		return
	}

	if user.CurrentTimingTaskID == nil && user.CurrentUserTimerTaskID == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "No timer task is currently active",
			"details": "Cannot stop timer without an active task",
		})
		return
	}

	// Calculate duration
	endTime := time.Now()
	durationSeconds := int(endTime.Sub(*user.TimingStartTime).Seconds())

	// Ensure minimum duration of 1 second
	if durationSeconds < 1 {
		durationSeconds = 1
	}

	var taskTitle string
	var taskID int

	// Create time log entry
	timeLog := &models.TaskTimeLog{
		UserID:          uid,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	// Determine task type and set appropriate fields
	if user.CurrentUserTimerTaskID != nil {
		// Personal timer task
		taskID = *user.CurrentUserTimerTaskID
		timeLog.UserTimerTaskID = user.CurrentUserTimerTaskID

		// Get personal task info
		personalTask, err := h.db.UserTimer().GetByID(ctx, *user.CurrentUserTimerTaskID)
		if err != nil {
			taskTitle = "Deleted Personal Task"
		} else {
			taskTitle = personalTask.Title
		}
	} else if user.CurrentTimingTaskID != nil {
		// Project task
		taskID = *user.CurrentTimingTaskID
		timeLog.TaskID = user.CurrentTimingTaskID

		// Get project task info
		projectTask, err := h.getProjectTaskByID(ctx, tx, *user.CurrentTimingTaskID)
		if err != nil {
			taskTitle = "Deleted Project Task"
		} else {
			taskTitle = projectTask.Title
		}
	}

	// Create time log entry
	if err := h.createTimeLogWithTx(ctx, tx, timeLog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create time log",
			"details": err.Error(),
		})
		return
	}

	// Update task total time (handled by triggers, but we can also do it manually for reliability)
	// The triggers will automatically update the total_time_seconds for both personal and project tasks

	// Clear user timer state
	user.CurrentTimingTaskID = nil
	user.CurrentUserTimerTaskID = nil
	user.TimingStartTime = nil
	user.TimingStatus = string(models.TimingStatusStopped)

	if err := h.updateUserWithTx(ctx, tx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to stop timer",
			"details": err.Error(),
		})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to commit timer stop",
			"details": err.Error(),
		})
		return
	}

	response := models.TimerStopResponse{
		TaskID:          taskID,
		TaskTitle:       taskTitle,
		DurationSeconds: durationSeconds,
		FormattedTime:   models.FormatDuration(durationSeconds),
		Status:          "stopped",
		Message:         "Timer stopped successfully",
	}

	c.JSON(http.StatusOK, response)
}

// GetCurrentTimer handles GET /api/v1/user/timer/current
func (h *PersonalTimerHandler) GetCurrentTimer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Get current user
	user, err := h.db.Users().GetByID(ctx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get user",
			"details": err.Error(),
		})
		return
	}

	response := &models.PersonalTimerCurrent{
		IsRunning:     user.TimingStatus == string(models.TimingStatusRunning),
		ElapsedSeconds: 0,
		FormattedTime: "00:00:00",
	}

	// If timer is running, get task details and calculate elapsed time
	if response.IsRunning && user.TimingStartTime != nil {
		response.StartTime = user.TimingStartTime
		response.ElapsedSeconds = models.GetElapsedSeconds(*user.TimingStartTime)
		response.FormattedTime = models.FormatDuration(response.ElapsedSeconds)

		if user.CurrentUserTimerTaskID != nil {
			// Personal timer task
			response.TaskType = "personal"
			taskID := *user.CurrentUserTimerTaskID
			response.TaskID = &taskID

			personalTask, err := h.db.UserTimer().GetByID(ctx, *user.CurrentUserTimerTaskID)
			if err == nil {
				response.TaskTitle = &personalTask.Title
				response.TaskColor = &personalTask.Color
				response.TaskCategory = &personalTask.Category
			}
		} else if user.CurrentTimingTaskID != nil {
			// Project task
			response.TaskType = "project"
			taskID := *user.CurrentTimingTaskID
			response.TaskID = &taskID

			projectTask, err := h.db.Tasks().GetByID(ctx, *user.CurrentTimingTaskID)
			if err == nil {
				response.TaskTitle = &projectTask.Title
				defaultColor := "#1890ff"
				response.TaskColor = &defaultColor
				defaultCategory := "work"
				response.TaskCategory = &defaultCategory
			}
		}
	}

	c.JSON(http.StatusOK, response)
}

// Helper methods for transaction-safe operations

func (h *PersonalTimerHandler) getUserWithLock(ctx context.Context, tx *sql.Tx, userID int) (*models.User, error) {
	var user models.User
	query := `
		SELECT id, username, email, role, user_type, 
		       current_timing_task_id, current_user_timer_task_id, timing_start_time, timing_status,
		       created_at, updated_at
		FROM users 
		WHERE id = $1 
		FOR UPDATE`

	row := tx.QueryRowContext(ctx, query, userID)
	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.Role, &user.UserType,
		&user.CurrentTimingTaskID, &user.CurrentUserTimerTaskID, &user.TimingStartTime, &user.TimingStatus,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (h *PersonalTimerHandler) getProjectTaskWithAccess(ctx context.Context, tx *sql.Tx, taskID, userID int) (*models.Task, error) {
	var task models.Task
	query := `
		SELECT t.id, t.title, t.description, t.status,
		       t.project_id, t.assignee_id, t.due_date, t.custom_fields,
		       t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.created_at, t.updated_at, t.deleted_at
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		WHERE t.id = $1 
		  AND t.deleted_at IS NULL
		  AND (t.assignee_id = $2 OR p.owner_id = $2)
		FOR UPDATE`

	row := tx.QueryRowContext(ctx, query, taskID, userID)
	err := row.Scan(
		&task.ID, &task.Title, &task.Description, &task.Status,
		&task.ProjectID, &task.AssigneeID, &task.DueDate, &task.CustomFields,
		&task.ParentID, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
		&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return &task, nil
}

func (h *PersonalTimerHandler) getProjectTaskByID(ctx context.Context, tx *sql.Tx, taskID int) (*models.Task, error) {
	var task models.Task
	query := `
		SELECT id, title, description, status,
		       project_id, assignee_id, due_date, custom_fields,
		       parent_id, task_level, sort_order, total_time_seconds,
		       created_at, updated_at, deleted_at
		FROM tasks 
		WHERE id = $1`

	row := tx.QueryRowContext(ctx, query, taskID)
	err := row.Scan(
		&task.ID, &task.Title, &task.Description, &task.Status,
		&task.ProjectID, &task.AssigneeID, &task.DueDate, &task.CustomFields,
		&task.ParentID, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
		&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return &task, nil
}

func (h *PersonalTimerHandler) updateUserWithTx(ctx context.Context, tx *sql.Tx, user *models.User) error {
	query := `
		UPDATE users 
		SET current_timing_task_id = $2, 
		    current_user_timer_task_id = $3,
		    timing_start_time = $4, 
		    timing_status = $5,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := tx.ExecContext(ctx, query,
		user.ID, user.CurrentTimingTaskID, user.CurrentUserTimerTaskID,
		user.TimingStartTime, user.TimingStatus)
	return err
}

func (h *PersonalTimerHandler) createTimeLogWithTx(ctx context.Context, tx *sql.Tx, log *models.TaskTimeLog) error {
	query := `
		INSERT INTO task_time_logs (task_id, user_timer_task_id, user_id, start_time, end_time, duration_seconds, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $3)
		RETURNING id, created_at, updated_at`

	row := tx.QueryRowContext(ctx, query, log.TaskID, log.UserTimerTaskID, log.UserID, log.StartTime, log.EndTime, log.DurationSeconds)
	return row.Scan(&log.ID, &log.CreatedAt, &log.UpdatedAt)
}

func (h *PersonalTimerHandler) stopCurrentTimerWithTx(ctx context.Context, tx *sql.Tx, user *models.User) error {
	if user.TimingStatus != string(models.TimingStatusRunning) {
		return nil // No timer running
	}

	if user.CurrentTimingTaskID == nil && user.CurrentUserTimerTaskID == nil {
		return nil // No task to stop
	}

	// Calculate duration
	endTime := time.Now()
	durationSeconds := int(endTime.Sub(*user.TimingStartTime).Seconds())
	if durationSeconds < 1 {
		durationSeconds = 1
	}

	// Create time log entry
	timeLog := &models.TaskTimeLog{
		UserID:          user.ID,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	// Set task ID based on current timer type
	if user.CurrentUserTimerTaskID != nil {
		timeLog.UserTimerTaskID = user.CurrentUserTimerTaskID
	} else if user.CurrentTimingTaskID != nil {
		timeLog.TaskID = user.CurrentTimingTaskID
	}

	if err := h.createTimeLogWithTx(ctx, tx, timeLog); err != nil {
		return err
	}

	return nil
}