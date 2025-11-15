package config

import (
	"ai-project-backend/utils"
	"os"
	"strconv"
)

// PasswordConfig holds password policy configuration
type PasswordConfig struct {
	Policy               utils.PasswordPolicy
	HistoryCount         int // Number of previous passwords to remember
	ExpiryDays           int // Password expiration in days (0 = never)
	ResetTokenExpiryMins int // Password reset token expiry in minutes
	MaxResetAttempts     int // Maximum reset attempts within cooldown period
	ResetCooldownMins    int // Cooldown period for reset attempts
}

// LoadPasswordConfig loads password configuration from environment variables
func LoadPasswordConfig() *PasswordConfig {
	cfg := &PasswordConfig{
		Policy:               utils.DefaultPasswordPolicy(),
		HistoryCount:         getEnvAsInt("PASSWORD_HISTORY_COUNT", 5),
		ExpiryDays:           getEnvAsInt("PASSWORD_EXPIRY_DAYS", 90),
		ResetTokenExpiryMins: getEnvAsInt("RESET_TOKEN_EXPIRY_MINUTES", 15),
		MaxResetAttempts:     getEnvAsInt("RESET_MAX_ATTEMPTS", 3),
		ResetCooldownMins:    getEnvAsInt("RESET_COOLDOWN_MINUTES", 5),
	}

	// Override policy with environment variables
	if minLength := getEnvAsInt("PASSWORD_MIN_LENGTH", 0); minLength > 0 {
		cfg.Policy.MinLength = minLength
	}

	cfg.Policy.RequireUppercase = getEnvAsBool("PASSWORD_REQUIRE_UPPERCASE", true)
	cfg.Policy.RequireLowercase = getEnvAsBool("PASSWORD_REQUIRE_LOWERCASE", true)
	cfg.Policy.RequireNumber = getEnvAsBool("PASSWORD_REQUIRE_NUMBER", true)
	cfg.Policy.RequireSpecial = getEnvAsBool("PASSWORD_REQUIRE_SPECIAL", true)

	if maxRepeating := getEnvAsInt("PASSWORD_MAX_REPEATING", 0); maxRepeating > 0 {
		cfg.Policy.MaxRepeating = maxRepeating
	}

	return cfg
}

// getEnvAsInt retrieves an environment variable as int, returns defaultVal if not set or invalid
func getEnvAsInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}

	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}

	return val
}

// getEnvAsBool retrieves an environment variable as bool, returns defaultVal if not set or invalid
func getEnvAsBool(key string, defaultVal bool) bool {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}

	val, err := strconv.ParseBool(valStr)
	if err != nil {
		return defaultVal
	}

	return val
}

// GetDefaultPasswordConfig returns the default password configuration
func GetDefaultPasswordConfig() *PasswordConfig {
	return &PasswordConfig{
		Policy: utils.PasswordPolicy{
			MinLength:        8,
			RequireUppercase: true,
			RequireLowercase: true,
			RequireNumber:    true,
			RequireSpecial:   true,
			MaxRepeating:     3,
		},
		HistoryCount:         5,
		ExpiryDays:           90,
		ResetTokenExpiryMins: 15,
		MaxResetAttempts:     3,
		ResetCooldownMins:    5,
	}
}
