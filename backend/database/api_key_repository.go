package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// APIKeyRepositoryImpl handles API key data access operations
type APIKeyRepositoryImpl struct {
	db interface{}
}

// NewAPIKeyRepository creates a new API key repository
func NewAPIKeyRepository(db interface{}) *APIKeyRepositoryImpl {
	return &APIKeyRepositoryImpl{db: db}
}

// getExecer returns the appropriate execer (DB or Tx)
func (r *APIKeyRepositoryImpl) getExecer() execer {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// CreateAPIKey creates a new API key
func (r *APIKeyRepositoryImpl) CreateAPIKey(ctx context.Context, apiKey *models.APIKey) (*models.APIKey, error) {
	query := `
		INSERT INTO api_keys (
			name, description, key_hash, key_prefix, secret_hash,
			permissions, scope_projects, scope_users,
			rate_limit_count, rate_limit_window, daily_quota, monthly_quota,
			is_active, expires_at, allowed_ips, allowed_domains, user_agent_pattern,
			created_by, metadata, tags
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8,
			$9, $10, $11, $12,
			$13, $14, $15, $16, $17,
			$18, $19, $20
		) RETURNING id, created_at, updated_at`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		apiKey.Name, apiKey.Description, apiKey.KeyHash, apiKey.KeyPrefix, apiKey.SecretHash,
		apiKey.Permissions, apiKey.ScopeProjects, apiKey.ScopeUsers,
		apiKey.RateLimitCount, apiKey.RateLimitWindow, apiKey.DailyQuota, apiKey.MonthlyQuota,
		apiKey.IsActive, apiKey.ExpiresAt, apiKey.AllowedIPs, apiKey.AllowedDomains, apiKey.UserAgentPattern,
		apiKey.CreatedBy, apiKey.Metadata, apiKey.Tags)

	err := row.Scan(&apiKey.ID, &apiKey.CreatedAt, &apiKey.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create API key: %w", err)
	}

	return apiKey, nil
}

// GetAPIKeyByID retrieves an API key by ID
func (r *APIKeyRepositoryImpl) GetAPIKeyByID(ctx context.Context, id int64) (*models.APIKey, error) {
	query := `
		SELECT 
			id, name, description, key_hash, key_prefix, secret_hash,
			permissions, scope_projects, scope_users,
			rate_limit_count, rate_limit_window, daily_quota, monthly_quota,
			is_active, expires_at, last_used_at, usage_count,
			allowed_ips, allowed_domains, user_agent_pattern,
			created_by, created_at, updated_by, updated_at, deleted_at,
			metadata, tags
		FROM api_keys
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, id)

	apiKey := &models.APIKey{}
	err := row.Scan(
		&apiKey.ID, &apiKey.Name, &apiKey.Description, &apiKey.KeyHash, &apiKey.KeyPrefix, &apiKey.SecretHash,
		&apiKey.Permissions, &apiKey.ScopeProjects, &apiKey.ScopeUsers,
		&apiKey.RateLimitCount, &apiKey.RateLimitWindow, &apiKey.DailyQuota, &apiKey.MonthlyQuota,
		&apiKey.IsActive, &apiKey.ExpiresAt, &apiKey.LastUsedAt, &apiKey.UsageCount,
		&apiKey.AllowedIPs, &apiKey.AllowedDomains, &apiKey.UserAgentPattern,
		&apiKey.CreatedBy, &apiKey.CreatedAt, &apiKey.UpdatedBy, &apiKey.UpdatedAt, &apiKey.DeletedAt,
		&apiKey.Metadata, &apiKey.Tags)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("API key not found")
		}
		return nil, fmt.Errorf("failed to get API key: %w", err)
	}

	return apiKey, nil
}

// GetAPIKeyByHash retrieves an API key by its hash
func (r *APIKeyRepositoryImpl) GetAPIKeyByHash(ctx context.Context, keyHash string) (*models.APIKey, error) {
	query := `
		SELECT 
			id, name, description, key_hash, key_prefix, secret_hash,
			permissions, scope_projects, scope_users,
			rate_limit_count, rate_limit_window, daily_quota, monthly_quota,
			is_active, expires_at, last_used_at, usage_count,
			allowed_ips, allowed_domains, user_agent_pattern,
			created_by, created_at, updated_by, updated_at, deleted_at,
			metadata, tags
		FROM api_keys
		WHERE key_hash = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, keyHash)

	apiKey := &models.APIKey{}
	err := row.Scan(
		&apiKey.ID, &apiKey.Name, &apiKey.Description, &apiKey.KeyHash, &apiKey.KeyPrefix, &apiKey.SecretHash,
		&apiKey.Permissions, &apiKey.ScopeProjects, &apiKey.ScopeUsers,
		&apiKey.RateLimitCount, &apiKey.RateLimitWindow, &apiKey.DailyQuota, &apiKey.MonthlyQuota,
		&apiKey.IsActive, &apiKey.ExpiresAt, &apiKey.LastUsedAt, &apiKey.UsageCount,
		&apiKey.AllowedIPs, &apiKey.AllowedDomains, &apiKey.UserAgentPattern,
		&apiKey.CreatedBy, &apiKey.CreatedAt, &apiKey.UpdatedBy, &apiKey.UpdatedAt, &apiKey.DeletedAt,
		&apiKey.Metadata, &apiKey.Tags)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("API key not found")
		}
		return nil, fmt.Errorf("failed to get API key by hash: %w", err)
	}

	return apiKey, nil
}

