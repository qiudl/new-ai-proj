package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"

	"github.com/gin-gonic/gin"
)

// GoogleAuthHandler Google认证处理器
type GoogleAuthHandler struct {
	googleService  *services.GoogleCalendarService
	userRepo       database.UserRepository
	googleAuthRepo database.GoogleAuthRepository
}

// GoogleAuthRequest Google认证请求
type GoogleAuthRequest struct {
	State string `json:"state,omitempty"`
}

// GoogleAuthResponse Google认证响应
type GoogleAuthResponse struct {
	AuthURL string `json:"auth_url"`
	State   string `json:"state"`
}

// GoogleCallbackRequest Google回调请求
type GoogleCallbackRequest struct {
	Code  string `json:"code"`
	State string `json:"state"`
}

// GoogleConnectionStatus Google连接状态
type GoogleConnectionStatus struct {
	IsConnected   bool      `json:"is_connected"`
	CalendarCount int       `json:"calendar_count,omitempty"`
	LastSyncTime  time.Time `json:"last_sync_time,omitempty"`
	UserEmail     string    `json:"user_email,omitempty"`
}

// NewGoogleAuthHandler 创建Google认证处理器
func NewGoogleAuthHandler(googleService *services.GoogleCalendarService, userRepo database.UserRepository, googleAuthRepo database.GoogleAuthRepository) *GoogleAuthHandler {
	return &GoogleAuthHandler{
		googleService:  googleService,
		userRepo:       userRepo,
		googleAuthRepo: googleAuthRepo,
	}
}

// InitiateGoogleAuth 发起Google认证
func (h *GoogleAuthHandler) InitiateGoogleAuth(c *gin.Context) {
	// 从JWT中获取用户ID
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未认证"})
		return
	}

	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户ID类型错误"})
		return
	}

	ctx := context.Background()

	// 清理用户的过期OAuth状态
	_, err := h.googleAuthRepo.CleanupExpiredOAuthStates(ctx)
	if err != nil {
		// 记录错误但不阻塞流程
		fmt.Printf("Failed to cleanup expired OAuth states: %v\n", err)
	}

	// 创建新的OAuth状态记录
	oauthState, err := h.googleAuthRepo.CreateOAuthState(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "生成OAuth状态失败",
		})
		return
	}

	// 获取Google授权URL
	authURL := h.googleService.GetAuthURL(oauthState.State)

	response := GoogleAuthResponse{
		AuthURL: authURL,
		State:   oauthState.State,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Google认证URL生成成功",
		"data":    response,
	})
}

