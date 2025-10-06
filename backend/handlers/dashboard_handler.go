package handlers

import (
	"ai-project-backend/database"
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// DashboardHandler handles dashboard-related requests
type DashboardHandler struct {
	db database.DB
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler(db database.DB) *DashboardHandler {
	return &DashboardHandler{
		db: db,
	}
}

// DashboardWeeklyStatsRequest represents the request for weekly stats
type DashboardWeeklyStatsRequest struct {
	StartDate string `form:"start_date" json:"start_date"`
	EndDate   string `form:"end_date" json:"end_date"`
	ProjectID *int   `form:"project_id" json:"project_id"`
	UserID    *int   `form:"user_id" json:"user_id"`
}

// DashboardWeeklyStatsResponse represents the weekly dashboard statistics
type DashboardWeeklyStatsResponse struct {
	DateRange            DateRange             `json:"date_range"`
	Summary              WeeklySummary         `json:"summary"`
	TaskStats            TaskStatsByStatus     `json:"task_stats"`
	ProjectStats         []ProjectStatsItem    `json:"project_stats"`
	DailyStats           []DailyStatsItem      `json:"daily_stats"`
	TopTasks             []TaskSummaryItem     `json:"top_tasks"`
	Trends               WeeklyTrends          `json:"trends"`
	PriorityDistribution PriorityDistribution  `json:"priority_distribution"`
}

// DateRange represents a date period
type DateRange struct {
	StartDate  string `json:"start_date"`
	EndDate    string `json:"end_date"`
	WeekNumber int    `json:"week_number"`
	Year       int    `json:"year"`
}

// WeeklySummary represents overall weekly statistics
type WeeklySummary struct {
	TotalTasks       int     `json:"total_tasks"`
	CompletedTasks   int     `json:"completed_tasks"`
	InProgressTasks  int     `json:"in_progress_tasks"`
	PendingTasks     int     `json:"pending_tasks"`
	OverdueTasks     int     `json:"overdue_tasks"`
	CompletionRate   float64 `json:"completion_rate"`
	ProjectsInvolved int     `json:"projects_involved"`
}

// TaskStatsByStatus represents task statistics grouped by status
type TaskStatsByStatus struct {
	Draft      int `json:"draft"`
	Planning   int `json:"planning"`
	Todo       int `json:"todo"`
	InProgress int `json:"in_progress"`
	Testing    int `json:"testing"`
	Completed  int `json:"completed"`
	Cancelled  int `json:"cancelled"`
	OnHold     int `json:"on_hold"`
	Blocked    int `json:"blocked"`
	Archived   int `json:"archived"`
}

// ProjectStatsItem represents statistics for a single project
type ProjectStatsItem struct {
	ProjectID      int     `json:"project_id"`
	ProjectName    string  `json:"project_name"`
	TaskCount      int     `json:"task_count"`
	CompletedCount int     `json:"completed_count"`
	CompletionRate float64 `json:"completion_rate"`
}

// DailyStatsItem represents statistics for a single day
type DailyStatsItem struct {
	Date           string `json:"date"`
	TasksCreated   int    `json:"tasks_created"`
	TasksCompleted int    `json:"tasks_completed"`
	TasksUpdated   int    `json:"tasks_updated"`
}

// TaskSummaryItem represents a summary of an important task
type TaskSummaryItem struct {
	ID          int     `json:"id"`
	ProjectID   int     `json:"project_id"`
	ProjectName string  `json:"project_name"`
	Title       string  `json:"title"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	DueDate     *string `json:"due_date"`
	UpdatedAt   string  `json:"updated_at"`
	WorkHours   float64 `json:"work_hours"` // Total work hours from time logs
}

// WeeklyTrends represents trend data compared to previous periods
type WeeklyTrends struct {
	TaskCreationTrend   float64 `json:"task_creation_trend"`   // % change from last week
	CompletionRateTrend float64 `json:"completion_rate_trend"` // % change from last week
	ProductivityTrend   string  `json:"productivity_trend"`    // "improving", "stable", "declining"
}

// PriorityDistribution represents task count grouped by priority
type PriorityDistribution struct {
	Urgent int `json:"urgent"`
	High   int `json:"high"`
	Medium int `json:"medium"`
	Low    int `json:"low"`
}

// GetWeeklyStats handles GET /api/v1/dashboard/weekly-stats
func (h *DashboardHandler) GetWeeklyStats(c *gin.Context) {
	var req DashboardWeeklyStatsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request parameters",
			"details": err.Error(),
		})
		return
	}

	// Default to current week if no date range provided
	if req.StartDate == "" || req.EndDate == "" {
		now := time.Now()
		// Get start of week (Monday)
		weekday := int(now.Weekday())
		if weekday == 0 { // Sunday
			weekday = 7
		}
		startOfWeek := now.AddDate(0, 0, -(weekday - 1))
		endOfWeek := startOfWeek.AddDate(0, 0, 6)

		req.StartDate = startOfWeek.Format("2006-01-02")
		req.EndDate = endOfWeek.Format("2006-01-02")
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid start_date format, expected YYYY-MM-DD",
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid end_date format, expected YYYY-MM-DD",
		})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	uid, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// If user_id is specified in query, use it (for admin users)
	if req.UserID != nil {
		uid = *req.UserID
	}

	// Get dashboard statistics
	stats, err := h.getDashboardWeeklyStats(uid, startDate, endDate, req.ProjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get dashboard statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// getDashboardWeeklyStats fetches comprehensive dashboard statistics
func (h *DashboardHandler) getDashboardWeeklyStats(userID int, startDate, endDate time.Time, projectID *int) (*DashboardWeeklyStatsResponse, error) {
	// Initialize response
	stats := &DashboardWeeklyStatsResponse{
		DateRange: DateRange{
			StartDate:  startDate.Format("2006-01-02"),
			EndDate:    endDate.Format("2006-01-02"),
			WeekNumber: getWeekNumber(startDate),
			Year:       startDate.Year(),
		},
	}

	// Build base query conditions
	var projectFilter string
	var args []interface{}
	argIndex := 1

	args = append(args, startDate, endDate, startDate, endDate, startDate, endDate)
	// 改进的时间筛选逻辑：任务在指定时间范围内创建、到期或有重要更新
	timeFilter := "(" +
		"(t.created_at >= $" + strconv.Itoa(argIndex) + " AND t.created_at <= $" + strconv.Itoa(argIndex+1) + ") OR " +
		"(t.due_date >= $" + strconv.Itoa(argIndex+2) + " AND t.due_date <= $" + strconv.Itoa(argIndex+3) + ") OR " +
		"(t.updated_at >= $" + strconv.Itoa(argIndex+4) + " AND t.updated_at <= $" + strconv.Itoa(argIndex+5) + " AND t.status = 'completed')" +
		")"
	argIndex += 6

	if projectID != nil {
		args = append(args, *projectID)
		projectFilter = " AND t.project_id = $" + strconv.Itoa(argIndex)
		argIndex++
	}

	// Get database connection
	db := h.db.GetDB().(*sql.DB)

	// 1. Get summary statistics
	summaryQuery := `
		SELECT 
			COUNT(*) as total_tasks,
			COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
			COUNT(CASE WHEN t.status IN ('in_progress', 'testing') THEN 1 END) as in_progress_tasks,
			COUNT(CASE WHEN t.status IN ('draft', 'planning', 'todo') THEN 1 END) as pending_tasks,
			COUNT(CASE WHEN t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled', 'archived') THEN 1 END) as overdue_tasks,
			COUNT(DISTINCT t.project_id) as projects_involved
		FROM tasks t 
		JOIN projects p ON t.project_id = p.id 
		WHERE t.deleted_at IS NULL 
		AND p.deleted_at IS NULL 
		AND t.status NOT IN ('cancelled', 'archived')
		AND ` + timeFilter + projectFilter

	err := db.QueryRow(summaryQuery, args...).Scan(
		&stats.Summary.TotalTasks,
		&stats.Summary.CompletedTasks,
		&stats.Summary.InProgressTasks,
		&stats.Summary.PendingTasks,
		&stats.Summary.OverdueTasks,
		&stats.Summary.ProjectsInvolved,
	)
	if err != nil {
		return nil, err
	}

	// Calculate completion rate
	if stats.Summary.TotalTasks > 0 {
		stats.Summary.CompletionRate = float64(stats.Summary.CompletedTasks) / float64(stats.Summary.TotalTasks) * 100
	}

	// 2. Get task stats by status - 详细统计所有状态
	taskStatsQuery := `
		SELECT
			COUNT(CASE WHEN t.status = 'draft' THEN 1 END) as draft,
			COUNT(CASE WHEN t.status = 'planning' THEN 1 END) as planning,
			COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo,
			COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress,
			COUNT(CASE WHEN t.status = 'testing' THEN 1 END) as testing,
			COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
			COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled,
			COUNT(CASE WHEN t.status = 'on_hold' THEN 1 END) as on_hold,
			COUNT(CASE WHEN t.status = 'blocked' THEN 1 END) as blocked,
			COUNT(CASE WHEN t.status = 'archived' THEN 1 END) as archived
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		WHERE t.deleted_at IS NULL
		AND p.deleted_at IS NULL
		AND ` + timeFilter + projectFilter

	err = db.QueryRow(taskStatsQuery, args...).Scan(
		&stats.TaskStats.Draft,
		&stats.TaskStats.Planning,
		&stats.TaskStats.Todo,
		&stats.TaskStats.InProgress,
		&stats.TaskStats.Testing,
		&stats.TaskStats.Completed,
		&stats.TaskStats.Cancelled,
		&stats.TaskStats.OnHold,
		&stats.TaskStats.Blocked,
		&stats.TaskStats.Archived,
	)
	if err != nil {
		return nil, err
	}

	// 3. Get project statistics
	projectStatsQuery := `
		SELECT 
			p.id,
			p.name,
			COUNT(t.id) as task_count,
			COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count
		FROM projects p 
		LEFT JOIN tasks t ON p.id = t.project_id 
			AND t.deleted_at IS NULL 
			AND t.status NOT IN ('cancelled', 'archived')
			AND ` + timeFilter + `
		WHERE p.deleted_at IS NULL` + projectFilter + `
		GROUP BY p.id, p.name 
		HAVING COUNT(t.id) > 0
		ORDER BY task_count DESC 
		LIMIT 10`

	rows, err := db.Query(projectStatsQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item ProjectStatsItem
		err := rows.Scan(&item.ProjectID, &item.ProjectName, &item.TaskCount, &item.CompletedCount)
		if err != nil {
			return nil, err
		}

		if item.TaskCount > 0 {
			item.CompletionRate = float64(item.CompletedCount) / float64(item.TaskCount) * 100
		}

		stats.ProjectStats = append(stats.ProjectStats, item)
	}

	// 4. Get daily statistics - 明确分离不同类型的统计
	// 重新构建参数数组以适应新的查询结构
	dailyArgs := []interface{}{startDate, endDate}
	if projectID != nil {
		dailyArgs = append(dailyArgs, *projectID, *projectID, *projectID)
	}

	dailyProjectFilter := ""
	if projectID != nil {
		dailyProjectFilter = " AND t.project_id = $3"
	}

	dailyStatsQuery := `
		SELECT 
			DATE(day_series.day) as date,
			COALESCE(created_count, 0) as tasks_created,
			COALESCE(completed_count, 0) as tasks_completed,
			COALESCE(updated_count, 0) as tasks_updated
		FROM (
			SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as day
		) day_series
		LEFT JOIN (
			SELECT 
				DATE(t.created_at) as date,
				COUNT(*) as created_count
			FROM tasks t
			JOIN projects p ON t.project_id = p.id
			WHERE t.deleted_at IS NULL 
			AND p.deleted_at IS NULL
			AND DATE(t.created_at) >= $1 
			AND DATE(t.created_at) <= $2` + dailyProjectFilter + `
			GROUP BY DATE(t.created_at)
		) created_stats ON day_series.day = created_stats.date
		LEFT JOIN (
			SELECT 
				DATE(t.updated_at) as date,
				COUNT(*) as completed_count
			FROM tasks t
			JOIN projects p ON t.project_id = p.id
			WHERE t.deleted_at IS NULL 
			AND p.deleted_at IS NULL
			AND t.status = 'completed'
			AND DATE(t.updated_at) >= $1 
			AND DATE(t.updated_at) <= $2`

	if projectID != nil {
		dailyStatsQuery += " AND t.project_id = $3"
	}

	dailyStatsQuery += `
			GROUP BY DATE(t.updated_at)
		) completed_stats ON day_series.day = completed_stats.date
		LEFT JOIN (
			SELECT 
				DATE(t.updated_at) as date,
				COUNT(*) as updated_count
			FROM tasks t
			JOIN projects p ON t.project_id = p.id
			WHERE t.deleted_at IS NULL 
			AND p.deleted_at IS NULL
			AND DATE(t.updated_at) >= $1 
			AND DATE(t.updated_at) <= $2`

	if projectID != nil {
		dailyStatsQuery += " AND t.project_id = $3"
	}

	dailyStatsQuery += `
			GROUP BY DATE(t.updated_at)
		) updated_stats ON day_series.day = updated_stats.date
		ORDER BY day_series.day`

	dailyRows, err := db.Query(dailyStatsQuery, dailyArgs...)
	if err != nil {
		return nil, err
	}
	defer dailyRows.Close()

	for dailyRows.Next() {
		var item DailyStatsItem
		err := dailyRows.Scan(&item.Date, &item.TasksCreated, &item.TasksCompleted, &item.TasksUpdated)
		if err != nil {
			return nil, err
		}
		stats.DailyStats = append(stats.DailyStats, item)
	}

	// 5. Get top tasks (high priority or recently updated) with work hours
	topTasksQuery := `
		SELECT
			t.id,
			t.project_id,
			p.name as project_name,
			t.title,
			t.status,
			COALESCE(t.custom_fields->>'priority', 'medium') as priority,
			t.due_date,
			t.updated_at,
			COALESCE(SUM(utl.actual_work_seconds) / 3600.0, 0) as work_hours
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		LEFT JOIN unified_timer_logs utl ON t.id = utl.target_id
			AND utl.target_type = 'project_task'
			AND utl.status = 'completed'
		WHERE t.deleted_at IS NULL
		AND p.deleted_at IS NULL
		AND ` + timeFilter + projectFilter + `
		GROUP BY t.id, t.project_id, p.name, t.title, t.status, t.custom_fields, t.due_date, t.updated_at
		ORDER BY
			work_hours DESC,
			CASE WHEN t.custom_fields->>'priority' = 'urgent' THEN 1
				 WHEN t.custom_fields->>'priority' = 'high' THEN 2
				 WHEN t.custom_fields->>'priority' = 'medium' THEN 3
				 ELSE 4 END,
			t.updated_at DESC
		LIMIT 10`

	topTasksRows, err := db.Query(topTasksQuery, args...)
	if err != nil {
		return nil, err
	}
	defer topTasksRows.Close()

	for topTasksRows.Next() {
		var item TaskSummaryItem
		var dueDate *time.Time
		var updatedAt time.Time

		err := topTasksRows.Scan(
			&item.ID, &item.ProjectID, &item.ProjectName, &item.Title,
			&item.Status, &item.Priority, &dueDate, &updatedAt, &item.WorkHours,
		)
		if err != nil {
			return nil, err
		}

		if dueDate != nil {
			dueDateStr := dueDate.Format("2006-01-02")
			item.DueDate = &dueDateStr
		}
		item.UpdatedAt = updatedAt.Format("2006-01-02T15:04:05Z")

		stats.TopTasks = append(stats.TopTasks, item)
	}

	// 6. Get priority distribution
	priorityQuery := `
		SELECT
			COALESCE(t.custom_fields->>'priority', 'medium') as priority,
			COUNT(*) as count
		FROM tasks t
		WHERE t.deleted_at IS NULL
		AND ` + timeFilter + projectFilter + `
		GROUP BY COALESCE(t.custom_fields->>'priority', 'medium')
	`

	priorityRows, err := db.Query(priorityQuery, args...)
	if err != nil {
		return nil, err
	}
	defer priorityRows.Close()

	priorityDist := PriorityDistribution{}
	for priorityRows.Next() {
		var priority string
		var count int
		if err := priorityRows.Scan(&priority, &count); err != nil {
			return nil, err
		}

		switch priority {
		case "urgent":
			priorityDist.Urgent = count
		case "high":
			priorityDist.High = count
		case "medium":
			priorityDist.Medium = count
		case "low":
			priorityDist.Low = count
		}
	}
	stats.PriorityDistribution = priorityDist

	// 7. Calculate trends (simplified for now)
	stats.Trends = WeeklyTrends{
		TaskCreationTrend:   0,        // TODO: Calculate compared to previous week
		CompletionRateTrend: 0,        // TODO: Calculate compared to previous week
		ProductivityTrend:   "stable", // TODO: Determine based on metrics
	}

	return stats, nil
}

// getWeekNumber returns the ISO week number for a given date
func getWeekNumber(date time.Time) int {
	_, week := date.ISOWeek()
	return week
}

// DashboardStatsResponse represents daily dashboard statistics
type DashboardStatsResponse struct {
	TodayTasksCompleted int `json:"today_tasks_completed"`
	TodayTasksTotal     int `json:"today_tasks_total"`
	TodayWorkTime       int `json:"today_work_time"` // in minutes
	ActiveProjects      int `json:"active_projects"`
	PendingTasks        int `json:"pending_tasks"`
}

// GetStats handles GET /api/v1/dashboard/stats
// Returns daily dashboard statistics for the current user
func (h *DashboardHandler) GetStats(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID := userIDInterface.(int)

	// Get optional date parameter (default to today)
	dateStr := c.Query("date")
	var targetDate time.Time
	if dateStr == "" {
		targetDate = time.Now()
	} else {
		var err error
		targetDate, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid date format, expected YYYY-MM-DD",
			})
			return
		}
	}

	// Calculate date range for "today"
	startOfDay := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), 0, 0, 0, 0, targetDate.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	db := h.db.GetDB().(*sql.DB)
	stats := &DashboardStatsResponse{}

	// 1. Get today's task statistics (based on timer logs for the user)
	var todayWorkedTasks, todayCompletedTasks int

	// Count tasks with timer logs today (tasks worked on)
	workedTasksQuery := `
		SELECT COUNT(DISTINCT target_id)
		FROM unified_timer_logs
		WHERE user_id = $1
			AND target_type = 'project_task'
			AND start_time >= $2
			AND start_time < $3
			AND end_time IS NOT NULL
			AND target_id IS NOT NULL`

	err := db.QueryRow(workedTasksQuery, userID, startOfDay, endOfDay).Scan(&todayWorkedTasks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch worked tasks count",
			"details": err.Error(),
		})
		return
	}

	// Count completed tasks today (from timer logs)
	completedTasksQuery := `
		SELECT COUNT(DISTINCT utl.target_id)
		FROM unified_timer_logs utl
		INNER JOIN tasks t ON t.id = utl.target_id
		WHERE utl.user_id = $1
			AND utl.target_type = 'project_task'
			AND utl.start_time >= $2
			AND utl.start_time < $3
			AND utl.end_time IS NOT NULL
			AND utl.target_id IS NOT NULL
			AND t.status = 'completed'
			AND t.deleted_at IS NULL`

	err = db.QueryRow(completedTasksQuery, userID, startOfDay, endOfDay).Scan(&todayCompletedTasks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch completed tasks count",
			"details": err.Error(),
		})
		return
	}

	stats.TodayTasksTotal = todayWorkedTasks
	stats.TodayTasksCompleted = todayCompletedTasks

	// Get pending tasks count for the user
	pendingTasksQuery := `
		SELECT COUNT(*)
		FROM tasks
		WHERE assignee_id = $1
			AND status IN ('todo', 'planning', 'in_progress')
			AND deleted_at IS NULL`

	err = db.QueryRow(pendingTasksQuery, userID).Scan(&stats.PendingTasks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch task statistics",
			"details": err.Error(),
		})
		return
	}

	// 2. Get today's work time from time logs (in minutes)
	workTimeQuery := `
		SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0)::int
		FROM unified_timer_logs
		WHERE user_id = $1
			AND start_time >= $2
			AND start_time < $3
			AND end_time IS NOT NULL`

	err = db.QueryRow(workTimeQuery, userID, startOfDay, endOfDay).Scan(&stats.TodayWorkTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch work time",
			"details": err.Error(),
		})
		return
	}

	// 3. Get active projects count
	activeProjectsQuery := `
		SELECT COUNT(DISTINCT p.id)
		FROM projects p
		INNER JOIN tasks t ON t.project_id = p.id
		WHERE t.assignee_id = $1
			AND p.status = 'active'
			AND t.status IN ('todo', 'planning', 'in_progress')
			AND t.deleted_at IS NULL
			AND p.deleted_at IS NULL`

	err = db.QueryRow(activeProjectsQuery, userID).Scan(&stats.ActiveProjects)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch active projects",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// DailyTimeStat 每日时间统计
type DailyTimeStat struct {
	Date      string  `json:"date"`       // 日期，格式: "2025-10-01"
	Hours     float64 `json:"hours"`      // 工作小时数
	TaskCount int     `json:"taskCount"`  // 完成任务数
	Label     string  `json:"label"`      // 日期标签
}

// TimeStatsResponse 时间统计响应
type TimeStatsResponse struct {
	DailyStats         []DailyTimeStat `json:"dailyStats"`
	TotalHours         float64         `json:"totalHours"`
	AverageHoursPerDay float64         `json:"averageHoursPerDay"`
	MostProductiveDay  string          `json:"mostProductiveDay"`
}

// GetTimeStats 获取时间统计数据（7天工作时长图表）
func (h *DashboardHandler) GetTimeStats(c *gin.Context) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID := userIDInterface.(int)

	// Get days parameter (default 7)
	daysStr := c.DefaultQuery("days", "7")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days < 1 || days > 30 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid days parameter, must be between 1 and 30",
		})
		return
	}

	db := h.db.GetDB().(*sql.DB)
	now := time.Now()
	startDate := now.AddDate(0, 0, -(days - 1))
	startOfPeriod := time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())

	// Query daily work time and task completion counts
	query := `
		WITH date_series AS (
			SELECT generate_series(
				$1::timestamp,
				$2::timestamp,
				interval '1 day'
			)::date as date
		),
		daily_time AS (
			SELECT
				DATE(start_time) as work_date,
				SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::float as hours
			FROM unified_timer_logs
			WHERE user_id = $3
				AND start_time >= $1
				AND end_time IS NOT NULL
			GROUP BY DATE(start_time)
		),
		daily_tasks AS (
			SELECT
				DATE(updated_at) as completion_date,
				COUNT(*) as task_count
			FROM tasks
			WHERE assignee_id = $3
				AND status = 'completed'
				AND updated_at >= $1
				AND deleted_at IS NULL
			GROUP BY DATE(updated_at)
		)
		SELECT
			ds.date,
			COALESCE(dt.hours, 0) as hours,
			COALESCE(dtask.task_count, 0) as task_count
		FROM date_series ds
		LEFT JOIN daily_time dt ON ds.date = dt.work_date
		LEFT JOIN daily_tasks dtask ON ds.date = dtask.completion_date
		ORDER BY ds.date ASC`

	rows, err := db.Query(query, startOfPeriod, now, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch time statistics",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	var dailyStats []DailyTimeStat
	var totalHours float64
	var maxHours float64
	var mostProductiveDay string

	for rows.Next() {
		var date time.Time
		var hours float64
		var taskCount int

		if err := rows.Scan(&date, &hours, &taskCount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to parse time statistics",
				"details": err.Error(),
			})
			return
		}

		// Format date and label
		dateStr := date.Format("2006-01-02")
		weekday := date.Weekday()
		var label string
		if days <= 7 {
			// For week view, show weekday names
			weekdayNames := []string{"周日", "周一", "周二", "周三", "周四", "周五", "周六"}
			label = weekdayNames[weekday]
		} else {
			// For month view, show date
			label = date.Format("01/02")
		}

		dailyStats = append(dailyStats, DailyTimeStat{
			Date:      dateStr,
			Hours:     hours,
			TaskCount: taskCount,
			Label:     label,
		})

		totalHours += hours
		if hours > maxHours {
			maxHours = hours
			mostProductiveDay = dateStr
		}
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error iterating time statistics",
			"details": err.Error(),
		})
		return
	}

	// Calculate average
	averageHours := 0.0
	if len(dailyStats) > 0 {
		averageHours = totalHours / float64(len(dailyStats))
	}

	response := TimeStatsResponse{
		DailyStats:         dailyStats,
		TotalHours:         totalHours,
		AverageHoursPerDay: averageHours,
		MostProductiveDay:  mostProductiveDay,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// NotificationResponse 通知响应
type NotificationResponse struct {
	ID               int     `json:"id"`
	Type             string  `json:"type"`
	Title            string  `json:"title"`
	Message          string  `json:"message"`
	IsRead           bool    `json:"is_read"`
	RelatedTaskID    *int    `json:"related_task_id,omitempty"`
	RelatedProjectID *int    `json:"related_project_id,omitempty"`
	CreatedAt        string  `json:"created_at"`
	ReadAt           *string `json:"read_at,omitempty"`
}

// NotificationListResponse 通知列表响应
type NotificationListResponse struct {
	Notifications []NotificationResponse `json:"notifications"`
	Total         int                    `json:"total"`
	UnreadCount   int                    `json:"unread_count"`
}

// GetNotifications 获取最近通知列表
func (h *DashboardHandler) GetNotifications(c *gin.Context) {
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID := userIDInterface.(int)

	// Get limit parameter (default 10, max 50)
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 50 {
		limit = 10
	}

	// Get unread_only parameter
	unreadOnly := c.DefaultQuery("unread_only", "false") == "true"

	db := h.db.GetDB().(*sql.DB)

	// Build query based on filters
	whereClause := "WHERE user_id = $1"
	args := []interface{}{userID}
	argCount := 1

	if unreadOnly {
		argCount++
		whereClause += fmt.Sprintf(" AND is_read = false")
	}

	// Get total count and unread count
	var total, unreadCount int
	countQuery := fmt.Sprintf(`
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE is_read = false) as unread_count
		FROM notifications
		%s`, whereClause)

	err = db.QueryRow(countQuery, args[:argCount]...).Scan(&total, &unreadCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch notification counts",
			"details": err.Error(),
		})
		return
	}

	// Get notifications
	args = append(args[:argCount], limit)
	notificationQuery := fmt.Sprintf(`
		SELECT
			id,
			type,
			title,
			message,
			is_read,
			related_task_id,
			related_project_id,
			created_at,
			read_at
		FROM notifications
		%s
		ORDER BY created_at DESC
		LIMIT $%d`, whereClause, argCount+1)

	rows, err := db.Query(notificationQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch notifications",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	var notifications []NotificationResponse
	for rows.Next() {
		var notif NotificationResponse
		var createdAt time.Time
		var readAt *time.Time

		err := rows.Scan(
			&notif.ID,
			&notif.Type,
			&notif.Title,
			&notif.Message,
			&notif.IsRead,
			&notif.RelatedTaskID,
			&notif.RelatedProjectID,
			&createdAt,
			&readAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to parse notification",
				"details": err.Error(),
			})
			return
		}

		notif.CreatedAt = createdAt.Format(time.RFC3339)
		if readAt != nil {
			readAtStr := readAt.Format(time.RFC3339)
			notif.ReadAt = &readAtStr
		}

		notifications = append(notifications, notif)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error iterating notifications",
			"details": err.Error(),
		})
		return
	}

	// Return empty list if no notifications
	if notifications == nil {
		notifications = []NotificationResponse{}
	}

	response := NotificationListResponse{
		Notifications: notifications,
		Total:         total,
		UnreadCount:   unreadCount,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// PriorityDistributionItem 优先级分布项
type PriorityDistributionItem struct {
	Priority string `json:"priority"` // "low", "medium", "high"
	Count    int    `json:"count"`    // 任务数量
	Label    string `json:"label"`    // 显示标签
}

// PriorityDistributionStatsResponse 优先级分布统计响应
type PriorityDistributionStatsResponse struct {
	Total        int                        `json:"total"`        // 总任务数
	Distribution []PriorityDistributionItem `json:"distribution"` // 优先级分布
}

// GetPriorityDistributionStats 获取任务优先级分布统计
// GET /api/v1/dashboard/priority-distribution
func (h *DashboardHandler) GetPriorityDistributionStats(c *gin.Context) {
	// Get project_id from query parameter (optional)
	projectIDStr := c.Query("project_id")
	var projectID int
	if projectIDStr != "" {
		var err error
		projectID, err = strconv.Atoi(projectIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid project_id parameter",
			})
			return
		}
	} else {
		projectID = 1 // Default project
	}

	db := h.db.GetDB().(*sql.DB)

	// Query priority distribution from tasks table
	query := `
		SELECT
			COALESCE(custom_fields->>'priority', 'low') as priority,
			COUNT(*) as count
		FROM tasks
		WHERE project_id = $1
			AND deleted_at IS NULL
			AND status NOT IN ('completed', 'cancelled', 'archived')
		GROUP BY COALESCE(custom_fields->>'priority', 'low')
		ORDER BY
			CASE COALESCE(custom_fields->>'priority', 'low')
				WHEN 'high' THEN 1
				WHEN 'medium' THEN 2
				WHEN 'low' THEN 3
				ELSE 4
			END
	`

	rows, err := db.Query(query, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch priority distribution",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	// Priority labels mapping
	priorityLabels := map[string]string{
		"high":   "高优先级",
		"medium": "中优先级",
		"low":    "低优先级",
	}

	distribution := []PriorityDistributionItem{}
	total := 0

	for rows.Next() {
		var priority string
		var count int
		if err := rows.Scan(&priority, &count); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to parse priority data",
				"details": err.Error(),
			})
			return
		}

		label, ok := priorityLabels[priority]
		if !ok {
			label = "未知优先级"
		}

		distribution = append(distribution, PriorityDistributionItem{
			Priority: priority,
			Count:    count,
			Label:    label,
		})

		total += count
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Error iterating priority data",
			"details": err.Error(),
		})
		return
	}

	// Ensure all priorities exist (even if count is 0)
	existingPriorities := make(map[string]bool)
	for _, d := range distribution {
		existingPriorities[d.Priority] = true
	}

	for _, p := range []string{"high", "medium", "low"} {
		if !existingPriorities[p] {
			distribution = append(distribution, PriorityDistributionItem{
				Priority: p,
				Count:    0,
				Label:    priorityLabels[p],
			})
		}
	}

	// Re-sort to ensure correct order
	// Sort by priority: high -> medium -> low
	for i := 0; i < len(distribution); i++ {
		for j := i + 1; j < len(distribution); j++ {
			order := map[string]int{"high": 1, "medium": 2, "low": 3}
			if order[distribution[i].Priority] > order[distribution[j].Priority] {
				distribution[i], distribution[j] = distribution[j], distribution[i]
			}
		}
	}

	response := PriorityDistributionStatsResponse{
		Total:        total,
		Distribution: distribution,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// TaskWithTimerLogs represents a task with its timer logs
type TaskWithTimerLogs struct {
	ID          int                `json:"id"`
	ProjectID   int                `json:"project_id"`
	ProjectName string             `json:"project_name"`
	Title       string             `json:"title"`
	Status      string             `json:"status"`
	Priority    string             `json:"priority"`
	WorkHours   float64            `json:"work_hours"`
	TimerLogs   []TimerLogEntry    `json:"timer_logs"`
	CreatedAt   string             `json:"created_at"`
	UpdatedAt   string             `json:"updated_at"`
}

// TimerLogEntry represents a single timer log entry
type TimerLogEntry struct {
	ID               int      `json:"id"`
	StartTime        string   `json:"start_time"`
	EndTime          *string  `json:"end_time"`
	ActualWorkSeconds int     `json:"actual_work_seconds"`
	Status           string   `json:"status"`
}

// GetDailyTasksWithTimers returns tasks for a specific date with their timer logs
// GET /api/v1/dashboard/daily-tasks?date=2025-02-05
func (h *DashboardHandler) GetDailyTasksWithTimers(c *gin.Context) {
	userID := c.GetInt("user_id")
	date := c.Query("date")
	if date == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "date parameter is required (format: YYYY-MM-DD)",
		})
		return
	}

	// Parse date and calculate time range for the day
	targetDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid date format, use YYYY-MM-DD",
		})
		return
	}

	startOfDay := targetDate.Format("2006-01-02 00:00:00")
	endOfDay := targetDate.Add(24 * time.Hour).Format("2006-01-02 00:00:00")

	// Query to get tasks with timer logs for the specified date
	query := `
		WITH task_work_time AS (
			SELECT
				target_id as task_id,
				SUM(actual_work_seconds) / 3600.0 as work_hours
			FROM unified_timer_logs
			WHERE user_id = $1
				AND target_type = 'project_task'
				AND start_time >= $2
				AND start_time < $3
				AND status = 'completed'
			GROUP BY target_id
		)
		SELECT
			t.id,
			t.project_id,
			COALESCE(p.name, '') as project_name,
			t.title,
			t.status,
			COALESCE(t.custom_fields->>'priority', 'medium') as priority,
			COALESCE(twt.work_hours, 0) as work_hours,
			t.created_at,
			t.updated_at
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		INNER JOIN task_work_time twt ON t.id = twt.task_id
		WHERE t.deleted_at IS NULL
			AND p.deleted_at IS NULL
		ORDER BY twt.work_hours DESC, t.updated_at DESC
	`

	sqlDB, ok := h.db.GetDB().(*sql.DB)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database type assertion failed",
		})
		return
	}

	rows, err := sqlDB.QueryContext(c.Request.Context(), query, userID, startOfDay, endOfDay)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch tasks",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	tasks := make([]TaskWithTimerLogs, 0)
	taskIDs := make([]int, 0)

	for rows.Next() {
		var task TaskWithTimerLogs
		var createdAt, updatedAt time.Time

		err := rows.Scan(
			&task.ID,
			&task.ProjectID,
			&task.ProjectName,
			&task.Title,
			&task.Status,
			&task.Priority,
			&task.WorkHours,
			&createdAt,
			&updatedAt,
		)
		if err != nil {
			continue
		}

		task.CreatedAt = createdAt.Format(time.RFC3339)
		task.UpdatedAt = updatedAt.Format(time.RFC3339)
		task.TimerLogs = make([]TimerLogEntry, 0)

		tasks = append(tasks, task)
		taskIDs = append(taskIDs, task.ID)
	}

	// If we have tasks, fetch their timer logs
	if len(taskIDs) > 0 {
		timerQuery := `
			SELECT
				id,
				target_id as task_id,
				start_time,
				end_time,
				actual_work_seconds,
				status
			FROM unified_timer_logs
			WHERE user_id = $1
				AND target_type = 'project_task'
				AND target_id = ANY($2)
				AND start_time >= $3
				AND start_time < $4
			ORDER BY start_time ASC
		`

		timerRows, err := sqlDB.QueryContext(c.Request.Context(), timerQuery, userID, taskIDs, startOfDay, endOfDay)
		if err == nil {
			defer timerRows.Close()

			// Create a map of task_id -> timer logs
			timerLogsByTask := make(map[int][]TimerLogEntry)

			for timerRows.Next() {
				var log TimerLogEntry
				var taskID int
				var startTime, endTime sql.NullTime

				err := timerRows.Scan(
					&log.ID,
					&taskID,
					&startTime,
					&endTime,
					&log.ActualWorkSeconds,
					&log.Status,
				)
				if err != nil {
					continue
				}

				if startTime.Valid {
					log.StartTime = startTime.Time.Format("15:04")
				}
				if endTime.Valid {
					endTimeStr := endTime.Time.Format("15:04")
					log.EndTime = &endTimeStr
				}

				timerLogsByTask[taskID] = append(timerLogsByTask[taskID], log)
			}

			// Assign timer logs to tasks
			for i := range tasks {
				if logs, ok := timerLogsByTask[tasks[i].ID]; ok {
					tasks[i].TimerLogs = logs
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"date":  date,
			"tasks": tasks,
			"count": len(tasks),
		},
	})
}
