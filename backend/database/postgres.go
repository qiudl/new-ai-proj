package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"reflect"
	"time"

	_ "github.com/lib/pq"
)

// PostgresDB implements the DB interface using PostgreSQL
type PostgresDB struct {
	db *sql.DB
}

// Select scans multiple rows into dest slice pointer
func (pdb *PostgresDB) Select(dest interface{}, query string, args ...interface{}) error {
	rows, err := pdb.db.Query(query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	return scanRows(dest, rows)
}

// Get scans a single row into dest pointer
func (pdb *PostgresDB) Get(dest interface{}, query string, args ...interface{}) error {
	rows, err := pdb.db.Query(query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	if !rows.Next() {
		return sql.ErrNoRows
	}
	return scanRow(dest, rows)
}

// Exec executes a query without returning any rows
func (pdb *PostgresDB) Exec(query string, args ...interface{}) (sql.Result, error) {
	return pdb.db.Exec(query, args...)
}

// Query wraps db.Query
func (pdb *PostgresDB) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return pdb.db.Query(query, args...)
}

// QueryRow wraps db.QueryRow
func (pdb *PostgresDB) QueryRow(query string, args ...interface{}) *sql.Row {
	return pdb.db.QueryRow(query, args...)
}

// NewPostgresDB creates a new PostgreSQL database connection with default settings
func NewPostgresDB(dsn string) (*PostgresDB, error) {
	// Use NewPostgresDBWithConfig with default values for better connection management
	return NewPostgresDBWithConfig(dsn, 25, 5, 5*time.Minute)
}

// NewPostgresDBWithConfig creates a new PostgreSQL database connection with configuration
func NewPostgresDBWithConfig(dsn string, maxOpen, maxIdle int, maxLifetime time.Duration) (*PostgresDB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Set connection pool settings with reasonable defaults
	if maxOpen <= 0 {
		maxOpen = 25 // Default max open connections
	}
	if maxIdle <= 0 {
		maxIdle = 5 // Default max idle connections
	}
	if maxLifetime <= 0 {
		maxLifetime = 5 * time.Minute // Default connection lifetime
	}
	
	db.SetMaxOpenConns(maxOpen)
	db.SetMaxIdleConns(maxIdle)
	db.SetConnMaxLifetime(maxLifetime)
	// Set maximum idle time for connections
	db.SetConnMaxIdleTime(1 * time.Minute)

	// Verify database connectivity with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &PostgresDB{db: db}, nil
}

// Users returns the user repository
func (pdb *PostgresDB) Users() UserRepository {
	return &PostgresUserRepository{db: pdb.db}
}

// Projects returns the project repository
func (pdb *PostgresDB) Projects() ProjectRepository {
	return &PostgresProjectRepository{db: pdb.db}
}

// Tasks returns the task repository
func (pdb *PostgresDB) Tasks() TaskRepository {
	return &PostgresTaskRepository{db: pdb.db}
}

// Enterprises returns the enterprise repository (pure enterprise system)
func (pdb *PostgresDB) Enterprises() EnterpriseRepository {
	return NewEnterpriseRepository(pdb.db)
}

// Identity returns the identity repository for user identity verification
func (pdb *PostgresDB) Identity() IdentityRepository {
	return NewIdentityRepository(pdb.db)
}

// Permissions returns the permission repository (enterprise permission management)
func (pdb *PostgresDB) Permissions() PermissionRepository {
	return NewPermissionRepository(pdb.db)
}

// DB returns the underlying *sql.DB instance
func (pdb *PostgresDB) DB() *sql.DB {
	return pdb.db
}

// HealthCheck performs a database health check
func (pdb *PostgresDB) HealthCheck(ctx context.Context) error {
	// Create context with timeout if not provided
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
	}
	
	// Ping database to check connectivity
	if err := pdb.db.PingContext(ctx); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}
	
	// Simple query to verify database is operational
	var result int
	if err := pdb.db.QueryRowContext(ctx, "SELECT 1").Scan(&result); err != nil {
		return fmt.Errorf("database query failed: %w", err)
	}
	
	return nil
}

// GetStats returns database connection pool statistics
func (pdb *PostgresDB) GetStats() sql.DBStats {
	return pdb.db.Stats()
}

// System returns the system repository
func (pdb *PostgresDB) System() SystemRepository {
	return &PostgresSystemRepository{db: pdb.db}
}

// Audit returns the audit repository
func (pdb *PostgresDB) Audit() AuditRepository {
	return NewAuditRepository(pdb.db)
}

// APIKeys returns the API key repository
func (pdb *PostgresDB) APIKeys() APIKeyRepository {
	return NewAPIKeyRepository(pdb.db)
}

