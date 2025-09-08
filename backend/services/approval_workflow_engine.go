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
)

// ApprovalWorkflowEngine handles the execution of approval workflows
type ApprovalWorkflowEngine struct {
	db     database.DB
	logger *log.Logger
}

// NewApprovalWorkflowEngine creates a new workflow engine
func NewApprovalWorkflowEngine(db database.DB, logger *log.Logger) *ApprovalWorkflowEngine {
	return &ApprovalWorkflowEngine{
		db:     db,
		logger: logger,
	}
}

// StartWorkflow initiates the approval workflow
func (e *ApprovalWorkflowEngine) StartWorkflow(ctx context.Context, request *models.PermissionApprovalRequest, steps []models.PermissionApprovalStep) error {
	e.logger.Printf("Starting workflow for request %s with %d steps", request.RequestID, len(steps))

	// Update request status
	request.Status = models.ApprovalStatusInReview
	request.UpdatedAt = time.Now()

	err := e.db.PermissionApprovalRequests().Update(ctx, request)
	if err != nil {
		return fmt.Errorf("failed to update request status: %w", err)
	}

	// Start the first step
	if len(steps) > 0 {
		return e.startStep(ctx, request, &steps[0])
	}

	return nil
}

// ProcessDecision processes a decision and advances the workflow
func (e *ApprovalWorkflowEngine) ProcessDecision(ctx context.Context, request *models.PermissionApprovalRequest, step *models.PermissionApprovalStep, decision string) error {
	e.logger.Printf("Processing decision '%s' for request %s, step %d", decision, request.RequestID, step.StepIndex)

	switch decision {
	case "approve":
		return e.handleApproval(ctx, request, step)
	case "reject":
		return e.handleRejection(ctx, request, step)
	case "delegate":
		return e.handleDelegation(ctx, request, step)
	default:
		return fmt.Errorf("unknown decision: %s", decision)
	}
}

// handleApproval processes an approval decision
func (e *ApprovalWorkflowEngine) handleApproval(ctx context.Context, request *models.PermissionApprovalRequest, step *models.PermissionApprovalStep) error {
	// Check if this was the final step
	if step.StepIndex >= request.TotalSteps-1 {
		return e.completeWorkflow(ctx, request, true)
	}

	// Move to next step
	return e.advanceToNextStep(ctx, request, step.StepIndex+1)
}

// handleRejection processes a rejection decision
func (e *ApprovalWorkflowEngine) handleRejection(ctx context.Context, request *models.PermissionApprovalRequest, step *models.PermissionApprovalStep) error {
	// Get workflow to check if rejection should stop the workflow
	workflow, err := e.getWorkflowForRequest(ctx, request)
	if err != nil {
		e.logger.Printf("Warning: Could not get workflow for request %s: %v", request.RequestID, err)
	}

	// For most workflows, rejection stops the entire process
	if workflow == nil || workflow.WorkflowType != models.WorkflowTypeParallelApproval {
		return e.completeWorkflow(ctx, request, false)
	}

	// For parallel approval, check if other steps are still pending
	allSteps, err := e.db.PermissionApprovalSteps().GetByRequestID(ctx, request.ID)
	if err != nil {
		return fmt.Errorf("failed to get all steps: %w", err)
	}

	hasCompletedApproval := false
	hasPendingSteps := false

	for _, s := range allSteps {
		if s.Status == models.ApprovalStatusApproved {
			hasCompletedApproval = true
		} else if s.Status == models.ApprovalStatusPending || s.Status == models.ApprovalStatusInReview {
			hasPendingSteps = true
		}
	}

	if !hasPendingSteps {
		// All steps are complete - determine final result
		return e.completeWorkflow(ctx, request, hasCompletedApproval)
	}

	// Continue with other pending steps
	return nil
}

// handleDelegation processes a delegation decision
func (e *ApprovalWorkflowEngine) handleDelegation(ctx context.Context, request *models.PermissionApprovalRequest, step *models.PermissionApprovalStep) error {
	if step.BackupApproverID == nil {
		return fmt.Errorf("delegation target not specified")
	}

	// Update step with new approver
	step.ApproverID = step.BackupApproverID
	step.BackupApproverID = nil
	step.Status = models.ApprovalStatusPending
	step.StartedAt = nil
	step.CompletedAt = nil
	step.UpdatedAt = time.Now()

	err := e.db.PermissionApprovalSteps().Update(ctx, step)
	if err != nil {
		return fmt.Errorf("failed to update delegated step: %w", err)
	}

	// Send notification to new approver
	e.sendStepNotification(ctx, request, step)

	return nil
}

