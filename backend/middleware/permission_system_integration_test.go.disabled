package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/security"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockPermissionRepository is a mock implementation of PermissionRepository
type MockPermissionRepository struct {
	mock.Mock
}

func (m *MockPermissionRepository) GetRoles(ctx context.Context, companyID *int) ([]*models.CompanyRole, error) {
	args := m.Called(ctx, companyID)
	return args.Get(0).([]*models.CompanyRole), args.Error(1)
}

func (m *MockPermissionRepository) CheckUserPermission(ctx context.Context, companyUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCode, resourceID)
	return args.Get(0).(*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepository) CheckMultiplePermissions(ctx context.Context, companyUserID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	args := m.Called(ctx, companyUserID, permissionCodes, resourceID)
	return args.Get(0).(map[string]*models.PermissionResult), args.Error(1)
}

func (m *MockPermissionRepository) GetUserPermissions(ctx context.Context, companyUserID int) (*models.UserPermissionSummary, error) {
	args := m.Called(ctx, companyUserID)
	return args.Get(0).(*models.UserPermissionSummary), args.Error(1)
}

// MockAuditRepository is a mock implementation of AuditRepository
type MockAuditRepository struct {
	mock.Mock
}

func (m *MockAuditRepository) CreateAuditEntry(ctx context.Context, entry *models.AuditEntry) error {
	args := m.Called(ctx, entry)
	return args.Error(0)
}

// MockRedisClient is a mock Redis client for testing
type MockRedisClient struct {
	data map[string]string
}

func NewMockRedisClient() *MockRedisClient {
	return &MockRedisClient{
		data: make(map[string]string),
	}
}

func (m *MockRedisClient) Get(ctx context.Context, key string) *redis.StringCmd {
	cmd := redis.NewStringCmd(ctx)
	if value, exists := m.data[key]; exists {
		cmd.SetVal(value)
	} else {
		cmd.SetErr(redis.Nil)
	}
	return cmd
}

func (m *MockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	cmd := redis.NewStatusCmd(ctx)
	m.data[key] = fmt.Sprintf("%v", value)
	cmd.SetVal("OK")
	return cmd
}

func (m *MockRedisClient) Del(ctx context.Context, keys ...string) *redis.IntCmd {
	cmd := redis.NewIntCmd(ctx)
	deleted := 0
	for _, key := range keys {
		if _, exists := m.data[key]; exists {
			delete(m.data, key)
			deleted++
		}
	}
	cmd.SetVal(int64(deleted))
	return cmd
}

func (m *MockRedisClient) Keys(ctx context.Context, pattern string) *redis.StringSliceCmd {
	cmd := redis.NewStringSliceCmd(ctx)
	keys := make([]string, 0)
	for key := range m.data {
		// Simple pattern matching - in real implementation you'd use proper pattern matching
		if strings.Contains(key, strings.Replace(pattern, "*", "", -1)) {
			keys = append(keys, key)
		}
	}
	cmd.SetVal(keys)
	return cmd
}

func (m *MockRedisClient) Info(ctx context.Context, section ...string) *redis.StringCmd {
	cmd := redis.NewStringCmd(ctx)
	cmd.SetVal("mock redis info")
	return cmd
}

