package models

import (
	"time"
)

// UserTimerTask represents a personal timer task for a user
type UserTimerTask struct {
	ID                 int          `json:"id" db:"id"`
	UserID             int          `json:"user_id" db:"user_id" validate:"required"`
	Title              string       `json:"title" db:"title" validate:"required,min=1,max=255"`
	Description        string       `json:"description" db:"description"`
	Category           string       `json:"category" db:"category" validate:"oneof=personal work study fitness hobby"`
	Priority           string       `json:"priority" db:"priority" validate:"oneof=low medium high"`
	Status             string       `json:"status" db:"status" validate:"oneof=active paused completed archived"`
	Color              string       `json:"color" db:"color" validate:"hexcolor"`
	IsFavorite         bool         `json:"is_favorite" db:"is_favorite"`
	TotalTimeSeconds   int          `json:"total_time_seconds" db:"total_time_seconds"`
	TargetTimeSeconds  int          `json:"target_time_seconds" db:"target_time_seconds"`
	Tags               StringArray  `json:"tags" db:"tags"`
	Metadata           CustomFields `json:"metadata" db:"metadata"`
	CreatedAt          time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at" db:"updated_at"`
	DeletedAt          *time.Time   `json:"deleted_at,omitempty" db:"deleted_at"`
}

// Note: StringArray is already defined in audit_log.go, reusing that type

// UserTimerTaskRequest represents a request to create/update a personal timer task
type UserTimerTaskRequest struct {
	Title             string       `json:"title" validate:"required,min=1,max=255"`
	Description       string       `json:"description"`
	Category          string       `json:"category" validate:"oneof=personal work study fitness hobby"`
	Priority          string       `json:"priority" validate:"oneof=low medium high"`
	Color             string       `json:"color" validate:"hexcolor"`
	IsFavorite        bool         `json:"is_favorite"`
	TargetTimeSeconds int          `json:"target_time_seconds" validate:"min=0"`
	Tags              []string     `json:"tags"`
	Metadata          CustomFields `json:"metadata"`
}

// UserTimerTaskResponse represents a personal timer task response with additional info
type UserTimerTaskResponse struct {
	UserTimerTask
	FormattedTotalTime   string     `json:"formatted_total_time"`
	FormattedTargetTime  string     `json:"formatted_target_time"`
	CompletionPercent    float64    `json:"completion_percent"`
	LastTimedAt          *time.Time `json:"last_timed_at,omitempty"`
	TimesCount           int        `json:"times_count"`           // 计时次数
	AverageSessionTime   int        `json:"average_session_time"`  // 平均每次计时时长
	TodayTimeSeconds     int        `json:"today_time_seconds"`    // 今日计时时长
	WeekTimeSeconds      int        `json:"week_time_seconds"`     // 本周计时时长
}

// PersonalTimerDashboard represents the personal timer dashboard data
type PersonalTimerDashboard struct {
	// 当前计时状态
	CurrentTimer     *PersonalTimerCurrent    `json:"current_timer"`
	
	// 今日统计
	TodayStats       PersonalTimerTodayStats  `json:"today_stats"`
	
	// 个人计时任务
	TimerTasks       []UserTimerTaskResponse  `json:"timer_tasks"`
	
	// 最近计时历史
	RecentSessions   []PersonalTimerSession   `json:"recent_sessions"`
	
	// 收藏的任务
	FavoriteTasks    []UserTimerTaskResponse  `json:"favorite_tasks"`
	
	// 统计摘要
	Summary          PersonalTimerSummary     `json:"summary"`
}

// PersonalTimerCurrent represents the current personal timer status
type PersonalTimerCurrent struct {
	IsRunning         bool      `json:"is_running"`
	TaskType          string    `json:"task_type"` // "project" | "personal"
	TaskID            *int      `json:"task_id,omitempty"`
	TaskTitle         *string   `json:"task_title,omitempty"`
	TaskColor         *string   `json:"task_color,omitempty"`
	TaskCategory      *string   `json:"task_category,omitempty"`
	StartTime         *time.Time `json:"start_time,omitempty"`
	ElapsedSeconds    int       `json:"elapsed_seconds"`
	FormattedTime     string    `json:"formatted_time"`
}

