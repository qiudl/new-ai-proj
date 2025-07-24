package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/models"
)

// PostgresTimerRepository implements TimerRepository using PostgreSQL
type PostgresTimerRepository struct {
	db interface{}
}

// NewTimerRepository creates a new timer repository
func NewTimerRepository(db interface{}) TimerRepository {
	return &PostgresTimerRepository{db: db}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresTimerRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new task time log entry
func (r *PostgresTimerRepository) Create(ctx context.Context, log *models.TaskTimeLog) error {
	query := `
		INSERT INTO task_time_logs (task_id, user_id, start_time, end_time, duration_seconds)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at`

	row := r.getExecer().QueryRowContext(ctx, query, log.TaskID, log.UserID, log.StartTime, log.EndTime, log.DurationSeconds)
	return row.Scan(&log.ID, &log.CreatedAt, &log.UpdatedAt)
}

// GetByID retrieves a task time log by ID
func (r *PostgresTimerRepository) GetByID(ctx context.Context, id int) (*models.TaskTimeLog, error) {
	var log models.TaskTimeLog
	query := `
		SELECT id, task_id, user_id, start_time, end_time, duration_seconds, created_at, updated_at
		FROM task_time_logs
		WHERE id = $1`

	row := r.getExecer().QueryRowContext(ctx, query, id)
	err := row.Scan(&log.ID, &log.TaskID, &log.UserID, &log.StartTime, &log.EndTime, &log.DurationSeconds, &log.CreatedAt, &log.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("time log with ID %d not found", id)
		}
		return nil, err
	}

	return &log, nil
}

