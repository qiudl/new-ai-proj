package services

import (
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"database/sql"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// KeyRotationService API密钥轮换服务
type KeyRotationService struct {
	db                *sqlx.DB
	encryptionService *utils.EncryptionService
}

// NewKeyRotationService 创建密钥轮换服务实例
func NewKeyRotationService(db *sqlx.DB, encryptionService *utils.EncryptionService) *KeyRotationService {
	return &KeyRotationService{
		db:                db,
		encryptionService: encryptionService,
	}
}

// RotateAPIKey 轮换API密钥
func (s *KeyRotationService) RotateAPIKey(configID int, request *models.RotateKeyRequest, userID int) (*models.AIConfig, error) {
	tx, err := s.db.Beginx()
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 1. 获取现有配置
	var config models.AIConfig
	err = tx.Get(&config, `
		SELECT * FROM ai_configs WHERE id = $1 FOR UPDATE
	`, configID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("config not found")
		}
		return nil, fmt.Errorf("failed to get config: %w", err)
	}

	// 2. 加密新密钥
	encryptedKey, err := s.encryptionService.EncryptAPIKey(request.NewAPIKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt new API key: %w", err)
	}

	// 3. 生成新密钥的哈希
	newKeyHash := s.encryptionService.HashAPIKey(request.NewAPIKey)

	// 4. 更新配置（触发器会自动记录历史）
	now := time.Now()
	expiresAt := config.APIKeyExpiresAt

	// 如果指定了过期天数，设置新的过期时间
	if request.SetExpiryDays != nil && *request.SetExpiryDays > 0 {
		newExpiresAt := now.AddDate(0, 0, *request.SetExpiryDays)
		expiresAt = &newExpiresAt
	}

	// 如果启用自动轮换，根据轮换间隔设置过期时间
	if request.EnableAutoRotate != nil && *request.EnableAutoRotate {
		if request.RotationIntervalDays != nil && *request.RotationIntervalDays > 0 {
			newExpiresAt := now.AddDate(0, 0, *request.RotationIntervalDays)
			expiresAt = &newExpiresAt
		}
	}

	_, err = tx.Exec(`
		UPDATE ai_configs
		SET
			api_key_encrypted = $1,
			api_key_hash = $2,
			api_key_expires_at = $3,
			auto_rotate = COALESCE($4, auto_rotate),
			rotation_interval_days = COALESCE($5, rotation_interval_days),
			updated_by = $6,
			updated_at = $7
		WHERE id = $8
	`, encryptedKey, newKeyHash, expiresAt,
		request.EnableAutoRotate, request.RotationIntervalDays,
		userID, now, configID)

	if err != nil {
		return nil, fmt.Errorf("failed to update config: %w", err)
	}

	// 5. 更新历史记录的轮换原因（如果提供）
	if request.RotationReason != nil {
		_, err = tx.Exec(`
			UPDATE ai_config_key_history
			SET rotation_reason = $1
			WHERE config_id = $2
			AND valid_until IS NULL
			OR valid_until = (
				SELECT MAX(valid_until)
				FROM ai_config_key_history
				WHERE config_id = $2
			)
		`, request.RotationReason, configID)
		if err != nil {
			return nil, fmt.Errorf("failed to update rotation reason: %w", err)
		}
	}

	// 6. 创建轮换通知记录
	daysUntilExpiry := 0
	if expiresAt != nil {
		daysUntilExpiry = int(expiresAt.Sub(now).Hours() / 24)
	}

	_, err = tx.Exec(`
		INSERT INTO ai_config_expiry_notifications (
			config_id, provider, notification_type,
			days_until_expiry, notified_users
		) VALUES ($1, $2, 'rotated', $3, ARRAY[$4]::INTEGER[])
	`, configID, config.Provider, daysUntilExpiry, userID)

	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	// 7. 提交事务
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// 8. 重新查询更新后的配置
	err = s.db.Get(&config, `SELECT * FROM ai_configs WHERE id = $1`, configID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated config: %w", err)
	}

	return &config, nil
}

// CheckExpiredKeys 检查所有过期的密钥
func (s *KeyRotationService) CheckExpiredKeys() ([]*models.APIKeyExpiryStatus, error) {
	query := `
		SELECT
			id as config_id,
			provider,
			CASE
				WHEN api_key_expires_at IS NULL THEN 'never_expires'
				WHEN api_key_expires_at < CURRENT_TIMESTAMP THEN 'expired'
				WHEN api_key_expires_at < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'expiring_soon'
				WHEN api_key_expires_at < CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'expiring_later'
				ELSE 'valid'
			END AS expiry_status,
			CASE
				WHEN api_key_expires_at IS NULL THEN NULL
				ELSE EXTRACT(DAY FROM (api_key_expires_at - CURRENT_TIMESTAMP))::INTEGER
			END AS days_until_expiry,
			api_key_expires_at as expires_at,
			api_key_rotation_count as rotation_count,
			api_key_rotated_at as last_rotated_at
		FROM ai_configs
		WHERE enabled = TRUE
		ORDER BY api_key_expires_at NULLS LAST
	`

	var statuses []*models.APIKeyExpiryStatus
	err := s.db.Select(&statuses, query)
	if err != nil {
		return nil, fmt.Errorf("failed to check expired keys: %w", err)
	}

	return statuses, nil
}

