package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	Server   ServerConfig   `json:"server"`
	Database DatabaseConfig `json:"database"`
	JWT      JWTConfig      `json:"jwt"`
	App      AppConfig      `json:"app"`
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Host         string        `json:"host"`
	Port         string        `json:"port"`
	ReadTimeout  time.Duration `json:"read_timeout"`
	WriteTimeout time.Duration `json:"write_timeout"`
	IdleTimeout  time.Duration `json:"idle_timeout"`
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host            string        `json:"host"`
	Port            string        `json:"port"`
	User            string        `json:"user"`
	Password        string        `json:"password"`
	Name            string        `json:"name"`
	SSLMode         string        `json:"ssl_mode"`
	MaxOpenConns    int           `json:"max_open_conns"`
	MaxIdleConns    int           `json:"max_idle_conns"`
	ConnMaxLifetime time.Duration `json:"conn_max_lifetime"`
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret     string        `json:"secret"`
	Expiration time.Duration `json:"expiration"`
}

// AppConfig holds application configuration
type AppConfig struct {
	Name           string `json:"name"`
	Version        string `json:"version"`
	Environment    string `json:"environment"`
	LogLevel       string `json:"log_level"`
	MirrorEnabled  bool   `json:"mirror_enabled"`
	MirrorBasePath string `json:"mirror_base_path"`
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Environment-aware .env loading with clear precedence
	// Final precedence: .env -> .env.local -> .env.<env> -> .env.<env>.local (last wins)
	env := os.Getenv("APP_ENV")
	candidates := []string{".env", ".env.local"}
	if env != "" {
		candidates = append(candidates, fmt.Sprintf(".env.%s", env))
		candidates = append(candidates, fmt.Sprintf(".env.%s.local", env))
	}
	for _, f := range candidates {
		if _, err := os.Stat(f); err == nil {
			// Use Load (not Overload) to respect existing environment variables
			// Docker environment variables should take precedence over .env files
			if err := godotenv.Load(f); err == nil {
				log.Printf("Loaded %s", f)
			}
		}
	}

	config := &Config{
		Server: ServerConfig{
			Host:         getEnv("SERVER_HOST", "0.0.0.0"),
			Port:         getEnv("PORT", "8081"),
			ReadTimeout:  getDurationEnv("SERVER_READ_TIMEOUT", 30*time.Second),
			WriteTimeout: getDurationEnv("SERVER_WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:  getDurationEnv("SERVER_IDLE_TIMEOUT", 120*time.Second),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "postgres-master"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", "user"),
			Password:        getEnv("DB_PASSWORD", "password"),
			Name:            getEnv("DB_NAME", "main_db"),
			SSLMode:         getEnv("DB_SSL_MODE", "disable"),
			MaxOpenConns:    getIntEnv("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getIntEnv("DB_MAX_IDLE_CONNS", 25),
			ConnMaxLifetime: getDurationEnv("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "dev-secret-key"),
			Expiration: getDurationEnv("JWT_EXPIRATION", 24*time.Hour),
		},
		App: AppConfig{
			Name:           getEnv("APP_NAME", "AI Context Task System Backend"),
			Version:        getEnv("APP_VERSION", "1.0.0"),
			Environment:    getEnv("APP_ENV", "test"),
			LogLevel:       getEnv("LOG_LEVEL", "debug"),
			MirrorEnabled:  getBoolEnv("DOCS_MIRROR_ENABLED", false),
			MirrorBasePath: getEnv("DOCS_MIRROR_PATH", ""),
		},
	}

	return config, nil
}

// GetDatabaseDSN returns the database connection string
func (c *Config) GetDatabaseDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

// GetServerAddress returns the server address
func (c *Config) GetServerAddress() string {
	return fmt.Sprintf("%s:%s", c.Server.Host, c.Server.Port)
}

// IsProduction returns true if running in production
func (c *Config) IsProduction() bool {
	return c.App.Environment == "production"
}

// IsDevelopment returns true if running in development
func (c *Config) IsDevelopment() bool {
	return c.App.Environment == "development"
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if value == "1" || value == "true" || value == "TRUE" || value == "True" {
			return true
		}
		if value == "0" || value == "false" || value == "FALSE" || value == "False" {
			return false
		}
	}
	return defaultValue
}
