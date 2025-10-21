package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
)

// DBExecutor defines the interface for database operations
type DBExecutor interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
}

// UserRepository defines the interface for user database operations
type UserRepository interface {
	Create(ctx context.Context, user *models.User) (*models.User, error)
	GetByID(ctx context.Context, id int) (*models.User, error)
	GetByUsername(ctx context.Context, username string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetFirstAdminUser(ctx context.Context) (*models.User, error)
	Update(ctx context.Context, user *models.User) (*models.User, error)
	Delete(ctx context.Context, id int) error
	Restore(ctx context.Context, id int) error
	HardDelete(ctx context.Context, id int) error
	IsDeleted(ctx context.Context, id int) (bool, error)
	List(ctx context.Context, limit, offset int) ([]*models.User, int, error)

	// User profile management
	UpdateProfile(ctx context.Context, userID int, username, email string) (*models.User, error)
	UpdatePassword(ctx context.Context, userID int, passwordHash string) error

	// Enterprise user management
	ListCompanyUsersWithPagination(ctx context.Context, params *models.CompanyUserListParams) ([]*models.EnterpriseUserResponse, int, error)
	GetPrimaryContactByCompanyID(ctx context.Context, companyID int) (*models.User, error)
	GetCompanyUserStatistics(ctx context.Context) (*models.CompanyUserStats, error)
	GetExpiringAccounts(ctx context.Context, days int) ([]*models.User, error)

	// Timer management
	GetUsersTimingTask(ctx context.Context, taskID int) ([]models.User, error)
}

// ProjectRepository defines the interface for project database operations
type ProjectRepository interface {
	Create(ctx context.Context, project *models.Project) (*models.Project, error)
	GetByID(ctx context.Context, id int) (*models.Project, error)
	GetByUserID(ctx context.Context, userID int, limit, offset int) ([]*models.Project, int, error)
	GetByEnterpriseID(ctx context.Context, enterpriseID int, limit, offset int) ([]*models.Project, int, error)
	GetPaginated(ctx context.Context, userID int, offset, pageSize int, search, status, sortBy, sortOrder string) ([]*models.Project, int, error)
	// New: same as GetPaginated but includes company name via LEFT JOIN
	GetPaginatedWithCompany(ctx context.Context, userID int, offset, pageSize int, search, status, sortBy, sortOrder string, companyID *int, enterpriseID *int) ([]*models.ProjectWithCompany, int, error)
	Update(ctx context.Context, project *models.Project) (*models.Project, error)
	Delete(ctx context.Context, id int) error
	DeleteWithCascade(ctx context.Context, id int) error
	List(ctx context.Context, limit, offset int) ([]*models.Project, int, error)
	ListWithCompanyInfo(ctx context.Context, limit, offset int) ([]*models.ProjectWithCompany, int, error)

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
	// New: filtered global listing (status-driven presets etc.)
	GetAllFiltered(ctx context.Context, opts *models.TaskListOptions, limit, offset int) ([]*models.Task, int, error)
	Update(ctx context.Context, task *models.Task) (*models.Task, error)
	Delete(ctx context.Context, id int) error
	BulkDelete(ctx context.Context, ids []int) error
	BulkCreate(ctx context.Context, tasks []*models.Task) ([]*models.Task, error)
	UpdateStatus(ctx context.Context, id int, status string) error
	GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Task, int, error)

	// Hierarchical task operations
	GetChildren(ctx context.Context, parentID int) ([]*models.Task, error)
	GetTaskTree(ctx context.Context, projectID int, sortBy, sortOrder string) ([]*models.HierarchicalTask, error)
	GetRootTasks(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error)
	// GetDescendants 按层级返回指定任务的后代节点（从子任务开始，level 从1起）
	GetDescendants(ctx context.Context, rootTaskID int, depth, limit int) ([]*models.TaskDescendantNode, error)
	// GetDescendantsWithFullDetails 获取包含完整字段的任务后代列表（为统一API响应格式使用）
	GetDescendantsWithFullDetails(ctx context.Context, rootTaskID int, depth, limit int) ([]*models.Task, error)
	// GetDescendantsPaginated 获取分页的简化任务后代列表
	GetDescendantsPaginated(ctx context.Context, rootTaskID int, depth, page, pageSize int) ([]*models.TaskDescendantNode, int, error)
	// GetDescendantsWithFullDetailsPaginated 获取分页的包含完整字段的任务后代列表
	GetDescendantsWithFullDetailsPaginated(ctx context.Context, rootTaskID int, depth, page, pageSize int) ([]*models.Task, int, error)
	SearchParentTasks(ctx context.Context, projectID int, keyword string, excludeTaskIDs []int, maxLevel int, limit, offset int) ([]*models.Task, int, error)
	CheckCircularDependency(ctx context.Context, taskID int, potentialParentID int) (bool, error)

	// Task update history
	CreateTaskUpdate(ctx context.Context, update *models.TaskUpdate) error
	GetTaskUpdates(ctx context.Context, taskID int, limit, offset int) ([]*models.TaskUpdate, int, error)
	UpdateTaskUpdateNotes(ctx context.Context, updateID int, notes string) error
	DeleteTaskUpdate(ctx context.Context, updateID int) error

	// Timeline events
	CreateTimelineEvent(ctx context.Context, event *models.TimelineEvent) error
	GetTaskTimeline(ctx context.Context, taskID int, limit, offset int) ([]*models.TimelineEvent, int, error)
	GetProjectTimeline(ctx context.Context, projectID int, limit, offset int) ([]*models.TimelineEvent, int, error)

	// Title uniqueness check
	CheckTitleUnique(ctx context.Context, projectID int, title string, excludeTaskID int) (bool, *int, error)
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

// APIKeyRepository defines the interface for API key operations
type APIKeyRepository interface {
	// Basic CRUD operations
	CreateAPIKey(ctx context.Context, apiKey *models.APIKey) (*models.APIKey, error)
	GetAPIKeyByID(ctx context.Context, id int64) (*models.APIKey, error)
	GetAPIKeyByHash(ctx context.Context, keyHash string) (*models.APIKey, error)
	GetAPIKeyByPrefix(ctx context.Context, keyPrefix string) (*models.APIKey, error)
	UpdateAPIKey(ctx context.Context, id int64, updates *models.APIKeyUpdateRequest, updatedBy int) (*models.APIKey, error)
	DeleteAPIKey(ctx context.Context, id int64, deletedBy int) error

	// Listing and querying
	ListAPIKeys(ctx context.Context, params *models.APIKeyListParams) ([]models.APIKey, int, error)
	GetActiveAPIKeys(ctx context.Context) ([]models.APIKey, error)

	// Usage tracking
	UpdateLastUsed(ctx context.Context, id int64) error
	UpdateAPIKeyUsage(ctx context.Context, apiKeyID int64) error

	// Usage logging
	CreateUsageLog(ctx context.Context, log *models.APIUsageLog) error
	CreateAPIUsageLog(ctx context.Context, log *models.APIUsageLog) error

	// Statistics and analytics
	GetUsageStats(ctx context.Context, apiKeyID int64, days int) (*models.APIQuotaStats, error)
	CheckRateLimit(ctx context.Context, apiKeyID int64, window models.RateLimitType, limit int) (bool, error)
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

	GetRecycledDocuments(ctx context.Context, page, pageSize int) ([]*models.RecycledDocument, int, error)
	GetRecycledWorkNotes(ctx context.Context, page, pageSize int) ([]*models.RecycledWorkNote, int, error)

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
	// GetByIDIncludeDeleted retrieves a company by ID including soft-deleted rows
	GetByIDIncludeDeleted(ctx context.Context, id int) (*models.Company, error)
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

// EnterpriseRepository defines the interface for enterprise operations (new system)
type EnterpriseRepository interface {
	// Enterprise operations
	Create(ctx context.Context, enterprise *models.Enterprise) (*models.Enterprise, error)
	GetByID(ctx context.Context, id int) (*models.Enterprise, error)
	GetByCode(ctx context.Context, code string) (*models.Enterprise, error)
	List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Enterprise, int, error)
	ListWithStats(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Enterprise, []int, []int, int, error)
	Update(ctx context.Context, enterprise *models.Enterprise) (*models.Enterprise, error)
	Delete(ctx context.Context, id int) error
	GetStats(ctx context.Context) (*models.EnterpriseStats, error)
	GetEnterpriseStatistics(ctx context.Context, enterpriseID int) (userCount, departmentCount int, err error)

	// Enterprise User operations
	CreateUser(ctx context.Context, user *models.EnterpriseUser) (*models.EnterpriseUser, error)
	GetUserByID(ctx context.Context, id int) (*models.EnterpriseUser, error)
	GetUsers(ctx context.Context, enterpriseID int, limit, offset int) ([]*models.EnterpriseUser, int, error)
	ListUsers(ctx context.Context, enterpriseID int, limit, offset int, filters map[string]interface{}) ([]*models.EnterpriseUser, int, error)
	UpdateUser(ctx context.Context, user *models.EnterpriseUser) (*models.EnterpriseUser, error)
	DeleteUser(ctx context.Context, userID int) error
	GetPrimaryContact(ctx context.Context, enterpriseID int) (*models.EnterpriseUser, error)

	// Enterprise Department operations
	CreateDepartment(ctx context.Context, dept *models.EnterpriseDepartment) (*models.EnterpriseDepartment, error)
	GetDepartmentByID(ctx context.Context, id int) (*models.EnterpriseDepartment, error)
	GetDepartments(ctx context.Context, enterpriseID int) ([]*models.EnterpriseDepartment, error)
	ListDepartments(ctx context.Context, enterpriseID int, limit, offset int, filters map[string]interface{}) ([]*models.EnterpriseDepartment, error)
	UpdateDepartment(ctx context.Context, dept *models.EnterpriseDepartment) (*models.EnterpriseDepartment, error)
	DeleteDepartment(ctx context.Context, id int) error
	GetDepartmentStats(ctx context.Context, enterpriseID int) (*models.EnterpriseDepartmentStats, error)
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
	GetRolesWithPermissions(ctx context.Context, companyID *int) ([]*models.CompanyRole, map[int][]*models.Permission, error)
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

// DocumentRepository defines the interface for document database operations
type DocumentRepository interface {
	Create(ctx context.Context, document *models.Document) (*models.Document, error)
	GetByID(ctx context.Context, id int) (*models.Document, error)
	GetByProjectID(ctx context.Context, projectID int, filter *models.DocumentFilter) ([]*models.Document, int, error)
	Update(ctx context.Context, document *models.Document) (*models.Document, error)
	Delete(ctx context.Context, id int) error

	// Additional query methods
	GetWithRelations(ctx context.Context, id int) (*models.DocumentResponse, error)
	GetListWithRelations(ctx context.Context, projectID int, filter *models.DocumentFilter) ([]*models.DocumentListResponse, int, error)
	GetAllDocumentsWithRelations(ctx context.Context, filter *models.DocumentFilter) ([]*models.DocumentListResponse, int, error)
	List(ctx context.Context, filter *models.DocumentFilter) ([]*models.Document, int, error)
	Search(ctx context.Context, projectID int, searchTerm string, limit, offset int) ([]*models.Document, int, error)
	GetGlobalDocumentCount(ctx context.Context) (int, error)
}

// DocumentFolderRepository defines the interface for document folder database operations
// Temporarily disabled due to model conflicts
/*
type DocumentFolderRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, folder *models.CreateDocumentFolderRequest, userID int) (*models.DocumentFolder, error)
	GetByID(ctx context.Context, id int) (*models.DocumentFolder, error)
	Update(ctx context.Context, id int, req *models.UpdateDocumentFolderRequest, userID int) (*models.DocumentFolder, error)
	Delete(ctx context.Context, id int, userID int) error

	// Listing and querying
	List(ctx context.Context, req *models.ListFoldersRequest, userID int) (*models.ListFoldersResponse, error)
	GetTree(ctx context.Context, userID int, visibility string) (*models.FolderTreeResponse, error)
	GetByParent(ctx context.Context, parentID *int, userID int) ([]*models.DocumentFolder, error)
	GetStats(ctx context.Context, folderID int) (*models.DocumentFolderStats, error)

	// Folder operations
	Move(ctx context.Context, folderID int, req *models.MoveFolderRequest, userID int) error
	GetChildren(ctx context.Context, folderID int, userID int) ([]*models.DocumentFolder, error)
	GetPath(ctx context.Context, folderID int) (string, error)

	// Permission and ownership
	CanAccess(ctx context.Context, folderID int, userID int, action string) (bool, error)
	GetUserFolders(ctx context.Context, userID int, visibility string) ([]*models.DocumentFolder, error)

	// Document operations within folders
	GetDocumentsByFolder(ctx context.Context, folderID *int, userID int, limit, offset int) ([]*models.Document, int, error)
	MoveDocument(ctx context.Context, documentID int, targetFolderID *int, userID int) error

	// Statistics and analytics
	GetFolderStats(ctx context.Context, userID int) (map[string]interface{}, error)
	GetRecentlyUpdatedFolders(ctx context.Context, userID int, limit int) ([]*models.DocumentFolder, error)
}
*/

// DocumentRelationRepository defines the interface for document relation database operations
type DocumentRelationRepository interface {
	// Create relations
	CreateCustomerRelation(ctx context.Context, req *models.AddDocumentCustomerRelationRequest, userID int) (*models.DocumentCustomerRelation, error)
	CreateProjectRelation(ctx context.Context, req *models.AddDocumentProjectRelationRequest, userID int) (*models.DocumentProjectRelation, error)
	CreateTaskRelation(ctx context.Context, req *models.AddDocumentTaskRelationRequest, userID int) (*models.DocumentTaskRelation, error)

	// Get relations
	GetDocumentRelations(ctx context.Context, documentID, userID int) (*models.DocumentRelationsResponse, error)
	GetEntityRelations(ctx context.Context, entityType string, entityID int, req *models.ListDocumentRelationsRequest) (*models.EntityRelationsResponse, error)

	// Update relations
	UpdateCustomerRelation(ctx context.Context, id int, req *models.UpdateDocumentRelationRequest, userID int) (*models.DocumentCustomerRelation, error)
	UpdateProjectRelation(ctx context.Context, id int, req *models.UpdateDocumentRelationRequest, userID int) (*models.DocumentProjectRelation, error)
	UpdateTaskRelation(ctx context.Context, id int, req *models.UpdateDocumentRelationRequest, userID int) (*models.DocumentTaskRelation, error)

	// Delete relations
	DeleteRelation(ctx context.Context, entityType string, id, userID int) error

	// Statistics
	GetRelationStats(ctx context.Context, documentID *int, userID int) (*models.RelationStatsResponse, error)

	// Bulk operations
	BulkCreateRelations(ctx context.Context, relations []models.AddDocumentRelationRequest, userID int) error
}

// DocumentPermissionRepository defines the interface for document permission database operations
type DocumentPermissionRepository interface {
	// Permission management
	GrantPermission(ctx context.Context, req *models.GrantDocumentPermissionRequest, grantorID int) (*models.DocumentPermission, error)
	GetDocumentPermissions(ctx context.Context, documentID int, userID int) (*models.DocumentPermissionResponse, error)
	GetUserPermissions(ctx context.Context, userID int) (*models.DocumentPermissionResponse, error)
	CheckUserPermission(ctx context.Context, documentID, userID int, permissionType string) (bool, error)
	UpdatePermission(ctx context.Context, permissionID int, req *models.UpdateDocumentPermissionRequest, userID int) (*models.DocumentPermission, error)
	RevokePermission(ctx context.Context, permissionID, userID int) error

	// Sharing management
	CreateShare(ctx context.Context, req *models.CreateDocumentShareRequest, userID int) (*models.DocumentShare, error)
	GetDocumentShares(ctx context.Context, documentID int) (*models.DocumentShareResponse, error)
	GetShareByToken(ctx context.Context, token string) (*models.DocumentShare, error)
	UpdateShare(ctx context.Context, shareID int, req *models.UpdateDocumentShareRequest, userID int) (*models.DocumentShare, error)
	DeleteShare(ctx context.Context, shareID, userID int) error
}

// DocumentVersionRepository defines the interface for document version management
type DocumentVersionRepository interface {
	// Version CRUD operations
	Create(version *models.DocumentVersion) (*models.DocumentVersion, error)
	GetByID(versionID int) (*models.DocumentVersion, error)
	GetByDocumentAndVersion(documentID, versionNumber int) (*models.DocumentVersion, error)
	GetByDocumentID(documentID int) ([]*models.DocumentVersion, error)
	GetByDocumentIDPaginated(documentID, page, pageSize int) ([]*models.DocumentVersion, int, error)
	Update(version *models.DocumentVersion) (*models.DocumentVersion, error)
	Delete(versionID int) error

	// Version statistics
	GetStats(documentID int) (*models.DocumentVersionStats, error)

	// Version comparison
	CompareVersions(documentID, fromVersion, toVersion int) (*models.DocumentVersionComparison, error)

	// Version labels
	CreateLabel(label *models.DocumentVersionLabel) (*models.DocumentVersionLabel, error)
	GetLabelByID(labelID int) (*models.DocumentVersionLabel, error)
	GetVersionLabels(documentID, versionNumber int) ([]*models.DocumentVersionLabel, error)
	GetAllLabels(documentID int) ([]*models.DocumentVersionLabel, error)
	GetLabelsByColor(color string) ([]*models.DocumentVersionLabel, error)
	SearchLabels(query string, page, pageSize int) ([]*models.DocumentVersionLabel, int, error)
	UpdateLabel(label *models.DocumentVersionLabel) (*models.DocumentVersionLabel, error)
	DeleteLabel(labelID int) error

	// Version comments
	CreateComment(comment *models.DocumentVersionComment) (*models.DocumentVersionComment, error)
	GetCommentByID(commentID int) (*models.DocumentVersionComment, error)
	GetVersionComments(documentID, versionNumber int) ([]*models.DocumentVersionComment, error)
	GetVersionCommentsWithReplies(documentID, versionNumber int) ([]*models.DocumentVersionComment, error)
	GetDocumentComments(documentID, page, pageSize int) ([]*models.DocumentVersionComment, int, error)
	GetCommentReplies(parentCommentID int) ([]*models.DocumentVersionComment, error)
	UpdateComment(comment *models.DocumentVersionComment) (*models.DocumentVersionComment, error)
	DeleteComment(commentID int) error

	// Version branches
	CreateBranch(branch *models.DocumentVersionBranch) (*models.DocumentVersionBranch, error)
	GetBranches(documentID int) ([]*models.DocumentVersionBranch, error)
	GetBranchByID(branchID int) (*models.DocumentVersionBranch, error)
	UpdateBranch(branch *models.DocumentVersionBranch) (*models.DocumentVersionBranch, error)
	DeleteBranch(branchID int) error
}

// DocumentRegistryRepository disabled - conflicting models

// NOTE: Permission approval repository is temporarily disabled in development builds
// to allow the core task/timer backend to compile and run without the unfinished module.
// If you need approval features, re-enable this interface and related methods.
/*
// PermissionApprovalRepository defines the interface for permission approval operations
 type PermissionApprovalRepository interface {
	// Approval request operations
	CreateApprovalRequest(ctx context.Context, request *models.PermissionApprovalRequest) (*models.PermissionApprovalRequest, error)
	GetApprovalRequestByID(ctx context.Context, id int) (*models.PermissionApprovalRequest, error)
	GetApprovalRequestByRequestID(ctx context.Context, requestID string) (*models.PermissionApprovalRequest, error)
	UpdateApprovalRequest(ctx context.Context, request *models.PermissionApprovalRequest) error
	ListApprovalRequests(ctx context.Context, filter *models.ApprovalRequestFilter) ([]*models.PermissionApprovalRequest, int, error)
	DeleteApprovalRequest(ctx context.Context, id int) error

	// Approval step operations
	CreateApprovalStep(ctx context.Context, step *models.PermissionApprovalStep) (*models.PermissionApprovalStep, error)
	GetApprovalStepByID(ctx context.Context, id int) (*models.PermissionApprovalStep, error)
	GetApprovalStepsByRequestID(ctx context.Context, requestID int) ([]*models.PermissionApprovalStep, error)
	UpdateApprovalStep(ctx context.Context, step *models.PermissionApprovalStep) error
	DeleteApprovalStep(ctx context.Context, id int) error

	// Approval workflow operations
	CreateApprovalWorkflow(ctx context.Context, workflow *models.ApprovalWorkflow) (*models.ApprovalWorkflow, error)
	GetApprovalWorkflowByID(ctx context.Context, id int) (*models.ApprovalWorkflow, error)
	ListApprovalWorkflows(ctx context.Context, filter *models.WorkflowFilter) ([]*models.ApprovalWorkflow, error)
	FindMatchingWorkflows(ctx context.Context, permissionCode, resourceType string, priority models.ApprovalPriority) ([]*models.ApprovalWorkflow, error)
	UpdateApprovalWorkflow(ctx context.Context, workflow *models.ApprovalWorkflow) error
	DeleteApprovalWorkflow(ctx context.Context, id int) error

	// Approval delegation operations
	CreateDelegation(ctx context.Context, delegation *models.ApprovalDelegation) (*models.ApprovalDelegation, error)
	GetActiveDelegations(ctx context.Context, delegatorID int) ([]*models.ApprovalDelegation, error)
	GetDelegationsByApprover(ctx context.Context, approverID int) ([]*models.ApprovalDelegation, error)
	UpdateDelegation(ctx context.Context, delegation *models.ApprovalDelegation) error
	EndDelegation(ctx context.Context, id int) error

	// Approval escalation operations
	CreateEscalation(ctx context.Context, escalation *models.ApprovalEscalation) (*models.ApprovalEscalation, error)
	GetEscalationsByStep(ctx context.Context, stepID int) ([]*models.ApprovalEscalation, error)
	UpdateEscalation(ctx context.Context, escalation *models.ApprovalEscalation) error

	// Approval notification operations
	CreateNotification(ctx context.Context, notification *models.ApprovalNotification) (*models.ApprovalNotification, error)
	GetPendingNotifications(ctx context.Context) ([]*models.ApprovalNotification, error)
	GetNotificationsByUser(ctx context.Context, userID int, limit, offset int) ([]*models.ApprovalNotification, int, error)
	MarkNotificationAsSent(ctx context.Context, id int) error
	MarkNotificationAsRead(ctx context.Context, id int, userID int) error

	// Approval audit log operations
	CreateAuditLog(ctx context.Context, log *models.ApprovalAuditLog) error
	GetAuditLogsByRequest(ctx context.Context, requestID int, limit, offset int) ([]*models.ApprovalAuditLog, int, error)
	GetAuditLogsByUser(ctx context.Context, userID int, limit, offset int) ([]*models.ApprovalAuditLog, int, error)

	// Statistics and reporting
	GetApprovalStats(ctx context.Context, filter *models.ApprovalStatsFilter) (*models.ApprovalStats, error)
	GetUserApprovalWorkload(ctx context.Context, userID int) (*models.UserApprovalWorkload, error)
	GetOverdueApprovals(ctx context.Context, threshold time.Duration) ([]*models.PermissionApprovalRequest, error)

	// Bulk operations
	BulkUpdateApprovalSteps(ctx context.Context, updates []models.ApprovalStepUpdate) error
	BulkCreateNotifications(ctx context.Context, notifications []*models.ApprovalNotification) error
 }
*/

// TimerRepository defines the interface for timer operations
type TimerRepository interface {
	// Time log operations
	Create(ctx context.Context, log *models.TaskTimeLog) error
	GetByID(ctx context.Context, id int) (*models.TaskTimeLog, error)
	GetByUserID(ctx context.Context, userID int, limit, offset int) ([]*models.TaskTimeLog, int, error)
	GetByTaskID(ctx context.Context, taskID int, limit, offset int) ([]*models.TaskTimeLog, int, error)
	GetByUserAndTaskToday(ctx context.Context, userID, taskID int) ([]models.TaskTimeLog, error)
	GetTodayTotalByUser(ctx context.Context, userID int) (int, error)
	GetRecentTasksByUser(ctx context.Context, userID int, limit int) ([]models.RecentTimedTask, error)
	GetRecentTasksByUserWithPagination(ctx context.Context, userID int, limit int, offset int) ([]models.RecentTimedTask, error)
	Update(ctx context.Context, log *models.TaskTimeLog) error
	Delete(ctx context.Context, id int) error

	// Timer statistics
	GetUserTimerStats(ctx context.Context, userID int) (*models.TimerStatsResponse, error)
	GetTaskTimeBreakdown(ctx context.Context, userID int, limit int) ([]models.TaskTimeBreakdown, error)

	// Weekly report
	GetWeeklyReport(ctx context.Context, userID int, startDate, endDate string) (*models.WeeklyReportResponse, error)
	
	// Daily comparison for efficiency analysis
	GetDailyComparisonData(ctx context.Context, userID int) (*models.DailyComparisonResponse, error)
}

// UserTimerRepository defines the interface for user timer task operations
type UserTimerRepository interface {
	// CRUD operations
	Create(ctx context.Context, task *models.UserTimerTask) (*models.UserTimerTask, error)
	GetByID(ctx context.Context, id int) (*models.UserTimerTask, error)
	GetByUserID(ctx context.Context, userID int, filter *models.UserTimerFilter, limit, offset int) ([]*models.UserTimerTask, int, error)
	Update(ctx context.Context, task *models.UserTimerTask) (*models.UserTimerTask, error)
	Delete(ctx context.Context, id int) error
	SoftDelete(ctx context.Context, id int) error

	// Personal timer operations
	ToggleFavorite(ctx context.Context, id int, isFavorite bool) error
	UpdateStatus(ctx context.Context, id int, status string) error
	GetFavoritesByUserID(ctx context.Context, userID int, limit int) ([]*models.UserTimerTask, error)
	GetActiveByUserID(ctx context.Context, userID int, limit int) ([]*models.UserTimerTask, error)

	// Statistics and analytics
	GetUserTimerStats(ctx context.Context, userID int) (*models.PersonalTimerSummary, error)
	GetDashboardData(ctx context.Context, userID int, tz string) (*models.PersonalTimerDashboard, error)
	GetTimerSessions(ctx context.Context, userID int, limit, offset int) (*[]models.PersonalTimerSession, error)
	GetTodayStats(ctx context.Context, userID int) (*models.PersonalTimerTodayStats, error)
	GetAnalytics(ctx context.Context, userID int, dateRange string, tz string) (*models.PersonalTimerAnalytics, error)

	// Task validation
	CheckUserOwnership(ctx context.Context, taskID, userID int) (bool, error)
	CheckTitleExists(ctx context.Context, userID int, title string, excludeID *int) (bool, error)
}

// DB defines the database interface that combines all repositories
type DB interface {
	Users() UserRepository
	Projects() ProjectRepository
	Tasks() TaskRepository
	Customers() CustomerRepository     // Deprecated, use Companies instead
	Companies() CompanyRepository      // New enterprise customer model
	Enterprises() EnterpriseRepository // Pure enterprise system
	Permissions() PermissionRepository // Enterprise permission management
	// PermissionApprovals() PermissionApprovalRepository // Temporarily disabled
	System() SystemRepository
	Audit() AuditRepository
	APIKeys() APIKeyRepository // API key management
	Documents() DocumentRepository
	// DocumentFolders() DocumentFolderRepository // Temporarily disabled
	DocumentRelations() DocumentRelationRepository
	DocumentPermissions() DocumentPermissionRepository
	DocumentVersions() DocumentVersionRepository
	// DocumentRegistry() DocumentRegistryRepository // Disabled - conflicting models
	Timer() TimerRepository
	UserTimer() UserTimerRepository   // Personal timer tasks
	TimelineEvents() TimelineEventsRepository // Task timeline events
	OKR() OKRRepository              // OKR management
	GoogleAuth() GoogleAuthRepository // Google Calendar integration
	Requirements() RequirementRepository // Requirement management
	RequirementComments() RequirementCommentRepository // Requirement comments
	RequirementHistory() RequirementHistoryRepository // Requirement history/audit
	WorktreeConfigs() WorktreeConfigRepository // Worktree configuration management
	Worktrees() WorktreeRepository // Worktree management
	WorktreeTaskBindings() WorktreeTaskBindingRepository // Worktree-task bindings
	AIWorkspaceAssignments() AIWorkspaceAssignmentRepository // AI workspace assignments
	WorktreeConflicts() WorktreeConflictRepository // Worktree conflict management
	WorktreeActivities() WorktreeActivityRepository // Worktree activity logs
	GetDB() interface{}               // Access to underlying database connection
	Close() error
	Ping() error

	// Minimal SQL helpers used by services
	Select(dest interface{}, query string, args ...interface{}) error
	Get(dest interface{}, query string, args ...interface{}) error
	Exec(query string, args ...interface{}) (sql.Result, error)
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row

	BeginTx(ctx context.Context) (Tx, error)
}

// Tx defines the transaction interface
type Tx interface {
	Users() UserRepository
	Projects() ProjectRepository
	Tasks() TaskRepository
	Customers() CustomerRepository
	Companies() CompanyRepository
	Enterprises() EnterpriseRepository
	Permissions() PermissionRepository
	// PermissionApprovals() PermissionApprovalRepository // Temporarily disabled
	Audit() AuditRepository
	APIKeys() APIKeyRepository
	Documents() DocumentRepository
	// DocumentFolders() DocumentFolderRepository // Temporarily disabled
	DocumentRelations() DocumentRelationRepository
	DocumentPermissions() DocumentPermissionRepository
	DocumentVersions() DocumentVersionRepository
	// DocumentRegistry() DocumentRegistryRepository // Disabled - conflicting models
	Timer() TimerRepository
	UserTimer() UserTimerRepository
	Requirements() RequirementRepository
	RequirementComments() RequirementCommentRepository
	RequirementHistory() RequirementHistoryRepository
	WorktreeConfigs() WorktreeConfigRepository
	Worktrees() WorktreeRepository
	WorktreeTaskBindings() WorktreeTaskBindingRepository
	AIWorkspaceAssignments() AIWorkspaceAssignmentRepository
	WorktreeConflicts() WorktreeConflictRepository
	WorktreeActivities() WorktreeActivityRepository

	// Minimal helpers in transaction
	Exec(query string, args ...interface{}) (sql.Result, error)
	Query(query string, args ...interface{}) (*sql.Rows, error)
	QueryRow(query string, args ...interface{}) *sql.Row

	Commit() error
	Rollback() error
}

// WorktreeConfigRepository defines the interface for worktree configuration operations
type WorktreeConfigRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, config *models.WorktreeConfig) (*models.WorktreeConfig, error)
	GetByID(ctx context.Context, id int) (*models.WorktreeConfig, error)
	GetByProjectID(ctx context.Context, projectID int) (*models.WorktreeConfig, error)
	Update(ctx context.Context, config *models.WorktreeConfig) (*models.WorktreeConfig, error)
	Delete(ctx context.Context, id int) error

	// Configuration management
	UpdateAIExpert(ctx context.Context, projectID int, expertID string, expertConfig map[string]interface{}) error
	RemoveAIExpert(ctx context.Context, projectID int, expertID string) error
	GetAIExpertConfig(ctx context.Context, projectID int, expertID string) (map[string]interface{}, error)
}

