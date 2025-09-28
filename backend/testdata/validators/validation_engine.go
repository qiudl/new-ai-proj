package main

import (
	"context"
	"fmt"
	"runtime"
	"sort"
	"sync"
	"time"
)

// ValidationEngine 验证引擎实现
type ValidationEngine struct {
	// 基础配置
	config   ValidationConfig
	rules    map[string]IValidationRule
	ruleSet  IValidationRuleSet
	cache    IValidationCache
	metrics  IValidationMetrics
	pipeline IValidationPipeline

	// 状态管理
	running bool
	stats   ValidationStats
	mutex   sync.RWMutex

	// 并发控制
	workerPool   chan chan ValidationJob
	jobQueue     chan ValidationJob
	workers      []Worker
	maxWorkers   int
	shutdownChan chan bool
}

// ValidationJob 验证任务
type ValidationJob struct {
	ID       string
	Data     interface{}
	Rules    []IValidationRule
	Context  IValidationContext
	ResultCh chan IValidationResult
	ErrorCh  chan error
	StartAt  time.Time
}

// Worker 工作协程
type Worker struct {
	ID         int
	WorkerChan chan ValidationJob
	QuitChan   chan bool
	Engine     *ValidationEngine
}

// NewValidationEngine 创建验证引擎
func NewValidationEngine(config ValidationConfig) *ValidationEngine {
	engine := &ValidationEngine{
		config:       config,
		rules:        make(map[string]IValidationRule),
		maxWorkers:   config.MaxConcurrency,
		shutdownChan: make(chan bool),
	}

	// 设置默认配置
	engine.setDefaultConfig()

	// 初始化组件
	engine.initializeComponents()

	// 初始化统计信息
	engine.stats = ValidationStats{
		ErrorsByType:  make(map[ErrorType]int64),
		ErrorsByRule:  make(map[string]int64),
		ErrorsByField: make(map[string]int64),
		StartTime:     time.Now(),
	}

	return engine
}

// setDefaultConfig 设置默认配置
func (e *ValidationEngine) setDefaultConfig() {
	if e.config.MaxConcurrency <= 0 {
		e.config.MaxConcurrency = runtime.NumCPU()
	}
	if e.config.WorkerPoolSize <= 0 {
		e.config.WorkerPoolSize = e.config.MaxConcurrency * 2
	}
	if e.config.MaxErrors <= 0 {
		e.config.MaxErrors = 100
	}
	if e.config.Timeout <= 0 {
		e.config.Timeout = 30 * time.Second
	}
	if e.config.CacheSize <= 0 {
		e.config.CacheSize = 1000
	}
	if e.config.CacheTTL <= 0 {
		e.config.CacheTTL = time.Hour
	}
}

// initializeComponents 初始化组件
func (e *ValidationEngine) initializeComponents() {
	// 初始化缓存
	if e.config.EnableCaching {
		e.cache = NewValidationCache(e.config.CacheSize, e.config.CacheTTL)
	}

	// 初始化指标
	if e.config.EnableMetrics {
		e.metrics = NewValidationMetrics()
	}

	// 初始化规则集
	e.ruleSet = NewValidationRuleSet("default", "1.0.0")

	// 初始化流水线
	e.pipeline = NewValidationPipeline("default", "Default Pipeline")
}

// Start 启动验证引擎
func (e *ValidationEngine) Start() error {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	if e.running {
		return fmt.Errorf("validation engine is already running")
	}

	// 初始化工作池
	e.workerPool = make(chan chan ValidationJob, e.maxWorkers)
	e.jobQueue = make(chan ValidationJob, e.config.WorkerPoolSize)

	// 启动工作协程
	e.workers = make([]Worker, e.maxWorkers)
	for i := 0; i < e.maxWorkers; i++ {
		worker := Worker{
			ID:         i + 1,
			WorkerChan: make(chan ValidationJob),
			QuitChan:   make(chan bool),
			Engine:     e,
		}
		e.workers[i] = worker
		go worker.Start()
	}

	// 启动分发协程
	go e.dispatch()

	e.running = true
	e.stats.StartTime = time.Now()

	return nil
}

