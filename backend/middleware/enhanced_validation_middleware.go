package middleware

import (
	"ai-project-backend/models"
	"ai-project-backend/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// EnhancedValidationMiddleware provides comprehensive data validation
type EnhancedValidationMiddleware struct {
	validator *validator.Validate
}

// NewEnhancedValidationMiddleware creates a new validation middleware
func NewEnhancedValidationMiddleware() *EnhancedValidationMiddleware {
	v := validator.New()
	
	// Register custom validators
	v.RegisterValidation("task_status", validateTaskStatus)
	v.RegisterValidation("task_priority", validateTaskPriority)
	v.RegisterValidation("enterprise_code", validateEnterpriseCode)
	v.RegisterValidation("positive_int", validatePositiveInt)
	v.RegisterValidation("custom_fields", validateCustomFields)
	v.RegisterValidation("future_date", validateFutureDate)
	v.RegisterValidation("chinese_name", validateChineseName)
	v.RegisterValidation("phone_number", validatePhoneNumber)
	v.RegisterValidation("tax_id", validateTaxID)
	
	return &EnhancedValidationMiddleware{
		validator: v,
	}
}

// ValidationConfig defines validation configuration for different endpoints
type ValidationConfig struct {
	RequiredFields []string          `json:"required_fields"`
	Rules         map[string]string  `json:"rules"`
	MaxLength     map[string]int     `json:"max_length"`
	CustomRules   map[string]func(interface{}) error `json:"-"`
}

// Common validation configurations
var validationConfigs = map[string]ValidationConfig{
	"tasks": {
		RequiredFields: []string{"title"},
		Rules: map[string]string{
			"title":         "required,min=1,max=200",
			"status":        "omitempty,task_status",
			"priority":      "omitempty,task_priority",
			"project_id":    "required,positive_int",
			"assignee_id":   "omitempty,positive_int",
			"parent_id":     "omitempty,positive_int",
			"estimated_hours": "omitempty,min=0.1,max=9999",
			"progress":      "omitempty,min=0,max=100",
		},
		MaxLength: map[string]int{
			"title":       200,
			"description": 2000,
		},
	},
	"enterprises": {
		RequiredFields: []string{"name", "code", "business_type"},
		Rules: map[string]string{
			"name":                  "required,min=2,max=100",
			"code":                  "required,enterprise_code",
			"business_type":         "required,oneof=sole_proprietorship partnership llc corporation",
			"industry_type":         "omitempty",
			"registration_number":   "omitempty,max=100",
			"tax_id":                "omitempty,tax_id",
			"legal_representative":  "omitempty,chinese_name",
			"contact_email":         "omitempty,email",
			"contact_phone":         "omitempty,phone_number",
		},
		MaxLength: map[string]int{
			"name":        100,
			"code":        20,
			"description": 1000,
		},
	},
	"users": {
		RequiredFields: []string{"username", "email"},
		Rules: map[string]string{
			"username":    "required,min=3,max=30,alphanum",
			"email":       "required,email,max=255",
			"name":        "omitempty,max=100",
			"phone":       "omitempty,phone_number",
			"role":        "omitempty,oneof=admin user guest",
		},
		MaxLength: map[string]int{
			"username": 30,
			"email":    255,
			"name":     100,
		},
	},
}

// ValidateRequest validates the incoming request based on endpoint configuration
func (vm *EnhancedValidationMiddleware) ValidateRequest(endpointType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, exists := validationConfigs[endpointType]
		if !exists {
			c.Next()
			return
		}

		var requestData map[string]interface{}
		if err := c.ShouldBindJSON(&requestData); err != nil {
			vm.handleValidationError(c, "Invalid JSON format", nil)
			return
		}

		// Validate the request data
		if errors := vm.validateData(requestData, config); len(errors) > 0 {
			vm.handleValidationError(c, "Validation failed", errors)
			return
		}

		// Store validated data in context
		c.Set("validated_data", requestData)
		c.Next()
	}
}