// HandleGoogleCallback 处理Google认证回调
func (h *GoogleAuthHandler) HandleGoogleCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")
	errorParam := c.Query("error")

	// 检查是否有错误
	if errorParam != "" {
		c.HTML(http.StatusBadRequest, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       fmt.Sprintf("Google认证失败: %s", errorParam),
		})
		return
	}

	// 验证必需参数
	if code == "" || state == "" {
		c.HTML(http.StatusBadRequest, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       "缺少必需的认证参数",
		})
		return
	}

	ctx := context.Background()

	// 验证state参数（防止CSRF攻击）
	oauthState, err := h.googleAuthRepo.GetOAuthState(ctx, state)
	if err != nil {
		c.HTML(http.StatusBadRequest, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       "无效的OAuth状态参数",
		})
		return
	}

	// 检查state是否过期
	if oauthState.IsExpired() {
		c.HTML(http.StatusBadRequest, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       "OAuth状态已过期，请重新授权",
		})
		return
	}

	// 交换授权码获取访问令牌
	token, err := h.googleService.ExchangeCodeForToken(ctx, code)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       "获取访问令牌失败",
		})
		return
	}

	// 验证令牌有效性
	err = h.googleService.ValidateToken(ctx, token.AccessToken)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       "令牌验证失败",
		})
		return
	}

	// 获取用户日历列表以确认权限
	calendars, err := h.googleService.GetUserCalendars(ctx, token.AccessToken)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       "获取日历列表失败",
		})
		return
	}

	// 保存Google令牌到数据库
	googleToken := &models.GoogleToken{
		UserID:       oauthState.UserID,
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
		ExpiresAt:    token.ExpiresAt,
		Scopes:       []string{"https://www.googleapis.com/auth/calendar"},
	}

	err = h.googleAuthRepo.SaveGoogleToken(ctx, googleToken)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "google_auth_success.html", gin.H{
			"CalendarCount": 0,
			"Message":       "保存令牌失败",
		})
		return
	}

	// 保存日历同步配置
	for _, calendar := range calendars {
		calendarSync := &models.GoogleCalendarSync{
			UserID:        oauthState.UserID,
			CalendarID:    calendar.Id,
			CalendarName:  calendar.Summary,
			IsPrimary:     calendar.Primary,
			SyncEnabled:   calendar.Primary, // 默认只同步主日历
			SyncDirection: models.SyncDirectionBidirectional,
		}

		err = h.googleAuthRepo.SaveCalendarSync(ctx, calendarSync)
		if err != nil {
			// 记录错误但不阻塞流程
			fmt.Printf("Failed to save calendar sync for %s: %v\n", calendar.Id, err)
		}
	}

	// 更新用户Google日历启用状态
	err = h.googleAuthRepo.SetUserGoogleCalendarEnabled(ctx, oauthState.UserID, true)
	if err != nil {
		// 记录错误但不阻塞流程
		fmt.Printf("Failed to set user google calendar enabled: %v\n", err)
	}

	// 删除已使用的OAuth状态
	err = h.googleAuthRepo.DeleteOAuthState(ctx, state)
	if err != nil {
		// 记录错误但不阻塞流程
		fmt.Printf("Failed to delete OAuth state: %v\n", err)
	}

	// 创建同步日志
	syncLog := &models.GoogleSyncLog{
		UserID:       oauthState.UserID,
		Operation:    "google_auth_success",
		ResourceType: "token",
		ResourceID:   fmt.Sprintf("user_%d", oauthState.UserID),
		Status:       models.LogStatusSuccess,
		Message:      StringPtr("Google Calendar connection established successfully"),
		Details: map[string]interface{}{
			"calendar_count":   len(calendars),
			"token_expires_at": token.ExpiresAt,
		},
		ExecutionTimeMs: nil,
	}

	err = h.googleAuthRepo.CreateSyncLog(ctx, syncLog)
	if err != nil {
		// 记录错误但不阻塞流程
		fmt.Printf("Failed to create sync log: %v\n", err)
	}

	// 返回成功页面
	c.HTML(http.StatusOK, "google_auth_success.html", gin.H{
		"CalendarCount": len(calendars),
		"Message":       "Google日历连接成功！",
	})
}