// UpdateAPIKey updates an existing API key
func (r *APIKeyRepositoryImpl) UpdateAPIKey(ctx context.Context, id int64, updates *models.APIKeyUpdateRequest, updatedBy int) (*models.APIKey, error) {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	// Build dynamic SET clause
	if updates.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updates.Name)
		argIndex++
	}
	if updates.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, *updates.Description)
		argIndex++
	}
	if updates.Permissions != nil {
		setParts = append(setParts, fmt.Sprintf("permissions = $%d", argIndex))
		args = append(args, updates.Permissions)
		argIndex++
	}
	if updates.ScopeProjects != nil {
		setParts = append(setParts, fmt.Sprintf("scope_projects = $%d", argIndex))
		args = append(args, updates.ScopeProjects)
		argIndex++
	}
	if updates.ScopeUsers != nil {
		setParts = append(setParts, fmt.Sprintf("scope_users = $%d", argIndex))
		args = append(args, updates.ScopeUsers)
		argIndex++
	}
	if updates.RateLimitCount != nil {
		setParts = append(setParts, fmt.Sprintf("rate_limit_count = $%d", argIndex))
		args = append(args, *updates.RateLimitCount)
		argIndex++
	}
	if updates.RateLimitWindow != nil {
		setParts = append(setParts, fmt.Sprintf("rate_limit_window = $%d", argIndex))
		args = append(args, *updates.RateLimitWindow)
		argIndex++
	}
	if updates.DailyQuota != nil {
		setParts = append(setParts, fmt.Sprintf("daily_quota = $%d", argIndex))
		args = append(args, *updates.DailyQuota)
		argIndex++
	}
	if updates.MonthlyQuota != nil {
		setParts = append(setParts, fmt.Sprintf("monthly_quota = $%d", argIndex))
		args = append(args, *updates.MonthlyQuota)
		argIndex++
	}
	if updates.IsActive != nil {
		setParts = append(setParts, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *updates.IsActive)
		argIndex++
	}
	if updates.ExpiresAt != nil {
		setParts = append(setParts, fmt.Sprintf("expires_at = $%d", argIndex))
		args = append(args, *updates.ExpiresAt)
		argIndex++
	}
	if updates.AllowedIPs != nil {
		setParts = append(setParts, fmt.Sprintf("allowed_ips = $%d", argIndex))
		args = append(args, updates.AllowedIPs)
		argIndex++
	}
	if updates.AllowedDomains != nil {
		setParts = append(setParts, fmt.Sprintf("allowed_domains = $%d", argIndex))
		args = append(args, updates.AllowedDomains)
		argIndex++
	}
	if updates.UserAgentPattern != nil {
		setParts = append(setParts, fmt.Sprintf("user_agent_pattern = $%d", argIndex))
		args = append(args, *updates.UserAgentPattern)
		argIndex++
	}
	if updates.Metadata != nil {
		setParts = append(setParts, fmt.Sprintf("metadata = $%d", argIndex))
		args = append(args, updates.Metadata)
		argIndex++
	}
	if updates.Tags != nil {
		setParts = append(setParts, fmt.Sprintf("tags = $%d", argIndex))
		args = append(args, updates.Tags)
		argIndex++
	}

	if len(setParts) == 0 {
		return r.GetAPIKeyByID(ctx, id)
	}

	// Add updated_by and updated_at
	setParts = append(setParts, fmt.Sprintf("updated_by = $%d", argIndex))
	args = append(args, updatedBy)
	argIndex++

	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add WHERE clause
	args = append(args, id)

	query := fmt.Sprintf(`
		UPDATE api_keys 
		SET %s
		WHERE id = $%d AND deleted_at IS NULL`,
		strings.Join(setParts, ", "), argIndex)

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update API key: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return nil, fmt.Errorf("API key not found or already deleted")
	}

	return r.GetAPIKeyByID(ctx, id)
}

