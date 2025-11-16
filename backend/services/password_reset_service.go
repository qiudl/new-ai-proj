package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"time"

	"ai-project-backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// PasswordResetService handles password reset token generation and verification
type PasswordResetService struct {
	DB                    *gorm.DB
	EmailService          *EmailService
	PasswordHistoryService *PasswordHistoryService
	TokenExpiryMinutes    int // Default: 30 minutes
	MaxResetAttempts      int // Max attempts per hour
}

// NewPasswordResetService creates a new password reset service
func NewPasswordResetService(db *gorm.DB, emailService *EmailService, passwordHistory *PasswordHistoryService) *PasswordResetService {
	return &PasswordResetService{
		DB:                     db,
		EmailService:           emailService,
		PasswordHistoryService: passwordHistory,
		TokenExpiryMinutes:     30,
		MaxResetAttempts:       3,
	}
}

// GenerateResetToken generates a cryptographically secure random token
// Returns: (token, tokenHash, error)
func GenerateResetToken() (string, string, error) {
	// Generate 32 random bytes
	tokenBytes := make([]byte, 32)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate random token: %w", err)
	}

	// Encode token as base64 URL-safe string (for use in URLs)
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	// Create SHA-256 hash of token for database storage
	hash := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", hash)

	return token, tokenHash, nil
}

// CreateResetToken creates a password reset token for a user
func (s *PasswordResetService) CreateResetToken(email string, ipAddress string, userAgent string) (*models.PasswordResetToken, string, error) {
	// Find user by email
	var user models.User
	err := s.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// For security, don't reveal if email exists
			// Return success but don't create token
			return nil, "", nil
		}
		return nil, "", fmt.Errorf("database error: %w", err)
	}

	// Check rate limiting - max 3 attempts per hour
	var recentCount int64
	oneHourAgo := time.Now().Add(-1 * time.Hour)
	err = s.DB.Model(&models.PasswordResetToken{}).
		Where("user_id = ? AND created_at > ?", user.ID, oneHourAgo).
		Count(&recentCount).Error

	if err != nil {
		return nil, "", fmt.Errorf("failed to check rate limit: %w", err)
	}

	if recentCount >= int64(s.MaxResetAttempts) {
		return nil, "", fmt.Errorf("too many reset attempts. Please try again later")
	}

	// Generate token
	token, tokenHash, err := GenerateResetToken()
	if err != nil {
		return nil, "", err
	}

	// Calculate expiration time
	expiresAt := time.Now().Add(time.Duration(s.TokenExpiryMinutes) * time.Minute)

	// Create token record
	resetToken := &models.PasswordResetToken{
		UserID:    user.ID,
		Token:     token, // Store original token (will be removed after initial creation)
		TokenHash: tokenHash,
		Email:     email,
		CreatedAt: time.Now(),
		ExpiresAt: expiresAt,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Status:    models.ResetTokenStatusPending,
	}

	// Start transaction
	tx := s.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Insert token (trigger will auto-revoke old tokens)
	err = tx.Create(resetToken).Error
	if err != nil {
		tx.Rollback()
		return nil, "", fmt.Errorf("failed to create reset token: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, "", fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return token with original token string (for email sending)
	return resetToken, token, nil
}

// VerifyResetToken verifies if a reset token is valid
func (s *PasswordResetService) VerifyResetToken(token string) (*models.PasswordResetToken, error) {
	// Hash the provided token
	hash := sha256.Sum256([]byte(token))
	tokenHash := fmt.Sprintf("%x", hash)

	// Find token by hash
	var resetToken models.PasswordResetToken
	err := s.DB.Where("token_hash = ?", tokenHash).
		Preload("User").
		First(&resetToken).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid or expired reset token")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if token is valid
	if !resetToken.IsValid() {
		if resetToken.IsExpired() {
			return nil, fmt.Errorf("reset token has expired")
		}
		if resetToken.UsedAt != nil {
			return nil, fmt.Errorf("reset token has already been used")
		}
		if resetToken.Status == models.ResetTokenStatusRevoked {
			return nil, fmt.Errorf("reset token has been revoked")
		}
		return nil, fmt.Errorf("invalid reset token")
	}

	return &resetToken, nil
}

// ResetPassword resets a user's password using a valid token
func (s *PasswordResetService) ResetPassword(token string, newPassword string, ipAddress string, userAgent string) error {
	// Verify token
	resetToken, err := s.VerifyResetToken(token)
	if err != nil {
		return err
	}

	// Check password history (prevent reuse)
	if s.PasswordHistoryService != nil {
		historyConfig := DefaultPasswordHistoryConfig()
		inHistory, err := s.PasswordHistoryService.CheckPasswordHistory(resetToken.UserID, newPassword, historyConfig)
		if err != nil {
			return fmt.Errorf("failed to check password history: %w", err)
		}

		if inHistory {
			return fmt.Errorf("password has been used recently and cannot be reused. Please choose a different password")
		}
	}

	// Hash new password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Start transaction
	tx := s.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update user password
	err = tx.Model(&models.User{}).
		Where("id = ?", resetToken.UserID).
		Updates(map[string]interface{}{
			"password_hash":       string(passwordHash),
			"must_change_password": false,
		}).Error

	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Mark token as used
	now := time.Now()
	err = tx.Model(&models.PasswordResetToken{}).
		Where("id = ?", resetToken.ID).
		Updates(map[string]interface{}{
			"used_at":           now,
			"status":            models.ResetTokenStatusUsed,
			"reset_ip_address":  ipAddress,
			"reset_user_agent":  userAgent,
		}).Error

	if err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to mark token as used: %w", err)
	}

	// Add to password history
	if s.PasswordHistoryService != nil {
		metadata := map[string]interface{}{
			"ip_address": ipAddress,
			"user_agent": userAgent,
		}
		err = s.PasswordHistoryService.RecordPasswordChange(
			tx,
			resetToken.UserID,
			string(passwordHash),
			models.PasswordChangeReasonAdminReset,
			metadata,
		)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record password change: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Send success notification email
	if s.EmailService != nil && resetToken.User != nil {
		_ = s.EmailService.SendPasswordResetSuccessEmail(
			resetToken.Email,
			now,
			ipAddress,
		)
	}

	return nil
}

// SendResetEmail sends the password reset email
func (s *PasswordResetService) SendResetEmail(resetToken *models.PasswordResetToken, token string, baseURL string) error {
	if s.EmailService == nil {
		return fmt.Errorf("email service not configured")
	}

	// Build reset link
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", baseURL, token)

	// Send email
	return s.EmailService.SendPasswordResetEmail(
		resetToken.Email,
		resetLink,
		s.TokenExpiryMinutes,
	)
}

// CleanupExpiredTokens removes expired reset tokens
func (s *PasswordResetService) CleanupExpiredTokens() (int64, error) {
	now := time.Now()

	// Update expired tokens
	result := s.DB.Model(&models.PasswordResetToken{}).
		Where("status = ? AND expires_at < ?", models.ResetTokenStatusPending, now).
		Update("status", models.ResetTokenStatusExpired)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup expired tokens: %w", result.Error)
	}

	return result.RowsAffected, nil
}

