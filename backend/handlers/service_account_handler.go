package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// ServiceAccountHandler handles service account operations
type ServiceAccountHandler struct {
	db           database.DB
	tokenService *services.JWTTokenService
}

// NewServiceAccountHandler creates a new service account handler
func NewServiceAccountHandler(db database.DB, tokenService *services.JWTTokenService) *ServiceAccountHandler {
	return &ServiceAccountHandler{
		db:           db,
		tokenService: tokenService,
	}
}

// GenerateServiceTokenRequest represents the request to generate service token
type GenerateServiceTokenRequest struct {
	Username string `json:"username" binding:"required"`
	APIKey   string `json:"api_key" binding:"required"`
}

// GenerateServiceTokenResponse represents the service token response
type GenerateServiceTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	User         struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Role     string `json:"role"`
		UserType string `json:"user_type"`
	} `json:"user"`
}

// GenerateServiceToken godoc
// @Summary		Generate service account token
// @Description	Generate JWT token pair for service account using API Key
// @Tags			ServiceAccount
// @Accept			json
// @Produce		json
// @Param			request	body		GenerateServiceTokenRequest	true	"API Key credentials"
// @Success		200		{object}	models.APIResponse{data=GenerateServiceTokenResponse}	"Token generated successfully"
// @Failure		400		{object}	models.ErrorResponse	"Bad request"
// @Failure		401		{object}	models.ErrorResponse	"Unauthorized"
// @Failure		500		{object}	models.ErrorResponse	"Internal server error"
// @Router			/auth/service-token [post]
func (h *ServiceAccountHandler) GenerateServiceToken(c *gin.Context) {
	var req GenerateServiceTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("BAD_REQUEST", "请求数据格式错误", nil))
		return
	}

	// 验证API Key
	if !h.validateAPIKey(req.APIKey, req.Username) {
		log.Printf("[SERVICE_ACCOUNT] Invalid API key for user: %s", req.Username)
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("UNAUTHORIZED", "无效的API Key", nil))
		return
	}

	// 获取服务账号用户
	user, err := h.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		log.Printf("[SERVICE_ACCOUNT] Service account not found: %s, error: %v", req.Username, err)
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("UNAUTHORIZED", "服务账号不存在", nil))
		return
	}

	// 验证是系统服务账号
	if user.UserType != "system" {
		log.Printf("[SERVICE_ACCOUNT] User is not a service account: %s (type: %s)", req.Username, user.UserType)
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("UNAUTHORIZED", "非服务账号", nil))
		return
	}

	// 生成长效Token Pair（使用更长的有效期）
	// 服务账号通常不需要enterprise信息，传nil
	tokenPair, err := h.tokenService.GenerateTokenPair(
		user.ID,
		user.Username,
		user.Role,
		"",  // service account暂无RBAC v2角色
		user.UserType,
		nil, // service account没有enterprise_user_id
		nil, // service account没有enterprise_id
	)
	if err != nil {
		log.Printf("[SERVICE_ACCOUNT] Failed to generate token pair: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "生成Token失败", nil))
		return
	}

	// 构造响应
	response := GenerateServiceTokenResponse{
		AccessToken:  tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		TokenType:    tokenPair.TokenType,
		ExpiresIn:    tokenPair.ExpiresIn,
	}
	response.User.ID = user.ID
	response.User.Username = user.Username
	response.User.Email = user.Email
	response.User.Role = user.Role
	response.User.UserType = user.UserType

	log.Printf("[SERVICE_ACCOUNT] Service token generated successfully for: %s (user_id: %d)", user.Username, user.ID)

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "服务Token生成成功"))
}

// validateAPIKey validates the API key for the given username
func (h *ServiceAccountHandler) validateAPIKey(apiKey, username string) bool {
	// 从环境变量或数据库验证API Key
	// 优先从环境变量读取（用于开发和测试）
	envKey := os.Getenv("MCP_SERVICE_API_KEY")
	if envKey != "" && apiKey == envKey {
		log.Printf("[SERVICE_ACCOUNT] API Key validated from environment variable")
		return true
	}

	// 从数据库验证（生产环境）
	return h.validateAPIKeyFromDatabase(apiKey, username)
}