// PersonalTimerTodayStats represents today's personal timer statistics
type PersonalTimerTodayStats struct {
	TotalSeconds       int      `json:"total_seconds"`
	FormattedTime      string   `json:"formatted_time"`
	SessionsCount      int      `json:"sessions_count"`
	TasksWorkedOn      int      `json:"tasks_worked_on"`
	MostWorkedTask     string   `json:"most_worked_task"`
	ProductiveHours    []int    `json:"productive_hours"` // 每小时的工作时长（24个元素）
	EfficiencyScore    float64  `json:"efficiency_score"` // 效率评分 (0-100)
	LongestSession     int      `json:"longest_session"`  // 最长单次计时（秒）
}

// PersonalTimerSession represents a personal timer session
type PersonalTimerSession struct {
	ID                int        `json:"id"`
	TaskType          string     `json:"task_type"` // "project" | "personal"
	TaskID            *int       `json:"task_id,omitempty"`
	TaskTitle         string     `json:"task_title"`
	TaskColor         string     `json:"task_color"`
	TaskCategory      string     `json:"task_category"`
	StartTime         time.Time  `json:"start_time"`
	EndTime           *time.Time `json:"end_time,omitempty"`
	DurationSeconds   int        `json:"duration_seconds"`
	FormattedTime     string     `json:"formatted_time"`
	Date              string     `json:"date"`
	WeekDay           string     `json:"week_day"`
}

// PersonalTimerSummary represents personal timer summary statistics
type PersonalTimerSummary struct {
	TotalTasks        int     `json:"total_tasks"`
	ActiveTasks       int     `json:"active_tasks"`
	CompletedTasks    int     `json:"completed_tasks"`
	FavoriteTasks     int     `json:"favorite_tasks"`
	TotalTimeSeconds  int     `json:"total_time_seconds"`
	FormattedTotalTime string `json:"formatted_total_time"`
	AverageDaily      int     `json:"average_daily_seconds"`
	MostProductiveDay string  `json:"most_productive_day"`
	MostUsedCategory  string  `json:"most_used_category"`
}

// PersonalTimerStartRequest represents a request to start personal timer
type PersonalTimerStartRequest struct {
	TaskType        string `json:"task_type" validate:"required,oneof=personal project"`
	TaskID          int    `json:"task_id" validate:"required"`
	AutoStopOthers  bool   `json:"auto_stop_others"` // 是否自动停止其他计时
}

// PersonalTimerAnalytics represents personal timer analytics data
type PersonalTimerAnalytics struct {
	DateRange         string                      `json:"date_range"`
	TotalTime         PersonalTimeAnalytics       `json:"total_time"`
	CategoryBreakdown []PersonalCategoryAnalytics `json:"category_breakdown"`
	WeeklyTrend       []PersonalWeeklyTrend       `json:"weekly_trend"`
	ProductivityScore PersonalProductivityScore   `json:"productivity_score"`
	Recommendations   []string                    `json:"recommendations"`
}

// PersonalTimeAnalytics represents time analytics
type PersonalTimeAnalytics struct {
	TotalSeconds      int     `json:"total_seconds"`
	FormattedTime     string  `json:"formatted_time"`
	DailyAverage      int     `json:"daily_average_seconds"`
	WeeklyAverage     int     `json:"weekly_average_seconds"`
	GrowthRate        float64 `json:"growth_rate_percent"`
}

// PersonalCategoryAnalytics represents category-based analytics
type PersonalCategoryAnalytics struct {
	Category          string  `json:"category"`
	TotalSeconds      int     `json:"total_seconds"`
	FormattedTime     string  `json:"formatted_time"`
	Percentage        float64 `json:"percentage"`
	TaskCount         int     `json:"task_count"`
	AveragePerTask    int     `json:"average_per_task_seconds"`
	Color             string  `json:"color"`
}

// PersonalWeeklyTrend represents weekly trend data
type PersonalWeeklyTrend struct {
	WeekStart         string  `json:"week_start"`
	WeekEnd           string  `json:"week_end"`
	TotalSeconds      int     `json:"total_seconds"`
	FormattedTime     string  `json:"formatted_time"`
	SessionsCount     int     `json:"sessions_count"`
	TasksCount        int     `json:"tasks_count"`
	ComparisonPercent float64 `json:"comparison_percent"` // 与上周比较
}

