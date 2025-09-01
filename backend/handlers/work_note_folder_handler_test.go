package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ai-project-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestWorkNoteFolderHandler_ResponseStructures 测试响应结构
func TestWorkNoteFolderHandler_ResponseStructures(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// 测试 StandardResponse 结构
	t.Run("StandardResponse_Structure", func(t *testing.T) {
		response := StandardResponse{
			Success:   true,
			Message:   "Test message",
			Data:      map[string]string{"key": "value"},
			Timestamp: 1234567890,
		}
		
		// 序列化为JSON验证结构
		jsonData, err := json.Marshal(response)
		assert.NoError(t, err)
		assert.Contains(t, string(jsonData), "success")
		assert.Contains(t, string(jsonData), "message")
		assert.Contains(t, string(jsonData), "data")
		assert.Contains(t, string(jsonData), "timestamp")
		
		// 反序列化验证
		var decoded StandardResponse
		err = json.Unmarshal(jsonData, &decoded)
		assert.NoError(t, err)
		assert.Equal(t, response.Success, decoded.Success)
		assert.Equal(t, response.Message, decoded.Message)
		assert.Equal(t, response.Timestamp, decoded.Timestamp)
	})
	
	// 测试 ErrorInfo 结构
	t.Run("ErrorInfo_Structure", func(t *testing.T) {
		errorInfo := &ErrorInfo{
			Code: ErrCodeValidationFailed,
			Details: map[string]interface{}{
				"field": "name",
				"value": "test",
			},
		}
		
		response := StandardResponse{
			Success: false,
			Message: "Validation error",
			Error:   errorInfo,
		}
		
		jsonData, err := json.Marshal(response)
		assert.NoError(t, err)
		assert.Contains(t, string(jsonData), ErrCodeValidationFailed)
		assert.Contains(t, string(jsonData), "field")
	})
	
	// 测试 PaginatedResponse 结构
	t.Run("PaginatedResponse_Structure", func(t *testing.T) {
		pagination := PaginationInfo{
			Page:       1,
			Size:       10,
			Total:      25,
			TotalPages: 3,
		}
		
		paginatedResp := PaginatedResponse{
			Items:      []string{"item1", "item2"},
			Pagination: pagination,
		}
		
		jsonData, err := json.Marshal(paginatedResp)
		assert.NoError(t, err)
		assert.Contains(t, string(jsonData), "items")
		assert.Contains(t, string(jsonData), "pagination")
	})
}

// TestWorkNoteFolderHandler_ErrorCodes 测试错误码常量
func TestWorkNoteFolderHandler_ErrorCodes(t *testing.T) {
	// 测试通用错误码
	assert.Equal(t, "INVALID_REQUEST", ErrCodeInvalidRequest)
	assert.Equal(t, "UNAUTHORIZED", ErrCodeUnauthorized)
	assert.Equal(t, "FORBIDDEN", ErrCodeForbidden)
	assert.Equal(t, "NOT_FOUND", ErrCodeNotFound)
	assert.Equal(t, "CONFLICT", ErrCodeConflict)
	assert.Equal(t, "INTERNAL_ERROR", ErrCodeInternalError)
	assert.Equal(t, "VALIDATION_FAILED", ErrCodeValidationFailed)
	
	// 测试特定错误码
	assert.Equal(t, "FOLDER_NOT_FOUND", ErrCodeFolderNotFound)
	assert.Equal(t, "FOLDER_NAME_EXISTS", ErrCodeFolderNameExists)
	assert.Equal(t, "CYCLIC_REFERENCE", ErrCodeCyclicReference)
	assert.Equal(t, "FOLDER_NOT_EMPTY", ErrCodeFolderNotEmpty)
	assert.Equal(t, "INVALID_PARENT", ErrCodeInvalidParent)
	assert.Equal(t, "PERMISSION_DENIED", ErrCodePermissionDenied)
	assert.Equal(t, "MAX_DEPTH_EXCEEDED", ErrCodeMaxDepthExceeded)
}

