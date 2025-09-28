package tests

import (
	"context"
	"fmt"
	"testing"
	"time"

	validators "../validators"
)

// MockValidationRule !ߌ��
type MockValidationRule struct {
	id          string
	name        string
	description string
	version     string
	priority    int
	enabled     bool
	params      map[string]interface{}
	valueTypes  []validators.ValueType
	shouldFail  bool
}

func NewMockRule(id, name string, valueTypes []validators.ValueType, shouldFail bool) *MockValidationRule {
	return &MockValidationRule{
		id:          id,
		name:        name,
		description: fmt.Sprintf("Mock rule: %s", name),
		version:     "1.0.0",
		priority:    100,
		enabled:     true,
		params:      make(map[string]interface{}),
		valueTypes:  valueTypes,
		shouldFail:  shouldFail,
	}
}

func (m *MockValidationRule) GetID() string           { return m.id }
func (m *MockValidationRule) GetName() string         { return m.name }
func (m *MockValidationRule) GetDescription() string  { return m.description }
func (m *MockValidationRule) GetVersion() string      { return m.version }
func (m *MockValidationRule) GetPriority() int        { return m.priority }
func (m *MockValidationRule) IsEnabled() bool         { return m.enabled }
func (m *MockValidationRule) GetParams() map[string]interface{} { return m.params }

func (m *MockValidationRule) CanValidate(valueType validators.ValueType) bool {
	for _, vt := range m.valueTypes {
		if vt == valueType {
			return true
		}
	}
	return false
}

