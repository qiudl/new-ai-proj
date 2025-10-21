package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// PostgresEnterpriseRepository implements EnterpriseRepository for PostgreSQL
type PostgresEnterpriseRepository struct {
	db interface{}
}

// Note: execer interface is defined in user_repository.go to avoid conflicts

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresEnterpriseRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// NewEnterpriseRepository creates a new enterprise repository
func NewEnterpriseRepository(db interface{}) EnterpriseRepository {
	return &PostgresEnterpriseRepository{db: db}
}

// Enterprise operations

// Create creates a new enterprise
func (r *PostgresEnterpriseRepository) Create(ctx context.Context, enterprise *models.Enterprise) (*models.Enterprise, error) {
	query := `
		INSERT INTO enterprises (
			name, code, description, industry_type, business_type,
			registration_number, tax_id, legal_representative,
			contact_email, contact_phone, address, city, province, postal_code,
			website, status, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		enterprise.Name,
		enterprise.Code,
		enterprise.Description,
		enterprise.IndustryType,
		enterprise.BusinessType,
		enterprise.RegistrationNumber,
		enterprise.TaxID,
		enterprise.LegalRepresentative,
		enterprise.ContactEmail,
		enterprise.ContactPhone,
		enterprise.Address,
		enterprise.City,
		enterprise.Province,
		enterprise.PostalCode,
		enterprise.Website,
		enterprise.Status,
		enterprise.CreatedBy,
	).Scan(&enterprise.ID, &enterprise.CreatedAt, &enterprise.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise: %w", err)
	}

	return enterprise, nil
}

// GetByID retrieves an enterprise by ID
func (r *PostgresEnterpriseRepository) GetByID(ctx context.Context, id int) (*models.Enterprise, error) {
	query := `
		SELECT id, name, code, description, industry_type, business_type,
		       registration_number, tax_id, legal_representative,
		       contact_email, contact_phone, address, city, province, postal_code,
		       website, status, created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprises 
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	enterprise := &models.Enterprise{}

	err := exec.QueryRowContext(ctx, query, id).Scan(
		&enterprise.ID,
		&enterprise.Name,
		&enterprise.Code,
		&enterprise.Description,
		&enterprise.IndustryType,
		&enterprise.BusinessType,
		&enterprise.RegistrationNumber,
		&enterprise.TaxID,
		&enterprise.LegalRepresentative,
		&enterprise.ContactEmail,
		&enterprise.ContactPhone,
		&enterprise.Address,
		&enterprise.City,
		&enterprise.Province,
		&enterprise.PostalCode,
		&enterprise.Website,
		&enterprise.Status,
		&enterprise.CreatedBy,
		&enterprise.UpdatedBy,
		&enterprise.CreatedAt,
		&enterprise.UpdatedAt,
		&enterprise.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("enterprise not found")
		}
		return nil, fmt.Errorf("failed to get enterprise: %w", err)
	}

	return enterprise, nil
}

