package services

import (
	"ai-project-backend/database"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// WorktreeMonitoringService Worktree监控服务
// Phase 6: 系统监控、资源管理、健康检查
type WorktreeMonitoringService struct {
	db              database.DB
	worktreeService *WorktreeService
	baseDir         string

	// 监控缓存
	cacheMutex      sync.RWMutex
	metricsCache    *SystemMetrics
	lastUpdateTime  time.Time
	cacheExpiration time.Duration

	// 告警配置
	alertThresholds *WorktreeAlertThresholds
}

// SystemMetrics 系统指标
type SystemMetrics struct {
	// Worktree统计
	TotalWorktrees       int                    `json:"total_worktrees"`
	ActiveWorktrees      int                    `json:"active_worktrees"`
	IdleWorktrees        int                    `json:"idle_worktrees"`
	ErrorWorktrees       int                    `json:"error_worktrees"`
	LockedWorktrees      int                    `json:"locked_worktrees"`
	WorktreesByStatus    map[string]int         `json:"worktrees_by_status"`
	WorktreesByProject   map[int]int            `json:"worktrees_by_project"`

	// 资源使用
	TotalDiskUsageMB     float64                `json:"total_disk_usage_mb"`
	AverageDiskUsageMB   float64                `json:"average_disk_usage_mb"`
	MaxDiskUsageMB       float64                `json:"max_disk_usage_mb"`

	// 任务绑定
	TotalBindings        int                    `json:"total_bindings"`
	ActiveBindings       int                    `json:"active_bindings"`
	BindingsPerWorktree  float64                `json:"bindings_per_worktree"`

	// 冲突统计
	WorktreesWithConflicts int                  `json:"worktrees_with_conflicts"`
	TotalConflicts        int                    `json:"total_conflicts"`

	// 时间戳
	CollectedAt          time.Time              `json:"collected_at"`
	CollectionDuration   time.Duration          `json:"collection_duration"`
}

// WorktreeAlertThresholds 告警阈值配置
type WorktreeAlertThresholds struct {
	MaxWorktrees        int     `json:"max_worktrees"`          // 最大worktree数量
	MaxDiskUsageGB      float64 `json:"max_disk_usage_gb"`      // 最大磁盘使用(GB)
	MaxIdleWorktrees    int     `json:"max_idle_worktrees"`     // 最大闲置worktree数
	MaxConflictRate     float64 `json:"max_conflict_rate"`      // 最大冲突率
	MaxErrorWorktrees   int     `json:"max_error_worktrees"`    // 最大错误worktree数
}

// WorktreeAlert 告警信息
type WorktreeAlert struct {
	Level       string    `json:"level"`        // info, warning, error, critical
	Type        string    `json:"type"`         // resource, conflict, performance, health
	Message     string    `json:"message"`
	Details     string    `json:"details"`
	Threshold   string    `json:"threshold"`
	CurrentValue string   `json:"current_value"`
	Timestamp   time.Time `json:"timestamp"`
}

// HealthStatus 健康状态
type HealthStatus struct {
	Status           string                 `json:"status"`            // healthy, degraded, unhealthy
	Score            float64                `json:"score"`             // 0.0-1.0
	Metrics          *SystemMetrics         `json:"metrics"`
	Alerts           []*WorktreeAlert       `json:"alerts"`
	Recommendations  []string               `json:"recommendations"`
	CheckedAt        time.Time              `json:"checked_at"`
	Components       map[string]string      `json:"components"`        // 各组件状态
}

// WorktreeResourceInfo Worktree资源信息
type WorktreeResourceInfo struct {
	WorktreeID       int       `json:"worktree_id"`
	Name             string    `json:"name"`
	Path             string    `json:"path"`
	DiskUsageMB      float64   `json:"disk_usage_mb"`
	FileCount        int       `json:"file_count"`
	LastAccessTime   time.Time `json:"last_access_time"`
	Status           string    `json:"status"`
	IdleDuration     time.Duration `json:"idle_duration"`
}

// NewWorktreeMonitoringService 创建监控服务
func NewWorktreeMonitoringService(
	db database.DB,
	worktreeService *WorktreeService,
	baseDir string,
) *WorktreeMonitoringService {
	return &WorktreeMonitoringService{
		db:              db,
		worktreeService: worktreeService,
		baseDir:         baseDir,
		cacheExpiration: 5 * time.Minute,
		alertThresholds: &WorktreeAlertThresholds{
			MaxWorktrees:      50,
			MaxDiskUsageGB:    100.0,
			MaxIdleWorktrees:  10,
			MaxConflictRate:   0.3,
			MaxErrorWorktrees: 3,
		},
	}
}

// ============================================================================
// 1. 指标收集
// ============================================================================

// CollectSystemMetrics 收集系统指标
func (s *WorktreeMonitoringService) CollectSystemMetrics(ctx context.Context) (*SystemMetrics, error) {
	// 检查缓存
	s.cacheMutex.RLock()
	if s.metricsCache != nil && time.Since(s.lastUpdateTime) < s.cacheExpiration {
		defer s.cacheMutex.RUnlock()
		return s.metricsCache, nil
	}
	s.cacheMutex.RUnlock()

	// 收集新指标
	startTime := time.Now()
	metrics := &SystemMetrics{
		WorktreesByStatus:  make(map[string]int),
		WorktreesByProject: make(map[int]int),
		CollectedAt:        startTime,
	}

	// 1. 获取所有worktrees
	worktrees, total, err := s.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		Limit: 1000, // 获取所有
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}

	metrics.TotalWorktrees = total

	// 2. 统计各类数据
	var totalDiskUsage float64
	var maxDiskUsage float64

	for _, wt := range worktrees {
		// 状态统计
		metrics.WorktreesByStatus[wt.Status]++
		metrics.WorktreesByProject[wt.ProjectID]++

		// 按状态分类
		switch wt.Status {
		case "active":
			metrics.ActiveWorktrees++
		case "idle":
			metrics.IdleWorktrees++
		case "error":
			metrics.ErrorWorktrees++
		case "locked":
			metrics.LockedWorktrees++
		}

		// 磁盘使用统计
		diskUsage := s.calculateDiskUsage(wt.WorktreePath)
		totalDiskUsage += diskUsage
		if diskUsage > maxDiskUsage {
			maxDiskUsage = diskUsage
		}
	}

	// 计算平均值
	if metrics.TotalWorktrees > 0 {
		metrics.AverageDiskUsageMB = totalDiskUsage / float64(metrics.TotalWorktrees)
	}
	metrics.TotalDiskUsageMB = totalDiskUsage
	metrics.MaxDiskUsageMB = maxDiskUsage

	// 3. 统计任务绑定
	// TODO: 需要从TaskBindingCoordinator获取
	metrics.TotalBindings = 0
	metrics.ActiveBindings = 0
	if metrics.TotalWorktrees > 0 {
		metrics.BindingsPerWorktree = float64(metrics.TotalBindings) / float64(metrics.TotalWorktrees)
	}

	// 4. 冲突统计
	// TODO: 需要从ConflictMonitor获取
	metrics.WorktreesWithConflicts = 0
	metrics.TotalConflicts = 0

	metrics.CollectionDuration = time.Since(startTime)

	// 更新缓存
	s.cacheMutex.Lock()
	s.metricsCache = metrics
	s.lastUpdateTime = time.Now()
	s.cacheMutex.Unlock()

	return metrics, nil
}

