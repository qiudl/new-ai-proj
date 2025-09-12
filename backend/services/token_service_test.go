package services

import (
	"testing"
	"time"
	"ai-project-backend/models"
	"github.com/stretchr/testify/assert"
	"github.com/golang-jwt/jwt/v5"
)

func TestNewTokenService(t *testing.T) {
	secret := []byte("test_secret")
	normalExp := 24 * time.Hour
	impExp := 2 * time.Hour
	
	service := NewTokenService(secret, normalExp, impExp)
	
	assert.NotNil(t, service)
	assert.Equal(t, secret, service.jwtSecret)
	assert.Equal(t, normalExp, service.normalExpiration)
	assert.Equal(t, impExp, service.impersonationExpiration)
}

func TestTokenService_GenerateNormalToken(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	token, err := service.GenerateNormalToken(1, "admin", "admin", "system")
	
	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	
	// 解析并验证Token
	parsedToken, err := jwt.ParseWithClaims(token, &models.ExtendedClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte("test_secret"), nil
	})
	
	assert.NoError(t, err)
	assert.True(t, parsedToken.Valid)
	
	claims := parsedToken.Claims.(*models.ExtendedClaims)
	assert.Equal(t, 1, claims.UserID)
	assert.Equal(t, "admin", claims.Username)
	assert.Equal(t, "admin", claims.Role)
	assert.Equal(t, "system", claims.UserType)
	assert.False(t, claims.IsImpersonating())
}

func TestTokenService_GenerateImpersonationToken(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	// 准备测试数据
	originalClaims := &models.ExtendedClaims{
		UserID:   1,
		Username: "admin",
		Role:     "admin",
		UserType: "system",
	}
	
	enterprise := &models.Enterprise{
		ID:   100,
		Name: "Test Enterprise",
		Code: "TEST001",
	}
	
	// 测试生成模拟Token
	token, err := service.GenerateImpersonationToken(
		originalClaims,
		enterprise,
		"Testing impersonation functionality",
		"127.0.0.1",
	)
	
	assert.NoError(t, err)
	assert.NotEmpty(t, token)
	
	// 解析并验证Token
	claims, err := service.ParseToken(token)
	
	assert.NoError(t, err)
	assert.NotNil(t, claims.ImpersonationContext)
	assert.True(t, claims.IsImpersonating())
	assert.Equal(t, 100, claims.ImpersonationContext.EnterpriseID)
	assert.Equal(t, "Test Enterprise", claims.ImpersonationContext.EnterpriseName)
	assert.Equal(t, 1, claims.ImpersonationContext.OriginalUserID)
	assert.Equal(t, "admin", claims.ImpersonationContext.OriginalUsername)
	assert.Equal(t, "enterprise_admin", claims.Role)
	assert.Equal(t, "system_impersonating", claims.UserType)
}

func TestTokenService_GenerateImpersonationToken_NonAdmin(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	// 非系统管理员用户
	originalClaims := &models.ExtendedClaims{
		UserID:   2,
		Username: "user",
		Role:     "user",
		UserType: "enterprise",
	}
	
	enterprise := &models.Enterprise{
		ID:   100,
		Name: "Test Enterprise",
		Code: "TEST001",
	}
	
	// 应该返回错误
	token, err := service.GenerateImpersonationToken(
		originalClaims,
		enterprise,
		"Unauthorized attempt",
		"127.0.0.1",
	)
	
	assert.Error(t, err)
	assert.Empty(t, token)
	assert.Contains(t, err.Error(), "only system administrators can impersonate")
}

func TestTokenService_GenerateImpersonationToken_AlreadyImpersonating(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	// 已经在模拟状态的用户
	originalClaims := &models.ExtendedClaims{
		UserID:   1,
		Username: "admin",
		Role:     "admin",
		UserType: "system",
		ImpersonationContext: &models.ImpersonationContext{
			EnterpriseID: 50,
		},
	}
	
	enterprise := &models.Enterprise{
		ID:   100,
		Name: "Test Enterprise",
		Code: "TEST001",
	}
	
	// 应该返回错误
	token, err := service.GenerateImpersonationToken(
		originalClaims,
		enterprise,
		"Nested impersonation attempt",
		"127.0.0.1",
	)
	
	assert.Error(t, err)
	assert.Empty(t, token)
	assert.Contains(t, err.Error(), "already in impersonation mode")
}

