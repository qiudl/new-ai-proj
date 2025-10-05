package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimiter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 2,
		BurstSize:         4,
	})

	// 创建测试路由
	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// 测试正常请求（突发4个请求应该都能通过）
	for i := 0; i < 4; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.100:12345"

		router.ServeHTTP(w, req)

		if w.Code == http.StatusTooManyRequests {
			t.Errorf("Request %d should not be rate limited, got status %d", i, w.Code)
		}
	}

	// 测试超限请求（第5个请求应该被限制）
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.100:12345"

	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("5th request should be rate limited, got status %d", w.Code)
	}

	// 验证错误响应格式
	if w.Body.String() == "" {
		t.Error("Response body should not be empty")
	}
}

func TestRateLimiterRecovery(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 10,
		BurstSize:         10,
	})

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// 快速发送10个请求（用完突发配额）
	for i := 0; i < 10; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.101:12345"
		router.ServeHTTP(w, req)
	}

	// 下一个请求应该被限制
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.101:12345"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Error("Request should be rate limited immediately after burst")
	}

	// 等待足够时间让令牌桶恢复（等待0.2秒，按10 req/s计算应该有2个新令牌）
	time.Sleep(200 * time.Millisecond)

	// 现在应该可以再发送请求
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "192.168.1.101:12345"
	router.ServeHTTP(w2, req2)

	if w2.Code == http.StatusTooManyRequests {
		t.Error("Request should succeed after rate limiter recovery")
	}
}

func TestIPWhitelist(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 1,
		BurstSize:         1,
		EnableIPWhitelist: true,
		IPWhitelist:       []string{"127.0.0.1", "192.168.1.100"},
	})

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// 白名单IP应该绕过限制（发送100个请求）
	for i := 0; i < 100; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "127.0.0.1:12345"

		router.ServeHTTP(w, req)

		if w.Code == http.StatusTooManyRequests {
			t.Errorf("Whitelisted IP should bypass rate limit on request %d", i)
		}
	}

	// 非白名单IP应该被限制
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.200:12345"
		router.ServeHTTP(w, req)
	}

	// 第3个请求应该被限制
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.200:12345"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Error("Non-whitelisted IP should be rate limited")
	}
}

func TestDifferentIPsIndependentLimits(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 2,
		BurstSize:         2,
	})

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// IP1发送2个请求（用完配额）
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.10:12345"
		router.ServeHTTP(w, req)
	}

	// IP1的第3个请求应该被限制
	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest("GET", "/test", nil)
	req1.RemoteAddr = "192.168.1.10:12345"
	router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusTooManyRequests {
		t.Error("IP1 should be rate limited")
	}

	// IP2应该有独立的配额，前2个请求应该成功
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.20:12345"
		router.ServeHTTP(w, req)

		if w.Code == http.StatusTooManyRequests {
			t.Errorf("IP2 request %d should not be rate limited", i)
		}
	}
}

func TestAIConfigRateLimiter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := AIConfigRateLimiter()

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// 验证配置（应该是10 req/s, burst 20）
	// localhost应该在白名单中
	for i := 0; i < 50; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "127.0.0.1:12345"

		router.ServeHTTP(w, req)

		if w.Code == http.StatusTooManyRequests {
			t.Errorf("Localhost should be whitelisted, failed on request %d", i)
		}
	}

	// 非白名单IP测试
	for i := 0; i < 20; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "203.0.113.50:12345"
		router.ServeHTTP(w, req)
	}

	// 第21个请求应该被限制
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "203.0.113.50:12345"
	router.ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Error("Non-whitelisted IP should be rate limited after burst")
	}
}

func TestRateLimiterErrorResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 1,
		BurstSize:         1,
	})

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// 用完配额
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.50:12345"
	router.ServeHTTP(w, req)

	// 第2个请求应该被限制，检查响应格式
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "192.168.1.50:12345"
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusTooManyRequests {
		t.Error("Request should be rate limited")
	}

	// 检查响应体包含错误信息
	body := w2.Body.String()
	if body == "" {
		t.Error("Response body should not be empty")
	}

	// 验证响应是JSON格式，包含错误代码
	if !containsRateLimiter(body, "RATE_LIMIT_EXCEEDED") {
		t.Error("Response should contain RATE_LIMIT_EXCEEDED error code")
	}

	if !containsRateLimiter(body, "Too many requests") {
		t.Error("Response should contain error message")
	}
}

func TestRateLimiterCleanup(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 10,
		BurstSize:         10,
	})

	// 创建一些限制器
	for i := 0; i < 5; i++ {
		ip := "192.168.1." + string(rune(100+i))
		limiter.getLimiter(ip)
	}

	// 验证限制器已创建
	count := 0
	limiter.limiters.Range(func(key, value interface{}) bool {
		count++
		return true
	})

	if count != 5 {
		t.Errorf("Expected 5 limiters, got %d", count)
	}

	// 注意：实际的清理功能需要等待令牌桶满，这里只测试清理方法存在
	// 完整的清理测试需要模拟时间流逝，这里省略
}

func TestConcurrentRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 100,
		BurstSize:         200,
	})

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	const numGoroutines = 50
	done := make(chan bool, numGoroutines)

	// 并发发送请求
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/test", nil)
			req.RemoteAddr = "192.168.1.100:12345"

			router.ServeHTTP(w, req)
			done <- true
		}(i)
	}

	// 等待所有请求完成
	for i := 0; i < numGoroutines; i++ {
		<-done
	}
}

func TestDefaultConfig(t *testing.T) {
	limiter := NewRateLimiter(&RateLimiterConfig{})

	// 验证默认配置
	if limiter.config.RequestsPerSecond != 100 {
		t.Errorf("Default RequestsPerSecond should be 100, got %d", limiter.config.RequestsPerSecond)
	}

	if limiter.config.BurstSize != 200 {
		t.Errorf("Default BurstSize should be 200, got %d", limiter.config.BurstSize)
	}
}

// 辅助函数
func containsRateLimiter(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && (s == substr || len(s) > len(substr) && containsRateLimiterHelper(s, substr))
}

func containsRateLimiterHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// BenchmarkRateLimiter 频率限制器性能基准测试
func BenchmarkRateLimiter(b *testing.B) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 10000,
		BurstSize:         20000,
	})

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.100:12345"
		router.ServeHTTP(w, req)
	}
}

// BenchmarkRateLimiterParallel 并发频率限制器性能基准测试
func BenchmarkRateLimiterParallel(b *testing.B) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(&RateLimiterConfig{
		RequestsPerSecond: 10000,
		BurstSize:         20000,
	})

	router := gin.New()
	router.Use(limiter.Middleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/test", nil)
			req.RemoteAddr = "192.168.1.100:12345"
			router.ServeHTTP(w, req)
		}
	})
}
