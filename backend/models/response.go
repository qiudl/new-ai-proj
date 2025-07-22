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

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

// Pagination represents pagination metadata
type Pagination struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// PaginationParams represents pagination query parameters
type PaginationParams struct {
	Page     int `form:"page"`
	PageSize int `form:"page_size"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username" binding:"required" validate:"required,min=3,max=50"`
	Password string `json:"password" binding:"required" validate:"required,min=6"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Token     string `json:"token"`
	SessionID string `json:"session_id,omitempty"`
	User      User   `json:"user"`
}

// UserProfileUpdateRequest represents a user profile update request
type UserProfileUpdateRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50"`
	Email    string `json:"email" validate:"required,email"`
}

// PasswordChangeRequest represents a password change request
type PasswordChangeRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
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
	ErrCodeValidation     = "VALIDATION_ERROR"
	ErrCodeAuthentication = "AUTHENTICATION_ERROR"
	ErrCodeAuthorization  = "AUTHORIZATION_ERROR"
	ErrCodeUnauthorized   = "UNAUTHORIZED"
	ErrCodeNotFound       = "NOT_FOUND"
	ErrCodeConflict       = "CONFLICT"
	ErrCodeInternal       = "INTERNAL_ERROR"
	ErrCodeBadRequest     = "BAD_REQUEST"
	ErrCodeRateLimit      = "RATE_LIMIT_EXCEEDED"
)

// Common HTTP status codes mapping
var ErrorStatusCodes = map[string]int{
	ErrCodeValidation:     http.StatusBadRequest,
	ErrCodeAuthentication: http.StatusUnauthorized,
	ErrCodeAuthorization:  http.StatusForbidden,
	ErrCodeUnauthorized:   http.StatusUnauthorized,
	ErrCodeNotFound:       http.StatusNotFound,
	ErrCodeConflict:       http.StatusConflict,
	ErrCodeInternal:       http.StatusInternalServerError,
	ErrCodeBadRequest:     http.StatusBadRequest,
	ErrCodeRateLimit:      http.StatusTooManyRequests,
}

// GetStatusCode returns the HTTP status code for an error code
func GetStatusCode(errorCode string) int {
	if code, exists := ErrorStatusCodes[errorCode]; exists {
		return code
	}
	return http.StatusInternalServerError
}
