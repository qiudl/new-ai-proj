package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"strings"
	"time"
)

// TaskBindingCoordinator 任务-Worktree绑定协调器
// 管理任务与worktree的智能绑定关系，处理依赖、优先级、冲突等复杂场景
type TaskBindingCoordinator struct {
	db              database.DB
	worktreeService *WorktreeService
	coordinator     *AIWorkspaceCoordinator
}

// NewTaskBindingCoordinator 创建任务绑定协调器
func NewTaskBindingCoordinator(
	db database.DB,
	worktreeService *WorktreeService,
	coordinator *AIWorkspaceCoordinator,
) *TaskBindingCoordinator {
	return &TaskBindingCoordinator{
		db:              db,
		worktreeService: worktreeService,
		coordinator:     coordinator,
	}
}

// BindingStrategy 绑定策略
type BindingStrategy struct {
	RelationType     string   `json:"relation_type"`      // primary/secondary/readonly
	Priority         int      `json:"priority"`           // 优先级 1-10
	AutoActivate     bool     `json:"auto_activate"`      // 是否自动激活
	ExclusiveMode    bool     `json:"exclusive_mode"`     // 是否独占模式
	DependencyCheck  bool     `json:"dependency_check"`   // 是否检查依赖
	ConflictTolerance float64 `json:"conflict_tolerance"` // 冲突容忍度 0.0-1.0
}

// DefaultBindingStrategy 默认绑定策略
var DefaultBindingStrategy = &BindingStrategy{
	RelationType:      "primary",
	Priority:          5,
	AutoActivate:      true,
	ExclusiveMode:     false,
	DependencyCheck:   true,
	ConflictTolerance: 0.3,
}

// SmartBindRequest 智能绑定请求
type SmartBindRequest struct {
	TaskID       int              `json:"task_id" validate:"required"`
	WorktreeID   int              `json:"worktree_id" validate:"required"`
	Strategy     *BindingStrategy `json:"strategy,omitempty"`
	ForceBinding bool             `json:"force_binding"` // 强制绑定，忽略冲突检查
}

// SmartBindResult 智能绑定结果
type SmartBindResult struct {
	Success          bool                        `json:"success"`
	Binding          *models.WorktreeTaskBinding `json:"binding,omitempty"`
	Warnings         []string                    `json:"warnings,omitempty"`
	ConflictingTasks []int                       `json:"conflicting_tasks,omitempty"`
	Suggestions      []string                    `json:"suggestions,omitempty"`
}

// BatchBindRequest 批量绑定请求
type BatchBindRequest struct {
	TaskIDs    []int            `json:"task_ids" validate:"required"`
	WorktreeID int              `json:"worktree_id" validate:"required"`
	Strategy   *BindingStrategy `json:"strategy,omitempty"`
}

// BatchBindResult 批量绑定结果
type BatchBindResult struct {
	SuccessCount int                          `json:"success_count"`
	FailureCount int                          `json:"failure_count"`
	Results      map[int]*SmartBindResult     `json:"results"` // taskID -> result
}

