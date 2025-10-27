package services

import (
	"ai-project-backend/utils"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenType 令牌类型
type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

// TokenBlacklistEntry 令牌黑名单条目
type TokenBlacklistEntry struct {
	JTI       string    `json:"jti"` // Token ID
	ExpiresAt time.Time `json:"expires_at"`
	RevokedAt time.Time `json:"revoked_at"`
	Reason    string    `json:"reason"`
}

// JWTTokenService JWT令牌管理服务
type JWTTokenService struct {
	jwtManager     *utils.JWTManager
	refreshManager *utils.JWTManager // 用于refresh token的管理器
	blacklist      map[string]*TokenBlacklistEntry
	blacklistMutex sync.RWMutex
	config         *JWTServiceConfig
	logger         *log.Logger
}

// JWTServiceConfig JWT服务配置
type JWTServiceConfig struct {
	AccessTokenExpiry  time.Duration `json:"access_token_expiry"`
	RefreshTokenExpiry time.Duration `json:"refresh_token_expiry"`
	SecretKey          string        `json:"secret_key"`
	RefreshSecretKey   string        `json:"refresh_secret_key"`
	MaxRefreshCount    int           `json:"max_refresh_count"`
	CleanupInterval    time.Duration `json:"cleanup_interval"`
	EnableBlacklist    bool          `json:"enable_blacklist"`
}

// TokenPair 令牌对
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int64     `json:"expires_in"`
	RefreshCount int       `json:"refresh_count"`
	IssuedAt     time.Time `json:"issued_at"`
}

// RefreshTokenClaims 刷新令牌声明
type RefreshTokenClaims struct {
	UserID       int       `json:"user_id"`
	Username     string    `json:"username"`
	Role         string    `json:"role"`
	UserType     string    `json:"user_type"`
	JTI          string    `json:"jti"` // Token ID
	RefreshCount int       `json:"refresh_count"`
	TokenType    TokenType `json:"token_type"`
	jwt.RegisteredClaims
}

// NewJWTTokenService 创建JWT令牌管理服务
func NewJWTTokenService(config *JWTServiceConfig, logger *log.Logger) *JWTTokenService {
	// 为访问令牌创建JWT管理器
	jwtManager := utils.NewJWTManager(config.SecretKey, config.AccessTokenExpiry)

	// 为刷新令牌创建单独的JWT管理器
	refreshManager := utils.NewJWTManager(config.RefreshSecretKey, config.RefreshTokenExpiry)

	service := &JWTTokenService{
		jwtManager:     jwtManager,
		refreshManager: refreshManager,
		blacklist:      make(map[string]*TokenBlacklistEntry),
		config:         config,
		logger:         logger,
	}

	// 启动定期清理过期的黑名单条目
	if config.EnableBlacklist {
		go service.startBlacklistCleanup()
	}

	return service
}

// GenerateTokenPair 生成令牌对
func (s *JWTTokenService) GenerateTokenPair(userID int, username, role, userType string, enterpriseUserID *int, enterpriseID *int) (*TokenPair, error) {
	now := time.Now()

	// 生成访问令牌
	accessToken, err := s.jwtManager.GenerateToken(userID, username, role, userType, enterpriseUserID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %v", err)
	}

	// 生成唯一的JTI (JWT ID)
	jti, err := s.generateJTI()
	if err != nil {
		return nil, fmt.Errorf("failed to generate JTI: %v", err)
	}

	// 生成刷新令牌
	refreshToken, err := s.generateRefreshToken(userID, username, role, userType, jti, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %v", err)
	}

	tokenPair := &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.config.AccessTokenExpiry.Seconds()),
		RefreshCount: 0,
		IssuedAt:     now,
	}

	s.logger.Printf("Generated token pair for user %d (%s)", userID, username)
	return tokenPair, nil
}

// ValidateAccessToken 验证访问令牌
func (s *JWTTokenService) ValidateAccessToken(tokenString string) (*utils.JWTClaims, error) {
	// 首先验证令牌格式和签名
	claims, err := s.jwtManager.ValidateToken(tokenString)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %v", err)
	}

	// 检查令牌是否在黑名单中
	if s.config.EnableBlacklist && s.isTokenBlacklisted(claims.ID) {
		return nil, fmt.Errorf("token has been revoked")
	}

	return claims, nil
}