// GetByUserID retrieves task time logs by user ID with pagination
func (r *PostgresTimerRepository) GetByUserID(ctx context.Context, userID int, limit, offset int) ([]*models.TaskTimeLog, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM task_time_logs WHERE user_id = $1`
	row := r.getExecer().QueryRowContext(ctx, countQuery, userID)
	if err := row.Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get logs
	query := `
		SELECT id, task_id, user_id, start_time, end_time, duration_seconds, created_at, updated_at
		FROM task_time_logs
		WHERE user_id = $1
		ORDER BY start_time DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*models.TaskTimeLog
	for rows.Next() {
		log := &models.TaskTimeLog{}
		err := rows.Scan(&log.ID, &log.TaskID, &log.UserID, &log.StartTime, &log.EndTime, &log.DurationSeconds, &log.CreatedAt, &log.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, nil
}

// GetByTaskID retrieves task time logs by task ID with pagination
func (r *PostgresTimerRepository) GetByTaskID(ctx context.Context, taskID int, limit, offset int) ([]*models.TaskTimeLog, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM task_time_logs WHERE task_id = $1`
	row := r.getExecer().QueryRowContext(ctx, countQuery, taskID)
	if err := row.Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get logs
	query := `
		SELECT id, task_id, user_id, start_time, end_time, duration_seconds, created_at, updated_at
		FROM task_time_logs
		WHERE task_id = $1
		ORDER BY start_time DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.getExecer().QueryContext(ctx, query, taskID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*models.TaskTimeLog
	for rows.Next() {
		log := &models.TaskTimeLog{}
		err := rows.Scan(&log.ID, &log.TaskID, &log.UserID, &log.StartTime, &log.EndTime, &log.DurationSeconds, &log.CreatedAt, &log.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, nil
}

// GetByUserAndTaskToday retrieves task time logs for a user and task for today
func (r *PostgresTimerRepository) GetByUserAndTaskToday(ctx context.Context, userID, taskID int) ([]models.TaskTimeLog, error) {
	query := `
		SELECT id, task_id, user_id, start_time, end_time, duration_seconds, created_at, updated_at
		FROM task_time_logs
		WHERE user_id = $1 AND task_id = $2 
		AND start_time >= CURRENT_DATE 
		AND start_time < CURRENT_DATE + INTERVAL '1 day'
		ORDER BY start_time DESC`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.TaskTimeLog
	for rows.Next() {
		var log models.TaskTimeLog
		err := rows.Scan(&log.ID, &log.TaskID, &log.UserID, &log.StartTime, &log.EndTime, &log.DurationSeconds, &log.CreatedAt, &log.UpdatedAt)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}

// GetTodayTotalByUser gets the total time worked today by a user
func (r *PostgresTimerRepository) GetTodayTotalByUser(ctx context.Context, userID int) (int, error) {
	var total sql.NullInt64
	query := `
		SELECT COALESCE(SUM(duration_seconds), 0) as total
		FROM task_time_logs
		WHERE user_id = $1 
		AND start_time >= CURRENT_DATE 
		AND start_time < CURRENT_DATE + INTERVAL '1 day'`

	row := r.getExecer().QueryRowContext(ctx, query, userID)
	if err := row.Scan(&total); err != nil {
		return 0, err
	}

	return int(total.Int64), nil
}

// GetRecentTasksByUser gets the recent tasks worked on by a user
func (r *PostgresTimerRepository) GetRecentTasksByUser(ctx context.Context, userID int, limit int) ([]models.RecentTimedTask, error) {
	query := `
		SELECT DISTINCT 
			t.id as task_id,
			t.title as task_title,
			p.name as project_name,
			MAX(ttl.start_time) as last_timed_at,
			t.total_time_seconds,
			t.status
		FROM task_time_logs ttl
		JOIN tasks t ON ttl.task_id = t.id
		JOIN projects p ON t.project_id = p.id
		WHERE ttl.user_id = $1
		GROUP BY t.id, t.title, p.name, t.total_time_seconds, t.status
		ORDER BY last_timed_at DESC
		LIMIT $2`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.RecentTimedTask
	for rows.Next() {
		var task models.RecentTimedTask
		var lastTimedAt time.Time
		err := rows.Scan(
			&task.TaskID,
			&task.TaskTitle,
			&task.ProjectName,
			&lastTimedAt,
			&task.TotalSeconds,
			&task.Status,
		)
		if err != nil {
			return nil, err
		}
		
		task.LastTimedAt = lastTimedAt
		task.FormattedTime = models.FormatDuration(task.TotalSeconds)
		tasks = append(tasks, task)
	}

	return tasks, nil
}

// Update updates a task time log entry
func (r *PostgresTimerRepository) Update(ctx context.Context, log *models.TaskTimeLog) error {
	query := `
		UPDATE task_time_logs 
		SET task_id = $2, user_id = $3, start_time = $4, end_time = $5, 
		    duration_seconds = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	row := r.getExecer().QueryRowContext(ctx, query, log.ID, log.TaskID, log.UserID, 
		log.StartTime, log.EndTime, log.DurationSeconds)
	return row.Scan(&log.UpdatedAt)
}

// Delete deletes a task time log entry
func (r *PostgresTimerRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM task_time_logs WHERE id = $1`
	result, err := r.getExecer().ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("time log with ID %d not found", id)
	}

	return nil
}

// GetUserTimerStats gets comprehensive timer statistics for a user
func (r *PostgresTimerRepository) GetUserTimerStats(ctx context.Context, userID int) (*models.TimerStatsResponse, error) {
	// Get today's total time
	todayTotal, err := r.GetTodayTotalByUser(ctx, userID)
	if err != nil {
		todayTotal = 0
	}

	// Get recent tasks
	recentTasks, err := r.GetRecentTasksByUser(ctx, userID, 5)
	if err != nil {
		recentTasks = []models.RecentTimedTask{}
	}

	// Get task time breakdown
	taskBreakdown, err := r.GetTaskTimeBreakdown(ctx, userID, 10)
	if err != nil {
		taskBreakdown = []models.TaskTimeBreakdown{}
	}

	// Get completed tasks count today
	var completedToday int
	completedQuery := `
		SELECT COUNT(DISTINCT ttl.task_id)
		FROM task_time_logs ttl
		JOIN tasks t ON ttl.task_id = t.id
		WHERE ttl.user_id = $1 
		AND ttl.start_time >= CURRENT_DATE 
		AND ttl.start_time < CURRENT_DATE + INTERVAL '1 day'
		AND t.status = 'completed'`
	
	row := r.getExecer().QueryRowContext(ctx, completedQuery, userID)
	if err := row.Scan(&completedToday); err != nil {
		completedToday = 0
	}

	// Get in progress tasks count
	var inProgress int
	inProgressQuery := `
		SELECT COUNT(DISTINCT t.id)
		FROM tasks t
		WHERE t.assignee_id = $1 AND t.status = 'in_progress'`
	
	row = r.getExecer().QueryRowContext(ctx, inProgressQuery, userID)
	if err := row.Scan(&inProgress); err != nil {
		inProgress = 0
	}

	return &models.TimerStatsResponse{
		TodayTotalSeconds:   todayTotal,
		TodayFormattedTime:  models.FormatDuration(todayTotal),
		CompletedTasksToday: completedToday,
		InProgressTasks:     inProgress,
		RecentTasks:         recentTasks,
		TaskTimeBreakdown:   taskBreakdown,
	}, nil
}

// GetTaskTimeBreakdown gets task time breakdown for a user
func (r *PostgresTimerRepository) GetTaskTimeBreakdown(ctx context.Context, userID int, limit int) ([]models.TaskTimeBreakdown, error) {
	query := `
		SELECT 
			t.id as task_id,
			t.title as task_title,
			p.name as project_name,
			t.total_time_seconds
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		WHERE t.assignee_id = $1 AND t.total_time_seconds > 0
		ORDER BY t.total_time_seconds DESC
		LIMIT $2`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var breakdown []models.TaskTimeBreakdown
	for rows.Next() {
		var item models.TaskTimeBreakdown
		err := rows.Scan(
			&item.TaskID,
			&item.TaskTitle,
			&item.ProjectName,
			&item.TotalSeconds,
		)
		if err != nil {
			return nil, err
		}
		
		item.FormattedTime = models.FormatDuration(item.TotalSeconds)
		breakdown = append(breakdown, item)
	}

	return breakdown, nil
}