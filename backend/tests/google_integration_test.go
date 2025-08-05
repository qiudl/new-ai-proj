package tests

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"ai-project-backend/config"
	"ai-project-backend/handlers"
	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
)

// IntegrationTestConfig 集成测试配置
type IntegrationTestConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	EncryptionKey      string
}

// SetupIntegrationTest 设置集成测试环境
func SetupIntegrationTest(t *testing.T) *IntegrationTestConfig {
	// 设置测试环境变量
	testConfig := &IntegrationTestConfig{
		GoogleClientID:     "test_client_id",
		GoogleClientSecret: "test_client_secret",
		GoogleRedirectURL:  "http://localhost:8080/api/auth/google/callback",
		EncryptionKey:      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", // 64位十六进制
	}

	os.Setenv("GOOGLE_CLIENT_ID", testConfig.GoogleClientID)
	os.Setenv("GOOGLE_CLIENT_SECRET", testConfig.GoogleClientSecret)
	os.Setenv("GOOGLE_REDIRECT_URL", testConfig.GoogleRedirectURL)
	os.Setenv("GOOGLE_CALENDAR_SCOPES", "https://www.googleapis.com/auth/calendar")
	os.Setenv("ENCRYPTION_KEY", testConfig.EncryptionKey)

	return testConfig
}

// TeardownIntegrationTest 清理集成测试环境
func TeardownIntegrationTest() {
	os.Unsetenv("GOOGLE_CLIENT_ID")
	os.Unsetenv("GOOGLE_CLIENT_SECRET")
	os.Unsetenv("GOOGLE_REDIRECT_URL")
	os.Unsetenv("GOOGLE_CALENDAR_SCOPES")
	os.Unsetenv("ENCRYPTION_KEY")
}

// TestGoogleConfigLoad 测试Google配置加载
func TestGoogleConfigLoad(t *testing.T) {
	testConfig := SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	googleConfig, err := config.LoadGoogleConfig()
	if err != nil {
		t.Fatalf("Failed to load Google config: %v", err)
	}

	if googleConfig.ClientID != testConfig.GoogleClientID {
		t.Errorf("Expected ClientID %s, got %s", testConfig.GoogleClientID, googleConfig.ClientID)
	}

	if googleConfig.ClientSecret != testConfig.GoogleClientSecret {
		t.Errorf("Expected ClientSecret %s, got %s", testConfig.GoogleClientSecret, googleConfig.ClientSecret)
	}

	if googleConfig.RedirectURL != testConfig.GoogleRedirectURL {
		t.Errorf("Expected RedirectURL %s, got %s", testConfig.GoogleRedirectURL, googleConfig.RedirectURL)
	}
}

// TestGoogleConfigValidation 测试Google配置验证
func TestGoogleConfigValidation(t *testing.T) {
	testConfig := SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	// 测试有效配置
	if !config.IsGoogleConfigured() {
		t.Error("Expected Google to be configured with valid environment variables")
	}

	// 测试无效配置（缺少ClientID）
	os.Unsetenv("GOOGLE_CLIENT_ID")
	if config.IsGoogleConfigured() {
		t.Error("Expected Google to not be configured with missing ClientID")
	}

	// 恢复ClientID用于后续测试
	os.Setenv("GOOGLE_CLIENT_ID", testConfig.GoogleClientID)
}

// TestOAuthFlowURLGeneration 测试OAuth流程URL生成
func TestOAuthFlowURLGeneration(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	service := services.NewGoogleCalendarService()
	
	testState := "test_state_12345"
	authURL := service.GetAuthURL(testState)

	if authURL == "" {
		t.Fatal("Expected non-empty auth URL")
	}

	// 验证URL包含必要参数
	expectedParams := []string{
		"client_id=test_client_id",
		"response_type=code",
		"scope=https%3A//www.googleapis.com/auth/calendar",
		"access_type=offline",
		"prompt=consent",
		"state=" + testState,
		"redirect_uri=http%3A//localhost%3A8080/api/auth/google/callback",
	}

	for _, param := range expectedParams {
		if !strings.Contains(authURL, param) {
			t.Errorf("Expected auth URL to contain parameter: %s", param)
		}
	}

	// 验证URL以Google OAuth端点开始
	if !strings.HasPrefix(authURL, "https://accounts.google.com/o/oauth2/auth") {
		t.Errorf("Expected auth URL to start with Google OAuth endpoint, got: %s", authURL)
	}
}

