// Package services - 智能类型推断引擎
// 任务#242: 后端统一服务实现 - TypeInferenceEngine
package services

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"
)

// TypeInferenceEngine 智能类型推断引擎接口
type TypeInferenceEngine interface {
	// 核心推断方法
	InferTimerType(ctx context.Context, context *InferenceContext) (*InferenceResult, error)
	
	// 学习和优化
	LearnFromFeedback(ctx context.Context, timerID int, userFeedback int) error
	UpdateUserBehaviorModel(ctx context.Context, userID int) error
	
	// 建议生成
	GenerateSmartSuggestions(ctx context.Context, userID int, context string) ([]*TimerSuggestion, error)
}

// InferenceContext 推断上下文
type InferenceContext struct {
	UserID    int                    `json:"user_id"`
	TaskID    *int                   `json:"task_id,omitempty"`
	Title     string                 `json:"title"`
	Context   string                 `json:"context"` // dashboard, task_detail, quick_start
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	ProjectID *int                   `json:"project_id,omitempty"`
	
	// 时间上下文
	CurrentTime time.Time `json:"current_time"`
	TimeOfDay   int       `json:"time_of_day"`   // 0-23
	DayOfWeek   int       `json:"day_of_week"`   // 0-6 (Sunday=0)
	IsWorkday   bool      `json:"is_workday"`
	
	// 用户历史
	RecentHistory []*TimerRecord `json:"recent_history,omitempty"`
}

// InferenceResult 推断结果
type InferenceResult struct {
	Type              string    `json:"type"`               // project_task, personal_task, quick_timer, pomodoro
	Confidence        float64   `json:"confidence"`         // 0.0-1.0
	Reasoning         []string  `json:"reasoning"`          // 推断依据
	SuggestedCategory string    `json:"suggested_category"` // 建议分类
	ProjectID         *int      `json:"project_id,omitempty"`
	EstimatedDuration int       `json:"estimated_duration,omitempty"` // 预估时长(分钟)
	Metadata          map[string]interface{} `json:"metadata,omitempty"`
}

// FeatureVector 特征向量
type FeatureVector struct {
	// 任务特征
	HasTaskID     bool     `json:"has_task_id"`
	HasProjectID  bool     `json:"has_project_id"`
	TitleKeywords []string `json:"title_keywords"`
	TitleLength   int      `json:"title_length"`
	
	// 时间特征
	TimeOfDay       int  `json:"time_of_day"`
	DayOfWeek       int  `json:"day_of_week"`
	IsWorkingHours  bool `json:"is_working_hours"`
	IsWeekend       bool `json:"is_weekend"`
	
	// 上下文特征
	ContextType        string  `json:"context_type"`
	UserActivityScore  float64 `json:"user_activity_score"`
	RecentPatternScore float64 `json:"recent_pattern_score"`
	
	// 用户行为特征
	UserPreferenceScore  float64 `json:"user_preference_score"`
	HistoricalAccuracy   float64 `json:"historical_accuracy"`
	CategoryFrequency    map[string]float64 `json:"category_frequency"`
}

// UserBehaviorModel 用户行为模型
type UserBehaviorModel struct {
	UserID                int                            `json:"user_id"`
	PreferredTimerTypes   map[string]float64             `json:"preferred_timer_types"`
	CategoryPreferences   map[string]float64             `json:"category_preferences"`
	TimePatterns          map[string]map[string]float64  `json:"time_patterns"` // hour -> type -> probability
	ContextPatterns       map[string]map[string]float64  `json:"context_patterns"` // context -> type -> probability
	AccuracyByFeature     map[string]float64             `json:"accuracy_by_feature"`
	AvgDuration           map[string]float64             `json:"avg_duration"` // 各类型平均时长(秒)
	LastUpdated           time.Time                      `json:"last_updated"`
	SampleSize            int                            `json:"sample_size"`
}

