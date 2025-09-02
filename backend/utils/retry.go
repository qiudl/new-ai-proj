package utils

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"
)

// RetryConfig 重试配置
type RetryConfig struct {
	MaxRetries     int              `json:"max_retries"`    // 最大重试次数
	BaseDelay      time.Duration    `json:"base_delay"`     // 基础延迟时间
	MaxDelay       time.Duration    `json:"max_delay"`      // 最大延迟时间
	BackoffFactor  float64          `json:"backoff_factor"` // 退避因子
	Jitter         bool             `json:"jitter"`         // 是否添加随机抖动
	RetryCondition func(error) bool // 重试条件判断函数
}

// DefaultRetryConfig 默认重试配置
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxRetries:    3,
		BaseDelay:     1 * time.Second,
		MaxDelay:      30 * time.Second,
		BackoffFactor: 2.0,
		Jitter:        true,
		RetryCondition: func(err error) bool {
			// 默认对所有错误进行重试
			return err != nil
		},
	}
}

// GoogleAPIRetryConfig Google API专用重试配置
func GoogleAPIRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxRetries:    5,
		BaseDelay:     500 * time.Millisecond,
		MaxDelay:      60 * time.Second,
		BackoffFactor: 2.0,
		Jitter:        true,
		RetryCondition: func(err error) bool {
			if err == nil {
				return false
			}

			// 对于Google API，重试特定的错误类型
			errStr := err.Error()

			// 429 - 配额限制
			if containsAny(errStr, []string{"429", "quotaExceeded", "rateLimitExceeded"}) {
				return true
			}

			// 5xx - 服务器错误
			if containsAny(errStr, []string{"500", "502", "503", "504", "internalError", "backendError"}) {
				return true
			}

			// 网络相关错误
			if containsAny(errStr, []string{"timeout", "connection reset", "network", "EOF"}) {
				return true
			}

			// Token过期错误不重试，需要刷新token
			if containsAny(errStr, []string{"invalid_token", "token_expired", "unauthorized"}) {
				return false
			}

			return false
		},
	}
}

// RetryExecutor 重试执行器
type RetryExecutor struct {
	config *RetryConfig
}

// GetConfig 获取重试配置
func (r *RetryExecutor) GetConfig() *RetryConfig {
	return r.config
}

// NewRetryExecutor 创建新的重试执行器
func NewRetryExecutor(config *RetryConfig) *RetryExecutor {
	if config == nil {
		config = DefaultRetryConfig()
	}

	return &RetryExecutor{
		config: config,
	}
}

// RetryableFunc 可重试的函数类型
type RetryableFunc func() error

// RetryableFuncWithResult 带结果的可重试函数类型
type RetryableFuncWithResult[T any] func() (T, error)

// Execute 执行重试逻辑
func (r *RetryExecutor) Execute(ctx context.Context, fn RetryableFunc) error {
	var lastErr error

	for attempt := 0; attempt <= r.config.MaxRetries; attempt++ {
		// 检查上下文是否已取消
		select {
		case <-ctx.Done():
			return fmt.Errorf("context cancelled: %w", ctx.Err())
		default:
		}

		// 执行函数
		err := fn()
		if err == nil {
			return nil // 成功，无需重试
		}

		lastErr = err

		// 检查是否应该重试
		if !r.config.RetryCondition(err) {
			return fmt.Errorf("retry condition not met: %w", err)
		}

		// 如果已经达到最大重试次数，返回最后的错误
		if attempt >= r.config.MaxRetries {
			break
		}

		// 计算延迟时间
		delay := r.calculateDelay(attempt)

		// 等待指定时间后重试
		select {
		case <-ctx.Done():
			return fmt.Errorf("context cancelled during retry delay: %w", ctx.Err())
		case <-time.After(delay):
			// 继续下一次重试
		}
	}

	return fmt.Errorf("max retries (%d) exceeded: %w", r.config.MaxRetries, lastErr)
}

// ExecuteWithResult 执行带结果的重试逻辑
func ExecuteWithResult[T any](ctx context.Context, r *RetryExecutor, fn RetryableFuncWithResult[T]) (T, error) {
	var lastErr error
	var zeroValue T

	for attempt := 0; attempt <= r.config.MaxRetries; attempt++ {
		// 检查上下文是否已取消
		select {
		case <-ctx.Done():
			return zeroValue, fmt.Errorf("context cancelled: %w", ctx.Err())
		default:
		}

		// 执行函数
		result, err := fn()
		if err == nil {
			return result, nil // 成功，无需重试
		}

		lastErr = err

		// 检查是否应该重试
		if !r.config.RetryCondition(err) {
			return zeroValue, fmt.Errorf("retry condition not met: %w", err)
		}

		// 如果已经达到最大重试次数，返回最后的错误
		if attempt >= r.config.MaxRetries {
			break
		}

		// 计算延迟时间
		delay := r.calculateDelay(attempt)

		// 等待指定时间后重试
		select {
		case <-ctx.Done():
			return zeroValue, fmt.Errorf("context cancelled during retry delay: %w", ctx.Err())
		case <-time.After(delay):
			// 继续下一次重试
		}
	}

	return zeroValue, fmt.Errorf("max retries (%d) exceeded: %w", r.config.MaxRetries, lastErr)
}