// ValidateTaskRequest validates task-specific request data
func (vm *EnhancedValidationMiddleware) ValidateTaskRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		var taskReq models.TaskRequest
		if err := c.ShouldBindJSON(&taskReq); err != nil {
			vm.handleValidationError(c, "Invalid JSON format", []models.ValidationError{
				{Field: "body", Message: "Invalid request body format", Value: ""},
			})
			return
		}

		// Validate using struct tags
		if errors := vm.validateStruct(&taskReq); len(errors) > 0 {
			vm.handleValidationError(c, "Task validation failed", errors)
			return
		}

		// Additional business logic validation
		if businessErrors := vm.validateTaskBusinessRules(&taskReq); len(businessErrors) > 0 {
			vm.handleValidationError(c, "Business rules validation failed", businessErrors)
			return
		}

		// Clean and validate custom fields
		if taskReq.CustomFields != nil {
			cleanedFields, err := utils.ValidateAndCleanCustomFields(taskReq.CustomFields)
			if err != nil {
				vm.handleValidationError(c, "Custom fields validation failed", []models.ValidationError{
					{Field: "custom_fields", Message: err.Error(), Value: ""},
				})
				return
			}
			taskReq.CustomFields = cleanedFields
		}

		c.Set("validated_task", &taskReq)
		c.Next()
	}
}

// ValidateEnterpriseRequest validates enterprise-specific request data
func (vm *EnhancedValidationMiddleware) ValidateEnterpriseRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		var enterpriseReq models.EnterpriseRequest
		if err := c.ShouldBindJSON(&enterpriseReq); err != nil {
			vm.handleValidationError(c, "Invalid JSON format", []models.ValidationError{
				{Field: "body", Message: "Invalid request body format", Value: ""},
			})
			return
		}

		// Validate using struct tags
		if errors := vm.validateStruct(&enterpriseReq); len(errors) > 0 {
			vm.handleValidationError(c, "Enterprise validation failed", errors)
			return
		}

		c.Set("validated_enterprise", &enterpriseReq)
		c.Next()
	}
}

// ValidateQueryParams validates query parameters
func (vm *EnhancedValidationMiddleware) ValidateQueryParams(rules map[string]string) gin.HandlerFunc {
	return func(c *gin.Context) {
		errors := []models.ValidationError{}
		
		for param, rule := range rules {
			value := c.Query(param)
			if value == "" && strings.Contains(rule, "required") {
				errors = append(errors, models.ValidationError{
					Field:   param,
					Message: fmt.Sprintf("Query parameter '%s' is required", param),
					Value:   value,
				})
				continue
			}

			if value != "" {
				if err := vm.validateValue(value, rule); err != nil {
					errors = append(errors, models.ValidationError{
						Field:   param,
						Message: err.Error(),
						Value:   value,
					})
				}
			}
		}

		if len(errors) > 0 {
			vm.handleValidationError(c, "Query parameter validation failed", errors)
			return
		}

		c.Next()
	}
}

// ValidatePathParams validates path parameters
func (vm *EnhancedValidationMiddleware) ValidatePathParams(rules map[string]string) gin.HandlerFunc {
	return func(c *gin.Context) {
		errors := []models.ValidationError{}

		for param, rule := range rules {
			value := c.Param(param)
			if err := vm.validateValue(value, rule); err != nil {
				errors = append(errors, models.ValidationError{
					Field:   param,
					Message: err.Error(),
					Value:   value,
				})
			}
		}

		if len(errors) > 0 {
			vm.handleValidationError(c, "Path parameter validation failed", errors)
			return
		}

		c.Next()
	}
}

// Helper methods

