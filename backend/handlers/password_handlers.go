package handlers

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"golang.org/x/crypto/bcrypt"
)

// PasswordHandler handles password-related operations
type PasswordHandler struct {
	userRepo        database.UserService
	auditRepo       *database.PostgresAuditRepository
	passwordHistory *services.PasswordHistoryService
	validator       *validator.Validate
}

// NewPasswordHandler creates a new password handler
func NewPasswordHandler(userRepo database.UserService, auditRepo *database.PostgresAuditRepository, passwordHistory *services.PasswordHistoryService) *PasswordHandler {
	return &PasswordHandler{
		userRepo:        userRepo,
		auditRepo:       auditRepo,
		passwordHistory: passwordHistory,
		validator:       validator.New(),
	}
}

// UserChangePasswordRequest represents a password change request
type UserChangePasswordRequest struct {
	OldPassword     string `json:"old_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
}

// ChangePassword allows users to change their own password
// @Summary Change user password
// @Description Allows authenticated users to change their own password
// @Tags Password
// @Accept json
// @Produce json
// @Param request body ChangePasswordRequest true "Password change request"
// @Success 200 {object} models.SuccessResponse "Password changed successfully"
// @Failure 400 {object} models.ErrorResponse "Invalid request"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 403 {object} models.ErrorResponse "Old password incorrect"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Security BearerAuth
// @Router /api/v1/users/me/change-password [post]
func (h *PasswordHandler) ChangePassword(c *gin.Context) {
	// Get current user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "未授权", "用户未登录")
		c.JSON(models.GetStatusCode(models.ErrCodeUnauthorized), response)
		return
	}
	userID := userIDVal.(int)

	// Parse request
	var req UserChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "请求格式错误", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "验证失败", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Get current user
	user, err := h.userRepo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "用户不存在", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
		return
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		// Record failed attempt
		if h.auditRepo != nil {
			clientIP := c.ClientIP()
			desc := fmt.Sprintf("Failed password change attempt for user ID %d: incorrect old password", userID)
			h.auditRepo.CreateAuditLog(c.Request.Context(), &models.AuditLog{
				Action:      "change_password_failed",
				UserID:      &userID,
				Description: &desc,
				IPAddress:   &clientIP,
			})
		}

		response := models.NewErrorResponse(models.ErrCodeAuthorization, "旧密码错误", "请输入正确的旧密码")
		c.JSON(models.GetStatusCode(models.ErrCodeAuthorization), response)
		return
	}

	// Check if new password is same as old password
	if req.OldPassword == req.NewPassword {
		response := models.NewErrorResponse(models.ErrCodeValidation, "新密码不能与旧密码相同", "请设置一个不同的新密码")
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Validate new password strength
	passwordConfig := config.LoadPasswordConfig()
	validationResult := utils.ValidatePasswordWithCommonCheck(req.NewPassword, passwordConfig.Policy)
	if !validationResult.Valid {
		errorMessage := strings.Join(validationResult.Errors, "; ")
		response := models.NewErrorResponse(models.ErrCodeValidation, "新密码不符合安全要求", errorMessage)
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)

		// Record failed attempt
		if h.auditRepo != nil {
			clientIP := c.ClientIP()
			desc := fmt.Sprintf("Failed password change for user ID %d: %s", userID, errorMessage)
			h.auditRepo.CreateAuditLog(c.Request.Context(), &models.AuditLog{
				Action:      "change_password_failed",
				UserID:      &userID,
				Description: &desc,
				IPAddress:   &clientIP,
			})
		}
		return
	}

	// Check password history (prevent reuse of recent passwords)
	if h.passwordHistory != nil {
		historyConfig := services.DefaultPasswordHistoryConfig()
		inHistory, err := h.passwordHistory.CheckPasswordHistory(userID, req.NewPassword, historyConfig)
		if err != nil {
			response := models.NewErrorResponse(models.ErrCodeInternal, "密码历史检查失败", err.Error())
			c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
			return
		}

		if inHistory {
			response := models.NewErrorResponse(
				models.ErrCodeValidation,
				"密码已被使用",
				fmt.Sprintf("此密码在您最近的 %d 次密码修改中已被使用，请选择不同的密码", historyConfig.PasswordHistoryCount),
			)
			c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)

			// Record failed attempt
			if h.auditRepo != nil {
				clientIP := c.ClientIP()
				desc := fmt.Sprintf("Failed password change for user ID %d: password reused from history", userID)
				h.auditRepo.CreateAuditLog(c.Request.Context(), &models.AuditLog{
					Action:      "change_password_failed",
					UserID:      &userID,
					Description: &desc,
					IPAddress:   &clientIP,
				})
			}
			return
		}
	}

	// Hash new password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "密码加密失败", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Update password
	err = h.userRepo.ResetPassword(c.Request.Context(), userID, string(passwordHash))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "密码更新失败", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Add password to history
	if h.passwordHistory != nil {
		metadata := map[string]interface{}{
			"ip_address": c.ClientIP(),
			"user_agent": c.GetHeader("User-Agent"),
			"created_by": userID,
		}
		err = h.passwordHistory.AddPasswordToHistory(
			userID,
			string(passwordHash),
			models.PasswordChangeReasonUserInitiated,
			metadata,
		)
		if err != nil {
			// Log error but don't fail the request since password was already changed
			fmt.Printf("Warning: Failed to add password to history for user %d: %v\n", userID, err)
		}
	}

	// Record successful password change
	if h.auditRepo != nil {
		clientIP := c.ClientIP()
		desc := fmt.Sprintf("User ID %d successfully changed their password", userID)
		h.auditRepo.CreateAuditLog(c.Request.Context(), &models.AuditLog{
			Action:      "change_password",
			UserID:      &userID,
			Description: &desc,
			IPAddress:   &clientIP,
		})
	}

	response := models.NewSuccessResponse(nil, "密码修改成功")
	c.JSON(http.StatusOK, response)
}

// ValidatePasswordStrength validates password strength without changing it
// @Summary Validate password strength
// @Description Validates password strength and returns feedback
// @Tags Password
// @Accept json
// @Produce json
// @Param request body map[string]string true "Password to validate"
// @Success 200 {object} object{valid=bool,strength=string,score=int,suggestions=[]string} "Validation result"
// @Failure 400 {object} models.ErrorResponse "Invalid request"
// @Router /api/v1/auth/validate-password [post]
func (h *PasswordHandler) ValidatePasswordStrength(c *gin.Context) {
	var req struct {
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "请求格式错误", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Validate password strength
	passwordConfig := config.LoadPasswordConfig()
	validationResult := utils.ValidatePasswordWithCommonCheck(req.Password, passwordConfig.Policy)

	response := models.NewSuccessResponse(map[string]interface{}{
		"valid":       validationResult.Valid,
		"strength":    validationResult.Strength,
		"score":       validationResult.Score,
		"errors":      validationResult.Errors,
		"suggestions": validationResult.Suggestions,
	}, "密码强度验证完成")

	c.JSON(http.StatusOK, response)
}

// GetPasswordExpirationStatus gets the password expiration status for current user
// @Summary Get password expiration status
// @Description Gets password expiration information for the authenticated user
// @Tags Password
// @Produce json
// @Success 200 {object} object{is_expired=bool,days_until_expiry=int,must_change=bool,warning_threshold_reached=bool} "Password expiration status"
// @Failure 401 {object} models.ErrorResponse "Unauthorized"
// @Failure 500 {object} models.ErrorResponse "Internal server error"
// @Security BearerAuth
// @Router /api/v1/users/me/password-expiration-status [get]
func (h *PasswordHandler) GetPasswordExpirationStatus(c *gin.Context) {
	// Get current user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "未授权", "用户未登录")
		c.JSON(models.GetStatusCode(models.ErrCodeUnauthorized), response)
		return
	}
	userID := userIDVal.(int)

	if h.passwordHistory == nil {
		response := models.NewSuccessResponse(map[string]interface{}{
			"is_expired":                 false,
			"days_until_expiry":          nil,
			"must_change":                false,
			"warning_threshold_reached":  false,
		}, "密码过期功能未启用")
		c.JSON(http.StatusOK, response)
		return
	}

	status, err := h.passwordHistory.GetPasswordExpirationStatus(userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取密码过期状态失败", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	response := models.NewSuccessResponse(status, "获取密码过期状态成功")
	c.JSON(http.StatusOK, response)
}