// TestPermissionCacheMiddleware tests the permission cache middleware
func TestPermissionCacheMiddleware(t *testing.T) {
	// Setup mocks
	mockPermRepo := &MockPermissionRepository{}
	mockRedis := NewMockRedisClient()
	rateLimiter := security.NewRateLimiter()

	// Create cache middleware
	cacheMiddleware := NewPermissionCacheMiddleware(&PermissionCacheConfig{
		RedisClient:    mockRedis,
		PermissionRepo: mockPermRepo,
		RateLimiter:    rateLimiter,
		CacheTTL:       15 * time.Minute,
		Enabled:        true,
	})

	ctx := context.Background()

	t.Run("Cache Miss - First Permission Check", func(t *testing.T) {
		// Setup mock expectation
		expectedResult := &models.PermissionResult{
			HasPermission: true,
			Source:        "role",
			Reason:        "Permission granted through role",
		}
		mockPermRepo.On("CheckUserPermission", ctx, 1, "project.read", (*int)(nil)).Return(expectedResult, nil)

		// Check permission
		result, err := cacheMiddleware.CheckCachedPermission(ctx, 1, "project.read", nil)

		assert.NoError(t, err)
		assert.Equal(t, expectedResult.HasPermission, result.HasPermission)
		assert.Equal(t, expectedResult.Source, result.Source)
		mockPermRepo.AssertExpectations(t)
	})

	t.Run("Cache Hit - Second Permission Check", func(t *testing.T) {
		// Second call should use cache, so no mock call expected
		result, err := cacheMiddleware.CheckCachedPermission(ctx, 1, "project.read", nil)

		assert.NoError(t, err)
		assert.Equal(t, true, result.HasPermission)
		assert.Equal(t, "role", result.Source)
	})

	t.Run("Batch Permission Check", func(t *testing.T) {
		permissions := []string{"project.write", "task.create"}

		// Mock expectations for uncached permissions
		writeResult := &models.PermissionResult{
			HasPermission: true,
			Source:        "role",
			Reason:        "Permission granted",
		}
		createResult := &models.PermissionResult{
			HasPermission: false,
			Source:        "denied",
			Reason:        "Permission denied",
		}

		expectedResults := map[string]*models.PermissionResult{
			"project.write": writeResult,
			"task.create":   createResult,
		}

		mockPermRepo.On("CheckMultiplePermissions", ctx, 1, permissions, (*int)(nil)).Return(expectedResults, nil)

		// Check batch permissions
		results, err := cacheMiddleware.BatchCheckCachedPermissions(ctx, 1, permissions, nil)

		assert.NoError(t, err)
		assert.Len(t, results, 2)
		assert.Equal(t, writeResult.HasPermission, results["project.write"].HasPermission)
		assert.Equal(t, createResult.HasPermission, results["task.create"].HasPermission)
		mockPermRepo.AssertExpectations(t)
	})

	t.Run("Cache Invalidation", func(t *testing.T) {
		// Invalidate user cache
		err := cacheMiddleware.InvalidateUserPermissions(ctx, 1)
		assert.NoError(t, err)
	})
}

// TestUnifiedPermissionManager tests the unified permission manager
func TestUnifiedPermissionManager(t *testing.T) {
	// Setup mocks
	mockPermRepo := &MockPermissionRepository{}
	mockAuditRepo := &MockAuditRepository{}
	mockRedis := NewMockRedisClient()
	rateLimiter := security.NewRateLimiter()

	// Create unified permission manager
	manager := NewUnifiedPermissionManager(&UnifiedPermissionConfig{
		RedisClient:        mockRedis,
		PermissionRepo:     mockPermRepo,
		AuditRepo:          mockAuditRepo,
		RateLimiter:        rateLimiter,
		CacheTTL:           15 * time.Minute,
		EnableCache:        true,
		EnableAuditLogging: true,
		EnableRateLimit:    true,
	})

	ctx := context.Background()

	t.Run("Single Permission Check", func(t *testing.T) {
		// Setup mock expectation
		expectedResult := &models.PermissionResult{
			HasPermission: true,
			Source:        "role",
			Reason:        "Permission granted through role",
		}
		mockPermRepo.On("CheckUserPermission", ctx, 1, "project.read", (*int)(nil)).Return(expectedResult, nil)

		// Expect audit log creation
		mockAuditRepo.On("CreateAuditEntry", ctx, mock.AnythingOfType("*models.AuditEntry")).Return(nil)

		request := &PermissionCheckRequest{
			CompanyUserID:   1,
			PermissionCode:  "project.read",
			ResourceID:      nil,
			EnableOverrides: true,
		}

		response, err := manager.CheckPermission(ctx, request)

		assert.NoError(t, err)
		assert.Equal(t, expectedResult.HasPermission, response.HasPermission)
		assert.Equal(t, expectedResult.Source, response.Source)
		assert.True(t, response.CacheHit)
		mockPermRepo.AssertExpectations(t)
	})

	t.Run("Batch Permission Check", func(t *testing.T) {
		permissions := []PermissionCheck{
			{PermissionCode: "project.write", ResourceID: nil},
			{PermissionCode: "task.create", ResourceID: nil},
		}

		request := &BatchPermissionRequest{
			CompanyUserID:   1,
			Permissions:     permissions,
			EnableOverrides: true,
		}

		// Mock expectations
		expectedResults := map[string]*models.PermissionResult{
			"project.write": {HasPermission: true, Source: "role", Reason: "Granted"},
			"task.create":   {HasPermission: false, Source: "denied", Reason: "Denied"},
		}
		mockPermRepo.On("CheckMultiplePermissions", ctx, 1, []string{"project.write", "task.create"}, (*int)(nil)).Return(expectedResults, nil)
		mockAuditRepo.On("CreateAuditEntry", ctx, mock.AnythingOfType("*models.AuditEntry")).Return(nil)

		response, err := manager.CheckBatchPermissions(ctx, request)

		assert.NoError(t, err)
		assert.Len(t, response.Results, 2)
		assert.Equal(t, true, response.Results["project.write"].HasPermission)
		assert.Equal(t, false, response.Results["task.create"].HasPermission)
		mockPermRepo.AssertExpectations(t)
	})

	t.Run("Rate Limiting", func(t *testing.T) {
		// Make many requests to trigger rate limiting
		request := &PermissionCheckRequest{
			CompanyUserID:   2,
			PermissionCode:  "test.permission",
			EnableOverrides: true,
		}

		// First few requests should work
		for i := 0; i < 5; i++ {
			mockPermRepo.On("CheckUserPermission", ctx, 2, "test.permission", (*int)(nil)).Return(&models.PermissionResult{
				HasPermission: true,
				Source:        "test",
				Reason:        "Test permission",
			}, nil).Once()
			mockAuditRepo.On("CreateAuditEntry", ctx, mock.AnythingOfType("*models.AuditEntry")).Return(nil).Once()

			response, err := manager.CheckPermission(ctx, request)
			assert.NoError(t, err)
			assert.True(t, response.HasPermission)
		}
	})
}