// PersonalProductivityScore represents productivity scoring
type PersonalProductivityScore struct {
	OverallScore      float64                    `json:"overall_score"`      // 0-100
	ConsistencyScore  float64                    `json:"consistency_score"`  // 0-100
	FocusScore        float64                    `json:"focus_score"`        // 0-100
	EfficiencyScore   float64                    `json:"efficiency_score"`   // 0-100
	ScoreFactors      []PersonalScoreFactor      `json:"score_factors"`
	WeeklyScores      []PersonalWeeklyScore      `json:"weekly_scores"`
}

// PersonalScoreFactor represents factors affecting productivity score
type PersonalScoreFactor struct {
	Factor            string  `json:"factor"`
	Score             float64 `json:"score"`
	Impact            string  `json:"impact"`     // "positive" | "negative" | "neutral"
	Description       string  `json:"description"`
}

// PersonalWeeklyScore represents weekly productivity scores
type PersonalWeeklyScore struct {
	WeekStart         string  `json:"week_start"`
	OverallScore      float64 `json:"overall_score"`
	ConsistencyScore  float64 `json:"consistency_score"`
	FocusScore        float64 `json:"focus_score"`
	EfficiencyScore   float64 `json:"efficiency_score"`
}

// UserTimerFilter represents filtering options for user timer tasks
type UserTimerFilter struct {
	Category    string `form:"category"`
	Status      string `form:"status"`
	Priority    string `form:"priority"`
	IsFavorite  *bool  `form:"is_favorite"`
	Search      string `form:"search"`
	SortBy      string `form:"sort_by"`      // "created_at", "updated_at", "total_time", "title"
	SortOrder   string `form:"sort_order"`   // "asc", "desc"
}

// ToResponse converts UserTimerTask to UserTimerTaskResponse
func (utt *UserTimerTask) ToResponse() UserTimerTaskResponse {
	response := UserTimerTaskResponse{
		UserTimerTask:       *utt,
		FormattedTotalTime:  FormatDuration(utt.TotalTimeSeconds),
		FormattedTargetTime: FormatDuration(utt.TargetTimeSeconds),
	}
	
	// 计算完成百分比
	if utt.TargetTimeSeconds > 0 {
		response.CompletionPercent = float64(utt.TotalTimeSeconds) / float64(utt.TargetTimeSeconds) * 100
		if response.CompletionPercent > 100 {
			response.CompletionPercent = 100
		}
	}
	
	return response
}

// ToResponseWithStats converts UserTimerTask to UserTimerTaskResponse with additional statistics
func (utt *UserTimerTask) ToResponseWithStats(lastTimedAt *time.Time, timesCount, averageSessionTime, todayTime, weekTime int) UserTimerTaskResponse {
	response := utt.ToResponse()
	response.LastTimedAt = lastTimedAt
	response.TimesCount = timesCount
	response.AverageSessionTime = averageSessionTime
	response.TodayTimeSeconds = todayTime
	response.WeekTimeSeconds = weekTime
	return response
}

// IsActive returns true if the task is in active status
func (utt *UserTimerTask) IsActive() bool {
	return utt.Status == "active" && utt.DeletedAt == nil
}

// IsCompleted returns true if the task is completed
func (utt *UserTimerTask) IsCompleted() bool {
	return utt.Status == "completed"
}

// GetProgressPercent returns the progress percentage if target time is set
func (utt *UserTimerTask) GetProgressPercent() float64 {
	if utt.TargetTimeSeconds <= 0 {
		return 0
	}
	percent := float64(utt.TotalTimeSeconds) / float64(utt.TargetTimeSeconds) * 100
	if percent > 100 {
		return 100
	}
	return percent
}

// UserTimerTaskCategories defines available task categories
var UserTimerTaskCategories = []string{"personal", "work", "study", "fitness", "hobby"}

// UserTimerTaskPriorities defines available task priorities
var UserTimerTaskPriorities = []string{"low", "medium", "high"}

// UserTimerTaskStatuses defines available task statuses
var UserTimerTaskStatuses = []string{"active", "paused", "completed", "archived"}

// DefaultTaskColors defines default colors for different categories
var DefaultTaskColors = map[string]string{
	"personal": "#1890ff",
	"work":     "#52c41a",
	"study":    "#722ed1",
	"fitness":  "#fa8c16",
	"hobby":    "#eb2f96",
}

// GetDefaultColorForCategory returns the default color for a category
func GetDefaultColorForCategory(category string) string {
	if color, exists := DefaultTaskColors[category]; exists {
		return color
	}
	return "#1890ff" // Default blue
}