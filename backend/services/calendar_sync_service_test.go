package services

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockGoogleCalendarService implements a mock for GoogleCalendarService
type MockGoogleCalendarService struct {
	mock.Mock
}

func (m *MockGoogleCalendarService) CreateEvent(ctx context.Context, accessToken, calendarID string, event *GoogleCalendarEvent) (*GoogleCalendarEvent, error) {
	args := m.Called(ctx, accessToken, calendarID, event)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*GoogleCalendarEvent), args.Error(1)
}

func (m *MockGoogleCalendarService) UpdateEvent(ctx context.Context, accessToken, calendarID, eventID string, event *GoogleCalendarEvent) (*GoogleCalendarEvent, error) {
	args := m.Called(ctx, accessToken, calendarID, eventID, event)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*GoogleCalendarEvent), args.Error(1)
}

func (m *MockGoogleCalendarService) DeleteEvent(ctx context.Context, accessToken, calendarID, eventID string) error {
	args := m.Called(ctx, accessToken, calendarID, eventID)
	return args.Error(0)
}

func (m *MockGoogleCalendarService) GetEvent(ctx context.Context, accessToken, calendarID, eventID string) (*GoogleCalendarEvent, error) {
	args := m.Called(ctx, accessToken, calendarID, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*GoogleCalendarEvent), args.Error(1)
}

// MockCalendarSyncRepository implements a mock for CalendarSyncRepository
type MockCalendarSyncRepository struct {
	mock.Mock
}

func (m *MockCalendarSyncRepository) AddToSyncQueue(operationType string, taskID int, priority int, payload map[string]interface{}) error {
	args := m.Called(operationType, taskID, priority, payload)
	return args.Error(0)
}

func (m *MockCalendarSyncRepository) GetPendingSyncItems(limit int) ([]*database.SyncQueueItem, error) {
	args := m.Called(limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*database.SyncQueueItem), args.Error(1)
}

func (m *MockCalendarSyncRepository) UpdateSyncItemStatus(itemID int, status string, errorMessage *string) error {
	args := m.Called(itemID, status, errorMessage)
	return args.Error(0)
}

func (m *MockCalendarSyncRepository) GetTaskSyncInfo(taskID int) (*database.TaskSyncInfo, error) {
	args := m.Called(taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*database.TaskSyncInfo), args.Error(1)
}

func (m *MockCalendarSyncRepository) UpdateTaskSyncStatus(taskID int, status string) error {
	args := m.Called(taskID, status)
	return args.Error(0)
}

func (m *MockCalendarSyncRepository) UpdateTaskAfterSync(taskID int, eventID string, status string) error {
	args := m.Called(taskID, eventID, status)
	return args.Error(0)
}

func (m *MockCalendarSyncRepository) LogSyncOperation(taskID int, direction, operation, status, eventID, errorMsg string, syncData map[string]interface{}) error {
	args := m.Called(taskID, direction, operation, status, eventID, errorMsg, syncData)
	return args.Error(0)
}

func (m *MockCalendarSyncRepository) FindTaskByGoogleEventID(eventID string) (int, error) {
	args := m.Called(eventID)
	return args.Int(0), args.Error(1)
}

func (m *MockCalendarSyncRepository) UpdateTaskFromCalendarSync(taskID int, updateFields map[string]interface{}) error {
	args := m.Called(taskID, updateFields)
	return args.Error(0)
}

func (m *MockCalendarSyncRepository) UpdateTaskSyncSettings(taskID int, syncEnabled bool, direction string, reminderMins int) error {
	args := m.Called(taskID, syncEnabled, direction, reminderMins)
	return args.Error(0)
}

// MockGoogleAuthRepository implements a mock for GoogleAuthRepository
type MockGoogleAuthRepository struct {
	mock.Mock
}

func (m *MockGoogleAuthRepository) GetGoogleToken(ctx context.Context, userID int) (*models.GoogleToken, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GoogleToken), args.Error(1)
}

func (m *MockGoogleAuthRepository) SaveGoogleToken(ctx context.Context, token *models.GoogleToken) error {
	args := m.Called(ctx, token)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) UpdateGoogleToken(ctx context.Context, token *models.GoogleToken) error {
	args := m.Called(ctx, token)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) DeleteGoogleToken(ctx context.Context, userID int) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) CreateOAuthState(ctx context.Context, userID int) (*models.OAuthState, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.OAuthState), args.Error(1)
}

