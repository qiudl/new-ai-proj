package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
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
		INSERT INTO projects (name, description, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		project.Name, project.Description, project.OwnerID)

	err := row.Scan(&project.ID, &project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return project, nil
}

// GetByID gets a project by ID (only non-deleted)
func (r *PostgresProjectRepository) GetByID(ctx context.Context, id int) (*models.Project, error) {
	query := `
		SELECT id, name, description, owner_id, created_at, updated_at, deleted_at
		FROM projects WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	project := &models.Project{}

	err := row.Scan(
		&project.ID, &project.Name, &project.Description, &project.OwnerID,
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
		SELECT id, name, description, owner_id, created_at, updated_at, deleted_at
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
			&project.ID, &project.Name, &project.Description, &project.OwnerID,
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

// Update updates a project
func (r *PostgresProjectRepository) Update(ctx context.Context, project *models.Project) (*models.Project, error) {
	query := `
		UPDATE projects 
		SET name = $2, description = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		project.ID, project.Name, project.Description)

	err := row.Scan(&project.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	return project, nil
}

// Delete soft deletes a project (sets deleted_at timestamp)
func (r *PostgresProjectRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found")
	}

	return nil
}

// List gets all projects with pagination
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
		SELECT id, name, description, owner_id, created_at, updated_at, deleted_at
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
			&project.ID, &project.Name, &project.Description, &project.OwnerID,
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