package main

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"
)

// ValidationResult 验证结果实现
type ValidationResult struct {
	errors          []ValidationError
	warnings        []ValidationWarning
	executionTime   time.Duration
	validatedFields int
	startTime       time.Time
	endTime         time.Time
	validationID    string
}

// NewValidationResult 创建新的验证结果
func NewValidationResult() *ValidationResult {
	now := time.Now()
	return &ValidationResult{
		errors:        make([]ValidationError, 0),
		warnings:      make([]ValidationWarning, 0),
		startTime:     now,
		validationID:  generateValidationID(),
	}
}

// generateValidationID 生成验证ID
func generateValidationID() string {
	return fmt.Sprintf("val_%d", time.Now().UnixNano())
}

// IsValid 检查是否有效（无错误）
func (r *ValidationResult) IsValid() bool {
	return len(r.errors) == 0
}

// HasErrors 检查是否有错误
func (r *ValidationResult) HasErrors() bool {
	return len(r.errors) > 0
}

// HasWarnings 检查是否有警告
func (r *ValidationResult) HasWarnings() bool {
	return len(r.warnings) > 0
}

// GetErrors 获取所有错误
func (r *ValidationResult) GetErrors() []ValidationError {
	return r.errors
}

// GetWarnings 获取所有警告
func (r *ValidationResult) GetWarnings() []ValidationWarning {
	return r.warnings
}

// AddError 添加错误
func (r *ValidationResult) AddError(error ValidationError) {
	// 设置时间戳
	if error.Timestamp.IsZero() {
		error.Timestamp = time.Now()
	}
	r.errors = append(r.errors, error)
}

// AddWarning 添加警告
func (r *ValidationResult) AddWarning(warning ValidationWarning) {
	// 设置时间戳
	if warning.Timestamp.IsZero() {
		warning.Timestamp = time.Now()
	}
	r.warnings = append(r.warnings, warning)
}

// Merge 合并其他验证结果
func (r *ValidationResult) Merge(other IValidationResult) {
	if other == nil {
		return
	}

	// 合并错误
	for _, err := range other.GetErrors() {
		r.AddError(err)
	}

	// 合并警告
	for _, warning := range other.GetWarnings() {
		r.AddWarning(warning)
	}

	// 更新统计信息
	r.validatedFields += other.GetValidatedFieldCount()
	
	// 更新执行时间（取最大值）
	if other.GetExecutionTime() > r.executionTime {
		r.executionTime = other.GetExecutionTime()
	}
}

// MergeAll 合并多个验证结果
func (r *ValidationResult) MergeAll(results []IValidationResult) {
	for _, result := range results {
		r.Merge(result)
	}
}

// GetErrorsByType 根据错误类型获取错误
func (r *ValidationResult) GetErrorsByType(errorType ErrorType) []ValidationError {
	var filteredErrors []ValidationError
	for _, err := range r.errors {
		if err.Type == errorType {
			filteredErrors = append(filteredErrors, err)
		}
	}
	return filteredErrors
}

// GetErrorsByField 根据字段获取错误
func (r *ValidationResult) GetErrorsByField(fieldName string) []ValidationError {
	var filteredErrors []ValidationError
	for _, err := range r.errors {
		if err.Field == fieldName {
			filteredErrors = append(filteredErrors, err)
		}
	}
	return filteredErrors
}

// GetErrorsByRule 根据规则ID获取错误
func (r *ValidationResult) GetErrorsByRule(ruleID string) []ValidationError {
	var filteredErrors []ValidationError
	for _, err := range r.errors {
		if err.RuleID == ruleID {
			filteredErrors = append(filteredErrors, err)
		}
	}
	return filteredErrors
}

