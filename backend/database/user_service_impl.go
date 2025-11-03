package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// DefaultUserService implements UserService interface, providing user management business logic
// It delegates to UserRepository for data access operations
type DefaultUserService struct {
	db       interface{}
	userRepo UserRepository
}

// NewUserService creates a new user service with a given UserRepository
// This constructor allows for better testability by accepting a UserRepository interface
func NewUserService(userRepo UserRepository) UserService {
	return &DefaultUserService{
		userRepo: userRepo,
		db:       nil,
	}
}

// NewUserServiceWithDB creates a new user service from a database connection
// This is a convenience constructor that creates the UserRepository internally
// Deprecated: Prefer NewUserService with explicit UserRepository for better testability
func NewUserServiceWithDB(db interface{}) UserService {
	var userRepo UserRepository
	if sqlDB, ok := db.(*sql.DB); ok {
		userRepo = &PostgresUserRepository{db: sqlDB}
	} else if tx, ok := db.(*sql.Tx); ok {
		userRepo = &PostgresUserRepository{db: tx}
	}

	return &DefaultUserService{
		db:       db,
		userRepo: userRepo,
	}
}

// getExecer returns the appropriate execer (DB or Tx)
func (s *DefaultUserService) getExecer() execer {
	if tx, ok := s.db.(*sql.Tx); ok {
		return tx
	}
	return s.db.(*sql.DB)
}

// CreateUser creates a new user with enhanced fields
func (s *DefaultUserService) CreateUser(ctx context.Context, user *models.User) (*models.User, error) {
	// Delegate to the main UserRepository which handles enterprise routing
	return s.userRepo.Create(ctx, user)
}

// GetUserByID gets a user by ID with all fields
func (s *DefaultUserService) GetUserByID(ctx context.Context, id int) (*models.User, error) {
	// Delegate to the main UserRepository which handles enterprise routing
	return s.userRepo.GetByID(ctx, id)
}

// UpdateUser updates a user with partial updates
func (s *DefaultUserService) UpdateUser(ctx context.Context, id int, req *models.UserUpdateRequest) (*models.User, error) {
	// First get the existing user
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Apply the partial updates to the user object
	if req.Username != nil {
		user.Username = *req.Username
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.UserType != nil {
		user.UserType = *req.UserType
	}
	if req.CompanyID != nil {
		user.CompanyID = req.CompanyID
	}
	if req.Role != nil {
		user.Role = *req.Role
	}
	if req.Status != nil {
		user.Status = *req.Status
	}
	if req.Profile != nil {
		user.Profile = *req.Profile
	}

	// Update enterprise user specific fields
	if req.ContactPersonName != nil {
		user.ContactPersonName = req.ContactPersonName
	}
	if req.ContactPhone != nil {
		user.ContactPhone = req.ContactPhone
	}
	if req.DepartmentTitle != nil {
		user.DepartmentTitle = req.DepartmentTitle
	}
	if req.Notes != nil {
		user.Notes = req.Notes
	}

	// Update using the main UserRepository which handles enterprise routing
	return s.userRepo.Update(ctx, user)
}

// DeleteUser soft deletes a user (or hard delete based on preference)
func (s *DefaultUserService) DeleteUser(ctx context.Context, id int) error {
	// Delegate to the main UserRepository which handles enterprise routing
	return s.userRepo.Delete(ctx, id)
}

// ListUsers gets users with advanced filtering and pagination
func (s *DefaultUserService) ListUsers(ctx context.Context, params *models.UserListParams) ([]*models.User, int, error) {
	// This is complex because we need to query both users and enterprise_users tables
	// and merge the results while maintaining pagination
	
	// For simplicity, we'll query both tables separately and merge
	exec := s.getExecer()
	
	// Query 1: System users from users table
	systemUsers, systemTotal, err := s.querySystemUsers(ctx, exec, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query system users: %w", err)
	}
	
	// Query 2: Enterprise users from enterprise_users table
	enterpriseUsers, enterpriseTotal, err := s.queryEnterpriseUsers(ctx, exec, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query enterprise users: %w", err)
	}
	
	// Merge results
	allUsers := append(systemUsers, enterpriseUsers...)
	totalCount := systemTotal + enterpriseTotal
	
	// Apply client-side pagination and sorting since we merged two queries
	if len(allUsers) > 0 {
		// Sort by created_at DESC (newest first)
		for i := 0; i < len(allUsers)-1; i++ {
			for j := i + 1; j < len(allUsers); j++ {
				if allUsers[i].CreatedAt.Before(allUsers[j].CreatedAt) {
					allUsers[i], allUsers[j] = allUsers[j], allUsers[i]
				}
			}
		}
		
		// Apply pagination
		start := (params.Page - 1) * params.PageSize
		end := start + params.PageSize
		
		if start >= len(allUsers) {
			return []*models.User{}, totalCount, nil
		}
		
		if end > len(allUsers) {
			end = len(allUsers)
		}
		
		allUsers = allUsers[start:end]
	}
	
	return allUsers, totalCount, nil
}

// querySystemUsers queries users from the users table
func (s *DefaultUserService) querySystemUsers(ctx context.Context, exec execer, params *models.UserListParams) ([]*models.User, int, error) {
	whereConditions := []string{"user_type = 'system'", "deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	if params.Role != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("role = $%d", argIndex))
		args = append(args, params.Role)
		argIndex++
	}

	if params.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, params.Status)
		argIndex++
	}

	if params.UserType != "" && params.UserType != "system" {
		// If filtering for non-system users, return empty
		return []*models.User{}, 0, nil
	}

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(username ILIKE $%d OR email ILIKE $%d OR profile->>'name' ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, searchPattern)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(whereConditions, " AND ")

	// Get count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause)
	row := exec.QueryRowContext(ctx, countQuery, args...)
	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get system user count: %w", err)
	}

	// Get users
	query := fmt.Sprintf(`
		SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
		       role, status, profile, last_login_at, created_at, updated_at
		FROM users %s
		ORDER BY created_at DESC`, whereClause)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query system users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.PasswordHash,
			&user.UserType, &user.CompanyID, &user.CompanyUserID,
			&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan system user: %w", err)
		}
		users = append(users, user)
	}

	return users, total, nil
}

