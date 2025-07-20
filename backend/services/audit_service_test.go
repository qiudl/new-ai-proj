package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"testing"
	"time"
)

// MockAuditRepository implements AuditRepository for testing
type MockAuditRepository struct {
	logs    []*models.AuditLog
	configs []*models.AuditConfig
}

func NewMockAuditRepository() *MockAuditRepository {
	return &MockAuditRepository{
		logs:    make([]*models.AuditLog, 0),
		configs: models.DefaultAuditConfigs(),
	}
}

func (m *MockAuditRepository) CreateAuditLog(ctx context.Context, log *models.AuditLog) error {
	log.ID = int64(len(m.logs) + 1)
	m.logs = append(m.logs, log)
	return nil
}

func (m *MockAuditRepository) GetAuditLogs(ctx context.Context, filter *models.AuditLogFilter) ([]*models.AuditLog, int64, error) {
	// Simple implementation - return all logs for testing
	return m.logs, int64(len(m.logs)), nil
}

func (m *MockAuditRepository) GetAuditLogByID(ctx context.Context, id int64) (*models.AuditLog, error) {
	for _, log := range m.logs {
		if log.ID == id {
			return log, nil
		}
	}
	return nil, nil
}

func (m *MockAuditRepository) GetAuditLogByEventID(ctx context.Context, eventID string) (*models.AuditLog, error) {
	for _, log := range m.logs {
		if log.EventID == eventID {
			return log, nil
		}
	}
	return nil, nil
}

func (m *MockAuditRepository) GetAuditConfig(ctx context.Context, resourceType, action string) (*models.AuditConfig, error) {
	for _, config := range m.configs {
		if config.ResourceType == resourceType && config.Action == action {
			return config, nil
		}
	}
	return nil, nil
}

func (m *MockAuditRepository) GetAllAuditConfigs(ctx context.Context) ([]*models.AuditConfig, error) {
	return m.configs, nil
}

func (m *MockAuditRepository) CreateAuditConfig(ctx context.Context, config *models.AuditConfig) error {
	config.ID = len(m.configs) + 1
	config.CreatedAt = time.Now()
	config.UpdatedAt = time.Now()
	m.configs = append(m.configs, config)
	return nil
}

func (m *MockAuditRepository) UpdateAuditConfig(ctx context.Context, config *models.AuditConfig) error {
	for i, c := range m.configs {
		if c.ID == config.ID {
			config.UpdatedAt = time.Now()
			m.configs[i] = config
			return nil
		}
	}
	return nil
}

func (m *MockAuditRepository) DeleteAuditConfig(ctx context.Context, id int) error {
	for i, config := range m.configs {
		if config.ID == id {
			m.configs = append(m.configs[:i], m.configs[i+1:]...)
			return nil
		}
	}
	return nil
}

func (m *MockAuditRepository) GetAuditStats(ctx context.Context, req *models.AuditStatsRequest) ([]*models.AuditStats, error) {
	// Simple implementation for testing
	stats := []*models.AuditStats{
		{Label: "task.create", Count: 10},
		{Label: "task.update", Count: 5},
	}
	return stats, nil
}

func (m *MockAuditRepository) CleanupExpiredAuditLogs(ctx context.Context) (int64, error) {
	return 0, nil
}

// MockDB implements DB interface for testing
type MockDB struct {
	auditRepo *MockAuditRepository
}

func NewMockDB() *MockDB {
	return &MockDB{
		auditRepo: NewMockAuditRepository(),
	}
}

func (m *MockDB) Audit() database.AuditRepository {
	return m.auditRepo
}

// Implement other DB interface methods (not needed for audit testing)
func (m *MockDB) Users() database.UserRepository     { return nil }
func (m *MockDB) Projects() database.ProjectRepository { return nil }
func (m *MockDB) Tasks() database.TaskRepository     { return nil }
func (m *MockDB) Customers() database.CustomerRepository { return nil }
func (m *MockDB) System() database.SystemRepository  { return nil }
func (m *MockDB) GetDB() interface{}                  { return nil }
func (m *MockDB) Close() error                        { return nil }
func (m *MockDB) Ping() error                         { return nil }
func (m *MockDB) BeginTx(ctx context.Context) (database.Tx, error) { return nil, nil }