// WorktreeRepository defines the interface for worktree operations
type WorktreeRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, worktree *models.Worktree) (*models.Worktree, error)
	GetByID(ctx context.Context, id int) (*models.Worktree, error)
	GetByPath(ctx context.Context, path string) (*models.Worktree, error)
	GetByExpertID(ctx context.Context, projectID int, expertID string) (*models.Worktree, error)
	Update(ctx context.Context, worktree *models.Worktree) (*models.Worktree, error)
	Delete(ctx context.Context, id int) error
	SoftDelete(ctx context.Context, id int) error

	// Listing and querying
	List(ctx context.Context, opts *models.WorktreeListOptions) ([]*models.Worktree, int, error)
	GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Worktree, int, error)
	GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Worktree, int, error)
	GetActiveWorktrees(ctx context.Context, projectID int) ([]*models.Worktree, error)

	// Status management
	UpdateStatus(ctx context.Context, id int, status string) error
	LockWorktree(ctx context.Context, id int, reason string) error
	UnlockWorktree(ctx context.Context, id int) error

	// Git status tracking
	UpdateGitStatus(ctx context.Context, id int, status *models.WorktreeGitStatus) error
	GetWorktreesNeedingSync(ctx context.Context, projectID int) ([]*models.Worktree, error)

	// AI and task assignment
	AssignAI(ctx context.Context, id int, aiID int) error
	UnassignAI(ctx context.Context, id int) error
	AssignTask(ctx context.Context, id int, taskID int) error
	UnassignTask(ctx context.Context, id int) error

	// Monitoring and statistics
	UpdateDiskUsage(ctx context.Context, id int, diskUsageMB int64) error
	UpdateLastActive(ctx context.Context, id int) error
	GetWorktreeStats(ctx context.Context, projectID int) (*models.WorktreeStatsResponse, error)
}

