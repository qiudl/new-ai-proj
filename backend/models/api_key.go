package models

import (
	"database/sql/driver"
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"
)

// APIPermissionType represents API permission types
type APIPermissionType string

const (
	PermissionAPIRead        APIPermissionType = "api.read"
	PermissionAPIWrite       APIPermissionType = "api.write"
	PermissionAPIAdmin       APIPermissionType = "api.admin"
	PermissionTasksRead      APIPermissionType = "tasks.read"
	PermissionTasksWrite     APIPermissionType = "tasks.write"
	PermissionProjectsRead   APIPermissionType = "projects.read"
	PermissionProjectsWrite  APIPermissionType = "projects.write"
	PermissionUsersRead      APIPermissionType = "users.read"
	PermissionUsersWrite     APIPermissionType = "users.write"
	PermissionAnalyticsRead  APIPermissionType = "analytics.read"
	PermissionAnalyticsWrite APIPermissionType = "analytics.write"
	PermissionSystemMonitor  APIPermissionType = "system.monitor"
)

// RateLimitType represents rate limit window types
type RateLimitType string

const (
	RateLimitPerMinute RateLimitType = "per_minute"
	RateLimitPerHour   RateLimitType = "per_hour"
	RateLimitPerDay    RateLimitType = "per_day"
	RateLimitPerMonth  RateLimitType = "per_month"
)

// APIPermissions represents a slice of API permissions
type APIPermissions []APIPermissionType

// Value implements driver.Valuer interface for database storage
func (p APIPermissions) Value() (driver.Value, error) {
	if len(p) == 0 {
		return "{}", nil
	}

	strPermissions := make([]string, len(p))
	for i, perm := range p {
		strPermissions[i] = string(perm)
	}

	result := "{" + fmt.Sprintf(`"%s"`, strPermissions[0])
	for _, perm := range strPermissions[1:] {
		result += fmt.Sprintf(`,"%s"`, perm)
	}
	result += "}"

	return result, nil
}