// Stop 停止验证引擎
func (e *ValidationEngine) Stop() error {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	if !e.running {
		return fmt.Errorf("validation engine is not running")
	}

	// 停止所有工作协程
	for _, worker := range e.workers {
		worker.QuitChan <- true
	}

	// 停止分发协程
	e.shutdownChan <- true

	// 关闭通道
	close(e.workerPool)
	close(e.jobQueue)

	e.running = false
	return nil
}

// IsRunning 检查是否运行中
func (e *ValidationEngine) IsRunning() bool {
	e.mutex.RLock()
	defer e.mutex.RUnlock()
	return e.running
}

// dispatch 分发任务到工作协程
func (e *ValidationEngine) dispatch() {
	for {
		select {
		case job := <-e.jobQueue:
			// 获取可用的工作协程
			select {
			case workerChan := <-e.workerPool:
				// 将任务发送给工作协程
				workerChan <- job
			case <-e.shutdownChan:
				return
			}
		case <-e.shutdownChan:
			return
		}
	}
}

// Start 工作协程启动
func (w *Worker) Start() {
	for {
		// 将工作协程通道放入工作池
		w.Engine.workerPool <- w.WorkerChan

		select {
		case job := <-w.WorkerChan:
			// 处理任务
			w.processJob(job)
		case <-w.QuitChan:
			return
		}
	}
}

// processJob 处理验证任务
func (w *Worker) processJob(job ValidationJob) {
	defer func() {
		if r := recover(); r != nil {
			job.ErrorCh <- fmt.Errorf("validation panic in worker %d: %v", w.ID, r)
		}
	}()

	// 创建上下文
	ctx, cancel := context.WithTimeout(context.Background(), w.Engine.config.Timeout)
	defer cancel()

	// 执行验证
	result := w.Engine.validateInternal(ctx, job.Data, job.Rules, job.Context)

	// 发送结果
	select {
	case job.ResultCh <- result:
	case <-ctx.Done():
		job.ErrorCh <- ctx.Err()
	}
}

// RegisterRule 注册验证规则
func (e *ValidationEngine) RegisterRule(rule IValidationRule) error {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	if rule == nil {
		return fmt.Errorf("rule cannot be nil")
	}

	ruleID := rule.GetID()
	if ruleID == "" {
		return fmt.Errorf("rule ID cannot be empty")
	}

	// 检查是否已存在
	if _, exists := e.rules[ruleID]; exists {
		return fmt.Errorf("rule with ID %s already exists", ruleID)
	}

	// 初始化规则
	if err := rule.Initialize(); err != nil {
		return fmt.Errorf("failed to initialize rule %s: %w", ruleID, err)
	}

	// 注册规则
	e.rules[ruleID] = rule
	
	// 添加到规则集
	if e.ruleSet != nil {
		if err := e.ruleSet.AddRule(rule); err != nil {
			// 如果添加到规则集失败，清理已注册的规则
			delete(e.rules, ruleID)
			return fmt.Errorf("failed to add rule to rule set: %w", err)
		}
	}

	return nil
}

// UnregisterRule 注销验证规则
func (e *ValidationEngine) UnregisterRule(ruleID string) error {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	rule, exists := e.rules[ruleID]
	if !exists {
		return fmt.Errorf("rule with ID %s not found", ruleID)
	}

	// 清理规则
	if err := rule.Cleanup(); err != nil {
		return fmt.Errorf("failed to cleanup rule %s: %w", ruleID, err)
	}

	// 从规则集中移除
	if e.ruleSet != nil {
		if err := e.ruleSet.RemoveRule(ruleID); err != nil {
			return fmt.Errorf("failed to remove rule from rule set: %w", err)
		}
	}

	// 删除规则
	delete(e.rules, ruleID)

	return nil
}

