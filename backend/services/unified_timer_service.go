// Package services - 统一计时器服务实现
// 任务#242: 后端统一服务实现 - Phase 2
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// UnifiedTimerService 统一计时器服务接口
type UnifiedTimerService interface {
	// 核心计时操作
	StartTimer(ctx context.Context, req *UnifiedStartTimerRequest) (*UnifiedTimerResponse, error)
	PauseTimer(ctx context.Context, userID int) (*UnifiedTimerResponse, error)
	ResumeTimer(ctx context.Context, userID int) (*UnifiedTimerResponse, error)
	StopTimer(ctx context.Context, userID int, notes string) (*UnifiedTimerResponse, error)
	
	// 状态查询
	GetCurrentTimer(ctx context.Context, userID int) (*TimerStatus, error)
	GetTimerHistory(ctx context.Context, userID int, filter *HistoryFilter) (*TimerHistory, error)
	
	// 智能功能
	GetSmartSuggestions(ctx context.Context, userID int, context string) ([]*TimerSuggestion, error)
	ProvideInferenceFeedback(ctx context.Context, timerID int, userID int, rating int) error
}

// UnifiedStartTimerRequest 统一启动计时器请求
type UnifiedStartTimerRequest struct {
	UserID           int                    `json:"user_id"`
	TaskID           *int                   `json:"task_id,omitempty"`
	Title            string                 `json:"title"`
	Category         string                 `json:"category,omitempty"`
	EstimatedMinutes int                    `json:"estimated_minutes,omitempty"`
	Context          string                 `json:"context"` // dashboard, task_detail, quick_start
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	AutoStopOthers   bool                   `json:"auto_stop_others"`
	TemplateID       *int                   `json:"template_id,omitempty"`
}

// UnifiedTimerResponse 统一计时器操作响应
type UnifiedTimerResponse struct {
	Success    bool        `json:"success"`
	TimerID    int         `json:"timer_id,omitempty"`
	TimerType  string      `json:"timer_type"` // project_task, personal_task, quick_timer, pomodoro
	Message    string      `json:"message"`
	StartedAt  time.Time   `json:"started_at,omitempty"`
	Data       interface{} `json:"data,omitempty"`
}

// TimerStatus 计时器状态
type TimerStatus struct {
	ID               int                    `json:"id"`
	UserID           int                    `json:"user_id"`
	TargetType       string                 `json:"target_type"`
	TargetID         *int                   `json:"target_id"`
	TargetTitle      string                 `json:"target_title"`
	Status           string                 `json:"status"`
	StartTime        time.Time              `json:"start_time"`
	ElapsedSeconds   int                    `json:"elapsed_seconds"`
	PauseCount       int                    `json:"pause_count"`
	PauseTotalSeconds int                   `json:"pause_total_seconds"`
	Category         string                 `json:"category"`
	Description      string                 `json:"description"`
	Metadata         map[string]interface{} `json:"metadata"`
	IsRunning        bool                   `json:"is_running"`
	IsPaused         bool                   `json:"is_paused"`
}

// HistoryFilter 历史记录过滤器
type HistoryFilter struct {
	StartDate    *time.Time `json:"start_date,omitempty"`
	EndDate      *time.Time `json:"end_date,omitempty"`
	TargetType   string     `json:"target_type,omitempty"`
	Category     string     `json:"category,omitempty"`
	Status       string     `json:"status,omitempty"`
	ProjectID    *int       `json:"project_id,omitempty"`
	Page         int        `json:"page"`
	PageSize     int        `json:"page_size"`
	OrderBy      string     `json:"order_by"`
	SearchQuery  string     `json:"search_query,omitempty"`
}

// TimerHistory 计时历史
type TimerHistory struct {
	Records    []*TimerRecord `json:"records"`
	Total      int            `json:"total"`
	Page       int            `json:"page"`
	PageSize   int            `json:"page_size"`
	HasMore    bool           `json:"has_more"`
}

