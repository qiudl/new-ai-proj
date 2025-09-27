package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"time"

	"ai-project-backend/models"
	"github.com/lib/pq"
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
		SELECT COALESCE(SUM(GREATEST(duration_seconds, 0)), 0) as total
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
// Bug#3 Fix: Now returns both project tasks and personal tasks
func (r *PostgresTimerRepository) GetRecentTasksByUserWithPagination(ctx context.Context, userID int, limit int, offset int) ([]models.RecentTimedTask, error) {
	query := `
		-- Limit source rows by recent time to avoid scanning large tables
		WITH recent_logs AS (
			SELECT *
			FROM task_time_logs
			WHERE user_id = $1
			  AND (end_time IS NOT NULL)
			  AND end_time > NOW() - INTERVAL '90 days'
		),
		recent_tasks AS (
			-- Project tasks aggregated
			SELECT 
				t.id as task_id,
				t.title as task_title,
				p.name as project_name,
				MAX(rl.end_time) as last_timed_at,
				SUM(rl.duration_seconds) as total_seconds,
				COALESCE(t.status, 'unknown') as status,
				CASE WHEN t.deleted_at IS NOT NULL THEN true ELSE false END as is_deleted
			FROM recent_logs rl
			JOIN tasks t ON rl.task_id = t.id
			LEFT JOIN projects p ON t.project_id = p.id
			WHERE rl.task_id IS NOT NULL
			GROUP BY t.id, t.title, p.name, t.status, t.deleted_at
			
			UNION ALL
			
			-- Personal tasks aggregated
			SELECT 
				ut.id as task_id,
				ut.title as task_title,
				'Personal Timer' as project_name,
				MAX(rl.end_time) as last_timed_at,
				SUM(rl.duration_seconds) as total_seconds,
				COALESCE(ut.status, 'active') as status,
				CASE WHEN ut.deleted_at IS NOT NULL THEN true ELSE false END as is_deleted
			FROM recent_logs rl
			JOIN user_timer_tasks ut ON rl.user_timer_task_id = ut.id
			WHERE rl.user_timer_task_id IS NOT NULL
			GROUP BY ut.id, ut.title, ut.status, ut.deleted_at
		)
		SELECT * FROM recent_tasks
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
			COALESCE(SUM(GREATEST(utl.duration_seconds, 0)), 0) as total_seconds,
			COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN utl.target_id END) as completed_tasks,
			COUNT(DISTINCT utl.target_id) as total_tasks
		FROM unified_timer_logs utl
		LEFT JOIN tasks t ON utl.target_type = 'project_task' AND utl.target_id = t.id
		WHERE utl.user_id = $1 
		AND utl.target_type = 'project_task'
		AND utl.status = 'completed'
		AND utl.start_time >= $2 
		AND utl.start_time <= $3::timestamp + INTERVAL '1 day'`

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
		WITH date_series AS (
			SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS day
		),
	daily_time AS (
			SELECT 
				-- 使用上海时区进行按天分组，避免跨天偏移
				(utl.start_time AT TIME ZONE 'Asia/Shanghai')::date AS day,
				COALESCE(SUM(GREATEST(utl.duration_seconds, 0)), 0) AS total_seconds
			FROM unified_timer_logs utl
			-- 仅统计当前用户的计时
			WHERE utl.user_id = $1
			AND utl.target_type = 'project_task'
			AND utl.status = 'completed'
			AND utl.start_time >= $2
			AND utl.start_time < ($3::timestamp + INTERVAL '1 day')
			GROUP BY (utl.start_time AT TIME ZONE 'Asia/Shanghai')::date
		),
	daily_top_task AS (
			SELECT 
				(utl.start_time AT TIME ZONE 'Asia/Shanghai')::date AS day,
				t.title AS task_title,
				SUM(GREATEST(utl.duration_seconds, 0)) AS seconds
			FROM unified_timer_logs utl
			JOIN tasks t ON utl.target_type = 'project_task' AND utl.target_id = t.id
			WHERE utl.user_id = $1
			AND utl.target_type = 'project_task'
			AND utl.status = 'completed'
			AND utl.start_time >= $2
			AND utl.start_time < ($3::timestamp + INTERVAL '1 day')
			GROUP BY (utl.start_time AT TIME ZONE 'Asia/Shanghai')::date, t.id, t.title
		),
		daily_tasks_completed AS (
			SELECT 
				-- 使用上海时区将更新时间归入对应自然日
				(t.updated_at AT TIME ZONE 'Asia/Shanghai')::date AS day,
				COUNT(DISTINCT t.id) AS completed_count
			FROM tasks t
			WHERE t.assignee_id = $1
			AND t.status = 'completed'
			AND t.updated_at >= $2
			AND t.updated_at < ($3::timestamp + INTERVAL '1 day')
			GROUP BY (t.updated_at AT TIME ZONE 'Asia/Shanghai')::date
		)
		SELECT 
			ds.day AS date,
			COALESCE(dt.total_seconds, 0) AS total_seconds,
			COALESCE(dc.completed_count, 0) AS completed_tasks,
			COALESCE((
				SELECT dtt.task_title 
				FROM daily_top_task dtt 
				WHERE dtt.day = ds.day 
				ORDER BY dtt.seconds DESC 
				LIMIT 1
			), '') AS top_task
		FROM date_series ds
		LEFT JOIN daily_time dt ON dt.day = ds.day
		LEFT JOIN daily_tasks_completed dc ON dc.day = ds.day
		ORDER BY ds.day`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dailyStats []models.DailyStatsData
	for rows.Next() {
		var date time.Time
		var totalSeconds, completedTasks int
		var topTask sql.NullString

		if err := rows.Scan(&date, &totalSeconds, &completedTasks, &topTask); err != nil {
			return nil, err
		}

		totalHours := float64(totalSeconds) / 3600.0
		
		// 改进的效率计算算法
		efficiency := float64(0)
		if totalHours > 0 {
			// 基于工作时长和任务完成数的效率计算
			// 基础效率: 工作时长贡献 (最多60分)
			timeEfficiency := math.Min(totalHours/8.0*60, 60) // 8小时=满分60分
			
			// 任务完成效率: 每完成1个任务+10分 (最多40分)
			taskEfficiency := math.Min(float64(completedTasks)*10, 40)
			
			efficiency = timeEfficiency + taskEfficiency
			
			// 效率上限100分
			if efficiency > 100 {
				efficiency = 100
			}
		}

		topTaskStr := ""
		if topTask.Valid {
			topTaskStr = topTask.String
		}

		dailyStats = append(dailyStats, models.DailyStatsData{
			Date:           date.Format("2006-01-02"),
			TotalHours:     totalHours,
			TasksCompleted: completedTasks,
			Efficiency:     efficiency,
			TopTask:        topTaskStr,
		})
	}

	return dailyStats, nil
}

// getTaskTimeEntries gets task time entries for a user in date range
func (r *PostgresTimerRepository) getTaskTimeEntries(ctx context.Context, userID int, start, end time.Time) ([]models.TaskTimeEntryData, error) {
	query := `
		SELECT 
			utl.id,
			t.title as task_title,
			p.name as project_name,
			GREATEST(utl.duration_seconds, 0) as duration_seconds,
			DATE(utl.start_time) as date,
			t.status,
			COALESCE(t.custom_fields->>'priority', 'medium') as priority,
			utl.start_time
		FROM unified_timer_logs utl
		JOIN tasks t ON utl.target_type = 'project_task' AND utl.target_id = t.id
		JOIN projects p ON t.project_id = p.id
		WHERE utl.user_id = $1 
		AND utl.target_type = 'project_task'
		AND utl.status = 'completed'
		AND utl.start_time >= $2 
		AND utl.start_time <= $3::timestamp + INTERVAL '1 day'
		ORDER BY utl.start_time DESC
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
		var startTime time.Time

		err := rows.Scan(&id, &taskTitle, &projectName, &durationSeconds, &date, &status, &priority, &startTime)
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
			StartTime:   startTime.Format("2006-01-02 15:04:05"),
		})
	}

	return entries, nil
}