// typeInferenceEngineImpl 智能类型推断引擎实现
type typeInferenceEngineImpl struct {
	db                *sql.DB
	keywordCategories map[string][]string
	behaviorModels    map[int]*UserBehaviorModel // 缓存用户行为模型
}

// NewTypeInferenceEngine 创建类型推断引擎实例
func NewTypeInferenceEngine(db *sql.DB) TypeInferenceEngine {
	engine := &typeInferenceEngineImpl{
		db:             db,
		behaviorModels: make(map[int]*UserBehaviorModel),
		keywordCategories: map[string][]string{
			"开发": {"代码", "编程", "开发", "bug", "调试", "前端", "后端", "API", "数据库", "测试", "review", "commit", "deploy"},
			"会议": {"会议", "讨论", "沟通", "汇报", "评审", "站会", "scrum", "meeting", "call", "视频", "电话"},
			"学习": {"学习", "研究", "阅读", "文档", "教程", "培训", "课程", "知识", "技能", "学习笔记"},
			"设计": {"设计", "UI", "UX", "原型", "界面", "交互", "视觉", "排版", "色彩", "图标"},
			"测试": {"测试", "验证", "QA", "质量", "自动化", "单元测试", "集成测试", "性能测试"},
			"写作": {"写作", "文档", "文章", "博客", "总结", "报告", "方案", "说明", "记录"},
			"管理": {"管理", "规划", "计划", "协调", "安排", "组织", "领导", "决策", "策略"},
			"休息": {"休息", "放松", "娱乐", "游戏", "音乐", "电影", "运动", "散步", "咖啡"},
			"番茄钟": {"番茄", "pomodoro", "专注", "集中", "25分钟", "专注时间", "深度工作"},
		},
	}
	
	return engine
}

// InferTimerType 执行智能类型推断 - 核心算法
func (e *typeInferenceEngineImpl) InferTimerType(ctx context.Context, inferenceCtx *InferenceContext) (*InferenceResult, error) {
	// 1. 设置默认时间上下文
	if inferenceCtx.CurrentTime.IsZero() {
		inferenceCtx.CurrentTime = time.Now()
	}
	inferenceCtx.TimeOfDay = inferenceCtx.CurrentTime.Hour()
	inferenceCtx.DayOfWeek = int(inferenceCtx.CurrentTime.Weekday())
	inferenceCtx.IsWorkday = inferenceCtx.DayOfWeek >= 1 && inferenceCtx.DayOfWeek <= 5

	// 2. 提取特征向量
	features, err := e.extractFeatures(ctx, inferenceCtx)
	if err != nil {
		return nil, fmt.Errorf("特征提取失败: %v", err)
	}

	// 3. 获取用户行为模型
	behaviorModel, err := e.getUserBehaviorModel(ctx, inferenceCtx.UserID)
	if err != nil {
		return nil, fmt.Errorf("获取用户行为模型失败: %v", err)
	}

	// 4. 执行多维度推断
	ruleBasedResult := e.applyRuleBasedInference(features)
	mlBasedResult := e.applyMLBasedInference(features, behaviorModel)
	contextBasedResult := e.applyContextBasedInference(inferenceCtx, features)

	// 5. 综合决策
	finalResult := e.combineInferenceResults(
		[]InferenceResult{ruleBasedResult, mlBasedResult, contextBasedResult},
		behaviorModel,
	)

	// 6. 生成建议分类和预估时长
	finalResult.SuggestedCategory = e.inferCategory(inferenceCtx.Title, behaviorModel)
	finalResult.EstimatedDuration = e.estimateDuration(finalResult.Type, finalResult.SuggestedCategory, behaviorModel)

	return &finalResult, nil
}

