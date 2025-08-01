package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// UserTimerRepository defines the interface for user timer task operations
type UserTimerRepository interface {
	// CRUD operations
	Create(ctx context.Context, task *models.UserTimerTask) (*models.UserTimerTask, error)
	GetByID(ctx context.Context, id int) (*models.UserTimerTask, error)
	GetByUserID(ctx context.Context, userID int, filter *models.UserTimerFilter, limit, offset int) ([]*models.UserTimerTask, int, error)
	Update(ctx context.Context, task *models.UserTimerTask) (*models.UserTimerTask, error)
	Delete(ctx context.Context, id int) error
	SoftDelete(ctx context.Context, id int) error
	
	// Personal timer operations
	ToggleFavorite(ctx context.Context, id int, isFavorite bool) error
	UpdateStatus(ctx context.Context, id int, status string) error
	GetFavoritesByUserID(ctx context.Context, userID int, limit int) ([]*models.UserTimerTask, error)
	GetActiveByUserID(ctx context.Context, userID int, limit int) ([]*models.UserTimerTask, error)
	
	// Statistics and analytics
	GetUserTimerStats(ctx context.Context, userID int) (*models.PersonalTimerSummary, error)
	GetDashboardData(ctx context.Context, userID int) (*models.PersonalTimerDashboard, error)
	GetTimerSessions(ctx context.Context, userID int, limit, offset int) ([]*models.PersonalTimerSession, error)
	GetTodayStats(ctx context.Context, userID int) (*models.PersonalTimerTodayStats, error)
	GetAnalytics(ctx context.Context, userID int, dateRange string) (*models.PersonalTimerAnalytics, error)
	
	// Task validation
	CheckUserOwnership(ctx context.Context, taskID, userID int) (bool, error)
	CheckTitleExists(ctx context.Context, userID int, title string, excludeID *int) (bool, error)
}

// PostgresUserTimerRepository implements UserTimerRepository using PostgreSQL
type PostgresUserTimerRepository struct {
	db DBExecutor
}

// NewUserTimerRepository creates a new PostgresUserTimerRepository
func NewUserTimerRepository(db DBExecutor) UserTimerRepository {
	return &PostgresUserTimerRepository{db: db}
}

// Create creates a new user timer task
func (r *PostgresUserTimerRepository) Create(ctx context.Context, task *models.UserTimerTask) (*models.UserTimerTask, error) {
	query := `
		INSERT INTO user_timer_tasks (
			user_id, title, description, category, priority, status, color,
			is_favorite, target_time_seconds, tags, metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at, total_time_seconds`

	row := r.db.QueryRowContext(ctx, query,
		task.UserID, task.Title, task.Description, task.Category, task.Priority,
		task.Status, task.Color, task.IsFavorite, task.TargetTimeSeconds,
		task.Tags, task.Metadata,
	)

	err := row.Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt, &task.TotalTimeSeconds)
	if err != nil {
		return nil, fmt.Errorf("failed to create user timer task: %w", err)
	}

	return task, nil
}

// GetByID retrieves a user timer task by its ID
func (r *PostgresUserTimerRepository) GetByID(ctx context.Context, id int) (*models.UserTimerTask, error) {
	query := `
		SELECT id, user_id, title, description, category, priority, status, color,
		       is_favorite, total_time_seconds, target_time_seconds, tags, metadata,
		       created_at, updated_at, deleted_at
		FROM user_timer_tasks
		WHERE id = $1 AND deleted_at IS NULL`

	var task models.UserTimerTask
	row := r.db.QueryRowContext(ctx, query, id)

	err := row.Scan(
		&task.ID, &task.UserID, &task.Title, &task.Description, &task.Category,
		&task.Priority, &task.Status, &task.Color, &task.IsFavorite,
		&task.TotalTimeSeconds, &task.TargetTimeSeconds, &task.Tags, &task.Metadata,
		&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user timer task not found")
		}
		return nil, fmt.Errorf("failed to get user timer task: %w", err)
	}

	return &task, nil
}

