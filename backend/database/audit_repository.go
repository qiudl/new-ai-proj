package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// PostgresAuditRepository implements AuditRepository for PostgreSQL
type PostgresAuditRepository struct {
	db interface {
		QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
		QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
		ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	}
}

// NewAuditRepository creates a new audit repository
func NewAuditRepository(db interface {
	QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...interface{}) *sql.Row
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
}) *PostgresAuditRepository {
	return &PostgresAuditRepository{db: db}
}

// CreateAuditLog creates a new audit log entry
func (r *PostgresAuditRepository) CreateAuditLog(ctx context.Context, log *models.AuditLog) error {
	query := `
		INSERT INTO audit_logs (
			event_id, timestamp, user_id, user_email, user_name, user_role,
			action, resource_type, resource_id, resource_name,
			ip_address, user_agent, session_id, request_id,
			description, before_data, after_data, changes,
			status, error_message, project_id, parent_event_id, 
			correlation_id, metadata, tags
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17, $18,
			$19, $20, $21, $22,
			$23, $24, $25
		) RETURNING id`

	var beforeDataJSON, afterDataJSON, changesJSON, metadataJSON []byte
	var err error

	if log.BeforeData != nil {
		beforeDataJSON, err = json.Marshal(log.BeforeData)
		if err != nil {
			return fmt.Errorf("failed to marshal before_data: %w", err)
		}
	}

	if log.AfterData != nil {
		afterDataJSON, err = json.Marshal(log.AfterData)
		if err != nil {
			return fmt.Errorf("failed to marshal after_data: %w", err)
		}
	}

	if log.Changes != nil {
		changesJSON, err = json.Marshal(log.Changes)
		if err != nil {
			return fmt.Errorf("failed to marshal changes: %w", err)
		}
	}

	if log.Metadata != nil {
		metadataJSON, err = json.Marshal(log.Metadata)
		if err != nil {
			return fmt.Errorf("failed to marshal metadata: %w", err)
		}
	}

	// Convert nil slices to NULL for PostgreSQL
	var beforeDataParam, afterDataParam, changesParam, metadataParam interface{}
	if beforeDataJSON != nil {
		beforeDataParam = beforeDataJSON
	}
	if afterDataJSON != nil {
		afterDataParam = afterDataJSON
	}
	if changesJSON != nil {
		changesParam = changesJSON
	}
	if metadataJSON != nil {
		metadataParam = metadataJSON
	}

	err = r.db.QueryRowContext(ctx, query,
		log.EventID, log.Timestamp, log.UserID, log.UserEmail, log.UserName, log.UserRole,
		log.Action, log.ResourceType, log.ResourceID, log.ResourceName,
		log.IPAddress, log.UserAgent, log.SessionID, log.RequestID,
		log.Description, beforeDataParam, afterDataParam, changesParam,
		log.Status, log.ErrorMessage, log.ProjectID, log.ParentEventID,
		log.CorrelationID, metadataParam, log.Tags,
	).Scan(&log.ID)

	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

// GetAuditLogs retrieves audit logs with filtering
func (r *PostgresAuditRepository) GetAuditLogs(ctx context.Context, filter *models.AuditLogFilter) ([]*models.AuditLog, int64, error) {
	// Build WHERE clause
	conditions := []string{}
	args := []interface{}{}
	argCount := 0

	if filter.UserID != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argCount))
		args = append(args, *filter.UserID)
	}

	if filter.Action != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("action = $%d", argCount))
		args = append(args, filter.Action)
	}

	if filter.ResourceType != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("resource_type = $%d", argCount))
		args = append(args, filter.ResourceType)
	}

	if filter.ResourceID != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("resource_id = $%d", argCount))
		args = append(args, filter.ResourceID)
	}

	if filter.ProjectID != nil {
		argCount++
		conditions = append(conditions, fmt.Sprintf("project_id = $%d", argCount))
		args = append(args, *filter.ProjectID)
	}

	if !filter.StartTime.IsZero() {
		argCount++
		conditions = append(conditions, fmt.Sprintf("timestamp >= $%d", argCount))
		args = append(args, filter.StartTime)
	}

	if !filter.EndTime.IsZero() {
		argCount++
		conditions = append(conditions, fmt.Sprintf("timestamp <= $%d", argCount))
		args = append(args, filter.EndTime)
	}

	if filter.Status != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, filter.Status)
	}

	if filter.IPAddress != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("ip_address = $%d", argCount))
		args = append(args, filter.IPAddress)
	}

	if filter.SessionID != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("session_id = $%d", argCount))
		args = append(args, filter.SessionID)
	}

	if filter.RequestID != "" {
		argCount++
		conditions = append(conditions, fmt.Sprintf("request_id = $%d", argCount))
		args = append(args, filter.RequestID)
	}

	if len(filter.Tags) > 0 {
		argCount++
		conditions = append(conditions, fmt.Sprintf("tags && $%d", argCount))
		args = append(args, filter.Tags)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total records
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs %s", whereClause)
	var total int64
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	// Get paginated records
	argCount++
	offsetArg := argCount
	argCount++
	limitArg := argCount

	query := fmt.Sprintf(`
		SELECT id, event_id, timestamp, user_id, user_email, user_name, user_role,
			   action, resource_type, resource_id, resource_name,
			   ip_address, user_agent, session_id, request_id,
			   description, before_data, after_data, changes,
			   status, error_message, project_id, parent_event_id,
			   correlation_id, metadata, tags
		FROM audit_logs 
		%s 
		ORDER BY timestamp DESC 
		OFFSET $%d LIMIT $%d`,
		whereClause, offsetArg, limitArg)

	args = append(args, filter.Offset, filter.Limit)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*models.AuditLog
	for rows.Next() {
		log := &models.AuditLog{}
		var userEmail, userName, userRole, resourceType, resourceID, resourceName sql.NullString
		var ipAddress, userAgent, sessionID, requestID, description sql.NullString
		var status, errorMessage, parentEventID, correlationID sql.NullString
		var beforeDataJSON, afterDataJSON, changesJSON, metadataJSON sql.NullString

		err := rows.Scan(
			&log.ID, &log.EventID, &log.Timestamp, &log.UserID, &userEmail, &userName, &userRole,
			&log.Action, &resourceType, &resourceID, &resourceName,
			&ipAddress, &userAgent, &sessionID, &requestID,
			&description, &beforeDataJSON, &afterDataJSON, &changesJSON,
			&status, &errorMessage, &log.ProjectID, &parentEventID,
			&correlationID, &metadataJSON, &log.Tags,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan audit log: %w", err)
		}

		// Convert NULL strings to string pointers
		if userEmail.Valid {
			s := userEmail.String
			log.UserEmail = &s
		}
		if userName.Valid {
			s := userName.String
			log.UserName = &s
		}
		if userRole.Valid {
			s := userRole.String
			log.UserRole = &s
		}
		if resourceType.Valid {
			s := resourceType.String
			log.ResourceType = &s
			log.EntityType = &s // 前端兼容字段
		}
		if resourceID.Valid {
			s := resourceID.String
			log.ResourceID = &s
			log.EntityID = &s // 前端兼容字段
		}
		if resourceName.Valid {
			s := resourceName.String
			log.ResourceName = &s
		}
		if status.Valid {
			s := status.String
			log.Status = &s
		}
		if ipAddress.Valid {
			s := ipAddress.String
			log.IPAddress = &s
		}
		if userAgent.Valid {
			s := userAgent.String
			log.UserAgent = &s
		}
		if sessionID.Valid {
			s := sessionID.String
			log.SessionID = &s
		}
		if requestID.Valid {
			s := requestID.String
			log.RequestID = &s
		}
		if description.Valid {
			s := description.String
			log.Description = &s
		}
		if errorMessage.Valid {
			s := errorMessage.String
			log.ErrorMessage = &s
		}
		if parentEventID.Valid {
			s := parentEventID.String
			log.ParentEventID = &s
		}
		if correlationID.Valid {
			s := correlationID.String
			log.CorrelationID = &s
		}

		// Parse JSON fields
		if beforeDataJSON.Valid {
			if err := json.Unmarshal([]byte(beforeDataJSON.String), &log.BeforeData); err != nil {
				// Log error but don't fail the query
				log.BeforeData = nil
			}
		}

		if afterDataJSON.Valid {
			if err := json.Unmarshal([]byte(afterDataJSON.String), &log.AfterData); err != nil {
				log.AfterData = nil
			}
		}

		if changesJSON.Valid {
			if err := json.Unmarshal([]byte(changesJSON.String), &log.Changes); err != nil {
				log.Changes = nil
			}
		}

		if metadataJSON.Valid {
			if err := json.Unmarshal([]byte(metadataJSON.String), &log.Metadata); err != nil {
				log.Metadata = nil
			}
		}

		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating audit logs: %w", err)
	}

	return logs, total, nil
}