// extractFeatures 提取特征向量
func (e *typeInferenceEngineImpl) extractFeatures(ctx context.Context, inferenceCtx *InferenceContext) (*FeatureVector, error) {
	features := &FeatureVector{
		HasTaskID:      inferenceCtx.TaskID != nil,
		HasProjectID:   inferenceCtx.ProjectID != nil,
		TitleKeywords:  e.extractKeywords(inferenceCtx.Title),
		TitleLength:    len(inferenceCtx.Title),
		TimeOfDay:      inferenceCtx.TimeOfDay,
		DayOfWeek:      inferenceCtx.DayOfWeek,
		IsWorkingHours: e.isWorkingHours(inferenceCtx.TimeOfDay),
		IsWeekend:      inferenceCtx.DayOfWeek == 0 || inferenceCtx.DayOfWeek == 6,
		ContextType:    inferenceCtx.Context,
	}

	// 计算用户活动度分数
	features.UserActivityScore = e.calculateUserActivityScore(ctx, inferenceCtx.UserID)
	
	// 计算最近模式分数
	features.RecentPatternScore = e.calculateRecentPatternScore(inferenceCtx.RecentHistory)
	
	// 计算分类频率
	features.CategoryFrequency = e.calculateCategoryFrequency(ctx, inferenceCtx.UserID)

	return features, nil
}

// applyRuleBasedInference 基于规则的推断
func (e *typeInferenceEngineImpl) applyRuleBasedInference(features *FeatureVector) InferenceResult {
	var confidence float64
	var timerType string
	var reasoning []string

	// 规则1: 明确的项目任务
	if features.HasTaskID && features.HasProjectID {
		confidence = 0.95
		timerType = "project_task"
		reasoning = append(reasoning, "明确指定了项目任务ID")
	} else if features.HasTaskID {
		confidence = 0.85
		timerType = "project_task"
		reasoning = append(reasoning, "指定了任务ID")
	}

	// 规则2: 番茄钟关键词检测
	if e.isPomodoroKeywords(features.TitleKeywords) {
		confidence = 0.90
		timerType = "pomodoro"
		reasoning = append(reasoning, "标题包含番茄钟相关关键词")
	}

	// 规则3: 工作时间推断
	if confidence < 0.8 && features.IsWorkingHours && !features.IsWeekend {
		if e.isWorkRelatedKeywords(features.TitleKeywords) {
			confidence = 0.75
			timerType = "project_task"
			reasoning = append(reasoning, "工作时间且包含工作相关关键词")
		} else {
			confidence = 0.65
			timerType = "personal_task"
			reasoning = append(reasoning, "工作时间但非明确工作内容")
		}
	}

	// 规则4: 上下文推断
	if confidence < 0.7 {
		switch features.ContextType {
		case "task_detail":
			confidence = 0.80
			timerType = "project_task"
			reasoning = append(reasoning, "从任务详情页启动")
		case "quick_start":
			confidence = 0.70
			timerType = "quick_timer"
			reasoning = append(reasoning, "快速启动模式")
		}
	}

	// 规则5: 标题长度推断
	if confidence < 0.6 {
		if features.TitleLength <= 10 {
			confidence = 0.60
			timerType = "quick_timer"
			reasoning = append(reasoning, "标题简短，可能是快速任务")
		} else {
			confidence = 0.55
			timerType = "personal_task"
			reasoning = append(reasoning, "标题较长，可能是个人任务")
		}
	}

	// 默认情况
	if confidence == 0 {
		confidence = 0.50
		timerType = "personal_task"
		reasoning = append(reasoning, "默认推断为个人任务")
	}

	return InferenceResult{
		Type:       timerType,
		Confidence: confidence,
		Reasoning:  reasoning,
	}
}

