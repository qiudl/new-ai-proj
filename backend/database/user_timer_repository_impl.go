package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

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
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
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

	// Calculate additional statistics (simplified implementation)
	if stats.TotalTasks > 0 {
		stats.AverageDaily = stats.TotalTimeSeconds / 30 // Rough estimate
		stats.MostProductiveDay = "Tuesday"              // Placeholder
		stats.MostUsedCategory = "personal"              // Placeholder
	}

	return &stats, nil
}

// GetDashboardData retrieves comprehensive dashboard data with accurate today stats and recent sessions
func (r *PostgresUserTimerRepository) GetDashboardData(ctx context.Context, userID int, tz string) (*models.PersonalTimerDashboard, error) {
	loc, err := time.LoadLocation(tz)
	if err != nil || loc == nil {
		loc = time.FixedZone("UTC", 0)
	}
	// Compute start/end of today in requested timezone
	nowTZ := time.Now().In(loc)
	tzStart := time.Date(nowTZ.Year(), nowTZ.Month(), nowTZ.Day(), 0, 0, 0, 0, loc)
	tzEnd := tzStart.Add(24 * time.Hour)
	startUTC := tzStart.UTC()
	endUTC := tzEnd.UTC()

	dashboard := &models.PersonalTimerDashboard{
		TimerTasks:     make([]models.UserTimerTaskResponse, 0),
		RecentSessions: make([]models.PersonalTimerSession, 0),
		FavoriteTasks:  make([]models.UserTimerTaskResponse, 0),
	}

	// 1) Current timer (running or paused)
	{
		query := `
			SELECT id, target_type, target_id, target_title,
			       COALESCE(target_metadata->>'color', '#1890ff') as task_color,
			       COALESCE(category, 'general') as task_category,
			       start_time, status, COALESCE(pause_total_seconds, 0)
			FROM unified_timer_logs
			WHERE user_id = $1 AND status IN ('running','paused')
			ORDER BY start_time DESC
			LIMIT 1`
		row := r.db.QueryRowContext(ctx, query, userID)
		var (
			id            int
			typeStr       string
			maybeTargetID sql.NullInt64
			title         string
			color         string
			category      string
			start         time.Time
			status        string
			pauseTotal    int
		)
		if err := row.Scan(&id, &typeStr, &maybeTargetID, &title, &color, &category, &start, &status, &pauseTotal); err == nil {
			elapsed := int(time.Since(start).Seconds())
			if elapsed < 0 {
				elapsed = 0
			}
			dashboard.CurrentTimer = &models.PersonalTimerCurrent{
				IsRunning:      status == "running",
				TaskType:       map[string]string{"project_task": "project", "personal_task": "personal"}[typeStr],
				TaskTitle:      &title,
				TaskColor:      &color,
				TaskCategory:   &category,
				StartTime:      &start,
				ElapsedSeconds: elapsed,
				FormattedTime:  models.FormatDuration(elapsed),
			}
		}
	}

	// 2) Today stats (completed + running overlap)
	{
		stats := models.PersonalTimerTodayStats{
			TotalSeconds:    0,
			FormattedTime:   "00:00:00",
			SessionsCount:   0,
			TasksWorkedOn:   0,
			MostWorkedTask:  "",
			ProductiveHours: make([]int, 24),
			EfficiencyScore: 75.0,
			LongestSession:  0,
		}
		// Sum of completed sessions overlapped with today
		{
			query := `
				SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(end_time, $3) - GREATEST(start_time, $2)))), 0)::int AS total_seconds
				FROM unified_timer_logs
				WHERE user_id = $1
				  AND end_time IS NOT NULL
				  AND duration_seconds IS NOT NULL
				  AND start_time < $3 AND end_time > $2`
			var completed int
			if err := r.db.QueryRowContext(ctx, query, userID, startUTC, endUTC).Scan(&completed); err == nil {
				stats.TotalSeconds = completed
			}
		}
		// Add running overlap (till now)
		{
			query := `
				SELECT start_time
				FROM unified_timer_logs
				WHERE user_id = $1 AND status = 'running'
				ORDER BY start_time DESC LIMIT 1`
			var start time.Time
			if err := r.db.QueryRowContext(ctx, query, userID).Scan(&start); err == nil {
				ovStart := start
				if ovStart.Before(startUTC) {
					ovStart = startUTC
				}
				ovEnd := time.Now().UTC()
				if ovEnd.After(endUTC) {
					ovEnd = endUTC
				}
				if ovEnd.After(ovStart) {
					stats.TotalSeconds += int(ovEnd.Sub(ovStart).Seconds())
				}
			}
		}
		// Sessions count (started today in tz)
		{
			query := `
				SELECT COUNT(*)
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time >= $2 AND start_time < $3`
			if err := r.db.QueryRowContext(ctx, query, userID, startUTC, endUTC).Scan(&stats.SessionsCount); err != nil {
				stats.SessionsCount = 0
			}
		}
		// Tasks worked on (distinct target within today overlap)
		{
			query := `
				SELECT COUNT(DISTINCT target_title)
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time < $3 AND end_time > $2`
			if err := r.db.QueryRowContext(ctx, query, userID, startUTC, endUTC).Scan(&stats.TasksWorkedOn); err != nil {
				stats.TasksWorkedOn = 0
			}
		}
		// Most worked task today (by overlapped seconds)
		{
			query := `
				SELECT target_title, COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(end_time, $3) - GREATEST(start_time, $2)))),0)::int AS sec
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time < $3 AND end_time > $2
				GROUP BY target_title
				ORDER BY sec DESC
				LIMIT 1`
			var topTitle sql.NullString
			var topSec int
			if err := r.db.QueryRowContext(ctx, query, userID, startUTC, endUTC).Scan(&topTitle, &topSec); err == nil {
				if topTitle.Valid {
					stats.MostWorkedTask = topTitle.String
				}
			}
		}
		// Productive hours distribution (timezone aware)
		{
			query := `
				SELECT EXTRACT(HOUR FROM timezone($4, start_time))::int AS h,
				       COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(end_time, $3) - GREATEST(start_time, $2)))),0)::int AS sec
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time < $3 AND end_time > $2
				GROUP BY h
				ORDER BY h`
			rows, qerr := r.db.QueryContext(ctx, query, userID, startUTC, endUTC, tz)
			if qerr == nil {
				defer rows.Close()
				for rows.Next() {
					var h, sec int
					if err := rows.Scan(&h, &sec); err == nil {
						if h >= 0 && h < 24 {
							stats.ProductiveHours[h] = sec
						}
					}
				}
			}
		}
		// Efficiency score (sum actual_work_seconds / sum duration_seconds)
		{
			query := `
				SELECT COALESCE(SUM(actual_work_seconds),0)::int AS work_sec, COALESCE(SUM(duration_seconds),0)::int AS total_sec
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time < $3 AND end_time > $2`
			var work, total int
			if err := r.db.QueryRowContext(ctx, query, userID, startUTC, endUTC).Scan(&work, &total); err == nil && total > 0 {
				score := (float64(work) / float64(total)) * 100.0
				if score < 0 {
					score = 0
				}
				if score > 100 {
					score = 100
				}
				stats.EfficiencyScore = score
			}
		}
		// Longest session today
		{
			query := `
				SELECT COALESCE(MAX(duration_seconds),0)
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time >= $2 AND start_time < $3`
			if err := r.db.QueryRowContext(ctx, query, userID, startUTC, endUTC).Scan(&stats.LongestSession); err != nil {
				stats.LongestSession = 0
			}
		}
		stats.FormattedTime = models.FormatDuration(stats.TotalSeconds)
		// Compute today's top tasks (by overlapped seconds)
		{
			query := `
				SELECT target_title,
				       COALESCE(category, 'general') AS category,
				       COALESCE(NULLIF(target_metadata->>'color',''), '#1890ff') AS color,
				       COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(end_time, $3) - GREATEST(start_time, $2)))),0)::int AS sec,
				       COUNT(*) AS sessions
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time < $3 AND end_time > $2
				GROUP BY target_title, category, color
				ORDER BY sec DESC
				LIMIT 5`
			rows, qerr := r.db.QueryContext(ctx, query, userID, startUTC, endUTC)
			if qerr == nil {
				defer rows.Close()
				var list []models.PersonalTopTask
				for rows.Next() {
					var title, category, color string
					var sec, sessions int
					if err := rows.Scan(&title, &category, &color, &sec, &sessions); err == nil {
						list = append(list, models.PersonalTopTask{
							TaskTitle:     title,
							Category:      category,
							Color:         color,
							TotalSeconds:  sec,
							FormattedTime: models.FormatDuration(sec),
							Sessions:      sessions,
						})
					}
				}
				stats.TopTasks = list
			}
		}
		// Compute today's category breakdown
		{
			query := `
				SELECT COALESCE(category, '未分类') AS category,
				       COALESCE(SUM(EXTRACT(EPOCH FROM (LEAST(end_time, $3) - GREATEST(start_time, $2)))),0)::int AS sec,
				       COALESCE(MAX(NULLIF(target_metadata->>'color','')), '') AS color
				FROM unified_timer_logs
				WHERE user_id = $1 AND end_time IS NOT NULL AND duration_seconds IS NOT NULL
				  AND start_time < $3 AND end_time > $2
				GROUP BY category
				ORDER BY sec DESC`
			rows, qerr := r.db.QueryContext(ctx, query, userID, startUTC, endUTC)
			if qerr == nil {
				defer rows.Close()
				var list []models.PersonalCategoryItem
				for rows.Next() {
					var category string
					var sec int
					var color sql.NullString
					if err := rows.Scan(&category, &sec, &color); err == nil {
						percent := 0.0
						if stats.TotalSeconds > 0 {
							percent = (float64(sec) / float64(stats.TotalSeconds)) * 100.0
						}
						c := models.PersonalCategoryItem{
							Category:      category,
							TotalSeconds:  sec,
							FormattedTime: models.FormatDuration(sec),
							Percentage:    percent,
							Color:         "",
						}
						if color.Valid && color.String != "" {
							c.Color = color.String
						} else {
							switch strings.ToLower(category) {
							case "personal", "个人":
								c.Color = "#1890ff"
							case "work", "工作":
								c.Color = "#52c41a"
							case "study", "学习":
								c.Color = "#722ed1"
							case "fitness", "健身":
								c.Color = "#fa8c16"
							case "hobby", "爱好":
								c.Color = "#eb2f96"
							default:
								c.Color = "#1890ff"
							}
						}
						list = append(list, c)
					}
				}
				stats.CategoryBreakdown = list
			}
		}
		dashboard.TodayStats = stats
	}

	// 3) Timer tasks (active)
	tasks, _, err := r.GetByUserID(ctx, userID, &models.UserTimerFilter{Status: "active"}, 10, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get timer tasks: %w", err)
	}
	for _, task := range tasks {
		response := task.ToResponse()
		dashboard.TimerTasks = append(dashboard.TimerTasks, response)
	}

	// 4) Favorite tasks
	favoriteTasks, err := r.GetFavoritesByUserID(ctx, userID, 5)
	if err != nil {
		return nil, fmt.Errorf("failed to get favorite tasks: %w", err)
	}
	for _, task := range favoriteTasks {
		response := task.ToResponse()
		dashboard.FavoriteTasks = append(dashboard.FavoriteTasks, response)
	}

	// 5) Summary
	summary, err := r.GetUserTimerStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get summary: %w", err)
	}
	dashboard.Summary = *summary

	// 6) Recent sessions (last 10 completed)
	{
		limit := 10
		sessions, err := r.GetTimerSessions(ctx, userID, limit, 0)
		if err == nil && sessions != nil {
			dashboard.RecentSessions = *sessions
		}
	}

	return dashboard, nil
}