// GetAuditLogByID retrieves an audit log by ID
func (r *PostgresAuditRepository) GetAuditLogByID(ctx context.Context, id int64) (*models.AuditLog, error) {
	query := `
		SELECT id, event_id, timestamp, user_id, user_email, user_name, user_role,
			   action, resource_type, resource_id, resource_name,
			   ip_address, user_agent, session_id, request_id,
			   description, before_data, after_data, changes,
			   status, error_message, project_id, parent_event_id,
			   correlation_id, metadata, tags
		FROM audit_logs WHERE id = $1`

	log := &models.AuditLog{}
	var userEmail, userName, userRole, resourceType, resourceID, resourceName sql.NullString
	var ipAddress, userAgent, sessionID, requestID, description sql.NullString
	var status, errorMessage, parentEventID, correlationID sql.NullString
	var beforeDataJSON, afterDataJSON, changesJSON, metadataJSON sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&log.ID, &log.EventID, &log.Timestamp, &log.UserID, &userEmail, &userName, &userRole,
		&log.Action, &resourceType, &resourceID, &resourceName,
		&ipAddress, &userAgent, &sessionID, &requestID,
		&description, &beforeDataJSON, &afterDataJSON, &changesJSON,
		&status, &errorMessage, &log.ProjectID, &parentEventID,
		&correlationID, &metadataJSON, &log.Tags,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("audit log not found")
		}
		return nil, fmt.Errorf("failed to get audit log: %w", err)
	}

	// Convert NULL strings to string pointers
	if userEmail.Valid {
		s := userEmail.String
		log.UserEmail = &s
	}
	if userName.Valid {
		s := userName.String
		log.UserName = &s
	}
	if userRole.Valid {
		s := userRole.String
		log.UserRole = &s
	}
	if resourceType.Valid {
		s := resourceType.String
		log.ResourceType = &s
		log.EntityType = &s // 前端兼容字段
	}
	if resourceID.Valid {
		s := resourceID.String
		log.ResourceID = &s
		log.EntityID = &s // 前端兼容字段
	}
	if resourceName.Valid {
		s := resourceName.String
		log.ResourceName = &s
	}
	if status.Valid {
		s := status.String
		log.Status = &s
	}
	if ipAddress.Valid {
		s := ipAddress.String
		log.IPAddress = &s
	}
	if userAgent.Valid {
		s := userAgent.String
		log.UserAgent = &s
	}
	if sessionID.Valid {
		s := sessionID.String
		log.SessionID = &s
	}
	if requestID.Valid {
		s := requestID.String
		log.RequestID = &s
	}
	if description.Valid {
		s := description.String
		log.Description = &s
	}
	if errorMessage.Valid {
		s := errorMessage.String
		log.ErrorMessage = &s
	}
	if parentEventID.Valid {
		s := parentEventID.String
		log.ParentEventID = &s
	}
	if correlationID.Valid {
		s := correlationID.String
		log.CorrelationID = &s
	}

	// Parse JSON fields
	if beforeDataJSON.Valid {
		json.Unmarshal([]byte(beforeDataJSON.String), &log.BeforeData)
	}
	if afterDataJSON.Valid {
		json.Unmarshal([]byte(afterDataJSON.String), &log.AfterData)
	}
	if changesJSON.Valid {
		json.Unmarshal([]byte(changesJSON.String), &log.Changes)
	}
	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &log.Metadata)
	}

	return log, nil
}