// getProjectStats gets project statistics for a user in date range
func (r *PostgresTimerRepository) getProjectStats(ctx context.Context, userID int, start, end time.Time) ([]models.ProjectStatsData, error) {
	query := `
		SELECT 
			p.name as project_name,
			COALESCE(SUM(GREATEST(utl.duration_seconds, 0)), 0) as total_seconds,
			COUNT(DISTINCT t.id) as tasks_count,
			COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
		FROM unified_timer_logs utl
		JOIN tasks t ON utl.target_type = 'project_task' AND utl.target_id = t.id
		JOIN projects p ON t.project_id = p.id
		WHERE utl.user_id = $1 
		AND utl.target_type = 'project_task'
		AND utl.status = 'completed'
		AND utl.start_time >= $2 
		AND utl.start_time <= $3::timestamp + INTERVAL '1 day'
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

// GetDailyComparisonData gets 3-day comparison data (today, yesterday, day before) for efficiency analysis
func (r *PostgresTimerRepository) GetDailyComparisonData(ctx context.Context, userID int) (*models.DailyComparisonResponse, error) {
	// Performance monitoring - start timing
	startTime := time.Now()
	perfMonitor := r.startPerformanceMonitor("GetDailyComparisonData", userID)
	defer func() {
		perfMonitor.Complete(time.Since(startTime))
	}()

	// Calculate the 3 dates we need
	now := time.Now().In(time.FixedZone("CST", 8*3600)) // 上海时区
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	yesterday := today.AddDate(0, 0, -1)
	dayBefore := today.AddDate(0, 0, -2)

	// Use optimized batch query for better performance
	batchStart := time.Now()
	batchData, err := r.getBatchDayEfficiencyData(ctx, userID, []time.Time{dayBefore, yesterday, today})
	batchDuration := time.Since(batchStart)
	perfMonitor.RecordStep("batch_query", batchDuration)

	if err != nil {
		// Fallback to individual queries if batch fails
		log.Printf("Batch query failed, falling back to individual queries: %v", err)
		perfMonitor.RecordFallback("individual_queries")
		return r.getDailyComparisonDataFallback(ctx, userID, dayBefore, yesterday, today)
	}

	if len(batchData) != 3 {
		// Ensure we have all 3 days of data
		perfMonitor.RecordFallback("incomplete_batch_data")
		return r.getDailyComparisonDataFallback(ctx, userID, dayBefore, yesterday, today)
	}

	dayBeforeData := batchData[0]
	yesterdayData := batchData[1]
	todayData := batchData[2]

	// Calculate trends and insights
	trendsStart := time.Now()
	trends := r.calculateEfficiencyTrends(dayBeforeData, yesterdayData, todayData)
	perfMonitor.RecordStep("calculate_trends", time.Since(trendsStart))

	insightsStart := time.Now()
	insights := r.generateEfficiencyInsights(dayBeforeData, yesterdayData, todayData, trends)
	perfMonitor.RecordStep("generate_insights", time.Since(insightsStart))

	return &models.DailyComparisonResponse{
		Today:      *todayData,
		Yesterday:  *yesterdayData,
		DayBefore:  *dayBeforeData,
		Trends:     trends,
		Insights:   insights,
		UpdatedAt:  time.Now().Format(time.RFC3339),
	}, nil
}

// getDailyComparisonDataFallback provides fallback to original implementation
func (r *PostgresTimerRepository) getDailyComparisonDataFallback(ctx context.Context, userID int, dayBefore, yesterday, today time.Time) (*models.DailyComparisonResponse, error) {
	// Get data for all 3 days (original implementation)
	todayData, err := r.getDayEfficiencyData(ctx, userID, today)
	if err != nil {
		return nil, fmt.Errorf("failed to get today data: %w", err)
	}

	yesterdayData, err := r.getDayEfficiencyData(ctx, userID, yesterday)
	if err != nil {
		return nil, fmt.Errorf("failed to get yesterday data: %w", err)
	}

	dayBeforeData, err := r.getDayEfficiencyData(ctx, userID, dayBefore)
	if err != nil {
		return nil, fmt.Errorf("failed to get day before data: %w", err)
	}

	// Calculate trends and insights
	trends := r.calculateEfficiencyTrends(dayBeforeData, yesterdayData, todayData)
	insights := r.generateEfficiencyInsights(dayBeforeData, yesterdayData, todayData, trends)

	return &models.DailyComparisonResponse{
		Today:      *todayData,
		Yesterday:  *yesterdayData,
		DayBefore:  *dayBeforeData,
		Trends:     trends,
		Insights:   insights,
		UpdatedAt:  time.Now().Format(time.RFC3339),
	}, nil
}

// getDayEfficiencyData gets comprehensive efficiency data for a specific day
func (r *PostgresTimerRepository) getDayEfficiencyData(ctx context.Context, userID int, date time.Time) (*models.DayEfficiencyData, error) {
	dateStr := date.Format("2006-01-02")
	endDate := date.AddDate(0, 0, 1)

	// Get basic timer statistics
	var totalSeconds, timerSessions, uniqueTasksWorked, avgSessionDuration int
	timerQuery := `
		SELECT 
			COALESCE(SUM(GREATEST(utl.duration_seconds, 0)), 0) as total_seconds,
			COUNT(utl.id) as timer_sessions,
			COUNT(DISTINCT utl.target_id) as unique_tasks_worked,
			CASE WHEN COUNT(utl.id) > 0 
				THEN AVG(utl.duration_seconds)::int 
				ELSE 0 
			END as avg_session_duration
		FROM unified_timer_logs utl
		WHERE utl.user_id = $1
		AND utl.status = 'completed'
		AND utl.start_time >= $2
		AND utl.start_time < $3`

	row := r.getExecer().QueryRowContext(ctx, timerQuery, userID, date, endDate)
	err := row.Scan(&totalSeconds, &timerSessions, &uniqueTasksWorked, &avgSessionDuration)
	if err != nil {
		return nil, err
	}

	// Get completed tasks count
	var completedTasks int
	completedQuery := `
		SELECT COUNT(DISTINCT t.id)
		FROM tasks t
		WHERE t.assignee_id = $1
		AND t.status = 'completed'
		AND t.updated_at >= $2
		AND t.updated_at < $3`

	row = r.getExecer().QueryRowContext(ctx, completedQuery, userID, date, endDate)
	err = row.Scan(&completedTasks)
	if err != nil {
		return nil, err
	}

	// Get top task
	var topTaskTitle sql.NullString
	var topTaskSeconds int
	topTaskQuery := `
		SELECT 
			t.title,
			SUM(GREATEST(utl.duration_seconds, 0)) as total_seconds
		FROM unified_timer_logs utl
		JOIN tasks t ON utl.target_type = 'project_task' AND utl.target_id = t.id
		WHERE utl.user_id = $1
		AND utl.status = 'completed'
		AND utl.start_time >= $2
		AND utl.start_time < $3
		GROUP BY t.id, t.title
		ORDER BY total_seconds DESC
		LIMIT 1`

	row = r.getExecer().QueryRowContext(ctx, topTaskQuery, userID, date, endDate)
	err = row.Scan(&topTaskTitle, &topTaskSeconds)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// Calculate efficiency metrics
	totalHours := float64(totalSeconds) / 3600.0
	
	// Enhanced efficiency index calculation
	efficiencyIndex := r.calculateComprehensiveEfficiencyIndex(
		totalHours, completedTasks, timerSessions, avgSessionDuration, topTaskSeconds, totalSeconds)

	// Get task breakdown
	taskBreakdown, err := r.getDayTaskBreakdown(ctx, userID, date, endDate)
	if err != nil {
		return nil, err
	}

	// Get hourly distribution
	hourlyDistribution, err := r.getDayHourlyDistribution(ctx, userID, date, endDate)
	if err != nil {
		return nil, err
	}

	topTaskTitleStr := ""
	if topTaskTitle.Valid {
		topTaskTitleStr = topTaskTitle.String
	}

	return &models.DayEfficiencyData{
		Date:                 dateStr,
		TotalHours:           totalHours,
		TotalSeconds:         totalSeconds,
		CompletedTasks:       completedTasks,
		UniqueTasksWorked:    uniqueTasksWorked,
		TimerSessions:        timerSessions,
		AvgSessionDuration:   avgSessionDuration,
		EfficiencyIndex:      efficiencyIndex,
		TopTaskTitle:         topTaskTitleStr,
		TopTaskHours:         float64(topTaskSeconds) / 3600.0,
		TaskBreakdown:        taskBreakdown,
		HourlyDistribution:   hourlyDistribution,
		FormattedTotalTime:   models.FormatDuration(totalSeconds),
		FormattedAvgSession:  models.FormatDuration(avgSessionDuration),
	}, nil
}

// calculateComprehensiveEfficiencyIndex calculates advanced efficiency index with dynamic weights
func (r *PostgresTimerRepository) calculateComprehensiveEfficiencyIndex(
	totalHours float64, completedTasks, timerSessions, avgSessionDuration, topTaskSeconds, totalSeconds int) float64 {
	
	if totalHours == 0 {
		return 0
	}

	// Get algorithm configuration (with fallback to defaults)
	// config := r.getEfficiencyConfig() // Reserved for future use

	// Dynamic weight adjustment based on work pattern
	weights := r.calculateDynamicWeights(totalHours, timerSessions, completedTasks)

	// Base score (0-30): Work time foundation with improved curve
	baseScore := r.calculateBaseScore(totalHours, weights.Base)

	// Time efficiency (0-25): Focus and consistency with smart bonuses
	timeEfficiency := r.calculateTimeEfficiency(timerSessions, avgSessionDuration, totalHours, weights.Time)

	// Task efficiency (0-25): Completion and progress with quality metrics
	taskEfficiency := r.calculateTaskEfficiency(completedTasks, topTaskSeconds, totalSeconds, timerSessions, weights.Task)

	// Quality factor (0-20): Advanced metrics with adaptive scoring
	qualityFactor := r.calculateQualityFactor(totalHours, timerSessions, completedTasks, avgSessionDuration, weights.Quality)

	totalIndex := baseScore + timeEfficiency + taskEfficiency + qualityFactor
	
	// Apply final adjustments for edge cases
	totalIndex = r.applyFinalAdjustments(totalIndex, totalHours, timerSessions, completedTasks)

	// Cap at 100 and round
	return math.Min(math.Round(totalIndex*10)/10, 100.0)
}

// getEfficiencyConfig returns the current algorithm configuration
func (r *PostgresTimerRepository) getEfficiencyConfig() EfficiencyConfig {
	// For now, return default config
	// In future, this could load from database/cache/environment variables
	return GetDefaultEfficiencyConfig()
}

// EfficiencyWeights represents dynamic weight adjustments
type EfficiencyWeights struct {
	Base    float64
	Time    float64
	Task    float64
	Quality float64
}

// EfficiencyConfig represents configurable algorithm parameters
type EfficiencyConfig struct {
	// Base score parameters
	OptimalWorkHours     float64 `json:"optimal_work_hours"`     // Default: 8.0
	MaxBaseScore         float64 `json:"max_base_score"`         // Default: 30.0
	
	// Time efficiency parameters
	OptimalSessionMin    int     `json:"optimal_session_min"`    // Default: 1800 (30 min)
	OptimalSessionMax    int     `json:"optimal_session_max"`    // Default: 3600 (60 min)
	MaxTimeEfficiency    float64 `json:"max_time_efficiency"`    // Default: 25.0
	
	// Task efficiency parameters
	TaskCompletionWeight float64 `json:"task_completion_weight"` // Default: 4.0
	MaxTaskEfficiency    float64 `json:"max_task_efficiency"`    // Default: 25.0
	
	// Quality factor parameters
	MaxQualityFactor     float64 `json:"max_quality_factor"`     // Default: 20.0
	HealthyWorkHoursMin  float64 `json:"healthy_work_hours_min"` // Default: 4.0
	HealthyWorkHoursMax  float64 `json:"healthy_work_hours_max"` // Default: 9.0
	
	// Dynamic weights
	EnableDynamicWeights bool    `json:"enable_dynamic_weights"` // Default: true
	
	// Version and metadata
	Version              string  `json:"version"`                // Algorithm version
	LastUpdated          string  `json:"last_updated"`           // Last update timestamp
}

// GetDefaultEfficiencyConfig returns the default algorithm configuration
func GetDefaultEfficiencyConfig() EfficiencyConfig {
	return EfficiencyConfig{
		OptimalWorkHours:     8.0,
		MaxBaseScore:         30.0,
		OptimalSessionMin:    1800, // 30 minutes
		OptimalSessionMax:    3600, // 60 minutes  
		MaxTimeEfficiency:    25.0,
		TaskCompletionWeight: 4.0,
		MaxTaskEfficiency:    25.0,
		MaxQualityFactor:     20.0,
		HealthyWorkHoursMin:  4.0,
		HealthyWorkHoursMax:  9.0,
		EnableDynamicWeights: true,
		Version:              "2.1",
		LastUpdated:          time.Now().Format(time.RFC3339),
	}
}

// calculateDynamicWeights adjusts algorithm weights based on work patterns
func (r *PostgresTimerRepository) calculateDynamicWeights(totalHours float64, timerSessions, completedTasks int) EfficiencyWeights {
	// Default weights
	weights := EfficiencyWeights{
		Base:    1.0,
		Time:    1.0,
		Task:    1.0,
		Quality: 1.0,
	}

	// Adjust for different work patterns
	if totalHours < 2 { // Short work sessions - emphasize completion
		weights.Task = 1.3
		weights.Quality = 0.8
	} else if totalHours > 10 { // Long work sessions - emphasize quality over quantity
		weights.Quality = 1.3
		weights.Base = 0.9
	}

	if timerSessions > 15 { // Many short sessions - emphasize focus
		weights.Time = 1.2
		weights.Quality = 0.9
	} else if timerSessions < 3 && totalHours > 4 { // Few long sessions - reward deep work
		weights.Time = 1.4
		weights.Quality = 1.2
	}

	return weights
}

// calculateBaseScore computes work time foundation score
func (r *PostgresTimerRepository) calculateBaseScore(totalHours, weight float64) float64 {
	// Improved logarithmic curve for better scoring at different ranges
	if totalHours <= 1 {
		return totalHours * 15 * weight // 0-1 hours: linear progression
	} else if totalHours <= 4 {
		return (15 + (totalHours-1)*5) * weight // 1-4 hours: 15-30 points
	} else if totalHours <= 8 {
		return math.Min(30*weight, 30) // 4-8 hours: approach max smoothly
	} else {
		// Diminishing returns after 8 hours to prevent overwork rewards
		return math.Max(30*weight*0.9, 25) // Slight penalty for overwork
	}
}

// calculateTimeEfficiency computes focus and consistency metrics
func (r *PostgresTimerRepository) calculateTimeEfficiency(timerSessions, avgSessionDuration int, totalHours, weight float64) float64 {
	if timerSessions == 0 {
		return 0
	}

	// Advanced focus scoring with optimal session length rewards
	focusBonus := float64(0)
	if avgSessionDuration >= 900 && avgSessionDuration <= 7200 { // 15min - 2 hours optimal range
		if avgSessionDuration >= 1800 && avgSessionDuration <= 3600 { // 30-60min is ideal
			focusBonus = 15 // Full bonus
		} else if avgSessionDuration >= 900 && avgSessionDuration <= 1800 { // 15-30min is good
			focusBonus = 12
		} else { // 60min-2hours is acceptable
			focusBonus = 10
		}
	} else if avgSessionDuration > 7200 { // Sessions too long
		focusBonus = 5
	} else { // Sessions too short
		focusBonus = math.Min(float64(avgSessionDuration)/900*8, 8)
	}

	// Smart consistency bonus based on work duration
	consistencyBonus := float64(0)
	if totalHours > 0 {
		optimalSessions := math.Max(2, totalHours/0.75) // Expect ~45min per session
		sessionRatio := float64(timerSessions) / optimalSessions
		if sessionRatio >= 0.5 && sessionRatio <= 2.0 { // Good session distribution
			consistencyBonus = math.Min(sessionRatio*5, 10)
		} else {
			consistencyBonus = 5 // Penalty for too few/many sessions
		}
	}

	return (focusBonus + consistencyBonus) * weight
}

// calculateTaskEfficiency computes completion and progress metrics
func (r *PostgresTimerRepository) calculateTaskEfficiency(completedTasks, topTaskSeconds, totalSeconds, timerSessions int, weight float64) float64 {
	if completedTasks == 0 {
		return 0
	}

	// Progressive task completion bonus with diminishing returns
	completionBonus := float64(0)
	if completedTasks <= 5 {
		completionBonus = float64(completedTasks) * 4 // 1-5 tasks: 4 points each
	} else if completedTasks <= 10 {
		completionBonus = 20 + float64(completedTasks-5)*2 // 6-10 tasks: 2 points each
	} else {
		completionBonus = 30 // Cap to prevent gaming
	}

	// Task depth and focus bonus
	depthBonus := float64(0)
	if totalSeconds > 0 {
		topTaskRatio := float64(topTaskSeconds) / float64(totalSeconds)
		if topTaskRatio >= 0.6 { // Good focus on main task
			depthBonus = 5
		} else if topTaskRatio >= 0.4 {
			depthBonus = 3
		} else if topTaskRatio >= 0.2 {
			depthBonus = 1
		}
	}

	totalEfficiency := (completionBonus + depthBonus) * weight
	return math.Min(totalEfficiency, 25) // Cap at 25
}

// calculateQualityFactor computes advanced quality metrics
func (r *PostgresTimerRepository) calculateQualityFactor(totalHours float64, timerSessions, completedTasks, avgSessionDuration int, weight float64) float64 {
	if timerSessions == 0 || completedTasks == 0 {
		return 0
	}

	// Task completion efficiency
	taskSessionRatio := float64(completedTasks) / float64(timerSessions)
	efficiencyBonus := float64(0)
	if taskSessionRatio >= 0.8 { // Very efficient
		efficiencyBonus = 10
	} else if taskSessionRatio >= 0.5 { // Good efficiency
		efficiencyBonus = 7
	} else if taskSessionRatio >= 0.3 { // Acceptable
		efficiencyBonus = 5
	} else { // Low efficiency
		efficiencyBonus = 2
	}

	// Work-life balance bonus
	balanceBonus := float64(0)
	if totalHours >= 4 && totalHours <= 9 { // Healthy work hours
		balanceBonus = 10
	} else if totalHours >= 2 && totalHours <= 12 { // Acceptable range
		balanceBonus = 7
	} else {
		balanceBonus = 3
	}

	totalQuality := (efficiencyBonus + balanceBonus) * weight
	return math.Min(totalQuality, 20) // Cap at 20
}

// applyFinalAdjustments applies edge case handling and final optimizations
func (r *PostgresTimerRepository) applyFinalAdjustments(score, totalHours float64, timerSessions, completedTasks int) float64 {
	// Minimum score for any productive work
	if score > 0 && score < 10 {
		score = 10
	}

	// Bonus for balanced productivity patterns
	if totalHours >= 4 && totalHours <= 8 && completedTasks >= 2 && timerSessions >= 3 {
		score += 3 // Balanced work bonus
	}

	// Slight penalty for extreme patterns
	if totalHours > 12 || timerSessions > 20 {
		score *= 0.95 // 5% penalty for potentially unsustainable patterns
	}

	return score
}

// getDayTaskBreakdown gets task time breakdown for a specific day
func (r *PostgresTimerRepository) getDayTaskBreakdown(ctx context.Context, userID int, date, endDate time.Time) ([]models.TaskBreakdownItem, error) {
	query := `
		SELECT 
			t.id,
			t.title,
			p.name as project_name,
			COALESCE(t.custom_fields->>'priority', 'medium') as priority,
			t.status,
			SUM(GREATEST(utl.duration_seconds, 0)) as total_seconds,
			COUNT(utl.id) as sessions
		FROM unified_timer_logs utl
		JOIN tasks t ON utl.target_type = 'project_task' AND utl.target_id = t.id
		LEFT JOIN projects p ON t.project_id = p.id
		WHERE utl.user_id = $1
		AND utl.status = 'completed'
		AND utl.start_time >= $2
		AND utl.start_time < $3
		GROUP BY t.id, t.title, p.name, t.custom_fields->>'priority', t.status
		ORDER BY total_seconds DESC
		LIMIT 10`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, date, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var breakdown []models.TaskBreakdownItem
	for rows.Next() {
		var item models.TaskBreakdownItem
		var totalSeconds int

		err := rows.Scan(&item.TaskID, &item.TaskTitle, &item.ProjectName,
			&item.Priority, &item.Status, &totalSeconds, &item.Sessions)
		if err != nil {
			return nil, err
		}

		item.TotalHours = float64(totalSeconds) / 3600.0
		item.TotalSeconds = totalSeconds
		item.FormattedTime = models.FormatDuration(totalSeconds)
		breakdown = append(breakdown, item)
	}

	return breakdown, nil
}

// getDayHourlyDistribution gets hourly work distribution for a specific day
func (r *PostgresTimerRepository) getDayHourlyDistribution(ctx context.Context, userID int, date, endDate time.Time) ([]models.HourlyDistributionItem, error) {
	query := `
		SELECT 
			EXTRACT(HOUR FROM utl.start_time AT TIME ZONE 'Asia/Shanghai') as hour,
			SUM(GREATEST(utl.duration_seconds, 0)) as total_seconds,
			COUNT(utl.id) as sessions
		FROM unified_timer_logs utl
		WHERE utl.user_id = $1
		AND utl.status = 'completed'
		AND utl.start_time >= $2
		AND utl.start_time < $3
		GROUP BY EXTRACT(HOUR FROM utl.start_time AT TIME ZONE 'Asia/Shanghai')
		ORDER BY hour`

	rows, err := r.getExecer().QueryContext(ctx, query, userID, date, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	distribution := make([]models.HourlyDistributionItem, 24)
	for i := 0; i < 24; i++ {
		distribution[i] = models.HourlyDistributionItem{
			Hour:         i,
			TotalHours:   0,
			TotalSeconds: 0,
			Sessions:     0,
		}
	}

	for rows.Next() {
		var hour, totalSeconds, sessions int
		err := rows.Scan(&hour, &totalSeconds, &sessions)
		if err != nil {
			return nil, err
		}

		if hour >= 0 && hour < 24 {
			distribution[hour].TotalHours = float64(totalSeconds) / 3600.0
			distribution[hour].TotalSeconds = totalSeconds
			distribution[hour].Sessions = sessions
		}
	}

	return distribution, nil
}

// calculateEfficiencyTrends calculates trends between the 3 days
func (r *PostgresTimerRepository) calculateEfficiencyTrends(dayBefore, yesterday, today *models.DayEfficiencyData) models.EfficiencyTrends {
	// Calculate percentage changes
	calcChange := func(old, new float64) float64 {
		if old == 0 {
			if new > 0 {
				return 100.0
			}
			return 0.0
		}
		return ((new - old) / old) * 100.0
	}

	return models.EfficiencyTrends{
		EfficiencyIndexChange:   calcChange(yesterday.EfficiencyIndex, today.EfficiencyIndex),
		TotalHoursChange:        calcChange(yesterday.TotalHours, today.TotalHours),
		CompletedTasksChange:    calcChange(float64(yesterday.CompletedTasks), float64(today.CompletedTasks)),
		AvgSessionChange:        calcChange(float64(yesterday.AvgSessionDuration), float64(today.AvgSessionDuration)),
		
		// 3-day trend direction
		WeekTrendDirection: r.calculateTrendDirection(
			[]float64{dayBefore.EfficiencyIndex, yesterday.EfficiencyIndex, today.EfficiencyIndex}),
	}
}

// calculateTrendDirection determines the overall trend direction
func (r *PostgresTimerRepository) calculateTrendDirection(values []float64) string {
	if len(values) < 3 {
		return "stable"
	}

	// Calculate trend slope
	improvements := 0
	declines := 0

	for i := 1; i < len(values); i++ {
		if values[i] > values[i-1] {
			improvements++
		} else if values[i] < values[i-1] {
			declines++
		}
	}

	if improvements > declines {
		return "improving"
	} else if declines > improvements {
		return "declining"
	}
	return "stable"
}

// generateEfficiencyInsights generates AI-like insights for efficiency analysis
func (r *PostgresTimerRepository) generateEfficiencyInsights(dayBefore, yesterday, today *models.DayEfficiencyData, trends models.EfficiencyTrends) []models.EfficiencyInsight {
	var insights []models.EfficiencyInsight

	// Efficiency trend insights
	if trends.EfficiencyIndexChange > 10 {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "positive",
			Title:       "效率显著提升",
			Description: fmt.Sprintf("今日效率指数较昨日提升 %.1f%%，工作状态优秀！", trends.EfficiencyIndexChange),
			Priority:    "high",
		})
	} else if trends.EfficiencyIndexChange < -10 {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "warning",
			Title:       "效率有所下降",
			Description: fmt.Sprintf("今日效率指数较昨日下降 %.1f%%，建议优化工作方式", math.Abs(trends.EfficiencyIndexChange)),
			Priority:    "medium",
		})
	}

	// Work time insights
	if today.TotalHours > 8 {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "info",
			Title:       "工作时长较长",
			Description: fmt.Sprintf("今日工作 %.1f 小时，注意劳逸结合", today.TotalHours),
			Priority:    "low",
		})
	} else if today.TotalHours < 4 && today.TotalHours > 0 {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "suggestion",
			Title:       "工作时长偏少",
			Description: fmt.Sprintf("今日仅工作 %.1f 小时，可适当增加专注时间", today.TotalHours),
			Priority:    "medium",
		})
	}

	// Session focus insights
	if today.AvgSessionDuration > 1800 { // 30+ minutes
		insights = append(insights, models.EfficiencyInsight{
			Type:        "positive",
			Title:       "专注度很好",
			Description: fmt.Sprintf("平均专注时长 %s，深度工作表现优秀", today.FormattedAvgSession),
			Priority:    "low",
		})
	} else if today.AvgSessionDuration < 900 && today.TimerSessions > 3 { // <15 minutes but multiple sessions
		insights = append(insights, models.EfficiencyInsight{
			Type:        "suggestion",
			Title:       "专注时间偏短",
			Description: fmt.Sprintf("平均专注时长 %s，建议减少打断，提高单次专注时长", today.FormattedAvgSession),
			Priority:    "medium",
		})
	}

	// Task completion insights
	if today.CompletedTasks > yesterday.CompletedTasks && today.CompletedTasks > 0 {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "positive",
			Title:       "任务完成进步",
			Description: fmt.Sprintf("今日完成 %d 个任务，比昨日多完成 %d 个", today.CompletedTasks, today.CompletedTasks-yesterday.CompletedTasks),
			Priority:    "medium",
		})
	}

	// 3-day trend insights
	if trends.WeekTrendDirection == "improving" {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "positive",
			Title:       "整体趋势向好",
			Description: "近3日效率呈上升趋势，继续保持！",
			Priority:    "high",
		})
	} else if trends.WeekTrendDirection == "declining" {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "warning",
			Title:       "效率趋势下滑",
			Description: "近3日效率有下滑趋势，建议调整工作策略",
			Priority:    "high",
		})
	}

	// If no insights, add a default one
	if len(insights) == 0 {
		insights = append(insights, models.EfficiencyInsight{
			Type:        "info",
			Title:       "工作状态稳定",
			Description: "各项指标表现稳定，继续保持当前工作节奏",
			Priority:    "low",
		})
	}

	return insights
}

// getBatchDayEfficiencyData optimizes the database queries by getting all days' data in a single batch
func (r *PostgresTimerRepository) getBatchDayEfficiencyData(ctx context.Context, userID int, dates []time.Time) ([]*models.DayEfficiencyData, error) {
	if len(dates) == 0 {
		return nil, fmt.Errorf("no dates provided")
	}

	var results []*models.DayEfficiencyData

	// Build optimized batch query for timer statistics
	batchTimerQuery := `
		WITH date_series AS (
			SELECT unnest($2::timestamp[]) as query_date
		),
		timer_stats AS (
			SELECT 
				DATE(ds.query_date) as date,
				COALESCE(SUM(GREATEST(utl.duration_seconds, 0)), 0) as total_seconds,
				COUNT(utl.id) as timer_sessions,
				COUNT(DISTINCT utl.target_id) as unique_tasks_worked,
				CASE WHEN COUNT(utl.id) > 0 
					THEN AVG(utl.duration_seconds)::int 
					ELSE 0 
				END as avg_session_duration,
				COALESCE(MAX(utl.duration_seconds), 0) as top_task_seconds
			FROM date_series ds
			LEFT JOIN unified_timer_logs utl ON 
				utl.user_id = $1
				AND utl.status = 'completed'
				AND utl.start_time >= ds.query_date
				AND utl.start_time < ds.query_date + INTERVAL '1 day'
			GROUP BY DATE(ds.query_date)
			ORDER BY DATE(ds.query_date)
		),
		task_stats AS (
			SELECT 
				DATE(ds.query_date) as date,
				COUNT(DISTINCT t.id) as completed_tasks
			FROM date_series ds
			LEFT JOIN tasks t ON 
				t.assignee_id = $1
				AND t.status = 'completed'
				AND t.updated_at >= ds.query_date
				AND t.updated_at < ds.query_date + INTERVAL '1 day'
			GROUP BY DATE(ds.query_date)
			ORDER BY DATE(ds.query_date)
		)
		SELECT 
			ts.date,
			ts.total_seconds,
			ts.timer_sessions,
			ts.unique_tasks_worked,
			ts.avg_session_duration,
			ts.top_task_seconds,
			tsk.completed_tasks
		FROM timer_stats ts
		JOIN task_stats tsk ON ts.date = tsk.date
		ORDER BY ts.date`

	// Convert dates to string array for PostgreSQL
	dateStrings := make([]string, len(dates))
	for i, date := range dates {
		dateStrings[i] = date.Format("2006-01-02 15:04:05")
	}

	rows, err := r.getExecer().QueryContext(ctx, batchTimerQuery, userID, pq.Array(dateStrings))
	if err != nil {
		return nil, fmt.Errorf("batch timer query failed: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var date time.Time
		var totalSeconds, timerSessions, uniqueTasksWorked, avgSessionDuration, topTaskSeconds, completedTasks int

		err := rows.Scan(&date, &totalSeconds, &timerSessions, &uniqueTasksWorked, &avgSessionDuration, &topTaskSeconds, &completedTasks)
		if err != nil {
			return nil, fmt.Errorf("failed to scan batch row: %w", err)
		}

		totalHours := float64(totalSeconds) / 3600.0
		efficiencyIndex := r.calculateComprehensiveEfficiencyIndex(
			totalHours, completedTasks, timerSessions, avgSessionDuration, topTaskSeconds, totalSeconds)

		// Get task breakdown for this date (still individual queries for detailed data)
		taskBreakdown, err := r.getDayTaskBreakdown(ctx, userID, date, date.AddDate(0, 0, 1))
		if err != nil {
			// Log error but continue - task breakdown is not critical
			log.Printf("Failed to get task breakdown for %s: %v", date.Format("2006-01-02"), err)
			taskBreakdown = []models.TaskBreakdownItem{}
		}

		// Get hourly distribution
		hourlyDistribution, err := r.getDayHourlyDistribution(ctx, userID, date, date.AddDate(0, 0, 1))
		if err != nil {
			// Log error but continue - hourly distribution is not critical
			log.Printf("Failed to get hourly distribution for %s: %v", date.Format("2006-01-02"), err)
			hourlyDistribution = r.getEmptyHourlyDistribution()
		}

		// Get top task title (simplified)
		topTaskTitle := ""
		if len(taskBreakdown) > 0 {
			topTaskTitle = taskBreakdown[0].TaskTitle
		}

		result := &models.DayEfficiencyData{
			Date:                 date.Format("2006-01-02"),
			TotalHours:           totalHours,
			TotalSeconds:         totalSeconds,
			CompletedTasks:       completedTasks,
			UniqueTasksWorked:    uniqueTasksWorked,
			TimerSessions:        timerSessions,
			AvgSessionDuration:   avgSessionDuration,
			EfficiencyIndex:      efficiencyIndex,
			TopTaskTitle:         topTaskTitle,
			TopTaskHours:         float64(topTaskSeconds) / 3600.0,
			TaskBreakdown:        taskBreakdown,
			HourlyDistribution:   hourlyDistribution,
			FormattedTotalTime:   models.FormatDuration(totalSeconds),
			FormattedAvgSession:  models.FormatDuration(avgSessionDuration),
		}

		results = append(results, result)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating batch rows: %w", err)
	}

	return results, nil
}

// getEmptyHourlyDistribution returns a 24-hour empty distribution
func (r *PostgresTimerRepository) getEmptyHourlyDistribution() []models.HourlyDistributionItem {
	var distribution []models.HourlyDistributionItem
	for hour := 0; hour < 24; hour++ {
		distribution = append(distribution, models.HourlyDistributionItem{
			Hour:         hour,
			TotalHours:   0,
			TotalSeconds: 0,
			Sessions:     0,
		})
	}
	return distribution
}

// PerformanceMonitor tracks algorithm performance metrics
type PerformanceMonitor struct {
	Operation    string                     `json:"operation"`
	UserID       int                        `json:"user_id"`
	StartTime    time.Time                  `json:"start_time"`
	Steps        map[string]time.Duration   `json:"steps"`
	Fallbacks    []string                   `json:"fallbacks"`
	TotalTime    time.Duration              `json:"total_time"`
	Success      bool                       `json:"success"`
	Timestamp    string                     `json:"timestamp"`
}

// startPerformanceMonitor creates a new performance monitor
func (r *PostgresTimerRepository) startPerformanceMonitor(operation string, userID int) *PerformanceMonitor {
	return &PerformanceMonitor{
		Operation: operation,
		UserID:    userID,
		StartTime: time.Now(),
		Steps:     make(map[string]time.Duration),
		Fallbacks: make([]string, 0),
		Success:   true,
		Timestamp: time.Now().Format(time.RFC3339),
	}
}

// RecordStep records a performance step
func (pm *PerformanceMonitor) RecordStep(stepName string, duration time.Duration) {
	pm.Steps[stepName] = duration
}

// RecordFallback records when fallback logic is used
func (pm *PerformanceMonitor) RecordFallback(reason string) {
	pm.Fallbacks = append(pm.Fallbacks, reason)
}

// Complete finalizes the performance monitoring
func (pm *PerformanceMonitor) Complete(totalTime time.Duration) {
	pm.TotalTime = totalTime
	
	// Log performance metrics (in production, this could send to monitoring system)
	if totalTime > 100*time.Millisecond {
		log.Printf("PERF_WARN: %s took %v (UserID: %d, Fallbacks: %v)", 
			pm.Operation, totalTime, pm.UserID, pm.Fallbacks)
	} else {
		log.Printf("PERF_INFO: %s completed in %v (UserID: %d)", 
			pm.Operation, totalTime, pm.UserID)
	}
	
	// Log step breakdown for detailed analysis
	if len(pm.Steps) > 0 {
		stepLog := "Steps: "
		for step, duration := range pm.Steps {
			stepLog += fmt.Sprintf("%s=%v ", step, duration)
		}
		log.Printf("PERF_DETAIL: %s - %s", pm.Operation, stepLog)
	}
}

// PerformanceMetrics aggregates performance data
type PerformanceMetrics struct {
	TotalRequests       int64                          `json:"total_requests"`
	AverageResponseTime time.Duration                  `json:"average_response_time"`
	FallbackRate        float64                        `json:"fallback_rate"`
	StepBreakdown       map[string]time.Duration       `json:"step_breakdown"`
	LastUpdated         string                         `json:"last_updated"`
}

// Global performance metrics (in production, use proper metrics collection)
var globalPerfMetrics = &PerformanceMetrics{
	StepBreakdown: make(map[string]time.Duration),
	LastUpdated:   time.Now().Format(time.RFC3339),
}
