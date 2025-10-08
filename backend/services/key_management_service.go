package services

import (
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"fmt"
	"time"
)

// KeyManagementService 密钥管理服务
// 封装密钥加密、解密、轮换等功能，提供统一的密钥管理接口
type KeyManagementService struct {
	encryptionService *utils.EncryptionService
	rotationService   *KeyRotationService
}

// NewKeyManagementService 创建密钥管理服务实例
func NewKeyManagementService(
	encryptionService *utils.EncryptionService,
	rotationService *KeyRotationService,
) *KeyManagementService {
	return &KeyManagementService{
		encryptionService: encryptionService,
		rotationService:   rotationService,
	}
}

// EncryptKey 加密密钥
func (kms *KeyManagementService) EncryptKey(plaintext string) (string, error) {
	return kms.encryptionService.EncryptAPIKey(plaintext)
}

// DecryptKey 解密密钥
func (kms *KeyManagementService) DecryptKey(encrypted string) (string, error) {
	return kms.encryptionService.DecryptAPIKey(encrypted)
}

// HashKey 生成密钥哈希
func (kms *KeyManagementService) HashKey(plaintext string) string {
	return kms.encryptionService.HashAPIKey(plaintext)
}

// RotateKey 轮换密钥
func (kms *KeyManagementService) RotateKey(configID int, newKey string, reason string, userID int) error {
	// 构建轮换请求
	rotateRequest := &models.RotateKeyRequest{
		NewAPIKey:      newKey,
		RotationReason: &reason,
	}

	// 执行轮换
	_, err := kms.rotationService.RotateAPIKey(configID, rotateRequest, userID)
	if err != nil {
		return fmt.Errorf("failed to rotate key: %w", err)
	}

	return nil
}

// GetKeyRotationHistory 获取密钥轮换历史
func (kms *KeyManagementService) GetKeyRotationHistory(configID int, limit int) ([]*models.AIConfigKeyHistory, error) {
	return kms.rotationService.GetRotationHistory(configID, limit)
}

// CheckKeyExpiry 检查密钥过期状态
func (kms *KeyManagementService) CheckKeyExpiry(configID int) (*models.APIKeyExpiryStatus, error) {
	statuses, err := kms.rotationService.CheckExpiredKeys()
	if err != nil {
		return nil, err
	}

	for _, status := range statuses {
		if status.ConfigID == configID {
			return status, nil
		}
	}

	return nil, fmt.Errorf("config not found")
}

// SetKeyExpiry 设置密钥过期时间
func (kms *KeyManagementService) SetKeyExpiry(configID int, days int, userID int) error {
	return kms.rotationService.SetAPIKeyExpiry(configID, days, userID)
}

// EnableAutoRotation 启用自动轮换
func (kms *KeyManagementService) EnableAutoRotation(configID int, intervalDays int, userID int) error {
	return kms.rotationService.EnableAutoRotation(configID, intervalDays, userID)
}

// DisableAutoRotation 禁用自动轮换
func (kms *KeyManagementService) DisableAutoRotation(configID int, userID int) error {
	return kms.rotationService.DisableAutoRotation(configID, userID)
}

// KeySecurityMetrics 密钥安全指标
type KeySecurityMetrics struct {
	TotalKeys        int       `json:"total_keys"`
	ActiveKeys       int       `json:"active_keys"`
	ExpiredKeys      int       `json:"expired_keys"`
	ExpiringSoon     int       `json:"expiring_soon"`      // 7天内过期
	RotationRate     float64   `json:"rotation_rate"`      // 轮换率（每月）
	AverageKeyAge    int       `json:"average_key_age"`    // 平均密钥年龄（天）
	LastRotationDate time.Time `json:"last_rotation_date"` // 最后轮换日期
}

// GetSecurityMetrics 获取密钥安全指标
func (kms *KeyManagementService) GetSecurityMetrics() (*KeySecurityMetrics, error) {
	// 检查所有密钥的过期状态
	statuses, err := kms.rotationService.CheckExpiredKeys()
	if err != nil {
		return nil, err
	}

	metrics := &KeySecurityMetrics{}
	metrics.TotalKeys = len(statuses)

	var totalAge int
	var lastRotation time.Time

	for _, status := range statuses {
		switch status.ExpiryStatus {
		case "valid":
			metrics.ActiveKeys++
		case "expired":
			metrics.ExpiredKeys++
		case "expiring_soon":
			metrics.ExpiringSoon++
		}

		// 计算密钥年龄
		if status.LastRotatedAt != nil {
			age := int(time.Since(*status.LastRotatedAt).Hours() / 24)
			totalAge += age

			if lastRotation.IsZero() || status.LastRotatedAt.After(lastRotation) {
				lastRotation = *status.LastRotatedAt
			}
		}
	}

	// 计算平均密钥年龄
	if metrics.TotalKeys > 0 {
		metrics.AverageKeyAge = totalAge / metrics.TotalKeys
	}

	metrics.LastRotationDate = lastRotation

	// 计算轮换率（简化版本）
	if metrics.TotalKeys > 0 {
		metrics.RotationRate = float64(metrics.ActiveKeys) / float64(metrics.TotalKeys) * 100
	}

	return metrics, nil
}

// KeyAccessPolicy 密钥访问策略
type KeyAccessPolicy struct {
	AllowedRoles    []string `json:"allowed_roles"`
	RequireMFA      bool     `json:"require_mfa"`
	IPWhitelist     []string `json:"ip_whitelist"`
	MaxAccessCount  int      `json:"max_access_count"`
	AccessTimeLimit int      `json:"access_time_limit"` // 秒
}

// ValidateKeyAccess 验证密钥访问权限
func (kms *KeyManagementService) ValidateKeyAccess(
	userRole string,
	userIP string,
	policy *KeyAccessPolicy,
) error {
	// 检查角色权限
	roleAllowed := false
	for _, role := range policy.AllowedRoles {
		if userRole == role {
			roleAllowed = true
			break
		}
	}
	if !roleAllowed {
		return fmt.Errorf("role %s is not allowed to access keys", userRole)
	}

	// 检查IP白名单
	if len(policy.IPWhitelist) > 0 {
		ipAllowed := false
		for _, ip := range policy.IPWhitelist {
			if userIP == ip {
				ipAllowed = true
				break
			}
		}
		if !ipAllowed {
			return fmt.Errorf("IP %s is not in whitelist", userIP)
		}
	}

	return nil
}