func (vm *EnhancedValidationMiddleware) validateData(data map[string]interface{}, config ValidationConfig) []models.ValidationError {
	var errors []models.ValidationError

	// Check required fields
	for _, field := range config.RequiredFields {
		if value, exists := data[field]; !exists || vm.isEmpty(value) {
			errors = append(errors, models.ValidationError{
				Field:   field,
				Message: fmt.Sprintf("Field '%s' is required", field),
				Value:   "",
			})
		}
	}

	// Apply validation rules
	for field, rule := range config.Rules {
		if value, exists := data[field]; exists && !vm.isEmpty(value) {
			if err := vm.validateValue(value, rule); err != nil {
				errors = append(errors, models.ValidationError{
					Field:   field,
					Message: err.Error(),
					Value:   fmt.Sprintf("%v", value),
				})
			}
		}
	}

	// Check max length constraints
	for field, maxLen := range config.MaxLength {
		if value, exists := data[field]; exists {
			if str, ok := value.(string); ok && len(str) > maxLen {
				errors = append(errors, models.ValidationError{
					Field:   field,
					Message: fmt.Sprintf("Field '%s' exceeds maximum length of %d characters", field, maxLen),
					Value:   str,
				})
			}
		}
	}

	return errors
}

func (vm *EnhancedValidationMiddleware) validateStruct(s interface{}) []models.ValidationError {
	var errors []models.ValidationError

	err := vm.validator.Struct(s)
	if err != nil {
		for _, err := range err.(validator.ValidationErrors) {
			errors = append(errors, models.ValidationError{
				Field:   vm.getJSONFieldName(s, err.Field()),
				Message: vm.getValidationMessage(err),
				Value:   fmt.Sprintf("%v", err.Value()),
			})
		}
	}

	return errors
}

func (vm *EnhancedValidationMiddleware) validateTaskBusinessRules(task *models.TaskRequest) []models.ValidationError {
	var errors []models.ValidationError

	// Validate due date is not in the past
	if task.DueDate != nil && task.DueDate.Before(time.Now()) {
		errors = append(errors, models.ValidationError{
			Field:   "due_date",
			Message: "Due date cannot be in the past",
			Value:   task.DueDate.String(),
		})
	}

	// Validate progress consistency with status
	if task.Progress != nil {
		progress := *task.Progress
		if task.Status != "" {
			status := task.Status
			if status == "completed" && progress < 100 {
				errors = append(errors, models.ValidationError{
					Field:   "progress",
					Message: "Progress must be 100% when status is completed",
					Value:   fmt.Sprintf("%.1f", float64(progress)),
				})
			}
			if status == "todo" && progress > 0 {
				errors = append(errors, models.ValidationError{
					Field:   "progress",
					Message: "Progress should be 0% when status is todo",
					Value:   fmt.Sprintf("%.1f", float64(progress)),
				})
			}
		}
	}

	// Validate estimated hours consistency
	if task.EstimatedHours != nil && *task.EstimatedHours <= 0 {
		errors = append(errors, models.ValidationError{
			Field:   "estimated_hours",
			Message: "Estimated hours must be greater than 0",
			Value:   fmt.Sprintf("%.1f", *task.EstimatedHours),
		})
	}

	return errors
}

func (vm *EnhancedValidationMiddleware) validateValue(value interface{}, rule string) error {
	// Simple rule parsing and validation
	// This is a basic implementation - in production, you'd want more sophisticated rule parsing
	rules := strings.Split(rule, ",")
	
	for _, r := range rules {
		if strings.HasPrefix(r, "min=") {
			min, _ := strconv.Atoi(r[4:])
			if str, ok := value.(string); ok && len(str) < min {
				return fmt.Errorf("minimum length is %d", min)
			}
		}
		if strings.HasPrefix(r, "max=") {
			max, _ := strconv.Atoi(r[4:])
			if str, ok := value.(string); ok && len(str) > max {
				return fmt.Errorf("maximum length is %d", max)
			}
		}
		// Add more rule validations as needed
	}

	return nil
}

func (vm *EnhancedValidationMiddleware) isEmpty(value interface{}) bool {
	if value == nil {
		return true
	}
	
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.String:
		return strings.TrimSpace(v.String()) == ""
	case reflect.Slice, reflect.Map, reflect.Array:
		return v.Len() == 0
	case reflect.Ptr, reflect.Interface:
		return v.IsNil()
	}
	
	return false
}