// queryEnterpriseUsers queries users from the enterprise_users table
func (s *DefaultUserService) queryEnterpriseUsers(ctx context.Context, exec execer, params *models.UserListParams) ([]*models.User, int, error) {
	whereConditions := []string{"eu.deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	// Convert role to access_level for enterprise users
	if params.Role != "" {
		var accessLevel int
		switch params.Role {
		case "company_admin":
			accessLevel = 4
		case "company_user":
			accessLevel = 2
		default:
			// If filtering for system roles, return empty
			return []*models.User{}, 0, nil
		}
		whereConditions = append(whereConditions, fmt.Sprintf("eu.access_level = $%d", argIndex))
		args = append(args, accessLevel)
		argIndex++
	}

	if params.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("eu.status = $%d", argIndex))
		args = append(args, params.Status)
		argIndex++
	}

	if params.UserType != "" && params.UserType != "company" {
		// If filtering for non-company users, return empty
		return []*models.User{}, 0, nil
	}

	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(eu.username ILIKE $%d OR eu.email ILIKE $%d OR eu.name ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, searchPattern)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(whereConditions, " AND ")

	// Get count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM enterprise_users eu %s", whereClause)
	row := exec.QueryRowContext(ctx, countQuery, args...)
	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get enterprise user count: %w", err)
	}

	// Get users with enterprise join
	query := fmt.Sprintf(`
		SELECT eu.id, eu.username, eu.email, '', 'company', eu.enterprise_id, NULL,
		       CASE 
		           WHEN eu.access_level = 4 THEN 'company_admin'
		           WHEN eu.access_level = 2 THEN 'company_user'
		           ELSE 'company_user'
		       END as role,
		       eu.status, '{}'::jsonb, eu.last_login_at, eu.created_at, eu.updated_at,
		       eu.name, eu.phone, eu.position, eu.is_primary_contact
		FROM enterprise_users eu %s
		ORDER BY eu.created_at DESC`, whereClause)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query enterprise users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		var name, phone, position *string
		var isPrimary bool
		
		err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.PasswordHash,
			&user.UserType, &user.CompanyID, &user.CompanyUserID,
			&user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
			&user.CreatedAt, &user.UpdatedAt,
			&name, &phone, &position, &isPrimary,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan enterprise user: %w", err)
		}
		
		// Map enterprise fields to user fields
		user.ContactPersonName = name
		user.ContactPhone = phone
		user.DepartmentTitle = position
		user.IsPrimaryContact = isPrimary
		
		users = append(users, user)
	}

	return users, total, nil
}

