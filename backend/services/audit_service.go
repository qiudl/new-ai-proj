package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"time"

	"github.com/google/uuid"
)

// AuditService provides audit logging functionality
type AuditService struct {
	auditRepo database.AuditRepository
	db        database.DB
}

// NewAuditService creates a new audit service
func NewAuditService(db database.DB) *AuditService {
	return &AuditService{
		auditRepo: db.Audit(),
		db:        db,
	}
}

// LogEvent logs an audit event
func (s *AuditService) LogEvent(ctx context.Context, data *models.AuditEventData) error {
	// Check if audit is enabled for this action
	config, err := s.getAuditConfig(ctx, data.ResourceType, data.Action)
	if err != nil {
		// If config not found, create default and continue
		config = s.createDefaultConfig(data.ResourceType, data.Action)
	}

	if !config.Enabled {
		return nil // Audit not enabled, skip silently
	}

	// Generate event ID if not provided
	eventID := uuid.New().String()

	// Process sensitive data
	beforeData := s.sanitizeData(data.BeforeData, config.SensitiveFields)
	afterData := s.sanitizeData(data.AfterData, config.SensitiveFields)

	// Calculate changes if both before and after data exist
	var changes map[string]interface{}
	if config.LogChanges {
		changes = s.calculateChanges(beforeData, afterData)
	}

	// Build audit log entry
	auditLog := &models.AuditLog{
		EventID:       eventID,
		Timestamp:     time.Now(),
		UserID:        data.UserID,
		UserEmail:     data.UserEmail,
		UserName:      data.UserName,
		UserRole:      data.UserRole,
		Action:        data.Action,
		ResourceType:  data.ResourceType,
		ResourceID:    data.ResourceID,
		ResourceName:  data.ResourceName,
		IPAddress:     data.IPAddress,
		UserAgent:     data.UserAgent,
		SessionID:     data.SessionID,
		RequestID:     data.RequestID,
		Description:   data.Description,
		Status:        data.Status,
		ErrorMessage:  data.ErrorMessage,
		ProjectID:     data.ProjectID,
		ParentEventID: data.ParentEventID,
		CorrelationID: data.CorrelationID,
		Tags:          models.StringArray(data.Tags),
	}

	// Set data fields based on configuration
	if config.LogBeforeData && beforeData != nil {
		auditLog.BeforeData = s.convertToJSONB(beforeData)
	}

	if config.LogAfterData && afterData != nil {
		auditLog.AfterData = s.convertToJSONB(afterData)
	}

	if config.LogChanges && changes != nil {
		auditLog.Changes = s.convertToJSONB(changes)
	}

	if data.Metadata != nil {
		auditLog.Metadata = s.convertToJSONB(data.Metadata)
	}

	// Save to database
	return s.auditRepo.CreateAuditLog(ctx, auditLog)
}

// LogSimpleEvent logs a simple audit event with minimal data
func (s *AuditService) LogSimpleEvent(ctx context.Context, userID *int, userName, userEmail, action, resourceType, resourceID, resourceName, ipAddress string) error {
	data := &models.AuditEventData{
		UserID:       userID,
		UserName:     userName,
		UserEmail:    userEmail,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		IPAddress:    ipAddress,
		Status:       models.StatusSuccess,
	}

	return s.LogEvent(ctx, data)
}

// LogTaskEvent logs a task-related audit event
func (s *AuditService) LogTaskEvent(ctx context.Context, userID *int, userName, userEmail, action string, taskBefore, taskAfter *models.Task, ipAddress string) error {
	var resourceID, resourceName string
	var projectID *int

	if taskAfter != nil {
		resourceID = fmt.Sprintf("%d", taskAfter.ID)
		resourceName = taskAfter.Title
		projectID = &taskAfter.ProjectID
	} else if taskBefore != nil {
		resourceID = fmt.Sprintf("%d", taskBefore.ID)
		resourceName = taskBefore.Title
		projectID = &taskBefore.ProjectID
	}

	data := &models.AuditEventData{
		UserID:       userID,
		UserName:     userName,
		UserEmail:    userEmail,
		Action:       action,
		ResourceType: models.ResourceTypeTask,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		BeforeData:   taskBefore,
		AfterData:    taskAfter,
		ProjectID:    projectID,
		IPAddress:    ipAddress,
		Status:       models.StatusSuccess,
	}

	return s.LogEvent(ctx, data)
}

