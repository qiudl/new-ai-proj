package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

// AIWorkspaceCoordinator 智能AI工作空间协调器
// 负责分析任务、依赖关系、文件冲突，为AI用户分配最优工作空间
type AIWorkspaceCoordinator struct {
	db              database.DB
	worktreeService *WorktreeService
	allocationCache map[int]*AllocationDecision // taskID -> decision cache
	conflictEngine  *ConflictDetectionEngine    // 冲突检测引擎(可选)
}

// NewAIWorkspaceCoordinator 创建AI工作空间协调器
func NewAIWorkspaceCoordinator(db database.DB, worktreeService *WorktreeService) *AIWorkspaceCoordinator {
	return &AIWorkspaceCoordinator{
		db:              db,
		worktreeService: worktreeService,
		allocationCache: make(map[int]*AllocationDecision),
		conflictEngine:  nil, // 可选注入
	}
}

// SetConflictEngine 设置冲突检测引擎
func (c *AIWorkspaceCoordinator) SetConflictEngine(engine *ConflictDetectionEngine) {
	c.conflictEngine = engine
}

// AllocationDecision 工作空间分配决策
type AllocationDecision struct {
	TaskID        int                   `json:"task_id"`
	AIUserID      int                   `json:"ai_user_id"`
	WorktreeID    int                   `json:"worktree_id"`
	Strategy      string                `json:"strategy"`       // 使用的策略：reuse/create/isolate
	Confidence    float64               `json:"confidence"`     // 决策置信度 0.0-1.0
	Reasoning     []string              `json:"reasoning"`      // 决策理由
	ConflictScore float64               `json:"conflict_score"` // 冲突评分 0.0-1.0，越低越好
	Timestamp     time.Time             `json:"timestamp"`
	Alternatives  []*AllocationOption   `json:"alternatives,omitempty"` // 备选方案
}

// AllocationOption 分配选项
type AllocationOption struct {
	WorktreeID    int      `json:"worktree_id"`
	Score         float64  `json:"score"`     // 综合评分 0.0-1.0
	ConflictScore float64  `json:"conflict_score"`
	Pros          []string `json:"pros"`
	Cons          []string `json:"cons"`
}

// AllocationRequest 工作空间分配请求
type AllocationRequest struct {
	TaskID       int      `json:"task_id" validate:"required"`
	AIUserID     int      `json:"ai_user_id" validate:"required"`
	ExpertID     string   `json:"expert_id"`              // AI专家ID（如backend/frontend）
	PreferReuse  bool     `json:"prefer_reuse"`           // 偏好复用现有worktree
	IsolateLevel string   `json:"isolate_level"`          // 隔离级别：none/low/medium/high
	Context      *WorkspaceTaskContext `json:"context,omitempty"` // 任务上下文
}

// WorkspaceTaskContext 任务上下文信息（用于工作空间分配）
type WorkspaceTaskContext struct {
	RelatedTasks   []int    `json:"related_tasks"`   // 相关任务
	FilePatterns   []string `json:"file_patterns"`   // 涉及的文件模式
	RequiredSkills []string `json:"required_skills"` // 需要的技能
	Priority       string   `json:"priority"`        // 优先级
}

// AllocateWorkspace 为任务分配最优工作空间
// 核心智能分配算法，综合考虑多个因素做出决策
func (c *AIWorkspaceCoordinator) AllocateWorkspace(ctx context.Context, req *AllocationRequest) (*AllocationDecision, error) {
	// 1. 获取任务信息
	task, err := c.db.Tasks().GetByID(ctx, req.TaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	// 2. 分析任务依赖和相关性
	taskAnalysis, err := c.analyzeTask(ctx, task, req.Context)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze task: %w", err)
	}

	// 3. 获取项目的所有可用worktrees
	status := "active" // Note: Status is *string not []string in ListWorktreesOptions
	worktrees, _, err := c.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		ProjectID: &task.ProjectID,
		Status:    &status,
		Limit:     100,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}

	// 4. 评估每个worktree的适配度
	options := c.evaluateWorktrees(ctx, worktrees, task, taskAnalysis, req)

	// 5. 选择最优方案
	decision := c.selectBestOption(ctx, options, task, req)

	// 6. 缓存决策
	c.allocationCache[req.TaskID] = decision

	return decision, nil
}

