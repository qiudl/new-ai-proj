package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"github.com/lib/pq"
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
	// Check if db is nil
	if r.db == nil {
		log.Printf("[ERROR] SystemRepository: database connection is nil")
		panic("database connection is nil")
	}

	// Try to get *sql.Tx first
	if tx, ok := r.db.(*sql.Tx); ok {
		log.Printf("[DEBUG] SystemRepository: using transaction context")
		return tx
	}

	// Try to get *sql.DB
	if db, ok := r.db.(*sql.DB); ok {
		log.Printf("[DEBUG] SystemRepository: using database connection")
		return db
	}

	// If it's a custom wrapper type, try to unwrap it
	type dbWrapper interface {
		GetDB() *sql.DB
	}
	if wrapper, ok := r.db.(dbWrapper); ok {
		log.Printf("[DEBUG] SystemRepository: using wrapped database connection")
		return wrapper.GetDB()
	}

	// Log the actual type for debugging
	log.Printf("[ERROR] SystemRepository: unsupported database type: %T, value: %+v", r.db, r.db)
	panic(fmt.Sprintf("unsupported database type: %T", r.db))
}

// GetRecycledTasks gets all deleted tasks with pagination
func (r *PostgresSystemRepository) GetRecycledTasks(ctx context.Context, limit, offset int) ([]*models.RecycledTask, int, error) {
	log.Printf("[INFO] GetRecycledTasks called with limit=%d, offset=%d", limit, offset)

	// First try with the view, if it doesn't exist, use a direct query
	countQuery := `SELECT COUNT(*) FROM recycled_tasks`

	log.Printf("[DEBUG] Getting execer for database operations")
	exec := r.getExecer()
	log.Printf("[DEBUG] Successfully got execer, executing count query")

	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		log.Printf("[WARN] Failed to count from recycled_tasks view: %v, falling back to direct query", err)
		// If view doesn't exist, fall back to direct query
		countQuery = `
			SELECT COUNT(*)
			FROM tasks t
			WHERE t.deleted_at IS NOT NULL
		`
		row = exec.QueryRowContext(ctx, countQuery)
		if err := row.Scan(&total); err != nil {
			log.Printf("[ERROR] Failed to get recycled task count from direct query: %v", err)
			return nil, 0, fmt.Errorf("failed to get recycled task count: %w", err)
		}
	}

	log.Printf("[INFO] Found %d total recycled tasks", total)

	// Get recycled tasks with pagination
	query := `
		SELECT id, project_id, title, description, status, assignee_id, due_date,
		       custom_fields, created_at, deleted_at, project_name, assignee_username
		FROM recycled_tasks
		ORDER BY deleted_at DESC
		LIMIT $1 OFFSET $2`

	log.Printf("[DEBUG] Executing query to get recycled tasks")
	rows, err := exec.QueryContext(ctx, query, limit, offset)
	if err != nil {
		log.Printf("[WARN] Failed to query from recycled_tasks view: %v, falling back to direct query", err)
		// If view doesn't exist, fall back to direct query
		query = `
			SELECT t.id, t.project_id, t.title, t.description, t.status,
				   t.assignee_id, t.due_date, t.custom_fields, t.created_at, t.deleted_at,
				   COALESCE(p.name, 'Unknown Project') as project_name,
				   COALESCE(u.username, '') as assignee_username
			FROM tasks t
			LEFT JOIN projects p ON t.project_id = p.id
			LEFT JOIN users u ON t.assignee_id = u.id
			WHERE t.deleted_at IS NOT NULL
			ORDER BY t.deleted_at DESC
			LIMIT $1 OFFSET $2`

		rows, err = exec.QueryContext(ctx, query, limit, offset)
		if err != nil {
			log.Printf("[ERROR] Failed to list recycled tasks from direct query: %v", err)
			return nil, 0, fmt.Errorf("failed to list recycled tasks: %w", err)
		}
	}
	defer rows.Close()

	log.Printf("[DEBUG] Successfully executed query, scanning results")
	var tasks []*models.RecycledTask
	taskCount := 0
	for rows.Next() {
		task := &models.RecycledTask{}
		var customFieldsJSON []byte
		var description sql.NullString
		var assigneeID sql.NullInt64
		var dueDate sql.NullTime
		var assigneeUsername sql.NullString

		err := rows.Scan(
			&task.ID, &task.ProjectID, &task.Title, &description,
			&task.Status, &assigneeID, &dueDate, &customFieldsJSON,
			&task.CreatedAt, &task.DeletedAt, &task.ProjectName, &assigneeUsername,
		)
		if err != nil {
			log.Printf("[ERROR] Failed to scan recycled task row: %v", err)
			return nil, 0, fmt.Errorf("failed to scan recycled task: %w", err)
		}
		taskCount++

		// Handle nullable description
		if description.Valid {
			task.Description = &description.String
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
			if err := task.CustomFields.Scan(customFieldsJSON); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal custom fields: %w", err)
			}
		}

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		log.Printf("[ERROR] Rows iteration error: %v", err)
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	log.Printf("[INFO] Successfully retrieved %d recycled tasks (page %d of total %d)", taskCount, offset/limit+1, total)
	return tasks, total, nil
}

