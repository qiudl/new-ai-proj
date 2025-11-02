package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
)

// PostgresProjectRepository implements ProjectRepository using PostgreSQL
type PostgresProjectRepository struct {
	db interface{}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresProjectRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new project
func (r *PostgresProjectRepository) Create(ctx context.Context, project *models.Project) (*models.Project, error) {
	query := `
		INSERT INTO projects (project_number, name, description, owner_id, company_id, enterprise_id, status, priority, progress, start_date, end_date, budget)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		project.ProjectNumber, project.Name, project.Description, project.OwnerID, project.CompanyID, project.EnterpriseID,
		project.Status, project.Priority, project.Progress, project.StartDate, project.EndDate, project.Budget)

	err := row.Scan(&project.ID, &project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return project, nil
}

// GetByID gets a project by ID (only non-deleted)
func (r *PostgresProjectRepository) GetByID(ctx context.Context, id int) (*models.Project, error) {
	query := `
		SELECT id, project_number, name, description, owner_id, company_id, enterprise_id, status, priority, progress, start_date, end_date, budget, created_at, updated_at, deleted_at
		FROM projects WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	project := &models.Project{}

	err := row.Scan(
		&project.ID, &project.ProjectNumber, &project.Name, &project.Description, &project.OwnerID,
		&project.CompanyID, &project.EnterpriseID, &project.Status, &project.Priority, &project.Progress,
		&project.StartDate, &project.EndDate, &project.Budget,
		&project.CreatedAt, &project.UpdatedAt, &project.DeletedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	return project, nil
}

// GetByUserID gets projects by user ID with pagination (only non-deleted)
func (r *PostgresProjectRepository) GetByUserID(ctx context.Context, userID int, limit, offset int) ([]*models.Project, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, userID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get project count: %w", err)
	}

	// Get projects with pagination
	query := `
		SELECT id, project_number, name, description, owner_id, company_id, status, priority, progress, start_date, end_date, budget, created_at, updated_at, deleted_at
		FROM projects 
		WHERE owner_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list projects: %w", err)
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		project := &models.Project{}

		err := rows.Scan(
			&project.ID, &project.ProjectNumber, &project.Name, &project.Description, &project.OwnerID,
			&project.CompanyID, &project.Status, &project.Priority, &project.Progress,
			&project.StartDate, &project.EndDate, &project.Budget,
			&project.CreatedAt, &project.UpdatedAt, &project.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan project: %w", err)
		}

		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return projects, total, nil
}

// GetByEnterpriseID gets projects by enterprise ID with pagination (only non-deleted)
func (r *PostgresProjectRepository) GetByEnterpriseID(ctx context.Context, enterpriseID int, limit, offset int) ([]*models.Project, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM projects WHERE enterprise_id = $1 AND deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, enterpriseID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get project count: %w", err)
	}

	// Get projects with pagination
	query := `
		SELECT id, project_number, name, description, owner_id, company_id, enterprise_id, status, priority, progress, start_date, end_date, budget, created_at, updated_at, deleted_at
		FROM projects 
		WHERE enterprise_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, enterpriseID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list projects: %w", err)
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		project := &models.Project{}

		err := rows.Scan(
			&project.ID, &project.ProjectNumber, &project.Name, &project.Description, &project.OwnerID,
			&project.CompanyID, &project.EnterpriseID, &project.Status, &project.Priority, &project.Progress,
			&project.StartDate, &project.EndDate, &project.Budget,
			&project.CreatedAt, &project.UpdatedAt, &project.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan project: %w", err)
		}

		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return projects, total, nil
}

// GetPaginated gets projects with pagination, search, filtering and sorting
func (r *PostgresProjectRepository) GetPaginated(ctx context.Context, userID int, offset, pageSize int, search, status, sortBy, sortOrder string) ([]*models.Project, int, error) {
	// Build WHERE clause with conditions
	whereConditions := []string{"deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	// Filter by ownership or membership if user ID provided
	if userID > 0 {
		// Include projects owned by the user OR where the user is a member in project_users
		whereConditions = append(whereConditions, fmt.Sprintf("(owner_id = $%d OR EXISTS (SELECT 1 FROM project_users pu WHERE pu.project_id = projects.id AND pu.user_id = $%d))", argIndex, argIndex+1))
		args = append(args, userID, userID)
		argIndex += 2
	}

	// Add search condition
	if search != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(name ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+search+"%")
		argIndex++
	}

	// Add status filter
	if status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	whereClause := "WHERE " + whereConditions[0]
	for i := 1; i < len(whereConditions); i++ {
		whereClause += " AND " + whereConditions[i]
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM projects %s", whereClause)
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, args...)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get project count: %w", err)
	}

	// Build ORDER BY clause
	orderBy := "ORDER BY updated_at DESC" // default
	if sortBy != "" {
		validSortFields := map[string]bool{
			"name": true, "status": true, "priority": true, "progress": true,
			"created_at": true, "updated_at": true, "start_date": true, "end_date": true,
		}
		if validSortFields[sortBy] {
			direction := "DESC"
			if sortOrder == "asc" {
				direction = "ASC"
			}
			orderBy = fmt.Sprintf("ORDER BY %s %s", sortBy, direction)
		}
	}

	// Get projects with pagination
	query := fmt.Sprintf(`
		SELECT id, project_number, name, description, owner_id, company_id, status, priority, progress, start_date, end_date, budget, created_at, updated_at, deleted_at
		FROM projects 
		%s
		%s
		LIMIT $%d OFFSET $%d`, whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list projects: %w", err)
	}
	defer rows.Close()

	// Initialize as empty slice to ensure JSON encodes [] instead of null when no results
	projects := make([]*models.Project, 0)
	for rows.Next() {
		project := &models.Project{}

		err := rows.Scan(
			&project.ID, &project.ProjectNumber, &project.Name, &project.Description, &project.OwnerID,
			&project.CompanyID, &project.Status, &project.Priority, &project.Progress,
			&project.StartDate, &project.EndDate, &project.Budget,
			&project.CreatedAt, &project.UpdatedAt, &project.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan project: %w", err)
		}

		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return projects, total, nil
}

// GetPaginatedWithCompany gets projects with pagination and joins company info (company_name)
// If companyID is provided and > 0, filters projects to only that company (for enterprise user isolation)
func (r *PostgresProjectRepository) GetPaginatedWithCompany(ctx context.Context, userID int, offset, pageSize int, search, status, sortBy, sortOrder string, companyID *int, enterpriseID *int) ([]*models.ProjectWithCompany, int, error) {
	// Build WHERE clause with conditions
	whereConditions := []string{"p.deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	// Data isolation: prioritize enterprise_id over company_id
	if enterpriseID != nil && *enterpriseID > 0 {
		// Filter by enterprise_id for enterprise impersonation mode
		whereConditions = append(whereConditions, fmt.Sprintf("p.enterprise_id = $%d", argIndex))
		args = append(args, *enterpriseID)
		argIndex++
	} else if companyID != nil && *companyID > 0 {
		// Filter by company_id for legacy company isolation
		whereConditions = append(whereConditions, fmt.Sprintf("p.company_id = $%d", argIndex))
		args = append(args, *companyID)
		argIndex++
	} else if userID > 0 {
		// Filter by ownership or membership if user ID provided (for non-admin users)
		whereConditions = append(whereConditions, fmt.Sprintf("(p.owner_id = $%d OR EXISTS (SELECT 1 FROM project_users pu WHERE pu.project_id = p.id AND pu.user_id = $%d))", argIndex, argIndex+1))
		args = append(args, userID, userID)
		argIndex += 2
	}
	// If userID == 0 (admin/super_admin), no user-based filtering - show all projects

	// Add search condition
	if search != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(p.name ILIKE $%d OR p.description ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+search+"%")
		argIndex++
	}

	// Add status filter
	if status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("p.status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	whereClause := "WHERE " + whereConditions[0]
	for i := 1; i < len(whereConditions); i++ {
		whereClause += " AND " + whereConditions[i]
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM projects p %s", whereClause)
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, args...)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get project count: %w", err)
	}

	// Build ORDER BY clause
	orderBy := "ORDER BY p.updated_at DESC" // default
	if sortBy != "" {
		validSortFields := map[string]bool{
			"name": true, "status": true, "priority": true, "progress": true,
			"created_at": true, "updated_at": true, "start_date": true, "end_date": true,
		}
		if validSortFields[sortBy] {
			direction := "DESC"
			if sortOrder == "asc" {
				direction = "ASC"
			}
			orderBy = fmt.Sprintf("ORDER BY p.%s %s", sortBy, direction)
		}
	}

	// 🚀 PERFORMANCE OPTIMIZATION: Two-stage query approach
	// Stage 1: Get paginated project IDs first (fast, uses index)
	projectIDsQuery := fmt.Sprintf(`
		SELECT p.id
		FROM projects p
		%s
		%s
		LIMIT $%d OFFSET $%d`, whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, pageSize, offset)

	idRows, err := exec.QueryContext(ctx, projectIDsQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get project IDs: %w", err)
	}

	projectIDs := make([]int, 0, pageSize)
	for idRows.Next() {
		var id int
		if err := idRows.Scan(&id); err != nil {
			idRows.Close()
			return nil, 0, fmt.Errorf("failed to scan project ID: %w", err)
		}
		projectIDs = append(projectIDs, id)
	}
	idRows.Close()

	if err := idRows.Err(); err != nil {
		return nil, 0, fmt.Errorf("project IDs rows error: %w", err)
	}

	// If no projects found, return empty result
	if len(projectIDs) == 0 {
		return []*models.ProjectWithCompany{}, total, nil
	}

	// Stage 2: Get full project details with stats ONLY for current page projects
	// Build three separate IN clauses with different placeholder numbers
	// Each IN clause needs unique parameter placeholders
	placeholders1 := make([]string, len(projectIDs)) // For tasks.project_id
	placeholders2 := make([]string, len(projectIDs)) // For project_users.project_id
	placeholders3 := make([]string, len(projectIDs)) // For p.id

	for i := range projectIDs {
		placeholders1[i] = fmt.Sprintf("$%d", i+1)
		placeholders2[i] = fmt.Sprintf("$%d", len(projectIDs)+i+1)
		placeholders3[i] = fmt.Sprintf("$%d", 2*len(projectIDs)+i+1)
	}

	inClause1 := fmt.Sprintf("(%s)", strings.Join(placeholders1, ","))
	inClause2 := fmt.Sprintf("(%s)", strings.Join(placeholders2, ","))
	inClause3 := fmt.Sprintf("(%s)", strings.Join(placeholders3, ","))

	// Get project details with optimized stats (only for current page)
	detailsQuery := fmt.Sprintf(`
		SELECT
			p.id, p.project_number, p.name, p.description, p.owner_id, p.company_id, p.status, p.priority, p.progress, p.start_date, p.end_date, p.budget, p.created_at, p.updated_at, p.deleted_at,
			COALESCE(e.name, c.company_name, '未分配企业') AS company_name,
			COALESCE(task_counts.task_count, 0) AS task_count,
			COALESCE(member_counts.member_count, 0) AS member_count
		FROM projects p
		LEFT JOIN customers c ON p.company_id = c.id AND c.deleted_at IS NULL
		LEFT JOIN enterprises e ON p.enterprise_id = e.id AND e.deleted_at IS NULL
		LEFT JOIN (
			SELECT project_id, COUNT(*) AS task_count
			FROM tasks
			WHERE deleted_at IS NULL AND project_id IN %s
			GROUP BY project_id
		) task_counts ON task_counts.project_id = p.id
		LEFT JOIN (
			SELECT project_id, COUNT(DISTINCT user_id) AS member_count
			FROM project_users
			WHERE project_id IN %s
			GROUP BY project_id
		) member_counts ON member_counts.project_id = p.id
		WHERE p.id IN %s`, inClause1, inClause2, inClause3)

	// Append project IDs three times for the three IN clauses
	detailsArgs := make([]interface{}, 0, len(projectIDs)*3)
	for _, id := range projectIDs {
		detailsArgs = append(detailsArgs, id)
	}
	for _, id := range projectIDs {
		detailsArgs = append(detailsArgs, id)
	}
	for _, id := range projectIDs {
		detailsArgs = append(detailsArgs, id)
	}

	rows, err := exec.QueryContext(ctx, detailsQuery, detailsArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list projects with company info: %w", err)
	}
	defer rows.Close()

	// Create map to preserve original order
	projectMap := make(map[int]*models.ProjectWithCompany)
	for rows.Next() {
		projectWithCompany := &models.ProjectWithCompany{}

		err := rows.Scan(
			&projectWithCompany.ID, &projectWithCompany.ProjectNumber, &projectWithCompany.Name, &projectWithCompany.Description,
			&projectWithCompany.OwnerID, &projectWithCompany.CompanyID, &projectWithCompany.Status,
			&projectWithCompany.Priority, &projectWithCompany.Progress, &projectWithCompany.StartDate,
			&projectWithCompany.EndDate, &projectWithCompany.Budget, &projectWithCompany.CreatedAt,
			&projectWithCompany.UpdatedAt, &projectWithCompany.DeletedAt,
			&projectWithCompany.CompanyName,
			&projectWithCompany.TaskCount,
			&projectWithCompany.MemberCount,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan project with company: %w", err)
		}

		projectMap[projectWithCompany.ID] = projectWithCompany
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	// Rebuild projects in original order
	projects := make([]*models.ProjectWithCompany, 0, len(projectIDs))
	for _, id := range projectIDs {
		if project, exists := projectMap[id]; exists {
			projects = append(projects, project)
		}
	}

	return projects, total, nil
}

// Update updates a project
func (r *PostgresProjectRepository) Update(ctx context.Context, project *models.Project) (*models.Project, error) {
	query := `
		UPDATE projects 
		SET project_number = $2, name = $3, description = $4, company_id = $5, enterprise_id = $6, status = $7, priority = $8, 
		    progress = $9, start_date = $10, end_date = $11, budget = $12, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		project.ID, project.ProjectNumber, project.Name, project.Description, project.CompanyID, project.EnterpriseID,
		project.Status, project.Priority, project.Progress, project.StartDate,
		project.EndDate, project.Budget)

	err := row.Scan(&project.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	return project, nil
}

// Delete soft deletes a project (sets deleted_at timestamp)
func (r *PostgresProjectRepository) Delete(ctx context.Context, id int) error {
	log.Printf("Executing delete for project ID: %d", id)

	query := `UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	if exec == nil {
		return fmt.Errorf("database connection is nil")
	}

	log.Printf("Executing SQL query: %s with id=%d", query, id)
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		log.Printf("Database error during project delete: %v", err)
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	log.Printf("Project delete affected %d rows", rowsAffected)

	if rowsAffected == 0 {
		return fmt.Errorf("project not found or already deleted")
	}

	return nil
}

// List gets all projects with pagination (原始方法，保持兼容性)
func (r *PostgresProjectRepository) List(ctx context.Context, limit, offset int) ([]*models.Project, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get project count: %w", err)
	}

	// Get projects with pagination
	query := `
		SELECT id, project_number, name, description, owner_id, company_id, status, priority, progress, start_date, end_date, budget, created_at, updated_at, deleted_at
		FROM projects 
		WHERE deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list projects: %w", err)
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		project := &models.Project{}

		err := rows.Scan(
			&project.ID, &project.ProjectNumber, &project.Name, &project.Description, &project.OwnerID,
			&project.CompanyID, &project.Status, &project.Priority, &project.Progress,
			&project.StartDate, &project.EndDate, &project.Budget,
			&project.CreatedAt, &project.UpdatedAt, &project.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan project: %w", err)
		}

		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return projects, total, nil
}

// ListWithCompanyInfo 新增方法：获取包含客户信息的项目列表
func (r *PostgresProjectRepository) ListWithCompanyInfo(ctx context.Context, limit, offset int) ([]*models.ProjectWithCompany, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get project count: %w", err)
	}

	// Get projects with company information using LEFT JOIN
	query := `
		SELECT 
			p.id, p.project_number, p.name, p.description, p.owner_id, p.company_id, 
			p.status, p.priority, p.progress, p.start_date, p.end_date, 
			p.budget, p.created_at, p.updated_at, p.deleted_at,
			c.company_name
		FROM projects p
		LEFT JOIN customers c ON p.company_id = c.id AND c.deleted_at IS NULL
		WHERE p.deleted_at IS NULL
		ORDER BY p.created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list projects with company info: %w", err)
	}
	defer rows.Close()

	var projects []*models.ProjectWithCompany
	for rows.Next() {
		projectWithCompany := &models.ProjectWithCompany{}

		err := rows.Scan(
			&projectWithCompany.ID, &projectWithCompany.ProjectNumber, &projectWithCompany.Name, &projectWithCompany.Description,
			&projectWithCompany.OwnerID, &projectWithCompany.CompanyID, &projectWithCompany.Status,
			&projectWithCompany.Priority, &projectWithCompany.Progress, &projectWithCompany.StartDate,
			&projectWithCompany.EndDate, &projectWithCompany.Budget, &projectWithCompany.CreatedAt,
			&projectWithCompany.UpdatedAt, &projectWithCompany.DeletedAt,
			&projectWithCompany.CompanyName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan project with company: %w", err)
		}

		projects = append(projects, projectWithCompany)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return projects, total, nil
}

// GetRecycledProjects gets all deleted projects with pagination
func (r *PostgresProjectRepository) GetRecycledProjects(ctx context.Context, limit, offset int) ([]*models.RecycledProject, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM recycled_projects`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get recycled project count: %w", err)
	}

	// Get recycled projects with pagination
	query := `
		SELECT id, name, description, owner_id, owner_username, 
		       created_at, updated_at, deleted_at, deleted_tasks_count
		FROM recycled_projects
		ORDER BY deleted_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list recycled projects: %w", err)
	}
	defer rows.Close()

	var projects []*models.RecycledProject
	for rows.Next() {
		project := &models.RecycledProject{}

		err := rows.Scan(
			&project.ID, &project.Name, &project.Description, &project.OwnerID,
			&project.OwnerUsername, &project.CreatedAt, &project.UpdatedAt,
			&project.DeletedAt, &project.DeletedTasksCount,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan recycled project: %w", err)
		}

		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return projects, total, nil
}

// RestoreProject restores a deleted project
func (r *PostgresProjectRepository) RestoreProject(ctx context.Context, id int) error {
	query := `UPDATE projects SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found in recycle bin")
	}

	return nil
}

// HardDeleteProject permanently deletes a project
func (r *PostgresProjectRepository) HardDeleteProject(ctx context.Context, id int) error {
	query := `DELETE FROM projects WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found in recycle bin")
	}

	return nil
}