// TimerRecord 计时记录
type TimerRecord struct {
	ID                  int                    `json:"id"`
	TargetType          string                 `json:"target_type"`
	TargetID            *int                   `json:"target_id"`
	TargetTitle         string                 `json:"target_title"`
	StartTime           time.Time              `json:"start_time"`
	EndTime             *time.Time             `json:"end_time"`
	DurationSeconds     int                    `json:"duration_seconds"`
	ActualWorkSeconds   int                    `json:"actual_work_seconds"`
	Status              string                 `json:"status"`
	Category            string                 `json:"category"`
	Description         string                 `json:"description"`
	ProjectID           *int                   `json:"project_id"`
	ProjectName         string                 `json:"project_name,omitempty"`
	InferenceConfidence float64                `json:"inference_confidence"`
	UserFeedback        *int                   `json:"user_feedback"`
	CreatedAt           time.Time              `json:"created_at"`
}

// TimerSuggestion 智能建议
type TimerSuggestion struct {
	Type              string    `json:"type"`
	Title             string    `json:"title"`
	Category          string    `json:"category"`
	EstimatedDuration int       `json:"estimated_duration"` // 分钟
	Confidence        float64   `json:"confidence"`
	Reason            string    `json:"reason"`
	TaskID            *int      `json:"task_id,omitempty"`
	ProjectID         *int      `json:"project_id,omitempty"`
	TemplateID        *int      `json:"template_id,omitempty"`
	LastUsedAt        *time.Time `json:"last_used_at,omitempty"`
}

// unifiedTimerServiceImpl 统一计时器服务实现
type unifiedTimerServiceImpl struct {
	db              *sql.DB
	inferenceEngine TypeInferenceEngine
	notificationSvc NotificationService
}

// NewUnifiedTimerService 创建统一计时器服务实例
func NewUnifiedTimerService(db *sql.DB, inferenceEngine TypeInferenceEngine, notificationSvc NotificationService) UnifiedTimerService {
	return &unifiedTimerServiceImpl{
		db:              db,
		inferenceEngine: inferenceEngine,
		notificationSvc: notificationSvc,
	}
}

// StartTimer 启动计时器 - 核心方法
func (s *unifiedTimerServiceImpl) StartTimer(ctx context.Context, req *UnifiedStartTimerRequest) (*UnifiedTimerResponse, error) {
	// 1. 输入验证
	if err := s.validateStartRequest(req); err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: fmt.Sprintf("请求参数验证失败: %v", err),
		}, err
	}

	// 2. 智能类型推断
	inferenceResult, err := s.inferenceEngine.InferTimerType(ctx, &InferenceContext{
		UserID:    req.UserID,
		TaskID:    req.TaskID,
		Title:     req.Title,
		Context:   req.Context,
		Metadata:  req.Metadata,
	})
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: fmt.Sprintf("智能推断失败: %v", err),
		}, err
	}

	// 3. 事务开始
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "数据库事务启动失败",
		}, err
	}
	defer tx.Rollback()

	// 4. 停止其他活动计时器 (如果需要)
	if req.AutoStopOthers {
		if err := s.stopActiveTimersInTx(ctx, tx, req.UserID); err != nil {
			return &UnifiedTimerResponse{
				Success: false,
				Message: fmt.Sprintf("停止其他计时器失败: %v", err),
			}, err
		}
	}

	// 5. 创建新计时记录
	timerID, err := s.createTimerInTx(ctx, tx, req, inferenceResult)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: fmt.Sprintf("创建计时器失败: %v", err),
		}, err
	}

	// 6. 更新用户当前计时器状态
	if err := s.updateUserCurrentTimerInTx(ctx, tx, req.UserID, timerID); err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: fmt.Sprintf("更新用户状态失败: %v", err),
		}, err
	}

	// 7. 提交事务
	if err := tx.Commit(); err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "事务提交失败",
		}, err
	}

	// 8. 发送通知
	go s.notifyTimerStarted(req.UserID, timerID, inferenceResult.Type, req.Title)

	return &UnifiedTimerResponse{
		Success:   true,
		TimerID:   timerID,
		TimerType: inferenceResult.Type,
		Message:   fmt.Sprintf("%s计时已开始", s.getTimerTypeDisplayName(inferenceResult.Type)),
		StartedAt: time.Now(),
		Data: map[string]interface{}{
			"inference_confidence": inferenceResult.Confidence,
			"inference_reasoning":  inferenceResult.Reasoning,
			"suggested_category":   inferenceResult.SuggestedCategory,
		},
	}, nil
}

