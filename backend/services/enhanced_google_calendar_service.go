package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"ai-project-backend/utils"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// EnhancedGoogleCalendarService 增强版Google日历服务
type EnhancedGoogleCalendarService struct {
	config        *oauth2.Config
	retryExecutor *utils.RetryExecutor
	debugMode     bool
	logger        *log.Logger
}

// APICallLog API调用日志
type APICallLog struct {
	Timestamp     time.Time              `json:"timestamp"`
	Method        string                 `json:"method"`
	Endpoint      string                 `json:"endpoint"`
	Duration      time.Duration          `json:"duration"`
	StatusCode    int                    `json:"status_code,omitempty"`
	RequestSize   int64                  `json:"request_size,omitempty"`
	ResponseSize  int64                  `json:"response_size,omitempty"`
	Success       bool                   `json:"success"`
	Error         string                 `json:"error,omitempty"`
	RetryAttempts int                    `json:"retry_attempts,omitempty"`
	UserAgent     string                 `json:"user_agent,omitempty"`
	Parameters    map[string]interface{} `json:"parameters,omitempty"`
}

// NewEnhancedGoogleCalendarService 创建增强版Google日历服务实例
func NewEnhancedGoogleCalendarService(debugMode bool) *EnhancedGoogleCalendarService {
	config := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{os.Getenv("GOOGLE_CALENDAR_SCOPES")},
		Endpoint:     google.Endpoint,
	}

	// 创建专用的重试执行器
	retryExecutor := utils.NewRetryExecutor(utils.GoogleAPIRetryConfig())

	// 创建专用的日志记录器
	logger := log.New(os.Stdout, "[GoogleCalendar] ", log.LstdFlags|log.Lmicroseconds)

	return &EnhancedGoogleCalendarService{
		config:        config,
		retryExecutor: retryExecutor,
		debugMode:     debugMode,
		logger:        logger,
	}
}

// logAPICall 记录API调用日志
func (g *EnhancedGoogleCalendarService) logAPICall(apiLog *APICallLog) {
	if g.debugMode {
		logData, _ := json.MarshalIndent(apiLog, "", "  ")
		g.logger.Printf("API Call: %s", string(logData))
	} else {
		// 简化日志记录
		status := "SUCCESS"
		if !apiLog.Success {
			status = "FAILED"
		}
		g.logger.Printf("%s %s [%s] %v (attempts: %d)",
			apiLog.Method, apiLog.Endpoint, status, apiLog.Duration, apiLog.RetryAttempts)

		if apiLog.Error != "" {
			g.logger.Printf("Error: %s", apiLog.Error)
		}
	}
}

// GetAuthURL 获取Google OAuth授权URL（带重试和日志）
func (g *EnhancedGoogleCalendarService) GetAuthURL(state string) string {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "GET",
		Endpoint:  "oauth2/auth",
		Parameters: map[string]interface{}{
			"state": state,
		},
		Success: true,
	}

	authURL := g.config.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent"))

	apiLog.Duration = time.Since(startTime)
	g.logAPICall(apiLog)

	return authURL
}

