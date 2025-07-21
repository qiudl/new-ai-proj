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
	
	// User profile management
	UpdateProfile(ctx context.Context, userID int, username, email string) (*models.User, error)
	UpdatePassword(ctx context.Context, userID int, passwordHash string) error
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
	GetAll(ctx context.Context, limit, offset int) ([]*models.Task, int, error)
	Update(ctx context.Context, task *models.Task) (*models.Task, error)
	Delete(ctx context.Context, id int) error
	BulkDelete(ctx context.Context, ids []int) error
	BulkCreate(ctx context.Context, tasks []*models.Task) ([]*models.Task, error)
	UpdateStatus(ctx context.Context, id int, status string) error
	GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Task, int, error)
	
	// Hierarchical task operations
	GetChildren(ctx context.Context, parentID int) ([]*models.Task, error)
	GetTaskTree(ctx context.Context, projectID int) ([]*models.HierarchicalTask, error)
	GetRootTasks(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error)
	
	// Task update history
	CreateTaskUpdate(ctx context.Context, update *models.TaskUpdate) error
	GetTaskUpdates(ctx context.Context, taskID int, limit, offset int) ([]*models.TaskUpdate, int, error)
	UpdateTaskUpdateNotes(ctx context.Context, updateID int, notes string) error
	DeleteTaskUpdate(ctx context.Context, updateID int) error
	
	// Timeline events
	CreateTimelineEvent(ctx context.Context, event *models.TimelineEvent) error
	GetTaskTimeline(ctx context.Context, taskID int, limit, offset int) ([]*models.TimelineEvent, int, error)
	GetProjectTimeline(ctx context.Context, projectID int, limit, offset int) ([]*models.TimelineEvent, int, error)
}

// CustomerRepository defines the interface for customer database operations
type CustomerRepository interface {
	Create(ctx context.Context, customer *models.Customer) (*models.Customer, error)
	GetByID(ctx context.Context, id int) (*models.Customer, error)
	List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Customer, int, error)
	Update(ctx context.Context, customer *models.Customer) (*models.Customer, error)
	Delete(ctx context.Context, id int) error
	
	// Customer user associations
	AssociateUser(ctx context.Context, customerUser *models.CustomerUser) (*models.CustomerUser, error)
	DisassociateUser(ctx context.Context, customerID, userID int) error
	GetCustomerUsers(ctx context.Context, customerID int) ([]*models.CustomerUser, error)
	GetUserCustomers(ctx context.Context, userID int) ([]*models.Customer, error)
	UpdateUserRole(ctx context.Context, customerID, userID int, role string, permissions models.CustomFields) error
	
	// Customer contacts
	CreateContact(ctx context.Context, contact *models.CustomerContact) (*models.CustomerContact, error)
	GetContacts(ctx context.Context, customerID int, limit, offset int) ([]*models.CustomerContact, int, error)
	UpdateContact(ctx context.Context, contact *models.CustomerContact) (*models.CustomerContact, error)
	DeleteContact(ctx context.Context, id int) error
	
	// Statistics and reports
	GetCustomerStats(ctx context.Context) (map[string]interface{}, error)
	GetCustomersByStatus(ctx context.Context, status string) ([]*models.Customer, error)
	GetUpcomingContacts(ctx context.Context, userID int, days int) ([]*models.CustomerContact, error)
}

// AuditRepository defines the interface for audit log operations
type AuditRepository interface {
	// Audit log operations
	CreateAuditLog(ctx context.Context, log *models.AuditLog) error
	GetAuditLogs(ctx context.Context, filter *models.AuditLogFilter) ([]*models.AuditLog, int64, error)
	GetAuditLogByID(ctx context.Context, id int64) (*models.AuditLog, error)
	GetAuditLogByEventID(ctx context.Context, eventID string) (*models.AuditLog, error)
	
	// Audit configuration operations
	GetAuditConfig(ctx context.Context, resourceType, action string) (*models.AuditConfig, error)
	GetAllAuditConfigs(ctx context.Context) ([]*models.AuditConfig, error)
	CreateAuditConfig(ctx context.Context, config *models.AuditConfig) error
	UpdateAuditConfig(ctx context.Context, config *models.AuditConfig) error
	DeleteAuditConfig(ctx context.Context, id int) error
	
	// Audit statistics
	GetAuditStats(ctx context.Context, req *models.AuditStatsRequest) ([]*models.AuditStats, error)
	
	// Data cleanup
	CleanupExpiredAuditLogs(ctx context.Context) (int64, error)
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
	
	// Enhanced audit log operations
	GetAuditLogsWithFilter(ctx context.Context, filter *models.AuditLogFilter) ([]interface{}, int, error)
	GetAuditLogByID(ctx context.Context, id int64) (*models.AuditLog, error)
	GetAuditStats(ctx context.Context, filter *models.AuditLogFilter, groupBy string) (interface{}, error)
	
	// Legacy audit log operations (deprecated - use enhanced methods above)
	GetAuditLogs(ctx context.Context, limit, offset int) ([]*models.AuditLog, int, error)
	LogAction(ctx context.Context, userID *int, action, entityType string, entityID int, entityData interface{}, ipAddress, userAgent string) error
}

// DB defines the database interface that combines all repositories
type DB interface {
	Users() UserRepository
	Projects() ProjectRepository
	Tasks() TaskRepository
	Customers() CustomerRepository
	System() SystemRepository
	Audit() AuditRepository
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
	Customers() CustomerRepository
	Audit() AuditRepository
	Commit() error
	Rollback() error
}