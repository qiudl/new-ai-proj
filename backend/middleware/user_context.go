package middleware

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// UserContext represents minimal auth context extracted from Gin
// This is intentionally minimal; handlers mostly use it as a presence check.
type UserContext struct {
	UserID   *int
	AuthType string // "user", "api_key", or other
}

// GetUserContext extracts user or API key context from Gin. Returns nil if unauthenticated.
func GetUserContext(c *gin.Context) *UserContext {
	// Prefer explicit user_id if set by auth middleware
	if v, ok := c.Get("user_id"); ok {
		var id int
		switch t := v.(type) {
		case int:
			id = t
		case int64:
			id = int(t)
		case string:
			if parsed, err := strconv.Atoi(t); err == nil {
				id = parsed
			}
		}
		return &UserContext{UserID: &id, AuthType: "user"}
	}

	// API key present implies authenticated via API key
	if _, ok := c.Get("api_key"); ok {
		return &UserContext{AuthType: "api_key"}
	}

	// Optional middleware may set auth_type to "none"; treat as unauthenticated
	if v, ok := c.Get("auth_type"); ok {
		if t, ok2 := v.(string); ok2 && t == "none" {
			return nil
		}
	}

	return nil
}