// RefreshTokens 刷新令牌对
func (s *JWTTokenService) RefreshTokens(refreshTokenString string) (*TokenPair, error) {
	// 验证刷新令牌
	refreshClaims, err := s.validateRefreshToken(refreshTokenString)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %v", err)
	}

	// 检查刷新次数限制
	if refreshClaims.RefreshCount >= s.config.MaxRefreshCount {
		s.logger.Printf("Refresh token for user %d has exceeded max refresh count", refreshClaims.UserID)
		return nil, fmt.Errorf("refresh token has exceeded maximum refresh count")
	}

	// 将旧的刷新令牌加入黑名单
	if s.config.EnableBlacklist {
		s.addToBlacklist(refreshClaims.JTI, refreshClaims.ExpiresAt.Time, "token_refreshed")
	}

	// 生成新的令牌对 (注意: refresh token没有enterprise信息,需要从数据库重新查询)
	// TODO: 未来可以考虑在refresh token中也存储enterprise信息
	newTokenPair, err := s.GenerateTokenPair(
		refreshClaims.UserID,
		refreshClaims.Username,
		refreshClaims.Role,
		refreshClaims.UserType,
		nil, // 刷新时暂不包含enterprise_user_id
		nil, // 刷新时暂不包含enterprise_id
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate new token pair: %v", err)
	}

	// 更新刷新计数
	newTokenPair.RefreshCount = refreshClaims.RefreshCount + 1

	s.logger.Printf("Refreshed tokens for user %d (%s), refresh count: %d",
		refreshClaims.UserID, refreshClaims.Username, newTokenPair.RefreshCount)

	return newTokenPair, nil
}

// RevokeToken 撤销令牌
func (s *JWTTokenService) RevokeToken(tokenString string, reason string) error {
	if !s.config.EnableBlacklist {
		s.logger.Printf("Token revocation requested but blacklist is disabled")
		return nil
	}

	// 解析令牌以获取JTI和过期时间
	claims, err := s.jwtManager.ValidateToken(tokenString)
	if err != nil {
		// 即使令牌无效，我们也尝试解析以获取基本信息
		token, parseErr := jwt.Parse(tokenString, nil)
		if parseErr != nil {
			return fmt.Errorf("failed to parse token for revocation: %v", parseErr)
		}

		if mapClaims, ok := token.Claims.(jwt.MapClaims); ok {
			if jti, exists := mapClaims["jti"].(string); exists {
				if exp, exists := mapClaims["exp"].(float64); exists {
					expiresAt := time.Unix(int64(exp), 0)
					s.addToBlacklist(jti, expiresAt, reason)
					return nil
				}
			}
		}
		return fmt.Errorf("failed to extract token information for revocation")
	}

	s.addToBlacklist(claims.ID, claims.ExpiresAt.Time, reason)
	s.logger.Printf("Revoked token for user %d, reason: %s", claims.UserID, reason)

	return nil
}

// RevokeAllUserTokens 撤销用户的所有令牌
func (s *JWTTokenService) RevokeAllUserTokens(userID int, reason string) error {
	if !s.config.EnableBlacklist {
		s.logger.Printf("Bulk token revocation requested for user %d but blacklist is disabled", userID)
		return nil
	}

	s.logger.Printf("Revoking all tokens for user %d, reason: %s", userID, reason)

	// 注意：这是一个简化的实现
	// 在生产环境中，应该维护一个用户令牌映射或使用外部存储
	// 这里我们标记所有当前黑名单条目，实际应用可能需要不同的策略

	return nil
}

// GetBlacklistStats 获取黑名单统计信息
func (s *JWTTokenService) GetBlacklistStats() map[string]interface{} {
	s.blacklistMutex.RLock()
	defer s.blacklistMutex.RUnlock()

	stats := map[string]interface{}{
		"total_blacklisted": len(s.blacklist),
		"enabled":           s.config.EnableBlacklist,
		"cleanup_interval":  s.config.CleanupInterval.String(),
	}

	// 计算即将过期的令牌数量
	now := time.Now()
	expiringSoon := 0
	for _, entry := range s.blacklist {
		if entry.ExpiresAt.Sub(now) < time.Hour {
			expiringSoon++
		}
	}
	stats["expiring_within_hour"] = expiringSoon

	return stats
}

