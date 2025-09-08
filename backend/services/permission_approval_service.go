//go:build approval
// +build approval

package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// PermissionApprovalService handles all permission approval operations
type PermissionApprovalService struct {
	db     database.DB
	logger *log.Logger
	
	// Sub-services
	notificationService *NotificationService
	auditService       *AuditService
	workflowEngine     *ApprovalWorkflowEngine
}

// NewPermissionApprovalService creates a new permission approval service
func NewPermissionApprovalService(db database.DB, logger *log.Logger) *PermissionApprovalService {
	service := &PermissionApprovalService{
		db:     db,
		logger: logger,
	}
	
	// Initialize sub-services
	service.workflowEngine = NewApprovalWorkflowEngine(db, logger)
	// service.notificationService = NewNotificationService(db, logger)
	// service.auditService = NewAuditService(db, logger)
	
	return service
}

// CreateApprovalRequest creates a new permission approval request
func (s *PermissionApprovalService) CreateApprovalRequest(ctx context.Context, req *models.CreateApprovalRequestRequest, requesterID int) (*models.ApprovalRequestResponse, error) {
	s.logger.Printf("Creating approval request for user %d: %s", requesterID, req.PermissionCode)

	// Generate unique request ID
	requestID := fmt.Sprintf("PAR-%s", uuid.New().String()[:8])

	// Get requester information
	requester, err := s.db.Users().GetByID(ctx, requesterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get requester info: %w", err)
	}

	// Determine appropriate workflow
	workflow, err := s.determineWorkflow(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to determine workflow: %w", err)
	}

	// Create the approval request
	approvalReq := &models.PermissionApprovalRequest{
		RequestID:           requestID,
		RequesterID:         requesterID,
		RequesterName:       requester.Username,
		RequesterDepartment: nil, // TODO: Get from user profile
		RequesterRole:       &requester.Role,
		PermissionCode:      req.PermissionCode,
		ResourceType:        req.ResourceType,
		ResourceID:          req.ResourceID,
		RequestTitle:        req.RequestTitle,
		Justification:       req.Justification,
		BusinessReason:      req.BusinessReason,
		RequestedDuration:   req.RequestedDuration,
		Priority:            req.Priority,
		IsTemporary:         req.IsTemporary,
		AutoRevokeAt:        req.AutoRevokeAt,
		Status:              models.ApprovalStatusPending,
		WorkflowType:        workflow.WorkflowType,
		CurrentStepIndex:    0,
		TotalSteps:          len(workflow.Steps),
		Tags:                req.Tags,
		Metadata:            models.CustomFields(req.Metadata),
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	if req.RequestedDuration != nil {
		expiresAt := time.Now().Add(time.Duration(*req.RequestedDuration) * time.Hour)
		approvalReq.ExpiresAt = &expiresAt
	}

	// Save the approval request
	err = s.db.PermissionApprovalRequests().Create(ctx, approvalReq)
	if err != nil {
		return nil, fmt.Errorf("failed to create approval request: %w", err)
	}

	// Create workflow steps
	steps, err := s.createWorkflowSteps(ctx, approvalReq.ID, workflow)
	if err != nil {
		return nil, fmt.Errorf("failed to create workflow steps: %w", err)
	}

	// Start the workflow
	err = s.workflowEngine.StartWorkflow(ctx, approvalReq, steps)
	if err != nil {
		s.logger.Printf("Warning: Failed to start workflow for request %s: %v", requestID, err)
	}

	// Create audit log entry
	s.createAuditLog(ctx, approvalReq.ID, "created", requesterID, requester.Username, "user", map[string]interface{}{
		"request_id":      requestID,
		"permission_code": req.PermissionCode,
		"resource_type":   req.ResourceType,
		"workflow_id":     workflow.ID,
	})

	// Send notifications
	s.sendRequestNotifications(ctx, approvalReq, steps)

	return &models.ApprovalRequestResponse{
		Request:  approvalReq,
		Steps:    steps,
		Workflow: workflow,
	}, nil
}

// ProcessApprovalDecision processes an approval decision from an approver
func (s *PermissionApprovalService) ProcessApprovalDecision(ctx context.Context, requestID int, stepID int, approverID int, decision *models.ApprovalDecisionRequest) (*models.ApprovalRequestResponse, error) {
	s.logger.Printf("Processing approval decision for request %d, step %d by user %d: %s", requestID, stepID, approverID, decision.Decision)

	// Get the request and step
	request, err := s.db.PermissionApprovalRequests().GetByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval request: %w", err)
	}

	step, err := s.db.PermissionApprovalSteps().GetByID(ctx, stepID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval step: %w", err)
	}

	// Validate approver authorization
	if !s.canApprove(step, approverID) {
		return nil, fmt.Errorf("user %d is not authorized to approve this step", approverID)
	}

	// Get approver info
	approver, err := s.db.Users().GetByID(ctx, approverID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approver info: %w", err)
	}

	// Update the step
	step.Decision = &decision.Decision
	step.Comments = decision.Comments
	step.CompletedAt = &time.Time{}
	*step.CompletedAt = time.Now()
	
	switch decision.Decision {
	case "approve":
		step.Status = models.ApprovalStatusApproved
	case "reject":
		step.Status = models.ApprovalStatusRejected
	case "delegate":
		if decision.DelegateToID == nil {
			return nil, fmt.Errorf("delegate_to_id is required for delegation")
		}
		step.Status = models.ApprovalStatusDelegated
		step.BackupApproverID = decision.DelegateToID
	}

	err = s.db.PermissionApprovalSteps().Update(ctx, step)
	if err != nil {
		return nil, fmt.Errorf("failed to update approval step: %w", err)
	}

	// Process workflow based on decision
	err = s.workflowEngine.ProcessDecision(ctx, request, step, decision.Decision)
	if err != nil {
		return nil, fmt.Errorf("failed to process workflow decision: %w", err)
	}

	// Create audit log
	s.createAuditLog(ctx, requestID, fmt.Sprintf("step_%s", decision.Decision), approverID, approver.Username, "user", map[string]interface{}{
		"step_id":   stepID,
		"decision":  decision.Decision,
		"comments":  decision.Comments,
	})

	// Get updated request and steps
	updatedRequest, err := s.db.PermissionApprovalRequests().GetByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated request: %w", err)
	}

	steps, err := s.db.PermissionApprovalSteps().GetByRequestID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated steps: %w", err)
	}

	return &models.ApprovalRequestResponse{
		Request: updatedRequest,
		Steps:   steps,
	}, nil
}