// GetByCode retrieves an enterprise by code
func (r *PostgresEnterpriseRepository) GetByCode(ctx context.Context, code string) (*models.Enterprise, error) {
	query := `
		SELECT id, name, code, description, industry_type, business_type,
		       registration_number, tax_id, legal_representative,
		       contact_email, contact_phone, address, city, province, postal_code,
		       website, status, created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprises 
		WHERE code = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	enterprise := &models.Enterprise{}

	err := exec.QueryRowContext(ctx, query, code).Scan(
		&enterprise.ID,
		&enterprise.Name,
		&enterprise.Code,
		&enterprise.Description,
		&enterprise.IndustryType,
		&enterprise.BusinessType,
		&enterprise.RegistrationNumber,
		&enterprise.TaxID,
		&enterprise.LegalRepresentative,
		&enterprise.ContactEmail,
		&enterprise.ContactPhone,
		&enterprise.Address,
		&enterprise.City,
		&enterprise.Province,
		&enterprise.PostalCode,
		&enterprise.Website,
		&enterprise.Status,
		&enterprise.CreatedBy,
		&enterprise.UpdatedBy,
		&enterprise.CreatedAt,
		&enterprise.UpdatedAt,
		&enterprise.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("enterprise not found")
		}
		return nil, fmt.Errorf("failed to get enterprise by code: %w", err)
	}

	return enterprise, nil
}

// List retrieves enterprises with pagination and filtering
func (r *PostgresEnterpriseRepository) List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Enterprise, int, error) {
	whereClause, args := r.buildWhereClause(filters)

	// 使用优化的查询，避免不必要的统计字段（统计信息通过单独方法获取）
	query := fmt.Sprintf(`
		WITH enterprise_base AS (
			SELECT id, name, code, description, industry_type, business_type,
			       registration_number, tax_id, legal_representative,
			       contact_email, contact_phone, address, city, province, postal_code,
			       website, status, created_by, updated_by, created_at, updated_at, deleted_at
			FROM enterprises 
			WHERE deleted_at IS NULL%s
		)
		SELECT *, COUNT(*) OVER() as total_count
		FROM enterprise_base 
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, len(args)+1, len(args)+2)

	args = append(args, limit, offset)
	exec := r.getExecer()

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list enterprises: %w", err)
	}
	defer rows.Close()

	var enterprises []*models.Enterprise
	var total int

	for rows.Next() {
		enterprise := &models.Enterprise{}

		err := rows.Scan(
			&enterprise.ID,
			&enterprise.Name,
			&enterprise.Code,
			&enterprise.Description,
			&enterprise.IndustryType,
			&enterprise.BusinessType,
			&enterprise.RegistrationNumber,
			&enterprise.TaxID,
			&enterprise.LegalRepresentative,
			&enterprise.ContactEmail,
			&enterprise.ContactPhone,
			&enterprise.Address,
			&enterprise.City,
			&enterprise.Province,
			&enterprise.PostalCode,
			&enterprise.Website,
			&enterprise.Status,
			&enterprise.CreatedBy,
			&enterprise.UpdatedBy,
			&enterprise.CreatedAt,
			&enterprise.UpdatedAt,
			&enterprise.DeletedAt,
			&total,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan enterprise: %w", err)
		}

		enterprises = append(enterprises, enterprise)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("row iteration failed: %w", err)
	}

	return enterprises, total, nil
}

// ListWithStats retrieves a paginated list of enterprises with user and department counts
// Performance optimization: Uses JOINs to fetch all statistics in a single query, avoiding N+1 problem
func (r *PostgresEnterpriseRepository) ListWithStats(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Enterprise, []int, []int, int, error) {
	whereClause, args := r.buildWhereClause(filters)

	// Optimized query with LEFT JOINs to get statistics in a single query
	query := fmt.Sprintf(`
		WITH enterprise_base AS (
			SELECT id, name, code, description, industry_type, business_type,
			       registration_number, tax_id, legal_representative,
			       contact_email, contact_phone, address, city, province, postal_code,
			       website, status, created_by, updated_by, created_at, updated_at, deleted_at
			FROM enterprises
			WHERE deleted_at IS NULL%s
			ORDER BY created_at DESC
			LIMIT $%d OFFSET $%d
		),
		total_count AS (
			SELECT COUNT(*) as count
			FROM enterprises
			WHERE deleted_at IS NULL%s
		)
		SELECT
			e.*,
			COALESCE(user_counts.count, 0) as user_count,
			COALESCE(dept_counts.count, 0) as department_count,
			(SELECT count FROM total_count) as total
		FROM enterprise_base e
		LEFT JOIN (
			SELECT enterprise_id, COUNT(*) as count
			FROM enterprise_users
			WHERE deleted_at IS NULL
			GROUP BY enterprise_id
		) user_counts ON e.id = user_counts.enterprise_id
		LEFT JOIN (
			SELECT enterprise_id, COUNT(*) as count
			FROM enterprise_departments
			WHERE deleted_at IS NULL
			GROUP BY enterprise_id
		) dept_counts ON e.id = dept_counts.enterprise_id
		ORDER BY e.created_at DESC`, whereClause, len(args)+1, len(args)+2, whereClause)

	args = append(args, limit, offset)
	exec := r.getExecer()

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, nil, nil, 0, fmt.Errorf("failed to list enterprises with stats: %w", err)
	}
	defer rows.Close()

	var enterprises []*models.Enterprise
	var userCounts []int
	var deptCounts []int
	var total int

	for rows.Next() {
		enterprise := &models.Enterprise{}
		var userCount, deptCount int

		err := rows.Scan(
			&enterprise.ID,
			&enterprise.Name,
			&enterprise.Code,
			&enterprise.Description,
			&enterprise.IndustryType,
			&enterprise.BusinessType,
			&enterprise.RegistrationNumber,
			&enterprise.TaxID,
			&enterprise.LegalRepresentative,
			&enterprise.ContactEmail,
			&enterprise.ContactPhone,
			&enterprise.Address,
			&enterprise.City,
			&enterprise.Province,
			&enterprise.PostalCode,
			&enterprise.Website,
			&enterprise.Status,
			&enterprise.CreatedBy,
			&enterprise.UpdatedBy,
			&enterprise.CreatedAt,
			&enterprise.UpdatedAt,
			&enterprise.DeletedAt,
			&userCount,
			&deptCount,
			&total,
		)
		if err != nil {
			return nil, nil, nil, 0, fmt.Errorf("failed to scan enterprise with stats: %w", err)
		}

		enterprises = append(enterprises, enterprise)
		userCounts = append(userCounts, userCount)
		deptCounts = append(deptCounts, deptCount)
	}

	if err = rows.Err(); err != nil {
		return nil, nil, nil, 0, fmt.Errorf("row iteration failed: %w", err)
	}

	return enterprises, userCounts, deptCounts, total, nil
}