// PauseTimer 暂停计时器
func (s *unifiedTimerServiceImpl) PauseTimer(ctx context.Context, userID int) (*UnifiedTimerResponse, error) {
	currentTimer, err := s.GetCurrentTimer(ctx, userID)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "获取当前计时器状态失败",
		}, err
	}

	if currentTimer == nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "没有运行中的计时器",
		}, fmt.Errorf("no active timer found for user %d", userID)
	}

	if currentTimer.IsPaused {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "计时器已经处于暂停状态",
		}, fmt.Errorf("timer %d is already paused", currentTimer.ID)
	}

	// 更新计时器状态为暂停
	pauseEventData := map[string]interface{}{
		"paused_at": time.Now(),
		"reason":    "user_action",
	}
	pauseEventJSON, _ := json.Marshal(pauseEventData)

	query := `
		UPDATE unified_timer_logs 
		SET 
			status = 'paused',
			pause_count = pause_count + 1,
			pause_events = pause_events || $1::jsonb,
			updated_at = NOW()
		WHERE id = $2 AND user_id = $3 AND status = 'running'
	`

	result, err := s.db.ExecContext(ctx, query, string(pauseEventJSON), currentTimer.ID, userID)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "更新计时器状态失败",
		}, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "计时器状态更新失败，可能已被其他操作修改",
		}, fmt.Errorf("no rows affected when pausing timer %d", currentTimer.ID)
	}

	// 发送通知
	go s.notifyTimerPaused(userID, currentTimer.ID, currentTimer.TargetTitle)

	return &UnifiedTimerResponse{
		Success: true,
		TimerID: currentTimer.ID,
		Message: "计时器已暂停",
		Data: map[string]interface{}{
			"paused_at":      time.Now(),
			"elapsed_before": currentTimer.ElapsedSeconds,
		},
	}, nil
}

// ResumeTimer 恢复计时器
func (s *unifiedTimerServiceImpl) ResumeTimer(ctx context.Context, userID int) (*UnifiedTimerResponse, error) {
	currentTimer, err := s.GetCurrentTimer(ctx, userID)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "获取当前计时器状态失败",
		}, err
	}

	if currentTimer == nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "没有可恢复的计时器",
		}, fmt.Errorf("no timer to resume for user %d", userID)
	}

	if !currentTimer.IsPaused {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "计时器未处于暂停状态",
		}, fmt.Errorf("timer %d is not paused", currentTimer.ID)
	}

	// 计算暂停时长并更新状态
	now := time.Now()
	
	// 从最后一个暂停事件计算暂停时长
	var lastPauseTime time.Time
	if err := s.db.QueryRowContext(ctx, `
		SELECT 
			COALESCE(
				(pause_events->-1->>'paused_at')::timestamp,
				updated_at
			) as last_pause_time
		FROM unified_timer_logs 
		WHERE id = $1
	`, currentTimer.ID).Scan(&lastPauseTime); err != nil {
		lastPauseTime = currentTimer.StartTime // fallback
	}

	pauseDuration := int(now.Sub(lastPauseTime).Seconds())
	
	// Ensure pause duration is non-negative (protect against clock issues)
	if pauseDuration < 0 {
		pauseDuration = 0
	}

	resumeEventData := map[string]interface{}{
		"resumed_at":     now,
		"pause_duration": pauseDuration,
	}
	resumeEventJSON, _ := json.Marshal(resumeEventData)

	query := `
		UPDATE unified_timer_logs 
		SET 
			status = 'running',
			pause_total_seconds = pause_total_seconds + $1,
			pause_events = pause_events || $2::jsonb,
			updated_at = NOW()
		WHERE id = $3 AND user_id = $4 AND status = 'paused'
	`

	result, err := s.db.ExecContext(ctx, query, pauseDuration, string(resumeEventJSON), currentTimer.ID, userID)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "更新计时器状态失败",
		}, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "计时器状态更新失败",
		}, fmt.Errorf("no rows affected when resuming timer %d", currentTimer.ID)
	}

	// 发送通知
	go s.notifyTimerResumed(userID, currentTimer.ID, currentTimer.TargetTitle)

	return &UnifiedTimerResponse{
		Success: true,
		TimerID: currentTimer.ID,
		Message: "计时器已恢复",
		Data: map[string]interface{}{
			"resumed_at":     now,
			"pause_duration": pauseDuration,
			"total_pauses":   currentTimer.PauseCount + 1,
		},
	}, nil
}

