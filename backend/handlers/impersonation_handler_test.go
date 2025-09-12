package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"ai-project-backend/models"
)

// Mock services for testing
type MockTokenService struct {
	mock.Mock
}

func (m *MockTokenService) GenerateNormalToken(userID int, username, role, userType string) (string, error) {
	args := m.Called(userID, username, role, userType)
	return args.String(0), args.Error(1)
}

func (m *MockTokenService) GenerateImpersonationToken(claims *models.ExtendedClaims, enterprise *models.Enterprise, reason, ip string) (string, error) {
	args := m.Called(claims, enterprise, reason, ip)
	return args.String(0), args.Error(1)
}

func (m *MockTokenService) ParseToken(token string) (*models.ExtendedClaims, error) {
	args := m.Called(token)
	return args.Get(0).(*models.ExtendedClaims), args.Error(1)
}

type MockEnterpriseService struct {
	mock.Mock
}

func (m *MockEnterpriseService) GetEnterpriseByID(ctx context.Context, id int) (*models.Enterprise, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Enterprise), args.Error(1)
}

type MockAuditService struct {
	mock.Mock
}

func (m *MockAuditService) LogEvent(ctx context.Context, event *models.AuditEventData) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

func TestImpersonationHandler_StartImpersonation_Success(t *testing.T) {
	// 设置Mock服务
	mockTokenService := new(MockTokenService)
	mockEnterpriseService := new(MockEnterpriseService)
	mockAuditService := new(MockAuditService)
	
	handler := NewImpersonationHandler(mockTokenService, mockEnterpriseService, mockAuditService)
	
	// 设置路由
	router := setupTestRouter()
	router.POST("/impersonate/enterprise/:id", func(c *gin.Context) {
		// 模拟认证中间件设置claims
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		handler.StartImpersonation(c)
	})
	
	// 准备测试数据
	enterprise := &models.Enterprise{
		ID:   100,
		Name: "Test Enterprise",
		Code: "TEST001",
	}
	
	newClaims := &models.ExtendedClaims{
		UserID:   1,
		Username: "admin",
		Role:     "enterprise_admin",
		UserType: "system_impersonating",
		ImpersonationContext: &models.ImpersonationContext{
			EnterpriseID:     100,
			EnterpriseName:   "Test Enterprise",
			EnterpriseCode:   "TEST001",
			OriginalUserID:   1,
			OriginalUsername: "admin",
			OriginalRole:     "admin",
			StartedAt:        time.Now(),
			ExpiresAt:        time.Now().Add(2 * time.Hour),
			SessionID:        "test_session_123",
			Reason:           "Integration testing",
			IPAddress:        "127.0.0.1",
		},
	}
	
	// 设置Mock期望
	mockEnterpriseService.On("GetEnterpriseByID", mock.Anything, 100).Return(enterprise, nil)
	mockTokenService.On("GenerateImpersonationToken", mock.Anything, enterprise, "Integration testing", mock.Anything).Return("test_token", nil)
	mockTokenService.On("ParseToken", "test_token").Return(newClaims, nil)
	mockAuditService.On("LogEvent", mock.Anything, mock.Anything).Return(nil)
	
	// 准备请求
	reqBody := ImpersonationRequest{
		Reason: "Integration testing",
	}
	jsonData, _ := json.Marshal(reqBody)
	
	// 执行请求
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/impersonate/enterprise/100", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	router.ServeHTTP(w, req)
	
	// 验证结果
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response ImpersonationResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	
	assert.Equal(t, "test_token", response.Token)
	assert.Equal(t, 100, response.Enterprise.ID)
	assert.Equal(t, "Test Enterprise", response.Enterprise.Name)
	assert.Equal(t, 1, response.Info.OriginalUserID)
	assert.Equal(t, "admin", response.Info.OriginalUsername)
	
	// 验证Mock调用
	mockEnterpriseService.AssertExpectations(t)
	mockTokenService.AssertExpectations(t)
	mockAuditService.AssertExpectations(t)
}

func TestImpersonationHandler_StartImpersonation_NotAdmin(t *testing.T) {
	mockTokenService := new(MockTokenService)
	mockEnterpriseService := new(MockEnterpriseService)
	mockAuditService := new(MockAuditService)
	
	handler := NewImpersonationHandler(mockTokenService, mockEnterpriseService, mockAuditService)
	
	router := setupTestRouter()
	router.POST("/impersonate/enterprise/:id", func(c *gin.Context) {
		// 非系统管理员用户
		claims := &models.ExtendedClaims{
			UserID:   2,
			Username: "user",
			Role:     "user",
			UserType: "enterprise",
		}
		c.Set("claims", claims)
		handler.StartImpersonation(c)
	})
	
	reqBody := ImpersonationRequest{
		Reason: "Unauthorized attempt",
	}
	jsonData, _ := json.Marshal(reqBody)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/impersonate/enterprise/100", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusForbidden, w.Code)
	
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response["message"], "Only system administrators")
}

