package main

import (
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// RequiredRule 必填验证规则
type RequiredRule struct {
	*BaseValidator
	fields []string // 要验证的字段列表
}

// NewRequiredRule 创建必填验证规则
func NewRequiredRule(id, name string, fields []string) *RequiredRule {
	rule := &RequiredRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeRequired, 100),
		fields:       fields,
	}
	rule.SetDescription("验证指定字段是否为必填")
	return rule
}

// Validate 执行验证
func (r *RequiredRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	for _, field := range r.fields {
		value := ctx.GetValue(field)
		
		if r.isEmpty(value) {
			result.AddError(ValidationError{
				Field:    field,
				Message:  fmt.Sprintf("字段 '%s' 不能为空", field),
				Type:     ErrorTypeRequired,
				Severity: ErrorSeverityHigh,
				Code:     "REQUIRED_FIELD",
				Timestamp: time.Now(),
			})
		}
	}
	
	r.incrementStats(1, 0)
	return nil
}

// isEmpty 检查值是否为空
func (r *RequiredRule) isEmpty(value interface{}) bool {
	if value == nil {
		return true
	}
	
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.String:
		return strings.TrimSpace(v.String()) == ""
	case reflect.Slice, reflect.Array, reflect.Map:
		return v.Len() == 0
	case reflect.Ptr, reflect.Interface:
		return v.IsNil()
	default:
		return false
	}
}

// LengthRule 长度验证规则
type LengthRule struct {
	*BaseValidator
	field  string
	min    *int
	max    *int
	exact  *int
}

// NewLengthRule 创建长度验证规则
func NewLengthRule(id, name, field string) *LengthRule {
	rule := &LengthRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeLength, 80),
		field:        field,
	}
	rule.SetDescription("验证字段长度")
	return rule
}

// SetMin 设置最小长度
func (r *LengthRule) SetMin(min int) *LengthRule {
	r.min = &min
	return r
}

// SetMax 设置最大长度
func (r *LengthRule) SetMax(max int) *LengthRule {
	r.max = &max
	return r
}

// SetExact 设置精确长度
func (r *LengthRule) SetExact(exact int) *LengthRule {
	r.exact = &exact
	return r
}

// Validate 执行验证
func (r *LengthRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	value := ctx.GetValue(r.field)
	if value == nil {
		return nil // 如果值为nil，跳过长度验证
	}
	
	length := r.getLength(value)
	if length == -1 {
		return fmt.Errorf("field '%s' type does not support length validation", r.field)
	}
	
	// 精确长度验证
	if r.exact != nil {
		if length != *r.exact {
			result.AddError(ValidationError{
				Field:    r.field,
				Message:  fmt.Sprintf("字段 '%s' 长度必须为 %d，当前为 %d", r.field, *r.exact, length),
				Type:     ErrorTypeLength,
				Severity: ErrorSeverityMedium,
				Code:     "LENGTH_EXACT",
				Timestamp: time.Now(),
			})
		}
	} else {
		// 最小长度验证
		if r.min != nil && length < *r.min {
			result.AddError(ValidationError{
				Field:    r.field,
				Message:  fmt.Sprintf("字段 '%s' 长度不能少于 %d，当前为 %d", r.field, *r.min, length),
				Type:     ErrorTypeLength,
				Severity: ErrorSeverityMedium,
				Code:     "LENGTH_MIN",
				Timestamp: time.Now(),
			})
		}
		
		// 最大长度验证
		if r.max != nil && length > *r.max {
			result.AddError(ValidationError{
				Field:    r.field,
				Message:  fmt.Sprintf("字段 '%s' 长度不能超过 %d，当前为 %d", r.field, *r.max, length),
				Type:     ErrorTypeLength,
				Severity: ErrorSeverityMedium,
				Code:     "LENGTH_MAX",
				Timestamp: time.Now(),
			})
		}
	}
	
	r.incrementStats(1, 0)
	return nil
}

// getLength 获取值的长度
func (r *LengthRule) getLength(value interface{}) int {
	if value == nil {
		return 0
	}
	
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.String:
		return len([]rune(v.String())) // 支持中文字符
	case reflect.Slice, reflect.Array, reflect.Map:
		return v.Len()
	default:
		return -1 // 不支持的类型
	}
}

// RegexRule 正则表达式验证规则
type RegexRule struct {
	*BaseValidator
	field   string
	pattern *regexp.Regexp
	message string
}

