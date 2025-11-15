package utils

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

// PasswordPolicy defines password complexity requirements
type PasswordPolicy struct {
	MinLength        int  `json:"min_length"`
	RequireUppercase bool `json:"require_uppercase"`
	RequireLowercase bool `json:"require_lowercase"`
	RequireNumber    bool `json:"require_number"`
	RequireSpecial   bool `json:"require_special"`
	MaxRepeating     int  `json:"max_repeating"`
}

// PasswordStrength represents the strength level of a password
type PasswordStrength string

const (
	PasswordStrengthWeak   PasswordStrength = "weak"
	PasswordStrengthFair   PasswordStrength = "fair"
	PasswordStrengthGood   PasswordStrength = "good"
	PasswordStrengthStrong PasswordStrength = "strong"
)

// PasswordValidationResult contains validation results and suggestions
type PasswordValidationResult struct {
	Valid       bool             `json:"valid"`
	Strength    PasswordStrength `json:"strength"`
	Score       int              `json:"score"`
	Errors      []string         `json:"errors,omitempty"`
	Suggestions []string         `json:"suggestions,omitempty"`
}

// DefaultPasswordPolicy returns the default password policy
func DefaultPasswordPolicy() PasswordPolicy {
	return PasswordPolicy{
		MinLength:        8,
		RequireUppercase: true,
		RequireLowercase: true,
		RequireNumber:    true,
		RequireSpecial:   true,
		MaxRepeating:     3,
	}
}

// ValidatePasswordStrength validates a password against a policy
func ValidatePasswordStrength(password string, policy PasswordPolicy) *PasswordValidationResult {
	result := &PasswordValidationResult{
		Valid:       true,
		Errors:      []string{},
		Suggestions: []string{},
		Score:       0,
	}

	// Check minimum length
	if len(password) < policy.MinLength {
		result.Valid = false
		result.Errors = append(result.Errors, fmt.Sprintf("密码长度至少需要%d个字符", policy.MinLength))
	} else {
		result.Score += 20
	}

	// Check for uppercase letters
	hasUpper := false
	for _, c := range password {
		if unicode.IsUpper(c) {
			hasUpper = true
			break
		}
	}
	if policy.RequireUppercase && !hasUpper {
		result.Valid = false
		result.Errors = append(result.Errors, "密码必须包含至少一个大写字母")
	} else if hasUpper {
		result.Score += 15
	}

	// Check for lowercase letters
	hasLower := false
	for _, c := range password {
		if unicode.IsLower(c) {
			hasLower = true
			break
		}
	}
	if policy.RequireLowercase && !hasLower {
		result.Valid = false
		result.Errors = append(result.Errors, "密码必须包含至少一个小写字母")
	} else if hasLower {
		result.Score += 15
	}

	// Check for numbers
	hasNumber := false
	for _, c := range password {
		if unicode.IsNumber(c) {
			hasNumber = true
			break
		}
	}
	if policy.RequireNumber && !hasNumber {
		result.Valid = false
		result.Errors = append(result.Errors, "密码必须包含至少一个数字")
	} else if hasNumber {
		result.Score += 15
	}

	// Check for special characters
	specialChars := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` + "`" + `]`)
	hasSpecial := specialChars.MatchString(password)
	if policy.RequireSpecial && !hasSpecial {
		result.Valid = false
		result.Errors = append(result.Errors, "密码必须包含至少一个特殊字符 (!@#$%^&*等)")
	} else if hasSpecial {
		result.Score += 15
	}

	// Check for repeating characters
	if policy.MaxRepeating > 0 {
		if hasRepeatingChars(password, policy.MaxRepeating) {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("密码不能包含超过%d个重复字符", policy.MaxRepeating))
		} else {
			result.Score += 10
		}
	}

	// Additional scoring for length
	if len(password) >= 12 {
		result.Score += 10
	}
	if len(password) >= 16 {
		result.Score += 10
	}

	// Calculate strength based on score
	result.Strength = calculateStrength(result.Score)

	// Generate suggestions if password is not strong
	if result.Strength != PasswordStrengthStrong {
		result.Suggestions = generateSuggestions(password, policy)
	}

	return result
}