// GetAuditLogByEventID retrieves an audit log by event ID
func (r *PostgresAuditRepository) GetAuditLogByEventID(ctx context.Context, eventID string) (*models.AuditLog, error) {
	query := `
		SELECT id, event_id, timestamp, user_id, user_email, user_name, user_role,
			   action, resource_type, resource_id, resource_name,
			   ip_address, user_agent, session_id, request_id,
			   description, before_data, after_data, changes,
			   status, error_message, project_id, parent_event_id,
			   correlation_id, metadata, tags
		FROM audit_logs WHERE event_id = $1`

	log := &models.AuditLog{}
	var beforeDataJSON, afterDataJSON, changesJSON, metadataJSON sql.NullString

	err := r.db.QueryRowContext(ctx, query, eventID).Scan(
		&log.ID, &log.EventID, &log.Timestamp, &log.UserID, &log.UserEmail, &log.UserName, &log.UserRole,
		&log.Action, &log.ResourceType, &log.ResourceID, &log.ResourceName,
		&log.IPAddress, &log.UserAgent, &log.SessionID, &log.RequestID,
		&log.Description, &beforeDataJSON, &afterDataJSON, &changesJSON,
		&log.Status, &log.ErrorMessage, &log.ProjectID, &log.ParentEventID,
		&log.CorrelationID, &metadataJSON, &log.Tags,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("audit log not found")
		}
		return nil, fmt.Errorf("failed to get audit log: %w", err)
	}

	// Parse JSON fields
	if beforeDataJSON.Valid {
		json.Unmarshal([]byte(beforeDataJSON.String), &log.BeforeData)
	}
	if afterDataJSON.Valid {
		json.Unmarshal([]byte(afterDataJSON.String), &log.AfterData)
	}
	if changesJSON.Valid {
		json.Unmarshal([]byte(changesJSON.String), &log.Changes)
	}
	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &log.Metadata)
	}

	return log, nil
}

