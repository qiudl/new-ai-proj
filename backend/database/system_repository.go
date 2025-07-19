package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// PostgresSystemRepository handles system operations like audit logs and recycled items
type PostgresSystemRepository struct {
	db interface{}
}

// NewSystemRepository creates a new PostgresSystemRepository
func NewSystemRepository(db interface{}) *PostgresSystemRepository {
	return &PostgresSystemRepository{db: db}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *PostgresSystemRepository) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// GetRecycledTasks gets all deleted tasks with pagination
func (r *PostgresSystemRepository) GetRecycledTasks(ctx context.Context, limit, offset int) ([]*models.RecycledTask, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM recycled_tasks`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get recycled task count: %w", err)
	}

	// Get recycled tasks with pagination
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date, 
		       custom_fields, created_at, deleted_at, project_name, assignee_username
		FROM recycled_tasks
		ORDER BY deleted_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list recycled tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.RecycledTask
	for rows.Next() {
		task := &models.RecycledTask{}
		var customFieldsJSON []byte
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime
		var assigneeUsername sql.NullString

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&task.CreatedAt, &task.DeletedAt, &task.ProjectName, &assigneeUsername,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan recycled task: %w", err)
		}

		if assigneeID.Valid {
			intVal := int(assigneeID.Int64)
			task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		if assigneeUsername.Valid {
			task.AssigneeUsername = &assigneeUsername.String
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

// RestoreTask restores a deleted task
func (r *PostgresSystemRepository) RestoreTask(ctx context.Context, id int) error {
	query := `UPDATE tasks SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found in recycle bin")
	}

	return nil
}

// HardDeleteTask permanently deletes a task
func (r *PostgresSystemRepository) HardDeleteTask(ctx context.Context, id int) error {
	query := `DELETE FROM tasks WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("task not found in recycle bin")
	}

	return nil
}

// GetAuditLogs gets system audit logs with pagination
func (r *PostgresSystemRepository) GetAuditLogs(ctx context.Context, limit, offset int) ([]*models.AuditLog, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM system_audit_log`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get audit log count: %w", err)
	}

	// Get audit logs with pagination
	query := `
		SELECT id, user_id, action, entity_type, entity_id, entity_data, 
		       ip_address, user_agent, created_at
		FROM system_audit_log
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*models.AuditLog
	for rows.Next() {
		log := &models.AuditLog{}
		var userID sql.NullInt64
		var entityDataJSON []byte
		var ipAddress, userAgent sql.NullString

		err := rows.Scan(
			&log.ID, &userID, &log.Action, &log.EntityType, &log.EntityID,
			&entityDataJSON, &ipAddress, &userAgent, &log.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit log: %w", err)
		}

		if userID.Valid {
			intVal := int(userID.Int64)
			log.UserID = &intVal
		}
		if ipAddress.Valid {
			log.IPAddress = &ipAddress.String
		}
		if userAgent.Valid {
			log.UserAgent = &userAgent.String
		}

		if len(entityDataJSON) > 0 {
			if err := json.Unmarshal(entityDataJSON, &log.EntityData); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal entity data: %w", err)
			}
		}

		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return logs, total, nil
}

// LogAction creates a new audit log entry
func (r *PostgresSystemRepository) LogAction(ctx context.Context, userID *int, action, entityType string, entityID int, entityData interface{}, ipAddress, userAgent string) error {
	// Convert entityData to map[string]interface{} if it's not nil
	var entityDataMap map[string]interface{}
	if entityData != nil {
		if dataMap, ok := entityData.(map[string]interface{}); ok {
			entityDataMap = dataMap
		} else {
			// If it's not a map, convert to a generic map
			entityDataMap = map[string]interface{}{"data": entityData}
		}
	}
	
	log := &models.AuditLog{
		UserID:     userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		EntityData: entityDataMap,
	}
	if ipAddress != "" {
		log.IPAddress = &ipAddress
	}
	if userAgent != "" {
		log.UserAgent = &userAgent
	}
	
	return r.createAuditLog(ctx, log)
}

// createAuditLog creates a new audit log entry (internal method)
func (r *PostgresSystemRepository) createAuditLog(ctx context.Context, log *models.AuditLog) error {
	entityDataJSON, err := json.Marshal(log.EntityData)
	if err != nil {
		return fmt.Errorf("failed to marshal entity data: %w", err)
	}

	query := `
		INSERT INTO system_audit_log (user_id, action, entity_type, entity_id, entity_data, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	exec := r.getExecer()
	_, err = exec.ExecContext(ctx, query,
		log.UserID, log.Action, log.EntityType, log.EntityID,
		entityDataJSON, log.IPAddress, log.UserAgent)

	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}


// GetRecycledProjects gets all deleted projects with pagination
func (r *PostgresSystemRepository) GetRecycledProjects(ctx context.Context, limit, offset int) ([]*models.RecycledProject, int, error) {
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
		SELECT id, name, description, owner_id, owner_username, created_at, 
		       updated_at, deleted_at, deleted_tasks_count
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
func (r *PostgresSystemRepository) RestoreProject(ctx context.Context, id int) error {
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
func (r *PostgresSystemRepository) HardDeleteProject(ctx context.Context, id int) error {
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