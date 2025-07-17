package models

import (
	"net/http"
	"time"
)

// APIResponse represents a standard API response
type APIResponse struct {
	Success   bool        `json:"success"`
	Message   string      `json:"message,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Error     *APIError   `json:"error,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// APIError represents an API error
type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

// NewSuccessResponse creates a new success response
func NewSuccessResponse(data interface{}, message string) *APIResponse {
	return &APIResponse{
		Success:   true,
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
	}
}

// NewErrorResponse creates a new error response
func NewErrorResponse(code, message string, details interface{}) *APIResponse {
	return &APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: time.Now(),
	}
}

// NewValidationErrorResponse creates a new validation error response
func NewValidationErrorResponse(errors []ValidationError) *APIResponse {
	return &APIResponse{
		Success: false,
		Error: &APIError{
			Code:    "VALIDATION_ERROR",
			Message: "Validation failed",
			Details: errors,
		},
		Timestamp: time.Now(),
	}
}

// Common error codes
const (
	ErrCodeValidation    = "VALIDATION_ERROR"
	ErrCodeAuthentication = "AUTHENTICATION_ERROR"
	ErrCodeAuthorization  = "AUTHORIZATION_ERROR"
	ErrCodeNotFound      = "NOT_FOUND"
	ErrCodeConflict      = "CONFLICT"
	ErrCodeInternal      = "INTERNAL_ERROR"
	ErrCodeBadRequest    = "BAD_REQUEST"
)

// Common HTTP status codes mapping
var ErrorStatusCodes = map[string]int{
	ErrCodeValidation:     http.StatusBadRequest,
	ErrCodeAuthentication: http.StatusUnauthorized,
	ErrCodeAuthorization:  http.StatusForbidden,
	ErrCodeNotFound:       http.StatusNotFound,
	ErrCodeConflict:       http.StatusConflict,
	ErrCodeInternal:       http.StatusInternalServerError,
	ErrCodeBadRequest:     http.StatusBadRequest,
}

// GetStatusCode returns the HTTP status code for an error code
func GetStatusCode(errorCode string) int {
	if code, exists := ErrorStatusCodes[errorCode]; exists {
		return code
	}
	return http.StatusInternalServerError
}