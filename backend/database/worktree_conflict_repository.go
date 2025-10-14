package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"ai-project-backend/models"
)

// worktreeConflictRepositoryImpl implements WorktreeConflictRepository interface
type worktreeConflictRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewWorktreeConflictRepository creates a new instance
func NewWorktreeConflictRepository(db interface{}) WorktreeConflictRepository {
	return &worktreeConflictRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *worktreeConflictRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new worktree conflict
func (r *worktreeConflictRepositoryImpl) Create(ctx context.Context, conflict *models.WorktreeConflict) (*models.WorktreeConflict, error) {
	conflictDetailsJSON, err := json.Marshal(conflict.ConflictDetails)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal conflict_details: %w", err)
	}

	query := `
		INSERT INTO worktree_conflicts (
			worktree_id, task_id, conflict_type, file_path, status,
			detected_by, conflict_details
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, detected_at, created_at, updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		conflict.WorktreeID,
		conflict.TaskID,
		conflict.ConflictType,
		conflict.FilePath,
		conflict.Status,
		conflict.DetectedBy,
		conflictDetailsJSON,
	).Scan(&conflict.ID, &conflict.DetectedAt, &conflict.CreatedAt, &conflict.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create worktree conflict: %w", err)
	}

	return conflict, nil
}

// GetByID retrieves conflict by ID
func (r *worktreeConflictRepositoryImpl) GetByID(ctx context.Context, id int) (*models.WorktreeConflict, error) {
	query := `
		SELECT
			id, worktree_id, task_id, conflict_type, file_path, status,
			detected_by, detected_at, resolved_by, resolved_at, resolution,
			conflict_details, created_at, updated_at
		FROM worktree_conflicts
		WHERE id = $1
	`

	conflict := &models.WorktreeConflict{}
	var conflictDetailsJSON []byte
	var taskID, detectedBy, resolvedBy sql.NullInt64
	var filePath, resolution sql.NullString
	var resolvedAt sql.NullTime

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&conflict.ID,
		&conflict.WorktreeID,
		&taskID,
		&conflict.ConflictType,
		&filePath,
		&conflict.Status,
		&detectedBy,
		&conflict.DetectedAt,
		&resolvedBy,
		&resolvedAt,
		&resolution,
		&conflictDetailsJSON,
		&conflict.CreatedAt,
		&conflict.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree conflict not found (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree conflict: %w", err)
	}

	// Handle nullable fields
	if taskID.Valid {
		tid := int(taskID.Int64)
		conflict.TaskID = &tid
	}
	if filePath.Valid {
		conflict.FilePath = &filePath.String
	}
	if detectedBy.Valid {
		db := int(detectedBy.Int64)
		conflict.DetectedBy = &db
	}
	if resolvedBy.Valid {
		rb := int(resolvedBy.Int64)
		conflict.ResolvedBy = &rb
	}
	if resolvedAt.Valid {
		conflict.ResolvedAt = &resolvedAt.Time
	}
	if resolution.Valid {
		conflict.Resolution = &resolution.String
	}

	if err := json.Unmarshal(conflictDetailsJSON, &conflict.ConflictDetails); err != nil {
		return nil, fmt.Errorf("failed to unmarshal conflict_details: %w", err)
	}

	return conflict, nil
}

// Update updates a conflict
func (r *worktreeConflictRepositoryImpl) Update(ctx context.Context, conflict *models.WorktreeConflict) (*models.WorktreeConflict, error) {
	conflictDetailsJSON, err := json.Marshal(conflict.ConflictDetails)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal conflict_details: %w", err)
	}

	query := `
		UPDATE worktree_conflicts SET
			status = $1,
			resolved_by = $2,
			resolved_at = $3,
			resolution = $4,
			conflict_details = $5,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
		RETURNING updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		conflict.Status,
		conflict.ResolvedBy,
		conflict.ResolvedAt,
		conflict.Resolution,
		conflictDetailsJSON,
		conflict.ID,
	).Scan(&conflict.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree conflict not found (ID: %d)", conflict.ID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update worktree conflict: %w", err)
	}

	return r.GetByID(ctx, conflict.ID)
}