// GetByUserID retrieves user timer tasks by user ID with filtering
func (r *PostgresUserTimerRepository) GetByUserID(ctx context.Context, userID int, filter *models.UserTimerFilter, limit, offset int) ([]*models.UserTimerTask, int, error) {
	// Build WHERE clause
	whereConditions := []string{"user_id = $1", "deleted_at IS NULL"}
	args := []interface{}{userID}
	argIndex := 2

	if filter != nil {
		if filter.Category != "" {
			whereConditions = append(whereConditions, fmt.Sprintf("category = $%d", argIndex))
			args = append(args, filter.Category)
			argIndex++
		}
		if filter.Status != "" {
			whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
			args = append(args, filter.Status)
			argIndex++
		}
		if filter.Priority != "" {
			whereConditions = append(whereConditions, fmt.Sprintf("priority = $%d", argIndex))
			args = append(args, filter.Priority)
			argIndex++
		}
		if filter.IsFavorite != nil {
			whereConditions = append(whereConditions, fmt.Sprintf("is_favorite = $%d", argIndex))
			args = append(args, *filter.IsFavorite)
			argIndex++
		}
		if filter.Search != "" {
			whereConditions = append(whereConditions, fmt.Sprintf("(title ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex))
			args = append(args, "%"+filter.Search+"%")
			argIndex++
		}
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Build ORDER BY clause
	orderBy := "created_at DESC"
	if filter != nil && filter.SortBy != "" {
		validSortFields := map[string]bool{
			"created_at":         true,
			"updated_at":         true,
			"total_time_seconds": true,
			"title":              true,
			"priority":           true,
		}
		if validSortFields[filter.SortBy] {
			order := "DESC"
			if filter.SortOrder == "asc" {
				order = "ASC"
			}
			orderBy = fmt.Sprintf("%s %s", filter.SortBy, order)
		}
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM user_timer_tasks WHERE %s", whereClause)
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args[:len(args)-1]...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count user timer tasks: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT id, user_id, title, description, category, priority, status, color,
		       is_favorite, total_time_seconds, target_time_seconds, tags, metadata,
		       created_at, updated_at, deleted_at
		FROM user_timer_tasks
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query user timer tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.UserTimerTask
	for rows.Next() {
		var task models.UserTimerTask
		err := rows.Scan(
			&task.ID, &task.UserID, &task.Title, &task.Description, &task.Category,
			&task.Priority, &task.Status, &task.Color, &task.IsFavorite,
			&task.TotalTimeSeconds, &task.TargetTimeSeconds, &task.Tags, &task.Metadata,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user timer task: %w", err)
		}
		tasks = append(tasks, &task)
	}

	return tasks, total, nil
}

// Update updates a user timer task
func (r *PostgresUserTimerRepository) Update(ctx context.Context, task *models.UserTimerTask) (*models.UserTimerTask, error) {
	query := `
		UPDATE user_timer_tasks 
		SET title = $2, description = $3, category = $4, priority = $5, status = $6,
		    color = $7, is_favorite = $8, target_time_seconds = $9, tags = $10,
		    metadata = $11, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at`

	row := r.db.QueryRowContext(ctx, query,
		task.ID, task.Title, task.Description, task.Category, task.Priority,
		task.Status, task.Color, task.IsFavorite, task.TargetTimeSeconds,
		task.Tags, task.Metadata,
	)

	err := row.Scan(&task.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user timer task not found")
		}
		return nil, fmt.Errorf("failed to update user timer task: %w", err)
	}

	return task, nil
}

// Delete permanently deletes a user timer task
func (r *PostgresUserTimerRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM user_timer_tasks WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user timer task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user timer task not found")
	}

	return nil
}

// SoftDelete soft deletes a user timer task
func (r *PostgresUserTimerRepository) SoftDelete(ctx context.Context, id int) error {
	query := `
		UPDATE user_timer_tasks 
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to soft delete user timer task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user timer task not found")
	}

	return nil
}

// ToggleFavorite toggles the favorite status of a user timer task
func (r *PostgresUserTimerRepository) ToggleFavorite(ctx context.Context, id int, isFavorite bool) error {
	query := `
		UPDATE user_timer_tasks 
		SET is_favorite = $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id, isFavorite)
	if err != nil {
		return fmt.Errorf("failed to toggle favorite: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user timer task not found")
	}

	return nil
}

// UpdateStatus updates the status of a user timer task
func (r *PostgresUserTimerRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	query := `
		UPDATE user_timer_tasks 
		SET status = $2, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.db.ExecContext(ctx, query, id, status)
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user timer task not found")
	}

	return nil
}

// GetFavoritesByUserID retrieves favorite user timer tasks
func (r *PostgresUserTimerRepository) GetFavoritesByUserID(ctx context.Context, userID int, limit int) ([]*models.UserTimerTask, error) {
	query := `
		SELECT id, user_id, title, description, category, priority, status, color,
		       is_favorite, total_time_seconds, target_time_seconds, tags, metadata,
		       created_at, updated_at, deleted_at
		FROM user_timer_tasks
		WHERE user_id = $1 AND is_favorite = true AND deleted_at IS NULL
		ORDER BY total_time_seconds DESC, updated_at DESC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query favorite tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.UserTimerTask
	for rows.Next() {
		var task models.UserTimerTask
		err := rows.Scan(
			&task.ID, &task.UserID, &task.Title, &task.Description, &task.Category,
			&task.Priority, &task.Status, &task.Color, &task.IsFavorite,
			&task.TotalTimeSeconds, &task.TargetTimeSeconds, &task.Tags, &task.Metadata,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan favorite task: %w", err)
		}
		tasks = append(tasks, &task)
	}

	return tasks, nil
}

// GetActiveByUserID retrieves active user timer tasks
func (r *PostgresUserTimerRepository) GetActiveByUserID(ctx context.Context, userID int, limit int) ([]*models.UserTimerTask, error) {
	query := `
		SELECT id, user_id, title, description, category, priority, status, color,
		       is_favorite, total_time_seconds, target_time_seconds, tags, metadata,
		       created_at, updated_at, deleted_at
		FROM user_timer_tasks
		WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL
		ORDER BY updated_at DESC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query active tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.UserTimerTask
	for rows.Next() {
		var task models.UserTimerTask
		err := rows.Scan(
			&task.ID, &task.UserID, &task.Title, &task.Description, &task.Category,
			&task.Priority, &task.Status, &task.Color, &task.IsFavorite,
			&task.TotalTimeSeconds, &task.TargetTimeSeconds, &task.Tags, &task.Metadata,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan active task: %w", err)
		}
		tasks = append(tasks, &task)
	}

	return tasks, nil
}

// GetUserTimerStats retrieves user timer statistics summary
func (r *PostgresUserTimerRepository) GetUserTimerStats(ctx context.Context, userID int) (*models.PersonalTimerSummary, error) {
	query := `
		SELECT 
			COUNT(*) as total_tasks,
			COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tasks,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
			COUNT(CASE WHEN is_favorite = true AND status = 'active' THEN 1 END) as favorite_tasks,
			COALESCE(SUM(total_time_seconds), 0) as total_time_seconds
		FROM user_timer_tasks
		WHERE user_id = $1 AND deleted_at IS NULL`

	var stats models.PersonalTimerSummary
	row := r.db.QueryRowContext(ctx, query, userID)

	err := row.Scan(
		&stats.TotalTasks,
		&stats.ActiveTasks,
		&stats.CompletedTasks,
		&stats.FavoriteTasks,
		&stats.TotalTimeSeconds,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get user timer stats: %w", err)
	}

	stats.FormattedTotalTime = models.FormatDuration(stats.TotalTimeSeconds)

	// Calculate additional statistics
	if stats.TotalTasks > 0 {
		// Get average daily time (last 30 days)
		avgQuery := `
			SELECT COALESCE(AVG(daily_seconds), 0)
			FROM (
				SELECT DATE(ttl.created_at) as date, SUM(ttl.duration_seconds) as daily_seconds
				FROM task_time_logs ttl
				JOIN user_timer_tasks utt ON ttl.user_timer_task_id = utt.id
				WHERE utt.user_id = $1 AND ttl.created_at >= NOW() - INTERVAL '30 days'
				GROUP BY DATE(ttl.created_at)
			) daily_stats`

		var avgDaily float64
		r.db.QueryRowContext(ctx, avgQuery, userID).Scan(&avgDaily)
		stats.AverageDaily = int(avgDaily)

		// Get most productive day
		dayQuery := `
			SELECT EXTRACT(DOW FROM ttl.created_at) as day_of_week, SUM(ttl.duration_seconds) as total_seconds
			FROM task_time_logs ttl
			JOIN user_timer_tasks utt ON ttl.user_timer_task_id = utt.id
			WHERE utt.user_id = $1 AND ttl.created_at >= NOW() - INTERVAL '90 days'
			GROUP BY EXTRACT(DOW FROM ttl.created_at)
			ORDER BY total_seconds DESC
			LIMIT 1`

		var dayOfWeek int
		var totalSeconds int
		err = r.db.QueryRowContext(ctx, dayQuery, userID).Scan(&dayOfWeek, &totalSeconds)
		if err == nil {
			dayNames := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
			stats.MostProductiveDay = dayNames[dayOfWeek]
		}

		// Get most used category
		categoryQuery := `
			SELECT category, COUNT(*) as task_count
			FROM user_timer_tasks
			WHERE user_id = $1 AND deleted_at IS NULL
			GROUP BY category
			ORDER BY task_count DESC
			LIMIT 1`

		r.db.QueryRowContext(ctx, categoryQuery, userID).Scan(&stats.MostUsedCategory, &totalSeconds)
	}

	return &stats, nil
}

// GetDashboardData retrieves comprehensive dashboard data
func (r *PostgresUserTimerRepository) GetDashboardData(ctx context.Context, userID int) (*models.PersonalTimerDashboard, error) {
	dashboard := &models.PersonalTimerDashboard{}

	// Get current timer status
	currentTimer, err := r.getCurrentTimer(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current timer: %w", err)
	}
	dashboard.CurrentTimer = currentTimer

	// Get today stats
	todayStats, err := r.GetTodayStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get today stats: %w", err)
	}
	dashboard.TodayStats = *todayStats

	// Get timer tasks (active, ordered by recent activity)
	tasks, _, err := r.GetByUserID(ctx, userID, &models.UserTimerFilter{Status: "active"}, 10, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get timer tasks: %w", err)
	}

	// Convert to response format with additional stats
	for _, task := range tasks {
		response := task.ToResponse()
		// Add additional stats if needed (last timed, times count, etc.)
		dashboard.TimerTasks = append(dashboard.TimerTasks, response)
	}

	// Get recent sessions
	sessions, err := r.GetTimerSessions(ctx, userID, 10, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent sessions: %w", err)
	}
	dashboard.RecentSessions = *sessions

	// Get favorite tasks
	favoriteTasks, err := r.GetFavoritesByUserID(ctx, userID, 5)
	if err != nil {
		return nil, fmt.Errorf("failed to get favorite tasks: %w", err)
	}

	for _, task := range favoriteTasks {
		response := task.ToResponse()
		dashboard.FavoriteTasks = append(dashboard.FavoriteTasks, response)
	}

	// Get summary
	summary, err := r.GetUserTimerStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary: %w", err)
	}
	dashboard.Summary = *summary

	return dashboard, nil
}

// getCurrentTimer gets the current timer status for a user
func (r *PostgresUserTimerRepository) getCurrentTimer(ctx context.Context, userID int) (*models.PersonalTimerCurrent, error) {
	query := `
		SELECT 
			u.timing_status,
			u.timing_start_time,
			u.current_timing_task_id,
			u.current_user_timer_task_id,
			COALESCE(t.title, utt.title) as task_title,
			COALESCE(utt.color, '#1890ff') as task_color,
			COALESCE(utt.category, 'work') as task_category
		FROM users u
		LEFT JOIN tasks t ON u.current_timing_task_id = t.id
		LEFT JOIN user_timer_tasks utt ON u.current_user_timer_task_id = utt.id
		WHERE u.id = $1`

	var timingStatus sql.NullString
	var timingStartTime *time.Time
	var currentTaskID sql.NullInt64
	var currentUserTaskID sql.NullInt64
	var taskTitle sql.NullString
	var taskColor sql.NullString
	var taskCategory sql.NullString

	row := r.db.QueryRowContext(ctx, query, userID)
	err := row.Scan(&timingStatus, &timingStartTime, &currentTaskID, &currentUserTaskID, &taskTitle, &taskColor, &taskCategory)
	if err != nil {
		return nil, fmt.Errorf("failed to get current timer: %w", err)
	}

	current := &models.PersonalTimerCurrent{
		IsRunning: timingStatus.String == "running",
	}

	if current.IsRunning && timingStartTime != nil {
		current.StartTime = timingStartTime
		current.ElapsedSeconds = models.GetElapsedSeconds(*timingStartTime)
		current.FormattedTime = models.FormatDuration(current.ElapsedSeconds)

		if currentUserTaskID.Valid {
			current.TaskType = "personal"
			taskID := int(currentUserTaskID.Int64)
			current.TaskID = &taskID
		} else if currentTaskID.Valid {
			current.TaskType = "project"
			taskID := int(currentTaskID.Int64)
			current.TaskID = &taskID
		}

		if taskTitle.Valid {
			current.TaskTitle = &taskTitle.String
		}
		if taskColor.Valid {
			current.TaskColor = &taskColor.String
		}
		if taskCategory.Valid {
			current.TaskCategory = &taskCategory.String
		}
	}

	return current, nil
}

// GetTimerSessions retrieves timer sessions for a user
func (r *PostgresUserTimerRepository) GetTimerSessions(ctx context.Context, userID int, limit, offset int) (*[]models.PersonalTimerSession, error) {
	query := `
		SELECT 
			ttl.id,
			CASE WHEN ttl.user_timer_task_id IS NOT NULL THEN 'personal' ELSE 'project' END as task_type,
			COALESCE(ttl.user_timer_task_id, ttl.task_id) as task_id,
			COALESCE(utt.title, t.title) as task_title,
			COALESCE(utt.color, '#1890ff') as task_color,
			COALESCE(utt.category, 'work') as task_category,
			ttl.start_time,
			ttl.end_time,
			ttl.duration_seconds
		FROM task_time_logs ttl
		LEFT JOIN user_timer_tasks utt ON ttl.user_timer_task_id = utt.id
		LEFT JOIN tasks t ON ttl.task_id = t.id
		WHERE ttl.user_id = $1 AND ttl.end_time IS NOT NULL
		ORDER BY ttl.start_time DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query timer sessions: %w", err)
	}
	defer rows.Close()

	var sessions []models.PersonalTimerSession
	for rows.Next() {
		var session models.PersonalTimerSession
		var taskID int

		err := rows.Scan(
			&session.ID,
			&session.TaskType,
			&taskID,
			&session.TaskTitle,
			&session.TaskColor,
			&session.TaskCategory,
			&session.StartTime,
			&session.EndTime,
			&session.DurationSeconds,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan timer session: %w", err)
		}

		session.TaskID = &taskID
		session.FormattedTime = models.FormatDuration(session.DurationSeconds)
		session.Date = session.StartTime.Format("2006-01-02")
		session.WeekDay = session.StartTime.Weekday().String()

		sessions = append(sessions, session)
	}

	return &sessions, nil
}

