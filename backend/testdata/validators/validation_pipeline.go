package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// ValidationPipeline 验证管道实现
type ValidationPipeline struct {
	id             string
	name           string
	description    string
	stages         []IValidationStage
	config         *ValidationConfig
	isRunning      bool
	mutex          sync.RWMutex
	
	// 统计
	stats          *PipelineStats
	
	// 生命周期回调
	onStart        func()
	onComplete     func(*ValidationResult)
	onError        func(error)
}

// IValidationStage 验证阶段接口
type IValidationStage interface {
	GetID() string
	GetName() string
	GetDescription() string
	GetOrder() int
	Execute(ctx context.Context, data interface{}, result *ValidationResult) error
	IsEnabled() bool
	SetEnabled(enabled bool)
}

// ValidationStageImpl 验证阶段实现
type ValidationStageImpl struct {
	id          string
	name        string
	description string
	order       int
	enabled     bool
	rules       []IValidationRule
	mutex       sync.RWMutex
	stats       StageStats
}

// NewValidationPipeline 创建新的验证管道
func NewValidationPipeline(id, name string) *ValidationPipeline {
	return &ValidationPipeline{
		id:          id,
		name:        name,
		stages:      make([]IValidationStage, 0),
		config:      NewValidationConfig(),
		isRunning:   false,
		stats:       &PipelineStats{
			StageStats: make(map[string]StageStats),
		},
	}
}

// NewValidationStage 创建新的验证阶段
func NewValidationStage(id, name string, order int) *ValidationStageImpl {
	return &ValidationStageImpl{
		id:          id,
		name:        name,
		order:       order,
		enabled:     true,
		rules:       make([]IValidationRule, 0),
		stats:       StageStats{},
	}
}

// GetID 获取管道ID
func (p *ValidationPipeline) GetID() string {
	return p.id
}

// GetName 获取管道名称
func (p *ValidationPipeline) GetName() string {
	return p.name
}

// GetDescription 获取管道描述
func (p *ValidationPipeline) GetDescription() string {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.description
}

// SetDescription 设置管道描述
func (p *ValidationPipeline) SetDescription(description string) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	p.description = description
}

// GetConfig 获取管道配置
func (p *ValidationPipeline) GetConfig() *ValidationConfig {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.config
}

// SetConfig 设置管道配置
func (p *ValidationPipeline) SetConfig(config *ValidationConfig) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	p.config = config
}

// AddStage 添加验证阶段
func (p *ValidationPipeline) AddStage(stage IValidationStage) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	
	p.stages = append(p.stages, stage)
	p.stats.StageStats[stage.GetID()] = StageStats{}
	
	// 按order排序
	p.sortStages()
}

// RemoveStage 移除验证阶段
func (p *ValidationPipeline) RemoveStage(stageID string) bool {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	
	for i, stage := range p.stages {
		if stage.GetID() == stageID {
			p.stages = append(p.stages[:i], p.stages[i+1:]...)
			delete(p.stats.StageStats, stageID)
			return true
		}
	}
	return false
}

// GetStage 获取指定阶段
func (p *ValidationPipeline) GetStage(stageID string) IValidationStage {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	
	for _, stage := range p.stages {
		if stage.GetID() == stageID {
			return stage
		}
	}
	return nil
}

// GetStages 获取所有阶段
func (p *ValidationPipeline) GetStages() []IValidationStage {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	
	stages := make([]IValidationStage, len(p.stages))
	copy(stages, p.stages)
	return stages
}

// Execute 执行验证管道
func (p *ValidationPipeline) Execute(ctx context.Context, data interface{}) *ValidationResult {
	startTime := time.Now()
	result := NewValidationResult()
	
	p.mutex.Lock()
	p.isRunning = true
	p.stats.TotalExecutions++
	p.stats.LastExecution = startTime
	p.mutex.Unlock()
	
	defer func() {
		duration := time.Since(startTime)
		
		p.mutex.Lock()
		p.isRunning = false
		p.stats.AverageTime = duration
		p.mutex.Unlock()
		
		if p.onComplete != nil {
			p.onComplete(result)
		}
	}()
	
	if p.onStart != nil {
		p.onStart()
	}
	
	// 执行各个阶段
	for _, stage := range p.stages {
		if !stage.IsEnabled() {
			continue
		}
		
		stageStartTime := time.Now()
		stageStat := p.stats.StageStats[stage.GetID()]
		
		stageStat.ExecutionCount++
		
		err := stage.Execute(ctx, data, result)
		
		stageDuration := time.Since(stageStartTime)
		stageStat.AverageTime = stageDuration
		stageStat.LastExecution = time.Now()
		
		if err != nil {
			stageStat.FailureCount++
			
			validationErr := ValidationError{
				Field:     fmt.Sprintf("pipeline.stage.%s", stage.GetID()),
				Message:   fmt.Sprintf("Stage '%s' execution failed: %v", stage.GetName(), err),
				Type:      ErrorTypeSystem,
				Severity:  ErrorSeverityHigh,
				Code:      "STAGE_EXECUTION_ERROR",
				Timestamp: time.Now(),
			}
			result.AddError(validationErr)
			
			if p.onError != nil {
				p.onError(err)
			}
			
			// 如果配置为快速失败，则立即返回
			if p.config != nil && p.config.FailFast {
				break
			}
		} else {
			stageStat.SuccessCount++
		}
		
		// 更新统计信息
		p.stats.StageStats[stage.GetID()] = stageStat
		
		// 检查上下文是否被取消
		select {
		case <-ctx.Done():
			result.AddError(ValidationError{
				Field:     "pipeline",
				Message:   "Pipeline execution cancelled",
				Type:      ErrorTypeSystem,
				Severity:  ErrorSeverityMedium,
				Code:      "EXECUTION_CANCELLED",
				Timestamp: time.Now(),
			})
			return result
		default:
		}
	}
	
	return result
}

