package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// PostgresCompanyRepository implements CompanyRepository for PostgreSQL using enterprises table
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

// Create creates a new company (now using enterprises table)
func (r *PostgresCompanyRepository) Create(ctx context.Context, company *models.Company) (*models.Company, error) {
	// Map Company model to enterprises table
	query := `
		INSERT INTO enterprises (
			name, code, industry_type, business_type, 
			registration_number, tax_id, legal_representative, 
			contact_email, contact_phone, address, city, province, postal_code, 
			website, description, status, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	
	// Map fields appropriately
	businessType := "corporation" // default
	if company.CompanyType != "" {
		// Map old company types to new business types
		switch company.CompanyType {
		case "limited_company":
			businessType = "llc"
		case "joint_stock":
			businessType = "corporation"
		case "individual":
			businessType = "individual"
		case "partnership":
			businessType = "partnership"
		default:
			businessType = "corporation"
		}
	}
	
	// Map status
	status := "active"
	if company.Status != "" {
		switch company.Status {
		case "inactive", "suspended":
			status = company.Status
		default:
			status = "active"
		}
	}

	err := exec.QueryRowContext(ctx, query,
		company.CompanyName,        // name
		company.CompanyCode,        // code
		company.Industry,           // industry_type
		businessType,               // business_type
		company.BusinessLicense,    // registration_number
		company.TaxNumber,          // tax_id
		company.LegalRepresentative,// legal_representative
		company.MainEmail,          // contact_email
		company.MainPhone,          // contact_phone
		company.Address,            // address
		company.City,               // city
		company.Province,           // province
		company.PostalCode,         // postal_code
		company.Website,            // website
		nil,                        // description
		status,                     // status
		company.CreatedBy,          // created_by
	).Scan(&company.ID, &company.CreatedAt, &company.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create company in enterprises table: %w", err)
	}

	return company, nil
}

// GetByID retrieves a company by ID (from enterprises table)
func (r *PostgresCompanyRepository) GetByID(ctx context.Context, id int) (*models.Company, error) {
	query := `
		SELECT id, name, code, industry_type, business_type,
			   registration_number, tax_id, legal_representative,
			   contact_email, contact_phone, address, city, province, postal_code,
			   website, description, status,
			   created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprises 
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	company := &models.Company{}
	
	var businessType string
	var description sql.NullString

	err := exec.QueryRowContext(ctx, query, id).Scan(
		&company.ID, 
		&company.CompanyName,       // name -> company_name
		&company.CompanyCode,       // code -> company_code
		&company.Industry,          // industry_type -> industry
		&businessType,              // business_type (needs mapping)
		&company.BusinessLicense,   // registration_number -> business_license
		&company.TaxNumber,         // tax_id -> tax_number
		&company.LegalRepresentative,
		&company.MainEmail,         // contact_email -> main_email
		&company.MainPhone,         // contact_phone -> main_phone
		&company.Address,
		&company.City,
		&company.Province,
		&company.PostalCode,
		&company.Website,
		&description,               // description (not in Company model)
		&company.Status,
		&company.CreatedBy,
		&company.UpdatedBy,
		&company.CreatedAt,
		&company.UpdatedAt,
		&company.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("company not found in enterprises table")
		}
		return nil, fmt.Errorf("failed to get company from enterprises: %w", err)
	}

	// Map business_type back to company_type
	switch businessType {
	case "llc":
		company.CompanyType = "limited_company"
	case "corporation":
		company.CompanyType = "joint_stock"
	case "individual":
		company.CompanyType = "individual"
	case "partnership":
		company.CompanyType = "partnership"
	default:
		company.CompanyType = "limited_company"
	}

	// Set default values for fields not in enterprises table
	company.Priority = "medium"
	company.CompanySize = nil
	company.EmployeeCount = nil
	company.AnnualContractValue = nil
	company.TotalContractValue = nil
	company.StartDate = nil

	return company, nil
}

