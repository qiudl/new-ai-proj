package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"ai-project-backend/models"
	"ai-project-backend/utils"
)

// GoogleAuthRepository Google认证相关的数据库操作接口
type GoogleAuthRepository interface {
	// OAuth State management
	CreateOAuthState(ctx context.Context, userID int) (*models.OAuthState, error)
	GetOAuthState(ctx context.Context, state string) (*models.OAuthState, error)
	DeleteOAuthState(ctx context.Context, state string) error
	CleanupExpiredOAuthStates(ctx context.Context) (int, error)

	// Google Token management
	SaveGoogleToken(ctx context.Context, token *models.GoogleToken) error
	GetGoogleToken(ctx context.Context, userID int) (*models.GoogleToken, error)
	UpdateGoogleToken(ctx context.Context, token *models.GoogleToken) error
	DeleteGoogleToken(ctx context.Context, userID int) error

	// Calendar Sync management
	SaveCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error
	GetUserCalendarSyncs(ctx context.Context, userID int) ([]*models.GoogleCalendarSync, error)
	UpdateCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error
	DeleteCalendarSync(ctx context.Context, userID int, calendarID string) error

	// Event Mapping management
	CreateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error
	GetEventMapping(ctx context.Context, taskID int) (*models.GoogleEventMapping, error)
	GetEventMappingByGoogleEventID(ctx context.Context, googleEventID string) (*models.GoogleEventMapping, error)
	UpdateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error
	DeleteEventMapping(ctx context.Context, taskID int) error
	GetUserEventMappings(ctx context.Context, userID int) ([]*models.GoogleEventMapping, error)

	// Sync Logging
	CreateSyncLog(ctx context.Context, log *models.GoogleSyncLog) error
	GetUserSyncLogs(ctx context.Context, userID int, limit int) ([]*models.GoogleSyncLog, error)

	// User Google preferences
	UpdateUserGooglePreferences(ctx context.Context, userID int, preferences models.GoogleSyncPreferences) error
	GetUserGooglePreferences(ctx context.Context, userID int) (*models.GoogleSyncPreferences, error)
	SetUserGoogleCalendarEnabled(ctx context.Context, userID int, enabled bool) error
}

// googleAuthRepository Google认证Repository的实现
type googleAuthRepository struct {
	db *sql.DB
}

// NewGoogleAuthRepository 创建新的Google认证Repository
func NewGoogleAuthRepository(db *sql.DB) GoogleAuthRepository {
	return &googleAuthRepository{db: db}
}

// CreateOAuthState 创建OAuth状态记录
func (r *googleAuthRepository) CreateOAuthState(ctx context.Context, userID int) (*models.OAuthState, error) {
	// 生成随机state
	state, err := utils.GenerateRandomString(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate state: %v", err)
	}

	// 设置过期时间为15分钟后
	expiresAt := time.Now().Add(models.OAuthStateExpirationMinutes * time.Minute)

	query := `
		INSERT INTO oauth_states (state, user_id, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, created_at`

	oauthState := &models.OAuthState{
		State:     state,
		UserID:    userID,
		ExpiresAt: expiresAt,
	}

	err = r.db.QueryRowContext(ctx, query, state, userID, expiresAt).Scan(
		&oauthState.ID, &oauthState.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create oauth state: %v", err)
	}

	return oauthState, nil
}

// GetOAuthState 获取OAuth状态记录
func (r *googleAuthRepository) GetOAuthState(ctx context.Context, state string) (*models.OAuthState, error) {
	query := `
		SELECT id, state, user_id, expires_at, created_at
		FROM oauth_states
		WHERE state = $1`

	oauthState := &models.OAuthState{}
	err := r.db.QueryRowContext(ctx, query, state).Scan(
		&oauthState.ID, &oauthState.State, &oauthState.UserID,
		&oauthState.ExpiresAt, &oauthState.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("oauth state not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get oauth state: %v", err)
	}

	return oauthState, nil
}

// DeleteOAuthState 删除OAuth状态记录
func (r *googleAuthRepository) DeleteOAuthState(ctx context.Context, state string) error {
	query := `DELETE FROM oauth_states WHERE state = $1`

	result, err := r.db.ExecContext(ctx, query, state)
	if err != nil {
		return fmt.Errorf("failed to delete oauth state: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("oauth state not found")
	}

	return nil
}

// CleanupExpiredOAuthStates 清理过期的OAuth状态记录
func (r *googleAuthRepository) CleanupExpiredOAuthStates(ctx context.Context) (int, error) {
	query := `DELETE FROM oauth_states WHERE expires_at < $1`

	result, err := r.db.ExecContext(ctx, query, time.Now())
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup expired oauth states: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %v", err)
	}

	return int(rowsAffected), nil
}

