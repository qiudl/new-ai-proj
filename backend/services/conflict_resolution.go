package services

import (
	"ai-project-backend/database"
	"context"
	"fmt"
	"time"
)

// ConflictResolutionService 冲突解决服务
// 为检测到的冲突生成解决方案和行动计划
type ConflictResolutionService struct {
	db                database.DB
	detectionEngine   *ConflictDetectionEngine
	worktreeService   *WorktreeService
	bindingCoordinator *TaskBindingCoordinator
}

// NewConflictResolutionService 创建冲突解决服务
func NewConflictResolutionService(
	db database.DB,
	detectionEngine *ConflictDetectionEngine,
	worktreeService *WorktreeService,
	bindingCoordinator *TaskBindingCoordinator,
) *ConflictResolutionService {
	return &ConflictResolutionService{
		db:                db,
		detectionEngine:   detectionEngine,
		worktreeService:   worktreeService,
		bindingCoordinator: bindingCoordinator,
	}
}

// ResolutionStrategy 解决策略
type ResolutionStrategy string

const (
	StrategyIsolate      ResolutionStrategy = "isolate"       // 隔离到不同worktree
	StrategyReorder      ResolutionStrategy = "reorder"       // 调整执行顺序
	StrategyMerge        ResolutionStrategy = "merge"         // 合并到同一worktree
	StrategyPostpone     ResolutionStrategy = "postpone"      // 推迟某个任务
	StrategyManualReview ResolutionStrategy = "manual_review" // 需要人工审查
)

// ResolutionPlan 解决方案
type ResolutionPlan struct {
	ConflictID    string             `json:"conflict_id"`
	Strategy      ResolutionStrategy `json:"strategy"`
	Priority      int                `json:"priority"`        // 1-10
	Confidence    float64            `json:"confidence"`      // 0.0-1.0
	Description   string             `json:"description"`
	Actions       []*ResolutionAction `json:"actions"`
	EstimatedTime string             `json:"estimated_time"`  // e.g., "30m", "2h"
	Impact        string             `json:"impact"`          // 影响评估
	Risks         []string           `json:"risks,omitempty"`
}

// ResolutionAction 解决行动
type ResolutionAction struct {
	Step        int    `json:"step"`
	Action      string `json:"action"`
	Description string `json:"description"`
	Command     string `json:"command,omitempty"` // 可选的命令
	Automated   bool   `json:"automated"`         // 是否可自动执行
}

// ResolutionRequest 解决请求
type ResolutionRequest struct {
	WorktreeID      int               `json:"worktree_id"`
	ConflictID      string            `json:"conflict_id,omitempty"`     // 特定冲突ID
	PreferredStrategy ResolutionStrategy `json:"preferred_strategy,omitempty"`
	AutoApply       bool              `json:"auto_apply"`                 // 是否自动应用
}

// ResolutionResult 解决结果
type ResolutionResult struct {
	Success     bool               `json:"success"`
	Applied     bool               `json:"applied"`      // 是否已应用
	Plans       []*ResolutionPlan  `json:"plans"`
	Message     string             `json:"message"`
	Timestamp   time.Time          `json:"timestamp"`
}