// GetByIDIncludeDeleted retrieves a company by ID including soft-deleted rows
func (r *PostgresCompanyRepository) GetByIDIncludeDeleted(ctx context.Context, id int) (*models.Company, error) {
	query := `
		SELECT id, name, code, industry_type, business_type,
			   registration_number, tax_id, legal_representative,
			   contact_email, contact_phone, address, city, province, postal_code,
			   website, description, status,
			   created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprises 
		WHERE id = $1`

	exec := r.getExecer()
	company := &models.Company{}
	
	var businessType string
	var description sql.NullString

	err := exec.QueryRowContext(ctx, query, id).Scan(
		&company.ID,
		&company.CompanyName,
		&company.CompanyCode,
		&company.Industry,
		&businessType,
		&company.BusinessLicense,
		&company.TaxNumber,
		&company.LegalRepresentative,
		&company.MainEmail,
		&company.MainPhone,
		&company.Address,
		&company.City,
		&company.Province,
		&company.PostalCode,
		&company.Website,
		&description,
		&company.Status,
		&company.CreatedBy,
		&company.UpdatedBy,
		&company.CreatedAt,
		&company.UpdatedAt,
		&company.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("company not found in enterprises table")
		}
		return nil, fmt.Errorf("failed to get company (include deleted) from enterprises: %w", err)
	}

	// Map business_type back
	switch businessType {
	case "llc":
		company.CompanyType = "limited_company"
	case "corporation":
		company.CompanyType = "joint_stock"
	case "individual":
		company.CompanyType = "individual"
	case "partnership":
		company.CompanyType = "partnership"
	default:
		company.CompanyType = "limited_company"
	}

	// Set defaults for missing fields
	company.Priority = "medium"
	company.CompanySize = nil
	company.EmployeeCount = nil
	company.AnnualContractValue = nil
	company.TotalContractValue = nil
	company.StartDate = nil

	return company, nil
}

// List retrieves companies with pagination and filtering
func (r *PostgresCompanyRepository) List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Company, int, error) {
	whereClause, args := r.buildWhereClause(filters)

	// Count query
	countQuery := "SELECT COUNT(*) FROM enterprises WHERE deleted_at IS NULL" + whereClause
	exec := r.getExecer()

	var total int
	err := exec.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count companies in enterprises: %w", err)
	}

	// Main query
	query := fmt.Sprintf(`
		SELECT id, name, code, industry_type, business_type,
			   registration_number, tax_id, legal_representative,
			   contact_email, contact_phone, address, city, province, postal_code,
			   website, description, status,
			   created_by, updated_by, created_at, updated_at, deleted_at
		FROM enterprises 
		WHERE deleted_at IS NULL%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, len(args)+1, len(args)+2)

	args = append(args, limit, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list companies from enterprises: %w", err)
	}
	defer rows.Close()

	companies := []*models.Company{}
	for rows.Next() {
		company := &models.Company{}
		var businessType string
		var description sql.NullString

		err := rows.Scan(
			&company.ID,
			&company.CompanyName,
			&company.CompanyCode,
			&company.Industry,
			&businessType,
			&company.BusinessLicense,
			&company.TaxNumber,
			&company.LegalRepresentative,
			&company.MainEmail,
			&company.MainPhone,
			&company.Address,
			&company.City,
			&company.Province,
			&company.PostalCode,
			&company.Website,
			&description,
			&company.Status,
			&company.CreatedBy,
			&company.UpdatedBy,
			&company.CreatedAt,
			&company.UpdatedAt,
			&company.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan company from enterprises: %w", err)
		}

		// Map business_type back
		switch businessType {
		case "llc":
			company.CompanyType = "limited_company"
		case "corporation":
			company.CompanyType = "joint_stock"
		case "individual":
			company.CompanyType = "individual"
		case "partnership":
			company.CompanyType = "partnership"
		default:
			company.CompanyType = "limited_company"
		}

		// Set defaults
		company.Priority = "medium"

		companies = append(companies, company)
	}

	return companies, total, nil
}

// Update updates a company
func (r *PostgresCompanyRepository) Update(ctx context.Context, company *models.Company) (*models.Company, error) {
	// Map to enterprises fields
	businessType := "corporation"
	if company.CompanyType != "" {
		switch company.CompanyType {
		case "limited_company":
			businessType = "llc"
		case "joint_stock":
			businessType = "corporation"
		case "individual":
			businessType = "individual"
		case "partnership":
			businessType = "partnership"
		default:
			businessType = "corporation"
		}
	}

	query := `
		UPDATE enterprises SET
			name = $2, code = $3, industry_type = $4, business_type = $5,
			registration_number = $6, tax_id = $7, legal_representative = $8,
			contact_email = $9, contact_phone = $10, address = $11, city = $12,
			province = $13, postal_code = $14, website = $15, status = $16,
			updated_by = $17, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		company.ID,
		company.CompanyName,
		company.CompanyCode,
		company.Industry,
		businessType,
		company.BusinessLicense,
		company.TaxNumber,
		company.LegalRepresentative,
		company.MainEmail,
		company.MainPhone,
		company.Address,
		company.City,
		company.Province,
		company.PostalCode,
		company.Website,
		company.Status,
		company.UpdatedBy,
	).Scan(&company.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to update company in enterprises: %w", err)
	}

	return company, nil
}

