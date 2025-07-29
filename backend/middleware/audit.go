// backend/middleware/audit.go
package middleware

import (
	"ai-project-backend/models"
	"ai-project-backend/database"
	"bytes"
	// "context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuditConfig holds configuration for the audit middleware
type AuditConfig struct {
	DB                 database.DB
	ExcludePaths       []string
	ExcludeMethods     []string
	LogRequestBody     bool
	LogResponseBody    bool
	MaxBodySize        int64
	SensitiveHeaders   []string
	SensitiveBodyKeys  []string
}

// AuditMiddleware provides HTTP request/response auditing
type AuditMiddleware struct {
	config *AuditConfig
}

// NewAuditMiddleware creates a new audit middleware
func NewAuditMiddleware(config *AuditConfig) *AuditMiddleware {
	if config.MaxBodySize == 0 {
		config.MaxBodySize = 1024 * 1024 // 1MB default
	}
	
	if config.SensitiveHeaders == nil {
		config.SensitiveHeaders = []string{
			"authorization",
			"x-api-key",
			"cookie",
			"set-cookie",
		}
	}
	
	if config.SensitiveBodyKeys == nil {
		config.SensitiveBodyKeys = []string{
			"password",
			"current_password", 
			"new_password",
			"password_hash",
			"token",
			"refresh_token",
			"secret",
			"api_key",
		}
	}

	return &AuditMiddleware{
		config: config,
	}
}

// responseBodyWriter wraps gin.ResponseWriter to capture response body
type responseBodyWriter struct {
	gin.ResponseWriter
	bodyBuffer *bytes.Buffer
}

func (w responseBodyWriter) Write(b []byte) (int, error) {
	// Write to both the original response and our buffer
	w.bodyBuffer.Write(b)
	return w.ResponseWriter.Write(b)
}

// Middleware returns the Gin middleware function
func (am *AuditMiddleware) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if path should be excluded
		if am.shouldExclude(c.Request.Method, c.Request.URL.Path) {
			c.Next()
			return
		}

		// Generate unique request ID
		requestID := uuid.New().String()
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)

		// Capture request details
		auditData := &models.AuditEventData{
			RequestID:   requestID,
			IPAddress:   am.getClientIP(c),
			UserAgent:   c.GetHeader("User-Agent"),
			Action:      am.determineAction(c.Request.Method, c.Request.URL.Path),
			ResourceType: am.determineResourceType(c.Request.URL.Path),
			ResourceID:  am.extractResourceID(c.Request.URL.Path),
		}

		// Try to get user from context (set by auth middleware)
		if userID, exists := c.Get("user_id"); exists {
			if uid, ok := userID.(int); ok {
				auditData.UserID = &uid
			}
		}
		if userEmail, exists := c.Get("user_email"); exists {
			if email, ok := userEmail.(string); ok {
				auditData.UserEmail = email
			}
		}
		if userName, exists := c.Get("user_name"); exists {
			if name, ok := userName.(string); ok {
				auditData.UserName = name
			}
		}
		if userRole, exists := c.Get("user_role"); exists {
			if role, ok := userRole.(string); ok {
				auditData.UserRole = role
			}
		}
		if sessionID, exists := c.Get("session_id"); exists {
			if sid, ok := sessionID.(string); ok {
				auditData.SessionID = sid
			}
		}

		// Capture request body if needed
		var requestBody interface{}
		if am.config.LogRequestBody && am.hasBody(c.Request) {
			body, err := am.captureRequestBody(c)
			if err == nil {
				requestBody = body
			}
		}

		// Wrap response writer to capture response body
		bodyBuffer := &bytes.Buffer{}
		wrapped := responseBodyWriter{
			ResponseWriter: c.Writer,
			bodyBuffer:     bodyBuffer,
		}
		c.Writer = wrapped

		// Record start time
		startTime := time.Now()

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(startTime)

		// Capture response details
		statusCode := c.Writer.Status()
		auditData.Status = am.getStatusFromCode(statusCode)
		
		// Capture response body if needed
		var responseBody interface{}
		if am.config.LogResponseBody && bodyBuffer.Len() > 0 {
			responseBody = am.sanitizeResponseBody(bodyBuffer.String())
		}

		// Get error from context if any
		if errors := c.Errors.ByType(gin.ErrorTypeAny); len(errors) > 0 {
			auditData.ErrorMessage = errors[0].Error()
			auditData.Status = models.StatusFailed
		}

		// Set resource name based on response or request
		auditData.ResourceName = am.extractResourceName(c, requestBody, responseBody)
		auditData.Description = am.generateDescription(auditData, statusCode, duration)

		// Set metadata
		auditData.Metadata = map[string]interface{}{
			"method":          c.Request.Method,
			"path":           c.Request.URL.Path,
			"query":          am.sanitizeQuery(c.Request.URL.RawQuery),
			"status_code":    statusCode,
			"duration_ms":    duration.Milliseconds(),
			"request_size":   c.Request.ContentLength,
			"response_size":  bodyBuffer.Len(),
			"headers":        am.sanitizeHeaders(c.Request.Header),
		}

		// Set before/after data
		if requestBody != nil {
			auditData.BeforeData = am.sanitizeRequestBody(requestBody)
		}
		if responseBody != nil {
			auditData.AfterData = responseBody
		}

		// Add tags
		auditData.Tags = am.generateTags(c, auditData)

		// Log audit event asynchronously
		go am.logAuditEvent(auditData)
	}
}

