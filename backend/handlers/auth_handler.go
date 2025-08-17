package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles all authentication-related operations
type AuthHandler struct {
	db        database.DB
	jwtSecret string
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(db database.DB, jwtSecret string) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret}
}

// LoginRequest represents the login request structure
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response structure
type LoginResponse struct {
	Token     string        `json:"token"`
	User      models.User   `json:"user"`
	ExpiresAt time.Time     `json:"expires_at"`
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("BAD_REQUEST", "请求数据格式错误", nil))
		return
	}

	// Get user by username
	user, err := h.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		log.Printf("User not found: %v", err)
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("AUTHENTICATION_ERROR", "用户名或密码错误", nil))
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("Password verification failed: %v", err)
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("AUTHENTICATION_ERROR", "用户名或密码错误", nil))
		return
	}

	// Generate JWT token
	token, expiresAt, err := h.generateJWTToken(user)
	if err != nil {
		log.Printf("Error generating JWT token: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "登录失败", nil))
		return
	}

	response := LoginResponse{
		Token:     token,
		User:      *user,
		ExpiresAt: expiresAt,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "登录成功"))
}

// Logout handles POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// In a stateless JWT system, logout is typically handled client-side
	// by removing the token from storage. However, we can implement
	// server-side token blacklisting if needed in the future.
	
	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "登出成功"))
}

// DevQuickLogin handles POST /api/v1/auth/dev-quick-login (development only)
func (h *AuthHandler) DevQuickLogin(c *gin.Context) {
	// Only allow in development environment
	env := os.Getenv("APP_ENV")
	if env != "development" && env != "dev" {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("NOT_FOUND", "接口不存在", nil))
		return
	}

	var req struct {
		Username string `json:"username" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("BAD_REQUEST", "请求数据格式错误", nil))
		return
	}

	// Get user by username
	user, err := h.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		log.Printf("Dev quick login - user not found: %v", err)
		c.JSON(http.StatusNotFound, models.NewErrorResponse("NOT_FOUND", "用户不存在", nil))
		return
	}

	// Generate JWT token without password verification (development only)
	token, expiresAt, err := h.generateJWTToken(user)
	if err != nil {
		log.Printf("Error generating JWT token for dev login: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "登录失败", nil))
		return
	}

	response := LoginResponse{
		Token:     token,
		User:      *user,
		ExpiresAt: expiresAt,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "开发环境快速登录成功"))
}

// GetDevAccounts handles GET /api/v1/auth/dev-accounts (development only)
func (h *AuthHandler) GetDevAccounts(c *gin.Context) {
	// Only allow in development environment
	env := os.Getenv("APP_ENV")
	if env != "development" && env != "dev" {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("NOT_FOUND", "接口不存在", nil))
		return
	}

	// Return predefined development accounts
	devAccounts := []map[string]interface{}{
		{
			"username":    "admin",
			"display_name": "管理员",
			"role":        "admin",
			"description": "系统管理员账户",
		},
		{
			"username":    "qiudl",
			"display_name": "邱东林",
			"role":        "admin",
			"description": "开发者账户",
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(devAccounts, "获取开发账户列表成功"))
}

// generateJWTToken generates a JWT token for the given user
func (h *AuthHandler) generateJWTToken(user *models.User) (string, time.Time, error) {
	expiresAt := time.Now().Add(168 * time.Hour) // 7 days

	claims := jwt.MapClaims{
		"user_id":   user.ID,
		"username":  user.Username,
		"role":      user.Role,
		"user_type": user.UserType,
		"sub":       user.Username,
		"exp":       expiresAt.Unix(),
		"nbf":       time.Now().Unix(),
		"iat":       time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}