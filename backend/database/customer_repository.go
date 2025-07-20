package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// CustomerRepository defines the interface for customer data operations
type CustomerRepository interface {
	// Customer CRUD operations
	Create(ctx context.Context, customer *models.Customer) (*models.Customer, error)
	GetByID(ctx context.Context, id int) (*models.Customer, error)
	List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Customer, int, error)
	Update(ctx context.Context, customer *models.Customer) (*models.Customer, error)
	Delete(ctx context.Context, id int) error
	
	// Customer-User association operations
	AssociateUser(ctx context.Context, customerUser *models.CustomerUser) (*models.CustomerUser, error)
	DisassociateUser(ctx context.Context, customerID, userID int) error
	GetCustomerUsers(ctx context.Context, customerID int) ([]*models.CustomerUser, error)
	GetUserCustomers(ctx context.Context, userID int) ([]*models.Customer, error)
	UpdateUserRole(ctx context.Context, customerID, userID int, role string, permissions models.CustomFields) error
	
	// Contact records operations
	CreateContact(ctx context.Context, contact *models.CustomerContact) (*models.CustomerContact, error)
	GetContacts(ctx context.Context, customerID int, limit, offset int) ([]*models.CustomerContact, int, error)
	UpdateContact(ctx context.Context, contact *models.CustomerContact) (*models.CustomerContact, error)
	DeleteContact(ctx context.Context, id int) error
	
	// Statistics and reports
	GetCustomerStats(ctx context.Context) (map[string]interface{}, error)
	GetCustomersByStatus(ctx context.Context, status string) ([]*models.Customer, error)
	GetUpcomingContacts(ctx context.Context, userID int, days int) ([]*models.CustomerContact, error)
}

// PostgresCustomerRepository implements CustomerRepository for PostgreSQL
type PostgresCustomerRepository struct {
	db interface{}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresCustomerRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// NewCustomerRepository creates a new customer repository
func NewCustomerRepository(db interface{}) CustomerRepository {
	return &PostgresCustomerRepository{db: db}
}

// Create creates a new customer
func (r *PostgresCustomerRepository) Create(ctx context.Context, customer *models.Customer) (*models.Customer, error) {
	query := `
		INSERT INTO customers (
			name, company, industry, contact_person, email, phone, address, website, 
			description, status, contract_value, contract_start_date, contract_end_date, 
			priority, custom_fields, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		customer.Name, customer.Company, customer.Industry, customer.ContactPerson,
		customer.Email, customer.Phone, customer.Address, customer.Website,
		customer.Status, customer.ContractValue,
		customer.StartDate, customer.EndDate, customer.Priority,
		customer.CustomFields, customer.CreatedBy,
	).Scan(&customer.ID, &customer.CreatedAt, &customer.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create customer: %w", err)
	}

	return customer, nil
}

// GetByID retrieves a customer by ID
func (r *PostgresCustomerRepository) GetByID(ctx context.Context, id int) (*models.Customer, error) {
	query := `
		SELECT id, name, company, industry, contact_person, email, phone, address, website,
		       description, status, contract_value, contract_start_date, contract_end_date,
		       priority, custom_fields, created_by, updated_by, created_at, updated_at, deleted_at
		FROM customers
		WHERE id = $1 AND deleted_at IS NULL`

	customer := &models.Customer{}
	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query, id).Scan(
		&customer.ID, &customer.Name, &customer.Company, &customer.Industry,
		&customer.ContactPerson, &customer.Email, &customer.Phone, &customer.Address,
		&customer.Website, &customer.Status, &customer.ContractValue,
		&customer.StartDate, &customer.EndDate, &customer.Priority,
		&customer.CustomFields, &customer.CreatedBy, &customer.UpdatedBy,
		&customer.CreatedAt, &customer.UpdatedAt, &customer.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, fmt.Errorf("failed to get customer: %w", err)
	}

	return customer, nil
}

// List retrieves customers with filtering and pagination
func (r *PostgresCustomerRepository) List(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Customer, int, error) {
	// Build WHERE clause
	var whereClauses []string
	var args []interface{}
	argIndex := 1

	whereClauses = append(whereClauses, "deleted_at IS NULL")

	if status, ok := filters["status"].(string); ok && status != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	if priority, ok := filters["priority"].(string); ok && priority != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("priority = $%d", argIndex))
		args = append(args, priority)
		argIndex++
	}

	if industry, ok := filters["industry"].(string); ok && industry != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("industry = $%d", argIndex))
		args = append(args, industry)
		argIndex++
	}

	if search, ok := filters["search"].(string); ok && search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(name ILIKE $%d OR company ILIKE $%d OR contact_person ILIKE $%d)", argIndex, argIndex, argIndex))
		args = append(args, "%"+search+"%")
		argIndex++
	}

	whereClause := strings.Join(whereClauses, " AND ")

	// Count total records
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM customers WHERE %s", whereClause)
	var total int
	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count customers: %w", err)
	}

	// Get customers
	query := fmt.Sprintf(`
		SELECT id, name, company, industry, contact_person, email, phone, address, website,
		       description, status, contract_value, contract_start_date, contract_end_date,
		       priority, custom_fields, created_by, updated_by, created_at, updated_at, deleted_at
		FROM customers
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list customers: %w", err)
	}
	defer rows.Close()

	var customers []*models.Customer
	for rows.Next() {
		customer := &models.Customer{}
		err := rows.Scan(
			&customer.ID, &customer.Name, &customer.Company, &customer.Industry,
			&customer.ContactPerson, &customer.Email, &customer.Phone, &customer.Address,
			&customer.Website, &customer.Status, &customer.ContractValue,
			&customer.StartDate, &customer.EndDate, &customer.Priority,
			&customer.CustomFields, &customer.CreatedBy, &customer.UpdatedBy,
			&customer.CreatedAt, &customer.UpdatedAt, &customer.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan customer: %w", err)
		}
		customers = append(customers, customer)
	}

	return customers, total, nil
}

