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
		INSERT INTO task_time_logs (task_id, user_id, start_time, end_time, duration_seconds, created_by)
		VALUES ($1, $2, $3, $4, $5, $2)
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

// GetRecentTasksByUser gets the recent tasks worked on by a user, including deleted tasks
func (r *PostgresTimerRepository) GetRecentTasksByUser(ctx context.Context, userID int, limit int) ([]models.RecentTimedTask, error) {
	return r.GetRecentTasksByUserWithPagination(ctx, userID, limit, 0)
}

// GetRecentTasksByUserWithPagination gets the recent tasks worked on by a user with pagination support
func (r *PostgresTimerRepository) GetRecentTasksByUserWithPagination(ctx context.Context, userID int, limit int, offset int) ([]models.RecentTimedTask, error) {
	query := `
		SELECT DISTINCT 
			t.id as task_id,
			t.title as task_title,
			p.name as project_name,
			MAX(ttl.start_time) as last_timed_at,
			t.total_time_seconds,
			t.status,
			CASE WHEN t.deleted_at IS NOT NULL THEN true ELSE false END as is_deleted
		FROM task_time_logs ttl
		LEFT JOIN tasks t ON ttl.task_id = t.id
		LEFT JOIN projects p ON t.project_id = p.id
		WHERE ttl.user_id = $1
		GROUP BY t.id, t.title, p.name, t.total_time_seconds, t.status, t.deleted_at
		ORDER BY last_timed_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.RecentTimedTask
	for rows.Next() {
		var task models.RecentTimedTask
		var lastTimedAt time.Time
		var isDeleted bool
		var taskTitle, projectName, status sql.NullString
		err := rows.Scan(
			&task.TaskID,
			&taskTitle,
			&projectName,
			&lastTimedAt,
			&task.TotalSeconds,
			&status,
			&isDeleted,
		)
		if err != nil {
			return nil, err
		}
		
		// Handle potentially null values for deleted tasks
		task.TaskTitle = taskTitle.String
		task.ProjectName = projectName.String
		task.Status = status.String
		task.LastTimedAt = lastTimedAt
		task.FormattedTime = models.FormatDuration(task.TotalSeconds)
		task.IsDeleted = isDeleted
		
		// Set default values for deleted tasks
		if isDeleted {
			if task.TaskTitle == "" {
				task.TaskTitle = "已删除的任务"
			}
			if task.ProjectName == "" {
				task.ProjectName = "已删除的项目"
			}
			if task.Status == "" {
				task.Status = "deleted"
			}
		}
		
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

// GetWeeklyReport gets comprehensive weekly report data for a user
func (r *PostgresTimerRepository) GetWeeklyReport(ctx context.Context, userID int, startDate, endDate string) (*models.WeeklyReportResponse, error) {
	// Parse date strings
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return nil, fmt.Errorf("invalid start date format: %w", err)
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return nil, fmt.Errorf("invalid end date format: %w", err)
	}
	
	// Get weekly stats
	weeklyStats, err := r.getWeeklyStats(ctx, userID, start, end)
	if err != nil {
		return nil, err
	}
	
	// Get daily stats
	dailyStats, err := r.getDailyStats(ctx, userID, start, end)
	if err != nil {
		return nil, err
	}
	
	// Get task time entries
	taskEntries, err := r.getTaskTimeEntries(ctx, userID, start, end)
	if err != nil {
		return nil, err
	}
	
	// Get project stats
	projectStats, err := r.getProjectStats(ctx, userID, start, end)
	if err != nil {
		return nil, err
	}
	
	return &models.WeeklyReportResponse{
		WeeklyStats:     *weeklyStats,
		DailyStats:      dailyStats,
		TaskTimeEntries: taskEntries,
		ProjectStats:    projectStats,
	}, nil
}

// getWeeklyStats gets weekly statistics for a user in date range
func (r *PostgresTimerRepository) getWeeklyStats(ctx context.Context, userID int, start, end time.Time) (*models.WeeklyStatsData, error) {
	query := `
		SELECT 
			COALESCE(SUM(ttl.duration_seconds), 0) as total_seconds,
			COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
			COUNT(DISTINCT t.id) as total_tasks
		FROM task_time_logs ttl
		JOIN tasks t ON ttl.task_id = t.id
		WHERE ttl.user_id = $1 
		AND ttl.start_time >= $2 
		AND ttl.start_time <= $3::timestamp + INTERVAL '1 day'`
	
	var totalSeconds, completedTasks, totalTasks int
	row := r.getExecer().QueryRowContext(ctx, query, userID, start, end)
	err := row.Scan(&totalSeconds, &completedTasks, &totalTasks)
	if err != nil {
		return nil, err
	}
	
	totalHours := float64(totalSeconds) / 3600.0
	efficiency := float64(0)
	if totalTasks > 0 {
		efficiency = (float64(completedTasks) / float64(totalTasks)) * 100
	}
	
	return &models.WeeklyStatsData{
		TotalHours:     totalHours,
		CompletedTasks: completedTasks,
		TotalTasks:     totalTasks,
		Efficiency:     efficiency,
		WeekStart:      start.Format("2006-01-02"),
		WeekEnd:        end.Format("2006-01-02"),
	}, nil
}

// getDailyStats gets daily statistics for a user in date range
func (r *PostgresTimerRepository) getDailyStats(ctx context.Context, userID int, start, end time.Time) ([]models.DailyStatsData, error) {
	query := `
		SELECT 
			DATE(ttl.start_time) as date,
			COALESCE(SUM(ttl.duration_seconds), 0) as total_seconds,
			COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
			MAX(t.title) as top_task
		FROM task_time_logs ttl
		JOIN tasks t ON ttl.task_id = t.id
		WHERE ttl.user_id = $1 
		AND ttl.start_time >= $2 
		AND ttl.start_time <= $3::timestamp + INTERVAL '1 day'
		GROUP BY DATE(ttl.start_time)
		ORDER BY date`
	
	rows, err := r.getExecer().QueryContext(ctx, query, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var dailyStats []models.DailyStatsData
	for rows.Next() {
		var date time.Time
		var totalSeconds, completedTasks int
		var topTask string
		
		err := rows.Scan(&date, &totalSeconds, &completedTasks, &topTask)
		if err != nil {
			return nil, err
		}
		
		totalHours := float64(totalSeconds) / 3600.0
		efficiency := float64(80 + (completedTasks * 5)) // Simple efficiency calculation
		if efficiency > 100 {
			efficiency = 100
		}
		
		dailyStats = append(dailyStats, models.DailyStatsData{
			Date:           date.Format("2006-01-02"),
			TotalHours:     totalHours,
			TasksCompleted: completedTasks,
			Efficiency:     efficiency,
			TopTask:        topTask,
		})
	}
	
	return dailyStats, nil
}

// getTaskTimeEntries gets task time entries for a user in date range
func (r *PostgresTimerRepository) getTaskTimeEntries(ctx context.Context, userID int, start, end time.Time) ([]models.TaskTimeEntryData, error) {
	query := `
		SELECT 
			ttl.id,
			t.title as task_title,
			p.name as project_name,
			ttl.duration_seconds,
			DATE(ttl.start_time) as date,
			t.status,
			COALESCE(t.custom_fields->>'priority', 'medium') as priority
		FROM task_time_logs ttl
		JOIN tasks t ON ttl.task_id = t.id
		JOIN projects p ON t.project_id = p.id
		WHERE ttl.user_id = $1 
		AND ttl.start_time >= $2 
		AND ttl.start_time <= $3::timestamp + INTERVAL '1 day'
		ORDER BY ttl.start_time DESC
		LIMIT 50`
	
	rows, err := r.getExecer().QueryContext(ctx, query, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var entries []models.TaskTimeEntryData
	for rows.Next() {
		var id int
		var taskTitle, projectName, status, priority string
		var durationSeconds int
		var date time.Time
		
		err := rows.Scan(&id, &taskTitle, &projectName, &durationSeconds, &date, &status, &priority)
		if err != nil {
			return nil, err
		}
		
		duration := float64(durationSeconds) / 3600.0
		
		entries = append(entries, models.TaskTimeEntryData{
			ID:          fmt.Sprintf("%d", id),
			TaskTitle:   taskTitle,
			ProjectName: projectName,
			Duration:    duration,
			Date:        date.Format("2006-01-02"),
			Status:      status,
			Priority:    priority,
		})
	}
	
	return entries, nil
}

// getProjectStats gets project statistics for a user in date range
func (r *PostgresTimerRepository) getProjectStats(ctx context.Context, userID int, start, end time.Time) ([]models.ProjectStatsData, error) {
	query := `
		SELECT 
			p.name as project_name,
			COALESCE(SUM(ttl.duration_seconds), 0) as total_seconds,
			COUNT(DISTINCT t.id) as tasks_count,
			COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
		FROM task_time_logs ttl
		JOIN tasks t ON ttl.task_id = t.id
		JOIN projects p ON t.project_id = p.id
		WHERE ttl.user_id = $1 
		AND ttl.start_time >= $2 
		AND ttl.start_time <= $3::timestamp + INTERVAL '1 day'
		GROUP BY p.id, p.name
		ORDER BY total_seconds DESC`
	
	rows, err := r.getExecer().QueryContext(ctx, query, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	colors := []string{"#1890ff", "#52c41a", "#fa8c16", "#722ed1", "#eb2f96", "#13c2c2"}
	colorIndex := 0
	
	var projectStats []models.ProjectStatsData
	for rows.Next() {
		var projectName string
		var totalSeconds, tasksCount, completedTasks int
		
		err := rows.Scan(&projectName, &totalSeconds, &tasksCount, &completedTasks)
		if err != nil {
			return nil, err
		}
		
		totalHours := float64(totalSeconds) / 3600.0
		completionRate := float64(0)
		if tasksCount > 0 {
			completionRate = (float64(completedTasks) / float64(tasksCount)) * 100
		}
		
		color := colors[colorIndex%len(colors)]
		colorIndex++
		
		projectStats = append(projectStats, models.ProjectStatsData{
			ProjectName:    projectName,
			TotalHours:     totalHours,
			TasksCount:     tasksCount,
			CompletionRate: completionRate,
			Color:          color,
		})
	}
	
	return projectStats, nil
}