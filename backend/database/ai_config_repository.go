package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"ai-project-backend/models"
	"ai-project-backend/utils"
)

// AIConfigRepository AI配置数据库操作接口
type AIConfigRepository interface {
	// 基本CRUD操作
	CreateConfig(config *models.AIConfigRequest, userID int) (*models.AIConfig, error)
	GetConfig(provider models.AIProvider) (*models.AIConfig, error)
	GetAllConfigs() ([]*models.AIConfig, error)
	UpdateConfig(provider models.AIProvider, config *models.AIConfigRequest, userID int) (*models.AIConfig, error)
	DeleteConfig(provider models.AIProvider) error
	
	// 状态管理
	ToggleConfig(provider models.AIProvider, enabled bool, userID int) error
	GetEnabledConfig() (*models.AIConfig, error)
	GetEnabledConfigs() ([]*models.AIConfig, error)
	
	// 测试相关
	RecordTestResult(configID int, success bool, responseTime int, errorMsg string, userID int) error
	GetTestHistory(provider models.AIProvider, limit int) ([]*models.AITestLog, error)
	
	// 统计和管理
	GetConfigStats() (*models.AIConfigStats, error)
	GetUsageStats(provider models.AIProvider, days int) ([]*models.AIUsageStats, error)
	
	// 加密密钥管理
	GetActiveEncryptionKey() (*models.EncryptionKey, error)
	CreateEncryptionKey(keyName, keyValue, algorithm string) error
	DecryptAPIKey(provider models.AIProvider) (string, error)
}

// aiConfigRepository AI配置仓库实现
type aiConfigRepository struct {
	db                *sqlx.DB
	encryptionService *utils.EncryptionService
}

// NewAIConfigRepository 创建AI配置仓库
func NewAIConfigRepository(db *sqlx.DB) (AIConfigRepository, error) {
	repo := &aiConfigRepository{db: db}
	
	// 初始化加密服务
	encKey, err := repo.GetActiveEncryptionKey()
	if err != nil {
		return nil, fmt.Errorf("failed to get encryption key: %w", err)
	}
	
	key, err := utils.DecodeKey(encKey.KeyValue)
	if err != nil {
		return nil, fmt.Errorf("failed to decode encryption key: %w", err)
	}
	
	encryptionService, err := utils.NewEncryptionService(key, encKey.KeyName)
	if err != nil {
		return nil, fmt.Errorf("failed to create encryption service: %w", err)
	}
	
	repo.encryptionService = encryptionService
	return repo, nil
}

// CreateConfig 创建AI配置
func (r *aiConfigRepository) CreateConfig(req *models.AIConfigRequest, userID int) (*models.AIConfig, error) {
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}
	
	// 加密API密钥
	encryptedKey, err := r.encryptionService.EncryptAPIKey(req.APIKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt API key: %w", err)
	}
	
	// 生成密钥哈希
	keyHash := r.encryptionService.HashAPIKey(req.APIKey)
	
	// 如果没有提供元数据，使用默认值
	metadata := req.Metadata
	if metadata.Features == nil {
		metadata = models.DefaultMetadata(req.Provider)
	}
	
	config := &models.AIConfig{
		Provider:         req.Provider,
		APIKeyEncrypted:  encryptedKey,
		APIKeyHash:       keyHash,
		Model:            req.Model,
		BaseURL:          req.BaseURL,
		Temperature:      req.Temperature,
		MaxTokens:        req.MaxTokens,
		Enabled:          req.Enabled,
		Metadata:         metadata,
		CreatedBy:        userID,
		UpdatedBy:        userID,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	
	query := `
		INSERT INTO ai_configs (
			provider, api_key_encrypted, api_key_hash, model, base_url,
			temperature, max_tokens, enabled, metadata, created_by, updated_by
		) VALUES (
			:provider, :api_key_encrypted, :api_key_hash, :model, :base_url,
			:temperature, :max_tokens, :enabled, :metadata, :created_by, :updated_by
		) RETURNING id, created_at, updated_at`
	
	stmt, err := r.db.PrepareNamed(query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()
	
	err = stmt.Get(config, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create AI config: %w", err)
	}
	
	// 设置脱敏显示的API密钥
	config.APIKeyMasked = r.encryptionService.MaskAPIKey(req.APIKey)
	
	return config, nil
}

// GetConfig 获取指定提供商的配置
func (r *aiConfigRepository) GetConfig(provider models.AIProvider) (*models.AIConfig, error) {
	config := &models.AIConfig{}
	query := `
		SELECT id, provider, api_key_encrypted, api_key_hash, model, base_url,
			   temperature, max_tokens, enabled, metadata, created_by, updated_by,
			   created_at, updated_at, last_tested_at, test_success_count, test_failure_count
		FROM ai_configs WHERE provider = $1`
	
	err := r.db.Get(config, query, provider)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get AI config: %w", err)
	}
	
	// 解密API密钥并生成脱敏版本
	if err := r.decryptAndMaskAPIKey(config); err != nil {
		return nil, err
	}
	
	return config, nil
}

