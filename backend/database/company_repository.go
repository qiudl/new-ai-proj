package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// PostgresCompanyRepository implements CompanyRepository for PostgreSQL
type PostgresCompanyRepository struct {
	db interface{}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresCompanyRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// NewCompanyRepository creates a new company repository
func NewCompanyRepository(db interface{}) CompanyRepository {
	return &PostgresCompanyRepository{db: db}
}

// Create creates a new company
func (r *PostgresCompanyRepository) Create(ctx context.Context, company *models.Company) (*models.Company, error) {
	query := `
		INSERT INTO customers (
			company_name, company_code, industry, company_type, business_license, 
			tax_number, legal_representative, address, city, province, postal_code, 
			website, main_phone, main_email, status, priority, annual_contract_value, 
			employee_count, company_size, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		company.CompanyName, company.CompanyCode, company.Industry, company.CompanyType,
		company.BusinessLicense, company.TaxNumber, company.LegalRepresentative,
		company.Address, company.City, company.Province, company.PostalCode,
		company.Website, company.MainPhone, company.MainEmail,
		company.Status, company.Priority, company.AnnualContractValue,
		company.EmployeeCount, company.CompanySize, company.CreatedBy,
	).Scan(&company.ID, &company.CreatedAt, &company.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create company: %w", err)
	}

	return company, nil
}

// GetByID retrieves a company by ID
func (r *PostgresCompanyRepository) GetByID(ctx context.Context, id int) (*models.Company, error) {
	query := `
		SELECT id, company_name, company_code, industry, company_type, business_license,
			   tax_number, legal_representative, address, city, province, postal_code,
			   website, main_phone, main_email, status, priority, annual_contract_value,
			   total_contract_value, start_date, employee_count, company_size,
			   created_by, updated_by, created_at, updated_at, deleted_at
		FROM customers 
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	company := &models.Company{}

	err := exec.QueryRowContext(ctx, query, id).Scan(
		&company.ID, &company.CompanyName, &company.CompanyCode, &company.Industry,
		&company.CompanyType, &company.BusinessLicense, &company.TaxNumber,
		&company.LegalRepresentative, &company.Address, &company.City, &company.Province,
		&company.PostalCode, &company.Website, &company.MainPhone, &company.MainEmail,
		&company.Status, &company.Priority, &company.AnnualContractValue,
		&company.TotalContractValue, &company.StartDate, &company.EmployeeCount,
		&company.CompanySize, &company.CreatedBy, &company.UpdatedBy,
		&company.CreatedAt, &company.UpdatedAt, &company.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("company not found")
		}
		return nil, fmt.Errorf("failed to get company: %w", err)
	}

	return company, nil
}

// GetByIDIncludeDeleted retrieves a company by ID including soft-deleted rows
func (r *PostgresCompanyRepository) GetByIDIncludeDeleted(ctx context.Context, id int) (*models.Company, error) {
	query := `
		SELECT id, company_name, company_code, industry, company_type, business_license,
			   tax_number, legal_representative, address, city, province, postal_code,
			   website, main_phone, main_email, status, priority, annual_contract_value,
			   total_contract_value, start_date, employee_count, company_size,
			   created_by, updated_by, created_at, updated_at, deleted_at
		FROM customers 
		WHERE id = $1`

	exec := r.getExecer()
	company := &models.Company{}

	err := exec.QueryRowContext(ctx, query, id).Scan(
		&company.ID, &company.CompanyName, &company.CompanyCode, &company.Industry,
		&company.CompanyType, &company.BusinessLicense, &company.TaxNumber,
		&company.LegalRepresentative, &company.Address, &company.City, &company.Province,
		&company.PostalCode, &company.Website, &company.MainPhone, &company.MainEmail,
		&company.Status, &company.Priority, &company.AnnualContractValue,
		&company.TotalContractValue, &company.StartDate, &company.EmployeeCount,
		&company.CompanySize, &company.CreatedBy, &company.UpdatedBy,
		&company.CreatedAt, &company.UpdatedAt, &company.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("company not found")
		}
		return nil, fmt.Errorf("failed to get company (include deleted): %w", err)
	}

	return company, nil
}

// List retrieves companies with pagination and filtering
func (r *PostgresCompanyRepository) List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Company, int, error) {
	whereClause, args := r.buildWhereClause(filters)

	// Count query
	countQuery := "SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL" + whereClause
	exec := r.getExecer()

	var total int
	err := exec.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count companies: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT id, company_name, company_code, industry, company_type, business_license,
			   tax_number, legal_representative, address, city, province, postal_code,
			   website, main_phone, main_email, status, priority, annual_contract_value,
			   total_contract_value, start_date, employee_count, company_size,
			   created_by, updated_by, created_at, updated_at, deleted_at
		FROM customers 
		WHERE deleted_at IS NULL%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, len(args)+1, len(args)+2)

	args = append(args, limit, offset)
	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list companies: %w", err)
	}
	defer rows.Close()

	var companies []*models.Company
	for rows.Next() {
		company := &models.Company{}
		err := rows.Scan(
			&company.ID, &company.CompanyName, &company.CompanyCode, &company.Industry,
			&company.CompanyType, &company.BusinessLicense, &company.TaxNumber,
			&company.LegalRepresentative, &company.Address, &company.City, &company.Province,
			&company.PostalCode, &company.Website, &company.MainPhone, &company.MainEmail,
			&company.Status, &company.Priority, &company.AnnualContractValue,
			&company.TotalContractValue, &company.StartDate, &company.EmployeeCount,
			&company.CompanySize, &company.CreatedBy, &company.UpdatedBy,
			&company.CreatedAt, &company.UpdatedAt, &company.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan company: %w", err)
		}
		companies = append(companies, company)
	}

	return companies, total, nil
}