// Delete deletes a conflict
func (r *worktreeConflictRepositoryImpl) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM worktree_conflicts WHERE id = $1`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete worktree conflict: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree conflict not found (ID: %d)", id)
	}

	return nil
}

// GetByWorktreeID retrieves all conflicts for a worktree
func (r *worktreeConflictRepositoryImpl) GetByWorktreeID(ctx context.Context, worktreeID int) ([]*models.WorktreeConflict, error) {
	query := `
		SELECT
			id, worktree_id, task_id, conflict_type, file_path, status,
			detected_by, detected_at, resolved_by, resolved_at, resolution,
			conflict_details, created_at, updated_at
		FROM worktree_conflicts
		WHERE worktree_id = $1
		ORDER BY detected_at DESC
		LIMIT 100
	`

	return r.queryConflicts(ctx, query, worktreeID)
}

// GetByTaskID retrieves all conflicts for a task
func (r *worktreeConflictRepositoryImpl) GetByTaskID(ctx context.Context, taskID int) ([]*models.WorktreeConflict, error) {
	query := `
		SELECT
			id, worktree_id, task_id, conflict_type, file_path, status,
			detected_by, detected_at, resolved_by, resolved_at, resolution,
			conflict_details, created_at, updated_at
		FROM worktree_conflicts
		WHERE task_id = $1
		ORDER BY detected_at DESC
		LIMIT 100
	`

	return r.queryConflicts(ctx, query, taskID)
}

// GetPendingConflicts retrieves all pending conflicts for a project
func (r *worktreeConflictRepositoryImpl) GetPendingConflicts(ctx context.Context, projectID int) ([]*models.WorktreeConflict, error) {
	query := `
		SELECT
			c.id, c.worktree_id, c.task_id, c.conflict_type, c.file_path, c.status,
			c.detected_by, c.detected_at, c.resolved_by, c.resolved_at, c.resolution,
			c.conflict_details, c.created_at, c.updated_at
		FROM worktree_conflicts c
		INNER JOIN worktrees w ON c.worktree_id = w.id
		WHERE w.project_id = $1 AND c.status = 'pending'
		ORDER BY c.detected_at DESC
	`

	return r.queryConflicts(ctx, query, projectID)
}

// GetResolvedConflicts retrieves resolved conflicts for a project with pagination
func (r *worktreeConflictRepositoryImpl) GetResolvedConflicts(ctx context.Context, projectID int, limit, offset int) ([]*models.WorktreeConflict, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM worktree_conflicts c
		INNER JOIN worktrees w ON c.worktree_id = w.id
		WHERE w.project_id = $1 AND c.status = 'resolved'
	`
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, projectID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count resolved conflicts: %w", err)
	}

	// Get paginated data
	query := `
		SELECT
			c.id, c.worktree_id, c.task_id, c.conflict_type, c.file_path, c.status,
			c.detected_by, c.detected_at, c.resolved_by, c.resolved_at, c.resolution,
			c.conflict_details, c.created_at, c.updated_at
		FROM worktree_conflicts c
		INNER JOIN worktrees w ON c.worktree_id = w.id
		WHERE w.project_id = $1 AND c.status = 'resolved'
		ORDER BY c.resolved_at DESC
		LIMIT $2 OFFSET $3
	`

	conflicts, err := r.queryConflicts(ctx, query, projectID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return conflicts, total, nil
}

