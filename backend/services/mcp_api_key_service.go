package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"ai-project-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// MCPAPIKeyService MCP API Key 服务
type MCPAPIKeyService struct {
	db    *gorm.DB
	sqlDB *sql.DB
}

// NewMCPAPIKeyService 创建 MCP API Key 服务实例
// 支持 *gorm.DB 或 *sql.DB 作为参数
func NewMCPAPIKeyService(db interface{}) *MCPAPIKeyService {
	service := &MCPAPIKeyService{}

	switch d := db.(type) {
	case *gorm.DB:
		service.db = d
	case *sql.DB:
		service.sqlDB = d
		// 使用 sql.DB 创建 GORM 实例
		gormDB, err := gorm.Open(postgres.New(postgres.Config{
			Conn: d,
		}), &gorm.Config{})
		if err == nil {
			service.db = gormDB
		}
	}

	return service
}

// API Key 常量
const (
	APIKeyPrefix     = "aiproj_pk_"
	APIKeyRandomSize = 32 // 32 字节 = 64 个十六进制字符
)

// 错误定义
var (
	ErrAPIKeyNotFound     = errors.New("API Key not found")
	ErrAPIKeyRevoked      = errors.New("API Key has been revoked")
	ErrAPIKeyExpired      = errors.New("API Key has expired")
	ErrAPIKeyInactive     = errors.New("API Key is not active")
	ErrInvalidAPIKeyFormat = errors.New("invalid API Key format")
)

// GenerateAPIKey 生成新的 API Key
// 返回: plainKey(明文), keyID(标识), keyHash(哈希)
func (s *MCPAPIKeyService) GenerateAPIKey() (plainKey string, keyID string, keyHash string, err error) {
	// 生成随机字节
	randomBytes := make([]byte, APIKeyRandomSize)
	if _, err = rand.Read(randomBytes); err != nil {
		return "", "", "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// 生成 Key ID (用于标识，取前 8 字节)
	keyID = APIKeyPrefix + hex.EncodeToString(randomBytes[:8])

	// 完整的明文 Key
	plainKey = APIKeyPrefix + hex.EncodeToString(randomBytes)

	// 计算 SHA-256 哈希（存储用）
	hash := sha256.Sum256([]byte(plainKey))
	keyHash = hex.EncodeToString(hash[:])

	return plainKey, keyID, keyHash, nil
}

// HashAPIKey 计算 API Key 的 SHA-256 哈希
func (s *MCPAPIKeyService) HashAPIKey(apiKey string) string {
	hash := sha256.Sum256([]byte(apiKey))
	return hex.EncodeToString(hash[:])
}

// CreateAPIKey 创建新的 API Key
// 返回: apiKey 记录, plainKey 明文（仅此一次）, error
func (s *MCPAPIKeyService) CreateAPIKey(ctx context.Context, userID int, enterpriseID *int, req *models.CreateMCPAPIKeyRequest) (*models.MCPAPIKey, string, error) {
	// 1. 生成 Key
	plainKey, keyID, keyHash, err := s.GenerateAPIKey()
	if err != nil {
		return nil, "", err
	}

	// 2. 生成显示前缀 (前 20 字符 + "...")
	keyPrefix := plainKey
	if len(keyPrefix) > 20 {
		keyPrefix = keyPrefix[:20] + "..."
	}

	// 3. 构建记录
	now := time.Now()
	record := &models.MCPAPIKey{
		KeyID:        keyID,
		KeyHash:      keyHash,
		KeyPrefix:    keyPrefix,
		UserID:       userID,
		EnterpriseID: enterpriseID,
		Name:         req.Name,
		Description:  req.Description,
		Status:       models.MCPAPIKeyStatusActive,
		ExpiresAt:    req.ExpiresAt,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// 4. 保存到数据库
	if err := s.db.WithContext(ctx).Create(record).Error; err != nil {
		return nil, "", fmt.Errorf("failed to create API Key: %w", err)
	}

	// 5. 返回（明文 Key 只返回一次！）
	return record, plainKey, nil
}

// ValidateAPIKey 验证 API Key 并返回记录
func (s *MCPAPIKeyService) ValidateAPIKey(ctx context.Context, apiKey string) (*models.MCPAPIKey, error) {
	// 1. 计算哈希
	keyHash := s.HashAPIKey(apiKey)

	// 2. 查询记录
	var record models.MCPAPIKey
	if err := s.db.WithContext(ctx).
		Preload("User").
		Preload("Enterprise").
		Where("key_hash = ?", keyHash).
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("failed to query API Key: %w", err)
	}

	// 3. 检查状态
	if record.Status == models.MCPAPIKeyStatusRevoked {
		return nil, ErrAPIKeyRevoked
	}

	// 4. 检查过期
	if record.ExpiresAt != nil && record.ExpiresAt.Before(time.Now()) {
		return nil, ErrAPIKeyExpired
	}

	// 5. 检查是否活跃
	if record.Status != models.MCPAPIKeyStatusActive {
		return nil, ErrAPIKeyInactive
	}

	return &record, nil
}

// GetAPIKeyByID 根据 ID 获取 API Key
func (s *MCPAPIKeyService) GetAPIKeyByID(ctx context.Context, id int) (*models.MCPAPIKey, error) {
	var record models.MCPAPIKey
	if err := s.db.WithContext(ctx).
		Preload("User").
		Preload("Enterprise").
		Where("id = ?", id).
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("failed to get API Key: %w", err)
	}
	return &record, nil
}