// applyMLBasedInference 基于机器学习的推断
func (e *typeInferenceEngineImpl) applyMLBasedInference(features *FeatureVector, model *UserBehaviorModel) InferenceResult {
	if model == nil || model.SampleSize < 10 {
		// 样本不足，返回低置信度结果
		return InferenceResult{
			Type:       "personal_task",
			Confidence: 0.3,
			Reasoning:  []string{"用户历史数据不足，使用默认推断"},
		}
	}

	scores := make(map[string]float64)
	
	// 基于时间模式
	hourKey := fmt.Sprintf("%d", features.TimeOfDay)
	if timePatterns, exists := model.TimePatterns[hourKey]; exists {
		for timerType, prob := range timePatterns {
			scores[timerType] += prob * 0.3 // 30%权重
		}
	}

	// 基于上下文模式
	if contextPatterns, exists := model.ContextPatterns[features.ContextType]; exists {
		for timerType, prob := range contextPatterns {
			scores[timerType] += prob * 0.4 // 40%权重
		}
	}

	// 基于用户偏好
	for timerType, preference := range model.PreferredTimerTypes {
		scores[timerType] += preference * 0.3 // 30%权重
	}

	// 找出最高分数的类型
	var bestType string
	var bestScore float64
	for timerType, score := range scores {
		if score > bestScore {
			bestScore = score
			bestType = timerType
		}
	}

	confidence := math.Min(bestScore, 0.85) // 最高85%置信度
	reasoning := []string{
		fmt.Sprintf("基于用户%d次历史记录的机器学习推断", model.SampleSize),
		fmt.Sprintf("时间模式匹配度: %.2f", scores[bestType]*0.3),
		fmt.Sprintf("上下文模式匹配度: %.2f", scores[bestType]*0.4),
	}

	if bestType == "" {
		bestType = "personal_task"
		confidence = 0.4
		reasoning = append(reasoning, "机器学习模型无明确偏好，使用默认类型")
	}

	return InferenceResult{
		Type:       bestType,
		Confidence: confidence,
		Reasoning:  reasoning,
	}
}

// applyContextBasedInference 基于上下文的推断
func (e *typeInferenceEngineImpl) applyContextBasedInference(ctx *InferenceContext, features *FeatureVector) InferenceResult {
	var timerType string
	var confidence float64
	var reasoning []string

	// 上下文权重调整
	switch ctx.Context {
	case "task_detail":
		timerType = "project_task"
		confidence = 0.75
		reasoning = append(reasoning, "从任务详情页启动，高概率为项目任务")
		
		// 如果有TaskID，进一步提升置信度
		if ctx.TaskID != nil {
			confidence = 0.90
			reasoning = append(reasoning, "任务详情页且有具体任务ID")
		}

	case "dashboard":
		// 仪表板启动，根据时间和用户习惯推断
		if features.IsWorkingHours && !features.IsWeekend {
			timerType = "project_task"
			confidence = 0.65
			reasoning = append(reasoning, "工作时间从仪表板启动")
		} else {
			timerType = "personal_task"
			confidence = 0.60
			reasoning = append(reasoning, "非工作时间从仪表板启动")
		}

	case "quick_start":
		timerType = "quick_timer"
		confidence = 0.70
		reasoning = append(reasoning, "快速启动模式")

	case "floating":
		// 浮动计时器，通常是继续之前的工作
		timerType = "personal_task"
		confidence = 0.55
		reasoning = append(reasoning, "浮动计时器启动")

	default:
		timerType = "personal_task"
		confidence = 0.50
		reasoning = append(reasoning, "未知上下文，默认个人任务")
	}

	// 根据最近历史调整
	if len(ctx.RecentHistory) > 0 {
		recentType := ctx.RecentHistory[0].TargetType
		if recentType == timerType {
			confidence = math.Min(confidence+0.1, 0.9)
			reasoning = append(reasoning, "与最近使用的计时器类型一致")
		}
	}

	return InferenceResult{
		Type:       timerType,
		Confidence: confidence,
		Reasoning:  reasoning,
	}
}

