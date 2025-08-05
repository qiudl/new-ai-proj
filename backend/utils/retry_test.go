package utils

import (
	"context"
	"errors"
	"testing"
	"time"
)

// TestDefaultRetryConfig 测试默认重试配置
func TestDefaultRetryConfig(t *testing.T) {
	config := DefaultRetryConfig()
	
	if config.MaxRetries != 3 {
		t.Errorf("Expected MaxRetries to be 3, got %d", config.MaxRetries)
	}
	if config.BaseDelay != 1*time.Second {
		t.Errorf("Expected BaseDelay to be 1s, got %v", config.BaseDelay)
	}
	if config.BackoffFactor != 2.0 {
		t.Errorf("Expected BackoffFactor to be 2.0, got %f", config.BackoffFactor)
	}
	if !config.Jitter {
		t.Error("Expected Jitter to be true")
	}
}

// TestGoogleAPIRetryConfig 测试Google API重试配置
func TestGoogleAPIRetryConfig(t *testing.T) {
	config := GoogleAPIRetryConfig()
	
	if config.MaxRetries != 5 {
		t.Errorf("Expected MaxRetries to be 5, got %d", config.MaxRetries)
	}
	if config.BaseDelay != 500*time.Millisecond {
		t.Errorf("Expected BaseDelay to be 500ms, got %v", config.BaseDelay)
	}
	
	// 测试重试条件
	if !config.RetryCondition(errors.New("429 quotaExceeded")) {
		t.Error("Expected to retry on quota exceeded error")
	}
	if !config.RetryCondition(errors.New("500 internalError")) {
		t.Error("Expected to retry on internal server error")
	}
	if config.RetryCondition(errors.New("invalid_token")) {
		t.Error("Expected not to retry on invalid token error")
	}
	if config.RetryCondition(nil) {
		t.Error("Expected not to retry on nil error")
	}
}

// TestRetryExecutorSuccess 测试重试执行器成功情况
func TestRetryExecutorSuccess(t *testing.T) {
	config := &RetryConfig{
		MaxRetries:    3,
		BaseDelay:     10 * time.Millisecond,
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return err != nil
		},
	}
	
	executor := NewRetryExecutor(config)
	ctx := context.Background()
	
	callCount := 0
	fn := func() error {
		callCount++
		if callCount < 3 {
			return errors.New("temporary error")
		}
		return nil
	}
	
	err := executor.Execute(ctx, fn)
	if err != nil {
		t.Errorf("Expected success, got error: %v", err)
	}
	if callCount != 3 {
		t.Errorf("Expected function to be called 3 times, got %d", callCount)
	}
}

// TestRetryExecutorMaxRetriesExceeded 测试超过最大重试次数
func TestRetryExecutorMaxRetriesExceeded(t *testing.T) {
	config := &RetryConfig{
		MaxRetries:    2,
		BaseDelay:     1 * time.Millisecond,
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return err != nil
		},
	}
	
	executor := NewRetryExecutor(config)
	ctx := context.Background()
	
	callCount := 0
	fn := func() error {
		callCount++
		return errors.New("persistent error")
	}
	
	err := executor.Execute(ctx, fn)
	if err == nil {
		t.Error("Expected error due to max retries exceeded")
	}
	if callCount != 3 { // 初始调用 + 2次重试
		t.Errorf("Expected function to be called 3 times, got %d", callCount)
	}
}

// TestRetryExecutorWithResult 测试带结果的重试执行器
func TestRetryExecutorWithResult(t *testing.T) {
	config := &RetryConfig{
		MaxRetries:    2,
		BaseDelay:     1 * time.Millisecond,
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return err != nil
		},
	}
	
	executor := NewRetryExecutor(config)
	ctx := context.Background()
	
	callCount := 0
	fn := func() (string, error) {
		callCount++
		if callCount < 2 {
			return "", errors.New("temporary error")
		}
		return "success", nil
	}
	
	result, err := executor.ExecuteWithResult(ctx, fn)
	if err != nil {
		t.Errorf("Expected success, got error: %v", err)
	}
	if result != "success" {
		t.Errorf("Expected result to be 'success', got '%s'", result)
	}
	if callCount != 2 {
		t.Errorf("Expected function to be called 2 times, got %d", callCount)
	}
}

// TestRetryExecutorContextCancellation 测试上下文取消
func TestRetryExecutorContextCancellation(t *testing.T) {
	config := &RetryConfig{
		MaxRetries:    5,
		BaseDelay:     50 * time.Millisecond,
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return err != nil
		},
	}
	
	executor := NewRetryExecutor(config)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	
	fn := func() error {
		return errors.New("persistent error")
	}
	
	err := executor.Execute(ctx, fn)
	if err == nil {
		t.Error("Expected error due to context cancellation")
	}
	if !errors.Is(err, context.DeadlineExceeded) && err.Error() != "context cancelled: context deadline exceeded" {
		t.Errorf("Expected context cancellation error, got: %v", err)
	}
}

// TestRetryExecutorNoRetryCondition 测试不满足重试条件
func TestRetryExecutorNoRetryCondition(t *testing.T) {
	config := &RetryConfig{
		MaxRetries:    3,
		BaseDelay:     1 * time.Millisecond,
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return false // 永不重试
		},
	}
	
	executor := NewRetryExecutor(config)
	ctx := context.Background()
	
	callCount := 0
	fn := func() error {
		callCount++
		return errors.New("error")
	}
	
	err := executor.Execute(ctx, fn)
	if err == nil {
		t.Error("Expected error")
	}
	if callCount != 1 {
		t.Errorf("Expected function to be called 1 time, got %d", callCount)
	}
}