// Documents returns the document repository
func (pdb *PostgresDB) Documents() DocumentRepository {
	// 使用适配器模式，桥接到新的实现
	return NewDocumentRepositoryAdapter(pdb.NewDocuments())
}

// NewDocuments returns the new document repository implementation
func (pdb *PostgresDB) NewDocuments() DocumentRepositoryNew {
	return NewDocumentRepository(pdb.db)
}

// DocumentFolders returns the document folder repository
// Temporarily disabled due to model conflicts
/*
func (pdb *PostgresDB) DocumentFolders() DocumentFolderRepository {
	// TODO: Fix DocumentFolderRepository implementation issues
	return nil // 临时注释，避免编译错误
	// return NewDocumentFolderRepository(pdb.db)
}
*/

// DocumentRelations returns the document relation repository
func (pdb *PostgresDB) DocumentRelations() DocumentRelationRepository {
	// TODO: Fix DocumentRelationRepository implementation
	return nil // 临时注释，避免编译错误
	// return NewDocumentRelationRepository(pdb.db)
}

// DocumentPermissions returns the document permission repository
func (pdb *PostgresDB) DocumentPermissions() DocumentPermissionRepository {
	// TODO: Fix DocumentPermissionRepository implementation
	return nil // 临时注释，避免编译错误
	// return NewDocumentPermissionRepository(pdb.db)
}

// DocumentVersions returns the document version repository
func (pdb *PostgresDB) DocumentVersions() DocumentVersionRepository {
	// TODO: Fix DocumentVersionRepository implementation
	return nil // 临时注释，避免编译错误
	// return NewDocumentVersionRepository(sqlx.NewDb(pdb.db, "postgres"))
}

// DocumentRegistry disabled - conflicting models
// func (pdb *PostgresDB) DocumentRegistry() DocumentRegistryRepository {
//	return NewDocumentRegistryRepository(pdb.db)
// }

// Timer returns the timer repository
func (pdb *PostgresDB) Timer() TimerRepository {
	return NewTimerRepository(pdb.db)
}

// UserTimer returns the user timer repository
func (pdb *PostgresDB) UserTimer() UserTimerRepository {
	return NewUserTimerRepository(pdb.db)
}

func (pdb *PostgresDB) OKR() OKRRepository {
	return NewOKRRepository(pdb.db)
}

// TimelineEvents returns the timeline events repository
func (pdb *PostgresDB) TimelineEvents() TimelineEventsRepository {
	return NewTimelineEventsRepository(pdb.db)
}

// GoogleAuth returns the Google authentication repository
func (pdb *PostgresDB) GoogleAuth() GoogleAuthRepository {
	return NewGoogleAuthRepository(pdb.db)
}

// Requirements returns the requirement repository
func (pdb *PostgresDB) Requirements() RequirementRepository {
	return NewRequirementRepository(pdb.db)
}

// RequirementComments returns the requirement comment repository
func (pdb *PostgresDB) RequirementComments() RequirementCommentRepository {
	return NewRequirementCommentRepository(pdb.db)
}

// RequirementHistory returns the requirement history repository
func (pdb *PostgresDB) RequirementHistory() RequirementHistoryRepository {
	return NewRequirementHistoryRepository(pdb.db)
}

// RequirementTasks returns the requirement-task link repository
func (pdb *PostgresDB) RequirementTasks() RequirementTaskRepository {
	return NewRequirementTaskRepository(pdb.db)
}

// WorktreeConfigs returns the worktree configuration repository
func (pdb *PostgresDB) WorktreeConfigs() WorktreeConfigRepository {
	return NewWorktreeConfigRepository(pdb.db)
}

// Worktrees returns the worktree repository
func (pdb *PostgresDB) Worktrees() WorktreeRepository {
	return NewWorktreeRepository(pdb.db)
}

// WorktreeTaskBindings returns the worktree task binding repository
func (pdb *PostgresDB) WorktreeTaskBindings() WorktreeTaskBindingRepository {
	return NewWorktreeTaskBindingRepository(pdb.db)
}

// AIWorkspaceAssignments returns the AI workspace assignment repository
func (pdb *PostgresDB) AIWorkspaceAssignments() AIWorkspaceAssignmentRepository {
	return NewAIWorkspaceAssignmentRepository(pdb.db)
}

// WorktreeConflicts returns the worktree conflict repository
func (pdb *PostgresDB) WorktreeConflicts() WorktreeConflictRepository {
	return NewWorktreeConflictRepository(pdb.db)
}

// WorktreeActivities returns the worktree activity repository
func (pdb *PostgresDB) WorktreeActivities() WorktreeActivityRepository {
	return NewWorktreeActivityRepository(pdb.db)
}

