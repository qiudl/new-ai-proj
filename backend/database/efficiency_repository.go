package database

import (
	"ai-project-backend/models"
	"database/sql"
	"fmt"
	"math"
)

// EfficiencyRepository 效率分析数据仓储
type EfficiencyRepository struct {
	db *sql.DB
}

// NewEfficiencyRepository 创建效率分析仓储实例
func NewEfficiencyRepository(db *sql.DB) *EfficiencyRepository {
	return &EfficiencyRepository{db: db}
}

// GetDailyEfficiencyMetrics 获取每日效率指标
func (r *EfficiencyRepository) GetDailyEfficiencyMetrics(userID int, startDate, endDate string, projectID *int) ([]models.EfficiencyMetrics, error) {
	query := `
		SELECT
			DATE(tl.start_time) as date,
			COALESCE(SUM(EXTRACT(EPOCH FROM (tl.end_time - tl.start_time))/60), 0) as total_work_minutes,
			COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as tasks_completed,
			COUNT(DISTINCT t.id) as tasks_started,
			COALESCE(SUM(CASE
				WHEN EXTRACT(EPOCH FROM (tl.end_time - tl.start_time))/60 >= 25
				THEN EXTRACT(EPOCH FROM (tl.end_time - tl.start_time))/60
				ELSE 0
			END), 0) as focus_time,
			COALESCE(AVG(EXTRACT(EPOCH FROM (tl.end_time - tl.start_time))/3600), 0) as avg_task_duration
		FROM task_time_logs tl
		JOIN tasks t ON tl.task_id = t.id
		WHERE tl.user_id = $1
			AND DATE(tl.start_time) >= $2::date
			AND DATE(tl.start_time) <= $3::date
			AND tl.end_time IS NOT NULL
	`

	args := []interface{}{userID, startDate, endDate}

	if projectID != nil {
		query += " AND t.project_id = $4"
		args = append(args, *projectID)
	}

	query += `
		GROUP BY DATE(tl.start_time)
		ORDER BY date
	`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query daily efficiency metrics: %w", err)
	}
	defer rows.Close()

	var metrics []models.EfficiencyMetrics
	for rows.Next() {
		var m models.EfficiencyMetrics
		var avgDuration float64
		var tasksCompleted, tasksStarted int

		err := rows.Scan(
			&m.Date,
			&m.TotalWorkMinutes,
			&tasksCompleted,
			&tasksStarted,
			&m.FocusTime,
			&avgDuration,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan efficiency metrics: %w", err)
		}

		m.TasksCompleted = tasksCompleted
		m.TasksStarted = tasksStarted
		m.AvgTaskDuration = avgDuration

		// 计算完成率
		if tasksStarted > 0 {
			m.CompletionRate = float64(tasksCompleted) / float64(tasksStarted)
		}

		// 计算效率得分
		m.EfficiencyScore = calculateEfficiencyScore(m)

		metrics = append(metrics, m)
	}

	return metrics, nil
}

// GetEfficiencyTrend 获取效率趋势
func (r *EfficiencyRepository) GetEfficiencyTrend(userID int, startDate, endDate string, projectID *int) (*models.EfficiencyTrend, error) {
	metrics, err := r.GetDailyEfficiencyMetrics(userID, startDate, endDate, projectID)
	if err != nil {
		return nil, err
	}

	if len(metrics) == 0 {
		return &models.EfficiencyTrend{
			TimeRange: fmt.Sprintf("%s ~ %s", startDate, endDate),
			StartDate: startDate,
			EndDate:   endDate,
			DailyData: []models.EfficiencyMetrics{},
			AverageScore: 0,
			Trend: "stable",
		}, nil
	}

	// 计算平均得分
	totalScore := 0.0
	for _, m := range metrics {
		totalScore += m.EfficiencyScore
	}
	avgScore := totalScore / float64(len(metrics))

	// 找出最佳和最差的日期
	var bestDay, worstDay *models.EfficiencyMetrics
	for i := range metrics {
		if bestDay == nil || metrics[i].EfficiencyScore > bestDay.EfficiencyScore {
			bestDay = &metrics[i]
		}
		if worstDay == nil || metrics[i].EfficiencyScore < worstDay.EfficiencyScore {
			worstDay = &metrics[i]
		}
	}

	// 计算趋势方向
	trend := calculateTrendDirection(metrics)

	return &models.EfficiencyTrend{
		TimeRange:    fmt.Sprintf("%s ~ %s", startDate, endDate),
		StartDate:    startDate,
		EndDate:      endDate,
		DailyData:    metrics,
		AverageScore: avgScore,
		Trend:        trend,
		BestDay:      bestDay,
		WorstDay:     worstDay,
	}, nil
}