// WorktreeTaskBindingRepository defines the interface for worktree-task binding operations
type WorktreeTaskBindingRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, binding *models.WorktreeTaskBinding) (*models.WorktreeTaskBinding, error)
	GetByID(ctx context.Context, id int) (*models.WorktreeTaskBinding, error)
	Delete(ctx context.Context, id int) error

	// Query operations
	GetByWorktreeID(ctx context.Context, worktreeID int) ([]*models.WorktreeTaskBinding, error)
	GetByTaskID(ctx context.Context, taskID int) ([]*models.WorktreeTaskBinding, error)
	GetPrimaryWorktree(ctx context.Context, taskID int) (*models.WorktreeTaskBinding, error)
	GetSecondaryWorktrees(ctx context.Context, taskID int) ([]*models.WorktreeTaskBinding, error)

	// Binding management
	SetPrimaryWorktree(ctx context.Context, taskID int, worktreeID int) error
	AddSecondaryWorktree(ctx context.Context, taskID int, worktreeID int) error
	RemoveBinding(ctx context.Context, taskID int, worktreeID int) error
	RemoveAllBindings(ctx context.Context, taskID int) error

	// Statistics
	GetTaskWorktreeCount(ctx context.Context, taskID int) (int, error)
	GetWorktreeTaskCount(ctx context.Context, worktreeID int) (int, error)
}