// LogProjectEvent logs a project-related audit event
func (s *AuditService) LogProjectEvent(ctx context.Context, userID *int, userName, userEmail, action string, projectBefore, projectAfter *models.Project, ipAddress string) error {
	var resourceID, resourceName string
	var projectID *int

	if projectAfter != nil {
		resourceID = fmt.Sprintf("%d", projectAfter.ID)
		resourceName = projectAfter.Name
		projectID = &projectAfter.ID
	} else if projectBefore != nil {
		resourceID = fmt.Sprintf("%d", projectBefore.ID)
		resourceName = projectBefore.Name
		projectID = &projectBefore.ID
	}

	data := &models.AuditEventData{
		UserID:       userID,
		UserName:     userName,
		UserEmail:    userEmail,
		Action:       action,
		ResourceType: models.ResourceTypeProject,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		BeforeData:   projectBefore,
		AfterData:    projectAfter,
		ProjectID:    projectID,
		IPAddress:    ipAddress,
		Status:       models.StatusSuccess,
	}

	return s.LogEvent(ctx, data)
}

// LogUserEvent logs a user-related audit event
func (s *AuditService) LogUserEvent(ctx context.Context, userID *int, userName, userEmail, action string, userBefore, userAfter *models.User, ipAddress string) error {
	var resourceID, resourceName string

	if userAfter != nil {
		resourceID = fmt.Sprintf("%d", userAfter.ID)
		resourceName = userAfter.Username
	} else if userBefore != nil {
		resourceID = fmt.Sprintf("%d", userBefore.ID)
		resourceName = userBefore.Username
	}

	data := &models.AuditEventData{
		UserID:       userID,
		UserName:     userName,
		UserEmail:    userEmail,
		Action:       action,
		ResourceType: models.ResourceTypeUser,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		BeforeData:   userBefore,
		AfterData:    userAfter,
		IPAddress:    ipAddress,
		Status:       models.StatusSuccess,
	}

	return s.LogEvent(ctx, data)
}

// LogErrorEvent logs an error event
func (s *AuditService) LogErrorEvent(ctx context.Context, userID *int, userName, userEmail, action, resourceType, resourceID, errorMessage, ipAddress string) error {
	data := &models.AuditEventData{
		UserID:       userID,
		UserName:     userName,
		UserEmail:    userEmail,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		IPAddress:    ipAddress,
		Status:       models.StatusFailed,
		ErrorMessage: errorMessage,
	}

	return s.LogEvent(ctx, data)
}

// GetAuditLogs retrieves audit logs with filtering
func (s *AuditService) GetAuditLogs(ctx context.Context, filter *models.AuditLogFilter) ([]*models.AuditLog, int64, error) {
	return s.auditRepo.GetAuditLogs(ctx, filter)
}

// GetAuditLogByID retrieves a specific audit log
func (s *AuditService) GetAuditLogByID(ctx context.Context, id int64) (*models.AuditLog, error) {
	return s.auditRepo.GetAuditLogByID(ctx, id)
}

// GetAuditStats retrieves audit statistics
func (s *AuditService) GetAuditStats(ctx context.Context, req *models.AuditStatsRequest) ([]*models.AuditStats, error) {
	return s.auditRepo.GetAuditStats(ctx, req)
}

// GetAuditConfigs retrieves all audit configurations
func (s *AuditService) GetAuditConfigs(ctx context.Context) ([]*models.AuditConfig, error) {
	return s.auditRepo.GetAllAuditConfigs(ctx)
}

// UpdateAuditConfig updates an audit configuration
func (s *AuditService) UpdateAuditConfig(ctx context.Context, config *models.AuditConfig) error {
	return s.auditRepo.UpdateAuditConfig(ctx, config)
}