// GetRegisteredRules 获取所有注册的规则
func (e *ValidationEngine) GetRegisteredRules() []IValidationRule {
	e.mutex.RLock()
	defer e.mutex.RUnlock()

	rules := make([]IValidationRule, 0, len(e.rules))
	for _, rule := range e.rules {
		rules = append(rules, rule)
	}

	// 按优先级排序
	sort.Slice(rules, func(i, j int) bool {
		return rules[i].GetPriority() > rules[j].GetPriority()
	})

	return rules
}

// SetConfig 设置配置
func (e *ValidationEngine) SetConfig(config ValidationConfig) error {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	// 验证配置
	if err := e.validateConfig(config); err != nil {
		return fmt.Errorf("invalid config: %w", err)
	}

	e.config = config
	e.setDefaultConfig()

	// 如果引擎正在运行，需要重新初始化某些组件
	if e.running {
		e.reinitializeComponents()
	}

	return nil
}

// GetConfig 获取配置
func (e *ValidationEngine) GetConfig() ValidationConfig {
	e.mutex.RLock()
	defer e.mutex.RUnlock()
	return e.config
}

// validateConfig 验证配置
func (e *ValidationEngine) validateConfig(config ValidationConfig) error {
	if config.MaxConcurrency < 1 {
		return fmt.Errorf("max_concurrency must be at least 1")
	}
	if config.WorkerPoolSize < 1 {
		return fmt.Errorf("worker_pool_size must be at least 1")
	}
	if config.MaxErrors < 0 {
		return fmt.Errorf("max_errors cannot be negative")
	}
	if config.Timeout < 0 {
		return fmt.Errorf("timeout cannot be negative")
	}
	return nil
}

// reinitializeComponents 重新初始化组件
func (e *ValidationEngine) reinitializeComponents() {
	// 重新初始化缓存
	if e.config.EnableCaching && e.cache == nil {
		e.cache = NewValidationCache(e.config.CacheSize, e.config.CacheTTL)
	} else if !e.config.EnableCaching && e.cache != nil {
		e.cache = nil
	}

	// 重新初始化指标
	if e.config.EnableMetrics && e.metrics == nil {
		e.metrics = NewValidationMetrics()
	} else if !e.config.EnableMetrics && e.metrics != nil {
		e.metrics = nil
	}
}

// Validate 验证数据
func (e *ValidationEngine) Validate(ctx context.Context, data interface{}, rules ...IValidationRule) IValidationResult {
	if !e.IsRunning() {
		result := NewValidationResult()
		result.AddError(ValidationError{
			Type:      ErrorTypeCustom,
			Code:      "ENGINE_NOT_RUNNING",
			Message:   "validation engine is not running",
			Timestamp: time.Now(),
		})
		return result
	}

	// 创建验证上下文
	validationCtx := NewValidationContext(data)

	return e.validateInternal(ctx, data, rules, validationCtx)
}

// validateInternal 内部验证方法
func (e *ValidationEngine) validateInternal(ctx context.Context, data interface{}, rules []IValidationRule, validationCtx IValidationContext) IValidationResult {
	start := time.Now()
	result := NewValidationResult()

	// 更新指标
	if e.metrics != nil {
		e.metrics.IncrementValidations()
	}

	// 检查缓存
	if e.cache != nil {
		cacheKey := e.generateCacheKey(data, rules)
		if cachedResult, found := e.cache.Get(cacheKey); found {
			return cachedResult
		}
	}

	// 合并规则
	allRules := e.mergeRules(rules)

	// 按优先级排序
	e.sortRules(allRules)

	// 执行验证
	errorCount := 0
	for _, rule := range allRules {
		// 检查上下文是否被取消
		select {
		case <-ctx.Done():
			result.AddError(ValidationError{
				Type:      ErrorTypeCustom,
				Code:      "VALIDATION_CANCELLED",
				Message:   "validation was cancelled",
				Timestamp: time.Now(),
			})
			return result
		default:
		}

		// 检查是否可以验证
		if !rule.CanValidate(data) {
			continue
		}

		// 执行规则验证
		if err := rule.Validate(validationCtx, result); err != nil {
			validationErr := ValidationError{
				Type:      e.getErrorType(rule),
				Field:     validationCtx.GetCurrentPath(),
				Path:      validationCtx.GetFullPath(),
				Message:   err.Error(),
				Code:      rule.GetID(),
				RuleID:    rule.GetID(),
				RuleName:  rule.GetName(),
				Value:     data,
				Timestamp: time.Now(),
			}

			result.AddError(validationErr)
			errorCount++

			// 更新统计
			e.updateErrorStats(rule, validationErr)

			// 检查快速失败模式
			if e.config.FailFast {
				break
			}

			// 检查最大错误数
			if e.config.MaxErrors > 0 && errorCount >= e.config.MaxErrors {
				break
			}
		}

		// 增加验证计数
		validationCtx.IncrementValidationCount()
	}

	// 设置执行时间
	duration := time.Since(start)
	result.SetExecutionTime(duration)

	// 更新统计
	e.updateValidationStats(duration, result.IsValid())

	// 缓存结果
	if e.cache != nil && result.IsValid() {
		cacheKey := e.generateCacheKey(data, allRules)
		e.cache.Set(cacheKey, result, e.config.CacheTTL)
	}

	return result
}

