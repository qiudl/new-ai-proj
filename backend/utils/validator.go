package utils

import (
	"ai-project-backend/models"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

// ValidatorManager manages request validation
type ValidatorManager struct {
	validator *validator.Validate
}

// NewValidatorManager creates a new validator manager
func NewValidatorManager() *ValidatorManager {
	return &ValidatorManager{
		validator: binding.Validator.Engine().(*validator.Validate),
	}
}

// ValidateStruct validates a struct and returns validation errors
func (v *ValidatorManager) ValidateStruct(s interface{}) []models.ValidationError {
	var validationErrors []models.ValidationError

	err := v.validator.Struct(s)
	if err != nil {
		for _, err := range err.(validator.ValidationErrors) {
			validationErrors = append(validationErrors, models.ValidationError{
				Field:   getJSONFieldName(s, err.Field()),
				Message: getValidationMessage(err),
				Value:   err.Value().(string),
			})
		}
	}

	return validationErrors
}

// getJSONFieldName gets the JSON field name from struct field name
func getJSONFieldName(s interface{}, fieldName string) string {
	t := reflect.TypeOf(s)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	field, found := t.FieldByName(fieldName)
	if !found {
		return fieldName
	}

	jsonTag := field.Tag.Get("json")
	if jsonTag == "" {
		return fieldName
	}

	// Handle json:",omitempty" format
	if strings.Contains(jsonTag, ",") {
		jsonTag = strings.Split(jsonTag, ",")[0]
	}

	if jsonTag == "-" {
		return fieldName
	}

	return jsonTag
}

// getValidationMessage returns a user-friendly validation message
func getValidationMessage(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "This field is required"
	case "min":
		return "Value is too short (minimum " + err.Param() + " characters)"
	case "max":
		return "Value is too long (maximum " + err.Param() + " characters)"
	case "email":
		return "Invalid email format"
	case "oneof":
		return "Value must be one of: " + err.Param()
	case "gte":
		return "Value must be greater than or equal to " + err.Param()
	case "lte":
		return "Value must be less than or equal to " + err.Param()
	case "gt":
		return "Value must be greater than " + err.Param()
	case "lt":
		return "Value must be less than " + err.Param()
	case "len":
		return "Value must be exactly " + err.Param() + " characters"
	case "uuid":
		return "Invalid UUID format"
	case "url":
		return "Invalid URL format"
	default:
		return "Invalid value"
	}
}