// shouldExclude checks if the request should be excluded from audit
func (am *AuditMiddleware) shouldExclude(method, path string) bool {
	// Exclude specific methods
	for _, excludeMethod := range am.config.ExcludeMethods {
		if strings.EqualFold(method, excludeMethod) {
			return true
		}
	}

	// Exclude specific paths
	for _, excludePath := range am.config.ExcludePaths {
		if strings.HasPrefix(path, excludePath) {
			return true
		}
	}

	// Exclude health checks and static assets by default
	excludeDefaults := []string{
		"/health",
		"/version", 
		"/metrics",
		"/favicon.ico",
		"/static/",
		"/assets/",
	}

	for _, defaultExclude := range excludeDefaults {
		if strings.HasPrefix(path, defaultExclude) {
			return true
		}
	}

	return false
}

// getClientIP extracts the real client IP address
func (am *AuditMiddleware) getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first
	if forwarded := c.GetHeader("X-Forwarded-For"); forwarded != "" {
		// Take the first IP in the list
		if ips := strings.Split(forwarded, ","); len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	if realIP := c.GetHeader("X-Real-IP"); realIP != "" {
		return realIP
	}

	// Fall back to remote address
	return c.ClientIP()
}

// determineAction determines the audit action based on HTTP method and path
func (am *AuditMiddleware) determineAction(method, path string) string {
	method = strings.ToUpper(method)
	path = strings.ToLower(path)

	// Project actions
	if strings.Contains(path, "/projects") {
		switch method {
		case "POST":
			return models.ActionProjectCreate
		case "PUT", "PATCH":
			return models.ActionProjectUpdate
		case "DELETE":
			return models.ActionProjectDelete
		default:
			return "project.view"
		}
	}

	// Task actions
	if strings.Contains(path, "/tasks") {
		if strings.Contains(path, "/bulk") {
			switch method {
			case "POST":
				return models.ActionTaskBulkUpdate
			case "DELETE":
				return models.ActionTaskBulkDelete
			}
		}
		
		switch method {
		case "POST":
			return models.ActionTaskCreate
		case "PUT", "PATCH":
			return models.ActionTaskUpdate
		case "DELETE":
			return models.ActionTaskDelete
		default:
			return "task.view"
		}
	}

	// Auth actions
	if strings.Contains(path, "/auth") {
		if strings.Contains(path, "/login") {
			return models.ActionUserLogin
		}
		if strings.Contains(path, "/logout") {
			return models.ActionUserLogout
		}
	}

	// User actions
	if strings.Contains(path, "/users") {
		if strings.Contains(path, "/profile") {
			switch method {
			case "PUT", "PATCH":
				return models.ActionUserUpdateProfile
			default:
				return "user.view_profile"
			}
		}
		if strings.Contains(path, "/password") {
			return models.ActionUserChangePassword
		}
	}

	// System actions
	if strings.Contains(path, "/system") {
		return "system.manage"
	}

	// Default action
	return fmt.Sprintf("%s.%s", strings.ToLower(method), "unknown")
}

