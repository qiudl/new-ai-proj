package rules

import (
	"context"
	"fmt"
	"reflect"
	"strings"

	"../validators"
)

// BaseRelationalValidator ˙@s˚å¡h
type BaseRelationalValidator struct {
	id          string
	name        string
	description string
	version     string
	priority    int
	enabled     bool
	params      map[string]interface{}
}

func NewBaseRelationalValidator(id, name, description string) *BaseRelationalValidator {
	return &BaseRelationalValidator{
		id:          id,
		name:        name,
		description: description,
		version:     "1.0.0",
		priority:    200, // s˚å¡hHßÿ
		enabled:     true,
		params:      make(map[string]interface{}),
	}
}

func (b *BaseRelationalValidator) GetID() string                     { return b.id }
func (b *BaseRelationalValidator) GetName() string                   { return b.name }
func (b *BaseRelationalValidator) GetDescription() string            { return b.description }
func (b *BaseRelationalValidator) GetVersion() string                { return b.version }
func (b *BaseRelationalValidator) GetPriority() int                  { return b.priority }
func (b *BaseRelationalValidator) IsEnabled() bool                   { return b.enabled }
func (b *BaseRelationalValidator) GetParams() map[string]interface{} { return b.params }
func (b *BaseRelationalValidator) SetEnabled(enabled bool)           { b.enabled = enabled }

func (b *BaseRelationalValidator) CanValidate(valueType validators.ValueType) bool {
	// s˚å¡h;Å”ÑS{ã
	return valueType == validators.TypeStruct || valueType == validators.TypeMap
}

func (b *BaseRelationalValidator) SetParams(params map[string]interface{}) error {
	if params == nil {
		b.params = make(map[string]interface{})
	} else {
		b.params = params
	}
	return nil
}

// FieldComparisonValidator Wµ‘Éå¡h
type FieldComparisonValidator struct {
	*BaseRelationalValidator
	sourceField     string
	targetField     string
	comparisonType  string // "eq", "ne", "gt", "gte", "lt", "lte"
	allowNullFields bool
}

func NewFieldComparisonValidator(sourceField, targetField, comparisonType string, allowNullFields bool) validators.IValidationRule {
	validator := &FieldComparisonValidator{
		BaseRelationalValidator: NewBaseRelationalValidator(
			"field_comparison",
			"Field Comparison Validator",
			"Validates relationships between two fields in an object",
		),
		sourceField:     sourceField,
		targetField:     targetField,
		comparisonType:  comparisonType,
		allowNullFields: allowNullFields,
	}

	validator.params["source_field"] = sourceField
	validator.params["target_field"] = targetField
	validator.params["comparison_type"] = comparisonType
	validator.params["allow_null_fields"] = allowNullFields

	return validator
}

func (v *FieldComparisonValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	if value == nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			"Cannot validate field comparison on null object",
			"NULL_OBJECT",
			validators.SeverityHigh,
			value,
		))
		return result
	}

	// ∑÷êWµ<
	sourceValue, err := validators.GetFieldValue(value, v.sourceField)
	if err != nil {
		if !v.allowNullFields {
			target := context.GetTarget()
			result.AddError(validators.CreateValidationError(
				v.GetID(),
				v.GetName(),
				v.sourceField,
				fmt.Sprintf("%s.%s", context.GetTarget().FieldPath, v.sourceField),
				fmt.Sprintf("Source field '%s' not found or inaccessible: %v", v.sourceField, err),
				"SOURCE_FIELD_ERROR",
				validators.SeverityMedium,
				value,
			))
		}
		return result
	}

	// ∑÷ÓWµ<
	targetValue, err := validators.GetFieldValue(value, v.targetField)
	if err != nil {
		if !v.allowNullFields {
			target := context.GetTarget()
			result.AddError(validators.CreateValidationError(
				v.GetID(),
				v.GetName(),
				v.targetField,
				fmt.Sprintf("%s.%s", context.GetTarget().FieldPath, v.targetField),
				fmt.Sprintf("Target field '%s' not found or inaccessible: %v", v.targetField, err),
				"TARGET_FIELD_ERROR",
				validators.SeverityMedium,
				value,
			))
		}
		return result
	}

	// z<≈µ
	if validators.IsEmptyValue(sourceValue) || validators.IsEmptyValue(targetValue) {
		if !v.allowNullFields {
			target := context.GetTarget()
			result.AddError(validators.CreateValidationError(
				v.GetID(),
				v.GetName(),
				target.FieldName,
				target.FieldPath,
				fmt.Sprintf("One or both fields (%s, %s) are null/empty", v.sourceField, v.targetField),
				"NULL_FIELD_VALUES",
				validators.SeverityMedium,
				value,
			))
		}
		return result
	}

	// €L‘É
	comparisonResult, err := validators.CompareValues(sourceValue, targetValue)
	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Cannot compare fields %s and %s: %v", v.sourceField, v.targetField, err),
			"COMPARISON_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	// å¡‘É”ú
	isValid := false
	switch v.comparisonType {
	case "eq":
		isValid = comparisonResult == 0
	case "ne":
		isValid = comparisonResult != 0
	case "gt":
		isValid = comparisonResult > 0
	case "gte":
		isValid = comparisonResult >= 0
	case "lt":
		isValid = comparisonResult < 0
	case "lte":
		isValid = comparisonResult <= 0
	default:
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Unknown comparison type: %s", v.comparisonType),
			"INVALID_COMPARISON_TYPE",
			validators.SeverityHigh,
			value,
		))
		return result
	}

	if !isValid {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Field comparison failed: %s (%v) %s %s (%v)", 
				v.sourceField, sourceValue, v.comparisonType, v.targetField, targetValue),
			"COMPARISON_FAILED",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

