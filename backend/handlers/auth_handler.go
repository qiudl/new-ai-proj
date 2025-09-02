package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles all authentication-related operations
type AuthHandler struct {
	db           database.DB
	jwtSecret    string
	tokenService *services.JWTTokenService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(db database.DB, jwtSecret string, tokenService *services.JWTTokenService) *AuthHandler {
	if tokenService == nil {
		log.Printf("[CRITICAL] AuthHandler created with nil tokenService!")
	}
	log.Printf("[DEBUG] AuthHandler created with tokenService: %p", tokenService)
	return &AuthHandler{
		db:           db,
		jwtSecret:    jwtSecret,
		tokenService: tokenService,
	}
}

// LoginRequest represents the login request structure
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// JWTLoginResponse represents the JWT login response structure
type JWTLoginResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	TokenType    string      `json:"token_type"`
	ExpiresIn    int64       `json:"expires_in"`
	User         models.User `json:"user"`
}

// Login godoc
// @Summary		User login
// @Description	Authenticate user with username and password
// @Tags			Authentication
// @Accept			json
// @Produce		json
// @Param			request	body		LoginRequest	true	"Login credentials"
// @Success		200		{object}	LoginResponse	"Login successful"
// @Failure		400		{object}	models.ErrorResponse	"Bad request"
// @Failure		401		{object}	models.ErrorResponse	"Unauthorized"
// @Failure		500		{object}	models.ErrorResponse	"Internal server error"
// @Router			/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	log.Println("=== LOGIN HANDLER CALLED ===")
	log.Printf("[DEBUG] Login called, tokenService: %p", h.tokenService)
	if h.tokenService == nil {
		log.Printf("[CRITICAL] tokenService is nil in Login handler!")
	}

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

	// Generate JWT token pair
	tokenPair, err := h.tokenService.GenerateTokenPair(user.ID, user.Username, user.Role, user.UserType)
	if err != nil {
		log.Printf("Error generating JWT token pair: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "登录失败", nil))
		return
	}

	// Debug: Print the actual TokenPair structure
	log.Printf("[DEBUG] TokenPair: AccessToken=%s, RefreshToken=%s, TokenType=%s, ExpiresIn=%d",
		tokenPair.AccessToken, tokenPair.RefreshToken, tokenPair.TokenType, tokenPair.ExpiresIn)

	response := JWTLoginResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		TokenType:    tokenPair.TokenType,
		ExpiresIn:    tokenPair.ExpiresIn,
		User:         *user,
	}

	// Debug: Print the JWTLoginResponse structure
	log.Printf("[DEBUG] JWTLoginResponse: AccessToken=%s, RefreshToken=%s, TokenType=%s, ExpiresIn=%d",
		response.AccessToken, response.RefreshToken, response.TokenType, response.ExpiresIn)

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
	log.Println("=== DEV QUICK LOGIN HANDLER CALLED ===")
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

	// Get user by username；若不存在则在开发环境下自动创建一个内存用户并签发JWT（不强制写库）
	user, err := h.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		log.Printf("[DEV] quick login - user not found, trying to create dev user '%s' in DB", req.Username)
		// 优先尝试通过仓库创建一个开发用户（若表结构不满足，则回退为内存用户JWT）
		devEmail := req.Username + "@dev.local"
		devHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), 12)
		candidate := &models.User{
			Username:     req.Username,
			Email:        devEmail,
			PasswordHash: string(devHash),
			UserType:     "system",
			Role:         "admin",
			Status:       "active",
		}
		if created, cerr := h.db.Users().Create(c.Request.Context(), candidate); cerr == nil {
			user = created
			log.Printf("[DEV] created user '%s' with id=%d for quick login", user.Username, user.ID)
		} else {
			log.Printf("[DEV] failed to create user in DB: %v; issuing in-memory token as fallback", cerr)
			// 构造内存用户（仅用于生成JWT）
			user = &models.User{
				ID:       1,
				Username: req.Username,
				Email:    devEmail,
				Role:     "admin",
				UserType: "system",
				Status:   "active",
			}
		}
	}

	// Generate JWT token pair without password verification (development only)
	tokenPair, err := h.tokenService.GenerateTokenPair(user.ID, user.Username, user.Role, user.UserType)
	if err != nil {
		log.Printf("Error generating JWT token pair for dev login: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "登录失败", nil))
		return
	}

	// Debug: Print the actual TokenPair structure
	log.Printf("[DEBUG] DevLogin TokenPair: AccessToken=%s, RefreshToken=%s, TokenType=%s, ExpiresIn=%d",
		tokenPair.AccessToken, tokenPair.RefreshToken, tokenPair.TokenType, tokenPair.ExpiresIn)

	response := JWTLoginResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		TokenType:    tokenPair.TokenType,
		ExpiresIn:    tokenPair.ExpiresIn,
		User:         *user,
	}

	// Debug: Print the DevLogin JWTLoginResponse structure
	log.Printf("[DEBUG] DevLogin JWTLoginResponse: AccessToken=%s, RefreshToken=%s, TokenType=%s, ExpiresIn=%d",
		response.AccessToken, response.RefreshToken, response.TokenType, response.ExpiresIn)

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
			"username":     "admin",
			"display_name": "管理员",
			"role":         "admin",
			"description":  "系统管理员账户",
		},
		{
			"username":     "qiudl",
			"display_name": "邱东林",
			"role":         "admin",
			"description":  "开发者账户",
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(devAccounts, "获取开发账户列表成功"))
}