// completeWorkflow completes the entire workflow
func (e *ApprovalWorkflowEngine) completeWorkflow(ctx context.Context, request *models.PermissionApprovalRequest, approved bool) error {
	now := time.Now()

	if approved {
		request.Status = models.ApprovalStatusApproved
		request.ApprovedAt = &now
		e.logger.Printf("Workflow completed - APPROVED for request %s", request.RequestID)
	} else {
		request.Status = models.ApprovalStatusRejected
		request.RejectedAt = &now
		e.logger.Printf("Workflow completed - REJECTED for request %s", request.RequestID)
	}

	request.CompletedAt = &now
	request.UpdatedAt = now

	err := e.db.PermissionApprovalRequests().Update(ctx, request)
	if err != nil {
		return fmt.Errorf("failed to update final request status: %w", err)
	}

	// Send final notifications
	e.sendCompletionNotifications(ctx, request, approved)

	// If approved, grant the permission
	if approved {
		err = e.grantPermission(ctx, request)
		if err != nil {
			e.logger.Printf("Warning: Failed to grant permission for approved request %s: %v", request.RequestID, err)
		}
	}

	return nil
}

// advanceToNextStep moves the workflow to the next step
func (e *ApprovalWorkflowEngine) advanceToNextStep(ctx context.Context, request *models.PermissionApprovalRequest, nextStepIndex int) error {
	// Get the next step
	allSteps, err := e.db.PermissionApprovalSteps().GetByRequestID(ctx, request.ID)
	if err != nil {
		return fmt.Errorf("failed to get steps: %w", err)
	}

	var nextStep *models.PermissionApprovalStep
	for i, step := range allSteps {
		if step.StepIndex == nextStepIndex {
			nextStep = &allSteps[i]
			break
		}
	}

	if nextStep == nil {
		return fmt.Errorf("next step %d not found", nextStepIndex)
	}

	// Update request to reflect current step
	request.CurrentStepIndex = nextStepIndex
	request.UpdatedAt = time.Now()

	err = e.db.PermissionApprovalRequests().Update(ctx, request)
	if err != nil {
		return fmt.Errorf("failed to update request step index: %w", err)
	}

	// Start the next step
	return e.startStep(ctx, request, nextStep)
}

// startStep initiates a specific step in the workflow
func (e *ApprovalWorkflowEngine) startStep(ctx context.Context, request *models.PermissionApprovalRequest, step *models.PermissionApprovalStep) error {
	now := time.Now()
	step.Status = models.ApprovalStatusInReview
	step.StartedAt = &now
	step.UpdatedAt = now

	err := e.db.PermissionApprovalSteps().Update(ctx, step)
	if err != nil {
		return fmt.Errorf("failed to start step: %w", err)
	}

	// Check for auto-approval rules
	if e.shouldAutoApprove(ctx, request, step) {
		step.Status = models.ApprovalStatusApproved
		step.Decision = stringPtr("approve")
		step.Comments = "Auto-approved based on configured rules"
		step.CompletedAt = &now

		err = e.db.PermissionApprovalSteps().Update(ctx, step)
		if err != nil {
			return fmt.Errorf("failed to auto-approve step: %w", err)
		}

		// Continue with the approval flow
		return e.handleApproval(ctx, request, step)
	}

	// Send notification to approver
	e.sendStepNotification(ctx, request, step)

	return nil
}

// shouldAutoApprove checks if a step should be auto-approved
func (e *ApprovalWorkflowEngine) shouldAutoApprove(ctx context.Context, request *models.PermissionApprovalRequest, step *models.PermissionApprovalStep) bool {
	if step.AutoApproveRules == nil {
		return false
	}

	rules := map[string]interface{}(step.AutoApproveRules)

	// Check requester role auto-approval
	if allowedRoles, ok := rules["allowed_requester_roles"].([]interface{}); ok {
		for _, role := range allowedRoles {
			if roleStr, ok := role.(string); ok && request.RequesterRole != nil && *request.RequesterRole == roleStr {
				e.logger.Printf("Auto-approving step for request %s based on requester role: %s", request.RequestID, roleStr)
				return true
			}
		}
	}

	// Check permission level auto-approval
	if permissionLevel, ok := rules["max_auto_approve_level"].(string); ok {
		if e.isPermissionLevelAllowed(request.PermissionCode, permissionLevel) {
			e.logger.Printf("Auto-approving step for request %s based on permission level", request.RequestID)
			return true
		}
	}

	// Check amount threshold (if applicable)
	if maxAmount, ok := rules["max_auto_approve_amount"].(float64); ok {
		if requestAmount := e.getRequestAmount(request); requestAmount > 0 && requestAmount <= maxAmount {
			e.logger.Printf("Auto-approving step for request %s based on amount threshold", request.RequestID)
			return true
		}
	}

	// Check time-based rules
	if timeRules, ok := rules["time_based"].(map[string]interface{}); ok {
		if e.isTimeBasedAutoApprovalAllowed(timeRules) {
			e.logger.Printf("Auto-approving step for request %s based on time rules", request.RequestID)
			return true
		}
	}

	return false
}