// combineInferenceResults 综合多个推断结果
func (e *typeInferenceEngineImpl) combineInferenceResults(results []InferenceResult, model *UserBehaviorModel) InferenceResult {
	if len(results) == 0 {
		return InferenceResult{
			Type:       "personal_task",
			Confidence: 0.5,
			Reasoning:  []string{"无推断结果，使用默认"},
		}
	}

	// 加权平均计算
	weights := []float64{0.4, 0.35, 0.25} // 规则、ML、上下文权重
	typeScores := make(map[string]float64)
	allReasonings := make([]string, 0)

	for i, result := range results {
		if i < len(weights) {
			weight := weights[i]
			typeScores[result.Type] += result.Confidence * weight
			allReasonings = append(allReasonings, result.Reasoning...)
		}
	}

	// 找出最高分数的类型
	var bestType string
	var bestScore float64
	for timerType, score := range typeScores {
		if score > bestScore {
			bestScore = score
			bestType = timerType
		}
	}

	// 应用用户历史准确率调整
	if model != nil && model.SampleSize > 5 {
		if accuracy, exists := model.AccuracyByFeature[bestType]; exists {
			bestScore = bestScore * (0.5 + accuracy*0.5) // 历史准确率调整
		}
	}

	// 确保置信度在合理范围内
	bestScore = math.Max(0.1, math.Min(bestScore, 0.95))

	return InferenceResult{
		Type:       bestType,
		Confidence: bestScore,
		Reasoning:  e.deduplicateReasonings(allReasonings),
	}
}

// inferCategory 推断分类
func (e *typeInferenceEngineImpl) inferCategory(title string, model *UserBehaviorModel) string {
	title = strings.ToLower(title)
	
	// 基于关键词匹配
	for category, keywords := range e.keywordCategories {
		for _, keyword := range keywords {
			if strings.Contains(title, keyword) {
				return category
			}
		}
	}

	// 基于用户历史偏好
	if model != nil && len(model.CategoryPreferences) > 0 {
		var bestCategory string
		var bestScore float64
		for category, score := range model.CategoryPreferences {
			if score > bestScore {
				bestScore = score
				bestCategory = category
			}
		}
		if bestCategory != "" {
			return bestCategory
		}
	}

	return "其他"
}

// estimateDuration 预估时长
func (e *typeInferenceEngineImpl) estimateDuration(timerType, category string, model *UserBehaviorModel) int {
	// 默认时长(分钟)
	defaultDurations := map[string]int{
		"pomodoro":      25,
		"quick_timer":   15,
		"personal_task": 60,
		"project_task":  90,
	}

	baseDuration := defaultDurations[timerType]
	if baseDuration == 0 {
		baseDuration = 60 // 默认1小时
	}

	// 根据分类调整
	categoryMultipliers := map[string]float64{
		"开发": 1.5,
		"会议": 0.8,
		"学习": 1.2,
		"设计": 1.3,
		"测试": 1.1,
		"写作": 1.0,
		"休息": 0.3,
	}

	if multiplier, exists := categoryMultipliers[category]; exists {
		baseDuration = int(float64(baseDuration) * multiplier)
	}

	return baseDuration
}

// 辅助方法
func (e *typeInferenceEngineImpl) extractKeywords(title string) []string {
	// 简单的关键词提取
	title = strings.ToLower(title)
	// 移除标点符号
	reg := regexp.MustCompile(`[^\p{L}\p{N}\s]+`)
	title = reg.ReplaceAllString(title, " ")
	
	words := strings.Fields(title)
	var keywords []string
	for _, word := range words {
		if len(word) > 1 { // 过滤单个字符
			keywords = append(keywords, word)
		}
	}
	return keywords
}

func (e *typeInferenceEngineImpl) isPomodoroKeywords(keywords []string) bool {
	pomodoroKeywords := []string{"番茄", "pomodoro", "专注", "25分钟", "专注时间"}
	for _, keyword := range keywords {
		for _, pKeyword := range pomodoroKeywords {
			if strings.Contains(keyword, pKeyword) {
				return true
			}
		}
	}
	return false
}

func (e *typeInferenceEngineImpl) isWorkRelatedKeywords(keywords []string) bool {
	workKeywords := []string{"代码", "开发", "会议", "项目", "任务", "工作", "bug", "测试", "设计"}
	for _, keyword := range keywords {
		for _, wKeyword := range workKeywords {
			if strings.Contains(keyword, wKeyword) {
				return true
			}
		}
	}
	return false
}