// calculateDiskUsage 计算目录磁盘使用量(MB)
func (s *WorktreeMonitoringService) calculateDiskUsage(path string) float64 {
	var size int64

	err := filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // 忽略错误，继续
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})

	if err != nil {
		return 0
	}

	return float64(size) / (1024 * 1024) // 转换为MB
}

// ============================================================================
// 2. 健康检查
// ============================================================================

// CheckSystemHealth 检查系统健康状态
func (s *WorktreeMonitoringService) CheckSystemHealth(ctx context.Context) (*HealthStatus, error) {
	health := &HealthStatus{
		Status:          "healthy",
		Score:           1.0,
		CheckedAt:       time.Now(),
		Alerts:          []*WorktreeAlert{},
		Recommendations: []string{},
		Components:      make(map[string]string),
	}

	// 1. 收集指标
	metrics, err := s.CollectSystemMetrics(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to collect metrics: %w", err)
	}
	health.Metrics = metrics

	// 2. 检查数据库连接
	if err := s.db.Ping(); err != nil {
		health.Components["database"] = "unhealthy"
		health.Alerts = append(health.Alerts, &WorktreeAlert{
			Level:     "critical",
			Type:      "health",
			Message:   "Database connection failed",
			Details:   err.Error(),
			Timestamp: time.Now(),
		})
		health.Score -= 0.3
	} else {
		health.Components["database"] = "healthy"
	}

	// 3. 检查worktree基础目录
	if _, err := os.Stat(s.baseDir); os.IsNotExist(err) {
		health.Components["storage"] = "unhealthy"
		health.Alerts = append(health.Alerts, &WorktreeAlert{
			Level:     "critical",
			Type:      "resource",
			Message:   "Worktree base directory does not exist",
			Details:   s.baseDir,
			Timestamp: time.Now(),
		})
		health.Score -= 0.3
	} else {
		health.Components["storage"] = "healthy"
	}

	// 4. 检查告警阈值
	alerts := s.checkThresholds(metrics)
	health.Alerts = append(health.Alerts, alerts...)

	// 根据告警级别调整分数
	for _, alert := range alerts {
		switch alert.Level {
		case "critical":
			health.Score -= 0.25
		case "error":
			health.Score -= 0.15
		case "warning":
			health.Score -= 0.05
		}
	}

	// 5. 生成建议
	health.Recommendations = s.generateRecommendations(metrics, alerts)

	// 6. 确定最终状态
	if health.Score >= 0.8 {
		health.Status = "healthy"
	} else if health.Score >= 0.5 {
		health.Status = "degraded"
	} else {
		health.Status = "unhealthy"
	}

	// 确保分数不低于0
	if health.Score < 0 {
		health.Score = 0
	}

	return health, nil
}