// GetDB returns the underlying database connection
func (pdb *PostgresDB) GetDB() interface{} {
	return pdb.db
}

// Close closes the database connection
func (pdb *PostgresDB) Close() error {
	return pdb.db.Close()
}

// Ping checks if the database connection is alive
func (pdb *PostgresDB) Ping() error {
	return pdb.db.Ping()
}

// BeginTx starts a new transaction
func (pdb *PostgresDB) BeginTx(ctx context.Context) (Tx, error) {
	tx, err := pdb.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	return &PostgresTx{tx: tx}, nil
}

// PostgresTx implements the Tx interface using PostgreSQL transaction

// scan helpers
func scanRows(dest interface{}, rows *sql.Rows) error {
	dv := reflect.ValueOf(dest)
	if dv.Kind() != reflect.Ptr || dv.Elem().Kind() != reflect.Slice {
		return fmt.Errorf("dest must be pointer to slice")
	}
	sliceVal := dv.Elem()
	elemType := sliceVal.Type().Elem()
	cols, err := rows.Columns()
	if err != nil {
		return err
	}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		scanTargets := make([]interface{}, len(cols))
		for i := range vals {
			scanTargets[i] = &vals[i]
		}
		if err := rows.Scan(scanTargets...); err != nil {
			return err
		}
		m := make(map[string]interface{}, len(cols))
		for i, c := range cols {
			v := vals[i]
			if b, ok := v.([]byte); ok {
				m[c] = string(b)
			} else {
				m[c] = v
			}
		}
		elemPtr := reflect.New(elemType)
		b, _ := json.Marshal(m)
		if err := json.Unmarshal(b, elemPtr.Interface()); err != nil {
			return err
		}
		sliceVal.Set(reflect.Append(sliceVal, elemPtr.Elem()))
	}
	return rows.Err()
}

func scanRow(dest interface{}, rows *sql.Rows) error {
	dv := reflect.ValueOf(dest)
	if dv.Kind() != reflect.Ptr {
		return fmt.Errorf("dest must be pointer")
	}
	cols, err := rows.Columns()
	if err != nil {
		return err
	}
	vals := make([]interface{}, len(cols))
	scanTargets := make([]interface{}, len(cols))
	for i := range vals {
		scanTargets[i] = &vals[i]
	}
	if err := rows.Scan(scanTargets...); err != nil {
		return err
	}
	m := make(map[string]interface{}, len(cols))
	for i, c := range cols {
		v := vals[i]
		if b, ok := v.([]byte); ok {
			m[c] = string(b)
		} else {
			m[c] = v
		}
	}
	b, _ := json.Marshal(m)
	return json.Unmarshal(b, dest)
}

type PostgresTx struct {
	tx *sql.Tx
}

// Exec wraps tx.Exec
func (ptx *PostgresTx) Exec(query string, args ...interface{}) (sql.Result, error) {
	return ptx.tx.Exec(query, args...)
}

// Query wraps tx.Query
func (ptx *PostgresTx) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return ptx.tx.Query(query, args...)
}

// QueryRow wraps tx.QueryRow
func (ptx *PostgresTx) QueryRow(query string, args ...interface{}) *sql.Row {
	return ptx.tx.QueryRow(query, args...)
}

// Users returns the user repository for transaction
func (ptx *PostgresTx) Users() UserRepository {
	return &PostgresUserRepository{db: ptx.tx}
}

// Projects returns the project repository for transaction
func (ptx *PostgresTx) Projects() ProjectRepository {
	return &PostgresProjectRepository{db: ptx.tx}
}

// Tasks returns the task repository for transaction
func (ptx *PostgresTx) Tasks() TaskRepository {
	return &PostgresTaskRepository{db: ptx.tx}
}

// Enterprises returns the enterprise repository for transaction (pure enterprise system)
func (ptx *PostgresTx) Enterprises() EnterpriseRepository {
	return NewEnterpriseRepository(ptx.tx)
}

// Identity returns the identity repository for transaction
func (ptx *PostgresTx) Identity() IdentityRepository {
	return NewIdentityRepository(ptx.tx)
}

// Permissions returns the permission repository for transaction (enterprise permission management)
func (ptx *PostgresTx) Permissions() PermissionRepository {
	return NewPermissionRepository(ptx.tx)
}

// Audit returns the audit repository for transaction
func (ptx *PostgresTx) Audit() AuditRepository {
	return NewAuditRepository(ptx.tx)
}

// APIKeys returns the API key repository for transaction
func (ptx *PostgresTx) APIKeys() APIKeyRepository {
	return NewAPIKeyRepository(ptx.tx)
}

