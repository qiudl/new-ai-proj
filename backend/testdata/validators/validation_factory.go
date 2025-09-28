package main

import (
	"fmt"
	"sync"
	"time"
)

// IValidationFactory 验证工厂接口
type IValidationFactory interface {
	// 规则创建
	CreateRequiredRule(id, name string, fields []string) IValidationRule
	CreateLengthRule(id, name, field string) *LengthRule
	CreateRegexRule(id, name, field, pattern string) (IValidationRule, error)
	CreateRangeRule(id, name, field string) *RangeRule
	CreateEmailRule(id, name, field string) (IValidationRule, error)
	CreateDateRule(id, name, field, format string) *DateRule
	CreateEnumRule(id, name, field string, allowedValues []interface{}) *EnumRule
	CreateCustomRule(id, name string, validateFunc func(ctx IValidationContext, result *ValidationResult) error) *CustomRule
	
	// 管道和阶段创建
	CreatePipeline(id, name string) *ValidationPipeline
	CreateStage(id, name string, order int) *ValidationStageImpl
	
	// 引擎创建
	CreateEngine(config *ValidationConfig) *ValidationEngine
	
	// 注册和获取
	RegisterRuleTemplate(ruleType RuleType, creator func(config map[string]interface{}) (IValidationRule, error))
	CreateRuleFromTemplate(ruleType RuleType, config map[string]interface{}) (IValidationRule, error)
	GetRegisteredTemplates() []RuleType
}

// ValidationFactory 验证工厂实现
type ValidationFactory struct {
	mutex           sync.RWMutex
	ruleTemplates   map[RuleType]func(config map[string]interface{}) (IValidationRule, error)
	instanceCounter map[RuleType]int64
}

// NewValidationFactory 创建验证工厂
func NewValidationFactory() *ValidationFactory {
	factory := &ValidationFactory{
		ruleTemplates:   make(map[RuleType]func(config map[string]interface{}) (IValidationRule, error)),
		instanceCounter: make(map[RuleType]int64),
	}
	
	// 注册内置规则模板
	factory.registerBuiltinTemplates()
	
	return factory
}

// CreateRequiredRule 创建必填验证规则
func (f *ValidationFactory) CreateRequiredRule(id, name string, fields []string) IValidationRule {
	f.incrementCounter(RuleTypeRequired)
	return NewRequiredRule(id, name, fields)
}

// CreateLengthRule 创建长度验证规则
func (f *ValidationFactory) CreateLengthRule(id, name, field string) *LengthRule {
	f.incrementCounter(RuleTypeLength)
	return NewLengthRule(id, name, field)
}

// CreateRegexRule 创建正则表达式验证规则
func (f *ValidationFactory) CreateRegexRule(id, name, field, pattern string) (IValidationRule, error) {
	f.incrementCounter(RuleTypeRegex)
	return NewRegexRule(id, name, field, pattern)
}

// CreateRangeRule 创建数值范围验证规则
func (f *ValidationFactory) CreateRangeRule(id, name, field string) *RangeRule {
	f.incrementCounter(RuleTypeRange)
	return NewRangeRule(id, name, field)
}

// CreateEmailRule 创建邮箱验证规则
func (f *ValidationFactory) CreateEmailRule(id, name, field string) (IValidationRule, error) {
	f.incrementCounter(RuleTypeEmail)
	return NewEmailRule(id, name, field)
}

// CreateDateRule 创建日期验证规则
func (f *ValidationFactory) CreateDateRule(id, name, field, format string) *DateRule {
	f.incrementCounter(RuleTypeDate)
	return NewDateRule(id, name, field, format)
}

// CreateEnumRule 创建枚举验证规则
func (f *ValidationFactory) CreateEnumRule(id, name, field string, allowedValues []interface{}) *EnumRule {
	f.incrementCounter(RuleTypeEnum)
	return NewEnumRule(id, name, field, allowedValues)
}