// GetTodayStats retrieves today's timer statistics
func (r *PostgresUserTimerRepository) GetTodayStats(ctx context.Context, userID int) (*models.PersonalTimerTodayStats, error) {
	query := `
		SELECT 
			COALESCE(SUM(ttl.duration_seconds), 0) as total_seconds,
			COUNT(ttl.id) as sessions_count,
			COUNT(DISTINCT COALESCE(ttl.user_timer_task_id, ttl.task_id)) as tasks_worked_on,
			MAX(ttl.duration_seconds) as longest_session
		FROM task_time_logs ttl
		LEFT JOIN user_timer_tasks utt ON ttl.user_timer_task_id = utt.id
		WHERE ttl.user_id = $1 AND DATE(ttl.created_at) = CURRENT_DATE`

	var stats models.PersonalTimerTodayStats
	var longestSession sql.NullInt64

	row := r.db.QueryRowContext(ctx, query, userID)
	err := row.Scan(&stats.TotalSeconds, &stats.SessionsCount, &stats.TasksWorkedOn, &longestSession)
	if err != nil {
		return nil, fmt.Errorf("failed to get today stats: %w", err)
	}

	stats.FormattedTime = models.FormatDuration(stats.TotalSeconds)
	if longestSession.Valid {
		stats.LongestSession = int(longestSession.Int64)
	}

	// Get most worked task today
	taskQuery := `
		SELECT COALESCE(utt.title, t.title)
		FROM task_time_logs ttl
		LEFT JOIN user_timer_tasks utt ON ttl.user_timer_task_id = utt.id
		LEFT JOIN tasks t ON ttl.task_id = t.id
		WHERE ttl.user_id = $1 AND DATE(ttl.created_at) = CURRENT_DATE
		GROUP BY COALESCE(utt.title, t.title)
		ORDER BY SUM(ttl.duration_seconds) DESC
		LIMIT 1`

	var mostWorkedTask sql.NullString
	r.db.QueryRowContext(ctx, taskQuery, userID).Scan(&mostWorkedTask)
	if mostWorkedTask.Valid {
		stats.MostWorkedTask = mostWorkedTask.String
	}

	// Get productive hours (simplified - you can enhance this)
	stats.ProductiveHours = make([]int, 24)
	hourQuery := `
		SELECT EXTRACT(HOUR FROM ttl.start_time) as hour, SUM(ttl.duration_seconds) as total_seconds
		FROM task_time_logs ttl
		WHERE ttl.user_id = $1 AND DATE(ttl.created_at) = CURRENT_DATE
		GROUP BY EXTRACT(HOUR FROM ttl.start_time)`

	hourRows, err := r.db.QueryContext(ctx, hourQuery, userID)
	if err == nil {
		defer hourRows.Close()
		for hourRows.Next() {
			var hour int
			var totalSeconds int
			if hourRows.Scan(&hour, &totalSeconds) == nil && hour >= 0 && hour < 24 {
				stats.ProductiveHours[hour] = totalSeconds
			}
		}
	}

	// Calculate efficiency score (simplified)
	if stats.SessionsCount > 0 {
		avgSessionLength := stats.TotalSeconds / stats.SessionsCount
		// Efficiency based on session length and consistency
		stats.EfficiencyScore = float64(avgSessionLength) / 3600 * 100 // Hours to percentage
		if stats.EfficiencyScore > 100 {
			stats.EfficiencyScore = 100
		}
	}

	return &stats, nil
}