// DeleteAPIKey soft deletes an API key
func (r *APIKeyRepositoryImpl) DeleteAPIKey(ctx context.Context, id int64, deletedBy int) error {
	query := `
		UPDATE api_keys 
		SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
		WHERE id = $2 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, deletedBy, id)
	if err != nil {
		return fmt.Errorf("failed to delete API key: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API key not found or already deleted")
	}

	return nil
}

// ListAPIKeys retrieves a paginated list of API keys
func (r *APIKeyRepositoryImpl) ListAPIKeys(ctx context.Context, params *models.APIKeyListParams) ([]models.APIKey, int, error) {
	// Build WHERE clause
	whereParts := []string{"deleted_at IS NULL"}
	args := []interface{}{}
	argIndex := 1

	if params.Search != "" {
		whereParts = append(whereParts, fmt.Sprintf("(name ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+params.Search+"%")
		argIndex++
	}

	if params.IsActive != nil {
		whereParts = append(whereParts, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *params.IsActive)
		argIndex++
	}

	if params.CreatedBy != nil {
		whereParts = append(whereParts, fmt.Sprintf("created_by = $%d", argIndex))
		args = append(args, *params.CreatedBy)
		argIndex++
	}

	if params.HasExpired != nil {
		if *params.HasExpired {
			whereParts = append(whereParts, "expires_at IS NOT NULL AND expires_at <= NOW()")
		} else {
			whereParts = append(whereParts, "(expires_at IS NULL OR expires_at > NOW())")
		}
	}

	if len(params.Permissions) > 0 {
		whereParts = append(whereParts, fmt.Sprintf("permissions && $%d", argIndex))
		args = append(args, params.Permissions)
		argIndex++
	}

	if len(params.Tags) > 0 {
		whereParts = append(whereParts, fmt.Sprintf("tags && $%d", argIndex))
		args = append(args, params.Tags)
		argIndex++
	}

	whereClause := strings.Join(whereParts, " AND ")

	// Build ORDER BY clause
	orderBy := "created_at DESC"
	if params.SortBy != "" {
		direction := "ASC"
		if params.SortOrder == "desc" {
			direction = "DESC"
		}
		orderBy = fmt.Sprintf("%s %s", params.SortBy, direction)
	}

	// Count total records
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM api_keys WHERE %s", whereClause)
	exec := r.getExecer()
	var total int
	err := exec.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count API keys: %w", err)
	}

	// Calculate offset
	offset := (params.Page - 1) * params.PageSize

	// Build main query
	query := fmt.Sprintf(`
		SELECT 
			id, name, description, key_hash, key_prefix, secret_hash,
			permissions, scope_projects, scope_users,
			rate_limit_count, rate_limit_window, daily_quota, monthly_quota,
			is_active, expires_at, last_used_at, usage_count,
			allowed_ips, allowed_domains, user_agent_pattern,
			created_by, created_at, updated_by, updated_at, deleted_at,
			metadata, tags
		FROM api_keys
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`,
		whereClause, orderBy, argIndex, argIndex+1)

	args = append(args, params.PageSize, offset)

	rows, err := exec.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list API keys: %w", err)
	}
	defer rows.Close()

	var apiKeys []models.APIKey
	for rows.Next() {
		var apiKey models.APIKey
		err := rows.Scan(
			&apiKey.ID, &apiKey.Name, &apiKey.Description, &apiKey.KeyHash, &apiKey.KeyPrefix, &apiKey.SecretHash,
			&apiKey.Permissions, &apiKey.ScopeProjects, &apiKey.ScopeUsers,
			&apiKey.RateLimitCount, &apiKey.RateLimitWindow, &apiKey.DailyQuota, &apiKey.MonthlyQuota,
			&apiKey.IsActive, &apiKey.ExpiresAt, &apiKey.LastUsedAt, &apiKey.UsageCount,
			&apiKey.AllowedIPs, &apiKey.AllowedDomains, &apiKey.UserAgentPattern,
			&apiKey.CreatedBy, &apiKey.CreatedAt, &apiKey.UpdatedBy, &apiKey.UpdatedAt, &apiKey.DeletedAt,
			&apiKey.Metadata, &apiKey.Tags)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan API key: %w", err)
		}
		apiKeys = append(apiKeys, apiKey)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating API keys: %w", err)
	}

	return apiKeys, total, nil
}

// UpdateLastUsed updates the last used timestamp and increments usage count
func (r *APIKeyRepositoryImpl) UpdateLastUsed(ctx context.Context, id int64) error {
	query := `
		UPDATE api_keys 
		SET last_used_at = NOW(), usage_count = usage_count + 1, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to update last used: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API key not found or already deleted")
	}

	return nil
}