// taskAnalysisResult 任务分析结果
type taskAnalysisResult struct {
	Dependencies     []int              `json:"dependencies"`      // 依赖的任务ID
	RelatedTasks     []int              `json:"related_tasks"`     // 相关任务ID
	FilePatterns     []string           `json:"file_patterns"`     // 涉及的文件模式
	ConflictingTasks map[int]float64    `json:"conflicting_tasks"` // 冲突任务及冲突程度
	Complexity       float64            `json:"complexity"`        // 任务复杂度 0.0-1.0
}

// analyzeTask 分析任务的依赖关系和文件冲突
func (c *AIWorkspaceCoordinator) analyzeTask(ctx context.Context, task *models.Task, taskCtx *WorkspaceTaskContext) (*taskAnalysisResult, error) {
	result := &taskAnalysisResult{
		Dependencies:     []int{},
		RelatedTasks:     []int{},
		FilePatterns:     []string{},
		ConflictingTasks: make(map[int]float64),
		Complexity:       0.5, // 默认中等复杂度
	}

	// 从上下文获取文件模式
	if taskCtx != nil && len(taskCtx.FilePatterns) > 0 {
		result.FilePatterns = taskCtx.FilePatterns
	}

	// 从任务描述推断文件模式
	inferredPatterns := c.inferFilePatterns(task)
	result.FilePatterns = append(result.FilePatterns, inferredPatterns...)

	// 查找依赖任务（通过parent_id或task关系表）
	if task.ParentID != nil && *task.ParentID > 0 {
		result.Dependencies = append(result.Dependencies, *task.ParentID)
	}

	// 查找同级任务（siblings）
	if task.ParentID != nil {
		siblings, err := c.db.Tasks().GetChildren(ctx, *task.ParentID)
		if err == nil {
			for _, sibling := range siblings {
				if sibling.ID != task.ID {
					result.RelatedTasks = append(result.RelatedTasks, sibling.ID)
				}
			}
		}
	}

	// 分析文件冲突：检查哪些任务正在修改相同的文件模式
	if len(result.FilePatterns) > 0 {
		// 获取所有进行中的任务
		activeTasks, _, err := c.db.Tasks().GetByStatus(ctx, "in_progress", 1000, 0)
		if err == nil {
			for _, activeTask := range activeTasks {
				if activeTask.ID != task.ID && activeTask.ProjectID == task.ProjectID {
					// 检查文件模式是否冲突
					conflictScore := c.calculateFileConflict(result.FilePatterns, c.inferFilePatterns(activeTask))
					if conflictScore > 0 {
						result.ConflictingTasks[activeTask.ID] = conflictScore
					}
				}
			}
		}
	}

	// 评估任务复杂度
	result.Complexity = c.estimateComplexity(task)

	return result, nil
}

// inferFilePatterns 从任务标题和描述推断涉及的文件模式
func (c *AIWorkspaceCoordinator) inferFilePatterns(task *models.Task) []string {
	patterns := []string{}

	desc := ""
	if task.Description != nil {
		desc = *task.Description
	}
	text := strings.ToLower(task.Title + " " + desc)

	// 后端相关
	if strings.Contains(text, "backend") || strings.Contains(text, "api") || strings.Contains(text, "handler") || strings.Contains(text, "service") {
		patterns = append(patterns, "backend/**/*.go", "backend/handlers/**", "backend/services/**")
	}

	// 前端相关
	if strings.Contains(text, "frontend") || strings.Contains(text, "ui") || strings.Contains(text, "页面") || strings.Contains(text, "组件") {
		patterns = append(patterns, "frontend/src/**/*.tsx", "frontend/src/**/*.ts", "frontend/src/pages/**", "frontend/src/components/**")
	}

	// 数据库相关
	if strings.Contains(text, "database") || strings.Contains(text, "数据库") || strings.Contains(text, "migration") || strings.Contains(text, "表") {
		patterns = append(patterns, "backend/database/**/*.go", "backend/migrations/**/*.sql")
	}

	// 模型相关
	if strings.Contains(text, "model") || strings.Contains(text, "模型") || strings.Contains(text, "struct") {
		patterns = append(patterns, "backend/models/**/*.go")
	}

	// Android相关
	if strings.Contains(text, "android") || strings.Contains(text, "mobile") || strings.Contains(text, "kotlin") {
		patterns = append(patterns, "android-app/**/*.kt", "android-app/**/*.xml")
	}

	// 配置文件
	if strings.Contains(text, "config") || strings.Contains(text, "配置") {
		patterns = append(patterns, "**/*.yaml", "**/*.json", "**/.env")
	}

	return patterns
}

