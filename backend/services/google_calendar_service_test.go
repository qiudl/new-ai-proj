package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// MockGoogleCalendarService 用于测试的模拟服务
type MockGoogleCalendarService struct {
	validateTokenError error
	refreshTokenError  error
	createEventError   error
}

func NewMockGoogleCalendarService() *MockGoogleCalendarService {
	return &MockGoogleCalendarService{}
}

func (m *MockGoogleCalendarService) ValidateToken(ctx context.Context, accessToken string) error {
	return m.validateTokenError
}

func (m *MockGoogleCalendarService) RefreshToken(ctx context.Context, refreshToken string) (*GoogleToken, error) {
	if m.refreshTokenError != nil {
		return nil, m.refreshTokenError
	}
	
	return &GoogleToken{
		AccessToken:  "new_access_token",
		RefreshToken: "new_refresh_token",
		TokenType:    "Bearer",
		ExpiresAt:    time.Now().Add(time.Hour),
	}, nil
}

func (m *MockGoogleCalendarService) CreateEvent(ctx context.Context, accessToken, calendarID string, event *GoogleCalendarEvent) (*GoogleCalendarEvent, error) {
	if m.createEventError != nil {
		return nil, m.createEventError
	}
	
	event.ID = "test_event_id"
	return event, nil
}

// TestGoogleCalendarService_GetAuthURL 测试获取授权URL
func TestGoogleCalendarService_GetAuthURL(t *testing.T) {
	service := NewGoogleCalendarService()
	
	state := "test_state_123"
	authURL := service.GetAuthURL(state)
	
	if authURL == "" {
		t.Error("Expected non-empty auth URL")
	}
	
	// 检查URL中是否包含state参数
	if !contains(authURL, state) {
		t.Errorf("Expected auth URL to contain state parameter: %s", state)
	}
	
	// 检查URL中是否包含必要的参数
	expectedParams := []string{
		"access_type=offline",
		"prompt=consent",
		"response_type=code",
		"scope=",
	}
	
	for _, param := range expectedParams {
		if !contains(authURL, param) {
			t.Errorf("Expected auth URL to contain parameter: %s", param)
		}
	}
}

// TestGoogleCalendarService_IsTokenExpired 测试Token过期检查
func TestGoogleCalendarService_IsTokenExpired(t *testing.T) {
	service := NewGoogleCalendarService()
	
	// 测试未过期的Token
	futureTime := time.Now().Add(10 * time.Minute)
	if service.IsTokenExpired(futureTime) {
		t.Error("Expected token to not be expired")
	}
	
	// 测试已过期的Token
	pastTime := time.Now().Add(-10 * time.Minute)
	if !service.IsTokenExpired(pastTime) {
		t.Error("Expected token to be expired")
	}
	
	// 测试即将过期的Token (5分钟内)
	nearExpireTime := time.Now().Add(3 * time.Minute)
	if !service.IsTokenExpired(nearExpireTime) {
		t.Error("Expected token to be considered expired (within 5 minute buffer)")
	}
}

// TestEnhancedGoogleCalendarService_SetDebugMode 测试调试模式
func TestEnhancedGoogleCalendarService_SetDebugMode(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(false)
	
	// 初始状态应该是非调试模式
	if service.debugMode {
		t.Error("Expected debug mode to be initially false")
	}
	
	// 设置调试模式
	service.SetDebugMode(true)
	if !service.debugMode {
		t.Error("Expected debug mode to be true after setting")
	}
	
	// 关闭调试模式
	service.SetDebugMode(false)
	if service.debugMode {
		t.Error("Expected debug mode to be false after setting")
	}
}

// TestEnhancedGoogleCalendarService_GetAPICallStats 测试API调用统计
func TestEnhancedGoogleCalendarService_GetAPICallStats(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(true)
	
	stats := service.GetAPICallStats()
	
	// 检查统计信息结构
	if stats["debug_mode"] != true {
		t.Error("Expected debug_mode to be true in stats")
	}
	
	retryConfig, ok := stats["retry_config"].(map[string]interface{})
	if !ok {
		t.Error("Expected retry_config to be present in stats")
	}
	
	if retryConfig["max_retries"] == nil {
		t.Error("Expected max_retries to be present in retry config")
	}
}