// ResetPassword resets a user's password
func (s *DefaultUserService) ResetPassword(ctx context.Context, userID int, passwordHash string) error {
	// Delegate to UserRepository which handles the database access
	return s.userRepo.UpdatePassword(ctx, userID, passwordHash)
}

// UpdateUserStatus updates a user's status
func (s *DefaultUserService) UpdateUserStatus(ctx context.Context, userID int, status string) (*models.User, error) {
	// Get the existing user first
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Update the status
	user.Status = status

	// Update using the main UserRepository which handles enterprise routing
	return s.userRepo.Update(ctx, user)
}

// BatchUpdateUsers performs batch operations on users
func (s *DefaultUserService) BatchUpdateUsers(ctx context.Context, userIDs []int, action string) error {
	if len(userIDs) == 0 {
		return fmt.Errorf("no user IDs provided")
	}

	// Process each user individually to handle hybrid storage
	for _, userID := range userIDs {
		switch action {
		case "activate":
			_, err := s.UpdateUserStatus(ctx, userID, "active")
			if err != nil {
				return fmt.Errorf("failed to activate user %d: %w", userID, err)
			}
		case "suspend":
			_, err := s.UpdateUserStatus(ctx, userID, "suspended")
			if err != nil {
				return fmt.Errorf("failed to suspend user %d: %w", userID, err)
			}
		case "delete":
			err := s.DeleteUser(ctx, userID)
			if err != nil {
				return fmt.Errorf("failed to delete user %d: %w", userID, err)
			}
		default:
			return fmt.Errorf("invalid action: %s", action)
		}
	}

	return nil
}

// GetUserStats gets user statistics
func (s *DefaultUserService) GetUserStats(ctx context.Context) (*models.UserStats, error) {
	exec := s.getExecer()
	
	// Get stats from users table (system users)
	systemStats, err := s.getSystemUserStats(ctx, exec)
	if err != nil {
		return nil, fmt.Errorf("failed to get system user stats: %w", err)
	}
	
	// Get stats from enterprise_users table
	enterpriseStats, err := s.getEnterpriseUserStats(ctx, exec)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise user stats: %w", err)
	}
	
	// Merge the stats
	totalStats := &models.UserStats{
		Total: systemStats.Total + enterpriseStats.Total,
		ByRole: map[string]int{
			"admin":           systemStats.ByRole["admin"],
			"project_manager": systemStats.ByRole["project_manager"],
			"developer":       systemStats.ByRole["developer"],
			"company_admin":   systemStats.ByRole["company_admin"] + enterpriseStats.ByRole["company_admin"],
			"company_user":    systemStats.ByRole["company_user"] + enterpriseStats.ByRole["company_user"],
		},
		ByStatus: map[string]int{
			"active":    systemStats.ByStatus["active"] + enterpriseStats.ByStatus["active"],
			"inactive":  systemStats.ByStatus["inactive"] + enterpriseStats.ByStatus["inactive"],
			"suspended": systemStats.ByStatus["suspended"] + enterpriseStats.ByStatus["suspended"],
		},
		RecentRegistrations: systemStats.RecentRegistrations + enterpriseStats.RecentRegistrations,
	}
	
	return totalStats, nil
}

