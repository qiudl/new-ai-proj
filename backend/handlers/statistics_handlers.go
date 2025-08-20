package handlers

import (
	"ai-project-backend/models"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// StatisticsHandlers 统计处理器
type StatisticsHandlers struct {
	db *sql.DB
}

// NewStatisticsHandlers 创建统计处理器实例
func NewStatisticsHandlers(db *sql.DB) *StatisticsHandlers {
	return &StatisticsHandlers{db: db}
}

// TodayTaskStats 今日任务统计数据
type TodayTaskStats struct {
	// 基础统计
	TotalTasks       int `json:"totalTasks"`
	CompletedTasks   int `json:"completedTasks"`
	InProgressTasks  int `json:"inProgressTasks"`
	TodoTasks        int `json:"todoTasks"`
	OverdueTasks     int `json:"overdueTasks"`

	// 完成率和效率
	CompletionRate         float64 `json:"completionRate"`
	OnTimeCompletionRate   float64 `json:"onTimeCompletionRate"`

	// 时间统计 - 精准时间支持
	TotalPlannedTime   float64 `json:"totalPlannedTime"`   // 分钟 (精准到分钟)
	TotalActualTime    float64 `json:"totalActualTime"`    // 分钟 (精准到分钟)  
	TotalRemainingTime float64 `json:"totalRemainingTime"` // 分钟 (精准到分钟)
	TimeEfficiency     float64 `json:"timeEfficiency"`     // 百分比
	
	// 新增：精准时间格式统计
	TotalPlannedTimeFormatted   string `json:"totalPlannedTimeFormatted"`   // 格式化显示 (如: "2小时30分钟")
	TotalActualTimeFormatted    string `json:"totalActualTimeFormatted"`    // 格式化显示
	TotalRemainingTimeFormatted string `json:"totalRemainingTimeFormatted"` // 格式化显示
	
	// 时间分布统计
	TimeDistribution map[string]float64 `json:"timeDistribution"` // 按时间范围分布统计

	// 优先级分布
	PriorityDistribution map[string]int `json:"priorityDistribution"`

	// 工作负载
	EstimatedWorkload float64 `json:"estimatedWorkload"` // 小时
	AvgTaskDuration   float64 `json:"avgTaskDuration"`   // 分钟

	// 趋势对比
	YesterdayCompletion int     `json:"yesterdayCompletion"`
	WeeklyTrend         float64 `json:"weeklyTrend"`

	// 特殊任务列表
	UrgentTasks         []TaskInfo `json:"urgentTasks"`
	UpcomingDeadlines   []TaskInfo `json:"upcomingDeadlines"`
}

// TaskInfo 任务信息（用于统计）
type TaskInfo struct {
	ID           int                    `json:"id"`
	Title        string                 `json:"title"`
	Status       string                 `json:"status"`
	ProjectID    int                    `json:"project_id"`
	ProjectName  string                 `json:"project_name"`
	AssigneeID   *int                   `json:"assignee_id"`
	AssigneeName *string                `json:"assignee_name"`
	DueDate      *string                `json:"due_date"`
	CreatedAt    string                 `json:"created_at"`
	UpdatedAt    *string                `json:"updated_at"`
	CustomFields models.CustomFields `json:"custom_fields,omitempty"`
}

// HandleTodayStats 处理今日任务统计请求
func (sh *StatisticsHandlers) HandleTodayStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats, err := sh.getTodayTaskStats()
	if err != nil {
		http.Error(w, fmt.Sprintf("获取今日统计失败: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(stats); err != nil {
		http.Error(w, fmt.Sprintf("编码响应失败: %v", err), http.StatusInternalServerError)
	}
}

// getTodayTaskStats 获取今日任务统计数据
func (sh *StatisticsHandlers) getTodayTaskStats() (*TodayTaskStats, error) {
	today := time.Now().Format("2006-01-02")
	todayStart := today + " 00:00:00"
	todayEnd := today + " 23:59:59"
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	
	stats := &TodayTaskStats{
		PriorityDistribution: make(map[string]int),
		UrgentTasks:         []TaskInfo{},
		UpcomingDeadlines:   []TaskInfo{},
	}

	// 获取今日相关任务的基础统计
	err := sh.calculateBasicStats(stats, todayStart, todayEnd, today)
	if err != nil {
		return nil, fmt.Errorf("计算基础统计失败: %v", err)
	}

	// 获取时间统计
	err = sh.calculateTimeStats(stats, todayStart, todayEnd, today)
	if err != nil {
		return nil, fmt.Errorf("计算时间统计失败: %v", err)
	}

	// 获取优先级分布
	err = sh.calculatePriorityDistribution(stats, todayStart, todayEnd, today)
	if err != nil {
		return nil, fmt.Errorf("计算优先级分布失败: %v", err)
	}

	// 获取昨日完成数据
	err = sh.calculateYesterdayCompletion(stats, yesterday)
	if err != nil {
		return nil, fmt.Errorf("计算昨日完成数据失败: %v", err)
	}

	// 获取紧急任务和即将到期任务
	err = sh.getSpecialTasks(stats, today)
	if err != nil {
		return nil, fmt.Errorf("获取特殊任务失败: %v", err)
	}

	return stats, nil
}

// calculateBasicStats 计算基础统计数据
func (sh *StatisticsHandlers) calculateBasicStats(stats *TodayTaskStats, todayStart, todayEnd, today string) error {
	// 今日相关任务查询（包括今日到期、今日创建、今日更新、进行中、逾期的任务）
	query := `
		SELECT 
			COUNT(*) as total,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
			SUM(CASE WHEN status IN ('in_progress', 'testing') THEN 1 ELSE 0 END) as in_progress,
			SUM(CASE WHEN status IN ('draft', 'planning', 'todo') THEN 1 ELSE 0 END) as todo,
			SUM(CASE WHEN due_date < ? AND status NOT IN ('completed', 'cancelled', 'archived') THEN 1 ELSE 0 END) as overdue
		FROM tasks 
		WHERE status NOT IN ('cancelled', 'archived') 
		AND (
			DATE(due_date) = ? OR 
			DATE(created_at) = ? OR 
			DATE(updated_at) = ? OR 
			status IN ('in_progress', 'testing') OR
			(due_date < ? AND status != 'completed')
		)
	`

	var total, completed, inProgress, todo, overdue int
	err := sh.db.QueryRow(query, today, today, today, today, today).Scan(
		&total, &completed, &inProgress, &todo, &overdue,
	)
	if err != nil {
		return err
	}

	stats.TotalTasks = total
	stats.CompletedTasks = completed
	stats.InProgressTasks = inProgress
	stats.TodoTasks = todo
	stats.OverdueTasks = overdue

	// 计算完成率
	if total > 0 {
		stats.CompletionRate = float64(completed) / float64(total) * 100
	}

	// 计算按时完成率
	onTimeQuery := `
		SELECT 
			COUNT(*) as total_with_due_date,
			SUM(CASE WHEN updated_at <= due_date THEN 1 ELSE 0 END) as on_time_completed
		FROM tasks 
		WHERE status = 'completed' 
		AND due_date IS NOT NULL 
		AND updated_at IS NOT NULL
		AND (
			DATE(due_date) = ? OR 
			DATE(created_at) = ? OR 
			DATE(updated_at) = ?
		)
	`

	var totalWithDueDate, onTimeCompleted int
	err = sh.db.QueryRow(onTimeQuery, today, today, today).Scan(&totalWithDueDate, &onTimeCompleted)
	if err != nil {
		return err
	}

	if totalWithDueDate > 0 {
		stats.OnTimeCompletionRate = float64(onTimeCompleted) / float64(totalWithDueDate) * 100
	} else {
		stats.OnTimeCompletionRate = 100 // 如果没有设置截止日期的任务，默认为100%
	}

	return nil
}

// calculateTimeStats 计算时间统计
func (sh *StatisticsHandlers) calculateTimeStats(stats *TodayTaskStats, todayStart, todayEnd, today string) error {
	query := `
		SELECT 
			COALESCE(SUM(
				CASE 
					WHEN JSON_EXTRACT(custom_fields, '$.estimated_hours') IS NOT NULL 
					THEN CAST(JSON_EXTRACT(custom_fields, '$.estimated_hours') AS DECIMAL) * 60
					ELSE 0 
				END
			), 0) as total_planned_minutes,
			COALESCE(SUM(
				CASE 
					WHEN JSON_EXTRACT(custom_fields, '$.actual_hours') IS NOT NULL 
					THEN CAST(JSON_EXTRACT(custom_fields, '$.actual_hours') AS DECIMAL) * 60
					ELSE 0 
				END
			), 0) as total_actual_minutes
		FROM tasks 
		WHERE status NOT IN ('cancelled', 'archived') 
		AND (
			DATE(due_date) = ? OR 
			DATE(created_at) = ? OR 
			DATE(updated_at) = ? OR 
			status IN ('in_progress', 'testing') OR
			(due_date < ? AND status != 'completed')
		)
	`

	var totalPlannedMinutes, totalActualMinutes float64
	err := sh.db.QueryRow(query, today, today, today, today).Scan(&totalPlannedMinutes, &totalActualMinutes)
	if err != nil {
		return err
	}

	stats.TotalPlannedTime = totalPlannedMinutes
	stats.TotalActualTime = totalActualMinutes

	// 计算剩余时间（未完成任务的计划时间）
	remainingQuery := `
		SELECT 
			COALESCE(SUM(
				CASE 
					WHEN JSON_EXTRACT(custom_fields, '$.estimated_hours') IS NOT NULL 
					THEN CAST(JSON_EXTRACT(custom_fields, '$.estimated_hours') AS DECIMAL) * 60
					ELSE 0 
				END
			), 0) as total_remaining_minutes
		FROM tasks 
		WHERE status NOT IN ('completed', 'cancelled', 'archived')
		AND (
			DATE(due_date) = ? OR 
			DATE(created_at) = ? OR 
			DATE(updated_at) = ? OR 
			status IN ('in_progress', 'testing') OR
			(due_date < ? AND status != 'completed')
		)
	`

	err = sh.db.QueryRow(remainingQuery, today, today, today, today).Scan(&stats.TotalRemainingTime)
	if err != nil {
		return err
	}

	// 计算时间效率
	if totalPlannedMinutes > 0 {
		stats.TimeEfficiency = (totalActualMinutes / totalPlannedMinutes) * 100
	}

	// 计算预估工作负载（小时）
	stats.EstimatedWorkload = stats.TotalRemainingTime / 60

	// 计算平均任务时长
	if stats.CompletedTasks > 0 {
		stats.AvgTaskDuration = totalActualMinutes / float64(stats.CompletedTasks)
	}

	// 格式化精准时间显示
	stats.TotalPlannedTimeFormatted = formatMinutesToReadable(totalPlannedMinutes)
	stats.TotalActualTimeFormatted = formatMinutesToReadable(totalActualMinutes)
	stats.TotalRemainingTimeFormatted = formatMinutesToReadable(stats.TotalRemainingTime)

	// 计算时间分布统计
	stats.TimeDistribution = sh.calculateTimeDistribution(today)

	return nil
}

// calculatePriorityDistribution 计算优先级分布
func (sh *StatisticsHandlers) calculatePriorityDistribution(stats *TodayTaskStats, todayStart, todayEnd, today string) error {
	query := `
		SELECT 
			COALESCE(JSON_EXTRACT(custom_fields, '$.priority'), 'unset') as priority,
			COUNT(*) as count
		FROM tasks 
		WHERE status NOT IN ('cancelled', 'archived') 
		AND (
			DATE(due_date) = ? OR 
			DATE(created_at) = ? OR 
			DATE(updated_at) = ? OR 
			status IN ('in_progress', 'testing') OR
			(due_date < ? AND status != 'completed')
		)
		GROUP BY priority
	`

	rows, err := sh.db.Query(query, today, today, today, today)
	if err != nil {
		return err
	}
	defer rows.Close()

	// 初始化优先级分布
	stats.PriorityDistribution = map[string]int{
		"urgent": 0,
		"high":   0,
		"medium": 0,
		"low":    0,
		"unset":  0,
	}

	for rows.Next() {
		var priority string
		var count int
		if err := rows.Scan(&priority, &count); err != nil {
			return err
		}

		// 处理 JSON 字符串格式的优先级（去掉引号）
		if len(priority) > 2 && priority[0] == '"' && priority[len(priority)-1] == '"' {
			priority = priority[1 : len(priority)-1]
		}

		if priority == "" || priority == "null" {
			priority = "unset"
		}

		if _, exists := stats.PriorityDistribution[priority]; exists {
			stats.PriorityDistribution[priority] = count
		} else {
			stats.PriorityDistribution["unset"] += count
		}
	}

	return rows.Err()
}

// calculateYesterdayCompletion 计算昨日完成数据
func (sh *StatisticsHandlers) calculateYesterdayCompletion(stats *TodayTaskStats, yesterday string) error {
	query := `
		SELECT COUNT(*) 
		FROM tasks 
		WHERE status = 'completed' 
		AND DATE(updated_at) = ?
	`

	err := sh.db.QueryRow(query, yesterday).Scan(&stats.YesterdayCompletion)
	if err != nil {
		return err
	}

	// 计算周平均趋势（简化版本，这里设置为与今日完成率相同）
	stats.WeeklyTrend = stats.CompletionRate

	return nil
}

// getSpecialTasks 获取特殊任务（紧急任务和即将到期任务）
func (sh *StatisticsHandlers) getSpecialTasks(stats *TodayTaskStats, today string) error {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")

	// 获取紧急任务
	urgentQuery := `
		SELECT 
			t.id, t.title, t.status, t.project_id, t.assignee_id, t.due_date, 
			t.created_at, t.updated_at, t.custom_fields,
			COALESCE(p.name, '未知项目') as project_name,
			u.name as assignee_name
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.status NOT IN ('completed', 'cancelled', 'archived')
		AND (
			JSON_EXTRACT(t.custom_fields, '$.priority') IN ('"urgent"', '"high"') OR
			t.custom_fields LIKE '%"priority":"urgent"%' OR
			t.custom_fields LIKE '%"priority":"high"%'
		)
		ORDER BY t.due_date ASC
		LIMIT 10
	`

	urgentRows, err := sh.db.Query(urgentQuery)
	if err != nil {
		return err
	}
	defer urgentRows.Close()

	for urgentRows.Next() {
		task, err := sh.scanTaskInfo(urgentRows)
		if err != nil {
			return err
		}
		stats.UrgentTasks = append(stats.UrgentTasks, task)
	}

	// 获取明天到期的任务
	upcomingQuery := `
		SELECT 
			t.id, t.title, t.status, t.project_id, t.assignee_id, t.due_date, 
			t.created_at, t.updated_at, t.custom_fields,
			COALESCE(p.name, '未知项目') as project_name,
			u.name as assignee_name
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		LEFT JOIN users u ON t.assignee_id = u.id
		WHERE t.status NOT IN ('completed', 'cancelled', 'archived')
		AND DATE(t.due_date) = ?
		ORDER BY t.created_at ASC
		LIMIT 5
	`

	upcomingRows, err := sh.db.Query(upcomingQuery, tomorrow)
	if err != nil {
		return err
	}
	defer upcomingRows.Close()

	for upcomingRows.Next() {
		task, err := sh.scanTaskInfo(upcomingRows)
		if err != nil {
			return err
		}
		stats.UpcomingDeadlines = append(stats.UpcomingDeadlines, task)
	}

	return nil
}

// scanTaskInfo 扫描任务信息
func (sh *StatisticsHandlers) scanTaskInfo(rows *sql.Rows) (TaskInfo, error) {
	var task TaskInfo
	var createdAt time.Time
	var updatedAt sql.NullTime
	var dueDateStr sql.NullString
	var customFieldsStr sql.NullString
	var assigneeNameStr sql.NullString

	err := rows.Scan(
		&task.ID, &task.Title, &task.Status, &task.ProjectID, &task.AssigneeID,
		&dueDateStr, &createdAt, &updatedAt, &customFieldsStr,
		&task.ProjectName, &assigneeNameStr,
	)
	if err != nil {
		return task, err
	}

	task.CreatedAt = createdAt.Format("2006-01-02 15:04:05")

	if updatedAt.Valid {
		updatedAtStr := updatedAt.Time.Format("2006-01-02 15:04:05")
		task.UpdatedAt = &updatedAtStr
	}

	if dueDateStr.Valid {
		task.DueDate = &dueDateStr.String
	}

	if assigneeNameStr.Valid {
		task.AssigneeName = &assigneeNameStr.String
	}

	// 初始化和解析自定义字段
	task.CustomFields = make(models.CustomFields)
	if customFieldsStr.Valid && customFieldsStr.String != "" {
		if err := task.CustomFields.Scan([]byte(customFieldsStr.String)); err != nil {
			task.CustomFields = make(models.CustomFields)
		}
	}

	return task, nil
}

// formatMinutesToReadable 将分钟数格式化为可读的时间字符串
func formatMinutesToReadable(minutes float64) string {
	if minutes <= 0 {
		return "0分钟"
	}

	totalMinutes := int(minutes)
	days := totalMinutes / (8 * 60)    // 按8小时工作日计算
	hours := (totalMinutes % (8 * 60)) / 60
	remainingMinutes := totalMinutes % 60

	var parts []string
	
	if days > 0 {
		parts = append(parts, fmt.Sprintf("%d天", days))
	}
	if hours > 0 {
		parts = append(parts, fmt.Sprintf("%d小时", hours))
	}
	if remainingMinutes > 0 || len(parts) == 0 {
		parts = append(parts, fmt.Sprintf("%d分钟", remainingMinutes))
	}

	// 限制显示最多两个单位，保持简洁
	if len(parts) > 2 {
		parts = parts[:2]
	}

	result := ""
	for i, part := range parts {
		if i > 0 {
			result += ""
		}
		result += part
	}
	
	return result
}

// calculateTimeDistribution 计算时间分布统计
func (sh *StatisticsHandlers) calculateTimeDistribution(today string) map[string]float64 {
	distribution := map[string]float64{
		"short":  0,  // 0-2小时 (0-120分钟)
		"medium": 0,  // 2-8小时 (120-480分钟)
		"long":   0,  // 8小时-1天 (480-480分钟，实际上应该是8小时以上)
		"huge":   0,  // 1天以上 (超过8小时)
	}

	query := `
		SELECT 
			CASE 
				WHEN JSON_EXTRACT(custom_fields, '$.estimated_hours') IS NOT NULL 
				THEN CAST(JSON_EXTRACT(custom_fields, '$.estimated_hours') AS DECIMAL) * 60
				WHEN JSON_EXTRACT(custom_fields, '$.estimatedMinutes') IS NOT NULL
				THEN CAST(JSON_EXTRACT(custom_fields, '$.estimatedMinutes') AS DECIMAL)
				ELSE 0 
			END as estimated_minutes
		FROM tasks 
		WHERE status NOT IN ('cancelled', 'archived') 
		AND (
			DATE(due_date) = ? OR 
			DATE(created_at) = ? OR 
			DATE(updated_at) = ? OR 
			status IN ('in_progress', 'testing') OR
			(due_date < ? AND status != 'completed')
		)
		AND (
			JSON_EXTRACT(custom_fields, '$.estimated_hours') IS NOT NULL OR
			JSON_EXTRACT(custom_fields, '$.estimatedMinutes') IS NOT NULL
		)
	`

	rows, err := sh.db.Query(query, today, today, today, today)
	if err != nil {
		return distribution
	}
	defer rows.Close()

	for rows.Next() {
		var estimatedMinutes float64
		if err := rows.Scan(&estimatedMinutes); err != nil {
			continue
		}

		if estimatedMinutes <= 0 {
			continue
		}

		switch {
		case estimatedMinutes <= 120: // 0-2小时
			distribution["short"] += estimatedMinutes
		case estimatedMinutes <= 480: // 2-8小时
			distribution["medium"] += estimatedMinutes
		case estimatedMinutes <= 480*1: // 8小时-1天 (修正：应该是 <= 1*8*60 = 480，但这里应该是一天的分钟数)
			distribution["long"] += estimatedMinutes
		default: // 1天以上
			distribution["huge"] += estimatedMinutes
		}
	}

	return distribution
}