// IsRunning 检查管道是否正在运行
func (p *ValidationPipeline) IsRunning() bool {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	return p.isRunning
}

// GetStats 获取管道统计信息
func (p *ValidationPipeline) GetStats() *PipelineStats {
	p.mutex.RLock()
	defer p.mutex.RUnlock()
	
	// 创建统计信息的副本
	stats := &PipelineStats{
		TotalExecutions: p.stats.TotalExecutions,
		AverageTime:     p.stats.AverageTime,
		LastExecution:   p.stats.LastExecution,
		StageStats:      make(map[string]StageStats),
	}
	
	for id, stageStat := range p.stats.StageStats {
		stats.StageStats[id] = StageStats{
			ExecutionCount: stageStat.ExecutionCount,
			SuccessCount:   stageStat.SuccessCount,
			FailureCount:   stageStat.FailureCount,
			AverageTime:    stageStat.AverageTime,
			LastExecution:  stageStat.LastExecution,
		}
	}
	
	return stats
}

// SetOnStart 设置开始回调
func (p *ValidationPipeline) SetOnStart(callback func()) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	p.onStart = callback
}

// SetOnComplete 设置完成回调
func (p *ValidationPipeline) SetOnComplete(callback func(*ValidationResult)) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	p.onComplete = callback
}

// SetOnError 设置错误回调
func (p *ValidationPipeline) SetOnError(callback func(error)) {
	p.mutex.Lock()
	defer p.mutex.Unlock()
	p.onError = callback
}

// sortStages 按order排序阶段
func (p *ValidationPipeline) sortStages() {
	for i := 0; i < len(p.stages)-1; i++ {
		for j := i + 1; j < len(p.stages); j++ {
			if p.stages[i].GetOrder() > p.stages[j].GetOrder() {
				p.stages[i], p.stages[j] = p.stages[j], p.stages[i]
			}
		}
	}
}

// ValidationStageImpl 方法实现

// GetID 获取阶段ID
func (s *ValidationStageImpl) GetID() string {
	return s.id
}

// GetName 获取阶段名称
func (s *ValidationStageImpl) GetName() string {
	return s.name
}

// GetDescription 获取阶段描述
func (s *ValidationStageImpl) GetDescription() string {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.description
}

// SetDescription 设置阶段描述
func (s *ValidationStageImpl) SetDescription(description string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.description = description
}

// GetOrder 获取执行顺序
func (s *ValidationStageImpl) GetOrder() int {
	return s.order
}

// SetOrder 设置执行顺序
func (s *ValidationStageImpl) SetOrder(order int) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.order = order
}

// IsEnabled 检查阶段是否启用
func (s *ValidationStageImpl) IsEnabled() bool {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.enabled
}

// SetEnabled 设置阶段启用状态
func (s *ValidationStageImpl) SetEnabled(enabled bool) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.enabled = enabled
}

// AddRule 添加验证规则
func (s *ValidationStageImpl) AddRule(rule IValidationRule) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.rules = append(s.rules, rule)
}

// RemoveRule 移除验证规则
func (s *ValidationStageImpl) RemoveRule(ruleID string) bool {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	for i, rule := range s.rules {
		if rule.GetID() == ruleID {
			s.rules = append(s.rules[:i], s.rules[i+1:]...)
			return true
		}
	}
	return false
}

// GetRules 获取所有规则
func (s *ValidationStageImpl) GetRules() []IValidationRule {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	
	rules := make([]IValidationRule, len(s.rules))
	copy(rules, s.rules)
	return rules
}

// Execute 执行阶段验证
func (s *ValidationStageImpl) Execute(ctx context.Context, data interface{}, result *ValidationResult) error {
	if !s.enabled {
		return nil
	}
	
	s.mutex.RLock()
	rules := make([]IValidationRule, len(s.rules))
	copy(rules, s.rules)
	s.mutex.RUnlock()
	
	// 创建验证上下文
	validationCtx := NewValidationContext(data)
	
	// 执行所有规则
	for _, rule := range rules {
		if !rule.IsEnabled() {
			continue
		}
		
		err := rule.Validate(validationCtx, result)
		if err != nil {
			return fmt.Errorf("rule '%s' failed: %w", rule.GetID(), err)
		}
		
		// 检查上下文是否被取消
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}
	
	return nil
}

// GetStats 获取阶段统计信息
func (s *ValidationStageImpl) GetStats() *StageStats {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	
	return &StageStats{
		ExecutionCount: s.stats.ExecutionCount,
		SuccessCount:   s.stats.SuccessCount,
		FailureCount:   s.stats.FailureCount,
		AverageTime:    s.stats.AverageTime,
		LastExecution:  s.stats.LastExecution,
	}
}