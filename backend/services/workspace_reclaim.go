package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"time"
)

// WorkspaceReclaimService 工作空间回收服务
// 负责检测空闲工作空间、自动释放资源、清理过期worktree
type WorkspaceReclaimService struct {
	db              database.DB
	worktreeService *WorktreeService
	coordinator     *AIWorkspaceCoordinator
}

// NewWorkspaceReclaimService 创建工作空间回收服务
func NewWorkspaceReclaimService(
	db database.DB,
	worktreeService *WorktreeService,
	coordinator *AIWorkspaceCoordinator,
) *WorkspaceReclaimService {
	return &WorkspaceReclaimService{
		db:              db,
		worktreeService: worktreeService,
		coordinator:     coordinator,
	}
}

// ReclaimPolicy 回收策略
type ReclaimPolicy struct {
	IdleThreshold         time.Duration `json:"idle_threshold"`          // 空闲阈值（默认：2小时）
	InactiveThreshold     time.Duration `json:"inactive_threshold"`      // 不活跃阈值（默认：24小时）
	CompletedArchiveDelay time.Duration `json:"completed_archive_delay"` // 完成后归档延迟（默认：7天）
	FailedArchiveDelay    time.Duration `json:"failed_archive_delay"`    // 失败后归档延迟（默认：3天）
	AutoArchive           bool          `json:"auto_archive"`            // 是否自动归档
	AutoRelease           bool          `json:"auto_release"`            // 是否自动释放
	DryRun                bool          `json:"dry_run"`                 // 仅模拟，不实际执行
}

// DefaultReclaimPolicy 默认回收策略
var DefaultReclaimPolicy = &ReclaimPolicy{
	IdleThreshold:         2 * time.Hour,
	InactiveThreshold:     24 * time.Hour,
	CompletedArchiveDelay: 7 * 24 * time.Hour,
	FailedArchiveDelay:    3 * 24 * time.Hour,
	AutoArchive:           true,
	AutoRelease:           true,
	DryRun:                false,
}

// ReclaimResult 回收结果
type ReclaimResult struct {
	TotalScanned      int                     `json:"total_scanned"`
	IdleReleased      int                     `json:"idle_released"`
	InactiveArchived  int                     `json:"inactive_archived"`
	CompletedArchived int                     `json:"completed_archived"`
	FailedArchived    int                     `json:"failed_archived"`
	Errors            []string                `json:"errors,omitempty"`
	Details           []*WorkspaceReclaimInfo `json:"details,omitempty"`
	Duration          time.Duration           `json:"duration"`
}

// WorkspaceReclaimInfo 工作空间回收信息
type WorkspaceReclaimInfo struct {
	WorktreeID   int       `json:"worktree_id"`
	Action       string    `json:"action"`        // release/archive
	Reason       string    `json:"reason"`
	IdleDuration time.Duration `json:"idle_duration"`
	TaskCount    int       `json:"task_count"`
}

// ScanAndReclaim 扫描并回收工作空间
func (s *WorkspaceReclaimService) ScanAndReclaim(ctx context.Context, projectID int, policy *ReclaimPolicy) (*ReclaimResult, error) {
	startTime := time.Now()

	if policy == nil {
		policy = DefaultReclaimPolicy
	}

	result := &ReclaimResult{
		Details: []*WorkspaceReclaimInfo{},
		Errors:  []string{},
	}

	// 1. 获取项目的所有worktrees
	worktrees, total, err := s.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		ProjectID: &projectID,
		Limit:     1000, // 批量处理
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}

	result.TotalScanned = total

	// 2. 逐个检查worktree
	for _, wt := range worktrees {
		info, err := s.checkAndReclaimWorktree(ctx, wt, policy)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("worktree %d: %s", wt.ID, err.Error()))
			continue
		}

		if info != nil {
			result.Details = append(result.Details, info)

			switch info.Action {
			case "release":
				result.IdleReleased++
			case "archive":
				if wt.Status == "completed" {
					result.CompletedArchived++
				} else if wt.Status == "failed" {
					result.FailedArchived++
				} else {
					result.InactiveArchived++
				}
			}
		}
	}

	result.Duration = time.Since(startTime)
	return result, nil
}

