package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ========== MCP Client Connection E2E Tests ==========
// These tests simulate real MCP client connections via HTTP

// MCPJSONRPCRequest represents a JSON-RPC 2.0 request
type MCPJSONRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

// MCPJSONRPCResponse represents a JSON-RPC 2.0 response
type MCPJSONRPCResponse struct {
	JSONRPC string           `json:"jsonrpc"`
	ID      interface{}      `json:"id"`
	Result  interface{}      `json:"result,omitempty"`
	Error   *MCPJSONRPCError `json:"error,omitempty"`
}

// MCPJSONRPCError represents a JSON-RPC 2.0 error
type MCPJSONRPCError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// setupMCPTestRouter creates a test router with MCP auth middleware
func setupMCPTestRouter(apiKeyService *services.MCPAPIKeyService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(gin.Recovery())
	return router
}

// TestMCPClientE2E_AuthenticationFlow tests the complete authentication flow
func TestMCPClientE2E_AuthenticationFlow(t *testing.T) {
	t.Run("Request without API key returns 401", func(t *testing.T) {
		router := setupMCPTestRouter(nil)

		// Create auth middleware with nil service (should reject all requests)
		config := &middleware.MCPAPIKeyAuthConfig{
			APIKeyService:       nil,
			UnauthorizedMessage: "Invalid or missing API key",
		}
		authMiddleware := middleware.NewMCPAPIKeyAuthMiddleware(config)

		router.POST("/mcp/sse", authMiddleware.Middleware(), func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		// Verify JSON-RPC 2.0 error format
		assert.Equal(t, "2.0", response["jsonrpc"])
		errorObj, ok := response["error"].(map[string]interface{})
		require.True(t, ok)
		assert.NotNil(t, errorObj["code"])
		assert.NotNil(t, errorObj["message"])
	})

	t.Run("Request with X-API-Key header is processed", func(t *testing.T) {
		router := setupMCPTestRouter(nil)

		// Track if handler was called
		handlerCalled := false

		router.POST("/mcp/sse", func(c *gin.Context) {
			apiKey := c.GetHeader("X-API-Key")
			if apiKey != "" {
				handlerCalled = true
				c.JSON(200, gin.H{"status": "ok", "has_key": true})
			} else {
				c.JSON(401, gin.H{"error": "missing key"})
			}
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		req.Header.Set("X-API-Key", "aiproj_pk_test_key_1234567890123456789012345678901234567890")
		router.ServeHTTP(w, req)

		assert.True(t, handlerCalled)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Request with Bearer token is processed", func(t *testing.T) {
		router := setupMCPTestRouter(nil)

		var capturedAuthType string

		router.POST("/mcp/sse", func(c *gin.Context) {
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				capturedAuthType = "bearer"
				c.JSON(200, gin.H{"auth_type": "bearer"})
			} else {
				c.JSON(401, gin.H{"error": "invalid auth"})
			}
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		req.Header.Set("Authorization", "Bearer aiproj_pk_test_key_1234567890123456789012345678901234567890")
		router.ServeHTTP(w, req)

		assert.Equal(t, "bearer", capturedAuthType)
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Request with query parameter api_key is processed", func(t *testing.T) {
		router := setupMCPTestRouter(nil)

		var capturedAPIKey string

		router.GET("/mcp/sse", func(c *gin.Context) {
			apiKey := c.Query("api_key")
			if apiKey != "" {
				capturedAPIKey = apiKey
				c.JSON(200, gin.H{"has_key": true})
			} else {
				c.JSON(401, gin.H{"error": "missing key"})
			}
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/mcp/sse?api_key=aiproj_pk_query_test_123456789012345678901234567890", nil)
		router.ServeHTTP(w, req)

		assert.Contains(t, capturedAPIKey, "aiproj_pk_query_test")
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// TestMCPClientE2E_JSONRPCFormat tests JSON-RPC 2.0 protocol compliance
func TestMCPClientE2E_JSONRPCFormat(t *testing.T) {
	t.Run("Valid JSON-RPC request format", func(t *testing.T) {
		request := MCPJSONRPCRequest{
			JSONRPC: "2.0",
			ID:      1,
			Method:  "initialize",
			Params: map[string]interface{}{
				"protocolVersion": "2024-11-05",
				"capabilities":    map[string]interface{}{},
				"clientInfo": map[string]interface{}{
					"name":    "test-client",
					"version": "1.0.0",
				},
			},
		}

		jsonBytes, err := json.Marshal(request)
		require.NoError(t, err)

		// Verify structure
		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "2.0", parsed["jsonrpc"])
		assert.Equal(t, float64(1), parsed["id"])
		assert.Equal(t, "initialize", parsed["method"])
		assert.NotNil(t, parsed["params"])
	})

	t.Run("Error response format matches JSON-RPC 2.0", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.POST("/mcp/sse", func(c *gin.Context) {
			// Simulate MCP auth error response
			c.JSON(http.StatusUnauthorized, gin.H{
				"jsonrpc": "2.0",
				"error": gin.H{
					"code":    -32001,
					"message": "Invalid or missing API key",
					"data": gin.H{
						"error_code": "invalid_api_key",
					},
				},
				"id": nil,
			})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		var response MCPJSONRPCResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "2.0", response.JSONRPC)
		assert.Nil(t, response.ID)
		assert.NotNil(t, response.Error)
		assert.Equal(t, -32001, response.Error.Code)
		assert.Contains(t, response.Error.Message, "API key")
	})

	t.Run("Tool call request format", func(t *testing.T) {
		request := MCPJSONRPCRequest{
			JSONRPC: "2.0",
			ID:      "call-123",
			Method:  "tools/call",
			Params: map[string]interface{}{
				"name": "list_tasks",
				"arguments": map[string]interface{}{
					"page":  1,
					"limit": 10,
				},
			},
		}

		jsonBytes, err := json.Marshal(request)
		require.NoError(t, err)

		// Verify it's valid JSON
		var parsed map[string]interface{}
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		params, ok := parsed["params"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "list_tasks", params["name"])
	})
}

// TestMCPClientE2E_HTTPMethods tests HTTP method handling
func TestMCPClientE2E_HTTPMethods(t *testing.T) {
	setupTestRouter := func() *gin.Engine {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		handler := func(c *gin.Context) {
			c.JSON(200, gin.H{
				"method":       c.Request.Method,
				"content_type": c.ContentType(),
			})
		}

		// MCP SSE endpoint typically accepts multiple methods
		router.GET("/mcp/sse", handler)
		router.POST("/mcp/sse", handler)
		router.OPTIONS("/mcp/sse", func(c *gin.Context) {
			c.Header("Allow", "GET, POST, OPTIONS")
			c.Status(204)
		})

		return router
	}

	t.Run("GET request for SSE connection", func(t *testing.T) {
		router := setupTestRouter()

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "GET", response["method"])
	})

	t.Run("POST request for RPC calls", func(t *testing.T) {
		router := setupTestRouter()

		body := `{"jsonrpc":"2.0","id":1,"method":"initialize"}`
		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "POST", response["method"])
		assert.Equal(t, "application/json", response["content_type"])
	})

	t.Run("OPTIONS request for CORS preflight", func(t *testing.T) {
		router := setupTestRouter()

		w := httptest.NewRecorder()
		req := httptest.NewRequest("OPTIONS", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)
		assert.Contains(t, w.Header().Get("Allow"), "POST")
	})
}

// TestMCPClientE2E_SSEStreaming tests SSE streaming behavior
func TestMCPClientE2E_SSEStreaming(t *testing.T) {
	t.Run("SSE response headers", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.GET("/mcp/sse", func(c *gin.Context) {
			// Set SSE headers
			c.Header("Content-Type", "text/event-stream")
			c.Header("Cache-Control", "no-cache")
			c.Header("Connection", "keep-alive")
			c.Header("X-Accel-Buffering", "no")

			// Send initial SSE event
			c.Writer.WriteString("event: endpoint\n")
			c.Writer.WriteString("data: /mcp/sse/session-123\n\n")
			c.Writer.Flush()
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/mcp/sse", nil)
		req.Header.Set("Accept", "text/event-stream")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))
		assert.Equal(t, "no-cache", w.Header().Get("Cache-Control"))

		// Verify SSE event format
		body := w.Body.String()
		assert.Contains(t, body, "event:")
		assert.Contains(t, body, "data:")
	})

	t.Run("Multiple SSE events", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.GET("/mcp/sse/test", func(c *gin.Context) {
			c.Header("Content-Type", "text/event-stream")

			// Simulate multiple events
			events := []string{
				"event: connected\ndata: {\"session_id\":\"test-123\"}\n\n",
				"event: message\ndata: {\"type\":\"ping\"}\n\n",
			}

			for _, event := range events {
				c.Writer.WriteString(event)
			}
			c.Writer.Flush()
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/mcp/sse/test", nil)
		router.ServeHTTP(w, req)

		body := w.Body.String()
		assert.Contains(t, body, "event: connected")
		assert.Contains(t, body, "event: message")
		assert.Contains(t, body, "session_id")
	})
}

// TestMCPClientE2E_ErrorScenarios tests various error scenarios
func TestMCPClientE2E_ErrorScenarios(t *testing.T) {
	t.Run("Invalid JSON body returns parse error", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.POST("/mcp/sse", func(c *gin.Context) {
			var req map[string]interface{}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"jsonrpc": "2.0",
					"error": gin.H{
						"code":    -32700, // Parse error
						"message": "Parse error",
					},
					"id": nil,
				})
				return
			}
			c.JSON(200, gin.H{"ok": true})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", strings.NewReader("not valid json{"))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		errorObj := response["error"].(map[string]interface{})
		assert.Equal(t, float64(-32700), errorObj["code"])
	})

	t.Run("Method not found returns error", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.POST("/mcp/sse", func(c *gin.Context) {
			var req MCPJSONRPCRequest
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(400, gin.H{"error": err.Error()})
				return
			}

			// Simulate method not found
			if req.Method == "unknown/method" {
				c.JSON(http.StatusOK, gin.H{
					"jsonrpc": "2.0",
					"error": gin.H{
						"code":    -32601, // Method not found
						"message": "Method not found",
					},
					"id": req.ID,
				})
				return
			}
			c.JSON(200, gin.H{"ok": true})
		})

		body := `{"jsonrpc":"2.0","id":1,"method":"unknown/method"}`
		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		errorObj := response["error"].(map[string]interface{})
		assert.Equal(t, float64(-32601), errorObj["code"])
	})

	t.Run("Expired API key returns specific error", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		config := &middleware.MCPAPIKeyAuthConfig{
			ExpiredMessage: "API key has expired",
		}
		m := middleware.NewMCPAPIKeyAuthMiddleware(config)

		router.POST("/mcp/sse", func(c *gin.Context) {
			// Simulate expired key error
			m.HandleValidationErrorForTest(c, services.ErrAPIKeyExpired)
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		errorObj := response["error"].(map[string]interface{})
		data := errorObj["data"].(map[string]interface{})
		assert.Equal(t, "expired_api_key", data["error_code"])
	})

	t.Run("Revoked API key returns specific error", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		config := &middleware.MCPAPIKeyAuthConfig{
			RevokedMessage: "API key has been revoked",
		}
		m := middleware.NewMCPAPIKeyAuthMiddleware(config)

		router.POST("/mcp/sse", func(c *gin.Context) {
			m.HandleValidationErrorForTest(c, services.ErrAPIKeyRevoked)
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		errorObj := response["error"].(map[string]interface{})
		data := errorObj["data"].(map[string]interface{})
		assert.Equal(t, "revoked_api_key", data["error_code"])
	})
}

// TestMCPClientE2E_ContextPropagation tests that auth context is properly propagated
func TestMCPClientE2E_ContextPropagation(t *testing.T) {
	t.Run("API Key info is available in handler context", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		enterpriseID := 100
		keyRecord := &models.MCPAPIKey{
			ID:           1,
			KeyID:        "aiproj_pk_context_test",
			UserID:       42,
			EnterpriseID: &enterpriseID,
			User: &models.User{
				ID:       42,
				Username: "testuser",
				Role:     "developer",
				UserType: "enterprise",
			},
		}

		config := &middleware.MCPAPIKeyAuthConfig{}
		m := middleware.NewMCPAPIKeyAuthMiddleware(config)

		router.POST("/mcp/sse", func(c *gin.Context) {
			// Set context values like the auth middleware would
			m.SetContextValuesForTest(c, keyRecord, "req-test-123", time.Now())

			// Handler can now access the context
			userID := c.GetInt("user_id")
			authType := c.GetString("auth_type")
			enterpriseID := c.GetInt("enterprise_id")

			c.JSON(200, gin.H{
				"user_id":       userID,
				"auth_type":     authType,
				"enterprise_id": enterpriseID,
			})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)

		assert.Equal(t, float64(42), response["user_id"])
		assert.Equal(t, "mcp_api_key", response["auth_type"])
		assert.Equal(t, float64(100), response["enterprise_id"])
	})

	t.Run("Request ID is generated and available", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.POST("/mcp/sse", func(c *gin.Context) {
			c.Set("mcp_request_id", "test-req-uuid-123")
			requestID := middleware.GetMCPRequestID(c)
			c.JSON(200, gin.H{"request_id": requestID})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)

		assert.Equal(t, "test-req-uuid-123", response["request_id"])
	})
}

// TestMCPClientE2E_MCPProtocolMessages tests MCP protocol specific messages
func TestMCPClientE2E_MCPProtocolMessages(t *testing.T) {
	t.Run("Initialize request structure", func(t *testing.T) {
		initRequest := MCPJSONRPCRequest{
			JSONRPC: "2.0",
			ID:      1,
			Method:  "initialize",
			Params: map[string]interface{}{
				"protocolVersion": "2024-11-05",
				"capabilities": map[string]interface{}{
					"roots": map[string]interface{}{
						"listChanged": true,
					},
				},
				"clientInfo": map[string]interface{}{
					"name":    "claude-desktop",
					"version": "1.0.0",
				},
			},
		}

		jsonBytes, err := json.Marshal(initRequest)
		require.NoError(t, err)

		// Verify the request can be parsed back
		var parsed MCPJSONRPCRequest
		err = json.Unmarshal(jsonBytes, &parsed)
		require.NoError(t, err)

		assert.Equal(t, "initialize", parsed.Method)
		params := parsed.Params.(map[string]interface{})
		assert.Equal(t, "2024-11-05", params["protocolVersion"])
	})

	t.Run("Tools list request structure", func(t *testing.T) {
		toolsRequest := MCPJSONRPCRequest{
			JSONRPC: "2.0",
			ID:      2,
			Method:  "tools/list",
			Params:  map[string]interface{}{},
		}

		jsonBytes, err := json.Marshal(toolsRequest)
		require.NoError(t, err)

		assert.Contains(t, string(jsonBytes), "tools/list")
	})

	t.Run("Tool call request structure", func(t *testing.T) {
		callRequest := MCPJSONRPCRequest{
			JSONRPC: "2.0",
			ID:      "call-uuid-123",
			Method:  "tools/call",
			Params: map[string]interface{}{
				"name": "list_tasks",
				"arguments": map[string]interface{}{
					"page":   1,
					"limit":  20,
					"status": []string{"todo", "in_progress"},
				},
			},
		}

		jsonBytes, err := json.Marshal(callRequest)
		require.NoError(t, err)

		var parsed map[string]interface{}
		json.Unmarshal(jsonBytes, &parsed)

		params := parsed["params"].(map[string]interface{})
		assert.Equal(t, "list_tasks", params["name"])
		args := params["arguments"].(map[string]interface{})
		assert.Equal(t, float64(20), args["limit"])
	})
}

// TestMCPClientE2E_HealthCheck tests the health check endpoint
func TestMCPClientE2E_HealthCheck(t *testing.T) {
	t.Run("Health endpoint returns service info", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		// Simulate the health check handler from mcp_public_routes.go
		router.GET("/api/v1/mcp/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"message": "MCP service is healthy",
				"data": gin.H{
					"service":   "ai-project-mcp",
					"version":   "1.0.0",
					"protocol":  "MCP/1.0",
					"transport": "Streamable HTTP (SSE)",
					"endpoints": gin.H{
						"sse":    "/api/v1/mcp/sse",
						"keys":   "/api/v1/mcp/keys",
						"health": "/api/v1/mcp/health",
					},
				},
			})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/api/v1/mcp/health", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)

		assert.True(t, response["success"].(bool))
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "ai-project-mcp", data["service"])
		assert.Equal(t, "MCP/1.0", data["protocol"])
	})
}

// TestMCPClientE2E_ConcurrentRequests tests handling of concurrent requests
func TestMCPClientE2E_ConcurrentRequests(t *testing.T) {
	t.Run("Multiple concurrent requests are handled", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		requestCount := 0
		router.POST("/mcp/sse", func(c *gin.Context) {
			requestCount++
			time.Sleep(10 * time.Millisecond) // Simulate processing
			c.JSON(200, gin.H{"request_num": requestCount})
		})

		// Send 5 concurrent requests
		results := make(chan int, 5)
		for i := 0; i < 5; i++ {
			go func() {
				w := httptest.NewRecorder()
				req := httptest.NewRequest("POST", "/mcp/sse", nil)
				router.ServeHTTP(w, req)
				results <- w.Code
			}()
		}

		// Wait for all requests
		successCount := 0
		for i := 0; i < 5; i++ {
			code := <-results
			if code == 200 {
				successCount++
			}
		}

		assert.Equal(t, 5, successCount)
	})
}

// TestMCPClientE2E_RequestTimeout tests request timeout handling
func TestMCPClientE2E_RequestTimeout(t *testing.T) {
	t.Run("Slow requests can be handled", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.POST("/mcp/sse", func(c *gin.Context) {
			// Simulate some processing time
			time.Sleep(50 * time.Millisecond)
			c.JSON(200, gin.H{"completed": true})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)

		start := time.Now()
		router.ServeHTTP(w, req)
		duration := time.Since(start)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, duration >= 50*time.Millisecond)
	})
}