// NewRegexRule 创建正则表达式验证规则
func NewRegexRule(id, name, field, pattern string) (*RegexRule, error) {
	regex, err := regexp.Compile(pattern)
	if err != nil {
		return nil, fmt.Errorf("invalid regex pattern: %w", err)
	}
	
	rule := &RegexRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeRegex, 70),
		field:        field,
		pattern:      regex,
		message:      fmt.Sprintf("字段 '%s' 格式不正确", field),
	}
	rule.SetDescription("使用正则表达式验证字段格式")
	return rule, nil
}

// SetMessage 设置自定义错误消息
func (r *RegexRule) SetMessage(message string) *RegexRule {
	r.message = message
	return r
}

// Validate 执行验证
func (r *RegexRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	value := ctx.GetValue(r.field)
	if value == nil {
		return nil // 如果值为nil，跳过正则验证
	}
	
	str, ok := value.(string)
	if !ok {
		return fmt.Errorf("field '%s' must be string for regex validation", r.field)
	}
	
	if !r.pattern.MatchString(str) {
		result.AddError(ValidationError{
			Field:    r.field,
			Message:  r.message,
			Type:     ErrorTypeFormat,
			Severity: ErrorSeverityMedium,
			Code:     "REGEX_MISMATCH",
			Timestamp: time.Now(),
		})
	}
	
	r.incrementStats(1, 0)
	return nil
}

// RangeRule 数值范围验证规则
type RangeRule struct {
	*BaseValidator
	field string
	min   *float64
	max   *float64
}

// NewRangeRule 创建数值范围验证规则
func NewRangeRule(id, name, field string) *RangeRule {
	rule := &RangeRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeRange, 60),
		field:        field,
	}
	rule.SetDescription("验证数值范围")
	return rule
}

// SetMin 设置最小值
func (r *RangeRule) SetMin(min float64) *RangeRule {
	r.min = &min
	return r
}

// SetMax 设置最大值
func (r *RangeRule) SetMax(max float64) *RangeRule {
	r.max = &max
	return r
}

// Validate 执行验证
func (r *RangeRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	value := ctx.GetValue(r.field)
	if value == nil {
		return nil // 如果值为nil，跳过范围验证
	}
	
	numValue, err := r.toFloat64(value)
	if err != nil {
		return fmt.Errorf("field '%s' must be numeric for range validation: %w", r.field, err)
	}
	
	// 最小值验证
	if r.min != nil && numValue < *r.min {
		result.AddError(ValidationError{
			Field:    r.field,
			Message:  fmt.Sprintf("字段 '%s' 不能小于 %v，当前值为 %v", r.field, *r.min, numValue),
			Type:     ErrorTypeRange,
			Severity: ErrorSeverityMedium,
			Code:     "RANGE_MIN",
		})
	}
	
	// 最大值验证
	if r.max != nil && numValue > *r.max {
		result.AddError(ValidationError{
			Field:    r.field,
			Message:  fmt.Sprintf("字段 '%s' 不能大于 %v，当前值为 %v", r.field, *r.max, numValue),
			Type:     ErrorTypeRange,
			Severity: ErrorSeverityMedium,
			Code:     "RANGE_MAX",
		})
	}
	
	r.incrementStats(1, 0)
	return nil
}

// toFloat64 将值转换为float64
func (r *RangeRule) toFloat64(value interface{}) (float64, error) {
	switch v := value.(type) {
	case int:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case float32:
		return float64(v), nil
	case float64:
		return v, nil
	case string:
		return strconv.ParseFloat(v, 64)
	default:
		return 0, fmt.Errorf("unsupported type for numeric conversion: %T", value)
	}
}

// EmailRule 邮箱验证规则
type EmailRule struct {
	*RegexRule
}

// NewEmailRule 创建邮箱验证规则
func NewEmailRule(id, name, field string) (*EmailRule, error) {
	// 简化的邮箱正则表达式
	emailPattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	regexRule, err := NewRegexRule(id, name, field, emailPattern)
	if err != nil {
		return nil, err
	}
	
	rule := &EmailRule{
		RegexRule: regexRule,
	}
	rule.SetDescription("验证邮箱地址格式")
	rule.SetMessage(fmt.Sprintf("字段 '%s' 不是有效的邮箱地址", field))
	return rule, nil
}

// DateRule 日期验证规则
type DateRule struct {
	*BaseValidator
	field  string
	format string
	before *time.Time
	after  *time.Time
}

// NewDateRule 创建日期验证规则
func NewDateRule(id, name, field, format string) *DateRule {
	rule := &DateRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeDate, 60),
		field:        field,
		format:       format,
	}
	rule.SetDescription("验证日期格式和范围")
	return rule
}

// SetBefore 设置日期不能晚于指定日期
func (r *DateRule) SetBefore(before time.Time) *DateRule {
	r.before = &before
	return r
}