// Update updates an enterprise
func (r *PostgresEnterpriseRepository) Update(ctx context.Context, enterprise *models.Enterprise) (*models.Enterprise, error) {
	query := `
		UPDATE enterprises SET
			name = $2, code = $3, description = $4, industry_type = $5, business_type = $6,
			registration_number = $7, tax_id = $8, legal_representative = $9,
			contact_email = $10, contact_phone = $11, address = $12, city = $13,
			province = $14, postal_code = $15, website = $16, status = $17,
			updated_by = $18, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		enterprise.ID,
		enterprise.Name,
		enterprise.Code,
		enterprise.Description,
		enterprise.IndustryType,
		enterprise.BusinessType,
		enterprise.RegistrationNumber,
		enterprise.TaxID,
		enterprise.LegalRepresentative,
		enterprise.ContactEmail,
		enterprise.ContactPhone,
		enterprise.Address,
		enterprise.City,
		enterprise.Province,
		enterprise.PostalCode,
		enterprise.Website,
		enterprise.Status,
		enterprise.UpdatedBy,
	).Scan(&enterprise.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise: %w", err)
	}

	return enterprise, nil
}

// Delete soft deletes an enterprise
func (r *PostgresEnterpriseRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE enterprises SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete enterprise: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("enterprise not found")
	}

	return nil
}

// GetStats retrieves enterprise statistics
func (r *PostgresEnterpriseRepository) GetStats(ctx context.Context) (*models.EnterpriseStats, error) {
	exec := r.getExecer()

	// Get basic counts
	countQuery := `
		SELECT 
			COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
			COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active,
			COUNT(*) FILTER (WHERE status = 'inactive' AND deleted_at IS NULL) as inactive,
			COUNT(*) FILTER (WHERE status = 'suspended' AND deleted_at IS NULL) as suspended
		FROM enterprises`

	stats := &models.EnterpriseStats{}
	err := exec.QueryRowContext(ctx, countQuery).Scan(
		&stats.TotalEnterprises,
		&stats.ActiveEnterprises,
		&stats.InactiveEnterprises,
		&stats.SuspendedEnterprises,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise basic stats: %w", err)
	}

	// Get user and department counts
	userCountQuery := `SELECT COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL`
	err = exec.QueryRowContext(ctx, userCountQuery).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to get user count: %w", err)
	}

	deptCountQuery := `SELECT COUNT(*) FROM enterprise_departments WHERE deleted_at IS NULL`
	err = exec.QueryRowContext(ctx, deptCountQuery).Scan(&stats.TotalDepartments)
	if err != nil {
		return nil, fmt.Errorf("failed to get department count: %w", err)
	}

	// Get business type stats
	businessTypeQuery := `
		SELECT business_type, COUNT(*) as count
		FROM enterprises 
		WHERE deleted_at IS NULL
		GROUP BY business_type
		ORDER BY count DESC`

	businessRows, err := exec.QueryContext(ctx, businessTypeQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get business type stats: %w", err)
	}
	defer businessRows.Close()

	for businessRows.Next() {
		var businessType string
		var count int
		err := businessRows.Scan(&businessType, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan business type stat: %w", err)
		}

		percentage := float64(count) / float64(stats.TotalEnterprises) * 100
		stats.ByBusinessType = append(stats.ByBusinessType, models.EnterpriseBusinessStats{
			BusinessType: businessType,
			Count:        count,
			Percentage:   percentage,
		})
	}

	// Get industry type stats
	industryTypeQuery := `
		SELECT industry_type, COUNT(*) as count
		FROM enterprises 
		WHERE deleted_at IS NULL AND industry_type IS NOT NULL
		GROUP BY industry_type
		ORDER BY count DESC`

	industryRows, err := exec.QueryContext(ctx, industryTypeQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get industry type stats: %w", err)
	}
	defer industryRows.Close()

	for industryRows.Next() {
		var industryType string
		var count int
		err := industryRows.Scan(&industryType, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan industry type stat: %w", err)
		}

		percentage := float64(count) / float64(stats.TotalEnterprises) * 100
		stats.ByIndustryType = append(stats.ByIndustryType, models.EnterpriseIndustryStats{
			IndustryType: industryType,
			Count:        count,
			Percentage:   percentage,
		})
	}

	// Get status stats
	statusQuery := `
		SELECT status, COUNT(*) as count
		FROM enterprises 
		WHERE deleted_at IS NULL
		GROUP BY status
		ORDER BY count DESC`

	statusRows, err := exec.QueryContext(ctx, statusQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to get status stats: %w", err)
	}
	defer statusRows.Close()

	for statusRows.Next() {
		var status string
		var count int
		err := statusRows.Scan(&status, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan status stat: %w", err)
		}

		percentage := float64(count) / float64(stats.TotalEnterprises) * 100
		stats.ByStatus = append(stats.ByStatus, models.EnterpriseStatusStats{
			Status:     status,
			Count:      count,
			Percentage: percentage,
		})
	}

	return stats, nil
}

// GetEnterpriseStatistics retrieves user and department counts for a specific enterprise
func (r *PostgresEnterpriseRepository) GetEnterpriseStatistics(ctx context.Context, enterpriseID int) (userCount, departmentCount int, err error) {
	exec := r.getExecer()
	
	// Get user count and department count in a single query for better performance
	query := `
		SELECT 
			(SELECT COUNT(*) FROM enterprise_users WHERE enterprise_id = $1 AND deleted_at IS NULL) as user_count,
			(SELECT COUNT(*) FROM enterprise_departments WHERE enterprise_id = $1 AND deleted_at IS NULL) as department_count`
	
	err = exec.QueryRowContext(ctx, query, enterpriseID).Scan(&userCount, &departmentCount)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to get enterprise statistics: %w", err)
	}
	
	return userCount, departmentCount, nil
}

// Enterprise User operations

// CreateUser creates a new enterprise user
func (r *PostgresEnterpriseRepository) CreateUser(ctx context.Context, user *models.EnterpriseUser) (*models.EnterpriseUser, error) {
	query := `
		INSERT INTO enterprise_users (
			enterprise_id, username, email, name, phone, position,
			is_primary_contact, access_level, status, bio, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		user.EnterpriseID,
		user.Username,
		user.Email,
		user.Name,
		user.Phone,
		user.Position,
		user.IsPrimaryContact,
		user.AccessLevel,
		user.Status,
		user.Bio,
		user.CreatedBy,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise user: %w", err)
	}

	return user, nil
}

