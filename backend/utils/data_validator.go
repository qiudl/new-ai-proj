package utils

import (
	"encoding/json"
	"fmt"
	"reflect"
	
	"github.com/your-project/backend/models"
)

// ValidateAndCleanCustomFields validates and cleans CustomFields to ensure it's always a map
func ValidateAndCleanCustomFields(input interface{}) (models.CustomFields, error) {
	if input == nil {
		return models.CustomFields{}, nil
	}

	// Handle different input types
	switch v := input.(type) {
	case models.CustomFields:
		// Already correct type, validate content
		return validateCustomFieldsContent(v)
		
	case map[string]interface{}:
		// Convert to CustomFields and validate
		cf := models.CustomFields(v)
		return validateCustomFieldsContent(cf)
		
	case string:
		// Parse JSON string
		var cf models.CustomFields
		if err := json.Unmarshal([]byte(v), &cf); err != nil {
			return models.CustomFields{}, fmt.Errorf("invalid JSON in custom_fields: %v", err)
		}
		return validateCustomFieldsContent(cf)
		
	case []interface{}:
		// Handle array format - convert to object
		return convertArrayToCustomFields(v)
		
	default:
		// Try to marshal and unmarshal to clean the data
		jsonBytes, err := json.Marshal(v)
		if err != nil {
			return models.CustomFields{}, fmt.Errorf("cannot marshal custom_fields: %v", err)
		}
		
		var cf models.CustomFields
		if err := json.Unmarshal(jsonBytes, &cf); err != nil {
			// If unmarshaling to map fails, try to handle as array
			var arr []interface{}
			if arrErr := json.Unmarshal(jsonBytes, &arr); arrErr == nil {
				return convertArrayToCustomFields(arr)
			}
			return models.CustomFields{}, fmt.Errorf("invalid custom_fields format: %v", err)
		}
		
		return validateCustomFieldsContent(cf)
	}
}

// validateCustomFieldsContent validates the content of CustomFields
func validateCustomFieldsContent(cf models.CustomFields) (models.CustomFields, error) {
	if cf == nil {
		return models.CustomFields{}, nil
	}

	// Validate each field
	cleaned := make(models.CustomFields)
	
	for key, value := range cf {
		// Skip null values
		if value == nil {
			continue
		}
		
		// Validate key format
		if key == "" {
			continue // Skip empty keys
		}
		
		// Clean and validate common fields
		switch key {
		case "priority":
			if str, ok := value.(string); ok && isValidPriority(str) {
				cleaned[key] = str
			}
		case "tags":
			if cleanedTags := cleanTagsArray(value); len(cleanedTags) > 0 {
				cleaned[key] = cleanedTags
			} else {
				cleaned[key] = []string{} // Ensure it's always an array
			}
		case "estimated_hours":
			if num, ok := convertToFloat64(value); ok && num >= 0 {
				cleaned[key] = num
			}
		case "progress":
			if num, ok := convertToFloat64(value); ok && num >= 0 && num <= 100 {
				cleaned[key] = num
			}
		default:
			// For other fields, just ensure they're JSON-serializable
			if isJSONSerializable(value) {
				cleaned[key] = value
			}
		}
	}
	
	return cleaned, nil
}

// convertArrayToCustomFields converts array format to proper CustomFields
func convertArrayToCustomFields(arr []interface{}) (models.CustomFields, error) {
	result := make(models.CustomFields)
	
	for _, item := range arr {
		if item == nil {
			continue
		}
		
		// If item is a map, merge it into result
		if itemMap, ok := item.(map[string]interface{}); ok {
			for k, v := range itemMap {
				if v != nil && k != "" {
					result[k] = v
				}
			}
		}
	}
	
	return validateCustomFieldsContent(result)
}

// Helper functions
func isValidPriority(priority string) bool {
	validPriorities := map[string]bool{
		"low":    true,
		"medium": true,
		"high":   true,
	}
	return validPriorities[priority]
}

func cleanTagsArray(value interface{}) []string {
	switch v := value.(type) {
	case []string:
		return v
	case []interface{}:
		var tags []string
		for _, tag := range v {
			if str, ok := tag.(string); ok && str != "" {
				tags = append(tags, str)
			}
		}
		return tags
	case string:
		if v != "" {
			return []string{v}
		}
	}
	return []string{}
}

func convertToFloat64(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case string:
		// Try to parse string as number
		var f float64
		if json.Unmarshal([]byte(v), &f) == nil {
			return f, true
		}
	}
	return 0, false
}

func isJSONSerializable(value interface{}) bool {
	_, err := json.Marshal(value)
	return err == nil
}

// ValidateTaskRequest validates and cleans a TaskRequest
func ValidateTaskRequest(req *models.TaskRequest) error {
	if req == nil {
		return fmt.Errorf("task request cannot be nil")
	}
	
	// Clean CustomFields
	cleanedFields, err := ValidateAndCleanCustomFields(req.CustomFields)
	if err != nil {
		return fmt.Errorf("invalid custom_fields: %v", err)
	}
	req.CustomFields = cleanedFields
	
	return nil
}

// DatabaseHealthCheck checks for problematic custom_fields data in the database
type DatabaseHealthCheck struct {
	db interface{} // Database interface
}

func (dhc *DatabaseHealthCheck) CheckCustomFieldsIntegrity() ([]string, error) {
	// This would contain SQL queries to check for problematic data
	// For now, return a placeholder
	var issues []string
	
	// Query to find array-format custom_fields
	// SELECT id, title, custom_fields FROM tasks WHERE custom_fields::text LIKE '[%'
	
	// Query to find null custom_fields
	// SELECT id, title FROM tasks WHERE custom_fields IS NULL
	
	return issues, nil
}