// TestWorkNoteFolderHandler_ValidationErrors 测试验证错误
func TestWorkNoteFolderHandler_ValidationErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// 设置路由和中间件
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", 1)
		c.Next()
	})
	
	// 由于无法完全mock数据库，我们只测试请求解析和基本验证
	router.POST("/test", func(c *gin.Context) {
		var req models.CreateWorkNoteFolderRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, StandardResponse{
				Success: false,
				Message: "Invalid request format",
				Error: &ErrorInfo{
					Code: ErrCodeInvalidRequest,
					Details: map[string]interface{}{
						"parseError": err.Error(),
					},
				},
			})
			return
		}
		
		// 基本验证测试
		if req.Name == "" {
			c.JSON(http.StatusBadRequest, StandardResponse{
				Success: false,
				Message: "Folder name is required",
				Error: &ErrorInfo{
					Code:    ErrCodeValidationFailed,
					Details: map[string]interface{}{"field": "name"},
				},
			})
			return
		}
		
		if len(req.Name) > 255 {
			c.JSON(http.StatusBadRequest, StandardResponse{
				Success: false,
				Message: "Folder name must not exceed 255 characters",
				Error: &ErrorInfo{
					Code:    ErrCodeValidationFailed,
					Details: map[string]interface{}{"field": "name"},
				},
			})
			return
		}
		
		c.JSON(http.StatusOK, StandardResponse{
			Success: true,
			Message: "Validation passed",
		})
	})
	
	tests := []struct {
		name           string
		requestBody    interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Empty name should fail",
			requestBody:    models.CreateWorkNoteFolderRequest{Name: ""},
			expectedStatus: http.StatusBadRequest,
			expectedError:  ErrCodeValidationFailed,
		},
		{
			name:           "Long name should fail",
			requestBody:    models.CreateWorkNoteFolderRequest{Name: string(make([]byte, 300))},
			expectedStatus: http.StatusBadRequest,
			expectedError:  ErrCodeValidationFailed,
		},
		{
			name: "Valid name should pass",
			requestBody: models.CreateWorkNoteFolderRequest{
				Name:       "Valid Folder Name",
				Visibility: "private",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid JSON should fail",
			requestBody:    `{"name": invalid}`,
			expectedStatus: http.StatusBadRequest,
			expectedError:  ErrCodeInvalidRequest,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body bytes.Buffer
			if str, ok := tt.requestBody.(string); ok {
				body.WriteString(str)
			} else {
				err := json.NewEncoder(&body).Encode(tt.requestBody)
				assert.NoError(t, err)
			}
			
			req, _ := http.NewRequest("POST", "/test", &body)
			req.Header.Set("Content-Type", "application/json")
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			if tt.expectedError != "" {
				var response StandardResponse
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.False(t, response.Success)
				assert.Equal(t, tt.expectedError, response.Error.Code)
			}
		})
	}
}

// TestWorkNoteFolderHandler_ResponseHelpers 测试响应辅助方法
func TestWorkNoteFolderHandler_ResponseHelpers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &WorkNoteFolderHandler{}
	
	t.Run("successResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		
		testData := map[string]string{"key": "value"}
		handler.successResponse(c, "Test success", testData)
		
		assert.Equal(t, http.StatusOK, w.Code)
		
		var response StandardResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, "Test success", response.Message)
		assert.NotNil(t, response.Data)
		assert.Greater(t, response.Timestamp, int64(0))
	})
	
	t.Run("errorResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		
		details := map[string]interface{}{
			"field": "name",
			"value": "invalid",
		}
		handler.errorResponse(c, http.StatusBadRequest, ErrCodeValidationFailed, "Validation failed", details)
		
		assert.Equal(t, http.StatusBadRequest, w.Code)
		
		var response StandardResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response.Success)
		assert.Equal(t, "Validation failed", response.Message)
		assert.NotNil(t, response.Error)
		assert.Equal(t, ErrCodeValidationFailed, response.Error.Code)
		assert.Equal(t, "name", response.Error.Details["field"])
	})
	
	t.Run("validationErrorResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		
		handler.validationErrorResponse(c, "email", "Email is required")
		
		assert.Equal(t, http.StatusBadRequest, w.Code)
		
		var response StandardResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response.Success)
		assert.Equal(t, "Email is required", response.Message)
		assert.Equal(t, ErrCodeValidationFailed, response.Error.Code)
		assert.Equal(t, "email", response.Error.Details["field"])
	})
	
	t.Run("paginatedResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		
		items := []map[string]string{
			{"name": "item1"},
			{"name": "item2"},
		}
		pagination := PaginationInfo{
			Page:       1,
			Size:       10,
			Total:      25,
			TotalPages: 3,
		}
		
		handler.paginatedResponse(c, "Retrieved items", items, pagination)
		
		assert.Equal(t, http.StatusOK, w.Code)
		
		var response StandardResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		assert.Equal(t, "Retrieved items", response.Message)
		
		// 验证分页数据结构
		paginatedData := response.Data.(map[string]interface{})
		assert.Contains(t, paginatedData, "items")
		assert.Contains(t, paginatedData, "pagination")
		
		paginationData := paginatedData["pagination"].(map[string]interface{})
		assert.Equal(t, float64(1), paginationData["page"])
		assert.Equal(t, float64(10), paginationData["size"])
		assert.Equal(t, float64(25), paginationData["total"])
		assert.Equal(t, float64(3), paginationData["totalPages"])
	})
}

