package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// JWTTokenHandler JWT令牌管理处理器
type JWTTokenHandler struct {
	tokenService *services.JWTTokenService
}

// NewJWTTokenHandler 创建JWT令牌管理处理器
func NewJWTTokenHandler(tokenService *services.JWTTokenService) *JWTTokenHandler {
	return &JWTTokenHandler{
		tokenService: tokenService,
	}
}

// RefreshTokenRequest 刷新令牌请求
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RevokeTokenRequest 撤销令牌请求
type RevokeTokenRequest struct {
	Token  string `json:"token" binding:"required"`
	Reason string `json:"reason"`
}

// RefreshToken 刷新访问令牌
// POST /api/v1/auth/refresh
func (h *JWTTokenHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeValidationError,
			"Invalid request parameters",
			err.Error(),
		))
		return
	}

	// 刷新令牌
	tokenPair, err := h.tokenService.RefreshTokens(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"Failed to refresh token",
			err.Error(),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(tokenPair, "Token refreshed successfully"))
}
// RevokeToken 撤销令牌
// POST /api/v1/auth/revoke
func (h *JWTTokenHandler) RevokeToken(c *gin.Context) {
	var req RevokeTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeValidationError,
			"Invalid request parameters",
			err.Error(),
		))
		return
	}

	// 默认撤销原因
	reason := req.Reason
	if reason == "" {
		reason = "manually_revoked"
	}

	// 撤销令牌
	if err := h.tokenService.RevokeToken(req.Token, reason); err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternalError,
			"Failed to revoke token",
			err.Error(),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "Token revoked successfully"))
}

// RevokeAllTokens 撤销当前用户的所有令牌
// POST /api/v1/auth/revoke-all
func (h *JWTTokenHandler) RevokeAllTokens(c *gin.Context) {
	// 从上下文获取用户ID
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"User not authenticated",
			"User ID not found in context",
		))
		return
	}

	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternalError,
			"Invalid user ID type",
			"Failed to extract user ID from context",
		))
		return
	}

	// 撤销用户的所有令牌
	reason := "revoke_all_requested"
	if err := h.tokenService.RevokeAllUserTokens(userID, reason); err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			models.ErrCodeInternalError,
			"Failed to revoke all tokens",
			err.Error(),
		))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "All tokens revoked successfully"))
}
// GetTokenInfo 获取令牌信息
// GET /api/v1/auth/token-info
func (h *JWTTokenHandler) GetTokenInfo(c *gin.Context) {
	// 从请求头获取令牌
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || len(authHeader) < 7 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeValidationError,
			"Missing or invalid authorization header",
			"Authorization header is required",
		))
		return
	}

	tokenString := authHeader[7:] // Remove "Bearer " prefix

	// 验证令牌
	claims, err := h.tokenService.ValidateAccessToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"Invalid token",
			err.Error(),
		))
		return
	}

	// 返回令牌信息
	tokenInfo := map[string]interface{}{
		"user_id":    claims.UserID,
		"username":   claims.Username,
		"role":       claims.Role,
		"user_type":  claims.UserType,
		"issued_at":  claims.IssuedAt.Time,
		"expires_at": claims.ExpiresAt.Time,
		"valid":      true,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(tokenInfo, "Token information retrieved"))
}

// GetBlacklistStats 获取黑名单统计信息
// GET /api/v1/auth/blacklist-stats
func (h *JWTTokenHandler) GetBlacklistStats(c *gin.Context) {
	// 检查用户权限 - 只有管理员可以查看统计信息
	userRole, exists := c.Get("user_role")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			models.ErrCodeUnauthorized,
			"User role not found",
			"User authentication required",
		))
		return
	}

	role, ok := userRole.(string)
	if !ok || role != "admin" {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			models.ErrCodePermissionDenied,
			"Insufficient permissions",
			"Admin role required to view blacklist stats",
		))
		return
	}

	// 获取黑名单统计
	stats := h.tokenService.GetBlacklistStats()
	c.JSON(http.StatusOK, models.NewSuccessResponse(stats, "Blacklist statistics retrieved"))
}

// ValidateToken 验证令牌有效性
// POST /api/v1/auth/validate
func (h *JWTTokenHandler) ValidateToken(c *gin.Context) {
	type ValidateTokenRequest struct {
		Token string `json:"token" binding:"required"`
	}

	var req ValidateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			models.ErrCodeValidationError,
			"Invalid request parameters",
			err.Error(),
		))
		return
	}

	// 验证令牌
	claims, err := h.tokenService.ValidateAccessToken(req.Token)
	if err != nil {
		c.JSON(http.StatusOK, models.NewSuccessResponse(map[string]interface{}{
			"valid": false,
			"error": err.Error(),
		}, "Token validation result"))
		return
	}

	// 返回验证结果
	result := map[string]interface{}{
		"valid":      true,
		"user_id":    claims.UserID,
		"username":   claims.Username,
		"role":       claims.Role,
		"user_type":  claims.UserType,
		"expires_at": claims.ExpiresAt.Time,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(result, "Token is valid"))
}
