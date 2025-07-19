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
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		task.ProjectID, task.Title, task.Description, task.Status,
		task.AssigneeID, task.DueDate, customFieldsJSON)

	err = row.Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return task, nil
}

// GetByID gets a task by ID
func (r *PostgresTaskRepository) GetByID(ctx context.Context, id int) (*models.Task, error) {
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date, 
		       custom_fields, created_at, updated_at
		FROM tasks WHERE id = $1`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	task := &models.Task{}
	var customFieldsJSON []byte
	var assigneeID sql.NullInt64
	var dueDate sql.NullTime

	err := row.Scan(
		&task.ID, &task.ProjectID, &task.Title, &task.Description,
		&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
		&task.CreatedAt, &task.UpdatedAt,
	)

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

// GetByProjectID gets tasks by project ID with pagination
func (r *PostgresTaskRepository) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM tasks WHERE project_id = $1`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, projectID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get task count: %w", err)
	}

	// Get tasks with pagination
	query := `
		SELECT id, title, description, project_id, assigned_to, status, priority,
		       estimated_hours, actual_hours, progress, due_date, tags, metadata,
		       created_at, updated_at
		FROM tasks 
		WHERE project_id = $1
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
		var metadataJSON, tagsJSON []byte
		var assignedTo sql.NullInt64
		var dueDate sql.NullTime

		err := rows.Scan(
			&task.ID, &task.Title, &task.Description, &task.ProjectID,
			&assignedTo, &task.Status, &task.Priority, &task.EstimatedHours,
			&task.ActualHours, &task.Progress, &dueDate, &tagsJSON,
			&metadataJSON, &task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan task: %w", err)
		}

		if assignedTo.Valid {
			intVal := int(assignedTo.Int64); task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}

		if len(tagsJSON) > 0 {
			if err := json.Unmarshal(tagsJSON, &task.Tags); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal tags: %w", err)
			}
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &task.Metadata); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal metadata: %w", err)
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
	metadataJSON, err := json.Marshal(task.Metadata)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	tagsJSON, err := json.Marshal(task.Tags)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal tags: %w", err)
	}

	query := `
		UPDATE tasks 
		SET title = $2, description = $3, assigned_to = $4, status = $5,
		    priority = $6, estimated_hours = $7, actual_hours = $8, 
		    progress = $9, due_date = $10, tags = $11, metadata = $12,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		task.ID, task.Title, task.Description, task.AssigneeID,
		task.Status, task.Priority, task.EstimatedHours, task.ActualHours,
		task.Progress, task.DueDate, tagsJSON, metadataJSON)

	err = row.Scan(&task.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return task, nil
}

// Delete deletes a task
func (r *PostgresTaskRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM tasks WHERE id = $1`

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
		INSERT INTO tasks (title, description, project_id, assigned_to, status, 
		                  priority, estimated_hours, actual_hours, progress, 
		                  due_date, tags, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, created_at, updated_at`

	exec := r.getExecer()

	for i, task := range tasks {
		metadataJSON, err := json.Marshal(task.Metadata)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal metadata for task %d: %w", i, err)
		}

		tagsJSON, err := json.Marshal(task.Tags)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal tags for task %d: %w", i, err)
		}

		row := exec.QueryRowContext(ctx, query,
			task.Title, task.Description, task.ProjectID, task.AssigneeID,
			task.Status, task.Priority, task.EstimatedHours, task.ActualHours,
			task.Progress, task.DueDate, tagsJSON, metadataJSON)

		err = row.Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to create task %d: %w", i, err)
		}
	}

	return tasks, nil
}

// UpdateStatus updates task status only
func (r *PostgresTaskRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	query := `
		UPDATE tasks 
		SET status = $2, updated_at = CURRENT_TIMESTAMP
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

	// Get tasks with pagination
	query := `
		SELECT id, title, description, project_id, assigned_to, status, priority,
		       estimated_hours, actual_hours, progress, due_date, tags, metadata,
		       created_at, updated_at
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
		var metadataJSON, tagsJSON []byte
		var assignedTo sql.NullInt64
		var dueDate sql.NullTime

		err := rows.Scan(
			&task.ID, &task.Title, &task.Description, &task.ProjectID,
			&assignedTo, &task.Status, &task.Priority, &task.EstimatedHours,
			&task.ActualHours, &task.Progress, &dueDate, &tagsJSON,
			&metadataJSON, &task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan task: %w", err)
		}

		if assignedTo.Valid {
			intVal := int(assignedTo.Int64); task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}

		if len(tagsJSON) > 0 {
			if err := json.Unmarshal(tagsJSON, &task.Tags); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal tags: %w", err)
			}
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &task.Metadata); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return tasks, total, nil
}