// GetGoogleConnectionStatus 获取Google连接状态
func (h *GoogleAuthHandler) GetGoogleConnectionStatus(c *gin.Context) {
	// 从JWT中获取用户ID
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未认证"})
		return
	}

	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户ID类型错误"})
		return
	}

	ctx := context.Background()

	// 获取用户的Google令牌
	token, err := h.googleAuthRepo.GetGoogleToken(ctx, userID)
	if err != nil {
		// 用户没有连接Google日历
		status := GoogleConnectionStatus{
			IsConnected:   false,
			CalendarCount: 0,
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    status,
		})
		return
	}

	// 检查令牌是否过期
	if token.IsTokenExpired() {
		status := GoogleConnectionStatus{
			IsConnected:   false,
			CalendarCount: 0,
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    status,
			"message": "Google连接已过期，需要重新授权",
		})
		return
	}

	// 获取用户的日历同步配置
	calendarSyncs, err := h.googleAuthRepo.GetUserCalendarSyncs(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取日历同步配置失败",
		})
		return
	}

	// 计算启用同步的日历数量
	enabledCalendarCount := 0
	var lastSyncTime time.Time
	var userEmail string

	for _, sync := range calendarSyncs {
		if sync.SyncEnabled {
			enabledCalendarCount++
		}
		if sync.LastSyncAt != nil && sync.LastSyncAt.After(lastSyncTime) {
			lastSyncTime = *sync.LastSyncAt
		}
		if sync.IsPrimary && sync.CalendarName != "" {
			userEmail = sync.CalendarName // 可能包含用户邮箱信息
		}
	}

	status := GoogleConnectionStatus{
		IsConnected:   true,
		CalendarCount: enabledCalendarCount,
		LastSyncTime:  lastSyncTime,
		UserEmail:     userEmail,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// DisconnectGoogle 断开Google连接
func (h *GoogleAuthHandler) DisconnectGoogle(c *gin.Context) {
	// 从JWT中获取用户ID
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未认证"})
		return
	}

	userID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "用户ID类型错误"})
		return
	}

	ctx := context.Background()

	// 获取用户的Google令牌，用于撤销权限
	token, err := h.googleAuthRepo.GetGoogleToken(ctx, userID)
	if err != nil {
		// 用户没有Google连接，直接返回成功
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "用户未连接Google日历",
		})
		return
	}

	// 撤销Google访问权限（可选，但推荐）
	if token.AccessToken != "" {
		err = h.googleService.RevokeToken(ctx, token.AccessToken)
		if err != nil {
			// 记录错误但不阻塞流程
			fmt.Printf("Failed to revoke Google token: %v\n", err)
		}
	}

	// 删除Google令牌
	err = h.googleAuthRepo.DeleteGoogleToken(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "删除Google令牌失败",
		})
		return
	}

	// 获取用户的日历同步配置
	calendarSyncs, err := h.googleAuthRepo.GetUserCalendarSyncs(ctx, userID)
	if err == nil {
		// 删除所有日历同步配置
		for _, sync := range calendarSyncs {
			err = h.googleAuthRepo.DeleteCalendarSync(ctx, userID, sync.CalendarID)
			if err != nil {
				// 记录错误但不阻塞流程
				fmt.Printf("Failed to delete calendar sync for %s: %v\n", sync.CalendarID, err)
			}
		}
	}

	// 删除所有事件映射
	eventMappings, err := h.googleAuthRepo.GetUserEventMappings(ctx, userID)
	if err == nil {
		for _, mapping := range eventMappings {
			err = h.googleAuthRepo.DeleteEventMapping(ctx, mapping.TaskID)
			if err != nil {
				// 记录错误但不阻塞流程
				fmt.Printf("Failed to delete event mapping for task %d: %v\n", mapping.TaskID, err)
			}
		}
	}

	// 更新用户Google日历启用状态
	err = h.googleAuthRepo.SetUserGoogleCalendarEnabled(ctx, userID, false)
	if err != nil {
		// 记录错误但不阻塞流程
		fmt.Printf("Failed to set user google calendar disabled: %v\n", err)
	}

	// 创建断开连接日志
	syncLog := &models.GoogleSyncLog{
		UserID:       userID,
		Operation:    "google_disconnect",
		ResourceType: "connection",
		ResourceID:   fmt.Sprintf("user_%d", userID),
		Status:       models.LogStatusSuccess,
		Message:      StringPtr("Google Calendar connection disconnected successfully"),
		Details: map[string]interface{}{
			"token_revoked":     token.AccessToken != "",
			"calendars_removed": len(calendarSyncs),
			"mappings_removed":  len(eventMappings),
		},
		ExecutionTimeMs: nil,
	}

	err = h.googleAuthRepo.CreateSyncLog(ctx, syncLog)
	if err != nil {
		// 记录错误但不阻塞流程
		fmt.Printf("Failed to create disconnect log: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Google日历连接已成功断开",
	})
}

// StringPtr 返回字符串指针，用于可为空的字符串字段
func StringPtr(s string) *string {
	return &s
}