func (m *MockGoogleAuthRepository) GetOAuthState(ctx context.Context, state string) (*models.OAuthState, error) {
	args := m.Called(ctx, state)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.OAuthState), args.Error(1)
}

func (m *MockGoogleAuthRepository) DeleteOAuthState(ctx context.Context, state string) error {
	args := m.Called(ctx, state)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) CleanupExpiredOAuthStates(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

func (m *MockGoogleAuthRepository) SaveCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error {
	args := m.Called(ctx, sync)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) GetUserCalendarSyncs(ctx context.Context, userID int) ([]*models.GoogleCalendarSync, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.GoogleCalendarSync), args.Error(1)
}

func (m *MockGoogleAuthRepository) UpdateCalendarSync(ctx context.Context, sync *models.GoogleCalendarSync) error {
	args := m.Called(ctx, sync)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) DeleteCalendarSync(ctx context.Context, userID int, calendarID string) error {
	args := m.Called(ctx, userID, calendarID)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) CreateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error {
	args := m.Called(ctx, mapping)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) GetEventMapping(ctx context.Context, taskID int) (*models.GoogleEventMapping, error) {
	args := m.Called(ctx, taskID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GoogleEventMapping), args.Error(1)
}

func (m *MockGoogleAuthRepository) GetEventMappingByGoogleEventID(ctx context.Context, googleEventID string) (*models.GoogleEventMapping, error) {
	args := m.Called(ctx, googleEventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GoogleEventMapping), args.Error(1)
}

func (m *MockGoogleAuthRepository) UpdateEventMapping(ctx context.Context, mapping *models.GoogleEventMapping) error {
	args := m.Called(ctx, mapping)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) DeleteEventMapping(ctx context.Context, taskID int) error {
	args := m.Called(ctx, taskID)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) GetUserEventMappings(ctx context.Context, userID int) ([]*models.GoogleEventMapping, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.GoogleEventMapping), args.Error(1)
}

func (m *MockGoogleAuthRepository) CreateSyncLog(ctx context.Context, log *models.GoogleSyncLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) GetUserSyncLogs(ctx context.Context, userID int, limit int) ([]*models.GoogleSyncLog, error) {
	args := m.Called(ctx, userID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.GoogleSyncLog), args.Error(1)
}

func (m *MockGoogleAuthRepository) UpdateUserGooglePreferences(ctx context.Context, userID int, preferences models.GoogleSyncPreferences) error {
	args := m.Called(ctx, userID, preferences)
	return args.Error(0)
}

func (m *MockGoogleAuthRepository) GetUserGooglePreferences(ctx context.Context, userID int) (*models.GoogleSyncPreferences, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GoogleSyncPreferences), args.Error(1)
}

func (m *MockGoogleAuthRepository) SetUserGoogleCalendarEnabled(ctx context.Context, userID int, enabled bool) error {
	args := m.Called(ctx, userID, enabled)
	return args.Error(0)
}

// Test suite setup
func setupCalendarSyncService() (*CalendarSyncService, *MockGoogleCalendarService, *MockCalendarSyncRepository, *MockGoogleAuthRepository) {
	mockGoogleService := &MockGoogleCalendarService{}
	mockSyncRepo := &MockCalendarSyncRepository{}
	mockAuthRepo := &MockGoogleAuthRepository{}
	
	service := NewCalendarSyncService(mockGoogleService, mockSyncRepo, mockAuthRepo)
	return service, mockGoogleService, mockSyncRepo, mockAuthRepo
}