// TestWorkNoteFolderHandler_RequestParsing 测试请求解析
func TestWorkNoteFolderHandler_RequestParsing(t *testing.T) {
	tests := []struct {
		name        string
		requestBody string
		expectError bool
	}{
		{
			name: "Valid CreateWorkNoteFolderRequest",
			requestBody: `{
				"name": "Test Folder",
				"description": "Test Description",
				"visibility": "private",
				"color": "#FF0000",
				"icon": "folder"
			}`,
			expectError: false,
		},
		{
			name:        "Invalid JSON",
			requestBody: `{"name": "Test", "invalid": }`,
			expectError: true,
		},
		{
			name: "Valid UpdateWorkNoteFolderRequest",
			requestBody: `{
				"name": "Updated Name",
				"description": "Updated Description",
				"visibility": "team"
			}`,
			expectError: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 测试 CreateWorkNoteFolderRequest
			if tt.name == "Valid CreateWorkNoteFolderRequest" || tt.name == "Invalid JSON" {
				var req models.CreateWorkNoteFolderRequest
				err := json.Unmarshal([]byte(tt.requestBody), &req)
				if tt.expectError {
					assert.Error(t, err)
				} else {
					assert.NoError(t, err)
					if !tt.expectError {
						assert.Equal(t, "Test Folder", req.Name)
						assert.NotNil(t, req.Description)
						assert.Equal(t, "Test Description", *req.Description)
						assert.Equal(t, models.Visibility("private"), req.Visibility)
					}
				}
			}
			
			// 测试 UpdateWorkNoteFolderRequest
			if tt.name == "Valid UpdateWorkNoteFolderRequest" {
				var req models.UpdateWorkNoteFolderRequest
				err := json.Unmarshal([]byte(tt.requestBody), &req)
				assert.NoError(t, err)
				assert.Equal(t, "Updated Name", *req.Name)
				assert.Equal(t, "Updated Description", *req.Description)
				assert.Equal(t, models.Visibility("team"), *req.Visibility)
			}
		})
	}
}

// TestWorkNoteFolderHandler_HelperLogic 测试辅助方法逻辑（不依赖数据库）
func TestWorkNoteFolderHandler_HelperLogic(t *testing.T) {
	t.Run("wouldCreateCycle_DirectCycle", func(t *testing.T) {
		// 测试直接循环检查逻辑
		handler := &WorkNoteFolderHandler{}
		
		// 直接循环：父ID和文件夹ID相同
		result := handler.wouldCreateCycle(1, 1)
		assert.True(t, result, "Same parent and folder ID should create cycle")
	})
}

// BenchmarkWorkNoteFolderHandler_ResponseCreation 响应创建的基准测试
func BenchmarkWorkNoteFolderHandler_ResponseCreation(b *testing.B) {
	gin.SetMode(gin.TestMode)
	handler := &WorkNoteFolderHandler{}
	
	b.Run("StandardResponse_Creation", func(b *testing.B) {
		testData := map[string]string{"key": "value"}
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			handler.successResponse(c, "Test message", testData)
		}
	})
	
	b.Run("ErrorResponse_Creation", func(b *testing.B) {
		details := map[string]interface{}{
			"field": "name",
			"error": "validation failed",
		}
		
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			handler.errorResponse(c, http.StatusBadRequest, ErrCodeValidationFailed, "Error message", details)
		}
	})
}

// TestWorkNoteFolderHandler_EdgeCases 测试边缘情况
func TestWorkNoteFolderHandler_EdgeCases(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := &WorkNoteFolderHandler{}
	
	t.Run("EmptyDetails_ErrorResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		
		// 测试空的详情映射
		handler.errorResponse(c, http.StatusBadRequest, ErrCodeInternalError, "Error", nil)
		
		var response StandardResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.False(t, response.Success)
		assert.Nil(t, response.Error.Details)
	})
	
	t.Run("NilData_SuccessResponse", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		
		// 测试空数据
		handler.successResponse(c, "Success", nil)
		
		var response StandardResponse
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.True(t, response.Success)
		// JSON中nil会被省略，所以不检查Data字段的存在性
	})
}