// GetRecycledDocuments 获取回收站文档列表
func (r *PostgresSystemRepository) GetRecycledDocuments(ctx context.Context, page, pageSize int) ([]*models.RecycledDocument, int, error) {
	log.Printf("[DEBUG] GetRecycledDocuments called with page=%d, pageSize=%d", page, pageSize)

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 获取总数
	countQuery := `SELECT COUNT(*) FROM documents WHERE deleted_at IS NOT NULL`
	var total int
	err := r.getExecer().QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		log.Printf("[ERROR] Failed to count recycled documents: %v", err)
		return nil, 0, fmt.Errorf("failed to count recycled documents: %w", err)
	}
	log.Printf("[INFO] Total recycled documents: %d", total)

	// 查询回收站文档
	query := `
		SELECT
			d.id,
			d.project_id,
			d.title,
			COALESCE(d.content, '') as content,
			d.type,
			d.status,
			d.owner_id,
			d.created_at,
			d.deleted_at,
			p.name as project_name,
			u.username as owner_name,
			d.file_size,
			d.tags
		FROM documents d
		LEFT JOIN projects p ON d.project_id = p.id
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE d.deleted_at IS NOT NULL
		ORDER BY d.deleted_at DESC
		LIMIT $1 OFFSET $2
	`

	log.Printf("[DEBUG] Executing query with limit=%d, offset=%d", pageSize, offset)
	rows, err := r.getExecer().QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		log.Printf("[ERROR] Failed to query recycled documents: %v", err)
		return nil, 0, fmt.Errorf("failed to query recycled documents: %w", err)
	}
	defer rows.Close()

	log.Printf("[DEBUG] Successfully executed query, scanning results")
	var documents []*models.RecycledDocument
	docCount := 0
	for rows.Next() {
		doc := &models.RecycledDocument{}
		var projectID sql.NullInt64
		var projectName sql.NullString
		var fileSize sql.NullInt64
		var tags pq.StringArray

		err := rows.Scan(
			&doc.ID, &projectID, &doc.Title, &doc.Content,
			&doc.Type, &doc.Status, &doc.OwnerID, &doc.CreatedAt,
			&doc.DeletedAt, &projectName, &doc.OwnerName, &fileSize, &tags,
		)
		if err != nil {
			log.Printf("[ERROR] Failed to scan recycled document row: %v", err)
			return nil, 0, fmt.Errorf("failed to scan recycled document: %w", err)
		}
		docCount++

		// 处理可空字段
		if projectID.Valid {
			intVal := int(projectID.Int64)
			doc.ProjectID = &intVal
		}
		if projectName.Valid {
			doc.ProjectName = &projectName.String
		}
		if fileSize.Valid {
			doc.FileSize = &fileSize.Int64
		}
		doc.Tags = []string(tags)

		documents = append(documents, doc)
	}

	if err := rows.Err(); err != nil {
		log.Printf("[ERROR] Row iteration error: %v", err)
		return nil, 0, fmt.Errorf("row iteration error: %w", err)
	}

	log.Printf("[INFO] Successfully retrieved %d recycled documents, total: %d", len(documents), total)
	return documents, total, nil
}