// Scan implements sql.Scanner interface for database retrieval
func (p *APIPermissions) Scan(value interface{}) error {
	if value == nil {
		*p = APIPermissions{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into APIPermissions", value)
	}

	// Handle PostgreSQL array format: {item1,item2,item3}
	str := string(bytes)
	if len(str) == 0 || str == "{}" {
		*p = APIPermissions{}
		return nil
	}

	// Remove the curly braces and split by comma
	if str[0] == '{' && str[len(str)-1] == '}' {
		str = str[1 : len(str)-1]
	}

	if str == "" {
		*p = APIPermissions{}
		return nil
	}

	// Split by comma and create permissions
	parts := strings.Split(str, ",")
	permissions := make(APIPermissions, len(parts))
	for i, part := range parts {
		// Remove any quotes that might be around the permission
		permStr := strings.Trim(strings.TrimSpace(part), `"`)
		permissions[i] = APIPermissionType(permStr)
	}

	*p = permissions
	return nil
}

// IntSlice represents a slice of integers for PostgreSQL array support
type IntSlice []int

// Value implements driver.Valuer interface
func (is IntSlice) Value() (driver.Value, error) {
	if len(is) == 0 {
		return "{}", nil
	}

	result := "{"
	for i, val := range is {
		if i > 0 {
			result += ","
		}
		result += fmt.Sprintf("%d", val)
	}
	result += "}"

	return result, nil
}

// Scan implements sql.Scanner interface
func (is *IntSlice) Scan(value interface{}) error {
	if value == nil {
		*is = IntSlice{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into IntSlice", value)
	}

	// Handle PostgreSQL array format: {1,2,3}
	str := string(bytes)
	if len(str) == 0 || str == "{}" {
		*is = IntSlice{}
		return nil
	}

	// Remove the curly braces and split by comma
	if str[0] == '{' && str[len(str)-1] == '}' {
		str = str[1 : len(str)-1]
	}

	if str == "" {
		*is = IntSlice{}
		return nil
	}

	// Split by comma and convert to integers
	parts := strings.Split(str, ",")
	slice := make([]int, len(parts))
	for i, part := range parts {
		val, err := strconv.Atoi(strings.TrimSpace(part))
		if err != nil {
			return fmt.Errorf("failed to parse integer '%s': %w", part, err)
		}
		slice[i] = val
	}

	*is = IntSlice(slice)
	return nil
}

// StringSlice represents a slice of strings for PostgreSQL array support
type StringSlice []string

// Value implements driver.Valuer interface
func (ss StringSlice) Value() (driver.Value, error) {
	if len(ss) == 0 {
		return "{}", nil
	}

	result := "{"
	for i, val := range ss {
		if i > 0 {
			result += ","
		}
		result += fmt.Sprintf(`"%s"`, val)
	}
	result += "}"

	return result, nil
}

// Scan implements sql.Scanner interface
func (ss *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*ss = StringSlice{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into StringSlice", value)
	}

	// Handle PostgreSQL array format: {item1,item2,item3}
	str := string(bytes)
	if len(str) == 0 || str == "{}" {
		*ss = StringSlice{}
		return nil
	}

	// Remove the curly braces and split by comma
	if str[0] == '{' && str[len(str)-1] == '}' {
		str = str[1 : len(str)-1]
	}

	if str == "" {
		*ss = StringSlice{}
		return nil
	}

	// Split by comma and create string slice
	parts := strings.Split(str, ",")
	slice := make([]string, len(parts))
	for i, part := range parts {
		// Remove any quotes that might be around the string
		slice[i] = strings.Trim(strings.TrimSpace(part), `"`)
	}

	*ss = StringSlice(slice)
	return nil
}

// IPSlice represents a slice of IP addresses for PostgreSQL inet array support
type IPSlice []net.IP

// Value implements driver.Valuer interface
func (ips IPSlice) Value() (driver.Value, error) {
	if len(ips) == 0 {
		return "{}", nil
	}

	result := "{"
	for i, ip := range ips {
		if i > 0 {
			result += ","
		}
		result += fmt.Sprintf(`"%s"`, ip.String())
	}
	result += "}"

	return result, nil
}

// Scan implements sql.Scanner interface
func (ips *IPSlice) Scan(value interface{}) error {
	if value == nil {
		*ips = IPSlice{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into IPSlice", value)
	}

	// Handle PostgreSQL array format: {192.168.1.1,10.0.0.1}
	str := string(bytes)
	if len(str) == 0 || str == "{}" {
		*ips = IPSlice{}
		return nil
	}

	// Remove the curly braces and split by comma
	if str[0] == '{' && str[len(str)-1] == '}' {
		str = str[1 : len(str)-1]
	}

	if str == "" {
		*ips = IPSlice{}
		return nil
	}

	// Split by comma and parse IP addresses
	parts := strings.Split(str, ",")
	ipSlice := make(IPSlice, len(parts))
	for i, part := range parts {
		// Remove any quotes that might be around the IP
		ipStr := strings.Trim(strings.TrimSpace(part), `"`)
		ip := net.ParseIP(ipStr)
		if ip == nil {
			return fmt.Errorf("invalid IP address: %s", ipStr)
		}
		ipSlice[i] = ip
	}

	*ips = ipSlice
	return nil
}

// APIKey represents an API key in the system
type APIKey struct {
	ID          int64   `json:"id" db:"id"`
	Name        string  `json:"name" db:"name" validate:"required,min=1,max=255"`
	Description *string `json:"description,omitempty" db:"description"`

	// Key data (stored as hashes for security)
	KeyHash    string  `json:"-" db:"key_hash"`
	KeyPrefix  string  `json:"key_prefix" db:"key_prefix" validate:"required,min=1,max=20"`
	SecretHash *string `json:"-" db:"secret_hash"`

	// Permission control
	Permissions   APIPermissions `json:"permissions" db:"permissions" validate:"required,min=1"`
	ScopeProjects IntSlice       `json:"scope_projects,omitempty" db:"scope_projects"`
	ScopeUsers    IntSlice       `json:"scope_users,omitempty" db:"scope_users"`

	// Rate limiting
	RateLimitCount  int           `json:"rate_limit_count" db:"rate_limit_count" validate:"min=1,max=100000"`
	RateLimitWindow RateLimitType `json:"rate_limit_window" db:"rate_limit_window" validate:"required,oneof=per_minute per_hour per_day per_month"`
	DailyQuota      *int          `json:"daily_quota,omitempty" db:"daily_quota" validate:"omitempty,min=1"`
	MonthlyQuota    *int          `json:"monthly_quota,omitempty" db:"monthly_quota" validate:"omitempty,min=1"`

	// Status management
	IsActive   bool       `json:"is_active" db:"is_active"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty" db:"last_used_at"`
	UsageCount int64      `json:"usage_count" db:"usage_count"`

	// Security information
	AllowedIPs       IPSlice     `json:"allowed_ips,omitempty" db:"allowed_ips"`
	AllowedDomains   StringSlice `json:"allowed_domains,omitempty" db:"allowed_domains"`
	UserAgentPattern *string     `json:"user_agent_pattern,omitempty" db:"user_agent_pattern"`

	// Audit information
	CreatedBy int        `json:"created_by" db:"created_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedBy *int       `json:"updated_by,omitempty" db:"updated_by"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`

	// Metadata
	Metadata CustomFields `json:"metadata,omitempty" db:"metadata"`
	Tags     StringSlice  `json:"tags,omitempty" db:"tags"`
}

// APIKeyCreateRequest represents a request to create an API key
type APIKeyCreateRequest struct {
	Name             string         `json:"name" validate:"required,min=1,max=255"`
	Description      *string        `json:"description,omitempty" validate:"omitempty,max=1000"`
	Permissions      APIPermissions `json:"permissions" validate:"required,min=1"`
	ScopeProjects    IntSlice       `json:"scope_projects,omitempty"`
	ScopeUsers       IntSlice       `json:"scope_users,omitempty"`
	RateLimitCount   int            `json:"rate_limit_count" validate:"min=1,max=100000"`
	RateLimitWindow  RateLimitType  `json:"rate_limit_window" validate:"required,oneof=per_minute per_hour per_day per_month"`
	DailyQuota       *int           `json:"daily_quota,omitempty" validate:"omitempty,min=1"`
	MonthlyQuota     *int           `json:"monthly_quota,omitempty" validate:"omitempty,min=1"`
	ExpiresAt        *time.Time     `json:"expires_at,omitempty"`
	AllowedIPs       IPSlice        `json:"allowed_ips,omitempty"`
	AllowedDomains   StringSlice    `json:"allowed_domains,omitempty"`
	UserAgentPattern *string        `json:"user_agent_pattern,omitempty" validate:"omitempty,max=500"`
	Metadata         CustomFields   `json:"metadata,omitempty"`
	Tags             StringSlice    `json:"tags,omitempty"`
}

// APIKeyUpdateRequest represents a request to update an API key
type APIKeyUpdateRequest struct {
	Name             *string        `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description      *string        `json:"description,omitempty" validate:"omitempty,max=1000"`
	Permissions      APIPermissions `json:"permissions,omitempty" validate:"omitempty,min=1"`
	ScopeProjects    IntSlice       `json:"scope_projects,omitempty"`
	ScopeUsers       IntSlice       `json:"scope_users,omitempty"`
	RateLimitCount   *int           `json:"rate_limit_count,omitempty" validate:"omitempty,min=1,max=100000"`
	RateLimitWindow  *RateLimitType `json:"rate_limit_window,omitempty" validate:"omitempty,oneof=per_minute per_hour per_day per_month"`
	DailyQuota       *int           `json:"daily_quota,omitempty" validate:"omitempty,min=1"`
	MonthlyQuota     *int           `json:"monthly_quota,omitempty" validate:"omitempty,min=1"`
	IsActive         *bool          `json:"is_active,omitempty"`
	ExpiresAt        *time.Time     `json:"expires_at,omitempty"`
	AllowedIPs       IPSlice        `json:"allowed_ips,omitempty"`
	AllowedDomains   StringSlice    `json:"allowed_domains,omitempty"`
	UserAgentPattern *string        `json:"user_agent_pattern,omitempty" validate:"omitempty,max=500"`
	Metadata         CustomFields   `json:"metadata,omitempty"`
	Tags             StringSlice    `json:"tags,omitempty"`
}

// APIKeyListParams represents parameters for listing API keys
type APIKeyListParams struct {
	Page        int            `json:"page" validate:"min=1"`
	PageSize    int            `json:"page_size" validate:"min=1,max=100"`
	Search      string         `json:"search,omitempty"`
	IsActive    *bool          `json:"is_active,omitempty"`
	CreatedBy   *int           `json:"created_by,omitempty"`
	HasExpired  *bool          `json:"has_expired,omitempty"`
	Permissions APIPermissions `json:"permissions,omitempty"`
	Tags        StringSlice    `json:"tags,omitempty"`
	SortBy      string         `json:"sort_by,omitempty" validate:"omitempty,oneof=name created_at last_used_at usage_count"`
	SortOrder   string         `json:"sort_order,omitempty" validate:"omitempty,oneof=asc desc"`
}

// APIKeyResponse represents an API key response (without sensitive data)
type APIKeyResponse struct {
	ID               int64          `json:"id"`
	Name             string         `json:"name"`
	Description      *string        `json:"description,omitempty"`
	KeyPrefix        string         `json:"key_prefix"`
	Permissions      APIPermissions `json:"permissions"`
	ScopeProjects    IntSlice       `json:"scope_projects,omitempty"`
	ScopeUsers       IntSlice       `json:"scope_users,omitempty"`
	RateLimitCount   int            `json:"rate_limit_count"`
	RateLimitWindow  RateLimitType  `json:"rate_limit_window"`
	DailyQuota       *int           `json:"daily_quota,omitempty"`
	MonthlyQuota     *int           `json:"monthly_quota,omitempty"`
	IsActive         bool           `json:"is_active"`
	ExpiresAt        *time.Time     `json:"expires_at,omitempty"`
	LastUsedAt       *time.Time     `json:"last_used_at,omitempty"`
	UsageCount       int64          `json:"usage_count"`
	AllowedIPs       IPSlice        `json:"allowed_ips,omitempty"`
	AllowedDomains   StringSlice    `json:"allowed_domains,omitempty"`
	UserAgentPattern *string        `json:"user_agent_pattern,omitempty"`
	CreatedBy        int            `json:"created_by"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedBy        *int           `json:"updated_by,omitempty"`
	UpdatedAt        time.Time      `json:"updated_at"`
	Metadata         CustomFields   `json:"metadata,omitempty"`
	Tags             StringSlice    `json:"tags,omitempty"`
}

// APIKeyListResponse represents a paginated list of API keys
type APIKeyListResponse struct {
	Data     []APIKeyResponse `json:"data"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"page_size"`
}

// APIKeyCreateResponse represents the response after creating an API key
type APIKeyCreateResponse struct {
	APIKey      APIKeyResponse `json:"api_key"`
	PlainKey    string         `json:"plain_key"`              // Only returned once upon creation
	PlainSecret *string        `json:"plain_secret,omitempty"` // Only returned once upon creation
}

// APIUsageLog represents an API usage log entry
type APIUsageLog struct {
	ID       int64 `json:"id" db:"id"`
	APIKeyID int64 `json:"api_key_id" db:"api_key_id"`
	UserID   *int  `json:"user_id,omitempty" db:"user_id"`

	// Request information
	Endpoint     string `json:"endpoint" db:"endpoint"`
	Method       string `json:"method" db:"method"`
	RequestSize  *int   `json:"request_size,omitempty" db:"request_size"`
	ResponseSize *int   `json:"response_size,omitempty" db:"response_size"`

	// Network information
	IPAddress     net.IP  `json:"ip_address" db:"ip_address"`
	UserAgent     *string `json:"user_agent,omitempty" db:"user_agent"`
	Referer       *string `json:"referer,omitempty" db:"referer"`
	XForwardedFor IPSlice `json:"x_forwarded_for,omitempty" db:"x_forwarded_for"`

	// Timing information
	RequestTimestamp  time.Time  `json:"request_timestamp" db:"request_timestamp"`
	ResponseTimestamp *time.Time `json:"response_timestamp,omitempty" db:"response_timestamp"`
	ResponseTimeMs    *int       `json:"response_time_ms,omitempty" db:"response_time_ms"`

	// Response information
	ResponseStatus int     `json:"response_status" db:"response_status"`
	ResponseType   *string `json:"response_type,omitempty" db:"response_type"`
	ErrorMessage   *string `json:"error_message,omitempty" db:"error_message"`
	ErrorCode      *string `json:"error_code,omitempty" db:"error_code"`

	// Business information
	ActionType   *string `json:"action_type,omitempty" db:"action_type"`
	ResourceType *string `json:"resource_type,omitempty" db:"resource_type"`
	ResourceID   *string `json:"resource_id,omitempty" db:"resource_id"`
	ProjectID    *int    `json:"project_id,omitempty" db:"project_id"`

	// Security information
	RateLimited   bool        `json:"rate_limited" db:"rate_limited"`
	BlockedReason *string     `json:"blocked_reason,omitempty" db:"blocked_reason"`
	SecurityFlags StringSlice `json:"security_flags,omitempty" db:"security_flags"`

	// Statistics information
	QuotaRemaining  *int   `json:"quota_remaining,omitempty" db:"quota_remaining"`
	RequestSequence *int64 `json:"request_sequence,omitempty" db:"request_sequence"`

	// Metadata
	RequestHeaders   CustomFields `json:"request_headers,omitempty" db:"request_headers"`
	RequestParams    CustomFields `json:"request_params,omitempty" db:"request_params"`
	ResponseMetadata CustomFields `json:"response_metadata,omitempty" db:"response_metadata"`
	CorrelationID    *string      `json:"correlation_id,omitempty" db:"correlation_id"`
	TraceID          *string      `json:"trace_id,omitempty" db:"trace_id"`
}

// APIQuotaStats represents API quota statistics
type APIQuotaStats struct {
	ID                  int64     `json:"id" db:"id"`
	APIKeyID            int64     `json:"api_key_id" db:"api_key_id"`
	StatDate            time.Time `json:"stat_date" db:"stat_date"`
	StatHour            *int      `json:"stat_hour,omitempty" db:"stat_hour"`
	RequestCount        int       `json:"request_count" db:"request_count"`
	SuccessCount        int       `json:"success_count" db:"success_count"`
	ErrorCount          int       `json:"error_count" db:"error_count"`
	RateLimitCount      int       `json:"rate_limit_count" db:"rate_limit_count"`
	TotalResponseTimeMs int64     `json:"total_response_time_ms" db:"total_response_time_ms"`
	AvgResponseTimeMs   int       `json:"avg_response_time_ms" db:"avg_response_time_ms"`
	TotalRequestSize    int64     `json:"total_request_size" db:"total_request_size"`
	TotalResponseSize   int64     `json:"total_response_size" db:"total_response_size"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// ToResponse converts APIKey to APIKeyResponse
func (ak *APIKey) ToResponse() APIKeyResponse {
	return APIKeyResponse{
		ID:               ak.ID,
		Name:             ak.Name,
		Description:      ak.Description,
		KeyPrefix:        ak.KeyPrefix,
		Permissions:      ak.Permissions,
		ScopeProjects:    ak.ScopeProjects,
		ScopeUsers:       ak.ScopeUsers,
		RateLimitCount:   ak.RateLimitCount,
		RateLimitWindow:  ak.RateLimitWindow,
		DailyQuota:       ak.DailyQuota,
		MonthlyQuota:     ak.MonthlyQuota,
		IsActive:         ak.IsActive,
		ExpiresAt:        ak.ExpiresAt,
		LastUsedAt:       ak.LastUsedAt,
		UsageCount:       ak.UsageCount,
		AllowedIPs:       ak.AllowedIPs,
		AllowedDomains:   ak.AllowedDomains,
		UserAgentPattern: ak.UserAgentPattern,
		CreatedBy:        ak.CreatedBy,
		CreatedAt:        ak.CreatedAt,
		UpdatedBy:        ak.UpdatedBy,
		UpdatedAt:        ak.UpdatedAt,
		Metadata:         ak.Metadata,
		Tags:             ak.Tags,
	}
}

// IsValidPermission validates if a permission type is valid
func IsValidPermission(permission APIPermissionType) bool {
	validPermissions := []APIPermissionType{
		PermissionAPIRead, PermissionAPIWrite, PermissionAPIAdmin,
		PermissionTasksRead, PermissionTasksWrite,
		PermissionProjectsRead, PermissionProjectsWrite,
		PermissionUsersRead, PermissionUsersWrite,
		PermissionAnalyticsRead, PermissionAnalyticsWrite,
		PermissionSystemMonitor,
	}

	for _, valid := range validPermissions {
		if permission == valid {
			return true
		}
	}
	return false
}

// IsValidRateLimitWindow validates if a rate limit window is valid
func IsValidRateLimitWindow(window RateLimitType) bool {
	validWindows := []RateLimitType{
		RateLimitPerMinute, RateLimitPerHour, RateLimitPerDay, RateLimitPerMonth,
	}

	for _, valid := range validWindows {
		if window == valid {
			return true
		}
	}
	return false
}

// IsExpired checks if the API key is expired
func (ak *APIKey) IsExpired() bool {
	if ak.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*ak.ExpiresAt)
}

// IsValid checks if the API key is valid for use
func (ak *APIKey) IsValid() bool {
	return ak.IsActive && !ak.IsExpired() && ak.DeletedAt == nil
}

// HasPermission checks if the API key has a specific permission
func (ak *APIKey) HasPermission(permission APIPermissionType) bool {
	for _, p := range ak.Permissions {
		if p == permission || p == PermissionAPIAdmin {
			return true
		}
	}
	return false
}

// HasProjectAccess checks if the API key has access to a specific project
func (ak *APIKey) HasProjectAccess(projectID int) bool {
	// If no project scope is set, allow access to all projects
	if len(ak.ScopeProjects) == 0 {
		return true
	}

	// Check if the project ID is in the allowed list
	for _, id := range ak.ScopeProjects {
		if id == projectID {
			return true
		}
	}
	return false
}

// HasUserAccess checks if the API key has access to a specific user
func (ak *APIKey) HasUserAccess(userID int) bool {
	// If no user scope is set, allow access to all users
	if len(ak.ScopeUsers) == 0 {
		return true
	}

	// Check if the user ID is in the allowed list
	for _, id := range ak.ScopeUsers {
		if id == userID {
			return true
		}
	}
	return false
}

// IsIPAllowed checks if an IP address is allowed
func (ak *APIKey) IsIPAllowed(ip net.IP) bool {
	// If no IP restrictions are set, allow all IPs
	if len(ak.AllowedIPs) == 0 {
		return true
	}

	// Check if the IP is in the allowed list
	for _, allowedIP := range ak.AllowedIPs {
		if ip.Equal(allowedIP) {
			return true
		}
	}
	return false
} // Force rebuild Sun Aug 17 23:01:15 CST 2025
