package main

import (
	"fmt"
	"reflect"
	"strings"
	"time"
)

// ConditionType 条件类型
type ConditionType int

const (
	ConditionEquals ConditionType = iota    // 等于
	ConditionNotEquals                      // 不等于
	ConditionGreaterThan                    // 大于
	ConditionLessThan                       // 小于
	ConditionGreaterOrEqual                 // 大于等于
	ConditionLessOrEqual                    // 小于等于
	ConditionContains                       // 包含
	ConditionNotContains                    // 不包含
	ConditionStartsWith                     // 开始于
	ConditionEndsWith                       // 结束于
	ConditionRegexMatch                     // 正则匹配
	ConditionExists                         // 存在
	ConditionNotExists                      // 不存在
	ConditionEmpty                          // 为空
	ConditionNotEmpty                       // 非空
	ConditionLength                         // 长度条件
	ConditionIn                             // 在列表中
	ConditionNotIn                          // 不在列表中
)

// String 返回条件类型的字符串表示
func (ct ConditionType) String() string {
	switch ct {
	case ConditionEquals:
		return "equals"
	case ConditionNotEquals:
		return "not_equals"
	case ConditionGreaterThan:
		return "greater_than"
	case ConditionLessThan:
		return "less_than"
	case ConditionGreaterOrEqual:
		return "greater_or_equal"
	case ConditionLessOrEqual:
		return "less_or_equal"
	case ConditionContains:
		return "contains"
	case ConditionNotContains:
		return "not_contains"
	case ConditionStartsWith:
		return "starts_with"
	case ConditionEndsWith:
		return "ends_with"
	case ConditionRegexMatch:
		return "regex_match"
	case ConditionExists:
		return "exists"
	case ConditionNotExists:
		return "not_exists"
	case ConditionEmpty:
		return "empty"
	case ConditionNotEmpty:
		return "not_empty"
	case ConditionLength:
		return "length"
	case ConditionIn:
		return "in"
	case ConditionNotIn:
		return "not_in"
	default:
		return "unknown"
	}
}

// Condition 条件定义
type Condition struct {
	Type      ConditionType   `json:"type"`
	Field     string          `json:"field"`
	Value     interface{}     `json:"value"`
	Values    []interface{}   `json:"values,omitempty"`    // 用于In/NotIn条件
	MinLength int             `json:"min_length,omitempty"` // 用于长度条件
	MaxLength int             `json:"max_length,omitempty"` // 用于长度条件
	Pattern   string          `json:"pattern,omitempty"`    // 用于正则条件
	Operator  string          `json:"operator,omitempty"`   // 用于长度条件的操作符(==, >, <, >=, <=)
}

// Evaluate 评估条件是否满足
func (c *Condition) Evaluate(ctx IValidationContext) (bool, error) {
	switch c.Type {
	case ConditionExists:
		_, exists := ctx.GetFieldValue(c.Field)
		return exists, nil

	case ConditionNotExists:
		_, exists := ctx.GetFieldValue(c.Field)
		return !exists, nil

	case ConditionEmpty:
		return c.evaluateEmpty(ctx)

	case ConditionNotEmpty:
		empty, err := c.evaluateEmpty(ctx)
		return !empty, err

	case ConditionEquals:
		return c.evaluateEquals(ctx)

	case ConditionNotEquals:
		equals, err := c.evaluateEquals(ctx)
		return !equals, err

	case ConditionGreaterThan:
		return c.evaluateComparison(ctx, ">")

	case ConditionLessThan:
		return c.evaluateComparison(ctx, "<")

	case ConditionGreaterOrEqual:
		return c.evaluateComparison(ctx, ">=")

	case ConditionLessOrEqual:
		return c.evaluateComparison(ctx, "<=")

	case ConditionContains:
		return c.evaluateContains(ctx, true)

	case ConditionNotContains:
		return c.evaluateContains(ctx, false)

	case ConditionStartsWith:
		return c.evaluateStringOperation(ctx, "starts_with")

	case ConditionEndsWith:
		return c.evaluateStringOperation(ctx, "ends_with")

	case ConditionLength:
		return c.evaluateLength(ctx)

	case ConditionIn:
		return c.evaluateIn(ctx, true)

	case ConditionNotIn:
		return c.evaluateIn(ctx, false)

	default:
		return false, fmt.Errorf("unsupported condition type: %v", c.Type)
	}
}

// evaluateEmpty 评估空值条件
func (c *Condition) evaluateEmpty(ctx IValidationContext) (bool, error) {
	value, exists := ctx.GetFieldValue(c.Field)
	if !exists {
		return true, nil
	}

	if value == nil {
		return true, nil
	}

	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.String:
		return v.String() == "", nil
	case reflect.Slice, reflect.Array, reflect.Map:
		return v.Len() == 0, nil
	case reflect.Ptr, reflect.Interface:
		return v.IsNil(), nil
	default:
		return false, nil
	}
}