// calculateDelay 计算延迟时间（指数退避 + 可选的随机抖动）
func (r *RetryExecutor) calculateDelay(attempt int) time.Duration {
	// 计算指数退避延迟
	delay := float64(r.config.BaseDelay) * math.Pow(r.config.BackoffFactor, float64(attempt))

	// 确保不超过最大延迟
	if time.Duration(delay) > r.config.MaxDelay {
		delay = float64(r.config.MaxDelay)
	}

	// 添加随机抖动以避免雷群效应
	if r.config.Jitter {
		jitterRange := delay * 0.1                         // 10%的抖动范围
		jitter := (rand.Float64() - 0.5) * 2 * jitterRange // -10% 到 +10%
		delay += jitter

		// 确保延迟不为负数
		if delay < 0 {
			delay = float64(r.config.BaseDelay)
		}
	}

	return time.Duration(delay)
}

// SimpleRetry 简单的重试函数，使用默认配置
func SimpleRetry(ctx context.Context, fn RetryableFunc) error {
	executor := NewRetryExecutor(DefaultRetryConfig())
	return executor.Execute(ctx, fn)
}

// SimpleRetryWithResult 简单的带结果重试函数，使用默认配置
func SimpleRetryWithResult[T any](ctx context.Context, fn RetryableFuncWithResult[T]) (T, error) {
	executor := NewRetryExecutor(DefaultRetryConfig())
	return ExecuteWithResult(ctx, executor, fn)
}

// GoogleAPIRetry Google API专用的重试函数
func GoogleAPIRetry(ctx context.Context, fn RetryableFunc) error {
	executor := NewRetryExecutor(GoogleAPIRetryConfig())
	return executor.Execute(ctx, fn)
}

// GoogleAPIRetryWithResult Google API专用的带结果重试函数
func GoogleAPIRetryWithResult[T any](ctx context.Context, fn RetryableFuncWithResult[T]) (T, error) {
	executor := NewRetryExecutor(GoogleAPIRetryConfig())
	return ExecuteWithResult(ctx, executor, fn)
}

// RetryStats 重试统计信息
type RetryStats struct {
	TotalAttempts     int           `json:"total_attempts"`
	SuccessfulAttempt int           `json:"successful_attempt"`
	TotalDelay        time.Duration `json:"total_delay"`
	LastError         string        `json:"last_error,omitempty"`
}

// ExecuteWithStats 执行重试逻辑并返回统计信息
func (r *RetryExecutor) ExecuteWithStats(ctx context.Context, fn RetryableFunc) (*RetryStats, error) {
	stats := &RetryStats{}
	var lastErr error
	startTime := time.Now()

	for attempt := 0; attempt <= r.config.MaxRetries; attempt++ {
		stats.TotalAttempts = attempt + 1

		// 检查上下文是否已取消
		select {
		case <-ctx.Done():
			stats.TotalDelay = time.Since(startTime)
			stats.LastError = ctx.Err().Error()
			return stats, fmt.Errorf("context cancelled: %w", ctx.Err())
		default:
		}

		// 执行函数
		err := fn()
		if err == nil {
			stats.SuccessfulAttempt = attempt + 1
			stats.TotalDelay = time.Since(startTime)
			return stats, nil // 成功，无需重试
		}

		lastErr = err

		// 检查是否应该重试
		if !r.config.RetryCondition(err) {
			stats.TotalDelay = time.Since(startTime)
			stats.LastError = err.Error()
			return stats, fmt.Errorf("retry condition not met: %w", err)
		}

		// 如果已经达到最大重试次数，返回最后的错误
		if attempt >= r.config.MaxRetries {
			break
		}

		// 计算延迟时间
		delay := r.calculateDelay(attempt)

		// 等待指定时间后重试
		select {
		case <-ctx.Done():
			stats.TotalDelay = time.Since(startTime)
			stats.LastError = ctx.Err().Error()
			return stats, fmt.Errorf("context cancelled during retry delay: %w", ctx.Err())
		case <-time.After(delay):
			// 继续下一次重试
		}
	}

	stats.TotalDelay = time.Since(startTime)
	stats.LastError = lastErr.Error()
	return stats, fmt.Errorf("max retries (%d) exceeded: %w", r.config.MaxRetries, lastErr)
}

// containsAny 检查字符串是否包含任何一个子字符串
func containsAny(str string, substrings []string) bool {
	for _, substr := range substrings {
		if len(substr) > 0 && len(str) >= len(substr) {
			for i := 0; i <= len(str)-len(substr); i++ {
				if str[i:i+len(substr)] == substr {
					return true
				}
			}
		}
	}
	return false
}

// ExponentialBackoff 指数退避策略计算函数
func ExponentialBackoff(attempt int, baseDelay time.Duration, maxDelay time.Duration, backoffFactor float64) time.Duration {
	delay := float64(baseDelay) * math.Pow(backoffFactor, float64(attempt))
	if time.Duration(delay) > maxDelay {
		return maxDelay
	}
	return time.Duration(delay)
}

// WithJitter 为延迟时间添加随机抖动
func WithJitter(delay time.Duration, jitterPercent float64) time.Duration {
	if jitterPercent <= 0 || jitterPercent > 100 {
		return delay
	}

	jitterRange := float64(delay) * (jitterPercent / 100.0)
	jitter := (rand.Float64() - 0.5) * 2 * jitterRange
	result := float64(delay) + jitter

	if result < 0 {
		return delay
	}

	return time.Duration(result)
}
