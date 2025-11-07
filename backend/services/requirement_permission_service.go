package services

import (
	"context"
	"database/sql"
	"fmt"

	"ai-project-backend/models"
)

// RequirementPermissionService provides permission checking for requirement management
type RequirementPermissionService struct {
	permissionService *PermissionService
	db                *sql.DB
}

// NewRequirementPermissionService creates a new requirement permission service
func NewRequirementPermissionService(permissionService *PermissionService, db *sql.DB) *RequirementPermissionService {
	return &RequirementPermissionService{
		permissionService: permissionService,
		db:                db,
	}
}

// RequirementPermissionContext contains context for requirement permission checking
type RequirementPermissionContext struct {
	UserID        int
	RequirementID int
	Action        PermissionAction
	Requirement   *models.Requirement // Optional: if already loaded
}

// RequirementAccessResult represents the result of requirement access check
type RequirementAccessResult struct {
	CanAccess     bool
	CanUpdate     bool
	CanDelete     bool
	CanApprove    bool
	CanReject     bool
	CanComment    bool
	IsSubmitter   bool
	IsReviewer    bool
	IsEnterpriseUser bool
	Reason        string
}

// CheckRequirementPermission checks if user has permission for a specific requirement action
func (s *RequirementPermissionService) CheckRequirementPermission(ctx context.Context, reqCtx *RequirementPermissionContext) (bool, error) {
	// Build permission context for base permission service
	permCtx := &UserPermissionContext{
		UserID:       reqCtx.UserID,
		ResourceType: ResourceRequirement,
		Action:       reqCtx.Action,
		ResourceID:   &reqCtx.RequirementID,
	}

	result, err := s.permissionService.CheckPermission(ctx, permCtx)
	if err != nil {
		return false, fmt.Errorf("failed to check base permission: %w", err)
	}

	// If base permission granted, return true
	if result.HasPermission {
		return true, nil
	}

	// Check requirement-specific access rules
	return s.checkRequirementSpecificAccess(ctx, reqCtx)
}

// checkRequirementSpecificAccess checks requirement-specific access rules
func (s *RequirementPermissionService) checkRequirementSpecificAccess(ctx context.Context, reqCtx *RequirementPermissionContext) (bool, error) {
	// Load requirement if not provided
	var requirement *models.Requirement
	if reqCtx.Requirement != nil {
		requirement = reqCtx.Requirement
	} else {
		// Load requirement from database
		query := `
			SELECT id, title, description, enterprise_id, submitter_id, reviewer_id,
				   status, priority, due_date, created_at, updated_at
			FROM requirements
			WHERE id = $1
		`
		requirement = &models.Requirement{}
		var description, reviewerID, priority, dueDate sql.NullString
		err := s.db.QueryRowContext(ctx, query, reqCtx.RequirementID).Scan(
			&requirement.ID, &requirement.Title, &description, &requirement.EnterpriseID,
			&requirement.SubmitterID, &reviewerID, &requirement.Status, &priority, &dueDate,
			&requirement.CreatedAt, &requirement.UpdatedAt)
		if err != nil {
			if err == sql.ErrNoRows {
				return false, fmt.Errorf("requirement not found")
			}
			return false, fmt.Errorf("failed to load requirement: %w", err)
		}
		if description.Valid {
			requirement.Description = &description.String
		}
		if reviewerID.Valid {
			id := int(0)
			fmt.Sscanf(reviewerID.String, "%d", &id)
			requirement.ReviewerID = &id
		}
		if priority.Valid {
			requirement.Priority = priority.String
		}
		if dueDate.Valid {
			requirement.DueDate = nil // Simplified for now
		}
	}

	// Get user info
	user, err := s.getUserInfo(ctx, reqCtx.UserID)
	if err != nil {
		return false, fmt.Errorf("failed to get user info: %w", err)
	}

	// Check if user is submitter
	if requirement.SubmitterID == reqCtx.UserID {
		// Submitter has read, update (if not approved/rejected), and can comment
		switch reqCtx.Action {
		case ActionRead, ActionUpdate:
			// Submitter can update only if not in final states
			if reqCtx.Action == ActionUpdate {
				if requirement.Status == string(models.RequirementStatusApproved) ||
					requirement.Status == string(models.RequirementStatusRejected) ||
					requirement.Status == string(models.RequirementStatusArchived) {
					return false, nil
				}
			}
			return true, nil
		}
	}

	// Check if user is reviewer
	if requirement.ReviewerID != nil && *requirement.ReviewerID == reqCtx.UserID {
		// Reviewer has read, approve, reject permissions
		switch reqCtx.Action {
		case ActionRead:
			return true, nil
		}
	}

	// Check enterprise membership
	if user.CompanyID != nil && *user.CompanyID == requirement.EnterpriseID {
		// Enterprise members can read requirements from their enterprise
		if reqCtx.Action == ActionRead {
			return true, nil
		}
	}

	// Check if user is system user (can access all)
	if user.Role == "admin" || user.Role == "super_admin" {
		return true, nil
	}

	return false, nil
}