// GetProjectsByMemberUserID gets all projects where the user is a member (through project_members table)
func (r *PostgresProjectRepository) GetProjectsByMemberUserID(ctx context.Context, userID int) ([]map[string]interface{}, error) {
	query := `
		SELECT
			p.id,
			p.name,
			p.status,
			p.created_at,
			p.updated_at,
			pm.created_at as joined_at,
			r.name as role_name
		FROM projects p
		INNER JOIN project_members pm ON p.id = pm.project_id
		LEFT JOIN roles r ON pm.role_id = r.id
		WHERE pm.user_id = $1
			AND p.deleted_at IS NULL
		ORDER BY pm.created_at DESC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user projects: %w", err)
	}
	defer rows.Close()

	var projects []map[string]interface{}
	for rows.Next() {
		var (
			id        int
			name      string
			status    string
			createdAt sql.NullTime
			updatedAt sql.NullTime
			joinedAt  sql.NullTime
			roleName  sql.NullString
		)

		err := rows.Scan(&id, &name, &status, &createdAt, &updatedAt, &joinedAt, &roleName)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project row: %w", err)
		}

		// Determine last_access (for now, use joinedAt as a placeholder)
		var lastAccess *string
		if joinedAt.Valid {
			lastAccessStr := joinedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			lastAccess = &lastAccessStr
		}

		project := map[string]interface{}{
			"id":     id,
			"name":   name,
			"status": status,
		}

		if roleName.Valid {
			project["role"] = roleName.String
		} else {
			project["role"] = "成员"
		}

		if lastAccess != nil {
			project["last_access"] = *lastAccess
		}

		projects = append(projects, project)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating project rows: %w", err)
	}

	return projects, nil
}
