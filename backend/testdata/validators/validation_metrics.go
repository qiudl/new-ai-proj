package main

import (
	"fmt"
	"sync"
	"time"
)

// ValidationMetrics 验证指标实现
type ValidationMetrics struct {
	enabled       bool
	validations   int64
	errors        int64
	warnings      int64
	executionTimes []time.Duration
	customMetrics map[string]float64
	mutex         sync.RWMutex
	startTime     time.Time
}

// NewValidationMetrics 创建验证指标
func NewValidationMetrics() *ValidationMetrics {
	return &ValidationMetrics{
		enabled:        true,
		executionTimes: make([]time.Duration, 0, 1000), // 保存最近1000次执行时间
		customMetrics:  make(map[string]float64),
		startTime:      time.Now(),
	}
}

// IncrementValidations 增加验证计数
func (m *ValidationMetrics) IncrementValidations() {
	if !m.enabled {
		return
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.validations++
}

// IncrementErrors 增加错误计数
func (m *ValidationMetrics) IncrementErrors() {
	if !m.enabled {
		return
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.errors++
}

// IncrementWarnings 增加警告计数
func (m *ValidationMetrics) IncrementWarnings() {
	if !m.enabled {
		return
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.warnings++
}

// RecordExecutionTime 记录执行时间
func (m *ValidationMetrics) RecordExecutionTime(duration time.Duration) {
	if !m.enabled {
		return
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()

	// 保持最近1000次执行时间
	if len(m.executionTimes) >= 1000 {
		// 移除最旧的记录
		m.executionTimes = m.executionTimes[1:]
	}
	m.executionTimes = append(m.executionTimes, duration)
}

// RecordCustomMetric 记录自定义指标
func (m *ValidationMetrics) RecordCustomMetric(name string, value float64) {
	if !m.enabled {
		return
	}

	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.customMetrics[name] = value
}

// GetCustomMetric 获取自定义指标
func (m *ValidationMetrics) GetCustomMetric(name string) float64 {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.customMetrics[name]
}

// ExportMetrics 导出指标
func (m *ValidationMetrics) ExportMetrics() map[string]interface{} {
	if !m.enabled {
		return nil
	}

	m.mutex.RLock()
	defer m.mutex.RUnlock()

	metrics := map[string]interface{}{
		"total_validations": m.validations,
		"total_errors":      m.errors,
		"total_warnings":    m.warnings,
		"uptime_seconds":    time.Since(m.startTime).Seconds(),
	}

	// 计算执行时间统计
	if len(m.executionTimes) > 0 {
		var total time.Duration
		min := m.executionTimes[0]
		max := m.executionTimes[0]

		for _, duration := range m.executionTimes {
			total += duration
			if duration < min {
				min = duration
			}
			if duration > max {
				max = duration
			}
		}

		avg := total / time.Duration(len(m.executionTimes))

		metrics["execution_time_avg_ms"] = avg.Milliseconds()
		metrics["execution_time_min_ms"] = min.Milliseconds()
		metrics["execution_time_max_ms"] = max.Milliseconds()
		metrics["execution_samples"] = len(m.executionTimes)

		// 计算百分位数
		if percentiles := m.calculatePercentiles(); percentiles != nil {
			metrics["execution_time_p50_ms"] = percentiles[0].Milliseconds()
			metrics["execution_time_p95_ms"] = percentiles[1].Milliseconds()
			metrics["execution_time_p99_ms"] = percentiles[2].Milliseconds()
		}
	}

	// 计算率统计
	if m.validations > 0 {
		metrics["error_rate"] = float64(m.errors) / float64(m.validations)
		metrics["warning_rate"] = float64(m.warnings) / float64(m.validations)
	}

	// 添加自定义指标
	for name, value := range m.customMetrics {
		metrics["custom_"+name] = value
	}

	return metrics
}

// calculatePercentiles 计算百分位数 (P50, P95, P99)
func (m *ValidationMetrics) calculatePercentiles() []time.Duration {
	if len(m.executionTimes) == 0 {
		return nil
	}

	// 创建副本并排序
	times := make([]time.Duration, len(m.executionTimes))
	copy(times, m.executionTimes)

	// 简单的选择排序
	for i := 0; i < len(times)-1; i++ {
		minIdx := i
		for j := i + 1; j < len(times); j++ {
			if times[j] < times[minIdx] {
				minIdx = j
			}
		}
		times[i], times[minIdx] = times[minIdx], times[i]
	}

	n := len(times)
	p50Index := n * 50 / 100
	p95Index := n * 95 / 100
	p99Index := n * 99 / 100

	// 确保索引在有效范围内
	if p50Index >= n {
		p50Index = n - 1
	}
	if p95Index >= n {
		p95Index = n - 1
	}
	if p99Index >= n {
		p99Index = n - 1
	}

	return []time.Duration{
		times[p50Index], // P50
		times[p95Index], // P95
		times[p99Index], // P99
	}
}

// ResetMetrics 重置指标
func (m *ValidationMetrics) ResetMetrics() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.validations = 0
	m.errors = 0
	m.warnings = 0
	m.executionTimes = m.executionTimes[:0]
	m.customMetrics = make(map[string]float64)
	m.startTime = time.Now()
}

// SetEnabled 设置是否启用
func (m *ValidationMetrics) SetEnabled(enabled bool) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.enabled = enabled
}

// IsEnabled 检查是否启用
func (m *ValidationMetrics) IsEnabled() bool {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.enabled
}

// GetValidationCount 获取验证次数
func (m *ValidationMetrics) GetValidationCount() int64 {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.validations
}

// GetErrorCount 获取错误次数
func (m *ValidationMetrics) GetErrorCount() int64 {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.errors
}

// GetWarningCount 获取警告次数
func (m *ValidationMetrics) GetWarningCount() int64 {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.warnings
}

// GetAverageExecutionTime 获取平均执行时间
func (m *ValidationMetrics) GetAverageExecutionTime() time.Duration {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if len(m.executionTimes) == 0 {
		return 0
	}

	var total time.Duration
	for _, duration := range m.executionTimes {
		total += duration
	}

	return total / time.Duration(len(m.executionTimes))
}

// GetUptime 获取运行时间
func (m *ValidationMetrics) GetUptime() time.Duration {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return time.Since(m.startTime)
}

// String 返回指标的字符串表示
func (m *ValidationMetrics) String() string {
	metrics := m.ExportMetrics()
	if metrics == nil {
		return "ValidationMetrics{disabled}"
	}

	return fmt.Sprintf("ValidationMetrics{validations: %v, errors: %v, warnings: %v, avg_time: %vms}",
		metrics["total_validations"],
		metrics["total_errors"],
		metrics["total_warnings"],
		metrics["execution_time_avg_ms"])
}