func TestTokenService_ParseToken(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	// 生成Token
	token, err := service.GenerateNormalToken(1, "admin", "admin", "system")
	assert.NoError(t, err)
	
	// 解析Token
	claims, err := service.ParseToken(token)
	assert.NoError(t, err)
	assert.Equal(t, 1, claims.UserID)
	assert.Equal(t, "admin", claims.Username)
}

func TestTokenService_ParseToken_Invalid(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	// 使用无效Token
	claims, err := service.ParseToken("invalid.token.here")
	assert.Error(t, err)
	assert.Nil(t, claims)
}

func TestTokenService_ParseToken_WrongSecret(t *testing.T) {
	service1 := NewTokenService([]byte("secret1"), 24*time.Hour, 2*time.Hour)
	service2 := NewTokenService([]byte("secret2"), 24*time.Hour, 2*time.Hour)
	
	// 用secret1生成Token
	token, err := service1.GenerateNormalToken(1, "admin", "admin", "system")
	assert.NoError(t, err)
	
	// 用secret2解析Token（应该失败）
	claims, err := service2.ParseToken(token)
	assert.Error(t, err)
	assert.Nil(t, claims)
}

func TestTokenService_ValidateImpersonationSession(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 1*time.Second)
	
	originalClaims := &models.ExtendedClaims{
		UserID:   1,
		Username: "admin",
		Role:     "admin",
		UserType: "system",
	}
	
	enterprise := &models.Enterprise{
		ID:   100,
		Name: "Test Enterprise",
		Code: "TEST001",
	}
	
	// 生成模拟Token
	token, err := service.GenerateImpersonationToken(
		originalClaims,
		enterprise,
		"Test validation",
		"127.0.0.1",
	)
	assert.NoError(t, err)
	
	// 立即验证（应该成功）
	claims, err := service.ParseToken(token)
	assert.NoError(t, err)
	
	err = service.ValidateImpersonationSession(claims)
	assert.NoError(t, err)
	
	// 等待过期后验证
	time.Sleep(2 * time.Second)
	
	err = service.ValidateImpersonationSession(claims)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "impersonation session expired")
}

func TestTokenService_ExtractImpersonationInfo(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	originalClaims := &models.ExtendedClaims{
		UserID:   1,
		Username: "admin",
		Role:     "admin",
		UserType: "system",
	}
	
	enterprise := &models.Enterprise{
		ID:   100,
		Name: "Test Enterprise",
		Code: "TEST001",
	}
	
	// 生成模拟Token
	token, err := service.GenerateImpersonationToken(
		originalClaims,
		enterprise,
		"Test extraction",
		"127.0.0.1",
	)
	assert.NoError(t, err)
	
	claims, err := service.ParseToken(token)
	assert.NoError(t, err)
	
	// 提取模拟信息
	info := service.ExtractImpersonationInfo(claims)
	assert.NotNil(t, info)
	assert.Equal(t, 100, info["enterprise_id"])
	assert.Equal(t, "Test Enterprise", info["enterprise_name"])
	assert.Equal(t, 1, info["original_user_id"])
	assert.Equal(t, "admin", info["original_username"])
	assert.Equal(t, "Test extraction", info["reason"])
	assert.Equal(t, "127.0.0.1", info["ip_address"])
}

func TestTokenService_ExtractImpersonationInfo_Normal(t *testing.T) {
	service := NewTokenService([]byte("test_secret"), 24*time.Hour, 2*time.Hour)
	
	// 普通Token
	token, err := service.GenerateNormalToken(1, "admin", "admin", "system")
	assert.NoError(t, err)
	
	claims, err := service.ParseToken(token)
	assert.NoError(t, err)
	
	// 提取模拟信息（应该返回nil）
	info := service.ExtractImpersonationInfo(claims)
	assert.Nil(t, info)
}