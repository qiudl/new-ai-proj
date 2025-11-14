package monitoring

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Permission check duration histogram
// 用于记录权限检查操作的耗时分布
var PermissionCheckDuration = promauto.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "permission_check_duration_seconds",
		Help:    "Duration of permission check operations in seconds",
		Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0}, // 1ms to 1s
	},
	[]string{"method", "status"},
)

// Database query counter
// 记录权限相关的数据库查询总数
var PermissionDBQueryCount = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "permission_db_query_total",
		Help: "Total number of database queries for permission operations",
	},
	[]string{"method", "query_type"},
)

// Error counter
// 记录权限操作中的错误总数
var PermissionErrorCount = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "permission_error_total",
		Help: "Total number of permission operation errors",
	},
	[]string{"method", "error_type"},
)

// Cache hit counter
// 记录权限缓存命中次数
var PermissionCacheHits = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "permission_cache_hits_total",
		Help: "Total number of permission cache hits",
	},
	[]string{"method"},
)

// Cache miss counter
// 记录权限缓存未命中次数
var PermissionCacheMisses = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "permission_cache_misses_total",
		Help: "Total number of permission cache misses",
	},
	[]string{"method"},
)

// Operation counter
// 记录权限操作的总调用次数
var PermissionOperationCount = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "permission_operation_total",
		Help: "Total number of permission operations",
	},
	[]string{"method", "result"},
)

// Active requests gauge
// 记录当前正在处理的权限请求数量
var PermissionActiveRequests = promauto.NewGaugeVec(
	prometheus.GaugeOpts{
		Name: "permission_active_requests",
		Help: "Number of permission requests currently being processed",
	},
	[]string{"method"},
)

// Helper function to record permission check metrics
func RecordPermissionCheck(method string, duration float64, success bool, queryCount int) {
	status := "success"
	if !success {
		status = "error"
	}

	PermissionCheckDuration.WithLabelValues(method, status).Observe(duration)
	PermissionOperationCount.WithLabelValues(method, status).Inc()

	if queryCount > 0 {
		for i := 0; i < queryCount; i++ {
			PermissionDBQueryCount.WithLabelValues(method, "select").Inc()
		}
	}
}

// Helper function to record errors
func RecordPermissionError(method string, errorType string) {
	PermissionErrorCount.WithLabelValues(method, errorType).Inc()
	PermissionOperationCount.WithLabelValues(method, "error").Inc()
}

// Helper function to record cache metrics
func RecordCacheHit(method string) {
	PermissionCacheHits.WithLabelValues(method).Inc()
}

func RecordCacheMiss(method string) {
	PermissionCacheMisses.WithLabelValues(method).Inc()
}
