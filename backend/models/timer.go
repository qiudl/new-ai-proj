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
)

// TaskTimeLog represents a timing session log for a task
type TaskTimeLog struct {
	ID              int       `json:"id" db:"id"`
	TaskID          int       `json:"task_id" db:"task_id" validate:"required"`
	UserID          int       `json:"user_id" db:"user_id" validate:"required"`
	StartTime       time.Time `json:"start_time" db:"start_time" validate:"required"`
	EndTime         *time.Time `json:"end_time,omitempty" db:"end_time"`
	DurationSeconds int       `json:"duration_seconds" db:"duration_seconds"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// TimerStartRequest represents a request to start timing a task
type TimerStartRequest struct {
	TaskID int `json:"task_id" validate:"required"`
}

// TimerStartResponse represents the response when starting a timer
type TimerStartResponse struct {
	TaskID      int       `json:"task_id"`
	TaskTitle   string    `json:"task_title"`
	StartTime   time.Time `json:"start_time"`
	Status      string    `json:"status"`
	Message     string    `json:"message"`
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
	IsRunning       bool      `json:"is_running"`
	TaskID          *int      `json:"task_id,omitempty"`
	TaskTitle       *string   `json:"task_title,omitempty"`
	StartTime       *time.Time `json:"start_time,omitempty"`
	ElapsedSeconds  int       `json:"elapsed_seconds"`
	FormattedTime   string    `json:"formatted_time"`
}

// TimerStatsResponse represents timer statistics
type TimerStatsResponse struct {
	TodayTotalSeconds    int                   `json:"today_total_seconds"`
	TodayFormattedTime   string                `json:"today_formatted_time"`
	CompletedTasksToday  int                   `json:"completed_tasks_today"`
	InProgressTasks      int                   `json:"in_progress_tasks"`
	RecentTasks          []RecentTimedTask     `json:"recent_tasks"`
	TaskTimeBreakdown    []TaskTimeBreakdown   `json:"task_time_breakdown"`
}

// RecentTimedTask represents a recently timed task
type RecentTimedTask struct {
	TaskID          int    `json:"task_id"`
	TaskTitle       string `json:"task_title"`
	ProjectName     string `json:"project_name"`
	LastTimedAt     time.Time `json:"last_timed_at"`
	TotalSeconds    int    `json:"total_seconds"`
	FormattedTime   string `json:"formatted_time"`
	Status          string `json:"status"`
}

// TaskTimeBreakdown represents time breakdown by task
type TaskTimeBreakdown struct {
	TaskID        int    `json:"task_id"`
	TaskTitle     string `json:"task_title"`
	ProjectName   string `json:"project_name"`
	TotalSeconds  int    `json:"total_seconds"`
	FormattedTime string `json:"formatted_time"`
}

// UserTimerState represents the current timer state for a user
type UserTimerState struct {
	UserID               int           `json:"user_id" db:"user_id"`
	CurrentTimingTaskID  *int          `json:"current_timing_task_id" db:"current_timing_task_id"`
	TimingStartTime      *time.Time    `json:"timing_start_time" db:"timing_start_time"`
	TimingStatus         TimingStatus  `json:"timing_status" db:"timing_status"`
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
	}
	
	for _, validStatus := range validStatuses {
		if TimingStatus(status) == validStatus {
			return true
		}
	}
	return false
}