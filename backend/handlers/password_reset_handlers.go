package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

// PasswordResetHandler handles password reset requests
type PasswordResetHandler struct {
	passwordResetService *services.PasswordResetService
	auditRepo            *database.PostgresAuditRepository
}

// NewPasswordResetHandler creates a new password reset handler
func NewPasswordResetHandler(
	passwordResetService *services.PasswordResetService,
	auditRepo *database.PostgresAuditRepository,
) *PasswordResetHandler {
	return &PasswordResetHandler{
		passwordResetService: passwordResetService,
		auditRepo:            auditRepo,
	}
}

// ForgotPassword handles forgot password requests
// @Summary Request password reset
// @Description Send a password reset email to the user's registered email address
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body models.ForgotPasswordRequest true "Forgot password request"
// @Success 200 {object} models.SuccessResponse{data=map[string]interface{}} "Password reset email sent successfully"
// @Failure 400 {object} models.ErrorResponse "Invalid request"
// @Failure 429 {object} models.ErrorResponse "Too many reset attempts"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /api/v1/auth/forgot-password [post]
func (h *PasswordResetHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "请求参数无效", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Get client info
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// Create reset token
	resetToken, token, err := h.passwordResetService.CreateResetToken(req.Email, ipAddress, userAgent)
	if err != nil {
		log.Printf("[Password Reset] Error creating reset token for %s: %v", services.MaskEmail(req.Email), err)

		// Check if rate limit error
		if err.Error() == "too many reset attempts. Please try again later" {
			response := models.NewErrorResponse(
				models.ErrCodeTooManyRequests,
				"请求过于频繁",
				"您的密码重置请求过于频繁，请稍后再试",
			)
			c.JSON(models.GetStatusCode(models.ErrCodeTooManyRequests), response)
			return
		}

		response := models.NewErrorResponse(models.ErrCodeInternal, "发送密码重置邮件失败", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// If resetToken is nil, email doesn't exist (but we don't reveal this for security)
	if resetToken == nil {
		log.Printf("[Password Reset] Email not found: %s (returning success for security)", services.MaskEmail(req.Email))
		response := models.NewSuccessResponse("密码重置邮件已发送", map[string]interface{}{
			"message": "如果该邮箱地址已注册，您将收到一封密码重置邮件",
			"email":   services.MaskEmail(req.Email),
		})
		c.JSON(200, response)
		return
	}

	// Send reset email
	baseURL := os.Getenv("FRONTEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3000"
	}

	err = h.passwordResetService.SendResetEmail(resetToken, token, baseURL)
	if err != nil {
		log.Printf("[Password Reset] Error sending email to %s: %v", services.MaskEmail(req.Email), err)
		// Don't fail the request if email sending fails (token is already created)
	}

	// Log audit event
	if h.auditRepo != nil && resetToken.User != nil {
		auditLog := &models.AuditLog{
			UserID:     &resetToken.UserID,
			Action:     "password_reset_requested",
			EntityType: "user",
			EntityID:   &resetToken.UserID,
			Details:    fmt.Sprintf("Password reset requested for email: %s", services.MaskEmail(req.Email)),
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
		}
		_ = h.auditRepo.CreateAuditLog(auditLog)
	}

	log.Printf("[Password Reset] Reset token created for %s, expires in %d minutes",
		services.MaskEmail(req.Email),
		h.passwordResetService.TokenExpiryMinutes,
	)

	// Always return success (don't reveal if email exists)
	response := models.NewSuccessResponse("密码重置邮件已发送", map[string]interface{}{
		"message": "如果该邮箱地址已注册，您将收到一封密码重置邮件",
		"email":   services.MaskEmail(req.Email),
	})
	c.JSON(200, response)
}

// VerifyResetToken verifies if a password reset token is valid
// @Summary Verify password reset token
// @Description Check if a password reset token is valid and not expired
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body models.VerifyResetTokenRequest true "Verify token request"
// @Success 200 {object} models.SuccessResponse{data=map[string]interface{}} "Token is valid"
// @Failure 400 {object} models.ErrorResponse "Invalid request"
// @Failure 404 {object} models.ErrorResponse "Token not found or expired"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /api/v1/auth/verify-reset-token [post]
func (h *PasswordResetHandler) VerifyResetToken(c *gin.Context) {
	var req models.VerifyResetTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "请求参数无效", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Verify token
	resetToken, err := h.passwordResetService.VerifyResetToken(req.Token)
	if err != nil {
		log.Printf("[Password Reset] Token verification failed: %v", err)
		response := models.NewErrorResponse(models.ErrCodeNotFound, "令牌无效或已过期", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
		return
	}

	// Return token info (without sensitive data)
	response := models.NewSuccessResponse("令牌有效", map[string]interface{}{
		"email":      services.MaskEmail(resetToken.Email),
		"expires_at": resetToken.ExpiresAt,
	})
	c.JSON(200, response)
}

// ResetPassword resets user password using a valid token
// @Summary Reset password
// @Description Reset user password using a valid password reset token
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body models.ResetPasswordRequest true "Reset password request"
// @Success 200 {object} models.SuccessResponse{data=map[string]interface{}} "Password reset successfully"
// @Failure 400 {object} models.ErrorResponse "Invalid request"
// @Failure 404 {object} models.ErrorResponse "Token not found or expired"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Router /api/v1/auth/reset-password [post]
func (h *PasswordResetHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "请求参数无效", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Additional validation
	if req.NewPassword != req.ConfirmPassword {
		response := models.NewErrorResponse(models.ErrCodeValidation, "密码不匹配", "新密码和确认密码不一致")
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	if len(req.NewPassword) < 8 {
		response := models.NewErrorResponse(models.ErrCodeValidation, "密码过短", "密码长度至少为8个字符")
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Get client info
	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// Reset password
	err := h.passwordResetService.ResetPassword(req.Token, req.NewPassword, ipAddress, userAgent)
	if err != nil {
		log.Printf("[Password Reset] Password reset failed: %v", err)

		// Check specific error types
		if err.Error() == "invalid or expired reset token" ||
			err.Error() == "reset token has expired" ||
			err.Error() == "reset token has already been used" ||
			err.Error() == "reset token has been revoked" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "令牌无效或已过期", err.Error())
			c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
			return
		}

		if err.Error() == "password has been used recently and cannot be reused. Please choose a different password" {
			response := models.NewErrorResponse(models.ErrCodeValidation, "密码已被使用", err.Error())
			c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
			return
		}

		response := models.NewErrorResponse(models.ErrCodeInternal, "密码重置失败", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Log audit event
	if h.auditRepo != nil {
		auditLog := &models.AuditLog{
			Action:     "password_reset_completed",
			EntityType: "user",
			Details:    "Password was reset successfully via reset token",
			IPAddress:  ipAddress,
			UserAgent:  userAgent,
		}
		_ = h.auditRepo.CreateAuditLog(auditLog)
	}

	log.Printf("[Password Reset] Password reset successful from IP: %s", ipAddress)

	response := models.NewSuccessResponse("密码重置成功", map[string]interface{}{
		"message": "您的密码已成功重置，请使用新密码登录",
	})
	c.JSON(200, response)
}
