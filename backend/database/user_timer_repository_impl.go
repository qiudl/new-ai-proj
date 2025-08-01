package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
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
		stats.MostProductiveDay = "Tuesday"             // Placeholder
		stats.MostUsedCategory = "personal"             // Placeholder
	}

	return &stats, nil
}

// GetDashboardData retrieves comprehensive dashboard data (simplified implementation)
func (r *PostgresUserTimerRepository) GetDashboardData(ctx context.Context, userID int) (*models.PersonalTimerDashboard, error) {
	dashboard := &models.PersonalTimerDashboard{
		TimerTasks:     make([]models.UserTimerTaskResponse, 0),
		RecentSessions: make([]models.PersonalTimerSession, 0),
		FavoriteTasks:  make([]models.UserTimerTaskResponse, 0),
	}

	// Get current timer status (placeholder)
	dashboard.CurrentTimer = &models.PersonalTimerCurrent{
		IsRunning:     false,
		ElapsedSeconds: 0,
		FormattedTime: "00:00:00",
	}

	// Get today stats (placeholder)
	dashboard.TodayStats = models.PersonalTimerTodayStats{
		TotalSeconds:    0,
		FormattedTime:   "00:00:00",
		SessionsCount:   0,
		TasksWorkedOn:   0,
		MostWorkedTask:  "",
		ProductiveHours: make([]int, 24),
		EfficiencyScore: 75.0,
		LongestSession:  0,
	}

	// Get timer tasks
	tasks, _, err := r.GetByUserID(ctx, userID, &models.UserTimerFilter{Status: "active"}, 10, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get timer tasks: %w", err)
	}

	for _, task := range tasks {
		response := task.ToResponse()
		dashboard.TimerTasks = append(dashboard.TimerTasks, response)
	}

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

	// Placeholder for recent sessions
	dashboard.RecentSessions = []models.PersonalTimerSession{}

	return dashboard, nil
}

// Placeholder implementations for other methods
func (r *PostgresUserTimerRepository) GetTimerSessions(ctx context.Context, userID int, limit, offset int) (*[]models.PersonalTimerSession, error) {
	sessions := []models.PersonalTimerSession{}
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

func (r *PostgresUserTimerRepository) GetAnalytics(ctx context.Context, userID int, dateRange string) (*models.PersonalTimerAnalytics, error) {
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
			"Keep up the great work!",
			"Try setting daily goals",
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