// GetSummary 获取验证摘要
func (r *ValidationResult) GetSummary() ValidationSummary {
	r.endTime = time.Now()
	if r.executionTime == 0 {
		r.executionTime = r.endTime.Sub(r.startTime)
	}

	// 统计错误类型
	errorsByType := make(map[ErrorType]int)
	errorsBySeverity := make(map[ErrorSeverity]int)
	rulesExecuted := make(map[string]bool)
	ruleStats := make(map[string]RuleStats)

	for _, err := range r.errors {
		errorsByType[err.Type]++
		errorsBySeverity[err.Severity]++
		rulesExecuted[err.RuleID] = true

		// 更新规则统计
		if stats, exists := ruleStats[err.RuleID]; exists {
			stats.ErrorCount++
			stats.ExecutionCount++
		} else {
			ruleStats[err.RuleID] = RuleStats{
				ExecutionCount: 1,
				ErrorCount:     1,
				LastExecution:  err.Timestamp,
			}
		}
	}

	// 统计警告类型
	warningsByType := make(map[string]int)
	for _, warning := range r.warnings {
		warningsByType[warning.Code]++
		rulesExecuted[warning.RuleID] = true
	}

	// 转换为切片
	var executedRules []string
	for rule := range rulesExecuted {
		if rule != "" {
			executedRules = append(executedRules, rule)
		}
	}
	sort.Strings(executedRules)

	// 计算字段统计
	fieldStats := r.calculateFieldStats()

	return ValidationSummary{
		TotalFields:       fieldStats.total,
		ValidFields:       fieldStats.valid,
		ErrorFields:       fieldStats.withErrors,
		WarningFields:     fieldStats.withWarnings,
		SkippedFields:     fieldStats.skipped,
		ErrorsByType:      errorsByType,
		ErrorsBySeverity:  errorsBySeverity,
		WarningsByType:    warningsByType,
		Duration:          r.executionTime,
		RulesExecuted:     executedRules,
		RuleStats:         ruleStats,
		StartTime:         r.startTime,
		EndTime:           r.endTime,
		ValidationID:      r.validationID,
	}
}

// fieldStats 字段统计结构
type fieldStats struct {
	total        int
	valid        int
	withErrors   int
	withWarnings int
	skipped      int
}

// calculateFieldStats 计算字段统计
func (r *ValidationResult) calculateFieldStats() fieldStats {
	fieldsWithErrors := make(map[string]bool)
	fieldsWithWarnings := make(map[string]bool)

	for _, err := range r.errors {
		if err.Field != "" {
			fieldsWithErrors[err.Field] = true
		}
	}

	for _, warning := range r.warnings {
		if warning.Field != "" {
			fieldsWithWarnings[warning.Field] = true
		}
	}

	// 计算所有涉及的字段
	allFields := make(map[string]bool)
	for field := range fieldsWithErrors {
		allFields[field] = true
	}
	for field := range fieldsWithWarnings {
		allFields[field] = true
	}

	// 如果有验证过的字段数，使用该数，否则使用涉及的字段数
	total := r.validatedFields
	if total == 0 {
		total = len(allFields)
	}

	return fieldStats{
		total:        total,
		valid:        total - len(fieldsWithErrors),
		withErrors:   len(fieldsWithErrors),
		withWarnings: len(fieldsWithWarnings),
		skipped:      0, // TODO: 实现跳过字段统计
	}
}

// GetExecutionTime 获取执行时间
func (r *ValidationResult) GetExecutionTime() time.Duration {
	if r.executionTime > 0 {
		return r.executionTime
	}
	if !r.endTime.IsZero() {
		return r.endTime.Sub(r.startTime)
	}
	return time.Since(r.startTime)
}

// GetValidatedFieldCount 获取验证的字段数量
func (r *ValidationResult) GetValidatedFieldCount() int {
	return r.validatedFields
}

// SetValidatedFieldCount 设置验证的字段数量
func (r *ValidationResult) SetValidatedFieldCount(count int) {
	r.validatedFields = count
}

// SetExecutionTime 设置执行时间
func (r *ValidationResult) SetExecutionTime(duration time.Duration) {
	r.executionTime = duration
}