// Update updates a customer
func (r *PostgresCustomerRepository) Update(ctx context.Context, customer *models.Customer) (*models.Customer, error) {
	query := `
		UPDATE customers SET
			name = $1, company = $2, industry = $3, contact_person = $4,
			email = $5, phone = $6, address = $7, website = $8,
			description = $9, status = $10, contract_value = $11,
			contract_start_date = $12, contract_end_date = $13, priority = $14,
			custom_fields = $15, updated_by = $16, updated_at = CURRENT_TIMESTAMP
		WHERE id = $17 AND deleted_at IS NULL
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		customer.Name, customer.Company, customer.Industry, customer.ContactPerson,
		customer.Email, customer.Phone, customer.Address, customer.Website,
		customer.Status, customer.ContractValue,
		customer.StartDate, customer.EndDate, customer.Priority,
		customer.CustomFields, customer.UpdatedBy, customer.ID,
	).Scan(&customer.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, fmt.Errorf("failed to update customer: %w", err)
	}

	return customer, nil
}

// Delete soft deletes a customer
func (r *PostgresCustomerRepository) Delete(ctx context.Context, id int) error {
	query := "UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL"
	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete customer: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("customer not found")
	}

	return nil
}

// AssociateUser associates a user with a customer
func (r *PostgresCustomerRepository) AssociateUser(ctx context.Context, customerUser *models.CustomerUser) (*models.CustomerUser, error) {
	query := `
		INSERT INTO customer_users (customer_id, user_id, role, is_primary, permissions, access_level)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		customerUser.CustomerID, customerUser.UserID, customerUser.Role,
		customerUser.IsPrimary, customerUser.Permissions, customerUser.AccessLevel,
	).Scan(&customerUser.ID, &customerUser.CreatedAt, &customerUser.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to associate user with customer: %w", err)
	}

	return customerUser, nil
}

// DisassociateUser removes user association with a customer
func (r *PostgresCustomerRepository) DisassociateUser(ctx context.Context, customerID, userID int) error {
	query := "DELETE FROM customer_users WHERE customer_id = $1 AND user_id = $2"
	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, customerID, userID)
	if err != nil {
		return fmt.Errorf("failed to disassociate user from customer: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("association not found")
	}

	return nil
}