// SmartBind 智能绑定任务到worktree
// 会自动分析依赖、冲突，并提供建议
func (c *TaskBindingCoordinator) SmartBind(ctx context.Context, req *SmartBindRequest) (*SmartBindResult, error) {
	result := &SmartBindResult{
		Warnings:         []string{},
		ConflictingTasks: []int{},
		Suggestions:      []string{},
	}

	// 使用默认策略
	strategy := req.Strategy
	if strategy == nil {
		strategy = DefaultBindingStrategy
	}

	// 1. 获取任务信息
	task, err := c.db.Tasks().GetByID(ctx, req.TaskID)
	if err != nil {
		return nil, fmt.Errorf("failed to get task: %w", err)
	}

	// 2. 获取worktree信息
	worktree, err := c.db.Worktrees().GetByID(ctx, req.WorktreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	// 3. 验证worktree状态
	if worktree.Status != "active" && worktree.Status != "ready" {
		return nil, fmt.Errorf("worktree is not active or ready: %s", worktree.Status)
	}

	// 4. 检查是否已存在绑定
	existingBindings, err := c.db.WorktreeTaskBindings().GetByWorktreeID(ctx, req.WorktreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing bindings: %w", err)
	}

	for _, binding := range existingBindings {
		if binding.TaskID == req.TaskID {
			result.Warnings = append(result.Warnings, "任务已绑定到该worktree")
			result.Binding = binding
			result.Success = true
			return result, nil
		}
	}

	// 5. 冲突检查（如果启用）
	if strategy.DependencyCheck && !req.ForceBinding {
		conflicts, warnings := c.checkConflicts(ctx, task, worktree, existingBindings, strategy)
		result.ConflictingTasks = conflicts
		result.Warnings = append(result.Warnings, warnings...)

		// 如果冲突超过容忍度，拒绝绑定
		conflictScore := float64(len(conflicts)) / float64(len(existingBindings)+1)
		if conflictScore > strategy.ConflictTolerance {
			result.Success = false
			result.Suggestions = append(result.Suggestions,
				"建议创建新的worktree或解决冲突任务",
				fmt.Sprintf("冲突评分: %.2f (容忍度: %.2f)", conflictScore, strategy.ConflictTolerance),
			)
			return result, nil
		}
	}

	// 6. 创建绑定
	binding := &models.WorktreeTaskBinding{
		WorktreeID:   req.WorktreeID,
		TaskID:       req.TaskID,
		RelationType: strategy.RelationType,
		Priority:     strategy.Priority,
		IsActive:     strategy.AutoActivate,
		CreatedAt:    time.Now(),
	}

	created, err := c.db.WorktreeTaskBindings().Create(ctx, binding)
	if err != nil {
		return nil, fmt.Errorf("failed to create binding: %w", err)
	}

	result.Success = true
	result.Binding = created

	// 7. 提供优化建议
	suggestions := c.generateSuggestions(ctx, task, worktree, existingBindings, strategy)
	result.Suggestions = append(result.Suggestions, suggestions...)

	return result, nil
}

// checkConflicts 检查任务绑定冲突
func (c *TaskBindingCoordinator) checkConflicts(
	ctx context.Context,
	task *models.Task,
	worktree *models.Worktree,
	existingBindings []*models.WorktreeTaskBinding,
	strategy *BindingStrategy,
) ([]int, []string) {
	conflicts := []int{}
	warnings := []string{}

	// 1. 检查独占模式冲突
	if strategy.ExclusiveMode {
		primaryCount := 0
		for _, binding := range existingBindings {
			if binding.RelationType == "primary" {
				primaryCount++
			}
		}
		if primaryCount > 0 {
			warnings = append(warnings, fmt.Sprintf("独占模式下已有 %d 个主任务", primaryCount))
		}
	}

	// 2. 使用coordinator分析文件冲突
	taskAnalysis, err := c.coordinator.analyzeTask(ctx, task, nil)
	if err == nil {
		for conflictingID := range taskAnalysis.ConflictingTasks {
			// 检查冲突任务是否在当前worktree中
			for _, binding := range existingBindings {
				if binding.TaskID == conflictingID {
					conflicts = append(conflicts, conflictingID)
					warnings = append(warnings, fmt.Sprintf("任务 #%d 存在文件冲突", conflictingID))
					break
				}
			}
		}
	}

	// 3. 检查任务状态
	if task.Status == "completed" {
		warnings = append(warnings, "任务已完成，建议归档而非绑定")
	}

	return conflicts, warnings
}

// generateSuggestions 生成优化建议
func (c *TaskBindingCoordinator) generateSuggestions(
	ctx context.Context,
	task *models.Task,
	worktree *models.Worktree,
	existingBindings []*models.WorktreeTaskBinding,
	strategy *BindingStrategy,
) []string {
	suggestions := []string{}

	// 1. 任务数量建议
	bindingCount := len(existingBindings)
	if bindingCount > 10 {
		suggestions = append(suggestions, "worktree任务过多，建议拆分或创建新worktree")
	}

	// 2. 优先级建议
	highPriorityCount := 0
	for _, binding := range existingBindings {
		if binding.Priority >= 8 {
			highPriorityCount++
		}
	}
	if strategy.Priority >= 8 && highPriorityCount > 3 {
		suggestions = append(suggestions, "高优先级任务过多，可能影响开发效率")
	}

	// 3. 关系类型建议
	primaryCount := 0
	for _, binding := range existingBindings {
		if binding.RelationType == "primary" {
			primaryCount++
		}
	}
	if strategy.RelationType == "primary" && primaryCount >= 3 {
		suggestions = append(suggestions, "主任务较多，考虑使用secondary关系类型")
	}

	// 4. 专家匹配建议
	if worktree.ExpertID != "" {
		desc := ""
		if task.Description != nil {
			desc = *task.Description
		}
		taskText := task.Title + " " + desc
		if (worktree.ExpertID == "backend" && !contains(taskText, []string{"backend", "api", "service", "handler"})) ||
			(worktree.ExpertID == "frontend" && !contains(taskText, []string{"frontend", "ui", "component", "page"})) {
			suggestions = append(suggestions, fmt.Sprintf("任务类型可能与专家 '%s' 不匹配", worktree.ExpertID))
		}
	}

	return suggestions
}

// BatchBind 批量绑定任务
func (c *TaskBindingCoordinator) BatchBind(ctx context.Context, req *BatchBindRequest) (*BatchBindResult, error) {
	result := &BatchBindResult{
		Results: make(map[int]*SmartBindResult),
	}

	for _, taskID := range req.TaskIDs {
		bindReq := &SmartBindRequest{
			TaskID:     taskID,
			WorktreeID: req.WorktreeID,
			Strategy:   req.Strategy,
		}

		bindResult, err := c.SmartBind(ctx, bindReq)
		if err != nil {
			result.FailureCount++
			result.Results[taskID] = &SmartBindResult{
				Success:  false,
				Warnings: []string{err.Error()},
			}
		} else {
			if bindResult.Success {
				result.SuccessCount++
			} else {
				result.FailureCount++
			}
			result.Results[taskID] = bindResult
		}
	}

	return result, nil
}

// UnbindTask 解除任务绑定
func (c *TaskBindingCoordinator) UnbindTask(ctx context.Context, worktreeID, taskID int) error {
	// 1. 查找绑定
	bindings, err := c.db.WorktreeTaskBindings().GetByWorktreeID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("failed to get bindings: %w", err)
	}

	var targetBinding *models.WorktreeTaskBinding
	for _, binding := range bindings {
		if binding.TaskID == taskID {
			targetBinding = binding
			break
		}
	}

	if targetBinding == nil {
		return fmt.Errorf("binding not found for task %d in worktree %d", taskID, worktreeID)
	}

	// 2. 删除绑定
	if err := c.db.WorktreeTaskBindings().Delete(ctx, targetBinding.ID); err != nil {
		return fmt.Errorf("failed to delete binding: %w", err)
	}

	return nil
}