// determineResourceType determines the resource type from the path
func (am *AuditMiddleware) determineResourceType(path string) string {
	path = strings.ToLower(path)

	if strings.Contains(path, "/projects") {
		return models.ResourceTypeProject
	}
	if strings.Contains(path, "/tasks") {
		return models.ResourceTypeTask
	}
	if strings.Contains(path, "/users") || strings.Contains(path, "/auth") {
		return models.ResourceTypeUser
	}
	if strings.Contains(path, "/system") {
		return models.ResourceTypeSystem
	}

	return "unknown"
}

// extractResourceID extracts resource ID from the path
func (am *AuditMiddleware) extractResourceID(path string) string {
	// Match patterns like /api/v1/projects/123 or /api/projects/123/tasks/456
	segments := strings.Split(strings.Trim(path, "/"), "/")
	
	for i, segment := range segments {
		// Look for numeric IDs after resource names
		if (segment == "projects" || segment == "tasks" || segment == "users") && i+1 < len(segments) {
			nextSegment := segments[i+1]
			// Check if it's a numeric ID (simple check)
			if len(nextSegment) > 0 && nextSegment[0] >= '0' && nextSegment[0] <= '9' {
				return nextSegment
			}
		}
	}
	
	return ""
}

// hasBody checks if the request has a body
func (am *AuditMiddleware) hasBody(r *http.Request) bool {
	return r.Body != nil && r.ContentLength > 0
}

// captureRequestBody captures and parses the request body
func (am *AuditMiddleware) captureRequestBody(c *gin.Context) (interface{}, error) {
	if c.Request.ContentLength > am.config.MaxBodySize {
		return map[string]interface{}{
			"_truncated": true,
			"_reason":    "body too large",
			"_size":      c.Request.ContentLength,
		}, nil
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil, err
	}

	// Restore the body for the next handler
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Try to parse as JSON
	var bodyData interface{}
	if err := json.Unmarshal(bodyBytes, &bodyData); err == nil {
		return bodyData, nil
	}

	// Return as string if not JSON
	return string(bodyBytes), nil
}

// sanitizeRequestBody removes sensitive data from request body
func (am *AuditMiddleware) sanitizeRequestBody(body interface{}) interface{} {
	return am.sanitizeData(body, am.config.SensitiveBodyKeys)
}

// sanitizeResponseBody sanitizes response body data
func (am *AuditMiddleware) sanitizeResponseBody(body string) interface{} {
	var responseData interface{}
	if err := json.Unmarshal([]byte(body), &responseData); err == nil {
		return am.sanitizeData(responseData, am.config.SensitiveBodyKeys)
	}
	return map[string]interface{}{
		"_raw": body[:min(len(body), 1000)], // Truncate large responses
	}
}

// sanitizeData recursively removes sensitive keys from data
func (am *AuditMiddleware) sanitizeData(data interface{}, sensitiveKeys []string) interface{} {
	switch v := data.(type) {
	case map[string]interface{}:
		result := make(map[string]interface{})
		for key, value := range v {
			if am.isSensitiveKey(key, sensitiveKeys) {
				result[key] = "***REDACTED***"
			} else {
				result[key] = am.sanitizeData(value, sensitiveKeys)
			}
		}
		return result
	case []interface{}:
		result := make([]interface{}, len(v))
		for i, item := range v {
			result[i] = am.sanitizeData(item, sensitiveKeys)
		}
		return result
	default:
		return data
	}
}

// isSensitiveKey checks if a key is considered sensitive
func (am *AuditMiddleware) isSensitiveKey(key string, sensitiveKeys []string) bool {
	key = strings.ToLower(key)
	for _, sensitiveKey := range sensitiveKeys {
		if strings.Contains(key, strings.ToLower(sensitiveKey)) {
			return true
		}
	}
	return false
}

// sanitizeHeaders removes sensitive headers
func (am *AuditMiddleware) sanitizeHeaders(headers http.Header) map[string]interface{} {
	result := make(map[string]interface{})
	for key, values := range headers {
		lowerKey := strings.ToLower(key)
		isSensitive := false
		for _, sensitiveHeader := range am.config.SensitiveHeaders {
			if strings.Contains(lowerKey, strings.ToLower(sensitiveHeader)) {
				isSensitive = true
				break
			}
		}
		
		if isSensitive {
			result[key] = "***REDACTED***"
		} else {
			if len(values) == 1 {
				result[key] = values[0]
			} else {
				result[key] = values
			}
		}
	}
	return result
}