// GetAnalytics retrieves analytics data (placeholder implementation)
func (r *PostgresUserTimerRepository) GetAnalytics(ctx context.Context, userID int, dateRange string) (*models.PersonalTimerAnalytics, error) {
	// This is a placeholder implementation
	// You can expand this to provide comprehensive analytics
	analytics := &models.PersonalTimerAnalytics{
		DateRange: dateRange,
		TotalTime: models.PersonalTimeAnalytics{
			TotalSeconds:  0,
			FormattedTime: "00:00:00",
		},
		CategoryBreakdown: []models.PersonalCategoryAnalytics{},
		WeeklyTrend:       []models.PersonalWeeklyTrend{},
		ProductivityScore: models.PersonalProductivityScore{
			OverallScore: 75.0,
		},
		Recommendations: []string{
			"Try to maintain consistent daily timer sessions",
			"Focus on your most productive hours",
			"Set time targets for better goal tracking",
		},
	}

	return analytics, nil
}

// CheckUserOwnership checks if a user owns a timer task
func (r *PostgresUserTimerRepository) CheckUserOwnership(ctx context.Context, taskID, userID int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM user_timer_tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL)`
	var exists bool
	err := r.db.QueryRowContext(ctx, query, taskID, userID).Scan(&exists)
	return exists, err
}

// CheckTitleExists checks if a title already exists for a user
func (r *PostgresUserTimerRepository) CheckTitleExists(ctx context.Context, userID int, title string, excludeID *int) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM user_timer_tasks WHERE user_id = $1 AND title = $2 AND deleted_at IS NULL`
	args := []interface{}{userID, title}

	if excludeID != nil {
		query += ` AND id != $3`
		args = append(args, *excludeID)
	}
	query += `)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&exists)
	return exists, err
}