// GetCustomerUsers gets all users associated with a customer
func (r *PostgresCustomerRepository) GetCustomerUsers(ctx context.Context, customerID int) ([]*models.CustomerUser, error) {
	query := `
		SELECT cu.id, cu.customer_id, cu.user_id, cu.role, cu.is_primary,
		       cu.permissions, cu.access_level, cu.created_at, cu.updated_at
		FROM customer_users cu
		WHERE cu.customer_id = $1
		ORDER BY cu.is_primary DESC, cu.created_at ASC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get customer users: %w", err)
	}
	defer rows.Close()

	var customerUsers []*models.CustomerUser
	for rows.Next() {
		cu := &models.CustomerUser{}
		err := rows.Scan(
			&cu.ID, &cu.CustomerID, &cu.UserID, &cu.Role, &cu.IsPrimary,
			&cu.Permissions, &cu.AccessLevel, &cu.CreatedAt, &cu.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan customer user: %w", err)
		}
		customerUsers = append(customerUsers, cu)
	}

	return customerUsers, nil
}

// GetUserCustomers gets all customers associated with a user
func (r *PostgresCustomerRepository) GetUserCustomers(ctx context.Context, userID int) ([]*models.Customer, error) {
	query := `
		SELECT c.id, c.name, c.company, c.industry, c.contact_person, c.email, c.phone,
		       c.address, c.website, c.description, c.status, c.contract_value,
		       c.contract_start_date, c.contract_end_date, c.priority, c.custom_fields,
		       c.created_by, c.updated_by, c.created_at, c.updated_at, c.deleted_at
		FROM customers c
		INNER JOIN customer_users cu ON c.id = cu.customer_id
		WHERE cu.user_id = $1 AND c.deleted_at IS NULL
		ORDER BY cu.is_primary DESC, c.name ASC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user customers: %w", err)
	}
	defer rows.Close()

	var customers []*models.Customer
	for rows.Next() {
		customer := &models.Customer{}
		err := rows.Scan(
			&customer.ID, &customer.Name, &customer.Company, &customer.Industry,
			&customer.ContactPerson, &customer.Email, &customer.Phone, &customer.Address,
			&customer.Website, &customer.Status, &customer.ContractValue,
			&customer.StartDate, &customer.EndDate, &customer.Priority,
			&customer.CustomFields, &customer.CreatedBy, &customer.UpdatedBy,
			&customer.CreatedAt, &customer.UpdatedAt, &customer.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan customer: %w", err)
		}
		customers = append(customers, customer)
	}

	return customers, nil
}

// UpdateUserRole updates user role and permissions for a customer
func (r *PostgresCustomerRepository) UpdateUserRole(ctx context.Context, customerID, userID int, role string, permissions models.CustomFields) error {
	query := `
		UPDATE customer_users SET
			role = $1, permissions = $2, updated_at = CURRENT_TIMESTAMP
		WHERE customer_id = $3 AND user_id = $4`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, role, permissions, customerID, userID)
	if err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("association not found")
	}

	return nil
}

// CreateContact creates a new contact record
func (r *PostgresCustomerRepository) CreateContact(ctx context.Context, contact *models.CustomerContact) (*models.CustomerContact, error) {
	query := `
		INSERT INTO customer_contacts (
			customer_id, contact_type, subject, content, contact_date,
			next_contact_date, status, result, contacted_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		contact.CustomerID, contact.ContactType, contact.Subject, contact.Content,
		contact.ContactDate, contact.NextContactDate, contact.Status,
		contact.Result, contact.ContactedBy,
	).Scan(&contact.ID, &contact.CreatedAt, &contact.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create contact: %w", err)
	}

	return contact, nil
}

// GetContacts gets contact records for a customer
func (r *PostgresCustomerRepository) GetContacts(ctx context.Context, customerID int, limit, offset int) ([]*models.CustomerContact, int, error) {
	// Count total records
	countQuery := "SELECT COUNT(*) FROM customer_contacts WHERE customer_id = $1"
	var total int
	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, countQuery, customerID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count contacts: %w", err)
	}

	// Get contacts
	query := `
		SELECT id, customer_id, contact_type, subject, content, contact_date,
		       next_contact_date, status, result, contacted_by, created_at, updated_at
		FROM customer_contacts
		WHERE customer_id = $1
		ORDER BY contact_date DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, customerID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get contacts: %w", err)
	}
	defer rows.Close()

	var contacts []*models.CustomerContact
	for rows.Next() {
		contact := &models.CustomerContact{}
		err := rows.Scan(
			&contact.ID, &contact.CustomerID, &contact.ContactType, &contact.Subject,
			&contact.Content, &contact.ContactDate, &contact.NextContactDate,
			&contact.Status, &contact.Result, &contact.ContactedBy,
			&contact.CreatedAt, &contact.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan contact: %w", err)
		}
		contacts = append(contacts, contact)
	}

	return contacts, total, nil
}

// UpdateContact updates a contact record
func (r *PostgresCustomerRepository) UpdateContact(ctx context.Context, contact *models.CustomerContact) (*models.CustomerContact, error) {
	query := `
		UPDATE customer_contacts SET
			contact_type = $1, subject = $2, content = $3, contact_date = $4,
			next_contact_date = $5, status = $6, result = $7, updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
		RETURNING updated_at`

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query,
		contact.ContactType, contact.Subject, contact.Content, contact.ContactDate,
		contact.NextContactDate, contact.Status, contact.Result, contact.ID,
	).Scan(&contact.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("contact not found")
		}
		return nil, fmt.Errorf("failed to update contact: %w", err)
	}

	return contact, nil
}

// DeleteContact deletes a contact record
func (r *PostgresCustomerRepository) DeleteContact(ctx context.Context, id int) error {
	query := "DELETE FROM customer_contacts WHERE id = $1"
	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete contact: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("contact not found")
	}

	return nil
}