func (vm *EnhancedValidationMiddleware) getJSONFieldName(s interface{}, fieldName string) string {
	t := reflect.TypeOf(s)
	if t.Kind() == reflect.Ptr {
		t = t.Elem()
	}

	field, found := t.FieldByName(fieldName)
	if !found {
		return strings.ToLower(fieldName)
	}

	jsonTag := field.Tag.Get("json")
	if jsonTag == "" {
		return strings.ToLower(fieldName)
	}

	if strings.Contains(jsonTag, ",") {
		jsonTag = strings.Split(jsonTag, ",")[0]
	}

	if jsonTag == "-" {
		return strings.ToLower(fieldName)
	}

	return jsonTag
}

func (vm *EnhancedValidationMiddleware) getValidationMessage(err validator.FieldError) string {
	switch err.Tag() {
	case "required":
		return "This field is required"
	case "min":
		return fmt.Sprintf("Minimum length is %s", err.Param())
	case "max":
		return fmt.Sprintf("Maximum length is %s", err.Param())
	case "email":
		return "Invalid email format"
	case "task_status":
		return "Invalid task status"
	case "task_priority":
		return "Invalid task priority"
	case "enterprise_code":
		return "Invalid enterprise code format"
	case "positive_int":
		return "Must be a positive integer"
	case "future_date":
		return "Date must be in the future"
	case "chinese_name":
		return "Invalid Chinese name format"
	case "phone_number":
		return "Invalid phone number format"
	case "tax_id":
		return "Invalid tax ID format"
	default:
		return "Invalid value"
	}
}

func (vm *EnhancedValidationMiddleware) handleValidationError(c *gin.Context, message string, errors []models.ValidationError) {
	response := models.NewValidationErrorResponse(errors)
	c.JSON(http.StatusBadRequest, response)
	c.Abort()
}

// Custom validator functions

func validateTaskStatus(fl validator.FieldLevel) bool {
	validStatuses := map[string]bool{
		"draft": true, "planning": true, "todo": true, "in_progress": true,
		"testing": true, "completed": true, "cancelled": true, "on_hold": true,
		"suspended": true, "blocked": true, "archived": true,
	}
	return validStatuses[fl.Field().String()]
}

func validateTaskPriority(fl validator.FieldLevel) bool {
	validPriorities := map[string]bool{
		"low": true, "medium": true, "high": true, "urgent": true,
	}
	return validPriorities[fl.Field().String()]
}

func validateEnterpriseCode(fl validator.FieldLevel) bool {
	code := fl.Field().String()
	if len(code) < 2 || len(code) > 20 {
		return false
	}
	for _, r := range code {
		if !((r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_') {
			return false
		}
	}
	return true
}

func validatePositiveInt(fl validator.FieldLevel) bool {
	val := fl.Field().Int()
	return val > 0
}

func validateCustomFields(fl validator.FieldLevel) bool {
	// Validate that custom fields can be marshaled to JSON
	_, err := json.Marshal(fl.Field().Interface())
	return err == nil
}

func validateFutureDate(fl validator.FieldLevel) bool {
	date, ok := fl.Field().Interface().(time.Time)
	if !ok {
		return false
	}
	return date.After(time.Now())
}

func validateChineseName(fl validator.FieldLevel) bool {
	name := fl.Field().String()
	if len(name) < 2 || len(name) > 20 {
		return false
	}
	for _, r := range name {
		if !((r >= 0x4e00 && r <= 0x9fff) || r == ' ') {
			return false
		}
	}
	return true
}

func validatePhoneNumber(fl validator.FieldLevel) bool {
	phone := fl.Field().String()
	if len(phone) != 11 {
		return false
	}
	if phone[0] != '1' {
		return false
	}
	for _, r := range phone[1:] {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

func validateTaxID(fl validator.FieldLevel) bool {
	taxID := fl.Field().String()
	if len(taxID) < 10 || len(taxID) > 20 {
		return false
	}
	for _, r := range taxID {
		if !((r >= '0' && r <= '9') || (r >= 'A' && r <= 'Z')) {
			return false
		}
	}
	return true
}