// MarkAsResolved marks a conflict as resolved
func (r *worktreeConflictRepositoryImpl) MarkAsResolved(ctx context.Context, id int, resolvedBy int, resolution string) error {
	query := `
		UPDATE worktree_conflicts SET
			status = 'resolved',
			resolved_by = $1,
			resolved_at = CURRENT_TIMESTAMP,
			resolution = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND status = 'pending'
	`

	result, err := r.getDB().ExecContext(ctx, query, resolvedBy, resolution, id)
	if err != nil {
		return fmt.Errorf("failed to mark conflict as resolved: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("conflict not found or already resolved (ID: %d)", id)
	}

	return nil
}

// MarkAsIgnored marks a conflict as ignored
func (r *worktreeConflictRepositoryImpl) MarkAsIgnored(ctx context.Context, id int, ignoredBy int, reason string) error {
	query := `
		UPDATE worktree_conflicts SET
			status = 'ignored',
			resolved_by = $1,
			resolved_at = CURRENT_TIMESTAMP,
			resolution = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND status = 'pending'
	`

	result, err := r.getDB().ExecContext(ctx, query, ignoredBy, reason, id)
	if err != nil {
		return fmt.Errorf("failed to mark conflict as ignored: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("conflict not found or already processed (ID: %d)", id)
	}

	return nil
}

// ReopenConflict reopens a resolved or ignored conflict
func (r *worktreeConflictRepositoryImpl) ReopenConflict(ctx context.Context, id int) error {
	query := `
		UPDATE worktree_conflicts SET
			status = 'pending',
			resolved_by = NULL,
			resolved_at = NULL,
			resolution = NULL,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND status IN ('resolved', 'ignored')
	`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to reopen conflict: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("conflict not found or already pending (ID: %d)", id)
	}

	return nil
}

// GetConflictStats retrieves conflict statistics for a project
func (r *worktreeConflictRepositoryImpl) GetConflictStats(ctx context.Context, projectID int) (*models.WorktreeConflictStats, error) {
	query := `
		SELECT
			COUNT(*) as total_conflicts,
			COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_count,
			COUNT(CASE WHEN c.status = 'resolved' THEN 1 END) as resolved_count,
			COUNT(CASE WHEN c.status = 'ignored' THEN 1 END) as ignored_count
		FROM worktree_conflicts c
		INNER JOIN worktrees w ON c.worktree_id = w.id
		WHERE w.project_id = $1
	`

	stats := &models.WorktreeConflictStats{}
	err := r.getDB().QueryRowContext(ctx, query, projectID).Scan(
		&stats.TotalConflicts,
		&stats.PendingCount,
		&stats.ResolvedCount,
		&stats.IgnoredCount,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get conflict stats: %w", err)
	}

	// Get by type
	typeQuery := `
		SELECT c.conflict_type, COUNT(*) as count
		FROM worktree_conflicts c
		INNER JOIN worktrees w ON c.worktree_id = w.id
		WHERE w.project_id = $1
		GROUP BY c.conflict_type
	`

	rows, err := r.getDB().QueryContext(ctx, typeQuery, projectID)
	if err != nil {
		return stats, nil // Return partial stats
	}
	defer rows.Close()

	stats.ByType = make(map[string]int)
	for rows.Next() {
		var conflictType string
		var count int
		if err := rows.Scan(&conflictType, &count); err != nil {
			continue
		}
		stats.ByType[conflictType] = count
	}

	return stats, nil
}

// GetConflictsByType retrieves conflicts by type for a project
func (r *worktreeConflictRepositoryImpl) GetConflictsByType(ctx context.Context, projectID int, conflictType string) ([]*models.WorktreeConflict, error) {
	query := `
		SELECT
			c.id, c.worktree_id, c.task_id, c.conflict_type, c.file_path, c.status,
			c.detected_by, c.detected_at, c.resolved_by, c.resolved_at, c.resolution,
			c.conflict_details, c.created_at, c.updated_at
		FROM worktree_conflicts c
		INNER JOIN worktrees w ON c.worktree_id = w.id
		WHERE w.project_id = $1 AND c.conflict_type = $2
		ORDER BY c.detected_at DESC
		LIMIT 100
	`

	return r.queryConflicts(ctx, query, projectID, conflictType)
}

// queryConflicts is a helper method to query conflicts
func (r *worktreeConflictRepositoryImpl) queryConflicts(ctx context.Context, query string, args ...interface{}) ([]*models.WorktreeConflict, error) {
	rows, err := r.getDB().QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query conflicts: %w", err)
	}
	defer rows.Close()

	conflicts := []*models.WorktreeConflict{}
	for rows.Next() {
		conflict := &models.WorktreeConflict{}
		var conflictDetailsJSON []byte
		var taskID, detectedBy, resolvedBy sql.NullInt64
		var filePath, resolution sql.NullString
		var resolvedAt sql.NullTime

		err := rows.Scan(
			&conflict.ID,
			&conflict.WorktreeID,
			&taskID,
			&conflict.ConflictType,
			&filePath,
			&conflict.Status,
			&detectedBy,
			&conflict.DetectedAt,
			&resolvedBy,
			&resolvedAt,
			&resolution,
			&conflictDetailsJSON,
			&conflict.CreatedAt,
			&conflict.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan conflict: %w", err)
		}

		// Handle nullable fields
		if taskID.Valid {
			tid := int(taskID.Int64)
			conflict.TaskID = &tid
		}
		if filePath.Valid {
			conflict.FilePath = &filePath.String
		}
		if detectedBy.Valid {
			db := int(detectedBy.Int64)
			conflict.DetectedBy = &db
		}
		if resolvedBy.Valid {
			rb := int(resolvedBy.Int64)
			conflict.ResolvedBy = &rb
		}
		if resolvedAt.Valid {
			conflict.ResolvedAt = &resolvedAt.Time
		}
		if resolution.Valid {
			conflict.Resolution = &resolution.String
		}

		if err := json.Unmarshal(conflictDetailsJSON, &conflict.ConflictDetails); err != nil {
			return nil, fmt.Errorf("failed to unmarshal conflict_details: %w", err)
		}

		conflicts = append(conflicts, conflict)
	}

	return conflicts, rows.Err()
}
