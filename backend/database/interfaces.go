package database

import (
	"ai-project-backend/models"
	"context"
)

// UserRepository defines the interface for user database operations
type UserRepository interface {
	Create(ctx context.Context, user *models.User) (*models.User, error)
	GetByID(ctx context.Context, id int) (*models.User, error)
	GetByUsername(ctx context.Context, username string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Update(ctx context.Context, user *models.User) (*models.User, error)
	Delete(ctx context.Context, id int) error
	List(ctx context.Context, limit, offset int) ([]*models.User, int, error)
}

// ProjectRepository defines the interface for project database operations
type ProjectRepository interface {
	Create(ctx context.Context, project *models.Project) (*models.Project, error)
	GetByID(ctx context.Context, id int) (*models.Project, error)
	GetByUserID(ctx context.Context, userID int, limit, offset int) ([]*models.Project, int, error)
	Update(ctx context.Context, project *models.Project) (*models.Project, error)
	Delete(ctx context.Context, id int) error
	List(ctx context.Context, limit, offset int) ([]*models.Project, int, error)
	
	// Recycle bin operations
	GetRecycledProjects(ctx context.Context, limit, offset int) ([]*models.RecycledProject, int, error)
	RestoreProject(ctx context.Context, id int) error
	HardDeleteProject(ctx context.Context, id int) error
}

// TaskRepository defines the interface for task database operations
type TaskRepository interface {
	Create(ctx context.Context, task *models.Task) (*models.Task, error)
	GetByID(ctx context.Context, id int) (*models.Task, error)
	GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error)
	Update(ctx context.Context, task *models.Task) (*models.Task, error)
	Delete(ctx context.Context, id int) error
	BulkCreate(ctx context.Context, tasks []*models.Task) ([]*models.Task, error)
	UpdateStatus(ctx context.Context, id int, status string) error
	GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Task, int, error)
}

// SystemRepository defines the interface for system management operations
type SystemRepository interface {
	// Recycle bin operations
	GetRecycledProjects(ctx context.Context, limit, offset int) ([]*models.RecycledProject, int, error)
	RestoreProject(ctx context.Context, id int) error
	HardDeleteProject(ctx context.Context, id int) error
	
	GetRecycledTasks(ctx context.Context, limit, offset int) ([]*models.RecycledTask, int, error)
	RestoreTask(ctx context.Context, id int) error
	HardDeleteTask(ctx context.Context, id int) error
	
	// Audit log operations
	GetAuditLogs(ctx context.Context, limit, offset int) ([]*models.AuditLog, int, error)
	LogAction(ctx context.Context, userID *int, action, entityType string, entityID int, entityData interface{}, ipAddress, userAgent string) error
	
}

// DB defines the database interface that combines all repositories
type DB interface {
	Users() UserRepository
	Projects() ProjectRepository
	Tasks() TaskRepository
	System() SystemRepository
	GetDB() interface{} // Access to underlying database connection
	Close() error
	Ping() error
	BeginTx(ctx context.Context) (Tx, error)
}

// Tx defines the transaction interface
type Tx interface {
	Users() UserRepository
	Projects() ProjectRepository
	Tasks() TaskRepository
	Commit() error
	Rollback() error
}