// SaveGoogleToken 保存Google令牌
func (r *googleAuthRepository) SaveGoogleToken(ctx context.Context, token *models.GoogleToken) error {
	// 加密访问令牌和刷新令牌
	accessTokenEncrypted, err := utils.Encrypt(token.AccessToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt access token: %v", err)
	}

	refreshTokenEncrypted, err := utils.Encrypt(token.RefreshToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt refresh token: %v", err)
	}

	query := `
		INSERT INTO google_tokens (user_id, access_token_encrypted, refresh_token_encrypted, 
		                          token_type, expires_at, scopes)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) 
		DO UPDATE SET 
			access_token_encrypted = EXCLUDED.access_token_encrypted,
			refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
			token_type = EXCLUDED.token_type,
			expires_at = EXCLUDED.expires_at,
			scopes = EXCLUDED.scopes,
			updated_at = NOW()
		RETURNING id, created_at, updated_at`

	err = r.db.QueryRowContext(ctx, query,
		token.UserID, accessTokenEncrypted, refreshTokenEncrypted,
		token.TokenType, token.ExpiresAt, token.Scopes).Scan(
		&token.ID, &token.CreatedAt, &token.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to save google token: %v", err)
	}

	return nil
}

// GetGoogleToken 获取Google令牌
func (r *googleAuthRepository) GetGoogleToken(ctx context.Context, userID int) (*models.GoogleToken, error) {
	query := `
		SELECT id, user_id, access_token_encrypted, refresh_token_encrypted,
		       token_type, expires_at, scopes, created_at, updated_at, last_refresh_at
		FROM google_tokens
		WHERE user_id = $1`

	token := &models.GoogleToken{}
	var accessTokenEncrypted, refreshTokenEncrypted string

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&token.ID, &token.UserID, &accessTokenEncrypted, &refreshTokenEncrypted,
		&token.TokenType, &token.ExpiresAt, &token.Scopes,
		&token.CreatedAt, &token.UpdatedAt, &token.LastRefreshAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("google token not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get google token: %v", err)
	}

	// 解密令牌
	token.AccessToken, err = utils.Decrypt(accessTokenEncrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt access token: %v", err)
	}

	token.RefreshToken, err = utils.Decrypt(refreshTokenEncrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt refresh token: %v", err)
	}

	return token, nil
}

// UpdateGoogleToken 更新Google令牌
func (r *googleAuthRepository) UpdateGoogleToken(ctx context.Context, token *models.GoogleToken) error {
	// 加密新的令牌
	accessTokenEncrypted, err := utils.Encrypt(token.AccessToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt access token: %v", err)
	}

	refreshTokenEncrypted, err := utils.Encrypt(token.RefreshToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt refresh token: %v", err)
	}

	query := `
		UPDATE google_tokens 
		SET access_token_encrypted = $1, refresh_token_encrypted = $2,
		    expires_at = $3, last_refresh_at = $4, updated_at = NOW()
		WHERE user_id = $5`

	result, err := r.db.ExecContext(ctx, query,
		accessTokenEncrypted, refreshTokenEncrypted,
		token.ExpiresAt, time.Now(), token.UserID)

	if err != nil {
		return fmt.Errorf("failed to update google token: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("google token not found")
	}

	return nil
}

// DeleteGoogleToken 删除Google令牌
func (r *googleAuthRepository) DeleteGoogleToken(ctx context.Context, userID int) error {
	query := `DELETE FROM google_tokens WHERE user_id = $1`

	result, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete google token: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("google token not found")
	}

	return nil
}

// SaveCalendarSync 保存日历同步配置
func (r *googleAuthRepository) SaveCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error {
	query := `
		INSERT INTO google_calendar_sync (user_id, calendar_id, calendar_name, is_primary, 
		                                 sync_enabled, sync_direction)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, calendar_id)
		DO UPDATE SET 
			calendar_name = EXCLUDED.calendar_name,
			is_primary = EXCLUDED.is_primary,
			sync_enabled = EXCLUDED.sync_enabled,
			sync_direction = EXCLUDED.sync_direction,
			updated_at = NOW()
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		sync.UserID, sync.CalendarID, sync.CalendarName,
		sync.IsPrimary, sync.SyncEnabled, sync.SyncDirection).Scan(
		&sync.ID, &sync.CreatedAt, &sync.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to save calendar sync: %v", err)
	}

	return nil
}

// GetUserCalendarSyncs 获取用户的日历同步配置
func (r *googleAuthRepository) GetUserCalendarSyncs(ctx context.Context, userID int) ([]*models.GoogleCalendarSync, error) {
	query := `
		SELECT id, user_id, calendar_id, calendar_name, is_primary, sync_enabled,
		       last_sync_at, sync_direction, created_at, updated_at
		FROM google_calendar_sync
		WHERE user_id = $1
		ORDER BY is_primary DESC, calendar_name ASC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user calendar syncs: %v", err)
	}
	defer rows.Close()

	var syncs []*models.GoogleCalendarSync
	for rows.Next() {
		sync := &models.GoogleCalendarSync{}
		err := rows.Scan(
			&sync.ID, &sync.UserID, &sync.CalendarID, &sync.CalendarName,
			&sync.IsPrimary, &sync.SyncEnabled, &sync.LastSyncAt,
			&sync.SyncDirection, &sync.CreatedAt, &sync.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan calendar sync: %v", err)
		}
		syncs = append(syncs, sync)
	}

	return syncs, nil
}

