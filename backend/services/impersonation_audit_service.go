package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"time"
)

// ImpersonationAuditService provides audit functionality for impersonation operations
type ImpersonationAuditService struct {
	db           database.DB
	auditService *AuditService
}

// NewImpersonationAuditService creates a new impersonation audit service
func NewImpersonationAuditService(db database.DB, auditService *AuditService) *ImpersonationAuditService {
	return &ImpersonationAuditService{
		db:           db,
		auditService: auditService,
	}
}

// LogEvent logs an impersonation-related audit event
// This implements the middleware.AuditServiceInterface
func (s *ImpersonationAuditService) LogEvent(ctx interface{}, data *models.AuditEventData) error {
	// Delegate to the general audit service
	if s.auditService != nil {
		if contextObj, ok := ctx.(context.Context); ok {
			return s.auditService.LogEvent(contextObj, data)
		}
		// Fallback: create a background context
		return s.auditService.LogEvent(context.Background(), data)
	}
	return nil
}

// StartImpersonation logs the start of an impersonation session
func (s *ImpersonationAuditService) StartImpersonation(ctx context.Context, sessionData *ImpersonationSessionData) error {
	// Log to general audit system
	auditData := &models.AuditEventData{
		UserID:       &sessionData.UserID,
		UserName:     sessionData.Username,
		Action:       "impersonation_start",
		ResourceType: "enterprise",
		ResourceID:   fmt.Sprintf("%d", sessionData.EnterpriseID),
		ResourceName: sessionData.EnterpriseName,
		IPAddress:    sessionData.IPAddress,
		UserAgent:    sessionData.UserAgent,
		SessionID:    sessionData.SessionID,
		Description:  fmt.Sprintf("Started impersonation of enterprise %s: %s", sessionData.EnterpriseName, sessionData.Reason),
		Status:       models.StatusSuccess,
		Metadata: map[string]interface{}{
			"enterprise_id":   sessionData.EnterpriseID,
			"enterprise_code": sessionData.EnterpriseCode,
			"session_id":      sessionData.SessionID,
			"expires_at":      sessionData.ExpiresAt,
			"reason":          sessionData.Reason,
		},
	}

	if s.auditService != nil {
		return s.auditService.LogEvent(ctx, auditData)
	}

	return nil
}

// EndImpersonation logs the end of an impersonation session
func (s *ImpersonationAuditService) EndImpersonation(ctx context.Context, sessionData *ImpersonationSessionData) error {
	// Log to general audit system
	auditData := &models.AuditEventData{
		UserID:       &sessionData.UserID,
		UserName:     sessionData.Username,
		Action:       "impersonation_end",
		ResourceType: "enterprise",
		ResourceID:   fmt.Sprintf("%d", sessionData.EnterpriseID),
		ResourceName: sessionData.EnterpriseName,
		IPAddress:    sessionData.IPAddress,
		UserAgent:    sessionData.UserAgent,
		SessionID:    sessionData.SessionID,
		Description:  fmt.Sprintf("Ended impersonation of enterprise %s", sessionData.EnterpriseName),
		Status:       models.StatusSuccess,
		Metadata: map[string]interface{}{
			"enterprise_id":   sessionData.EnterpriseID,
			"enterprise_code": sessionData.EnterpriseCode,
			"session_id":      sessionData.SessionID,
			"duration":        time.Since(sessionData.StartedAt).String(),
		},
	}

	if s.auditService != nil {
		return s.auditService.LogEvent(ctx, auditData)
	}

	return nil
}

// LogAccessDuringImpersonation logs API access during impersonation
func (s *ImpersonationAuditService) LogAccessDuringImpersonation(ctx context.Context, accessData *ImpersonationAccessData) error {
	// Log to general audit system
	auditData := &models.AuditEventData{
		UserID:       &accessData.UserID,
		UserName:     accessData.Username,
		Action:       "impersonation_access",
		ResourceType: "api_endpoint",
		ResourceID:   accessData.Path,
		IPAddress:    accessData.IPAddress,
		UserAgent:    accessData.UserAgent,
		SessionID:    accessData.SessionID,
		Description:  fmt.Sprintf("API access during impersonation: %s %s", accessData.Method, accessData.Path),
		Status:       models.StatusSuccess,
		Metadata: map[string]interface{}{
			"enterprise_id":   accessData.EnterpriseID,
			"enterprise_name": accessData.EnterpriseName,
			"method":          accessData.Method,
			"path":            accessData.Path,
			"session_id":      accessData.SessionID,
		},
	}

	if s.auditService != nil {
		return s.auditService.LogEvent(ctx, auditData)
	}

	return nil
}

// ImpersonationSessionData represents data for impersonation session audit
type ImpersonationSessionData struct {
	SessionID      string
	UserID         int
	Username       string
	EnterpriseID   int
	EnterpriseName string
	EnterpriseCode string
	Reason         string
	StartedAt      time.Time
	ExpiresAt      time.Time
	IPAddress      string
	UserAgent      string
}

// ImpersonationAccessData represents data for API access during impersonation
type ImpersonationAccessData struct {
	SessionID      string
	UserID         int
	Username       string
	EnterpriseID   int
	EnterpriseName string
	Method         string
	Path           string
	IPAddress      string
	UserAgent      string
}