// ExchangeCodeForToken 将授权码交换为访问令牌（带重试和日志）
func (g *EnhancedGoogleCalendarService) ExchangeCodeForToken(ctx context.Context, code string) (*GoogleToken, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "POST",
		Endpoint:  "oauth2/token/exchange",
		Parameters: map[string]interface{}{
			"code_length": len(code),
		},
	}

	var token *oauth2.Token
	var err error

	// 使用重试机制执行令牌交换
	_, retryErr := utils.ExecuteWithResult[*oauth2.Token](ctx, g.retryExecutor, func() (*oauth2.Token, error) {
		token, err = g.config.Exchange(ctx, code)
		return token, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to exchange code for token: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	googleToken := &GoogleToken{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
		ExpiresAt:    token.Expiry,
	}

	return googleToken, nil
}

// RefreshToken 刷新访问令牌（带重试和日志）
func (g *EnhancedGoogleCalendarService) RefreshToken(ctx context.Context, refreshToken string) (*GoogleToken, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "POST",
		Endpoint:  "oauth2/token/refresh",
	}

	token := &oauth2.Token{
		RefreshToken: refreshToken,
	}

	tokenSource := g.config.TokenSource(ctx, token)
	var newToken *oauth2.Token
	var err error

	// 使用重试机制刷新令牌
	_, retryErr := utils.ExecuteWithResult[*oauth2.Token](ctx, g.retryExecutor, func() (*oauth2.Token, error) {
		newToken, err = tokenSource.Token()
		return newToken, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to refresh token: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	googleToken := &GoogleToken{
		AccessToken:  newToken.AccessToken,
		RefreshToken: newToken.RefreshToken,
		TokenType:    newToken.TokenType,
		ExpiresAt:    newToken.Expiry,
	}

	return googleToken, nil
}

// GetCalendarService 获取Google Calendar服务客户端（带重试和日志）
func (g *EnhancedGoogleCalendarService) GetCalendarService(ctx context.Context, accessToken string) (*calendar.Service, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "INIT",
		Endpoint:  "calendar/service",
	}

	token := &oauth2.Token{
		AccessToken: accessToken,
	}

	client := g.config.Client(ctx, token)

	var service *calendar.Service
	var err error

	// 使用重试机制创建服务
	_, retryErr := utils.ExecuteWithResult[*calendar.Service](ctx, g.retryExecutor, func() (*calendar.Service, error) {
		service, err = calendar.NewService(ctx, option.WithHTTPClient(client))
		return service, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to create calendar service: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	return service, nil
}

// ValidateToken 验证访问令牌是否有效（带重试和日志）
func (g *EnhancedGoogleCalendarService) ValidateToken(ctx context.Context, accessToken string) error {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "GET",
		Endpoint:  "calendar/validate",
	}

	var err error

	// 使用重试机制验证令牌
	retryErr := g.retryExecutor.Execute(ctx, func() error {
		service, serviceErr := g.GetCalendarService(ctx, accessToken)
		if serviceErr != nil {
			return serviceErr
		}

		// 尝试获取用户的日历列表来验证令牌
		_, err = service.CalendarList.List().Do()
		return err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return fmt.Errorf("token validation failed: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	return nil
}

// GetUserCalendars 获取用户的日历列表（带重试和日志）
func (g *EnhancedGoogleCalendarService) GetUserCalendars(ctx context.Context, accessToken string) ([]*calendar.CalendarListEntry, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "GET",
		Endpoint:  "calendar/calendarList",
	}

	var calendarList *calendar.CalendarList
	var err error

	// 使用重试机制获取日历列表
	_, retryErr := utils.ExecuteWithResult[*calendar.CalendarList](ctx, g.retryExecutor, func() (*calendar.CalendarList, error) {
		service, serviceErr := g.GetCalendarService(ctx, accessToken)
		if serviceErr != nil {
			return nil, serviceErr
		}

		calendarList, err = service.CalendarList.List().Do()
		return calendarList, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to get calendar list: %w", retryErr)
	}

	apiLog.Success = true
	apiLog.Parameters = map[string]interface{}{
		"calendar_count": len(calendarList.Items),
	}
	g.logAPICall(apiLog)

	return calendarList.Items, nil
}

// CreateEvent 在指定日历中创建事件（带重试和日志）
func (g *EnhancedGoogleCalendarService) CreateEvent(ctx context.Context, accessToken, calendarID string, event *GoogleCalendarEvent) (*GoogleCalendarEvent, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "POST",
		Endpoint:  fmt.Sprintf("calendar/%s/events", calendarID),
		Parameters: map[string]interface{}{
			"event_summary": event.Summary,
			"is_all_day":    event.IsAllDay,
		},
	}

	var createdEvent *calendar.Event
	var err error

	// 使用重试机制创建事件
	_, retryErr := utils.ExecuteWithResult[*calendar.Event](ctx, g.retryExecutor, func() (*calendar.Event, error) {
		service, serviceErr := g.GetCalendarService(ctx, accessToken)
		if serviceErr != nil {
			return nil, serviceErr
		}

		googleEvent := g.convertOurEventToGoogle(event)
		createdEvent, err = service.Events.Insert(calendarID, googleEvent).Do()
		return createdEvent, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to create event: %w", retryErr)
	}

	apiLog.Success = true
	apiLog.Parameters["event_id"] = createdEvent.Id
	g.logAPICall(apiLog)

	return g.convertGoogleEventToOur(createdEvent), nil
}

// UpdateEvent 更新Google日历事件（带重试和日志）
func (g *EnhancedGoogleCalendarService) UpdateEvent(ctx context.Context, accessToken, calendarID, eventID string, event *GoogleCalendarEvent) (*GoogleCalendarEvent, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "PUT",
		Endpoint:  fmt.Sprintf("calendar/%s/events/%s", calendarID, eventID),
		Parameters: map[string]interface{}{
			"event_id":      eventID,
			"event_summary": event.Summary,
		},
	}

	var updatedEvent *calendar.Event
	var err error

	// 使用重试机制更新事件
	_, retryErr := utils.ExecuteWithResult[*calendar.Event](ctx, g.retryExecutor, func() (*calendar.Event, error) {
		service, serviceErr := g.GetCalendarService(ctx, accessToken)
		if serviceErr != nil {
			return nil, serviceErr
		}

		googleEvent := g.convertOurEventToGoogle(event)
		updatedEvent, err = service.Events.Update(calendarID, eventID, googleEvent).Do()
		return updatedEvent, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to update event: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	return g.convertGoogleEventToOur(updatedEvent), nil
}

// DeleteEvent 删除Google日历事件（带重试和日志）
func (g *EnhancedGoogleCalendarService) DeleteEvent(ctx context.Context, accessToken, calendarID, eventID string) error {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "DELETE",
		Endpoint:  fmt.Sprintf("calendar/%s/events/%s", calendarID, eventID),
		Parameters: map[string]interface{}{
			"event_id": eventID,
		},
	}

	var err error

	// 使用重试机制删除事件
	retryErr := g.retryExecutor.Execute(ctx, func() error {
		service, serviceErr := g.GetCalendarService(ctx, accessToken)
		if serviceErr != nil {
			return serviceErr
		}

		err = service.Events.Delete(calendarID, eventID).Do()
		return err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return fmt.Errorf("failed to delete event: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	return nil
}

// GetEvent 获取Google日历事件（带重试和日志）
func (g *EnhancedGoogleCalendarService) GetEvent(ctx context.Context, accessToken, calendarID, eventID string) (*GoogleCalendarEvent, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "GET",
		Endpoint:  fmt.Sprintf("calendar/%s/events/%s", calendarID, eventID),
		Parameters: map[string]interface{}{
			"event_id": eventID,
		},
	}

	var event *calendar.Event
	var err error

	// 使用重试机制获取事件
	_, retryErr := utils.ExecuteWithResult[*calendar.Event](ctx, g.retryExecutor, func() (*calendar.Event, error) {
		service, serviceErr := g.GetCalendarService(ctx, accessToken)
		if serviceErr != nil {
			return nil, serviceErr
		}

		event, err = service.Events.Get(calendarID, eventID).Do()
		return event, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to get event: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	return g.convertGoogleEventToOur(event), nil
}

// ListEvents 获取日历事件列表（带重试和日志）
func (g *EnhancedGoogleCalendarService) ListEvents(ctx context.Context, accessToken, calendarID string, timeMin, timeMax time.Time, maxResults int64) ([]*GoogleCalendarEvent, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "GET",
		Endpoint:  fmt.Sprintf("calendar/%s/events", calendarID),
		Parameters: map[string]interface{}{
			"time_min":    timeMin.Format(time.RFC3339),
			"time_max":    timeMax.Format(time.RFC3339),
			"max_results": maxResults,
		},
	}

	var events *calendar.Events
	var err error

	// 使用重试机制获取事件列表
	_, retryErr := utils.ExecuteWithResult[*calendar.Events](ctx, g.retryExecutor, func() (*calendar.Events, error) {
		service, serviceErr := g.GetCalendarService(ctx, accessToken)
		if serviceErr != nil {
			return nil, serviceErr
		}

		call := service.Events.List(calendarID).
			TimeMin(timeMin.Format(time.RFC3339)).
			TimeMax(timeMax.Format(time.RFC3339)).
			MaxResults(maxResults).
			SingleEvents(true).
			OrderBy("startTime")

		events, err = call.Do()
		return events, err
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return nil, fmt.Errorf("failed to list events: %w", retryErr)
	}

	apiLog.Success = true
	apiLog.Parameters["events_count"] = len(events.Items)
	g.logAPICall(apiLog)

	ourEvents := make([]*GoogleCalendarEvent, len(events.Items))
	for i, event := range events.Items {
		ourEvents[i] = g.convertGoogleEventToOur(event)
	}

	return ourEvents, nil
}

// RevokeToken 撤销Google访问令牌（带重试和日志）
func (g *EnhancedGoogleCalendarService) RevokeToken(ctx context.Context, accessToken string) error {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "POST",
		Endpoint:  "oauth2/revoke",
	}

	// 使用重试机制撤销令牌
	retryErr := g.retryExecutor.Execute(ctx, func() error {
		revokeURL := fmt.Sprintf("https://oauth2.googleapis.com/revoke?token=%s", accessToken)

		client := &http.Client{Timeout: 10 * time.Second}
		resp, reqErr := client.Post(revokeURL, "application/x-www-form-urlencoded", nil)
		if reqErr != nil {
			return fmt.Errorf("failed to make revoke request: %w", reqErr)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("failed to revoke token, status: %d", resp.StatusCode)
		}

		return nil
	})

	apiLog.Duration = time.Since(startTime)

	if retryErr != nil {
		apiLog.Success = false
		apiLog.Error = retryErr.Error()
		g.logAPICall(apiLog)
		return fmt.Errorf("failed to revoke token: %w", retryErr)
	}

	apiLog.Success = true
	g.logAPICall(apiLog)

	return nil
}

// BatchCreateEvents 批量创建事件（带重试和日志）
func (g *EnhancedGoogleCalendarService) BatchCreateEvents(ctx context.Context, accessToken, calendarID string, events []*GoogleCalendarEvent) ([]*GoogleCalendarEvent, error) {
	startTime := time.Now()

	apiLog := &APICallLog{
		Timestamp: startTime,
		Method:    "POST",
		Endpoint:  fmt.Sprintf("calendar/%s/events/batch", calendarID),
		Parameters: map[string]interface{}{
			"batch_size": len(events),
		},
	}

	// 验证accessToken有效性
	if err := g.ValidateToken(ctx, accessToken); err != nil {
		apiLog.Success = false
		apiLog.Error = err.Error()
		apiLog.Duration = time.Since(startTime)
		g.logAPICall(apiLog)
		return nil, err
	}

	createdEvents := make([]*GoogleCalendarEvent, 0, len(events))
	var errors []string

	// Google Calendar API 不直接支持批量操作，所以我们逐个创建
	for i, event := range events {
		createdEvent, err := g.CreateEvent(ctx, accessToken, calendarID, event)
		if err != nil {
			errorMsg := fmt.Sprintf("Failed to create event %d (%s): %v", i+1, event.Summary, err)
			errors = append(errors, errorMsg)
			g.logger.Printf("Batch create error: %s", errorMsg)
			continue
		}
		createdEvents = append(createdEvents, createdEvent)
	}

	apiLog.Duration = time.Since(startTime)
	apiLog.Parameters["created_count"] = len(createdEvents)
	apiLog.Parameters["failed_count"] = len(errors)

	if len(errors) > 0 {
		apiLog.Success = false
		apiLog.Error = strings.Join(errors, "; ")
	} else {
		apiLog.Success = true
	}

	g.logAPICall(apiLog)

	return createdEvents, nil
}

// IsTokenExpired 检查令牌是否过期
func (g *EnhancedGoogleCalendarService) IsTokenExpired(expiresAt time.Time) bool {
	// 提前5分钟检查过期，给刷新令牌留出时间
	return time.Now().Add(5 * time.Minute).After(expiresAt)
}

// SetDebugMode 设置调试模式
func (g *EnhancedGoogleCalendarService) SetDebugMode(enabled bool) {
	g.debugMode = enabled
}

// GetAPICallStats 获取API调用统计（可以扩展实现）
func (g *EnhancedGoogleCalendarService) GetAPICallStats() map[string]interface{} {
	// 这里可以实现API调用统计功能
	// 比如记录调用次数、成功率、平均响应时间等
	return map[string]interface{}{
		"debug_mode": g.debugMode,
		"retry_config": map[string]interface{}{
			"max_retries": g.retryExecutor.GetConfig().MaxRetries,
			"base_delay":  g.retryExecutor.GetConfig().BaseDelay,
		},
	}
}

// convertOurEventToGoogle 将我们的事件格式转换为Google格式
func (g *EnhancedGoogleCalendarService) convertOurEventToGoogle(event *GoogleCalendarEvent) *calendar.Event {
	googleEvent := &calendar.Event{
		Summary:     event.Summary,
		Description: event.Description,
		Location:    event.Location,
		Status:      event.Status,
		Visibility:  event.Visibility,
	}

	// 设置时间
	if event.IsAllDay {
		googleEvent.Start = &calendar.EventDateTime{
			Date: event.StartTime.Format("2006-01-02"),
		}
		googleEvent.End = &calendar.EventDateTime{
			Date: event.EndTime.Format("2006-01-02"),
		}
	} else {
		googleEvent.Start = &calendar.EventDateTime{
			DateTime: event.StartTime.Format(time.RFC3339),
			TimeZone: "Asia/Shanghai",
		}
		googleEvent.End = &calendar.EventDateTime{
			DateTime: event.EndTime.Format(time.RFC3339),
			TimeZone: "Asia/Shanghai",
		}
	}

	// 添加参与者
	if len(event.Attendees) > 0 {
		googleEvent.Attendees = make([]*calendar.EventAttendee, len(event.Attendees))
		for i, email := range event.Attendees {
			googleEvent.Attendees[i] = &calendar.EventAttendee{
				Email: email,
			}
		}
	}

	return googleEvent
}

// convertGoogleEventToOur 将Google日历事件转换为我们的格式
func (g *EnhancedGoogleCalendarService) convertGoogleEventToOur(event *calendar.Event) *GoogleCalendarEvent {
	ourEvent := &GoogleCalendarEvent{
		ID:          event.Id,
		Summary:     event.Summary,
		Description: event.Description,
		Location:    event.Location,
		Status:      event.Status,
		Visibility:  event.Visibility,
	}

	// 处理时间
	if event.Start != nil {
		if event.Start.Date != "" {
			// 全天事件
			ourEvent.IsAllDay = true
			if startTime, err := time.Parse("2006-01-02", event.Start.Date); err == nil {
				ourEvent.StartTime = startTime
			}
		} else if event.Start.DateTime != "" {
			// 非全天事件
			ourEvent.IsAllDay = false
			if startTime, err := time.Parse(time.RFC3339, event.Start.DateTime); err == nil {
				ourEvent.StartTime = startTime
			}
		}
	}

	if event.End != nil {
		if event.End.Date != "" {
			if endTime, err := time.Parse("2006-01-02", event.End.Date); err == nil {
				ourEvent.EndTime = endTime
			}
		} else if event.End.DateTime != "" {
			if endTime, err := time.Parse(time.RFC3339, event.End.DateTime); err == nil {
				ourEvent.EndTime = endTime
			}
		}
	}

	// 处理参与者
	if len(event.Attendees) > 0 {
		ourEvent.Attendees = make([]string, len(event.Attendees))
		for i, attendee := range event.Attendees {
			ourEvent.Attendees[i] = attendee.Email
		}
	}

	return ourEvent
}

// 为了编译通过，我们需要添加一个GetConfig方法到RetryExecutor
// 这需要在utils/retry.go中添加