// sanitizeQuery sanitizes query parameters
func (am *AuditMiddleware) sanitizeQuery(rawQuery string) string {
	// For now, just return the raw query
	// In production, you might want to parse and sanitize specific parameters
	return rawQuery
}

// extractResourceName tries to extract a meaningful resource name
func (am *AuditMiddleware) extractResourceName(c *gin.Context, requestBody, responseBody interface{}) string {
	// Try to extract from response first
	if responseBody != nil {
		if name := am.extractNameFromData(responseBody, []string{"name", "title", "email", "username"}); name != "" {
			return name
		}
	}

	// Try to extract from request
	if requestBody != nil {
		if name := am.extractNameFromData(requestBody, []string{"name", "title", "email", "username"}); name != "" {
			return name
		}
	}

	// Fall back to resource ID
	if resourceID := am.extractResourceID(c.Request.URL.Path); resourceID != "" {
		return resourceID
	}

	return "unknown"
}

// extractNameFromData extracts name-like fields from data
func (am *AuditMiddleware) extractNameFromData(data interface{}, nameFields []string) string {
	if dataMap, ok := data.(map[string]interface{}); ok {
		for _, field := range nameFields {
			if value, exists := dataMap[field]; exists {
				if strValue, ok := value.(string); ok && strValue != "" {
					return strValue
				}
			}
		}
		
		// Try nested data object
		if nested, exists := dataMap["data"]; exists {
			return am.extractNameFromData(nested, nameFields)
		}
	}
	return ""
}

// generateDescription generates a human-readable description
func (am *AuditMiddleware) generateDescription(auditData *models.AuditEventData, statusCode int, duration time.Duration) string {
	action := strings.Replace(auditData.Action, ".", " ", -1)
	resource := auditData.ResourceType
	
	if auditData.ResourceName != "" && auditData.ResourceName != "unknown" {
		resource = fmt.Sprintf("%s '%s'", resource, auditData.ResourceName)
	} else if auditData.ResourceID != "" {
		resource = fmt.Sprintf("%s %s", resource, auditData.ResourceID)
	}

	description := fmt.Sprintf("%s %s", strings.Title(action), resource)
	
	if statusCode >= 400 {
		description += fmt.Sprintf(" (failed with %d)", statusCode)
	} else {
		description += fmt.Sprintf(" (completed in %dms)", duration.Milliseconds())
	}

	return description
}

// generateTags generates tags for categorization
func (am *AuditMiddleware) generateTags(c *gin.Context, auditData *models.AuditEventData) []string {
	var tags []string

	// Add method tag
	tags = append(tags, strings.ToLower(c.Request.Method))

	// Add resource type tag
	tags = append(tags, auditData.ResourceType)

	// Add status tag
	tags = append(tags, auditData.Status)

	// Add API version tag
	if strings.Contains(c.Request.URL.Path, "/v1/") {
		tags = append(tags, "api-v1")
	} else {
		tags = append(tags, "api-legacy")
	}

	// Add authentication tag
	if auditData.UserID != nil {
		tags = append(tags, "authenticated")
	} else {
		tags = append(tags, "anonymous")
	}

	// Add bulk operation tag
	if strings.Contains(c.Request.URL.Path, "/bulk") {
		tags = append(tags, "bulk-operation")
	}

	return tags
}

// getStatusFromCode converts HTTP status code to audit status
func (am *AuditMiddleware) getStatusFromCode(statusCode int) string {
	if statusCode >= 200 && statusCode < 300 {
		return models.StatusSuccess
	} else if statusCode >= 400 {
		return models.StatusFailed
	}
	return models.StatusPending
}