// GetRecycledWorkNotes 获取回收站工作笔记列表 (work notes are documents with NULL project_id)
func (r *PostgresSystemRepository) GetRecycledWorkNotes(ctx context.Context, page, pageSize int) ([]*models.RecycledWorkNote, int, error) {
	log.Printf("[DEBUG] GetRecycledWorkNotes called with page=%d, pageSize=%d", page, pageSize)
	offset := (page - 1) * pageSize

	// Get total count of deleted work notes
	countQuery := `SELECT COUNT(*) FROM documents WHERE deleted_at IS NOT NULL AND project_id IS NULL`
	var total int
	err := r.getExecer().QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		log.Printf("[ERROR] Failed to count recycled work notes: %v", err)
		return nil, 0, fmt.Errorf("failed to count recycled work notes: %w", err)
	}

	log.Printf("[DEBUG] Total recycled work notes count: %d", total)

	// Query recycled work notes
	query := `
		SELECT
			d.id, d.title, COALESCE(d.content, '') as content,
			d.type, d.status, d.owner_id, d.created_at, d.deleted_at,
			u.username as owner_name, d.tags, d.visibility
		FROM documents d
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE d.deleted_at IS NOT NULL AND d.project_id IS NULL
		ORDER BY d.deleted_at DESC
		LIMIT $1 OFFSET $2
	`

	log.Printf("[DEBUG] Executing query with LIMIT=%d, OFFSET=%d", pageSize, offset)

	rows, err := r.getExecer().QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		log.Printf("[ERROR] Failed to query recycled work notes: %v", err)
		return nil, 0, fmt.Errorf("failed to query recycled work notes: %w", err)
	}
	defer rows.Close()

	var workNotes []*models.RecycledWorkNote
	for rows.Next() {
		note := &models.RecycledWorkNote{}
		var tags interface{}

		err := rows.Scan(
			&note.ID, &note.Title, &note.Content,
			&note.Type, &note.Status, &note.OwnerID,
			&note.CreatedAt, &note.DeletedAt,
			&note.OwnerName, &tags, &note.Visibility,
		)
		if err != nil {
			log.Printf("[ERROR] Failed to scan work note row: %v", err)
			return nil, 0, fmt.Errorf("failed to scan work note: %w", err)
		}

		// Handle tags array
		if tags != nil {
			switch v := tags.(type) {
			case []byte:
				var tagArray pq.StringArray
				if err := tagArray.Scan(v); err == nil {
					note.Tags = []string(tagArray)
				}
			case string:
				var tagArray pq.StringArray
				if err := tagArray.Scan([]byte(v)); err == nil {
					note.Tags = []string(tagArray)
				}
			}
		}

		workNotes = append(workNotes, note)
		log.Printf("[DEBUG] Scanned work note: ID=%d, Title=%s", note.ID, note.Title)
	}

	if err = rows.Err(); err != nil {
		log.Printf("[ERROR] Row iteration error: %v", err)
		return nil, 0, fmt.Errorf("row iteration error: %w", err)
	}

	log.Printf("[INFO] Successfully retrieved %d recycled work notes, total: %d", len(workNotes), total)
	return workNotes, total, nil
}

// RestoreDocument restores a deleted document
func (r *PostgresSystemRepository) RestoreDocument(ctx context.Context, id int) error {
	query := `UPDATE documents SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore document: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("document not found in recycle bin")
	}

	return nil
}

// HardDeleteDocument permanently deletes a document
func (r *PostgresSystemRepository) HardDeleteDocument(ctx context.Context, id int) error {
	query := `DELETE FROM documents WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete document: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("document not found in recycle bin or already deleted")
	}

	return nil
}

// RestoreWorkNote restores a deleted work note
func (r *PostgresSystemRepository) RestoreWorkNote(ctx context.Context, id int) error {
	// Work notes are stored in the documents table
	query := `UPDATE documents SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to restore work note: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("work note not found in recycle bin")
	}

	return nil
}

// HardDeleteWorkNote permanently deletes a work note
func (r *PostgresSystemRepository) HardDeleteWorkNote(ctx context.Context, id int) error {
	// Work notes are stored in the documents table
	query := `DELETE FROM documents WHERE id = $1 AND deleted_at IS NOT NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to permanently delete work note: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("work note not found in recycle bin or already deleted")
	}

	return nil
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

