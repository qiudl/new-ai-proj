package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/database"
)

// ReportHandler 处理报告相关的请求
type ReportHandler struct {
	db database.DB
}

// NewReportHandler 创建新的报告处理器
func NewReportHandler(db database.DB) *ReportHandler {
	return &ReportHandler{
		db: db,
	}
}

// GetDailyWorkReport handles GET/POST /api/v1/mcp/get-daily-work-report
// 生成今日工作报告，包含任务完成情况、时间统计、效率分析等
func (h *ReportHandler) GetDailyWorkReport(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	uid := userID.(int)
	ctx := c.Request.Context()

	// 获取项目ID参数
	projectID := 1 // 默认项目ID
	if projectIDStr := c.Query("projectId"); projectIDStr != "" {
		if pid, err := strconv.Atoi(projectIDStr); err == nil {
			projectID = pid
		}
	}
	// 也支持POST请求中的JSON参数
	if c.Request.Method == "POST" {
		var req struct {
			ProjectID int `json:"projectId"`
		}
		if err := c.ShouldBindJSON(&req); err == nil && req.ProjectID > 0 {
			projectID = req.ProjectID
		}
	}

	// 设置今日的时间范围 (本地时间)
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
	tomorrow := today.AddDate(0, 0, 1)

	report, err := h.generateDailyReport(ctx, uid, projectID, today, tomorrow)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("生成今日工作报告失败: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"project_id": projectID,
		"report":     report,
		"date":       today.Format("2006-01-02"),
		"message":    fmt.Sprintf("📊 今日工作报告生成成功 (项目 %d)", projectID),
	})
}

// generateDailyReport 生成详细的日工作报告
func (h *ReportHandler) generateDailyReport(ctx context.Context, userID, projectID int, startTime, endTime time.Time) (map[string]interface{}, error) {
	report := make(map[string]interface{})
	
	// 1. 获取今日任务统计
	taskStats, err := h.getTodayTaskStats(ctx, userID, projectID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("获取今日任务统计失败: %v", err)
	}
	report["task_statistics"] = taskStats

	// 2. 获取今日时间统计
	timeStats, err := h.getTodayTimeStats(ctx, userID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("获取今日时间统计失败: %v", err)
	}
	report["time_statistics"] = timeStats

	// 3. 获取完成任务列表
	completedTasks, err := h.getCompletedTasks(ctx, userID, projectID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("获取完成任务列表失败: %v", err)
	}
	report["completed_tasks"] = completedTasks

	// 4. 获取进行中的任务
	activeTasks, err := h.getActiveTasks(ctx, userID, projectID)
	if err != nil {
		return nil, fmt.Errorf("获取活跃任务失败: %v", err)
	}
	report["active_tasks"] = activeTasks

	// 5. 获取时间分布详情
	timeDistribution, err := h.getTimeDistribution(ctx, userID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("获取时间分布失败: %v", err)
	}
	report["time_distribution"] = timeDistribution

	// 6. 生成工作效率分析
	efficiency := h.calculateDailyEfficiency(taskStats, timeStats)
	report["efficiency_analysis"] = efficiency

	// 7. 添加报告元数据
	report["generated_at"] = time.Now().Format("2006-01-02 15:04:05")
	report["date"] = startTime.Format("2006-01-02")
	report["user_id"] = userID
	report["project_id"] = projectID

	return report, nil
}

// getTodayTaskStats 获取今日任务统计
func (h *ReportHandler) getTodayTaskStats(ctx context.Context, userID, projectID int, startTime, endTime time.Time) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 查询今日任务统计
	query := `
		SELECT 
			COUNT(*) as total_tasks,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
			COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
			COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo_tasks,
			COUNT(CASE WHEN status NOT IN ('completed', 'in_progress', 'todo') THEN 1 END) as other_tasks,
			COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tasks,
			COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_tasks,
			COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_tasks
		FROM tasks 
		WHERE assignee_id = $1 
		AND project_id = $2
		AND updated_at >= $3 
		AND updated_at < $4`

	var total, completed, inProgress, todo, other int
	var highPri, mediumPri, lowPri int
	
	err := h.db.QueryRow(query, userID, projectID, startTime, endTime).Scan(
		&total, &completed, &inProgress, &todo, &other,
		&highPri, &mediumPri, &lowPri,
	)
	if err != nil {
		return nil, err
	}

	stats["total_tasks"] = total
	stats["completed_tasks"] = completed
	stats["in_progress_tasks"] = inProgress
	stats["todo_tasks"] = todo
	stats["other_tasks"] = other
	stats["completion_rate"] = 0.0
	if total > 0 {
		stats["completion_rate"] = float64(completed) / float64(total) * 100
	}

	stats["priority_breakdown"] = map[string]int{
		"high":   highPri,
		"medium": mediumPri,
		"low":    lowPri,
	}

	return stats, nil
}

