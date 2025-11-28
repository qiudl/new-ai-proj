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
	AccessToken        string      `json:"access_token"`
	RefreshToken       string      `json:"refresh_token"`
	TokenType          string      `json:"token_type"`
	ExpiresIn          int64       `json:"expires_in"`
	User               models.User `json:"user"`
	IsEnterpriseAdmin  bool        `json:"is_enterprise_admin"`  // 是否为企业管理员
}

// Login godoc
// @Summary		User login
// @Description	Authenticate user with username and password
// @Tags			Authentication
// @Accept			json
// @Produce		json
// @Param			request	body		LoginRequest	true	"Login credentials"
// @Success		200		{object}	models.APIResponse{data=JWTLoginResponse}	"Login successful"
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

	log.Printf("[DEBUG] Login: Found user %s, ID=%d, UserType=%s, HasPasswordHash=%v, PasswordHashLen=%d",
		user.Username, user.ID, user.UserType, user.PasswordHash != "", len(user.PasswordHash))

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("Password verification failed for user %s: %v", user.Username, err)
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("AUTHENTICATION_ERROR", "用户名或密码错误", nil))
		return
	}

	// Query enterprise info for enterprise users
	var enterpriseUserID *int
	var enterpriseID *int
	if user.UserType == "enterprise" {
		var euID, eID int
		query := `
			SELECT eu.id, eu.enterprise_id
			FROM enterprise_users eu
			WHERE eu.user_id = $1 AND eu.deleted_at IS NULL
			LIMIT 1
		`
		err := h.db.QueryRow(query, user.ID).Scan(&euID, &eID)
		if err != nil {
			// ❌ P0 Security Fix: Reject login if enterprise_id cannot be determined
			log.Printf("[ERROR] Login: Enterprise user %d (%s) has no enterprise record: %v", user.ID, user.Username, err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				"ENTERPRISE_DATA_MISSING",
				"企业用户数据不完整，无法登录",
				map[string]interface{}{
					"user_id":   user.ID,
					"user_type": user.UserType,
					"error":     "enterprise_users record not found",
				},
			))
			return
		}
		enterpriseUserID = &euID
		enterpriseID = &eID
		log.Printf("[DEBUG] User %d (%s) enterprise_user_id=%d, enterprise_id=%d",
			user.ID, user.Username, euID, eID)
	}

	// ✅ P0 Security Fix: Double-check enterprise users have enterprise_id before generating token
	if user.UserType == "enterprise" && enterpriseID == nil {
		log.Printf("[ERROR] Login: Enterprise user %d (%s) missing enterprise_id after query", user.ID, user.Username)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"MISSING_ENTERPRISE_ID",
			"无法生成token：缺少企业ID",
			map[string]interface{}{
				"user_id":   user.ID,
				"user_type": user.UserType,
			},
		))
		return
	}

	// Query RBAC v2 role for the user
	var roleV2 string
	if user.UserType == "system" {
		// System users: query from system_roles
		roleQuery := `
			SELECT sr.code
			FROM system_roles sr
			JOIN user_system_roles usr ON sr.id = usr.role_id
			WHERE usr.user_id = $1 AND sr.deleted_at IS NULL AND usr.deleted_at IS NULL
			LIMIT 1
		`
		err := h.db.QueryRow(roleQuery, user.ID).Scan(&roleV2)
		if err != nil {
			log.Printf("[WARN] Failed to query RBAC v2 role for system user %d: %v (using empty role_v2)", user.ID, err)
			roleV2 = "" // 如果查询失败，使用空字符串，不阻断登录
		} else {
			log.Printf("[DEBUG] System user %d (%s) RBAC v2 role: %s", user.ID, user.Username, roleV2)
		}
	} else if user.UserType == "enterprise" && enterpriseUserID != nil {
		// Enterprise users: query from enterprise_roles
		roleQuery := `
			SELECT er.code
			FROM enterprise_roles er
			JOIN enterprise_users eu ON er.id = eu.role_id
			WHERE eu.user_id = $1 AND er.deleted_at IS NULL AND eu.deleted_at IS NULL
			LIMIT 1
		`
		err := h.db.QueryRow(roleQuery, user.ID).Scan(&roleV2)
		if err != nil {
			log.Printf("[WARN] Failed to query RBAC v2 role for enterprise user %d: %v (using empty role_v2)", user.ID, err)
			roleV2 = "" // 如果查询失败，使用空字符串，不阻断登录
		} else {
			log.Printf("[DEBUG] Enterprise user %d (%s) RBAC v2 role: %s", user.ID, user.Username, roleV2)
		}
	}

	// Generate JWT token pair with RBAC v2 role
	tokenPair, err := h.tokenService.GenerateTokenPair(user.ID, user.Username, user.Role, roleV2, user.UserType, enterpriseUserID, enterpriseID)
	if err != nil {
		log.Printf("Error generating JWT token pair: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "登录失败", nil))
		return
	}

	// Debug: Print the actual TokenPair structure
	log.Printf("[DEBUG] TokenPair: AccessToken=%s, RefreshToken=%s, TokenType=%s, ExpiresIn=%d",
		tokenPair.AccessToken, tokenPair.RefreshToken, tokenPair.TokenType, tokenPair.ExpiresIn)

	// Check if user is enterprise admin (P0 fix: frontend permission display)
	isEnterpriseAdmin := false
	var adminCheckErr error
	query := `SELECT is_enterprise_admin($1)`
	adminCheckErr = h.db.QueryRow(query, user.ID).Scan(&isEnterpriseAdmin)
	if adminCheckErr != nil {
		log.Printf("[WARN] Failed to check enterprise admin status for user %d: %v", user.ID, adminCheckErr)
		// 不阻断登录流程，默认为false
		isEnterpriseAdmin = false
	}
	log.Printf("[DEBUG] User %d (%s) is_enterprise_admin: %v", user.ID, user.Username, isEnterpriseAdmin)

	response := JWTLoginResponse{
		AccessToken:       tokenPair.AccessToken,
		RefreshToken:      tokenPair.RefreshToken,
		TokenType:         tokenPair.TokenType,
		ExpiresIn:         tokenPair.ExpiresIn,
		User:              *user,
		IsEnterpriseAdmin: isEnterpriseAdmin,
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

// RefreshTokenRequest represents the refresh token request structure
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken godoc
// @Summary		Refresh access token
// @Description	Refresh access token using refresh token
// @Tags			Authentication
// @Accept			json
// @Produce		json
// @Param			request	body		RefreshTokenRequest	true	"Refresh token"
// @Success		200		{object}	models.APIResponse{data=JWTLoginResponse}	"Token refreshed successfully"
// @Failure		400		{object}	models.ErrorResponse	"Bad request"
// @Failure		401		{object}	models.ErrorResponse	"Unauthorized"
// @Failure		500		{object}	models.ErrorResponse	"Internal server error"
// @Router			/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	log.Println("=== REFRESH TOKEN HANDLER CALLED ===")

	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("BAD_REQUEST", "请求数据格式错误", nil))
		return
	}

	// Use token service to refresh tokens
	tokenPair, err := h.tokenService.RefreshTokens(req.RefreshToken)
	if err != nil {
		log.Printf("Error refreshing tokens: %v", err)
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("INVALID_REFRESH_TOKEN", "刷新令牌无效或已过期", nil))
		return
	}

	// Note: The refresh response doesn't include user details
	// If you need user details, you would need to query the database
	// using the user_id from the refresh token claims
	response := JWTLoginResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		TokenType:    tokenPair.TokenType,
		ExpiresIn:    tokenPair.ExpiresIn,
	}

	log.Printf("[DEBUG] Token refreshed successfully, new access token generated")
	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "令牌刷新成功"))
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

	// Query enterprise info for enterprise users
	var enterpriseUserID *int
	var enterpriseID *int
	if user.UserType == "enterprise" {
		var euID, eID int
		query := `
			SELECT eu.id, eu.enterprise_id
			FROM enterprise_users eu
			WHERE eu.user_id = $1 AND eu.deleted_at IS NULL
			LIMIT 1
		`
		err := h.db.QueryRow(query, user.ID).Scan(&euID, &eID)
		if err != nil {
			// ❌ P0 Security Fix: Reject login if enterprise_id cannot be determined
			log.Printf("[ERROR] DevLogin: Enterprise user %d (%s) has no enterprise record: %v", user.ID, user.Username, err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
				"ENTERPRISE_DATA_MISSING",
				"企业用户数据不完整，无法登录",
				map[string]interface{}{
					"user_id":   user.ID,
					"user_type": user.UserType,
					"error":     "enterprise_users record not found",
				},
			))
			return
		}
		enterpriseUserID = &euID
		enterpriseID = &eID
		log.Printf("[DEBUG] DevLogin: User %d (%s) enterprise_user_id=%d, enterprise_id=%d",
			user.ID, user.Username, euID, eID)
	}

	// ✅ P0 Security Fix: Double-check enterprise users have enterprise_id before generating token
	if user.UserType == "enterprise" && enterpriseID == nil {
		log.Printf("[ERROR] DevLogin: Enterprise user %d (%s) missing enterprise_id after query", user.ID, user.Username)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"MISSING_ENTERPRISE_ID",
			"无法生成token：缺少企业ID",
			map[string]interface{}{
				"user_id":   user.ID,
				"user_type": user.UserType,
			},
		))
		return
	}

	// Query RBAC v2 role for the user
	var roleV2 string
	if user.UserType == "system" {
		// System users: query from system_roles
		roleQuery := `
			SELECT sr.code
			FROM system_roles sr
			JOIN user_system_roles usr ON sr.id = usr.role_id
			WHERE usr.user_id = $1 AND sr.deleted_at IS NULL AND usr.deleted_at IS NULL
			LIMIT 1
		`
		err := h.db.QueryRow(roleQuery, user.ID).Scan(&roleV2)
		if err != nil {
			log.Printf("[WARN] DevLogin: Failed to query RBAC v2 role for system user %d: %v (using empty role_v2)", user.ID, err)
			roleV2 = "" // 如果查询失败，使用空字符串，不阻断登录
		} else {
			log.Printf("[DEBUG] DevLogin: System user %d (%s) RBAC v2 role: %s", user.ID, user.Username, roleV2)
		}
	} else if user.UserType == "enterprise" && enterpriseUserID != nil {
		// Enterprise users: query from enterprise_roles
		roleQuery := `
			SELECT er.code
			FROM enterprise_roles er
			JOIN enterprise_users eu ON er.id = eu.role_id
			WHERE eu.user_id = $1 AND er.deleted_at IS NULL AND eu.deleted_at IS NULL
			LIMIT 1
		`
		err := h.db.QueryRow(roleQuery, user.ID).Scan(&roleV2)
		if err != nil {
			log.Printf("[WARN] DevLogin: Failed to query RBAC v2 role for enterprise user %d: %v (using empty role_v2)", user.ID, err)
			roleV2 = "" // 如果查询失败，使用空字符串，不阻断登录
		} else {
			log.Printf("[DEBUG] DevLogin: Enterprise user %d (%s) RBAC v2 role: %s", user.ID, user.Username, roleV2)
		}
	}

	// Generate JWT token pair without password verification (development only)
	tokenPair, err := h.tokenService.GenerateTokenPair(user.ID, user.Username, user.Role, roleV2, user.UserType, enterpriseUserID, enterpriseID)
	if err != nil {
		log.Printf("Error generating JWT token pair for dev login: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "登录失败", nil))
		return
	}

	// Debug: Print the actual TokenPair structure
	log.Printf("[DEBUG] DevLogin TokenPair: AccessToken=%s, RefreshToken=%s, TokenType=%s, ExpiresIn=%d",
		tokenPair.AccessToken, tokenPair.RefreshToken, tokenPair.TokenType, tokenPair.ExpiresIn)

	// Check if user is enterprise admin (P0 fix: frontend permission display)
	isEnterpriseAdmin := false
	var adminCheckErr error
	query := `SELECT is_enterprise_admin($1)`
	adminCheckErr = h.db.QueryRow(query, user.ID).Scan(&isEnterpriseAdmin)
	if adminCheckErr != nil {
		log.Printf("[WARN] Failed to check enterprise admin status for dev user %d: %v", user.ID, adminCheckErr)
		// 不阻断登录流程，默认为false
		isEnterpriseAdmin = false
	}
	log.Printf("[DEBUG] Dev User %d (%s) is_enterprise_admin: %v", user.ID, user.Username, isEnterpriseAdmin)

	response := JWTLoginResponse{
		AccessToken:       tokenPair.AccessToken,
		RefreshToken:      tokenPair.RefreshToken,
		TokenType:         tokenPair.TokenType,
		ExpiresIn:         tokenPair.ExpiresIn,
		User:              *user,
		IsEnterpriseAdmin: isEnterpriseAdmin,
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