// GetActiveAPIKeys retrieves all active API keys
func (r *APIKeyRepositoryImpl) GetActiveAPIKeys(ctx context.Context) ([]models.APIKey, error) {
	query := `
		SELECT 
			id, name, description, key_hash, key_prefix, secret_hash,
			permissions, scope_projects, scope_users,
			rate_limit_count, rate_limit_window, daily_quota, monthly_quota,
			is_active, expires_at, last_used_at, usage_count,
			allowed_ips, allowed_domains, user_agent_pattern,
			created_by, created_at, updated_by, updated_at, deleted_at,
			metadata, tags
		FROM api_keys
		WHERE is_active = true 
		  AND (expires_at IS NULL OR expires_at > NOW())
		  AND deleted_at IS NULL
		ORDER BY created_at DESC`

	exec := r.getExecer()
	rows, err := exec.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get active API keys: %w", err)
	}
	defer rows.Close()

	var apiKeys []models.APIKey
	for rows.Next() {
		var apiKey models.APIKey
		err := rows.Scan(
			&apiKey.ID, &apiKey.Name, &apiKey.Description, &apiKey.KeyHash, &apiKey.KeyPrefix, &apiKey.SecretHash,
			&apiKey.Permissions, &apiKey.ScopeProjects, &apiKey.ScopeUsers,
			&apiKey.RateLimitCount, &apiKey.RateLimitWindow, &apiKey.DailyQuota, &apiKey.MonthlyQuota,
			&apiKey.IsActive, &apiKey.ExpiresAt, &apiKey.LastUsedAt, &apiKey.UsageCount,
			&apiKey.AllowedIPs, &apiKey.AllowedDomains, &apiKey.UserAgentPattern,
			&apiKey.CreatedBy, &apiKey.CreatedAt, &apiKey.UpdatedBy, &apiKey.UpdatedAt, &apiKey.DeletedAt,
			&apiKey.Metadata, &apiKey.Tags)
		if err != nil {
			return nil, fmt.Errorf("failed to scan API key: %w", err)
		}
		apiKeys = append(apiKeys, apiKey)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating active API keys: %w", err)
	}

	return apiKeys, nil
}

// CreateUsageLog creates an API usage log entry
func (r *APIKeyRepositoryImpl) CreateUsageLog(ctx context.Context, log *models.APIUsageLog) error {
	query := `
		INSERT INTO api_usage_logs (
			api_key_id, user_id, endpoint, method, request_size, response_size,
			ip_address, user_agent, referer, x_forwarded_for,
			request_timestamp, response_timestamp, response_time_ms,
			response_status, response_type, error_message, error_code,
			action_type, resource_type, resource_id, project_id,
			rate_limited, blocked_reason, security_flags,
			quota_remaining, request_sequence,
			request_headers, request_params, response_metadata,
			correlation_id, trace_id
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13,
			$14, $15, $16, $17,
			$18, $19, $20, $21,
			$22, $23, $24,
			$25, $26,
			$27, $28, $29,
			$30, $31
		) RETURNING id`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query,
		log.APIKeyID, log.UserID, log.Endpoint, log.Method, log.RequestSize, log.ResponseSize,
		log.IPAddress, log.UserAgent, log.Referer, log.XForwardedFor,
		log.RequestTimestamp, log.ResponseTimestamp, log.ResponseTimeMs,
		log.ResponseStatus, log.ResponseType, log.ErrorMessage, log.ErrorCode,
		log.ActionType, log.ResourceType, log.ResourceID, log.ProjectID,
		log.RateLimited, log.BlockedReason, log.SecurityFlags,
		log.QuotaRemaining, log.RequestSequence,
		log.RequestHeaders, log.RequestParams, log.ResponseMetadata,
		log.CorrelationID, log.TraceID)

	err := row.Scan(&log.ID)
	if err != nil {
		return fmt.Errorf("failed to create usage log: %w", err)
	}

	return nil
}

