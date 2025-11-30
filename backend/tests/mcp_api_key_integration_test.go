package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMCPAPIKeyIntegration_EndToEndKeyGeneration tests the complete flow:
// 1. Generate API Key
// 2. Hash matches
// 3. Key format is correct
func TestMCPAPIKeyIntegration_EndToEndKeyGeneration(t *testing.T) {
	service := &services.MCPAPIKeyService{}

	// Generate key
	plainKey, keyID, keyHash, err := service.GenerateAPIKey()
	require.NoError(t, err)

	// Verify plain key can be used to compute the same hash
	computedHash := service.HashAPIKey(plainKey)
	assert.Equal(t, keyHash, computedHash, "Hash should match")

	// Verify key ID is a prefix of the plain key
	assert.Contains(t, plainKey, keyID[:len(keyID)-6], "Key ID should be related to plain key")

	// Verify format
	assert.True(t, len(plainKey) > 60, "Plain key should be long enough for security")
	assert.Contains(t, plainKey, "aiproj_pk_", "Key should have correct prefix")
}

// TestMCPAPIKeyIntegration_MiddlewareExtraction tests API key extraction
// from various HTTP header formats
func TestMCPAPIKeyIntegration_MiddlewareExtraction(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testCases := []struct {
		name        string
		setupHeader func(r *http.Request)
		expectedKey string
	}{
		{
			name: "X-API-Key header",
			setupHeader: func(r *http.Request) {
				r.Header.Set("X-API-Key", "aiproj_pk_test123456789012345678901234567890123456789012345678901234")
			},
			expectedKey: "aiproj_pk_test123456789012345678901234567890123456789012345678901234",
		},
		{
			name: "Bearer token",
			setupHeader: func(r *http.Request) {
				r.Header.Set("Authorization", "Bearer aiproj_pk_bearer_key_123456789012345678901234567890123456789")
			},
			expectedKey: "aiproj_pk_bearer_key_123456789012345678901234567890123456789",
		},
		{
			name: "ApiKey scheme",
			setupHeader: func(r *http.Request) {
				r.Header.Set("Authorization", "ApiKey aiproj_pk_apikey_scheme_12345678901234567890123456789012")
			},
			expectedKey: "aiproj_pk_apikey_scheme_12345678901234567890123456789012",
		},
		{
			name: "Query parameter",
			setupHeader: func(r *http.Request) {
				q := r.URL.Query()
				q.Set("api_key", "aiproj_pk_query_param_1234567890123456789012345678901234567")
				r.URL.RawQuery = q.Encode()
			},
			expectedKey: "aiproj_pk_query_param_1234567890123456789012345678901234567",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			config := &middleware.MCPAPIKeyAuthConfig{}
			m := middleware.NewMCPAPIKeyAuthMiddleware(config)

			req := httptest.NewRequest("GET", "/test", nil)
			tc.setupHeader(req)

			key, err := m.ExtractAPIKeyForTest(req)
			assert.NoError(t, err)
			assert.Equal(t, tc.expectedKey, key)
		})
	}
}

// TestMCPAPIKeyIntegration_ErrorResponses tests error response format
func TestMCPAPIKeyIntegration_ErrorResponses(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testCases := []struct {
		name           string
		err            error
		expectedCode   string
		expectedStatus int
	}{
		{
			name:           "Not found error",
			err:            services.ErrAPIKeyNotFound,
			expectedCode:   "invalid_api_key",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "Revoked error",
			err:            services.ErrAPIKeyRevoked,
			expectedCode:   "revoked_api_key",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "Expired error",
			err:            services.ErrAPIKeyExpired,
			expectedCode:   "expired_api_key",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "Inactive error",
			err:            services.ErrAPIKeyInactive,
			expectedCode:   "inactive_api_key",
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			router := gin.New()
			config := &middleware.MCPAPIKeyAuthConfig{}
			m := middleware.NewMCPAPIKeyAuthMiddleware(config)

			router.GET("/test", func(c *gin.Context) {
				m.HandleValidationErrorForTest(c, tc.err)
			})

			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/test", nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)

			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			// Verify JSON-RPC 2.0 format
			assert.Equal(t, "2.0", response["jsonrpc"])

			errorObj, ok := response["error"].(map[string]interface{})
			require.True(t, ok)

			data, ok := errorObj["data"].(map[string]interface{})
			require.True(t, ok)

			assert.Equal(t, tc.expectedCode, data["error_code"])
		})
	}
}