// mergeRules 合并规则
func (e *ValidationEngine) mergeRules(rules []IValidationRule) []IValidationRule {
	ruleMap := make(map[string]IValidationRule)

	// 添加引擎注册的规则
	if e.config.DefaultRules {
		e.mutex.RLock()
		for id, rule := range e.rules {
			ruleMap[id] = rule
		}
		e.mutex.RUnlock()
	}

	// 添加传入的规则（覆盖同ID的规则）
	for _, rule := range rules {
		if rule != nil {
			ruleMap[rule.GetID()] = rule
		}
	}

	// 转换为切片
	allRules := make([]IValidationRule, 0, len(ruleMap))
	for _, rule := range ruleMap {
		allRules = append(allRules, rule)
	}

	return allRules
}

// sortRules 排序规则
func (e *ValidationEngine) sortRules(rules []IValidationRule) {
	sort.Slice(rules, func(i, j int) bool {
		// 按优先级降序排序
		if rules[i].GetPriority() != rules[j].GetPriority() {
			return rules[i].GetPriority() > rules[j].GetPriority()
		}
		// 优先级相同时按类型排序
		if rules[i].GetType() != rules[j].GetType() {
			return rules[i].GetType() < rules[j].GetType()
		}
		// 最后按ID排序保证稳定性
		return rules[i].GetID() < rules[j].GetID()
	})
}

// getErrorType 根据规则类型获取错误类型
func (e *ValidationEngine) getErrorType(rule IValidationRule) ErrorType {
	switch rule.GetType() {
	case RuleTypeField:
		return ErrorTypeFormat
	case RuleTypeObject:
		return ErrorTypeCustom
	case RuleTypeRelation:
		return ErrorTypeReference
	case RuleTypeBusiness:
		return ErrorTypeBusiness
	default:
		return ErrorTypeCustom
	}
}

// generateCacheKey 生成缓存键
func (e *ValidationEngine) generateCacheKey(data interface{}, rules []IValidationRule) string {
	// 简单的缓存键生成策略
	// 实际实现中可能需要更复杂的哈希算法
	key := fmt.Sprintf("data_type:%T", data)
	
	for _, rule := range rules {
		key += fmt.Sprintf(",rule:%s", rule.GetID())
	}
	
	return key
}

// updateErrorStats 更新错误统计
func (e *ValidationEngine) updateErrorStats(rule IValidationRule, err ValidationError) {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	e.stats.ErrorsByType[err.Type]++
	e.stats.ErrorsByRule[rule.GetID()]++
	if err.Field != "" {
		e.stats.ErrorsByField[err.Field]++
	}

	if e.metrics != nil {
		e.metrics.IncrementErrors()
	}
}