// checkThresholds 检查阈值并生成告警
func (s *WorktreeMonitoringService) checkThresholds(metrics *SystemMetrics) []*WorktreeAlert {
	alerts := []*WorktreeAlert{}

	// 1. Worktree数量检查
	if metrics.TotalWorktrees > s.alertThresholds.MaxWorktrees {
		alerts = append(alerts, &WorktreeAlert{
			Level:        "warning",
			Type:         "resource",
			Message:      "Total worktrees exceeds threshold",
			Threshold:    fmt.Sprintf("%d", s.alertThresholds.MaxWorktrees),
			CurrentValue: fmt.Sprintf("%d", metrics.TotalWorktrees),
			Timestamp:    time.Now(),
		})
	}

	// 2. 磁盘使用检查
	diskUsageGB := metrics.TotalDiskUsageMB / 1024
	if diskUsageGB > s.alertThresholds.MaxDiskUsageGB {
		alerts = append(alerts, &WorktreeAlert{
			Level:        "error",
			Type:         "resource",
			Message:      "Disk usage exceeds threshold",
			Threshold:    fmt.Sprintf("%.1f GB", s.alertThresholds.MaxDiskUsageGB),
			CurrentValue: fmt.Sprintf("%.1f GB", diskUsageGB),
			Timestamp:    time.Now(),
		})
	}

	// 3. 闲置worktree检查
	if metrics.IdleWorktrees > s.alertThresholds.MaxIdleWorktrees {
		alerts = append(alerts, &WorktreeAlert{
			Level:        "warning",
			Type:         "performance",
			Message:      "Too many idle worktrees",
			Details:      "Consider reclaiming idle worktrees to free resources",
			Threshold:    fmt.Sprintf("%d", s.alertThresholds.MaxIdleWorktrees),
			CurrentValue: fmt.Sprintf("%d", metrics.IdleWorktrees),
			Timestamp:    time.Now(),
		})
	}

	// 4. 错误worktree检查
	if metrics.ErrorWorktrees > s.alertThresholds.MaxErrorWorktrees {
		alerts = append(alerts, &WorktreeAlert{
			Level:        "error",
			Type:         "health",
			Message:      "Multiple worktrees in error state",
			Details:      "Review and fix error worktrees",
			Threshold:    fmt.Sprintf("%d", s.alertThresholds.MaxErrorWorktrees),
			CurrentValue: fmt.Sprintf("%d", metrics.ErrorWorktrees),
			Timestamp:    time.Now(),
		})
	}

	// 5. 冲突率检查
	if metrics.TotalWorktrees > 0 {
		conflictRate := float64(metrics.WorktreesWithConflicts) / float64(metrics.TotalWorktrees)
		if conflictRate > s.alertThresholds.MaxConflictRate {
			alerts = append(alerts, &WorktreeAlert{
				Level:        "warning",
				Type:         "conflict",
				Message:      "High conflict rate detected",
				Details:      "Review and resolve conflicts in worktrees",
				Threshold:    fmt.Sprintf("%.1f%%", s.alertThresholds.MaxConflictRate*100),
				CurrentValue: fmt.Sprintf("%.1f%%", conflictRate*100),
				Timestamp:    time.Now(),
			})
		}
	}

	return alerts
}