// AIWorkspaceAssignmentRepository defines the interface for AI workspace assignment operations
type AIWorkspaceAssignmentRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, assignment *models.AIWorkspaceAssignment) (*models.AIWorkspaceAssignment, error)
	GetByID(ctx context.Context, id int) (*models.AIWorkspaceAssignment, error)
	Update(ctx context.Context, assignment *models.AIWorkspaceAssignment) (*models.AIWorkspaceAssignment, error)
	Delete(ctx context.Context, id int) error

	// Query operations
	GetByAIID(ctx context.Context, aiID int) ([]*models.AIWorkspaceAssignment, error)
	GetByWorktreeID(ctx context.Context, worktreeID int) ([]*models.AIWorkspaceAssignment, error)
	GetActiveAssignment(ctx context.Context, aiID int) (*models.AIWorkspaceAssignment, error)
	GetCurrentAssignmentForWorktree(ctx context.Context, worktreeID int) (*models.AIWorkspaceAssignment, error)

	// Assignment management
	StartAssignment(ctx context.Context, aiID int, worktreeID int, taskID *int) (*models.AIWorkspaceAssignment, error)
	EndAssignment(ctx context.Context, id int) error
	SwitchWorktree(ctx context.Context, aiID int, newWorktreeID int) (*models.AIWorkspaceAssignment, error)

	// Statistics and monitoring
	GetActiveAICount(ctx context.Context, projectID int) (int, error)
	GetAssignmentHistory(ctx context.Context, aiID int, limit, offset int) ([]*models.AIWorkspaceAssignment, int, error)
	GetWorktreeUsageStats(ctx context.Context, worktreeID int) (*models.WorktreeUsageStats, error)
}

