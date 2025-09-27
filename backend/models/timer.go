package models

import (
	"fmt"
	"time"
)

// TimingStatus represents the timing status enum
type TimingStatus string

const (
	TimingStatusStopped TimingStatus = "stopped"
	TimingStatusRunning TimingStatus = "running"
	TimingStatusPaused  TimingStatus = "paused" // Phase 3: New paused state
)

// TaskTimeLog represents a timing session log for a task
type TaskTimeLog struct {
	ID              int        `json:"id" db:"id"`
	TaskID          *int       `json:"task_id,omitempty" db:"task_id"`                       // Project task ID (optional)
	UserTimerTaskID *int       `json:"user_timer_task_id,omitempty" db:"user_timer_task_id"` // Personal timer task ID (optional)
	UserID          int        `json:"user_id" db:"user_id" validate:"required"`
	StartTime       time.Time  `json:"start_time" db:"start_time" validate:"required"`
	EndTime         *time.Time `json:"end_time,omitempty" db:"end_time"`
	DurationSeconds int        `json:"duration_seconds" db:"duration_seconds"`
	CreatedBy       int        `json:"created_by" db:"created_by"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// TimerStartRequest represents a request to start timing a task
type TimerStartRequest struct {
	TaskID int `json:"task_id" validate:"required"`
}

// TimerStartResponse represents the response when starting a timer
type TimerStartResponse struct {
	TaskID    int       `json:"task_id"`
	TaskTitle string    `json:"task_title"`
	StartTime time.Time `json:"start_time"`
	Status    string    `json:"status"`
	Message   string    `json:"message"`
}

// TimerStopResponse represents the response when stopping a timer
type TimerStopResponse struct {
	TaskID          int    `json:"task_id"`
	TaskTitle       string `json:"task_title"`
	DurationSeconds int    `json:"duration_seconds"`
	FormattedTime   string `json:"formatted_time"`
	Status          string `json:"status"`
	Message         string `json:"message"`
}

// TimerCurrentResponse represents the current timer status
type TimerCurrentResponse struct {
	IsRunning      bool       `json:"is_running"`
	TaskID         *int       `json:"task_id,omitempty"`
	TaskTitle      *string    `json:"task_title,omitempty"`
	StartTime      *time.Time `json:"start_time,omitempty"`
	ElapsedSeconds int        `json:"elapsed_seconds"`
	FormattedTime  string     `json:"formatted_time"`
}

// TimerStatsResponse represents timer statistics
type TimerStatsResponse struct {
	TodayTotalSeconds   int                 `json:"today_total_seconds"`
	TodayFormattedTime  string              `json:"today_formatted_time"`
	CompletedTasksToday int                 `json:"completed_tasks_today"`
	InProgressTasks     int                 `json:"in_progress_tasks"`
	RecentTasks         []RecentTimedTask   `json:"recent_tasks"`
	TaskTimeBreakdown   []TaskTimeBreakdown `json:"task_time_breakdown"`
}

// RecentTimedTask represents a recently timed task
type RecentTimedTask struct {
	TaskID        int       `json:"task_id"`
	TaskTitle     string    `json:"task_title"`
	ProjectName   string    `json:"project_name"`
	LastTimedAt   time.Time `json:"last_timed_at"`
	TotalSeconds  int       `json:"total_seconds"`
	FormattedTime string    `json:"formatted_time"`
	Status        string    `json:"status"`
	IsDeleted     bool      `json:"is_deleted"`
}

// TaskTimeBreakdown represents time breakdown by task
type TaskTimeBreakdown struct {
	TaskID        int    `json:"task_id"`
	TaskTitle     string `json:"task_title"`
	ProjectName   string `json:"project_name"`
	TotalSeconds  int    `json:"total_seconds"`
	FormattedTime string `json:"formatted_time"`
}

// WeeklyReportResponse represents weekly timer report data
type WeeklyReportResponse struct {
	WeeklyStats     WeeklyStatsData     `json:"weekly_stats"`
	DailyStats      []DailyStatsData    `json:"daily_stats"`
	TaskTimeEntries []TaskTimeEntryData `json:"task_time_entries"`
	ProjectStats    []ProjectStatsData  `json:"project_stats"`
}

// WeeklyStatsData represents weekly statistics
type WeeklyStatsData struct {
	TotalHours     float64 `json:"total_hours"`
	CompletedTasks int     `json:"completed_tasks"`
	TotalTasks     int     `json:"total_tasks"`
	Efficiency     float64 `json:"efficiency"`
	WeekStart      string  `json:"week_start"`
	WeekEnd        string  `json:"week_end"`
}

// DailyStatsData represents daily statistics
type DailyStatsData struct {
	Date           string  `json:"date"`
	TotalHours     float64 `json:"total_hours"`
	TasksCompleted int     `json:"tasks_completed"`
	Efficiency     float64 `json:"efficiency"`
	TopTask        string  `json:"top_task"`
}

// TaskTimeEntryData represents task time entry
type TaskTimeEntryData struct {
	ID          string  `json:"id"`
	TaskTitle   string  `json:"task_title"`
	ProjectName string  `json:"project_name"`
	Duration    float64 `json:"duration"`
	Date        string  `json:"date"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	StartTime   string  `json:"start_time"`
}