// SetAfter 设置日期不能早于指定日期
func (r *DateRule) SetAfter(after time.Time) *DateRule {
	r.after = &after
	return r
}

// Validate 执行验证
func (r *DateRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	value := ctx.GetValue(r.field)
	if value == nil {
		return nil // 如果值为nil，跳过日期验证
	}
	
	var date time.Time
	var err error
	
	switch v := value.(type) {
	case string:
		date, err = time.Parse(r.format, v)
		if err != nil {
			result.AddError(ValidationError{
				Field:    r.field,
				Message:  fmt.Sprintf("字段 '%s' 日期格式错误，期望格式: %s", r.field, r.format),
				Type:     ErrorTypeFormat,
				Severity: ErrorSeverityMedium,
				Code:     "DATE_FORMAT",
			})
			return nil
		}
	case time.Time:
		date = v
	default:
		return fmt.Errorf("field '%s' must be string or time.Time for date validation", r.field)
	}
	
	// 检查日期范围
	if r.before != nil && date.After(*r.before) {
		result.AddError(ValidationError{
			Field:    r.field,
			Message:  fmt.Sprintf("字段 '%s' 日期不能晚于 %s", r.field, r.before.Format(r.format)),
			Type:     ErrorTypeRange,
			Severity: ErrorSeverityMedium,
			Code:     "DATE_BEFORE",
		})
	}
	
	if r.after != nil && date.Before(*r.after) {
		result.AddError(ValidationError{
			Field:    r.field,
			Message:  fmt.Sprintf("字段 '%s' 日期不能早于 %s", r.field, r.after.Format(r.format)),
			Type:     ErrorTypeRange,
			Severity: ErrorSeverityMedium,
			Code:     "DATE_AFTER",
		})
	}
	
	r.incrementStats(1, 0)
	return nil
}

// EnumRule 枚举验证规则
type EnumRule struct {
	*BaseValidator
	field         string
	allowedValues []interface{}
	caseSensitive bool
}

// NewEnumRule 创建枚举验证规则
func NewEnumRule(id, name, field string, allowedValues []interface{}) *EnumRule {
	rule := &EnumRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeEnum, 50),
		field:        field,
		allowedValues: allowedValues,
		caseSensitive: true,
	}
	rule.SetDescription("验证字段值是否在允许的枚举值中")
	return rule
}

// SetCaseSensitive 设置是否区分大小写（仅对字符串有效）
func (r *EnumRule) SetCaseSensitive(caseSensitive bool) *EnumRule {
	r.caseSensitive = caseSensitive
	return r
}

// Validate 执行验证
func (r *EnumRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	value := ctx.GetValue(r.field)
	if value == nil {
		return nil // 如果值为nil，跳过枚举验证
	}
	
	found := false
	for _, allowed := range r.allowedValues {
		if r.isEqual(value, allowed) {
			found = true
			break
		}
	}
	
	if !found {
		allowedStr := make([]string, len(r.allowedValues))
		for i, v := range r.allowedValues {
			allowedStr[i] = fmt.Sprintf("%v", v)
		}
		
		result.AddError(ValidationError{
			Field:    r.field,
			Message:  fmt.Sprintf("字段 '%s' 值必须是以下之一: %s，当前值: %v", r.field, strings.Join(allowedStr, ", "), value),
			Type:     ErrorTypeEnum,
			Severity: ErrorSeverityMedium,
			Code:     "ENUM_VALUE",
		})
	}
	
	r.incrementStats(1, 0)
	return nil
}

// isEqual 比较两个值是否相等
func (r *EnumRule) isEqual(a, b interface{}) bool {
	// 如果都是字符串且设置了不区分大小写
	if !r.caseSensitive {
		strA, okA := a.(string)
		strB, okB := b.(string)
		if okA && okB {
			return strings.EqualFold(strA, strB)
		}
	}
	
	return reflect.DeepEqual(a, b)
}

// CustomRule 自定义验证规则
type CustomRule struct {
	*BaseValidator
	validateFunc func(ctx IValidationContext, result *ValidationResult) error
}

// NewCustomRule 创建自定义验证规则
func NewCustomRule(id, name string, validateFunc func(ctx IValidationContext, result *ValidationResult) error) *CustomRule {
	rule := &CustomRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeCustom, 10),
		validateFunc: validateFunc,
	}
	rule.SetDescription("自定义验证规则")
	return rule
}

// Validate 执行验证
func (r *CustomRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	if r.validateFunc == nil {
		return fmt.Errorf("custom validation function not set")
	}
	
	err := r.validateFunc(ctx, result)
	if err == nil {
		r.incrementStats(1, 0)
	} else {
		r.incrementStats(0, 1)
	}
	
	return err
}