// updateValidationStats 更新验证统计
func (e *ValidationEngine) updateValidationStats(duration time.Duration, isValid bool) {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	e.stats.TotalValidations++
	e.stats.LastUpdate = time.Now()

	if isValid {
		e.stats.SuccessfulValidations++
	} else {
		e.stats.FailedValidations++
	}

	// 更新执行时间统计
	if e.stats.MinExecutionTime == 0 || duration < e.stats.MinExecutionTime {
		e.stats.MinExecutionTime = duration
	}
	if duration > e.stats.MaxExecutionTime {
		e.stats.MaxExecutionTime = duration
	}

	// 计算平均执行时间
	totalTime := e.stats.AverageExecutionTime * time.Duration(e.stats.TotalValidations-1)
	e.stats.AverageExecutionTime = (totalTime + duration) / time.Duration(e.stats.TotalValidations)

	// 更新运行时间
	e.stats.Uptime = time.Since(e.stats.StartTime)

	if e.metrics != nil {
		e.metrics.RecordExecutionTime(duration)
	}
}

// GetStats 获取统计信息
func (e *ValidationEngine) GetStats() ValidationStats {
	e.mutex.RLock()
	defer e.mutex.RUnlock()
	
	// 更新运行时统计
	stats := e.stats
	stats.CurrentConcurrency = len(e.workers)
	stats.MaxConcurrency = e.maxWorkers
	stats.QueueLength = len(e.jobQueue)
	stats.GoroutineCount = runtime.NumGoroutine()
	
	// 计算缓存命中率
	if e.cache != nil {
		cacheStats := e.cache.GetStats()
		stats.CacheHits = cacheStats.HitCount
		stats.CacheMisses = cacheStats.MissCount
		if cacheStats.HitCount+cacheStats.MissCount > 0 {
			stats.CacheHitRatio = float64(cacheStats.HitCount) / float64(cacheStats.HitCount+cacheStats.MissCount)
		}
	}
	
	return stats
}

// ResetStats 重置统计信息
func (e *ValidationEngine) ResetStats() {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	e.stats = ValidationStats{
		ErrorsByType:  make(map[ErrorType]int64),
		ErrorsByRule:  make(map[string]int64),
		ErrorsByField: make(map[string]int64),
		StartTime:     time.Now(),
	}

	if e.metrics != nil {
		e.metrics.ResetMetrics()
	}
}

// ValidateField 验证字段
func (e *ValidationEngine) ValidateField(ctx context.Context, value interface{}, field string) IValidationResult {
	// 创建验证上下文
	validationCtx := NewValidationContext(value)

	// 简化实现，直接返回验证结果
	return e.validateInternal(ctx, value, []IValidationRule{}, validationCtx)
}

// ValidateModel 验证模型
func (e *ValidationEngine) ValidateModel(ctx context.Context, model interface{}) IValidationResult {
	// 简化实现，直接返回空的验证结果
	return NewValidationResult()
}

// ValidateBatch 批量验证
func (e *ValidationEngine) ValidateBatch(ctx context.Context, data []interface{}) []IValidationResult {
	results := make([]IValidationResult, len(data))
	
	if len(data) == 0 {
		return results
	}

	// 如果数据量小或者不支持并发，使用串行处理
	if len(data) <= 10 || !e.IsRunning() {
		for i, item := range data {
			results[i] = e.Validate(ctx, item, nil)
		}
		return results
	}

	// 并发处理
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, e.config.MaxConcurrency)

	for i, item := range data {
		wg.Add(1)
		go func(index int, dataItem interface{}) {
			defer wg.Done()
			
			semaphore <- struct{}{} // 获取信号量
			defer func() { <-semaphore }() // 释放信号量
			
			results[index] = e.Validate(ctx, dataItem, nil)
		}(i, item)
	}

	wg.Wait()
	return results
}

// GetRule 获取验证规则
func (e *ValidationEngine) GetRule(ruleID string) (IValidationRule, bool) {
	e.mutex.RLock()
	defer e.mutex.RUnlock()
	
	rule, exists := e.rules[ruleID]
	return rule, exists
}

