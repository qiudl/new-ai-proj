package main

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

// ValidationRuleSet 验证规则集实现
type ValidationRuleSet struct {
	name        string
	version     string
	description string
	rules       map[string]IValidationRule
	rulesByType map[RuleType][]IValidationRule
	mutex       sync.RWMutex
}

// NewValidationRuleSet 创建验证规则集
func NewValidationRuleSet(name, version string) *ValidationRuleSet {
	return &ValidationRuleSet{
		name:        name,
		version:     version,
		rules:       make(map[string]IValidationRule),
		rulesByType: make(map[RuleType][]IValidationRule),
	}
}

// AddRule 添加规则
func (rs *ValidationRuleSet) AddRule(rule IValidationRule) error {
	if rule == nil {
		return fmt.Errorf("rule cannot be nil")
	}

	ruleID := rule.GetID()
	if ruleID == "" {
		return fmt.Errorf("rule ID cannot be empty")
	}

	rs.mutex.Lock()
	defer rs.mutex.Unlock()

	// 检查是否已存在
	if _, exists := rs.rules[ruleID]; exists {
		return fmt.Errorf("rule with ID %s already exists", ruleID)
	}

	// 添加规则
	rs.rules[ruleID] = rule

	// 按类型分组
	ruleType := rule.GetType()
	if rs.rulesByType[ruleType] == nil {
		rs.rulesByType[ruleType] = make([]IValidationRule, 0)
	}
	rs.rulesByType[ruleType] = append(rs.rulesByType[ruleType], rule)

	return nil
}

// RemoveRule 移除规则
func (rs *ValidationRuleSet) RemoveRule(ruleID string) error {
	rs.mutex.Lock()
	defer rs.mutex.Unlock()

	rule, exists := rs.rules[ruleID]
	if !exists {
		return fmt.Errorf("rule with ID %s not found", ruleID)
	}

	// 从规则映射中删除
	delete(rs.rules, ruleID)

	// 从类型分组中删除
	ruleType := rule.GetType()
	if typeRules, exists := rs.rulesByType[ruleType]; exists {
		for i, r := range typeRules {
			if r.GetID() == ruleID {
				rs.rulesByType[ruleType] = append(typeRules[:i], typeRules[i+1:]...)
				break
			}
		}
		
		// 如果该类型没有规则了，删除键
		if len(rs.rulesByType[ruleType]) == 0 {
			delete(rs.rulesByType, ruleType)
		}
	}

	return nil
}

// GetRules 获取所有规则
func (rs *ValidationRuleSet) GetRules() []IValidationRule {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()

	rules := make([]IValidationRule, 0, len(rs.rules))
	for _, rule := range rs.rules {
		rules = append(rules, rule)
	}

	return rules
}

// GetRulesByType 根据类型获取规则
func (rs *ValidationRuleSet) GetRulesByType(ruleType RuleType) []IValidationRule {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()

	if rules, exists := rs.rulesByType[ruleType]; exists {
		// 返回副本
		result := make([]IValidationRule, len(rules))
		copy(result, rules)
		return result
	}

	return nil
}

// ExecuteRules 执行规则
func (rs *ValidationRuleSet) ExecuteRules(ctx context.Context, data interface{}, context IValidationContext) IValidationResult {
	result := NewValidationResult()
	
	// 获取所有规则并排序
	rules := rs.GetRules()
	rs.sortRules(rules)

	// 执行每个规则
	for _, rule := range rules {
		// 检查上下文是否被取消
		select {
		case <-ctx.Done():
			result.AddError(ValidationError{
				Type:      ErrorTypeCustom,
				Code:      "EXECUTION_CANCELLED",
				Message:   "rule execution was cancelled",
				RuleID:    rule.GetID(),
				Timestamp: time.Now(),
			})
			return result
		default:
		}

		// 检查是否可以验证
		if !rule.CanValidate(data) {
			continue
		}

		// 执行规则
		if err := rule.Validate(context, result); err != nil {
			result.AddError(ValidationError{
				Type:      rs.getErrorTypeForRule(rule),
				Field:     context.GetCurrentPath(),
				Path:      context.GetFullPath(),
				Message:   err.Error(),
				Code:      rule.GetID(),
				RuleID:    rule.GetID(),
				RuleName:  rule.GetName(),
				Value:     data,
				Timestamp: time.Now(),
			})
		}

		// 增加验证计数
		context.IncrementValidationCount()
	}

	return result
}

// GetName 获取规则集名称
func (rs *ValidationRuleSet) GetName() string {
	return rs.name
}

// GetVersion 获取版本
func (rs *ValidationRuleSet) GetVersion() string {
	return rs.version
}

// GetDescription 获取描述
func (rs *ValidationRuleSet) GetDescription() string {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()
	return rs.description
}

