package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ai-project-backend/models"
	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMCPAPIKeyService mocks the MCPAPIKeyService for testing
type MockMCPAPIKeyService struct {
	mock.Mock
}

func (m *MockMCPAPIKeyService) ValidateAPIKey(ctx context.Context, apiKey string) (*models.MCPAPIKey, error) {
	args := m.Called(ctx, apiKey)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.MCPAPIKey), args.Error(1)
}

func (m *MockMCPAPIKeyService) UpdateLastUsed(ctx context.Context, id int) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockMCPAPIKeyService) IncrementRequestCount(ctx context.Context, id int, isError bool) error {
	args := m.Called(ctx, id, isError)
	return args.Error(0)
}

func (m *MockMCPAPIKeyService) LogAPIKeyCall(ctx context.Context, log *models.MCPAPIKeyLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

// MCPAPIKeyServiceInterface defines the interface used by middleware
type MCPAPIKeyServiceInterface interface {
	ValidateAPIKey(ctx context.Context, apiKey string) (*models.MCPAPIKey, error)
	UpdateLastUsed(ctx context.Context, id int) error
	IncrementRequestCount(ctx context.Context, id int, isError bool) error
	LogAPIKeyCall(ctx context.Context, log *models.MCPAPIKeyLog) error
}

func setupMCPTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

// ========== Extract API Key Tests ==========

func TestExtractAPIKey_FromXAPIKeyHeader(t *testing.T) {
	config := &MCPAPIKeyAuthConfig{
		APIKeyHeader: "X-API-Key",
	}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-API-Key", "aiproj_pk_test12345678901234567890123456789012")

	apiKey, err := middleware.extractAPIKey(req)

	assert.NoError(t, err)
	assert.Equal(t, "aiproj_pk_test12345678901234567890123456789012", apiKey)
}

func TestExtractAPIKey_FromBearerToken(t *testing.T) {
	config := &MCPAPIKeyAuthConfig{
		AuthorizationHeader: "Authorization",
	}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer aiproj_pk_test12345678901234567890123456789012")

	apiKey, err := middleware.extractAPIKey(req)

	assert.NoError(t, err)
	assert.Equal(t, "aiproj_pk_test12345678901234567890123456789012", apiKey)
}

func TestExtractAPIKey_FromApiKeyAuth(t *testing.T) {
	config := &MCPAPIKeyAuthConfig{
		AuthorizationHeader: "Authorization",
	}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "ApiKey aiproj_pk_test12345678901234567890123456789012")

	apiKey, err := middleware.extractAPIKey(req)

	assert.NoError(t, err)
	assert.Equal(t, "aiproj_pk_test12345678901234567890123456789012", apiKey)
}

func TestExtractAPIKey_FromQueryParam(t *testing.T) {
	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	req := httptest.NewRequest("GET", "/test?api_key=aiproj_pk_test12345678901234567890123456789012", nil)

	apiKey, err := middleware.extractAPIKey(req)

	assert.NoError(t, err)
	assert.Equal(t, "aiproj_pk_test12345678901234567890123456789012", apiKey)
}

func TestExtractAPIKey_NotFound(t *testing.T) {
	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	req := httptest.NewRequest("GET", "/test", nil)

	apiKey, err := middleware.extractAPIKey(req)

	assert.NoError(t, err)
	assert.Empty(t, apiKey)
}

func TestExtractAPIKey_BearerWithNonMCPToken(t *testing.T) {
	// When Bearer token is provided but it's not an MCP API key (doesn't start with aiproj_pk_),
	// it should not be extracted
	config := &MCPAPIKeyAuthConfig{
		AuthorizationHeader: "Authorization",
	}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer some_jwt_token_here")

	apiKey, err := middleware.extractAPIKey(req)

	assert.NoError(t, err)
	assert.Empty(t, apiKey) // Should not extract non-MCP tokens
}

// ========== Config Default Values Tests ==========

func TestNewMCPAPIKeyAuthMiddleware_DefaultValues(t *testing.T) {
	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	assert.Equal(t, "X-API-Key", middleware.config.APIKeyHeader)
	assert.Equal(t, "Authorization", middleware.config.AuthorizationHeader)
	assert.Equal(t, "Invalid or missing API key", middleware.config.UnauthorizedMessage)
	assert.Equal(t, "API key has expired", middleware.config.ExpiredMessage)
	assert.Equal(t, "API key has been revoked", middleware.config.RevokedMessage)
}