// checkAndReclaimWorktree 检查并回收单个worktree
func (s *WorkspaceReclaimService) checkAndReclaimWorktree(
	ctx context.Context,
	wt *models.Worktree,
	policy *ReclaimPolicy,
) (*WorkspaceReclaimInfo, error) {
	now := time.Now()

	// 1. 检查空闲AI工作空间（active状态但长时间无活动）
	if wt.Status == "active" && wt.CurrentAIID != nil {
		// 获取最近的工作空间分配记录
		assignment, err := s.db.AIWorkspaceAssignments().GetCurrentAssignmentForWorktree(ctx, wt.ID)
		if err == nil && assignment != nil {
			idleDuration := now.Sub(assignment.AssignedAt)

			// 检查是否超过空闲阈值
			if idleDuration > policy.IdleThreshold {
				info := &WorkspaceReclaimInfo{
					WorktreeID:   wt.ID,
					Action:       "release",
					Reason:       fmt.Sprintf("空闲时间超过阈值: %s", idleDuration),
					IdleDuration: idleDuration,
				}

				// 获取绑定的任务数
				bindings, _ := s.db.WorktreeTaskBindings().GetByWorktreeID(ctx, wt.ID)
				info.TaskCount = len(bindings)

				// 执行释放
				if policy.AutoRelease && !policy.DryRun {
					if err := s.coordinator.ReleaseWorkspace(ctx, wt.ID, *wt.CurrentAIID); err != nil {
						return nil, fmt.Errorf("failed to release workspace: %w", err)
					}
				}

				return info, nil
			}
		}
	}

	// 2. 检查已完成的worktree（应该归档）
	if wt.Status == "completed" {
		completeDuration := now.Sub(wt.UpdatedAt)
		if completeDuration > policy.CompletedArchiveDelay {
			info := &WorkspaceReclaimInfo{
				WorktreeID:   wt.ID,
				Action:       "archive",
				Reason:       fmt.Sprintf("已完成 %s，需要归档", completeDuration),
				IdleDuration: completeDuration,
			}

			if policy.AutoArchive && !policy.DryRun {
				// 归档worktree（使用worktreeService的方法）
				// 注意：这里需要worktreeService支持归档操作
				wt.Status = "archived"
				if _, err := s.db.Worktrees().Update(ctx, wt); err != nil {
					return nil, fmt.Errorf("failed to archive worktree: %w", err)
				}
			}

			return info, nil
		}
	}

	// 3. 检查失败的worktree
	if wt.Status == "failed" {
		failedDuration := now.Sub(wt.UpdatedAt)
		if failedDuration > policy.FailedArchiveDelay {
			info := &WorkspaceReclaimInfo{
				WorktreeID:   wt.ID,
				Action:       "archive",
				Reason:       fmt.Sprintf("失败 %s，需要归档", failedDuration),
				IdleDuration: failedDuration,
			}

			if policy.AutoArchive && !policy.DryRun {
				wt.Status = "archived"
				if _, err := s.db.Worktrees().Update(ctx, wt); err != nil {
					return nil, fmt.Errorf("failed to archive worktree: %w", err)
				}
			}

			return info, nil
		}
	}

	// 4. 检查长期不活跃的worktree
	if wt.Status == "ready" || wt.Status == "pending" {
		inactiveDuration := now.Sub(wt.UpdatedAt)
		if inactiveDuration > policy.InactiveThreshold {
			info := &WorkspaceReclaimInfo{
				WorktreeID:   wt.ID,
				Action:       "archive",
				Reason:       fmt.Sprintf("长期不活跃: %s", inactiveDuration),
				IdleDuration: inactiveDuration,
			}

			if policy.AutoArchive && !policy.DryRun {
				wt.Status = "archived"
				if _, err := s.db.Worktrees().Update(ctx, wt); err != nil {
					return nil, fmt.Errorf("failed to archive worktree: %w", err)
				}
			}

			return info, nil
		}
	}

	return nil, nil // 无需回收
}