// WorktreeConflictRepository defines the interface for worktree conflict operations
type WorktreeConflictRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, conflict *models.WorktreeConflict) (*models.WorktreeConflict, error)
	GetByID(ctx context.Context, id int) (*models.WorktreeConflict, error)
	Update(ctx context.Context, conflict *models.WorktreeConflict) (*models.WorktreeConflict, error)
	Delete(ctx context.Context, id int) error

	// Query operations
	GetByWorktreeID(ctx context.Context, worktreeID int) ([]*models.WorktreeConflict, error)
	GetByTaskID(ctx context.Context, taskID int) ([]*models.WorktreeConflict, error)
	GetPendingConflicts(ctx context.Context, projectID int) ([]*models.WorktreeConflict, error)
	GetResolvedConflicts(ctx context.Context, projectID int, limit, offset int) ([]*models.WorktreeConflict, int, error)

	// Conflict resolution
	MarkAsResolved(ctx context.Context, id int, resolvedBy int, resolution string) error
	MarkAsIgnored(ctx context.Context, id int, ignoredBy int, reason string) error
	ReopenConflict(ctx context.Context, id int) error

	// Statistics
	GetConflictStats(ctx context.Context, projectID int) (*models.WorktreeConflictStats, error)
	GetConflictsByType(ctx context.Context, projectID int, conflictType string) ([]*models.WorktreeConflict, error)
}

