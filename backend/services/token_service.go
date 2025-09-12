package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"time"
	"github.com/golang-jwt/jwt/v5"
	"ai-project-backend/models"
)

type TokenService struct {
	jwtSecret               []byte
	normalExpiration        time.Duration
	impersonationExpiration time.Duration
}

// NewTokenService 创建新的Token服务
func NewTokenService(jwtSecret []byte, normalExpiration, impersonationExpiration time.Duration) *TokenService {
	return &TokenService{
		jwtSecret:               jwtSecret,
		normalExpiration:        normalExpiration,
		impersonationExpiration: impersonationExpiration,
	}
}

// GenerateNormalToken 生成普通用户令牌
func (s *TokenService) GenerateNormalToken(userID int, username, role, userType string) (string, error) {
	now := time.Now()
	
	claims := &models.ExtendedClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		UserType: userType,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   username,
			ExpiresAt: jwt.NewNumericDate(now.Add(s.normalExpiration)),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        generateJTI(),
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// GenerateImpersonationToken 生成模拟令牌
func (s *TokenService) GenerateImpersonationToken(
	originalClaims *models.ExtendedClaims,
	enterprise *models.Enterprise,
	reason string,
	ipAddress string,
) (string, error) {
	log.Printf("[TokenService] Starting impersonation token generation")
	log.Printf("[TokenService] Original claims: userID=%d, role=%s, userType=%s", 
		originalClaims.UserID, originalClaims.Role, originalClaims.UserType)
	log.Printf("[TokenService] Target enterprise: ID=%d, Name=%s", enterprise.ID, enterprise.Name)
	
	// 检查是否已经在模拟状态
	if originalClaims.IsImpersonating() {
		log.Printf("[TokenService] Error: already in impersonation mode")
		return "", fmt.Errorf("already in impersonation mode")
	}
	
	// 验证是否为系统管理员
	if originalClaims.Role != "admin" || originalClaims.UserType != "system" {
		log.Printf("[TokenService] Error: insufficient permissions - role=%s, userType=%s", 
			originalClaims.Role, originalClaims.UserType)
		return "", fmt.Errorf("only system administrators can impersonate")
	}
	
	now := time.Now()
	expiresAt := now.Add(s.impersonationExpiration)
	sessionID := generateSessionID()
	log.Printf("[TokenService] Generated session ID: %s, expires at: %s", sessionID, expiresAt.Format(time.RFC3339))
	
	// 创建模拟上下文
	impersonationContext := &models.ImpersonationContext{
		EnterpriseID:     enterprise.ID,
		EnterpriseName:   enterprise.Name,
		EnterpriseCode:   enterprise.Code,
		OriginalUserID:   originalClaims.UserID,
		OriginalUsername: originalClaims.Username,
		OriginalRole:     originalClaims.Role,
		StartedAt:        now,
		ExpiresAt:        expiresAt,
		SessionID:        sessionID,
		Reason:           reason,
		IPAddress:        ipAddress,
	}
	
	// 创建新的Claims
	newClaims := &models.ExtendedClaims{
		UserID:               originalClaims.UserID,
		Username:             originalClaims.Username,
		Role:                 "enterprise_admin", // 赋予企业管理员角色
		UserType:             "system_impersonating",
		ImpersonationContext: impersonationContext,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("impersonation_%s", sessionID),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        sessionID,
		},
	}
	
	log.Printf("[TokenService] Created new claims for impersonation: role=%s, userType=%s", 
		newClaims.Role, newClaims.UserType)
	
	// 生成Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, newClaims)
	signedToken, err := token.SignedString(s.jwtSecret)
	if err != nil {
		log.Printf("[TokenService] Error signing token: %v", err)
		return "", fmt.Errorf("failed to sign token: %v", err)
	}
	
	log.Printf("[TokenService] Successfully generated impersonation token")
	return signedToken, nil
}

// ParseToken 解析Token
func (s *TokenService) ParseToken(tokenString string) (*models.ExtendedClaims, error) {
	log.Printf("[TokenService] Starting token parsing")
	
	token, err := jwt.ParseWithClaims(tokenString, &models.ExtendedClaims{}, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Printf("[TokenService] Error: unexpected signing method: %v", token.Header["alg"])
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	
	if err != nil {
		log.Printf("[TokenService] Error parsing token: %v", err)
		return nil, err
	}
	
	if claims, ok := token.Claims.(*models.ExtendedClaims); ok && token.Valid {
		log.Printf("[TokenService] Successfully parsed token: userID=%d, role=%s, isImpersonating=%t", 
			claims.UserID, claims.Role, claims.IsImpersonating())
		
		// 额外检查模拟会话是否过期
		if claims.IsImpersonating() && claims.IsExpired() {
			log.Printf("[TokenService] Error: impersonation session expired")
			return nil, fmt.Errorf("impersonation session expired")
		}
		return claims, nil
	}
	
	log.Printf("[TokenService] Error: invalid token claims or token not valid")
	return nil, fmt.Errorf("invalid token")
}

// ValidateImpersonationSession 验证模拟会话
func (s *TokenService) ValidateImpersonationSession(claims *models.ExtendedClaims) error {
	if !claims.IsImpersonating() {
		return nil
	}
	
	ctx := claims.ImpersonationContext
	
	// 检查会话是否过期
	if time.Now().After(ctx.ExpiresAt) {
		return fmt.Errorf("impersonation session expired")
	}
	
	// 检查会话ID是否有效
	if ctx.SessionID == "" {
		return fmt.Errorf("invalid session ID")
	}
	
	return nil
}

// ExtractImpersonationInfo 提取模拟信息用于审计
func (s *TokenService) ExtractImpersonationInfo(claims *models.ExtendedClaims) map[string]interface{} {
	if !claims.IsImpersonating() {
		return nil
	}
	
	ctx := claims.ImpersonationContext
	return map[string]interface{}{
		"session_id":         ctx.SessionID,
		"enterprise_id":      ctx.EnterpriseID,
		"enterprise_name":    ctx.EnterpriseName,
		"original_user_id":   ctx.OriginalUserID,
		"original_username":  ctx.OriginalUsername,
		"started_at":         ctx.StartedAt,
		"expires_at":         ctx.ExpiresAt,
		"reason":             ctx.Reason,
		"ip_address":         ctx.IPAddress,
	}
}

// generateSessionID 生成唯一会话ID
func generateSessionID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// generateJTI 生成JWT ID
func generateJTI() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}