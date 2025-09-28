package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// RuleConfig 规则配置结构
type RuleConfig struct {
	ID          string                 `json:"id" yaml:"id"`
	Name        string                 `json:"name" yaml:"name"`
	Type        string                 `json:"type" yaml:"type"`
	Description string                 `json:"description,omitempty" yaml:"description,omitempty"`
	Priority    int                    `json:"priority,omitempty" yaml:"priority,omitempty"`
	Enabled     bool                   `json:"enabled,omitempty" yaml:"enabled,omitempty"`
	Params      map[string]interface{} `json:"params,omitempty" yaml:"params,omitempty"`
	Tags        []string               `json:"tags,omitempty" yaml:"tags,omitempty"`
	Conditions  []ConditionConfig      `json:"conditions,omitempty" yaml:"conditions,omitempty"`
	Children    []RuleConfig           `json:"children,omitempty" yaml:"children,omitempty"`
	Async       *AsyncConfig           `json:"async,omitempty" yaml:"async,omitempty"`
}

// ConditionConfig 条件配置结构
type ConditionConfig struct {
	Type      string        `json:"type" yaml:"type"`
	Field     string        `json:"field" yaml:"field"`
	Value     interface{}   `json:"value,omitempty" yaml:"value,omitempty"`
	Values    []interface{} `json:"values,omitempty" yaml:"values,omitempty"`
	Operator  string        `json:"operator,omitempty" yaml:"operator,omitempty"`
	Pattern   string        `json:"pattern,omitempty" yaml:"pattern,omitempty"`
	MinLength int           `json:"min_length,omitempty" yaml:"min_length,omitempty"`
	MaxLength int           `json:"max_length,omitempty" yaml:"max_length,omitempty"`
}

// AsyncConfig 异步配置结构
type AsyncConfig struct {
	Timeout    string `json:"timeout,omitempty" yaml:"timeout,omitempty"`
	Retries    int    `json:"retries,omitempty" yaml:"retries,omitempty"`
	RetryDelay string `json:"retry_delay,omitempty" yaml:"retry_delay,omitempty"`
	URL        string `json:"url,omitempty" yaml:"url,omitempty"`
	Table      string `json:"table,omitempty" yaml:"table,omitempty"`
	Field      string `json:"field,omitempty" yaml:"field,omitempty"`
	FilePath   string `json:"file_path,omitempty" yaml:"file_path,omitempty"`
}

// ValidationConfigFile 验证配置文件结构
type ValidationConfigFile struct {
	Version     string                 `json:"version" yaml:"version"`
	Name        string                 `json:"name" yaml:"name"`
	Description string                 `json:"description,omitempty" yaml:"description,omitempty"`
	Settings    map[string]interface{} `json:"settings,omitempty" yaml:"settings,omitempty"`
	Rules       []RuleConfig           `json:"rules" yaml:"rules"`
	Pipelines   []PipelineConfig       `json:"pipelines,omitempty" yaml:"pipelines,omitempty"`
}

// PipelineConfig 管道配置结构
type PipelineConfig struct {
	ID          string       `json:"id" yaml:"id"`
	Name        string       `json:"name" yaml:"name"`
	Description string       `json:"description,omitempty" yaml:"description,omitempty"`
	Stages      []StageConfig `json:"stages" yaml:"stages"`
}

// StageConfig 阶段配置结构
type StageConfig struct {
	ID           string   `json:"id" yaml:"id"`
	Name         string   `json:"name" yaml:"name"`
	Description  string   `json:"description,omitempty" yaml:"description,omitempty"`
	Order        int      `json:"order" yaml:"order"`
	RuleIDs      []string `json:"rule_ids" yaml:"rule_ids"`
	Dependencies []string `json:"dependencies,omitempty" yaml:"dependencies,omitempty"`
	Timeout      string   `json:"timeout,omitempty" yaml:"timeout,omitempty"`
}

// ConfigLoader 配置加载器
type ConfigLoader struct {
	rules     map[string]IValidationRule
	pipelines map[string]IValidationPipeline
	factory   *ValidationFactory
}

// NewConfigLoader 创建配置加载器
func NewConfigLoader(factory *ValidationFactory) *ConfigLoader {
	return &ConfigLoader{
		rules:     make(map[string]IValidationRule),
		pipelines: make(map[string]IValidationPipeline),
		factory:   factory,
	}
}

