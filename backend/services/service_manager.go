package services

import (
	"ai-project-backend/database"
	"context"
	"time"
)

// ServiceManager manages all application services
type ServiceManager struct {
	db                  database.DB
	auditService        *AuditService
	asyncLogger         *AsyncAuditLogger
	taskProgressService *TaskProgressService
}

// NewServiceManager creates a new service manager
func NewServiceManager(db database.DB) *ServiceManager {
	auditService := NewAuditService(db)

	// Create async logger with default settings
	asyncLogger := NewAsyncAuditLogger(auditService, 50, 5*time.Second)

	// Initialize task progress service
	taskProgress := NewTaskProgressService(db)

	return &ServiceManager{
		db:                  db,
		auditService:        auditService,
		asyncLogger:         asyncLogger,
		taskProgressService: taskProgress,
	}
}

// AuditService returns the audit service
func (sm *ServiceManager) AuditService() *AuditService {
	return sm.auditService
}

// AsyncLogger returns the async audit logger
func (sm *ServiceManager) AsyncLogger() *AsyncAuditLogger {
	return sm.asyncLogger
}

// TaskProgressService returns the task progress service
func (sm *ServiceManager) TaskProgressService() *TaskProgressService {
	return sm.taskProgressService
}

// InitializeServices initializes all services with default configurations
func (sm *ServiceManager) InitializeServices(ctx context.Context) error {
	// Initialize default audit configurations
	if err := sm.auditService.InitializeDefaultConfigs(ctx); err != nil {
		return err
	}

	return nil
}

// Shutdown gracefully shuts down all services
func (sm *ServiceManager) Shutdown() {
	if sm.asyncLogger != nil {
		sm.asyncLogger.Stop()
	}
}

// PerformMaintenance performs routine maintenance tasks
func (sm *ServiceManager) PerformMaintenance(ctx context.Context) error {
	// Cleanup expired audit logs
	deleted, err := sm.auditService.CleanupExpiredLogs(ctx)
	if err != nil {
		return err
	}

	// Log maintenance activity
	if deleted > 0 {
		sm.auditService.LogSimpleEvent(ctx, nil, "system", "",
			"system.maintenance", "system", "audit_cleanup",
			"Cleaned up expired audit logs", "")
	}

	return nil
}