// GetApprovalRequest retrieves an approval request with all related data
func (s *PermissionApprovalService) GetApprovalRequest(ctx context.Context, requestID int, requesterID int) (*models.ApprovalRequestResponse, error) {
	request, err := s.db.PermissionApprovalRequests().GetByID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval request: %w", err)
	}

	// Check if user can view this request
	if request.RequesterID != requesterID {
		// TODO: Check if user is an approver or has admin permissions
	}

	steps, err := s.db.PermissionApprovalSteps().GetByRequestID(ctx, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval steps: %w", err)
	}

	comments, err := s.db.ApprovalComments().GetByRequestID(ctx, requestID)
	if err != nil {
		s.logger.Printf("Warning: Failed to get comments for request %d: %v", requestID, err)
	}

	auditLog, err := s.db.ApprovalAuditLogs().GetByRequestID(ctx, requestID)
	if err != nil {
		s.logger.Printf("Warning: Failed to get audit log for request %d: %v", requestID, err)
	}

	return &models.ApprovalRequestResponse{
		Request:  request,
		Steps:    steps,
		Comments: comments,
		AuditLog: auditLog,
	}, nil
}

// ListApprovalRequests lists approval requests with filtering and pagination
func (s *PermissionApprovalService) ListApprovalRequests(ctx context.Context, filter *ApprovalRequestFilter) (*models.ApprovalRequestsListResponse, error) {
	requests, total, err := s.db.PermissionApprovalRequests().List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list approval requests: %w", err)
	}

	return &models.ApprovalRequestsListResponse{
		Requests: requests,
		Total:    total,
		Page:     filter.Page,
		PageSize: filter.PageSize,
		HasNext:  (filter.Page * filter.PageSize) < total,
		HasPrev:  filter.Page > 1,
	}, nil
}

