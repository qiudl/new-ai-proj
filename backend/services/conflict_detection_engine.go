package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"
)

// ConflictDetectionEngine 冲突检测引擎
// 提供多层次的冲突检测：文件级、依赖级、合并预测
type ConflictDetectionEngine struct {
	db              database.DB
	gitOps          *GitIntegrationLayer
	worktreeService *WorktreeService
}

// NewConflictDetectionEngine 创建冲突检测引擎
func NewConflictDetectionEngine(
	db database.DB,
	gitOps *GitIntegrationLayer,
	worktreeService *WorktreeService,
) *ConflictDetectionEngine {
	return &ConflictDetectionEngine{
		db:              db,
		gitOps:          gitOps,
		worktreeService: worktreeService,
	}
}

// ConflictLevel 冲突级别
type ConflictLevel string

const (
	ConflictLevelNone     ConflictLevel = "none"     // 无冲突
	ConflictLevelLow      ConflictLevel = "low"      // 低风险
	ConflictLevelMedium   ConflictLevel = "medium"   // 中等风险
	ConflictLevelHigh     ConflictLevel = "high"     // 高风险
	ConflictLevelCritical ConflictLevel = "critical" // 严重冲突
)

// ConflictType 冲突类型
type ConflictType string

const (
	ConflictTypeFile       ConflictType = "file"       // 文件冲突
	ConflictTypeDependency ConflictType = "dependency" // 依赖冲突
	ConflictTypeMerge      ConflictType = "merge"      // 合并冲突
	ConflictTypeSemantic   ConflictType = "semantic"   // 语义冲突
	ConflictTypeResource   ConflictType = "resource"   // 资源冲突
)

// ConflictDetectionResult 冲突检测结果
type ConflictDetectionResult struct {
	HasConflict      bool                 `json:"has_conflict"`
	Level            ConflictLevel        `json:"level"`
	Conflicts        []*ConflictInfo      `json:"conflicts"`
	TotalCount       int                  `json:"total_count"`
	AffectedWorktrees []int               `json:"affected_worktrees"`
	DetectedAt       time.Time            `json:"detected_at"`
	Suggestions      []string             `json:"suggestions,omitempty"`
}

// ConflictInfo 冲突详细信息
type ConflictInfo struct {
	Type              ConflictType  `json:"type"`
	Level             ConflictLevel `json:"level"`
	Description       string        `json:"description"`
	FilePath          string        `json:"file_path,omitempty"`
	WorktreeID1       int           `json:"worktree_id_1"`
	WorktreeID2       int           `json:"worktree_id_2"`
	TaskID1           int           `json:"task_id_1,omitempty"`
	TaskID2           int           `json:"task_id_2,omitempty"`
	ConflictScore     float64       `json:"conflict_score"`  // 0.0-1.0
	ResolutionOptions []string      `json:"resolution_options,omitempty"`
	Details           map[string]interface{} `json:"details,omitempty"`
}

// DetectConflictsRequest 冲突检测请求
type DetectConflictsRequest struct {
	WorktreeID int      `json:"worktree_id"`
	TaskID     int      `json:"task_id,omitempty"`
	FilePatterns []string `json:"file_patterns,omitempty"`
	CheckTypes []ConflictType `json:"check_types,omitempty"` // 要检测的冲突类型
}

