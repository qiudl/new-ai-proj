package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

// GetChildren gets direct children of a task
func (r *PostgresTaskRepository) GetChildren(ctx context.Context, parentID int) ([]*models.Task, error) {
	query := `
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date, 
		       t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.dependencies, t.estimated_hours, t.priority, t.tags,
		       t.created_at, t.updated_at, t.deleted_at,
		       COALESCE(c.children_count, 0) as children_count,
		       u.username as assignee_name
		FROM tasks t
		LEFT JOIN (
			SELECT parent_id, COUNT(*) as children_count 
			FROM tasks 
			WHERE deleted_at IS NULL AND parent_id IS NOT NULL 
			GROUP BY parent_id
		) c ON t.id = c.parent_id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.parent_id = $1 AND t.deleted_at IS NULL
		ORDER BY t.sort_order ASC, t.created_at ASC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, parentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var customFieldsJSON []byte
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime
		var parentIDNull sql.NullInt64
		var updatedAt sql.NullTime
		var childrenCount int
		var assigneeName sql.NullString
		var dependenciesJSON []byte
		var estimatedHours sql.NullFloat64
		var priority sql.NullString
		var tagsJSON []byte

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&parentIDNull, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&dependenciesJSON, &estimatedHours, &priority, &tagsJSON,
			&task.CreatedAt, &updatedAt, &task.DeletedAt, &childrenCount, &assigneeName,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan child task: %w", err)
		}

		if assigneeID.Valid {
			intVal := int(assigneeID.Int64)
			task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		if parentIDNull.Valid {
			intVal := int(parentIDNull.Int64)
			task.ParentID = &intVal
		}
		if updatedAt.Valid {
			task.UpdatedAt = updatedAt.Time
		} else {
			task.UpdatedAt = task.CreatedAt
		}

		// Process AI-enhanced fields
		if estimatedHours.Valid {
			task.EstimatedHours = &estimatedHours.Float64
		}
		if priority.Valid {
			task.Priority = priority.String
		}

		// Initialize Dependencies and Tags
		task.Dependencies = make(models.Dependencies, 0)
		task.Tags = make(models.Tags, 0)

		// Process dependencies and tags JSON fields
		if len(dependenciesJSON) > 0 {
			if err := (&task.Dependencies).Scan(dependenciesJSON); err != nil {
				return nil, fmt.Errorf("failed to unmarshal dependencies: %w", err)
			}
		}
		if len(tagsJSON) > 0 {
			if err := (&task.Tags).Scan(tagsJSON); err != nil {
				return nil, fmt.Errorf("failed to unmarshal tags: %w", err)
			}
		}

		// Initialize custom fields if nil
		if task.CustomFields == nil {
			task.CustomFields = make(models.CustomFields)
		}

		if len(customFieldsJSON) > 0 {
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
				return nil, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		// Set children count and has children flag
		task.ChildrenCount = childrenCount
		task.HasChildren = childrenCount > 0

		// Ensure CustomFields is initialized before setting values
		if task.CustomFields == nil {
			task.CustomFields = make(models.CustomFields)
		}

		// Add children_count and assignee_name to custom fields for frontend access
		task.CustomFields["children_count"] = childrenCount
		if assigneeName.Valid {
			task.CustomFields["assignee_name"] = assigneeName.String
		}

		tasks = append(tasks, task)
	}

	return tasks, rows.Err()
}

// GetRootTasks gets root tasks (tasks without parent) for a project
func (r *PostgresTaskRepository) GetRootTasks(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND parent_id IS NULL AND deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, projectID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get root task count: %w", err)
	}

	query := `
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date, 
		       t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.created_at, t.updated_at, t.deleted_at,
		       COALESCE(c.children_count, 0) as children_count,
		       u.username as assignee_name
		FROM tasks t
		LEFT JOIN (
			SELECT parent_id, COUNT(*) as children_count 
			FROM tasks 
			WHERE deleted_at IS NULL AND parent_id IS NOT NULL 
			GROUP BY parent_id
		) c ON t.id = c.parent_id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.project_id = $1 AND t.parent_id IS NULL AND t.deleted_at IS NULL
		ORDER BY t.sort_order ASC, t.created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, projectID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list root tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var customFieldsJSON []byte
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime
		var parentID sql.NullInt64
		var updatedAt sql.NullTime
		var childrenCount int
		var assigneeName sql.NullString

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&parentID, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&task.CreatedAt, &updatedAt, &task.DeletedAt, &childrenCount, &assigneeName,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan root task: %w", err)
		}

		if assigneeID.Valid {
			intVal := int(assigneeID.Int64)
			task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		if parentID.Valid {
			intVal := int(parentID.Int64)
			task.ParentID = &intVal
		}
		if updatedAt.Valid {
			task.UpdatedAt = updatedAt.Time
		} else {
			task.UpdatedAt = task.CreatedAt
		}

		// Initialize custom fields if nil
		if task.CustomFields == nil {
			task.CustomFields = make(models.CustomFields)
		}

		if len(customFieldsJSON) > 0 {
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		// Set children count and has children flag
		task.ChildrenCount = childrenCount
		task.HasChildren = childrenCount > 0

		// Ensure CustomFields is initialized before setting values
		if task.CustomFields == nil {
			task.CustomFields = make(models.CustomFields)
		}

		// Add children_count and assignee_name to custom fields for frontend access
		task.CustomFields["children_count"] = childrenCount
		if assigneeName.Valid {
			task.CustomFields["assignee_name"] = assigneeName.String
		}

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return tasks, total, nil
}

// GetTaskTree gets the complete task tree for a project
func (r *PostgresTaskRepository) GetTaskTree(ctx context.Context, projectID int) ([]*models.HierarchicalTask, error) {
	// Get all tasks for the project
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date, 
		       custom_fields, parent_id, task_level, sort_order, created_at, updated_at, deleted_at
		FROM tasks 
		WHERE project_id = $1 AND deleted_at IS NULL
		ORDER BY task_level ASC, sort_order ASC, created_at ASC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task tree: %w", err)
	}
	defer rows.Close()

	var allTasks []*models.Task
	taskMap := make(map[int]*models.HierarchicalTask)
	
	for rows.Next() {
		task := &models.Task{}
		var customFieldsJSON []byte
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime
		var parentID sql.NullInt64
		var updatedAt sql.NullTime

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&parentID, &task.TaskLevel, &task.SortOrder,
			&task.CreatedAt, &updatedAt, &task.DeletedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan task: %w", err)
		}

		if assigneeID.Valid {
			intVal := int(assigneeID.Int64)
			task.AssigneeID = &intVal
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		if parentID.Valid {
			intVal := int(parentID.Int64)
			task.ParentID = &intVal
		}
		if updatedAt.Valid {
			task.UpdatedAt = updatedAt.Time
		} else {
			task.UpdatedAt = task.CreatedAt
		}

		if len(customFieldsJSON) > 0 {
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
				return nil, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		allTasks = append(allTasks, task)
		taskMap[task.ID] = &models.HierarchicalTask{Task: task}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	// Build the tree structure
	var rootTasks []*models.HierarchicalTask
	for _, task := range allTasks {
		hierarchicalTask := taskMap[task.ID]
		
		if task.ParentID == nil {
			// Root task
			rootTasks = append(rootTasks, hierarchicalTask)
		} else {
			// Child task - add to parent's children
			if parentTask, exists := taskMap[*task.ParentID]; exists {
				if parentTask.Children == nil {
					parentTask.Children = make([]*models.HierarchicalTask, 0)
				}
				parentTask.Children = append(parentTask.Children, hierarchicalTask)
			}
		}
	}

	return rootTasks, nil
}

// CreateTaskUpdate creates a task update history record
func (r *PostgresTaskRepository) CreateTaskUpdate(ctx context.Context, update *models.TaskUpdate) error {
	query := `
		INSERT INTO task_updates (task_id, update_type, old_value, new_value, updated_by, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		update.TaskID, update.UpdateType, update.OldValue, update.NewValue,
		update.UpdatedBy, update.Notes)

	err := row.Scan(&update.ID, &update.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to create task update: %w", err)
	}

	return nil
}

// GetTaskUpdates gets update history for a task
func (r *PostgresTaskRepository) GetTaskUpdates(ctx context.Context, taskID int, limit, offset int) ([]*models.TaskUpdate, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM task_updates WHERE task_id = $1`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, taskID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get task update count: %w", err)
	}

	query := `
		SELECT tu.id, tu.task_id, tu.update_type, tu.old_value, tu.new_value, 
		       tu.updated_by, tu.notes, tu.created_at, u.username
		FROM task_updates tu
		LEFT JOIN users u ON tu.updated_by = u.id
		WHERE tu.task_id = $1
		ORDER BY tu.created_at DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, taskID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get task updates: %w", err)
	}
	defer rows.Close()

	var updates []*models.TaskUpdate
	for rows.Next() {
		update := &models.TaskUpdate{}
		var updatedBy sql.NullInt64
		var username sql.NullString

		err := rows.Scan(
			&update.ID, &update.TaskID, &update.UpdateType, &update.OldValue,
			&update.NewValue, &updatedBy, &update.Notes, &update.CreatedAt, &username,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan task update: %w", err)
		}

		if updatedBy.Valid {
			intVal := int(updatedBy.Int64)
			update.UpdatedBy = &intVal
		}
		if username.Valid {
			update.UpdatedByUsername = &username.String
		}

		updates = append(updates, update)
	}

	return updates, total, rows.Err()
}

// UpdateTaskUpdateNotes updates the notes field of a task update record
func (r *PostgresTaskRepository) UpdateTaskUpdateNotes(ctx context.Context, updateID int, notes string) error {
	query := `UPDATE task_updates SET notes = $2 WHERE id = $1`
	
	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, updateID, notes)
	if err != nil {
		return fmt.Errorf("failed to update task update notes: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("task update not found")
	}
	
	return nil
}

// DeleteTaskUpdate deletes a task update record (for administrative purposes only)
func (r *PostgresTaskRepository) DeleteTaskUpdate(ctx context.Context, updateID int) error {
	// Note: This is a hard delete since task_updates table doesn't have deleted_at column
	// In production, consider adding a deleted_at column or an admin-only flag
	query := `DELETE FROM task_updates WHERE id = $1`
	
	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, updateID)
	if err != nil {
		return fmt.Errorf("failed to delete task update: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("task update not found")
	}
	
	return nil
}

// CreateTimelineEvent creates a timeline event
func (r *PostgresTaskRepository) CreateTimelineEvent(ctx context.Context, event *models.TimelineEvent) error {
	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO timeline_events (task_id, event_type, event_date, description, user_id, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		event.TaskID, event.EventType, event.EventDate, event.Description,
		event.UserID, metadataJSON)

	err = row.Scan(&event.ID)
	if err != nil {
		return fmt.Errorf("failed to create timeline event: %w", err)
	}

	return nil
}

// GetTaskTimeline gets timeline events for a specific task
func (r *PostgresTaskRepository) GetTaskTimeline(ctx context.Context, taskID int, limit, offset int) ([]*models.TimelineEvent, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM timeline_events WHERE task_id = $1`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, taskID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get timeline event count: %w", err)
	}

	query := `
		SELECT te.id, te.task_id, te.event_type, te.event_date, te.description, 
		       te.user_id, te.metadata, u.username, t.title
		FROM timeline_events te
		LEFT JOIN users u ON te.user_id = u.id
		LEFT JOIN tasks t ON te.task_id = t.id
		WHERE te.task_id = $1
		ORDER BY te.event_date DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, taskID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get task timeline: %w", err)
	}
	defer rows.Close()

	var events []*models.TimelineEvent
	for rows.Next() {
		event := &models.TimelineEvent{}
		var userID sql.NullInt64
		var username sql.NullString
		var taskTitle sql.NullString
		var metadataJSON []byte

		err := rows.Scan(
			&event.ID, &event.TaskID, &event.EventType, &event.EventDate,
			&event.Description, &userID, &metadataJSON, &username, &taskTitle,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan timeline event: %w", err)
		}

		if userID.Valid {
			intVal := int(userID.Int64)
			event.UserID = &intVal
		}
		if username.Valid {
			event.Username = &username.String
		}
		if taskTitle.Valid {
			event.TaskTitle = taskTitle.String
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		events = append(events, event)
	}

	return events, total, rows.Err()
}

// GetProjectTimeline gets timeline events for all tasks in a project
func (r *PostgresTaskRepository) GetProjectTimeline(ctx context.Context, projectID int, limit, offset int) ([]*models.TimelineEvent, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*) 
		FROM timeline_events te
		JOIN tasks t ON te.task_id = t.id
		WHERE t.project_id = $1`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, projectID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get project timeline count: %w", err)
	}

	query := `
		SELECT te.id, te.task_id, te.event_type, te.event_date, te.description, 
		       te.user_id, te.metadata, u.username, t.title
		FROM timeline_events te
		JOIN tasks t ON te.task_id = t.id
		LEFT JOIN users u ON te.user_id = u.id
		WHERE t.project_id = $1
		ORDER BY te.event_date DESC
		LIMIT $2 OFFSET $3`

	rows, err := exec.QueryContext(ctx, query, projectID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get project timeline: %w", err)
	}
	defer rows.Close()

	var events []*models.TimelineEvent
	for rows.Next() {
		event := &models.TimelineEvent{}
		var userID sql.NullInt64
		var username sql.NullString
		var taskTitle sql.NullString
		var metadataJSON []byte

		err := rows.Scan(
			&event.ID, &event.TaskID, &event.EventType, &event.EventDate,
			&event.Description, &userID, &metadataJSON, &username, &taskTitle,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan timeline event: %w", err)
		}

		if userID.Valid {
			intVal := int(userID.Int64)
			event.UserID = &intVal
		}
		if username.Valid {
			event.Username = &username.String
		}
		if taskTitle.Valid {
			event.TaskTitle = taskTitle.String
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &event.Metadata); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		events = append(events, event)
	}

	return events, total, rows.Err()
}