// StopTimer 停止计时器
func (s *unifiedTimerServiceImpl) StopTimer(ctx context.Context, userID int, notes string) (*UnifiedTimerResponse, error) {
	currentTimer, err := s.GetCurrentTimer(ctx, userID)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "获取当前计时器状态失败",
		}, err
	}

	if currentTimer == nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "没有运行中的计时器",
		}, fmt.Errorf("no active timer found for user %d", userID)
	}

	now := time.Now()
	totalDuration := int(now.Sub(currentTimer.StartTime).Seconds())
	actualWorkDuration := totalDuration - currentTimer.PauseTotalSeconds

	// 如果当前是暂停状态，需要计算最后一次暂停的时长
	if currentTimer.IsPaused {
		var lastPauseTime time.Time
		s.db.QueryRowContext(ctx, `
			SELECT COALESCE((pause_events->-1->>'paused_at')::timestamp, updated_at)
			FROM unified_timer_logs WHERE id = $1
		`, currentTimer.ID).Scan(&lastPauseTime)
		
		if !lastPauseTime.IsZero() {
			finalPauseDuration := int(now.Sub(lastPauseTime).Seconds())
			// Ensure pause duration is non-negative (protect against clock issues)
			if finalPauseDuration < 0 {
				finalPauseDuration = 0
			}
			currentTimer.PauseTotalSeconds += finalPauseDuration
		}
		actualWorkDuration = totalDuration - currentTimer.PauseTotalSeconds
	}

	// Ensure actualWorkDuration is non-negative and not greater than totalDuration
	if actualWorkDuration < 0 {
		actualWorkDuration = 0
	}
	if actualWorkDuration > totalDuration {
		actualWorkDuration = totalDuration
	}

	// 更新计时器为完成状态
	updateQuery := `
		UPDATE unified_timer_logs 
		SET 
			status = 'completed',
			end_time = $1,
			duration_seconds = $2,
			actual_work_seconds = $3,
			description = CASE 
				WHEN $4 != '' THEN COALESCE(description, '') || 
					CASE WHEN description IS NOT NULL AND description != '' THEN E'\n\n停止备注: ' ELSE '停止备注: ' END || $4
				ELSE description
			END,
			updated_at = NOW()
		WHERE id = $5 AND user_id = $6 AND status IN ('running', 'paused')
	`

	result, err := s.db.ExecContext(ctx, updateQuery, now, totalDuration, actualWorkDuration, notes, currentTimer.ID, userID)
	if err != nil {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "更新计时器状态失败",
		}, err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return &UnifiedTimerResponse{
			Success: false,
			Message: "计时器停止失败，可能已被其他操作修改",
		}, fmt.Errorf("no rows affected when stopping timer %d", currentTimer.ID)
	}

	// 清除用户当前计时器状态
	s.db.ExecContext(ctx, `
		UPDATE users 
		SET current_timer_id = NULL, updated_at = NOW() 
		WHERE id = $1
	`, userID)

	// 发送通知
	go s.notifyTimerStopped(userID, currentTimer.ID, currentTimer.TargetTitle, actualWorkDuration)

	return &UnifiedTimerResponse{
		Success: true,
		TimerID: currentTimer.ID,
		Message: fmt.Sprintf("计时完成，实际工作时长 %s", s.formatDuration(actualWorkDuration)),
		Data: map[string]interface{}{
			"total_duration":       totalDuration,
			"actual_work_duration": actualWorkDuration,
			"pause_count":          currentTimer.PauseCount,
			"pause_total":          currentTimer.PauseTotalSeconds,
			"efficiency":           float64(actualWorkDuration) / float64(totalDuration) * 100,
		},
	}, nil
}