// CleanupExpiredLogs removes expired audit logs
func (s *AuditService) CleanupExpiredLogs(ctx context.Context) (int64, error) {
	return s.auditRepo.CleanupExpiredAuditLogs(ctx)
}

// InitializeDefaultConfigs creates default audit configurations if they don't exist
func (s *AuditService) InitializeDefaultConfigs(ctx context.Context) error {
	// Check if any configs exist
	existing, err := s.auditRepo.GetAllAuditConfigs(ctx)
	if err != nil {
		return fmt.Errorf("failed to check existing configs: %w", err)
	}

	if len(existing) > 0 {
		return nil // Configs already exist
	}

	// Create default configurations
	defaultConfigs := models.DefaultAuditConfigs()
	for _, config := range defaultConfigs {
		if err := s.auditRepo.CreateAuditConfig(ctx, config); err != nil {
			return fmt.Errorf("failed to create default config for %s.%s: %w", config.ResourceType, config.Action, err)
		}
	}

	return nil
}

// Helper methods

func (s *AuditService) getAuditConfig(ctx context.Context, resourceType, action string) (*models.AuditConfig, error) {
	return s.auditRepo.GetAuditConfig(ctx, resourceType, action)
}

func (s *AuditService) createDefaultConfig(resourceType, action string) *models.AuditConfig {
	// Return a default configuration
	return &models.AuditConfig{
		ResourceType:    resourceType,
		Action:          action,
		Enabled:         true,
		LogBeforeData:   false,
		LogAfterData:    true,
		LogChanges:      true,
		RetentionDays:   365,
		SensitiveFields: models.StringArray{"password", "token", "secret", "key", "credential"},
	}
}

func (s *AuditService) sanitizeData(data interface{}, sensitiveFields models.StringArray) interface{} {
	if data == nil {
		return nil
	}

	// Convert to map for processing
	dataMap := make(map[string]interface{})
	jsonData, err := json.Marshal(data)
	if err != nil {
		return data // Return original if can't marshal
	}

	err = json.Unmarshal(jsonData, &dataMap)
	if err != nil {
		return data // Return original if can't unmarshal
	}

	// Sanitize sensitive fields
	for _, field := range sensitiveFields {
		fieldLower := strings.ToLower(field)
		for key := range dataMap {
			if strings.Contains(strings.ToLower(key), fieldLower) {
				dataMap[key] = "[REDACTED]"
			}
		}
	}

	return dataMap
}

func (s *AuditService) calculateChanges(before, after interface{}) map[string]interface{} {
	if before == nil || after == nil {
		return nil
	}

	changes := make(map[string]interface{})

	beforeMap := make(map[string]interface{})
	afterMap := make(map[string]interface{})

	// Convert both to maps
	beforeJSON, err := json.Marshal(before)
	if err != nil {
		return nil
	}
	afterJSON, err := json.Marshal(after)
	if err != nil {
		return nil
	}

	json.Unmarshal(beforeJSON, &beforeMap)
	json.Unmarshal(afterJSON, &afterMap)

	// Compare fields
	allKeys := make(map[string]bool)
	for key := range beforeMap {
		allKeys[key] = true
	}
	for key := range afterMap {
		allKeys[key] = true
	}

	for key := range allKeys {
		beforeValue := beforeMap[key]
		afterValue := afterMap[key]

		if !reflect.DeepEqual(beforeValue, afterValue) {
			changes[key] = map[string]interface{}{
				"from": beforeValue,
				"to":   afterValue,
			}
		}
	}

	if len(changes) == 0 {
		return nil
	}

	return changes
}

func (s *AuditService) convertToJSONB(data interface{}) models.JSONB {
	if data == nil {
		return nil
	}

	switch v := data.(type) {
	case models.JSONB:
		return v
	case map[string]interface{}:
		return models.JSONB(v)
	default:
		// Convert to map[string]interface{}
		result := make(map[string]interface{})
		jsonData, err := json.Marshal(data)
		if err != nil {
			return nil
		}
		err = json.Unmarshal(jsonData, &result)
		if err != nil {
			return nil
		}
		return models.JSONB(result)
	}
}

