package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
)

// MockGoogleAuthRepository 模拟Google认证仓库
type MockGoogleAuthRepository struct {
	tokens        map[int]*models.GoogleToken
	getTokenError error
	updateError   error
	createLogCount int
}

func NewMockGoogleAuthRepository() *MockGoogleAuthRepository {
	return &MockGoogleAuthRepository{
		tokens: make(map[int]*models.GoogleToken),
	}
}

func (m *MockGoogleAuthRepository) GetGoogleToken(ctx context.Context, userID int) (*models.GoogleToken, error) {
	if m.getTokenError != nil {
		return nil, m.getTokenError
	}
	
	token, exists := m.tokens[userID]
	if !exists {
		return nil, errors.New("token not found")
	}
	
	return token, nil
}

func (m *MockGoogleAuthRepository) UpdateGoogleToken(ctx context.Context, token *models.GoogleToken) error {
	if m.updateError != nil {
		return m.updateError
	}
	
	m.tokens[token.UserID] = token
	return nil
}

func (m *MockGoogleAuthRepository) CreateSyncLog(ctx context.Context, log *models.GoogleSyncLog) error {
	m.createLogCount++
	return nil
}

// 实现其他必需的接口方法（为了满足接口要求）
func (m *MockGoogleAuthRepository) CreateOAuthState(ctx context.Context, userID int) (*models.OAuthState, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) GetOAuthState(ctx context.Context, state string) (*models.OAuthState, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) DeleteOAuthState(ctx context.Context, state string) error {
	return nil
}

func (m *MockGoogleAuthRepository) CleanupExpiredOAuthStates(ctx context.Context) (int, error) {
	return 0, nil
}

func (m *MockGoogleAuthRepository) SaveGoogleToken(ctx context.Context, token *models.GoogleToken) error {
	return nil
}

func (m *MockGoogleAuthRepository) DeleteGoogleToken(ctx context.Context, userID int) error {
	return nil
}

func (m *MockGoogleAuthRepository) SaveCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error {
	return nil
}

func (m *MockGoogleAuthRepository) GetUserCalendarSyncs(ctx context.Context, userID int) ([]*models.GoogleCalendarSync, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) UpdateCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error {
	return nil
}

func (m *MockGoogleAuthRepository) DeleteCalendarSync(ctx context.Context, userID int, calendarID string) error {
	return nil
}

func (m *MockGoogleAuthRepository) CreateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error {
	return nil
}

func (m *MockGoogleAuthRepository) GetEventMapping(ctx context.Context, taskID int) (*models.GoogleEventMapping, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) GetEventMappingByGoogleEventID(ctx context.Context, googleEventID string) (*models.GoogleEventMapping, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) UpdateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error {
	return nil
}

func (m *MockGoogleAuthRepository) DeleteEventMapping(ctx context.Context, taskID int) error {
	return nil
}

func (m *MockGoogleAuthRepository) GetUserEventMappings(ctx context.Context, userID int) ([]*models.GoogleEventMapping, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) GetUserSyncLogs(ctx context.Context, userID int, limit int) ([]*models.GoogleSyncLog, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) UpdateUserGooglePreferences(ctx context.Context, userID int, preferences models.GoogleSyncPreferences) error {
	return nil
}

func (m *MockGoogleAuthRepository) GetUserGooglePreferences(ctx context.Context, userID int) (*models.GoogleSyncPreferences, error) {
	return nil, nil
}

func (m *MockGoogleAuthRepository) SetUserGoogleCalendarEnabled(ctx context.Context, userID int, enabled bool) error {
	return nil
}

// MockEnhancedGoogleCalendarService 模拟增强版Google日历服务
type MockEnhancedGoogleCalendarService struct {
	validateTokenError error
	refreshTokenError  error
	refreshTokenResult *GoogleToken
}

func NewMockEnhancedGoogleCalendarService() *MockEnhancedGoogleCalendarService {
	return &MockEnhancedGoogleCalendarService{}
}

func (m *MockEnhancedGoogleCalendarService) ValidateToken(ctx context.Context, accessToken string) error {
	return m.validateTokenError
}

func (m *MockEnhancedGoogleCalendarService) RefreshToken(ctx context.Context, refreshToken string) (*GoogleToken, error) {
	if m.refreshTokenError != nil {
		return nil, m.refreshTokenError
	}
	
	if m.refreshTokenResult != nil {
		return m.refreshTokenResult, nil
	}
	
	return &GoogleToken{
		AccessToken:  "new_access_token",
		RefreshToken: "new_refresh_token",
		TokenType:    "Bearer",
		ExpiresAt:    time.Now().Add(time.Hour),
	}, nil
}