// CreateCustomRule 创建自定义验证规则
func (f *ValidationFactory) CreateCustomRule(id, name string, validateFunc func(ctx IValidationContext, result *ValidationResult) error) *CustomRule {
	f.incrementCounter(RuleTypeCustom)
	return NewCustomRule(id, name, validateFunc)
}

// CreatePipeline 创建验证管道
func (f *ValidationFactory) CreatePipeline(id, name string) *ValidationPipeline {
	return NewValidationPipeline(id, name)
}

// CreateStage 创建验证阶段
func (f *ValidationFactory) CreateStage(id, name string, order int) *ValidationStageImpl {
	return NewValidationStage(id, name, order)
}

// CreateEngine 创建验证引擎
func (f *ValidationFactory) CreateEngine(config *ValidationConfig) *ValidationEngine {
	return NewValidationEngine(*config)
}

// RegisterRuleTemplate 注册规则模板
func (f *ValidationFactory) RegisterRuleTemplate(ruleType RuleType, creator func(config map[string]interface{}) (IValidationRule, error)) {
	f.mutex.Lock()
	defer f.mutex.Unlock()
	
	f.ruleTemplates[ruleType] = creator
}

// CreateRuleFromTemplate 从模板创建规则
func (f *ValidationFactory) CreateRuleFromTemplate(ruleType RuleType, config map[string]interface{}) (IValidationRule, error) {
	f.mutex.RLock()
	creator, exists := f.ruleTemplates[ruleType]
	f.mutex.RUnlock()
	
	if !exists {
		return nil, fmt.Errorf("rule template not found for type: %v", ruleType)
	}
	
	f.incrementCounter(ruleType)
	return creator(config)
}

// GetRegisteredTemplates 获取已注册的模板类型
func (f *ValidationFactory) GetRegisteredTemplates() []RuleType {
	f.mutex.RLock()
	defer f.mutex.RUnlock()
	
	templates := make([]RuleType, 0, len(f.ruleTemplates))
	for ruleType := range f.ruleTemplates {
		templates = append(templates, ruleType)
	}
	return templates
}

// GetInstanceCounter 获取实例计数器
func (f *ValidationFactory) GetInstanceCounter() map[RuleType]int64 {
	f.mutex.RLock()
	defer f.mutex.RUnlock()
	
	counter := make(map[RuleType]int64)
	for ruleType, count := range f.instanceCounter {
		counter[ruleType] = count
	}
	return counter
}

// incrementCounter 增加计数器
func (f *ValidationFactory) incrementCounter(ruleType RuleType) {
	f.mutex.Lock()
	defer f.mutex.Unlock()
	
	f.instanceCounter[ruleType]++
}