// SetDescription 设置描述
func (rs *ValidationRuleSet) SetDescription(description string) {
	rs.mutex.Lock()
	defer rs.mutex.Unlock()
	rs.description = description
}

// OptimizeRules 优化规则
func (rs *ValidationRuleSet) OptimizeRules() error {
	rs.mutex.Lock()
	defer rs.mutex.Unlock()

	// 重建类型索引
	rs.rulesByType = make(map[RuleType][]IValidationRule)
	for _, rule := range rs.rules {
		ruleType := rule.GetType()
		if rs.rulesByType[ruleType] == nil {
			rs.rulesByType[ruleType] = make([]IValidationRule, 0)
		}
		rs.rulesByType[ruleType] = append(rs.rulesByType[ruleType], rule)
	}

	// 对每种类型的规则进行排序
	for ruleType := range rs.rulesByType {
		rs.sortRules(rs.rulesByType[ruleType])
	}

	return nil
}

// SortRules 排序规则
func (rs *ValidationRuleSet) SortRules() error {
	rs.mutex.Lock()
	defer rs.mutex.Unlock()

	// 对每种类型的规则进行排序
	for ruleType := range rs.rulesByType {
		rs.sortRules(rs.rulesByType[ruleType])
	}

	return nil
}

// sortRules 内部排序方法
func (rs *ValidationRuleSet) sortRules(rules []IValidationRule) {
	sort.Slice(rules, func(i, j int) bool {
		// 按优先级降序排序
		if rules[i].GetPriority() != rules[j].GetPriority() {
			return rules[i].GetPriority() > rules[j].GetPriority()
		}
		// 优先级相同时按ID排序保证稳定性
		return rules[i].GetID() < rules[j].GetID()
	})
}

// getErrorTypeForRule 根据规则获取错误类型
func (rs *ValidationRuleSet) getErrorTypeForRule(rule IValidationRule) ErrorType {
	switch rule.GetType() {
	case RuleTypeField:
		// 根据规则ID判断具体的错误类型
		switch rule.GetID() {
		case "required":
			return ErrorTypeRequired
		case "length", "min_length", "max_length":
			return ErrorTypeLength
		case "pattern", "email", "url", "format":
			return ErrorTypeFormat
		case "min", "max", "range":
			return ErrorTypeRange
		case "unique":
			return ErrorTypeUnique
		default:
			return ErrorTypeFormat
		}
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

// GetRuleCount 获取规则数量
func (rs *ValidationRuleSet) GetRuleCount() int {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()
	return len(rs.rules)
}

// GetRuleTypeCount 获取各类型规则数量
func (rs *ValidationRuleSet) GetRuleTypeCount() map[RuleType]int {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()

	counts := make(map[RuleType]int)
	for ruleType, rules := range rs.rulesByType {
		counts[ruleType] = len(rules)
	}

	return counts
}

// HasRule 检查是否包含指定规则
func (rs *ValidationRuleSet) HasRule(ruleID string) bool {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()
	_, exists := rs.rules[ruleID]
	return exists
}

// GetRule 获取指定规则
func (rs *ValidationRuleSet) GetRule(ruleID string) (IValidationRule, bool) {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()
	rule, exists := rs.rules[ruleID]
	return rule, exists
}

// Clear 清空所有规则
func (rs *ValidationRuleSet) Clear() {
	rs.mutex.Lock()
	defer rs.mutex.Unlock()

	rs.rules = make(map[string]IValidationRule)
	rs.rulesByType = make(map[RuleType][]IValidationRule)
}

// Clone 克隆规则集
func (rs *ValidationRuleSet) Clone() *ValidationRuleSet {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()

	clone := NewValidationRuleSet(rs.name, rs.version)
	clone.description = rs.description

	// 复制所有规则
	for _, rule := range rs.rules {
		clone.AddRule(rule)
	}

	return clone
}

// String 返回规则集的字符串表示
func (rs *ValidationRuleSet) String() string {
	return fmt.Sprintf("ValidationRuleSet{name: %s, version: %s, rules: %d}",
		rs.name, rs.version, rs.GetRuleCount())
}

// GetDebugInfo 获取调试信息
func (rs *ValidationRuleSet) GetDebugInfo() map[string]interface{} {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()

	ruleList := make([]map[string]interface{}, 0, len(rs.rules))
	for _, rule := range rs.rules {
		ruleInfo := map[string]interface{}{
			"id":       rule.GetID(),
			"name":     rule.GetName(),
			"type":     rule.GetType().String(),
			"priority": rule.GetPriority(),
		}
		ruleList = append(ruleList, ruleInfo)
	}

	return map[string]interface{}{
		"name":              rs.name,
		"version":           rs.version,
		"description":       rs.description,
		"rule_count":        len(rs.rules),
		"rule_type_counts":  rs.GetRuleTypeCount(),
		"rules":             ruleList,
	}
}