// TestNewTokenRefreshService 测试创建Token刷新服务
func TestNewTokenRefreshService(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	// 测试默认刷新间隔
	service := NewTokenRefreshService(mockGoogleService, mockRepo, 0)
	if service.refreshInterval != 10*time.Minute {
		t.Errorf("Expected default refresh interval to be 10 minutes, got %v", service.refreshInterval)
	}
	
	// 测试自定义刷新间隔
	customInterval := 5 * time.Minute
	service2 := NewTokenRefreshService(mockGoogleService, mockRepo, customInterval)
	if service2.refreshInterval != customInterval {
		t.Errorf("Expected custom refresh interval to be %v, got %v", customInterval, service2.refreshInterval)
	}
	
	// 验证初始状态
	if service.isRunning {
		t.Error("Expected service to not be running initially")
	}
	
	if service.refreshStats == nil {
		t.Error("Expected refresh stats to be initialized")
	}
}

// TestTokenRefreshService_StartStop 测试启动和停止服务
func TestTokenRefreshService_StartStop(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, 100*time.Millisecond)
	ctx := context.Background()
	
	// 测试启动服务
	err := service.Start(ctx)
	if err != nil {
		t.Errorf("Expected no error when starting service, got: %v", err)
	}
	
	if !service.IsRunning() {
		t.Error("Expected service to be running after start")
	}
	
	// 测试重复启动（应该失败）
	err = service.Start(ctx)
	if err == nil {
		t.Error("Expected error when starting already running service")
	}
	
	// 给服务一点时间运行
	time.Sleep(50 * time.Millisecond)
	
	// 测试停止服务
	err = service.Stop()
	if err != nil {
		t.Errorf("Expected no error when stopping service, got: %v", err)
	}
	
	if service.IsRunning() {
		t.Error("Expected service to not be running after stop")
	}
	
	// 测试重复停止（应该失败）
	err = service.Stop()
	if err == nil {
		t.Error("Expected error when stopping already stopped service")
	}
}

// TestTokenRefreshService_RefreshGoogleToken 测试Token刷新功能
func TestTokenRefreshService_RefreshGoogleToken(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 123
	
	// 准备一个需要刷新的Token
	expiredToken := &models.GoogleToken{
		ID:                     1,
		UserID:                 userID,
		AccessTokenEncrypted:   "encrypted_access_token",
		RefreshTokenEncrypted:  "encrypted_refresh_token",
		TokenType:              "Bearer",
		ExpiresAt:              time.Now().Add(-time.Hour), // 已过期
		Scopes:                 []string{"https://www.googleapis.com/auth/calendar"},
		CreatedAt:              time.Now().Add(-24 * time.Hour),
		UpdatedAt:              time.Now().Add(-time.Hour),
	}
	
	mockRepo.tokens[userID] = expiredToken
	
	// 测试成功刷新
	result, err := service.RefreshGoogleToken(ctx, userID)
	if err != nil {
		t.Errorf("Expected successful token refresh, got error: %v", err)
	}
	
	if !result.Success {
		t.Errorf("Expected successful result, got error: %s", result.Error)
	}
	
	if result.UserID != userID {
		t.Errorf("Expected userID %d, got %d", userID, result.UserID)
	}
	
	if result.Duration == 0 {
		t.Error("Expected non-zero refresh duration")
	}
	
	// 验证Token已更新
	updatedToken, exists := mockRepo.tokens[userID]
	if !exists {
		t.Error("Expected token to exist after refresh")
	}
	
	if updatedToken.LastRefreshAt == nil {
		t.Error("Expected LastRefreshAt to be set after refresh")
	}
}

// TestTokenRefreshService_RefreshTokenNotNeeded 测试不需要刷新的Token
func TestTokenRefreshService_RefreshTokenNotNeeded(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 123
	
	// 准备一个不需要刷新的Token
	validToken := &models.GoogleToken{
		ID:                     1,
		UserID:                 userID,
		AccessTokenEncrypted:   "encrypted_access_token",
		RefreshTokenEncrypted:  "encrypted_refresh_token",
		TokenType:              "Bearer",
		ExpiresAt:              time.Now().Add(time.Hour), // 一小时后过期
		Scopes:                 []string{"https://www.googleapis.com/auth/calendar"},
		CreatedAt:              time.Now().Add(-24 * time.Hour),
		UpdatedAt:              time.Now().Add(-time.Hour),
	}
	
	mockRepo.tokens[userID] = validToken
	
	// 测试刷新（应该跳过）
	result, err := service.RefreshGoogleToken(ctx, userID)
	if err != nil {
		t.Errorf("Expected no error for valid token, got: %v", err)
	}
	
	if !result.Success {
		t.Errorf("Expected successful result for valid token, got error: %s", result.Error)
	}
	
	if !contains(result.Error, "does not need refresh") {
		t.Errorf("Expected result to indicate token doesn't need refresh, got: %s", result.Error)
	}
}