// GetAuditLogsWithFilter gets audit logs with enhanced filtering capabilities
func (r *PostgresSystemRepository) GetAuditLogsWithFilter(ctx context.Context, filter *models.AuditLogFilter) ([]interface{}, int, error) {
	// Start building the query
	baseQuery := `
		SELECT id, event_id, timestamp, user_id, user_email, user_name, user_role,
		       action, resource_type, resource_id, resource_name, ip_address, user_agent,
		       session_id, request_id, description, before_data, after_data, changes,
		       status, error_message, project_id, parent_event_id, correlation_id,
		       metadata, tags
		FROM audit_logs
	`

	countQuery := `SELECT COUNT(*) FROM audit_logs`

	// Build WHERE clauses
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	if filter.Action != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("action = $%d", argIndex))
		args = append(args, filter.Action)
		argIndex++
	}

	if filter.ResourceType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("resource_type = $%d", argIndex))
		args = append(args, filter.ResourceType)
		argIndex++
	}

	if filter.UserID != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("user_id = $%d", argIndex))
		args = append(args, *filter.UserID)
		argIndex++
	}

	if !filter.StartTime.IsZero() {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp >= $%d", argIndex))
		args = append(args, filter.StartTime)
		argIndex++
	}

	if !filter.EndTime.IsZero() {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp <= $%d", argIndex))
		args = append(args, filter.EndTime)
		argIndex++
	}

	if filter.IPAddress != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("ip_address = $%d", argIndex))
		args = append(args, filter.IPAddress)
		argIndex++
	}

	if filter.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, filter.Status)
		argIndex++
	}

	if filter.SessionID != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("session_id = $%d", argIndex))
		args = append(args, filter.SessionID)
		argIndex++
	}

	// Add full-text search if description filter is provided
	if filter.Description != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(description ILIKE $%d OR action ILIKE $%d OR user_name ILIKE $%d)", argIndex, argIndex, argIndex))
		searchTerm := "%" + filter.Description + "%"
		args = append(args, searchTerm)
		argIndex++
	}

	// Construct final queries
	if len(whereConditions) > 0 {
		whereClause := " WHERE " + fmt.Sprintf("%s", whereConditions[0])
		for i := 1; i < len(whereConditions); i++ {
			whereClause += " AND " + whereConditions[i]
		}
		baseQuery += whereClause
		countQuery += whereClause
	}

	// Add ORDER BY and pagination
	baseQuery += " ORDER BY timestamp DESC"
	paginationArgs := args
	if filter.Limit > 0 {
		baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
		paginationArgs = append(paginationArgs, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
		paginationArgs = append(paginationArgs, filter.Offset)
	}

	exec := r.getExecer()

	// Get total count
	var total int
	row := exec.QueryRowContext(ctx, countQuery, args...)
	if err := row.Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to get audit log count: %w", err)
	}

	// Get audit logs
	rows, err := exec.QueryContext(ctx, baseQuery, paginationArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query audit logs: %w", err)
	}
	defer rows.Close()

	var logs []interface{}
	for rows.Next() {
		log := &models.AuditLog{}
		var userID sql.NullInt64
		var projectID sql.NullInt64
		var beforeData, afterData, changes, metadata []byte
		var tags sql.NullString

		err := rows.Scan(
			&log.ID, &log.EventID, &log.Timestamp, &userID, &log.UserEmail,
			&log.UserName, &log.UserRole, &log.Action, &log.ResourceType,
			&log.ResourceID, &log.ResourceName, &log.IPAddress, &log.UserAgent,
			&log.SessionID, &log.RequestID, &log.Description, &beforeData,
			&afterData, &changes, &log.Status, &log.ErrorMessage, &projectID,
			&log.ParentEventID, &log.CorrelationID, &metadata, &tags,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit log: %w", err)
		}

		if userID.Valid {
			intVal := int(userID.Int64)
			log.UserID = &intVal
		}
		if projectID.Valid {
			intVal := int(projectID.Int64)
			log.ProjectID = &intVal
		}

		// Parse JSON fields
		if len(beforeData) > 0 {
			if err := json.Unmarshal(beforeData, &log.BeforeData); err != nil {
				log.BeforeData = make(models.JSONB)
			}
		}
		if len(afterData) > 0 {
			if err := json.Unmarshal(afterData, &log.AfterData); err != nil {
				log.AfterData = make(models.JSONB)
			}
		}
		if len(changes) > 0 {
			if err := json.Unmarshal(changes, &log.Changes); err != nil {
				log.Changes = make(models.JSONB)
			}
		}
		if len(metadata) > 0 {
			if err := json.Unmarshal(metadata, &log.Metadata); err != nil {
				log.Metadata = make(models.JSONB)
			}
		}

		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows error: %w", err)
	}

	return logs, total, nil
}