// GetAPIKeyByKeyID 根据 KeyID 获取 API Key
func (s *MCPAPIKeyService) GetAPIKeyByKeyID(ctx context.Context, keyID string) (*models.MCPAPIKey, error) {
	var record models.MCPAPIKey
	if err := s.db.WithContext(ctx).
		Preload("User").
		Preload("Enterprise").
		Where("key_id = ?", keyID).
		First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("failed to get API Key: %w", err)
	}
	return &record, nil
}

// ListAPIKeys 列出用户的 API Keys
// 返回: keys 列表, total 总数, error
func (s *MCPAPIKeyService) ListAPIKeys(ctx context.Context, userID int, req *models.ListMCPAPIKeysRequest) ([]models.MCPAPIKey, int64, error) {
	query := s.db.WithContext(ctx).Model(&models.MCPAPIKey{}).Where("user_id = ?", userID)

	// 过滤已撤销的
	if !req.IncludeRevoked {
		query = query.Where("status != ?", models.MCPAPIKeyStatusRevoked)
	}

	// 按状态过滤
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count API Keys: %w", err)
	}

	// 分页
	page := req.Page
	if page < 1 {
		page = 1
	}
	limit := req.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	// 查询数据（包含用户信息）
	var keys []models.MCPAPIKey
	if err := query.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&keys).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list API Keys: %w", err)
	}

	return keys, total, nil
}

// ListAllAPIKeys 列出所有用户的 API Keys（管理员用）
// 返回: keys 列表, total 总数, error
func (s *MCPAPIKeyService) ListAllAPIKeys(ctx context.Context, req *models.ListMCPAPIKeysRequest) ([]models.MCPAPIKey, int64, error) {
	query := s.db.WithContext(ctx).Model(&models.MCPAPIKey{})

	// 过滤已撤销的
	if !req.IncludeRevoked {
		query = query.Where("status != ?", models.MCPAPIKeyStatusRevoked)
	}

	// 按状态过滤
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// 按用户 ID 过滤（可选）
	if req.UserID > 0 {
		query = query.Where("user_id = ?", req.UserID)
	}

	// 计算总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count API Keys: %w", err)
	}

	// 分页
	page := req.Page
	if page < 1 {
		page = 1
	}
	limit := req.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	// 查询数据（包含用户和企业信息）
	var keys []models.MCPAPIKey
	if err := query.
		Preload("User").
		Preload("Enterprise").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&keys).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list API Keys: %w", err)
	}

	return keys, total, nil
}

// ListAPIKeysByEnterprise 列出企业的所有 API Keys
func (s *MCPAPIKeyService) ListAPIKeysByEnterprise(ctx context.Context, enterpriseID int, req *models.ListMCPAPIKeysRequest) (*models.ListMCPAPIKeysResponse, error) {
	query := s.db.WithContext(ctx).Model(&models.MCPAPIKey{}).Where("enterprise_id = ?", enterpriseID)

	if !req.IncludeRevoked {
		query = query.Where("status != ?", models.MCPAPIKeyStatusRevoked)
	}

	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count API Keys: %w", err)
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	limit := req.Limit
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	var keys []models.MCPAPIKey
	if err := query.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&keys).Error; err != nil {
		return nil, fmt.Errorf("failed to list API Keys: %w", err)
	}

	return &models.ListMCPAPIKeysResponse{
		Keys:  keys,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// UpdateAPIKey 更新 API Key (通过 KeyID 字符串)
func (s *MCPAPIKeyService) UpdateAPIKey(ctx context.Context, keyID string, userID int, req *models.UpdateMCPAPIKeyRequest) (*models.MCPAPIKey, error) {
	var record models.MCPAPIKey
	if err := s.db.WithContext(ctx).Where("key_id = ? AND user_id = ?", keyID, userID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("failed to get API Key: %w", err)
	}

	// 构建更新
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ExpiresAt != nil {
		updates["expires_at"] = *req.ExpiresAt
	}

	if len(updates) > 0 {
		if err := s.db.WithContext(ctx).Model(&record).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update API Key: %w", err)
		}
	}

	// 重新查询
	return s.GetAPIKeyByID(ctx, record.ID)
}