// LoadFromFile 从文件加载配置
func (cl *ConfigLoader) LoadFromFile(filename string) (*ValidationConfigFile, error) {
	data, err := ioutil.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file '%s': %w", filename, err)
	}

	var config ValidationConfigFile
	
	// 根据文件扩展名选择解析器
	if strings.HasSuffix(strings.ToLower(filename), ".yaml") || strings.HasSuffix(strings.ToLower(filename), ".yml") {
		err = yaml.Unmarshal(data, &config)
	} else if strings.HasSuffix(strings.ToLower(filename), ".json") {
		err = json.Unmarshal(data, &config)
	} else {
		// 尝试JSON解析，如果失败再尝试YAML
		err = json.Unmarshal(data, &config)
		if err != nil {
			err = yaml.Unmarshal(data, &config)
		}
	}

	if err != nil {
		return nil, fmt.Errorf("failed to parse config file '%s': %w", filename, err)
	}

	return &config, nil
}

// LoadFromString 从字符串加载配置
func (cl *ConfigLoader) LoadFromString(configData string, format string) (*ValidationConfigFile, error) {
	var config ValidationConfigFile
	var err error

	switch strings.ToLower(format) {
	case "yaml", "yml":
		err = yaml.Unmarshal([]byte(configData), &config)
	case "json":
		err = json.Unmarshal([]byte(configData), &config)
	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to parse config data: %w", err)
	}

	return &config, nil
}

// CreateRulesFromConfig 从配置创建验证规则
func (cl *ConfigLoader) CreateRulesFromConfig(config *ValidationConfigFile) error {
	for _, ruleConfig := range config.Rules {
		rule, err := cl.createRule(ruleConfig)
		if err != nil {
			return fmt.Errorf("failed to create rule '%s': %w", ruleConfig.ID, err)
		}
		cl.rules[ruleConfig.ID] = rule
	}
	return nil
}

// createRule 创建单个规则
func (cl *ConfigLoader) createRule(config RuleConfig) (IValidationRule, error) {
	// 设置默认值
	if config.Priority == 0 {
		config.Priority = 50
	}
	if !config.Enabled && config.Type != "" {
		config.Enabled = true // 默认启用
	}

	switch strings.ToLower(config.Type) {
	case "required":
		return cl.createRequiredRule(config)
	case "length":
		return cl.createLengthRule(config)
	case "range":
		return cl.createRangeRule(config)
	case "email":
		return cl.createEmailRule(config)
	case "regex":
		return cl.createRegexRule(config)
	case "date":
		return cl.createDateRule(config)
	case "enum":
		return cl.createEnumRule(config)
	case "custom":
		return cl.createCustomRule(config)
	case "and":
		return cl.createAndRule(config)
	case "or":
		return cl.createOrRule(config)
	case "not":
		return cl.createNotRule(config)
	case "xor":
		return cl.createXorRule(config)
	case "conditional":
		return cl.createConditionalRule(config)
	case "async":
		return cl.createAsyncRule(config)
	default:
		return nil, fmt.Errorf("unsupported rule type: %s", config.Type)
	}
}

