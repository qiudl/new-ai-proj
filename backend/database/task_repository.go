package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// PostgresTaskRepository implements TaskRepository using PostgreSQL
type PostgresTaskRepository struct {
	db interface{}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresTaskRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new task
func (r *PostgresTaskRepository) Create(ctx context.Context, task *models.Task) (*models.Task, error) {
	customFieldsJSON, err := json.Marshal(task.CustomFields)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal custom fields: %w", err)
	}

	query := `
		INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, custom_fields)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		task.ProjectID, task.Title, task.Description, task.Status,
		task.AssigneeID, task.DueDate, customFieldsJSON)

	err = row.Scan(&task.ID, &task.CreatedAt)
	task.UpdatedAt = task.CreatedAt
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return task, nil
}

// GetByID gets a task by ID (only non-deleted)
func (r *PostgresTaskRepository) GetByID(ctx context.Context, id int) (*models.Task, error) {
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date, 
		       custom_fields, created_at, deleted_at
		FROM tasks WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	task := &models.Task{}
	var customFieldsJSON []byte
	var assigneeID sql.NullInt64
	var dueDate sql.NullTime

	err := row.Scan(
		&task.ID, &task.ProjectID, &task.Title, &task.Description,
		&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
		&task.CreatedAt, &task.DeletedAt,
	)
	task.UpdatedAt = task.CreatedAt

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("task not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	if assigneeID.Valid {
		intVal := int(assigneeID.Int64)
		task.AssigneeID = &intVal
	}
	if dueDate.Valid {
		task.DueDate = &dueDate.Time
	}

	if len(customFieldsJSON) > 0 {
		if err := json.Unmarshal(customFieldsJSON, &task.CustomFields); err != nil {
			return nil, fmt.Errorf("failed to unmarshal custom fields: %w", err)
		}
	}

	return task, nil
}

// GetByProjectID gets tasks by project ID with pagination (only non-deleted)
func (r *PostgresTaskRepository) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, projectID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get task count: %w", err)
	}

	// Get tasks with pagination (matching actual table structure)
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date, 
		       custom_fields, created_at, created_at as updated_at, deleted_at
		FROM tasks 
		WHERE project_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, projectID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var customFieldsJSON []byte
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan task: %w", err)
		}

		if assigneeID.Valid {
			intVal := int(assigneeID.Int64)
			task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}

		if len(customFieldsJSON) > 0 {
			if err := json.Unmarshal(customFieldsJSON, &task.CustomFields); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return tasks, total, nil
}

// Update updates a task
func (r *PostgresTaskRepository) Update(ctx context.Context, task *models.Task) (*models.Task, error) {
	customFieldsJSON, err := json.Marshal(task.CustomFields)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal custom fields: %w", err)
	}

	query := `
		UPDATE tasks 
		SET title = $2, description = $3, assignee_id = $4, status = $5,
		    due_date = $6, custom_fields = $7
		WHERE id = $1
		RETURNING created_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		task.ID, task.Title, task.Description, task.AssigneeID,
		task.Status, task.DueDate, customFieldsJSON)

	err = row.Scan(&task.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return task, nil
}

// Delete soft deletes a task (sets deleted_at timestamp)
func (r *PostgresTaskRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

// BulkCreate creates multiple tasks in a single transaction
func (r *PostgresTaskRepository) BulkCreate(ctx context.Context, tasks []*models.Task) ([]*models.Task, error) {
	if len(tasks) == 0 {
		return tasks, nil
	}

	query := `
		INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, custom_fields)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	exec := r.getExecer()

	for i, task := range tasks {
		customFieldsJSON, err := json.Marshal(task.CustomFields)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal custom fields for task %d: %w", i, err)
		}

		row := exec.QueryRowContext(ctx, query,
			task.ProjectID, task.Title, task.Description, task.Status,
			task.AssigneeID, task.DueDate, customFieldsJSON)

		err = row.Scan(&task.ID, &task.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to create task %d: %w", i, err)
		}
		task.UpdatedAt = task.CreatedAt
	}

	return tasks, nil
}

// UpdateStatus updates task status only
func (r *PostgresTaskRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	query := `
		UPDATE tasks 
		SET status = $2
		WHERE id = $1`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id, status)
	if err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found")
	}

	return nil
}

// GetByStatus gets tasks by status with pagination
func (r *PostgresTaskRepository) GetByStatus(ctx context.Context, status string, limit, offset int) ([]*models.Task, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM tasks WHERE status = $1`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, status)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get task count: %w", err)
	}

	// Get tasks with pagination (matching actual table structure)
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date, 
		       custom_fields, created_at, created_at as updated_at
		FROM tasks 
		WHERE status = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, status, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var customFieldsJSON []byte
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan task: %w", err)
		}

		if assigneeID.Valid {
			intVal := int(assigneeID.Int64)
			task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}

		if len(customFieldsJSON) > 0 {
			if err := json.Unmarshal(customFieldsJSON, &task.CustomFields); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return tasks, total, nil
}