// grantPermission grants the approved permission
func (e *ApprovalWorkflowEngine) grantPermission(ctx context.Context, request *models.PermissionApprovalRequest) error {
	e.logger.Printf("Granting permission %s to user %d for resource %s:%v", 
		request.PermissionCode, request.RequesterID, request.ResourceType, request.ResourceID)

	// TODO: Implement actual permission granting
	// This would integrate with the existing permission system to:
	// 1. Create the permission record
	// 2. Update user roles if needed
	// 3. Set expiration if temporary
	// 4. Send confirmation notification

	return nil
}

// Helper methods

func (e *ApprovalWorkflowEngine) getWorkflowForRequest(ctx context.Context, request *models.PermissionApprovalRequest) (*models.ApprovalWorkflow, error) {
	// Try to get workflow by matching criteria
	workflows, err := e.db.ApprovalWorkflows().FindMatching(ctx, request.PermissionCode, request.ResourceType, models.ApprovalPriority(request.Priority))
	if err != nil {
		return nil, err
	}

	if len(workflows) > 0 {
		return workflows[0], nil
	}

	return nil, fmt.Errorf("no workflow found for request")
}

func (e *ApprovalWorkflowEngine) sendStepNotification(ctx context.Context, request *models.PermissionApprovalRequest, step *models.PermissionApprovalStep) {
	e.logger.Printf("Sending notification for step %d of request %s", step.StepIndex, request.RequestID)
	// TODO: Implement notification sending
}

func (e *ApprovalWorkflowEngine) sendCompletionNotifications(ctx context.Context, request *models.PermissionApprovalRequest, approved bool) {
	status := "rejected"
	if approved {
		status = "approved"
	}
	e.logger.Printf("Sending completion notification for request %s: %s", request.RequestID, status)
	// TODO: Implement completion notifications
}

func (e *ApprovalWorkflowEngine) isPermissionLevelAllowed(permissionCode string, maxLevel string) bool {
	// Define permission levels (lower number = higher privilege)
	levels := map[string]int{
		"read":   3,
		"write":  2,
		"admin":  1,
		"owner":  0,
	}

	// Extract level from permission code (e.g., "task.read" -> "read")
	parts := []string{}
	if len(permissionCode) > 0 {
		// Simple extraction - in real implementation this would be more sophisticated
		if contains(permissionCode, "read") {
			parts = append(parts, "read")
		} else if contains(permissionCode, "write") {
			parts = append(parts, "write")
		} else if contains(permissionCode, "admin") {
			parts = append(parts, "admin")
		}
	}

	if len(parts) == 0 {
		return false
	}

	requestLevel, ok := levels[parts[0]]
	if !ok {
		return false
	}

	maxLevelVal, ok := levels[maxLevel]
	if !ok {
		return false
	}

	return requestLevel >= maxLevelVal
}

func (e *ApprovalWorkflowEngine) getRequestAmount(request *models.PermissionApprovalRequest) float64 {
	// Extract amount from metadata if present
	if request.Metadata != nil {
		if amount, ok := request.Metadata["amount"]; ok {
			if amountFloat, ok := amount.(float64); ok {
				return amountFloat
			}
		}
	}
	return 0
}

func (e *ApprovalWorkflowEngine) isTimeBasedAutoApprovalAllowed(timeRules map[string]interface{}) bool {
	now := time.Now()

	// Check business hours
	if businessHours, ok := timeRules["business_hours_only"].(bool); ok && businessHours {
		hour := now.Hour()
		if hour < 9 || hour > 17 {
			return false
		}
	}

	// Check weekdays only
	if weekdaysOnly, ok := timeRules["weekdays_only"].(bool); ok && weekdaysOnly {
		weekday := now.Weekday()
		if weekday == time.Saturday || weekday == time.Sunday {
			return false
		}
	}

	// If all time rules pass, allow auto-approval
	return true
}

// Utility functions

func stringPtr(s string) *string {
	return &s
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || 
		(len(s) > len(substr) && 
		 (s[:len(substr)] == substr || 
		  s[len(s)-len(substr):] == substr ||
		  containsSubstring(s, substr))))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}