// hasRepeatingChars checks if password has more than maxRepeating consecutive identical characters
func hasRepeatingChars(password string, maxRepeating int) bool {
	if len(password) == 0 || maxRepeating <= 0 {
		return false
	}

	count := 1
	for i := 1; i < len(password); i++ {
		if password[i] == password[i-1] {
			count++
			if count > maxRepeating {
				return true
			}
		} else {
			count = 1
		}
	}
	return false
}

// calculateStrength calculates password strength based on score
func calculateStrength(score int) PasswordStrength {
	switch {
	case score >= 80:
		return PasswordStrengthStrong
	case score >= 60:
		return PasswordStrengthGood
	case score >= 40:
		return PasswordStrengthFair
	default:
		return PasswordStrengthWeak
	}
}

// generateSuggestions generates helpful suggestions to improve password strength
func generateSuggestions(password string, policy PasswordPolicy) []string {
	suggestions := []string{}

	if len(password) < policy.MinLength {
		suggestions = append(suggestions, fmt.Sprintf("增加密码长度至%d个字符或更多", policy.MinLength))
	}

	hasUpper := false
	hasLower := false
	hasNumber := false
	for _, c := range password {
		if unicode.IsUpper(c) {
			hasUpper = true
		}
		if unicode.IsLower(c) {
			hasLower = true
		}
		if unicode.IsNumber(c) {
			hasNumber = true
		}
	}

	if policy.RequireUppercase && !hasUpper {
		suggestions = append(suggestions, "添加大写字母")
	}
	if policy.RequireLowercase && !hasLower {
		suggestions = append(suggestions, "添加小写字母")
	}
	if policy.RequireNumber && !hasNumber {
		suggestions = append(suggestions, "添加数字")
	}

	specialChars := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` + "`" + `]`)
	if policy.RequireSpecial && !specialChars.MatchString(password) {
		suggestions = append(suggestions, "添加特殊字符 (!@#$%^&*等)")
	}

	if len(password) < 12 {
		suggestions = append(suggestions, "建议使用12个字符或更长的密码以提高安全性")
	}

	return suggestions
}

// IsCommonPassword checks if password is in common password list
func IsCommonPassword(password string) bool {
	// List of most common passwords (top 50)
	commonPasswords := []string{
		"123456", "password", "123456789", "12345678", "12345",
		"1234567", "password1", "123123", "1234567890", "1234",
		"qwerty", "000000", "111111", "abc123", "password123",
		"admin", "welcome", "monkey", "dragon", "master",
		"sunshine", "princess", "letmein", "access", "shadow",
		"michael", "jennifer", "jordan", "superman", "harley",
		"123321", "654321", "test", "qwerty123", "iloveyou",
		"password1234", "admin123", "root", "passw0rd", "password!",
		"qwertyuiop", "asdfghjkl", "zxcvbnm", "1q2w3e4r", "qazwsx",
		"123qwe", "pass", "Pass@123", "Admin@123", "Welcome123",
	}

	lowerPassword := strings.ToLower(password)
	for _, common := range commonPasswords {
		if lowerPassword == strings.ToLower(common) {
			return true
		}
	}
	return false
}

// ValidatePasswordWithCommonCheck validates password and checks against common passwords
func ValidatePasswordWithCommonCheck(password string, policy PasswordPolicy) *PasswordValidationResult {
	result := ValidatePasswordStrength(password, policy)

	// Check for common passwords
	if IsCommonPassword(password) {
		result.Valid = false
		result.Errors = append(result.Errors, "密码过于常见，请选择更安全的密码")
		result.Score = 0
		result.Strength = PasswordStrengthWeak
	}

	return result
}
