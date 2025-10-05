package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
)

// PostgresTaskRepository implements TaskRepository using PostgreSQL
type PostgresTaskRepository struct {
	db interface{}
}

// NewPostgresTaskRepository creates a new PostgresTaskRepository
func NewPostgresTaskRepository(db interface{}) *PostgresTaskRepository {
	return &PostgresTaskRepository{db: db}
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
	exec := r.getExecer()

	// Check for duplicate task title in the same project
	var existingTaskID int
	checkQuery := `SELECT id FROM tasks WHERE title = $1 AND project_id = $2 AND deleted_at IS NULL LIMIT 1`
	err := exec.QueryRowContext(ctx, checkQuery, task.Title, task.ProjectID).Scan(&existingTaskID)

	if err != sql.ErrNoRows {
		if err != nil {
			return nil, fmt.Errorf("failed to check task title duplication: %w", err)
		}
		// If we found a duplicate task, return error
		return nil, fmt.Errorf("任务标题重复：'%s' 已存在于当前项目中（任务ID: %d）。请修改任务标题后重试，或者查看已存在的任务是否可以复用", task.Title, existingTaskID)
	}

	customFieldsJSON, err := json.Marshal(task.CustomFields)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal custom fields: %w", err)
	}

	query := `
		INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, custom_fields, parent_id, sort_order,
		                   start_datetime, due_datetime, estimated_minutes, actual_minutes, 
		                   time_unit_preference, work_hours_per_day, time_tracking_mode)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at, task_level`

	row := exec.QueryRowContext(ctx, query,
		task.ProjectID, task.Title, task.Description, task.Status,
		task.AssigneeID, task.DueDate, customFieldsJSON, task.ParentID, task.SortOrder,
		task.StartDatetime, task.DueDatetime, task.EstimatedMinutes, task.ActualMinutes,
		task.TimeUnitPreference, task.WorkHoursPerDay, task.TimeTrackingMode)

	err = row.Scan(&task.ID, &task.CreatedAt, &task.TaskLevel)
	task.UpdatedAt = task.CreatedAt
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return task, nil
}

