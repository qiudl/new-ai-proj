package validators

import (
	"encoding/json"
	"sync"
	"time"
)

// ValidationResult 验证结果实现
type ValidationResult struct {
	mu              sync.RWMutex
	errors          []ValidationError
	warnings        []ValidationWarning
	details         map[string]interface{}
	duration        time.Duration
	validatedRules  []string
}

// NewValidationResult 创建新的验证结果
func NewValidationResult() IValidationResult {
	return &ValidationResult{
		errors:         make([]ValidationError, 0),
		warnings:       make([]ValidationWarning, 0),
		details:        make(map[string]interface{}),
		validatedRules: make([]string, 0),
	}
}

// IsValid 验证是否通过
func (r *ValidationResult) IsValid() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.errors) == 0
}

// GetErrors 获取错误列表
func (r *ValidationResult) GetErrors() []ValidationError {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	errors := make([]ValidationError, len(r.errors))
	copy(errors, r.errors)
	return errors
}

// GetWarnings 获取警告列表
func (r *ValidationResult) GetWarnings() []ValidationWarning {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	warnings := make([]ValidationWarning, len(r.warnings))
	copy(warnings, r.warnings)
	return warnings
}

// AddError 添加错误
func (r *ValidationResult) AddError(err ValidationError) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.errors = append(r.errors, err)
}

// AddWarning 添加警告
func (r *ValidationResult) AddWarning(warning ValidationWarning) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.warnings = append(r.warnings, warning)
}

// GetDetails 获取详细信息
func (r *ValidationResult) GetDetails() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	details := make(map[string]interface{})
	for k, v := range r.details {
		details[k] = v
	}
	return details
}

// SetDetails 设置详细信息
func (r *ValidationResult) SetDetails(details map[string]interface{}) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	r.details = make(map[string]interface{})
	if details != nil {
		for k, v := range details {
			r.details[k] = v
		}
	}
}

// Merge 合并其他验证结果
func (r *ValidationResult) Merge(other IValidationResult) error {
	if other == nil {
		return nil
	}
	
	r.mu.Lock()
	defer r.mu.Unlock()
	
	// 合并错误
	for _, err := range other.GetErrors() {
		r.errors = append(r.errors, err)
	}
	
	// 合并警告
	for _, warning := range other.GetWarnings() {
		r.warnings = append(r.warnings, warning)
	}
	
	// 合并详细信息
	for k, v := range other.GetDetails() {
		r.details[k] = v
	}
	
	// 合并验证规则列表
	for _, ruleID := range other.GetValidatedRules() {
		if !r.containsRule(ruleID) {
			r.validatedRules = append(r.validatedRules, ruleID)
		}
	}
	
	return nil
}

// GetDuration 获取验证耗时
func (r *ValidationResult) GetDuration() time.Duration {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.duration
}

// SetDuration 设置验证耗时
func (r *ValidationResult) SetDuration(duration time.Duration) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.duration = duration
}

// GetValidatedRules 获取验证的规则列表
func (r *ValidationResult) GetValidatedRules() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	rules := make([]string, len(r.validatedRules))
	copy(rules, r.validatedRules)
	return rules
}

// ToJSON 转换为JSON格式
func (r *ValidationResult) ToJSON() ([]byte, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	data := map[string]interface{}{
		"valid":           len(r.errors) == 0,
		"errors":          r.errors,
		"warnings":        r.warnings,
		"details":         r.details,
		"duration":        r.duration.Milliseconds(),
		"validated_rules": r.validatedRules,
		"summary": map[string]interface{}{
			"error_count":   len(r.errors),
			"warning_count": len(r.warnings),
			"rule_count":    len(r.validatedRules),
		},
	}
	
	return json.Marshal(data)
}

// AddValidatedRule 添加已验证的规则
func (r *ValidationResult) AddValidatedRule(ruleID string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if !r.containsRule(ruleID) {
		r.validatedRules = append(r.validatedRules, ruleID)
	}
}

// SetDetail 设置单个详细信息
func (r *ValidationResult) SetDetail(key string, value interface{}) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if r.details == nil {
		r.details = make(map[string]interface{})
	}
	r.details[key] = value
}

// GetDetail 获取单个详细信息
func (r *ValidationResult) GetDetail(key string) interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	return r.details[key]
}

// containsRule 检查是否包含指定规则
func (r *ValidationResult) containsRule(ruleID string) bool {
	for _, id := range r.validatedRules {
		if id == ruleID {
			return true
		}
	}
	return false
}