// GetUserByID retrieves an enterprise user by ID
func (r *PostgresEnterpriseRepository) GetUserByID(ctx context.Context, id int) (*models.EnterpriseUser, error) {
	query := `
		SELECT id, enterprise_id, username, email, name, phone, position,
		       is_primary_contact, access_level, status, last_login_at, bio,
		       created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprise_users 
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	user := &models.EnterpriseUser{}

	err := exec.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.EnterpriseID,
		&user.Username,
		&user.Email,
		&user.Name,
		&user.Phone,
		&user.Position,
		&user.IsPrimaryContact,
		&user.AccessLevel,
		&user.Status,
		&user.LastLoginAt,
		&user.Bio,
		&user.CreatedBy,
		&user.UpdatedBy,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("enterprise user not found")
		}
		return nil, fmt.Errorf("failed to get enterprise user: %w", err)
	}

	return user, nil
}

// GetUsers retrieves users for an enterprise
func (r *PostgresEnterpriseRepository) GetUsers(ctx context.Context, enterpriseID int, limit, offset int) ([]*models.EnterpriseUser, int, error) {
	// Count query
	countQuery := `SELECT COUNT(*) FROM enterprise_users WHERE enterprise_id = $1 AND deleted_at IS NULL`
	exec := r.getExecer()

	var total int
	err := exec.QueryRowContext(ctx, countQuery, enterpriseID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count enterprise users: %w", err)
	}

	// Main query
	query := `
		SELECT id, enterprise_id, username, email, name, phone, position,
		       is_primary_contact, access_level, status, last_login_at, bio,
		       created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprise_users 
		WHERE enterprise_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, enterpriseID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list enterprise users: %w", err)
	}
	defer rows.Close()

	users := []*models.EnterpriseUser{}
	for rows.Next() {
		user := &models.EnterpriseUser{}
		err := rows.Scan(
			&user.ID,
			&user.EnterpriseID,
			&user.Username,
			&user.Email,
			&user.Name,
			&user.Phone,
			&user.Position,
			&user.IsPrimaryContact,
			&user.AccessLevel,
			&user.Status,
			&user.LastLoginAt,
			&user.Bio,
			&user.CreatedBy,
			&user.UpdatedBy,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan enterprise user: %w", err)
		}
		users = append(users, user)
	}

	return users, total, nil
}