// TestPermissionPredictor tests the permission predictor
func TestPermissionPredictor(t *testing.T) {
	// Setup mocks
	mockPermRepo := &MockPermissionRepository{}

	predictor := NewPermissionPredictor(&PermissionPredictionConfig{
		PermissionRepo: mockPermRepo,
		UpdateInterval: 1 * time.Hour,
		MinFrequency:   0.1,
		MaxPredictions: 20,
	})

	ctx := context.Background()

	t.Run("Predict User Permissions", func(t *testing.T) {
		// Mock user permissions
		userPermissions := &models.UserPermissionSummary{
			Role: &models.CompanyRole{
				RoleCode: "developer",
				RoleName: "Developer",
			},
		}
		mockPermRepo.On("GetUserPermissions", ctx, 1).Return(userPermissions, nil)

		predictions, err := predictor.PredictUserPermissions(ctx, 1)

		assert.NoError(t, err)
		assert.Greater(t, len(predictions), 0)
		assert.Contains(t, predictions, "project.list.read")
		mockPermRepo.AssertExpectations(t)
	})

	t.Run("Get User Permission Profile", func(t *testing.T) {
		userPermissions := &models.UserPermissionSummary{
			Role: &models.CompanyRole{
				RoleCode: "project_manager",
				RoleName: "Project Manager",
			},
		}
		mockPermRepo.On("GetUserPermissions", ctx, 2).Return(userPermissions, nil)

		profile, err := predictor.GetUserPermissionProfile(ctx, 2)

		assert.NoError(t, err)
		assert.Equal(t, 2, profile.CompanyUserID)
		assert.Equal(t, "project_manager", profile.RoleCode)
		assert.Greater(t, len(profile.PredictedPermissions), 0)
		assert.Greater(t, len(profile.FrequentPermissions), 0)
		mockPermRepo.AssertExpectations(t)
	})

	t.Run("Permission Recommendations", func(t *testing.T) {
		userPermissions := &models.UserPermissionSummary{
			Role: &models.CompanyRole{
				RoleCode: "company_admin",
				RoleName: "Company Admin",
			},
		}
		mockPermRepo.On("GetUserPermissions", ctx, 3).Return(userPermissions, nil)

		recommendations, err := predictor.GetPermissionRecommendations(ctx, 3)

		assert.NoError(t, err)
		assert.Greater(t, len(recommendations), 0)
		mockPermRepo.AssertExpectations(t)
	})
}