// UpdateCalendarSync 更新日历同步配置
func (r *googleAuthRepository) UpdateCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error {
	query := `
		UPDATE google_calendar_sync 
		SET sync_enabled = $1, sync_direction = $2, last_sync_at = $3, updated_at = NOW()
		WHERE id = $4`

	result, err := r.db.ExecContext(ctx, query,
		sync.SyncEnabled, sync.SyncDirection, sync.LastSyncAt, sync.ID)

	if err != nil {
		return fmt.Errorf("failed to update calendar sync: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("calendar sync not found")
	}

	return nil
}

// DeleteCalendarSync 删除日历同步配置
func (r *googleAuthRepository) DeleteCalendarSync(ctx context.Context, userID int, calendarID string) error {
	query := `DELETE FROM google_calendar_sync WHERE user_id = $1 AND calendar_id = $2`

	result, err := r.db.ExecContext(ctx, query, userID, calendarID)
	if err != nil {
		return fmt.Errorf("failed to delete calendar sync: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("calendar sync not found")
	}

	return nil
}

// CreateEventMapping 创建事件映射
func (r *googleAuthRepository) CreateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error {
	query := `
		INSERT INTO google_event_mappings (user_id, task_id, google_event_id, google_calendar_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, last_synced_at, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		mapping.UserID, mapping.TaskID, mapping.GoogleEventID, mapping.GoogleCalendarID).Scan(
		&mapping.ID, &mapping.LastSyncedAt, &mapping.CreatedAt, &mapping.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create event mapping: %v", err)
	}

	return nil
}

// GetEventMapping 根据任务ID获取事件映射
func (r *googleAuthRepository) GetEventMapping(ctx context.Context, taskID int) (*models.GoogleEventMapping, error) {
	query := `
		SELECT id, user_id, task_id, google_event_id, google_calendar_id,
		       last_synced_at, sync_status, error_message, created_at, updated_at
		FROM google_event_mappings
		WHERE task_id = $1`

	mapping := &models.GoogleEventMapping{}
	err := r.db.QueryRowContext(ctx, query, taskID).Scan(
		&mapping.ID, &mapping.UserID, &mapping.TaskID, &mapping.GoogleEventID,
		&mapping.GoogleCalendarID, &mapping.LastSyncedAt, &mapping.SyncStatus,
		&mapping.ErrorMessage, &mapping.CreatedAt, &mapping.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("event mapping not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get event mapping: %v", err)
	}

	return mapping, nil
}

// GetEventMappingByGoogleEventID 根据Google事件ID获取事件映射
func (r *googleAuthRepository) GetEventMappingByGoogleEventID(ctx context.Context, googleEventID string) (*models.GoogleEventMapping, error) {
	query := `
		SELECT id, user_id, task_id, google_event_id, google_calendar_id,
		       last_synced_at, sync_status, error_message, created_at, updated_at
		FROM google_event_mappings
		WHERE google_event_id = $1`

	mapping := &models.GoogleEventMapping{}
	err := r.db.QueryRowContext(ctx, query, googleEventID).Scan(
		&mapping.ID, &mapping.UserID, &mapping.TaskID, &mapping.GoogleEventID,
		&mapping.GoogleCalendarID, &mapping.LastSyncedAt, &mapping.SyncStatus,
		&mapping.ErrorMessage, &mapping.CreatedAt, &mapping.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("event mapping not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get event mapping: %v", err)
	}

	return mapping, nil
}

// UpdateEventMapping 更新事件映射
func (r *googleAuthRepository) UpdateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error {
	query := `
		UPDATE google_event_mappings 
		SET sync_status = $1, error_message = $2, last_synced_at = $3, updated_at = NOW()
		WHERE id = $4`

	result, err := r.db.ExecContext(ctx, query,
		mapping.SyncStatus, mapping.ErrorMessage, mapping.LastSyncedAt, mapping.ID)

	if err != nil {
		return fmt.Errorf("failed to update event mapping: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("event mapping not found")
	}

	return nil
}

// DeleteEventMapping 删除事件映射
func (r *googleAuthRepository) DeleteEventMapping(ctx context.Context, taskID int) error {
	query := `DELETE FROM google_event_mappings WHERE task_id = $1`

	result, err := r.db.ExecContext(ctx, query, taskID)
	if err != nil {
		return fmt.Errorf("failed to delete event mapping: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("event mapping not found")
	}

	return nil
}

// GetUserEventMappings 获取用户的事件映射
func (r *googleAuthRepository) GetUserEventMappings(ctx context.Context, userID int) ([]*models.GoogleEventMapping, error) {
	query := `
		SELECT id, user_id, task_id, google_event_id, google_calendar_id,
		       last_synced_at, sync_status, error_message, created_at, updated_at
		FROM google_event_mappings
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user event mappings: %v", err)
	}
	defer rows.Close()

	var mappings []*models.GoogleEventMapping
	for rows.Next() {
		mapping := &models.GoogleEventMapping{}
		err := rows.Scan(
			&mapping.ID, &mapping.UserID, &mapping.TaskID, &mapping.GoogleEventID,
			&mapping.GoogleCalendarID, &mapping.LastSyncedAt, &mapping.SyncStatus,
			&mapping.ErrorMessage, &mapping.CreatedAt, &mapping.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event mapping: %v", err)
		}
		mappings = append(mappings, mapping)
	}

	return mappings, nil
}

// CreateSyncLog 创建同步日志
func (r *googleAuthRepository) CreateSyncLog(ctx context.Context, log *models.GoogleSyncLog) error {
	query := `
		INSERT INTO google_sync_logs (user_id, operation, resource_type, resource_id,
		                             status, message, details, execution_time_ms)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at`

	err := r.db.QueryRowContext(ctx, query,
		log.UserID, log.Operation, log.ResourceType, log.ResourceID,
		log.Status, log.Message, log.Details, log.ExecutionTimeMs).Scan(
		&log.ID, &log.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create sync log: %v", err)
	}

	return nil
}

// GetUserSyncLogs 获取用户的同步日志
func (r *googleAuthRepository) GetUserSyncLogs(ctx context.Context, userID int, limit int) ([]*models.GoogleSyncLog, error) {
	query := `
		SELECT id, user_id, operation, resource_type, resource_id,
		       status, message, details, execution_time_ms, created_at
		FROM google_sync_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2`

	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get user sync logs: %v", err)
	}
	defer rows.Close()

	var logs []*models.GoogleSyncLog
	for rows.Next() {
		log := &models.GoogleSyncLog{}
		err := rows.Scan(
			&log.ID, &log.UserID, &log.Operation, &log.ResourceType,
			&log.ResourceID, &log.Status, &log.Message, &log.Details,
			&log.ExecutionTimeMs, &log.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan sync log: %v", err)
		}
		logs = append(logs, log)
	}

	return logs, nil
}

