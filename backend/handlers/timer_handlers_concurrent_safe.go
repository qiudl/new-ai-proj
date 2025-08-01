package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"ai-project-backend/database"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
)

// ConcurrentSafeTimerHandler provides thread-safe timer operations
type ConcurrentSafeTimerHandler struct {
	db database.DB
}

func NewConcurrentSafeTimerHandler(db database.DB) *ConcurrentSafeTimerHandler {
	return &ConcurrentSafeTimerHandler{db: db}
}

// StartTimerConcurrentSafe handles POST /api/timer/start with concurrent safety
func (h *ConcurrentSafeTimerHandler) StartTimerConcurrentSafe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.TimerStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format", 
			"details": err.Error(),
		})
		return
	}

	// Enhanced validation
	if req.TaskID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid task ID",
			"details": "Task ID must be a positive integer",
		})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Use transaction with serializable isolation for concurrent safety
	tx, err := h.db.GetDB().(*sql.DB).BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to start transaction",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// Get user with row-level lock to prevent concurrent modifications
	user, err := h.getUserWithLock(ctx, tx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user",
			"details": err.Error(),
		})
		return
	}

	// Check if user already has a running timer
	if user.TimingStatus == string(models.TimingStatusRunning) {
		if user.CurrentTimingTaskID != nil && *user.CurrentTimingTaskID == req.TaskID {
			// Same task is already running, return current state
			c.JSON(http.StatusOK, models.TimerStartResponse{
				TaskID:    req.TaskID,
				TaskTitle: "Task already running",
				StartTime: *user.TimingStartTime,
				Status:    "already_running",
				Message:   "Timer is already running for this task",
			})
			return
		}

		// Stop current timer before starting new one
		if err := h.stopCurrentTimerWithTx(ctx, tx, user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to stop current timer",
				"details": err.Error(),
			})
			return
		}
	}

	// Verify task exists and user has access
	task, err := h.getTaskWithAccess(ctx, tx, req.TaskID, uid)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Task not found",
				"details": "Task does not exist or you don't have access to it",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to verify task",
			"details": err.Error(),
		})
		return
	}

	// Start new timer
	now := time.Now()
	user.CurrentTimingTaskID = &req.TaskID
	user.TimingStartTime = &now
	user.TimingStatus = string(models.TimingStatusRunning)

	if err := h.updateUserWithTx(ctx, tx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to start timer",
			"details": err.Error(),
		})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to commit timer start",
			"details": err.Error(),
		})
		return
	}

	response := models.TimerStartResponse{
		TaskID:    req.TaskID,
		TaskTitle: task.Title,
		StartTime: now,
		Status:    "running",
		Message:   "Timer started successfully",
	}

	c.JSON(http.StatusOK, response)
}

// StopTimerConcurrentSafe handles POST /api/timer/stop with concurrent safety
func (h *ConcurrentSafeTimerHandler) StopTimerConcurrentSafe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// Use transaction with serializable isolation
	tx, err := h.db.GetDB().(*sql.DB).BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to start transaction",
			"details": err.Error(),
		})
		return
	}
	defer tx.Rollback()

	// Get user with row-level lock
	user, err := h.getUserWithLock(ctx, tx, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user",
			"details": err.Error(),
		})
		return
	}

	// Check if timer is running
	if user.TimingStatus != string(models.TimingStatusRunning) || user.CurrentTimingTaskID == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No timer is currently running",
			"details": "Cannot stop timer that is not running",
		})
		return
	}

	// Get task info
	task, err := h.getTaskByID(ctx, tx, *user.CurrentTimingTaskID)
	if err != nil {
		// Task might have been deleted, but we can still stop the timer
		task = &models.Task{
			ID:    *user.CurrentTimingTaskID,
			Title: "Deleted Task",
		}
	}

	// Calculate duration
	endTime := time.Now()
	durationSeconds := int(endTime.Sub(*user.TimingStartTime).Seconds())

	// Ensure minimum duration of 1 second
	if durationSeconds < 1 {
		durationSeconds = 1
	}

	// Create time log entry
	timeLog := &models.TaskTimeLog{
		TaskID:          *user.CurrentTimingTaskID,
		UserID:          uid,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	if err := h.createTimeLogWithTx(ctx, tx, timeLog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create time log",
			"details": err.Error(),
		})
		return
	}

	// Update task total time if task still exists
	if task.Title != "Deleted Task" {
		task.TotalTimeSeconds += durationSeconds
		if err := h.updateTaskWithTx(ctx, tx, task); err != nil {
			// Log error but don't fail the operation
			fmt.Printf("Warning: Failed to update task total time: %v\n", err)
		}
	}

	// Clear user timer state
	user.CurrentTimingTaskID = nil
	user.TimingStartTime = nil
	user.TimingStatus = string(models.TimingStatusStopped)

	if err := h.updateUserWithTx(ctx, tx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to stop timer",
			"details": err.Error(),
		})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to commit timer stop",
			"details": err.Error(),
		})
		return
	}

	response := models.TimerStopResponse{
		TaskID:          task.ID,
		TaskTitle:       task.Title,
		DurationSeconds: durationSeconds,
		FormattedTime:   models.FormatDuration(durationSeconds),
		Status:          "stopped",
		Message:         "Timer stopped successfully",
	}

	c.JSON(http.StatusOK, response)
}

