package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
)

// TimerDataValidator provides data validation and quality checking for timer logs
type TimerDataValidator struct {
	db *sql.DB
}

// NewTimerDataValidator creates a new timer data validator
func NewTimerDataValidator(db *sql.DB) *TimerDataValidator {
	return &TimerDataValidator{
		db: db,
	}
}

// ValidationResult represents a single validation check result
type ValidationResult struct {
	CheckName   string                 `json:"check_name"`
	Status      string                 `json:"status"` // "pass", "warning", "error"
	Message     string                 `json:"message"`
	Details     map[string]interface{} `json:"details,omitempty"`
	Timestamp   time.Time              `json:"timestamp"`
	Severity    string                 `json:"severity"` // "low", "medium", "high", "critical"
	AffectedIDs []int                  `json:"affected_ids,omitempty"`
}

// DataValidationReport represents the complete validation report
type DataValidationReport struct {
	TotalChecks       int                `json:"total_checks"`
	PassedChecks      int                `json:"passed_checks"`
	WarningChecks     int                `json:"warning_checks"`
	ErrorChecks       int                `json:"error_checks"`
	OverallScore      float64            `json:"overall_score"` // 0-100
	OverallStatus     string             `json:"overall_status"` // "healthy", "warning", "critical"
	ValidationResults []ValidationResult `json:"validation_results"`
	GeneratedAt       time.Time          `json:"generated_at"`
	UserID            int                `json:"user_id"`
	Summary           ValidationSummary  `json:"summary"`
}

// ValidationSummary provides high-level summary information
type ValidationSummary struct {
	TotalTimerSessions     int                    `json:"total_timer_sessions"`
	ValidSessions          int                    `json:"valid_sessions"`
	DataQualityScore       float64                `json:"data_quality_score"`
	RecommendedActions     []string               `json:"recommended_actions"`
	HealthMetrics          map[string]interface{} `json:"health_metrics"`
	LastHealthyDataDate    *time.Time             `json:"last_healthy_data_date,omitempty"`
	EfficiencyCalculatable bool                   `json:"efficiency_calculatable"`
}

// ValidateUserTimerData performs comprehensive validation for a user's timer data
func (v *TimerDataValidator) ValidateUserTimerData(ctx context.Context, userID int) (*DataValidationReport, error) {
	report := &DataValidationReport{
		UserID:      userID,
		GeneratedAt: time.Now(),
	}

	// Run all validation checks
	checks := []func(context.Context, int) ValidationResult{
		v.checkDataCompleteness,
		v.checkDataConsistency,
		v.checkTimeLogic,
		v.checkDurationAccuracy,
		v.checkRecentActivity,
		v.checkEfficiencyCalculability,
		v.checkDataIntegrity,
		v.checkPerformanceImpact,
	}

	var results []ValidationResult
	passCount, warningCount, errorCount := 0, 0, 0

	for _, check := range checks {
		result := check(ctx, userID)
		results = append(results, result)

		switch result.Status {
		case "pass":
			passCount++
		case "warning":
			warningCount++
		case "error":
			errorCount++
		}
	}

	report.ValidationResults = results
	report.TotalChecks = len(results)
	report.PassedChecks = passCount
	report.WarningChecks = warningCount
	report.ErrorChecks = errorCount

	// Calculate overall score
	report.OverallScore = float64(passCount*100 + warningCount*50) / float64(len(results)*100) * 100

	// Determine overall status
	if errorCount > 0 {
		report.OverallStatus = "critical"
	} else if warningCount > 0 {
		report.OverallStatus = "warning"
	} else {
		report.OverallStatus = "healthy"
	}

	// Generate summary
	summary, err := v.generateSummary(ctx, userID, results)
	if err != nil {
		log.Printf("Error generating summary: %v", err)
		// Continue with partial summary
		summary = &ValidationSummary{
			RecommendedActions: []string{"无法生成完整报告，请联系管理员"},
		}
	}
	report.Summary = *summary

	return report, nil
}