// UpdateUserGooglePreferences 更新用户Google偏好设置
func (r *googleAuthRepository) UpdateUserGooglePreferences(ctx context.Context, userID int, preferences models.GoogleSyncPreferences) error {
	query := `
		UPDATE users 
		SET google_sync_preferences = $1
		WHERE id = $2`

	result, err := r.db.ExecContext(ctx, query, preferences, userID)
	if err != nil {
		return fmt.Errorf("failed to update user google preferences: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

// GetUserGooglePreferences 获取用户Google偏好设置
func (r *googleAuthRepository) GetUserGooglePreferences(ctx context.Context, userID int) (*models.GoogleSyncPreferences, error) {
	query := `SELECT google_sync_preferences FROM users WHERE id = $1`

	preferences := &models.GoogleSyncPreferences{}
	err := r.db.QueryRowContext(ctx, query, userID).Scan(preferences)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user google preferences: %v", err)
	}

	return preferences, nil
}

// SetUserGoogleCalendarEnabled 设置用户Google日历启用状态
func (r *googleAuthRepository) SetUserGoogleCalendarEnabled(ctx context.Context, userID int, enabled bool) error {
	var connectedAt interface{}
	if enabled {
		connectedAt = time.Now()
	}

	query := `
		UPDATE users 
		SET google_calendar_enabled = $1, google_calendar_connected_at = $2
		WHERE id = $3`

	result, err := r.db.ExecContext(ctx, query, enabled, connectedAt, userID)
	if err != nil {
		return fmt.Errorf("failed to set user google calendar enabled: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %v", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}