// GetAllConfigs 获取所有配置
func (r *aiConfigRepository) GetAllConfigs() ([]*models.AIConfig, error) {
	var configs []*models.AIConfig
	query := `
		SELECT id, provider, api_key_encrypted, api_key_hash, model, base_url,
			   temperature, max_tokens, enabled, metadata, created_by, updated_by,
			   created_at, updated_at, last_tested_at, test_success_count, test_failure_count
		FROM ai_configs ORDER BY provider`
	
	err := r.db.Select(&configs, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI configs: %w", err)
	}
	
	// 为每个配置生成脱敏API密钥
	for _, config := range configs {
		if err := r.decryptAndMaskAPIKey(config); err != nil {
			return nil, err
		}
	}
	
	return configs, nil
}

// UpdateConfig 更新AI配置
func (r *aiConfigRepository) UpdateConfig(provider models.AIProvider, req *models.AIConfigRequest, userID int) (*models.AIConfig, error) {
	// 获取现有配置
	existingConfig, err := r.GetConfig(provider)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing config: %w", err)
	}
	if existingConfig == nil {
		return nil, fmt.Errorf("configuration not found for provider: %s", provider)
	}
	
	// 处理API密钥：如果为空则保持现有密钥
	var encryptedKey, keyHash string
	if req.APIKey != "" {
		// 验证新的API密钥
		if len(req.APIKey) < 10 {
			return nil, fmt.Errorf("api_key must be at least 10 characters")
		}
		
		// 加密新的API密钥
		encryptedKey, err = r.encryptionService.EncryptAPIKey(req.APIKey)
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt API key: %w", err)
		}
		keyHash = r.encryptionService.HashAPIKey(req.APIKey)
	} else {
		// 保持现有的加密密钥
		encryptedKey = existingConfig.APIKeyEncrypted
		keyHash = existingConfig.APIKeyHash
	}
	
	// 验证其他字段
	if req.Model == "" {
		return nil, fmt.Errorf("model is required")
	}
	if req.Temperature < 0 || req.Temperature > 2 {
		return nil, fmt.Errorf("temperature must be between 0 and 2")
	}
	if req.MaxTokens < 1 || req.MaxTokens > 32000 {
		return nil, fmt.Errorf("max_tokens must be between 1 and 32000")
	}
	
	config := &models.AIConfig{
		Provider:        provider,
		APIKeyEncrypted: encryptedKey,
		APIKeyHash:      keyHash,
		Model:           req.Model,
		BaseURL:         req.BaseURL,
		Temperature:     req.Temperature,
		MaxTokens:       req.MaxTokens,
		Enabled:         req.Enabled,
		Metadata:        req.Metadata,
		UpdatedBy:       userID,
	}
	
	query := `
		UPDATE ai_configs SET
			api_key_encrypted = :api_key_encrypted,
			api_key_hash = :api_key_hash,
			model = :model,
			base_url = :base_url,
			temperature = :temperature,
			max_tokens = :max_tokens,
			enabled = :enabled,
			metadata = :metadata,
			updated_by = :updated_by,
			updated_at = NOW()
		WHERE provider = :provider
		RETURNING id, created_by, created_at, updated_at, last_tested_at, test_success_count, test_failure_count`
	
	stmt, err := r.db.PrepareNamed(query)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()
	
	err = stmt.Get(config, config)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("AI config not found for provider: %s", provider)
		}
		return nil, fmt.Errorf("failed to update AI config: %w", err)
	}
	
	// 设置脱敏显示的API密钥
	if req.APIKey != "" {
		config.APIKeyMasked = r.encryptionService.MaskAPIKey(req.APIKey)
	} else {
		// 如果没有更新API密钥，使用现有配置的脱敏版本
		config.APIKeyMasked = existingConfig.APIKeyMasked
		if config.APIKeyMasked == "" {
			// 如果现有配置没有脱敏版本，从加密密钥生成
			decryptedKey, err := r.encryptionService.DecryptAPIKey(encryptedKey)
			if err == nil {
				config.APIKeyMasked = r.encryptionService.MaskAPIKey(decryptedKey)
			} else {
				// 如果解密失败，使用通用脱敏格式
				config.APIKeyMasked = "••••••••••••••••••••••••••••••••••••••••••••"
			}
		}
	}
	
	return config, nil
}