// Documents returns the document repository for transaction
func (ptx *PostgresTx) Documents() DocumentRepository {
	// 临时解决方案：使用事务连接创建适配器
	// TODO: 实现真正的事务版本适配器
	return NewDocumentRepositoryAdapter(NewDocumentRepositoryWithTx(ptx.tx))
}

// DocumentFolders returns the document folder repository for transaction
// Temporarily disabled due to model conflicts
/*
func (ptx *PostgresTx) DocumentFolders() DocumentFolderRepository {
	// TODO: Fix DocumentFolderRepository implementation
	return nil // 临时注释，避免编译错误
	// return NewDocumentFolderRepository(ptx.tx)
}
*/

// DocumentRelations returns the document relation repository for transaction
func (ptx *PostgresTx) DocumentRelations() DocumentRelationRepository {
	// TODO: Fix DocumentRelationRepository implementation
	return nil // 临时注释，避免编译错误
	// return NewDocumentRelationRepository(ptx.tx)
}

// DocumentPermissions returns the document permission repository for transaction
func (ptx *PostgresTx) DocumentPermissions() DocumentPermissionRepository {
	// TODO: Fix DocumentPermissionRepository implementation
	return nil // 临时注释，避免编译错误
	// return NewDocumentPermissionRepository(ptx.tx)
}

// DocumentVersions returns the document version repository for transaction
func (ptx *PostgresTx) DocumentVersions() DocumentVersionRepository {
	// For transaction support, we would need a different implementation
	// For now, return nil - transactions for version management would need special handling
	return nil
}

// Timer returns the timer repository for transaction
func (ptx *PostgresTx) Timer() TimerRepository {
	return NewTimerRepository(ptx.tx)
}

// UserTimer returns the user timer repository for transaction
func (ptx *PostgresTx) UserTimer() UserTimerRepository {
	return NewUserTimerRepository(ptx.tx)
}

func (ptx *PostgresTx) OKR() OKRRepository {
	return NewOKRRepository(ptx.tx)
}

// TimelineEvents returns the timeline events repository for transaction
func (ptx *PostgresTx) TimelineEvents() TimelineEventsRepository {
	return NewTimelineEventsRepository(ptx.tx)
}

// Requirements returns the requirement repository for transaction
func (ptx *PostgresTx) Requirements() RequirementRepository {
	return NewRequirementRepository(ptx.tx)
}

// RequirementComments returns the requirement comment repository for transaction
func (ptx *PostgresTx) RequirementComments() RequirementCommentRepository {
	return NewRequirementCommentRepository(ptx.tx)
}

// RequirementHistory returns the requirement history repository for transaction
func (ptx *PostgresTx) RequirementHistory() RequirementHistoryRepository {
	return NewRequirementHistoryRepository(ptx.tx)
}

// RequirementTasks returns the requirement-task link repository for transaction
func (ptx *PostgresTx) RequirementTasks() RequirementTaskRepository {
	return NewRequirementTaskRepository(ptx.tx)
}

// WorktreeConfigs returns the worktree configuration repository for transaction
func (ptx *PostgresTx) WorktreeConfigs() WorktreeConfigRepository {
	return NewWorktreeConfigRepository(ptx.tx)
}

// Worktrees returns the worktree repository for transaction
func (ptx *PostgresTx) Worktrees() WorktreeRepository {
	return NewWorktreeRepository(ptx.tx)
}

// WorktreeTaskBindings returns the worktree task binding repository for transaction
func (ptx *PostgresTx) WorktreeTaskBindings() WorktreeTaskBindingRepository {
	return NewWorktreeTaskBindingRepository(ptx.tx)
}

// AIWorkspaceAssignments returns the AI workspace assignment repository for transaction
func (ptx *PostgresTx) AIWorkspaceAssignments() AIWorkspaceAssignmentRepository {
	return NewAIWorkspaceAssignmentRepository(ptx.tx)
}

// WorktreeConflicts returns the worktree conflict repository for transaction
func (ptx *PostgresTx) WorktreeConflicts() WorktreeConflictRepository {
	return NewWorktreeConflictRepository(ptx.tx)
}

// WorktreeActivities returns the worktree activity repository for transaction
func (ptx *PostgresTx) WorktreeActivities() WorktreeActivityRepository {
	return NewWorktreeActivityRepository(ptx.tx)
}

// Commit commits the transaction
func (ptx *PostgresTx) Commit() error {
	return ptx.tx.Commit()
}

// Rollback rolls back the transaction
func (ptx *PostgresTx) Rollback() error {
	return ptx.tx.Rollback()
}
