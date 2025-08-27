package framework

import (
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// MonitoringManager 监控管理器
type MonitoringManager struct {
	config   *FrameworkConfig
	metrics  *FrameworkMetrics
	auditCh  chan *AuditEntry
	stopCh   chan struct{}
	wg       sync.WaitGroup
	mu       sync.RWMutex
	started  bool
}

// AuditEntry 审计条目
type AuditEntry struct {
	Request   *PermissionRequest
	Response  *PermissionResponse
	Timestamp time.Time
}

// NewMonitoringManager 创建监控管理器
func NewMonitoringManager(config *FrameworkConfig) (*MonitoringManager, error) {
	manager := &MonitoringManager{
		config: config,
		metrics: &FrameworkMetrics{
			CollectedAt:      time.Now(),
			CollectionPeriod: config.MonitoringConfig.MetricsInterval,
		},
		auditCh: make(chan *AuditEntry, config.MonitoringConfig.AuditBufferSize),
		stopCh:  make(chan struct{}),
	}
	
	// 启动监控goroutines
	if err := manager.start(); err != nil {
		return nil, fmt.Errorf("failed to start monitoring manager: %w", err)
	}
	
	return manager, nil
}

// start 启动监控管理器
func (m *MonitoringManager) start() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if m.started {
		return nil
	}
	
	// 启动审计日志处理器
	if m.config.EnableAudit {
		m.wg.Add(1)
		go m.auditProcessor()
	}
	
	// 启动指标收集器
	if m.config.EnableMetrics {
		m.wg.Add(1)
		go m.metricsCollector()
	}
	
	// 启动健康检查器
	if m.config.MonitoringConfig.EnableHealthCheck {
		m.wg.Add(1)
		go m.healthChecker()
	}
	
	m.started = true
	log.Printf("[MONITORING_MANAGER] Started successfully")
	
	return nil
}

// RecordPermissionCheck 记录权限检查
func (m *MonitoringManager) RecordPermissionCheck(request *PermissionRequest, duration time.Duration) {
	if !m.config.EnableMetrics {
		return
	}
	
	atomic.AddInt64(&m.metrics.TotalChecks, 1)
	
	// 更新平均延迟（简单算法）
	m.mu.Lock()
	currentAvg := m.metrics.AverageLatency.Nanoseconds()
	newAvg := (currentAvg + duration.Nanoseconds()) / 2
	m.metrics.AverageLatency = time.Duration(newAvg)
	m.mu.Unlock()
}

// RecordBatchPermissionCheck 记录批量权限检查
func (m *MonitoringManager) RecordBatchPermissionCheck(count int, duration time.Duration) {
	if !m.config.EnableMetrics {
		return
	}
	
	atomic.AddInt64(&m.metrics.TotalChecks, int64(count))
	
	// 更新平均延迟
	avgDurationPerCheck := duration / time.Duration(count)
	m.mu.Lock()
	currentAvg := m.metrics.AverageLatency.Nanoseconds()
	newAvg := (currentAvg + avgDurationPerCheck.Nanoseconds()) / 2
	m.metrics.AverageLatency = time.Duration(newAvg)
	m.mu.Unlock()
}

// RecordError 记录错误
func (m *MonitoringManager) RecordError(errorType string, err error) {
	if !m.config.EnableMetrics {
		return
	}
	
	atomic.AddInt64(&m.metrics.FailedChecks, 1)
	
	switch errorType {
	case "database":
		atomic.AddInt64(&m.metrics.DatabaseErrors, 1)
	case "cache":
		atomic.AddInt64(&m.metrics.CacheErrors, 1)
	case "rate_limit":
		atomic.AddInt64(&m.metrics.RateLimitErrors, 1)
	}
	
	log.Printf("[MONITORING_MANAGER] Error recorded: %s - %v", errorType, err)
}

// LogPermissionCheck 记录权限检查审计日志
func (m *MonitoringManager) LogPermissionCheck(ctx context.Context, request *PermissionRequest, response *PermissionResponse) {
	if !m.config.EnableAudit {
		return
	}
	
	// 异步发送到审计通道
	select {
	case m.auditCh <- &AuditEntry{
		Request:   request,
		Response:  response,
		Timestamp: time.Now(),
	}:
		// 成功发送
	default:
		// 通道已满，丢弃日志
		log.Printf("[MONITORING_MANAGER] Audit channel full, dropping log entry")
	}
}

// GetMetrics 获取当前指标
func (m *MonitoringManager) GetMetrics() *FrameworkMetrics {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// 创建指标的副本
	metrics := *m.metrics
	
	// 计算缓存命中率
	if metrics.CacheHits+metrics.CacheMisses > 0 {
		metrics.CacheHitRate = float64(metrics.CacheHits) / float64(metrics.CacheHits+metrics.CacheMisses)
	}
	
	// 计算预测命中率
	if metrics.PredictionHits+metrics.PredictionMisses > 0 {
		metrics.PredictionRate = float64(metrics.PredictionHits) / float64(metrics.PredictionHits+metrics.PredictionMisses)
	}
	
	return &metrics
}

// GetHealth 获取监控管理器健康状态
func (m *MonitoringManager) GetHealth() *ComponentHealth {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	status := "healthy"
	details := make(map[string]interface{})
	
	details["started"] = m.started
	details["audit_enabled"] = m.config.EnableAudit
	details["metrics_enabled"] = m.config.EnableMetrics
	details["audit_buffer_size"] = len(m.auditCh)
	details["audit_buffer_capacity"] = cap(m.auditCh)
	
	// 检查审计缓冲区是否接近满载
	if len(m.auditCh) > cap(m.auditCh)*3/4 {
		status = "degraded"
		details["warning"] = "audit buffer near capacity"
	}
	
	return &ComponentHealth{
		Status:  status,
		Details: details,
	}
}