// GetByID gets a task by ID (only non-deleted)
func (r *PostgresTaskRepository) GetByID(ctx context.Context, id int) (*models.Task, error) {
	query := `
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date,
		       t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.start_datetime, t.due_datetime, t.estimated_minutes, t.actual_minutes,
		       t.time_unit_preference, t.work_hours_per_day, t.time_tracking_mode,
		       t.created_at, t.updated_at, t.deleted_at,
		       COALESCE(c.children_count, 0) as children_count,
		       COALESCE(c.completed_children_count, 0) as completed_children_count
		FROM tasks t
		LEFT JOIN (
			SELECT parent_id,
			       COUNT(*) as children_count,
			       COUNT(*) FILTER (WHERE status = 'completed') as completed_children_count
			FROM tasks
			WHERE deleted_at IS NULL AND parent_id IS NOT NULL
			GROUP BY parent_id
		) c ON t.id = c.parent_id
		WHERE t.id = $1 AND t.deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	task := &models.Task{}
	var customFieldsJSON []byte
	var assigneeID sql.NullInt64
	var dueDate sql.NullTime
	var parentID sql.NullInt64
	var updatedAt sql.NullTime
	var startDatetime sql.NullTime
	var dueDatetime sql.NullTime
	var timeUnitPreference sql.NullString
	var workHoursPerDay sql.NullFloat64
	var timeTrackingMode sql.NullString
	var childrenCount int
	var completedChildrenCount int

	err := row.Scan(
		&task.ID, &task.ProjectID, &task.Title, &task.Description,
		&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
		&parentID, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
		&startDatetime, &dueDatetime, &task.EstimatedMinutes, &task.ActualMinutes,
		&timeUnitPreference, &workHoursPerDay, &timeTrackingMode,
		&task.CreatedAt, &updatedAt, &task.DeletedAt, &childrenCount, &completedChildrenCount,
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
	if parentID.Valid {
		intVal := int(parentID.Int64)
		task.ParentID = &intVal
	}
	if updatedAt.Valid {
		task.UpdatedAt = updatedAt.Time
	} else {
		task.UpdatedAt = task.CreatedAt
	}

	// Handle new time management fields
	if startDatetime.Valid {
		task.StartDatetime = &startDatetime.Time
	}
	if dueDatetime.Valid {
		task.DueDatetime = &dueDatetime.Time
	}
	if timeUnitPreference.Valid {
		task.TimeUnitPreference = timeUnitPreference.String
	} else {
		task.TimeUnitPreference = "auto"
	}
	if workHoursPerDay.Valid {
		task.WorkHoursPerDay = workHoursPerDay.Float64
	} else {
		task.WorkHoursPerDay = 8.0
	}
	if timeTrackingMode.Valid {
		task.TimeTrackingMode = timeTrackingMode.String
	} else {
		task.TimeTrackingMode = "manual"
	}

	if len(customFieldsJSON) > 0 {
		if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
			return nil, fmt.Errorf("failed to unmarshal custom fields: %w", err)
		}
	}

	// Set children count and has children flag
	task.ChildrenCount = childrenCount
	task.CompletedChildrenCount = completedChildrenCount
	task.HasChildren = childrenCount > 0

	return task, nil
}

// GetByProjectID gets tasks by project ID with pagination (only non-deleted)
func (r *PostgresTaskRepository) GetByProjectID(ctx context.Context, projectID int, limit, offset int) ([]*models.Task, int, error) {
	// Get total count (exclude archived tasks)
	countQuery := `SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND deleted_at IS NULL AND archived_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery, projectID)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get task count: %w", err)
	}

	// Get tasks with pagination (including all required fields)
	query := `
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date,
		       t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.start_datetime, t.due_datetime, t.estimated_minutes, t.actual_minutes,
		       t.time_unit_preference, t.work_hours_per_day, t.time_tracking_mode,
		       t.created_at, t.updated_at, t.deleted_at,
		       COALESCE(c.children_count, 0) as children_count,
		       COALESCE(c.completed_children_count, 0) as completed_children_count
		FROM tasks t
		LEFT JOIN (
			SELECT parent_id,
			       COUNT(*) as children_count,
			       COUNT(*) FILTER (WHERE status = 'completed') as completed_children_count
			FROM tasks
			WHERE deleted_at IS NULL AND parent_id IS NOT NULL
			GROUP BY parent_id
		) c ON t.id = c.parent_id
		WHERE t.project_id = $1 AND t.deleted_at IS NULL AND t.archived_at IS NULL
		ORDER BY t.created_at DESC
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
		var parentID sql.NullInt64
		var startDatetime sql.NullTime
		var dueDatetime sql.NullTime
		var timeUnitPreference sql.NullString
		var workHoursPerDay sql.NullFloat64
		var timeTrackingMode sql.NullString
		var childrenCount int
		var completedChildrenCount int

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&parentID, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&startDatetime, &dueDatetime, &task.EstimatedMinutes, &task.ActualMinutes,
			&timeUnitPreference, &workHoursPerDay, &timeTrackingMode,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt, &childrenCount, &completedChildrenCount,
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
		if parentID.Valid {
			intVal := int(parentID.Int64)
			task.ParentID = &intVal
		}

		// Handle new time management fields
		if startDatetime.Valid {
			task.StartDatetime = &startDatetime.Time
		}
		if dueDatetime.Valid {
			task.DueDatetime = &dueDatetime.Time
		}
		if timeUnitPreference.Valid {
			task.TimeUnitPreference = timeUnitPreference.String
		} else {
			task.TimeUnitPreference = "auto"
		}
		if workHoursPerDay.Valid {
			task.WorkHoursPerDay = workHoursPerDay.Float64
		} else {
			task.WorkHoursPerDay = 8.0
		}
		if timeTrackingMode.Valid {
			task.TimeTrackingMode = timeTrackingMode.String
		} else {
			task.TimeTrackingMode = "manual"
		}

		if len(customFieldsJSON) > 0 {
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		// Set children count and has children flag
		task.ChildrenCount = childrenCount
		task.CompletedChildrenCount = completedChildrenCount
		task.HasChildren = childrenCount > 0

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return tasks, total, nil
}

// GetAll gets all tasks across all projects with pagination
func (r *PostgresTaskRepository) GetAll(ctx context.Context, limit, offset int) ([]*models.Task, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get task count: %w", err)
	}

	query := `
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date,
		       t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.start_datetime, t.due_datetime, t.estimated_minutes, t.actual_minutes,
		       t.time_unit_preference, t.work_hours_per_day, t.time_tracking_mode,
		       t.created_at, t.updated_at, t.deleted_at,
		       p.name as project_name, u.username as assignee_name,
		       COALESCE(c.children_count, 0) as children_count,
		       COALESCE(c.completed_children_count, 0) as completed_children_count
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN (
			SELECT parent_id,
			       COUNT(*) as children_count,
			       COUNT(*) FILTER (WHERE status = 'completed') as completed_children_count
			FROM tasks
			WHERE deleted_at IS NULL AND parent_id IS NOT NULL
			GROUP BY parent_id
		) c ON t.id = c.parent_id
		WHERE t.deleted_at IS NULL
		ORDER BY t.created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list all tasks: %w", err)
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
		var startDatetime sql.NullTime
		var dueDatetime sql.NullTime
		var timeUnitPreference sql.NullString
		var workHoursPerDay sql.NullFloat64
		var timeTrackingMode sql.NullString
		var projectName sql.NullString
		var assigneeName sql.NullString
		var childrenCount int
		var completedChildrenCount int

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&parentID, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&startDatetime, &dueDatetime, &task.EstimatedMinutes, &task.ActualMinutes,
			&timeUnitPreference, &workHoursPerDay, &timeTrackingMode,
			&task.CreatedAt, &updatedAt, &task.DeletedAt,
			&projectName, &assigneeName, &childrenCount, &completedChildrenCount,
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
		if parentID.Valid {
			intVal := int(parentID.Int64)
			task.ParentID = &intVal
		}
		if updatedAt.Valid {
			task.UpdatedAt = updatedAt.Time
		} else {
			task.UpdatedAt = task.CreatedAt
		}

		// Handle new time management fields
		if startDatetime.Valid {
			task.StartDatetime = &startDatetime.Time
		}
		if dueDatetime.Valid {
			task.DueDatetime = &dueDatetime.Time
		}
		if timeUnitPreference.Valid {
			task.TimeUnitPreference = timeUnitPreference.String
		} else {
			task.TimeUnitPreference = "auto"
		}
		if workHoursPerDay.Valid {
			task.WorkHoursPerDay = workHoursPerDay.Float64
		} else {
			task.WorkHoursPerDay = 8.0
		}
		if timeTrackingMode.Valid {
			task.TimeTrackingMode = timeTrackingMode.String
		} else {
			task.TimeTrackingMode = "manual"
		}

		if len(customFieldsJSON) > 0 {
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		// Assign children_count and has_children to task fields (Android层级任务功能需要)
		task.ChildrenCount = childrenCount
		task.CompletedChildrenCount = completedChildrenCount
		task.HasChildren = childrenCount > 0

		// Add project_name, assignee_name and children_count to custom fields for frontend display
		if task.CustomFields == nil {
			task.CustomFields = make(models.CustomFields)
		}
		if projectName.Valid {
			task.CustomFields["project_name"] = projectName.String
		}
		if assigneeName.Valid {
			task.CustomFields["assignee_name"] = assigneeName.String
		}
		task.CustomFields["children_count"] = childrenCount

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return tasks, total, nil
}

