package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// DataMonitoringService provides monitoring and alerting for data quality
type DataMonitoringService struct {
	db        *sql.DB
	validator *TimerDataValidator
}

// NewDataMonitoringService creates a new data monitoring service
func NewDataMonitoringService(db *sql.DB, validator *TimerDataValidator) *DataMonitoringService {
	return &DataMonitoringService{
		db:        db,
		validator: validator,
	}
}

// AlertLevel represents the severity level of an alert
type AlertLevel string

const (
	AlertLevelInfo     AlertLevel = "info"
	AlertLevelWarning  AlertLevel = "warning"
	AlertLevelCritical AlertLevel = "critical"
)

// Alert represents a data quality alert
type Alert struct {
	ID          int                    `json:"id"`
	UserID      int                    `json:"user_id"`
	AlertType   string                 `json:"alert_type"`
	Level       AlertLevel             `json:"level"`
	Title       string                 `json:"title"`
	Message     string                 `json:"message"`
	Details     map[string]interface{} `json:"details"`
	Resolved    bool                   `json:"resolved"`
	ResolvedAt  *time.Time             `json:"resolved_at,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// MonitoringMetrics represents system-wide monitoring metrics
type MonitoringMetrics struct {
	TotalUsers           int                    `json:"total_users"`
	ActiveUsers          int                    `json:"active_users"`
	TotalTimerSessions   int                    `json:"total_timer_sessions"`
	HealthyUsers         int                    `json:"healthy_users"`
	UsersWithWarnings    int                    `json:"users_with_warnings"`
	UsersWithErrors      int                    `json:"users_with_errors"`
	SystemHealthScore    float64                `json:"system_health_score"`
	LastMonitoringRun    time.Time              `json:"last_monitoring_run"`
	AlertCounts          map[AlertLevel]int     `json:"alert_counts"`
	RecentAlerts         []Alert                `json:"recent_alerts"`
	PerformanceMetrics   map[string]interface{} `json:"performance_metrics"`
}

// MonitoringConfig represents monitoring configuration
type MonitoringConfig struct {
	EnableAlerting           bool          `json:"enable_alerting"`
	CheckInterval            time.Duration `json:"check_interval"`
	AlertThresholds          AlertThresholds `json:"alert_thresholds"`
	MaxAlertsPerUser         int           `json:"max_alerts_per_user"`
	AlertRetentionDays       int           `json:"alert_retention_days"`
	EnablePerformanceMonitoring bool       `json:"enable_performance_monitoring"`
}

// AlertThresholds defines thresholds for different alert types
type AlertThresholds struct {
	MinDailySessionsWarning  int     `json:"min_daily_sessions_warning"`
	MinDailySessionsCritical int     `json:"min_daily_sessions_critical"`
	MaxInactiveDaysWarning   int     `json:"max_inactive_days_warning"`
	MaxInactiveDaysCritical  int     `json:"max_inactive_days_critical"`
	MinDataQualityScore      float64 `json:"min_data_quality_score"`
}

// GetDefaultMonitoringConfig returns default monitoring configuration
func GetDefaultMonitoringConfig() MonitoringConfig {
	return MonitoringConfig{
		EnableAlerting:    true,
		CheckInterval:     time.Hour * 6, // Check every 6 hours
		MaxAlertsPerUser:  10,
		AlertRetentionDays: 30,
		EnablePerformanceMonitoring: true,
		AlertThresholds: AlertThresholds{
			MinDailySessionsWarning:  3,
			MinDailySessionsCritical: 1,
			MaxInactiveDaysWarning:   3,
			MaxInactiveDaysCritical:  7,
			MinDataQualityScore:      70.0,
		},
	}
}

// RunMonitoring performs comprehensive monitoring check
func (m *DataMonitoringService) RunMonitoring(ctx context.Context, config MonitoringConfig) (*MonitoringMetrics, error) {
	metrics := &MonitoringMetrics{
		LastMonitoringRun: time.Now(),
		AlertCounts:       make(map[AlertLevel]int),
		PerformanceMetrics: make(map[string]interface{}),
	}

	// Get basic system metrics
	if err := m.collectSystemMetrics(ctx, metrics); err != nil {
		log.Printf("Error collecting system metrics: %v", err)
	}

	// Check individual users if alerting is enabled
	if config.EnableAlerting {
		if err := m.checkUserDataQuality(ctx, config, metrics); err != nil {
			log.Printf("Error checking user data quality: %v", err)
		}
	}

	// Collect performance metrics
	if config.EnablePerformanceMonitoring {
		if err := m.collectPerformanceMetrics(ctx, metrics); err != nil {
			log.Printf("Error collecting performance metrics: %v", err)
		}
	}

	// Get recent alerts
	if err := m.getRecentAlerts(ctx, metrics); err != nil {
		log.Printf("Error getting recent alerts: %v", err)
	}

	// Calculate system health score
	metrics.SystemHealthScore = m.calculateSystemHealthScore(metrics)

	return metrics, nil
}

// collectSystemMetrics gathers basic system-wide metrics
func (m *DataMonitoringService) collectSystemMetrics(ctx context.Context, metrics *MonitoringMetrics) error {
	query := `
		SELECT 
			COUNT(DISTINCT u.id) as total_users,
			COUNT(DISTINCT CASE WHEN utl.start_time >= NOW() - INTERVAL '7 days' THEN u.id END) as active_users,
			COUNT(utl.id) as total_timer_sessions
		FROM users u
		LEFT JOIN unified_timer_logs utl ON u.id = utl.user_id
		WHERE u.user_type != 'system'
	`

	err := m.db.QueryRowContext(ctx, query).Scan(
		&metrics.TotalUsers,
		&metrics.ActiveUsers,
		&metrics.TotalTimerSessions,
	)

	return err
}

// checkUserDataQuality checks data quality for all users and generates alerts
func (m *DataMonitoringService) checkUserDataQuality(ctx context.Context, config MonitoringConfig, metrics *MonitoringMetrics) error {
	// Get all active users
	query := `
		SELECT DISTINCT u.id 
		FROM users u
		LEFT JOIN unified_timer_logs utl ON u.id = utl.user_id
		WHERE u.user_type != 'system'
			AND (utl.start_time >= NOW() - INTERVAL '30 days' OR utl.id IS NULL)
	`

	rows, err := m.db.QueryContext(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	healthyCount := 0
	warningCount := 0
	errorCount := 0

	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			continue
		}

		// Quick validation for each user
		result, err := m.validator.QuickValidation(ctx, userID)
		if err != nil {
			log.Printf("Error validating user %d: %v", userID, err)
			continue
		}

		switch result.Status {
		case "pass":
			healthyCount++
		case "warning":
			warningCount++
			// Generate warning alert if needed
			m.createAlert(ctx, userID, "data_quality_warning", AlertLevelWarning, 
				"数据质量警告", result.Message, result.Details)
		case "error":
			errorCount++
			// Generate error alert
			m.createAlert(ctx, userID, "data_quality_error", AlertLevelCritical,
				"数据质量错误", result.Message, result.Details)
		}

		// Check specific thresholds
		m.checkUserThresholds(ctx, userID, config.AlertThresholds, result)
	}

	metrics.HealthyUsers = healthyCount
	metrics.UsersWithWarnings = warningCount
	metrics.UsersWithErrors = errorCount

	return nil
}

// checkUserThresholds checks specific thresholds for a user
func (m *DataMonitoringService) checkUserThresholds(ctx context.Context, userID int, thresholds AlertThresholds, result *ValidationResult) {
	recentSessions := result.Details["recent_sessions"].(int)
	activeDays := result.Details["active_days"].(int)

	// Check session count thresholds
	if recentSessions <= thresholds.MinDailySessionsCritical {
		m.createAlert(ctx, userID, "low_activity_critical", AlertLevelCritical,
			"活动量极低", "用户近期几乎没有使用计时功能", result.Details)
	} else if recentSessions <= thresholds.MinDailySessionsWarning {
		m.createAlert(ctx, userID, "low_activity_warning", AlertLevelWarning,
			"活动量较低", "用户近期使用计时功能较少", result.Details)
	}

	// Check inactive days
	daysSinceLastActivity := 7 - activeDays
	if daysSinceLastActivity >= thresholds.MaxInactiveDaysCritical {
		m.createAlert(ctx, userID, "inactive_user_critical", AlertLevelCritical,
			"用户长期未活动", fmt.Sprintf("用户已经 %d 天未使用", daysSinceLastActivity), result.Details)
	} else if daysSinceLastActivity >= thresholds.MaxInactiveDaysWarning {
		m.createAlert(ctx, userID, "inactive_user_warning", AlertLevelWarning,
			"用户活动减少", fmt.Sprintf("用户最近 %d 天活动较少", daysSinceLastActivity), result.Details)
	}
}

// createAlert creates a new alert (avoids duplicates)
func (m *DataMonitoringService) createAlert(ctx context.Context, userID int, alertType string, level AlertLevel, title, message string, details map[string]interface{}) {
	// Check if similar alert already exists (within last 24 hours)
	existingQuery := `
		SELECT COUNT(*) FROM alerts 
		WHERE user_id = $1 AND alert_type = $2 AND resolved = false 
			AND created_at >= NOW() - INTERVAL '24 hours'
	`

	var count int
	err := m.db.QueryRowContext(ctx, existingQuery, userID, alertType).Scan(&count)
	if err != nil || count > 0 {
		return // Skip if similar alert exists
	}

	// Serialize details
	detailsJSON, _ := json.Marshal(details)

	// Insert new alert
	insertQuery := `
		INSERT INTO alerts (user_id, alert_type, level, title, message, details, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
	`

	_, err = m.db.ExecContext(ctx, insertQuery, userID, alertType, level, title, message, detailsJSON)
	if err != nil {
		log.Printf("Error creating alert: %v", err)
	}
}

// collectPerformanceMetrics gathers performance-related metrics
func (m *DataMonitoringService) collectPerformanceMetrics(ctx context.Context, metrics *MonitoringMetrics) error {
	// Database performance metrics
	dbMetrics := make(map[string]interface{})

	// Table sizes
	sizeQuery := `
		SELECT 
			pg_size_pretty(pg_total_relation_size('unified_timer_logs')) as timer_logs_size,
			pg_size_pretty(pg_total_relation_size('tasks')) as tasks_size,
			(SELECT COUNT(*) FROM unified_timer_logs) as timer_logs_count,
			(SELECT COUNT(*) FROM tasks) as tasks_count
	`

	var timerLogsSize, tasksSize string
	var timerLogsCount, tasksCount int
	err := m.db.QueryRowContext(ctx, sizeQuery).Scan(&timerLogsSize, &tasksSize, &timerLogsCount, &tasksCount)
	if err == nil {
		dbMetrics["timer_logs_size"] = timerLogsSize
		dbMetrics["tasks_size"] = tasksSize
		dbMetrics["timer_logs_count"] = timerLogsCount
		dbMetrics["tasks_count"] = tasksCount
	}

	// Query performance metrics
	perfQuery := `
		SELECT 
			AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_session_duration,
			COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as sessions_last_hour,
			COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as sessions_last_day
		FROM unified_timer_logs
		WHERE end_time IS NOT NULL
	`

	var avgSessionDuration sql.NullFloat64
	var sessionsLastHour, sessionsLastDay int
	err = m.db.QueryRowContext(ctx, perfQuery).Scan(&avgSessionDuration, &sessionsLastHour, &sessionsLastDay)
	if err == nil {
		dbMetrics["avg_session_duration"] = avgSessionDuration.Float64
		dbMetrics["sessions_last_hour"] = sessionsLastHour
		dbMetrics["sessions_last_day"] = sessionsLastDay
	}

	metrics.PerformanceMetrics["database"] = dbMetrics
	return nil
}

// getRecentAlerts retrieves recent alerts for the monitoring report
func (m *DataMonitoringService) getRecentAlerts(ctx context.Context, metrics *MonitoringMetrics) error {
	// Get alert counts by level
	countQuery := `
		SELECT level, COUNT(*) 
		FROM alerts 
		WHERE resolved = false AND created_at >= NOW() - INTERVAL '24 hours'
		GROUP BY level
	`

	rows, err := m.db.QueryContext(ctx, countQuery)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var level string
		var count int
		if err := rows.Scan(&level, &count); err == nil {
			metrics.AlertCounts[AlertLevel(level)] = count
		}
	}

	// Get recent alerts
	alertQuery := `
		SELECT id, user_id, alert_type, level, title, message, details, resolved, resolved_at, created_at, updated_at
		FROM alerts 
		WHERE created_at >= NOW() - INTERVAL '24 hours'
		ORDER BY created_at DESC 
		LIMIT 10
	`

	alertRows, err := m.db.QueryContext(ctx, alertQuery)
	if err != nil {
		return err
	}
	defer alertRows.Close()

	var alerts []Alert
	for alertRows.Next() {
		var alert Alert
		var detailsJSON []byte
		var resolvedAt sql.NullTime

		err := alertRows.Scan(
			&alert.ID, &alert.UserID, &alert.AlertType, &alert.Level,
			&alert.Title, &alert.Message, &detailsJSON, &alert.Resolved,
			&resolvedAt, &alert.CreatedAt, &alert.UpdatedAt,
		)

		if err == nil {
			if resolvedAt.Valid {
				alert.ResolvedAt = &resolvedAt.Time
			}
			json.Unmarshal(detailsJSON, &alert.Details)
			alerts = append(alerts, alert)
		}
	}

	metrics.RecentAlerts = alerts
	return nil
}

// calculateSystemHealthScore calculates overall system health score
func (m *DataMonitoringService) calculateSystemHealthScore(metrics *MonitoringMetrics) float64 {
	if metrics.TotalUsers == 0 {
		return 100.0 // No users, no problems
	}

	// Base score from user health distribution
	healthyRatio := float64(metrics.HealthyUsers) / float64(metrics.TotalUsers)
	warningRatio := float64(metrics.UsersWithWarnings) / float64(metrics.TotalUsers)
	errorRatio := float64(metrics.UsersWithErrors) / float64(metrics.TotalUsers)

	baseScore := healthyRatio*100 + warningRatio*60 + errorRatio*20

	// Adjust for activity level
	activityRatio := float64(metrics.ActiveUsers) / float64(metrics.TotalUsers)
	activityBonus := activityRatio * 10

	// Adjust for alert volume
	totalAlerts := metrics.AlertCounts[AlertLevelCritical]*3 + metrics.AlertCounts[AlertLevelWarning]
	alertPenalty := float64(totalAlerts) * 2

	finalScore := baseScore + activityBonus - alertPenalty

	if finalScore > 100 {
		finalScore = 100
	} else if finalScore < 0 {
		finalScore = 0
	}

	return finalScore
}

// ResolveAlert marks an alert as resolved
func (m *DataMonitoringService) ResolveAlert(ctx context.Context, alertID int) error {
	query := `
		UPDATE alerts 
		SET resolved = true, resolved_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`

	_, err := m.db.ExecContext(ctx, query, alertID)
	return err
}

// GetUserAlerts retrieves alerts for a specific user
func (m *DataMonitoringService) GetUserAlerts(ctx context.Context, userID int, resolved bool) ([]Alert, error) {
	query := `
		SELECT id, user_id, alert_type, level, title, message, details, resolved, resolved_at, created_at, updated_at
		FROM alerts 
		WHERE user_id = $1 AND resolved = $2
		ORDER BY created_at DESC 
		LIMIT 50
	`

	rows, err := m.db.QueryContext(ctx, query, userID, resolved)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var alert Alert
		var detailsJSON []byte
		var resolvedAt sql.NullTime

		err := rows.Scan(
			&alert.ID, &alert.UserID, &alert.AlertType, &alert.Level,
			&alert.Title, &alert.Message, &detailsJSON, &alert.Resolved,
			&resolvedAt, &alert.CreatedAt, &alert.UpdatedAt,
		)

		if err == nil {
			if resolvedAt.Valid {
				alert.ResolvedAt = &resolvedAt.Time
			}
			json.Unmarshal(detailsJSON, &alert.Details)
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}

// CleanupOldAlerts removes old resolved alerts
func (m *DataMonitoringService) CleanupOldAlerts(ctx context.Context, retentionDays int) error {
	query := `
		DELETE FROM alerts 
		WHERE resolved = true AND resolved_at < NOW() - INTERVAL '%d days'
	`

	_, err := m.db.ExecContext(ctx, fmt.Sprintf(query, retentionDays))
	return err
}