// TestTokenRefreshService_RefreshTokenError 测试Token刷新失败
func TestTokenRefreshService_RefreshTokenError(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	// 设置Google服务返回错误
	mockGoogleService.refreshTokenError = errors.New("token refresh failed")
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 123
	
	// 准备一个需要刷新的Token
	expiredToken := &models.GoogleToken{
		ID:                     1,
		UserID:                 userID,
		AccessTokenEncrypted:   "encrypted_access_token",
		RefreshTokenEncrypted:  "encrypted_refresh_token",
		TokenType:              "Bearer",
		ExpiresAt:              time.Now().Add(-time.Hour), // 已过期
		Scopes:                 []string{"https://www.googleapis.com/auth/calendar"},
	}
	
	mockRepo.tokens[userID] = expiredToken
	
	// 测试刷新失败
	result, err := service.RefreshGoogleToken(ctx, userID)
	if err == nil {
		t.Error("Expected error when token refresh fails")
	}
	
	if result.Success {
		t.Error("Expected unsuccessful result when token refresh fails")
	}
	
	if !contains(result.Error, "failed to refresh token") {
		t.Errorf("Expected error message about token refresh failure, got: %s", result.Error)
	}
}

// TestTokenRefreshService_GetTokenNotFound 测试Token不存在的情况
func TestTokenRefreshService_GetTokenNotFound(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 999 // 不存在的用户ID
	
	// 测试刷新不存在的Token
	result, err := service.RefreshGoogleToken(ctx, userID)
	if err == nil {
		t.Error("Expected error when token doesn't exist")
	}
	
	if result.Success {
		t.Error("Expected unsuccessful result when token doesn't exist")
	}
	
	if !contains(result.Error, "failed to get current token") {
		t.Errorf("Expected error message about getting current token, got: %s", result.Error)
	}
}

// TestTokenRefreshService_ValidateToken 测试Token验证
func TestTokenRefreshService_ValidateToken(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 123
	
	// 准备Token
	token := &models.GoogleToken{
		ID:                     1,
		UserID:                 userID,
		AccessTokenEncrypted:   "encrypted_access_token",
		RefreshTokenEncrypted:  "encrypted_refresh_token",
		TokenType:              "Bearer",
		ExpiresAt:              time.Now().Add(time.Hour),
		Scopes:                 []string{"https://www.googleapis.com/auth/calendar"},
	}
	
	mockRepo.tokens[userID] = token
	
	// 测试验证成功
	err := service.ValidateToken(ctx, userID)
	if err != nil {
		t.Errorf("Expected successful token validation, got error: %v", err)
	}
	
	// 测试验证失败
	mockGoogleService.validateTokenError = errors.New("token validation failed")
	err = service.ValidateToken(ctx, userID)
	if err == nil {
		t.Error("Expected error when token validation fails")
	}
}

// TestTokenRefreshService_GetRefreshStats 测试获取刷新统计
func TestTokenRefreshService_GetRefreshStats(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	
	// 获取初始统计
	stats := service.GetRefreshStats()
	if stats == nil {
		t.Error("Expected non-nil stats")
	}
	
	if stats.TotalRefreshAttempts != 0 {
		t.Errorf("Expected 0 total refresh attempts, got %d", stats.TotalRefreshAttempts)
	}
	
	if stats.RefreshSuccessRate != 0 {
		t.Errorf("Expected 0%% success rate, got %f%%", stats.RefreshSuccessRate)
	}
	
	// 模拟一些统计数据
	service.refreshStats.TotalRefreshAttempts = 10
	service.refreshStats.SuccessfulRefreshes = 8
	
	stats = service.GetRefreshStats()
	expectedRate := 80.0
	if stats.RefreshSuccessRate != expectedRate {
		t.Errorf("Expected %f%% success rate, got %f%%", expectedRate, stats.RefreshSuccessRate)
	}
}

// TestTokenRefreshService_ResetStats 测试重置统计
func TestTokenRefreshService_ResetStats(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	
	// 设置一些统计数据
	service.refreshStats.TotalRefreshAttempts = 10
	service.refreshStats.SuccessfulRefreshes = 8
	service.refreshStats.LastRefreshTime = time.Now()
	
	// 重置统计
	service.ResetStats()
	
	stats := service.GetRefreshStats()
	if stats.TotalRefreshAttempts != 0 {
		t.Errorf("Expected 0 total refresh attempts after reset, got %d", stats.TotalRefreshAttempts)
	}
	
	if stats.SuccessfulRefreshes != 0 {
		t.Errorf("Expected 0 successful refreshes after reset, got %d", stats.SuccessfulRefreshes)
	}
}

