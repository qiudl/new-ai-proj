package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"ai-project-backend/models"
)

// worktreeActivityRepositoryImpl implements WorktreeActivityRepository interface
type worktreeActivityRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewWorktreeActivityRepository creates a new instance
func NewWorktreeActivityRepository(db interface{}) WorktreeActivityRepository {
	return &worktreeActivityRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *worktreeActivityRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new worktree activity log
func (r *worktreeActivityRepositoryImpl) Create(ctx context.Context, activity *models.WorktreeActivity) (*models.WorktreeActivity, error) {
	activityDataJSON, err := json.Marshal(activity.ActivityData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal activity_data: %w", err)
	}

	query := `
		INSERT INTO worktree_activities (
			worktree_id, ai_user_id, task_id, activity_type, description, activity_data
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		activity.WorktreeID,
		activity.AIUserID,
		activity.TaskID,
		activity.ActivityType,
		activity.Description,
		activityDataJSON,
	).Scan(&activity.ID, &activity.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create worktree activity: %w", err)
	}

	return activity, nil
}

// GetByID retrieves activity by ID
func (r *worktreeActivityRepositoryImpl) GetByID(ctx context.Context, id int) (*models.WorktreeActivity, error) {
	query := `
		SELECT
			id, worktree_id, ai_user_id, task_id, activity_type, description, activity_data, created_at
		FROM worktree_activities
		WHERE id = $1
	`

	activity := &models.WorktreeActivity{}
	var activityDataJSON []byte
	var aiUserID, taskID sql.NullInt64
	var description sql.NullString

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&activity.ID,
		&activity.WorktreeID,
		&aiUserID,
		&taskID,
		&activity.ActivityType,
		&description,
		&activityDataJSON,
		&activity.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree activity not found (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree activity: %w", err)
	}

	// Handle nullable fields
	if aiUserID.Valid {
		aiID := int(aiUserID.Int64)
		activity.AIUserID = &aiID
	}
	if taskID.Valid {
		tid := int(taskID.Int64)
		activity.TaskID = &tid
	}
	if description.Valid {
		activity.Description = &description.String
	}

	if err := json.Unmarshal(activityDataJSON, &activity.ActivityData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal activity_data: %w", err)
	}

	return activity, nil
}

// GetByWorktreeID retrieves activities for a worktree with pagination
func (r *worktreeActivityRepositoryImpl) GetByWorktreeID(ctx context.Context, worktreeID int, limit, offset int) ([]*models.WorktreeActivity, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM worktree_activities WHERE worktree_id = $1`
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, worktreeID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Get paginated data
	query := `
		SELECT
			id, worktree_id, ai_user_id, task_id, activity_type, description, activity_data, created_at
		FROM worktree_activities
		WHERE worktree_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	activities, err := r.queryActivities(ctx, query, worktreeID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return activities, total, nil
}

// GetByProjectID retrieves activities for a project with pagination
func (r *worktreeActivityRepositoryImpl) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.WorktreeActivity, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM worktree_activities a
		INNER JOIN worktrees w ON a.worktree_id = w.id
		WHERE w.project_id = $1
	`
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, projectID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Get paginated data
	query := `
		SELECT
			a.id, a.worktree_id, a.ai_user_id, a.task_id, a.activity_type, a.description, a.activity_data, a.created_at
		FROM worktree_activities a
		INNER JOIN worktrees w ON a.worktree_id = w.id
		WHERE w.project_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2 OFFSET $3
	`

	activities, err := r.queryActivities(ctx, query, projectID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return activities, total, nil
}

// GetByAIID retrieves activities for an AI user with pagination
func (r *worktreeActivityRepositoryImpl) GetByAIID(ctx context.Context, aiID int, limit, offset int) ([]*models.WorktreeActivity, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM worktree_activities WHERE ai_user_id = $1`
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, aiID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Get paginated data
	query := `
		SELECT
			id, worktree_id, ai_user_id, task_id, activity_type, description, activity_data, created_at
		FROM worktree_activities
		WHERE ai_user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	activities, err := r.queryActivities(ctx, query, aiID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return activities, total, nil
}

// GetByActivityType retrieves activities by type with pagination
func (r *worktreeActivityRepositoryImpl) GetByActivityType(ctx context.Context, activityType string, limit, offset int) ([]*models.WorktreeActivity, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM worktree_activities WHERE activity_type = $1`
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, activityType).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Get paginated data
	query := `
		SELECT
			id, worktree_id, ai_user_id, task_id, activity_type, description, activity_data, created_at
		FROM worktree_activities
		WHERE activity_type = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	activities, err := r.queryActivities(ctx, query, activityType, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return activities, total, nil
}

// GetActivities retrieves activities with filtering
func (r *worktreeActivityRepositoryImpl) GetActivities(ctx context.Context, filter *models.WorktreeActivityFilter) ([]*models.WorktreeActivity, int, error) {
	// Build WHERE clause
	whereClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	if filter != nil {
		if filter.WorktreeID != nil {
			whereClauses = append(whereClauses, fmt.Sprintf("a.worktree_id = $%d", argIndex))
			args = append(args, *filter.WorktreeID)
			argIndex++
		}
		if filter.AIUserID != nil {
			whereClauses = append(whereClauses, fmt.Sprintf("a.ai_user_id = $%d", argIndex))
			args = append(args, *filter.AIUserID)
			argIndex++
		}
		if filter.TaskID != nil {
			whereClauses = append(whereClauses, fmt.Sprintf("a.task_id = $%d", argIndex))
			args = append(args, *filter.TaskID)
			argIndex++
		}
		if len(filter.ActivityTypes) > 0 {
			placeholders := []string{}
			for _, actType := range filter.ActivityTypes {
				placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
				args = append(args, actType)
				argIndex++
			}
			whereClauses = append(whereClauses, fmt.Sprintf("a.activity_type IN (%s)", strings.Join(placeholders, ",")))
		}
		if filter.StartDate != nil {
			whereClauses = append(whereClauses, fmt.Sprintf("a.created_at >= $%d", argIndex))
			args = append(args, *filter.StartDate)
			argIndex++
		}
		if filter.EndDate != nil {
			whereClauses = append(whereClauses, fmt.Sprintf("a.created_at <= $%d", argIndex))
			args = append(args, *filter.EndDate)
			argIndex++
		}
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Get total count
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM worktree_activities a %s`, whereClause)
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Set defaults for pagination
	page := 1
	pageSize := 20
	if filter != nil {
		if filter.Page > 0 {
			page = filter.Page
		}
		if filter.PageSize > 0 {
			pageSize = filter.PageSize
		}
		if pageSize > 100 {
			pageSize = 100
		}
	}
	offset := (page - 1) * pageSize

	// Get paginated data
	listQuery := fmt.Sprintf(`
		SELECT
			a.id, a.worktree_id, a.ai_user_id, a.task_id, a.activity_type, a.description, a.activity_data, a.created_at
		FROM worktree_activities a
		%s
		ORDER BY a.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	activities, err := r.queryActivities(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	return activities, total, nil
}

// GetRecentActivities retrieves recent activities for a project
func (r *worktreeActivityRepositoryImpl) GetRecentActivities(ctx context.Context, projectID int, limit int) ([]*models.WorktreeActivity, error) {
	query := `
		SELECT
			a.id, a.worktree_id, a.ai_user_id, a.task_id, a.activity_type, a.description, a.activity_data, a.created_at
		FROM worktree_activities a
		INNER JOIN worktrees w ON a.worktree_id = w.id
		WHERE w.project_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2
	`

	return r.queryActivities(ctx, query, projectID, limit)
}

// GetActivityStats retrieves activity statistics for a project
func (r *worktreeActivityRepositoryImpl) GetActivityStats(ctx context.Context, projectID int, startDate, endDate *string) (*models.WorktreeActivityStats, error) {
	// Build date filter
	dateFilter := ""
	args := []interface{}{projectID}
	argIndex := 2

	if startDate != nil {
		dateFilter += fmt.Sprintf(" AND a.created_at >= $%d", argIndex)
		args = append(args, *startDate)
		argIndex++
	}
	if endDate != nil {
		dateFilter += fmt.Sprintf(" AND a.created_at <= $%d", argIndex)
		args = append(args, *endDate)
		argIndex++
	}

	query := fmt.Sprintf(`
		SELECT
			COUNT(*) as total_activities,
			COUNT(DISTINCT a.worktree_id) as active_worktrees,
			COUNT(DISTINCT a.ai_user_id) as active_ai_users
		FROM worktree_activities a
		INNER JOIN worktrees w ON a.worktree_id = w.id
		WHERE w.project_id = $1%s
	`, dateFilter)

	stats := &models.WorktreeActivityStats{}
	err := r.getDB().QueryRowContext(ctx, query, args...).Scan(
		&stats.TotalActivities,
		&stats.ActiveWorktrees,
		&stats.ActiveAIUsers,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get activity stats: %w", err)
	}

	// Get by type
	typeQuery := fmt.Sprintf(`
		SELECT a.activity_type, COUNT(*) as count
		FROM worktree_activities a
		INNER JOIN worktrees w ON a.worktree_id = w.id
		WHERE w.project_id = $1%s
		GROUP BY a.activity_type
	`, dateFilter)

	rows, err := r.getDB().QueryContext(ctx, typeQuery, args...)
	if err != nil {
		return stats, nil // Return partial stats
	}
	defer rows.Close()

	stats.ByType = make(map[string]int)
	for rows.Next() {
		var activityType string
		var count int
		if err := rows.Scan(&activityType, &count); err != nil {
			continue
		}
		stats.ByType[activityType] = count
	}

	return stats, nil
}

// GetAIActivitySummary retrieves activity summary for an AI user
func (r *worktreeActivityRepositoryImpl) GetAIActivitySummary(ctx context.Context, aiID int, startDate, endDate *string) (*models.AIActivitySummary, error) {
	// Build date filter
	dateFilter := ""
	args := []interface{}{aiID}
	argIndex := 2

	if startDate != nil {
		dateFilter += fmt.Sprintf(" AND created_at >= $%d", argIndex)
		args = append(args, *startDate)
		argIndex++
	}
	if endDate != nil {
		dateFilter += fmt.Sprintf(" AND created_at <= $%d", argIndex)
		args = append(args, *endDate)
		argIndex++
	}

	query := fmt.Sprintf(`
		SELECT
			COUNT(*) as total_activities,
			COUNT(DISTINCT worktree_id) as worktrees_used,
			COUNT(DISTINCT task_id) as tasks_worked
		FROM worktree_activities
		WHERE ai_user_id = $1%s
	`, dateFilter)

	summary := &models.AIActivitySummary{AIUserID: aiID}
	err := r.getDB().QueryRowContext(ctx, query, args...).Scan(
		&summary.TotalActivities,
		&summary.WorktreesUsed,
		&summary.TasksWorked,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get AI activity summary: %w", err)
	}

	// Get by type
	typeQuery := fmt.Sprintf(`
		SELECT activity_type, COUNT(*) as count
		FROM worktree_activities
		WHERE ai_user_id = $1%s
		GROUP BY activity_type
	`, dateFilter)

	rows, err := r.getDB().QueryContext(ctx, typeQuery, args...)
	if err != nil {
		return summary, nil // Return partial summary
	}
	defer rows.Close()

	summary.ByType = make(map[string]int)
	for rows.Next() {
		var activityType string
		var count int
		if err := rows.Scan(&activityType, &count); err != nil {
			continue
		}
		summary.ByType[activityType] = count
	}

	return summary, nil
}

// DeleteOldActivities deletes activities older than specified date
func (r *worktreeActivityRepositoryImpl) DeleteOldActivities(ctx context.Context, beforeDate string) (int, error) {
	query := `DELETE FROM worktree_activities WHERE created_at < $1`

	result, err := r.getDB().ExecContext(ctx, query, beforeDate)
	if err != nil {
		return 0, fmt.Errorf("failed to delete old activities: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return int(rowsAffected), nil
}

// queryActivities is a helper method to query activities
func (r *worktreeActivityRepositoryImpl) queryActivities(ctx context.Context, query string, args ...interface{}) ([]*models.WorktreeActivity, error) {
	rows, err := r.getDB().QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query activities: %w", err)
	}
	defer rows.Close()

	activities := []*models.WorktreeActivity{}
	for rows.Next() {
		activity := &models.WorktreeActivity{}
		var activityDataJSON []byte
		var aiUserID, taskID sql.NullInt64
		var description sql.NullString

		err := rows.Scan(
			&activity.ID,
			&activity.WorktreeID,
			&aiUserID,
			&taskID,
			&activity.ActivityType,
			&description,
			&activityDataJSON,
			&activity.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}

		// Handle nullable fields
		if aiUserID.Valid {
			aiID := int(aiUserID.Int64)
			activity.AIUserID = &aiID
		}
		if taskID.Valid {
			tid := int(taskID.Int64)
			activity.TaskID = &tid
		}
		if description.Valid {
			activity.Description = &description.String
		}

		if err := json.Unmarshal(activityDataJSON, &activity.ActivityData); err != nil {
			return nil, fmt.Errorf("failed to unmarshal activity_data: %w", err)
		}

		activities = append(activities, activity)
	}

	return activities, rows.Err()
}