// TestGoogleCalendarEvent_Conversion 测试事件转换
func TestGoogleCalendarEvent_Conversion(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(false)
	
	// 创建测试事件
	originalEvent := &GoogleCalendarEvent{
		Summary:     "Test Event",
		Description: "Test Description",
		StartTime:   time.Now(),
		EndTime:     time.Now().Add(time.Hour),
		IsAllDay:    false,
		Attendees:   []string{"test@example.com"},
	}
	
	// 转换为Google格式
	googleEvent := service.convertOurEventToGoogle(originalEvent)
	
	if googleEvent.Summary != originalEvent.Summary {
		t.Errorf("Expected summary %s, got %s", originalEvent.Summary, googleEvent.Summary)
	}
	
	if googleEvent.Description != originalEvent.Description {
		t.Errorf("Expected description %s, got %s", originalEvent.Description, googleEvent.Description)
	}
	
	if len(googleEvent.Attendees) != 1 {
		t.Errorf("Expected 1 attendee, got %d", len(googleEvent.Attendees))
	}
	
	if googleEvent.Attendees[0].Email != "test@example.com" {
		t.Errorf("Expected attendee email test@example.com, got %s", googleEvent.Attendees[0].Email)
	}
}

// TestGoogleCalendarService_RevokeToken 测试撤销Token
func TestGoogleCalendarService_RevokeToken(t *testing.T) {
	// 创建测试服务器
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("Expected POST request, got %s", r.Method)
		}
		
		// 检查撤销URL格式
		if !contains(r.URL.String(), "token=test_token") {
			t.Error("Expected token parameter in revoke URL")
		}
		
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	
	service := NewEnhancedGoogleCalendarService(false)
	ctx := context.Background()
	
	// 注意：这里我们无法直接测试实际的撤销功能，因为它使用固定的Google端点
	// 在实际应用中，我们可能需要依赖注入来使其可测试
}

// TestBatchCreateEvents 测试批量创建事件
func TestBatchCreateEvents(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(false)
	ctx := context.Background()
	
	events := []*GoogleCalendarEvent{
		{
			Summary:   "Event 1",
			StartTime: time.Now(),
			EndTime:   time.Now().Add(time.Hour),
		},
		{
			Summary:   "Event 2", 
			StartTime: time.Now().Add(2 * time.Hour),
			EndTime:   time.Now().Add(3 * time.Hour),
		},
	}
	
	// 注意：这个测试需要有效的访问Token，在实际测试中应该使用模拟
	// 这里我们主要测试函数不会panic
	_, err := service.BatchCreateEvents(ctx, "invalid_token", "invalid_calendar", events)
	
	// 期望失败，因为使用的是无效Token
	if err == nil {
		t.Error("Expected error with invalid token")
	}
}

// TestTokenValidation 测试Token验证逻辑
func TestTokenValidation(t *testing.T) {
	testCases := []struct {
		name        string
		expiresAt   time.Time
		shouldExpire bool
	}{
		{
			name:        "Token expires in 10 minutes",
			expiresAt:   time.Now().Add(10 * time.Minute),
			shouldExpire: false,
		},
		{
			name:        "Token expires in 3 minutes",
			expiresAt:   time.Now().Add(3 * time.Minute),
			shouldExpire: true, // 5分钟缓冲期
		},
		{
			name:        "Token already expired",
			expiresAt:   time.Now().Add(-1 * time.Minute),
			shouldExpire: true,
		},
	}
	
	service := NewGoogleCalendarService()
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			isExpired := service.IsTokenExpired(tc.expiresAt)
			if isExpired != tc.shouldExpire {
				t.Errorf("Expected isExpired to be %v, got %v", tc.shouldExpire, isExpired)
			}
		})
	}
}