// calculateFileConflict 计算两组文件模式的冲突程度
// 返回值：0.0 表示无冲突，1.0 表示完全冲突
func (c *AIWorkspaceCoordinator) calculateFileConflict(patterns1, patterns2 []string) float64 {
	if len(patterns1) == 0 || len(patterns2) == 0 {
		return 0.0
	}

	conflicts := 0
	totalComparisons := 0

	for _, p1 := range patterns1 {
		for _, p2 := range patterns2 {
			totalComparisons++
			if c.patternsOverlap(p1, p2) {
				conflicts++
			}
		}
	}

	if totalComparisons == 0 {
		return 0.0
	}

	return float64(conflicts) / float64(totalComparisons)
}

// patternsOverlap 判断两个文件模式是否重叠
func (c *AIWorkspaceCoordinator) patternsOverlap(p1, p2 string) bool {
	// 简化实现：检查路径前缀是否匹配
	p1 = strings.TrimSuffix(p1, "**/*")
	p2 = strings.TrimSuffix(p2, "**/*")
	p1 = strings.TrimSuffix(p1, "*")
	p2 = strings.TrimSuffix(p2, "*")

	return strings.HasPrefix(p1, p2) || strings.HasPrefix(p2, p1) || p1 == p2
}

// estimateComplexity 估算任务复杂度
func (c *AIWorkspaceCoordinator) estimateComplexity(task *models.Task) float64 {
	complexity := 0.3 // 基础复杂度

	// 根据描述长度
	descLen := 0
	if task.Description != nil {
		descLen = len(*task.Description)
	}
	if descLen > 500 {
		complexity += 0.2
	} else if descLen > 200 {
		complexity += 0.1
	}

	// 根据子任务数量
	if task.ChildrenCount > 5 {
		complexity += 0.3
	} else if task.ChildrenCount > 2 {
		complexity += 0.2
	}

	// 根据关键词
	desc := ""
	if task.Description != nil {
		desc = *task.Description
	}
	text := strings.ToLower(task.Title + " " + desc)
	if strings.Contains(text, "重构") || strings.Contains(text, "refactor") {
		complexity += 0.2
	}
	if strings.Contains(text, "优化") || strings.Contains(text, "optimize") {
		complexity += 0.1
	}
	if strings.Contains(text, "架构") || strings.Contains(text, "architecture") {
		complexity += 0.3
	}

	// 限制在 0.0-1.0 范围内
	if complexity > 1.0 {
		complexity = 1.0
	}

	return complexity
}