func TestImpersonationHandler_StartImpersonation_AlreadyImpersonating(t *testing.T) {
	mockTokenService := new(MockTokenService)
	mockEnterpriseService := new(MockEnterpriseService)
	mockAuditService := new(MockAuditService)
	
	handler := NewImpersonationHandler(mockTokenService, mockEnterpriseService, mockAuditService)
	
	router := setupTestRouter()
	router.POST("/impersonate/enterprise/:id", func(c *gin.Context) {
		// 已经在模拟状态
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID: 50,
			},
		}
		c.Set("claims", claims)
		handler.StartImpersonation(c)
	})
	
	reqBody := ImpersonationRequest{
		Reason: "Nested attempt",
	}
	jsonData, _ := json.Marshal(reqBody)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/impersonate/enterprise/100", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
	
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response["message"], "Already in impersonation mode")
}

func TestImpersonationHandler_ExitImpersonation_Success(t *testing.T) {
	mockTokenService := new(MockTokenService)
	mockEnterpriseService := new(MockEnterpriseService)
	mockAuditService := new(MockAuditService)
	
	handler := NewImpersonationHandler(mockTokenService, mockEnterpriseService, mockAuditService)
	
	router := setupTestRouter()
	router.POST("/impersonate/exit", func(c *gin.Context) {
		// 模拟中的用户
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     100,
				EnterpriseName:   "Test Enterprise",
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
				StartedAt:        time.Now().Add(-1 * time.Hour),
				SessionID:        "session_123",
				Reason:           "Testing",
			},
		}
		c.Set("claims", claims)
		handler.ExitImpersonation(c)
	})
	
	// 设置Mock期望
	mockTokenService.On("GenerateNormalToken", 1, "admin", "admin", "system").Return("original_token", nil)
	mockAuditService.On("LogEvent", mock.Anything, mock.Anything).Return(nil)
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/impersonate/exit", nil)
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.Equal(t, "original_token", response["token"])
	assert.Contains(t, response["message"], "Successfully exited")
	
	originalUser := response["original_user"].(map[string]interface{})
	assert.Equal(t, float64(1), originalUser["id"]) // JSON numbers are float64
	assert.Equal(t, "admin", originalUser["username"])
	
	mockTokenService.AssertExpectations(t)
	mockAuditService.AssertExpectations(t)
}

func TestImpersonationHandler_ExitImpersonation_NotImpersonating(t *testing.T) {
	mockTokenService := new(MockTokenService)
	mockEnterpriseService := new(MockEnterpriseService)
	mockAuditService := new(MockAuditService)
	
	handler := NewImpersonationHandler(mockTokenService, mockEnterpriseService, mockAuditService)
	
	router := setupTestRouter()
	router.POST("/impersonate/exit", func(c *gin.Context) {
		// 普通用户（非模拟状态）
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		handler.ExitImpersonation(c)
	})
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/impersonate/exit", nil)
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
	
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response["message"], "Not currently in impersonation mode")
}

func TestImpersonationHandler_GetImpersonationStatus_Impersonating(t *testing.T) {
	mockTokenService := new(MockTokenService)
	mockEnterpriseService := new(MockEnterpriseService)
	mockAuditService := new(MockAuditService)
	
	handler := NewImpersonationHandler(mockTokenService, mockEnterpriseService, mockAuditService)
	
	router := setupTestRouter()
	router.GET("/impersonate/status", func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     100,
				EnterpriseName:   "Test Enterprise",
				EnterpriseCode:   "TEST001",
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
				StartedAt:        time.Now().Add(-30 * time.Minute),
				ExpiresAt:        time.Now().Add(90 * time.Minute),
				SessionID:        "session_123",
				Reason:           "Testing status",
			},
		}
		c.Set("claims", claims)
		handler.GetImpersonationStatus(c)
	})
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/impersonate/status", nil)
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.True(t, response["is_impersonating"].(bool))
	
	enterprise := response["enterprise"].(map[string]interface{})
	assert.Equal(t, float64(100), enterprise["id"])
	assert.Equal(t, "Test Enterprise", enterprise["name"])
	
	originalUser := response["original_user"].(map[string]interface{})
	assert.Equal(t, float64(1), originalUser["id"])
	assert.Equal(t, "admin", originalUser["username"])
	
	session := response["session"].(map[string]interface{})
	assert.Equal(t, "session_123", session["id"])
	assert.Equal(t, "Testing status", session["reason"])
}

func TestImpersonationHandler_GetImpersonationStatus_NotImpersonating(t *testing.T) {
	mockTokenService := new(MockTokenService)
	mockEnterpriseService := new(MockEnterpriseService)
	mockAuditService := new(MockAuditService)
	
	handler := NewImpersonationHandler(mockTokenService, mockEnterpriseService, mockAuditService)
	
	router := setupTestRouter()
	router.GET("/impersonate/status", func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		handler.GetImpersonationStatus(c)
	})
	
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/impersonate/status", nil)
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	
	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	
	assert.False(t, response["is_impersonating"].(bool))
}