// GetTaskBindings 获取任务的所有绑定
func (c *TaskBindingCoordinator) GetTaskBindings(ctx context.Context, taskID int) ([]*models.WorktreeTaskBinding, error) {
	return c.db.WorktreeTaskBindings().GetByTaskID(ctx, taskID)
}

// GetWorktreeBindings 获取worktree的所有绑定
func (c *TaskBindingCoordinator) GetWorktreeBindings(ctx context.Context, worktreeID int) ([]*models.WorktreeTaskBinding, error) {
	return c.db.WorktreeTaskBindings().GetByWorktreeID(ctx, worktreeID)
}

// ReorganizeBindings 重组绑定关系
// 根据任务依赖和优先级自动调整绑定
func (c *TaskBindingCoordinator) ReorganizeBindings(ctx context.Context, worktreeID int) error {
	// 1. 获取所有绑定
	bindings, err := c.db.WorktreeTaskBindings().GetByWorktreeID(ctx, worktreeID)
	if err != nil {
		return fmt.Errorf("failed to get bindings: %w", err)
	}

	if len(bindings) == 0 {
		return nil // 没有绑定需要重组
	}

	// 2. 分析任务依赖关系
	taskDeps := make(map[int][]int) // taskID -> dependencies
	for _, binding := range bindings {
		bindingTask, err := c.db.Tasks().GetByID(ctx, binding.TaskID)
		if err != nil {
			continue
		}

		if bindingTask.ParentID != nil {
			taskDeps[binding.TaskID] = append(taskDeps[binding.TaskID], *bindingTask.ParentID)
		}
	}

	// 3. 根据依赖关系调整优先级
	// Note: Update method doesn't exist, so we skip this step for now
	// In production, you would need to implement Update in the repository
	for _, binding := range bindings {
		newPriority := c.calculatePriority(binding.TaskID, taskDeps)
		if newPriority != binding.Priority {
			// TODO: Implement Update method in WorktreeTaskBindingRepository
			// For now, we just calculate but don't persist
			_ = newPriority
		}
	}

	return nil
}

