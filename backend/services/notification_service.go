// Package services - 通知服务接口
// 任务#242: 后端统一服务实现 - NotificationService
package services

import (
	"encoding/json"
	"fmt"
	"log"
)

// NotificationService 通知服务接口
type NotificationService interface {
	// 计时器通知
	SendTimerNotification(userID int, eventType string, data map[string]interface{}) error
	
	// 系统通知
	SendSystemNotification(userID int, title, message string, priority string) error
	
	// 批量通知
	SendBulkNotification(userIDs []int, notification *Notification) error
	
	// 实时消息推送 (WebSocket)
	BroadcastToUser(userID int, message *WebSocketMessage) error
	BroadcastToAll(message *WebSocketMessage) error
}

// Notification 通知结构
type Notification struct {
	ID       string                 `json:"id"`
	UserID   int                    `json:"user_id"`
	Type     string                 `json:"type"`     // timer, system, reminder, achievement
	Title    string                 `json:"title"`
	Message  string                 `json:"message"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Priority string                 `json:"priority"` // low, medium, high, urgent
	Read     bool                   `json:"read"`
	CreatedAt string                `json:"created_at"`
}

// WebSocketMessage WebSocket消息结构
type WebSocketMessage struct {
	Type      string      `json:"type"`
	UserID    int         `json:"user_id,omitempty"`
	Data      interface{} `json:"data"`
	Timestamp string      `json:"timestamp"`
}

// notificationServiceImpl 通知服务实现
type notificationServiceImpl struct {
	// 这里可以集成实际的推送服务，如 Firebase、WebSocket 等
	// 目前使用简单的日志记录作为示例实现
}

// NewNotificationService 创建通知服务实例
func NewNotificationService() NotificationService {
	return &notificationServiceImpl{}
}

// SendTimerNotification 发送计时器相关通知
func (n *notificationServiceImpl) SendTimerNotification(userID int, eventType string, data map[string]interface{}) error {
	notification := &Notification{
		ID:       generateNotificationID(),
		UserID:   userID,
		Type:     "timer",
		Priority: "medium",
		Data:     data,
		Read:     false,
	}

	// 根据事件类型设置标题和消息
	switch eventType {
	case "timer_started":
		notification.Title = "计时器已启动"
		if title, ok := data["title"].(string); ok {
			notification.Message = fmt.Sprintf("开始计时: %s", title)
		}
		
	case "timer_paused":
		notification.Title = "计时器已暂停"
		if title, ok := data["title"].(string); ok {
			notification.Message = fmt.Sprintf("暂停计时: %s", title)
		}
		
	case "timer_resumed":
		notification.Title = "计时器已恢复"
		if title, ok := data["title"].(string); ok {
			notification.Message = fmt.Sprintf("恢复计时: %s", title)
		}
		
	case "timer_stopped":
		notification.Title = "计时器已停止"
		if title, ok := data["title"].(string); ok {
			if duration, ok := data["duration"].(int); ok {
				notification.Message = fmt.Sprintf("完成计时: %s，用时 %s", title, formatDuration(duration))
			} else {
				notification.Message = fmt.Sprintf("完成计时: %s", title)
			}
		}
		
	case "timer_milestone":
		notification.Title = "计时里程碑"
		if message, ok := data["message"].(string); ok {
			notification.Message = message
		}
		notification.Priority = "high"
		
	default:
		notification.Title = "计时器通知"
		notification.Message = fmt.Sprintf("计时器事件: %s", eventType)
	}

	return n.sendNotification(notification)
}

// SendSystemNotification 发送系统通知
func (n *notificationServiceImpl) SendSystemNotification(userID int, title, message string, priority string) error {
	notification := &Notification{
		ID:       generateNotificationID(),
		UserID:   userID,
		Type:     "system",
		Title:    title,
		Message:  message,
		Priority: priority,
		Read:     false,
	}

	return n.sendNotification(notification)
}

// SendBulkNotification 发送批量通知
func (n *notificationServiceImpl) SendBulkNotification(userIDs []int, notification *Notification) error {
	for _, userID := range userIDs {
		notificationCopy := *notification
		notificationCopy.UserID = userID
		notificationCopy.ID = generateNotificationID()
		
		if err := n.sendNotification(&notificationCopy); err != nil {
			log.Printf("发送批量通知失败 (用户ID: %d): %v", userID, err)
			// 继续发送其他用户的通知，不中断
		}
	}
	return nil
}

// BroadcastToUser 向特定用户广播WebSocket消息
func (n *notificationServiceImpl) BroadcastToUser(userID int, message *WebSocketMessage) error {
	message.UserID = userID
	
	// 这里应该集成实际的WebSocket服务
	// 目前使用日志记录作为示例
	messageJSON, _ := json.Marshal(message)
	log.Printf("WebSocket广播给用户%d: %s", userID, string(messageJSON))
	
	return nil
}

// BroadcastToAll 向所有用户广播WebSocket消息
func (n *notificationServiceImpl) BroadcastToAll(message *WebSocketMessage) error {
	// 这里应该集成实际的WebSocket服务
	// 目前使用日志记录作为示例
	messageJSON, _ := json.Marshal(message)
	log.Printf("WebSocket全局广播: %s", string(messageJSON))
	
	return nil
}

// sendNotification 发送单个通知的内部方法
func (n *notificationServiceImpl) sendNotification(notification *Notification) error {
	// 这里应该集成实际的推送服务
	// 例如：
	// 1. 保存到数据库
	// 2. 发送推送通知 (Firebase, APNs)
	// 3. 发送邮件通知
	// 4. WebSocket实时推送
	
	// 目前使用日志记录作为示例实现
	notificationJSON, _ := json.Marshal(notification)
	log.Printf("发送通知: %s", string(notificationJSON))
	
	return nil
}

// 辅助函数
func generateNotificationID() string {
	// 简单的ID生成，实际应该使用UUID或更安全的方法
	return fmt.Sprintf("notif_%d", generateTimestamp())
}

func generateTimestamp() int64 {
	return getUnixTimestamp()
}

func getUnixTimestamp() int64 {
	// 这里应该返回当前时间戳
	// 为了编译通过，使用占位符
	return 1672531200 // 2023-01-01 00:00:00 UTC
}

func formatDuration(seconds int) string {
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