// TestTokenRefreshService_GetUserTokenStatus 测试获取用户Token状态
func TestTokenRefreshService_GetUserTokenStatus(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 123
	
	// 准备Token
	token := &models.GoogleToken{
		ID:                     1,
		UserID:                 userID,
		AccessTokenEncrypted:   "encrypted_access_token",
		RefreshTokenEncrypted:  "encrypted_refresh_token",
		TokenType:              "Bearer",
		ExpiresAt:              time.Now().Add(time.Hour),
		Scopes:                 []string{"https://www.googleapis.com/auth/calendar"},
	}
	
	mockRepo.tokens[userID] = token
	
	// 获取Token状态
	status, err := service.GetUserTokenStatus(ctx, userID)
	if err != nil {
		t.Errorf("Expected no error getting token status, got: %v", err)
	}
	
	// 验证状态信息
	if status["user_id"] != userID {
		t.Errorf("Expected user_id %d, got %v", userID, status["user_id"])
	}
	
	if status["token_exists"] != true {
		t.Error("Expected token_exists to be true")
	}
	
	if status["is_expired"] != false {
		t.Error("Expected is_expired to be false for valid token")
	}
}

// TestTokenRefreshService_ForceRefreshToken 测试强制刷新Token
func TestTokenRefreshService_ForceRefreshToken(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 123
	
	// 准备一个有效的Token（通常不需要刷新）
	validToken := &models.GoogleToken{
		ID:                     1,
		UserID:                 userID,
		AccessTokenEncrypted:   "encrypted_access_token",
		RefreshTokenEncrypted:  "encrypted_refresh_token",
		TokenType:              "Bearer",
		ExpiresAt:              time.Now().Add(2 * time.Hour), // 2小时后过期
		Scopes:                 []string{"https://www.googleapis.com/auth/calendar"},
	}
	
	mockRepo.tokens[userID] = validToken
	
	// 强制刷新Token
	result, err := service.ForceRefreshToken(ctx, userID)
	if err != nil {
		t.Errorf("Expected successful force refresh, got error: %v", err)
	}
	
	if !result.Success {
		t.Errorf("Expected successful force refresh result, got error: %s", result.Error)
	}
	
	// 验证统计信息已更新
	stats := service.GetRefreshStats()
	if stats.TotalRefreshAttempts != 1 {
		t.Errorf("Expected 1 total refresh attempt, got %d", stats.TotalRefreshAttempts)
	}
	
	if stats.SuccessfulRefreshes != 1 {
		t.Errorf("Expected 1 successful refresh, got %d", stats.SuccessfulRefreshes)
	}
}

// TestTokenRefreshService_HealthCheck 测试健康检查
func TestTokenRefreshService_HealthCheck(t *testing.T) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	refreshInterval := 5 * time.Minute
	service := NewTokenRefreshService(mockGoogleService, mockRepo, refreshInterval)
	
	health := service.HealthCheck()
	
	if health["service_running"] != false {
		t.Error("Expected service_running to be false initially")
	}
	
	if health["refresh_interval"] != refreshInterval {
		t.Errorf("Expected refresh_interval to be %v, got %v", refreshInterval, health["refresh_interval"])
	}
	
	if health["stats"] == nil {
		t.Error("Expected stats to be present in health check")
	}
	
	if health["last_check_time"] == nil {
		t.Error("Expected last_check_time to be present in health check")
	}
}

// BenchmarkRefreshGoogleToken 基准测试Token刷新
func BenchmarkRefreshGoogleToken(b *testing.B) {
	mockGoogleService := NewMockEnhancedGoogleCalendarService()
	mockRepo := NewMockGoogleAuthRepository()
	
	service := NewTokenRefreshService(mockGoogleService, mockRepo, time.Minute)
	ctx := context.Background()
	
	userID := 123
	
	// 准备Token
	token := &models.GoogleToken{
		ID:                     1,
		UserID:                 userID,
		AccessTokenEncrypted:   "encrypted_access_token",
		RefreshTokenEncrypted:  "encrypted_refresh_token",
		TokenType:              "Bearer",
		ExpiresAt:              time.Now().Add(-time.Hour), // 已过期
		Scopes:                 []string{"https://www.googleapis.com/auth/calendar"},
	}
	
	mockRepo.tokens[userID] = token
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = service.RefreshGoogleToken(ctx, userID)
	}
}

// contains 辅助函数，检查字符串是否包含子字符串
func contains(s, substr string) bool {
	return len(s) >= len(substr) && findIndex(s, substr) >= 0
}

func findIndex(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}