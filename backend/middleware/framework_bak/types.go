package framework

import (
	"time"
)

// PermissionRequest 权限检查请求
type PermissionRequest struct {
	// 基本信息
	CompanyUserID   int                    `json:"company_user_id"`
	PermissionCode  string                 `json:"permission_code"`
	ResourceID      *int                   `json:"resource_id,omitempty"`
	ResourceType    string                 `json:"resource_type,omitempty"`
	
	// 请求上下文
	RequestContext  map[string]interface{} `json:"request_context,omitempty"`
	IPAddress       string                 `json:"ip_address,omitempty"`
	UserAgent       string                 `json:"user_agent,omitempty"`
	RequestID       string                 `json:"request_id,omitempty"`
	
	// 检查选项
	CheckAncestry     bool   `json:"check_ancestry,omitempty"`
	EnableOverrides   bool   `json:"enable_overrides"`
	EnableCache       bool   `json:"enable_cache"`
	EnablePrediction  bool   `json:"enable_prediction"`
	Strategy          string `json:"strategy,omitempty"`
	
	// 时间信息
	Timestamp time.Time `json:"timestamp"`
}

// PermissionResponse 权限检查响应
type PermissionResponse struct {
	// 检查结果
	HasPermission   bool                   `json:"has_permission"`
	Source          string                 `json:"source"`
	Reason          string                 `json:"reason"`
	
	// 时间信息
	CheckedAt       time.Time              `json:"checked_at"`
	ResponseTime    time.Duration          `json:"response_time"`
	
	// 缓存信息
	CacheHit        bool                   `json:"cache_hit"`
	CacheSource     string                 `json:"cache_source,omitempty"`
	
	// 预测信息
	PredictionUsed  bool                   `json:"prediction_used"`
	PredictionScore float64                `json:"prediction_score,omitempty"`
	
	// 降级信息
	FallbackUsed    bool                   `json:"fallback_used"`
	FallbackReason  string                 `json:"fallback_reason,omitempty"`
	
	// 扩展信息
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
	
	// 调试信息
	Debug           *DebugInfo             `json:"debug,omitempty"`
}

// DebugInfo 调试信息
type DebugInfo struct {
	Strategy        string            `json:"strategy"`
	Steps           []string          `json:"steps"`
	DatabaseQueries int               `json:"database_queries"`
	CacheLookups    int               `json:"cache_lookups"`
	Timings         map[string]int64  `json:"timings"` // microseconds
}

// BatchPermissionRequest 批量权限检查请求
type BatchPermissionRequest struct {
	CompanyUserID   int                    `json:"company_user_id"`
	Permissions     []PermissionCheck      `json:"permissions"`
	RequestContext  map[string]interface{} `json:"request_context,omitempty"`
	IPAddress       string                 `json:"ip_address,omitempty"`
	UserAgent       string                 `json:"user_agent,omitempty"`
	RequestID       string                 `json:"request_id,omitempty"`
	EnableOverrides bool                   `json:"enable_overrides"`
	EnableCache     bool                   `json:"enable_cache"`
	Strategy        string                 `json:"strategy,omitempty"`
	Timestamp       time.Time              `json:"timestamp"`
}

// PermissionCheck 单个权限检查项
type PermissionCheck struct {
	PermissionCode string `json:"permission_code"`
	ResourceID     *int   `json:"resource_id,omitempty"`
	ResourceType   string `json:"resource_type,omitempty"`
}

// BatchPermissionResponse 批量权限检查响应
type BatchPermissionResponse struct {
	Results      map[string]*PermissionResponse `json:"results"`
	CheckedAt    time.Time                      `json:"checked_at"`
	ResponseTime time.Duration                  `json:"response_time"`
	CacheHits    int                            `json:"cache_hits"`
	DatabaseHits int                            `json:"database_hits"`
	Summary      *BatchSummary                  `json:"summary"`
}

// BatchSummary 批量检查汇总
type BatchSummary struct {
	TotalChecks     int     `json:"total_checks"`
	GrantedCount    int     `json:"granted_count"`
	DeniedCount     int     `json:"denied_count"`
	ErrorCount      int     `json:"error_count"`
	CacheHitRate    float64 `json:"cache_hit_rate"`
	AvgResponseTime int64   `json:"avg_response_time_ms"`
}

// MiddlewareOptions 基础中间件选项
type MiddlewareOptions struct {
	Permission      string                 `json:"permission"`
	Strategy        string                 `json:"strategy,omitempty"`
	EnableCache     bool                   `json:"enable_cache"`
	EnablePrediction bool                  `json:"enable_prediction"`
	EnableAudit     bool                   `json:"enable_audit"`
	ResourceExtractor func(*gin.Context) (*int, string) `json:"-"`
	ErrorHandler    func(*gin.Context, error)          `json:"-"`
	FallbackHandler func(*gin.Context) bool            `json:"-"`
	Context         map[string]interface{} `json:"context,omitempty"`
}

// AnyPermissionOptions 任一权限中间件选项
type AnyPermissionOptions struct {
	Permissions     []string               `json:"permissions"`
	Strategy        string                 `json:"strategy,omitempty"`
	EnableCache     bool                   `json:"enable_cache"`
	EnablePrediction bool                  `json:"enable_prediction"`
	EnableAudit     bool                   `json:"enable_audit"`
	ResourceExtractor func(*gin.Context) (*int, string) `json:"-"`
	ErrorHandler    func(*gin.Context, error)          `json:"-"`
	FallbackHandler func(*gin.Context) bool            `json:"-"`
	Context         map[string]interface{} `json:"context,omitempty"`
}