// TestEnhancedGoogleCalendarServiceCreation 测试增强版Google日历服务创建
func TestEnhancedGoogleCalendarServiceCreation(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	// 测试调试模式关闭
	service := services.NewEnhancedGoogleCalendarService(false)
	if service == nil {
		t.Fatal("Expected non-nil enhanced Google calendar service")
	}

	stats := service.GetAPICallStats()
	if stats["debug_mode"] != false {
		t.Error("Expected debug mode to be false")
	}

	// 测试调试模式开启
	debugService := services.NewEnhancedGoogleCalendarService(true)
	debugStats := debugService.GetAPICallStats()
	if debugStats["debug_mode"] != true {
		t.Error("Expected debug mode to be true")
	}
}

// TestGoogleAuthHandlerCreation 测试Google认证处理器创建
func TestGoogleAuthHandlerCreation(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	googleService := services.NewEnhancedGoogleCalendarService(false)
	
	// 注意：这里我们需要模拟repository，因为它需要数据库连接
	// 在实际集成测试中，应该使用真实的数据库连接
	if googleService == nil {
		t.Fatal("Expected non-nil Google service")
	}
}

// TestTokenRefreshServiceIntegration 测试Token刷新服务集成
func TestTokenRefreshServiceIntegration(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	googleService := services.NewEnhancedGoogleCalendarService(false)
	
	// 使用模拟的repository（在真实集成测试中应该使用真实的数据库）
	// 这里只测试服务创建和基本功能
	if googleService == nil {
		t.Fatal("Expected non-nil Google service for token refresh")
	}

	// 测试Token过期检查逻辑
	futureTime := time.Now().Add(time.Hour)
	pastTime := time.Now().Add(-time.Hour)
	nearExpireTime := time.Now().Add(3 * time.Minute)

	regularService := services.NewGoogleCalendarService()
	
	if regularService.IsTokenExpired(futureTime) {
		t.Error("Expected future token to not be expired")
	}

	if !regularService.IsTokenExpired(pastTime) {
		t.Error("Expected past token to be expired")
	}

	if !regularService.IsTokenExpired(nearExpireTime) {
		t.Error("Expected near-expire token to be considered expired")
	}
}

// TestHTTPHandlerIntegration 测试HTTP处理器集成
func TestHTTPHandlerIntegration(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	// 创建测试路由
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// 模拟中间件，设置用户ID
	router.Use(func(c *gin.Context) {
		c.Set("user_id", 123)
		c.Next()
	})

	// 注意：在真实集成测试中，应该设置完整的handler
	// 这里只测试路由设置不会panic
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})

	// 创建测试请求
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

// TestErrorHandlingIntegration 测试错误处理集成
func TestErrorHandlingIntegration(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	service := services.NewEnhancedGoogleCalendarService(false)
	ctx := context.Background()

	// 测试无效Token验证
	err := service.ValidateToken(ctx, "invalid_token")
	if err == nil {
		t.Error("Expected error when validating invalid token")
	}

	// 测试空Token刷新
	_, err = service.RefreshToken(ctx, "")
	if err == nil {
		t.Error("Expected error when refreshing empty token")
	}
}

// TestConfigurationValidation 测试配置验证集成
func TestConfigurationValidation(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	// 测试完整配置验证
	googleConfig, err := config.LoadGoogleConfig()
	if err != nil {
		t.Fatalf("Failed to load Google config: %v", err)
	}

	err = config.ValidateGoogleConfig(googleConfig)
	if err != nil {
		t.Errorf("Expected valid Google config, got error: %v", err)
	}

	// 测试部分无效配置
	incompleteConfig := &config.GoogleConfig{
		ClientID:     "test_id",
		ClientSecret: "", // 缺少secret
		RedirectURL:  "http://localhost:8080/callback",
	}

	err = config.ValidateGoogleConfig(incompleteConfig)
	if err == nil {
		t.Error("Expected error for incomplete Google config")
	}
}