// createRequiredRule 创建必填规则
func (cl *ConfigLoader) createRequiredRule(config RuleConfig) (IValidationRule, error) {
	fields, ok := config.Params["fields"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("required rule must have 'fields' parameter")
	}

	var fieldStrs []string
	for _, field := range fields {
		if str, ok := field.(string); ok {
			fieldStrs = append(fieldStrs, str)
		}
	}

	rule := CreateRequiredRule(config.ID, config.Name, fieldStrs)
	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createLengthRule 创建长度规则
func (cl *ConfigLoader) createLengthRule(config RuleConfig) (IValidationRule, error) {
	field, ok := config.Params["field"].(string)
	if !ok {
		return nil, fmt.Errorf("length rule must have 'field' parameter")
	}

	rule := CreateLengthRule(config.ID, config.Name, field)

	if min, ok := config.Params["min"]; ok {
		if minInt, ok := min.(int); ok {
			rule.SetMin(minInt)
		} else if minFloat, ok := min.(float64); ok {
			rule.SetMin(int(minFloat))
		}
	}

	if max, ok := config.Params["max"]; ok {
		if maxInt, ok := max.(int); ok {
			rule.SetMax(maxInt)
		} else if maxFloat, ok := max.(float64); ok {
			rule.SetMax(int(maxFloat))
		}
	}

	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createRangeRule 创建范围规则
func (cl *ConfigLoader) createRangeRule(config RuleConfig) (IValidationRule, error) {
	field, ok := config.Params["field"].(string)
	if !ok {
		return nil, fmt.Errorf("range rule must have 'field' parameter")
	}

	rule := CreateRangeRule(config.ID, config.Name, field)

	if min, ok := config.Params["min"]; ok {
		if minFloat, ok := min.(float64); ok {
			rule.SetMin(minFloat)
		} else if minInt, ok := min.(int); ok {
			rule.SetMin(float64(minInt))
		}
	}

	if max, ok := config.Params["max"]; ok {
		if maxFloat, ok := max.(float64); ok {
			rule.SetMax(maxFloat)
		} else if maxInt, ok := max.(int); ok {
			rule.SetMax(float64(maxInt))
		}
	}

	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createEmailRule 创建邮箱规则
func (cl *ConfigLoader) createEmailRule(config RuleConfig) (IValidationRule, error) {
	field, ok := config.Params["field"].(string)
	if !ok {
		return nil, fmt.Errorf("email rule must have 'field' parameter")
	}

	rule, err := CreateEmailRule(config.ID, config.Name, field)
	if err != nil {
		return nil, err
	}

	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createRegexRule 创建正则规则
func (cl *ConfigLoader) createRegexRule(config RuleConfig) (IValidationRule, error) {
	field, ok := config.Params["field"].(string)
	if !ok {
		return nil, fmt.Errorf("regex rule must have 'field' parameter")
	}

	pattern, ok := config.Params["pattern"].(string)
	if !ok {
		return nil, fmt.Errorf("regex rule must have 'pattern' parameter")
	}

	rule, err := CreateRegexRule(config.ID, config.Name, field, pattern)
	if err != nil {
		return nil, err
	}

	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createDateRule 创建日期规则
func (cl *ConfigLoader) createDateRule(config RuleConfig) (IValidationRule, error) {
	field, ok := config.Params["field"].(string)
	if !ok {
		return nil, fmt.Errorf("date rule must have 'field' parameter")
	}

	format, ok := config.Params["format"].(string)
	if !ok {
		format = "2006-01-02" // 默认格式
	}

	rule := CreateDateRule(config.ID, config.Name, field, format)

	if after, ok := config.Params["after"].(string); ok {
		if afterTime, err := time.Parse(format, after); err == nil {
			rule.SetAfter(afterTime)
		}
	}

	if before, ok := config.Params["before"].(string); ok {
		if beforeTime, err := time.Parse(format, before); err == nil {
			rule.SetBefore(beforeTime)
		}
	}

	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createEnumRule 创建枚举规则
func (cl *ConfigLoader) createEnumRule(config RuleConfig) (IValidationRule, error) {
	field, ok := config.Params["field"].(string)
	if !ok {
		return nil, fmt.Errorf("enum rule must have 'field' parameter")
	}

	values, ok := config.Params["values"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("enum rule must have 'values' parameter")
	}

	rule := CreateEnumRule(config.ID, config.Name, field, values)
	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createCustomRule 创建自定义规则
func (cl *ConfigLoader) createCustomRule(config RuleConfig) (IValidationRule, error) {
	// 对于配置文件中的自定义规则，我们创建一个占位符
	// 实际的验证逻辑需要在运行时通过回调注入
	rule := CreateCustomRule(config.ID, config.Name, func(ctx IValidationContext, result *ValidationResult) error {
		// 这里可以根据配置参数实现一些基本的自定义验证逻辑
		// 或者从注册的自定义验证器中查找
		result.AddWarning(ValidationWarning{
			Field:     "",
			Message:   fmt.Sprintf("Custom rule '%s' needs implementation", config.Name),
			Code:      "CUSTOM_RULE_NOT_IMPLEMENTED",
			Timestamp: time.Now(),
		})
		return nil
	})

	cl.applyCommonSettings(rule, config)
	return rule, nil
}

// createAndRule 创建AND组合规则
func (cl *ConfigLoader) createAndRule(config RuleConfig) (IValidationRule, error) {
	var childRules []IValidationRule
	for _, childConfig := range config.Children {
		childRule, err := cl.createRule(childConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to create child rule for AND rule: %w", err)
		}
		childRules = append(childRules, childRule)
	}

	rule := CreateAndRule(config.ID, config.Name, childRules...)
	if config.Description != "" {
		rule.SetDescription(config.Description)
	}
	return rule, nil
}

// createOrRule 创建OR组合规则
func (cl *ConfigLoader) createOrRule(config RuleConfig) (IValidationRule, error) {
	var childRules []IValidationRule
	for _, childConfig := range config.Children {
		childRule, err := cl.createRule(childConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to create child rule for OR rule: %w", err)
		}
		childRules = append(childRules, childRule)
	}

	rule := CreateOrRule(config.ID, config.Name, childRules...)
	if config.Description != "" {
		rule.SetDescription(config.Description)
	}
	return rule, nil
}

// createNotRule 创建NOT组合规则
func (cl *ConfigLoader) createNotRule(config RuleConfig) (IValidationRule, error) {
	if len(config.Children) != 1 {
		return nil, fmt.Errorf("NOT rule must have exactly one child rule")
	}

	childRule, err := cl.createRule(config.Children[0])
	if err != nil {
		return nil, fmt.Errorf("failed to create child rule for NOT rule: %w", err)
	}

	rule := CreateNotRule(config.ID, config.Name, childRule)
	if config.Description != "" {
		rule.SetDescription(config.Description)
	}
	return rule, nil
}

// createXorRule 创建XOR组合规则
func (cl *ConfigLoader) createXorRule(config RuleConfig) (IValidationRule, error) {
	var childRules []IValidationRule
	for _, childConfig := range config.Children {
		childRule, err := cl.createRule(childConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to create child rule for XOR rule: %w", err)
		}
		childRules = append(childRules, childRule)
	}

	rule := CreateXorRule(config.ID, config.Name, childRules...)
	if config.Description != "" {
		rule.SetDescription(config.Description)
	}
	return rule, nil
}

// createConditionalRule 创建条件规则
func (cl *ConfigLoader) createConditionalRule(config RuleConfig) (IValidationRule, error) {
	if len(config.Conditions) == 0 {
		return nil, fmt.Errorf("conditional rule must have at least one condition")
	}

	// 暂时只支持第一个条件
	conditionConfig := config.Conditions[0]
	condition := cl.createCondition(conditionConfig)

	var thenRule, elseRule IValidationRule
	var err error

	if len(config.Children) > 0 {
		thenRule, err = cl.createRule(config.Children[0])
		if err != nil {
			return nil, fmt.Errorf("failed to create THEN rule: %w", err)
		}
	}

	if len(config.Children) > 1 {
		elseRule, err = cl.createRule(config.Children[1])
		if err != nil {
			return nil, fmt.Errorf("failed to create ELSE rule: %w", err)
		}
	}

	rule := CreateConditionalRule(config.ID, config.Name, condition, thenRule, elseRule)
	if config.Description != "" {
		rule.SetDescription(config.Description)
	}
	return rule, nil
}

// createAsyncRule 创建异步规则
func (cl *ConfigLoader) createAsyncRule(config RuleConfig) (IValidationRule, error) {
	if config.Async == nil {
		return nil, fmt.Errorf("async rule must have async configuration")
	}

	timeout, _ := time.ParseDuration(config.Async.Timeout)
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	var rule *AsyncRule
	if config.Async.URL != "" {
		rule = CreateAsyncRemoteValidationRule(config.ID, config.Name, config.Async.URL, timeout)
	} else if config.Async.Table != "" && config.Async.Field != "" {
		rule = CreateAsyncDatabaseValidationRule(config.ID, config.Name, config.Async.Table, config.Async.Field, timeout)
	} else if config.Async.FilePath != "" {
		rule = CreateAsyncFileValidationRule(config.ID, config.Name, config.Async.FilePath, timeout)
	} else {
		return nil, fmt.Errorf("async rule must specify URL, Table/Field, or FilePath")
	}

	if config.Async.Retries > 0 {
		rule.SetRetries(config.Async.Retries)
	}

	if config.Async.RetryDelay != "" {
		if delay, err := time.ParseDuration(config.Async.RetryDelay); err == nil {
			rule.SetRetryDelay(delay)
		}
	}

	if config.Description != "" {
		rule.SetDescription(config.Description)
	}

	return rule, nil
}

// createCondition 创建条件
func (cl *ConfigLoader) createCondition(config ConditionConfig) *Condition {
	condition := &Condition{
		Field:     config.Field,
		Value:     config.Value,
		Values:    config.Values,
		Operator:  config.Operator,
		Pattern:   config.Pattern,
		MinLength: config.MinLength,
		MaxLength: config.MaxLength,
	}

	// 转换条件类型字符串为枚举
	switch strings.ToLower(config.Type) {
	case "equals":
		condition.Type = ConditionEquals
	case "not_equals":
		condition.Type = ConditionNotEquals
	case "greater_than":
		condition.Type = ConditionGreaterThan
	case "less_than":
		condition.Type = ConditionLessThan
	case "greater_or_equal":
		condition.Type = ConditionGreaterOrEqual
	case "less_or_equal":
		condition.Type = ConditionLessOrEqual
	case "contains":
		condition.Type = ConditionContains
	case "not_contains":
		condition.Type = ConditionNotContains
	case "starts_with":
		condition.Type = ConditionStartsWith
	case "ends_with":
		condition.Type = ConditionEndsWith
	case "regex_match":
		condition.Type = ConditionRegexMatch
	case "exists":
		condition.Type = ConditionExists
	case "not_exists":
		condition.Type = ConditionNotExists
	case "empty":
		condition.Type = ConditionEmpty
	case "not_empty":
		condition.Type = ConditionNotEmpty
	case "length":
		condition.Type = ConditionLength
	case "in":
		condition.Type = ConditionIn
	case "not_in":
		condition.Type = ConditionNotIn
	}

	return condition
}

// applyCommonSettings 应用通用设置
func (cl *ConfigLoader) applyCommonSettings(rule IValidationRule, config RuleConfig) {
	rule.SetEnabled(config.Enabled)
}

// GetRules 获取所有规则
func (cl *ConfigLoader) GetRules() map[string]IValidationRule {
	return cl.rules
}

// GetRule 获取指定规则
func (cl *ConfigLoader) GetRule(id string) (IValidationRule, bool) {
	rule, exists := cl.rules[id]
	return rule, exists
}

// CreateEngineFromConfig 从配置创建验证引擎
func (cl *ConfigLoader) CreateEngineFromConfig(config *ValidationConfigFile) (*ValidationEngine, error) {
	// 创建验证配置
	validationConfig := NewValidationConfig()

	// 应用配置文件中的设置
	if settings := config.Settings; settings != nil {
		if strictMode, ok := settings["strict_mode"].(bool); ok {
			validationConfig.StrictMode = strictMode
		}
		if failFast, ok := settings["fail_fast"].(bool); ok {
			validationConfig.FailFast = failFast
		}
		if maxErrors, ok := settings["max_errors"]; ok {
			if maxErrorsInt, ok := maxErrors.(int); ok {
				validationConfig.MaxErrors = maxErrorsInt
			} else if maxErrorsFloat, ok := maxErrors.(float64); ok {
				validationConfig.MaxErrors = int(maxErrorsFloat)
			}
		}
		if maxConcurrency, ok := settings["max_concurrency"]; ok {
			if maxConcurrencyInt, ok := maxConcurrency.(int); ok {
				validationConfig.MaxConcurrency = maxConcurrencyInt
			} else if maxConcurrencyFloat, ok := maxConcurrency.(float64); ok {
				validationConfig.MaxConcurrency = int(maxConcurrencyFloat)
			}
		}
	}

	// 创建验证引擎
	engine := NewValidationEngine(*validationConfig)

	// 注册所有规则
	for _, rule := range cl.rules {
		if err := engine.RegisterRule(rule); err != nil {
			return nil, fmt.Errorf("failed to register rule '%s': %w", rule.GetID(), err)
		}
	}

	return engine, nil
}

// SaveToFile 保存配置到文件
func (cl *ConfigLoader) SaveToFile(config *ValidationConfigFile, filename string) error {
	var data []byte
	var err error

	if strings.HasSuffix(strings.ToLower(filename), ".yaml") || strings.HasSuffix(strings.ToLower(filename), ".yml") {
		data, err = yaml.Marshal(config)
	} else {
		data, err = json.MarshalIndent(config, "", "  ")
	}

	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	err = ioutil.WriteFile(filename, data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write config file '%s': %w", filename, err)
	}

	return nil
}