// getTodayTimeStats 获取今日时间统计
func (h *ReportHandler) getTodayTimeStats(ctx context.Context, userID int, startTime, endTime time.Time) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 查询今日时间统计
	query := `
		SELECT 
			COALESCE(SUM(GREATEST(duration_seconds, 0)), 0) as total_seconds,
			COUNT(*) as session_count,
			COALESCE(AVG(GREATEST(duration_seconds, 0)), 0) as avg_session_seconds,
			COALESCE(MAX(GREATEST(duration_seconds, 0)), 0) as max_session_seconds,
			COALESCE(MIN(CASE WHEN duration_seconds > 0 THEN duration_seconds END), 0) as min_session_seconds
		FROM task_time_logs 
		WHERE user_id = $1 
		AND start_time >= $2 
		AND start_time < $3`

	var totalSeconds, sessionCount, avgSession, maxSession, minSession int
	err := h.db.QueryRow(query, userID, startTime, endTime).Scan(
		&totalSeconds, &sessionCount, &avgSession, &maxSession, &minSession,
	)
	if err != nil {
		return nil, err
	}

	stats["total_time_seconds"] = totalSeconds
	stats["total_time_formatted"] = formatDuration(totalSeconds)
	stats["total_hours"] = float64(totalSeconds) / 3600.0
	stats["session_count"] = sessionCount
	stats["average_session_seconds"] = avgSession
	stats["average_session_formatted"] = formatDuration(avgSession)
	stats["longest_session_seconds"] = maxSession
	stats["longest_session_formatted"] = formatDuration(maxSession)
	stats["shortest_session_seconds"] = minSession
	stats["shortest_session_formatted"] = formatDuration(minSession)

	return stats, nil
}

