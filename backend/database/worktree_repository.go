package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"ai-project-backend/models"
)

// worktreeRepositoryImpl implements WorktreeRepository interface
type worktreeRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewWorktreeRepository creates a new instance
func NewWorktreeRepository(db interface{}) WorktreeRepository {
	return &worktreeRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *worktreeRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new worktree
func (r *worktreeRepositoryImpl) Create(ctx context.Context, worktree *models.Worktree) (*models.Worktree, error) {
	metadataJSON, err := json.Marshal(worktree.Metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO worktrees (
			project_id, expert_id, name, worktree_path, branch, status, is_locked,
			last_commit_hash, has_uncommitted, ahead_count, behind_count,
			current_ai_id, active_task_id, disk_usage_mb, metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, created_at, updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		worktree.ProjectID,
		worktree.ExpertID,
		worktree.Name,
		worktree.WorktreePath,
		worktree.Branch,
		worktree.Status,
		worktree.IsLocked,
		worktree.LastCommitHash,
		worktree.HasUncommitted,
		worktree.AheadCount,
		worktree.BehindCount,
		worktree.CurrentAIID,
		worktree.ActiveTaskID,
		worktree.DiskUsageMB,
		metadataJSON,
	).Scan(&worktree.ID, &worktree.CreatedAt, &worktree.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create worktree: %w", err)
	}

	return worktree, nil
}

// GetByID retrieves worktree by ID
func (r *worktreeRepositoryImpl) GetByID(ctx context.Context, id int) (*models.Worktree, error) {
	query := `
		SELECT
			id, project_id, expert_id, name, worktree_path, branch, status, is_locked,
			last_commit_hash, has_uncommitted, ahead_count, behind_count,
			current_ai_id, active_task_id, disk_usage_mb, last_sync_at, last_active_at,
			metadata, created_at, updated_at, deleted_at
		FROM worktrees
		WHERE id = $1 AND deleted_at IS NULL
	`

	worktree := &models.Worktree{}
	var metadataJSON []byte
	var lastSyncAt, lastActiveAt, deletedAt sql.NullTime
	var lastCommitHash sql.NullString
	var currentAIID, activeTaskID sql.NullInt64

	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&worktree.ID,
		&worktree.ProjectID,
		&worktree.ExpertID,
		&worktree.Name,
		&worktree.WorktreePath,
		&worktree.Branch,
		&worktree.Status,
		&worktree.IsLocked,
		&lastCommitHash,
		&worktree.HasUncommitted,
		&worktree.AheadCount,
		&worktree.BehindCount,
		&currentAIID,
		&activeTaskID,
		&worktree.DiskUsageMB,
		&lastSyncAt,
		&lastActiveAt,
		&metadataJSON,
		&worktree.CreatedAt,
		&worktree.UpdatedAt,
		&deletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree not found (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	// Handle nullable fields
	if lastCommitHash.Valid {
		worktree.LastCommitHash = &lastCommitHash.String
	}
	if currentAIID.Valid {
		aiID := int(currentAIID.Int64)
		worktree.CurrentAIID = &aiID
	}
	if activeTaskID.Valid {
		taskID := int(activeTaskID.Int64)
		worktree.ActiveTaskID = &taskID
	}
	if lastSyncAt.Valid {
		worktree.LastSyncAt = &lastSyncAt.Time
	}
	if lastActiveAt.Valid {
		worktree.LastActiveAt = &lastActiveAt.Time
	}
	if deletedAt.Valid {
		worktree.DeletedAt = &deletedAt.Time
	}

	if err := json.Unmarshal(metadataJSON, &worktree.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	return worktree, nil
}

// GetByPath retrieves worktree by path
func (r *worktreeRepositoryImpl) GetByPath(ctx context.Context, path string) (*models.Worktree, error) {
	query := `SELECT id FROM worktrees WHERE worktree_path = $1 AND deleted_at IS NULL`

	var id int
	err := r.getDB().QueryRowContext(ctx, query, path).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree not found (path: %s)", path)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree by path: %w", err)
	}

	return r.GetByID(ctx, id)
}

// GetByExpertID retrieves worktree by expert ID within a project
func (r *worktreeRepositoryImpl) GetByExpertID(ctx context.Context, projectID int, expertID string) (*models.Worktree, error) {
	query := `SELECT id FROM worktrees WHERE project_id = $1 AND expert_id = $2 AND deleted_at IS NULL`

	var id int
	err := r.getDB().QueryRowContext(ctx, query, projectID, expertID).Scan(&id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree not found (project: %d, expert: %s)", projectID, expertID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree by expert ID: %w", err)
	}

	return r.GetByID(ctx, id)
}

// Update updates worktree
func (r *worktreeRepositoryImpl) Update(ctx context.Context, worktree *models.Worktree) (*models.Worktree, error) {
	metadataJSON, err := json.Marshal(worktree.Metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		UPDATE worktrees SET
			name = $1, branch = $2, status = $3, is_locked = $4,
			last_commit_hash = $5, has_uncommitted = $6, ahead_count = $7, behind_count = $8,
			current_ai_id = $9, active_task_id = $10, disk_usage_mb = $11,
			last_sync_at = $12, last_active_at = $13, metadata = $14,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $15 AND deleted_at IS NULL
		RETURNING updated_at
	`

	err = r.getDB().QueryRowContext(
		ctx, query,
		worktree.Name,
		worktree.Branch,
		worktree.Status,
		worktree.IsLocked,
		worktree.LastCommitHash,
		worktree.HasUncommitted,
		worktree.AheadCount,
		worktree.BehindCount,
		worktree.CurrentAIID,
		worktree.ActiveTaskID,
		worktree.DiskUsageMB,
		worktree.LastSyncAt,
		worktree.LastActiveAt,
		metadataJSON,
		worktree.ID,
	).Scan(&worktree.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree not found (ID: %d)", worktree.ID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update worktree: %w", err)
	}

	return r.GetByID(ctx, worktree.ID)
}

// Delete hard deletes worktree
func (r *worktreeRepositoryImpl) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM worktrees WHERE id = $1`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete worktree: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// SoftDelete soft deletes worktree
func (r *worktreeRepositoryImpl) SoftDelete(ctx context.Context, id int) error {
	query := `
		UPDATE worktrees SET
			deleted_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to soft delete worktree: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// List retrieves worktrees with filtering and pagination
func (r *worktreeRepositoryImpl) List(ctx context.Context, opts *models.WorktreeListOptions) ([]*models.Worktree, int, error) {
	// Build WHERE clause
	whereClauses := []string{"deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	if opts != nil {
		if opts.ProjectID != nil {
			whereClauses = append(whereClauses, fmt.Sprintf("project_id = $%d", argIndex))
			args = append(args, *opts.ProjectID)
			argIndex++
		}
		if opts.ExpertID != "" {
			whereClauses = append(whereClauses, fmt.Sprintf("expert_id = $%d", argIndex))
			args = append(args, opts.ExpertID)
			argIndex++
		}
		if len(opts.Status) > 0 {
			placeholders := []string{}
			for _, status := range opts.Status {
				placeholders = append(placeholders, fmt.Sprintf("$%d", argIndex))
				args = append(args, status)
				argIndex++
			}
			whereClauses = append(whereClauses, fmt.Sprintf("status IN (%s)", strings.Join(placeholders, ",")))
		}
		if opts.IsLocked != nil {
			whereClauses = append(whereClauses, fmt.Sprintf("is_locked = $%d", argIndex))
			args = append(args, *opts.IsLocked)
			argIndex++
		}
	}

	whereClause := strings.Join(whereClauses, " AND ")

	// Get total count
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM worktrees WHERE %s`, whereClause)
	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count worktrees: %w", err)
	}

	// Set defaults for pagination
	page := 1
	pageSize := 20
	if opts != nil {
		if opts.Page > 0 {
			page = opts.Page
		}
		if opts.PageSize > 0 {
			pageSize = opts.PageSize
		}
		if pageSize > 100 {
			pageSize = 100
		}
	}
	offset := (page - 1) * pageSize

	// Build query
	listQuery := fmt.Sprintf(`
		SELECT
			id, project_id, expert_id, name, worktree_path, branch, status, is_locked,
			last_commit_hash, has_uncommitted, ahead_count, behind_count,
			current_ai_id, active_task_id, disk_usage_mb, last_sync_at, last_active_at,
			metadata, created_at, updated_at, deleted_at
		FROM worktrees
		WHERE %s
		ORDER BY updated_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := r.getDB().QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list worktrees: %w", err)
	}
	defer rows.Close()

	worktrees := []*models.Worktree{}
	for rows.Next() {
		wt := &models.Worktree{}
		var metadataJSON []byte
		var lastSyncAt, lastActiveAt, deletedAt sql.NullTime
		var lastCommitHash sql.NullString
		var currentAIID, activeTaskID sql.NullInt64

		err := rows.Scan(
			&wt.ID, &wt.ProjectID, &wt.ExpertID, &wt.Name, &wt.WorktreePath, &wt.Branch,
			&wt.Status, &wt.IsLocked, &lastCommitHash, &wt.HasUncommitted, &wt.AheadCount,
			&wt.BehindCount, &currentAIID, &activeTaskID, &wt.DiskUsageMB, &lastSyncAt,
			&lastActiveAt, &metadataJSON, &wt.CreatedAt, &wt.UpdatedAt, &deletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan worktree: %w", err)
		}

		// Handle nullable fields
		if lastCommitHash.Valid {
			wt.LastCommitHash = &lastCommitHash.String
		}
		if currentAIID.Valid {
			aiID := int(currentAIID.Int64)
			wt.CurrentAIID = &aiID
		}
		if activeTaskID.Valid {
			taskID := int(activeTaskID.Int64)
			wt.ActiveTaskID = &taskID
		}
		if lastSyncAt.Valid {
			wt.LastSyncAt = &lastSyncAt.Time
		}
		if lastActiveAt.Valid {
			wt.LastActiveAt = &lastActiveAt.Time
		}
		if deletedAt.Valid {
			wt.DeletedAt = &deletedAt.Time
		}

		if err := json.Unmarshal(metadataJSON, &wt.Metadata); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		worktrees = append(worktrees, wt)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("row iteration error: %w", err)
	}

	return worktrees, total, nil
}

// GetByProjectID retrieves worktrees by project ID
func (r *worktreeRepositoryImpl) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Worktree, int, error) {
	opts := &models.WorktreeListOptions{
		ProjectID: &projectID,
		Page:      (offset / limit) + 1,
		PageSize:  limit,
	}
	return r.List(ctx, opts)
}

// GetByStatus retrieves worktrees by status
func (r *worktreeRepositoryImpl) GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Worktree, int, error) {
	opts := &models.WorktreeListOptions{
		Status:   []string{status},
		Page:     (offset / limit) + 1,
		PageSize: limit,
	}
	return r.List(ctx, opts)
}

// GetActiveWorktrees retrieves active worktrees for a project
func (r *worktreeRepositoryImpl) GetActiveWorktrees(ctx context.Context, projectID int) ([]*models.Worktree, error) {
	opts := &models.WorktreeListOptions{
		ProjectID: &projectID,
		Status:    []string{models.WorktreeStatusActive},
		PageSize:  100,
	}
	worktrees, _, err := r.List(ctx, opts)
	return worktrees, err
}

// UpdateStatus updates worktree status
func (r *worktreeRepositoryImpl) UpdateStatus(ctx context.Context, id int, status string) error {
	query := `UPDATE worktrees SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update worktree status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// LockWorktree locks a worktree
func (r *worktreeRepositoryImpl) LockWorktree(ctx context.Context, id int, reason string) error {
	query := `
		UPDATE worktrees SET
			is_locked = true,
			metadata = jsonb_set(metadata, '{lock_reason}', to_jsonb($1::text)),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND deleted_at IS NULL
	`

	result, err := r.getDB().ExecContext(ctx, query, reason, id)
	if err != nil {
		return fmt.Errorf("failed to lock worktree: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// UnlockWorktree unlocks a worktree
func (r *worktreeRepositoryImpl) UnlockWorktree(ctx context.Context, id int) error {
	query := `
		UPDATE worktrees SET
			is_locked = false,
			metadata = metadata - 'lock_reason',
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to unlock worktree: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// UpdateGitStatus updates Git-related status fields
func (r *worktreeRepositoryImpl) UpdateGitStatus(ctx context.Context, id int, status *models.WorktreeGitStatus) error {
	query := `
		UPDATE worktrees SET
			last_commit_hash = $1,
			has_uncommitted = $2,
			ahead_count = $3,
			behind_count = $4,
			last_sync_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $5 AND deleted_at IS NULL
	`

	result, err := r.getDB().ExecContext(
		ctx, query,
		status.LastCommitHash,
		status.HasUncommitted,
		status.AheadCount,
		status.BehindCount,
		id,
	)
	if err != nil {
		return fmt.Errorf("failed to update git status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// GetWorktreesNeedingSync retrieves worktrees that need synchronization
func (r *worktreeRepositoryImpl) GetWorktreesNeedingSync(ctx context.Context, projectID int) ([]*models.Worktree, error) {
	// Worktrees needing sync: behind_count > 0 OR has_uncommitted = true OR last_sync_at > 1 hour ago
	query := `
		SELECT
			id, project_id, expert_id, name, worktree_path, branch, status, is_locked,
			last_commit_hash, has_uncommitted, ahead_count, behind_count,
			current_ai_id, active_task_id, disk_usage_mb, last_sync_at, last_active_at,
			metadata, created_at, updated_at, deleted_at
		FROM worktrees
		WHERE project_id = $1
			AND deleted_at IS NULL
			AND (
				behind_count > 0
				OR has_uncommitted = true
				OR last_sync_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
				OR last_sync_at IS NULL
			)
		ORDER BY last_sync_at ASC NULLS FIRST
		LIMIT 50
	`

	rows, err := r.getDB().QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktrees needing sync: %w", err)
	}
	defer rows.Close()

	worktrees := []*models.Worktree{}
	for rows.Next() {
		wt := &models.Worktree{}
		var metadataJSON []byte
		var lastSyncAt, lastActiveAt, deletedAt sql.NullTime
		var lastCommitHash sql.NullString
		var currentAIID, activeTaskID sql.NullInt64

		err := rows.Scan(
			&wt.ID, &wt.ProjectID, &wt.ExpertID, &wt.Name, &wt.WorktreePath, &wt.Branch,
			&wt.Status, &wt.IsLocked, &lastCommitHash, &wt.HasUncommitted, &wt.AheadCount,
			&wt.BehindCount, &currentAIID, &activeTaskID, &wt.DiskUsageMB, &lastSyncAt,
			&lastActiveAt, &metadataJSON, &wt.CreatedAt, &wt.UpdatedAt, &deletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan worktree: %w", err)
		}

		// Handle nullable fields
		if lastCommitHash.Valid {
			wt.LastCommitHash = &lastCommitHash.String
		}
		if currentAIID.Valid {
			aiID := int(currentAIID.Int64)
			wt.CurrentAIID = &aiID
		}
		if activeTaskID.Valid {
			taskID := int(activeTaskID.Int64)
			wt.ActiveTaskID = &taskID
		}
		if lastSyncAt.Valid {
			wt.LastSyncAt = &lastSyncAt.Time
		}
		if lastActiveAt.Valid {
			wt.LastActiveAt = &lastActiveAt.Time
		}
		if deletedAt.Valid {
			wt.DeletedAt = &deletedAt.Time
		}

		if err := json.Unmarshal(metadataJSON, &wt.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		worktrees = append(worktrees, wt)
	}

	return worktrees, rows.Err()
}

// AssignAI assigns an AI to a worktree
func (r *worktreeRepositoryImpl) AssignAI(ctx context.Context, id int, aiID int) error {
	query := `UPDATE worktrees SET current_ai_id = $1, last_active_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, aiID, id)
	if err != nil {
		return fmt.Errorf("failed to assign AI: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// UnassignAI unassigns AI from a worktree
func (r *worktreeRepositoryImpl) UnassignAI(ctx context.Context, id int) error {
	query := `UPDATE worktrees SET current_ai_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to unassign AI: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// AssignTask assigns a task to a worktree
func (r *worktreeRepositoryImpl) AssignTask(ctx context.Context, id int, taskID int) error {
	query := `UPDATE worktrees SET active_task_id = $1, last_active_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, taskID, id)
	if err != nil {
		return fmt.Errorf("failed to assign task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// UnassignTask unassigns task from a worktree
func (r *worktreeRepositoryImpl) UnassignTask(ctx context.Context, id int) error {
	query := `UPDATE worktrees SET active_task_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to unassign task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// UpdateDiskUsage updates disk usage for a worktree
func (r *worktreeRepositoryImpl) UpdateDiskUsage(ctx context.Context, id int, diskUsageMB int64) error {
	query := `UPDATE worktrees SET disk_usage_mb = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, diskUsageMB, id)
	if err != nil {
		return fmt.Errorf("failed to update disk usage: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// UpdateLastActive updates last active timestamp
func (r *worktreeRepositoryImpl) UpdateLastActive(ctx context.Context, id int) error {
	query := `UPDATE worktrees SET last_active_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to update last active: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree not found (ID: %d)", id)
	}

	return nil
}

// GetWorktreeStats retrieves statistics for worktrees in a project
func (r *worktreeRepositoryImpl) GetWorktreeStats(ctx context.Context, projectID int) (*models.WorktreeStatsResponse, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
			COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
			COUNT(CASE WHEN is_locked THEN 1 END) as locked,
			COUNT(CASE WHEN has_uncommitted THEN 1 END) as uncommitted,
			SUM(disk_usage_mb) as total_disk_usage,
			COUNT(DISTINCT current_ai_id) as active_ai_count
		FROM worktrees
		WHERE project_id = $1 AND deleted_at IS NULL
	`

	stats := &models.WorktreeStatsResponse{}
	err := r.getDB().QueryRowContext(ctx, query, projectID).Scan(
		&stats.TotalWorktrees,
		&stats.ActiveWorktrees,
		&stats.ReadyWorktrees,
		&stats.LockedWorktrees,
		&stats.UncommittedWorktrees,
		&stats.TotalDiskUsageMB,
		&stats.ActiveAICount,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get worktree stats: %w", err)
	}

	// Get last sync time
	syncQuery := `
		SELECT MAX(last_sync_at)
		FROM worktrees
		WHERE project_id = $1 AND deleted_at IS NULL AND last_sync_at IS NOT NULL
	`
	var lastSyncAt sql.NullTime
	err = r.getDB().QueryRowContext(ctx, syncQuery, projectID).Scan(&lastSyncAt)
	if err == nil && lastSyncAt.Valid {
		stats.LastSyncAt = &lastSyncAt.Time
	}

	return stats, nil
}