// AutoDisableExpiredKeys 自动禁用所有过期的密钥
func (s *KeyRotationService) AutoDisableExpiredKeys() (int, error) {
	result, err := s.db.Exec(`
		UPDATE ai_configs
		SET
			enabled = FALSE,
			updated_at = CURRENT_TIMESTAMP,
			updated_by = 1
		WHERE
			enabled = TRUE
			AND api_key_expires_at IS NOT NULL
			AND api_key_expires_at < CURRENT_TIMESTAMP
	`)

	if err != nil {
		return 0, fmt.Errorf("failed to disable expired keys: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	// 记录禁用通知
	if rowsAffected > 0 {
		_, err = s.db.Exec(`
			INSERT INTO ai_config_expiry_notifications (
				config_id, provider, notification_type, days_until_expiry
			)
			SELECT
				id,
				provider,
				'expired',
				EXTRACT(DAY FROM (CURRENT_TIMESTAMP - api_key_expires_at))::INTEGER
			FROM ai_configs
			WHERE
				enabled = FALSE
				AND api_key_expires_at IS NOT NULL
				AND api_key_expires_at < CURRENT_TIMESTAMP
				AND NOT EXISTS (
					SELECT 1 FROM ai_config_expiry_notifications
					WHERE config_id = ai_configs.id
					AND notification_type = 'expired'
					AND notification_time > CURRENT_TIMESTAMP - INTERVAL '1 day'
				)
		`)
		if err != nil {
			return int(rowsAffected), fmt.Errorf("disabled %d keys but failed to create notifications: %w", rowsAffected, err)
		}
	}

	return int(rowsAffected), nil
}

// SendExpiryWarnings 发送即将过期的警告
func (s *KeyRotationService) SendExpiryWarnings() (int, error) {
	// 查询需要发送警告的配置
	var configs []models.AIConfig
	err := s.db.Select(&configs, `
		SELECT *
		FROM ai_configs
		WHERE
			enabled = TRUE
			AND api_key_expires_at IS NOT NULL
			AND api_key_expires_at < CURRENT_TIMESTAMP + INTERVAL '7 days'
			AND api_key_expires_at > CURRENT_TIMESTAMP
			AND expiry_warning_sent = FALSE
	`)

	if err != nil {
		return 0, fmt.Errorf("failed to query configs for warnings: %w", err)
	}

	warningCount := 0
	for _, config := range configs {
		// 计算剩余天数
		daysRemaining := int(config.APIKeyExpiresAt.Sub(time.Now()).Hours() / 24)

		// 创建警告通知记录
		_, err := s.db.Exec(`
			INSERT INTO ai_config_expiry_notifications (
				config_id, provider, notification_type, days_until_expiry
			) VALUES ($1, $2, 'warning', $3)
		`, config.ID, config.Provider, daysRemaining)

		if err != nil {
			continue // 记录错误但继续处理其他配置
		}

		// 标记已发送警告
		_, err = s.db.Exec(`
			UPDATE ai_configs
			SET expiry_warning_sent = TRUE
			WHERE id = $1
		`, config.ID)

		if err != nil {
			continue
		}

		warningCount++
	}

	return warningCount, nil
}

// GetRotationHistory 获取密钥轮换历史
func (s *KeyRotationService) GetRotationHistory(configID int, limit int) ([]*models.AIConfigKeyHistory, error) {
	if limit <= 0 {
		limit = 20
	}

	var history []*models.AIConfigKeyHistory
	err := s.db.Select(&history, `
		SELECT *
		FROM ai_config_key_history
		WHERE config_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`, configID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to get rotation history: %w", err)
	}

	return history, nil
}

// GetExpiryNotifications 获取过期通知记录
func (s *KeyRotationService) GetExpiryNotifications(configID int, limit int) ([]*models.AIConfigExpiryNotification, error) {
	if limit <= 0 {
		limit = 20
	}

	var notifications []*models.AIConfigExpiryNotification
	err := s.db.Select(&notifications, `
		SELECT *
		FROM ai_config_expiry_notifications
		WHERE config_id = $1
		ORDER BY notification_time DESC
		LIMIT $2
	`, configID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to get expiry notifications: %w", err)
	}

	return notifications, nil
}

// SetAPIKeyExpiry 设置API密钥过期时间
func (s *KeyRotationService) SetAPIKeyExpiry(configID int, expiryDays int, userID int) error {
	expiresAt := time.Now().AddDate(0, 0, expiryDays)

	_, err := s.db.Exec(`
		UPDATE ai_configs
		SET
			api_key_expires_at = $1,
			expiry_warning_sent = FALSE,
			updated_by = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, expiresAt, userID, configID)

	if err != nil {
		return fmt.Errorf("failed to set expiry: %w", err)
	}

	return nil
}

// EnableAutoRotation 启用自动轮换
func (s *KeyRotationService) EnableAutoRotation(configID int, intervalDays int, userID int) error {
	if intervalDays < 1 {
		return fmt.Errorf("rotation interval must be at least 1 day")
	}

	_, err := s.db.Exec(`
		UPDATE ai_configs
		SET
			auto_rotate = TRUE,
			rotation_interval_days = $1,
			api_key_expires_at = CURRENT_TIMESTAMP + ($1 || ' days')::INTERVAL,
			expiry_warning_sent = FALSE,
			updated_by = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, intervalDays, userID, configID)

	if err != nil {
		return fmt.Errorf("failed to enable auto rotation: %w", err)
	}

	return nil
}

// DisableAutoRotation 禁用自动轮换
func (s *KeyRotationService) DisableAutoRotation(configID int, userID int) error {
	_, err := s.db.Exec(`
		UPDATE ai_configs
		SET
			auto_rotate = FALSE,
			updated_by = $1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, userID, configID)

	if err != nil {
		return fmt.Errorf("failed to disable auto rotation: %w", err)
	}

	return nil
}