// registerBuiltinTemplates 注册内置规则模板
func (f *ValidationFactory) registerBuiltinTemplates() {
	// 注册Required规则模板
	f.RegisterRuleTemplate(RuleTypeRequired, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for required rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Required Rule"
		}
		
		fieldsInterface, ok := config["fields"].([]interface{})
		if !ok {
			return nil, fmt.Errorf("fields is required for required rule")
		}
		
		fields := make([]string, len(fieldsInterface))
		for i, field := range fieldsInterface {
			if fieldStr, ok := field.(string); ok {
				fields[i] = fieldStr
			} else {
				return nil, fmt.Errorf("field must be string")
			}
		}
		
		return NewRequiredRule(id, name, fields), nil
	})
	
	// 注册Length规则模板
	f.RegisterRuleTemplate(RuleTypeLength, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for length rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Length Rule"
		}
		
		field, ok := config["field"].(string)
		if !ok {
			return nil, fmt.Errorf("field is required for length rule")
		}
		
		rule := NewLengthRule(id, name, field)
		
		if min, ok := config["min"].(int); ok {
			rule.SetMin(min)
		}
		
		if max, ok := config["max"].(int); ok {
			rule.SetMax(max)
		}
		
		if exact, ok := config["exact"].(int); ok {
			rule.SetExact(exact)
		}
		
		return rule, nil
	})
	
	// 注册Regex规则模板
	f.RegisterRuleTemplate(RuleTypeRegex, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for regex rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Regex Rule"
		}
		
		field, ok := config["field"].(string)
		if !ok {
			return nil, fmt.Errorf("field is required for regex rule")
		}
		
		pattern, ok := config["pattern"].(string)
		if !ok {
			return nil, fmt.Errorf("pattern is required for regex rule")
		}
		
		rule, err := NewRegexRule(id, name, field, pattern)
		if err != nil {
			return nil, err
		}
		
		if message, ok := config["message"].(string); ok {
			rule.SetMessage(message)
		}
		
		return rule, nil
	})
	
	// 注册Range规则模板
	f.RegisterRuleTemplate(RuleTypeRange, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for range rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Range Rule"
		}
		
		field, ok := config["field"].(string)
		if !ok {
			return nil, fmt.Errorf("field is required for range rule")
		}
		
		rule := NewRangeRule(id, name, field)
		
		if min, ok := config["min"].(float64); ok {
			rule.SetMin(min)
		} else if minInt, ok := config["min"].(int); ok {
			rule.SetMin(float64(minInt))
		}
		
		if max, ok := config["max"].(float64); ok {
			rule.SetMax(max)
		} else if maxInt, ok := config["max"].(int); ok {
			rule.SetMax(float64(maxInt))
		}
		
		return rule, nil
	})
	
	// 注册Email规则模板
	f.RegisterRuleTemplate(RuleTypeEmail, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for email rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Email Rule"
		}
		
		field, ok := config["field"].(string)
		if !ok {
			return nil, fmt.Errorf("field is required for email rule")
		}
		
		return NewEmailRule(id, name, field)
	})
	
	// 注册Date规则模板
	f.RegisterRuleTemplate(RuleTypeDate, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for date rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Date Rule"
		}
		
		field, ok := config["field"].(string)
		if !ok {
			return nil, fmt.Errorf("field is required for date rule")
		}
		
		format, ok := config["format"].(string)
		if !ok {
			format = "2006-01-02" // 默认日期格式
		}
		
		rule := NewDateRule(id, name, field, format)
		
		if beforeStr, ok := config["before"].(string); ok {
			if beforeTime, err := parseTime(beforeStr, format); err == nil {
				rule.SetBefore(beforeTime)
			}
		}
		
		if afterStr, ok := config["after"].(string); ok {
			if afterTime, err := parseTime(afterStr, format); err == nil {
				rule.SetAfter(afterTime)
			}
		}
		
		return rule, nil
	})
	
	// 注册Enum规则模板
	f.RegisterRuleTemplate(RuleTypeEnum, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for enum rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Enum Rule"
		}
		
		field, ok := config["field"].(string)
		if !ok {
			return nil, fmt.Errorf("field is required for enum rule")
		}
		
		allowedValues, ok := config["allowed_values"].([]interface{})
		if !ok {
			return nil, fmt.Errorf("allowed_values is required for enum rule")
		}
		
		rule := NewEnumRule(id, name, field, allowedValues)
		
		if caseSensitive, ok := config["case_sensitive"].(bool); ok {
			rule.SetCaseSensitive(caseSensitive)
		}
		
		return rule, nil
	})
	
	// 注册Custom规则模板
	f.RegisterRuleTemplate(RuleTypeCustom, func(config map[string]interface{}) (IValidationRule, error) {
		id, ok := config["id"].(string)
		if !ok {
			return nil, fmt.Errorf("id is required for custom rule")
		}
		
		name, ok := config["name"].(string)
		if !ok {
			name = "Custom Rule"
		}
		
		// 对于自定义规则，这里只能创建一个空的规则框架
		// 实际的验证函数需要后续设置
		return NewCustomRule(id, name, nil), nil
	})
}