// GetCustomerStats gets customer statistics
func (r *PostgresCustomerRepository) GetCustomerStats(ctx context.Context) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_customers,
			COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
			COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_customers,
			COUNT(CASE WHEN status = 'potential' THEN 1 END) as potential_customers,
			COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_customers,
			COALESCE(SUM(contract_value), 0) as total_contract_value,
			COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_customers,
			COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_customers
		FROM customers
		WHERE deleted_at IS NULL`

	var stats struct {
		TotalCustomers        int     `db:"total_customers"`
		ActiveCustomers       int     `db:"active_customers"`
		InactiveCustomers     int     `db:"inactive_customers"`
		PotentialCustomers    int     `db:"potential_customers"`
		ClosedCustomers       int     `db:"closed_customers"`
		TotalContractValue    float64 `db:"total_contract_value"`
		HighPriorityCustomers int     `db:"high_priority_customers"`
		UrgentCustomers       int     `db:"urgent_customers"`
	}

	exec := r.getExecer()
	err := exec.QueryRowContext(ctx, query).Scan(
		&stats.TotalCustomers, &stats.ActiveCustomers, &stats.InactiveCustomers,
		&stats.PotentialCustomers, &stats.ClosedCustomers, &stats.TotalContractValue,
		&stats.HighPriorityCustomers, &stats.UrgentCustomers,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get customer stats: %w", err)
	}

	result := map[string]interface{}{
		"total_customers":         stats.TotalCustomers,
		"active_customers":        stats.ActiveCustomers,
		"inactive_customers":      stats.InactiveCustomers,
		"potential_customers":     stats.PotentialCustomers,
		"closed_customers":        stats.ClosedCustomers,
		"total_contract_value":    stats.TotalContractValue,
		"high_priority_customers": stats.HighPriorityCustomers,
		"urgent_customers":        stats.UrgentCustomers,
	}

	return result, nil
}

// GetCustomersByStatus gets customers by status
func (r *PostgresCustomerRepository) GetCustomersByStatus(ctx context.Context, status string) ([]*models.Customer, error) {
	query := `
		SELECT id, name, company, industry, contact_person, email, phone, address, website,
		       description, status, contract_value, contract_start_date, contract_end_date,
		       priority, custom_fields, created_by, updated_by, created_at, updated_at, deleted_at
		FROM customers
		WHERE status = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, status)
	if err != nil {
		return nil, fmt.Errorf("failed to get customers by status: %w", err)
	}
	defer rows.Close()

	var customers []*models.Customer
	for rows.Next() {
		customer := &models.Customer{}
		err := rows.Scan(
			&customer.ID, &customer.Name, &customer.Company, &customer.Industry,
			&customer.ContactPerson, &customer.Email, &customer.Phone, &customer.Address,
			&customer.Website, &customer.Status, &customer.ContractValue,
			&customer.StartDate, &customer.EndDate, &customer.Priority,
			&customer.CustomFields, &customer.CreatedBy, &customer.UpdatedBy,
			&customer.CreatedAt, &customer.UpdatedAt, &customer.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan customer: %w", err)
		}
		customers = append(customers, customer)
	}

	return customers, nil
}

// GetUpcomingContacts gets upcoming contact records for a user
func (r *PostgresCustomerRepository) GetUpcomingContacts(ctx context.Context, userID int, days int) ([]*models.CustomerContact, error) {
	query := `
		SELECT cc.id, cc.customer_id, cc.contact_type, cc.subject, cc.content,
		       cc.contact_date, cc.next_contact_date, cc.status, cc.result,
		       cc.contacted_by, cc.created_at, cc.updated_at
		FROM customer_contacts cc
		INNER JOIN customer_users cu ON cc.customer_id = cu.customer_id
		WHERE cu.user_id = $1 
		  AND cc.next_contact_date IS NOT NULL
		  AND cc.next_contact_date <= CURRENT_DATE + INTERVAL '%d days'
		  AND cc.status = 'planned'
		ORDER BY cc.next_contact_date ASC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, fmt.Sprintf(query, days), userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming contacts: %w", err)
	}
	defer rows.Close()

	var contacts []*models.CustomerContact
	for rows.Next() {
		contact := &models.CustomerContact{}
		err := rows.Scan(
			&contact.ID, &contact.CustomerID, &contact.ContactType, &contact.Subject,
			&contact.Content, &contact.ContactDate, &contact.NextContactDate,
			&contact.Status, &contact.Result, &contact.ContactedBy,
			&contact.CreatedAt, &contact.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan contact: %w", err)
		}
		contacts = append(contacts, contact)
	}

	return contacts, nil
}