// getSystemUserStats gets statistics from users table
func (s *DefaultUserService) getSystemUserStats(ctx context.Context, exec execer) (*models.UserStats, error) {
	// Get total count
	var total int
	totalQuery := `SELECT COUNT(*) FROM users WHERE user_type = 'system' AND deleted_at IS NULL`
	row := exec.QueryRowContext(ctx, totalQuery)
	if err := row.Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to get total system user count: %w", err)
	}

	// Get role counts
	roleQuery := `
		SELECT 
			SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
			SUM(CASE WHEN role = 'project_manager' THEN 1 ELSE 0 END) as pm_count,
			SUM(CASE WHEN role = 'developer' THEN 1 ELSE 0 END) as dev_count,
			SUM(CASE WHEN role = 'company_admin' THEN 1 ELSE 0 END) as company_admin_count,
			SUM(CASE WHEN role = 'company_user' THEN 1 ELSE 0 END) as company_user_count
		FROM users WHERE user_type = 'system' AND deleted_at IS NULL`

	var adminCount, pmCount, devCount, companyAdminCount, companyUserCount int
	roleRow := exec.QueryRowContext(ctx, roleQuery)
	err := roleRow.Scan(&adminCount, &pmCount, &devCount, &companyAdminCount, &companyUserCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get system role stats: %w", err)
	}

	// Get status breakdown
	statusQuery := `
		SELECT 
			SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
			SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
		FROM users WHERE user_type = 'system' AND deleted_at IS NULL`

	var activeStatus, inactiveStatus, suspendedStatus int
	statusRow := exec.QueryRowContext(ctx, statusQuery)
	err = statusRow.Scan(&activeStatus, &inactiveStatus, &suspendedStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to get system status stats: %w", err)
	}

	// Get recent registrations
	recentQuery := `
		SELECT COUNT(*) 
		FROM users 
		WHERE user_type = 'system' AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'`

	var recent int
	recentRow := exec.QueryRowContext(ctx, recentQuery)
	err = recentRow.Scan(&recent)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent system registrations: %w", err)
	}

	return &models.UserStats{
		Total: total,
		ByRole: map[string]int{
			"admin":           adminCount,
			"project_manager": pmCount,
			"developer":       devCount,
			"company_admin":   companyAdminCount,
			"company_user":    companyUserCount,
		},
		ByStatus: map[string]int{
			"active":    activeStatus,
			"inactive":  inactiveStatus,
			"suspended": suspendedStatus,
		},
		RecentRegistrations: recent,
	}, nil
}

// getEnterpriseUserStats gets statistics from enterprise_users table
func (s *DefaultUserService) getEnterpriseUserStats(ctx context.Context, exec execer) (*models.UserStats, error) {
	// Get total count
	var total int
	totalQuery := `SELECT COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL`
	row := exec.QueryRowContext(ctx, totalQuery)
	if err := row.Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to get total enterprise user count: %w", err)
	}

	// Get role counts (map access_level to roles)
	roleQuery := `
		SELECT 
			SUM(CASE WHEN access_level = 4 THEN 1 ELSE 0 END) as company_admin_count,
			SUM(CASE WHEN access_level = 2 THEN 1 ELSE 0 END) as company_user_count
		FROM enterprise_users WHERE deleted_at IS NULL`

	var companyAdminCount, companyUserCount int
	roleRow := exec.QueryRowContext(ctx, roleQuery)
	err := roleRow.Scan(&companyAdminCount, &companyUserCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise role stats: %w", err)
	}

	// Get status breakdown
	statusQuery := `
		SELECT 
			SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
			SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
			SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
		FROM enterprise_users WHERE deleted_at IS NULL`

	var activeStatus, inactiveStatus, suspendedStatus int
	statusRow := exec.QueryRowContext(ctx, statusQuery)
	err = statusRow.Scan(&activeStatus, &inactiveStatus, &suspendedStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise status stats: %w", err)
	}

	// Get recent registrations
	recentQuery := `
		SELECT COUNT(*) 
		FROM enterprise_users 
		WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days'`

	var recent int
	recentRow := exec.QueryRowContext(ctx, recentQuery)
	err = recentRow.Scan(&recent)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent enterprise registrations: %w", err)
	}

	return &models.UserStats{
		Total: total,
		ByRole: map[string]int{
			"admin":           0,
			"project_manager": 0,
			"developer":       0,
			"company_admin":   companyAdminCount,
			"company_user":    companyUserCount,
		},
		ByStatus: map[string]int{
			"active":    activeStatus,
			"inactive":  inactiveStatus,
			"suspended": suspendedStatus,
		},
		RecentRegistrations: recent,
	}, nil
}

// UpdateLastLogin updates the last login timestamp
func (s *DefaultUserService) UpdateLastLogin(ctx context.Context, userID int) error {
	// Delegate to UserRepository which handles the database access
	return s.userRepo.UpdateLastLogin(ctx, userID)
}