// GetAuditLogByID gets a single audit log by ID
func (r *PostgresSystemRepository) GetAuditLogByID(ctx context.Context, id int64) (*models.AuditLog, error) {
	query := `
		SELECT id, event_id, timestamp, user_id, user_email, user_name, user_role,
		       action, resource_type, resource_id, resource_name, ip_address, user_agent,
		       session_id, request_id, description, before_data, after_data, changes,
		       status, error_message, project_id, parent_event_id, correlation_id,
		       metadata, tags
		FROM audit_logs
		WHERE id = $1
	`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	log := &models.AuditLog{}
	var userID sql.NullInt64
	var projectID sql.NullInt64
	var beforeData, afterData, changes, metadata []byte
	var tags sql.NullString

	err := row.Scan(
		&log.ID, &log.EventID, &log.Timestamp, &userID, &log.UserEmail,
		&log.UserName, &log.UserRole, &log.Action, &log.ResourceType,
		&log.ResourceID, &log.ResourceName, &log.IPAddress, &log.UserAgent,
		&log.SessionID, &log.RequestID, &log.Description, &beforeData,
		&afterData, &changes, &log.Status, &log.ErrorMessage, &projectID,
		&log.ParentEventID, &log.CorrelationID, &metadata, &tags,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("audit log not found")
		}
		return nil, fmt.Errorf("failed to get audit log: %w", err)
	}

	if userID.Valid {
		intVal := int(userID.Int64)
		log.UserID = &intVal
	}
	if projectID.Valid {
		intVal := int(projectID.Int64)
		log.ProjectID = &intVal
	}

	// Parse JSON fields
	if len(beforeData) > 0 {
		if err := json.Unmarshal(beforeData, &log.BeforeData); err != nil {
			log.BeforeData = make(models.JSONB)
		}
	}
	if len(afterData) > 0 {
		if err := json.Unmarshal(afterData, &log.AfterData); err != nil {
			log.AfterData = make(models.JSONB)
		}
	}
	if len(changes) > 0 {
		if err := json.Unmarshal(changes, &log.Changes); err != nil {
			log.Changes = make(models.JSONB)
		}
	}
	if len(metadata) > 0 {
		if err := json.Unmarshal(metadata, &log.Metadata); err != nil {
			log.Metadata = make(models.JSONB)
		}
	}

	return log, nil
}