func (e *typeInferenceEngineImpl) isWorkingHours(hour int) bool {
	return hour >= 9 && hour <= 18
}

func (e *typeInferenceEngineImpl) deduplicateReasonings(reasonings []string) []string {
	seen := make(map[string]bool)
	var result []string
	for _, reasoning := range reasonings {
		if !seen[reasoning] {
			seen[reasoning] = true
			result = append(result, reasoning)
		}
	}
	return result
}

func (e *typeInferenceEngineImpl) calculateUserActivityScore(ctx context.Context, userID int) float64 {
	// 查询用户最近7天的活动度
	query := `
		SELECT COUNT(*) as daily_timers
		FROM unified_timer_logs 
		WHERE user_id = $1 
			AND created_at >= NOW() - INTERVAL '7 days'
			AND status IN ('completed', 'cancelled')
	`
	
	var dailyTimers int
	e.db.QueryRowContext(ctx, query, userID).Scan(&dailyTimers)
	
	// 简单的活动度评分：每天平均计时次数 / 10 (最高1.0)
	return math.Min(float64(dailyTimers)/7.0/10.0, 1.0)
}

func (e *typeInferenceEngineImpl) calculateRecentPatternScore(recentHistory []*TimerRecord) float64 {
	if len(recentHistory) == 0 {
		return 0.0
	}
	
	// 分析最近的计时模式
	typeCount := make(map[string]int)
	for _, record := range recentHistory {
		typeCount[record.TargetType]++
	}
	
	// 返回最常用类型的比例
	var maxCount int
	for _, count := range typeCount {
		if count > maxCount {
			maxCount = count
		}
	}
	
	return float64(maxCount) / float64(len(recentHistory))
}

func (e *typeInferenceEngineImpl) calculateCategoryFrequency(ctx context.Context, userID int) map[string]float64 {
	query := `
		SELECT category, COUNT(*) as count
		FROM unified_timer_logs 
		WHERE user_id = $1 
			AND created_at >= NOW() - INTERVAL '30 days'
			AND category IS NOT NULL
		GROUP BY category
	`
	
	rows, err := e.db.QueryContext(ctx, query, userID)
	if err != nil {
		return make(map[string]float64)
	}
	defer rows.Close()
	
	frequency := make(map[string]float64)
	var total int
	
	for rows.Next() {
		var category string
		var count int
		if err := rows.Scan(&category, &count); err == nil {
			frequency[category] = float64(count)
			total += count
		}
	}
	
	// 转换为频率
	for category, count := range frequency {
		frequency[category] = count / float64(total)
	}
	
	return frequency
}

func (e *typeInferenceEngineImpl) getEstimatedDuration(timerType string, model *UserBehaviorModel) int {
	// 先尝试从用户模型获取平均时长
	if model != nil && model.AvgDuration != nil {
		if avgSeconds, exists := model.AvgDuration[timerType]; exists && avgSeconds > 0 {
			return int(avgSeconds / 60) // 转换为分钟
		}
	}
	
	// 使用默认时长
	defaultDurations := map[string]int{
		"pomodoro":      25,
		"quick_timer":   15,
		"personal_task": 60,
		"project_task":  90,
	}
	
	if duration, exists := defaultDurations[timerType]; exists {
		return duration
	}
	
	return 60 // 默认1小时
}

