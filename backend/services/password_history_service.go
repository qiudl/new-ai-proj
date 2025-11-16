package services

import (
	"fmt"
	"time"

	"ai-project-backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// PasswordHistoryService handles password history and expiration logic
type PasswordHistoryService struct {
	DB *gorm.DB
}

// NewPasswordHistoryService creates a new password history service
func NewPasswordHistoryService(db *gorm.DB) *PasswordHistoryService {
	return &PasswordHistoryService{
		DB: db,
	}
}

// PasswordHistoryConfig defines configuration for password history checking
type PasswordHistoryConfig struct {
	PasswordHistoryCount int // Number of historical passwords to check (default: 5)
	MinPasswordAge       int // Minimum days before password can be changed again (default: 0)
	PasswordExpiryDays   int // Days until password expires (default: 90)
	WarningDays          int // Days before expiry to show warning (default: 7)
}

// DefaultPasswordHistoryConfig returns the default configuration
func DefaultPasswordHistoryConfig() PasswordHistoryConfig {
	return PasswordHistoryConfig{
		PasswordHistoryCount: 5,
		MinPasswordAge:       0,
		PasswordExpiryDays:   90,
		WarningDays:          7,
	}
}

// AddPasswordToHistory adds a password to the user's password history
func (s *PasswordHistoryService) AddPasswordToHistory(userID int, passwordHash string, changeReason string, metadata map[string]interface{}) error {
	history := &models.PasswordHistory{
		UserID:       userID,
		PasswordHash: passwordHash,
		ChangeReason: changeReason,
		CreatedAt:    time.Now(),
	}

	// Add metadata if provided
	if metadata != nil {
		if ip, ok := metadata["ip_address"].(string); ok {
			history.IPAddress = ip
		}
		if ua, ok := metadata["user_agent"].(string); ok {
			history.UserAgent = ua
		}
		if createdBy, ok := metadata["created_by"].(int); ok {
			history.CreatedBy = &createdBy
		}
	}

	return s.DB.Create(history).Error
}

// CheckPasswordHistory checks if a password has been used recently
// Returns true if password is in history (should be rejected), false if password is new
func (s *PasswordHistoryService) CheckPasswordHistory(userID int, newPassword string, config PasswordHistoryConfig) (bool, error) {
	// Get the last N passwords from history
	var histories []models.PasswordHistory
	err := s.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(config.PasswordHistoryCount).
		Find(&histories).Error

	if err != nil {
		return false, fmt.Errorf("failed to fetch password history: %w", err)
	}

	// Check if new password matches any historical password
	for _, history := range histories {
		err := bcrypt.CompareHashAndPassword([]byte(history.PasswordHash), []byte(newPassword))
		if err == nil {
			// Password matches - reject it
			return true, nil
		}
	}

	// Password is new - allow it
	return false, nil
}

// GetPasswordExpirationStatus gets the password expiration status for a user
func (s *PasswordHistoryService) GetPasswordExpirationStatus(userID int) (*models.PasswordExpirationStatus, error) {
	var user models.User
	err := s.DB.Select("password_expires_at, must_change_password").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	status := &models.PasswordExpirationStatus{
		MustChange: user.MustChangePassword,
	}

	// Check if password has expiration set
	if user.PasswordExpiresAt != nil {
		now := time.Now()
		status.IsExpired = user.PasswordExpiresAt.Before(now)

		// Calculate days until expiry
		daysUntilExpiry := int(user.PasswordExpiresAt.Sub(now).Hours() / 24)
		if daysUntilExpiry >= 0 {
			status.DaysUntilExpiry = &daysUntilExpiry
		}

		// Check warning threshold (7 days by default)
		warningThreshold := now.Add(time.Duration(DefaultPasswordHistoryConfig().WarningDays) * 24 * time.Hour)
		status.WarningThresholdReached = user.PasswordExpiresAt.Before(warningThreshold)
	}

	return status, nil
}

// ShouldForcePasswordChange checks if user should be forced to change password
func (s *PasswordHistoryService) ShouldForcePasswordChange(userID int) (bool, error) {
	var user models.User
	err := s.DB.Select("password_expires_at, must_change_password").
		Where("id = ?", userID).
		First(&user).Error

	if err != nil {
		return false, fmt.Errorf("failed to fetch user: %w", err)
	}

	// Check must_change_password flag
	if user.MustChangePassword {
		return true, nil
	}

	// Check password expiration
	if user.PasswordExpiresAt != nil && user.PasswordExpiresAt.Before(time.Now()) {
		return true, nil
	}

	return false, nil
}

// SetMustChangePassword sets the must_change_password flag for a user
func (s *PasswordHistoryService) SetMustChangePassword(userID int, mustChange bool) error {
	return s.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("must_change_password", mustChange).Error
}

// GetPasswordHistory retrieves password history for a user
func (s *PasswordHistoryService) GetPasswordHistory(userID int, limit int) ([]models.PasswordHistory, error) {
	var histories []models.PasswordHistory
	err := s.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&histories).Error

	return histories, err
}

// CleanupOldPasswordHistory removes password history older than specified days
func (s *PasswordHistoryService) CleanupOldPasswordHistory(daysToKeep int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -daysToKeep)

	result := s.DB.Where("created_at < ?", cutoffDate).Delete(&models.PasswordHistory{})
	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup old password history: %w", result.Error)
	}

	return result.RowsAffected, nil
}

