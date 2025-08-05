package services

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// GoogleCalendarService Google日历服务
type GoogleCalendarService struct {
	config *oauth2.Config
}

// GoogleAuthConfig Google认证配置
type GoogleAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
}

// GoogleToken Google访问令牌信息
type GoogleToken struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// NewGoogleCalendarService 创建新的Google日历服务实例
func NewGoogleCalendarService() *GoogleCalendarService {
	config := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{os.Getenv("GOOGLE_CALENDAR_SCOPES")},
		Endpoint:     google.Endpoint,
	}

	return &GoogleCalendarService{
		config: config,
	}
}

// GetAuthURL 获取Google OAuth授权URL
func (g *GoogleCalendarService) GetAuthURL(state string) string {
	return g.config.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent"))
}

// ExchangeCodeForToken 将授权码交换为访问令牌
func (g *GoogleCalendarService) ExchangeCodeForToken(ctx context.Context, code string) (*GoogleToken, error) {
	token, err := g.config.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %v", err)
	}

	googleToken := &GoogleToken{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
		ExpiresAt:    token.Expiry,
	}

	return googleToken, nil
}

// RefreshToken 刷新访问令牌
func (g *GoogleCalendarService) RefreshToken(ctx context.Context, refreshToken string) (*GoogleToken, error) {
	token := &oauth2.Token{
		RefreshToken: refreshToken,
	}

	tokenSource := g.config.TokenSource(ctx, token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %v", err)
	}

	googleToken := &GoogleToken{
		AccessToken:  newToken.AccessToken,
		RefreshToken: newToken.RefreshToken,
		TokenType:    newToken.TokenType,
		ExpiresAt:    newToken.Expiry,
	}

	return googleToken, nil
}

// GetCalendarService 获取Google Calendar服务客户端
func (g *GoogleCalendarService) GetCalendarService(ctx context.Context, accessToken string) (*calendar.Service, error) {
	token := &oauth2.Token{
		AccessToken: accessToken,
	}

	client := g.config.Client(ctx, token)
	
	service, err := calendar.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		return nil, fmt.Errorf("failed to create calendar service: %v", err)
	}

	return service, nil
}

// ValidateToken 验证访问令牌是否有效
func (g *GoogleCalendarService) ValidateToken(ctx context.Context, accessToken string) error {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return err
	}

	// 尝试获取用户的日历列表来验证令牌
	_, err = service.CalendarList.List().Do()
	if err != nil {
		return fmt.Errorf("token validation failed: %v", err)
	}

	return nil
}

// GetUserCalendars 获取用户的日历列表
func (g *GoogleCalendarService) GetUserCalendars(ctx context.Context, accessToken string) ([]*calendar.CalendarListEntry, error) {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	calendarList, err := service.CalendarList.List().Do()
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar list: %v", err)
	}

	return calendarList.Items, nil
}

// IsTokenExpired 检查令牌是否过期
func (g *GoogleCalendarService) IsTokenExpired(expiresAt time.Time) bool {
	// 提前5分钟检查过期，给刷新令牌留出时间
	return time.Now().Add(5 * time.Minute).After(expiresAt)
}

// RevokeToken 撤销Google访问令牌
func (g *GoogleCalendarService) RevokeToken(ctx context.Context, accessToken string) error {
	// Google的令牌撤销端点
	revokeURL := fmt.Sprintf("https://oauth2.googleapis.com/revoke?token=%s", accessToken)
	
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(revokeURL, "application/x-www-form-urlencoded", nil)
	if err != nil {
		return fmt.Errorf("failed to make revoke request: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to revoke token, status: %d", resp.StatusCode)
	}
	
	return nil
}

