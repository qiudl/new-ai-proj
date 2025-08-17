package handlers

import (
	"ai-project-backend/config"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	db         database.DB
	logger     *log.Logger
	validator  *validator.Validate
	jwtManager *utils.JWTManager
	config     *config.Config
}

// NewAuthHandler 创建认证处理器
func NewAuthHandler(db database.DB, logger *log.Logger, validator *validator.Validate, jwtManager *utils.JWTManager, config *config.Config) *AuthHandler {
	return &AuthHandler{
		db:         db,
		logger:     logger,
		validator:  validator,
		jwtManager: jwtManager,
		config:     config,
	}
}

// Login 用户登录处理
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get user by username
	user, err := h.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid username or password", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.PasswordHash) {
		response := models.NewErrorResponse(models.ErrCodeAuthentication, "Invalid username or password", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Generate JWT token
	token, err := h.jwtManager.GenerateToken(user.ID, user.Username, user.Role, user.UserType)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate token", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Prepare response
	loginResponse := models.LoginResponse{
		Token: token,
		User:  *user,
	}

	response := models.NewSuccessResponse(loginResponse, "Login successful")
	c.JSON(http.StatusOK, response)
}

// Logout 用户退出处理
func (h *AuthHandler) Logout(c *gin.Context) {
	response := models.NewSuccessResponse(nil, "Logout successful")
	c.JSON(http.StatusOK, response)
}

// GetDevAccounts 获取开发环境账户列表（仅开发环境）
func (h *AuthHandler) GetDevAccounts(c *gin.Context) {
	if !h.config.IsDevelopment() {
		response := models.NewErrorResponse(models.ErrCodeAuthorization, "Only available in development mode", nil)
		c.JSON(http.StatusForbidden, response)
		return
	}

	devAccounts := []gin.H{
		{
			"username":    "admin",
			"password":    "123456",
			"user_type":   "admin",
			"description": "系统管理员账户",
		},
		{
			"username":    "qiudl",
			"password":    "123456",
			"user_type":   "user",
			"description": "普通用户账户 - 开发测试用",
		},
	}

	responseData := gin.H{
		"accounts": devAccounts,
		"note":     "These accounts are only available in development environment",
	}

	response := models.NewSuccessResponse(responseData, "Development accounts retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// DevQuickLogin 开发环境快速登录（仅开发环境）
func (h *AuthHandler) DevQuickLogin(c *gin.Context) {
	if !h.config.IsDevelopment() {
		response := models.NewErrorResponse(models.ErrCodeAuthorization, "Only available in development mode", nil)
		c.JSON(http.StatusForbidden, response)
		return
	}

	var req struct {
		Username string `json:"username" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 检查是否为预定义的开发账户
	var userID int
	var userType string
	var role string
	switch req.Username {
	case "admin":
		userID = 1
		userType = "admin"
		role = "admin"
	case "qiudl":
		userID = 2
		userType = "user"
		role = "user"
	default:
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid development account", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 生成JWT token
	token, err := h.jwtManager.GenerateToken(userID, req.Username, role, userType)
	if err != nil {
		h.logger.Printf("Failed to generate token for dev login: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate token", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	responseData := gin.H{
		"token": token,
		"user": gin.H{
			"id":       userID,
			"username": req.Username,
			"type":     userType,
			"role":     role,
		},
	}

	response := models.NewSuccessResponse(responseData, fmt.Sprintf("Development quick login successful for %s", req.Username))
	c.JSON(http.StatusOK, response)
}