// GetExpiringPasswords gets users whose passwords will expire within the specified days
func (s *PasswordHistoryService) GetExpiringPasswords(withinDays int) ([]models.User, error) {
	var users []models.User
	now := time.Now()
	futureDate := now.Add(time.Duration(withinDays) * 24 * time.Hour)

	err := s.DB.Where("password_expires_at IS NOT NULL").
		Where("password_expires_at BETWEEN ? AND ?", now, futureDate).
		Where("must_change_password = ?", false). // Don't include users already flagged
		Find(&users).Error

	return users, err
}

// GetExpiredPasswords gets users whose passwords have expired
func (s *PasswordHistoryService) GetExpiredPasswords() ([]models.User, error) {
	var users []models.User
	now := time.Now()

	err := s.DB.Where("password_expires_at IS NOT NULL").
		Where("password_expires_at < ?", now).
		Where("must_change_password = ?", false). // Don't include users already flagged
		Find(&users).Error

	return users, err
}

// MarkExpiredPasswordsForChange marks all expired passwords with must_change_password flag
func (s *PasswordHistoryService) MarkExpiredPasswordsForChange() (int64, error) {
	now := time.Now()

	result := s.DB.Model(&models.User{}).
		Where("password_expires_at IS NOT NULL").
		Where("password_expires_at < ?", now).
		Where("must_change_password = ?", false).
		Update("must_change_password", true)

	if result.Error != nil {
		return 0, fmt.Errorf("failed to mark expired passwords: %w", result.Error)
	}

	return result.RowsAffected, nil
}

// UpdatePasswordExpiration updates the password expiration date for a user
func (s *PasswordHistoryService) UpdatePasswordExpiration(userID int, expiryDays int) error {
	now := time.Now()
	expiresAt := now.Add(time.Duration(expiryDays) * 24 * time.Hour)

	return s.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"password_changed_at":  now,
			"password_expires_at":  expiresAt,
			"password_expiry_days": expiryDays,
			"must_change_password": false,
		}).Error
}

// GetPasswordHistoryStats returns statistics about password history
func (s *PasswordHistoryService) GetPasswordHistoryStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total password changes
	var totalChanges int64
	s.DB.Model(&models.PasswordHistory{}).Count(&totalChanges)
	stats["total_password_changes"] = totalChanges

	// Changes by reason
	var changesByReason []struct {
		ChangeReason string
		Count        int64
	}
	s.DB.Model(&models.PasswordHistory{}).
		Select("change_reason, COUNT(*) as count").
		Group("change_reason").
		Scan(&changesByReason)
	stats["changes_by_reason"] = changesByReason

	// Users with expired passwords
	var expiredCount int64
	now := time.Now()
	s.DB.Model(&models.User{}).
		Where("password_expires_at IS NOT NULL").
		Where("password_expires_at < ?", now).
		Count(&expiredCount)
	stats["users_with_expired_passwords"] = expiredCount

	// Users with expiring passwords (within 7 days)
	var expiringCount int64
	futureDate := now.Add(7 * 24 * time.Hour)
	s.DB.Model(&models.User{}).
		Where("password_expires_at IS NOT NULL").
		Where("password_expires_at BETWEEN ? AND ?", now, futureDate).
		Count(&expiringCount)
	stats["users_with_expiring_passwords"] = expiringCount

	// Users forced to change password
	var mustChangeCount int64
	s.DB.Model(&models.User{}).
		Where("must_change_password = ?", true).
		Count(&mustChangeCount)
	stats["users_must_change_password"] = mustChangeCount

	return stats, nil
}

// ==============================================================================
// Repository Integration Functions (for use with UserRepository)
// ==============================================================================

// RecordPasswordChange records a password change in history and updates user record
// This is typically called after a successful password change
func (s *PasswordHistoryService) RecordPasswordChange(
	tx *gorm.DB,
	userID int,
	newPasswordHash string,
	changeReason string,
	metadata map[string]interface{},
) error {
	// Use transaction if provided, otherwise use default DB
	db := s.DB
	if tx != nil {
		db = tx
	}

	// Add to password history
	history := &models.PasswordHistory{
		UserID:       userID,
		PasswordHash: newPasswordHash,
		ChangeReason: changeReason,
		CreatedAt:    time.Now(),
	}

	// Add metadata if provided
	if metadata != nil {
		if ip, ok := metadata["ip_address"].(string); ok {
			history.IPAddress = ip
		}
		if ua, ok := metadata["user_agent"].(string); ok {
			history.UserAgent = ua
		}
		if createdBy, ok := metadata["created_by"].(int); ok {
			history.CreatedBy = &createdBy
		}
	}

	if err := db.Create(history).Error; err != nil {
		return fmt.Errorf("failed to create password history: %w", err)
	}

	// Update user's password expiration fields (trigger will handle this, but we can be explicit)
	// The database trigger update_password_expiry() will automatically update these fields
	// when password_hash changes, but we can also update them here for clarity

	return nil
}

// ValidatePasswordChange validates a password change against history and policy
func (s *PasswordHistoryService) ValidatePasswordChange(
	userID int,
	newPassword string,
	config PasswordHistoryConfig,
) error {
	// Check password history
	inHistory, err := s.CheckPasswordHistory(userID, newPassword, config)
	if err != nil {
		return fmt.Errorf("failed to check password history: %w", err)
	}

	if inHistory {
		return fmt.Errorf("password has been used recently and cannot be reused. Please choose a different password")
	}

	// Additional validation can be added here:
	// - Check minimum password age
	// - Check password complexity requirements
	// - etc.

	return nil
}