func TestNewMCPAPIKeyAuthMiddleware_CustomValues(t *testing.T) {
	config := &MCPAPIKeyAuthConfig{
		APIKeyHeader:        "X-Custom-Key",
		AuthorizationHeader: "X-Auth",
		UnauthorizedMessage: "Custom unauthorized",
		ExpiredMessage:      "Custom expired",
		RevokedMessage:      "Custom revoked",
	}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	assert.Equal(t, "X-Custom-Key", middleware.config.APIKeyHeader)
	assert.Equal(t, "X-Auth", middleware.config.AuthorizationHeader)
	assert.Equal(t, "Custom unauthorized", middleware.config.UnauthorizedMessage)
	assert.Equal(t, "Custom expired", middleware.config.ExpiredMessage)
	assert.Equal(t, "Custom revoked", middleware.config.RevokedMessage)
}

// ========== Error Response Tests ==========

func TestRespondWithError(t *testing.T) {
	router := setupMCPTestRouter()

	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	router.GET("/test", func(c *gin.Context) {
		middleware.respondWithError(c, http.StatusUnauthorized, "Test error message", "test_error_code")
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.Equal(t, "2.0", response["jsonrpc"])
	assert.Nil(t, response["id"])

	errorObj := response["error"].(map[string]interface{})
	assert.Equal(t, float64(-32001), errorObj["code"])
	assert.Equal(t, "Test error message", errorObj["message"])

	data := errorObj["data"].(map[string]interface{})
	assert.Equal(t, "test_error_code", data["error_code"])
}

// ========== Handle Validation Error Tests ==========

func TestHandleValidationError_NotFound(t *testing.T) {
	router := setupMCPTestRouter()

	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	router.GET("/test", func(c *gin.Context) {
		middleware.handleValidationError(c, services.ErrAPIKeyNotFound)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	errorObj := response["error"].(map[string]interface{})
	data := errorObj["data"].(map[string]interface{})
	assert.Equal(t, "invalid_api_key", data["error_code"])
}

func TestHandleValidationError_Revoked(t *testing.T) {
	router := setupMCPTestRouter()

	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	router.GET("/test", func(c *gin.Context) {
		middleware.handleValidationError(c, services.ErrAPIKeyRevoked)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	errorObj := response["error"].(map[string]interface{})
	data := errorObj["data"].(map[string]interface{})
	assert.Equal(t, "revoked_api_key", data["error_code"])
}

func TestHandleValidationError_Expired(t *testing.T) {
	router := setupMCPTestRouter()

	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	router.GET("/test", func(c *gin.Context) {
		middleware.handleValidationError(c, services.ErrAPIKeyExpired)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	errorObj := response["error"].(map[string]interface{})
	data := errorObj["data"].(map[string]interface{})
	assert.Equal(t, "expired_api_key", data["error_code"])
}

func TestHandleValidationError_Inactive(t *testing.T) {
	router := setupMCPTestRouter()

	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	router.GET("/test", func(c *gin.Context) {
		middleware.handleValidationError(c, services.ErrAPIKeyInactive)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)

	errorObj := response["error"].(map[string]interface{})
	data := errorObj["data"].(map[string]interface{})
	assert.Equal(t, "inactive_api_key", data["error_code"])
}

// ========== Set Context Values Tests ==========

func TestSetContextValues_Basic(t *testing.T) {
	router := setupMCPTestRouter()

	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	keyRecord := &models.MCPAPIKey{
		ID:     1,
		KeyID:  "aiproj_pk_test1234",
		UserID: 10,
		User: &models.User{
			ID:       10,
			Username: "testuser",
			Role:     "user",
			UserType: "enterprise",
		},
	}

	var capturedValues map[string]interface{}

	router.GET("/test", func(c *gin.Context) {
		middleware.setContextValues(c, keyRecord, "request-123", time.Now())

		capturedValues = map[string]interface{}{
			"mcp_api_key_id":     c.GetInt("mcp_api_key_id"),
			"mcp_api_key_key_id": c.GetString("mcp_api_key_key_id"),
			"user_id":            c.GetInt("user_id"),
			"auth_type":          c.GetString("auth_type"),
			"username":           c.GetString("username"),
			"user_role":          c.GetString("user_role"),
			"user_type":          c.GetString("user_type"),
		}

		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 1, capturedValues["mcp_api_key_id"])
	assert.Equal(t, "aiproj_pk_test1234", capturedValues["mcp_api_key_key_id"])
	assert.Equal(t, 10, capturedValues["user_id"])
	assert.Equal(t, "mcp_api_key", capturedValues["auth_type"])
	assert.Equal(t, "testuser", capturedValues["username"])
	assert.Equal(t, "user", capturedValues["user_role"])
	assert.Equal(t, "enterprise", capturedValues["user_type"])
}

func TestSetContextValues_WithEnterpriseID(t *testing.T) {
	router := setupMCPTestRouter()

	config := &MCPAPIKeyAuthConfig{}
	middleware := NewMCPAPIKeyAuthMiddleware(config)

	enterpriseID := 100
	keyRecord := &models.MCPAPIKey{
		ID:           1,
		KeyID:        "aiproj_pk_test1234",
		UserID:       10,
		EnterpriseID: &enterpriseID,
	}

	var capturedEnterpriseID int

	router.GET("/test", func(c *gin.Context) {
		middleware.setContextValues(c, keyRecord, "request-123", time.Now())
		capturedEnterpriseID = c.GetInt("enterprise_id")
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 100, capturedEnterpriseID)
}

// ========== Helper Function Tests ==========

func TestGetMCPAPIKeyFromContext_Exists(t *testing.T) {
	router := setupMCPTestRouter()

	keyRecord := &models.MCPAPIKey{
		ID:    1,
		KeyID: "aiproj_pk_test1234",
	}

	var result *models.MCPAPIKey
	var exists bool

	router.GET("/test", func(c *gin.Context) {
		c.Set("mcp_api_key", keyRecord)
		result, exists = GetMCPAPIKeyFromContext(c)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.True(t, exists)
	assert.NotNil(t, result)
	assert.Equal(t, "aiproj_pk_test1234", result.KeyID)
}

func TestGetMCPAPIKeyFromContext_NotExists(t *testing.T) {
	router := setupMCPTestRouter()

	var result *models.MCPAPIKey
	var exists bool

	router.GET("/test", func(c *gin.Context) {
		result, exists = GetMCPAPIKeyFromContext(c)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.False(t, exists)
	assert.Nil(t, result)
}

func TestGetMCPRequestID(t *testing.T) {
	router := setupMCPTestRouter()

	var requestID string

	router.GET("/test", func(c *gin.Context) {
		c.Set("mcp_request_id", "test-request-id-123")
		requestID = GetMCPRequestID(c)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, "test-request-id-123", requestID)
}

func TestIsMCPAPIKeyAuth_True(t *testing.T) {
	router := setupMCPTestRouter()

	var result bool

	router.GET("/test", func(c *gin.Context) {
		c.Set("auth_type", "mcp_api_key")
		result = IsMCPAPIKeyAuth(c)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.True(t, result)
}

func TestIsMCPAPIKeyAuth_False(t *testing.T) {
	router := setupMCPTestRouter()

	var result bool

	router.GET("/test", func(c *gin.Context) {
		c.Set("auth_type", "jwt")
		result = IsMCPAPIKeyAuth(c)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.False(t, result)
}

func TestIsMCPAPIKeyAuth_NoAuthType(t *testing.T) {
	router := setupMCPTestRouter()

	var result bool

	router.GET("/test", func(c *gin.Context) {
		result = IsMCPAPIKeyAuth(c)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.False(t, result)
}

// ========== MCPSetToolName Middleware Tests ==========

func TestMCPSetToolName(t *testing.T) {
	router := setupMCPTestRouter()

	var toolName string

	router.Use(MCPSetToolName("create_task"))
	router.GET("/test", func(c *gin.Context) {
		toolName = c.GetString("mcp_tool_name")
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, "create_task", toolName)
}

// ========== MCPAPIKeyAuth Convenience Function Tests ==========

func TestMCPAPIKeyAuth_CreatesMiddleware(t *testing.T) {
	// Just test that the convenience function creates a valid handler
	handler := MCPAPIKeyAuth(nil, false)
	assert.NotNil(t, handler)
}