// calculateEfficiencyScore 计算效率得分
func calculateEfficiencyScore(m models.EfficiencyMetrics) float64 {
	// 1. 完成率得分（40%权重）
	completionScore := m.CompletionRate * 40

	// 2. 专注度得分（30%权重）
	focusRatio := 0.0
	if m.TotalWorkMinutes > 0 {
		focusRatio = float64(m.FocusTime) / float64(m.TotalWorkMinutes)
	}
	focusScore := focusRatio * 30

	// 3. 任务效率得分（20%权重）
	taskEfficiency := 1.0
	if m.AvgTaskDuration < 1 {
		taskEfficiency = m.AvgTaskDuration // 任务过小扣分
	} else if m.AvgTaskDuration > 4 {
		taskEfficiency = 4.0 / m.AvgTaskDuration // 任务过大扣分
	}
	taskScore := taskEfficiency * 20

	// 4. 工作时长得分（10%权重）
	workHours := float64(m.TotalWorkMinutes) / 60
	workScore := 10.0
	if workHours < 6 {
		workScore = (workHours / 6) * 10
	} else if workHours > 10 {
		workScore = 5.0 // 过度工作扣分
	}

	totalScore := completionScore + focusScore + taskScore + workScore
	return math.Min(totalScore, 100) // 最高100分
}

// calculateTrendDirection 计算趋势方向
func calculateTrendDirection(metrics []models.EfficiencyMetrics) string {
	if len(metrics) < 2 {
		return "stable"
	}

	// 简单的线性趋势计算：比较前半部分和后半部分的平均得分
	mid := len(metrics) / 2

	firstHalfSum := 0.0
	for i := 0; i < mid; i++ {
		firstHalfSum += metrics[i].EfficiencyScore
	}
	firstHalfAvg := firstHalfSum / float64(mid)

	secondHalfSum := 0.0
	for i := mid; i < len(metrics); i++ {
		secondHalfSum += metrics[i].EfficiencyScore
	}
	secondHalfAvg := secondHalfSum / float64(len(metrics)-mid)

	diff := secondHalfAvg - firstHalfAvg

	if diff > 5 {
		return "improving"
	} else if diff < -5 {
		return "declining"
	}
	return "stable"
}