// GetAuditStats gets audit statistics based on filter and grouping
func (r *PostgresSystemRepository) GetAuditStats(ctx context.Context, filter *models.AuditLogFilter, groupBy string) (interface{}, error) {
	exec := r.getExecer()

	// Build basic stats
	stats := make(map[string]interface{})

	// Get total events count
	countQuery := `SELECT COUNT(*) FROM audit_logs`
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	// Apply filters to count query
	if filter.Action != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("action = $%d", argIndex))
		args = append(args, filter.Action)
		argIndex++
	}
	if filter.ResourceType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("resource_type = $%d", argIndex))
		args = append(args, filter.ResourceType)
		argIndex++
	}
	if !filter.StartTime.IsZero() {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp >= $%d", argIndex))
		args = append(args, filter.StartTime)
		argIndex++
	}
	if !filter.EndTime.IsZero() {
		whereConditions = append(whereConditions, fmt.Sprintf("timestamp <= $%d", argIndex))
		args = append(args, filter.EndTime)
		argIndex++
	}

	if len(whereConditions) > 0 {
		whereClause := " WHERE " + fmt.Sprintf("%s", whereConditions[0])
		for i := 1; i < len(whereConditions); i++ {
			whereClause += " AND " + whereConditions[i]
		}
		countQuery += whereClause
	}

	var totalEvents int64
	row := exec.QueryRowContext(ctx, countQuery, args...)
	if err := row.Scan(&totalEvents); err != nil {
		return nil, fmt.Errorf("failed to get total events count: %w", err)
	}
	stats["total_events"] = totalEvents

	// Get actions distribution
	actionsQuery := `
		SELECT action, COUNT(*) as count 
		FROM audit_logs`
	if len(whereConditions) > 0 {
		whereClause := " WHERE " + whereConditions[0]
		for i := 1; i < len(whereConditions); i++ {
			whereClause += " AND " + whereConditions[i]
		}
		actionsQuery += whereClause
	}
	actionsQuery += `
		GROUP BY action 
		ORDER BY count DESC 
		LIMIT 10`

	rows, err := exec.QueryContext(ctx, actionsQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get actions distribution: %w", err)
	}
	defer rows.Close()

	var actionsDistribution []map[string]interface{}
	for rows.Next() {
		var action string
		var count int64
		if err := rows.Scan(&action, &count); err != nil {
			continue
		}
		actionsDistribution = append(actionsDistribution, map[string]interface{}{
			"action": action,
			"count":  count,
		})
	}
	stats["actions_distribution"] = actionsDistribution

	// Get entities distribution
	entitiesQuery := `
		SELECT resource_type, COUNT(*) as count 
		FROM audit_logs`
	if len(whereConditions) > 0 {
		whereClause := " WHERE " + whereConditions[0]
		for i := 1; i < len(whereConditions); i++ {
			whereClause += " AND " + whereConditions[i]
		}
		entitiesQuery += whereClause
	}
	entitiesQuery += `
		GROUP BY resource_type 
		ORDER BY count DESC`

	rows, err = exec.QueryContext(ctx, entitiesQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get entities distribution: %w", err)
	}
	defer rows.Close()

	var entitiesDistribution []map[string]interface{}
	for rows.Next() {
		var entityType string
		var count int64
		if err := rows.Scan(&entityType, &count); err != nil {
			continue
		}
		entitiesDistribution = append(entitiesDistribution, map[string]interface{}{
			"entity_type": entityType,
			"count":       count,
		})
	}
	stats["entities_distribution"] = entitiesDistribution

	// Get timeline data (last 30 days to ensure we have data)
	timelineQuery := `
		SELECT DATE(timestamp) as date, COUNT(*) as count
		FROM audit_logs
		WHERE timestamp >= NOW() - INTERVAL '30 days'`
	if len(whereConditions) > 0 {
		for _, condition := range whereConditions {
			timelineQuery += " AND " + condition
		}
	}
	timelineQuery += `
		GROUP BY DATE(timestamp)
		ORDER BY date DESC`

	rows, err = exec.QueryContext(ctx, timelineQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get timeline data: %w", err)
	}
	defer rows.Close()

	var timelineData []map[string]interface{}
	for rows.Next() {
		var date string
		var count int64
		if err := rows.Scan(&date, &count); err != nil {
			continue
		}
		timelineData = append(timelineData, map[string]interface{}{
			"date":  date,
			"count": count,
		})
	}
	stats["timeline_data"] = timelineData

	// Get top users
	usersQuery := `
		SELECT user_name, COUNT(*) as count
		FROM audit_logs
		WHERE user_name IS NOT NULL AND user_name != ''`
	if len(whereConditions) > 0 {
		for _, condition := range whereConditions {
			usersQuery += " AND " + condition
		}
	}
	usersQuery += `
		GROUP BY user_name
		ORDER BY count DESC
		LIMIT 5`

	rows, err = exec.QueryContext(ctx, usersQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get top users: %w", err)
	}
	defer rows.Close()

	var topUsers []map[string]interface{}
	for rows.Next() {
		var userName string
		var count int64
		if err := rows.Scan(&userName, &count); err != nil {
			continue
		}
		topUsers = append(topUsers, map[string]interface{}{
			"user_name": userName,
			"count":     count,
		})
	}
	stats["top_users"] = topUsers

	// Get unique users and IPs count
	uniqueUsersQuery := `SELECT COUNT(DISTINCT user_id) FROM audit_logs` + func() string {
		if len(whereConditions) > 0 {
			return " WHERE " + fmt.Sprintf("%s", whereConditions[0])
		}
		return ""
	}()

	var uniqueUsers int64
	row = exec.QueryRowContext(ctx, uniqueUsersQuery, args...)
	if err := row.Scan(&uniqueUsers); err == nil {
		stats["unique_users"] = uniqueUsers
	}

	uniqueIPsQuery := `SELECT COUNT(DISTINCT ip_address) FROM audit_logs WHERE ip_address IS NOT NULL` + func() string {
		if len(whereConditions) > 0 {
			conditions := ""
			for _, condition := range whereConditions {
				conditions += " AND " + condition
			}
			return conditions
		}
		return ""
	}()

	var uniqueIPs int64
	row = exec.QueryRowContext(ctx, uniqueIPsQuery, args...)
	if err := row.Scan(&uniqueIPs); err == nil {
		stats["unique_ips"] = uniqueIPs
	}

	// Calculate error rate
	errorQuery := `
		SELECT 
			COUNT(CASE WHEN status = 'failed' OR status = 'error' THEN 1 END) as errors,
			COUNT(*) as total
		FROM audit_logs` + func() string {
		if len(whereConditions) > 0 {
			return " WHERE " + fmt.Sprintf("%s", whereConditions[0])
		}
		return ""
	}()

	var errors, total int64
	row = exec.QueryRowContext(ctx, errorQuery, args...)
	if err := row.Scan(&errors, &total); err == nil && total > 0 {
		errorRate := float64(errors) / float64(total) * 100
		stats["error_rate"] = errorRate
	} else {
		stats["error_rate"] = 0.0
	}

	return stats, nil
}