// evaluateWorktrees 评估每个worktree对于给定任务的适配度
func (c *AIWorkspaceCoordinator) evaluateWorktrees(
	ctx context.Context,
	worktrees []*models.Worktree,
	task *models.Task,
	analysis *taskAnalysisResult,
	req *AllocationRequest,
) []*AllocationOption {
	options := make([]*AllocationOption, 0, len(worktrees))

	for _, wt := range worktrees {
		option := &AllocationOption{
			WorktreeID:    wt.ID,
			Pros:          []string{},
			Cons:          []string{},
		}

		// 1. 检查专家匹配度
		expertMatch := 0.0
		if req.ExpertID != "" && wt.ExpertID == req.ExpertID {
			expertMatch = 1.0
			option.Pros = append(option.Pros, "专家ID匹配")
		}

		// 2. 检查是否已有相关任务
		bindings, _ := c.db.WorktreeTaskBindings().GetByWorktreeID(ctx, wt.ID)
		relatedTaskCount := 0
		conflictingTaskCount := 0

		for _, binding := range bindings {
			// 检查是否是相关任务
			for _, relatedID := range analysis.RelatedTasks {
				if binding.TaskID == relatedID {
					relatedTaskCount++
					break
				}
			}
			// 检查是否是冲突任务
			if _, isConflicting := analysis.ConflictingTasks[binding.TaskID]; isConflicting {
				conflictingTaskCount++
			}
		}

		// 3. 计算文件冲突评分
		conflictScore := 0.0
		if conflictingTaskCount > 0 {
			conflictScore = float64(conflictingTaskCount) / float64(len(bindings)+1)
			option.Cons = append(option.Cons, fmt.Sprintf("有 %d 个冲突任务", conflictingTaskCount))
		}
		option.ConflictScore = conflictScore

		// 4. 检查worktree状态
		statusScore := 0.0
		switch wt.Status {
		case "active":
			if wt.CurrentAIID == nil {
				statusScore = 1.0
				option.Pros = append(option.Pros, "活跃且未分配")
			} else if *wt.CurrentAIID == req.AIUserID {
				statusScore = 0.9
				option.Pros = append(option.Pros, "已分配给当前AI")
			} else {
				statusScore = 0.3
				option.Cons = append(option.Cons, "已分配给其他AI")
			}
		case "ready":
			statusScore = 0.8
			option.Pros = append(option.Pros, "就绪状态")
		default:
			statusScore = 0.0
			option.Cons = append(option.Cons, fmt.Sprintf("不可用状态: %s", wt.Status))
		}

		// 5. 相关任务加分
		relatedScore := 0.0
		if relatedTaskCount > 0 {
			relatedScore = float64(relatedTaskCount) / float64(len(analysis.RelatedTasks)+1)
			option.Pros = append(option.Pros, fmt.Sprintf("有 %d 个相关任务", relatedTaskCount))
		}

		// 5.5. 使用冲突检测引擎进行深度冲突分析（如果可用）- Phase 4集成
		if c.conflictEngine != nil {
			conflictResult, err := c.conflictEngine.DetectConflicts(ctx, &DetectConflictsRequest{
				WorktreeID: wt.ID,
				TaskID:     task.ID,
			})
			if err == nil && conflictResult.HasConflict {
				// 根据冲突数量和级别调整冲突评分
				engineConflictScore := float64(conflictResult.TotalCount) / 10.0
				if engineConflictScore > 1.0 {
					engineConflictScore = 1.0
				}

				// 如果引擎检测到的冲突更严重，则使用引擎的评分
				if engineConflictScore > conflictScore {
					conflictScore = engineConflictScore
					option.ConflictScore = conflictScore
				}

				option.Cons = append(option.Cons,
					fmt.Sprintf("冲突引擎检测到 %d 个冲突 (级别: %s)",
						conflictResult.TotalCount, conflictResult.Level))

				// 添加引擎建议
				if len(conflictResult.Suggestions) > 0 {
					option.Cons = append(option.Cons, conflictResult.Suggestions...)
				}
			}
		}

		// 6. 计算综合评分
		// 权重：专家匹配(30%) + 状态(25%) + 相关任务(20%) + 无冲突(25%)
		option.Score = expertMatch*0.3 + statusScore*0.25 + relatedScore*0.2 + (1.0-conflictScore)*0.25

		options = append(options, option)
	}

	// 按评分排序
	sort.Slice(options, func(i, j int) bool {
		return options[i].Score > options[j].Score
	})

	return options
}

