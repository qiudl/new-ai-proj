// Package interfaces defines common interfaces for soft delete functionality
// This ensures consistency across all repositories implementing soft delete
package interfaces

import (
	"context"
	"time"
)

// SoftDeletable defines the interface for entities that support soft delete
type SoftDeletable interface {
	GetID() int
	IsDeleted() bool
	GetDeletedAt() *time.Time
	SetDeletedAt(*time.Time)
}

// SoftDeleteRepository defines the standard soft delete operations
type SoftDeleteRepository interface {
	// Delete performs soft delete by setting deleted_at timestamp
	Delete(ctx context.Context, id int) error

	// Restore removes the deleted_at timestamp to restore the entity
	Restore(ctx context.Context, id int) error

	// HardDelete permanently removes the entity from database
	// Should only be used for admin operations or cleanup
	HardDelete(ctx context.Context, id int) error

	// IsDeleted checks if an entity is soft deleted
	IsDeleted(ctx context.Context, id int) (bool, error)
}

// BulkSoftDeleteRepository extends SoftDeleteRepository with bulk operations
type BulkSoftDeleteRepository interface {
	SoftDeleteRepository

	// BulkDelete soft deletes multiple entities
	BulkDelete(ctx context.Context, ids []int) error

	// BulkRestore restores multiple entities
	BulkRestore(ctx context.Context, ids []int) error

	// BulkHardDelete permanently deletes multiple entities
	BulkHardDelete(ctx context.Context, ids []int) error
}

// CascadeSoftDeleteRepository extends SoftDeleteRepository with cascade operations
type CascadeSoftDeleteRepository interface {
	SoftDeleteRepository

	// DeleteWithCascade soft deletes an entity and all its related children
	DeleteWithCascade(ctx context.Context, id int) error

	// RestoreWithCascade restores an entity and all its related children
	RestoreWithCascade(ctx context.Context, id int) error
}

// SoftDeleteFilter represents filtering options for soft deleted entities
type SoftDeleteFilter struct {
	IncludeDeleted bool       `json:"include_deleted"`
	OnlyDeleted    bool       `json:"only_deleted"`
	DeletedAfter   *time.Time `json:"deleted_after,omitempty"`
	DeletedBefore  *time.Time `json:"deleted_before,omitempty"`
}

// GetWhereClause returns the appropriate WHERE clause for soft delete filtering
func (f *SoftDeleteFilter) GetWhereClause(tableAlias string) string {
	if tableAlias == "" {
		tableAlias = ""
	} else {
		tableAlias = tableAlias + "."
	}

	if f.OnlyDeleted {
		if f.DeletedAfter != nil && f.DeletedBefore != nil {
			return tableAlias + "deleted_at IS NOT NULL AND " +
				tableAlias + "deleted_at >= '" + f.DeletedAfter.Format(time.RFC3339) + "' AND " +
				tableAlias + "deleted_at <= '" + f.DeletedBefore.Format(time.RFC3339) + "'"
		} else if f.DeletedAfter != nil {
			return tableAlias + "deleted_at IS NOT NULL AND " +
				tableAlias + "deleted_at >= '" + f.DeletedAfter.Format(time.RFC3339) + "'"
		} else if f.DeletedBefore != nil {
			return tableAlias + "deleted_at IS NOT NULL AND " +
				tableAlias + "deleted_at <= '" + f.DeletedBefore.Format(time.RFC3339) + "'"
		}
		return tableAlias + "deleted_at IS NOT NULL"
	}

	if f.IncludeDeleted {
		return "1=1" // No filtering
	}

	return tableAlias + "deleted_at IS NULL" // Default: exclude deleted
}