// TestAuditService tests the audit service functionality
func TestAuditService(t *testing.T) {
	// Create mock database
	mockDB := NewMockDB()
	
	// Create audit service
	auditService := NewAuditService(mockDB)
	
	ctx := context.Background()
	
	// Test logging a simple event
	userID := 1
	err := auditService.LogSimpleEvent(ctx, &userID, "testuser", "test@example.com", 
		models.ActionTaskCreate, models.ResourceTypeTask, "123", "Test Task", "192.168.1.1")
	
	if err != nil {
		t.Fatalf("Failed to log simple event: %v", err)
	}
	
	// Test retrieving audit logs
	filter := &models.AuditLogFilter{
		Limit: 10,
	}
	
	logs, total, err := auditService.GetAuditLogs(ctx, filter)
	if err != nil {
		t.Fatalf("Failed to get audit logs: %v", err)
	}
	
	if total != 1 {
		t.Fatalf("Expected 1 audit log, got %d", total)
	}
	
	if len(logs) != 1 {
		t.Fatalf("Expected 1 audit log in results, got %d", len(logs))
	}
	
	log := logs[0]
	if log.Action != models.ActionTaskCreate {
		t.Errorf("Expected action %s, got %s", models.ActionTaskCreate, log.Action)
	}
	
	if log.ResourceType != models.ResourceTypeTask {
		t.Errorf("Expected resource type %s, got %s", models.ResourceTypeTask, log.ResourceType)
	}
	
	if log.UserName != "testuser" {
		t.Errorf("Expected user name 'testuser', got %s", log.UserName)
	}
	
	// Test task event logging
	task1 := &models.Task{ID: 123, Title: "Test Task", Status: "todo", ProjectID: 1}
	task2 := &models.Task{ID: 123, Title: "Updated Test Task", Status: "in_progress", ProjectID: 1}
	
	err = auditService.LogTaskEvent(ctx, &userID, "testuser", "test@example.com", 
		models.ActionTaskUpdate, task1, task2, "192.168.1.1")
	
	if err != nil {
		t.Fatalf("Failed to log task event: %v", err)
	}
	
	// Verify the task event was logged
	logs, total, err = auditService.GetAuditLogs(ctx, filter)
	if err != nil {
		t.Fatalf("Failed to get audit logs: %v", err)
	}
	
	if total != 2 {
		t.Fatalf("Expected 2 audit logs, got %d", total)
	}
	
	// Test error event logging
	err = auditService.LogErrorEvent(ctx, &userID, "testuser", "test@example.com",
		models.ActionTaskDelete, models.ResourceTypeTask, "123", "Permission denied", "192.168.1.1")
	
	if err != nil {
		t.Fatalf("Failed to log error event: %v", err)
	}
	
	// Test audit stats
	statsReq := &models.AuditStatsRequest{
		StartTime: time.Now().Add(-24 * time.Hour),
		EndTime:   time.Now(),
		GroupBy:   "action",
	}
	
	stats, err := auditService.GetAuditStats(ctx, statsReq)
	if err != nil {
		t.Fatalf("Failed to get audit stats: %v", err)
	}
	
	if len(stats) == 0 {
		t.Errorf("Expected some audit stats, got empty result")
	}
	
	t.Logf("Test completed successfully. Created %d audit logs", total+1)
}

// TestAsyncAuditLogger tests the async audit logger
func TestAsyncAuditLogger(t *testing.T) {
	mockDB := NewMockDB()
	auditService := NewAuditService(mockDB)
	
	// Create async logger with small batch size and timeout for testing
	asyncLogger := NewAsyncAuditLogger(auditService, 2, 100*time.Millisecond)
	defer asyncLogger.Stop()
	
	// Log some events
	for i := 0; i < 5; i++ {
		data := &models.AuditEventData{
			UserName:     "testuser",
			UserEmail:    "test@example.com",
			Action:       models.ActionTaskCreate,
			ResourceType: models.ResourceTypeTask,
			ResourceID:   fmt.Sprintf("%d", i),
			ResourceName: fmt.Sprintf("Task %d", i),
			Status:       models.StatusSuccess,
		}
		asyncLogger.LogEvent(data)
	}
	
	// Wait for async processing
	time.Sleep(500 * time.Millisecond)
	
	// Check that events were logged
	filter := &models.AuditLogFilter{Limit: 10}
	logs, total, err := auditService.GetAuditLogs(context.Background(), filter)
	if err != nil {
		t.Fatalf("Failed to get audit logs: %v", err)
	}
	
	if total < 5 {
		t.Errorf("Expected at least 5 audit logs, got %d", total)
	}
	
	// Use logs to verify content
	if len(logs) > 0 {
		t.Logf("First logged event: %s", logs[0].Action)
	}
	
	t.Logf("Async test completed. Processed %d audit logs", total)
}

// TestDataSanitization tests the data sanitization functionality
func TestDataSanitization(t *testing.T) {
	mockDB := NewMockDB()
	auditService := NewAuditService(mockDB)
	
	// Test data with sensitive fields
	testData := map[string]interface{}{
		"username": "testuser",
		"password": "secret123",
		"email":    "test@example.com",
		"token":    "abc123token",
	}
	
	sensitiveFields := models.StringArray{"password", "token"}
	
	sanitized := auditService.sanitizeData(testData, sensitiveFields)
	
	sanitizedMap, ok := sanitized.(map[string]interface{})
	if !ok {
		t.Fatalf("Expected sanitized data to be a map")
	}
	
	if sanitizedMap["password"] != "[REDACTED]" {
		t.Errorf("Expected password to be redacted, got %v", sanitizedMap["password"])
	}
	
	if sanitizedMap["token"] != "[REDACTED]" {
		t.Errorf("Expected token to be redacted, got %v", sanitizedMap["token"])
	}
	
	if sanitizedMap["username"] != "testuser" {
		t.Errorf("Expected username to remain unchanged, got %v", sanitizedMap["username"])
	}
	
	t.Log("Data sanitization test completed successfully")
}