// Update updates a company
func (r *PostgresCompanyRepository) Update(ctx context.Context, company *models.Company) (*models.Company, error) {
	query := `
		UPDATE customers SET
			company_name = $2, company_code = $3, industry = $4, company_type = $5,
			business_license = $6, tax_number = $7, legal_representative = $8,
			address = $9, city = $10, province = $11, postal_code = $12,
			website = $13, main_phone = $14, main_email = $15, status = $16,
			priority = $17, annual_contract_value = $18, employee_count = $19,
			company_size = $20, updated_by = $21, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		company.ID, company.CompanyName, company.CompanyCode, company.Industry,
		company.CompanyType, company.BusinessLicense, company.TaxNumber,
		company.LegalRepresentative, company.Address, company.City, company.Province,
		company.PostalCode, company.Website, company.MainPhone, company.MainEmail,
		company.Status, company.Priority, company.AnnualContractValue,
		company.EmployeeCount, company.CompanySize, company.UpdatedBy,
	).Scan(&company.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("company not found")
		}
		return nil, fmt.Errorf("failed to update company: %w", err)
	}

	return company, nil
}

// Delete soft deletes a company
func (r *PostgresCompanyRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete company: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("company not found")
	}

	return nil
}

// GetStats retrieves company statistics
func (r *PostgresCompanyRepository) GetStats(ctx context.Context) (*models.CompanyStats, error) {
	query := `
		SELECT 
			COUNT(*) as total_companies,
			COUNT(CASE WHEN status = 'active' THEN 1 END) as active_companies,
			COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_companies,
			COUNT(CASE WHEN status = 'potential' THEN 1 END) as potential_companies,
			COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_companies,
			COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_companies,
			COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_companies,
			COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_companies,
			COALESCE(SUM(annual_contract_value), 0) as total_annual_contract_value,
			COALESCE(AVG(annual_contract_value), 0) as average_annual_contract_value
		FROM customers 
		WHERE deleted_at IS NULL`

	exec := r.getExecer()
	stats := &models.CompanyStats{}

	err := exec.QueryRowContext(ctx, query).Scan(
		&stats.TotalCompanies, &stats.ActiveCompanies, &stats.InactiveCompanies,
		&stats.PotentialCompanies, &stats.SuspendedCompanies,
		&stats.HighPriorityCompanies, &stats.MediumPriorityCompanies, &stats.LowPriorityCompanies,
		&stats.TotalAnnualContractValue, &stats.AverageAnnualContractValue,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get company stats: %w", err)
	}

	return stats, nil
}

// CreateUser creates a new company user
func (r *PostgresCompanyRepository) CreateUser(ctx context.Context, user *models.CompanyUser) (*models.CompanyUser, error) {
	query := `
		INSERT INTO company_users (
			customer_id, name, position, department, email, phone, mobile, work_phone,
			role, is_primary_contact, can_make_decisions, access_level, status, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		user.CustomerID, user.Name, user.Position, user.Department,
		user.Email, user.Phone, user.Mobile, user.WorkPhone,
		user.Role, user.IsPrimaryContact, user.CanMakeDecisions,
		user.AccessLevel, user.Status, user.Notes,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create company user: %w", err)
	}

	return user, nil
}