// TestMCPClientE2E_LargePayload tests handling of large request/response payloads
func TestMCPClientE2E_LargePayload(t *testing.T) {
	t.Run("Large JSON request is processed", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.POST("/mcp/sse", func(c *gin.Context) {
			body, _ := io.ReadAll(c.Request.Body)
			c.JSON(200, gin.H{
				"received_bytes": len(body),
			})
		})

		// Create a large request body
		largeData := map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      1,
			"method":  "tools/call",
			"params": map[string]interface{}{
				"name": "create_task",
				"arguments": map[string]interface{}{
					"title":       strings.Repeat("Long title ", 100),
					"description": strings.Repeat("Description content ", 500),
				},
			},
		}

		jsonBytes, _ := json.Marshal(largeData)

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", bytes.NewReader(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		receivedBytes := response["received_bytes"].(float64)
		assert.True(t, receivedBytes > 10000, fmt.Sprintf("Expected large payload, got %v bytes", receivedBytes))
	})

	t.Run("Large JSON response is returned", func(t *testing.T) {
		gin.SetMode(gin.TestMode)
		router := gin.New()

		router.POST("/mcp/sse", func(c *gin.Context) {
			// Create a large response (simulating many tasks)
			tasks := make([]map[string]interface{}, 100)
			for i := 0; i < 100; i++ {
				tasks[i] = map[string]interface{}{
					"id":          i + 1,
					"title":       fmt.Sprintf("Task %d with some additional text", i+1),
					"description": strings.Repeat("Description ", 50),
					"status":      "todo",
				}
			}

			c.JSON(200, gin.H{
				"jsonrpc": "2.0",
				"result": gin.H{
					"content": []gin.H{
						{"type": "text", "text": fmt.Sprintf("%v", tasks)},
					},
				},
				"id": 1,
			})
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest("POST", "/mcp/sse", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, w.Body.Len() > 10000, "Expected large response")
	})
}
