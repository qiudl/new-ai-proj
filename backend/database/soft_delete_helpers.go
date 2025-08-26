// Package database provides soft delete implementation helpers
package database

import (
	"context"
	"fmt"
	"strings"
	"time"
	
	"ai-project-backend/interfaces"
)

// BaseSoftDeleteRepository provides common soft delete functionality
type BaseSoftDeleteRepository struct {
	tableName string
	execer    interface {
		ExecContext(ctx context.Context, query string, args ...interface{}) (interface{}, error)
		QueryRowContext(ctx context.Context, query string, args ...interface{}) interface{}
	}
}

// NewBaseSoftDeleteRepository creates a new base repository
func NewBaseSoftDeleteRepository(tableName string, execer interface{}) *BaseSoftDeleteRepository {
	return &BaseSoftDeleteRepository{
		tableName: tableName,
		execer:    execer,
	}
}

// Delete performs soft delete by setting deleted_at timestamp
func (r *BaseSoftDeleteRepository) Delete(ctx context.Context, id int) error {
	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, r.tableName)

	_, err := r.execer.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete %s: %w", r.tableName, err)
	}

	return nil
}

// Restore removes the deleted_at timestamp to restore the entity
func (r *BaseSoftDeleteRepository) Restore(ctx context.Context, id int) error {
	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`, r.tableName)

	_, err := r.execer.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore %s: %w", r.tableName, err)
	}

	return nil
}

// HardDelete permanently removes the entity from database
func (r *BaseSoftDeleteRepository) HardDelete(ctx context.Context, id int) error {
	query := fmt.Sprintf(`DELETE FROM %s WHERE id = $1 AND deleted_at IS NOT NULL`, r.tableName)

	_, err := r.execer.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete %s: %w", r.tableName, err)
	}

	return nil
}

// IsDeleted checks if an entity is soft deleted
func (r *BaseSoftDeleteRepository) IsDeleted(ctx context.Context, id int) (bool, error) {
	query := fmt.Sprintf(`SELECT deleted_at FROM %s WHERE id = $1`, r.tableName)

	row := r.execer.QueryRowContext(ctx, query, id)
	var deletedAt *time.Time
	
	// Note: This is simplified - actual implementation would depend on your DB driver
	// err := row.Scan(&deletedAt)
	// if err != nil {
	// 	return false, fmt.Errorf("failed to check deletion status: %w", err)
	// }

	return deletedAt != nil, nil
}

// BulkDelete soft deletes multiple entities
func (r *BaseSoftDeleteRepository) BulkDelete(ctx context.Context, ids []int) error {
	if len(ids) == 0 {
		return nil
	}

	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NOW() WHERE id IN (%s) AND deleted_at IS NULL`, 
		r.tableName, strings.Join(placeholders, ","))

	_, err := r.execer.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to bulk delete %s: %w", r.tableName, err)
	}

	return nil
}

// BulkRestore restores multiple entities
func (r *BaseSoftDeleteRepository) BulkRestore(ctx context.Context, ids []int) error {
	if len(ids) == 0 {
		return nil
	}

	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`UPDATE %s SET deleted_at = NULL WHERE id IN (%s) AND deleted_at IS NOT NULL`, 
		r.tableName, strings.Join(placeholders, ","))

	_, err := r.execer.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to bulk restore %s: %w", r.tableName, err)
	}

	return nil
}

// BulkHardDelete permanently deletes multiple entities
func (r *BaseSoftDeleteRepository) BulkHardDelete(ctx context.Context, ids []int) error {
	if len(ids) == 0 {
		return nil
	}

	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`DELETE FROM %s WHERE id IN (%s) AND deleted_at IS NOT NULL`, 
		r.tableName, strings.Join(placeholders, ","))

	_, err := r.execer.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to bulk hard delete %s: %w", r.tableName, err)
	}

	return nil
}

// BuildSoftDeleteWhereClause builds WHERE clause with soft delete filtering
func BuildSoftDeleteWhereClause(baseWhere string, filter *interfaces.SoftDeleteFilter, tableAlias string) string {
	var conditions []string
	
	// Add base conditions
	if baseWhere != "" {
		conditions = append(conditions, baseWhere)
	}
	
	// Add soft delete filtering
	if filter != nil {
		softDeleteClause := filter.GetWhereClause(tableAlias)
		if softDeleteClause != "1=1" {
			conditions = append(conditions, softDeleteClause)
		}
	} else {
		// Default: exclude deleted
		prefix := ""
		if tableAlias != "" {
			prefix = tableAlias + "."
		}
		conditions = append(conditions, prefix+"deleted_at IS NULL")
	}
	
	if len(conditions) == 0 {
		return ""
	}
	
	return "WHERE " + strings.Join(conditions, " AND ")
}