// GetCurrentTimer 获取当前计时器状态
func (s *unifiedTimerServiceImpl) GetCurrentTimer(ctx context.Context, userID int) (*TimerStatus, error) {
	query := `
		SELECT 
			utl.id, utl.user_id, utl.target_type, utl.target_id, utl.target_title,
			utl.status, utl.start_time, utl.pause_count, utl.pause_total_seconds,
			utl.category, COALESCE(utl.description, ''), 
			COALESCE(utl.target_metadata, '{}')::text
		FROM unified_timer_logs utl
		WHERE utl.user_id = $1 
			AND utl.status IN ('running', 'paused')
		ORDER BY utl.start_time DESC
		LIMIT 1
	`

	row := s.db.QueryRowContext(ctx, query, userID)

	var timer TimerStatus
	var metadataJSON string
	
	err := row.Scan(
		&timer.ID, &timer.UserID, &timer.TargetType, &timer.TargetID, &timer.TargetTitle,
		&timer.Status, &timer.StartTime, &timer.PauseCount, &timer.PauseTotalSeconds,
		&timer.Category, &timer.Description, &metadataJSON,
	)

	if err == sql.ErrNoRows {
		return nil, nil // 没有活动的计时器
	}
	if err != nil {
		return nil, fmt.Errorf("查询当前计时器失败: %v", err)
	}

	// 解析metadata
	if err := json.Unmarshal([]byte(metadataJSON), &timer.Metadata); err != nil {
		timer.Metadata = make(map[string]interface{})
	}

	// 计算状态
	timer.IsRunning = timer.Status == "running"
	timer.IsPaused = timer.Status == "paused"

	// 计算已用时间
	now := time.Now()
	if timer.IsRunning {
		timer.ElapsedSeconds = int(now.Sub(timer.StartTime).Seconds()) - timer.PauseTotalSeconds
	} else if timer.IsPaused {
		// 暂停状态下，需要计算到最后一次暂停的时间
		var lastPauseTime time.Time
		s.db.QueryRowContext(ctx, `
			SELECT COALESCE((pause_events->-1->>'paused_at')::timestamp, updated_at)
			FROM unified_timer_logs WHERE id = $1
		`, timer.ID).Scan(&lastPauseTime)
		
		if !lastPauseTime.IsZero() {
			timer.ElapsedSeconds = int(lastPauseTime.Sub(timer.StartTime).Seconds()) - timer.PauseTotalSeconds
		} else {
			timer.ElapsedSeconds = int(now.Sub(timer.StartTime).Seconds()) - timer.PauseTotalSeconds
		}
	}

	if timer.ElapsedSeconds < 0 {
		timer.ElapsedSeconds = 0
	}

	return &timer, nil
}

// 辅助方法
func (s *unifiedTimerServiceImpl) validateStartRequest(req *UnifiedStartTimerRequest) error {
	if req.UserID <= 0 {
		return fmt.Errorf("用户ID无效")
	}
	if strings.TrimSpace(req.Title) == "" {
		return fmt.Errorf("计时器标题不能为空")
	}
	if req.Context == "" {
		req.Context = "dashboard" // 默认上下文
	}
	return nil
}

