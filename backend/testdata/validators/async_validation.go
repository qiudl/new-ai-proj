package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// AsyncValidationFunc 异步验证函数类型
type AsyncValidationFunc func(ctx context.Context, value interface{}) (*ValidationResult, error)

// AsyncCallbackFunc 异步验证回调函数类型
type AsyncCallbackFunc func(result *ValidationResult, err error)

// AsyncValidationOptions 异步验证选项
type AsyncValidationOptions struct {
	Timeout      time.Duration     // 超时时间
	Retries      int              // 重试次数
	RetryDelay   time.Duration    // 重试延迟
	Context      context.Context  // 上下文
	Callback     AsyncCallbackFunc // 完成回调
	OnProgress   func(stage string) // 进度回调
	Concurrency  int              // 并发数限制
}

// AsyncValidationResult 异步验证结果
type AsyncValidationResult struct {
	*ValidationResult
	StartTime    time.Time
	EndTime      time.Time
	Duration     time.Duration
	Retries      int
	Success      bool
	Error        error
	RuleID       string
}

// AsyncRule 异步验证规则
type AsyncRule struct {
	*BaseValidator
	validateFunc AsyncValidationFunc
	options      *AsyncValidationOptions
	description  string
}

// NewAsyncRule 创建异步验证规则
func NewAsyncRule(id, name string, validateFunc AsyncValidationFunc, options *AsyncValidationOptions) *AsyncRule {
	if options == nil {
		options = &AsyncValidationOptions{
			Timeout:     30 * time.Second,
			Retries:     3,
			RetryDelay:  time.Second,
			Context:     context.Background(),
			Concurrency: 1,
		}
	}

	return &AsyncRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeCustom, 10), // 异步规则优先级较低
		validateFunc:  validateFunc,
		options:       options,
	}
}

// SetDescription 设置描述
func (r *AsyncRule) SetDescription(description string) *AsyncRule {
	r.description = description
	return r
}

// SetTimeout 设置超时时间
func (r *AsyncRule) SetTimeout(timeout time.Duration) *AsyncRule {
	r.options.Timeout = timeout
	return r
}

// SetRetries 设置重试次数
func (r *AsyncRule) SetRetries(retries int) *AsyncRule {
	r.options.Retries = retries
	return r
}

// SetRetryDelay 设置重试延迟
func (r *AsyncRule) SetRetryDelay(delay time.Duration) *AsyncRule {
	r.options.RetryDelay = delay
	return r
}

// SetCallback 设置完成回调
func (r *AsyncRule) SetCallback(callback AsyncCallbackFunc) *AsyncRule {
	r.options.Callback = callback
	return r
}

// SetProgressCallback 设置进度回调
func (r *AsyncRule) SetProgressCallback(callback func(stage string)) *AsyncRule {
	r.options.OnProgress = callback
	return r
}

