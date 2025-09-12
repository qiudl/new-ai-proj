package models

import (
	"time"
	"github.com/golang-jwt/jwt/v5"
)

// ExtendedClaims 扩展的JWT Claims结构
type ExtendedClaims struct {
	// 基础用户信息
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	UserType string `json:"user_type"`
	
	// 企业租户模拟相关
	ImpersonationContext *ImpersonationContext `json:"impersonation,omitempty"`
	
	// 标准JWT Claims
	jwt.RegisteredClaims
}

// ImpersonationContext 模拟上下文
type ImpersonationContext struct {
	// 被模拟的企业信息
	EnterpriseID   int    `json:"enterprise_id"`
	EnterpriseName string `json:"enterprise_name"`
	EnterpriseCode string `json:"enterprise_code"`
	
	// 原始用户信息（用于审计）
	OriginalUserID   int    `json:"original_user_id"`
	OriginalUsername string `json:"original_username"`
	OriginalRole     string `json:"original_role"`
	
	// 模拟会话信息
	StartedAt   time.Time `json:"started_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	SessionID   string    `json:"session_id"`   // 唯一会话标识
	Reason      string    `json:"reason"`       // 模拟原因
	IPAddress   string    `json:"ip_address"`   // 发起模拟的IP
}

// IsImpersonating 判断是否处于模拟状态
func (c *ExtendedClaims) IsImpersonating() bool {
	return c.ImpersonationContext != nil
}

// GetEffectiveEnterpriseID 获取有效的企业ID
func (c *ExtendedClaims) GetEffectiveEnterpriseID() *int {
	if c.ImpersonationContext != nil {
		return &c.ImpersonationContext.EnterpriseID
	}
	return nil
}

// GetEffectiveUserID 获取有效的用户ID（模拟状态下返回原始用户ID）
func (c *ExtendedClaims) GetEffectiveUserID() int {
	return c.UserID
}

// GetOriginalUserID 获取原始用户ID
func (c *ExtendedClaims) GetOriginalUserID() int {
	if c.ImpersonationContext != nil {
		return c.ImpersonationContext.OriginalUserID
	}
	return c.UserID
}

// IsExpired 检查模拟会话是否过期
func (c *ExtendedClaims) IsExpired() bool {
	if c.ImpersonationContext != nil {
		return time.Now().After(c.ImpersonationContext.ExpiresAt)
	}
	return false
}