// ConditionalRequiredValidator aˆ≈kå¡h
type ConditionalRequiredValidator struct {
	*BaseRelationalValidator
	conditionField string
	conditionValue interface{}
	requiredFields []string
	comparisonType string // "eq", "ne", "in", "not_in"
}

func NewConditionalRequiredValidator(conditionField string, conditionValue interface{}, requiredFields []string, comparisonType string) validators.IValidationRule {
	validator := &ConditionalRequiredValidator{
		BaseRelationalValidator: NewBaseRelationalValidator(
			"conditional_required",
			"Conditional Required Validator",
			"Validates that certain fields are required based on conditions",
		),
		conditionField: conditionField,
		conditionValue: conditionValue,
		requiredFields: requiredFields,
		comparisonType: comparisonType,
	}

	validator.params["condition_field"] = conditionField
	validator.params["condition_value"] = conditionValue
	validator.params["required_fields"] = requiredFields
	validator.params["comparison_type"] = comparisonType

	return validator
}

func (v *ConditionalRequiredValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	if value == nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			"Cannot validate conditional requirements on null object",
			"NULL_OBJECT",
			validators.SeverityHigh,
			value,
		))
		return result
	}

	// ∑÷aˆWµ<
	conditionFieldValue, err := validators.GetFieldValue(value, v.conditionField)
	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			v.conditionField,
			fmt.Sprintf("%s.%s", context.GetTarget().FieldPath, v.conditionField),
			fmt.Sprintf("Condition field '%s' not found or inaccessible: %v", v.conditionField, err),
			"CONDITION_FIELD_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	// ¿Âaˆ/&·≥
	conditionMet := false
	switch v.comparisonType {
	case "eq":
		conditionMet = reflect.DeepEqual(conditionFieldValue, v.conditionValue)
	case "ne":
		conditionMet = !reflect.DeepEqual(conditionFieldValue, v.conditionValue)
	case "in":
		if slice, ok := v.conditionValue.([]interface{}); ok {
			for _, item := range slice {
				if reflect.DeepEqual(conditionFieldValue, item) {
					conditionMet = true
					break
				}
			}
		}
	case "not_in":
		conditionMet = true
		if slice, ok := v.conditionValue.([]interface{}); ok {
			for _, item := range slice {
				if reflect.DeepEqual(conditionFieldValue, item) {
					conditionMet = false
					break
				}
			}
		}
	default:
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Unknown comparison type: %s", v.comparisonType),
			"INVALID_COMPARISON_TYPE",
			validators.SeverityHigh,
			value,
		))
		return result
	}

	// Çúaˆ·≥¿Â≈kWµ
	if conditionMet {
		for _, requiredField := range v.requiredFields {
			fieldValue, err := validators.GetFieldValue(value, requiredField)
			if err != nil || validators.IsEmptyValue(fieldValue) {
				target := context.GetTarget()
				result.AddError(validators.CreateValidationError(
					v.GetID(),
					v.GetName(),
					requiredField,
					fmt.Sprintf("%s.%s", context.GetTarget().FieldPath, requiredField),
					fmt.Sprintf("Field '%s' is required when '%s' %s '%v'", 
						requiredField, v.conditionField, v.comparisonType, v.conditionValue),
					"CONDITIONAL_REQUIRED_FAILED",
					validators.SeverityMedium,
					value,
				))
			}
		}
	}

	return result
}

