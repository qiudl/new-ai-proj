package main

import (
	"fmt"
	"time"
)

// CompositeRuleType 组合规则类型
type CompositeRuleType int

const (
	CompositeRuleAnd CompositeRuleType = iota // AND 逻辑
	CompositeRuleOr                           // OR 逻辑
	CompositeRuleNot                          // NOT 逻辑
	CompositeRuleXor                          // XOR 逻辑
	CompositeRuleNand                         // NAND 逻辑
	CompositeRuleNor                          // NOR 逻辑
)

// String 返回组合规则类型的字符串表示
func (crt CompositeRuleType) String() string {
	switch crt {
	case CompositeRuleAnd:
		return "AND"
	case CompositeRuleOr:
		return "OR"
	case CompositeRuleNot:
		return "NOT"
	case CompositeRuleXor:
		return "XOR"
	case CompositeRuleNand:
		return "NAND"
	case CompositeRuleNor:
		return "NOR"
	default:
		return "UNKNOWN"
	}
}

// CompositeRule 组合规则实现
type CompositeRule struct {
	*BaseValidator
	compositeType CompositeRuleType
	childRules    []IValidationRule
	shortCircuit  bool // 是否短路求值
}

// NewCompositeRule 创建组合规则
func NewCompositeRule(id, name string, compositeType CompositeRuleType, rules ...IValidationRule) *CompositeRule {
	return &CompositeRule{
		BaseValidator: NewBaseValidator(id, name, RuleTypeCustom, 50),
		compositeType: compositeType,
		childRules:    rules,
		shortCircuit:  true, // 默认启用短路求值
	}
}

// AddRule 添加子规则
func (r *CompositeRule) AddRule(rule IValidationRule) {
	r.childRules = append(r.childRules, rule)
}

// SetShortCircuit 设置是否短路求值
func (r *CompositeRule) SetShortCircuit(shortCircuit bool) *CompositeRule {
	r.shortCircuit = shortCircuit
	return r
}

// GetChildRules 获取子规则
func (r *CompositeRule) GetChildRules() []IValidationRule {
	return r.childRules
}

// GetCompositeType 获取组合类型
func (r *CompositeRule) GetCompositeType() CompositeRuleType {
	return r.compositeType
}