func (s *unifiedTimerServiceImpl) stopActiveTimersInTx(ctx context.Context, tx *sql.Tx, userID int) error {
	now := time.Now()
	
	// 查询活动的计时器
	rows, err := tx.QueryContext(ctx, `
		SELECT id, start_time, pause_total_seconds, status
		FROM unified_timer_logs 
		WHERE user_id = $1 AND status IN ('running', 'paused')
	`, userID)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var timerID int
		var startTime time.Time
		var pauseTotal int
		var status string

		if err := rows.Scan(&timerID, &startTime, &pauseTotal, &status); err != nil {
			continue
		}

		totalDuration := int(now.Sub(startTime).Seconds())
		actualWorkDuration := totalDuration - pauseTotal

		// 如果是暂停状态，计算最后暂停时长
		if status == "paused" {
			var lastPauseTime time.Time
			tx.QueryRowContext(ctx, `
				SELECT COALESCE((pause_events->-1->>'paused_at')::timestamp, updated_at)
				FROM unified_timer_logs WHERE id = $1
			`, timerID).Scan(&lastPauseTime)
			
			if !lastPauseTime.IsZero() {
				finalPauseDuration := int(now.Sub(lastPauseTime).Seconds())
				totalDuration += finalPauseDuration
				pauseTotal += finalPauseDuration
				actualWorkDuration = totalDuration - pauseTotal
			}
		}

		// 停止计时器
		_, err := tx.ExecContext(ctx, `
			UPDATE unified_timer_logs 
			SET 
				status = 'cancelled',
				end_time = $1,
				duration_seconds = $2,
				actual_work_seconds = $3,
				description = COALESCE(description, '') || E'\n\n[自动停止] 启动新计时器时自动停止',
				updated_at = NOW()
			WHERE id = $4
		`, now, totalDuration, actualWorkDuration, timerID)

		if err != nil {
			return fmt.Errorf("停止计时器 %d 失败: %v", timerID, err)
		}
	}

	return nil
}

func (s *unifiedTimerServiceImpl) createTimerInTx(ctx context.Context, tx *sql.Tx, req *UnifiedStartTimerRequest, inference *InferenceResult) (int, error) {
	// 处理metadata
	metadataJSON := "{}"
	if req.Metadata != nil {
		if jsonBytes, err := json.Marshal(req.Metadata); err == nil {
			metadataJSON = string(jsonBytes)
		}
	}

	// 处理推理结果
	reasoningJSON := "[]"
	if inference.Reasoning != nil {
		if jsonBytes, err := json.Marshal(inference.Reasoning); err == nil {
			reasoningJSON = string(jsonBytes)
		}
	}

	query := `
		INSERT INTO unified_timer_logs (
			user_id, target_type, target_id, target_title, target_metadata,
			start_time, status, category, 
			project_id, template_id,
			inference_confidence, inference_reasoning,
			created_at, updated_at, created_by, source_type
		) VALUES (
			$1, $2, $3, $4, $5::jsonb,
			NOW(), 'running', $6,
			$7, $8,
			$9, $10::jsonb,
			NOW(), NOW(), $1, 'unified'
		) RETURNING id
	`

	var timerID int
	err := tx.QueryRowContext(ctx, query,
		req.UserID,
		inference.Type,
		req.TaskID,
		req.Title,
		metadataJSON,
		inference.SuggestedCategory,
		inference.ProjectID,
		req.TemplateID,
		inference.Confidence,
		reasoningJSON,
	).Scan(&timerID)

	return timerID, err
}

func (s *unifiedTimerServiceImpl) updateUserCurrentTimerInTx(ctx context.Context, tx *sql.Tx, userID, timerID int) error {
	query := `
		UPDATE users 
		SET current_timer_id = $1, updated_at = NOW() 
		WHERE id = $2
	`
	_, err := tx.ExecContext(ctx, query, timerID, userID)
	return err
}

func (s *unifiedTimerServiceImpl) getTimerTypeDisplayName(timerType string) string {
	switch timerType {
	case "project_task":
		return "项目任务"
	case "personal_task":
		return "个人任务"
	case "quick_timer":
		return "快速"
	case "pomodoro":
		return "番茄钟"
	default:
		return "通用"
	}
}

func (s *unifiedTimerServiceImpl) formatDuration(seconds int) string {
	if seconds < 60 {
		return fmt.Sprintf("%d秒", seconds)
	}
	
	minutes := seconds / 60
	if minutes < 60 {
		remainingSeconds := seconds % 60
		if remainingSeconds == 0 {
			return fmt.Sprintf("%d分钟", minutes)
		}
		return fmt.Sprintf("%d分%d秒", minutes, remainingSeconds)
	}
	
	hours := minutes / 60
	remainingMinutes := minutes % 60
	if remainingMinutes == 0 {
		return fmt.Sprintf("%d小时", hours)
	}
	return fmt.Sprintf("%d小时%d分钟", hours, remainingMinutes)
}