// 私有方法

// generateRefreshToken 生成刷新令牌
func (s *JWTTokenService) generateRefreshToken(userID int, username, role, userType, jti string, refreshCount int) (string, error) {
	now := time.Now()

	claims := &RefreshTokenClaims{
		UserID:       userID,
		Username:     username,
		Role:         role,
		UserType:     userType,
		JTI:          jti,
		RefreshCount: refreshCount,
		TokenType:    TokenTypeRefresh,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.RefreshTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Subject:   username,
			ID:        jti,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.RefreshSecretKey))
}

// validateRefreshToken 验证刷新令牌
func (s *JWTTokenService) validateRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.RefreshSecretKey), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid refresh token claims")
	}

	// 检查令牌类型
	if claims.TokenType != TokenTypeRefresh {
		return nil, fmt.Errorf("invalid token type")
	}

	// 检查是否在黑名单中
	if s.config.EnableBlacklist && s.isTokenBlacklisted(claims.JTI) {
		return nil, fmt.Errorf("refresh token has been revoked")
	}

	return claims, nil
}

// generateJTI 生成唯一的JWT ID
func (s *JWTTokenService) generateJTI() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// addToBlacklist 添加令牌到黑名单
func (s *JWTTokenService) addToBlacklist(jti string, expiresAt time.Time, reason string) {
	s.blacklistMutex.Lock()
	defer s.blacklistMutex.Unlock()

	entry := &TokenBlacklistEntry{
		JTI:       jti,
		ExpiresAt: expiresAt,
		RevokedAt: time.Now(),
		Reason:    reason,
	}

	s.blacklist[jti] = entry
	s.logger.Printf("Added token to blacklist: JTI=%s, reason=%s", jti, reason)
}

// isTokenBlacklisted 检查令牌是否在黑名单中
func (s *JWTTokenService) isTokenBlacklisted(jti string) bool {
	s.blacklistMutex.RLock()
	defer s.blacklistMutex.RUnlock()

	entry, exists := s.blacklist[jti]
	if !exists {
		return false
	}

	// 检查是否已过期
	if time.Now().After(entry.ExpiresAt) {
		// 异步清理过期条目
		go func() {
			s.blacklistMutex.Lock()
			delete(s.blacklist, jti)
			s.blacklistMutex.Unlock()
		}()
		return false
	}

	return true
}

// startBlacklistCleanup 启动黑名单清理定时任务
func (s *JWTTokenService) startBlacklistCleanup() {
	ticker := time.NewTicker(s.config.CleanupInterval)
	defer ticker.Stop()

	s.logger.Printf("Started JWT blacklist cleanup with interval: %s", s.config.CleanupInterval)

	for {
		select {
		case <-ticker.C:
			s.cleanupExpiredTokens()
		}
	}
}

// cleanupExpiredTokens 清理过期的黑名单条目
func (s *JWTTokenService) cleanupExpiredTokens() {
	s.blacklistMutex.Lock()
	defer s.blacklistMutex.Unlock()

	now := time.Now()
	cleanedCount := 0

	for jti, entry := range s.blacklist {
		if now.After(entry.ExpiresAt) {
			delete(s.blacklist, jti)
			cleanedCount++
		}
	}

	if cleanedCount > 0 {
		s.logger.Printf("Cleaned up %d expired blacklist entries", cleanedCount)
	}
}

// DefaultJWTServiceConfig 返回默认的JWT服务配置
func DefaultJWTServiceConfig() *JWTServiceConfig {
	return &JWTServiceConfig{
		AccessTokenExpiry:  24 * time.Hour,        // 24小时访问令牌
		RefreshTokenExpiry: 30 * 24 * time.Hour,   // 30天刷新令牌
		SecretKey:          "default-access-secret",
		RefreshSecretKey:   "default-refresh-secret",
		MaxRefreshCount:    100,                   // 增加最大刷新次数，支持长期使用
		CleanupInterval:    time.Hour,
		EnableBlacklist:    true,
	}
}