// GetUsageStats retrieves usage statistics for an API key
func (r *APIKeyRepositoryImpl) GetUsageStats(ctx context.Context, apiKeyID int64, days int) (*models.APIQuotaStats, error) {
	query := `
		SELECT 
			COUNT(*) as request_count,
			SUM(CASE WHEN response_status < 400 THEN 1 ELSE 0 END) as success_count,
			SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count,
			SUM(CASE WHEN rate_limited THEN 1 ELSE 0 END) as rate_limit_count,
			COALESCE(AVG(response_time_ms), 0) as avg_response_time_ms
		FROM api_usage_logs
		WHERE api_key_id = $1
		  AND request_timestamp >= NOW() - INTERVAL '%d days'`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, fmt.Sprintf(query, days), apiKeyID)

	stats := &models.APIQuotaStats{
		APIKeyID: apiKeyID,
		StatDate: time.Now().Truncate(24 * time.Hour),
	}

	var avgResponseTime float64
	err := row.Scan(
		&stats.RequestCount,
		&stats.SuccessCount,
		&stats.ErrorCount,
		&stats.RateLimitCount,
		&avgResponseTime)

	if err != nil {
		return nil, fmt.Errorf("failed to get usage stats: %w", err)
	}

	stats.AvgResponseTimeMs = int(avgResponseTime)

	return stats, nil
}

// CheckRateLimit checks if an API key has exceeded its rate limit
func (r *APIKeyRepositoryImpl) CheckRateLimit(ctx context.Context, apiKeyID int64, window models.RateLimitType, limit int) (bool, error) {
	var windowStart time.Time
	now := time.Now()

	switch window {
	case models.RateLimitPerMinute:
		windowStart = now.Truncate(time.Minute)
	case models.RateLimitPerHour:
		windowStart = now.Truncate(time.Hour)
	case models.RateLimitPerDay:
		windowStart = now.Truncate(24 * time.Hour)
	case models.RateLimitPerMonth:
		windowStart = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	default:
		return false, fmt.Errorf("invalid rate limit window: %s", window)
	}

	query := `
		SELECT COUNT(*)
		FROM api_usage_logs
		WHERE api_key_id = $1
		  AND request_timestamp >= $2`

	exec := r.getExecer()
	var count int
	err := exec.QueryRowContext(ctx, query, apiKeyID, windowStart).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check rate limit: %w", err)
	}

	return count >= limit, nil
}

// GetAPIKeyByPrefix retrieves an API key by its prefix
func (r *APIKeyRepositoryImpl) GetAPIKeyByPrefix(ctx context.Context, keyPrefix string) (*models.APIKey, error) {
	query := `
		SELECT 
			id, name, description, key_hash, key_prefix, secret_hash,
			permissions, scope_projects, scope_users,
			rate_limit_count, rate_limit_window, daily_quota, monthly_quota,
			is_active, expires_at, last_used_at, usage_count,
			allowed_ips, allowed_domains, user_agent_pattern,
			created_by, created_at, updated_by, updated_at, deleted_at,
			metadata, tags
		FROM api_keys
		WHERE key_prefix = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	row := exec.QueryRowContext(ctx, query, keyPrefix)

	apiKey := &models.APIKey{}
	err := row.Scan(
		&apiKey.ID, &apiKey.Name, &apiKey.Description, &apiKey.KeyHash, &apiKey.KeyPrefix, &apiKey.SecretHash,
		&apiKey.Permissions, &apiKey.ScopeProjects, &apiKey.ScopeUsers,
		&apiKey.RateLimitCount, &apiKey.RateLimitWindow, &apiKey.DailyQuota, &apiKey.MonthlyQuota,
		&apiKey.IsActive, &apiKey.ExpiresAt, &apiKey.LastUsedAt, &apiKey.UsageCount,
		&apiKey.AllowedIPs, &apiKey.AllowedDomains, &apiKey.UserAgentPattern,
		&apiKey.CreatedBy, &apiKey.CreatedAt, &apiKey.UpdatedBy, &apiKey.UpdatedAt, &apiKey.DeletedAt,
		&apiKey.Metadata, &apiKey.Tags)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("API key not found")
		}
		return nil, fmt.Errorf("failed to get API key by prefix: %w", err)
	}

	return apiKey, nil
}

// UpdateAPIKeyUsage updates the API key usage statistics
func (r *APIKeyRepositoryImpl) UpdateAPIKeyUsage(ctx context.Context, apiKeyID int64) error {
	query := `
		UPDATE api_keys 
		SET last_used_at = NOW(), usage_count = usage_count + 1, updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL`

	exec := r.getExecer()
	result, err := exec.ExecContext(ctx, query, apiKeyID)
	if err != nil {
		return fmt.Errorf("failed to update API key usage: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API key not found or already deleted")
	}

	return nil
}

// CreateAPIUsageLog creates an API usage log entry
func (r *APIKeyRepositoryImpl) CreateAPIUsageLog(ctx context.Context, log *models.APIUsageLog) error {
	return r.CreateUsageLog(ctx, log)
}