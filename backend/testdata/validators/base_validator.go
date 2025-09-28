package main

import (
	"fmt"
	"sync"
	"time"
)

// BaseValidator 基础验证器实现
type BaseValidator struct {
	id          string
	name        string
	description string
	ruleType    RuleType
	priority    int
	version     string
	author      string
	tags        []string
	params      map[string]interface{}
	enabled     bool
	stats       RuleStats
	mutex       sync.RWMutex
}

// NewBaseValidator 创建基础验证器
func NewBaseValidator(id, name string, ruleType RuleType, priority int) *BaseValidator {
	return &BaseValidator{
		id:          id,
		name:        name,
		ruleType:    ruleType,
		priority:    priority,
		version:     "1.0.0",
		author:      "System",
		tags:        make([]string, 0),
		params:      make(map[string]interface{}),
		enabled:     true,
		stats:       RuleStats{},
	}
}

// GetID 获取规则ID
func (b *BaseValidator) GetID() string {
	return b.id
}

// GetName 获取规则名称
func (b *BaseValidator) GetName() string {
	return b.name
}

// GetType 获取规则类型
func (b *BaseValidator) GetType() RuleType {
	return b.ruleType
}

// GetPriority 获取优先级
func (b *BaseValidator) GetPriority() int {
	return b.priority
}

// GetDescription 获取描述
func (b *BaseValidator) GetDescription() string {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.description
}

// SetDescription 设置描述
func (b *BaseValidator) SetDescription(description string) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	b.description = description
}

// GetVersion 获取版本
func (b *BaseValidator) GetVersion() string {
	return b.version
}

// SetVersion 设置版本
func (b *BaseValidator) SetVersion(version string) {
	b.version = version
}

// GetAuthor 获取作者
func (b *BaseValidator) GetAuthor() string {
	return b.author
}

// SetAuthor 设置作者
func (b *BaseValidator) SetAuthor(author string) {
	b.author = author
}

// GetTags 获取标签
func (b *BaseValidator) GetTags() []string {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	
	// 返回副本以避免并发修改
	tags := make([]string, len(b.tags))
	copy(tags, b.tags)
	return tags
}

// SetTags 设置标签
func (b *BaseValidator) SetTags(tags []string) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	b.tags = make([]string, len(tags))
	copy(b.tags, tags)
}

// AddTag 添加标签
func (b *BaseValidator) AddTag(tag string) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	
	// 检查是否已存在
	for _, existingTag := range b.tags {
		if existingTag == tag {
			return
		}
	}
	
	b.tags = append(b.tags, tag)
}

// RemoveTag 移除标签
func (b *BaseValidator) RemoveTag(tag string) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	
	for i, existingTag := range b.tags {
		if existingTag == tag {
			b.tags = append(b.tags[:i], b.tags[i+1:]...)
			return
		}
	}
}

// GetParams 获取参数
func (b *BaseValidator) GetParams() map[string]interface{} {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	
	// 返回副本以避免并发修改
	params := make(map[string]interface{})
	for k, v := range b.params {
		params[k] = v
	}
	return params
}

// SetParams 设置参数
func (b *BaseValidator) SetParams(params map[string]interface{}) error {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	
	// 验证参数
	if err := b.validateParamsInternal(params); err != nil {
		return fmt.Errorf("invalid parameters: %w", err)
	}
	
	// 清空现有参数并设置新参数
	b.params = make(map[string]interface{})
	for k, v := range params {
		b.params[k] = v
	}
	
	return nil
}

// GetParam 获取单个参数
func (b *BaseValidator) GetParam(key string) (interface{}, bool) {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	value, exists := b.params[key]
	return value, exists
}

// SetParam 设置单个参数
func (b *BaseValidator) SetParam(key string, value interface{}) error {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	
	// 创建临时参数映射进行验证
	tempParams := make(map[string]interface{})
	for k, v := range b.params {
		tempParams[k] = v
	}
	tempParams[key] = value
	
	// 验证参数
	if err := b.validateParamsInternal(tempParams); err != nil {
		return fmt.Errorf("invalid parameter %s: %w", key, err)
	}
	
	b.params[key] = value
	return nil
}

// ValidateParams 验证参数（默认实现）
func (b *BaseValidator) ValidateParams() error {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.validateParamsInternal(b.params)
}

// validateParamsInternal 内部参数验证（子类可重写）
func (b *BaseValidator) validateParamsInternal(params map[string]interface{}) error {
	// 默认实现不做任何验证
	// 子类应该重写此方法以实现特定的参数验证逻辑
	return nil
}

// IsEnabled 检查是否启用
func (b *BaseValidator) IsEnabled() bool {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.enabled
}

// SetEnabled 设置启用状态
func (b *BaseValidator) SetEnabled(enabled bool) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	b.enabled = enabled
}

// Validate 执行验证（需要子类实现）
func (b *BaseValidator) Validate(context IValidationContext, result *ValidationResult) error {
	// 检查是否启用
	if !b.IsEnabled() {
		return nil
	}
	
	// 记录开始时间
	start := time.Now()
	
	// 更新统计信息
	defer func() {
		duration := time.Since(start)
		b.updateStats(duration, nil)
	}()
	
	// 子类应该重写此方法
	return fmt.Errorf("validate method not implemented for rule %s", b.id)
}

// CanValidate 检查是否可以验证指定值（默认实现）
func (b *BaseValidator) CanValidate(value interface{}) bool {
	// 默认实现总是返回true
	// 子类可以重写此方法以实现特定的类型检查逻辑
	return b.IsEnabled()
}