// ToJSON 转换为JSON格式
func (r *ValidationResult) ToJSON() ([]byte, error) {
	summary := r.GetSummary()
	
	result := map[string]interface{}{
		"valid":             r.IsValid(),
		"validation_id":     r.validationID,
		"summary":           summary,
		"errors":            r.errors,
		"warnings":          r.warnings,
		"execution_time_ms": r.GetExecutionTime().Milliseconds(),
		"timestamp":         r.startTime,
	}

	return json.MarshalIndent(result, "", "  ")
}

// String 实现 fmt.Stringer 接口
func (r *ValidationResult) String() string {
	return r.ToString()
}

// ToString 转换为字符串格式
func (r *ValidationResult) ToString() string {
	var builder strings.Builder
	
	builder.WriteString(fmt.Sprintf("Validation Result (ID: %s)\n", r.validationID))
	builder.WriteString(fmt.Sprintf("Valid: %t\n", r.IsValid()))
	builder.WriteString(fmt.Sprintf("Execution Time: %v\n", r.GetExecutionTime()))
	
	if len(r.errors) > 0 {
		builder.WriteString(fmt.Sprintf("\nErrors (%d):\n", len(r.errors)))
		for i, err := range r.errors {
			builder.WriteString(fmt.Sprintf("  %d. [%s] %s: %s", 
				i+1, err.Type.String(), err.Field, err.Message))
			if err.RuleID != "" {
				builder.WriteString(fmt.Sprintf(" (Rule: %s)", err.RuleID))
			}
			builder.WriteString("\n")
		}
	}
	
	if len(r.warnings) > 0 {
		builder.WriteString(fmt.Sprintf("\nWarnings (%d):\n", len(r.warnings)))
		for i, warning := range r.warnings {
			builder.WriteString(fmt.Sprintf("  %d. %s: %s", 
				i+1, warning.Field, warning.Message))
			if warning.RuleID != "" {
				builder.WriteString(fmt.Sprintf(" (Rule: %s)", warning.RuleID))
			}
			builder.WriteString("\n")
		}
	}
	
	return builder.String()
}

// SortErrors 排序错误（按严重程度和类型）
func (r *ValidationResult) SortErrors() {
	sort.Slice(r.errors, func(i, j int) bool {
		// 首先按严重程度排序
		if r.errors[i].Severity != r.errors[j].Severity {
			return r.errors[i].Severity > r.errors[j].Severity
		}
		// 然后按错误类型排序
		if r.errors[i].Type != r.errors[j].Type {
			return r.errors[i].Type < r.errors[j].Type
		}
		// 最后按字段名排序
		return r.errors[i].Field < r.errors[j].Field
	})
}

// SortWarnings 排序警告（按字段名）
func (r *ValidationResult) SortWarnings() {
	sort.Slice(r.warnings, func(i, j int) bool {
		return r.warnings[i].Field < r.warnings[j].Field
	})
}

// FilterErrors 过滤错误
func (r *ValidationResult) FilterErrors(filter func(ValidationError) bool) []ValidationError {
	var filtered []ValidationError
	for _, err := range r.errors {
		if filter(err) {
			filtered = append(filtered, err)
		}
	}
	return filtered
}

// FilterWarnings 过滤警告
func (r *ValidationResult) FilterWarnings(filter func(ValidationWarning) bool) []ValidationWarning {
	var filtered []ValidationWarning
	for _, warning := range r.warnings {
		if filter(warning) {
			filtered = append(filtered, warning)
		}
	}
	return filtered
}

// GetErrorCount 获取错误数量
func (r *ValidationResult) GetErrorCount() int {
	return len(r.errors)
}

// GetWarningCount 获取警告数量
func (r *ValidationResult) GetWarningCount() int {
	return len(r.warnings)
}

// Clear 清空所有错误和警告
func (r *ValidationResult) Clear() {
	r.errors = r.errors[:0]
	r.warnings = r.warnings[:0]
	r.validatedFields = 0
	r.executionTime = 0
	r.startTime = time.Now()
	r.endTime = time.Time{}
}