// GetAuditLogs gets audit logs with basic pagination (legacy method)
func (r *PostgresSystemRepository) GetAuditLogs(ctx context.Context, limit, offset int) ([]*models.AuditLog, int, error) {
	// Use the enhanced filter method with default parameters
	filter := &models.AuditLogFilter{
		Limit:  limit,
		Offset: offset,
	}

	logs, total, err := r.GetAuditLogsWithFilter(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	// Convert []interface{} to []*models.AuditLog
	var auditLogs []*models.AuditLog
	for _, log := range logs {
		if auditLog, ok := log.(*models.AuditLog); ok {
			auditLogs = append(auditLogs, auditLog)
		}
	}

	return auditLogs, total, nil
}

// LogAction creates a new audit log entry (deprecated - use AuditService instead)
func (r *PostgresSystemRepository) LogAction(ctx context.Context, userID *int, action, entityType string, entityID int, entityData interface{}, ipAddress, userAgent string) error {
	// This method is deprecated and maintained for backward compatibility
	// In a full implementation, this would delegate to the new AuditService
	// For now, we'll just return nil to avoid breaking existing code
	return nil
}

// GetRecycledProjects gets all deleted projects with pagination
func (r *PostgresSystemRepository) GetRecycledProjects(ctx context.Context, limit, offset int) ([]*models.RecycledProject, int, error) {
	// First try with the view, if it doesn't exist, use a direct query
	countQuery := `SELECT COUNT(*) FROM recycled_projects`
	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, countQuery)

	var total int
	if err := row.Scan(&total); err != nil {
		// If view doesn't exist, fall back to direct query
		countQuery = `
			SELECT COUNT(*) 
			FROM projects p 
			WHERE p.deleted_at IS NOT NULL
		`
		row = exec.QueryRowContext(ctx, countQuery)
		if err := row.Scan(&total); err != nil {
			return nil, 0, fmt.Errorf("failed to get recycled project count: %w", err)
		}
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
		// If view doesn't exist, fall back to direct query
		query = `
			SELECT p.id, p.name, p.description, p.owner_id, 
				   COALESCE(u.username, 'Unknown') as owner_username, 
				   p.created_at, p.updated_at, p.deleted_at,
				   COUNT(t.id) as deleted_tasks_count
			FROM projects p
			LEFT JOIN users u ON p.owner_id = u.id
			LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NOT NULL
			WHERE p.deleted_at IS NOT NULL
			GROUP BY p.id, p.name, p.description, p.owner_id, u.username, p.created_at, p.updated_at, p.deleted_at
			ORDER BY p.deleted_at DESC
			LIMIT $1 OFFSET $2`

		rows, err = exec.QueryContext(ctx, query, limit, offset)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to list recycled projects: %w", err)
		}
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