// ListUsers retrieves users with filtering support
func (r *PostgresEnterpriseRepository) ListUsers(ctx context.Context, enterpriseID int, limit, offset int, filters map[string]interface{}) ([]*models.EnterpriseUser, int, error) {
	// For now, delegate to GetUsers - can be enhanced later with filtering
	return r.GetUsers(ctx, enterpriseID, limit, offset)
}

// UpdateUser updates an enterprise user
func (r *PostgresEnterpriseRepository) UpdateUser(ctx context.Context, user *models.EnterpriseUser) (*models.EnterpriseUser, error) {
	query := `
		UPDATE enterprise_users SET
			username = $2, email = $3, name = $4, phone = $5, position = $6,
			is_primary_contact = $7, access_level = $8, status = $9, bio = $10,
			updated_by = $11, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		user.ID,
		user.Username,
		user.Email,
		user.Name,
		user.Phone,
		user.Position,
		user.IsPrimaryContact,
		user.AccessLevel,
		user.Status,
		user.Bio,
		user.UpdatedBy,
	).Scan(&user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise user: %w", err)
	}

	return user, nil
}

// DeleteUser soft deletes an enterprise user
func (r *PostgresEnterpriseRepository) DeleteUser(ctx context.Context, userID int) error {
	query := `UPDATE enterprise_users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete enterprise user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("enterprise user not found")
	}

	return nil
}

