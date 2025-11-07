package database

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

// NotificationRepository defines the interface for notification data access
type NotificationRepository interface {
	// Create creates a new notification
	Create(ctx context.Context, notification *models.Notification) error

	// BatchCreate creates multiple notifications in a single transaction
	BatchCreate(ctx context.Context, notifications []*models.Notification) error

	// GetByID retrieves a notification by ID
	GetByID(ctx context.Context, id int) (*models.Notification, error)

	// List retrieves notifications with filters and pagination
	List(ctx context.Context, filters *models.NotificationFilters) (*models.NotificationListResponse, error)

	// MarkAsRead marks a notification as read
	MarkAsRead(ctx context.Context, id int, userID int) error

	// BatchMarkAsRead marks multiple notifications as read
	BatchMarkAsRead(ctx context.Context, ids []int, userID int) error

	// MarkAllAsRead marks all unread notifications for a user as read
	MarkAllAsRead(ctx context.Context, userID int) error

	// Delete soft deletes a notification
	Delete(ctx context.Context, id int, userID int) error

	// GetUnreadCount gets the count of unread notifications for a user
	GetUnreadCount(ctx context.Context, userID int) (int, error)
}

// notificationRepositoryImpl implements NotificationRepository
type notificationRepositoryImpl struct {
	db interface{} // Can be *sql.DB or *sql.Tx
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *sql.DB) NotificationRepository {
	return &notificationRepositoryImpl{
		db: db,
	}
}

// getDB returns the database connection (supports both *sql.DB and *sql.Tx)
func (r *notificationRepositoryImpl) getDB() DBExecutor {
	if tx, ok := r.db.(*sql.Tx); ok {
		return tx
	}
	return r.db.(*sql.DB)
}

// Create creates a new notification
func (r *notificationRepositoryImpl) Create(ctx context.Context, notification *models.Notification) error {
	query := `
		INSERT INTO notifications (
			user_id, type, title, message,
			related_task_id, related_project_id, metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, is_read
	`

	err := r.getDB().QueryRowContext(
		ctx, query,
		notification.UserID,
		notification.Type,
		notification.Title,
		notification.Message,
		notification.RelatedTaskID,
		notification.RelatedProjectID,
		notification.Metadata,
	).Scan(&notification.ID, &notification.CreatedAt, &notification.IsRead)

	if err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}

	return nil
}