// validateAPIKeyFromDatabase validates API key from database
func (h *ServiceAccountHandler) validateAPIKeyFromDatabase(apiKey, username string) bool {
	// 计算API Key的哈希值
	hash := sha256.Sum256([]byte(apiKey))
	apiKeyHash := hex.EncodeToString(hash[:])

	// 查询数据库验证
	var count int
	query := `
		SELECT COUNT(*)
		FROM service_api_keys sak
		JOIN users u ON sak.user_id = u.id
		WHERE u.username = $1
		  AND sak.api_key_hash = $2
		  AND sak.is_active = TRUE
		  AND (sak.expires_at IS NULL OR sak.expires_at > NOW())
	`

	err := h.db.QueryRow(query, username, apiKeyHash).Scan(&count)
	if err != nil {
		log.Printf("[SERVICE_ACCOUNT] Database API key validation error: %v", err)
		return false
	}

	if count > 0 {
		// 更新最后使用时间
		updateQuery := `
			UPDATE service_api_keys
			SET last_used_at = NOW()
			WHERE api_key_hash = $1
		`
		_, _ = h.db.Exec(updateQuery, apiKeyHash)

		log.Printf("[SERVICE_ACCOUNT] API Key validated from database for user: %s", username)
		return true
	}

	return false
}

// CreateAPIKey godoc
// @Summary		Create API key for service account
// @Description	Create a new API key for service account (admin only)
// @Tags			ServiceAccount
// @Accept			json
// @Produce		json
// @Param			request	body		models.APIKeyCreateRequest	true	"API Key creation request"
// @Success		200		{object}	models.APIResponse{data=models.APIKeyCreateResponse}	"API Key created successfully"
// @Failure		400		{object}	models.ErrorResponse	"Bad request"
// @Failure		401		{object}	models.ErrorResponse	"Unauthorized"
// @Failure		500		{object}	models.ErrorResponse	"Internal server error"
// @Router			/auth/service-api-key [post]
func (h *ServiceAccountHandler) CreateAPIKey(c *gin.Context) {
	// TODO: 添加管理员权限检查

	var req struct {
		Username    string `json:"username" binding:"required"`
		Description string `json:"description"`
		ExpiresIn   int    `json:"expires_in_days"` // 0 = 永不过期
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("BAD_REQUEST", "请求数据格式错误", nil))
		return
	}

	// 获取用户
	user, err := h.db.Users().GetByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("NOT_FOUND", "用户不存在", nil))
		return
	}

	// 生成API Key
	apiKey, err := generateAPIKey()
	if err != nil {
		log.Printf("[SERVICE_ACCOUNT] Failed to generate API key: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "生成API Key失败", nil))
		return
	}

	// 计算哈希值
	hash := sha256.Sum256([]byte(apiKey))
	apiKeyHash := hex.EncodeToString(hash[:])

	// API Key前缀（用于识别）
	apiKeyPrefix := apiKey[:12]

	// 计算过期时间
	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		expires := time.Now().AddDate(0, 0, req.ExpiresIn)
		expiresAt = &expires
	}

	// 插入数据库
	insertQuery := `
		INSERT INTO service_api_keys (
			user_id, api_key_hash, api_key_prefix, description,
			expires_at, is_active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
		RETURNING id
	`

	var apiKeyID int
	err = h.db.QueryRow(
		insertQuery,
		user.ID, apiKeyHash, apiKeyPrefix, req.Description, expiresAt,
	).Scan(&apiKeyID)

	if err != nil {
		log.Printf("[SERVICE_ACCOUNT] Failed to insert API key: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("INTERNAL_ERROR", "保存API Key失败", nil))
		return
	}

	response := map[string]interface{}{
		"id":          apiKeyID,
		"api_key":     apiKey, // 只在创建时返回一次
		"api_key_prefix": apiKeyPrefix,
		"description": req.Description,
		"expires_at":  expiresAt,
		"created_at":  time.Now(),
	}

	log.Printf("[SERVICE_ACCOUNT] API Key created successfully for user: %s (id: %d)", user.Username, apiKeyID)

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "API Key创建成功，请妥善保管，只显示一次"))
}

// generateAPIKey generates a random API key
func generateAPIKey() (string, error) {
	// 生成32字节随机数据
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	// 转换为十六进制字符串
	apiKey := fmt.Sprintf("mcpsk_%s", hex.EncodeToString(randomBytes))
	return apiKey, nil
}