// UpdateAPIKeyByID 更新 API Key (通过数字 ID)
func (s *MCPAPIKeyService) UpdateAPIKeyByID(ctx context.Context, id int, userID int, req *models.UpdateMCPAPIKeyRequest) (*models.MCPAPIKey, error) {
	var record models.MCPAPIKey
	if err := s.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, fmt.Errorf("failed to get API Key: %w", err)
	}

	// 构建更新
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ExpiresAt != nil {
		updates["expires_at"] = *req.ExpiresAt
	}

	if len(updates) > 0 {
		if err := s.db.WithContext(ctx).Model(&record).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update API Key: %w", err)
		}
	}

	// 重新查询
	return s.GetAPIKeyByID(ctx, id)
}

// RevokeAPIKey 撤销 API Key (通过 keyID 字符串)
func (s *MCPAPIKeyService) RevokeAPIKey(ctx context.Context, keyID string, userID int) error {
	now := time.Now()
	result := s.db.WithContext(ctx).Model(&models.MCPAPIKey{}).
		Where("key_id = ? AND user_id = ?", keyID, userID).
		Updates(map[string]interface{}{
			"status":     models.MCPAPIKeyStatusRevoked,
			"revoked_at": now,
			"revoked_by": userID,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to revoke API Key: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAPIKeyNotFound
	}

	return nil
}

// RevokeAPIKeyByID 撤销 API Key (通过数字 ID)
func (s *MCPAPIKeyService) RevokeAPIKeyByID(ctx context.Context, id int, userID int, revokedBy int) error {
	now := time.Now()
	result := s.db.WithContext(ctx).Model(&models.MCPAPIKey{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(map[string]interface{}{
			"status":     models.MCPAPIKeyStatusRevoked,
			"revoked_at": now,
			"revoked_by": revokedBy,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to revoke API Key: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAPIKeyNotFound
	}

	return nil
}

// RevokeAPIKeyByAdmin 管理员撤销 API Key（不检查用户所有权）
func (s *MCPAPIKeyService) RevokeAPIKeyByAdmin(ctx context.Context, id int, revokedBy int) error {
	now := time.Now()
	result := s.db.WithContext(ctx).Model(&models.MCPAPIKey{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     models.MCPAPIKeyStatusRevoked,
			"revoked_at": now,
			"revoked_by": revokedBy,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to revoke API Key: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return ErrAPIKeyNotFound
	}

	return nil
}

// UpdateLastUsed 更新最后使用时间
func (s *MCPAPIKeyService) UpdateLastUsed(ctx context.Context, id int) error {
	return s.db.WithContext(ctx).Model(&models.MCPAPIKey{}).
		Where("id = ?", id).
		Update("last_used_at", time.Now()).Error
}

// IncrementRequestCount 增加请求计数
func (s *MCPAPIKeyService) IncrementRequestCount(ctx context.Context, id int, isError bool) error {
	updates := map[string]interface{}{
		"total_requests": gorm.Expr("total_requests + 1"),
	}
	if isError {
		updates["total_errors"] = gorm.Expr("total_errors + 1")
	}

	return s.db.WithContext(ctx).Model(&models.MCPAPIKey{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// GetAPIKeyStats 获取 API Key 使用统计
// 默认查询过去 30 天的数据
func (s *MCPAPIKeyService) GetAPIKeyStats(ctx context.Context, keyID int) (*models.MCPAPIKeyStats, error) {
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30) // 默认 30 天
	return s.GetAPIKeyStatsWithRange(ctx, keyID, startDate, endDate)
}

// GetAPIKeyStatsWithRange 获取 API Key 使用统计（指定时间范围）
func (s *MCPAPIKeyService) GetAPIKeyStatsWithRange(ctx context.Context, keyID int, startDate, endDate time.Time) (*models.MCPAPIKeyStats, error) {
	var stats models.MCPAPIKeyStats

	// 基本统计
	var basicStats struct {
		TotalRequests int64
		TotalErrors   int64
		AvgDuration   float64
	}
	if err := s.db.WithContext(ctx).Model(&models.MCPAPIKeyLog{}).
		Where("api_key_id = ? AND created_at BETWEEN ? AND ?", keyID, startDate, endDate).
		Select("COUNT(*) as total_requests, COUNT(CASE WHEN response_status = 'error' THEN 1 END) as total_errors, AVG(duration_ms) as avg_duration").
		Scan(&basicStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get basic stats: %w", err)
	}

	stats.TotalRequests = basicStats.TotalRequests
	stats.TotalErrors = basicStats.TotalErrors
	stats.AvgDurationMs = basicStats.AvgDuration
	if stats.TotalRequests > 0 {
		stats.SuccessRate = float64(stats.TotalRequests-stats.TotalErrors) / float64(stats.TotalRequests) * 100
	}

	// 工具使用统计
	var toolsUsage []models.MCPToolUsageStat
	if err := s.db.WithContext(ctx).Model(&models.MCPAPIKeyLog{}).
		Where("api_key_id = ? AND created_at BETWEEN ? AND ?", keyID, startDate, endDate).
		Select("tool_name as tool, COUNT(*) as count").
		Group("tool_name").
		Order("count DESC").
		Limit(20).
		Scan(&toolsUsage).Error; err != nil {
		return nil, fmt.Errorf("failed to get tools usage: %w", err)
	}
	stats.ToolsUsage = toolsUsage

	// 每日统计
	var dailyStats []models.MCPDailyRequestStat
	if err := s.db.WithContext(ctx).Model(&models.MCPAPIKeyLog{}).
		Where("api_key_id = ? AND created_at BETWEEN ? AND ?", keyID, startDate, endDate).
		Select("DATE(created_at) as date, COUNT(*) as requests, COUNT(CASE WHEN response_status = 'error' THEN 1 END) as errors").
		Group("DATE(created_at)").
		Order("date").
		Scan(&dailyStats).Error; err != nil {
		return nil, fmt.Errorf("failed to get daily stats: %w", err)
	}
	stats.DailyRequests = dailyStats

	return &stats, nil
}

// LogAPIKeyCall 记录 API Key 调用日志
func (s *MCPAPIKeyService) LogAPIKeyCall(ctx context.Context, log *models.MCPAPIKeyLog) error {
	return s.db.WithContext(ctx).Create(log).Error
}

// GetAPIKeyLogs 获取 API Key 调用日志
// 返回: logs 列表, total 总数, error
func (s *MCPAPIKeyService) GetAPIKeyLogs(ctx context.Context, keyID int, req *models.ListMCPAPIKeyLogsRequest) ([]models.MCPAPIKeyLog, int64, error) {
	query := s.db.WithContext(ctx).Model(&models.MCPAPIKeyLog{}).Where("api_key_id = ?", keyID)

	if req.ToolName != "" {
		query = query.Where("tool_name = ?", req.ToolName)
	}
	if req.Status != "" {
		query = query.Where("response_status = ?", req.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count logs: %w", err)
	}

	page := req.Page
	if page < 1 {
		page = 1
	}
	limit := req.Limit
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	var logs []models.MCPAPIKeyLog
	if err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get logs: %w", err)
	}

	return logs, total, nil
}

// ========== SSE Session 管理 ==========

// CreateSSESession 创建 SSE 会话
func (s *MCPAPIKeyService) CreateSSESession(ctx context.Context, session *models.MCPSSESession) error {
	return s.db.WithContext(ctx).Create(session).Error
}

// CloseSSESession 关闭 SSE 会话
func (s *MCPAPIKeyService) CloseSSESession(ctx context.Context, sessionID string) error {
	now := time.Now()
	return s.db.WithContext(ctx).Model(&models.MCPSSESession{}).
		Where("session_id = ?", sessionID).
		Updates(map[string]interface{}{
			"status":          models.MCPSSESessionStatusClosed,
			"disconnected_at": now,
		}).Error
}

// UpdateSSESessionActivity 更新会话活动时间
func (s *MCPAPIKeyService) UpdateSSESessionActivity(ctx context.Context, sessionID string, messagesSent, messagesReceived int) error {
	return s.db.WithContext(ctx).Model(&models.MCPSSESession{}).
		Where("session_id = ?", sessionID).
		Updates(map[string]interface{}{
			"last_activity":     time.Now(),
			"messages_sent":     gorm.Expr("messages_sent + ?", messagesSent),
			"messages_received": gorm.Expr("messages_received + ?", messagesReceived),
		}).Error
}

// GetActiveSSESessions 获取活跃的 SSE 会话数
func (s *MCPAPIKeyService) GetActiveSSESessions(ctx context.Context, keyID int) (int64, error) {
	var count int64
	err := s.db.WithContext(ctx).Model(&models.MCPSSESession{}).
		Where("api_key_id = ? AND status = ?", keyID, models.MCPSSESessionStatusActive).
		Count(&count).Error
	return count, err
}

// CleanupStaleSessions 清理过期的会话
func (s *MCPAPIKeyService) CleanupStaleSessions(ctx context.Context, timeout time.Duration) (int64, error) {
	cutoff := time.Now().Add(-timeout)
	result := s.db.WithContext(ctx).Model(&models.MCPSSESession{}).
		Where("status = ? AND last_activity < ?", models.MCPSSESessionStatusActive, cutoff).
		Updates(map[string]interface{}{
			"status":          models.MCPSSESessionStatusClosed,
			"disconnected_at": time.Now(),
		})
	return result.RowsAffected, result.Error
}