// 通知方法
func (s *unifiedTimerServiceImpl) notifyTimerStarted(userID, timerID int, timerType, title string) {
	if s.notificationSvc != nil {
		s.notificationSvc.SendTimerNotification(userID, "timer_started", map[string]interface{}{
			"timer_id":   timerID,
			"timer_type": timerType,
			"title":      title,
			"message":    fmt.Sprintf("%s计时已开始: %s", s.getTimerTypeDisplayName(timerType), title),
		})
	}
}

func (s *unifiedTimerServiceImpl) notifyTimerPaused(userID, timerID int, title string) {
	if s.notificationSvc != nil {
		s.notificationSvc.SendTimerNotification(userID, "timer_paused", map[string]interface{}{
			"timer_id": timerID,
			"title":    title,
			"message":  fmt.Sprintf("计时器已暂停: %s", title),
		})
	}
}

func (s *unifiedTimerServiceImpl) notifyTimerResumed(userID, timerID int, title string) {
	if s.notificationSvc != nil {
		s.notificationSvc.SendTimerNotification(userID, "timer_resumed", map[string]interface{}{
			"timer_id": timerID,
			"title":    title,
			"message":  fmt.Sprintf("计时器已恢复: %s", title),
		})
	}
}

func (s *unifiedTimerServiceImpl) notifyTimerStopped(userID, timerID int, title string, duration int) {
	if s.notificationSvc != nil {
		s.notificationSvc.SendTimerNotification(userID, "timer_stopped", map[string]interface{}{
			"timer_id": timerID,
			"title":    title,
			"duration": duration,
			"message":  fmt.Sprintf("计时完成: %s，用时 %s", title, s.formatDuration(duration)),
		})
	}
}

// GetTimerHistory 获取计时历史
func (s *unifiedTimerServiceImpl) GetTimerHistory(ctx context.Context, userID int, filter *HistoryFilter) (*TimerHistory, error) {
	if filter == nil {
		filter = &HistoryFilter{
			Page:     1,
			PageSize: 20,
			OrderBy:  "start_time DESC",
		}
	}

	// 构建查询条件
	var whereConditions []string
	var args []interface{}
	argIndex := 1

	whereConditions = append(whereConditions, fmt.Sprintf("user_id = $%d", argIndex))
	args = append(args, userID)
	argIndex++

	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("start_time >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}

	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("start_time <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	if filter.TargetType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("target_type = $%d", argIndex))
		args = append(args, filter.TargetType)
		argIndex++
	}

	if filter.Status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, filter.Status)
		argIndex++
	}

	if filter.SearchQuery != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(target_title ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+filter.SearchQuery+"%")
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(whereConditions, " AND ")

	// 查询总数
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM unified_timer_logs %s", whereClause)
	var total int
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	// 查询记录
	offset := (filter.Page - 1) * filter.PageSize
	query := fmt.Sprintf(`
		SELECT id, target_type, target_id, target_title, start_time, end_time,
			   duration_seconds, actual_work_seconds, status, category, description,
			   project_id, inference_confidence, user_feedback, created_at
		FROM unified_timer_logs 
		%s 
		ORDER BY %s 
		LIMIT $%d OFFSET $%d
	`, whereClause, filter.OrderBy, argIndex, argIndex+1)

	args = append(args, filter.PageSize, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []*TimerRecord
	for rows.Next() {
		record := &TimerRecord{}
		var projectID sql.NullInt64
		var endTime sql.NullTime
		var userFeedback sql.NullInt64

		err := rows.Scan(
			&record.ID, &record.TargetType, &record.TargetID, &record.TargetTitle,
			&record.StartTime, &endTime, &record.DurationSeconds, &record.ActualWorkSeconds,
			&record.Status, &record.Category, &record.Description,
			&projectID, &record.InferenceConfidence, &userFeedback, &record.CreatedAt,
		)
		if err != nil {
			continue
		}

		if endTime.Valid {
			record.EndTime = &endTime.Time
		}
		if projectID.Valid {
			projectIDInt := int(projectID.Int64)
			record.ProjectID = &projectIDInt
		}
		if userFeedback.Valid {
			feedback := int(userFeedback.Int64)
			record.UserFeedback = &feedback
		}

		records = append(records, record)
	}

	return &TimerHistory{
		Records:  records,
		Total:    total,
		Page:     filter.Page,
		PageSize: filter.PageSize,
		HasMore:  offset+len(records) < total,
	}, nil
}