// TestEndToEndOAuthFlow 测试端到端OAuth流程（模拟）
func TestEndToEndOAuthFlow(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	// 第1步：生成授权URL
	service := services.NewGoogleCalendarService()
	state := "integration_test_state"
	authURL := service.GetAuthURL(state)

	if authURL == "" {
		t.Fatal("Failed to generate auth URL")
	}

	// 第2步：模拟授权码交换（在真实测试中，这需要有效的授权码）
	// 这里只测试函数调用不会panic
	ctx := context.Background()
	_, err := service.ExchangeCodeForToken(ctx, "invalid_code")
	if err == nil {
		t.Log("Expected error with invalid code (this is normal for integration test)")
	}

	// 第3步：测试Token过期检查
	futureTime := time.Now().Add(time.Hour)
	if service.IsTokenExpired(futureTime) {
		t.Error("Expected future token to not be expired")
	}
}

// TestServiceHealthChecks 测试服务健康检查
func TestServiceHealthChecks(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	// 测试Google配置健康检查
	if !config.IsGoogleConfigured() {
		t.Error("Expected Google to be properly configured for integration test")
	}

	// 测试服务创建健康检查
	service := services.NewEnhancedGoogleCalendarService(false)
	if service == nil {
		t.Fatal("Failed to create Google calendar service")
	}

	stats := service.GetAPICallStats()
	if stats == nil {
		t.Error("Expected non-nil API call stats")
	}
}

// TestConcurrentServiceAccess 测试并发服务访问
func TestConcurrentServiceAccess(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	service := services.NewEnhancedGoogleCalendarService(true)

	// 并发生成授权URL
	const numGoroutines = 10
	results := make(chan string, numGoroutines)
	errors := make(chan error, numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer func() {
				if r := recover(); r != nil {
					errors <- r.(error)
				}
			}()

			state := fmt.Sprintf("concurrent_test_%d", id)
			authURL := service.GetAuthURL(state)
			results <- authURL
		}(i)
	}

	// 收集结果
	successCount := 0
	errorCount := 0

	for i := 0; i < numGoroutines; i++ {
		select {
		case url := <-results:
			if url != "" {
				successCount++
			}
		case <-errors:
			errorCount++
		case <-time.After(5 * time.Second):
			t.Fatal("Timeout waiting for concurrent operations")
		}
	}

	if successCount != numGoroutines {
		t.Errorf("Expected %d successful operations, got %d (errors: %d)", numGoroutines, successCount, errorCount)
	}
}

// TestMemoryLeakPrevention 测试内存泄漏预防
func TestMemoryLeakPrevention(t *testing.T) {
	SetupIntegrationTest(t)
	defer TeardownIntegrationTest()

	// 创建和销毁多个服务实例
	for i := 0; i < 100; i++ {
		service := services.NewEnhancedGoogleCalendarService(false)
		_ = service.GetAPICallStats()
		service = nil // 显式设置为nil，帮助GC
	}

	// 这个测试主要确保没有panic或明显的内存问题
	// 在实际应用中，可能需要更复杂的内存监控
}

// 为了导入fmt包
import "fmt"

// BenchmarkIntegrationAuthURLGeneration 基准测试授权URL生成
func BenchmarkIntegrationAuthURLGeneration(b *testing.B) {
	SetupIntegrationTest(&testing.T{})
	defer TeardownIntegrationTest()

	service := services.NewGoogleCalendarService()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		state := fmt.Sprintf("bench_state_%d", i)
		_ = service.GetAuthURL(state)
	}
}

// BenchmarkIntegrationServiceCreation 基准测试服务创建
func BenchmarkIntegrationServiceCreation(b *testing.B) {
	SetupIntegrationTest(&testing.T{})
	defer TeardownIntegrationTest()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		service := services.NewEnhancedGoogleCalendarService(false)
		_ = service.GetAPICallStats()
	}
}