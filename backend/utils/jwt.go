package utils

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the JWT claims
type JWTClaims struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	UserType string `json:"user_type"`
	jwt.RegisteredClaims
}

// JWTManager manages JWT tokens
type JWTManager struct {
	secretKey  string
	expiration time.Duration
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(secretKey string, expiration time.Duration) *JWTManager {
	return &JWTManager{
		secretKey:  secretKey,
		expiration: expiration,
	}
}

// GenerateToken generates a new JWT token
func (m *JWTManager) GenerateToken(userID int, username, role, userType string) (string, error) {
	// Generate a unique JWT ID
	jti, err := generateJTI()
	if err != nil {
		return "", err
	}

	claims := &JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		UserType: userType,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti, // JWT ID
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secretKey))
}

// GenerateTokenWithJTI generates a new JWT token with specified JTI
func (m *JWTManager) GenerateTokenWithJTI(userID int, username, role, userType, jti string) (string, error) {
	claims := &JWTClaims{
		UserID:   userID,
		Username: username,
		Role:     role,
		UserType: userType,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.secretKey))
}

// ValidateToken validates a JWT token and returns the claims
func (m *JWTManager) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(m.secretKey), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// RefreshToken generates a new token with extended expiration
func (m *JWTManager) RefreshToken(tokenString string) (string, error) {
	claims, err := m.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}

	// Generate new token with the same user info but new JTI
	return m.GenerateToken(claims.UserID, claims.Username, claims.Role, claims.UserType)
}

// ExtractTokenInfo extracts basic token information without full validation
func (m *JWTManager) ExtractTokenInfo(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(m.secretKey), nil
	})

	if err != nil {
		// Try to extract claims even if token is invalid/expired
		if errors.Is(err, jwt.ErrTokenExpired) {
			// Token is expired but we can still extract claims
			claims, ok := token.Claims.(*JWTClaims)
			if ok {
				return claims, nil
			}
		}
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}

// generateJTI generates a unique JWT ID
func generateJTI() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