// GetIdleWorktrees 获取空闲的worktrees
func (s *WorkspaceReclaimService) GetIdleWorktrees(ctx context.Context, projectID int, idleThreshold time.Duration) ([]*models.Worktree, error) {
	status := "active"
	worktrees, _, err := s.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		ProjectID: &projectID,
		Status:    &status,
		Limit:     1000,
	})
	if err != nil {
		return nil, err
	}

	now := time.Now()
	idleWorktrees := []*models.Worktree{}

	for _, wt := range worktrees {
		if wt.CurrentAIID == nil {
			continue
		}

		assignment, err := s.db.AIWorkspaceAssignments().GetCurrentAssignmentForWorktree(ctx, wt.ID)
		if err != nil || assignment == nil {
			continue
		}

		idleDuration := now.Sub(assignment.AssignedAt)
		if idleDuration > idleThreshold {
			idleWorktrees = append(idleWorktrees, wt)
		}
	}

	return idleWorktrees, nil
}

// GetArchivableWorktrees 获取可归档的worktrees
func (s *WorkspaceReclaimService) GetArchivableWorktrees(ctx context.Context, projectID int) ([]*models.Worktree, error) {
	now := time.Now()
	archivable := []*models.Worktree{}

	// 获取已完成的worktrees
	completedStatus := "completed"
	completedWorktrees, _, err := s.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		ProjectID: &projectID,
		Status:    &completedStatus,
		Limit:     1000,
	})
	if err != nil {
		return nil, err
	}

	for _, wt := range completedWorktrees {
		if now.Sub(wt.UpdatedAt) > DefaultReclaimPolicy.CompletedArchiveDelay {
			archivable = append(archivable, wt)
		}
	}

	// 获取失败的worktrees
	failedStatus := "failed"
	failedWorktrees, _, err := s.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		ProjectID: &projectID,
		Status:    &failedStatus,
		Limit:     1000,
	})
	if err != nil {
		return nil, err
	}

	for _, wt := range failedWorktrees {
		if now.Sub(wt.UpdatedAt) > DefaultReclaimPolicy.FailedArchiveDelay {
			archivable = append(archivable, wt)
		}
	}

	return archivable, nil
}

// ForceReleaseWorktree 强制释放worktree
func (s *WorkspaceReclaimService) ForceReleaseWorktree(ctx context.Context, worktreeID int) error {
	wt, err := s.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	if wt.CurrentAIID == nil {
		return fmt.Errorf("worktree %d is not assigned to any AI", worktreeID)
	}

	return s.coordinator.ReleaseWorkspace(ctx, worktreeID, *wt.CurrentAIID)
}

// CleanupArchivedWorktrees 清理已归档的worktrees（物理删除）
// 注意：这是危险操作，会永久删除数据
func (s *WorkspaceReclaimService) CleanupArchivedWorktrees(ctx context.Context, projectID int, olderThan time.Duration) (int, error) {
	// 获取已归档的worktrees
	archivedStatus := "archived"
	archivedWorktrees, _, err := s.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		ProjectID: &projectID,
		Status:    &archivedStatus,
		Limit:     1000,
	})
	if err != nil {
		return 0, err
	}

	now := time.Now()
	deletedCount := 0

	for _, wt := range archivedWorktrees {
		// 检查是否超过保留期限
		if now.Sub(wt.UpdatedAt) > olderThan {
			// 删除worktree（包括Git worktree和数据库记录）
			if err := s.worktreeService.DeleteWorktree(ctx, wt.ID); err != nil {
				// 记录错误但继续处理
				continue
			}
			deletedCount++
		}
	}

	return deletedCount, nil
}