// TestMiddlewareIntegration tests the integration between middleware components
func TestMiddlewareIntegration(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Setup mocks
	mockPermRepo := &MockPermissionRepository{}
	mockRedis := NewMockRedisClient()
	rateLimiter := security.NewRateLimiter()

	// Create unified permission manager
	manager := NewUnifiedPermissionManager(&UnifiedPermissionConfig{
		RedisClient:        mockRedis,
		PermissionRepo:     mockPermRepo,
		RateLimiter:        rateLimiter,
		CacheTTL:           15 * time.Minute,
		EnableCache:        true,
		EnableAuditLogging: false, // Disable for integration test
		EnableRateLimit:    false, // Disable for integration test
	})

	t.Run("Gin Middleware Integration", func(t *testing.T) {
		// Create Gin router
		router := gin.New()

		// Setup test route with permission middleware
		expectedResult := &models.PermissionResult{
			HasPermission: true,
			Source:        "role",
			Reason:        "Permission granted",
		}
		mockPermRepo.On("CheckUserPermission", mock.Anything, 1, "project.read", (*int)(nil)).Return(expectedResult, nil)

		// Add middleware that sets company_user_id
		router.Use(func(c *gin.Context) {
			c.Set("company_user_id", 1)
			c.Next()
		})

		// Add permission middleware
		router.Use(manager.CreatePermissionMiddleware("project.read"))

		// Add test handler
		router.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})

		// Test request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		mockPermRepo.AssertExpectations(t)
	})

	t.Run("Permission Denied Integration", func(t *testing.T) {
		// Create new router for permission denied test
		router := gin.New()

		// Setup test route with permission middleware that denies access
		deniedResult := &models.PermissionResult{
			HasPermission: false,
			Source:        "role",
			Reason:        "Permission denied",
		}
		mockPermRepo.On("CheckUserPermission", mock.Anything, 2, "admin.access", (*int)(nil)).Return(deniedResult, nil)

		// Add middleware that sets company_user_id
		router.Use(func(c *gin.Context) {
			c.Set("company_user_id", 2)
			c.Next()
		})

		// Add permission middleware
		router.Use(manager.CreatePermissionMiddleware("admin.access"))

		// Add test handler
		router.GET("/admin", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "admin success"})
		})

		// Test request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/admin", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "Permission denied", response["error"])
		mockPermRepo.AssertExpectations(t)
	})
}

// BenchmarkPermissionCache benchmarks permission caching performance
func BenchmarkPermissionCache(b *testing.B) {
	// Setup
	mockPermRepo := &MockPermissionRepository{}
	mockRedis := NewMockRedisClient()
	rateLimiter := security.NewRateLimiter()

	cacheMiddleware := NewPermissionCacheMiddleware(&PermissionCacheConfig{
		RedisClient:    mockRedis,
		PermissionRepo: mockPermRepo,
		RateLimiter:    rateLimiter,
		CacheTTL:       15 * time.Minute,
		Enabled:        true,
	})

	ctx := context.Background()

	// Setup mock to always return permission granted
	mockPermRepo.On("CheckUserPermission", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&models.PermissionResult{
		HasPermission: true,
		Source:        "role",
		Reason:        "Test permission",
	}, nil)

	b.ResetTimer()

	// Benchmark cache performance
	b.Run("CachedPermissionCheck", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			userID := i % 100                                    // Simulate 100 different users
			permissionCode := fmt.Sprintf("permission.%d", i%10) // 10 different permissions

			_, err := cacheMiddleware.CheckCachedPermission(ctx, userID, permissionCode, nil)
			if err != nil {
				b.Errorf("Permission check failed: %v", err)
			}
		}
	})

	b.Run("BatchPermissionCheck", func(b *testing.B) {
		permissions := []string{"perm1", "perm2", "perm3", "perm4", "perm5"}
		mockPermRepo.On("CheckMultiplePermissions", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(map[string]*models.PermissionResult{
			"perm1": {HasPermission: true, Source: "role", Reason: "Test"},
			"perm2": {HasPermission: true, Source: "role", Reason: "Test"},
			"perm3": {HasPermission: false, Source: "denied", Reason: "Test"},
			"perm4": {HasPermission: true, Source: "role", Reason: "Test"},
			"perm5": {HasPermission: false, Source: "denied", Reason: "Test"},
		}, nil)

		for i := 0; i < b.N; i++ {
			userID := i % 50 // Simulate 50 different users

			_, err := cacheMiddleware.BatchCheckCachedPermissions(ctx, userID, permissions, nil)
			if err != nil {
				b.Errorf("Batch permission check failed: %v", err)
			}
		}
	})
}