// checkDataCompleteness validates that required fields are present
func (v *TimerDataValidator) checkDataCompleteness(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "数据完整性检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check for required fields
	query := `
		SELECT 
			COUNT(*) as total_records,
			COUNT(CASE WHEN target_title IS NULL OR target_title = '' THEN 1 END) as missing_title,
			COUNT(CASE WHEN start_time IS NULL THEN 1 END) as missing_start_time,
			COUNT(CASE WHEN end_time IS NOT NULL AND duration_seconds IS NULL THEN 1 END) as missing_duration,
			COUNT(CASE WHEN target_type IS NULL OR target_type = '' THEN 1 END) as missing_type
		FROM unified_timer_logs 
		WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
	`

	var totalRecords, missingTitle, missingStartTime, missingDuration, missingType int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(
		&totalRecords, &missingTitle, &missingStartTime, &missingDuration, &missingType,
	)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("数据完整性检查失败: %v", err)
		return result
	}

	result.Details["total_records"] = totalRecords
	result.Details["missing_title"] = missingTitle
	result.Details["missing_start_time"] = missingStartTime
	result.Details["missing_duration"] = missingDuration
	result.Details["missing_type"] = missingType

	totalMissing := missingTitle + missingStartTime + missingDuration + missingType
	
	if totalMissing == 0 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "所有必需字段完整"
	} else if totalMissing < int(float64(totalRecords)*0.05) {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = fmt.Sprintf("发现 %d 条记录缺少必需字段 (%.1f%%)", totalMissing, float64(totalMissing)/float64(totalRecords)*100)
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("严重数据缺失: %d 条记录缺少必需字段 (%.1f%%)", totalMissing, float64(totalMissing)/float64(totalRecords)*100)
	}

	return result
}

// checkDataConsistency validates logical consistency in the data
func (v *TimerDataValidator) checkDataConsistency(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "数据一致性检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check for various consistency issues
	query := `
		SELECT 
			COUNT(*) as total_records,
			COUNT(CASE WHEN end_time < start_time THEN 1 END) as invalid_time_range,
			COUNT(CASE WHEN duration_seconds < 0 THEN 1 END) as negative_duration,
			COUNT(CASE WHEN actual_work_seconds > duration_seconds THEN 1 END) as invalid_work_time,
			COUNT(CASE WHEN pause_total_seconds > duration_seconds THEN 1 END) as invalid_pause_time,
			COUNT(CASE WHEN inference_confidence < 0 OR inference_confidence > 1 THEN 1 END) as invalid_confidence
		FROM unified_timer_logs 
		WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
	`

	var totalRecords, invalidTimeRange, negativeDuration, invalidWorkTime, invalidPauseTime, invalidConfidence int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(
		&totalRecords, &invalidTimeRange, &negativeDuration, &invalidWorkTime, &invalidPauseTime, &invalidConfidence,
	)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("数据一致性检查失败: %v", err)
		return result
	}

	result.Details["total_records"] = totalRecords
	result.Details["invalid_time_range"] = invalidTimeRange
	result.Details["negative_duration"] = negativeDuration
	result.Details["invalid_work_time"] = invalidWorkTime
	result.Details["invalid_pause_time"] = invalidPauseTime
	result.Details["invalid_confidence"] = invalidConfidence

	totalInconsistent := invalidTimeRange + negativeDuration + invalidWorkTime + invalidPauseTime + invalidConfidence

	if totalInconsistent == 0 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "数据逻辑一致"
	} else if totalInconsistent < int(float64(totalRecords)*0.02) {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = fmt.Sprintf("发现 %d 条不一致记录 (%.1f%%)", totalInconsistent, float64(totalInconsistent)/float64(totalRecords)*100)
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("严重数据不一致: %d 条记录存在逻辑错误 (%.1f%%)", totalInconsistent, float64(totalInconsistent)/float64(totalRecords)*100)
	}

	return result
}