// RevokeUserTokens revokes all pending reset tokens for a user
func (s *PasswordResetService) RevokeUserTokens(userID int) (int64, error) {
	result := s.DB.Model(&models.PasswordResetToken{}).
		Where("user_id = ? AND status = ?", userID, models.ResetTokenStatusPending).
		Update("status", models.ResetTokenStatusRevoked)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to revoke user tokens: %w", result.Error)
	}

	return result.RowsAffected, nil
}

// GetResetTokenStats returns statistics about reset tokens
func (s *PasswordResetService) GetResetTokenStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total tokens
	var totalTokens int64
	s.DB.Model(&models.PasswordResetToken{}).Count(&totalTokens)
	stats["total_tokens"] = totalTokens

	// Tokens by status
	var tokensByStatus []struct {
		Status string
		Count  int64
	}
	s.DB.Model(&models.PasswordResetToken{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&tokensByStatus)
	stats["tokens_by_status"] = tokensByStatus

	// Tokens created in last 24 hours
	var recentTokens int64
	oneDayAgo := time.Now().Add(-24 * time.Hour)
	s.DB.Model(&models.PasswordResetToken{}).
		Where("created_at > ?", oneDayAgo).
		Count(&recentTokens)
	stats["tokens_last_24h"] = recentTokens

	// Success rate (used tokens / total tokens)
	var usedTokens int64
	s.DB.Model(&models.PasswordResetToken{}).
		Where("status = ?", models.ResetTokenStatusUsed).
		Count(&usedTokens)
	stats["used_tokens"] = usedTokens
	if totalTokens > 0 {
		stats["success_rate"] = float64(usedTokens) / float64(totalTokens) * 100
	}

	return stats, nil
}