// TestPermissionSystemLoad tests the system under load
func TestPermissionSystemLoad(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping load test in short mode")
	}

	// Setup
	mockPermRepo := &MockPermissionRepository{}
	mockRedis := NewMockRedisClient()
	rateLimiter := security.NewRateLimiter()

	manager := NewUnifiedPermissionManager(&UnifiedPermissionConfig{
		RedisClient:        mockRedis,
		PermissionRepo:     mockPermRepo,
		RateLimiter:        rateLimiter,
		CacheTTL:           15 * time.Minute,
		EnableCache:        true,
		EnableAuditLogging: false,
		EnableRateLimit:    false,
	})

	ctx := context.Background()

	// Setup mock responses
	mockPermRepo.On("CheckUserPermission", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(&models.PermissionResult{
		HasPermission: true,
		Source:        "role",
		Reason:        "Load test permission",
	}, nil)

	// Concurrent permission checks
	t.Run("ConcurrentPermissionChecks", func(t *testing.T) {
		const numGoroutines = 100
		const checksPerGoroutine = 100

		done := make(chan bool, numGoroutines)
		errors := make(chan error, numGoroutines*checksPerGoroutine)

		start := time.Now()

		// Start goroutines
		for i := 0; i < numGoroutines; i++ {
			go func(goroutineID int) {
				defer func() { done <- true }()

				for j := 0; j < checksPerGoroutine; j++ {
					request := &PermissionCheckRequest{
						CompanyUserID:   goroutineID%10 + 1,                // Simulate 10 users
						PermissionCode:  fmt.Sprintf("permission.%d", j%5), // 5 permissions
						EnableOverrides: true,
					}

					_, err := manager.CheckPermission(ctx, request)
					if err != nil {
						errors <- err
					}
				}
			}(i)
		}

		// Wait for all goroutines to complete
		for i := 0; i < numGoroutines; i++ {
			<-done
		}

		elapsed := time.Since(start)
		totalChecks := numGoroutines * checksPerGoroutine

		// Check for errors
		close(errors)
		errorCount := 0
		for err := range errors {
			errorCount++
			t.Logf("Error: %v", err)
		}

		assert.Equal(t, 0, errorCount, "Should have no errors during load test")

		// Performance metrics
		avgTime := elapsed / time.Duration(totalChecks)
		checksPerSecond := float64(totalChecks) / elapsed.Seconds()

		t.Logf("Load test completed:")
		t.Logf("  Total checks: %d", totalChecks)
		t.Logf("  Total time: %v", elapsed)
		t.Logf("  Average time per check: %v", avgTime)
		t.Logf("  Checks per second: %.2f", checksPerSecond)

		// Assert performance requirements
		assert.Less(t, avgTime.Milliseconds(), int64(50), "Average permission check should be under 50ms")
		assert.Greater(t, checksPerSecond, float64(1000), "Should handle at least 1000 checks per second")
	})
}

// TestCacheConsistency tests cache consistency and invalidation
func TestCacheConsistency(t *testing.T) {
	// Setup
	mockPermRepo := &MockPermissionRepository{}
	mockRedis := NewMockRedisClient()
	rateLimiter := security.NewRateLimiter()

	cacheMiddleware := NewPermissionCacheMiddleware(&PermissionCacheConfig{
		RedisClient:    mockRedis,
		PermissionRepo: mockPermRepo,
		RateLimiter:    rateLimiter,
		CacheTTL:       15 * time.Minute,
		Enabled:        true,
	})

	ctx := context.Background()

	t.Run("Cache Consistency After Permission Change", func(t *testing.T) {
		// Initial permission check - should be cached
		initialResult := &models.PermissionResult{
			HasPermission: true,
			Source:        "role",
			Reason:        "Initial permission",
		}
		mockPermRepo.On("CheckUserPermission", ctx, 1, "test.permission", (*int)(nil)).Return(initialResult, nil).Once()

		result1, err := cacheMiddleware.CheckCachedPermission(ctx, 1, "test.permission", nil)
		assert.NoError(t, err)
		assert.True(t, result1.HasPermission)

		// Second check should use cache (no additional mock call)
		result2, err := cacheMiddleware.CheckCachedPermission(ctx, 1, "test.permission", nil)
		assert.NoError(t, err)
		assert.True(t, result2.HasPermission)

		// Invalidate cache
		err = cacheMiddleware.InvalidateUserPermissions(ctx, 1)
		assert.NoError(t, err)

		// Third check after invalidation should query database again
		updatedResult := &models.PermissionResult{
			HasPermission: false,
			Source:        "denied",
			Reason:        "Permission revoked",
		}
		mockPermRepo.On("CheckUserPermission", ctx, 1, "test.permission", (*int)(nil)).Return(updatedResult, nil).Once()

		result3, err := cacheMiddleware.CheckCachedPermission(ctx, 1, "test.permission", nil)
		assert.NoError(t, err)
		assert.False(t, result3.HasPermission)

		mockPermRepo.AssertExpectations(t)
	})
}