// AllPermissionOptions 所有权限中间件选项
type AllPermissionOptions struct {
	Permissions     []string               `json:"permissions"`
	Strategy        string                 `json:"strategy,omitempty"`
	EnableCache     bool                   `json:"enable_cache"`
	EnablePrediction bool                  `json:"enable_prediction"`
	EnableAudit     bool                   `json:"enable_audit"`
	ResourceExtractor func(*gin.Context) (*int, string) `json:"-"`
	ErrorHandler    func(*gin.Context, error)          `json:"-"`
	FallbackHandler func(*gin.Context) bool            `json:"-"`
	Context         map[string]interface{} `json:"context,omitempty"`
}

// RoleOptions 角色中间件选项
type RoleOptions struct {
	Role            string                 `json:"role"`
	AllowedRoles    []string               `json:"allowed_roles,omitempty"`
	Strategy        string                 `json:"strategy,omitempty"`
	EnableCache     bool                   `json:"enable_cache"`
	EnableAudit     bool                   `json:"enable_audit"`
	ErrorHandler    func(*gin.Context, error)          `json:"-"`
	FallbackHandler func(*gin.Context) bool            `json:"-"`
	Context         map[string]interface{} `json:"context,omitempty"`
}

// ResourceOptions 资源权限中间件选项
type ResourceOptions struct {
	Permission      string                 `json:"permission"`
	ResourceType    string                 `json:"resource_type"`
	Strategy        string                 `json:"strategy,omitempty"`
	EnableCache     bool                   `json:"enable_cache"`
	EnablePrediction bool                  `json:"enable_prediction"`
	EnableAudit     bool                   `json:"enable_audit"`
	ResourceExtractor func(*gin.Context) (*int, string) `json:"-"`
	OwnershipChecker  func(*gin.Context, int, *int) bool `json:"-"`
	ErrorHandler    func(*gin.Context, error)          `json:"-"`
	FallbackHandler func(*gin.Context) bool            `json:"-"`
	Context         map[string]interface{} `json:"context,omitempty"`
}

// CompositeOptions 组合权限中间件选项
type CompositeOptions struct {
	Rules           []PermissionRule       `json:"rules"`
	Logic           string                 `json:"logic"` // "AND", "OR", "CUSTOM"
	Strategy        string                 `json:"strategy,omitempty"`
	EnableCache     bool                   `json:"enable_cache"`
	EnablePrediction bool                  `json:"enable_prediction"`
	EnableAudit     bool                   `json:"enable_audit"`
	CustomLogic     func([]*PermissionResponse) bool `json:"-"`
	ErrorHandler    func(*gin.Context, error)        `json:"-"`
	FallbackHandler func(*gin.Context) bool          `json:"-"`
	Context         map[string]interface{} `json:"context,omitempty"`
}

// PermissionRule 权限规则
type PermissionRule struct {
	Type           string `json:"type"` // "permission", "role", "resource"
	Permission     string `json:"permission,omitempty"`
	Role           string `json:"role,omitempty"`
	ResourceType   string `json:"resource_type,omitempty"`
	Required       bool   `json:"required"`
	Weight         float64 `json:"weight,omitempty"`
}

// FrameworkHealth 框架健康状态
type FrameworkHealth struct {
	Status      string                     `json:"status"`
	Initialized bool                       `json:"initialized"`
	Components  map[string]ComponentHealth `json:"components"`
	CheckTime   time.Time                  `json:"check_time"`
}

// ComponentHealth 组件健康状态
type ComponentHealth struct {
	Status  string                 `json:"status"`
	Details map[string]interface{} `json:"details"`
}

// FrameworkMetrics 框架指标
type FrameworkMetrics struct {
	// 检查统计
	TotalChecks       int64         `json:"total_checks"`
	SuccessfulChecks  int64         `json:"successful_checks"`
	FailedChecks      int64         `json:"failed_checks"`
	GrantedChecks     int64         `json:"granted_checks"`
	DeniedChecks      int64         `json:"denied_checks"`
	
	// 缓存统计
	CacheHits         int64         `json:"cache_hits"`
	CacheMisses       int64         `json:"cache_misses"`
	CacheHitRate      float64       `json:"cache_hit_rate"`
	
	// 预测统计
	PredictionHits    int64         `json:"prediction_hits"`
	PredictionMisses  int64         `json:"prediction_misses"`
	PredictionRate    float64       `json:"prediction_rate"`
	
	// 性能统计
	AverageLatency    time.Duration `json:"average_latency"`
	P95Latency        time.Duration `json:"p95_latency"`
	P99Latency        time.Duration `json:"p99_latency"`
	
	// 错误统计
	DatabaseErrors    int64         `json:"database_errors"`
	CacheErrors       int64         `json:"cache_errors"`
	RateLimitErrors   int64         `json:"rate_limit_errors"`
	
	// 时间统计
	CollectedAt       time.Time     `json:"collected_at"`
	CollectionPeriod  time.Duration `json:"collection_period"`
}