// BatchCreate creates multiple notifications in a single transaction
func (r *notificationRepositoryImpl) BatchCreate(ctx context.Context, notifications []*models.Notification) error {
	if len(notifications) == 0 {
		return nil
	}

	// Get underlying *sql.DB for transaction
	db, ok := r.db.(*sql.DB)
	if !ok {
		return fmt.Errorf("invalid database connection type")
	}

	// Start transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO notifications (
			user_id, type, title, message,
			related_task_id, related_project_id, metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, is_read
	`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, notification := range notifications {
		err := stmt.QueryRowContext(
			ctx,
			notification.UserID,
			notification.Type,
			notification.Title,
			notification.Message,
			notification.RelatedTaskID,
			notification.RelatedProjectID,
			notification.Metadata,
		).Scan(&notification.ID, &notification.CreatedAt, &notification.IsRead)

		if err != nil {
			return fmt.Errorf("failed to create notification for user %d: %w", notification.UserID, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetByID retrieves a notification by ID
func (r *notificationRepositoryImpl) GetByID(ctx context.Context, id int) (*models.Notification, error) {
	query := `
		SELECT
			n.id, n.user_id, n.type, n.title, n.message,
			n.is_read, n.related_task_id, n.related_project_id,
			n.created_at, n.read_at, n.metadata, n.deleted_at,
			u.username,
			t.title as task_title,
			p.name as project_title
		FROM notifications n
		LEFT JOIN users u ON n.user_id = u.id
		LEFT JOIN tasks t ON n.related_task_id = t.id
		LEFT JOIN projects p ON n.related_project_id = p.id
		WHERE n.id = $1 AND n.deleted_at IS NULL
	`

	notification := &models.Notification{}
	err := r.getDB().QueryRowContext(ctx, query, id).Scan(
		&notification.ID,
		&notification.UserID,
		&notification.Type,
		&notification.Title,
		&notification.Message,
		&notification.IsRead,
		&notification.RelatedTaskID,
		&notification.RelatedProjectID,
		&notification.CreatedAt,
		&notification.ReadAt,
		&notification.Metadata,
		&notification.DeletedAt,
		&notification.Username,
		&notification.TaskTitle,
		&notification.ProjectTitle,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("notification not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get notification: %w", err)
	}

	return notification, nil
}

// List retrieves notifications with filters and pagination
func (r *notificationRepositoryImpl) List(ctx context.Context, filters *models.NotificationFilters) (*models.NotificationListResponse, error) {
	// Build WHERE clause
	whereClauses := []string{"n.deleted_at IS NULL"}
	args := []interface{}{}
	argCounter := 1

	if filters.UserID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("n.user_id = $%d", argCounter))
		args = append(args, *filters.UserID)
		argCounter++
	}

	if len(filters.Type) > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("n.type = ANY($%d)", argCounter))
		args = append(args, pq.Array(filters.Type))
		argCounter++
	}

	if filters.IsRead != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("n.is_read = $%d", argCounter))
		args = append(args, *filters.IsRead)
		argCounter++
	}

	whereClause := strings.Join(whereClauses, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM notifications n
		WHERE %s
	`, whereClause)

	var total int
	err := r.getDB().QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count notifications: %w", err)
	}

	// Build ORDER BY clause
	sortBy := "n.created_at"
	if filters.SortBy == "read_at" {
		sortBy = "n.read_at"
	}
	sortOrder := "DESC"
	if filters.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	// Calculate pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	pageSize := filters.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// Query notifications
	query := fmt.Sprintf(`
		SELECT
			n.id, n.user_id, n.type, n.title, n.message,
			n.is_read, n.related_task_id, n.related_project_id,
			n.created_at, n.read_at, n.metadata, n.deleted_at,
			u.username,
			t.title as task_title,
			p.name as project_title
		FROM notifications n
		LEFT JOIN users u ON n.user_id = u.id
		LEFT JOIN tasks t ON n.related_task_id = t.id
		LEFT JOIN projects p ON n.related_project_id = p.id
		WHERE %s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortOrder, argCounter, argCounter+1)

	args = append(args, pageSize, offset)

	rows, err := r.getDB().QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query notifications: %w", err)
	}
	defer rows.Close()

	notifications := []models.NotificationResponse{}
	for rows.Next() {
		notification := &models.Notification{}
		err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.Type,
			&notification.Title,
			&notification.Message,
			&notification.IsRead,
			&notification.RelatedTaskID,
			&notification.RelatedProjectID,
			&notification.CreatedAt,
			&notification.ReadAt,
			&notification.Metadata,
			&notification.DeletedAt,
			&notification.Username,
			&notification.TaskTitle,
			&notification.ProjectTitle,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan notification: %w", err)
		}
		notifications = append(notifications, notification.ToResponse())
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating notifications: %w", err)
	}

	return &models.NotificationListResponse{
		Data:     notifications,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// MarkAsRead marks a notification as read
func (r *notificationRepositoryImpl) MarkAsRead(ctx context.Context, id int, userID int) error {
	query := `
		UPDATE notifications
		SET is_read = TRUE, read_at = $1
		WHERE id = $2 AND user_id = $3 AND is_read = FALSE AND deleted_at IS NULL
	`

	result, err := r.getDB().ExecContext(ctx, query, time.Now(), id, userID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("notification not found or already read")
	}

	return nil
}

// BatchMarkAsRead marks multiple notifications as read
func (r *notificationRepositoryImpl) BatchMarkAsRead(ctx context.Context, ids []int, userID int) error {
	if len(ids) == 0 {
		return nil
	}

	query := `
		UPDATE notifications
		SET is_read = TRUE, read_at = $1
		WHERE id = ANY($2) AND user_id = $3 AND is_read = FALSE AND deleted_at IS NULL
	`

	_, err := r.getDB().ExecContext(ctx, query, time.Now(), pq.Array(ids), userID)
	if err != nil {
		return fmt.Errorf("failed to batch mark notifications as read: %w", err)
	}

	return nil
}

// MarkAllAsRead marks all unread notifications for a user as read
func (r *notificationRepositoryImpl) MarkAllAsRead(ctx context.Context, userID int) error {
	query := `
		UPDATE notifications
		SET is_read = TRUE, read_at = $1
		WHERE user_id = $2 AND is_read = FALSE AND deleted_at IS NULL
	`

	_, err := r.getDB().ExecContext(ctx, query, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}

	return nil
}

// Delete soft deletes a notification
func (r *notificationRepositoryImpl) Delete(ctx context.Context, id int, userID int) error {
	query := `
		UPDATE notifications
		SET deleted_at = $1
		WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
	`

	result, err := r.getDB().ExecContext(ctx, query, time.Now(), id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// GetUnreadCount gets the count of unread notifications for a user
func (r *notificationRepositoryImpl) GetUnreadCount(ctx context.Context, userID int) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1 AND is_read = FALSE AND deleted_at IS NULL
	`

	var count int
	err := r.getDB().QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return count, nil
}
