package rules

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"../validators"
)

// BaseFieldValidator ú@WµŒÁh
type BaseFieldValidator struct {
	id          string
	name        string
	description string
	version     string
	priority    int
	enabled     bool
	params      map[string]interface{}
	supportedTypes []validators.ValueType
}

// NewBaseFieldValidator úú@WµŒÁh
func NewBaseFieldValidator(id, name, description string, supportedTypes []validators.ValueType) *BaseFieldValidator {
	return &BaseFieldValidator{
		id:             id,
		name:           name,
		description:    description,
		version:        "1.0.0",
		priority:       100,
		enabled:        true,
		params:         make(map[string]interface{}),
		supportedTypes: supportedTypes,
	}
}

func (b *BaseFieldValidator) GetID() string                              { return b.id }
func (b *BaseFieldValidator) GetName() string                            { return b.name }
func (b *BaseFieldValidator) GetDescription() string                     { return b.description }
func (b *BaseFieldValidator) GetVersion() string                         { return b.version }
func (b *BaseFieldValidator) GetPriority() int                           { return b.priority }
func (b *BaseFieldValidator) IsEnabled() bool                            { return b.enabled }
func (b *BaseFieldValidator) GetParams() map[string]interface{}          { return b.params }
func (b *BaseFieldValidator) SetEnabled(enabled bool)                    { b.enabled = enabled }

func (b *BaseFieldValidator) CanValidate(valueType validators.ValueType) bool {
	for _, supportedType := range b.supportedTypes {
		if supportedType == valueType {
			return true
		}
	}
	return false
}

func (b *BaseFieldValidator) SetParams(params map[string]interface{}) error {
	if params == nil {
		b.params = make(map[string]interface{})
	} else {
		b.params = params
	}
	return nil
}

func (b *BaseFieldValidator) SetPriority(priority int) {
	b.priority = priority
}

// NotNullValidator ^zŒÁh
type NotNullValidator struct {
	*BaseFieldValidator
}

func NewNotNullValidator() validators.IValidationRule {
	return &NotNullValidator{
		BaseFieldValidator: NewBaseFieldValidator(
			"not_null",
			"Not Null Validator",
			"Validates that a field is not null or empty",
			[]validators.ValueType{
				validators.TypeString, validators.TypeInt, validators.TypeInt64,
				validators.TypeFloat32, validators.TypeFloat64, validators.TypeBool,
				validators.TypeTime, validators.TypeSlice, validators.TypeMap,
				validators.TypeStruct, validators.TypeInterface,
			},
		),
	}
}

func (v *NotNullValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	if validators.IsEmptyValue(value) {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			"Field cannot be null or empty",
			"NULL_VALUE",
			validators.SeverityHigh,
			value,
		))
	}

	return result
}

// StringLengthValidator W&2¦ŒÁh
type StringLengthValidator struct {
	*BaseFieldValidator
	minLength int
	maxLength int
}

func NewStringLengthValidator(minLength, maxLength int) validators.IValidationRule {
	validator := &StringLengthValidator{
		BaseFieldValidator: NewBaseFieldValidator(
			"string_length",
			"String Length Validator",
			"Validates string length within specified range",
			[]validators.ValueType{validators.TypeString},
		),
		minLength: minLength,
		maxLength: maxLength,
	}
	
	validator.params["min_length"] = minLength
	validator.params["max_length"] = maxLength
	
	return validator
}