// Test SyncTaskToCalendar
func TestCalendarSyncService_SyncTaskToCalendar(t *testing.T) {
	service, _, mockSyncRepo, _ := setupCalendarSyncService()
	ctx := context.Background()

	t.Run("成功添加到同步队列", func(t *testing.T) {
		taskID := 123
		userID := 1

		mockSyncRepo.On("AddToSyncQueue", "sync_task_to_calendar", taskID, 1, mock.AnythingOfType("map[string]interface {}")).Return(nil)

		err := service.SyncTaskToCalendar(ctx, taskID, userID)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("添加到同步队列失败", func(t *testing.T) {
		taskID := 123
		userID := 1

		mockSyncRepo.On("AddToSyncQueue", "sync_task_to_calendar", taskID, 1, mock.AnythingOfType("map[string]interface {}")).Return(errors.New("database error"))

		err := service.SyncTaskToCalendar(ctx, taskID, userID)
		
		assert.Error(t, err)
		mockSyncRepo.AssertExpectations(t)
	})
}

// Test SyncCalendarToTask
func TestCalendarSyncService_SyncCalendarToTask(t *testing.T) {
	service, _, mockSyncRepo, _ := setupCalendarSyncService()
	ctx := context.Background()

	t.Run("成功添加到同步队列", func(t *testing.T) {
		eventID := "google-event-123"
		userID := 1
		expectedTaskID := 456

		mockSyncRepo.On("FindTaskByGoogleEventID", eventID).Return(expectedTaskID, nil)
		mockSyncRepo.On("AddToSyncQueue", "sync_calendar_to_task", expectedTaskID, 1, mock.AnythingOfType("map[string]interface {}")).Return(nil)

		err := service.SyncCalendarToTask(ctx, eventID, userID)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("找不到对应任务", func(t *testing.T) {
		eventID := "google-event-123"
		userID := 1

		mockSyncRepo.On("FindTaskByGoogleEventID", eventID).Return(0, errors.New("task not found"))

		err := service.SyncCalendarToTask(ctx, eventID, userID)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "找不到对应任务")
		mockSyncRepo.AssertExpectations(t)
	})
}

// Test ProcessSyncQueue
func TestCalendarSyncService_ProcessSyncQueue(t *testing.T) {
	service, _, mockSyncRepo, _ := setupCalendarSyncService()
	ctx := context.Background()

	t.Run("成功处理空队列", func(t *testing.T) {
		mockSyncRepo.On("GetPendingSyncItems", 10).Return([]*database.SyncQueueItem{}, nil)

		err := service.ProcessSyncQueue(ctx)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("获取待处理项失败", func(t *testing.T) {
		mockSyncRepo.On("GetPendingSyncItems", 10).Return(nil, errors.New("database error"))

		err := service.ProcessSyncQueue(ctx)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "获取待处理同步项失败")
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("处理同步项目", func(t *testing.T) {
		now := time.Now()
		mockItem := &database.SyncQueueItem{
			ID:            1,
			TaskID:        123,
			OperationType: "sync_task_to_calendar",
			Priority:      1,
			Payload: map[string]interface{}{
				"task_id": float64(123),
				"user_id": float64(1),
			},
			Status:      "pending",
			CreatedAt:   now,
			ScheduledAt: now,
		}

		mockSyncRepo.On("GetPendingSyncItems", 10).Return([]*database.SyncQueueItem{mockItem}, nil)
		mockSyncRepo.On("UpdateSyncItemStatus", 1, "processing", (*string)(nil)).Return(nil)
		// 模拟处理失败的情况
		mockSyncRepo.On("GetTaskSyncInfo", 123).Return(nil, errors.New("task not found"))
		mockSyncRepo.On("UpdateSyncItemStatus", 1, "failed", mock.AnythingOfType("*string")).Return(nil)

		err := service.ProcessSyncQueue(ctx)
		
		assert.NoError(t, err) // ProcessSyncQueue 不应该因为单个项目失败而返回错误
		mockSyncRepo.AssertExpectations(t)
	})
}

// Test executeTaskToCalendarSync
func TestCalendarSyncService_executeTaskToCalendarSync(t *testing.T) {
	service, mockGoogleService, mockSyncRepo, mockAuthRepo := setupCalendarSyncService()
	ctx := context.Background()

	t.Run("成功同步新任务到日历", func(t *testing.T) {
		now := time.Now()
		dueDate := now.Add(24 * time.Hour)
		
		mockItem := &SyncQueueItem{
			ID:            1,
			TaskID:        123,
			OperationType: "sync_task_to_calendar",
			Payload: map[string]interface{}{
				"task_id": float64(123),
				"user_id": float64(1),
			},
		}

		mockTaskInfo := &database.TaskSyncInfo{
			ID:                    123,
			Title:                 "Test Task",
			Description:           sql.NullString{String: "Task description", Valid: true},
			DueDate:              sql.NullTime{Time: dueDate, Valid: true},
			Status:                "todo",
			Priority:              sql.NullString{String: "high", Valid: true},
			SyncToCalendar:        true,
			CalendarSyncStatus:    "pending",
			SyncDirection:         "bidirectional",
			CalendarReminderMins:  15,
			GoogleCalendarEventID: sql.NullString{String: "", Valid: false},
			ProjectID:             1,
			UserID:                1,
		}

		mockToken := &models.GoogleToken{
			ID:                    1,
			UserID:                1,
			AccessToken:           "access-token-123",
			RefreshToken:          "refresh-token-123",
			TokenType:             "Bearer",
			ExpiresAt:             now.Add(time.Hour),
			Scopes:                []string{"https://www.googleapis.com/auth/calendar"},
			CreatedAt:             now,
			UpdatedAt:             now,
		}

		mockEvent := &GoogleCalendarEvent{
			ID:          "google-event-123",
			Summary:     "Test Task",
			Description: "Task description",
			StartTime:   dueDate,
			EndTime:     dueDate.Add(time.Hour),
			Status:      "confirmed",
		}

		mockSyncRepo.On("GetTaskSyncInfo", 123).Return(mockTaskInfo, nil)
		mockSyncRepo.On("UpdateTaskSyncStatus", 123, "syncing").Return(nil)
		mockAuthRepo.On("GetGoogleToken", ctx, 1).Return(mockToken, nil)
		mockGoogleService.On("CreateEvent", ctx, "access-token-123", "primary", mock.AnythingOfType("*services.GoogleCalendarEvent")).Return(mockEvent, nil)
		mockSyncRepo.On("UpdateTaskAfterSync", 123, "google-event-123", "synced").Return(nil)
		mockSyncRepo.On("LogSyncOperation", 123, "task_to_calendar", "update", "success", "google-event-123", "", mock.AnythingOfType("map[string]interface {}")).Return(nil)

		err := service.executeTaskToCalendarSync(ctx, mockItem)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
		mockAuthRepo.AssertExpectations(t)
		mockGoogleService.AssertExpectations(t)
	})

	t.Run("任务不需要同步", func(t *testing.T) {
		mockItem := &SyncQueueItem{
			ID:            1,
			TaskID:        123,
			OperationType: "sync_task_to_calendar",
			Payload: map[string]interface{}{
				"task_id": float64(123),
				"user_id": float64(1),
			},
		}

		mockTaskInfo := &database.TaskSyncInfo{
			ID:             123,
			SyncToCalendar: false, // 不需要同步
		}

		mockSyncRepo.On("GetTaskSyncInfo", 123).Return(mockTaskInfo, nil)

		err := service.executeTaskToCalendarSync(ctx, mockItem)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("获取任务信息失败", func(t *testing.T) {
		mockItem := &SyncQueueItem{
			ID:            1,
			TaskID:        123,
			OperationType: "sync_task_to_calendar",
			Payload: map[string]interface{}{
				"task_id": float64(123),
				"user_id": float64(1),
			},
		}

		mockSyncRepo.On("GetTaskSyncInfo", 123).Return(nil, errors.New("task not found"))

		err := service.executeTaskToCalendarSync(ctx, mockItem)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "获取任务数据失败")
		mockSyncRepo.AssertExpectations(t)
	})
}

// Test updateTaskFromCalendarEvent
func TestCalendarSyncService_updateTaskFromCalendarEvent(t *testing.T) {
	service, _, mockSyncRepo, _ := setupCalendarSyncService()

	t.Run("成功更新任务", func(t *testing.T) {
		taskID := 123
		now := time.Now()
		
		mockTaskData := &TaskSyncData{
			ID:          123,
			Title:       "Original Title",
			Description: "Original Description",
			Status:      "todo",
		}

		mockEvent := &GoogleCalendarEvent{
			ID:          "google-event-123",
			Summary:     "Updated Title",
			Description: "Updated Description",
			StartTime:   now.Add(24 * time.Hour),
			Status:      "confirmed",
		}

		expectedUpdateFields := map[string]interface{}{
			"title":               "Updated Title",
			"description":         "Updated Description",
			"due_date":           now.Add(24 * time.Hour),
			"status":             "in_progress",
			"last_calendar_sync": mock.AnythingOfType("time.Time"),
		}

		mockSyncRepo.On("GetTaskSyncInfo", 123).Return(&database.TaskSyncInfo{
			ID:          123,
			Title:       "Original Title",
			Description: sql.NullString{String: "Original Description", Valid: true},
			Status:      "todo",
		}, nil)
		mockSyncRepo.On("UpdateTaskFromCalendarSync", taskID, mock.MatchedBy(func(fields map[string]interface{}) bool {
			// 验证更新字段包含预期的键
			for key := range expectedUpdateFields {
				if key == "last_calendar_sync" {
					continue // 时间字段特殊处理
				}
				if fields[key] != expectedUpdateFields[key] {
					return false
				}
			}
			return fields["last_calendar_sync"] != nil
		})).Return(nil)

		err := service.updateTaskFromCalendarEvent(taskID, mockEvent)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("任务无需更新", func(t *testing.T) {
		taskID := 123
		now := time.Now()
		
		mockTaskData := &TaskSyncData{
			ID:          123,
			Title:       "Same Title",
			Description: "Same Description",
			DueDate:     &now,
			Status:      "in_progress",
		}

		mockEvent := &GoogleCalendarEvent{
			ID:          "google-event-123",
			Summary:     "Same Title",
			Description: "Same Description",
			StartTime:   now,
			Status:      "confirmed",
		}

		mockSyncRepo.On("GetTaskSyncInfo", 123).Return(&database.TaskSyncInfo{
			ID:          123,
			Title:       "Same Title",
			Description: sql.NullString{String: "Same Description", Valid: true},
			DueDate:     sql.NullTime{Time: now, Valid: true},
			Status:      "in_progress",
		}, nil)

		err := service.updateTaskFromCalendarEvent(taskID, mockEvent)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("获取任务数据失败", func(t *testing.T) {
		taskID := 123
		mockEvent := &GoogleCalendarEvent{
			ID:      "google-event-123",
			Summary: "Test Event",
		}

		mockSyncRepo.On("GetTaskSyncInfo", 123).Return(nil, errors.New("task not found"))

		err := service.updateTaskFromCalendarEvent(taskID, mockEvent)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "获取任务数据失败")
		mockSyncRepo.AssertExpectations(t)
	})
}

// Test EnableTaskCalendarSync
func TestCalendarSyncService_EnableTaskCalendarSync(t *testing.T) {
	service, _, mockSyncRepo, _ := setupCalendarSyncService()
	ctx := context.Background()

	t.Run("成功启用任务同步", func(t *testing.T) {
		taskID := 123
		userID := 1
		syncDirection := SyncDirectionBidirectional
		reminderMins := 15

		mockSyncRepo.On("UpdateTaskSyncSettings", taskID, true, "bidirectional", reminderMins).Return(nil)
		mockSyncRepo.On("AddToSyncQueue", "sync_task_to_calendar", taskID, 1, mock.AnythingOfType("map[string]interface {}")).Return(nil)

		err := service.EnableTaskCalendarSync(ctx, taskID, userID, syncDirection, reminderMins)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("更新同步设置失败", func(t *testing.T) {
		taskID := 123
		userID := 1
		syncDirection := SyncDirectionBidirectional
		reminderMins := 15

		mockSyncRepo.On("UpdateTaskSyncSettings", taskID, true, "bidirectional", reminderMins).Return(errors.New("database error"))

		err := service.EnableTaskCalendarSync(ctx, taskID, userID, syncDirection, reminderMins)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "更新任务同步设置失败")
		mockSyncRepo.AssertExpectations(t)
	})
}

// Test DisableTaskCalendarSync
func TestCalendarSyncService_DisableTaskCalendarSync(t *testing.T) {
	service, _, mockSyncRepo, _ := setupCalendarSyncService()
	ctx := context.Background()

	t.Run("成功禁用任务同步", func(t *testing.T) {
		taskID := 123

		mockSyncRepo.On("GetTaskSyncInfo", taskID).Return(&database.TaskSyncInfo{
			ID:                    123,
			GoogleCalendarEventID: sql.NullString{String: "", Valid: false},
		}, nil)
		mockSyncRepo.On("UpdateTaskSyncSettings", taskID, false, "bidirectional", 0).Return(nil)

		err := service.DisableTaskCalendarSync(ctx, taskID, false)
		
		assert.NoError(t, err)
		mockSyncRepo.AssertExpectations(t)
	})

	t.Run("获取任务数据失败", func(t *testing.T) {
		taskID := 123

		mockSyncRepo.On("GetTaskSyncInfo", taskID).Return(nil, errors.New("task not found"))

		err := service.DisableTaskCalendarSync(ctx, taskID, false)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "获取任务数据失败")
		mockSyncRepo.AssertExpectations(t)
	})
}

// Test getUserAccessToken
func TestCalendarSyncService_getUserAccessToken(t *testing.T) {
	service, _, _, mockAuthRepo := setupCalendarSyncService()
	ctx := context.Background()

	t.Run("成功获取访问令牌", func(t *testing.T) {
		userID := 1
		expectedToken := "access-token-123"

		mockToken := &models.GoogleToken{
			AccessToken: expectedToken,
		}

		mockAuthRepo.On("GetGoogleToken", ctx, userID).Return(mockToken, nil)

		token, err := service.getUserAccessToken(ctx, userID)
		
		assert.NoError(t, err)
		assert.Equal(t, expectedToken, token)
		mockAuthRepo.AssertExpectations(t)
	})

	t.Run("获取令牌失败", func(t *testing.T) {
		userID := 1

		mockAuthRepo.On("GetGoogleToken", ctx, userID).Return(nil, errors.New("token not found"))

		token, err := service.getUserAccessToken(ctx, userID)
		
		assert.Error(t, err)
		assert.Empty(t, token)
		assert.Contains(t, err.Error(), "failed to get google token")
		mockAuthRepo.AssertExpectations(t)
	})
}

// Benchmark tests
func BenchmarkCalendarSyncService_SyncTaskToCalendar(b *testing.B) {
	service, _, mockSyncRepo, _ := setupCalendarSyncService()
	ctx := context.Background()

	mockSyncRepo.On("AddToSyncQueue", mock.AnythingOfType("string"), mock.AnythingOfType("int"), mock.AnythingOfType("int"), mock.AnythingOfType("map[string]interface {}")).Return(nil)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = service.SyncTaskToCalendar(ctx, i+1, 1)
	}
}

// Integration test helper
func TestCalendarSyncService_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("跳过集成测试")
	}

	t.Run("完整同步流程", func(t *testing.T) {
		service, mockGoogleService, mockSyncRepo, mockAuthRepo := setupCalendarSyncService()
		ctx := context.Background()

		// 模拟完整的同步流程
		taskID := 123
		userID := 1
		eventID := "google-event-123"

		// 1. 启动任务到日历同步
		mockSyncRepo.On("AddToSyncQueue", "sync_task_to_calendar", taskID, 1, mock.AnythingOfType("map[string]interface {}")).Return(nil)
		err1 := service.SyncTaskToCalendar(ctx, taskID, userID)
		assert.NoError(t, err1)

		// 2. 处理同步队列
		now := time.Now()
		mockItem := &database.SyncQueueItem{
			ID:            1,
			TaskID:        taskID,
			OperationType: "sync_task_to_calendar",
			Payload: map[string]interface{}{
				"task_id": float64(taskID),
				"user_id": float64(userID),
			},
			Status:      "pending",
			CreatedAt:   now,
			ScheduledAt: now,
		}

		mockTaskInfo := &database.TaskSyncInfo{
			ID:                    taskID,
			Title:                 "Integration Test Task",
			SyncToCalendar:        true,
			CalendarSyncStatus:    "pending",
			GoogleCalendarEventID: sql.NullString{String: "", Valid: false},
		}

		mockToken := &models.GoogleToken{
			AccessToken: "test-access-token",
		}

		mockEvent := &GoogleCalendarEvent{
			ID:      eventID,
			Summary: "Integration Test Task",
		}

		mockSyncRepo.On("GetPendingSyncItems", 10).Return([]*database.SyncQueueItem{mockItem}, nil)
		mockSyncRepo.On("UpdateSyncItemStatus", 1, "processing", (*string)(nil)).Return(nil)
		mockSyncRepo.On("GetTaskSyncInfo", taskID).Return(mockTaskInfo, nil)
		mockSyncRepo.On("UpdateTaskSyncStatus", taskID, "syncing").Return(nil)
		mockAuthRepo.On("GetGoogleToken", ctx, userID).Return(mockToken, nil)
		mockGoogleService.On("CreateEvent", ctx, "test-access-token", "primary", mock.AnythingOfType("*services.GoogleCalendarEvent")).Return(mockEvent, nil)
		mockSyncRepo.On("UpdateTaskAfterSync", taskID, eventID, "synced").Return(nil)
		mockSyncRepo.On("LogSyncOperation", taskID, "task_to_calendar", "update", "success", eventID, "", mock.AnythingOfType("map[string]interface {}")).Return(nil)
		mockSyncRepo.On("UpdateSyncItemStatus", 1, "completed", (*string)(nil)).Return(nil)

		err2 := service.ProcessSyncQueue(ctx)
		assert.NoError(t, err2)

		// 验证所有 mock 调用
		mockSyncRepo.AssertExpectations(t)
		mockAuthRepo.AssertExpectations(t)
		mockGoogleService.AssertExpectations(t)
	})
}