// TestEventTimeFormatting 测试事件时间格式化
func TestEventTimeFormatting(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(false)
	
	now := time.Now()
	
	// 测试全天事件
	allDayEvent := &GoogleCalendarEvent{
		Summary:   "All Day Event",
		StartTime: now,
		EndTime:   now.Add(24 * time.Hour),
		IsAllDay:  true,
	}
	
	googleEvent := service.convertOurEventToGoogle(allDayEvent)
	
	if googleEvent.Start.Date == "" {
		t.Error("Expected all-day event to have date field set")
	}
	
	if googleEvent.Start.DateTime != "" {
		t.Error("Expected all-day event to not have datetime field set")
	}
	
	// 测试定时事件
	timedEvent := &GoogleCalendarEvent{
		Summary:   "Timed Event",
		StartTime: now,
		EndTime:   now.Add(time.Hour),
		IsAllDay:  false,
	}
	
	googleTimedEvent := service.convertOurEventToGoogle(timedEvent)
	
	if googleTimedEvent.Start.DateTime == "" {
		t.Error("Expected timed event to have datetime field set")
	}
	
	if googleTimedEvent.Start.Date != "" {
		t.Error("Expected timed event to not have date field set")
	}
}

// TestErrorHandling 测试错误处理
func TestErrorHandling(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(false)
	ctx := context.Background()
	
	// 测试无效Token的情况
	err := service.ValidateToken(ctx, "invalid_token")
	if err == nil {
		t.Error("Expected error when validating invalid token")
	}
	
	// 测试空Token的情况
	_, err = service.RefreshToken(ctx, "")
	if err == nil {
		t.Error("Expected error when refreshing with empty token")
	}
}

// TestConcurrentRequests 测试并发请求
func TestConcurrentRequests(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(true)
	
	// 启动多个goroutine同时调用GetAuthURL
	const numGoroutines = 10
	results := make(chan string, numGoroutines)
	
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			state := fmt.Sprintf("state_%d", id)
			authURL := service.GetAuthURL(state)
			results <- authURL
		}(i)
	}
	
	// 收集结果
	urls := make([]string, numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		urls[i] = <-results
	}
	
	// 验证所有URL都不为空且不相同
	for i, url := range urls {
		if url == "" {
			t.Errorf("Expected non-empty URL for goroutine %d", i)
		}
		
		for j := i + 1; j < len(urls); j++ {
			if url == urls[j] {
				t.Errorf("Expected unique URLs, but goroutine %d and %d have same URL", i, j)
			}
		}
	}
}

// TestLogAPICall 测试API调用日志记录
func TestLogAPICall(t *testing.T) {
	service := NewEnhancedGoogleCalendarService(true) // 开启调试模式
	
	apiLog := &APICallLog{
		Timestamp:   time.Now(),
		Method:      "GET",
		Endpoint:    "test/endpoint",
		Duration:    100 * time.Millisecond,
		Success:     true,
		StatusCode:  200,
	}
	
	// 这个测试主要确保logAPICall不会panic
	service.logAPICall(apiLog)
	
	// 测试失败情况的日志
	failedLog := &APICallLog{
		Timestamp: time.Now(),
		Method:    "POST",
		Endpoint:  "test/endpoint",
		Duration:  200 * time.Millisecond,
		Success:   false,
		Error:     "Test error message",
	}
	
	service.logAPICall(failedLog)
}

// 辅助函数
func contains(s, substr string) bool {
	return len(s) >= len(substr) && findSubstring(s, substr) >= 0
}

func findSubstring(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

// BenchmarkGetAuthURL 基准测试授权URL生成
func BenchmarkGetAuthURL(b *testing.B) {
	service := NewGoogleCalendarService()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		state := fmt.Sprintf("state_%d", i)
		_ = service.GetAuthURL(state)
	}
}

// BenchmarkIsTokenExpired 基准测试Token过期检查
func BenchmarkIsTokenExpired(b *testing.B) {
	service := NewGoogleCalendarService()
	futureTime := time.Now().Add(10 * time.Minute)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = service.IsTokenExpired(futureTime)
	}
}

// 为了导入fmt包
import "fmt"