// TestRetryExecutorStats 测试重试统计
func TestRetryExecutorStats(t *testing.T) {
	config := &RetryConfig{
		MaxRetries:    3,
		BaseDelay:     1 * time.Millisecond,
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return err != nil
		},
	}
	
	executor := NewRetryExecutor(config)
	ctx := context.Background()
	
	callCount := 0
	fn := func() error {
		callCount++
		if callCount < 3 {
			return errors.New("temporary error")
		}
		return nil
	}
	
	stats, err := executor.ExecuteWithStats(ctx, fn)
	if err != nil {
		t.Errorf("Expected success, got error: %v", err)
	}
	if stats.TotalAttempts != 3 {
		t.Errorf("Expected 3 total attempts, got %d", stats.TotalAttempts)
	}
	if stats.SuccessfulAttempt != 3 {
		t.Errorf("Expected successful attempt to be 3, got %d", stats.SuccessfulAttempt)
	}
	if stats.TotalDelay <= 0 {
		t.Error("Expected positive total delay")
	}
}

// TestCalculateDelay 测试延迟计算
func TestCalculateDelay(t *testing.T) {
	config := &RetryConfig{
		MaxRetries:    3,
		BaseDelay:     100 * time.Millisecond,
		MaxDelay:      1 * time.Second,
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return err != nil
		},
	}
	
	executor := NewRetryExecutor(config)
	
	// 测试第一次重试
	delay1 := executor.calculateDelay(0)
	expected1 := 100 * time.Millisecond
	if delay1 != expected1 {
		t.Errorf("Expected delay1 to be %v, got %v", expected1, delay1)
	}
	
	// 测试第二次重试
	delay2 := executor.calculateDelay(1)
	expected2 := 200 * time.Millisecond
	if delay2 != expected2 {
		t.Errorf("Expected delay2 to be %v, got %v", expected2, delay2)
	}
	
	// 测试第三次重试
	delay3 := executor.calculateDelay(2)
	expected3 := 400 * time.Millisecond
	if delay3 != expected3 {
		t.Errorf("Expected delay3 to be %v, got %v", expected3, delay3)
	}
}

// TestExponentialBackoff 测试指数退避函数
func TestExponentialBackoff(t *testing.T) {
	baseDelay := 100 * time.Millisecond
	maxDelay := 1 * time.Second
	backoffFactor := 2.0
	
	delay0 := ExponentialBackoff(0, baseDelay, maxDelay, backoffFactor)
	if delay0 != 100*time.Millisecond {
		t.Errorf("Expected delay0 to be 100ms, got %v", delay0)
	}
	
	delay1 := ExponentialBackoff(1, baseDelay, maxDelay, backoffFactor)
	if delay1 != 200*time.Millisecond {
		t.Errorf("Expected delay1 to be 200ms, got %v", delay1)
	}
	
	delay10 := ExponentialBackoff(10, baseDelay, maxDelay, backoffFactor)
	if delay10 != maxDelay {
		t.Errorf("Expected delay10 to be capped at %v, got %v", maxDelay, delay10)
	}
}

// TestWithJitter 测试随机抖动
func TestWithJitter(t *testing.T) {
	baseDelay := 1 * time.Second
	jitterPercent := 10.0
	
	// 运行多次测试随机性
	results := make([]time.Duration, 10)
	for i := 0; i < 10; i++ {
		results[i] = WithJitter(baseDelay, jitterPercent)
	}
	
	// 检查结果是否在合理范围内
	minExpected := time.Duration(float64(baseDelay) * 0.9) // -10%
	maxExpected := time.Duration(float64(baseDelay) * 1.1) // +10%
	
	for i, result := range results {
		if result < minExpected || result > maxExpected {
			t.Errorf("Result %d (%v) is outside expected range [%v, %v]", i, result, minExpected, maxExpected)
		}
	}
}

// TestContainsAny 测试字符串包含检查
func TestContainsAny(t *testing.T) {
	testCases := []struct {
		str       string
		substrings []string
		expected   bool
	}{
		{"Error 429: quota exceeded", []string{"429", "quota"}, true},
		{"Error 500: internal server error", []string{"500", "internal"}, true},
		{"Error 404: not found", []string{"429", "500"}, false},
		{"", []string{"test"}, false},
		{"test", []string{""}, false},
		{"test", []string{}, false},
	}
	
	for _, tc := range testCases {
		result := containsAny(tc.str, tc.substrings)
		if result != tc.expected {
			t.Errorf("containsAny(%q, %v) = %v, expected %v", tc.str, tc.substrings, result, tc.expected)
		}
	}
}

// BenchmarkRetryExecutor 基准测试
func BenchmarkRetryExecutor(b *testing.B) {
	config := DefaultRetryConfig()
	executor := NewRetryExecutor(config)
	ctx := context.Background()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := executor.Execute(ctx, func() error {
			return nil // 立即成功
		})
		if err != nil {
			b.Errorf("Unexpected error: %v", err)
		}
	}
}

// BenchmarkRetryExecutorWithRetries 基准测试（包含重试）
func BenchmarkRetryExecutorWithRetries(b *testing.B) {
	config := &RetryConfig{
		MaxRetries:    2,
		BaseDelay:     1 * time.Nanosecond, // 非常小的延迟用于基准测试
		BackoffFactor: 2.0,
		Jitter:        false,
		RetryCondition: func(err error) bool {
			return err != nil
		},
	}
	
	executor := NewRetryExecutor(config)
	ctx := context.Background()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		callCount := 0
		err := executor.Execute(ctx, func() error {
			callCount++
			if callCount < 2 {
				return errors.New("temp error")
			}
			return nil
		})
		if err != nil {
			b.Errorf("Unexpected error: %v", err)
		}
	}
}