// selectBestOption 选择最佳分配方案
func (c *AIWorkspaceCoordinator) selectBestOption(
	ctx context.Context,
	options []*AllocationOption,
	task *models.Task,
	req *AllocationRequest,
) *AllocationDecision {
	decision := &AllocationDecision{
		TaskID:     req.TaskID,
		AIUserID:   req.AIUserID,
		Timestamp:  time.Now(),
		Reasoning:  []string{},
		Alternatives: options,
	}

	// 如果有可用的worktree选项
	if len(options) > 0 && options[0].Score > 0.4 { // 阈值：0.4
		best := options[0]
		decision.WorktreeID = best.WorktreeID
		decision.Strategy = "reuse"
		decision.Confidence = best.Score
		decision.ConflictScore = best.ConflictScore
		decision.Reasoning = append(decision.Reasoning,
			fmt.Sprintf("复用现有worktree (评分: %.2f)", best.Score))
		decision.Reasoning = append(decision.Reasoning, best.Pros...)

		if len(best.Cons) > 0 {
			decision.Reasoning = append(decision.Reasoning, "注意事项:")
			decision.Reasoning = append(decision.Reasoning, best.Cons...)
		}
	} else {
		// 需要创建新worktree
		decision.WorktreeID = 0
		decision.Strategy = "create"
		decision.Confidence = 0.8
		decision.ConflictScore = 0.0
		decision.Reasoning = append(decision.Reasoning, "建议创建新worktree")

		if len(options) == 0 {
			decision.Reasoning = append(decision.Reasoning, "原因: 没有可用的worktree")
		} else {
			decision.Reasoning = append(decision.Reasoning,
				fmt.Sprintf("原因: 现有worktree评分过低 (最高: %.2f)", options[0].Score))
		}
	}

	return decision
}

// ReleaseWorkspace 释放AI工作空间
func (c *AIWorkspaceCoordinator) ReleaseWorkspace(ctx context.Context, worktreeID int, aiUserID int) error {
	// 1. 检查worktree状态
	worktree, err := c.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	// 2. 验证AI用户权限
	if worktree.CurrentAIID == nil || *worktree.CurrentAIID != aiUserID {
		return fmt.Errorf("AI user %d is not assigned to worktree %d", aiUserID, worktreeID)
	}

	// 3. 释放工作空间分配
	assignment, err := c.db.AIWorkspaceAssignments().GetCurrentAssignmentForWorktree(ctx, worktreeID)
	if err == nil && assignment != nil {
		if err := c.db.AIWorkspaceAssignments().EndAssignment(ctx, assignment.ID); err != nil {
			return fmt.Errorf("failed to end assignment: %w", err)
		}
	}

	// 4. 更新worktree状态
	worktree.CurrentAIID = nil
	worktree.Status = "ready"
	if _, err := c.db.Worktrees().Update(ctx, worktree); err != nil {
		return fmt.Errorf("failed to update worktree: %w", err)
	}

	// 5. 清除分配缓存
	delete(c.allocationCache, worktreeID)

	return nil
}

// GetAllocationHistory 获取任务的分配历史
func (c *AIWorkspaceCoordinator) GetAllocationHistory(ctx context.Context, taskID int) ([]*AllocationDecision, error) {
	// 从workspace assignments表查询历史
	// 这里简化实现，实际应该查询历史记录
	if cached, ok := c.allocationCache[taskID]; ok {
		return []*AllocationDecision{cached}, nil
	}
	return []*AllocationDecision{}, nil
}

// RecommendWorktrees 推荐适合多个任务的worktree组合
// 用于批量任务分配场景
func (c *AIWorkspaceCoordinator) RecommendWorktrees(ctx context.Context, taskIDs []int, aiUserID int) (map[int]int, error) {
	recommendations := make(map[int]int) // taskID -> worktreeID

	for _, taskID := range taskIDs {
		req := &AllocationRequest{
			TaskID:   taskID,
			AIUserID: aiUserID,
		}

		decision, err := c.AllocateWorkspace(ctx, req)
		if err != nil {
			continue // 跳过失败的任务
		}

		if decision.WorktreeID > 0 {
			recommendations[taskID] = decision.WorktreeID
		}
	}

	return recommendations, nil
}