// GetAllFiltered gets all tasks with server-side filtering and sorting (status-driven presets)
func (r *PostgresTaskRepository) GetAllFiltered(ctx context.Context, opts *models.TaskListOptions, limit, offset int) ([]*models.Task, int, error) {
	if limit <= 0 || limit > 1000 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	// Build WHERE conditions
	conditions := []string{"t.deleted_at IS NULL", "t.archived_at IS NULL"}
	args := []interface{}{}
	argIdx := 1

	if opts != nil {
		if opts.ProjectID != nil {
			conditions = append(conditions, fmt.Sprintf("t.project_id = $%d", argIdx))
			args = append(args, *opts.ProjectID)
			argIdx++
		}
		// 企业数据隔离：通过项目的company_id过滤任务 (旧系统)
		if opts.CompanyID != nil {
			conditions = append(conditions, fmt.Sprintf("p.company_id = $%d", argIdx))
			args = append(args, *opts.CompanyID)
			argIdx++
		}
		// 企业数据隔离：通过项目的enterprise_id过滤任务 (新系统)
		if opts.EnterpriseID != nil {
			conditions = append(conditions, fmt.Sprintf("p.enterprise_id = $%d", argIdx))
			args = append(args, *opts.EnterpriseID)
			argIdx++
		}
		if opts.Status != "" {
			conditions = append(conditions, fmt.Sprintf("t.status = $%d", argIdx))
			args = append(args, opts.Status)
			argIdx++
		}
		if opts.Priority != "" {
			conditions = append(conditions, fmt.Sprintf("t.priority = $%d", argIdx))
			args = append(args, opts.Priority)
			argIdx++
		}
		if opts.Assignee != nil {
			conditions = append(conditions, fmt.Sprintf("t.assignee_id = $%d", argIdx))
			args = append(args, *opts.Assignee)
			argIdx++
		}
		if opts.TaskID != nil {
			conditions = append(conditions, fmt.Sprintf("t.id = $%d", argIdx))
			args = append(args, *opts.TaskID)
			argIdx++
		}
		if opts.OnlyRoots {
			conditions = append(conditions, "t.parent_id IS NULL")
		}
		if s := strings.TrimSpace(opts.Search); s != "" {
			like := "%" + s + "%"
			conditions = append(conditions, fmt.Sprintf("(t.title ILIKE $%d OR t.description ILIKE $%d)", argIdx, argIdx+1))
			args = append(args, like, like)
			argIdx += 2
		}

		if opts.Preset != "" {
			switch opts.Preset {
			case "overdue":
				conditions = append(conditions, "t.status NOT IN ('completed','cancelled','archived')")
				conditions = append(conditions, "t.due_date IS NOT NULL AND t.due_date < NOW()")
			case "planning":
				conditions = append(conditions, "t.status = 'planning'")
			case "on_hold":
				conditions = append(conditions, "(t.status = 'on_hold' OR (t.snooze_until IS NOT NULL AND t.snooze_until > NOW()))")
			}
		}
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count first - Join projects table to support company_id filtering
	countQuery := "SELECT COUNT(*) FROM tasks t LEFT JOIN projects p ON t.project_id = p.id " + where
	exec := r.getExecer()
	var total int
	if len(args) > 0 {
		if err := exec.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
			return nil, 0, fmt.Errorf("failed to get task count: %w", err)
		}
	} else {
		if err := exec.QueryRowContext(ctx, countQuery).Scan(&total); err != nil {
			return nil, 0, fmt.Errorf("failed to get task count: %w", err)
		}
	}

	// Sorting (whitelisted to prevent SQL injection)
	// 为了实现根任务按时间倒序的需求，我们需要特殊的排序逻辑
	sortBy := "t.updated_at"
	sortOrder := "DESC"
	useRootTaskOrder := false // 是否使用根任务优先排序

	if opts != nil {
		if opts.SortBy != "" {
			switch opts.SortBy {
			case "id":
				sortBy = "t.id"
			case "title":
				sortBy = "t.title"
			case "status":
				sortBy = "t.status"
			case "due_date":
				sortBy = "t.due_date"
			case "created_at":
				sortBy = "t.created_at"
				useRootTaskOrder = true // 对于创建时间排序，使用根任务优先排序
			case "updated_at":
				// explicit mapping for clarity
				sortBy = "t.updated_at"
			default:
				// fallback to updated_at for unknown values
				sortBy = "t.updated_at"
			}
		}
		if strings.ToLower(opts.SortOrder) == "asc" {
			sortOrder = "ASC"
		}
	}

	// 构建ORDER BY子句
	var orderByClause string
	if useRootTaskOrder {
		// 使用根任务优先的复杂排序逻辑：
		// 1. 先按是否为根任务排序（根任务在前）
		// 2. 再按指定字段和顺序排序
		if sortOrder == "ASC" {
			orderByClause = "CASE WHEN t.parent_id IS NULL THEN 0 ELSE 1 END ASC, " + sortBy + " ASC"
		} else {
			orderByClause = "CASE WHEN t.parent_id IS NULL THEN 0 ELSE 1 END ASC, " + sortBy + " DESC"
		}
	} else {
		orderByClause = fmt.Sprintf("%s %s", sortBy, sortOrder)
	}

	query := fmt.Sprintf(`
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.assignee_id, t.due_date,
		       t.custom_fields, t.parent_id, t.task_level, t.sort_order, t.total_time_seconds,
		       t.start_datetime, t.due_datetime, t.estimated_minutes, t.actual_minutes,
		       t.time_unit_preference, t.work_hours_per_day, t.time_tracking_mode,
		       t.created_at, t.updated_at, t.deleted_at,
		       p.name as project_name, u.username as assignee_name,
		       COALESCE(c.children_count, 0) as children_count,
		       COALESCE(c.completed_children_count, 0) as completed_children_count
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		LEFT JOIN (
			SELECT parent_id,
			       COUNT(*) as children_count,
			       COUNT(*) FILTER (WHERE status = 'completed') as completed_children_count
			FROM tasks
			WHERE deleted_at IS NULL AND parent_id IS NOT NULL
			GROUP BY parent_id
		) c ON t.id = c.parent_id
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, where, orderByClause, len(args)+1, len(args)+2)

	args = append(args, limit, offset)
	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list filtered tasks: %w", err)
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
		var startDatetime sql.NullTime
		var dueDatetime sql.NullTime
		var timeUnitPreference sql.NullString
		var workHoursPerDay sql.NullFloat64
		var timeTrackingMode sql.NullString
		var projectName sql.NullString
		var assigneeName sql.NullString
		var childrenCount int
		var completedChildrenCount int

		if err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&parentID, &task.TaskLevel, &task.SortOrder, &task.TotalTimeSeconds,
			&startDatetime, &dueDatetime, &task.EstimatedMinutes, &task.ActualMinutes,
			&timeUnitPreference, &workHoursPerDay, &timeTrackingMode,
			&task.CreatedAt, &updatedAt, &task.DeletedAt,
			&projectName, &assigneeName, &childrenCount, &completedChildrenCount,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan task: %w", err)
		}

		if assigneeID.Valid {
			v := int(assigneeID.Int64)
			task.AssigneeID = &v
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		if parentID.Valid {
			v := int(parentID.Int64)
			task.ParentID = &v
		}
		if updatedAt.Valid {
			task.UpdatedAt = updatedAt.Time
		} else {
			task.UpdatedAt = task.CreatedAt
		}

		if startDatetime.Valid {
			task.StartDatetime = &startDatetime.Time
		}
		if dueDatetime.Valid {
			task.DueDatetime = &dueDatetime.Time
		}
		if timeUnitPreference.Valid {
			task.TimeUnitPreference = timeUnitPreference.String
		} else {
			task.TimeUnitPreference = "auto"
		}
		if workHoursPerDay.Valid {
			task.WorkHoursPerDay = workHoursPerDay.Float64
		} else {
			task.WorkHoursPerDay = 8.0
		}
		if timeTrackingMode.Valid {
			task.TimeTrackingMode = timeTrackingMode.String
		} else {
			task.TimeTrackingMode = "manual"
		}

		if len(customFieldsJSON) > 0 {
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		// Assign children_count and has_children to task fields (Android层级任务功能需要)
		task.ChildrenCount = childrenCount
		task.CompletedChildrenCount = completedChildrenCount
		task.HasChildren = childrenCount > 0

		// Add project_name, assignee_name and children_count to custom fields for frontend display
		if task.CustomFields == nil {
			task.CustomFields = make(models.CustomFields)
		}
		if projectName.Valid {
			task.CustomFields["project_name"] = projectName.String
		}
		if assigneeName.Valid {
			task.CustomFields["assignee_name"] = assigneeName.String
		}
		task.CustomFields["children_count"] = childrenCount

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
		    due_date = $6, custom_fields = $7, total_time_seconds = $8,
		    parent_id = $9, task_level = $10, sort_order = $11,
		    start_datetime = $12, due_datetime = $13, estimated_minutes = $14, 
		    actual_minutes = $15, time_unit_preference = $16, 
		    work_hours_per_day = $17, time_tracking_mode = $18,
		    project_id = $19,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		task.ID, task.Title, task.Description, task.AssigneeID,
		task.Status, task.DueDate, customFieldsJSON, task.TotalTimeSeconds,
		task.ParentID, task.TaskLevel, task.SortOrder,
		task.StartDatetime, task.DueDatetime, task.EstimatedMinutes,
		task.ActualMinutes, task.TimeUnitPreference, task.WorkHoursPerDay, task.TimeTrackingMode,
		task.ProjectID)

	err = row.Scan(&task.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return task, nil
}

// Delete soft deletes a task and all its descendants (sets deleted_at timestamp)
func (r *PostgresTaskRepository) Delete(ctx context.Context, id int) error {
	log.Printf("[TaskRepository.Delete] 开始删除任务: taskID=%d", id)

	// Use recursive CTE to find all descendants and delete them in one query
	query := `
		WITH RECURSIVE task_hierarchy AS (
			-- Start with the target task (only if it exists and is not deleted)
			SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL

			UNION ALL

			-- Recursively find all children (including already deleted ones to handle edge cases)
			SELECT t.id FROM tasks t
			INNER JOIN task_hierarchy th ON t.parent_id = th.id
			WHERE t.deleted_at IS NULL
		)
		UPDATE tasks
		SET deleted_at = NOW()
		WHERE id IN (SELECT id FROM task_hierarchy)
		AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		log.Printf("[TaskRepository.Delete] SQL执行失败: taskID=%d, error=%v, errorType=%T", id, err, err)

		// 尝试检查是否是外键约束错误
		errStr := err.Error()
		if strings.Contains(errStr, "foreign key") || strings.Contains(errStr, "violates") {
			log.Printf("[TaskRepository.Delete] 外键约束冲突: taskID=%d, detail=%s", id, errStr)
			return fmt.Errorf("无法删除任务：存在外键约束冲突 (任务ID: %d, 详情: %v)", id, err)
		}

		return fmt.Errorf("failed to delete task and children (taskID=%d): %w", id, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("[TaskRepository.Delete] 获取影响行数失败: taskID=%d, error=%v", id, err)
		return fmt.Errorf("failed to get affected rows (taskID=%d): %w", id, err)
	}

	log.Printf("[TaskRepository.Delete] 删除完成: taskID=%d, rowsAffected=%d", id, rowsAffected)

	if rowsAffected == 0 {
		log.Printf("[TaskRepository.Delete] 任务未找到或已删除: taskID=%d", id)
		return fmt.Errorf("task not found or already deleted (taskID=%d)", id)
	}

	return nil
}

// BulkDelete soft deletes multiple tasks and their descendants
func (r *PostgresTaskRepository) BulkDelete(ctx context.Context, ids []int) error {
	if len(ids) == 0 {
		return nil
	}

	// Convert IDs to string for SQL IN clause
	args := make([]interface{}, len(ids))
	placeholders := make([]string, len(ids))
	for i, id := range ids {
		args[i] = id
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	// Use recursive CTE to find all tasks and their descendants
	query := fmt.Sprintf(`
		WITH RECURSIVE task_hierarchy AS (
			-- Start with all target tasks (only if they exist and are not deleted)
			SELECT id FROM tasks WHERE id IN (%s) AND deleted_at IS NULL
			
			UNION ALL
			
			-- Recursively find all children
			SELECT t.id FROM tasks t
			INNER JOIN task_hierarchy th ON t.parent_id = th.id
			WHERE t.deleted_at IS NULL
		)
		UPDATE tasks 
		SET deleted_at = NOW() 
		WHERE id IN (SELECT id FROM task_hierarchy) 
		AND deleted_at IS NULL`, strings.Join(placeholders, ","))

	exec := r.getExecer()
	_, err := exec.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to bulk delete tasks and children: %w", err)
	}

	// For bulk delete, we consider the operation successful regardless of affected rows
	// (tasks might have been already deleted or not exist)

	return nil
}

// BulkCreate creates multiple tasks in a single transaction
func (r *PostgresTaskRepository) BulkCreate(ctx context.Context, tasks []*models.Task) ([]*models.Task, error) {
	if len(tasks) == 0 {
		return tasks, nil
	}

	exec := r.getExecer()

	// Check for duplicate titles before creating any task
	for i, task := range tasks {
		var existingTaskID int
		checkQuery := `SELECT id FROM tasks WHERE title = $1 AND project_id = $2 AND deleted_at IS NULL LIMIT 1`
		err := exec.QueryRowContext(ctx, checkQuery, task.Title, task.ProjectID).Scan(&existingTaskID)

		if err != sql.ErrNoRows {
			if err != nil {
				return nil, fmt.Errorf("failed to check task title duplication for task %d: %w", i, err)
			}
			// If we found a duplicate task, return error
			return nil, fmt.Errorf("任务标题重复：'%s' 已存在于当前项目中（任务ID: %d）。请修改任务标题后重试，或者查看已存在的任务是否可以复用", task.Title, existingTaskID)
		}
	}

	query := `
		INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, custom_fields, parent_id, sort_order,
		                   start_datetime, due_datetime, estimated_minutes, actual_minutes, 
		                   time_unit_preference, work_hours_per_day, time_tracking_mode)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at`

	for i, task := range tasks {
		customFieldsJSON, err := json.Marshal(task.CustomFields)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal custom fields for task %d: %w", i, err)
		}

		row := exec.QueryRowContext(ctx, query,
			task.ProjectID, task.Title, task.Description, task.Status,
			task.AssigneeID, task.DueDate, customFieldsJSON, task.ParentID, task.SortOrder,
			task.StartDatetime, task.DueDatetime, task.EstimatedMinutes, task.ActualMinutes,
			task.TimeUnitPreference, task.WorkHoursPerDay, task.TimeTrackingMode)

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
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
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

// SearchParentTasks searches for potential parent tasks with filtering
func (r *PostgresTaskRepository) SearchParentTasks(ctx context.Context, projectID int, keyword string, excludeTaskIDs []int, maxLevel int, limit, offset int) ([]*models.Task, int, error) {
	// Build the WHERE clause conditions
	var conditions []string
	var args []interface{}
	argIndex := 1

	// Basic filters
	conditions = append(conditions, fmt.Sprintf("project_id = $%d", argIndex))
	args = append(args, projectID)
	argIndex++

	conditions = append(conditions, "deleted_at IS NULL")

	// Level filter (prevent creating 4th level tasks)
	conditions = append(conditions, fmt.Sprintf("(task_level IS NULL OR task_level <= $%d)", argIndex))
	args = append(args, maxLevel)
	argIndex++

	// Exclude specific tasks
	if len(excludeTaskIDs) > 0 {
		// 创建占位符字符串如 "$3, $4, $5"
		placeholders := make([]string, len(excludeTaskIDs))
		for i, excludeID := range excludeTaskIDs {
			placeholders[i] = fmt.Sprintf("$%d", argIndex)
			args = append(args, excludeID)
			argIndex++
		}
		conditions = append(conditions, fmt.Sprintf("id NOT IN (%s)", strings.Join(placeholders, ", ")))
	}

	// Keyword search
	if keyword != "" {
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex+1))
		keywordPattern := "%" + keyword + "%"
		args = append(args, keywordPattern, keywordPattern)
		argIndex += 2
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) 
		FROM tasks 
		%s`, whereClause)

	exec := r.getExecer()
	var total int
	err := exec.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count parent tasks: %w", err)
	}

	// Main query with pagination
	query := fmt.Sprintf(`
		SELECT id, project_id, title, description, status, assignee_id, due_date, 
		       custom_fields, created_at, updated_at, deleted_at, parent_id, 
		       task_level, sort_order, total_time_seconds,
		       start_datetime, due_datetime, estimated_minutes, actual_minutes, 
		       time_unit_preference, work_hours_per_day, time_tracking_mode
		FROM tasks 
		%s
		ORDER BY task_level ASC, title ASC
		LIMIT $%d OFFSET $%d`, whereClause, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to search parent tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*models.Task
	for rows.Next() {
		task := &models.Task{}
		var customFieldsJSON []byte
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime
		var parentID sql.NullInt64
		var taskLevel sql.NullInt64
		var sortOrder sql.NullInt64
		var startDatetime sql.NullTime
		var dueDatetime sql.NullTime
		var timeUnitPreference sql.NullString
		var workHoursPerDay sql.NullFloat64
		var timeTrackingMode sql.NullString

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &task.Description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&task.CreatedAt, &task.UpdatedAt, &task.DeletedAt,
			&parentID, &taskLevel, &sortOrder, &task.TotalTimeSeconds,
			&startDatetime, &dueDatetime, &task.EstimatedMinutes, &task.ActualMinutes,
			&timeUnitPreference, &workHoursPerDay, &timeTrackingMode,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan task: %w", err)
		}

		// Handle nullable fields
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
		if taskLevel.Valid {
			task.TaskLevel = int(taskLevel.Int64)
		}
		if sortOrder.Valid {
			task.SortOrder = int(sortOrder.Int64)
		}

		// Handle new time management fields
		if startDatetime.Valid {
			task.StartDatetime = &startDatetime.Time
		}
		if dueDatetime.Valid {
			task.DueDatetime = &dueDatetime.Time
		}
		if timeUnitPreference.Valid {
			task.TimeUnitPreference = timeUnitPreference.String
		} else {
			task.TimeUnitPreference = "auto"
		}
		if workHoursPerDay.Valid {
			task.WorkHoursPerDay = workHoursPerDay.Float64
		} else {
			task.WorkHoursPerDay = 8.0
		}
		if timeTrackingMode.Valid {
			task.TimeTrackingMode = timeTrackingMode.String
		} else {
			task.TimeTrackingMode = "manual"
		}

		// Unmarshal custom fields
		if len(customFieldsJSON) > 0 {
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
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

// CheckCircularDependency checks if setting taskID as child of potentialParentID would create a circular dependency
func (r *PostgresTaskRepository) CheckCircularDependency(ctx context.Context, taskID int, potentialParentID int) (bool, error) {
	// If potentialParentID is 0 or nil, it's a root task, no circular dependency
	if potentialParentID == 0 {
		return false, nil
	}

	// If taskID equals potentialParentID, it's self-reference (circular)
	if taskID == potentialParentID {
		return true, nil
	}

	// Use recursive CTE to check if potentialParentID is a descendant of taskID
	// If it is, then making taskID a child of potentialParentID would create a cycle
	query := `
		WITH RECURSIVE task_hierarchy AS (
			-- Start with the task we want to check
			SELECT id, parent_id FROM tasks WHERE id = $1 AND deleted_at IS NULL
			
			UNION ALL
			
			-- Recursively find all descendants
			SELECT t.id, t.parent_id FROM tasks t
			INNER JOIN task_hierarchy th ON t.parent_id = th.id
			WHERE t.deleted_at IS NULL
		)
		SELECT EXISTS(SELECT 1 FROM task_hierarchy WHERE id = $2) as has_circular_dependency`

	exec := r.getExecer()
	var hasCircularDependency bool
	err := exec.QueryRowContext(ctx, query, taskID, potentialParentID).Scan(&hasCircularDependency)
	if err != nil {
		return false, fmt.Errorf("failed to check circular dependency: %w", err)
	}

	return hasCircularDependency, nil
}