// checkTimeLogic validates time-related logic
func (v *TimerDataValidator) checkTimeLogic(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "时间逻辑检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check for unrealistic durations and overlapping sessions
	query := `
		SELECT 
			COUNT(*) as total_records,
			COUNT(CASE WHEN duration_seconds > 43200 THEN 1 END) as too_long, -- > 12 hours
			COUNT(CASE WHEN duration_seconds < 60 AND status = 'completed' THEN 1 END) as too_short, -- < 1 minute
			COUNT(CASE WHEN start_time > NOW() THEN 1 END) as future_time,
			COUNT(CASE WHEN start_time < NOW() - INTERVAL '2 years' THEN 1 END) as too_old
		FROM unified_timer_logs 
		WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
	`

	var totalRecords, tooLong, tooShort, futureTime, tooOld int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(
		&totalRecords, &tooLong, &tooShort, &futureTime, &tooOld,
	)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("时间逻辑检查失败: %v", err)
		return result
	}

	result.Details["total_records"] = totalRecords
	result.Details["too_long"] = tooLong
	result.Details["too_short"] = tooShort
	result.Details["future_time"] = futureTime
	result.Details["too_old"] = tooOld

	totalTimeIssues := tooLong + tooShort + futureTime + tooOld

	if totalTimeIssues == 0 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "时间数据合理"
	} else if totalTimeIssues < int(float64(totalRecords)*0.05) {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = fmt.Sprintf("发现 %d 条时间异常记录 (%.1f%%)", totalTimeIssues, float64(totalTimeIssues)/float64(totalRecords)*100)
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("严重时间异常: %d 条记录存在时间问题 (%.1f%%)", totalTimeIssues, float64(totalTimeIssues)/float64(totalRecords)*100)
	}

	return result
}

// checkDurationAccuracy validates duration calculation accuracy
func (v *TimerDataValidator) checkDurationAccuracy(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "时长准确性检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check for duration calculation accuracy
	query := `
		SELECT 
			COUNT(*) as total_with_end_time,
			COUNT(CASE WHEN ABS(duration_seconds - EXTRACT(EPOCH FROM (end_time - start_time))) > 60 THEN 1 END) as inaccurate_duration
		FROM unified_timer_logs 
		WHERE user_id = $1 
			AND end_time IS NOT NULL 
			AND duration_seconds IS NOT NULL
			AND created_at >= NOW() - INTERVAL '30 days'
	`

	var totalWithEndTime, inaccurateDuration int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(&totalWithEndTime, &inaccurateDuration)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("时长准确性检查失败: %v", err)
		return result
	}

	result.Details["total_with_end_time"] = totalWithEndTime
	result.Details["inaccurate_duration"] = inaccurateDuration

	if totalWithEndTime == 0 {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = "没有已完成的计时记录，无法验证时长准确性"
	} else if inaccurateDuration == 0 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "时长计算准确"
	} else if inaccurateDuration < int(float64(totalWithEndTime)*0.1) {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = fmt.Sprintf("发现 %d 条时长计算不准确的记录 (%.1f%%)", inaccurateDuration, float64(inaccurateDuration)/float64(totalWithEndTime)*100)
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("严重时长计算错误: %d 条记录时长不准确 (%.1f%%)", inaccurateDuration, float64(inaccurateDuration)/float64(totalWithEndTime)*100)
	}

	return result
}

// checkRecentActivity validates recent activity patterns
func (v *TimerDataValidator) checkRecentActivity(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "活动模式检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check for recent activity patterns
	query := `
		SELECT 
			COUNT(*) as total_last_7_days,
			COUNT(*) FILTER (WHERE start_time >= NOW() - INTERVAL '1 day') as last_1_day,
			COUNT(*) FILTER (WHERE start_time >= NOW() - INTERVAL '3 days') as last_3_days,
			COUNT(DISTINCT DATE(start_time)) as active_days_last_week
		FROM unified_timer_logs 
		WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '7 days'
	`

	var totalLast7Days, last1Day, last3Days, activeDaysLastWeek int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(&totalLast7Days, &last1Day, &last3Days, &activeDaysLastWeek)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("活动模式检查失败: %v", err)
		return result
	}

	result.Details["total_last_7_days"] = totalLast7Days
	result.Details["last_1_day"] = last1Day
	result.Details["last_3_days"] = last3Days
	result.Details["active_days_last_week"] = activeDaysLastWeek

	if totalLast7Days >= 10 && activeDaysLastWeek >= 3 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "活动模式正常"
	} else if totalLast7Days >= 3 || activeDaysLastWeek >= 1 {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = "活动量较少，建议增加使用频率"
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = "近期无活动记录，效率分析功能可能无法正常工作"
	}

	return result
}

