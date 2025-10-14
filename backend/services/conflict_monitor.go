package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"sync"
	"time"
)

// ConflictMonitor 实时冲突监控服务
// 定期扫描活跃worktrees并检测冲突
type ConflictMonitor struct {
	db               database.DB
	detectionEngine  *ConflictDetectionEngine
	worktreeService  *WorktreeService
	monitorInterval  time.Duration
	stopChan         chan struct{}
	wg               sync.WaitGroup
	conflictCache    map[int]*ConflictDetectionResult // worktreeID -> last result
	cacheMutex       sync.RWMutex
	notificationChan chan *ConflictNotification
}

// NewConflictMonitor 创建冲突监控服务
func NewConflictMonitor(
	db database.DB,
	detectionEngine *ConflictDetectionEngine,
	worktreeService *WorktreeService,
) *ConflictMonitor {
	return &ConflictMonitor{
		db:               db,
		detectionEngine:  detectionEngine,
		worktreeService:  worktreeService,
		monitorInterval:  5 * time.Minute, // 默认5分钟扫描一次
		stopChan:         make(chan struct{}),
		conflictCache:    make(map[int]*ConflictDetectionResult),
		notificationChan: make(chan *ConflictNotification, 100),
	}
}

// ConflictNotification 冲突通知
type ConflictNotification struct {
	WorktreeID    int                      `json:"worktree_id"`
	ProjectID     int                      `json:"project_id"`
	Timestamp     time.Time                `json:"timestamp"`
	Level         ConflictLevel            `json:"level"`
	Message       string                   `json:"message"`
	Result        *ConflictDetectionResult `json:"result"`
	NotifyUserIDs []int                    `json:"notify_user_ids,omitempty"`
}

// Start 启动监控服务
func (m *ConflictMonitor) Start(ctx context.Context) error {
	m.wg.Add(1)
	go m.monitorLoop(ctx)
	return nil
}

// Stop 停止监控服务
func (m *ConflictMonitor) Stop() error {
	close(m.stopChan)
	m.wg.Wait()
	close(m.notificationChan)
	return nil
}

// monitorLoop 监控循环
func (m *ConflictMonitor) monitorLoop(ctx context.Context) {
	defer m.wg.Done()

	ticker := time.NewTicker(m.monitorInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopChan:
			return
		case <-ticker.C:
			// 执行一次扫描
			if err := m.scanAllWorktrees(ctx); err != nil {
				// 记录错误但继续运行
				fmt.Printf("Error scanning worktrees: %v\n", err)
			}
		}
	}
}

// scanAllWorktrees 扫描所有活跃worktrees
func (m *ConflictMonitor) scanAllWorktrees(ctx context.Context) error {
	// 获取所有活跃的worktrees
	activeStatus := "active"
	worktrees, _, err := m.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		Status: &activeStatus,
		Limit:  1000,
	})
	if err != nil {
		return fmt.Errorf("failed to list worktrees: %w", err)
	}

	// 并发检测每个worktree的冲突
	for _, wt := range worktrees {
		go func(worktree *models.Worktree) {
			result, err := m.detectionEngine.DetectConflicts(ctx, &DetectConflictsRequest{
				WorktreeID: worktree.ID,
			})

			if err != nil {
				return
			}

			// 检查是否有新冲突或冲突级别变化
			if m.shouldNotify(worktree.ID, result) {
				m.sendNotification(worktree, result)
			}

			// 更新缓存
			m.updateCache(worktree.ID, result)
		}(wt)
	}

	return nil
}

// shouldNotify 判断是否应该发送通知
func (m *ConflictMonitor) shouldNotify(worktreeID int, result *ConflictDetectionResult) bool {
	m.cacheMutex.RLock()
	defer m.cacheMutex.RUnlock()

	lastResult, exists := m.conflictCache[worktreeID]

	// 首次检测到冲突
	if !exists && result.HasConflict {
		return true
	}

	// 冲突级别变化
	if exists && lastResult.Level != result.Level {
		return true
	}

	// 新增冲突
	if exists && result.TotalCount > lastResult.TotalCount {
		return true
	}

	return false
}

// sendNotification 发送冲突通知
func (m *ConflictMonitor) sendNotification(worktree *models.Worktree, result *ConflictDetectionResult) {
	notification := &ConflictNotification{
		WorktreeID: worktree.ID,
		ProjectID:  worktree.ProjectID,
		Timestamp:  time.Now(),
		Level:      result.Level,
		Message:    m.formatNotificationMessage(worktree, result),
		Result:     result,
	}

	// 发送到通知通道（非阻塞）
	select {
	case m.notificationChan <- notification:
	default:
		// 通道已满，丢弃通知
	}
}

// formatNotificationMessage 格式化通知消息
func (m *ConflictMonitor) formatNotificationMessage(worktree *models.Worktree, result *ConflictDetectionResult) string {
	if !result.HasConflict {
		return fmt.Sprintf("Worktree %s: 无冲突", worktree.Name)
	}

	return fmt.Sprintf("Worktree %s: 检测到 %d 个冲突 (级别: %s)",
		worktree.Name, result.TotalCount, result.Level)
}

// updateCache 更新冲突缓存
func (m *ConflictMonitor) updateCache(worktreeID int, result *ConflictDetectionResult) {
	m.cacheMutex.Lock()
	defer m.cacheMutex.Unlock()

	m.conflictCache[worktreeID] = result
}

// GetCachedResult 获取缓存的冲突检测结果
func (m *ConflictMonitor) GetCachedResult(worktreeID int) (*ConflictDetectionResult, bool) {
	m.cacheMutex.RLock()
	defer m.cacheMutex.RUnlock()

	result, exists := m.conflictCache[worktreeID]
	return result, exists
}

// GetNotificationChannel 获取通知通道
func (m *ConflictMonitor) GetNotificationChannel() <-chan *ConflictNotification {
	return m.notificationChan
}

// ForceCheck 强制检测指定worktree的冲突
func (m *ConflictMonitor) ForceCheck(ctx context.Context, worktreeID int) (*ConflictDetectionResult, error) {
	return m.detectionEngine.DetectConflicts(ctx, &DetectConflictsRequest{
		WorktreeID: worktreeID,
	})
}

// SetMonitorInterval 设置监控间隔
func (m *ConflictMonitor) SetMonitorInterval(interval time.Duration) {
	m.monitorInterval = interval
}

// GetConflictStatistics 获取冲突统计信息
func (m *ConflictMonitor) GetConflictStatistics() *ConflictStatistics {
	m.cacheMutex.RLock()
	defer m.cacheMutex.RUnlock()

	stats := &ConflictStatistics{
		TotalWorktrees:    len(m.conflictCache),
		WithConflicts:     0,
		ByLevel:           make(map[ConflictLevel]int),
		TotalConflicts:    0,
	}

	for _, result := range m.conflictCache {
		if result.HasConflict {
			stats.WithConflicts++
			stats.TotalConflicts += result.TotalCount
			stats.ByLevel[result.Level]++
		} else {
			stats.ByLevel[ConflictLevelNone]++
		}
	}

	return stats
}

// ConflictStatistics 冲突统计信息
type ConflictStatistics struct {
	TotalWorktrees int                    `json:"total_worktrees"`
	WithConflicts  int                    `json:"with_conflicts"`
	TotalConflicts int                    `json:"total_conflicts"`
	ByLevel        map[ConflictLevel]int  `json:"by_level"`
}