// GetAuditConfig retrieves audit configuration for a resource type and action
func (r *PostgresAuditRepository) GetAuditConfig(ctx context.Context, resourceType, action string) (*models.AuditConfig, error) {
	query := `
		SELECT id, resource_type, action, enabled, log_before_data, log_after_data,
			   log_changes, retention_days, sensitive_fields, created_at, updated_at
		FROM audit_configs 
		WHERE resource_type = $1 AND action = $2`

	config := &models.AuditConfig{}
	err := r.db.QueryRowContext(ctx, query, resourceType, action).Scan(
		&config.ID, &config.ResourceType, &config.Action, &config.Enabled,
		&config.LogBeforeData, &config.LogAfterData, &config.LogChanges,
		&config.RetentionDays, &config.SensitiveFields, &config.CreatedAt, &config.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("audit config not found")
		}
		return nil, fmt.Errorf("failed to get audit config: %w", err)
	}

	return config, nil
}

// GetAllAuditConfigs retrieves all audit configurations
func (r *PostgresAuditRepository) GetAllAuditConfigs(ctx context.Context) ([]*models.AuditConfig, error) {
	query := `
		SELECT id, resource_type, action, enabled, log_before_data, log_after_data,
			   log_changes, retention_days, sensitive_fields, created_at, updated_at
		FROM audit_configs 
		ORDER BY resource_type, action`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit configs: %w", err)
	}
	defer rows.Close()

	var configs []*models.AuditConfig
	for rows.Next() {
		config := &models.AuditConfig{}
		err := rows.Scan(
			&config.ID, &config.ResourceType, &config.Action, &config.Enabled,
			&config.LogBeforeData, &config.LogAfterData, &config.LogChanges,
			&config.RetentionDays, &config.SensitiveFields, &config.CreatedAt, &config.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit config: %w", err)
		}
		configs = append(configs, config)
	}

	return configs, nil
}