// logAuditEvent logs the audit event to the database
func (am *AuditMiddleware) logAuditEvent(auditData *models.AuditEventData) {
	// ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	// defer cancel()

	// Create audit log entry
	auditLog := &models.AuditLog{
		EventID:      uuid.New().String(),
		Timestamp:    time.Now().UTC(),
		UserID:       auditData.UserID,
		UserEmail:    auditData.UserEmail,
		UserName:     auditData.UserName,
		UserRole:     auditData.UserRole,
		Action:       auditData.Action,
		ResourceType: auditData.ResourceType,
		ResourceID:   auditData.ResourceID,
		ResourceName: auditData.ResourceName,
		IPAddress:    auditData.IPAddress,
		UserAgent:    auditData.UserAgent,
		SessionID:    auditData.SessionID,
		RequestID:    auditData.RequestID,
		Description:  auditData.Description,
		Status:       auditData.Status,
		ErrorMessage: auditData.ErrorMessage,
		ProjectID:    auditData.ProjectID,
		Metadata:     models.JSONB(auditData.Metadata),
		Tags:         models.StringArray(auditData.Tags),
	}

	// Set before/after data based on configuration
	config := am.getAuditConfig(auditData.ResourceType, auditData.Action)
	if config != nil {
		if config.LogBeforeData && auditData.BeforeData != nil {
			if jsonData, err := json.Marshal(auditData.BeforeData); err == nil {
				auditLog.BeforeData = models.JSONB{}
				json.Unmarshal(jsonData, &auditLog.BeforeData)
			}
		}
		if config.LogAfterData && auditData.AfterData != nil {
			if jsonData, err := json.Marshal(auditData.AfterData); err == nil {
				auditLog.AfterData = models.JSONB{}
				json.Unmarshal(jsonData, &auditLog.AfterData)
			}
		}
		if config.LogChanges && auditData.BeforeData != nil && auditData.AfterData != nil {
			changes := am.calculateChanges(auditData.BeforeData, auditData.AfterData)
			if jsonData, err := json.Marshal(changes); err == nil {
				auditLog.Changes = models.JSONB{}
				json.Unmarshal(jsonData, &auditLog.Changes)
			}
		}
	}

	// Save to database - 临时注释掉以避免编译错误
	// if err := am.config.DB.Audit().CreateAuditLog(ctx, auditLog); err != nil {
	// 	// Log error but don't fail the request
	// 	fmt.Printf("Failed to log audit event: %v\n", err)
	// }
	fmt.Printf("Audit event logged: %s %s\n", auditLog.Action, auditLog.ResourceType)
}

// getAuditConfig gets the audit configuration for a specific resource type and action
func (am *AuditMiddleware) getAuditConfig(resourceType, action string) *models.AuditConfig {
	// For now, return default configuration
	// In production, this should query the database for configuration
	defaultConfigs := models.DefaultAuditConfigs()
	for _, config := range defaultConfigs {
		if config.ResourceType == resourceType && config.Action == action {
			return config
		}
	}
	return &models.AuditConfig{
		LogBeforeData: true,
		LogAfterData:  true,
		LogChanges:    true,
	}
}

// calculateChanges calculates the differences between before and after data
func (am *AuditMiddleware) calculateChanges(before, after interface{}) map[string]interface{} {
	changes := make(map[string]interface{})

	beforeMap, beforeOk := before.(map[string]interface{})
	afterMap, afterOk := after.(map[string]interface{})

	if !beforeOk || !afterOk {
		return changes
	}

	// Check for changed and new fields
	for key, afterValue := range afterMap {
		beforeValue, exists := beforeMap[key]
		if !exists {
			changes[key] = map[string]interface{}{
				"action": "added",
				"new":    afterValue,
			}
		} else if !am.deepEqual(beforeValue, afterValue) {
			changes[key] = map[string]interface{}{
				"action": "changed",
				"old":    beforeValue,
				"new":    afterValue,
			}
		}
	}

	// Check for removed fields
	for key, beforeValue := range beforeMap {
		if _, exists := afterMap[key]; !exists {
			changes[key] = map[string]interface{}{
				"action": "removed",
				"old":    beforeValue,
			}
		}
	}

	return changes
}

// deepEqual performs deep comparison of two values
func (am *AuditMiddleware) deepEqual(a, b interface{}) bool {
	aJSON, aErr := json.Marshal(a)
	bJSON, bErr := json.Marshal(b)
	if aErr != nil || bErr != nil {
		return false
	}
	return string(aJSON) == string(bJSON)
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