// WorktreeActivityRepository defines the interface for worktree activity log operations
type WorktreeActivityRepository interface {
	// Basic CRUD operations
	Create(ctx context.Context, activity *models.WorktreeActivity) (*models.WorktreeActivity, error)
	GetByID(ctx context.Context, id int) (*models.WorktreeActivity, error)

	// Query operations
	GetByWorktreeID(ctx context.Context, worktreeID int, limit, offset int) ([]*models.WorktreeActivity, int, error)
	GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.WorktreeActivity, int, error)
	GetByAIID(ctx context.Context, aiID int, limit, offset int) ([]*models.WorktreeActivity, int, error)
	GetByActivityType(ctx context.Context, activityType string, limit, offset int) ([]*models.WorktreeActivity, int, error)

	// Filtering and search
	GetActivities(ctx context.Context, filter *models.WorktreeActivityFilter) ([]*models.WorktreeActivity, int, error)
	GetRecentActivities(ctx context.Context, projectID int, limit int) ([]*models.WorktreeActivity, error)

	// Statistics and analytics
	GetActivityStats(ctx context.Context, projectID int, startDate, endDate *string) (*models.WorktreeActivityStats, error)
	GetAIActivitySummary(ctx context.Context, aiID int, startDate, endDate *string) (*models.AIActivitySummary, error)

	// Cleanup
	DeleteOldActivities(ctx context.Context, beforeDate string) (int, error)
}

// Repository defines the main repository interface that combines all repositories
// Note: Commented out due to method name conflicts between interfaces
// type Repository interface {
//	ProjectRepository
//	TaskRepository
//	UserRepository
//	TimerRepository
//	AuditRepository
//	SystemRepository
//	DocumentRepository
//	DocumentFolderRepository
//	CustomerRepository
//	CompanyRepository
//	PermissionRepository
// }