// checkEfficiencyCalculability validates if efficiency calculation is possible
func (v *TimerDataValidator) checkEfficiencyCalculability(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "效率计算可行性检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check if we have enough data for efficiency calculation (3 days)
	query := `
		SELECT 
			COUNT(DISTINCT DATE(start_time)) as days_with_data,
			COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) as today_sessions,
			COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE - 1) as yesterday_sessions,
			COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE - 2) as day_before_sessions,
			COUNT(*) as total_recent_sessions
		FROM unified_timer_logs 
		WHERE user_id = $1 
			AND start_time >= CURRENT_DATE - INTERVAL '2 days'
			AND duration_seconds IS NOT NULL
			AND duration_seconds > 0
	`

	var daysWithData, todaySessions, yesterdaySessions, dayBeforeSessions, totalRecentSessions int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(
		&daysWithData, &todaySessions, &yesterdaySessions, &dayBeforeSessions, &totalRecentSessions,
	)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("效率计算可行性检查失败: %v", err)
		return result
	}

	result.Details["days_with_data"] = daysWithData
	result.Details["today_sessions"] = todaySessions
	result.Details["yesterday_sessions"] = yesterdaySessions
	result.Details["day_before_sessions"] = dayBeforeSessions
	result.Details["total_recent_sessions"] = totalRecentSessions

	if daysWithData >= 2 && totalRecentSessions >= 3 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "效率计算数据充足"
	} else if daysWithData >= 1 && totalRecentSessions >= 1 {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = "效率计算数据不足，建议增加计时记录"
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = "无效率计算数据，效率分析功能不可用"
	}

	return result
}

// checkDataIntegrity validates database constraints and referential integrity
func (v *TimerDataValidator) checkDataIntegrity(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "数据完整性约束检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check for orphaned records and constraint violations
	query := `
		SELECT 
			COUNT(*) as total_records,
			COUNT(CASE WHEN target_type NOT IN ('project_task', 'personal_task', 'quick_timer', 'pomodoro') THEN 1 END) as invalid_target_type,
			COUNT(CASE WHEN status NOT IN ('running', 'paused', 'completed', 'cancelled') THEN 1 END) as invalid_status,
			COUNT(CASE WHEN target_id IS NOT NULL AND target_type = 'project_task' AND NOT EXISTS (SELECT 1 FROM tasks WHERE id = target_id) THEN 1 END) as orphaned_task_refs
		FROM unified_timer_logs 
		WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
	`

	var totalRecords, invalidTargetType, invalidStatus, orphanedTaskRefs int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(
		&totalRecords, &invalidTargetType, &invalidStatus, &orphanedTaskRefs,
	)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("数据完整性约束检查失败: %v", err)
		return result
	}

	result.Details["total_records"] = totalRecords
	result.Details["invalid_target_type"] = invalidTargetType
	result.Details["invalid_status"] = invalidStatus
	result.Details["orphaned_task_refs"] = orphanedTaskRefs

	totalIntegrityIssues := invalidTargetType + invalidStatus + orphanedTaskRefs

	if totalIntegrityIssues == 0 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "数据完整性约束良好"
	} else if totalIntegrityIssues < int(float64(totalRecords)*0.02) {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = fmt.Sprintf("发现 %d 条约束违反记录 (%.1f%%)", totalIntegrityIssues, float64(totalIntegrityIssues)/float64(totalRecords)*100)
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("严重完整性问题: %d 条记录违反约束 (%.1f%%)", totalIntegrityIssues, float64(totalIntegrityIssues)/float64(totalRecords)*100)
	}

	return result
}

// checkPerformanceImpact validates data size and performance implications
func (v *TimerDataValidator) checkPerformanceImpact(ctx context.Context, userID int) ValidationResult {
	result := ValidationResult{
		CheckName: "性能影响检查",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Check for performance-related metrics
	query := `
		SELECT 
			COUNT(*) as total_user_records,
			COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_records,
			COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 year') as yearly_records,
			AVG(LENGTH(description)) as avg_description_length,
			COUNT(CASE WHEN array_length(tags, 1) > 10 THEN 1 END) as excessive_tags
		FROM unified_timer_logs 
		WHERE user_id = $1
	`

	var totalUserRecords, recentRecords, yearlyRecords, excessiveTags int
	var avgDescriptionLength sql.NullFloat64
	err := v.db.QueryRowContext(ctx, query, userID).Scan(
		&totalUserRecords, &recentRecords, &yearlyRecords, &avgDescriptionLength, &excessiveTags,
	)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("性能影响检查失败: %v", err)
		return result
	}

	result.Details["total_user_records"] = totalUserRecords
	result.Details["recent_records"] = recentRecords
	result.Details["yearly_records"] = yearlyRecords
	result.Details["avg_description_length"] = avgDescriptionLength.Float64
	result.Details["excessive_tags"] = excessiveTags

	if totalUserRecords < 10000 && excessiveTags == 0 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "性能影响良好"
	} else if totalUserRecords < 50000 && excessiveTags < 10 {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = "数据量较大，建议定期清理历史数据"
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = "数据量过大，可能影响系统性能"
	}

	return result
}