// Validate 执行组合验证
func (r *CompositeRule) Validate(ctx IValidationContext, result *ValidationResult) error {
	if len(r.childRules) == 0 {
		result.AddWarning(ValidationWarning{
			Field:     "",
			Message:   fmt.Sprintf("组合规则 '%s' 没有子规则", r.GetName()),
			Code:      "COMPOSITE_NO_RULES",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
		return nil
	}

	switch r.compositeType {
	case CompositeRuleAnd:
		return r.validateAnd(ctx, result)
	case CompositeRuleOr:
		return r.validateOr(ctx, result)
	case CompositeRuleNot:
		return r.validateNot(ctx, result)
	case CompositeRuleXor:
		return r.validateXor(ctx, result)
	case CompositeRuleNand:
		return r.validateNand(ctx, result)
	case CompositeRuleNor:
		return r.validateNor(ctx, result)
	default:
		return fmt.Errorf("unsupported composite rule type: %v", r.compositeType)
	}
}

// validateAnd AND逻辑：所有子规则都必须通过
func (r *CompositeRule) validateAnd(ctx IValidationContext, result *ValidationResult) error {
	for _, rule := range r.childRules {
		tempResult := NewValidationResult()
		if err := rule.Validate(ctx, tempResult); err != nil {
			return fmt.Errorf("error validating child rule '%s': %w", rule.GetID(), err)
		}

		// 如果有错误且启用短路求值，直接返回
		if tempResult.HasErrors() {
			result.Merge(tempResult)
			if r.shortCircuit {
				break
			}
		} else {
			// 只有在没有错误时才合并警告
			for _, warning := range tempResult.GetWarnings() {
				result.AddWarning(warning)
			}
		}
	}

	return nil
}

// validateOr OR逻辑：至少一个子规则通过即可
func (r *CompositeRule) validateOr(ctx IValidationContext, result *ValidationResult) error {
	var allErrors []ValidationError
	var allWarnings []ValidationWarning
	hasValidRule := false

	for _, rule := range r.childRules {
		tempResult := NewValidationResult()
		if err := rule.Validate(ctx, tempResult); err != nil {
			return fmt.Errorf("error validating child rule '%s': %w", rule.GetID(), err)
		}

		// 收集所有错误和警告
		for _, e := range tempResult.GetErrors() {
			allErrors = append(allErrors, e)
		}
		for _, w := range tempResult.GetWarnings() {
			allWarnings = append(allWarnings, w)
		}

		// 如果有一个规则通过，标记为有效
		if !tempResult.HasErrors() {
			hasValidRule = true
			if r.shortCircuit {
				break
			}
		}
	}

	// 如果没有规则通过，添加所有错误
	if !hasValidRule {
		for _, e := range allErrors {
			result.AddError(e)
		}
	}

	// 总是添加警告
	for _, w := range allWarnings {
		result.AddWarning(w)
	}

	return nil
}

// validateNot NOT逻辑：子规则不能通过
func (r *CompositeRule) validateNot(ctx IValidationContext, result *ValidationResult) error {
	if len(r.childRules) != 1 {
		result.AddError(ValidationError{
			Field:     "",
			Message:   "NOT规则只能包含一个子规则",
			Type:      ErrorTypeSystem,
			Severity:  ErrorSeverityHigh,
			Code:      "NOT_RULE_SINGLE_CHILD",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
		return nil
	}

	rule := r.childRules[0]
	tempResult := NewValidationResult()
	if err := rule.Validate(ctx, tempResult); err != nil {
		return fmt.Errorf("error validating child rule '%s': %w", rule.GetID(), err)
	}

	// NOT逻辑：如果子规则通过，则NOT规则失败
	if !tempResult.HasErrors() {
		result.AddError(ValidationError{
			Field:     "",
			Message:   fmt.Sprintf("NOT规则失败：子规则 '%s' 通过了验证", rule.GetName()),
			Type:      ErrorTypeBusiness,
			Severity:  ErrorSeverityMedium,
			Code:      "NOT_RULE_FAILED",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
	}

	// 合并警告
	for _, warning := range tempResult.GetWarnings() {
		result.AddWarning(warning)
	}

	return nil
}

// validateXor XOR逻辑：只有一个子规则可以通过
func (r *CompositeRule) validateXor(ctx IValidationContext, result *ValidationResult) error {
	validCount := 0
	var allWarnings []ValidationWarning

	for _, rule := range r.childRules {
		tempResult := NewValidationResult()
		if err := rule.Validate(ctx, tempResult); err != nil {
			return fmt.Errorf("error validating child rule '%s': %w", rule.GetID(), err)
		}

		// 收集警告
		for _, w := range tempResult.GetWarnings() {
			allWarnings = append(allWarnings, w)
		}

		// 统计通过的规则数量
		if !tempResult.HasErrors() {
			validCount++
		}
	}

	// XOR逻辑：只允许一个规则通过
	if validCount != 1 {
		result.AddError(ValidationError{
			Field:     "",
			Message:   fmt.Sprintf("XOR规则失败：有 %d 个子规则通过，应该只有1个", validCount),
			Type:      ErrorTypeBusiness,
			Severity:  ErrorSeverityMedium,
			Code:      "XOR_RULE_FAILED",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
	}

	// 添加所有警告
	for _, w := range allWarnings {
		result.AddWarning(w)
	}

	return nil
}

// validateNand NAND逻辑：AND的否定
func (r *CompositeRule) validateNand(ctx IValidationContext, result *ValidationResult) error {
	tempResult := NewValidationResult()
	if err := r.validateAnd(ctx, tempResult); err != nil {
		return err
	}

	// NAND逻辑：如果AND通过，则NAND失败
	if !tempResult.HasErrors() {
		result.AddError(ValidationError{
			Field:     "",
			Message:   "NAND规则失败：所有子规则都通过了验证",
			Type:      ErrorTypeBusiness,
			Severity:  ErrorSeverityMedium,
			Code:      "NAND_RULE_FAILED",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
	}

	// 合并警告
	for _, warning := range tempResult.GetWarnings() {
		result.AddWarning(warning)
	}

	return nil
}

// validateNor NOR逻辑：OR的否定
func (r *CompositeRule) validateNor(ctx IValidationContext, result *ValidationResult) error {
	tempResult := NewValidationResult()
	if err := r.validateOr(ctx, tempResult); err != nil {
		return err
	}

	// NOR逻辑：如果OR通过，则NOR失败
	if !tempResult.HasErrors() {
		result.AddError(ValidationError{
			Field:     "",
			Message:   "NOR规则失败：至少有一个子规则通过了验证",
			Type:      ErrorTypeBusiness,
			Severity:  ErrorSeverityMedium,
			Code:      "NOR_RULE_FAILED",
			Timestamp: time.Now(),
			RuleID:    r.GetID(),
		})
	}

	// 合并警告
	for _, warning := range tempResult.GetWarnings() {
		result.AddWarning(warning)
	}

	return nil
}

// CanValidate 检查是否可以验证指定值
func (r *CompositeRule) CanValidate(value interface{}) bool {
	// 组合规则的可验证性取决于子规则
	for _, rule := range r.childRules {
		if rule.CanValidate(value) {
			return true
		}
	}
	return len(r.childRules) == 0
}

// GetDescription 获取规则描述
func (r *CompositeRule) GetDescription() string {
	if r.description != "" {
		return r.description
	}
	return fmt.Sprintf("组合规则 (%s): %d 个子规则", r.compositeType.String(), len(r.childRules))
}

// SetDescription 设置规则描述
func (r *CompositeRule) SetDescription(description string) *CompositeRule {
	r.description = description
	return r
}

// 便捷创建函数

// CreateAndRule 创建AND组合规则
func CreateAndRule(id, name string, rules ...IValidationRule) *CompositeRule {
	return NewCompositeRule(id, name, CompositeRuleAnd, rules...)
}

// CreateOrRule 创建OR组合规则
func CreateOrRule(id, name string, rules ...IValidationRule) *CompositeRule {
	return NewCompositeRule(id, name, CompositeRuleOr, rules...)
}

// CreateNotRule 创建NOT组合规则
func CreateNotRule(id, name string, rule IValidationRule) *CompositeRule {
	return NewCompositeRule(id, name, CompositeRuleNot, rule)
}

// CreateXorRule 创建XOR组合规则
func CreateXorRule(id, name string, rules ...IValidationRule) *CompositeRule {
	return NewCompositeRule(id, name, CompositeRuleXor, rules...)
}

// CreateNandRule 创建NAND组合规则
func CreateNandRule(id, name string, rules ...IValidationRule) *CompositeRule {
	return NewCompositeRule(id, name, CompositeRuleNand, rules...)
}

// CreateNorRule 创建NOR组合规则
func CreateNorRule(id, name string, rules ...IValidationRule) *CompositeRule {
	return NewCompositeRule(id, name, CompositeRuleNor, rules...)
}