// generateRecommendations 生成优化建议
func (s *WorktreeMonitoringService) generateRecommendations(metrics *SystemMetrics, alerts []*WorktreeAlert) []string {
	recommendations := []string{}

	// 基于告警生成建议
	for _, alert := range alerts {
		switch alert.Type {
		case "resource":
			if alert.Message == "Total worktrees exceeds threshold" {
				recommendations = append(recommendations, "考虑删除不再需要的worktrees或增加资源限制")
			}
			if alert.Message == "Disk usage exceeds threshold" {
				recommendations = append(recommendations, "清理旧worktrees或扩展存储空间")
			}
		case "performance":
			if alert.Message == "Too many idle worktrees" {
				recommendations = append(recommendations, "运行工作空间回收程序释放闲置资源")
			}
		case "health":
			if alert.Message == "Multiple worktrees in error state" {
				recommendations = append(recommendations, "检查错误日志并修复失败的worktrees")
			}
		}
	}

	// 基于指标生成通用建议
	if metrics.ActiveWorktrees == 0 && metrics.TotalWorktrees > 0 {
		recommendations = append(recommendations, "所有worktrees处于非活跃状态，考虑清理")
	}

	if metrics.TotalWorktrees > 0 && metrics.IdleWorktrees > metrics.ActiveWorktrees {
		recommendations = append(recommendations, "闲置worktrees多于活跃worktrees，建议优化资源分配")
	}

	if len(recommendations) == 0 {
		recommendations = append(recommendations, "系统运行良好，继续保持")
	}

	return recommendations
}

// ============================================================================
// 3. 资源分析
// ============================================================================

// AnalyzeWorktreeResources 分析worktree资源使用
func (s *WorktreeMonitoringService) AnalyzeWorktreeResources(ctx context.Context, projectID *int) ([]*WorktreeResourceInfo, error) {
	opts := &ListWorktreesOptions{Limit: 1000}
	if projectID != nil {
		opts.ProjectID = projectID
	}

	worktrees, _, err := s.worktreeService.ListWorktrees(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}

	resources := make([]*WorktreeResourceInfo, 0, len(worktrees))

	for _, wt := range worktrees {
		info := &WorktreeResourceInfo{
			WorktreeID: wt.ID,
			Name:       wt.Name,
			Path:       wt.WorktreePath,
			Status:     wt.Status,
		}

		// 计算磁盘使用
		info.DiskUsageMB = s.calculateDiskUsage(wt.WorktreePath)

		// 计算文件数量
		info.FileCount = s.countFiles(wt.WorktreePath)

		// 计算闲置时长
		if wt.LastActiveAt != nil {
			info.IdleDuration = time.Since(*wt.LastActiveAt)
			info.LastAccessTime = *wt.LastActiveAt
		}

		resources = append(resources, info)
	}

	return resources, nil
}

// countFiles 统计目录文件数量
func (s *WorktreeMonitoringService) countFiles(path string) int {
	count := 0
	filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			count++
		}
		return nil
	})
	return count
}

// ============================================================================
// 4. 配置管理
// ============================================================================

// UpdateAlertThresholds 更新告警阈值
func (s *WorktreeMonitoringService) UpdateAlertThresholds(thresholds *WorktreeAlertThresholds) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	s.alertThresholds = thresholds
}

// GetAlertThresholds 获取当前告警阈值
func (s *WorktreeMonitoringService) GetAlertThresholds() *WorktreeAlertThresholds {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	return s.alertThresholds
}

// InvalidateCache 清除指标缓存
func (s *WorktreeMonitoringService) InvalidateCache() {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	s.metricsCache = nil
}