// GetPrimaryContact retrieves the primary contact for an enterprise
func (r *PostgresEnterpriseRepository) GetPrimaryContact(ctx context.Context, enterpriseID int) (*models.EnterpriseUser, error) {
	query := `
		SELECT id, enterprise_id, username, email, name, phone, position,
		       is_primary_contact, access_level, status, last_login_at, bio,
		       created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprise_users 
		WHERE enterprise_id = $1 AND is_primary_contact = true AND deleted_at IS NULL
		LIMIT 1`

	exec := r.getExecer()
	user := &models.EnterpriseUser{}

	err := exec.QueryRowContext(ctx, query, enterpriseID).Scan(
		&user.ID,
		&user.EnterpriseID,
		&user.Username,
		&user.Email,
		&user.Name,
		&user.Phone,
		&user.Position,
		&user.IsPrimaryContact,
		&user.AccessLevel,
		&user.Status,
		&user.LastLoginAt,
		&user.Bio,
		&user.CreatedBy,
		&user.UpdatedBy,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("primary contact not found for enterprise")
		}
		return nil, fmt.Errorf("failed to get primary contact: %w", err)
	}

	return user, nil
}

// Enterprise Department operations

// CreateDepartment creates a new enterprise department
func (r *PostgresEnterpriseRepository) CreateDepartment(ctx context.Context, dept *models.EnterpriseDepartment) (*models.EnterpriseDepartment, error) {
	query := `
		INSERT INTO enterprise_departments (
			enterprise_id, name, parent_id, sort_order, manager_id, description,
			employee_count, status, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		) RETURNING id, level, path, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		dept.EnterpriseID,
		dept.Name,
		dept.ParentID,
		dept.SortOrder,
		dept.ManagerID,
		dept.Description,
		dept.EmployeeCount,
		dept.Status,
		dept.CreatedBy,
	).Scan(&dept.ID, &dept.Level, &dept.Path, &dept.CreatedAt, &dept.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise department: %w", err)
	}

	return dept, nil
}

// GetDepartmentByID retrieves an enterprise department by ID
func (r *PostgresEnterpriseRepository) GetDepartmentByID(ctx context.Context, id int) (*models.EnterpriseDepartment, error) {
	query := `
		SELECT id, enterprise_id, name, parent_id, level, path, sort_order,
		       manager_id, description, employee_count, status,
		       created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprise_departments 
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	dept := &models.EnterpriseDepartment{}

	err := exec.QueryRowContext(ctx, query, id).Scan(
		&dept.ID,
		&dept.EnterpriseID,
		&dept.Name,
		&dept.ParentID,
		&dept.Level,
		&dept.Path,
		&dept.SortOrder,
		&dept.ManagerID,
		&dept.Description,
		&dept.EmployeeCount,
		&dept.Status,
		&dept.CreatedBy,
		&dept.UpdatedBy,
		&dept.CreatedAt,
		&dept.UpdatedAt,
		&dept.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("enterprise department not found")
		}
		return nil, fmt.Errorf("failed to get enterprise department: %w", err)
	}

	return dept, nil
}

// GetDepartments retrieves departments for an enterprise
func (r *PostgresEnterpriseRepository) GetDepartments(ctx context.Context, enterpriseID int) ([]*models.EnterpriseDepartment, error) {
	query := `
		SELECT id, enterprise_id, name, parent_id, level, path, sort_order,
		       manager_id, description, employee_count, status,
		       created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprise_departments 
		WHERE enterprise_id = $1 AND deleted_at IS NULL
		ORDER BY COALESCE(path || '/' || id::TEXT, id::TEXT)`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to list enterprise departments: %w", err)
	}
	defer rows.Close()

	departments := []*models.EnterpriseDepartment{}
	for rows.Next() {
		dept := &models.EnterpriseDepartment{}
		err := rows.Scan(
			&dept.ID,
			&dept.EnterpriseID,
			&dept.Name,
			&dept.ParentID,
			&dept.Level,
			&dept.Path,
			&dept.SortOrder,
			&dept.ManagerID,
			&dept.Description,
			&dept.EmployeeCount,
			&dept.Status,
			&dept.CreatedBy,
			&dept.UpdatedBy,
			&dept.CreatedAt,
			&dept.UpdatedAt,
			&dept.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan enterprise department: %w", err)
		}
		departments = append(departments, dept)
	}

	return departments, nil
}