// parseTime 解析时间字符串
func parseTime(timeStr, format string) (time.Time, error) {
	return time.Parse(format, timeStr)
}

// ValidationFactoryBuilder 验证工厂构建器
type ValidationFactoryBuilder struct {
	factory *ValidationFactory
}

// NewValidationFactoryBuilder 创建工厂构建器
func NewValidationFactoryBuilder() *ValidationFactoryBuilder {
	return &ValidationFactoryBuilder{
		factory: NewValidationFactory(),
	}
}

// WithCustomTemplate 添加自定义模板
func (b *ValidationFactoryBuilder) WithCustomTemplate(ruleType RuleType, creator func(config map[string]interface{}) (IValidationRule, error)) *ValidationFactoryBuilder {
	b.factory.RegisterRuleTemplate(ruleType, creator)
	return b
}

// Build 构建工厂实例
func (b *ValidationFactoryBuilder) Build() *ValidationFactory {
	return b.factory
}

// 全局默认工厂实例
var (
	defaultFactory     *ValidationFactory
	defaultFactoryOnce sync.Once
)

// GetDefaultFactory 获取默认工厂实例
func GetDefaultFactory() *ValidationFactory {
	defaultFactoryOnce.Do(func() {
		defaultFactory = NewValidationFactory()
	})
	return defaultFactory
}

// 便利方法，使用默认工厂

// CreateRequiredRule 使用默认工厂创建必填验证规则
func CreateRequiredRule(id, name string, fields []string) IValidationRule {
	return GetDefaultFactory().CreateRequiredRule(id, name, fields)
}

// CreateLengthRule 使用默认工厂创建长度验证规则
func CreateLengthRule(id, name, field string) *LengthRule {
	return GetDefaultFactory().CreateLengthRule(id, name, field)
}

// CreateRegexRule 使用默认工厂创建正则表达式验证规则
func CreateRegexRule(id, name, field, pattern string) (IValidationRule, error) {
	return GetDefaultFactory().CreateRegexRule(id, name, field, pattern)
}

// CreateRangeRule 使用默认工厂创建数值范围验证规则
func CreateRangeRule(id, name, field string) *RangeRule {
	return GetDefaultFactory().CreateRangeRule(id, name, field)
}

// CreateEmailRule 使用默认工厂创建邮箱验证规则
func CreateEmailRule(id, name, field string) (IValidationRule, error) {
	return GetDefaultFactory().CreateEmailRule(id, name, field)
}

// CreateDateRule 使用默认工厂创建日期验证规则
func CreateDateRule(id, name, field, format string) *DateRule {
	return GetDefaultFactory().CreateDateRule(id, name, field, format)
}

// CreateEnumRule 使用默认工厂创建枚举验证规则
func CreateEnumRule(id, name, field string, allowedValues []interface{}) *EnumRule {
	return GetDefaultFactory().CreateEnumRule(id, name, field, allowedValues)
}

// CreateCustomRule 使用默认工厂创建自定义验证规则
func CreateCustomRule(id, name string, validateFunc func(ctx IValidationContext, result *ValidationResult) error) *CustomRule {
	return GetDefaultFactory().CreateCustomRule(id, name, validateFunc)
}

// CreatePipeline 使用默认工厂创建验证管道
func CreatePipeline(id, name string) *ValidationPipeline {
	return GetDefaultFactory().CreatePipeline(id, name)
}

// CreateStage 使用默认工厂创建验证阶段
func CreateStage(id, name string, order int) *ValidationStageImpl {
	return GetDefaultFactory().CreateStage(id, name, order)
}

// CreateEngine 使用默认工厂创建验证引擎
func CreateEngine(config *ValidationConfig) *ValidationEngine {
	return GetDefaultFactory().CreateEngine(config)
}