func (v *StringLengthValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	str, err := validators.ConvertToString(value)
	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Cannot convert value to string: %v", err),
			"CONVERSION_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	length := len(str)
	target := context.GetTarget()

	if length < v.minLength {
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("String length %d is less than minimum %d", length, v.minLength),
			"MIN_LENGTH",
			validators.SeverityMedium,
			value,
		))
	}

	if v.maxLength > 0 && length > v.maxLength {
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("String length %d exceeds maximum %d", length, v.maxLength),
			"MAX_LENGTH",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

// RegexValidator ch¾ŒÁh
type RegexValidator struct {
	*BaseFieldValidator
	pattern *regexp.Regexp
	patternStr string
}

func NewRegexValidator(pattern string) (validators.IValidationRule, error) {
	compiledPattern, err := regexp.Compile(pattern)
	if err != nil {
		return nil, fmt.Errorf("invalid regex pattern: %v", err)
	}

	validator := &RegexValidator{
		BaseFieldValidator: NewBaseFieldValidator(
			"regex",
			"Regex Validator",
			"Validates string against regular expression pattern",
			[]validators.ValueType{validators.TypeString},
		),
		pattern:    compiledPattern,
		patternStr: pattern,
	}
	
	validator.params["pattern"] = pattern
	
	return validator, nil
}

func (v *RegexValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	str, err := validators.ConvertToString(value)
	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Cannot convert value to string: %v", err),
			"CONVERSION_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	if !v.pattern.MatchString(str) {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("String '%s' does not match pattern '%s'", str, v.patternStr),
			"PATTERN_MISMATCH",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

// NumericRangeValidator p<ôŒÁh
type NumericRangeValidator struct {
	*BaseFieldValidator
	minValue float64
	maxValue float64
	hasMin   bool
	hasMax   bool
}

func NewNumericRangeValidator(minValue, maxValue *float64) validators.IValidationRule {
	validator := &NumericRangeValidator{
		BaseFieldValidator: NewBaseFieldValidator(
			"numeric_range",
			"Numeric Range Validator",
			"Validates numeric values within specified range",
			[]validators.ValueType{
				validators.TypeInt, validators.TypeInt64,
				validators.TypeFloat32, validators.TypeFloat64,
			},
		),
	}

	if minValue != nil {
		validator.minValue = *minValue
		validator.hasMin = true
		validator.params["min_value"] = *minValue
	}

	if maxValue != nil {
		validator.maxValue = *maxValue
		validator.hasMax = true
		validator.params["max_value"] = *maxValue
	}

	return validator
}

func (v *NumericRangeValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	numValue, err := validators.ConvertToFloat64(value)
	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Cannot convert value to number: %v", err),
			"CONVERSION_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	target := context.GetTarget()

	if v.hasMin && numValue < v.minValue {
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Value %f is less than minimum %f", numValue, v.minValue),
			"MIN_VALUE",
			validators.SeverityMedium,
			value,
		))
	}

	if v.hasMax && numValue > v.maxValue {
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Value %f exceeds maximum %f", numValue, v.maxValue),
			"MAX_VALUE",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

// EmailValidator 5P®öŒÁh
type EmailValidator struct {
	*BaseFieldValidator
	emailPattern *regexp.Regexp
}

func NewEmailValidator() validators.IValidationRule {
	// €„5P®öch¾
	emailPattern := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	
	return &EmailValidator{
		BaseFieldValidator: NewBaseFieldValidator(
			"email",
			"Email Validator",
			"Validates email address format",
			[]validators.ValueType{validators.TypeString},
		),
		emailPattern: emailPattern,
	}
}

func (v *EmailValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	str, err := validators.ConvertToString(value)
	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Cannot convert value to string: %v", err),
			"CONVERSION_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	if !v.emailPattern.MatchString(str) {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("'%s' is not a valid email address", str),
			"INVALID_EMAIL",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

// DateTimeValidator åöôŒÁh
type DateTimeValidator struct {
	*BaseFieldValidator
	minDate   *time.Time
	maxDate   *time.Time
	format    string
	tolerance time.Duration
}

func NewDateTimeValidator(format string, minDate, maxDate *time.Time) validators.IValidationRule {
	validator := &DateTimeValidator{
		BaseFieldValidator: NewBaseFieldValidator(
			"datetime",
			"DateTime Validator",
			"Validates date/time values and ranges",
			[]validators.ValueType{validators.TypeTime, validators.TypeString},
		),
		format:    format,
		tolerance: 24 * time.Hour, // Ø¤1)„¹î
	}

	if format != "" {
		validator.params["format"] = format
	}

	if minDate != nil {
		validator.minDate = minDate
		validator.params["min_date"] = minDate.Format(time.RFC3339)
	}

	if maxDate != nil {
		validator.maxDate = maxDate
		validator.params["max_date"] = maxDate.Format(time.RFC3339)
	}

	return validator
}

func (v *DateTimeValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	var dateValue time.Time
	var err error

	switch val := value.(type) {
	case time.Time:
		dateValue = val
	case string:
		if v.format != "" {
			dateValue, err = time.Parse(v.format, val)
		} else {
			dateValue, err = validators.ConvertToTime(value)
		}
	default:
		dateValue, err = validators.ConvertToTime(value)
	}

	if err != nil {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Cannot convert value to date/time: %v", err),
			"CONVERSION_ERROR",
			validators.SeverityMedium,
			value,
		))
		return result
	}

	target := context.GetTarget()

	if v.minDate != nil && dateValue.Before(*v.minDate) {
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Date %s is before minimum date %s", 
				dateValue.Format(time.RFC3339), v.minDate.Format(time.RFC3339)),
			"MIN_DATE",
			validators.SeverityMedium,
			value,
		))
	}

	if v.maxDate != nil && dateValue.After(*v.maxDate) {
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Date %s is after maximum date %s", 
				dateValue.Format(time.RFC3339), v.maxDate.Format(time.RFC3339)),
			"MAX_DATE",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}

// EnumValidator š><ŒÁh
type EnumValidator struct {
	*BaseFieldValidator
	allowedValues []interface{}
	caseSensitive bool
}

func NewEnumValidator(allowedValues []interface{}, caseSensitive bool) validators.IValidationRule {
	validator := &EnumValidator{
		BaseFieldValidator: NewBaseFieldValidator(
			"enum",
			"Enum Validator",
			"Validates that value is within allowed enumeration",
			[]validators.ValueType{
				validators.TypeString, validators.TypeInt, validators.TypeInt64,
				validators.TypeFloat32, validators.TypeFloat64, validators.TypeBool,
			},
		),
		allowedValues: allowedValues,
		caseSensitive: caseSensitive,
	}

	validator.params["allowed_values"] = allowedValues
	validator.params["case_sensitive"] = caseSensitive

	return validator
}

func (v *EnumValidator) Validate(ctx context.Context, value interface{}, context validators.IValidationContext) validators.IValidationResult {
	result := validators.NewValidationResult()
	result.AddValidatedRule(v.GetID())

	valueStr, _ := validators.ConvertToString(value)
	if !v.caseSensitive {
		valueStr = strings.ToLower(valueStr)
	}

	found := false
	for _, allowedValue := range v.allowedValues {
		allowedStr, _ := validators.ConvertToString(allowedValue)
		if !v.caseSensitive {
			allowedStr = strings.ToLower(allowedStr)
		}

		if valueStr == allowedStr {
			found = true
			break
		}
	}

	if !found {
		target := context.GetTarget()
		result.AddError(validators.CreateValidationError(
			v.GetID(),
			v.GetName(),
			target.FieldName,
			target.FieldPath,
			fmt.Sprintf("Value '%v' is not in allowed enumeration: %v", value, v.allowedValues),
			"INVALID_ENUM",
			validators.SeverityMedium,
			value,
		))
	}

	return result
}