// AsyncAuditLogger provides asynchronous audit logging
type AsyncAuditLogger struct {
	service   *AuditService
	eventChan chan *models.AuditEventData
	stopChan  chan struct{}
	batchSize int
	timeout   time.Duration
}

// NewAsyncAuditLogger creates a new asynchronous audit logger
func NewAsyncAuditLogger(service *AuditService, batchSize int, timeout time.Duration) *AsyncAuditLogger {
	logger := &AsyncAuditLogger{
		service:   service,
		eventChan: make(chan *models.AuditEventData, 1000), // Buffer size
		stopChan:  make(chan struct{}),
		batchSize: batchSize,
		timeout:   timeout,
	}

	go logger.processEvents()
	return logger
}

// LogEvent adds an event to the async queue
func (a *AsyncAuditLogger) LogEvent(data *models.AuditEventData) {
	select {
	case a.eventChan <- data:
		// Event queued successfully
	default:
		// Channel is full, log synchronously as fallback
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		a.service.LogEvent(ctx, data)
	}
}

// Stop stops the async logger
func (a *AsyncAuditLogger) Stop() {
	close(a.stopChan)
}

func (a *AsyncAuditLogger) processEvents() {
	batch := make([]*models.AuditEventData, 0, a.batchSize)
	ticker := time.NewTicker(a.timeout)
	defer ticker.Stop()

	for {
		select {
		case event := <-a.eventChan:
			batch = append(batch, event)
			if len(batch) >= a.batchSize {
				a.processBatch(batch)
				batch = batch[:0] // Reset slice
			}

		case <-ticker.C:
			if len(batch) > 0 {
				a.processBatch(batch)
				batch = batch[:0] // Reset slice
			}

		case <-a.stopChan:
			// Process remaining events
			for len(a.eventChan) > 0 {
				event := <-a.eventChan
				batch = append(batch, event)
			}
			if len(batch) > 0 {
				a.processBatch(batch)
			}
			return
		}
	}
}

func (a *AsyncAuditLogger) processBatch(batch []*models.AuditEventData) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	for _, event := range batch {
		if err := a.service.LogEvent(ctx, event); err != nil {
			// Log error but continue processing
			fmt.Printf("Failed to log audit event: %v\n", err)
		}
	}
}

// AuditContext provides context information for audit logging
type AuditContext struct {
	UserID    *int
	UserName  string
	UserEmail string
	UserRole  string
	IPAddress string
	UserAgent string
	SessionID string
	RequestID string
}

// NewAuditContextFromMap creates audit context from a map (e.g., from gin.Context)
func NewAuditContextFromMap(data map[string]interface{}) *AuditContext {
	ctx := &AuditContext{}

	if userID, ok := data["user_id"].(int); ok {
		ctx.UserID = &userID
	}
	if userName, ok := data["user_name"].(string); ok {
		ctx.UserName = userName
	}
	if userEmail, ok := data["user_email"].(string); ok {
		ctx.UserEmail = userEmail
	}
	if userRole, ok := data["user_role"].(string); ok {
		ctx.UserRole = userRole
	}
	if ipAddress, ok := data["ip_address"].(string); ok {
		ctx.IPAddress = ipAddress
	}
	if userAgent, ok := data["user_agent"].(string); ok {
		ctx.UserAgent = userAgent
	}
	if sessionID, ok := data["session_id"].(string); ok {
		ctx.SessionID = sessionID
	}
	if requestID, ok := data["request_id"].(string); ok {
		ctx.RequestID = requestID
	}

	return ctx
}

// ToEventData converts audit context to event data
func (ac *AuditContext) ToEventData(action, resourceType, resourceID, resourceName string) *models.AuditEventData {
	return &models.AuditEventData{
		UserID:       ac.UserID,
		UserName:     ac.UserName,
		UserEmail:    ac.UserEmail,
		UserRole:     ac.UserRole,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		IPAddress:    ac.IPAddress,
		UserAgent:    ac.UserAgent,
		SessionID:    ac.SessionID,
		RequestID:    ac.RequestID,
		Status:       models.StatusSuccess,
	}
}