func (e *typeInferenceEngineImpl) getUserBehaviorModel(ctx context.Context, userID int) (*UserBehaviorModel, error) {
	// 先检查缓存
	if model, exists := e.behaviorModels[userID]; exists {
		// 检查是否需要更新（每天更新一次）
		if time.Since(model.LastUpdated) < 24*time.Hour {
			return model, nil
		}
	}

	// 从数据库构建行为模型
	model := &UserBehaviorModel{
		UserID:              userID,
		PreferredTimerTypes: make(map[string]float64),
		CategoryPreferences: make(map[string]float64),
		TimePatterns:        make(map[string]map[string]float64),
		ContextPatterns:     make(map[string]map[string]float64),
		AccuracyByFeature:   make(map[string]float64),
		AvgDuration:         make(map[string]float64),
		LastUpdated:         time.Now(),
	}

	// 查询用户历史数据
	query := `
		SELECT 
			target_type, category, 
			EXTRACT(HOUR FROM start_time) as hour,
			target_metadata->>'context' as context,
			inference_confidence,
			user_feedback,
			COALESCE(actual_work_seconds, duration_seconds, 0) as duration
		FROM unified_timer_logs 
		WHERE user_id = $1 
			AND created_at >= NOW() - INTERVAL '90 days'
			AND status IN ('completed', 'cancelled')
		ORDER BY created_at DESC
		LIMIT 1000
	`

	rows, err := e.db.QueryContext(ctx, query, userID)
	if err != nil {
		return model, err
	}
	defer rows.Close()

	var sampleSize int
	typeCount := make(map[string]int)
	categoryCount := make(map[string]int)
	hourTypeCount := make(map[int]map[string]int)
	contextTypeCount := make(map[string]map[string]int)
	accuracySum := make(map[string]float64)
	accuracyCount := make(map[string]int)
	durationSum := make(map[string]float64)
	durationCount := make(map[string]int)

	for rows.Next() {
		var targetType, category, context string
		var hour int
		var confidence float64
		var feedback *int
		var duration int

		err := rows.Scan(&targetType, &category, &hour, &context, &confidence, &feedback, &duration)
		if err != nil {
			continue
		}

		sampleSize++
		typeCount[targetType]++
		
		if category != "" {
			categoryCount[category]++
		}

		// 时长统计
		if duration > 0 {
			durationSum[targetType] += float64(duration)
			durationCount[targetType]++
		}

		// 时间模式
		if hourTypeCount[hour] == nil {
			hourTypeCount[hour] = make(map[string]int)
		}
		hourTypeCount[hour][targetType]++

		// 上下文模式
		if context != "" {
			if contextTypeCount[context] == nil {
				contextTypeCount[context] = make(map[string]int)
			}
			contextTypeCount[context][targetType]++
		}

		// 准确率统计（基于用户反馈）
		if feedback != nil && *feedback >= 3 { // 3分以上认为准确
			accuracySum[targetType] += 1.0
		}
		accuracyCount[targetType]++
	}

	model.SampleSize = sampleSize

	// 转换为概率
	for timerType, count := range typeCount {
		model.PreferredTimerTypes[timerType] = float64(count) / float64(sampleSize)
	}

	totalCategories := 0
	for _, count := range categoryCount {
		totalCategories += count
	}
	for category, count := range categoryCount {
		if totalCategories > 0 {
			model.CategoryPreferences[category] = float64(count) / float64(totalCategories)
		}
	}

	// 时间模式
	for hour, typeMap := range hourTypeCount {
		hourKey := fmt.Sprintf("%d", hour)
		model.TimePatterns[hourKey] = make(map[string]float64)
		total := 0
		for _, count := range typeMap {
			total += count
		}
		for timerType, count := range typeMap {
			model.TimePatterns[hourKey][timerType] = float64(count) / float64(total)
		}
	}

	// 上下文模式
	for context, typeMap := range contextTypeCount {
		model.ContextPatterns[context] = make(map[string]float64)
		total := 0
		for _, count := range typeMap {
			total += count
		}
		for timerType, count := range typeMap {
			model.ContextPatterns[context][timerType] = float64(count) / float64(total)
		}
	}

	// 准确率
	for timerType, sum := range accuracySum {
		if count := accuracyCount[timerType]; count > 0 {
			model.AccuracyByFeature[timerType] = sum / float64(count)
		}
	}

	// 平均时长
	for timerType, sum := range durationSum {
		if count := durationCount[timerType]; count > 0 {
			model.AvgDuration[timerType] = sum / float64(count)
		}
	}

	// 缓存模型
	e.behaviorModels[userID] = model

	return model, nil
}

