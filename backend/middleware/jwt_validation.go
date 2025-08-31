package middleware

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents JWT claims
type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// ValidateToken validates a JWT token and returns claims
func ValidateToken(tokenString string) (*Claims, error) {
	// Get JWT secret from environment or use default
	jwtSecret := []byte("your-secret-key") // TODO: Get from config

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// ExtractTokenFromHeader extracts token from Authorization header
func ExtractTokenFromHeader(authHeader string) string {
	if len(authHeader) > 7 && strings.ToUpper(authHeader[:7]) == "BEARER " {
		return authHeader[7:]
	}
	return ""
}