// MutuallyExclusiveValidator í•Wµå¡h
type MutuallyExclusiveValidator struct {
	*BaseRelationalValidator
	fieldGroups [][]string
	allowEmpty  bool
}

func NewMutuallyExclusiveValidator(fieldGroups [][]string, allowEmpty bool) validators.IValidationRule {
	validator := &MutuallyExclusiveValidator{
		BaseRelationalValidator: NewBaseRelationalValidator(
			"mutually_exclusive",
			"Mutually Exclusive Validator",
			"Validates that certain field groups are mutually exclusive",
		),
		fieldGroups: fieldGroups,
		allowEmpty:  allowEmpty,
	}

	validator.params["field_groups"] = fieldGroups
	validator.params["allow_empty"] = allowEmpty

	return validator
}

func (v *MutuallyExclusiveValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	if value == nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			"Cannot validate mutual exclusivity on null object",
			"NULL_OBJECT",
			validators.SeverityHigh,
			value,
		))
		return result
	}

	var nonEmptyGroups []int
	var nonEmptyFields []string

	// ¿Âœ*Wµƒ
	for groupIndex, fieldGroup := range v.fieldGroups {
		hasNonEmptyField := false
		groupNonEmptyFields := []string{}

		for _, fieldName := range fieldGroup {
			fieldValue, err := validators.GetFieldValue(value, fieldName)
			if err == nil && !validators.IsEmptyValue(fieldValue) {
				hasNonEmptyField = true
				groupNonEmptyFields = append(groupNonEmptyFields, fieldName)
			}
		}

		if hasNonEmptyField {
			nonEmptyGroups = append(nonEmptyGroups, groupIndex)
			nonEmptyFields = append(nonEmptyFields, groupNonEmptyFields...)
		}
	}

	// ¿Âí•'
	if len(nonEmptyGroups) > 1 {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Mutually exclusive fields found in multiple groups: %v. Only one group should have values.",
				nonEmptyFields),
			"MUTUAL_EXCLUSIVITY_VIOLATED",
			validators.SeverityMedium,
			value,
		))
	}

	// ¿Â/&A∏hË:z
	if !v.allowEmpty && len(nonEmptyGroups) == 0 {
		target := context.GetTarget()
		allFields := []string{}
		for _, group := range v.fieldGroups {
			allFields = append(allFields, group...)
		}
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("At least one field from groups %v must have a value", allFields),
			"ALL_GROUPS_EMPTY",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

// ReferenceValidator (åt'å¡h
type ReferenceValidator struct {
	*BaseRelationalValidator
	referenceField string
	targetObject   interface{}
	keyField       string
	validationMode string // "exists", "not_exists"
}

func NewReferenceValidator(referenceField string, targetObject interface{}, keyField string, validationMode string) validators.IValidationRule {
	validator := &ReferenceValidator{
		BaseRelationalValidator: NewBaseRelationalValidator(
			"reference_integrity",
			"Reference Integrity Validator",
			"Validates reference integrity between objects",
		),
		referenceField: referenceField,
		targetObject:   targetObject,
		keyField:       keyField,
		validationMode: validationMode,
	}

	validator.params["reference_field"] = referenceField
	validator.params["key_field"] = keyField
	validator.params["validation_mode"] = validationMode

	return validator
}

func (v *ReferenceValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	if value == nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			"Cannot validate reference integrity on null object",
			"NULL_OBJECT",
			validators.SeverityHigh,
			value,
		))
		return result
	}

	// ∑÷(Wµ<
	referenceValue, err := validators.GetFieldValue(value, v.referenceField)
	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			v.referenceField,
			fmt.Sprintf("%s.%s", context.GetTarget().FieldPath, v.referenceField),
			fmt.Sprintf("Reference field '%s' not found or inaccessible: %v", v.referenceField, err),
			"REFERENCE_FIELD_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	if validators.IsEmptyValue(referenceValue) {
		return result // z(<€Lå¡
	}

	// ¿ÂÓ˘a-/&X((
	exists := v.checkReferenceExists(referenceValue)

	target := context.GetTarget()
	switch v.validationMode {
	case "exists":
		if !exists {
			result.AddError(validators.CreateValidationError(
				v.GetID(),
				v.GetName(),
				v.referenceField,
				fmt.Sprintf("%s.%s", context.GetTarget().FieldPath, v.referenceField),
				fmt.Sprintf("Reference value '%v' does not exist in target object", referenceValue),
				"REFERENCE_NOT_FOUND",
				validators.SeverityMedium,
				value,
			))
		}
	case "not_exists":
		if exists {
			result.AddError(validators.CreateValidationError(
				v.GetID(),
				v.GetName(),
				v.referenceField,
				fmt.Sprintf("%s.%s", context.GetTarget().FieldPath, v.referenceField),
				fmt.Sprintf("Reference value '%v' already exists in target object", referenceValue),
				"REFERENCE_ALREADY_EXISTS",
				validators.SeverityMedium,
				value,
			))
		}
	default:
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Unknown validation mode: %s", v.validationMode),
			"INVALID_VALIDATION_MODE",
			validators.SeverityHigh,
			value,
		))
	}

	return result
}