// Close 关闭监控管理器
func (m *MonitoringManager) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	if !m.started {
		return nil
	}
	
	// 发送停止信号
	close(m.stopCh)
	
	// 等待所有goroutine结束
	m.wg.Wait()
	
	// 关闭审计通道
	close(m.auditCh)
	
	m.started = false
	log.Printf("[MONITORING_MANAGER] Stopped successfully")
	
	return nil
}

// auditProcessor 审计日志处理器
func (m *MonitoringManager) auditProcessor() {
	defer m.wg.Done()
	
	log.Printf("[MONITORING_MANAGER] Audit processor started")
	
	for {
		select {
		case entry := <-m.auditCh:
			if entry != nil {
				m.processAuditEntry(entry)
			}
		case <-m.stopCh:
			// 处理剩余的审计条目
			for len(m.auditCh) > 0 {
				entry := <-m.auditCh
				if entry != nil {
					m.processAuditEntry(entry)
				}
			}
			log.Printf("[MONITORING_MANAGER] Audit processor stopped")
			return
		}
	}
}

// processAuditEntry 处理审计条目
func (m *MonitoringManager) processAuditEntry(entry *AuditEntry) {
	if m.config.AuditRepo == nil {
		return
	}
	
	// 创建审计日志记录
	auditLog := &models.AuditLog{
		UserID:     &entry.Request.CompanyUserID,
		Action:     "permission_check",
		EntityType: entry.Request.PermissionCode,
		EntityData: map[string]interface{}{
			"permission_code":   entry.Request.PermissionCode,
			"resource_id":       entry.Request.ResourceID,
			"resource_type":     entry.Request.ResourceType,
			"has_permission":    entry.Response.HasPermission,
			"result_source":     entry.Response.Source,
			"result_reason":     entry.Response.Reason,
			"cache_hit":         entry.Response.CacheHit,
			"prediction_used":   entry.Response.PredictionUsed,
			"fallback_used":     entry.Response.FallbackUsed,
			"response_time_ms":  entry.Response.ResponseTime.Milliseconds(),
			"request_id":        entry.Request.RequestID,
			"ip_address":        entry.Request.IPAddress,
			"user_agent":        entry.Request.UserAgent,
		},
		IPAddress: entry.Request.IPAddress,
	}
	
	if entry.Request.ResourceID != nil {
		auditLog.EntityID = fmt.Sprintf("%d", *entry.Request.ResourceID)
	}
	
	// 异步写入数据库
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		
		if err := m.config.AuditRepo.CreateAuditLog(ctx, auditLog); err != nil {
			log.Printf("[MONITORING_MANAGER] Failed to write audit log: %v", err)
		}
	}()
}

// metricsCollector 指标收集器
func (m *MonitoringManager) metricsCollector() {
	defer m.wg.Done()
	
	log.Printf("[MONITORING_MANAGER] Metrics collector started")
	
	ticker := time.NewTicker(m.config.MonitoringConfig.MetricsInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			m.collectMetrics()
		case <-m.stopCh:
			log.Printf("[MONITORING_MANAGER] Metrics collector stopped")
			return
		}
	}
}

// collectMetrics 收集指标
func (m *MonitoringManager) collectMetrics() {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	// 更新收集时间
	now := time.Now()
	m.metrics.CollectionPeriod = now.Sub(m.metrics.CollectedAt)
	m.metrics.CollectedAt = now
	
	// 计算成功率
	if m.metrics.TotalChecks > 0 {
		m.metrics.SuccessfulChecks = m.metrics.TotalChecks - m.metrics.FailedChecks
	}
	
	// TODO: 收集P95、P99延迟等高级指标
	// 这需要维护延迟的直方图或排序数组
	
	log.Printf("[MONITORING_MANAGER] Metrics collected: total_checks=%d, failed_checks=%d, avg_latency=%v",
		m.metrics.TotalChecks, m.metrics.FailedChecks, m.metrics.AverageLatency)
}

// healthChecker 健康检查器
func (m *MonitoringManager) healthChecker() {
	defer m.wg.Done()
	
	log.Printf("[MONITORING_MANAGER] Health checker started")
	
	ticker := time.NewTicker(30 * time.Second) // 每30秒检查一次
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			m.performHealthCheck()
		case <-m.stopCh:
			log.Printf("[MONITORING_MANAGER] Health checker stopped")
			return
		}
	}
}

// performHealthCheck 执行健康检查
func (m *MonitoringManager) performHealthCheck() {
	// 检查审计缓冲区健康状态
	bufferUsage := float64(len(m.auditCh)) / float64(cap(m.auditCh))
	
	if bufferUsage > 0.9 {
		log.Printf("[MONITORING_MANAGER] WARNING: Audit buffer usage high: %.1f%%", bufferUsage*100)
	}
	
	// 检查错误率
	if m.metrics.TotalChecks > 0 {
		errorRate := float64(m.metrics.FailedChecks) / float64(m.metrics.TotalChecks)
		if errorRate > 0.1 { // 错误率超过10%
			log.Printf("[MONITORING_MANAGER] WARNING: High error rate: %.1f%%", errorRate*100)
		}
	}
	
	// TODO: 添加更多健康检查逻辑
	// - 检查数据库连接
	// - 检查缓存连接
	// - 检查内存使用情况
}