// generateSummary creates a comprehensive summary of validation results
func (v *TimerDataValidator) generateSummary(ctx context.Context, userID int, results []ValidationResult) (*ValidationSummary, error) {
	summary := &ValidationSummary{
		HealthMetrics:      make(map[string]interface{}),
		RecommendedActions: make([]string, 0),
	}

	// Get basic statistics
	query := `
		SELECT 
			COUNT(*) as total_sessions,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as valid_sessions,
			MAX(start_time) as last_activity
		FROM unified_timer_logs 
		WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
	`

	var lastActivity sql.NullTime
	err := v.db.QueryRowContext(ctx, query, userID).Scan(
		&summary.TotalTimerSessions, &summary.ValidSessions, &lastActivity,
	)

	if err != nil {
		return nil, err
	}

	if lastActivity.Valid {
		summary.LastHealthyDataDate = &lastActivity.Time
	}

	// Calculate data quality score
	passCount := 0
	for _, result := range results {
		if result.Status == "pass" {
			passCount++
		}
	}
	summary.DataQualityScore = float64(passCount) / float64(len(results)) * 100

	// Check if efficiency calculation is possible
	summary.EfficiencyCalculatable = summary.TotalTimerSessions >= 3 && summary.ValidSessions >= 2

	// Generate recommended actions based on results
	for _, result := range results {
		if result.Status == "error" {
			switch result.CheckName {
			case "数据完整性检查":
				summary.RecommendedActions = append(summary.RecommendedActions, "补充缺失的必需字段")
			case "效率计算可行性检查":
				summary.RecommendedActions = append(summary.RecommendedActions, "增加计时记录以支持效率分析")
			case "活动模式检查":
				summary.RecommendedActions = append(summary.RecommendedActions, "提高使用频率")
			}
		}
	}

	// Add default recommendations if none generated
	if len(summary.RecommendedActions) == 0 {
		summary.RecommendedActions = append(summary.RecommendedActions, "数据质量良好，继续保持使用习惯")
	}

	// Set health metrics
	summary.HealthMetrics["validation_score"] = summary.DataQualityScore
	summary.HealthMetrics["total_checks"] = len(results)
	summary.HealthMetrics["last_updated"] = time.Now()

	return summary, nil
}

// QuickValidation performs a simplified validation for real-time checks
func (v *TimerDataValidator) QuickValidation(ctx context.Context, userID int) (*ValidationResult, error) {
	result := &ValidationResult{
		CheckName: "快速验证",
		Timestamp: time.Now(),
		Details:   make(map[string]interface{}),
	}

	// Quick check for basic data availability
	query := `
		SELECT 
			COUNT(*) as recent_sessions,
			COUNT(DISTINCT DATE(start_time)) as active_days,
			COUNT(CASE WHEN duration_seconds IS NOT NULL AND duration_seconds > 0 THEN 1 END) as valid_sessions
		FROM unified_timer_logs 
		WHERE user_id = $1 AND start_time >= NOW() - INTERVAL '7 days'
	`

	var recentSessions, activeDays, validSessions int
	err := v.db.QueryRowContext(ctx, query, userID).Scan(&recentSessions, &activeDays, &validSessions)

	if err != nil {
		result.Status = "error"
		result.Severity = "high"
		result.Message = fmt.Sprintf("快速验证失败: %v", err)
		return result, err
	}

	result.Details["recent_sessions"] = recentSessions
	result.Details["active_days"] = activeDays
	result.Details["valid_sessions"] = validSessions

	if recentSessions >= 5 && activeDays >= 2 && validSessions >= 3 {
		result.Status = "pass"
		result.Severity = "low"
		result.Message = "数据状态良好"
	} else if recentSessions >= 1 && validSessions >= 1 {
		result.Status = "warning"
		result.Severity = "medium"
		result.Message = "数据较少，建议增加使用"
	} else {
		result.Status = "error"
		result.Severity = "high"
		result.Message = "数据不足，功能可能受限"
	}

	return result, nil
}