func (v *ReferenceValidator) checkReferenceExists(referenceValue interface{}) bool {
	if v.targetObject == nil {
		return false
	}

	// ÇúÓ˘a/Gpƒ
	targetValue := reflect.ValueOf(v.targetObject)
	if targetValue.Kind() == reflect.Slice || targetValue.Kind() == reflect.Array {
		for i := 0; i < targetValue.Len(); i++ {
			item := targetValue.Index(i)
			if item.Kind() == reflect.Interface {
				item = item.Elem()
			}

			if item.Kind() == reflect.Struct {
				keyValue, err := validators.GetFieldValue(item.Interface(), v.keyField)
				if err == nil && reflect.DeepEqual(keyValue, referenceValue) {
					return true
				}
			}
		}
	}

	// ÇúÓ˘a/ 
	if targetValue.Kind() == reflect.Map {
		for _, key := range targetValue.MapKeys() {
			if reflect.DeepEqual(key.Interface(), referenceValue) {
				return true
			}
		}
	}

	return false
}

// CrossFieldValidationValidator ËWµå¡h
type CrossFieldValidationValidator struct {
	*BaseRelationalValidator
	validationRules map[string]func(values map[string]interface{}) error
	fieldNames      []string
}

func NewCrossFieldValidationValidator(fieldNames []string, validationRules map[string]func(values map[string]interface{}) error) validators.IValidationRule {
	validator := &CrossFieldValidationValidator{
		BaseRelationalValidator: NewBaseRelationalValidator(
			"cross_field_validation",
			"Cross Field Validation Validator",
			"Validates complex relationships between multiple fields",
		),
		validationRules: validationRules,
		fieldNames:      fieldNames,
	}

	validator.params["field_names"] = fieldNames
	validator.params["rule_count"] = len(validationRules)

	return validator
}

func (v *CrossFieldValidationValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	if value == nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			"Cannot validate cross-field rules on null object",
			"NULL_OBJECT",
			validators.SeverityHigh,
			value,
		))
		return result
	}

	// 6∆@	¯sWµÑ<
	fieldValues := make(map[string]interface{})
	for _, fieldName := range v.fieldNames {
		fieldValue, err := validators.GetFieldValue(value, fieldName)
		if err != nil {
			fieldValues[fieldName] = nil
		} else {
			fieldValues[fieldName] = fieldValue
		}
	}

	// gL@	å¡ƒ
	for ruleName, rule := range v.validationRules {
		if err := rule(fieldValues); err != nil {
			target := context.GetTarget()
			result.AddError(validators.CreateValidationError(
				v.GetID(),
				v.GetName(),
				target.FieldName,
				target.FieldPath,
				fmt.Sprintf("Cross-field validation rule '%s' failed: %v", ruleName, err),
				"CROSS_FIELD_VALIDATION_FAILED",
				validators.SeverityMedium,
				value,
			))
		}
	}

	return result
}