// WorkspaceHealthReport 工作空间健康报告
type WorkspaceHealthReport struct {
	ProjectID          int       `json:"project_id"`
	Timestamp          time.Time `json:"timestamp"`
	TotalWorktrees     int       `json:"total_worktrees"`
	ActiveWorktrees    int       `json:"active_worktrees"`
	IdleWorktrees      int       `json:"idle_worktrees"`
	ArchivableWorktrees int      `json:"archivable_worktrees"`
	HealthScore        float64   `json:"health_score"` // 0.0-1.0
	Recommendations    []string  `json:"recommendations"`
}

// GenerateHealthReport 生成工作空间健康报告
func (s *WorkspaceReclaimService) GenerateHealthReport(ctx context.Context, projectID int) (*WorkspaceHealthReport, error) {
	report := &WorkspaceHealthReport{
		ProjectID:       projectID,
		Timestamp:       time.Now(),
		Recommendations: []string{},
	}

	// 1. 获取所有worktrees统计
	stats, err := s.worktreeService.GetWorktreeStats(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	report.TotalWorktrees = stats.Total
	report.ActiveWorktrees = stats.Active

	// 2. 获取空闲worktrees
	idleWorktrees, err := s.GetIdleWorktrees(ctx, projectID, DefaultReclaimPolicy.IdleThreshold)
	if err != nil {
		return nil, fmt.Errorf("failed to get idle worktrees: %w", err)
	}
	report.IdleWorktrees = len(idleWorktrees)

	// 3. 获取可归档worktrees
	archivableWorktrees, err := s.GetArchivableWorktrees(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get archivable worktrees: %w", err)
	}
	report.ArchivableWorktrees = len(archivableWorktrees)

	// 4. 计算健康评分
	// 评分标准：
	// - 空闲率低：好
	// - 可归档率低：好
	// - 活跃率高：好
	if report.TotalWorktrees > 0 {
		idleRate := float64(report.IdleWorktrees) / float64(report.TotalWorktrees)
		archivableRate := float64(report.ArchivableWorktrees) / float64(report.TotalWorktrees)
		activeRate := float64(report.ActiveWorktrees) / float64(report.TotalWorktrees)

		// 综合评分
		report.HealthScore = (1.0 - idleRate*0.4) - (archivableRate * 0.3) + (activeRate * 0.3)
		if report.HealthScore < 0 {
			report.HealthScore = 0
		}
		if report.HealthScore > 1.0 {
			report.HealthScore = 1.0
		}

		// 5. 生成建议
		if idleRate > 0.3 {
			report.Recommendations = append(report.Recommendations,
				fmt.Sprintf("空闲工作空间过多 (%.1f%%)，建议释放资源", idleRate*100))
		}

		if archivableRate > 0.2 {
			report.Recommendations = append(report.Recommendations,
				fmt.Sprintf("有 %d 个工作空间可以归档", report.ArchivableWorktrees))
		}

		if report.TotalWorktrees > 50 {
			report.Recommendations = append(report.Recommendations,
				"工作空间数量较多，建议定期清理")
		}

		if activeRate < 0.3 && report.TotalWorktrees > 10 {
			report.Recommendations = append(report.Recommendations,
				"活跃工作空间比例较低，考虑优化资源分配")
		}
	}

	return report, nil
}

// ScheduledCleanup 定时清理任务（建议配合cron使用）
func (s *WorkspaceReclaimService) ScheduledCleanup(ctx context.Context, projectID int) (*ReclaimResult, error) {
	// 使用默认策略执行定时清理
	return s.ScanAndReclaim(ctx, projectID, DefaultReclaimPolicy)
}

// DryRunReclaim 模拟回收（不实际执行）
func (s *WorkspaceReclaimService) DryRunReclaim(ctx context.Context, projectID int, policy *ReclaimPolicy) (*ReclaimResult, error) {
	if policy == nil {
		policy = DefaultReclaimPolicy
	}

	// 强制设置为dry run模式
	dryRunPolicy := *policy
	dryRunPolicy.DryRun = true

	return s.ScanAndReclaim(ctx, projectID, &dryRunPolicy)
}