// Validate 执行异步验证（同步等待结果）
func (r *AsyncRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	// 获取当前值
	currentValue := ctx.GetCurrentValue()

	// 创建异步验证上下文
	asyncCtx := r.options.Context
	if asyncCtx == nil {
		asyncCtx = context.Background()
	}

	// 添加超时控制
	if r.options.Timeout > 0 {
		var cancel context.CancelFunc
		asyncCtx, cancel = context.WithTimeout(asyncCtx, r.options.Timeout)
		defer cancel()
	}

	// 执行异步验证
	asyncResult, err := r.executeWithRetries(asyncCtx, currentValue)
	if err != nil {
		result.AddError(ValidationError{
			Field:     "",
			Message:   fmt.Sprintf("异步验证失败: %v", err),
			Type:      ErrorTypeSystem,
			Severity:  ErrorSeverityHigh,
			Code:      "ASYNC_VALIDATION_FAILED",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
		return nil
	}

	// 合并异步验证结果
	if asyncResult != nil {
		result.Merge(asyncResult)
	}

	// 执行回调
	if r.options.Callback != nil {
		go r.options.Callback(asyncResult, err)
	}

	return nil
}

// executeWithRetries 带重试的异步验证执行
func (r *AsyncRule) executeWithRetries(ctx context.Context, value interface{}) (*ValidationResult, error) {
	var lastErr error

	for attempt := 0; attempt <= r.options.Retries; attempt++ {
		if r.options.OnProgress != nil {
			r.options.OnProgress(fmt.Sprintf("尝试 %d/%d", attempt+1, r.options.Retries+1))
		}

		result, err := r.validateFunc(ctx, value)
		if err == nil {
			return result, nil
		}

		lastErr = err

		// 如果不是最后一次尝试，等待重试延迟
		if attempt < r.options.Retries {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(r.options.RetryDelay):
				// 继续下一次重试
			}
		}
	}

	return nil, fmt.Errorf("异步验证失败，已重试 %d 次: %w", r.options.Retries, lastErr)
}

// ValidateAsync 执行异步验证（非阻塞）
func (r *AsyncRule) ValidateAsync(ctx IValidationContext, callback AsyncCallbackFunc) {
	go func() {
		result := NewValidationResult()
		err := r.Validate(ctx, result)
		if callback != nil {
			callback(result, err)
		}
	}()
}

// CanValidate 检查是否可以验证指定值
func (r *AsyncRule) CanValidate(value interface{}) bool {
	return true // 异步规则可以验证任何值
}

// GetDescription 获取规则描述
func (r *AsyncRule) GetDescription() string {
	if r.description != "" {
		return r.description
	}
	return fmt.Sprintf("异步验证规则 (超时: %v, 重试: %d次)", r.options.Timeout, r.options.Retries)
}

// AsyncValidationBatch 异步验证批处理器
type AsyncValidationBatch struct {
	rules       []IValidationRule
	concurrency int
	timeout     time.Duration
	results     map[string]*AsyncValidationResult
	mutex       sync.RWMutex
}

// NewAsyncValidationBatch 创建异步验证批处理器
func NewAsyncValidationBatch(concurrency int, timeout time.Duration) *AsyncValidationBatch {
	return &AsyncValidationBatch{
		rules:       make([]IValidationRule, 0),
		concurrency: concurrency,
		timeout:     timeout,
		results:     make(map[string]*AsyncValidationResult),
	}
}

// AddRule 添加验证规则
func (b *AsyncValidationBatch) AddRule(rule IValidationRule) {
	b.rules = append(b.rules, rule)
}

// Execute 执行批量异步验证
func (b *AsyncValidationBatch) Execute(ctx context.Context, data interface{}) (*ValidationResult, error) {
	if len(b.rules) == 0 {
		return NewValidationResult(), nil
	}

	// 创建信号量控制并发数
	semaphore := make(chan struct{}, b.concurrency)
	
	// 创建结果通道
	resultChan := make(chan *AsyncValidationResult, len(b.rules))
	errorChan := make(chan error, len(b.rules))
	
	// 创建上下文
	validationCtx := NewValidationContext(data)

	// 启动goroutine执行各个规则
	var wg sync.WaitGroup
	for _, rule := range b.rules {
		wg.Add(1)
		go func(r IValidationRule) {
			defer wg.Done()
			
			// 获取信号量
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			// 执行验证
			startTime := time.Now()
			result := NewValidationResult()
			err := r.Validate(validationCtx, result)
			endTime := time.Now()
			
			// 创建异步验证结果
			asyncResult := &AsyncValidationResult{
				ValidationResult: result,
				StartTime:       startTime,
				EndTime:         endTime,
				Duration:        endTime.Sub(startTime),
				Success:         err == nil && result.IsValid(),
				Error:          err,
				RuleID:         r.GetID(),
			}
			
			if err != nil {
				errorChan <- err
			} else {
				resultChan <- asyncResult
			}
		}(rule)
	}

	// 等待所有goroutine完成或超时
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	// 设置超时
	timeoutCtx, cancel := context.WithTimeout(ctx, b.timeout)
	defer cancel()

	select {
	case <-done:
		// 所有验证完成
	case <-timeoutCtx.Done():
		return nil, fmt.Errorf("批量异步验证超时: %v", b.timeout)
	}

	// 收集结果
	close(resultChan)
	close(errorChan)

	finalResult := NewValidationResult()
	
	// 合并所有结果
	for asyncResult := range resultChan {
		b.mutex.Lock()
		b.results[asyncResult.RuleID] = asyncResult
		b.mutex.Unlock()
		
		finalResult.Merge(asyncResult.ValidationResult)
	}

	// 处理错误
	for err := range errorChan {
		finalResult.AddError(ValidationError{
			Field:     "",
			Message:   fmt.Sprintf("批量验证中的规则执行失败: %v", err),
			Type:      ErrorTypeSystem,
			Severity:  ErrorSeverityHigh,
			Code:      "BATCH_RULE_FAILED",
			Timestamp: time.Now(),
		})
	}

	return finalResult, nil
}

// GetResults 获取所有异步验证结果
func (b *AsyncValidationBatch) GetResults() map[string]*AsyncValidationResult {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	
	// 创建副本
	results := make(map[string]*AsyncValidationResult)
	for k, v := range b.results {
		results[k] = v
	}
	
	return results
}

// GetResult 获取指定规则的异步验证结果
func (b *AsyncValidationBatch) GetResult(ruleID string) (*AsyncValidationResult, bool) {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	
	result, exists := b.results[ruleID]
	return result, exists
}

// 便捷创建函数和示例

// CreateAsyncRemoteValidationRule 创建远程API验证规则
func CreateAsyncRemoteValidationRule(id, name, apiURL string, timeout time.Duration) *AsyncRule {
	validateFunc := func(ctx context.Context, value interface{}) (*ValidationResult, error) {
		// 这里是远程API调用的模拟实现
		// 实际使用时需要使用HTTP客户端调用真实的API
		
		result := NewValidationResult()
		
		// 模拟网络延迟
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(100 * time.Millisecond): // 模拟100ms的网络延迟
		}
		
		// 模拟API验证逻辑
		valueStr := fmt.Sprintf("%v", value)
		if len(valueStr) < 3 {
			result.AddError(ValidationError{
				Field:     "remote_validation",
				Message:   "远程API验证失败: 值太短",
				Type:      ErrorTypeBusiness,
				Severity:  ErrorSeverityMedium,
				Code:      "REMOTE_VALIDATION_FAILED",
				Timestamp: time.Now(),
				RuleID:    id,
			})
		}
		
		return result, nil
	}
	
	options := &AsyncValidationOptions{
		Timeout:    timeout,
		Retries:    2,
		RetryDelay: 500 * time.Millisecond,
	}
	
	return NewAsyncRule(id, name, validateFunc, options)
}