// DeleteConfig 删除AI配置
func (r *aiConfigRepository) DeleteConfig(provider models.AIProvider) error {
	query := `DELETE FROM ai_configs WHERE provider = $1`
	result, err := r.db.Exec(query, provider)
	if err != nil {
		return fmt.Errorf("failed to delete AI config: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("AI config not found for provider: %s", provider)
	}
	
	return nil
}

// ToggleConfig 切换配置启用状态
func (r *aiConfigRepository) ToggleConfig(provider models.AIProvider, enabled bool, userID int) error {
	query := `
		UPDATE ai_configs SET
			enabled = $1,
			updated_by = $2,
			updated_at = NOW()
		WHERE provider = $3`
	
	result, err := r.db.Exec(query, enabled, userID, provider)
	if err != nil {
		return fmt.Errorf("failed to toggle AI config: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("AI config not found for provider: %s", provider)
	}
	
	return nil
}

// GetEnabledConfig 获取单个启用的配置（优先级：deepseek > claude > openai）
func (r *aiConfigRepository) GetEnabledConfig() (*models.AIConfig, error) {
	config := &models.AIConfig{}
	query := `
		SELECT id, provider, api_key_encrypted, api_key_hash, model, base_url,
			   temperature, max_tokens, enabled, metadata, created_by, updated_by,
			   created_at, updated_at, last_tested_at, test_success_count, test_failure_count
		FROM ai_configs 
		WHERE enabled = true 
		ORDER BY 
			CASE provider 
				WHEN 'deepseek' THEN 1 
				WHEN 'claude' THEN 2 
				WHEN 'openai' THEN 3 
				ELSE 4 
			END
		LIMIT 1`
	
	err := r.db.Get(config, query)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get enabled AI config: %w", err)
	}
	
	if err := r.decryptAndMaskAPIKey(config); err != nil {
		return nil, err
	}
	
	return config, nil
}

// GetEnabledConfigs 获取所有启用的配置
func (r *aiConfigRepository) GetEnabledConfigs() ([]*models.AIConfig, error) {
	var configs []*models.AIConfig
	query := `
		SELECT id, provider, api_key_encrypted, api_key_hash, model, base_url,
			   temperature, max_tokens, enabled, metadata, created_by, updated_by,
			   created_at, updated_at, last_tested_at, test_success_count, test_failure_count
		FROM ai_configs 
		WHERE enabled = true 
		ORDER BY provider`
	
	err := r.db.Select(&configs, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get enabled AI configs: %w", err)
	}
	
	for _, config := range configs {
		if err := r.decryptAndMaskAPIKey(config); err != nil {
			return nil, err
		}
	}
	
	return configs, nil
}

// RecordTestResult 记录测试结果
func (r *aiConfigRepository) RecordTestResult(configID int, success bool, responseTime int, errorMsg string, userID int) error {
	// 这里需要先创建测试日志表，简化实现
	query := `
		UPDATE ai_configs SET
			test_success_count = CASE WHEN $1 THEN test_success_count + 1 ELSE test_success_count END,
			test_failure_count = CASE WHEN $1 THEN test_failure_count ELSE test_failure_count + 1 END,
			last_tested_at = NOW()
		WHERE id = $2`
	
	_, err := r.db.Exec(query, success, configID)
	if err != nil {
		return fmt.Errorf("failed to record test result: %w", err)
	}
	
	return nil
}

// GetTestHistory 获取测试历史（简化实现）
func (r *aiConfigRepository) GetTestHistory(provider models.AIProvider, limit int) ([]*models.AITestLog, error) {
	// 简化实现，返回空数组
	return []*models.AITestLog{}, nil
}

// GetConfigStats 获取配置统计
func (r *aiConfigRepository) GetConfigStats() (*models.AIConfigStats, error) {
	stats := &models.AIConfigStats{}
	query := `
		SELECT 
			COUNT(*) as total_configs,
			COUNT(*) FILTER (WHERE enabled = true) as enabled_configs,
			COUNT(*) FILTER (WHERE last_tested_at IS NOT NULL) as tested_configs
		FROM ai_configs`
	
	err := r.db.Get(stats, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get config stats: %w", err)
	}
	
	return stats, nil
}

// GetUsageStats 获取使用统计（简化实现）
func (r *aiConfigRepository) GetUsageStats(provider models.AIProvider, days int) ([]*models.AIUsageStats, error) {
	// 简化实现，返回空数组
	return []*models.AIUsageStats{}, nil
}

// GetActiveEncryptionKey 获取活跃的加密密钥
func (r *aiConfigRepository) GetActiveEncryptionKey() (*models.EncryptionKey, error) {
	key := &models.EncryptionKey{}
	query := `
		SELECT id, key_name, key_value, algorithm, created_at, is_active
		FROM encryption_keys 
		WHERE is_active = true 
		ORDER BY created_at DESC 
		LIMIT 1`
	
	err := r.db.Get(key, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get active encryption key: %w", err)
	}
	
	return key, nil
}

// CreateEncryptionKey 创建新的加密密钥
func (r *aiConfigRepository) CreateEncryptionKey(keyName, keyValue, algorithm string) error {
	query := `
		INSERT INTO encryption_keys (key_name, key_value, algorithm)
		VALUES ($1, $2, $3)`
	
	_, err := r.db.Exec(query, keyName, keyValue, algorithm)
	if err != nil {
		return fmt.Errorf("failed to create encryption key: %w", err)
	}
	
	return nil
}

// DecryptAPIKey 解密API密钥（用于测试连接等场景）
func (r *aiConfigRepository) DecryptAPIKey(provider models.AIProvider) (string, error) {
	config := &models.AIConfig{}
	query := `SELECT api_key_encrypted FROM ai_configs WHERE provider = $1`
	
	err := r.db.Get(config, query, provider)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("AI config not found for provider: %s", provider)
		}
		return "", fmt.Errorf("failed to get AI config: %w", err)
	}
	
	decryptedKey, err := r.encryptionService.DecryptAPIKey(config.APIKeyEncrypted)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt API key: %w", err)
	}
	
	return decryptedKey, nil
}

// 辅助方法：解密并生成脱敏API密钥
func (r *aiConfigRepository) decryptAndMaskAPIKey(config *models.AIConfig) error {
	// 这里只生成脱敏版本，不解密完整密钥
	// 如果需要完整密钥，调用DecryptAPIKey方法
	
	// 从加密数据生成脱敏版本（简化实现）
	// 在实际场景中，可能需要部分解密来获得正确的前后缀
	config.APIKeyMasked = "sk-••••••••••••••••••••••••••••••••••••••••••••"
	
	// 根据provider调整脱敏格式
	switch config.Provider {
	case models.ProviderClaude:
		config.APIKeyMasked = "sk-ant-••••••••••••••••••••••••••••••••••••••••"
	case models.ProviderDeepSeek:
		config.APIKeyMasked = "sk-••••••••••••••••••••••••••••••••••••••••••••"
	case models.ProviderOpenAI:
		config.APIKeyMasked = "sk-••••••••••••••••••••••••••••••••••••••••••••"
	}
	
	return nil
}