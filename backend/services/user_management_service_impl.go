package services

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"ai-project-backend/database"
)

// DefaultUserManagementService is the default implementation of UserManagementService
type DefaultUserManagementService struct {
	repo database.SystemUserManagementRepository
}

// NewUserManagementService creates a new instance of UserManagementService
func NewUserManagementService(repo database.SystemUserManagementRepository) UserManagementService {
	return &DefaultUserManagementService{
		repo: repo,
	}
}

// ListSystemUsers retrieves a paginated list of system users with filters
func (s *DefaultUserManagementService) ListSystemUsers(
	ctx context.Context,
	filters SystemUserFilters,
	pagination Pagination,
) (*SystemUserListResult, error) {
	// Validate pagination parameters
	if pagination.Page < 1 {
		pagination.Page = 1
	}
	if pagination.PageSize < 1 || pagination.PageSize > 100 {
		pagination.PageSize = 20 // Default page size
	}

	// Convert to repository filters
	repoFilters := database.SystemUserFilters{
		Search: filters.Search,
		Status: filters.Status,
	}

	repoPagination := database.Pagination{
		Page:     pagination.Page,
		PageSize: pagination.PageSize,
	}

	// Get total count
	total, err := s.repo.CountSystemUsers(ctx, repoFilters)
	if err != nil {
		return nil, fmt.Errorf("failed to count system users: %w", err)
	}

	// Get users list
	users, err := s.repo.ListSystemUsers(ctx, repoFilters, repoPagination)
	if err != nil {
		return nil, fmt.Errorf("failed to list system users: %w", err)
	}

	// Convert to service model
	userSummaries := make([]SystemUserSummary, len(users))
	for i, user := range users {
		userSummaries[i] = SystemUserSummary{
			ID:          user.ID,
			Username:    user.Username,
			Email:       user.Email,
			Role:        user.Role,
			Status:      user.Status,
			CreatedAt:   user.CreatedAt,
			UpdatedAt:   user.UpdatedAt,
			LastLoginAt: user.LastLoginAt,
		}
	}

	// Calculate total pages
	totalPages := total / pagination.PageSize
	if total%pagination.PageSize > 0 {
		totalPages++
	}

	return &SystemUserListResult{
		Users:      userSummaries,
		Total:      total,
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetSystemUser retrieves detailed information about a system user
func (s *DefaultUserManagementService) GetSystemUser(
	ctx context.Context,
	userID uint,
) (*SystemUserDetail, error) {
	// Get user from repository
	user, err := s.repo.GetSystemUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Get user's roles
	roleIDs, err := s.repo.GetSystemUserRoles(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}

	// Convert to service model
	return &SystemUserDetail{
		ID:          user.ID,
		Username:    user.Username,
		Email:       user.Email,
		UserType:    user.UserType,
		Role:        user.Role,
		Status:      user.Status,
		RoleIDs:     roleIDs,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
		LastLoginAt: user.LastLoginAt,
	}, nil
}

// CreateSystemUser creates a new system user with password hashing
func (s *DefaultUserManagementService) CreateSystemUser(
	ctx context.Context,
	req *CreateSystemUserRequest,
) (*SystemUserDetail, error) {
	// Validate request
	if err := s.validateCreateRequest(req); err != nil {
		return nil, err
	}

	// Check if username already exists
	usernameExists, err := s.repo.UserExistsByUsername(ctx, req.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to check username: %w", err)
	}
	if usernameExists {
		return nil, fmt.Errorf("username '%s' already exists", req.Username)
	}

	// Check if email already exists
	emailExists, err := s.repo.UserExistsByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}
	if emailExists {
		return nil, fmt.Errorf("email '%s' already exists", req.Email)
	}

	// Hash password with bcrypt
	passwordHash, err := s.hashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Set default status if not provided
	status := req.Status
	if status == "" {
		status = "active"
	}

	// Create user params
	params := &database.CreateSystemUserParams{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: &passwordHash,
		Role:         req.Role,
		Status:       status,
	}

	// Create user in database
	user, err := s.repo.CreateSystemUser(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create system user: %w", err)
	}

	// Return detailed user info
	return &SystemUserDetail{
		ID:          user.ID,
		Username:    user.Username,
		Email:       user.Email,
		UserType:    user.UserType,
		Role:        user.Role,
		Status:      user.Status,
		RoleIDs:     []uint{}, // New user has no system roles initially
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
		LastLoginAt: user.LastLoginAt,
	}, nil
}

// UpdateSystemUserRoles updates the roles assigned to a system user
func (s *DefaultUserManagementService) UpdateSystemUserRoles(
	ctx context.Context,
	userID uint,
	roleIDs []uint,
	operatorID uint,
) (*RoleUpdateResult, error) {
	// Verify user exists and get username
	username, currentStatus, err := s.repo.GetSystemUserStatus(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Business rule: Cannot update roles for locked users
	if currentStatus == "locked" {
		return nil, fmt.Errorf("cannot update roles for locked user '%s'", username)
	}

	// Sync roles using repository (this solves the N+1 problem!)
	added, removed, err := s.repo.SyncUserRoles(ctx, userID, roleIDs, operatorID)
	if err != nil {
		return nil, fmt.Errorf("failed to sync user roles: %w", err)
	}

	// Get updated role list
	updatedRoles, err := s.repo.GetSystemUserRoles(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated roles: %w", err)
	}

	// Build result message
	message := fmt.Sprintf("Successfully updated roles for user '%s': %d added, %d removed", username, added, removed)

	return &RoleUpdateResult{
		UserID:       userID,
		Username:     username,
		RolesAdded:   added,
		RolesRemoved: removed,
		CurrentRoles: updatedRoles,
		UpdatedAt:    time.Now(),
		Message:      message,
	}, nil
}

// UpdateSystemUserStatus updates the status of a system user
func (s *DefaultUserManagementService) UpdateSystemUserStatus(
	ctx context.Context,
	userID uint,
	newStatus string,
	operatorID uint,
) (*StatusUpdateResult, error) {
	// Validate status
	if err := s.validateStatus(newStatus); err != nil {
		return nil, err
	}

	// Get current status
	username, oldStatus, err := s.repo.GetSystemUserStatus(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Business rule: Cannot change status if already the same
	if oldStatus == newStatus {
		return nil, fmt.Errorf("user '%s' already has status '%s'", username, newStatus)
	}

	// Update status
	updatedAt, err := s.repo.UpdateSystemUserStatus(ctx, userID, newStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to update user status: %w", err)
	}

	// Build result message
	message := fmt.Sprintf("Successfully updated status for user '%s' from '%s' to '%s'", username, oldStatus, newStatus)

	return &StatusUpdateResult{
		UserID:    userID,
		Username:  username,
		OldStatus: oldStatus,
		NewStatus: newStatus,
		UpdatedAt: updatedAt,
		Message:   message,
	}, nil
}

// ========== Private Helper Methods ==========

// validateCreateRequest validates the create user request
func (s *DefaultUserManagementService) validateCreateRequest(req *CreateSystemUserRequest) error {
	// Validate username
	if len(req.Username) < 3 {
		return fmt.Errorf("username must be at least 3 characters long")
	}
	if len(req.Username) > 50 {
		return fmt.Errorf("username must not exceed 50 characters")
	}

	// Validate email format (basic check)
	if req.Email == "" {
		return fmt.Errorf("email is required")
	}

	// Validate password strength
	if len(req.Password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}

	// Validate role
	if req.Role == "" {
		return fmt.Errorf("role is required")
	}

	// Validate status if provided
	if req.Status != "" {
		if err := s.validateStatus(req.Status); err != nil {
			return err
		}
	}

	return nil
}

// validateStatus validates user status values
func (s *DefaultUserManagementService) validateStatus(status string) error {
	validStatuses := map[string]bool{
		"active":    true,
		"inactive":  true,
		"suspended": true,
		"locked":    true,
	}

	if !validStatuses[status] {
		return fmt.Errorf("invalid status '%s': must be one of: active, inactive, suspended, locked", status)
	}

	return nil
}

// hashPassword hashes a plain text password using bcrypt
func (s *DefaultUserManagementService) hashPassword(password string) (string, error) {
	// Use bcrypt cost factor of 10 (balance between security and performance)
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedBytes), nil
}
