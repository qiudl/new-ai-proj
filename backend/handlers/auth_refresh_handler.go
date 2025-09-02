package handlers

import (
	"net/http"
	"strings"

	"ai-project-backend/utils"
	"github.com/gin-gonic/gin"
)

// RefreshTokenHandler handles token refresh requests
func RefreshTokenHandler(jwtManager *utils.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		// Remove "Bearer " prefix
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			return
		}

		// Refresh the token
		newToken, err := jwtManager.RefreshToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to refresh token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":   newToken,
			"message": "Token refreshed successfully",
		})
	}
}
