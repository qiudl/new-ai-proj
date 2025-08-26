// Enhanced project repository with cascade soft delete implementation
package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
)

// ProjectCascadeDelete implements cascade soft delete for projects
func (r *PostgresProjectRepository) DeleteWithCascade(ctx context.Context, id int) error {
	// Cast db to sql.DB for transaction support
	db, ok := r.db.(*sql.DB)
	if !ok {
		return fmt.Errorf("database connection is not a *sql.DB")
	}
	
	// Start a transaction for consistency
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. Soft delete the project
	query := `UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`
	result, err := tx.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found or already deleted")
	}

	// 2. Cascade soft delete all tasks in the project (including children via recursive CTE)
	taskQuery := `
		WITH RECURSIVE task_hierarchy AS (
			-- Find all root tasks in the project
			SELECT id FROM tasks WHERE project_id = $1 AND deleted_at IS NULL
			
			UNION ALL
			
			-- Recursively find all child tasks
			SELECT t.id FROM tasks t
			INNER JOIN task_hierarchy th ON t.parent_id = th.id
			WHERE t.deleted_at IS NULL
		)
		UPDATE tasks 
		SET deleted_at = NOW() 
		WHERE id IN (SELECT id FROM task_hierarchy) 
		AND deleted_at IS NULL`

	_, err = tx.ExecContext(ctx, taskQuery, id)
	if err != nil {
		return fmt.Errorf("failed to cascade delete tasks: %w", err)
	}

	// 3. Cascade soft delete project documents
	docQuery := `UPDATE documents SET deleted_at = NOW() WHERE project_id = $1 AND deleted_at IS NULL`
	_, err = tx.ExecContext(ctx, docQuery, id)
	if err != nil {
		return fmt.Errorf("failed to cascade delete documents: %w", err)
	}

	// 4. Handle project-user relationships (don't delete, just log)
	// ProjectUser relationships are preserved for audit purposes
	log.Printf("Project %d deleted - preserving user relationships for audit", id)

	// 5. Handle project-customer relationships (preserve for audit)
	log.Printf("Project %d deleted - preserving customer relationships for audit", id)

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// RestoreWithCascade restores a project and all its related children
func (r *PostgresProjectRepository) RestoreWithCascade(ctx context.Context, id int) error {
	// Cast db to sql.DB for transaction support
	db, ok := r.db.(*sql.DB)
	if !ok {
		return fmt.Errorf("database connection is not a *sql.DB")
	}
	
	// Start a transaction for consistency
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. Restore the project
	query := `UPDATE projects SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`
	result, err := tx.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found in recycle bin")
	}

	// 2. Restore all tasks that were deleted with the project
	// Only restore tasks that were deleted around the same time as the project
	taskQuery := `
		WITH project_deletion AS (
			SELECT deleted_at as project_deleted_at FROM projects WHERE id = $1
		)
		UPDATE tasks 
		SET deleted_at = NULL 
		WHERE project_id = $1 
		AND deleted_at IS NOT NULL
		-- Only restore tasks deleted within 1 minute of project deletion
		AND ABS(EXTRACT(EPOCH FROM (deleted_at - (SELECT project_deleted_at FROM project_deletion)))) < 60`

	_, err = tx.ExecContext(ctx, taskQuery, id)
	if err != nil {
		return fmt.Errorf("failed to restore cascaded tasks: %w", err)
	}

	// 3. Restore project documents deleted with the project
	docQuery := `
		WITH project_deletion AS (
			SELECT deleted_at as project_deleted_at FROM projects WHERE id = $1
		)
		UPDATE documents 
		SET deleted_at = NULL 
		WHERE project_id = $1 
		AND deleted_at IS NOT NULL
		AND ABS(EXTRACT(EPOCH FROM (deleted_at - (SELECT project_deleted_at FROM project_deletion)))) < 60`

	_, err = tx.ExecContext(ctx, docQuery, id)
	if err != nil {
		return fmt.Errorf("failed to restore cascaded documents: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