// Initialize 初始化验证器（默认实现）
func (b *BaseValidator) Initialize() error {
	// 默认实现不做任何操作
	// 子类可以重写此方法以实现初始化逻辑
	return nil
}

// Cleanup 清理验证器（默认实现）
func (b *BaseValidator) Cleanup() error {
	// 默认实现不做任何操作
	// 子类可以重写此方法以实现清理逻辑
	return nil
}

// updateStats 更新统计信息
func (b *BaseValidator) updateStats(duration time.Duration, err error) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	
	b.stats.ExecutionCount++
	b.stats.LastExecution = time.Now()
	
	if err != nil {
		b.stats.ErrorCount++
	} else {
		b.stats.SuccessCount++
	}
	
	// 更新时间统计
	if b.stats.MinTime == 0 || duration < b.stats.MinTime {
		b.stats.MinTime = duration
	}
	if duration > b.stats.MaxTime {
		b.stats.MaxTime = duration
	}
	
	// 计算平均时间
	totalTime := b.stats.AverageTime * time.Duration(b.stats.ExecutionCount-1)
	b.stats.AverageTime = (totalTime + duration) / time.Duration(b.stats.ExecutionCount)
}

// GetStats 获取统计信息
func (b *BaseValidator) GetStats() RuleStats {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	return b.stats
}

// ResetStats 重置统计信息
func (b *BaseValidator) ResetStats() {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	b.stats = RuleStats{}
}

// incrementStats 增加统计信息（兼容方法）
func (b *BaseValidator) incrementStats(successCount, errorCount int64) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	
	b.stats.ExecutionCount += successCount + errorCount
	b.stats.SuccessCount += successCount
	b.stats.ErrorCount += errorCount
	b.stats.LastExecution = time.Now()
}

// Clone 克隆验证器
func (b *BaseValidator) Clone() *BaseValidator {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	
	clone := &BaseValidator{
		id:          b.id,
		name:        b.name,
		description: b.description,
		ruleType:    b.ruleType,
		priority:    b.priority,
		version:     b.version,
		author:      b.author,
		enabled:     b.enabled,
		tags:        make([]string, len(b.tags)),
		params:      make(map[string]interface{}),
		stats:       RuleStats{}, // 不复制统计信息
	}
	
	// 复制标签
	copy(clone.tags, b.tags)
	
	// 复制参数
	for k, v := range b.params {
		clone.params[k] = v
	}
	
	return clone
}

// String 返回验证器的字符串表示
func (b *BaseValidator) String() string {
	return fmt.Sprintf("BaseValidator{id: %s, name: %s, type: %s, priority: %d, enabled: %t}",
		b.id, b.name, b.ruleType.String(), b.priority, b.enabled)
}

// GetDebugInfo 获取调试信息
func (b *BaseValidator) GetDebugInfo() map[string]interface{} {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	
	return map[string]interface{}{
		"id":           b.id,
		"name":         b.name,
		"description":  b.description,
		"type":         b.ruleType.String(),
		"priority":     b.priority,
		"version":      b.version,
		"author":       b.author,
		"enabled":      b.enabled,
		"tags":         b.tags,
		"params":       b.params,
		"stats":        b.stats,
	}
}

// compareValues 比较两个值（辅助方法）
func (b *BaseValidator) compareValues(value1, value2 interface{}, operator string) bool {
	switch operator {
	case "==", "=", "eq":
		return value1 == value2
	case "!=", "<>", "ne":
		return value1 != value2
	case "<", "lt":
		return b.isLess(value1, value2)
	case "<=", "le":
		return b.isLessOrEqual(value1, value2)
	case ">", "gt":
		return b.isGreater(value1, value2)
	case ">=", "ge":
		return b.isGreaterOrEqual(value1, value2)
	default:
		return false
	}
}

// isLess 检查value1是否小于value2
func (b *BaseValidator) isLess(value1, value2 interface{}) bool {
	switch v1 := value1.(type) {
	case int:
		if v2, ok := value2.(int); ok {
			return v1 < v2
		}
	case int64:
		if v2, ok := value2.(int64); ok {
			return v1 < v2
		}
	case float64:
		if v2, ok := value2.(float64); ok {
			return v1 < v2
		}
	case string:
		if v2, ok := value2.(string); ok {
			return v1 < v2
		}
	case time.Time:
		if v2, ok := value2.(time.Time); ok {
			return v1.Before(v2)
		}
	}
	return false
}

// isLessOrEqual 检查value1是否小于等于value2
func (b *BaseValidator) isLessOrEqual(value1, value2 interface{}) bool {
	return b.isLess(value1, value2) || value1 == value2
}

// isGreater 检查value1是否大于value2
func (b *BaseValidator) isGreater(value1, value2 interface{}) bool {
	return !b.isLessOrEqual(value1, value2)
}

// isGreaterOrEqual 检查value1是否大于等于value2
func (b *BaseValidator) isGreaterOrEqual(value1, value2 interface{}) bool {
	return !b.isLess(value1, value2)
}

// isNilOrEmpty 检查值是否为nil或空
func (b *BaseValidator) isNilOrEmpty(value interface{}) bool {
	if value == nil {
		return true
	}
	
	switch v := value.(type) {
	case string:
		return v == ""
	case []interface{}:
		return len(v) == 0
	case map[string]interface{}:
		return len(v) == 0
	default:
		return false
	}
}