// GetUsers retrieves all users for a company
func (r *PostgresCompanyRepository) GetUsers(ctx context.Context, companyID int) ([]*models.CompanyUser, error) {
	query := `
		SELECT id, customer_id, name, position, department, email, phone, mobile, work_phone,
			   role, is_primary_contact, can_make_decisions, access_level, status, notes,
			   created_at, updated_at
		FROM company_users 
		WHERE customer_id = $1
		ORDER BY is_primary_contact DESC, role, name`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, companyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get company users: %w", err)
	}
	defer rows.Close()

	var users []*models.CompanyUser
	for rows.Next() {
		user := &models.CompanyUser{}
		err := rows.Scan(
			&user.ID, &user.CustomerID, &user.Name, &user.Position, &user.Department,
			&user.Email, &user.Phone, &user.Mobile, &user.WorkPhone,
			&user.Role, &user.IsPrimaryContact, &user.CanMakeDecisions,
			&user.AccessLevel, &user.Status, &user.Notes,
			&user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan company user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

// UpdateUser updates a company user
func (r *PostgresCompanyRepository) UpdateUser(ctx context.Context, user *models.CompanyUser) (*models.CompanyUser, error) {
	query := `
		UPDATE company_users SET
			name = $2, position = $3, department = $4, email = $5, phone = $6,
			mobile = $7, work_phone = $8, role = $9, is_primary_contact = $10,
			can_make_decisions = $11, access_level = $12, status = $13, notes = $14,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		user.ID, user.Name, user.Position, user.Department,
		user.Email, user.Phone, user.Mobile, user.WorkPhone,
		user.Role, user.IsPrimaryContact, user.CanMakeDecisions,
		user.AccessLevel, user.Status, user.Notes,
	).Scan(&user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("company user not found")
		}
		return nil, fmt.Errorf("failed to update company user: %w", err)
	}

	return user, nil
}

// DeleteUser deletes a company user
func (r *PostgresCompanyRepository) DeleteUser(ctx context.Context, userID int) error {
	query := `DELETE FROM company_users WHERE id = $1`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete company user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("company user not found")
	}

	return nil
}

// CreateContact creates a new company contact
func (r *PostgresCompanyRepository) CreateContact(ctx context.Context, contact *models.CompanyContact) (*models.CompanyContact, error) {
	query := `
		INSERT INTO company_contacts (
			customer_id, company_user_id, contact_type, subject, content,
			contact_date, next_contact_date, status, result, follow_up_required,
			related_project_id, related_contract_id, contacted_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		contact.CustomerID, contact.CompanyUserID, contact.ContactType,
		contact.Subject, contact.Content, contact.ContactDate,
		contact.NextContactDate, contact.Status, contact.Result,
		contact.FollowUpRequired, contact.RelatedProjectID,
		contact.RelatedContractID, contact.ContactedBy,
	).Scan(&contact.ID, &contact.CreatedAt, &contact.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create company contact: %w", err)
	}

	return contact, nil
}

// GetContacts retrieves contacts for a company with pagination
func (r *PostgresCompanyRepository) GetContacts(ctx context.Context, companyID int, limit, offset int) ([]*models.CompanyContact, int, error) {
	// Count query
	countQuery := `SELECT COUNT(*) FROM company_contacts WHERE customer_id = $1`
	exec := r.getExecer()

	var total int
	err := exec.QueryRowContext(ctx, countQuery, companyID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count company contacts: %w", err)
	}

	// Main query
	query := `
		SELECT cc.id, cc.customer_id, cc.company_user_id, cc.contact_type, cc.subject, cc.content,
			   cc.contact_date, cc.next_contact_date, cc.status, cc.result, cc.follow_up_required,
			   cc.related_project_id, cc.related_contract_id, cc.contacted_by,
			   cc.created_at, cc.updated_at,
			   cu.name as company_user_name
		FROM company_contacts cc
		LEFT JOIN company_users cu ON cc.company_user_id = cu.id
		WHERE cc.customer_id = $1
		ORDER BY cc.contact_date DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, companyID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get company contacts: %w", err)
	}
	defer rows.Close()

	var contacts []*models.CompanyContact
	for rows.Next() {
		contact := &models.CompanyContact{}
		var companyUserName sql.NullString

		err := rows.Scan(
			&contact.ID, &contact.CustomerID, &contact.CompanyUserID,
			&contact.ContactType, &contact.Subject, &contact.Content,
			&contact.ContactDate, &contact.NextContactDate,
			&contact.Status, &contact.Result, &contact.FollowUpRequired,
			&contact.RelatedProjectID, &contact.RelatedContractID, &contact.ContactedBy,
			&contact.CreatedAt, &contact.UpdatedAt, &companyUserName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan company contact: %w", err)
		}

		if companyUserName.Valid {
			contact.CompanyUserName = &companyUserName.String
		}

		contacts = append(contacts, contact)
	}

	return contacts, total, nil
}

// buildWhereClause builds WHERE clause for filtering
func (r *PostgresCompanyRepository) buildWhereClause(filters map[string]interface{}) (string, []interface{}) {
	if len(filters) == 0 {
		return "", []interface{}{}
	}

	var conditions []string
	var args []interface{}
	argIndex := 1

	if status, ok := filters["status"].(string); ok && status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	if priority, ok := filters["priority"].(string); ok && priority != "" {
		conditions = append(conditions, fmt.Sprintf("priority = $%d", argIndex))
		args = append(args, priority)
		argIndex++
	}

	if industry, ok := filters["industry"].(string); ok && industry != "" {
		conditions = append(conditions, fmt.Sprintf("industry ILIKE $%d", argIndex))
		args = append(args, "%"+industry+"%")
		argIndex++
	}

	if companyName, ok := filters["company_name"].(string); ok && companyName != "" {
		conditions = append(conditions, fmt.Sprintf("company_name = $%d", argIndex))
		args = append(args, companyName)
		argIndex++
	}

	if search, ok := filters["search"].(string); ok && search != "" {
		conditions = append(conditions, fmt.Sprintf("(company_name ILIKE $%d OR main_email ILIKE $%d OR main_phone ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+search+"%")
		argIndex++
	}

	if len(conditions) > 0 {
		return " AND " + strings.Join(conditions, " AND "), args
	}

	return "", args
}