// GetRequirementAccess gets comprehensive access information for a user on a requirement
func (s *RequirementPermissionService) GetRequirementAccess(ctx context.Context, userID int, requirementID int) (*RequirementAccessResult, error) {
	result := &RequirementAccessResult{
		CanAccess:  false,
		CanUpdate:  false,
		CanDelete:  false,
		CanApprove: false,
		CanReject:  false,
		CanComment: false,
	}

	// Load requirement
	query := `
		SELECT id, enterprise_id, submitter_id, reviewer_id, status
		FROM requirements
		WHERE id = $1
	`
	var enterpriseID, submitterID int
	var reviewerID sql.NullInt64
	var status string
	err := s.db.QueryRowContext(ctx, query, requirementID).Scan(
		&requirementID, &enterpriseID, &submitterID, &reviewerID, &status)
	if err != nil {
		if err == sql.ErrNoRows {
			result.Reason = "requirement not found"
			return result, nil
		}
		return nil, fmt.Errorf("failed to load requirement: %w", err)
	}

	// Get user info
	user, err := s.getUserInfo(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	// Check if user is system admin
	if user.Role == "admin" || user.Role == "super_admin" {
		result.CanAccess = true
		result.CanUpdate = true
		result.CanDelete = true
		result.CanApprove = true
		result.CanReject = true
		result.CanComment = true
		result.Reason = "system admin"
		return result, nil
	}

	// Check if user is submitter
	result.IsSubmitter = (submitterID == userID)

	// Check if user is reviewer
	if reviewerID.Valid {
		result.IsReviewer = (int(reviewerID.Int64) == userID)
	}

	// Check if user belongs to the enterprise
	result.IsEnterpriseUser = (user.CompanyID != nil && *user.CompanyID == enterpriseID)

	// Determine permissions based on roles and status
	if result.IsSubmitter {
		result.CanAccess = true
		result.CanComment = true
		// Submitter can update/delete only if not in final states
		if status != string(models.RequirementStatusApproved) &&
			status != string(models.RequirementStatusRejected) &&
			status != string(models.RequirementStatusArchived) {
			result.CanUpdate = true
			result.CanDelete = true
		}
		result.Reason = "submitter"
	} else if result.IsReviewer {
		result.CanAccess = true
		result.CanComment = true
		result.CanApprove = (status == string(models.RequirementStatusPending))
		result.CanReject = (status == string(models.RequirementStatusPending))
		result.Reason = "reviewer"
	} else if result.IsEnterpriseUser {
		result.CanAccess = true
		result.CanComment = true
		result.Reason = "enterprise member"
	}

	// Check if user is project manager (can approve)
	if user.Role == "project_manager" {
		result.CanAccess = true
		result.CanApprove = true
		result.CanReject = true
		result.CanComment = true
		if result.Reason == "" {
			result.Reason = "project manager"
		}
	}

	if !result.CanAccess {
		result.Reason = "no access"
	}

	return result, nil
}

// CanUserApproveRequirement checks if user can approve a specific requirement
func (s *RequirementPermissionService) CanUserApproveRequirement(ctx context.Context, userID int, requirementID int) (bool, error) {
	access, err := s.GetRequirementAccess(ctx, userID, requirementID)
	if err != nil {
		return false, err
	}
	return access.CanApprove, nil
}

// CanUserRejectRequirement checks if user can reject a specific requirement
func (s *RequirementPermissionService) CanUserRejectRequirement(ctx context.Context, userID int, requirementID int) (bool, error) {
	access, err := s.GetRequirementAccess(ctx, userID, requirementID)
	if err != nil {
		return false, err
	}
	return access.CanReject, nil
}

// CanUserUpdateRequirement checks if user can update a specific requirement
func (s *RequirementPermissionService) CanUserUpdateRequirement(ctx context.Context, userID int, requirementID int) (bool, error) {
	access, err := s.GetRequirementAccess(ctx, userID, requirementID)
	if err != nil {
		return false, err
	}
	return access.CanUpdate, nil
}

// CanUserDeleteRequirement checks if user can delete a specific requirement
func (s *RequirementPermissionService) CanUserDeleteRequirement(ctx context.Context, userID int, requirementID int) (bool, error) {
	access, err := s.GetRequirementAccess(ctx, userID, requirementID)
	if err != nil {
		return false, err
	}
	return access.CanDelete, nil
}

// FilterRequirementsByAccess filters requirements based on user access
func (s *RequirementPermissionService) FilterRequirementsByAccess(ctx context.Context, userID int, requirements []*models.Requirement) ([]*models.Requirement, error) {
	// Get user info
	user, err := s.getUserInfo(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	// System admin can see all
	if user.Role == "admin" || user.Role == "super_admin" {
		return requirements, nil
	}

	var filtered []*models.Requirement
	for _, req := range requirements {
		// Check if user has access to this requirement
		canAccess := false

		// Submitter can access
		if req.SubmitterID == userID {
			canAccess = true
		}

		// Reviewer can access
		if req.ReviewerID != nil && *req.ReviewerID == userID {
			canAccess = true
		}

		// Enterprise member can access
		if user.CompanyID != nil && *user.CompanyID == req.EnterpriseID {
			canAccess = true
		}

		if canAccess {
			filtered = append(filtered, req)
		}
	}

	return filtered, nil
}

// getUserInfo is a helper method to get user information
func (s *RequirementPermissionService) getUserInfo(ctx context.Context, userID int) (*userInfo, error) {
	query := `SELECT id, username, role, company_id FROM users WHERE id = $1`
	var companyID sql.NullInt64
	user := &userInfo{}
	err := s.db.QueryRowContext(ctx, query, userID).Scan(&user.ID, &user.Username, &user.Role, &companyID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
	}
	if companyID.Valid {
		id := int(companyID.Int64)
		user.CompanyID = &id
	}
	return user, nil
}

// userInfo is a helper struct for user information
type userInfo struct {
	ID        int
	Username  string
	Role      string
	CompanyID *int
}

// CheckRequirementStatusTransition checks if user can transition requirement to a new status
func (s *RequirementPermissionService) CheckRequirementStatusTransition(ctx context.Context, userID int, requirementID int, currentStatus, newStatus string) (bool, string, error) {
	// Get user access
	access, err := s.GetRequirementAccess(ctx, userID, requirementID)
	if err != nil {
		return false, "", err
	}

	// Define valid status transitions and required permissions
	type transition struct {
		from         string
		to           string
		requireApprove bool
		requireSubmitter bool
	}

	validTransitions := []transition{
		// Submitter transitions
		{from: string(models.RequirementStatusDraft), to: string(models.RequirementStatusPending), requireSubmitter: true},
		{from: string(models.RequirementStatusPending), to: string(models.RequirementStatusDraft), requireSubmitter: true},

		// Reviewer transitions
		{from: string(models.RequirementStatusPending), to: string(models.RequirementStatusApproved), requireApprove: true},
		{from: string(models.RequirementStatusPending), to: string(models.RequirementStatusRejected), requireApprove: true},

		// Archive transitions (submitter or admin)
		{from: string(models.RequirementStatusDraft), to: string(models.RequirementStatusArchived), requireSubmitter: true},
		{from: string(models.RequirementStatusApproved), to: string(models.RequirementStatusArchived), requireSubmitter: true},
		{from: string(models.RequirementStatusRejected), to: string(models.RequirementStatusArchived), requireSubmitter: true},
	}

	// Check if transition is valid
	isValidTransition := false
	var trans transition
	for _, t := range validTransitions {
		if t.from == currentStatus && t.to == newStatus {
			isValidTransition = true
			trans = t
			break
		}
	}

	if !isValidTransition {
		return false, fmt.Sprintf("invalid status transition from %s to %s", currentStatus, newStatus), nil
	}

	// Check if user has required permissions for this transition
	if trans.requireApprove {
		if !access.CanApprove {
			return false, "user cannot approve requirements", nil
		}
	}

	if trans.requireSubmitter {
		if !access.IsSubmitter && !access.CanUpdate {
			return false, "only submitter can perform this transition", nil
		}
	}

	return true, "transition allowed", nil
}