// Delete soft deletes a company
func (r *PostgresCompanyRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE enterprises SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`
	
	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete company from enterprises: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("company not found in enterprises")
	}

	return nil
}

// GetStats retrieves company statistics
func (r *PostgresCompanyRepository) GetStats(ctx context.Context) (*models.CompanyStats, error) {
	query := `
		SELECT 
			COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
			COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active,
			COUNT(*) FILTER (WHERE status = 'inactive' AND deleted_at IS NULL) as inactive,
			COUNT(*) FILTER (WHERE status = 'suspended' AND deleted_at IS NULL) as suspended
		FROM enterprises`

	exec := r.getExecer()
	stats := &models.CompanyStats{}

	var suspended int
	err := exec.QueryRowContext(ctx, query).Scan(
		&stats.TotalCompanies,
		&stats.ActiveCompanies,
		&stats.InactiveCompanies,
		&suspended,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get company stats from enterprises: %w", err)
	}

	// Map suspended to the existing suspended field
	stats.SuspendedCompanies = suspended
	
	// Set default values for fields not available in enterprises
	stats.PotentialCompanies = 0
	stats.HighPriorityCompanies = 0
	stats.MediumPriorityCompanies = stats.TotalCompanies // default all to medium
	stats.LowPriorityCompanies = 0

	return stats, nil
}

// Company User operations - These will now use enterprise_users table

// CreateUser creates a new company user
func (r *PostgresCompanyRepository) CreateUser(ctx context.Context, user *models.CompanyUser) (*models.CompanyUser, error) {
	// For now, return an error indicating this needs to be migrated
	return nil, fmt.Errorf("CreateUser needs to be migrated to use enterprise_users table")
}

// GetUsers retrieves users for a company
func (r *PostgresCompanyRepository) GetUsers(ctx context.Context, companyID int) ([]*models.CompanyUser, error) {
	// For now, return an error indicating this needs to be migrated
	return nil, fmt.Errorf("GetUsers needs to be migrated to use enterprise_users table")
}

// UpdateUser updates a company user
func (r *PostgresCompanyRepository) UpdateUser(ctx context.Context, user *models.CompanyUser) (*models.CompanyUser, error) {
	// For now, return an error indicating this needs to be migrated
	return nil, fmt.Errorf("UpdateUser needs to be migrated to use enterprise_users table")
}

// DeleteUser deletes a company user
func (r *PostgresCompanyRepository) DeleteUser(ctx context.Context, userID int) error {
	// For now, return an error indicating this needs to be migrated
	return fmt.Errorf("DeleteUser needs to be migrated to use enterprise_users table")
}

// Company Contact operations - These need enterprise equivalent

// CreateContact creates a new company contact
func (r *PostgresCompanyRepository) CreateContact(ctx context.Context, contact *models.CompanyContact) (*models.CompanyContact, error) {
	// For now, return an error indicating this needs to be migrated
	return nil, fmt.Errorf("CreateContact needs to be migrated to use enterprise system")
}

// GetContacts retrieves contacts for a company
func (r *PostgresCompanyRepository) GetContacts(ctx context.Context, companyID int, limit, offset int) ([]*models.CompanyContact, int, error) {
	// For now, return an error indicating this needs to be migrated
	return nil, 0, fmt.Errorf("GetContacts needs to be migrated to use enterprise system")
}

// buildWhereClause builds the WHERE clause for filtering
func (r *PostgresCompanyRepository) buildWhereClause(filters map[string]interface{}) (string, []interface{}) {
	conditions := []string{}
	args := []interface{}{}
	argIndex := 1

	if status, ok := filters["status"].(string); ok && status != "" {
		conditions = append(conditions, fmt.Sprintf(" AND status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	if industry, ok := filters["industry"].(string); ok && industry != "" {
		conditions = append(conditions, fmt.Sprintf(" AND industry_type = $%d", argIndex))
		args = append(args, industry)
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