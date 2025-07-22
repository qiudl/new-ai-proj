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

// CompanyRepository defines the interface for company operations (new enterprise model)
type CompanyRepository interface {
	// Company operations
	Create(ctx context.Context, company *models.Company) (*models.Company, error)
	GetByID(ctx context.Context, id int) (*models.Company, error)
	List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Company, int, error)
	Update(ctx context.Context, company *models.Company) (*models.Company, error)
	Delete(ctx context.Context, id int) error
	GetStats(ctx context.Context) (*models.CompanyStats, error)

	// Company User operations
	CreateUser(ctx context.Context, user *models.CompanyUser) (*models.CompanyUser, error)
	GetUsers(ctx context.Context, companyID int) ([]*models.CompanyUser, error)
	UpdateUser(ctx context.Context, user *models.CompanyUser) (*models.CompanyUser, error)
	DeleteUser(ctx context.Context, userID int) error

	// Company Contact operations
	CreateContact(ctx context.Context, contact *models.CompanyContact) (*models.CompanyContact, error)
	GetContacts(ctx context.Context, companyID int, limit, offset int) ([]*models.CompanyContact, int, error)
}

// PermissionRepository defines the interface for permission operations
type PermissionRepository interface {
	// Role management
	GetRoles(ctx context.Context, companyID *int) ([]*models.CompanyRole, error)
	GetRoleByID(ctx context.Context, roleID int) (*models.CompanyRole, error)
	GetRoleByCode(ctx context.Context, roleCode string) (*models.CompanyRole, error)
	CreateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error)
	UpdateRole(ctx context.Context, role *models.CompanyRole) (*models.CompanyRole, error)
	DeleteRole(ctx context.Context, roleID int) error

	// Permission management
	GetPermissions(ctx context.Context) ([]*models.Permission, error)
	GetPermissionsByModule(ctx context.Context, module string) ([]*models.Permission, error)
	GetRolePermissions(ctx context.Context, roleID int) ([]*models.Permission, error)
	SetRolePermissions(ctx context.Context, roleID int, permissionIDs []int) error

	// User permission management
	GetUserPermissions(ctx context.Context, companyUserID int) (*models.UserPermissionSummary, error)
	UpdateUserRole(ctx context.Context, companyUserID int, roleID *int) error
	UpdateUserCustomPermissions(ctx context.Context, companyUserID int, permissions map[string]bool) error
	
	// Project permissions
	GetUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) (*models.CompanyUserProjectPermission, error)
	SetUserProjectPermissions(ctx context.Context, permission *models.CompanyUserProjectPermission) error
	RemoveUserProjectPermissions(ctx context.Context, companyUserID int, projectID int) error

	// Permission checking
	CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error)
	CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error)

	// Permission inheritance and override management
	GetPermissionInheritanceTrace(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionInheritanceTrace, error)
	SetUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string, isGranted bool, reason string) error
	RemoveUserPermissionOverride(ctx context.Context, companyUserID int, permissionCode string) error
	GetUserPermissionOverrides(ctx context.Context, companyUserID int) (map[string]bool, error)
	AnalyzePermissionConflicts(ctx context.Context, companyUserID int) (*models.PermissionAnalysis, error)

	// Audit logging
	LogPermissionChange(ctx context.Context, log *models.PermissionAuditLog) error
	GetPermissionAuditLogs(ctx context.Context, companyUserID *int, limit, offset int) ([]*models.PermissionAuditLog, int, error)
}

// DB defines the database interface that combines all repositories
type DB interface {
	Users() UserRepository
	Projects() ProjectRepository
	Tasks() TaskRepository
	Customers() CustomerRepository // Deprecated, use Companies instead
	Companies() CompanyRepository  // New enterprise customer model
	Permissions() PermissionRepository // Enterprise permission management
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
	Companies() CompanyRepository
	Permissions() PermissionRepository
	Audit() AuditRepository
	Commit() error
	Rollback() error
}