// GetPendingApprovals gets pending approvals for a specific approver
func (s *PermissionApprovalService) GetPendingApprovals(ctx context.Context, approverID int) ([]*models.PermissionApprovalRequest, error) {
	return s.db.PermissionApprovalRequests().GetPendingForApprover(ctx, approverID)
}

// WithdrawRequest allows the requester to withdraw their request
func (s *PermissionApprovalService) WithdrawRequest(ctx context.Context, requestID int, requesterID int, reason string) error {
	request, err := s.db.PermissionApprovalRequests().GetByID(ctx, requestID)
	if err != nil {
		return fmt.Errorf("failed to get approval request: %w", err)
	}

	if request.RequesterID != requesterID {
		return fmt.Errorf("only the requester can withdraw the request")
	}

	if request.Status != models.ApprovalStatusPending && request.Status != models.ApprovalStatusInReview {
		return fmt.Errorf("cannot withdraw request in status: %s", request.Status)
	}

	// Update request status
	request.Status = models.ApprovalStatusWithdrawn
	request.UpdatedAt = time.Now()
	
	err = s.db.PermissionApprovalRequests().Update(ctx, request)
	if err != nil {
		return fmt.Errorf("failed to update request status: %w", err)
	}

	// Create audit log
	requester, _ := s.db.Users().GetByID(ctx, requesterID)
	requesterName := fmt.Sprintf("User-%d", requesterID)
	if requester != nil {
		requesterName = requester.Username
	}

	s.createAuditLog(ctx, requestID, "withdrawn", requesterID, requesterName, "user", map[string]interface{}{
		"reason": reason,
	})

	return nil
}

// GetApprovalStatistics returns statistics about the approval system
func (s *PermissionApprovalService) GetApprovalStatistics(ctx context.Context, filter *StatisticsFilter) (*models.ApprovalStatistics, error) {
	stats := &models.ApprovalStatistics{}
	
	// Get basic counts
	stats.TotalRequests = s.db.PermissionApprovalRequests().Count(ctx, nil)
	stats.PendingRequests = s.db.PermissionApprovalRequests().CountByStatus(ctx, models.ApprovalStatusPending)
	stats.ApprovedRequests = s.db.PermissionApprovalRequests().CountByStatus(ctx, models.ApprovalStatusApproved)
	stats.RejectedRequests = s.db.PermissionApprovalRequests().CountByStatus(ctx, models.ApprovalStatusRejected)
	
	// Calculate average approval time
	avgTime, err := s.db.PermissionApprovalRequests().GetAverageApprovalTime(ctx)
	if err != nil {
		s.logger.Printf("Warning: Failed to get average approval time: %v", err)
	} else {
		stats.AverageApprovalTime = avgTime
	}
	
	// Get approvals by priority
	stats.ApprovalsByPriority, err = s.db.PermissionApprovalRequests().GetCountByPriority(ctx)
	if err != nil {
		s.logger.Printf("Warning: Failed to get approvals by priority: %v", err)
	}
	
	return stats, nil
}

// Helper methods

func (s *PermissionApprovalService) determineWorkflow(ctx context.Context, req *models.CreateApprovalRequestRequest) (*models.ApprovalWorkflow, error) {
	// If workflow is specified, use it
	if req.WorkflowID != nil {
		return s.db.ApprovalWorkflows().GetByID(ctx, *req.WorkflowID)
	}

	// Find matching workflow based on permission code and resource type
	workflows, err := s.db.ApprovalWorkflows().FindMatching(ctx, req.PermissionCode, req.ResourceType, req.Priority)
	if err != nil {
		return nil, err
	}

	if len(workflows) == 0 {
		// Return default single-approval workflow
		return s.getDefaultWorkflow(ctx), nil
	}

	// Use the first matching workflow
	return workflows[0], nil
}

