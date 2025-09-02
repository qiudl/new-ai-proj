package security

import (
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// TimestampValidator handles request timestamp validation to prevent replay attacks
type TimestampValidator struct {
	// Configuration
	MaxSkewSeconds   int64 // Maximum allowed time difference in seconds
	TimestampHeader  string
	RequireTimestamp bool
}

// NewTimestampValidator creates a new timestamp validator with default configuration
func NewTimestampValidator() *TimestampValidator {
	return &TimestampValidator{
		MaxSkewSeconds:   300, // 5 minutes
		TimestampHeader:  "X-API-Timestamp",
		RequireTimestamp: true,
	}
}

// NewTimestampValidatorWithConfig creates a new timestamp validator with custom configuration
func NewTimestampValidatorWithConfig(maxSkewSeconds int64, timestampHeader string, required bool) *TimestampValidator {
	return &TimestampValidator{
		MaxSkewSeconds:   maxSkewSeconds,
		TimestampHeader:  timestampHeader,
		RequireTimestamp: required,
	}
}

// ValidateRequest validates the timestamp in the HTTP request
func (tv *TimestampValidator) ValidateRequest(r *http.Request) error {
	timestampStr := r.Header.Get(tv.TimestampHeader)

	if timestampStr == "" {
		if tv.RequireTimestamp {
			return fmt.Errorf("missing required timestamp header: %s", tv.TimestampHeader)
		}
		return nil // Timestamp not required and not provided
	}

	return tv.ValidateTimestamp(timestampStr)
}

// ValidateTimestamp validates a timestamp string
func (tv *TimestampValidator) ValidateTimestamp(timestampStr string) error {
	if timestampStr == "" {
		return fmt.Errorf("timestamp cannot be empty")
	}

	// Parse timestamp
	timestamp, err := tv.parseTimestamp(timestampStr)
	if err != nil {
		return fmt.Errorf("invalid timestamp format: %w", err)
	}

	// Validate timestamp range
	return tv.validateTimestampRange(timestamp)
}

// parseTimestamp parses timestamp from string (supports multiple formats)
func (tv *TimestampValidator) parseTimestamp(timestampStr string) (time.Time, error) {
	// Try parsing as Unix timestamp (seconds)
	if timestamp, err := strconv.ParseInt(timestampStr, 10, 64); err == nil {
		return time.Unix(timestamp, 0), nil
	}

	// Try parsing as Unix timestamp (milliseconds)
	if timestamp, err := strconv.ParseInt(timestampStr, 10, 64); err == nil && timestamp > 1000000000000 {
		return time.Unix(timestamp/1000, (timestamp%1000)*1000000), nil
	}

	// Try parsing as RFC3339 format
	if parsedTime, err := time.Parse(time.RFC3339, timestampStr); err == nil {
		return parsedTime, nil
	}

	// Try parsing as RFC3339 with nanoseconds
	if parsedTime, err := time.Parse(time.RFC3339Nano, timestampStr); err == nil {
		return parsedTime, nil
	}

	// Try parsing as ISO 8601 format
	if parsedTime, err := time.Parse("2006-01-02T15:04:05Z", timestampStr); err == nil {
		return parsedTime, nil
	}

	return time.Time{}, fmt.Errorf("unsupported timestamp format: %s", timestampStr)
}

// validateTimestampRange validates that timestamp is within acceptable range
func (tv *TimestampValidator) validateTimestampRange(timestamp time.Time) error {
	now := time.Now()

	// Calculate time difference
	diff := now.Sub(timestamp)
	absDiff := diff
	if absDiff < 0 {
		absDiff = -absDiff
	}

	// Check if timestamp is within acceptable range
	maxDuration := time.Duration(tv.MaxSkewSeconds) * time.Second
	if absDiff > maxDuration {
		if diff > 0 {
			return fmt.Errorf("timestamp is too old: %v ago (max allowed: %v)", diff, maxDuration)
		} else {
			return fmt.Errorf("timestamp is too far in the future: %v ahead (max allowed: %v)", -diff, maxDuration)
		}
	}

	return nil
}

// IsTimestampValid checks if a timestamp is valid without returning detailed error
func (tv *TimestampValidator) IsTimestampValid(timestampStr string) bool {
	return tv.ValidateTimestamp(timestampStr) == nil
}

// GetCurrentTimestamp returns current timestamp in Unix seconds format
func (tv *TimestampValidator) GetCurrentTimestamp() string {
	return fmt.Sprintf("%d", time.Now().Unix())
}

// GetCurrentTimestampMillis returns current timestamp in Unix milliseconds format
func (tv *TimestampValidator) GetCurrentTimestampMillis() string {
	return fmt.Sprintf("%d", time.Now().UnixMilli())
}

// GetTimestampFromRequest extracts timestamp from HTTP request
func (tv *TimestampValidator) GetTimestampFromRequest(r *http.Request) (time.Time, error) {
	timestampStr := r.Header.Get(tv.TimestampHeader)
	if timestampStr == "" {
		return time.Time{}, fmt.Errorf("timestamp header not found: %s", tv.TimestampHeader)
	}

	return tv.parseTimestamp(timestampStr)
}

// SetTimestampHeader sets the timestamp header for the request (useful for testing)
func (tv *TimestampValidator) SetTimestampHeader(r *http.Request, timestamp time.Time) {
	r.Header.Set(tv.TimestampHeader, fmt.Sprintf("%d", timestamp.Unix()))
}

// CreateTimestampHeader creates a timestamp header value for current time
func (tv *TimestampValidator) CreateTimestampHeader() string {
	return tv.GetCurrentTimestamp()
}

// ValidateRequestAge validates that a request is not too old
func (tv *TimestampValidator) ValidateRequestAge(r *http.Request, maxAge time.Duration) error {
	timestamp, err := tv.GetTimestampFromRequest(r)
	if err != nil {
		return err
	}

	age := time.Since(timestamp)
	if age > maxAge {
		return fmt.Errorf("request is too old: %v (max allowed: %v)", age, maxAge)
	}

	return nil
}

// GetMaxSkewDuration returns the maximum allowed time skew as duration
func (tv *TimestampValidator) GetMaxSkewDuration() time.Duration {
	return time.Duration(tv.MaxSkewSeconds) * time.Second
}

// SetMaxSkew sets the maximum allowed time skew in seconds
func (tv *TimestampValidator) SetMaxSkew(seconds int64) {
	tv.MaxSkewSeconds = seconds
}

// GetTimestampInfo returns detailed information about a timestamp
type TimestampInfo struct {
	Original  string        `json:"original"`
	Parsed    time.Time     `json:"parsed"`
	Unix      int64         `json:"unix"`
	UnixMilli int64         `json:"unix_milli"`
	Age       time.Duration `json:"age"`
	IsValid   bool          `json:"is_valid"`
	Error     string        `json:"error,omitempty"`
}

// AnalyzeTimestamp provides detailed analysis of a timestamp
func (tv *TimestampValidator) AnalyzeTimestamp(timestampStr string) TimestampInfo {
	info := TimestampInfo{
		Original: timestampStr,
	}

	// Try to parse timestamp
	if parsed, err := tv.parseTimestamp(timestampStr); err != nil {
		info.Error = err.Error()
		info.IsValid = false
	} else {
		info.Parsed = parsed
		info.Unix = parsed.Unix()
		info.UnixMilli = parsed.UnixMilli()
		info.Age = time.Since(parsed)

		// Check if timestamp is valid according to current configuration
		if err := tv.validateTimestampRange(parsed); err != nil {
			info.Error = err.Error()
			info.IsValid = false
		} else {
			info.IsValid = true
		}
	}

	return info
}
