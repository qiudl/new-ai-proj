package handlers

import (
	"ai-project-backend/database"
	"database/sql"
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
	DateRange    DateRange          `json:"date_range"`
	Summary      WeeklySummary      `json:"summary"`
	TaskStats    TaskStatsByStatus  `json:"task_stats"`
	ProjectStats []ProjectStatsItem `json:"project_stats"`
	DailyStats   []DailyStatsItem   `json:"daily_stats"`
	TopTasks     []TaskSummaryItem  `json:"top_tasks"`
	Trends       WeeklyTrends       `json:"trends"`
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
	Todo       int `json:"todo"`
	InProgress int `json:"in_progress"`
	Completed  int `json:"completed"`
	Cancelled  int `json:"cancelled"`
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
}

// WeeklyTrends represents trend data compared to previous periods
type WeeklyTrends struct {
	TaskCreationTrend   float64 `json:"task_creation_trend"`   // % change from last week
	CompletionRateTrend float64 `json:"completion_rate_trend"` // % change from last week
	ProductivityTrend   string  `json:"productivity_trend"`    // "improving", "stable", "declining"
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

	// 2. Get task stats by status
	stats.TaskStats = TaskStatsByStatus{
		Todo:       stats.Summary.PendingTasks,
		InProgress: stats.Summary.InProgressTasks,
		Completed:  stats.Summary.CompletedTasks,
		Cancelled:  stats.Summary.TotalTasks - stats.Summary.PendingTasks - stats.Summary.InProgressTasks - stats.Summary.CompletedTasks,
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

	// 5. Get top tasks (high priority or recently updated)
	topTasksQuery := `
		SELECT 
			t.id,
			t.project_id,
			p.name as project_name,
			t.title,
			t.status,
			COALESCE(t.custom_fields->>'priority', 'medium') as priority,
			t.due_date,
			t.updated_at
		FROM tasks t
		JOIN projects p ON t.project_id = p.id
		WHERE t.deleted_at IS NULL 
		AND p.deleted_at IS NULL 
		AND ` + timeFilter + projectFilter + `
		ORDER BY 
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
			&item.Status, &item.Priority, &dueDate, &updatedAt,
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

	// 6. Calculate trends (simplified for now)
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