// GoogleCalendarEvent 表示Google日历事件
type GoogleCalendarEvent struct {
	ID          string    `json:"id"`
	Summary     string    `json:"summary"`
	Description string    `json:"description,omitempty"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Location    string    `json:"location,omitempty"`
	IsAllDay    bool      `json:"is_all_day"`
	Status      string    `json:"status"` // confirmed, tentative, cancelled
	Visibility  string    `json:"visibility,omitempty"` // default, public, private
	Attendees   []string  `json:"attendees,omitempty"`
}

// CreateEvent 在指定日历中创建事件
func (g *GoogleCalendarService) CreateEvent(ctx context.Context, accessToken, calendarID string, event *GoogleCalendarEvent) (*GoogleCalendarEvent, error) {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

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
			TimeZone: "Asia/Shanghai", // 可以从配置中获取
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

	createdEvent, err := service.Events.Insert(calendarID, googleEvent).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to create event: %v", err)
	}

	// 转换回我们的格式
	return g.convertGoogleEventToOur(createdEvent), nil
}

// UpdateEvent 更新Google日历事件
func (g *GoogleCalendarService) UpdateEvent(ctx context.Context, accessToken, calendarID, eventID string, event *GoogleCalendarEvent) (*GoogleCalendarEvent, error) {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

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

	updatedEvent, err := service.Events.Update(calendarID, eventID, googleEvent).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to update event: %v", err)
	}

	return g.convertGoogleEventToOur(updatedEvent), nil
}

// DeleteEvent 删除Google日历事件
func (g *GoogleCalendarService) DeleteEvent(ctx context.Context, accessToken, calendarID, eventID string) error {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return err
	}

	err = service.Events.Delete(calendarID, eventID).Do()
	if err != nil {
		return fmt.Errorf("failed to delete event: %v", err)
	}

	return nil
}

// GetEvent 获取Google日历事件
func (g *GoogleCalendarService) GetEvent(ctx context.Context, accessToken, calendarID, eventID string) (*GoogleCalendarEvent, error) {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	event, err := service.Events.Get(calendarID, eventID).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to get event: %v", err)
	}

	return g.convertGoogleEventToOur(event), nil
}

// ListEvents 获取日历事件列表
func (g *GoogleCalendarService) ListEvents(ctx context.Context, accessToken, calendarID string, timeMin, timeMax time.Time, maxResults int64) ([]*GoogleCalendarEvent, error) {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	call := service.Events.List(calendarID).
		TimeMin(timeMin.Format(time.RFC3339)).
		TimeMax(timeMax.Format(time.RFC3339)).
		MaxResults(maxResults).
		SingleEvents(true).
		OrderBy("startTime")

	events, err := call.Do()
	if err != nil {
		return nil, fmt.Errorf("failed to list events: %v", err)
	}

	ourEvents := make([]*GoogleCalendarEvent, len(events.Items))
	for i, event := range events.Items {
		ourEvents[i] = g.convertGoogleEventToOur(event)
	}

	return ourEvents, nil
}

// WatchEvents 设置日历事件变更通知
func (g *GoogleCalendarService) WatchEvents(ctx context.Context, accessToken, calendarID, webhookURL string, ttl time.Duration) (*calendar.Channel, error) {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	// 生成唯一的频道ID
	channelID := fmt.Sprintf("channel_%d_%s", time.Now().Unix(), calendarID)
	
	channel := &calendar.Channel{
		Id:      channelID,
		Type:    "web_hook",
		Address: webhookURL,
		Expiration: time.Now().Add(ttl).Unix() * 1000, // 毫秒时间戳
	}

	watchResponse, err := service.Events.Watch(calendarID, channel).Do()
	if err != nil {
		return nil, fmt.Errorf("failed to watch events: %v", err)
	}

	return watchResponse, nil
}

// StopWatch 停止事件监听
func (g *GoogleCalendarService) StopWatch(ctx context.Context, accessToken, channelID, resourceID string) error {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return err
	}

	channel := &calendar.Channel{
		Id:         channelID,
		ResourceId: resourceID,
	}

	err = service.Channels.Stop(channel).Do()
	if err != nil {
		return fmt.Errorf("failed to stop watch: %v", err)
	}

	return nil
}

// GetCalendarSettings 获取日历设置
func (g *GoogleCalendarService) GetCalendarSettings(ctx context.Context, accessToken string) (map[string]string, error) {
	service, err := g.GetCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	settings, err := service.Settings.List().Do()
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar settings: %v", err)
	}

	settingsMap := make(map[string]string)
	for _, setting := range settings.Items {
		settingsMap[setting.Id] = setting.Value
	}

	return settingsMap, nil
}

// BatchCreateEvents 批量创建事件
func (g *GoogleCalendarService) BatchCreateEvents(ctx context.Context, accessToken, calendarID string, events []*GoogleCalendarEvent) ([]*GoogleCalendarEvent, error) {
	// 验证accessToken有效性
	err := g.ValidateToken(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	createdEvents := make([]*GoogleCalendarEvent, 0, len(events))
	
	// Google Calendar API 不直接支持批量操作，所以我们逐个创建
	// 在生产环境中可以考虑使用 Google Batch API
	for _, event := range events {
		createdEvent, err := g.CreateEvent(ctx, accessToken, calendarID, event)
		if err != nil {
			// 记录错误但继续处理其他事件
			fmt.Printf("Failed to create event %s: %v\n", event.Summary, err)
			continue
		}
		createdEvents = append(createdEvents, createdEvent)
	}

	return createdEvents, nil
}

// convertGoogleEventToOur 将Google日历事件转换为我们的格式
func (g *GoogleCalendarService) convertGoogleEventToOur(event *calendar.Event) *GoogleCalendarEvent {
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