// ListDepartments retrieves departments with pagination and filtering support
func (r *PostgresEnterpriseRepository) ListDepartments(ctx context.Context, enterpriseID int, limit, offset int, filters map[string]interface{}) ([]*models.EnterpriseDepartment, error) {
	// For now, delegate to GetDepartments - can be enhanced later with pagination and filtering
	return r.GetDepartments(ctx, enterpriseID)
}

// UpdateDepartment updates an enterprise department
func (r *PostgresEnterpriseRepository) UpdateDepartment(ctx context.Context, dept *models.EnterpriseDepartment) (*models.EnterpriseDepartment, error) {
	query := `
		UPDATE enterprise_departments SET
			name = $2, parent_id = $3, sort_order = $4, manager_id = $5,
			description = $6, employee_count = $7, status = $8,
			updated_by = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		dept.ID,
		dept.Name,
		dept.ParentID,
		dept.SortOrder,
		dept.ManagerID,
		dept.Description,
		dept.EmployeeCount,
		dept.Status,
		dept.UpdatedBy,
	).Scan(&dept.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise department: %w", err)
	}

	return dept, nil
}

// DeleteDepartment soft deletes an enterprise department
func (r *PostgresEnterpriseRepository) DeleteDepartment(ctx context.Context, id int) error {
	query := `UPDATE enterprise_departments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete enterprise department: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("enterprise department not found")
	}

	return nil
}

// GetDepartmentStats retrieves department statistics for an enterprise
func (r *PostgresEnterpriseRepository) GetDepartmentStats(ctx context.Context, enterpriseID int) (*models.EnterpriseDepartmentStats, error) {
	exec := r.getExecer()

	stats := &models.EnterpriseDepartmentStats{
		EnterpriseID: enterpriseID,
	}

	// Get basic counts
	countQuery := `
		SELECT 
			COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
			COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active,
			COUNT(*) FILTER (WHERE status = 'inactive' AND deleted_at IS NULL) as inactive,
			COUNT(*) FILTER (WHERE status = 'archived' AND deleted_at IS NULL) as archived,
			COALESCE(MAX(level), 0) as max_depth,
			COALESCE(SUM(employee_count), 0) as total_employees
		FROM enterprise_departments
		WHERE enterprise_id = $1`

	err := exec.QueryRowContext(ctx, countQuery, enterpriseID).Scan(
		&stats.TotalDepartments,
		&stats.ActiveDepartments,
		&stats.InactiveDepartments,
		&stats.ArchivedDepartments,
		&stats.MaxDepth,
		&stats.TotalEmployees,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get department stats: %w", err)
	}

	return stats, nil
}

// buildWhereClause builds the WHERE clause for filtering
func (r *PostgresEnterpriseRepository) buildWhereClause(filters map[string]interface{}) (string, []interface{}) {
	conditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if status, ok := filters["status"].(string); ok && status != "" {
		conditions = append(conditions, fmt.Sprintf(" AND status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	if industryType, ok := filters["industry_type"].(string); ok && industryType != "" {
		conditions = append(conditions, fmt.Sprintf(" AND industry_type = $%d", argIndex))
		args = append(args, industryType)
		argIndex++
	}

	if businessType, ok := filters["business_type"].(string); ok && businessType != "" {
		conditions = append(conditions, fmt.Sprintf(" AND business_type = $%d", argIndex))
		args = append(args, businessType)
		argIndex++
	}

	if search, ok := filters["search"].(string); ok && search != "" {
		conditions = append(conditions, fmt.Sprintf(" AND (name ILIKE $%d OR code ILIKE $%d)", argIndex, argIndex+1))
		searchTerm := fmt.Sprintf("%%%s%%", search)
		args = append(args, searchTerm, searchTerm)
		argIndex += 2
	}

	return strings.Join(conditions, ""), args
}