// ProjectStatsData represents project time statistics
type ProjectStatsData struct {
	ProjectName    string  `json:"project_name"`
	TotalHours     float64 `json:"total_hours"`
	TasksCount     int     `json:"tasks_count"`
	CompletionRate float64 `json:"completion_rate"`
	Color          string  `json:"color"`
}

// UserTimerState represents the current timer state for a user
type UserTimerState struct {
	UserID              int          `json:"user_id" db:"user_id"`
	CurrentTimingTaskID *int         `json:"current_timing_task_id" db:"current_timing_task_id"`
	TimingStartTime     *time.Time   `json:"timing_start_time" db:"timing_start_time"`
	TimingStatus        TimingStatus `json:"timing_status" db:"timing_status"`
}

// FormatDuration formats seconds into HH:MM:SS format
func FormatDuration(seconds int) string {
	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	secs := seconds % 60
	return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, secs)
}

// GetElapsedSeconds calculates elapsed seconds from start time to now
func GetElapsedSeconds(startTime time.Time) int {
	return int(time.Since(startTime).Seconds())
}

// IsValidTimingStatus checks if the timing status is valid
func IsValidTimingStatus(status string) bool {
	validStatuses := []TimingStatus{
		TimingStatusStopped,
		TimingStatusRunning,
		TimingStatusPaused, // Phase 3: Add paused status validation
	}

	for _, validStatus := range validStatuses {
		if TimingStatus(status) == validStatus {
			return true
		}
	}
	return false
}

// DailyComparisonResponse represents the 3-day comparison data response
type DailyComparisonResponse struct {
	Today     DayEfficiencyData   `json:"today"`
	Yesterday DayEfficiencyData   `json:"yesterday"`
	DayBefore DayEfficiencyData   `json:"day_before"`
	Trends    EfficiencyTrends    `json:"trends"`
	Insights  []EfficiencyInsight `json:"insights"`
	UpdatedAt string              `json:"updated_at"`
}

// DayEfficiencyData represents comprehensive efficiency data for a single day
type DayEfficiencyData struct {
	Date                 string                     `json:"date"`
	TotalHours           float64                    `json:"total_hours"`
	TotalSeconds         int                        `json:"total_seconds"`
	CompletedTasks       int                        `json:"completed_tasks"`
	UniqueTasksWorked    int                        `json:"unique_tasks_worked"`
	TimerSessions        int                        `json:"timer_sessions"`
	AvgSessionDuration   int                        `json:"avg_session_duration"`
	EfficiencyIndex      float64                    `json:"efficiency_index"`
	TopTaskTitle         string                     `json:"top_task_title"`
	TopTaskHours         float64                    `json:"top_task_hours"`
	TaskBreakdown        []TaskBreakdownItem        `json:"task_breakdown"`
	HourlyDistribution   []HourlyDistributionItem   `json:"hourly_distribution"`
	FormattedTotalTime   string                     `json:"formatted_total_time"`
	FormattedAvgSession  string                     `json:"formatted_avg_session"`
}

// TaskBreakdownItem represents time breakdown for a specific task in a day
type TaskBreakdownItem struct {
	TaskID        int     `json:"task_id"`
	TaskTitle     string  `json:"task_title"`
	ProjectName   string  `json:"project_name"`
	Priority      string  `json:"priority"`
	Status        string  `json:"status"`
	TotalHours    float64 `json:"total_hours"`
	TotalSeconds  int     `json:"total_seconds"`
	Sessions      int     `json:"sessions"`
	FormattedTime string  `json:"formatted_time"`
}

// HourlyDistributionItem represents work distribution for a specific hour
type HourlyDistributionItem struct {
	Hour         int     `json:"hour"`
	TotalHours   float64 `json:"total_hours"`
	TotalSeconds int     `json:"total_seconds"`
	Sessions     int     `json:"sessions"`
}

// EfficiencyTrends represents trends and changes between days
type EfficiencyTrends struct {
	EfficiencyIndexChange   float64 `json:"efficiency_index_change"`
	TotalHoursChange        float64 `json:"total_hours_change"`
	CompletedTasksChange    float64 `json:"completed_tasks_change"`
	AvgSessionChange        float64 `json:"avg_session_change"`
	WeekTrendDirection      string  `json:"week_trend_direction"` // "improving", "declining", "stable"
}

// EfficiencyInsight represents AI-generated insights about work efficiency
type EfficiencyInsight struct {
	Type        string `json:"type"`        // "positive", "warning", "suggestion", "info"
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`    // "high", "medium", "low"
}