// calculatePriority 根据依赖关系计算优先级
func (c *TaskBindingCoordinator) calculatePriority(taskID int, deps map[int][]int) int {
	// 深度优先搜索计算依赖深度
	visited := make(map[int]bool)
	depth := c.calculateDepth(taskID, deps, visited)

	// 依赖深度越深，优先级越高（需要先完成）
	priority := 5 + depth
	if priority > 10 {
		priority = 10
	}

	return priority
}

// calculateDepth 计算依赖深度
func (c *TaskBindingCoordinator) calculateDepth(taskID int, deps map[int][]int, visited map[int]bool) int {
	if visited[taskID] {
		return 0 // 避免循环依赖
	}
	visited[taskID] = true

	maxDepth := 0
	if dependencies, exists := deps[taskID]; exists {
		for _, depID := range dependencies {
			depth := c.calculateDepth(depID, deps, visited)
			if depth > maxDepth {
				maxDepth = depth
			}
		}
	}

	return maxDepth + 1
}

// SuggestBindings 为任务推荐绑定的worktree
func (c *TaskBindingCoordinator) SuggestBindings(ctx context.Context, taskID int, aiUserID int) ([]*AllocationOption, error) {
	// 使用coordinator分配算法
	req := &AllocationRequest{
		TaskID:   taskID,
		AIUserID: aiUserID,
	}

	decision, err := c.coordinator.AllocateWorkspace(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to allocate workspace: %w", err)
	}

	return decision.Alternatives, nil
}

// AutoBindRelatedTasks 自动绑定相关任务
// 找出与worktree中任务相关的其他任务并自动绑定
func (c *TaskBindingCoordinator) AutoBindRelatedTasks(ctx context.Context, worktreeID int) (*BatchBindResult, error) {
	// 1. 获取worktree的现有绑定
	existingBindings, err := c.db.WorktreeTaskBindings().GetByWorktreeID(ctx, worktreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bindings: %w", err)
	}

	if len(existingBindings) == 0 {
		return &BatchBindResult{}, nil
	}

	// 2. 收集所有已绑定任务的相关任务
	relatedTaskIDs := make(map[int]bool)
	for _, binding := range existingBindings {
		bindingTask, err := c.db.Tasks().GetByID(ctx, binding.TaskID)
		if err != nil {
			continue
		}

		// 查找子任务
		children, err := c.db.Tasks().GetChildren(ctx, bindingTask.ID)
		if err == nil {
			for _, child := range children {
				relatedTaskIDs[child.ID] = true
			}
		}

		// 查找同级任务
		if bindingTask.ParentID != nil {
			siblings, err := c.db.Tasks().GetChildren(ctx, *bindingTask.ParentID)
			if err == nil {
				for _, sibling := range siblings {
					if sibling.ID != bindingTask.ID {
						relatedTaskIDs[sibling.ID] = true
					}
				}
			}
		}
	}

	// 3. 过滤已绑定的任务
	taskIDsToBindSet := make(map[int]bool)
	for taskID := range relatedTaskIDs {
		alreadyBound := false
		for _, binding := range existingBindings {
			if binding.TaskID == taskID {
				alreadyBound = true
				break
			}
		}
		if !alreadyBound {
			taskIDsToBindSet[taskID] = true
		}
	}

	// 转换为slice
	taskIDsToBind := make([]int, 0, len(taskIDsToBindSet))
	for taskID := range taskIDsToBindSet {
		taskIDsToBind = append(taskIDsToBind, taskID)
	}

	if len(taskIDsToBind) == 0 {
		return &BatchBindResult{}, nil
	}

	// 4. 批量绑定（使用secondary关系类型）
	batchReq := &BatchBindRequest{
		TaskIDs:    taskIDsToBind,
		WorktreeID: worktreeID,
		Strategy: &BindingStrategy{
			RelationType:      "secondary",
			Priority:          3,
			AutoActivate:      false,
			DependencyCheck:   true,
			ConflictTolerance: 0.5,
		},
	}

	return c.BatchBind(ctx, batchReq)
}

// contains 辅助函数：检查字符串是否包含任意关键词
func contains(text string, keywords []string) bool {
	lowerText := strings.ToLower(text)
	for _, keyword := range keywords {
		if strings.Contains(lowerText, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}
