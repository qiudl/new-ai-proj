package models

import (
	"time"

	"github.com/google/uuid"
)

// SyncMixin provides UUID and sync metadata fields for cross-database synchronization
// These fields are added to core entities: Task, Project, Enterprise, User, Document, Requirement
type SyncMixin struct {
	// UUID is a globally unique identifier for cross-database sync
	UUID uuid.UUID `json:"uuid" db:"uuid"`

	// SyncSource indicates where this record originated from (e.g., "local", "production")
	SyncSource *string `json:"sync_source,omitempty" db:"sync_source"`

	// SyncRemoteID is the ID of this record in the remote database
	SyncRemoteID *int `json:"sync_remote_id,omitempty" db:"sync_remote_id"`

	// SyncedAt is the timestamp of the last sync operation
	SyncedAt *time.Time `json:"synced_at,omitempty" db:"synced_at"`

	// SyncVersion is used for optimistic locking during sync
	SyncVersion int `json:"sync_version" db:"sync_version"`
}

// SyncableEntity interface for entities that support cross-database sync
type SyncableEntity interface {
	GetUUID() uuid.UUID
	SetUUID(uuid.UUID)
	GetSyncVersion() int
	SetSyncVersion(int)
}

// SyncRequest represents a request to sync an entity
type SyncRequest struct {
	UUID         string                 `json:"uuid" validate:"required,uuid"`
	EntityType   string                 `json:"entity_type" validate:"required,oneof=task project enterprise user document requirement"`
	Data         map[string]interface{} `json:"data" validate:"required"`
	SyncSource   string                 `json:"sync_source" validate:"required"`
	SyncVersion  int                    `json:"sync_version"`
	ForceUpdate  bool                   `json:"force_update"`
}

// SyncResponse represents the response from a sync operation
type SyncResponse struct {
	Success      bool      `json:"success"`
	UUID         string    `json:"uuid"`
	LocalID      int       `json:"local_id"`
	RemoteID     *int      `json:"remote_id,omitempty"`
	Action       string    `json:"action"` // "created", "updated", "skipped", "conflict"
	SyncVersion  int       `json:"sync_version"`
	SyncedAt     time.Time `json:"synced_at"`
	Message      string    `json:"message,omitempty"`
}

// BatchSyncRequest represents a batch sync request
type BatchSyncRequest struct {
	Entities []SyncRequest `json:"entities" validate:"required,min=1"`
	Strategy string        `json:"strategy" validate:"omitempty,oneof=newer_wins local_wins remote_wins version_wins"`
}

// BatchSyncResponse represents the response from a batch sync operation
type BatchSyncResponse struct {
	Success   bool           `json:"success"`
	Total     int            `json:"total"`
	Created   int            `json:"created"`
	Updated   int            `json:"updated"`
	Skipped   int            `json:"skipped"`
	Failed    int            `json:"failed"`
	Results   []SyncResponse `json:"results"`
}

// ConflictStrategy defines how to resolve sync conflicts
type ConflictStrategy string

const (
	ConflictStrategyNewerWins   ConflictStrategy = "newer_wins"   // More recent updated_at wins
	ConflictStrategyLocalWins   ConflictStrategy = "local_wins"   // Local record always wins
	ConflictStrategyRemoteWins  ConflictStrategy = "remote_wins"  // Remote record always wins
	ConflictStrategyVersionWins ConflictStrategy = "version_wins" // Higher sync_version wins
)

// EntityType defines the type of syncable entity
type EntityType string

const (
	EntityTypeTask        EntityType = "task"
	EntityTypeProject     EntityType = "project"
	EntityTypeEnterprise  EntityType = "enterprise"
	EntityTypeUser        EntityType = "user"
	EntityTypeDocument    EntityType = "document"
	EntityTypeRequirement EntityType = "requirement"
)
