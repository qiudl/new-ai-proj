package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"strings"
)

// NotificationService defines the interface for notification business logic
type NotificationService interface {
	// CreateMentionNotifications creates notifications for mentioned users in a comment
	CreateMentionNotifications(
		ctx context.Context,
		requirementID int,
		commentID int,
		mentionedUserIDs []int,
		mentionedByUserID int,
		mentionedByUsername string,
		commentContent string,
	) error

	// GetUserNotifications retrieves notifications for a user with pagination
	GetUserNotifications(ctx context.Context, userID int, filters *models.NotificationFilters) (*models.NotificationListResponse, error)

	// MarkAsRead marks a notification as read
	MarkAsRead(ctx context.Context, notificationID int, userID int) error

	// BatchMarkAsRead marks multiple notifications as read
	BatchMarkAsRead(ctx context.Context, notificationIDs []int, userID int) error

	// MarkAllAsRead marks all notifications as read for a user
	MarkAllAsRead(ctx context.Context, userID int) error

	// GetUnreadCount gets the count of unread notifications for a user
	GetUnreadCount(ctx context.Context, userID int) (int, error)

	// Delete deletes a notification
	Delete(ctx context.Context, notificationID int, userID int) error
}

// notificationServiceImpl implements NotificationService
type notificationServiceImpl struct {
	notificationRepo database.NotificationRepository
}

// NewNotificationService creates a new notification service
func NewNotificationService(notificationRepo database.NotificationRepository) NotificationService {
	return &notificationServiceImpl{
		notificationRepo: notificationRepo,
	}
}

// CreateMentionNotifications creates notifications for mentioned users in a comment
func (s *notificationServiceImpl) CreateMentionNotifications(
	ctx context.Context,
	requirementID int,
	commentID int,
	mentionedUserIDs []int,
	mentionedByUserID int,
	mentionedByUsername string,
	commentContent string,
) error {
	if len(mentionedUserIDs) == 0 {
		return nil
	}

	// Remove the mentioned user if they mentioned themselves
	filteredUserIDs := []int{}
	for _, userID := range mentionedUserIDs {
		if userID != mentionedByUserID {
			filteredUserIDs = append(filteredUserIDs, userID)
		}
	}

	if len(filteredUserIDs) == 0 {
		return nil
	}

	// Truncate comment content for notification (first 100 characters)
	truncatedContent := commentContent
	if len(truncatedContent) > 100 {
		truncatedContent = truncatedContent[:100] + "..."
	}

	// Create notification metadata
	mentionData := &models.MentionNotificationData{
		RequirementID:       requirementID,
		CommentID:           commentID,
		MentionedBy:         mentionedByUserID,
		MentionedByUsername: mentionedByUsername,
		CommentContent:      truncatedContent,
	}

	// Create notifications for all mentioned users
	notifications := make([]*models.Notification, 0, len(filteredUserIDs))
	title := fmt.Sprintf("@%s 在需求评论中提到了你", mentionedByUsername)
	message := fmt.Sprintf("%s 在需求评论中提到了你：%s", mentionedByUsername, truncatedContent)

	for _, userID := range filteredUserIDs {
		notification := &models.Notification{
			UserID:  userID,
			Type:    string(models.NotificationTypeMention),
			Title:   title,
			Message: &message,
			Metadata: mentionData.ToMetadata(),
		}
		notifications = append(notifications, notification)
	}

	// Batch create notifications
	if err := s.notificationRepo.BatchCreate(ctx, notifications); err != nil {
		return fmt.Errorf("failed to create mention notifications: %w", err)
	}

	return nil
}

// GetUserNotifications retrieves notifications for a user with pagination
func (s *notificationServiceImpl) GetUserNotifications(
	ctx context.Context,
	userID int,
	filters *models.NotificationFilters,
) (*models.NotificationListResponse, error) {
	// Set user ID filter
	filters.UserID = &userID

	// Default pagination
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.PageSize < 1 || filters.PageSize > 100 {
		filters.PageSize = 20
	}

	// Default sorting
	if filters.SortBy == "" {
		filters.SortBy = "created_at"
	}
	if filters.SortOrder == "" {
		filters.SortOrder = "desc"
	}

	return s.notificationRepo.List(ctx, filters)
}

// MarkAsRead marks a notification as read
func (s *notificationServiceImpl) MarkAsRead(ctx context.Context, notificationID int, userID int) error {
	return s.notificationRepo.MarkAsRead(ctx, notificationID, userID)
}

// BatchMarkAsRead marks multiple notifications as read
func (s *notificationServiceImpl) BatchMarkAsRead(ctx context.Context, notificationIDs []int, userID int) error {
	return s.notificationRepo.BatchMarkAsRead(ctx, notificationIDs, userID)
}

// MarkAllAsRead marks all notifications as read for a user
func (s *notificationServiceImpl) MarkAllAsRead(ctx context.Context, userID int) error {
	return s.notificationRepo.MarkAllAsRead(ctx, userID)
}

// GetUnreadCount gets the count of unread notifications for a user
func (s *notificationServiceImpl) GetUnreadCount(ctx context.Context, userID int) (int, error) {
	return s.notificationRepo.GetUnreadCount(ctx, userID)
}

// Delete deletes a notification
func (s *notificationServiceImpl) Delete(ctx context.Context, notificationID int, userID int) error {
	return s.notificationRepo.Delete(ctx, notificationID, userID)
}

// Helper function to truncate text
func truncateText(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return strings.TrimSpace(text[:maxLength]) + "..."
}