func (s *PermissionApprovalService) getDefaultWorkflow(ctx context.Context) *models.ApprovalWorkflow {
	return &models.ApprovalWorkflow{
		ID:           0,
		Name:         "Default Single Approval",
		WorkflowType: models.WorkflowTypeSingleApproval,
		Steps: []models.ApprovalWorkflowStep{
			{
				StepIndex:    0,
				StepName:     "Manager Approval",
				StepType:     "role",
				ApproverType: "role",
				IsRequired:   true,
				CanSkip:      false,
				CanDelegate:  true,
			},
		},
	}
}

func (s *PermissionApprovalService) createWorkflowSteps(ctx context.Context, requestID int, workflow *models.ApprovalWorkflow) ([]models.PermissionApprovalStep, error) {
	var steps []models.PermissionApprovalStep

	for _, stepTemplate := range workflow.Steps {
		step := models.PermissionApprovalStep{
			RequestID:        requestID,
			StepIndex:        stepTemplate.StepIndex,
			StepName:         stepTemplate.StepName,
			StepType:         stepTemplate.StepType,
			ApproverType:     stepTemplate.ApproverType,
			ApproverID:       stepTemplate.ApproverID,
			Status:           models.ApprovalStatusPending,
			IsRequired:       stepTemplate.IsRequired,
			CanSkip:          stepTemplate.CanSkip,
			CanDelegate:      stepTemplate.CanDelegate,
			AutoApproveRules: models.CustomFields(stepTemplate.AutoApproveRules),
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
		}

		if stepTemplate.DueDurationHours != nil {
			dueAt := time.Now().Add(time.Duration(*stepTemplate.DueDurationHours) * time.Hour)
			step.DueAt = &dueAt
		}

		steps = append(steps, step)
	}

	// Save steps to database
	for i := range steps {
		err := s.db.PermissionApprovalSteps().Create(ctx, &steps[i])
		if err != nil {
			return nil, fmt.Errorf("failed to create step %d: %w", i, err)
		}
	}

	return steps, nil
}

func (s *PermissionApprovalService) canApprove(step *models.PermissionApprovalStep, approverID int) bool {
	if step.ApproverID != nil && *step.ApproverID == approverID {
		return true
	}
	
	if step.BackupApproverID != nil && *step.BackupApproverID == approverID {
		return true
	}
	
	// TODO: Check role-based and department-based approval
	
	return false
}

func (s *PermissionApprovalService) createAuditLog(ctx context.Context, requestID int, action string, actorID int, actorName, actorType string, details map[string]interface{}) {
	auditLog := &models.ApprovalAuditLog{
		RequestID: requestID,
		Action:    action,
		ActorID:   actorID,
		ActorName: actorName,
		ActorType: actorType,
		Details:   models.CustomFields(details),
		CreatedAt: time.Now(),
	}

	err := s.db.ApprovalAuditLogs().Create(ctx, auditLog)
	if err != nil {
		s.logger.Printf("Warning: Failed to create audit log: %v", err)
	}
}

func (s *PermissionApprovalService) sendRequestNotifications(ctx context.Context, request *models.PermissionApprovalRequest, steps []models.PermissionApprovalStep) {
	// TODO: Implement notification sending
	s.logger.Printf("Sending notifications for request %s", request.RequestID)
}

// Filter types

type ApprovalRequestFilter struct {
	Page         int                        `json:"page"`
	PageSize     int                        `json:"page_size"`
	RequesterID  *int                       `json:"requester_id"`
	ApproverID   *int                       `json:"approver_id"`
	Status       *models.ApprovalStatus     `json:"status"`
	Priority     *models.ApprovalPriority   `json:"priority"`
	ResourceType *string                    `json:"resource_type"`
	StartDate    *time.Time                 `json:"start_date"`
	EndDate      *time.Time                 `json:"end_date"`
	SearchTerm   *string                    `json:"search_term"`
}

type StatisticsFilter struct {
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`
	UserID    *int       `json:"user_id"`
}