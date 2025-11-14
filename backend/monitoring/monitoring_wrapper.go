package monitoring

import (
	"context"
	"time"
)

// MonitoredFunc wraps a function with monitoring instrumentation
type MonitoredFunc func() error

// MonitorPermissionOperation wraps a permission operation with monitoring
// 自动记录执行时间、错误和活跃请求数
func MonitorPermissionOperation(ctx context.Context, method string, fn MonitoredFunc) error {
	// 增加活跃请求计数
	PermissionActiveRequests.WithLabelValues(method).Inc()
	defer PermissionActiveRequests.WithLabelValues(method).Dec()

	// 记录开始时间
	start := time.Now()

	// 执行函数
	err := fn()

	// 计算执行时间
	duration := time.Since(start).Seconds()

	// 记录指标
	if err != nil {
		RecordPermissionCheck(method, duration, false, 1)
	} else {
		RecordPermissionCheck(method, duration, true, 1)
	}

	return err
}

// MonitoredOperation 是一个通用的监控操作结构
type MonitoredOperation struct {
	Method      string
	StartTime   time.Time
	QueryCount  int
	CacheHit    bool
	ErrorOccurred bool
}

// NewMonitoredOperation 创建一个新的监控操作
func NewMonitoredOperation(method string) *MonitoredOperation {
	return &MonitoredOperation{
		Method:    method,
		StartTime: time.Now(),
	}
}

// IncrementQueryCount 增加查询计数
func (m *MonitoredOperation) IncrementQueryCount() {
	m.QueryCount++
	PermissionDBQueryCount.WithLabelValues(m.Method, "select").Inc()
}

// SetCacheHit 标记为缓存命中
func (m *MonitoredOperation) SetCacheHit() {
	m.CacheHit = true
	RecordCacheHit(m.Method)
}

// SetCacheMiss 标记为缓存未命中
func (m *MonitoredOperation) SetCacheMiss() {
	m.CacheHit = false
	RecordCacheMiss(m.Method)
}

// RecordError 记录错误
func (m *MonitoredOperation) RecordError(errorType string) {
	m.ErrorOccurred = true
	RecordPermissionError(m.Method, errorType)
}

// Complete 完成操作并记录所有指标
func (m *MonitoredOperation) Complete() {
	duration := time.Since(m.StartTime).Seconds()
	status := "success"
	if m.ErrorOccurred {
		status = "error"
	}

	PermissionCheckDuration.WithLabelValues(m.Method, status).Observe(duration)
	PermissionOperationCount.WithLabelValues(m.Method, status).Inc()
}

// CompleteWithError 以错误状态完成操作
func (m *MonitoredOperation) CompleteWithError(errorType string) {
	m.RecordError(errorType)
	m.Complete()
}

// CompleteWithSuccess 以成功状态完成操作
func (m *MonitoredOperation) CompleteWithSuccess() {
	m.Complete()
}
