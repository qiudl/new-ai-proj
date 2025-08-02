package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"time"
)

// TaskType represents the type of task for timing
type TaskType string

const (
	TaskTypePersonal TaskType = "personal"
	TaskTypeProject  TaskType = "project"
)

// TimerAction represents timer operations
type TimerAction string

const (
	TimerActionStart  TimerAction = "start"
	TimerActionStop   TimerAction = "stop"
	TimerActionPause  TimerAction = "pause"
	TimerActionResume TimerAction = "resume"
)

// TimerService provides unified timer operations
type TimerService struct {
	db database.DB
}

// NewTimerService creates a new TimerService instance
func NewTimerService(db database.DB) *TimerService {
	return &TimerService{
		db: db,
	}
}

// StartTimerRequest represents a unified start timer request
type StartTimerRequest struct {
	TaskType        TaskType `json:"task_type" validate:"required,oneof=personal project"`
	TaskID          int      `json:"task_id" validate:"required,gt=0"`
	AutoStopOthers  bool     `json:"auto_stop_others"`
}

// TimerResponse represents a unified timer response
type TimerResponse struct {
	Success     bool      `json:"success"`
	Message     string    `json:"message"`
	TaskID      int       `json:"task_id"`
	TaskTitle   string    `json:"task_title"`
	TaskType    TaskType  `json:"task_type"`
	Status      string    `json:"status"`
	StartTime   time.Time `json:"start_time,omitempty"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	Duration    int       `json:"duration_seconds,omitempty"`
}

// CurrentTimerResponse represents current timer status
type CurrentTimerResponse struct {
	IsRunning      bool      `json:"is_running"`
	IsPaused       bool      `json:"is_paused"`
	TaskID         *int      `json:"task_id,omitempty"`
	TaskTitle      string    `json:"task_title"`
	TaskType       string    `json:"task_type"`
	StartTime      *time.Time `json:"start_time,omitempty"`
	ElapsedSeconds int       `json:"elapsed_seconds"`
}

// StartTimer starts timing for a task (personal or project)
func (s *TimerService) StartTimer(ctx context.Context, userID int, req StartTimerRequest) (*TimerResponse, error) {
	// Begin transaction for concurrent safety
	tx, err := s.db.GetDB().(*sql.DB).BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Get user with lock
	user, err := s.getUserWithLock(ctx, tx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Stop current timer if auto_stop_others is true
	if req.AutoStopOthers {
		if err := s.stopCurrentTimerWithTx(ctx, tx, user); err != nil {
			return nil, fmt.Errorf("failed to stop current timer: %w", err)
		}
	} else {
		// Check if another timer is running
		if user.TimingStatus == string(models.TimingStatusRunning) {
			var currentTaskName string
			if user.CurrentUserTimerTaskID != nil {
				currentTaskName = "Personal Task"
			} else if user.CurrentTimingTaskID != nil {
				currentTaskName = "Project Task"
			}
			return nil, fmt.Errorf("another timer is already running: %s", currentTaskName)
		}
	}

	// Validate and get task based on type
	var taskTitle string
	switch req.TaskType {
	case TaskTypePersonal:
		task, err := s.getPersonalTaskWithAccess(ctx, tx, req.TaskID, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to get personal task: %w", err)
		}
		taskTitle = task.Title
		user.CurrentUserTimerTaskID = &req.TaskID
		user.CurrentTimingTaskID = nil
	case TaskTypeProject:
		task, err := s.getProjectTaskWithAccess(ctx, tx, req.TaskID, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to get project task: %w", err)
		}
		taskTitle = task.Title
		user.CurrentTimingTaskID = &req.TaskID
		user.CurrentUserTimerTaskID = nil
	default:
		return nil, fmt.Errorf("invalid task type: %s", req.TaskType)
	}

	// Update user timing status
	user.TimingStatus = string(models.TimingStatusRunning)
	user.TimingStartTime = time.Now()

	if err := s.updateUserWithTx(ctx, tx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &TimerResponse{
		Success:   true,
		Message:   fmt.Sprintf("Timer started for %s task", req.TaskType),
		TaskID:    req.TaskID,
		TaskTitle: taskTitle,
		TaskType:  req.TaskType,
		Status:    "running",
		StartTime: user.TimingStartTime,
	}, nil
}

// StopTimer stops the current timer
func (s *TimerService) StopTimer(ctx context.Context, userID int) (*TimerResponse, error) {
	// Begin transaction for concurrent safety
	tx, err := s.db.GetDB().(*sql.DB).BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelSerializable,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Get user with lock
	user, err := s.getUserWithLock(ctx, tx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check if timer is running
	if user.TimingStatus != string(models.TimingStatusRunning) {
		return nil, fmt.Errorf("no timer is currently running")
	}

	// Calculate duration and create time log
	endTime := time.Now()
	duration := int(endTime.Sub(user.TimingStartTime).Seconds())
	
	var taskID int
	var taskTitle string
	var taskType TaskType

	if user.CurrentUserTimerTaskID != nil {
		taskID = *user.CurrentUserTimerTaskID
		taskType = TaskTypePersonal
		// Get task title for response
		if task, err := s.getPersonalTaskByID(ctx, tx, taskID); err == nil {
			taskTitle = task.Title
		}
	} else if user.CurrentTimingTaskID != nil {
		taskID = *user.CurrentTimingTaskID
		taskType = TaskTypeProject
		// Get task title for response
		if task, err := s.getProjectTaskByID(ctx, tx, taskID); err == nil {
			taskTitle = task.Title
		}
	}

	// Create time log
	timeLog := &models.TaskTimeLog{
		TaskID:          taskID,
		UserID:          userID,
		StartTime:       user.TimingStartTime,
		EndTime:         endTime,
		DurationSeconds: duration,
		CreatedBy:       userID,
	}

	if err := s.createTimeLogWithTx(ctx, tx, timeLog); err != nil {
		return nil, fmt.Errorf("failed to create time log: %w", err)
	}

	// Update user status
	user.TimingStatus = string(models.TimingStatusStopped)
	user.CurrentTimingTaskID = nil
	user.CurrentUserTimerTaskID = nil
	user.TimingStartTime = time.Time{}

	if err := s.updateUserWithTx(ctx, tx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &TimerResponse{
		Success:  true,
		Message:  "Timer stopped successfully",
		TaskID:   taskID,
		TaskTitle: taskTitle,
		TaskType: taskType,
		Status:   "stopped",
		EndTime:  &endTime,
		Duration: duration,
	}, nil
}

// GetCurrentTimer returns the current timer status
func (s *TimerService) GetCurrentTimer(ctx context.Context, userID int) (*CurrentTimerResponse, error) {
	user, err := s.db.Users().GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	response := &CurrentTimerResponse{
		IsRunning: user.TimingStatus == string(models.TimingStatusRunning),
		IsPaused:  false, // Will be implemented in Phase 3
	}

	if response.IsRunning {
		var taskID int
		var taskTitle string
		var taskType string

		if user.CurrentUserTimerTaskID != nil {
			taskID = *user.CurrentUserTimerTaskID
			taskType = string(TaskTypePersonal)
			// Get task title
			if task, err := s.db.UserTimer().GetByID(ctx, taskID); err == nil {
				taskTitle = task.Title
			}
		} else if user.CurrentTimingTaskID != nil {
			taskID = *user.CurrentTimingTaskID
			taskType = string(TaskTypeProject)
			// Get task title
			if task, err := s.db.Tasks().GetByID(ctx, taskID); err == nil {
				taskTitle = task.Title
			}
		}

		response.TaskID = &taskID
		response.TaskTitle = taskTitle
		response.TaskType = taskType
		response.StartTime = &user.TimingStartTime
		response.ElapsedSeconds = int(time.Since(user.TimingStartTime).Seconds())
	}

	return response, nil
}

// Helper methods (extracted from existing handlers)

func (s *TimerService) getUserWithLock(ctx context.Context, tx *sql.Tx, userID int) (*models.User, error) {
	var user models.User
	query := `
		SELECT id, username, email, role, timing_status, current_timing_task_id, 
			   timing_start_time, current_user_timer_task_id, created_at, updated_at
		FROM users 
		WHERE id = $1 
		FOR UPDATE`
	
	err := tx.QueryRowContext(ctx, query, userID).Scan(
		&user.ID, &user.Username, &user.Email, &user.Role,
		&user.TimingStatus, &user.CurrentTimingTaskID, &user.TimingStartTime,
		&user.CurrentUserTimerTaskID, &user.CreatedAt, &user.UpdatedAt,
	)
	return &user, err
}

func (s *TimerService) getPersonalTaskWithAccess(ctx context.Context, tx *sql.Tx, taskID, userID int) (*models.UserTimerTask, error) {
	var task models.UserTimerTask
	query := `
		SELECT id, user_id, title, description, category, priority, status, 
			   color, is_favorite, total_time_seconds, target_time_seconds, 
			   tags, metadata, created_at, updated_at
		FROM user_timer_tasks 
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`
	
	err := tx.QueryRowContext(ctx, query, taskID, userID).Scan(
		&task.ID, &task.UserID, &task.Title, &task.Description, &task.Category,
		&task.Priority, &task.Status, &task.Color, &task.IsFavorite,
		&task.TotalTimeSeconds, &task.TargetTimeSeconds, &task.Tags, &task.Metadata,
		&task.CreatedAt, &task.UpdatedAt,
	)
	return &task, err
}

func (s *TimerService) getProjectTaskWithAccess(ctx context.Context, tx *sql.Tx, taskID, userID int) (*models.Task, error) {
	var task models.Task
	query := `
		SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
			   t.project_id, t.assigned_to, t.created_by, t.created_at, t.updated_at
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		WHERE t.id = $1 AND (p.owner_id = $2 OR t.assigned_to = $2) AND t.deleted_at IS NULL`
	
	err := tx.QueryRowContext(ctx, query, taskID, userID).Scan(
		&task.ID, &task.Title, &task.Description, &task.Status, &task.Priority, &task.DueDate,
		&task.ProjectID, &task.AssignedTo, &task.CreatedBy, &task.CreatedAt, &task.UpdatedAt,
	)
	return &task, err
}

func (s *TimerService) getPersonalTaskByID(ctx context.Context, tx *sql.Tx, taskID int) (*models.UserTimerTask, error) {
	var task models.UserTimerTask
	query := `SELECT id, title FROM user_timer_tasks WHERE id = $1`
	err := tx.QueryRowContext(ctx, query, taskID).Scan(&task.ID, &task.Title)
	return &task, err
}

func (s *TimerService) getProjectTaskByID(ctx context.Context, tx *sql.Tx, taskID int) (*models.Task, error) {
	var task models.Task
	query := `SELECT id, title FROM tasks WHERE id = $1`
	err := tx.QueryRowContext(ctx, query, taskID).Scan(&task.ID, &task.Title)
	return &task, err
}

func (s *TimerService) updateUserWithTx(ctx context.Context, tx *sql.Tx, user *models.User) error {
	query := `
		UPDATE users 
		SET timing_status = $2, current_timing_task_id = $3, timing_start_time = $4,
			current_user_timer_task_id = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1`
	
	_, err := tx.ExecContext(ctx, query, user.ID, user.TimingStatus, 
		user.CurrentTimingTaskID, user.TimingStartTime, user.CurrentUserTimerTaskID)
	return err
}

func (s *TimerService) createTimeLogWithTx(ctx context.Context, tx *sql.Tx, log *models.TaskTimeLog) error {
	query := `
		INSERT INTO task_time_logs (task_id, user_id, start_time, end_time, duration_seconds, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)`
	
	_, err := tx.ExecContext(ctx, query, log.TaskID, log.UserID, log.StartTime, 
		log.EndTime, log.DurationSeconds, log.CreatedBy)
	return err
}

func (s *TimerService) stopCurrentTimerWithTx(ctx context.Context, tx *sql.Tx, user *models.User) error {
	if user.TimingStatus != string(models.TimingStatusRunning) {
		return nil // No timer running
	}

	// Calculate duration and create time log
	endTime := time.Now()
	duration := int(endTime.Sub(user.TimingStartTime).Seconds())
	
	var taskID int
	if user.CurrentUserTimerTaskID != nil {
		taskID = *user.CurrentUserTimerTaskID
	} else if user.CurrentTimingTaskID != nil {
		taskID = *user.CurrentTimingTaskID
	} else {
		return nil // No task ID found
	}

	// Create time log
	timeLog := &models.TaskTimeLog{
		TaskID:          taskID,
		UserID:          user.ID,
		StartTime:       user.TimingStartTime,
		EndTime:         endTime,
		DurationSeconds: duration,
		CreatedBy:       user.ID,
	}

	return s.createTimeLogWithTx(ctx, tx, timeLog)
}