func (m *MockValidationRule) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(m.id)

	if m.shouldFail {
		result.AddError(validators.CreateValidationError(
			m.id,
			m.name,
			"",
			"",
			fmt.Sprintf("Mock validation failed for value: %v", value),
			"MOCK_FAILURE",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

func (m *MockValidationRule) SetParams(params map[string]interface{}) error {
	m.params = params
	return nil
}

func (m *MockValidationRule) SetEnabled(enabled bool) {
	m.enabled = enabled
}

// KՌ���,��
func TestValidationEngine_Basic(t *testing.T) {
	engine := validators.NewValidationEngine()

	// K���
	rule1 := NewMockRule("rule1", "String Rule", []validators.ValueType{validators.TypeString}, false)
	rule2 := NewMockRule("rule2", "Number Rule", []validators.ValueType{validators.TypeInt, validators.TypeFloat64}, true)

	if err := engine.RegisterRule(rule1); err != nil {
		t.Fatalf("Failed to register rule1: %v", err)
	}

	if err := engine.RegisterRule(rule2); err != nil {
		t.Fatalf("Failed to register rule2: %v", err)
	}

	// Kշ����
	rules := engine.GetRegisteredRules()
	if len(rules) != 2 {
		t.Fatalf("Expected 2 rules, got %d", len(rules))
	}

	// KՌ�W&2<
	context := validators.NewValidationContext()
	result := engine.Validate(context.Background(), "test string", context)

	if result.IsValid() {
		t.Error("Expected validation to fail because rule2 is set to fail")
	}

	errors := result.GetErrors()
	if len(errors) == 0 {
		t.Error("Expected validation errors")
	}

	// KՌ�pW<
	result2 := engine.Validate(context.Background(), 42, context)
	if result2.IsValid() {
		t.Error("Expected validation to fail because rule2 is set to fail")
	}

	// K�ߡ�o
	stats := engine.GetStats()
	if stats.TotalRules != 2 {
		t.Errorf("Expected 2 total rules, got %d", stats.TotalRules)
	}
	if stats.EnabledRules != 2 {
		t.Errorf("Expected 2 enabled rules, got %d", stats.EnabledRules)
	}
}

// KՌ�
�
func TestValidationContext(t *testing.T) {
	context := validators.NewValidationContext()

	// Kվn���<
	context.SetValue("test_key", "test_value")
	if value := context.GetValue("test_key"); value != "test_value" {
		t.Errorf("Expected 'test_value', got %v", value)
	}

	// K���./&X(
	if !context.HasValue("test_key") {
		t.Error("Expected key to exist")
	}

	// Kշ�@	.
	keys := context.GetKeys()
	if len(keys) != 1 || keys[0] != "test_key" {
		t.Errorf("Expected ['test_key'], got %v", keys)
	}

	// Kվn��o
	target := validators.ValidationTarget{
		ObjectType: "TestObject",
		FieldName:  "TestField",
		FieldPath:  "object.field",
	}
	context.SetTarget(target)

	retrievedTarget := context.GetTarget()
	if retrievedTarget.ObjectType != "TestObject" {
		t.Errorf("Expected 'TestObject', got %s", retrievedTarget.ObjectType)
	}

	// K��P
�
	child := context.CreateChild()
	if child.GetValue("test_key") != "test_value" {
		t.Error("Child context should inherit parent values")
	}

	child.SetValue("child_key", "child_value")
	if context.HasValue("child_key") {
		t.Error("Parent context should not have child values")
	}
}

// KՌ�Ӝ
func TestValidationResult(t *testing.T) {
	result := validators.NewValidationResult()

	// K�˶
	if !result.IsValid() {
		t.Error("New result should be valid")
	}

	// K����
	error1 := validators.CreateValidationError(
		"test_rule",
		"Test Rule",
		"test_field",
		"object.test_field",
		"Test error message",
		"TEST_ERROR",
		validators.SeverityMedium,
		"test_value",
	)
	result.AddError(error1)

	if result.IsValid() {
		t.Error("Result should be invalid after adding error")
	}

	errors := result.GetErrors()
	if len(errors) != 1 {
		t.Errorf("Expected 1 error, got %d", len(errors))
	}

	// K���fJ
	warning1 := validators.CreateValidationWarning(
		"test_rule",
		"Test Rule",
		"test_field",
		"object.test_field",
		"Test warning message",
		"TEST_WARNING",
		"test_value",
	)
	result.AddWarning(warning1)

	warnings := result.GetWarnings()
	if len(warnings) != 1 {
		t.Errorf("Expected 1 warning, got %d", len(warnings))
	}

	// Kվn���o
	details := map[string]interface{}{
		"test_detail": "test_value",
		"count":      42,
	}
	result.SetDetails(details)

	retrievedDetails := result.GetDetails()
	if retrievedDetails["test_detail"] != "test_value" {
		t.Error("Details not set correctly")
	}

	// Kվn�
	duration := 100 * time.Millisecond
	result.SetDuration(duration)
	if result.GetDuration() != duration {
		t.Error("Duration not set correctly")
	}

	// K�JSON�
	jsonData, err := result.ToJSON()
	if err != nil {
		t.Errorf("Failed to serialize to JSON: %v", err)
	}
	if len(jsonData) == 0 {
		t.Error("JSON data should not be empty")
	}
}

// K�A4��,��
func TestValidationPipeline_Basic(t *testing.T) {
	pipeline := validators.NewValidationPipeline()

	// �K�e�
	step1 := validators.ValidationStep{
		ID:          "step1",
		Name:        "First Step",
		Description: "First validation step",
		Rules: []validators.IValidationRule{
			NewMockRule("rule1", "Step1 Rule", []validators.ValueType{validators.TypeString}, false),
		},
		Order:   1,
		Enabled: true,
		Config:  map[string]interface{}{"step1_config": "value1"},
	}

	step2 := validators.ValidationStep{
		ID:          "step2",
		Name:        "Second Step",
		Description: "Second validation step",
		Rules: []validators.IValidationRule{
			NewMockRule("rule2", "Step2 Rule", []validators.ValueType{validators.TypeString}, true),
		},
		Order:   2,
		Enabled: true,
		Config:  map[string]interface{}{"step2_config": "value2"},
	}

	// K���e�
	if err := pipeline.AddStep(step1); err != nil {
		t.Fatalf("Failed to add step1: %v", err)
	}

	if err := pipeline.AddStep(step2); err != nil {
		t.Fatalf("Failed to add step2: %v", err)
	}

	// Kշ�e�
	steps := pipeline.GetSteps()
	if len(steps) != 2 {
		t.Fatalf("Expected 2 steps, got %d", len(steps))
	}

	// ��e�z�
	if steps[0].ID != "step1" || steps[1].ID != "step2" {
		t.Error("Steps not in correct order")
	}

	// K�gLA4�
	context := validators.NewValidationContext()
	result := pipeline.Execute(context.Background(), "test string", context)

	// ��1%�:step2���n:1%
	if result.IsValid() {
		t.Error("Expected pipeline to fail")
	}

	// K�ߡ�o
	stats := pipeline.GetStats()
	if stats.TotalSteps != 2 {
		t.Errorf("Expected 2 total steps, got %d", stats.TotalSteps)
	}
	if stats.EnabledSteps != 2 {
		t.Errorf("Expected 2 enabled steps, got %d", stats.EnabledSteps)
	}
}

// K�{��w�p
func TestTypeUtilities(t *testing.T) {
	// K�{��K
	if validators.GetValueType("test") != validators.TypeString {
		t.Error("String type detection failed")
	}

	if validators.GetValueType(42) != validators.TypeInt {
		t.Error("Int type detection failed")
	}

	if validators.GetValueType(3.14) != validators.TypeFloat64 {
		t.Error("Float64 type detection failed")
	}

	if validators.GetValueType(true) != validators.TypeBool {
		t.Error("Bool type detection failed")
	}

	// K�{�lb
	if str, err := validators.ConvertToString(42); err != nil || str != "42" {
		t.Error("Int to string conversion failed")
	}

	if f, err := validators.ConvertToFloat64("3.14"); err != nil || f != 3.14 {
		t.Error("String to float64 conversion failed")
	}

	if b, err := validators.ConvertToBool("true"); err != nil || !b {
		t.Error("String to bool conversion failed")
	}

	// K�z<��
	if !validators.IsEmptyValue("") {
		t.Error("Empty string should be detected as empty")
	}

	if !validators.IsEmptyValue(nil) {
		t.Error("Nil should be detected as empty")
	}

	if validators.IsEmptyValue("not empty") {
		t.Error("Non-empty string should not be detected as empty")
	}
}

// K�vь�
func TestConcurrentValidation(t *testing.T) {
	engine := validators.NewValidationEngine()

	// � *b�
	slowRule := NewMockRule("slow_rule", "Slow Rule", []validators.ValueType{validators.TypeString}, false)
	engine.RegisterRule(slowRule)

	// �K�<
	values := make([]interface{}, 10)
	for i := 0; i < 10; i++ {
		values[i] = fmt.Sprintf("test_value_%d", i)
	}

	// yό�
	context := validators.NewValidationContext()
	startTime := time.Now()
	results := engine.ValidateBatch(context.Background(), values, context)
	duration := time.Since(startTime)

	if len(results) != 10 {
		t.Errorf("Expected 10 results, got %d", len(results))
	}

	// ��v�gLn����*K����nF����'�:	
	if duration > 5*time.Second {
		t.Error("Batch validation took too long, concurrent execution may not be working")
	}

	// ��@	Ӝ�/	H�
	for i, result := range results {
		if !result.IsValid() {
			t.Errorf("Result %d should be valid", i)
		}
	}
}