// DetectConflicts 检测冲突（主入口）
func (e *ConflictDetectionEngine) DetectConflicts(ctx context.Context, req *DetectConflictsRequest) (*ConflictDetectionResult, error) {
	result := &ConflictDetectionResult{
		HasConflict:       false,
		Level:             ConflictLevelNone,
		Conflicts:         []*ConflictInfo{},
		AffectedWorktrees: []int{},
		DetectedAt:        time.Now(),
		Suggestions:       []string{},
	}

	// 获取worktree信息
	worktree, err := e.db.Worktrees().GetByID(ctx, req.WorktreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	// 获取项目的所有活跃worktrees
	activeStatus := "active"
	activeWorktrees, _, err := e.worktreeService.ListWorktrees(ctx, &ListWorktreesOptions{
		ProjectID: &worktree.ProjectID,
		Status:    &activeStatus,
		Limit:     100,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list active worktrees: %w", err)
	}

	// 确定要检测的冲突类型
	checkTypes := req.CheckTypes
	if len(checkTypes) == 0 {
		// 默认检测所有类型
		checkTypes = []ConflictType{
			ConflictTypeFile,
			ConflictTypeDependency,
			ConflictTypeMerge,
		}
	}

	// 对每个活跃worktree进行冲突检测
	for _, otherWT := range activeWorktrees {
		if otherWT.ID == req.WorktreeID {
			continue // 跳过自己
		}

		for _, conflictType := range checkTypes {
			var conflicts []*ConflictInfo
			var err error

			switch conflictType {
			case ConflictTypeFile:
				conflicts, err = e.detectFileConflicts(ctx, worktree, otherWT, req)
			case ConflictTypeDependency:
				conflicts, err = e.detectDependencyConflicts(ctx, worktree, otherWT, req)
			case ConflictTypeMerge:
				conflicts, err = e.detectMergeConflicts(ctx, worktree, otherWT)
			}

			if err != nil {
				// 记录错误但继续检测
				continue
			}

			if len(conflicts) > 0 {
				result.Conflicts = append(result.Conflicts, conflicts...)
				result.HasConflict = true
				if !containsIntSlice(result.AffectedWorktrees, otherWT.ID) {
					result.AffectedWorktrees = append(result.AffectedWorktrees, otherWT.ID)
				}
			}
		}
	}

	// 更新总数和级别
	result.TotalCount = len(result.Conflicts)
	result.Level = e.calculateOverallLevel(result.Conflicts)

	// 生成解决建议
	result.Suggestions = e.generateSuggestions(result)

	return result, nil
}

// detectFileConflicts 检测文件级冲突
func (e *ConflictDetectionEngine) detectFileConflicts(
	ctx context.Context,
	wt1, wt2 *models.Worktree,
	req *DetectConflictsRequest,
) ([]*ConflictInfo, error) {
	conflicts := []*ConflictInfo{}

	// 获取两个worktree绑定的任务
	bindings1, err := e.db.WorktreeTaskBindings().GetByWorktreeID(ctx, wt1.ID)
	if err != nil {
		return nil, err
	}

	bindings2, err := e.db.WorktreeTaskBindings().GetByWorktreeID(ctx, wt2.ID)
	if err != nil {
		return nil, err
	}

	// 分析文件模式重叠
	filePatterns1 := e.collectFilePatterns(ctx, bindings1, req.FilePatterns)
	filePatterns2 := e.collectFilePatterns(ctx, bindings2, nil)

	// 检测文件模式冲突
	for _, p1 := range filePatterns1 {
		for _, p2 := range filePatterns2 {
			if e.patternsOverlap(p1, p2) {
				conflict := &ConflictInfo{
					Type:        ConflictTypeFile,
					Level:       e.assessFileConflictLevel(p1, p2),
					Description: fmt.Sprintf("文件模式冲突: %s 与 %s", p1, p2),
					FilePath:    e.commonPath(p1, p2),
					WorktreeID1: wt1.ID,
					WorktreeID2: wt2.ID,
					ConflictScore: 0.7,
					ResolutionOptions: []string{
						"隔离到不同的worktree",
						"协调开发顺序",
						"使用功能分支",
					},
					Details: map[string]interface{}{
						"pattern1": p1,
						"pattern2": p2,
						"worktree1_name": wt1.Name,
						"worktree2_name": wt2.Name,
					},
				}

				// 获取任务ID
				if len(bindings1) > 0 {
					conflict.TaskID1 = bindings1[0].TaskID
				}
				if len(bindings2) > 0 {
					conflict.TaskID2 = bindings2[0].TaskID
				}

				conflicts = append(conflicts, conflict)
			}
		}
	}

	return conflicts, nil
}

// detectDependencyConflicts 检测依赖冲突
func (e *ConflictDetectionEngine) detectDependencyConflicts(
	ctx context.Context,
	wt1, wt2 *models.Worktree,
	req *DetectConflictsRequest,
) ([]*ConflictInfo, error) {
	conflicts := []*ConflictInfo{}

	// 获取两个worktree的任务
	bindings1, err := e.db.WorktreeTaskBindings().GetByWorktreeID(ctx, wt1.ID)
	if err != nil {
		return nil, err
	}

	bindings2, err := e.db.WorktreeTaskBindings().GetByWorktreeID(ctx, wt2.ID)
	if err != nil {
		return nil, err
	}

	// 检查任务依赖关系
	for _, b1 := range bindings1 {
		task1, err := e.db.Tasks().GetByID(ctx, b1.TaskID)
		if err != nil {
			continue
		}

		for _, b2 := range bindings2 {
			task2, err := e.db.Tasks().GetByID(ctx, b2.TaskID)
			if err != nil {
				continue
			}

			// 检查是否有依赖关系
			if e.hasDependency(ctx, task1, task2) {
				conflict := &ConflictInfo{
					Type:        ConflictTypeDependency,
					Level:       ConflictLevelMedium,
					Description: fmt.Sprintf("任务依赖冲突: 任务#%d 依赖 任务#%d", task1.ID, task2.ID),
					WorktreeID1: wt1.ID,
					WorktreeID2: wt2.ID,
					TaskID1:     task1.ID,
					TaskID2:     task2.ID,
					ConflictScore: 0.6,
					ResolutionOptions: []string{
						"先完成被依赖的任务",
						"调整任务执行顺序",
						"解除不必要的依赖",
					},
					Details: map[string]interface{}{
						"task1_title": task1.Title,
						"task2_title": task2.Title,
					},
				}
				conflicts = append(conflicts, conflict)
			}
		}
	}

	return conflicts, nil
}

// detectMergeConflicts 检测合并冲突预测
func (e *ConflictDetectionEngine) detectMergeConflicts(
	ctx context.Context,
	wt1, wt2 *models.Worktree,
) ([]*ConflictInfo, error) {
	conflicts := []*ConflictInfo{}

	// 使用Git命令检查潜在的合并冲突
	// 这需要实际的Git仓库路径
	project, err := e.db.Projects().GetByID(ctx, wt1.ProjectID)
	if err != nil {
		return nil, err
	}

	projectPath := e.getProjectPath(project)

	// 检查两个worktree的分支是否有合并冲突
	hasConflict, conflictFiles := e.checkMergeConflict(ctx, projectPath, wt1, wt2)

	if hasConflict {
		for _, file := range conflictFiles {
			conflict := &ConflictInfo{
				Type:        ConflictTypeMerge,
				Level:       ConflictLevelHigh,
				Description: fmt.Sprintf("预测到合并冲突: %s", file),
				FilePath:    file,
				WorktreeID1: wt1.ID,
				WorktreeID2: wt2.ID,
				ConflictScore: 0.8,
				ResolutionOptions: []string{
					"手动解决冲突",
					"使用合并工具",
					"重新设计模块边界",
				},
				Details: map[string]interface{}{
					"branch1": wt1.Branch,
					"branch2": wt2.Branch,
				},
			}
			conflicts = append(conflicts, conflict)
		}
	}

	return conflicts, nil
}

// collectFilePatterns 收集文件模式
func (e *ConflictDetectionEngine) collectFilePatterns(
	ctx context.Context,
	bindings []*models.WorktreeTaskBinding,
	additionalPatterns []string,
) []string {
	patterns := make([]string, 0)

	// 添加额外指定的模式
	patterns = append(patterns, additionalPatterns...)

	// 从任务推断文件模式
	for _, binding := range bindings {
		task, err := e.db.Tasks().GetByID(ctx, binding.TaskID)
		if err != nil {
			continue
		}

		// 使用coordinator的推断逻辑
		inferredPatterns := e.inferFilePatterns(task)
		patterns = append(patterns, inferredPatterns...)
	}

	return patterns
}

// inferFilePatterns 推断文件模式（复用coordinator的逻辑）
func (e *ConflictDetectionEngine) inferFilePatterns(task *models.Task) []string {
	patterns := []string{}

	desc := ""
	if task.Description != nil {
		desc = *task.Description
	}
	text := strings.ToLower(task.Title + " " + desc)

	if strings.Contains(text, "backend") || strings.Contains(text, "api") {
		patterns = append(patterns, "backend/**/*.go")
	}
	if strings.Contains(text, "frontend") || strings.Contains(text, "ui") {
		patterns = append(patterns, "frontend/src/**/*.tsx", "frontend/src/**/*.ts")
	}
	if strings.Contains(text, "database") || strings.Contains(text, "数据库") {
		patterns = append(patterns, "backend/database/**/*.go", "backend/migrations/**/*.sql")
	}
	if strings.Contains(text, "model") || strings.Contains(text, "模型") {
		patterns = append(patterns, "backend/models/**/*.go")
	}

	return patterns
}

// patternsOverlap 判断两个文件模式是否重叠
func (e *ConflictDetectionEngine) patternsOverlap(p1, p2 string) bool {
	// 简化实现：检查路径前缀
	p1Clean := strings.TrimSuffix(strings.TrimSuffix(p1, "**/*"), "*")
	p2Clean := strings.TrimSuffix(strings.TrimSuffix(p2, "**/*"), "*")

	return strings.HasPrefix(p1Clean, p2Clean) ||
	       strings.HasPrefix(p2Clean, p1Clean) ||
	       p1Clean == p2Clean
}

// assessFileConflictLevel 评估文件冲突级别
func (e *ConflictDetectionEngine) assessFileConflictLevel(p1, p2 string) ConflictLevel {
	// 完全相同的路径 = 严重冲突
	if p1 == p2 {
		return ConflictLevelCritical
	}

	// 同一目录下的不同文件 = 高风险
	if filepath.Dir(p1) == filepath.Dir(p2) {
		return ConflictLevelHigh
	}

	// 相关模块 = 中等风险
	if e.patternsOverlap(p1, p2) {
		return ConflictLevelMedium
	}

	return ConflictLevelLow
}

// commonPath 获取两个路径的公共部分
func (e *ConflictDetectionEngine) commonPath(p1, p2 string) string {
	parts1 := strings.Split(p1, "/")
	parts2 := strings.Split(p2, "/")

	common := []string{}
	for i := 0; i < len(parts1) && i < len(parts2); i++ {
		if parts1[i] == parts2[i] {
			common = append(common, parts1[i])
		} else {
			break
		}
	}

	if len(common) > 0 {
		return strings.Join(common, "/")
	}
	return ""
}

// hasDependency 检查task1是否依赖task2
func (e *ConflictDetectionEngine) hasDependency(ctx context.Context, task1, task2 *models.Task) bool {
	// 检查父子关系
	if task1.ParentID != nil && *task1.ParentID == task2.ID {
		return true
	}

	// 可以扩展：检查任务依赖表（如果有的话）

	return false
}

// checkMergeConflict 检查Git合并冲突
func (e *ConflictDetectionEngine) checkMergeConflict(
	ctx context.Context,
	projectPath string,
	wt1, wt2 *models.Worktree,
) (bool, []string) {
	// 简化实现：返回模拟结果
	// 实际应该调用Git merge-tree或类似命令
	// TODO: 实现真实的Git merge conflict检测

	return false, []string{}
}

// getProjectPath 获取项目路径
func (e *ConflictDetectionEngine) getProjectPath(project *models.Project) string {
	// TODO: 从项目配置获取路径
	return filepath.Join("/var/projects", project.Name)
}

// calculateOverallLevel 计算总体冲突级别
func (e *ConflictDetectionEngine) calculateOverallLevel(conflicts []*ConflictInfo) ConflictLevel {
	if len(conflicts) == 0 {
		return ConflictLevelNone
	}

	// 找出最高级别的冲突
	maxLevel := ConflictLevelLow
	for _, c := range conflicts {
		if e.levelValue(c.Level) > e.levelValue(maxLevel) {
			maxLevel = c.Level
		}
	}

	return maxLevel
}

// levelValue 获取冲突级别的数值
func (e *ConflictDetectionEngine) levelValue(level ConflictLevel) int {
	switch level {
	case ConflictLevelCritical:
		return 4
	case ConflictLevelHigh:
		return 3
	case ConflictLevelMedium:
		return 2
	case ConflictLevelLow:
		return 1
	default:
		return 0
	}
}

// generateSuggestions 生成解决建议
func (e *ConflictDetectionEngine) generateSuggestions(result *ConflictDetectionResult) []string {
	suggestions := []string{}

	if !result.HasConflict {
		return suggestions
	}

	// 根据冲突级别提供建议
	switch result.Level {
	case ConflictLevelCritical:
		suggestions = append(suggestions, "⚠️ 严重冲突！建议立即暂停开发并解决")
		suggestions = append(suggestions, "考虑将任务隔离到独立的worktree")
	case ConflictLevelHigh:
		suggestions = append(suggestions, "⚠️ 高风险冲突，建议优先处理")
		suggestions = append(suggestions, "协调团队成员的开发顺序")
	case ConflictLevelMedium:
		suggestions = append(suggestions, "⚠️ 中等风险冲突，需要注意")
		suggestions = append(suggestions, "定期同步代码以减少冲突")
	case ConflictLevelLow:
		suggestions = append(suggestions, "低风险冲突，保持关注即可")
	}

	// 根据冲突数量提供建议
	if result.TotalCount > 5 {
		suggestions = append(suggestions, "冲突数量较多，建议重新规划任务分配")
	}

	return suggestions
}

// CompareWorktrees 比较两个worktrees的冲突
func (e *ConflictDetectionEngine) CompareWorktrees(ctx context.Context, worktree1ID, worktree2ID int) (*ConflictDetectionResult, error) {
	result := &ConflictDetectionResult{
		HasConflict:       false,
		Level:             ConflictLevelNone,
		Conflicts:         []*ConflictInfo{},
		AffectedWorktrees: []int{worktree1ID, worktree2ID},
		DetectedAt:        time.Now(),
		Suggestions:       []string{},
	}

	// 获取两个worktree的信息
	wt1, err := e.db.Worktrees().GetByID(ctx, worktree1ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree1: %w", err)
	}

	wt2, err := e.db.Worktrees().GetByID(ctx, worktree2ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree2: %w", err)
	}

	// 检测所有类型的冲突
	req := &DetectConflictsRequest{
		WorktreeID: worktree1ID,
	}

	// 文件冲突
	fileConflicts, _ := e.detectFileConflicts(ctx, wt1, wt2, req)
	result.Conflicts = append(result.Conflicts, fileConflicts...)

	// 依赖冲突
	depConflicts, _ := e.detectDependencyConflicts(ctx, wt1, wt2, req)
	result.Conflicts = append(result.Conflicts, depConflicts...)

	// 合并冲突
	mergeConflicts, _ := e.detectMergeConflicts(ctx, wt1, wt2)
	result.Conflicts = append(result.Conflicts, mergeConflicts...)

	// 更新结果
	result.TotalCount = len(result.Conflicts)
	result.HasConflict = result.TotalCount > 0
	result.Level = e.calculateOverallLevel(result.Conflicts)
	result.Suggestions = e.generateSuggestions(result)

	return result, nil
}

// PredictMergeConflicts 预测合并冲突
func (e *ConflictDetectionEngine) PredictMergeConflicts(ctx context.Context, worktreeID int, targetBranch string) (*ConflictDetectionResult, error) {
	result := &ConflictDetectionResult{
		HasConflict:       false,
		Level:             ConflictLevelNone,
		Conflicts:         []*ConflictInfo{},
		AffectedWorktrees: []int{worktreeID},
		DetectedAt:        time.Now(),
		Suggestions:       []string{},
	}

	// 获取worktree信息
	worktree, err := e.db.Worktrees().GetByID(ctx, worktreeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get worktree: %w", err)
	}

	// 获取项目信息
	project, err := e.db.Projects().GetByID(ctx, worktree.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	// 使用Git检查合并冲突
	projectPath := e.getProjectPath(project)

	// TODO: 实现真实的Git merge预测
	// 这里使用简化版本，实际应该调用git merge-tree
	_ = projectPath
	_ = targetBranch

	// 模拟结果（实际应该调用Git命令）
	result.Suggestions = []string{
		"建议在合并前进行本地测试",
		"检查与目标分支的差异",
	}

	return result, nil
}

// containsIntSlice 辅助函数：检查int slice是否包含值
func containsIntSlice(slice []int, val int) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}