// CreateAsyncDatabaseValidationRule 创建数据库验证规则
func CreateAsyncDatabaseValidationRule(id, name, tableName, field string, timeout time.Duration) *AsyncRule {
	validateFunc := func(ctx context.Context, value interface{}) (*ValidationResult, error) {
		// 这里是数据库查询的模拟实现
		// 实际使用时需要使用真实的数据库连接
		
		result := NewValidationResult()
		
		// 模拟数据库查询延迟
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(50 * time.Millisecond): // 模拟50ms的数据库查询时间
		}
		
		// 模拟数据库唯一性检查
		valueStr := fmt.Sprintf("%v", value)
		if valueStr == "admin" || valueStr == "root" {
			result.AddError(ValidationError{
				Field:     field,
				Message:   fmt.Sprintf("数据库验证失败: '%s' 已存在于表 %s 中", valueStr, tableName),
				Type:      ErrorTypeUnique,
				Severity:  ErrorSeverityHigh,
				Code:      "DATABASE_DUPLICATE",
				Timestamp: time.Now(),
				RuleID:    id,
			})
		}
		
		return result, nil
	}
	
	options := &AsyncValidationOptions{
		Timeout:    timeout,
		Retries:    1,
		RetryDelay: 200 * time.Millisecond,
	}
	
	return NewAsyncRule(id, name, validateFunc, options)
}

// CreateAsyncFileValidationRule 创建文件验证规则
func CreateAsyncFileValidationRule(id, name, filePath string, timeout time.Duration) *AsyncRule {
	validateFunc := func(ctx context.Context, value interface{}) (*ValidationResult, error) {
		// 这里是文件操作的模拟实现
		// 实际使用时需要进行真实的文件读取和验证
		
		result := NewValidationResult()
		
		// 模拟文件读取延迟
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(30 * time.Millisecond): // 模拟30ms的文件IO时间
		}
		
		// 模拟文件内容验证
		valueStr := fmt.Sprintf("%v", value)
		if len(valueStr) == 0 {
			result.AddError(ValidationError{
				Field:     "file_content",
				Message:   fmt.Sprintf("文件验证失败: 文件 %s 为空或不存在", filePath),
				Type:      ErrorTypeFormat,
				Severity:  ErrorSeverityMedium,
				Code:      "FILE_EMPTY",
				Timestamp: time.Now(),
				RuleID:    id,
			})
		}
		
		return result, nil
	}
	
	options := &AsyncValidationOptions{
		Timeout:    timeout,
		Retries:    1,
		RetryDelay: 100 * time.Millisecond,
	}
	
	return NewAsyncRule(id, name, validateFunc, options)
}