// evaluateEquals 评估相等条件
func (c *Condition) evaluateEquals(ctx IValidationContext) (bool, error) {
	value, exists := ctx.GetFieldValue(c.Field)
	if !exists {
		return c.Value == nil, nil
	}

	return reflect.DeepEqual(value, c.Value), nil
}

// evaluateComparison 评估比较条件
func (c *Condition) evaluateComparison(ctx IValidationContext, operator string) (bool, error) {
	value, exists := ctx.GetFieldValue(c.Field)
	if !exists {
		return false, nil
	}

	return compareValues(value, c.Value, operator)
}

// evaluateContains 评估包含条件
func (c *Condition) evaluateContains(ctx IValidationContext, shouldContain bool) (bool, error) {
	value, exists := ctx.GetFieldValue(c.Field)
	if !exists {
		return !shouldContain, nil
	}

	valueStr := fmt.Sprintf("%v", value)
	expectedStr := fmt.Sprintf("%v", c.Value)

	contains := strings.Contains(valueStr, expectedStr)
	return contains == shouldContain, nil
}

// evaluateStringOperation 评估字符串操作条件
func (c *Condition) evaluateStringOperation(ctx IValidationContext, operation string) (bool, error) {
	value, exists := ctx.GetFieldValue(c.Field)
	if !exists {
		return false, nil
	}

	valueStr := fmt.Sprintf("%v", value)
	expectedStr := fmt.Sprintf("%v", c.Value)

	switch operation {
	case "starts_with":
		return strings.HasPrefix(valueStr, expectedStr), nil
	case "ends_with":
		return strings.HasSuffix(valueStr, expectedStr), nil
	default:
		return false, fmt.Errorf("unsupported string operation: %s", operation)
	}
}

// evaluateLength 评估长度条件
func (c *Condition) evaluateLength(ctx IValidationContext) (bool, error) {
	value, exists := ctx.GetFieldValue(c.Field)
	if !exists {
		return false, nil
	}

	length := getLength(value)
	if length < 0 {
		return false, fmt.Errorf("cannot get length of value type %T", value)
	}

	// 默认操作符为相等
	operator := c.Operator
	if operator == "" {
		operator = "=="
	}

	// 如果指定了具体的长度值
	if c.Value != nil {
		expectedLength, ok := c.Value.(int)
		if !ok {
			return false, fmt.Errorf("length value must be an integer")
		}
		return compareIntegers(length, expectedLength, operator), nil
	}

	// 如果指定了最小/最大长度
	if c.MinLength > 0 && length < c.MinLength {
		return false, nil
	}
	if c.MaxLength > 0 && length > c.MaxLength {
		return false, nil
	}

	return true, nil
}

// evaluateIn 评估包含在列表中的条件
func (c *Condition) evaluateIn(ctx IValidationContext, shouldBeIn bool) (bool, error) {
	value, exists := ctx.GetFieldValue(c.Field)
	if !exists {
		return !shouldBeIn, nil
	}

	for _, expectedValue := range c.Values {
		if reflect.DeepEqual(value, expectedValue) {
			return shouldBeIn, nil
		}
	}

	return !shouldBeIn, nil
}

// ConditionalRule 条件规则
type ConditionalRule struct {
	*BaseValidator
	condition   *Condition
	thenRule    IValidationRule
	elseRule    IValidationRule
	description string
}

// NewConditionalRule 创建条件规则
func NewConditionalRule(id, name string, condition *Condition, thenRule, elseRule IValidationRule) *ConditionalRule {
	return &ConditionalRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeCustom, 30),
		condition:     condition,
		thenRule:      thenRule,
		elseRule:      elseRule,
	}
}

// SetDescription 设置描述
func (r *ConditionalRule) SetDescription(description string) *ConditionalRule {
	r.description = description
	return r
}

// GetCondition 获取条件
func (r *ConditionalRule) GetCondition() *Condition {
	return r.condition
}

// GetThenRule 获取条件为真时执行的规则
func (r *ConditionalRule) GetThenRule() IValidationRule {
	return r.thenRule
}

// GetElseRule 获取条件为假时执行的规则
func (r *ConditionalRule) GetElseRule() IValidationRule {
	return r.elseRule
}