// TestMCPAPIKeyIntegration_ContextValues tests that context values are set correctly
func TestMCPAPIKeyIntegration_ContextValues(t *testing.T) {
	gin.SetMode(gin.TestMode)

	enterpriseID := 100
	keyRecord := &models.MCPAPIKey{
		ID:           1,
		KeyID:        "aiproj_pk_test1234",
		UserID:       10,
		EnterpriseID: &enterpriseID,
		User: &models.User{
			ID:       10,
			Username: "testuser",
			Role:     "developer",
			UserType: "enterprise",
		},
	}

	router := gin.New()
	config := &middleware.MCPAPIKeyAuthConfig{}
	m := middleware.NewMCPAPIKeyAuthMiddleware(config)

	var capturedValues map[string]interface{}

	router.GET("/test", func(c *gin.Context) {
		m.SetContextValuesForTest(c, keyRecord, "request-123", time.Now())

		capturedValues = map[string]interface{}{
			"mcp_api_key_id":     c.GetInt("mcp_api_key_id"),
			"mcp_api_key_key_id": c.GetString("mcp_api_key_key_id"),
			"user_id":            c.GetInt("user_id"),
			"auth_type":          c.GetString("auth_type"),
			"enterprise_id":      c.GetInt("enterprise_id"),
			"username":           c.GetString("username"),
			"user_role":          c.GetString("user_role"),
			"user_type":          c.GetString("user_type"),
		}

		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, 1, capturedValues["mcp_api_key_id"])
	assert.Equal(t, "aiproj_pk_test1234", capturedValues["mcp_api_key_key_id"])
	assert.Equal(t, 10, capturedValues["user_id"])
	assert.Equal(t, "mcp_api_key", capturedValues["auth_type"])
	assert.Equal(t, 100, capturedValues["enterprise_id"])
	assert.Equal(t, "testuser", capturedValues["username"])
	assert.Equal(t, "developer", capturedValues["user_role"])
	assert.Equal(t, "enterprise", capturedValues["user_type"])
}

// TestMCPAPIKeyIntegration_ModelBehavior tests model methods work correctly
func TestMCPAPIKeyIntegration_ModelBehavior(t *testing.T) {
	t.Run("Active key remains active until expiration", func(t *testing.T) {
		futureTime := time.Now().Add(30 * 24 * time.Hour) // 30 days
		key := &models.MCPAPIKey{
			Status:    models.MCPAPIKeyStatusActive,
			ExpiresAt: &futureTime,
		}

		assert.True(t, key.IsActive())
		assert.False(t, key.IsExpired())
	})

	t.Run("Revoked key is never active", func(t *testing.T) {
		futureTime := time.Now().Add(30 * 24 * time.Hour)
		key := &models.MCPAPIKey{
			Status:    models.MCPAPIKeyStatusRevoked,
			ExpiresAt: &futureTime, // Even with future expiration
		}

		assert.False(t, key.IsActive())
		assert.False(t, key.IsExpired()) // Not expired by time
	})

	t.Run("Expired by time becomes inactive", func(t *testing.T) {
		pastTime := time.Now().Add(-1 * time.Hour)
		key := &models.MCPAPIKey{
			Status:    models.MCPAPIKeyStatusActive,
			ExpiresAt: &pastTime,
		}

		assert.False(t, key.IsActive())
		assert.True(t, key.IsExpired())
	})

	t.Run("Key without expiration never expires", func(t *testing.T) {
		key := &models.MCPAPIKey{
			Status:    models.MCPAPIKeyStatusActive,
			ExpiresAt: nil,
		}

		assert.True(t, key.IsActive())
		assert.False(t, key.IsExpired())
	})
}

// TestMCPAPIKeyIntegration_JSONSerialization tests JSON serialization
func TestMCPAPIKeyIntegration_JSONSerialization(t *testing.T) {
	t.Run("Key hash is not exposed in JSON", func(t *testing.T) {
		now := time.Now()
		key := &models.MCPAPIKey{
			ID:        1,
			KeyID:     "aiproj_pk_test1234",
			KeyHash:   "secret_hash_should_not_appear_in_json",
			KeyPrefix: "aiproj_pk_test...",
			UserID:    10,
			Name:      "Test Key",
			Status:    models.MCPAPIKeyStatusActive,
			CreatedAt: now,
			UpdatedAt: now,
		}

		jsonBytes, err := json.Marshal(key)
		require.NoError(t, err)

		jsonStr := string(jsonBytes)
		assert.NotContains(t, jsonStr, "secret_hash_should_not_appear_in_json",
			"Key hash should not be serialized to JSON")
		assert.Contains(t, jsonStr, "aiproj_pk_test1234",
			"Key ID should be in JSON")
	})

	t.Run("Create response includes plain key", func(t *testing.T) {
		now := time.Now()
		response := &models.CreateMCPAPIKeyResponse{
			ID:        1,
			KeyID:     "aiproj_pk_test1234",
			PlainKey:  "aiproj_pk_full_plain_key_here_1234567890",
			Name:      "Test Key",
			CreatedAt: now,
		}

		jsonBytes, err := json.Marshal(response)
		require.NoError(t, err)

		jsonStr := string(jsonBytes)
		assert.Contains(t, jsonStr, "aiproj_pk_full_plain_key_here_1234567890",
			"Plain key should be in create response")
	})
}

// TestMCPAPIKeyIntegration_RequestValidation tests request struct binding
func TestMCPAPIKeyIntegration_RequestValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Create request with valid name", func(t *testing.T) {
		router := gin.New()
		router.POST("/test", func(c *gin.Context) {
			var req models.CreateMCPAPIKeyRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"name": req.Name})
		})

		body := bytes.NewBufferString(`{"name": "My API Key"}`)
		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/test", body)
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Create request without name fails", func(t *testing.T) {
		router := gin.New()
		router.POST("/test", func(c *gin.Context) {
			var req models.CreateMCPAPIKeyRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"name": req.Name})
		})

		body := bytes.NewBufferString(`{}`)
		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/test", body)
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestMCPAPIKeyIntegration_HelperFunctions tests helper functions
func TestMCPAPIKeyIntegration_HelperFunctions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("GetMCPAPIKeyFromContext", func(t *testing.T) {
		router := gin.New()
		router.GET("/test", func(c *gin.Context) {
			key := &models.MCPAPIKey{ID: 123}
			c.Set("mcp_api_key", key)

			retrieved, exists := middleware.GetMCPAPIKeyFromContext(c)
			if exists && retrieved.ID == 123 {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "key not found"})
			}
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("IsMCPAPIKeyAuth", func(t *testing.T) {
		router := gin.New()
		router.GET("/test", func(c *gin.Context) {
			c.Set("auth_type", "mcp_api_key")
			if middleware.IsMCPAPIKeyAuth(c) {
				c.JSON(http.StatusOK, gin.H{"is_mcp": true})
			} else {
				c.JSON(http.StatusOK, gin.H{"is_mcp": false})
			}
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.True(t, response["is_mcp"].(bool))
	})

	t.Run("GetMCPRequestID", func(t *testing.T) {
		router := gin.New()
		router.GET("/test", func(c *gin.Context) {
			c.Set("mcp_request_id", "req-12345")
			requestID := middleware.GetMCPRequestID(c)
			c.JSON(http.StatusOK, gin.H{"request_id": requestID})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "req-12345", response["request_id"])
	})
}
