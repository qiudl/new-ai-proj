package models

// EfficiencyMetrics 效率指标
type EfficiencyMetrics struct {
	Date             string  `json:"date"`               // 日期 YYYY-MM-DD
	TotalWorkMinutes int     `json:"total_work_minutes"` // 总工作时长（分钟）
	TasksCompleted   int     `json:"tasks_completed"`    // 完成任务数
	TasksStarted     int     `json:"tasks_started"`      // 开始的任务数
	FocusTime        int     `json:"focus_time"`         // 专注时长（分钟）
	AvgTaskDuration  float64 `json:"avg_task_duration"`  // 平均任务时长（小时）
	EfficiencyScore  float64 `json:"efficiency_score"`   // 效率得分 0-100
	CompletionRate   float64 `json:"completion_rate"`    // 完成率 0-1
}

// EfficiencyTrend 效率趋势
type EfficiencyTrend struct {
	TimeRange    string              `json:"time_range"`    // 时间范围描述
	StartDate    string              `json:"start_date"`    // 开始日期
	EndDate      string              `json:"end_date"`      // 结束日期
	DailyData    []EfficiencyMetrics `json:"daily_data"`    // 每日数据
	AverageScore float64             `json:"average_score"` // 平均效率得分
	Trend        string              `json:"trend"`         // 趋势：improving/stable/declining
	BestDay      *EfficiencyMetrics  `json:"best_day"`      // 最佳日期
	WorstDay     *EfficiencyMetrics  `json:"worst_day"`     // 最差日期
}

// SmartSuggestion 智能建议
type SmartSuggestion struct {
	ID          string   `json:"id"`           // 建议ID
	Category    string   `json:"category"`     // 类别：time_management/focus/task_breakdown/work_balance
	Priority    string   `json:"priority"`     // 优先级：high/medium/low
	Title       string   `json:"title"`        // 建议标题
	Description string   `json:"description"`  // 详细描述
	Impact      string   `json:"impact"`       // 预期影响
	ActionItems []string `json:"action_items"` // 行动建议
	Icon        string   `json:"icon"`         // 图标emoji
}

// SuggestionsResponse 智能建议响应
type SuggestionsResponse struct {
	Suggestions []SmartSuggestion `json:"suggestions"` // 智能建议列表
	Insights    []string          `json:"insights"`    // 关键洞察
	Summary     string            `json:"summary"`     // 分析摘要
}

// EfficiencyAnalysis 效率分析综合结果
type EfficiencyAnalysis struct {
	Trend       EfficiencyTrend     `json:"trend"`       // 效率趋势
	Suggestions []SmartSuggestion   `json:"suggestions"` // 智能建议
	Insights    []string            `json:"insights"`    // 关键洞察
	Summary     string              `json:"summary"`     // 分析摘要
}
