package database

import (
	"context"
	"database/sql"
	"fmt"

	"ai-project-backend/models"
)

// worktreeTaskBindingRepositoryImpl implements WorktreeTaskBindingRepository interface
type worktreeTaskBindingRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewWorktreeTaskBindingRepository creates a new instance
func NewWorktreeTaskBindingRepository(db interface{}) WorktreeTaskBindingRepository {
	return &worktreeTaskBindingRepositoryImpl{db: db}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *worktreeTaskBindingRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new worktree-task binding
func (r *worktreeTaskBindingRepositoryImpl) Create(ctx context.Context, binding *models.WorktreeTaskBinding) (*models.WorktreeTaskBinding, error) {
	query := `
		INSERT INTO worktree_task_bindings (worktree_id, task_id, relation_type, priority)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`

	err := r.getDB().QueryRowContext(
		ctx, query,
		binding.WorktreeID,
		binding.TaskID,
		binding.RelationType,
		binding.Priority,
	).Scan(&binding.ID, &binding.CreatedAt, &binding.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create worktree task binding: %w", err)
	}

	return binding, nil
}

// GetByID retrieves binding by ID
func (r *worktreeTaskBindingRepositoryImpl) GetByID(ctx context.Context, id int) (*models.WorktreeTaskBinding, error) {
	query := `
		SELECT id, worktree_id, task_id, relation_type, priority, created_at, updated_at
		FROM worktree_task_bindings
		WHERE id = $1
	`

	binding := &models.WorktreeTaskBinding{}
	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&binding.ID,
		&binding.WorktreeID,
		&binding.TaskID,
		&binding.RelationType,
		&binding.Priority,
		&binding.CreatedAt,
		&binding.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("worktree task binding not found (ID: %d)", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree task binding: %w", err)
	}

	return binding, nil
}

// Delete deletes a binding
func (r *worktreeTaskBindingRepositoryImpl) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM worktree_task_bindings WHERE id = $1`

	result, err := r.getDB().ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete worktree task binding: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("worktree task binding not found (ID: %d)", id)
	}

	return nil
}

// GetByWorktreeID retrieves all bindings for a worktree
func (r *worktreeTaskBindingRepositoryImpl) GetByWorktreeID(ctx context.Context, worktreeID int) ([]*models.WorktreeTaskBinding, error) {
	query := `
		SELECT id, worktree_id, task_id, relation_type, priority, created_at, updated_at
		FROM worktree_task_bindings
		WHERE worktree_id = $1
		ORDER BY priority DESC, created_at DESC
	`

	rows, err := r.getDB().QueryContext(ctx, query, worktreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bindings by worktree: %w", err)
	}
	defer rows.Close()

	bindings := []*models.WorktreeTaskBinding{}
	for rows.Next() {
		binding := &models.WorktreeTaskBinding{}
		err := rows.Scan(
			&binding.ID,
			&binding.WorktreeID,
			&binding.TaskID,
			&binding.RelationType,
			&binding.Priority,
			&binding.CreatedAt,
			&binding.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan binding: %w", err)
		}
		bindings = append(bindings, binding)
	}

	return bindings, rows.Err()
}

// GetByTaskID retrieves all bindings for a task
func (r *worktreeTaskBindingRepositoryImpl) GetByTaskID(ctx context.Context, taskID int) ([]*models.WorktreeTaskBinding, error) {
	query := `
		SELECT id, worktree_id, task_id, relation_type, priority, created_at, updated_at
		FROM worktree_task_bindings
		WHERE task_id = $1
		ORDER BY priority DESC, created_at DESC
	`

	rows, err := r.getDB().QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bindings by task: %w", err)
	}
	defer rows.Close()

	bindings := []*models.WorktreeTaskBinding{}
	for rows.Next() {
		binding := &models.WorktreeTaskBinding{}
		err := rows.Scan(
			&binding.ID,
			&binding.WorktreeID,
			&binding.TaskID,
			&binding.RelationType,
			&binding.Priority,
			&binding.CreatedAt,
			&binding.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan binding: %w", err)
		}
		bindings = append(bindings, binding)
	}

	return bindings, rows.Err()
}

// GetPrimaryWorktree retrieves the primary worktree for a task
func (r *worktreeTaskBindingRepositoryImpl) GetPrimaryWorktree(ctx context.Context, taskID int) (*models.WorktreeTaskBinding, error) {
	query := `
		SELECT id, worktree_id, task_id, relation_type, priority, created_at, updated_at
		FROM worktree_task_bindings
		WHERE task_id = $1 AND relation_type = 'primary'
		LIMIT 1
	`

	binding := &models.WorktreeTaskBinding{}
	err := r.getDB().QueryRowContext(ctx, query, taskID).Scan(
		&binding.ID,
		&binding.WorktreeID,
		&binding.TaskID,
		&binding.RelationType,
		&binding.Priority,
		&binding.CreatedAt,
		&binding.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no primary worktree found for task (ID: %d)", taskID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get primary worktree: %w", err)
	}

	return binding, nil
}

// GetSecondaryWorktrees retrieves secondary worktrees for a task
func (r *worktreeTaskBindingRepositoryImpl) GetSecondaryWorktrees(ctx context.Context, taskID int) ([]*models.WorktreeTaskBinding, error) {
	query := `
		SELECT id, worktree_id, task_id, relation_type, priority, created_at, updated_at
		FROM worktree_task_bindings
		WHERE task_id = $1 AND relation_type = 'secondary'
		ORDER BY priority DESC, created_at DESC
	`

	rows, err := r.getDB().QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get secondary worktrees: %w", err)
	}
	defer rows.Close()

	bindings := []*models.WorktreeTaskBinding{}
	for rows.Next() {
		binding := &models.WorktreeTaskBinding{}
		err := rows.Scan(
			&binding.ID,
			&binding.WorktreeID,
			&binding.TaskID,
			&binding.RelationType,
			&binding.Priority,
			&binding.CreatedAt,
			&binding.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan binding: %w", err)
		}
		bindings = append(bindings, binding)
	}

	return bindings, rows.Err()
}

// SetPrimaryWorktree sets a worktree as primary for a task (removes any existing primary)
func (r *worktreeTaskBindingRepositoryImpl) SetPrimaryWorktree(ctx context.Context, taskID int, worktreeID int) error {
	// Begin transaction if not already in one
	// First, remove any existing primary binding
	deleteQuery := `DELETE FROM worktree_task_bindings WHERE task_id = $1 AND relation_type = 'primary'`
	_, err := r.getDB().ExecContext(ctx, deleteQuery, taskID)
	if err != nil {
		return fmt.Errorf("failed to remove existing primary binding: %w", err)
	}

	// Create new primary binding
	binding := &models.WorktreeTaskBinding{
		WorktreeID:   worktreeID,
		TaskID:       taskID,
		RelationType: "primary",
		Priority:     100,
	}
	_, err = r.Create(ctx, binding)
	if err != nil {
		return fmt.Errorf("failed to create primary binding: %w", err)
	}

	return nil
}

// AddSecondaryWorktree adds a worktree as secondary for a task
func (r *worktreeTaskBindingRepositoryImpl) AddSecondaryWorktree(ctx context.Context, taskID int, worktreeID int) error {
	// Check if binding already exists
	checkQuery := `SELECT COUNT(*) FROM worktree_task_bindings WHERE task_id = $1 AND worktree_id = $2`
	var count int
	err := r.getDB().QueryRowContext(ctx, checkQuery, taskID, worktreeID).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check existing binding: %w", err)
	}

	if count > 0 {
		return fmt.Errorf("binding already exists for task %d and worktree %d", taskID, worktreeID)
	}

	binding := &models.WorktreeTaskBinding{
		WorktreeID:   worktreeID,
		TaskID:       taskID,
		RelationType: "secondary",
		Priority:     50,
	}
	_, err = r.Create(ctx, binding)
	if err != nil {
		return fmt.Errorf("failed to create secondary binding: %w", err)
	}

	return nil
}

// RemoveBinding removes a specific binding between task and worktree
func (r *worktreeTaskBindingRepositoryImpl) RemoveBinding(ctx context.Context, taskID int, worktreeID int) error {
	query := `DELETE FROM worktree_task_bindings WHERE task_id = $1 AND worktree_id = $2`

	result, err := r.getDB().ExecContext(ctx, query, taskID, worktreeID)
	if err != nil {
		return fmt.Errorf("failed to remove binding: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("binding not found (task: %d, worktree: %d)", taskID, worktreeID)
	}

	return nil
}

// RemoveAllBindings removes all bindings for a task
func (r *worktreeTaskBindingRepositoryImpl) RemoveAllBindings(ctx context.Context, taskID int) error {
	query := `DELETE FROM worktree_task_bindings WHERE task_id = $1`

	_, err := r.getDB().ExecContext(ctx, query, taskID)
	if err != nil {
		return fmt.Errorf("failed to remove all bindings: %w", err)
	}

	return nil
}

// GetTaskWorktreeCount retrieves the count of worktrees bound to a task
func (r *worktreeTaskBindingRepositoryImpl) GetTaskWorktreeCount(ctx context.Context, taskID int) (int, error) {
	query := `SELECT COUNT(*) FROM worktree_task_bindings WHERE task_id = $1`

	var count int
	err := r.getDB().QueryRowContext(ctx, query, taskID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get task worktree count: %w", err)
	}

	return count, nil
}

// GetWorktreeTaskCount retrieves the count of tasks bound to a worktree
func (r *worktreeTaskBindingRepositoryImpl) GetWorktreeTaskCount(ctx context.Context, worktreeID int) (int, error) {
	query := `SELECT COUNT(*) FROM worktree_task_bindings WHERE worktree_id = $1`

	var count int
	err := r.getDB().QueryRowContext(ctx, query, worktreeID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get worktree task count: %w", err)
	}

	return count, nil
}