// Validate 执行条件验证
func (r *ConditionalRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	// 评估条件
	conditionMet, err := r.condition.Evaluate(ctx)
	if err != nil {
		result.AddError(ValidationError{
			Field:     r.condition.Field,
			Message:   fmt.Sprintf("条件评估失败: %v", err),
			Type:      ErrorTypeSystem,
			Severity:  ErrorSeverityHigh,
			Code:      "CONDITION_EVALUATION_FAILED",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
		return nil
	}

	// 根据条件结果执行相应的规则
	var ruleToExecute IValidationRule
	if conditionMet {
		ruleToExecute = r.thenRule
	} else {
		ruleToExecute = r.elseRule
	}

	// 如果有规则需要执行，则执行它
	if ruleToExecute != nil {
		return ruleToExecute.Validate(ctx, result)
	}

	return nil
}

// CanValidate 检查是否可以验证指定值
func (r *ConditionalRule) CanValidate(value interface{}) bool {
	// 条件规则总是可以尝试验证
	return true
}

// GetDescription 获取规则描述
func (r *ConditionalRule) GetDescription() string {
	if r.description != "" {
		return r.description
	}
	return fmt.Sprintf("条件规则: 如果 %s %s，则执行相应规则", r.condition.Field, r.condition.Type.String())
}

// 便捷创建函数

// CreateConditionalRule 创建条件规则
func CreateConditionalRule(id, name string, condition *Condition, thenRule, elseRule IValidationRule) *ConditionalRule {
	return NewConditionalRule(id, name, condition, thenRule, elseRule)
}

// CreateIfThenRule 创建if-then规则（没有else分支）
func CreateIfThenRule(id, name string, condition *Condition, thenRule IValidationRule) *ConditionalRule {
	return NewConditionalRule(id, name, condition, thenRule, nil)
}

// CreateFieldExistsRule 创建字段存在条件规则
func CreateFieldExistsRule(id, name, field string, thenRule, elseRule IValidationRule) *ConditionalRule {
	condition := &Condition{
		Type:  ConditionExists,
		Field: field,
	}
	return NewConditionalRule(id, name, condition, thenRule, elseRule)
}

// CreateFieldEqualsRule 创建字段值相等条件规则
func CreateFieldEqualsRule(id, name, field string, value interface{}, thenRule, elseRule IValidationRule) *ConditionalRule {
	condition := &Condition{
		Type:  ConditionEquals,
		Field: field,
		Value: value,
	}
	return NewConditionalRule(id, name, condition, thenRule, elseRule)
}

// CreateFieldNotEmptyRule 创建字段非空条件规则
func CreateFieldNotEmptyRule(id, name, field string, thenRule, elseRule IValidationRule) *ConditionalRule {
	condition := &Condition{
		Type:  ConditionNotEmpty,
		Field: field,
	}
	return NewConditionalRule(id, name, condition, thenRule, elseRule)
}

// 工具函数

// getLength 获取值的长度
func getLength(value interface{}) int {
	if value == nil {
		return 0
	}

	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.String, reflect.Array, reflect.Slice, reflect.Map, reflect.Chan:
		return v.Len()
	default:
		return -1
	}
}

// compareValues 比较两个值
func compareValues(a, b interface{}, operator string) (bool, error) {
	if a == nil || b == nil {
		return false, fmt.Errorf("cannot compare nil values")
	}

	aVal := reflect.ValueOf(a)
	bVal := reflect.ValueOf(b)

	// 尝试转换为数值进行比较
	if aVal.Kind() >= reflect.Int && aVal.Kind() <= reflect.Float64 &&
		bVal.Kind() >= reflect.Int && bVal.Kind() <= reflect.Float64 {
		return compareNumbers(aVal, bVal, operator)
	}

	// 字符串比较
	if aVal.Kind() == reflect.String && bVal.Kind() == reflect.String {
		return compareStrings(aVal.String(), bVal.String(), operator), nil
	}

	return false, fmt.Errorf("cannot compare values of types %T and %T", a, b)
}

// compareNumbers 比较数值
func compareNumbers(a, b reflect.Value, operator string) (bool, error) {
	aFloat := convertToFloat64(a)
	bFloat := convertToFloat64(b)

	switch operator {
	case ">":
		return aFloat > bFloat, nil
	case "<":
		return aFloat < bFloat, nil
	case ">=":
		return aFloat >= bFloat, nil
	case "<=":
		return aFloat <= bFloat, nil
	case "==":
		return aFloat == bFloat, nil
	case "!=":
		return aFloat != bFloat, nil
	default:
		return false, fmt.Errorf("unsupported numeric comparison operator: %s", operator)
	}
}

// compareStrings 比较字符串
func compareStrings(a, b, operator string) bool {
	switch operator {
	case ">":
		return a > b
	case "<":
		return a < b
	case ">=":
		return a >= b
	case "<=":
		return a <= b
	case "==":
		return a == b
	case "!=":
		return a != b
	default:
		return false
	}
}

// compareIntegers 比较整数
func compareIntegers(a, b int, operator string) bool {
	switch operator {
	case ">":
		return a > b
	case "<":
		return a < b
	case ">=":
		return a >= b
	case "<=":
		return a <= b
	case "==":
		return a == b
	case "!=":
		return a != b
	default:
		return false
	}
}

// convertToFloat64 将反射值转换为float64
func convertToFloat64(val reflect.Value) float64 {
	switch val.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return float64(val.Int())
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return float64(val.Uint())
	case reflect.Float32, reflect.Float64:
		return val.Float()
	default:
		return 0
	}
}