// getCompletedTasks 获取今日完成的任务列表
func (h *ReportHandler) getCompletedTasks(ctx context.Context, userID, projectID int, startTime, endTime time.Time) ([]map[string]interface{}, error) {
	query := `
		SELECT 
			t.id, t.title, t.priority, t.updated_at,
			COALESCE(SUM(GREATEST(ttl.duration_seconds, 0)), 0) as total_time_seconds
		FROM tasks t
		LEFT JOIN task_time_logs ttl ON t.id = ttl.task_id AND ttl.start_time >= $3 AND ttl.start_time < $4
		WHERE t.assignee_id = $1 
		AND t.project_id = $2
		AND t.status = 'completed'
		AND t.updated_at >= $3 
		AND t.updated_at < $4
		GROUP BY t.id, t.title, t.priority, t.updated_at
		ORDER BY t.updated_at DESC`

	rows, err := h.db.Query(query, userID, projectID, startTime, endTime)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id int
		var title, priority string
		var updatedAt time.Time
		var timeSpent int

		err := rows.Scan(&id, &title, &priority, &updatedAt, &timeSpent)
		if err != nil {
			return nil, err
		}

		task := map[string]interface{}{
			"id":                    id,
			"title":                title,
			"priority":             priority,
			"completed_at":         updatedAt.Format("2006-01-02 15:04:05"),
			"time_spent_seconds":   timeSpent,
			"time_spent_formatted": formatDuration(timeSpent),
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

// getActiveTasks 获取当前活跃的任务
func (h *ReportHandler) getActiveTasks(ctx context.Context, userID, projectID int) ([]map[string]interface{}, error) {
	query := `
		SELECT 
			t.id, t.title, t.status, t.priority, t.created_at
		FROM tasks t
		WHERE t.assignee_id = $1 
		AND t.project_id = $2
		AND t.status IN ('in_progress', 'todo', 'testing')
		ORDER BY 
			CASE WHEN t.status = 'in_progress' THEN 1
				 WHEN t.status = 'testing' THEN 2  
				 WHEN t.status = 'todo' THEN 3
				 ELSE 4 END,
			t.priority DESC,
			t.updated_at DESC
		LIMIT 10`

	rows, err := h.db.Query(query, userID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id int
		var title, status, priority string
		var createdAt time.Time

		err := rows.Scan(&id, &title, &status, &priority, &createdAt)
		if err != nil {
			return nil, err
		}

		task := map[string]interface{}{
			"id":         id,
			"title":      title,
			"status":     status,
			"priority":   priority,
			"created_at": createdAt.Format("2006-01-02 15:04:05"),
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

// getTimeDistribution 获取时间分布情况（按任务）
func (h *ReportHandler) getTimeDistribution(ctx context.Context, userID int, startTime, endTime time.Time) ([]map[string]interface{}, error) {
	query := `
		SELECT 
			t.id, t.title, t.priority,
			COALESCE(SUM(GREATEST(ttl.duration_seconds, 0)), 0) as total_time_seconds,
			COUNT(ttl.id) as session_count
		FROM task_time_logs ttl
		JOIN tasks t ON ttl.task_id = t.id
		WHERE ttl.user_id = $1 
		AND ttl.start_time >= $2 
		AND ttl.start_time < $3
		GROUP BY t.id, t.title, t.priority
		HAVING SUM(GREATEST(ttl.duration_seconds, 0)) > 0
		ORDER BY total_time_seconds DESC
		LIMIT 15`

	rows, err := h.db.Query(query, userID, startTime, endTime)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var distribution []map[string]interface{}
	totalTime := 0

	for rows.Next() {
		var taskID int
		var title, priority string
		var timeSeconds, sessionCount int

		err := rows.Scan(&taskID, &title, &priority, &timeSeconds, &sessionCount)
		if err != nil {
			return nil, err
		}

		totalTime += timeSeconds
		
		item := map[string]interface{}{
			"task_id":              taskID,
			"task_title":           title,
			"priority":             priority,
			"time_seconds":         timeSeconds,
			"time_formatted":       formatDuration(timeSeconds),
			"session_count":        sessionCount,
			"average_session":      0,
		}

		if sessionCount > 0 {
			avgSession := timeSeconds / sessionCount
			item["average_session"] = avgSession
			item["average_session_formatted"] = formatDuration(avgSession)
		}

		distribution = append(distribution, item)
	}

	// 计算百分比
	for _, item := range distribution {
		if totalTime > 0 {
			percentage := float64(item["time_seconds"].(int)) / float64(totalTime) * 100
			item["percentage"] = percentage
		} else {
			item["percentage"] = 0.0
		}
	}

	return distribution, nil
}

// calculateDailyEfficiency 计算日工作效率
func (h *ReportHandler) calculateDailyEfficiency(taskStats, timeStats map[string]interface{}) map[string]interface{} {
	efficiency := make(map[string]interface{})
	
	completedTasks := taskStats["completed_tasks"].(int)
	totalHours := timeStats["total_hours"].(float64)
	sessionCount := timeStats["session_count"].(int)

	// 基础效率指标
	efficiency["task_completion_rate"] = taskStats["completion_rate"]
	efficiency["tasks_per_hour"] = 0.0
	if totalHours > 0 {
		efficiency["tasks_per_hour"] = float64(completedTasks) / totalHours
	}

	efficiency["average_session_per_task"] = 0.0
	if completedTasks > 0 {
		efficiency["average_session_per_task"] = float64(sessionCount) / float64(completedTasks)
	}

	// 效率评分（0-100）
	score := 60.0 // 基础分
	if completedTasks > 0 {
		score += float64(completedTasks) * 5 // 每完成一个任务+5分
	}
	if completionRate := taskStats["completion_rate"].(float64); completionRate >= 80 {
		score += 10 // 完成率>=80%额外+10分
	} else if completionRate >= 60 {
		score += 5 // 完成率>=60%额外+5分
	}
	if totalHours >= 4 && totalHours <= 8 {
		score += 10 // 工作时长合理+10分
	} else if totalHours > 8 {
		score -= 5 // 工作时长过长-5分
	}

	if score > 100 {
		score = 100
	}
	efficiency["efficiency_score"] = score

	// 效率等级
	if score >= 90 {
		efficiency["efficiency_level"] = "优秀"
		efficiency["efficiency_icon"] = "🏆"
	} else if score >= 80 {
		efficiency["efficiency_level"] = "良好"
		efficiency["efficiency_icon"] = "👍"
	} else if score >= 70 {
		efficiency["efficiency_level"] = "一般"
		efficiency["efficiency_icon"] = "👌"
	} else {
		efficiency["efficiency_level"] = "待改进"
		efficiency["efficiency_icon"] = "💪"
	}

	// 建议
	var suggestions []string
	if completedTasks == 0 {
		suggestions = append(suggestions, "今日尚未完成任务，建议合理规划时间")
	}
	if totalHours < 2 {
		suggestions = append(suggestions, "工作时间较短，可以适当增加专注时间")
	} else if totalHours > 10 {
		suggestions = append(suggestions, "工作时间较长，注意劳逸结合")
	}
	if sessionCount > 0 && (timeStats["average_session_seconds"].(int) < 900) { // 少于15分钟
		suggestions = append(suggestions, "平均专注时长较短，可以尝试延长单次专注时间")
	}
	if len(suggestions) == 0 {
		suggestions = append(suggestions, "继续保持良好的工作节奏！")
	}
	
	efficiency["suggestions"] = suggestions

	return efficiency
}

// formatDuration 格式化时长
func formatDuration(seconds int) string {
	if seconds == 0 {
		return "0分钟"
	}
	
	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	remainingSeconds := seconds % 60
	
	var parts []string
	if hours > 0 {
		parts = append(parts, fmt.Sprintf("%d小时", hours))
	}
	if minutes > 0 {
		parts = append(parts, fmt.Sprintf("%d分钟", minutes))
	}
	if remainingSeconds > 0 && hours == 0 { // 只有在不满1小时时才显示秒
		parts = append(parts, fmt.Sprintf("%d秒", remainingSeconds))
	}
	
	if len(parts) == 0 {
		return "0分钟"
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
