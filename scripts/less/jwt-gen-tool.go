package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID       int    `json:"user_id"`
	Username     string `json:"username"`
	Role         string `json:"role"`
	UserType     string `json:"user_type"`
	EnterpriseID int    `json:"enterprise_id,omitempty"`
	jwt.RegisteredClaims
}

func generateJTI() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func main() {
	if len(os.Args) < 7 {
		fmt.Fprintln(os.Stderr, "Usage: program secret userID username role userType expirationHours [enterpriseID]")
		os.Exit(1)
	}

	secret := os.Args[1]
	userID, _ := strconv.Atoi(os.Args[2])
	username := os.Args[3]
	role := os.Args[4]
	userType := os.Args[5]
	expirationHours, _ := strconv.Atoi(os.Args[6])

	// Optional enterprise_id for enterprise users
	enterpriseID := 0
	if len(os.Args) > 7 {
		enterpriseID, _ = strconv.Atoi(os.Args[7])
	}

	jti, err := generateJTI()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error generating JTI: %v\n", err)
		os.Exit(1)
	}

	now := time.Now()
	claims := &JWTClaims{
		UserID:       userID,
		Username:     username,
		Role:         role,
		UserType:     userType,
		EnterpriseID: enterpriseID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   username,
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(expirationHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error signing token: %v\n", err)
		os.Exit(1)
	}

	// 输出JSON格式的结果
	result := map[string]interface{}{
		"token":      tokenString,
		"expires_at": claims.ExpiresAt.Time.Format(time.RFC3339),
		"user_id":    userID,
		"username":   username,
		"role":       role,
		"user_type":  userType,
	}
	if enterpriseID > 0 {
		result["enterprise_id"] = enterpriseID
	}

	jsonOutput, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(jsonOutput))
}