// GenerateResolutionPlans 生成解决方案
func (s *ConflictResolutionService) GenerateResolutionPlans(
	ctx context.Context,
	req *ResolutionRequest,
) (*ResolutionResult, error) {
	// 1. 检测冲突
	conflicts, err := s.detectionEngine.DetectConflicts(ctx, &DetectConflictsRequest{
		WorktreeID: req.WorktreeID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to detect conflicts: %w", err)
	}

	result := &ResolutionResult{
		Success:   true,
		Applied:   false,
		Plans:     []*ResolutionPlan{},
		Timestamp: time.Now(),
	}

	if !conflicts.HasConflict {
		result.Message = "无冲突需要解决"
		return result, nil
	}

	// 2. 为每个冲突生成解决方案
	for i, conflict := range conflicts.Conflicts {
		plans := s.generatePlansForConflict(ctx, conflict, req)
		// 为每个plan设置唯一ID
		for _, plan := range plans {
			plan.ConflictID = fmt.Sprintf("%d-%d", req.WorktreeID, i)
		}
		result.Plans = append(result.Plans, plans...)
	}

	// 3. 按优先级排序
	s.sortPlansByPriority(result.Plans)

	// 4. 如果请求自动应用，尝试应用
	if req.AutoApply && len(result.Plans) > 0 {
		applied, err := s.applyResolutionPlan(ctx, result.Plans[0])
		if err == nil && applied {
			result.Applied = true
			result.Message = "已自动应用最佳解决方案"
		}
	}

	result.Message = fmt.Sprintf("生成了 %d 个解决方案", len(result.Plans))
	return result, nil
}

// generatePlansForConflict 为单个冲突生成解决方案
func (s *ConflictResolutionService) generatePlansForConflict(
	ctx context.Context,
	conflict *ConflictInfo,
	req *ResolutionRequest,
) []*ResolutionPlan {
	plans := []*ResolutionPlan{}

	switch conflict.Type {
	case ConflictTypeFile:
		plans = append(plans, s.generateFileConflictPlans(ctx, conflict)...)
	case ConflictTypeDependency:
		plans = append(plans, s.generateDependencyConflictPlans(ctx, conflict)...)
	case ConflictTypeMerge:
		plans = append(plans, s.generateMergeConflictPlans(ctx, conflict)...)
	}

	return plans
}

// generateFileConflictPlans 生成文件冲突解决方案
func (s *ConflictResolutionService) generateFileConflictPlans(
	ctx context.Context,
	conflict *ConflictInfo,
) []*ResolutionPlan {
	plans := []*ResolutionPlan{}

	// 方案1: 隔离策略
	plans = append(plans, &ResolutionPlan{
		Strategy:    StrategyIsolate,
		Priority:    8,
		Confidence:  0.9,
		Description: "将冲突任务隔离到不同的worktree，避免文件冲突",
		Actions: []*ResolutionAction{
			{
				Step:        1,
				Action:      "create_worktree",
				Description: "为任务创建新的独立worktree",
				Automated:   true,
			},
			{
				Step:        2,
				Action:      "move_task",
				Description: fmt.Sprintf("将任务 #%d 移动到新worktree", conflict.TaskID2),
				Automated:   true,
			},
			{
				Step:        3,
				Action:      "verify",
				Description: "验证冲突已解决",
				Automated:   true,
			},
		},
		EstimatedTime: "5m",
		Impact:        "最小化文件冲突，但会增加worktree数量",
		Risks:         []string{"可能需要额外的磁盘空间"},
	})

	// 方案2: 调整顺序策略
	if conflict.Level != ConflictLevelCritical {
		plans = append(plans, &ResolutionPlan{
			Strategy:    StrategyReorder,
			Priority:    6,
			Confidence:  0.7,
			Description: "调整任务执行顺序，先后处理以避免冲突",
			Actions: []*ResolutionAction{
				{
					Step:        1,
					Action:      "postpone_task",
					Description: fmt.Sprintf("推迟任务 #%d 的执行", conflict.TaskID2),
					Automated:   false,
				},
				{
					Step:        2,
					Action:      "wait_completion",
					Description: fmt.Sprintf("等待任务 #%d 完成", conflict.TaskID1),
					Automated:   false,
				},
				{
					Step:        3,
					Action:      "resume_task",
					Description: fmt.Sprintf("恢复任务 #%d 的执行", conflict.TaskID2),
					Automated:   false,
				},
			},
			EstimatedTime: "depends on task completion",
			Impact:        "避免冲突，但会延长总开发时间",
			Risks:         []string{"可能影响项目进度"},
		})
	}

	// 方案3: 人工审查
	if conflict.Level == ConflictLevelCritical {
		plans = append(plans, &ResolutionPlan{
			Strategy:    StrategyManualReview,
			Priority:    10,
			Confidence:  1.0,
			Description: "严重冲突，需要人工审查和决策",
			Actions: []*ResolutionAction{
				{
					Step:        1,
					Action:      "notify_team",
					Description: "通知团队成员关于严重冲突",
					Automated:   true,
				},
				{
					Step:        2,
					Action:      "review_code",
					Description: "审查冲突的代码更改",
					Automated:   false,
				},
				{
					Step:        3,
					Action:      "coordinate",
					Description: "协调开发人员解决冲突",
					Automated:   false,
				},
			},
			EstimatedTime: "1-2h",
			Impact:        "确保冲突得到正确解决",
			Risks:         []string{},
		})
	}

	return plans
}

// generateDependencyConflictPlans 生成依赖冲突解决方案
func (s *ConflictResolutionService) generateDependencyConflictPlans(
	ctx context.Context,
	conflict *ConflictInfo,
) []*ResolutionPlan {
	plans := []*ResolutionPlan{}

	// 方案1: 调整执行顺序
	plans = append(plans, &ResolutionPlan{
		Strategy:    StrategyReorder,
		Priority:    9,
		Confidence:  0.95,
		Description: "按依赖关系调整任务执行顺序",
		Actions: []*ResolutionAction{
			{
				Step:        1,
				Action:      "identify_dependencies",
				Description: "识别任务依赖链",
				Automated:   true,
			},
			{
				Step:        2,
				Action:      "reorder_tasks",
				Description: "自动调整任务优先级和顺序",
				Automated:   true,
			},
			{
				Step:        3,
				Action:      "update_bindings",
				Description: "更新worktree任务绑定",
				Automated:   true,
			},
		},
		EstimatedTime: "2m",
		Impact:        "确保依赖任务按正确顺序执行",
		Risks:         []string{},
	})

	// 方案2: 合并到同一worktree
	plans = append(plans, &ResolutionPlan{
		Strategy:    StrategyMerge,
		Priority:    7,
		Confidence:  0.8,
		Description: "将有依赖关系的任务合并到同一worktree",
		Actions: []*ResolutionAction{
			{
				Step:        1,
				Action:      "bind_tasks",
				Description: fmt.Sprintf("将任务 #%d 和 #%d 绑定到同一worktree", conflict.TaskID1, conflict.TaskID2),
				Automated:   true,
			},
			{
				Step:        2,
				Action:      "verify_no_conflict",
				Description: "验证合并后无其他冲突",
				Automated:   true,
			},
		},
		EstimatedTime: "3m",
		Impact:        "简化依赖管理，但增加worktree复杂度",
		Risks:         []string{"可能引入文件冲突"},
	})

	return plans
}

// generateMergeConflictPlans 生成合并冲突解决方案
func (s *ConflictResolutionService) generateMergeConflictPlans(
	ctx context.Context,
	conflict *ConflictInfo,
) []*ResolutionPlan {
	plans := []*ResolutionPlan{}

	// 合并冲突通常需要人工处理
	plans = append(plans, &ResolutionPlan{
		Strategy:    StrategyManualReview,
		Priority:    10,
		Confidence:  1.0,
		Description: "合并冲突需要人工解决",
		Actions: []*ResolutionAction{
			{
				Step:        1,
				Action:      "pull_changes",
				Description: "拉取最新代码",
				Command:     "git pull origin main",
				Automated:   false,
			},
			{
				Step:        2,
				Action:      "resolve_conflicts",
				Description: fmt.Sprintf("手动解决文件 %s 的冲突", conflict.FilePath),
				Automated:   false,
			},
			{
				Step:        3,
				Action:      "test_changes",
				Description: "测试合并后的代码",
				Automated:   false,
			},
			{
				Step:        4,
				Action:      "commit",
				Description: "提交解决后的代码",
				Command:     "git add . && git commit -m 'Resolve merge conflicts'",
				Automated:   false,
			},
		},
		EstimatedTime: "30m-1h",
		Impact:        "解决代码合并冲突",
		Risks:         []string{"可能破坏功能", "需要充分测试"},
	})

	return plans
}

// sortPlansByPriority 按优先级排序解决方案
func (s *ConflictResolutionService) sortPlansByPriority(plans []*ResolutionPlan) {
	// 使用冒泡排序（简化实现）
	for i := 0; i < len(plans)-1; i++ {
		for j := 0; j < len(plans)-i-1; j++ {
			if plans[j].Priority < plans[j+1].Priority {
				plans[j], plans[j+1] = plans[j+1], plans[j]
			}
		}
	}
}

// applyResolutionPlan 应用解决方案
func (s *ConflictResolutionService) applyResolutionPlan(
	ctx context.Context,
	plan *ResolutionPlan,
) (bool, error) {
	// 只自动应用置信度高且所有行动都可自动化的方案
	if plan.Confidence < 0.8 {
		return false, fmt.Errorf("confidence too low for auto-apply")
	}

	for _, action := range plan.Actions {
		if !action.Automated {
			return false, fmt.Errorf("plan contains manual actions")
		}
	}

	// TODO: 实现自动应用逻辑
	// 这里需要根据不同的strategy执行相应的操作

	return false, fmt.Errorf("auto-apply not yet implemented")
}

// GetResolutionHistory 获取解决历史
func (s *ConflictResolutionService) GetResolutionHistory(
	ctx context.Context,
	worktreeID int,
) ([]*ResolutionResult, error) {
	// TODO: 从数据库查询历史记录
	return []*ResolutionResult{}, nil
}