// CreateAuditConfig creates a new audit configuration
func (r *PostgresAuditRepository) CreateAuditConfig(ctx context.Context, config *models.AuditConfig) error {
	query := `
		INSERT INTO audit_configs (
			resource_type, action, enabled, log_before_data, log_after_data,
			log_changes, retention_days, sensitive_fields, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	now := time.Now()
	config.CreatedAt = now
	config.UpdatedAt = now

	err := r.db.QueryRowContext(ctx, query,
		config.ResourceType, config.Action, config.Enabled,
		config.LogBeforeData, config.LogAfterData, config.LogChanges,
		config.RetentionDays, config.SensitiveFields, config.CreatedAt, config.UpdatedAt,
	).Scan(&config.ID)

	if err != nil {
		return fmt.Errorf("failed to create audit config: %w", err)
	}

	return nil
}

// UpdateAuditConfig updates an existing audit configuration
func (r *PostgresAuditRepository) UpdateAuditConfig(ctx context.Context, config *models.AuditConfig) error {
	query := `
		UPDATE audit_configs SET
			enabled = $1, log_before_data = $2, log_after_data = $3,
			log_changes = $4, retention_days = $5, sensitive_fields = $6,
			updated_at = $7
		WHERE id = $8`

	config.UpdatedAt = time.Now()

	result, err := r.db.ExecContext(ctx, query,
		config.Enabled, config.LogBeforeData, config.LogAfterData,
		config.LogChanges, config.RetentionDays, config.SensitiveFields,
		config.UpdatedAt, config.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update audit config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("audit config not found")
	}

	return nil
}

// DeleteAuditConfig deletes an audit configuration
func (r *PostgresAuditRepository) DeleteAuditConfig(ctx context.Context, id int) error {
	query := "DELETE FROM audit_configs WHERE id = $1"

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete audit config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("audit config not found")
	}

	return nil
}

// GetAuditStats retrieves audit statistics
func (r *PostgresAuditRepository) GetAuditStats(ctx context.Context, req *models.AuditStatsRequest) ([]*models.AuditStats, error) {
	var query string
	var args []interface{}

	switch req.GroupBy {
	case "user":
		query = `
			SELECT user_name as label, COUNT(*) as count
			FROM audit_logs 
			WHERE timestamp BETWEEN $1 AND $2 AND user_name IS NOT NULL AND user_name != ''
			GROUP BY user_name 
			ORDER BY count DESC`
		args = []interface{}{req.StartTime, req.EndTime}

	case "action":
		query = `
			SELECT action as label, COUNT(*) as count
			FROM audit_logs 
			WHERE timestamp BETWEEN $1 AND $2
			GROUP BY action 
			ORDER BY count DESC`
		args = []interface{}{req.StartTime, req.EndTime}

	case "resource_type":
		query = `
			SELECT resource_type as label, COUNT(*) as count
			FROM audit_logs 
			WHERE timestamp BETWEEN $1 AND $2
			GROUP BY resource_type 
			ORDER BY count DESC`
		args = []interface{}{req.StartTime, req.EndTime}

	case "hour":
		query = `
			SELECT DATE_TRUNC('hour', timestamp) as label, COUNT(*) as count
			FROM audit_logs 
			WHERE timestamp BETWEEN $1 AND $2
			GROUP BY DATE_TRUNC('hour', timestamp) 
			ORDER BY label`
		args = []interface{}{req.StartTime, req.EndTime}

	case "day":
		query = `
			SELECT DATE_TRUNC('day', timestamp) as label, COUNT(*) as count
			FROM audit_logs 
			WHERE timestamp BETWEEN $1 AND $2
			GROUP BY DATE_TRUNC('day', timestamp) 
			ORDER BY label`
		args = []interface{}{req.StartTime, req.EndTime}

	default:
		return nil, fmt.Errorf("unsupported group_by value: %s", req.GroupBy)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit stats: %w", err)
	}
	defer rows.Close()

	var stats []*models.AuditStats
	for rows.Next() {
		stat := &models.AuditStats{}
		var label interface{}

		err := rows.Scan(&label, &stat.Count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit stat: %w", err)
		}

		// Convert label to string
		switch v := label.(type) {
		case string:
			stat.Label = v
		case time.Time:
			stat.Label = v.Format(time.RFC3339)
		case nil:
			stat.Label = "unknown"
		default:
			stat.Label = fmt.Sprintf("%v", v)
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// CleanupExpiredAuditLogs removes audit logs that have exceeded their retention period
func (r *PostgresAuditRepository) CleanupExpiredAuditLogs(ctx context.Context) (int64, error) {
	query := `
		DELETE FROM audit_logs 
		WHERE id IN (
			SELECT al.id 
			FROM audit_logs al
			LEFT JOIN audit_configs ac ON al.resource_type = ac.resource_type AND al.action = ac.action
			WHERE al.timestamp < NOW() - INTERVAL '1 day' * COALESCE(ac.retention_days, 365)
		)`

	result, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup expired audit logs: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}