// Helper methods for transaction-safe operations

func (h *ConcurrentSafeTimerHandler) getUserWithLock(ctx context.Context, tx *sql.Tx, userID int) (*models.User, error) {
	var user models.User
	query := `
		SELECT id, username, email, role, user_type, 
		       current_timing_task_id, timing_start_time, timing_status,
		       created_at, updated_at
		FROM users 
		WHERE id = $1 
		FOR UPDATE`

	row := tx.QueryRowContext(ctx, query, userID)
	err := row.Scan(
		&user.ID, &user.Username, &user.Email, &user.Role, &user.UserType,
		&user.CurrentTimingTaskID, &user.TimingStartTime, &user.TimingStatus,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (h *ConcurrentSafeTimerHandler) getTaskWithAccess(ctx context.Context, tx *sql.Tx, taskID, userID int) (*models.Task, error) {
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

func (h *ConcurrentSafeTimerHandler) getTaskByID(ctx context.Context, tx *sql.Tx, taskID int) (*models.Task, error) {
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

func (h *ConcurrentSafeTimerHandler) updateUserWithTx(ctx context.Context, tx *sql.Tx, user *models.User) error {
	query := `
		UPDATE users 
		SET current_timing_task_id = $2, 
		    timing_start_time = $3, 
		    timing_status = $4,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := tx.ExecContext(ctx, query, 
		user.ID, user.CurrentTimingTaskID, user.TimingStartTime, user.TimingStatus)
	return err
}

func (h *ConcurrentSafeTimerHandler) updateTaskWithTx(ctx context.Context, tx *sql.Tx, task *models.Task) error {
	query := `
		UPDATE tasks 
		SET total_time_seconds = $2,
		    updated_at = NOW()
		WHERE id = $1`

	_, err := tx.ExecContext(ctx, query, task.ID, task.TotalTimeSeconds)
	return err
}

func (h *ConcurrentSafeTimerHandler) createTimeLogWithTx(ctx context.Context, tx *sql.Tx, log *models.TaskTimeLog) error {
	query := `
		INSERT INTO task_time_logs (task_id, user_id, start_time, end_time, duration_seconds, created_by)
		VALUES ($1, $2, $3, $4, $5, $2)
		RETURNING id, created_at, updated_at`

	row := tx.QueryRowContext(ctx, query, log.TaskID, log.UserID, log.StartTime, log.EndTime, log.DurationSeconds)
	return row.Scan(&log.ID, &log.CreatedAt, &log.UpdatedAt)
}

func (h *ConcurrentSafeTimerHandler) stopCurrentTimerWithTx(ctx context.Context, tx *sql.Tx, user *models.User) error {
	if user.TimingStatus != string(models.TimingStatusRunning) || user.CurrentTimingTaskID == nil {
		return nil // No timer running
	}

	// Calculate duration
	endTime := time.Now()
	durationSeconds := int(endTime.Sub(*user.TimingStartTime).Seconds())
	if durationSeconds < 1 {
		durationSeconds = 1
	}

	// Create time log entry
	timeLog := &models.TaskTimeLog{
		TaskID:          *user.CurrentTimingTaskID,
		UserID:          user.ID,
		StartTime:       *user.TimingStartTime,
		EndTime:         &endTime,
		DurationSeconds: durationSeconds,
	}

	if err := h.createTimeLogWithTx(ctx, tx, timeLog); err != nil {
		return err
	}

	// Update task total time (skip if task has been deleted)
	task, err := h.getTaskByID(ctx, tx, *user.CurrentTimingTaskID)
	if err == nil {
		task.TotalTimeSeconds += durationSeconds
		if err := h.updateTaskWithTx(ctx, tx, task); err != nil {
			return err
		}
	}

	return nil
}