// GenerateSmartSuggestions 生成智能建议
func (r *EfficiencyRepository) GenerateSmartSuggestions(metrics []models.EfficiencyMetrics) *models.SuggestionsResponse {
	suggestions := []models.SmartSuggestion{}
	insights := []string{}

	if len(metrics) == 0 {
		return &models.SuggestionsResponse{
			Suggestions: suggestions,
			Insights:    insights,
			Summary:     "暂无数据，无法生成建议",
		}
	}

	// 计算平均指标
	avgWorkHours := 0.0
	avgCompletionRate := 0.0
	avgFocusRatio := 0.0

	for _, m := range metrics {
		avgWorkHours += float64(m.TotalWorkMinutes) / 60
		avgCompletionRate += m.CompletionRate
		if m.TotalWorkMinutes > 0 {
			avgFocusRatio += float64(m.FocusTime) / float64(m.TotalWorkMinutes)
		}
	}

	avgWorkHours /= float64(len(metrics))
	avgCompletionRate /= float64(len(metrics))
	avgFocusRatio /= float64(len(metrics))

	// 1. 工作时长建议
	if avgWorkHours < 6 {
		suggestions = append(suggestions, models.SmartSuggestion{
			ID:          "sug_work_hours_low",
			Category:    "time_management",
			Priority:    "medium",
			Title:       "增加工作时长",
			Description: fmt.Sprintf("平均每日工作时长为%.1f小时，略低于健康工作时长。建议适当增加工作投入。", avgWorkHours),
			Impact:      "预计可提升项目进度15%",
			ActionItems: []string{
				"设定每日工作目标时长6-8小时",
				"合理安排工作与休息时间",
				"避免过度拖延",
			},
			Icon: "⏰",
		})
		insights = append(insights, fmt.Sprintf("平均工作时长%.1f小时，略低于预期", avgWorkHours))
	} else if avgWorkHours > 8 {
		insights = append(insights, fmt.Sprintf("平均工作时长%.1f小时，保持良好工作节奏", avgWorkHours))
	}

	// 2. 任务完成率建议
	if avgCompletionRate < 0.7 {
		suggestions = append(suggestions, models.SmartSuggestion{
			ID:          "sug_completion_rate_low",
			Category:    "task_breakdown",
			Priority:    "high",
			Title:       "改进任务规划",
			Description: fmt.Sprintf("任务完成率为%.0f%%，建议优化任务拆分和优先级管理。", avgCompletionRate*100),
			Impact:      "预计可提升完成率至80%以上",
			ActionItems: []string{
				"将大任务拆分为小任务",
				"使用优先级矩阵管理任务",
				"每日复盘未完成任务原因",
			},
			Icon: "📋",
		})
	} else if avgCompletionRate >= 0.8 {
		insights = append(insights, fmt.Sprintf("任务完成率%.0f%%，表现优秀", avgCompletionRate*100))
	}

	// 3. 专注时间建议
	if avgFocusRatio < 0.5 {
		suggestions = append(suggestions, models.SmartSuggestion{
			ID:          "sug_focus_time_low",
			Category:    "focus",
			Priority:    "high",
			Title:       "提升专注力",
			Description: fmt.Sprintf("专注时间占比%.0f%%，频繁切换任务会降低效率。", avgFocusRatio*100),
			Impact:      "预计可提升整体效率20%",
			ActionItems: []string{
				"使用番茄工作法（25分钟专注+5分钟休息）",
				"减少任务切换次数",
				"创造无干扰的工作环境",
				"关闭不必要的通知",
			},
			Icon: "🎯",
		})
		insights = append(insights, fmt.Sprintf("专注时间占比%.0f%%，建议减少任务切换", avgFocusRatio*100))
	} else {
		insights = append(insights, fmt.Sprintf("专注时间占比%.0f%%，保持良好", avgFocusRatio*100))
	}

	// 生成总结
	summary := generateSummary(metrics, avgCompletionRate, avgFocusRatio)

	return &models.SuggestionsResponse{
		Suggestions: suggestions,
		Insights:    insights,
		Summary:     summary,
	}
}

// generateSummary 生成分析摘要
func generateSummary(metrics []models.EfficiencyMetrics, avgCompletionRate, avgFocusRatio float64) string {
	trend := calculateTrendDirection(metrics)

	trendText := ""
	switch trend {
	case "improving":
		trendText = "呈上升趋势"
	case "declining":
		trendText = "呈下降趋势"
	default:
		trendText = "保持稳定"
	}

	if avgCompletionRate >= 0.8 && avgFocusRatio >= 0.7 {
		return fmt.Sprintf("整体效率%s，各项指标优秀，继续保持当前工作节奏", trendText)
	} else if avgCompletionRate >= 0.7 || avgFocusRatio >= 0.6 {
		return fmt.Sprintf("整体效率%s，表现良好，建议参考上述建议进一步优化", trendText)
	}
	return fmt.Sprintf("整体效率%s，建议重点关注任务规划和专注力提升", trendText)
}
