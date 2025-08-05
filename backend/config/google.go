package config

import (
	"fmt"
)

// GoogleConfig Google认证配置
type GoogleConfig struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURL  string `json:"redirect_url"`
	Scopes       string `json:"scopes"`
	ProjectID    string `json:"project_id"`
}

// LoadGoogleConfig 加载Google认证配置
func LoadGoogleConfig() (*GoogleConfig, error) {
	config := &GoogleConfig{
		ClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		ClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback"),
		Scopes:       getEnv("GOOGLE_CALENDAR_SCOPES", "https://www.googleapis.com/auth/calendar"),
		ProjectID:    getEnv("GOOGLE_PROJECT_ID", ""),
	}

	// 验证必需的配置项
	if config.ClientID == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_ID environment variable is required")
	}
	if config.ClientSecret == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_SECRET environment variable is required")
	}
	if config.ProjectID == "" {
		return nil, fmt.Errorf("GOOGLE_PROJECT_ID environment variable is required")
	}

	return config, nil
}

// GetGoogleAuthConfig 获取Google认证配置（用于兼容现有代码）
func GetGoogleAuthConfig() (*GoogleConfig, error) {
	return LoadGoogleConfig()
}

// ValidateGoogleConfig 验证Google配置的完整性
func ValidateGoogleConfig(config *GoogleConfig) error {
	if config == nil {
		return fmt.Errorf("google config is nil")
	}

	requiredFields := map[string]string{
		"ClientID":     config.ClientID,
		"ClientSecret": config.ClientSecret,
		"ProjectID":    config.ProjectID,
		"RedirectURL":  config.RedirectURL,
		"Scopes":       config.Scopes,
	}

	for fieldName, fieldValue := range requiredFields {
		if fieldValue == "" {
			return fmt.Errorf("google config field %s is required but empty", fieldName)
		}
	}

	return nil
}

// IsGoogleConfigured 检查Google集成是否已配置
func IsGoogleConfigured() bool {
	config, err := LoadGoogleConfig()
	if err != nil {
		return false
	}
	
	return ValidateGoogleConfig(config) == nil
}

// GetGoogleRedirectURL 获取Google重定向URL
func GetGoogleRedirectURL() string {
	return getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback")
}

// GetGoogleScopes 获取Google API权限范围
func GetGoogleScopes() []string {
	scopes := getEnv("GOOGLE_CALENDAR_SCOPES", "https://www.googleapis.com/auth/calendar")
	return []string{scopes}
}