// GetSmartSuggestions 获取智能建议
func (s *unifiedTimerServiceImpl) GetSmartSuggestions(ctx context.Context, userID int, context string) ([]*TimerSuggestion, error) {
	// 这是一个简化的实现，实际可以根据用户历史和AI推理引擎提供更智能的建议
	suggestions := []*TimerSuggestion{}

	// 1. 从用户最近的计时记录中提取常用任务
	recentQuery := `
		SELECT DISTINCT target_title, target_type, category, 
			   AVG(actual_work_seconds) as avg_duration,
			   COUNT(*) as usage_count,
			   MAX(start_time) as last_used
		FROM unified_timer_logs 
		WHERE user_id = $1 
			AND start_time > NOW() - INTERVAL '30 days'
			AND status = 'completed'
		GROUP BY target_title, target_type, category
		ORDER BY usage_count DESC, last_used DESC
		LIMIT 10
	`

	rows, err := s.db.QueryContext(ctx, recentQuery, userID)
	if err != nil {
		return suggestions, nil // 返回空建议而不是错误
	}
	defer rows.Close()

	for rows.Next() {
		var title, targetType, category string
		var avgDuration int
		var usageCount int
		var lastUsed time.Time

		if err := rows.Scan(&title, &targetType, &category, &avgDuration, &usageCount, &lastUsed); err != nil {
			continue
		}

		confidence := float64(usageCount) / 10.0 // 简单的置信度计算
		if confidence > 1.0 {
			confidence = 1.0
		}

		suggestion := &TimerSuggestion{
			Type:              "recent_task",
			Title:             title,
			Category:          category,
			EstimatedDuration: avgDuration / 60, // 转换为分钟
			Confidence:        confidence,
			Reason:            fmt.Sprintf("您在过去30天内使用了%d次", usageCount),
			LastUsedAt:        &lastUsed,
		}

		suggestions = append(suggestions, suggestion)
	}

	// 2. 如果建议不足，添加一些通用建议
	if len(suggestions) < 5 {
		commonSuggestions := []*TimerSuggestion{
			{
				Type:              "quick_timer",
				Title:             "快速任务",
				Category:          "其他",
				EstimatedDuration: 25,
				Confidence:        0.6,
				Reason:            "适合处理零散的小任务",
			},
			{
				Type:              "focus_session",
				Title:             "专注工作",
				Category:          "专注",
				EstimatedDuration: 50,
				Confidence:        0.7,
				Reason:            "高效的专注工作时段",
			},
			{
				Type:              "break_timer",
				Title:             "休息时间",
				Category:          "休息",
				EstimatedDuration: 15,
				Confidence:        0.5,
				Reason:            "适当的休息有助于提高效率",
			},
		}

		for _, suggestion := range commonSuggestions {
			if len(suggestions) >= 8 {
				break
			}
			suggestions = append(suggestions, suggestion)
		}
	}

	return suggestions, nil
}

// ProvideInferenceFeedback 提供推理反馈
func (s *unifiedTimerServiceImpl) ProvideInferenceFeedback(ctx context.Context, timerID int, userID int, rating int) error {
	query := `
		UPDATE unified_timer_logs 
		SET user_feedback = $1, updated_at = NOW()
		WHERE id = $2 AND user_id = $3
	`
	
	_, err := s.db.ExecContext(ctx, query, rating, timerID, userID)
	return err
}