// GetTimerSessions retrieves timer sessions from unified_timer_logs
func (r *PostgresUserTimerRepository) GetTimerSessions(ctx context.Context, userID int, limit, offset int) (*[]models.PersonalTimerSession, error) {
	query := `
		SELECT 
			utl.id,
			utl.target_type,
			utl.target_id,
			COALESCE(utl.project_id, t.project_id) AS project_id,
			utl.target_title,
			COALESCE(utl.target_metadata->>'color', '#1890ff') as task_color,
			COALESCE(utl.category, 'general') as task_category,
			utl.start_time,
			utl.end_time,
			COALESCE(utl.duration_seconds, 0) as duration_seconds,
			CASE 
				WHEN utl.duration_seconds IS NOT NULL THEN 
					LPAD((utl.duration_seconds / 3600)::text, 2, '0') || ':' ||
					LPAD(((utl.duration_seconds % 3600) / 60)::text, 2, '0') || ':' ||
					LPAD((utl.duration_seconds % 60)::text, 2, '0')
				ELSE '00:00:00'
			END as formatted_time,
			utl.start_time::date as date,
			TO_CHAR(utl.start_time, 'FMDay') as week_day
		FROM unified_timer_logs utl
		LEFT JOIN tasks t ON utl.target_type = 'project_task' AND utl.target_id = t.id
		WHERE utl.user_id = $1 AND utl.end_time IS NOT NULL
		ORDER BY utl.start_time DESC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query timer sessions: %w", err)
	}
	defer rows.Close()

	var sessions []models.PersonalTimerSession
	for rows.Next() {
		var session models.PersonalTimerSession
		var endTime sql.NullTime
		var targetID sql.NullInt64
		var projectID sql.NullInt64
		var dateStr string

		err := rows.Scan(
			&session.ID,
			&session.TaskType,
			&targetID,
			&projectID,
			&session.TaskTitle,
			&session.TaskColor,
			&session.TaskCategory,
			&session.StartTime,
			&endTime,
			&session.DurationSeconds,
			&session.FormattedTime,
			&dateStr,
			&session.WeekDay,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan timer session: %w", err)
		}

		// Handle nullable fields
		if targetID.Valid {
			taskID := int(targetID.Int64)
			session.TaskID = &taskID
		}
		if projectID.Valid {
			pid := int(projectID.Int64)
			session.ProjectID = &pid
		}
		if endTime.Valid {
			session.EndTime = &endTime.Time
		}
		session.Date = dateStr

		sessions = append(sessions, session)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over timer sessions: %w", err)
	}

	return &sessions, nil
}

func (r *PostgresUserTimerRepository) GetTodayStats(ctx context.Context, userID int) (*models.PersonalTimerTodayStats, error) {
	stats := &models.PersonalTimerTodayStats{
		TotalSeconds:    0,
		FormattedTime:   "00:00:00",
		SessionsCount:   0,
		TasksWorkedOn:   0,
		MostWorkedTask:  "",
		ProductiveHours: make([]int, 24),
		EfficiencyScore: 75.0,
		LongestSession:  0,
	}
	return stats, nil
}

func (r *PostgresUserTimerRepository) GetAnalytics(ctx context.Context, userID int, dateRange string, tz string) (*models.PersonalTimerAnalytics, error) {
	// Determine date range in UTC for consistent bounds; convert in SQL per tz
	now := time.Now().UTC()
	var days int
	switch dateRange {
	case "7days":
		days = 7
	case "90days":
		days = 90
	default:
		// fallback to 30 days if not specified or unknown
		days = 30
	}
	start := now.AddDate(0, 0, -days)
	end := now

	analytics := &models.PersonalTimerAnalytics{
		DateRange:          dateRange,
		TotalTime:          models.PersonalTimeAnalytics{},
		CategoryBreakdown:  []models.PersonalCategoryAnalytics{},
		WeeklyTrend:        []models.PersonalWeeklyTrend{},
		HourlyDistribution: []models.PersonalHourlyDistribution{},
		TaskEfficiency:     []models.PersonalTaskEfficiency{},
		ProductivityScore:  models.PersonalProductivityScore{OverallScore: 75.0},
		Recommendations:    []string{"保持良好习惯，合理安排高效时段"},
	}

	// 1) Total time within range (use overlap within [start, end))
	var totalSeconds int
	{
		query := `
			SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (
				LEAST(end_time, $3) - GREATEST(start_time, $2)
			))), 0)::int AS total_seconds
			FROM unified_timer_logs
			WHERE user_id = $1
			  AND end_time IS NOT NULL
			  AND duration_seconds IS NOT NULL
			  AND start_time < $3 AND end_time > $2`
		if err := r.db.QueryRowContext(ctx, query, userID, start, end).Scan(&totalSeconds); err != nil {
			return nil, fmt.Errorf("failed to compute total analytics time: %w", err)
		}
		if totalSeconds < 0 {
			totalSeconds = 0
		}
		analytics.TotalTime.TotalSeconds = totalSeconds
		analytics.TotalTime.FormattedTime = models.FormatDuration(totalSeconds)
		if days > 0 {
			analytics.TotalTime.DailyAverage = totalSeconds / days
		}
		if days >= 7 {
			analytics.TotalTime.WeeklyAverage = totalSeconds / (days / 7)
		}
		analytics.TotalTime.GrowthRate = 0 // 简化：暂不计算环比
	}

	// 2) Category breakdown (sum by overlap within [start, end))
	{
		query := `
			SELECT COALESCE(category, '未分类') as category,
			       COALESCE(SUM(EXTRACT(EPOCH FROM (
			           LEAST(end_time, $3) - GREATEST(start_time, $2)
			       ))),0)::int as total_seconds,
			       COUNT(*) as sessions,
			       COALESCE(MAX(NULLIF(target_metadata->>'color', '')), '') as color
			FROM unified_timer_logs
			WHERE user_id = $1
			  AND end_time IS NOT NULL
			  AND duration_seconds IS NOT NULL
			  AND start_time < $3 AND end_time > $2
			GROUP BY 1
			ORDER BY total_seconds DESC`
		rows, err := r.db.QueryContext(ctx, query, userID, start, end)
		if err != nil {
			return nil, fmt.Errorf("failed to query category breakdown: %w", err)
		}
		defer rows.Close()

		var breakdown []models.PersonalCategoryAnalytics
		for rows.Next() {
			var category string
			var seconds int
			var sessionCount int
			var color sql.NullString
			if err := rows.Scan(&category, &seconds, &sessionCount, &color); err != nil {
				return nil, fmt.Errorf("failed to scan category breakdown: %w", err)
			}
			percent := 0.0
			if totalSeconds > 0 {
				percent = (float64(seconds) / float64(totalSeconds)) * 100.0
			}
			c := models.PersonalCategoryAnalytics{
				Category:       category,
				TotalSeconds:   seconds,
				FormattedTime:  models.FormatDuration(seconds),
				Percentage:     percent,
				TaskCount:      sessionCount,
				AveragePerTask: 0,
				Color:          "",
			}
			if color.Valid && color.String != "" {
				c.Color = color.String
			} else {
				// basic fallback colors by known categories
				switch strings.ToLower(category) {
				case "personal", "个人":
					c.Color = "#1890ff"
				case "work", "工作":
					c.Color = "#52c41a"
				case "study", "学习":
					c.Color = "#722ed1"
				case "fitness", "健身":
					c.Color = "#fa8c16"
				case "hobby", "爱好":
					c.Color = "#eb2f96"
				default:
					c.Color = "#1890ff"
				}
			}
			breakdown = append(breakdown, c)
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("error iterating category rows: %w", err)
		}
		analytics.CategoryBreakdown = breakdown
	}

	// 3) Daily trend (split overlap per day in requested timezone)
	{
		query := `
			WITH bounds AS (
			  SELECT timezone($4, $2::timestamptz) AS tz_start,
			         timezone($4, $3::timestamptz) AS tz_end
			), days AS (
			  SELECT generate_series(
			           date_trunc('day', (SELECT tz_start FROM bounds)),
			           date_trunc('day', (SELECT tz_end FROM bounds)) - interval '1 day',
			           interval '1 day'
			         ) AS d
			)
			SELECT d.d::date AS day,
			       COALESCE(SUM(EXTRACT(EPOCH FROM (
			         LEAST(timezone($4, utl.end_time), d.d + interval '1 day') -
			         GREATEST(timezone($4, utl.start_time), d.d)
			       ))), 0)::int AS total_seconds,
			       COUNT(utl.id) AS sessions_count,
			       COUNT(DISTINCT COALESCE(utl.target_id, 0)) AS tasks_count
			FROM days d
			LEFT JOIN unified_timer_logs utl
			  ON utl.user_id = $1
			 AND utl.end_time IS NOT NULL
			 AND utl.duration_seconds IS NOT NULL
			 AND timezone($4, utl.start_time) < d.d + interval '1 day'
			 AND timezone($4, utl.end_time)   > d.d
			GROUP BY d.d
			ORDER BY d.d`
		rows, err := r.db.QueryContext(ctx, query, userID, start, end, tz)
		if err != nil {
			return nil, fmt.Errorf("failed to query daily trend: %w", err)
		}
		defer rows.Close()

		var trends []models.PersonalWeeklyTrend
		for rows.Next() {
			var day time.Time
			var seconds int
			var sessionsCount int
			var tasksCount int
			if err := rows.Scan(&day, &seconds, &sessionsCount, &tasksCount); err != nil {
				return nil, fmt.Errorf("failed to scan daily trend: %w", err)
			}
			trends = append(trends, models.PersonalWeeklyTrend{
				WeekStart:         day.Format("2006-01-02"),
				WeekEnd:           day.Format("2006-01-02"),
				TotalSeconds:      seconds,
				FormattedTime:     models.FormatDuration(seconds),
				SessionsCount:     sessionsCount,
				TasksCount:        tasksCount,
				ComparisonPercent: 0,
			})
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("error iterating daily trend rows: %w", err)
		}
		analytics.WeeklyTrend = trends
	}

	// 4) Hourly distribution across the selected range in requested timezone
	{
		query := `
			WITH bounds AS (
			  SELECT timezone($4, $2::timestamptz) AS tz_start,
			         timezone($4, $3::timestamptz) AS tz_end
			), hours AS (
			  SELECT generate_series(0,23) AS h
			)
			SELECT h.h as hour,
			       COALESCE(SUM(EXTRACT(EPOCH FROM (
			         LEAST(timezone($4, utl.end_time), (SELECT tz_end FROM bounds)) -
			         GREATEST(timezone($4, utl.start_time), (SELECT tz_start FROM bounds))
			       )) FILTER (WHERE EXTRACT(HOUR FROM timezone($4, utl.start_time)) = h.h), 0))::int AS total_seconds,
			       COUNT(utl.id) FILTER (WHERE EXTRACT(HOUR FROM timezone($4, utl.start_time)) = h.h) AS session_count
			FROM hours h
			LEFT JOIN unified_timer_logs utl
			  ON utl.user_id = $1
			 AND utl.end_time IS NOT NULL
			 AND utl.duration_seconds IS NOT NULL
			 AND utl.start_time < $3 AND utl.end_time > $2
			GROUP BY h.h
			ORDER BY h.h`
		rows, err := r.db.QueryContext(ctx, query, userID, start, end, tz)
		if err != nil {
			return nil, fmt.Errorf("failed to query hourly distribution: %w", err)
		}
		defer rows.Close()

		var hourly []models.PersonalHourlyDistribution
		for rows.Next() {
			var hour, seconds, sessionCount int
			if err := rows.Scan(&hour, &seconds, &sessionCount); err != nil {
				return nil, fmt.Errorf("failed to scan hourly: %w", err)
			}
			hourly = append(hourly, models.PersonalHourlyDistribution{
				Hour:           hour,
				TotalSeconds:   seconds,
				SessionCount:   sessionCount,
				AvgEfficiency:  0, // placeholder until we have target/quality per session
				PeakFocusScore: 0, // placeholder
			})
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("error iterating hourly rows: %w", err)
		}
		analytics.HourlyDistribution = hourly
	}

	// 5) Task efficiency (aggregate by target_title as a proxy for task name)
	{
		query := `
			SELECT target_title,
			       COALESCE(SUM(EXTRACT(EPOCH FROM (
			         LEAST(end_time, $3) - GREATEST(start_time, $2)
			       ))),0)::int as total_seconds,
			       COALESCE(SUM(
			         CASE 
			           WHEN target_metadata ? 'target_minutes' 
			             AND (target_metadata->>'target_minutes') ~ '^[0-9]+$' 
			           THEN ((target_metadata->>'target_minutes')::int)
			           ELSE 0
			         END
			       ),0) * 60 AS target_seconds
			FROM unified_timer_logs
			WHERE user_id = $1
			  AND end_time IS NOT NULL
			  AND duration_seconds IS NOT NULL
			  AND start_time < $3 AND end_time > $2
			GROUP BY target_title
			ORDER BY total_seconds DESC
			LIMIT 10`
		rows, err := r.db.QueryContext(ctx, query, userID, start, end)
		if err != nil {
			return nil, fmt.Errorf("failed to query task efficiency: %w", err)
		}
		defer rows.Close()

		var eff []models.PersonalTaskEfficiency
		for rows.Next() {
			var name string
			var totalSec, targetSec int
			if err := rows.Scan(&name, &totalSec, &targetSec); err != nil {
				return nil, fmt.Errorf("failed to scan task efficiency: %w", err)
			}
			efficiency := 0
			if targetSec > 0 {
				ratio := float64(totalSec) / float64(targetSec)
				// 简化效率计算：<=1 线性到100；>1 递减
				if ratio <= 1 {
					efficiency = int(100 * ratio)
				} else {
					v := 100 - int((ratio-1.0)*50)
					if v < 0 {
						v = 0
					}
					efficiency = v
				}
			} else if totalSec > 0 {
				efficiency = 75 // 无目标时给中等分
			}
			eff = append(eff, models.PersonalTaskEfficiency{
				TaskName:   name,
				TotalTime:  totalSec,
				TargetTime: targetSec,
				Efficiency: efficiency,
			})
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("error iterating efficiency rows: %w", err)
		}
		analytics.TaskEfficiency = eff
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