// GenerateSmartSuggestions 生成智能建议
func (e *typeInferenceEngineImpl) GenerateSmartSuggestions(ctx context.Context, userID int, context string) ([]*TimerSuggestion, error) {
	// 获取用户行为模型
	model, err := e.getUserBehaviorModel(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("获取用户行为模型失败: %v", err)
	}

	var suggestions []*TimerSuggestion

	// 基于上下文生成建议
	if patterns, exists := model.ContextPatterns[context]; exists {
		for timerType, probability := range patterns {
			if probability > 0.1 { // 只推荐概率大于10%的类型
				suggestion := &TimerSuggestion{
					Type:              timerType,
					Title:             fmt.Sprintf("基于%s上下文的%s任务", context, timerType),
					Confidence:        probability,
					EstimatedDuration: e.getEstimatedDuration(timerType, model), // 转换为分钟
					Category:          timerType,
				}
				suggestions = append(suggestions, suggestion)
			}
		}
	}

	// 基于时间模式生成建议
	currentHour := time.Now().Hour()
	hourStr := fmt.Sprintf("%d", currentHour)
	if timePatterns, exists := model.TimePatterns[hourStr]; exists {
		for timerType, probability := range timePatterns {
			if probability > 0.15 { // 时间模式要求更高的概率
				suggestion := &TimerSuggestion{
					Type:              timerType,
					Title:             fmt.Sprintf("适合当前时间的%s任务", timerType),
					Confidence:        probability,
					EstimatedDuration: e.getEstimatedDuration(timerType, model),
					Category:          timerType,
					Reason:            fmt.Sprintf("您通常在%d点执行此类任务", currentHour),
				}
				suggestions = append(suggestions, suggestion)
			}
		}
	}

	// 如果没有足够的建议，添加默认建议
	if len(suggestions) == 0 {
		defaultSuggestions := []*TimerSuggestion{
			{
				Type:              "开发",
				Title:             "开发任务",
				Confidence:        0.8,
				EstimatedDuration: 30,
				Category:          "开发",
				Reason:            "开发是最常见的任务类型",
			},
			{
				Type:              "学习",
				Title:             "学习任务",
				Confidence:        0.6,
				EstimatedDuration: 25,
				Category:          "学习",
				Reason:            "持续学习有助于技能提升",
			},
		}
		suggestions = append(suggestions, defaultSuggestions...)
	}

	return suggestions, nil
}

// LearnFromFeedback 从用户反馈中学习
func (e *typeInferenceEngineImpl) LearnFromFeedback(ctx context.Context, timerID int, userFeedback int) error {
	// 更新计时器记录的用户反馈
	query := `
		UPDATE unified_timer_logs 
		SET user_feedback = $1, updated_at = NOW()
		WHERE id = $2
	`
	
	_, err := e.db.ExecContext(ctx, query, userFeedback, timerID)
	if err != nil {
		return fmt.Errorf("更新用户反馈失败: %v", err)
	}

	// 获取计时器记录的用户ID以更新行为模型
	var userID int
	err = e.db.QueryRowContext(ctx, 
		"SELECT user_id FROM unified_timer_logs WHERE id = $1", 
		timerID).Scan(&userID)
	if err != nil {
		return fmt.Errorf("获取用户ID失败: %v", err)
	}

	// 触发用户行为模型更新
	err = e.UpdateUserBehaviorModel(ctx, userID)
	if err != nil {
		return fmt.Errorf("更新用户行为模型失败: %v", err)
	}

	return nil
}

// UpdateUserBehaviorModel 更新用户行为模型
func (e *typeInferenceEngineImpl) UpdateUserBehaviorModel(ctx context.Context, userID int) error {
	// 清除缓存，强制重新构建模型
	delete(e.behaviorModels, userID)
	
	// 重新构建用户行为模型
	_, err := e.getUserBehaviorModel(ctx, userID)
	if err != nil {
		return fmt.Errorf("重建用户行为模型失败: %v", err)
	}

	return nil
}