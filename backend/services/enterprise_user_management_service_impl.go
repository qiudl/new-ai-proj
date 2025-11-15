package services

import (
	"context"
	"fmt"

	"ai-project-backend/database"
	"ai-project-backend/interfaces"
)

// DefaultEnterpriseUserManagementService implements EnterpriseUserManagementService
type DefaultEnterpriseUserManagementService struct {
	repo     database.EnterpriseUserManagementRepository
	roleRepo interfaces.EnterpriseRoleRepository
}

// NewEnterpriseUserManagementService creates a new service instance
func NewEnterpriseUserManagementService(
	repo database.EnterpriseUserManagementRepository,
	roleRepo interfaces.EnterpriseRoleRepository,
) *DefaultEnterpriseUserManagementService {
	return &DefaultEnterpriseUserManagementService{
		repo:     repo,
		roleRepo: roleRepo,
	}
}

// ListEnterpriseUsers retrieves a paginated list of enterprise users with filters
func (s *DefaultEnterpriseUserManagementService) ListEnterpriseUsers(
	ctx context.Context,
	filters database.EnterpriseUserFilters,
	pagination database.EnterpriseUserPagination,
) (*EnterpriseUserListResult, error) {
	fmt.Printf("🔍 [SERVICE DEBUG] ListEnterpriseUsers called - EnterpriseID: %d\n", filters.EnterpriseID)
	// Count total users
	total, err := s.repo.CountEnterpriseUsers(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to count enterprise users: %w", err)
	}

	// List users
	users, err := s.repo.ListEnterpriseUsers(ctx, filters, pagination)
	if err != nil {
		return nil, fmt.Errorf("failed to list enterprise users: %w", err)
	}

	return &EnterpriseUserListResult{
		Users:        users,
		Total:        total,
		Page:         pagination.Page,
		PageSize:     pagination.PageSize,
		EnterpriseID: filters.EnterpriseID,
	}, nil
}

// InviteUserToEnterprise adds a user to an enterprise with default role
func (s *DefaultEnterpriseUserManagementService) InviteUserToEnterprise(
	ctx context.Context,
	enterpriseID uint,
	req InviteUserRequest,
	operatorID uint,
) (*InviteUserResult, error) {
	// Validate user exists
	username, email, userType, err := s.repo.CheckUserExists(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Validate user is system type (enterprise users must be enterprise type)
	if userType != "enterprise" {
		return nil, fmt.Errorf("only enterprise users can be added to enterprises (user type: %s)", userType)
	}

	// Check if user is already in enterprise
	existingID, err := s.repo.CheckUserMembership(ctx, enterpriseID, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to check membership: %w", err)
	}

	if existingID != 0 {
		return nil, fmt.Errorf("user is already a member of this enterprise (enterprise_user_id: %d)", existingID)
	}

	// Get default role
	defaultRoleID, err := s.repo.GetDefaultRole(ctx, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get default role: %w", err)
	}

	var defaultRoleIDPtr *uint
	if defaultRoleID != 0 {
		defaultRoleIDPtr = &defaultRoleID
	}

	// Create enterprise user
	params := database.EnterpriseUserCreateParams{
		EnterpriseID:  enterpriseID,
		UserID:        req.UserID,
		Username:      username,
		Email:         email,
		DefaultRoleID: defaultRoleIDPtr,
		CreatedBy:     operatorID,
	}

	enterpriseUserID, err := s.repo.CreateEnterpriseUser(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise user: %w", err)
	}

	return &InviteUserResult{
		EnterpriseUserID: enterpriseUserID,
		UserID:           req.UserID,
		Username:         username,
		Email:            email,
		DefaultRoleID:    defaultRoleIDPtr,
	}, nil
}

// GetEnterpriseUser retrieves detailed information about an enterprise user
func (s *DefaultEnterpriseUserManagementService) GetEnterpriseUser(
	ctx context.Context,
	enterpriseID uint,
	userID uint,
) (*EnterpriseUserDetail, error) {
	// Get basic user info
	user, err := s.repo.GetEnterpriseUser(ctx, enterpriseID, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found in enterprise: %w", err)
	}

	// Get user roles (use UserID from users table, not EnterpriseUserID)
	roles, err := s.roleRepo.GetUserRoles(ctx, user.UserID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}

	// Convert roles to service format
	roleList := make([]EnterpriseRole, 0, len(roles))
	for _, role := range roles {
		roleList = append(roleList, EnterpriseRole{
			ID:          role.ID,
			RoleCode:    role.RoleCode,
			RoleName:    role.RoleName,
			Description: role.Description,
			IsActive:    role.IsActive,
			IsBuiltIn:   role.IsBuiltIn,
		})
	}

	return &EnterpriseUserDetail{
		UserID:           user.UserID,
		Username:         user.Username,
		Email:            user.Email,
		UserType:         user.UserType,
		Status:           user.UserStatus,
		EnterpriseUserID: user.EnterpriseUserID,
		EnterpriseID:     user.EnterpriseID,
		EnterpriseStatus: user.EnterpriseStatus,
		Roles:            roleList,
		CreatedAt:        user.CreatedAt,
		UpdatedAt:        user.UpdatedAt,
		LastLoginAt:      user.LastLoginAt,
	}, nil
}

// UpdateEnterpriseUserRoles updates the roles assigned to an enterprise user
func (s *DefaultEnterpriseUserManagementService) UpdateEnterpriseUserRoles(
	ctx context.Context,
	enterpriseID uint,
	userID uint,
	roleIDs []uint,
	operatorID uint,
) (*EnterpriseRoleUpdateResult, error) {
	// Get enterprise_user.id
	enterpriseUserID, err := s.repo.GetEnterpriseUserID(ctx, enterpriseID, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found in enterprise: %w", err)
	}

	// Get current roles (use userID from users table, not enterpriseUserID)
	currentRoles, err := s.roleRepo.GetUserRoles(ctx, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current roles: %w", err)
	}

	// Build current role ID set
	currentRoleIDs := make(map[uint]bool)
	for _, role := range currentRoles {
		currentRoleIDs[role.ID] = true
	}

	// Build new role ID set
	newRoleIDs := make(map[uint]bool)
	for _, roleID := range roleIDs {
		newRoleIDs[roleID] = true
	}

	// Determine which roles to add and which to remove
	rolesToAdd := make([]uint, 0)
	rolesToRemove := make([]uint, 0)

	for roleID := range newRoleIDs {
		if !currentRoleIDs[roleID] {
			rolesToAdd = append(rolesToAdd, roleID)
		}
	}

	for roleID := range currentRoleIDs {
		if !newRoleIDs[roleID] {
			rolesToRemove = append(rolesToRemove, roleID)
		}
	}

	// Add new roles
	rolesAdded := 0
	for _, roleID := range rolesToAdd {
		err = s.roleRepo.AssignRoleToUser(
			ctx,
			enterpriseUserID,
			enterpriseID,
			roleID,
			nil, // no expiration
			&operatorID,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to assign role %d: %w", roleID, err)
		}
		rolesAdded++
	}

	// Remove old roles
	rolesRemoved := 0
	for _, roleID := range rolesToRemove {
		err = s.roleRepo.RemoveRoleFromUser(ctx, enterpriseUserID, roleID)
		if err != nil {
			return nil, fmt.Errorf("failed to remove role %d: %w", roleID, err)
		}
		rolesRemoved++
	}

	// Get updated roles (use userID from users table, not enterpriseUserID)
	updatedRoles, err := s.roleRepo.GetUserRoles(ctx, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get updated roles: %w", err)
	}

	// Convert to service format
	roleList := make([]EnterpriseRole, 0, len(updatedRoles))
	for _, role := range updatedRoles {
		roleList = append(roleList, EnterpriseRole{
			ID:          role.ID,
			RoleCode:    role.RoleCode,
			RoleName:    role.RoleName,
			Description: role.Description,
			IsActive:    role.IsActive,
			IsBuiltIn:   role.IsBuiltIn,
		})
	}

	return &EnterpriseRoleUpdateResult{
		RolesAdded:   rolesAdded,
		RolesRemoved: rolesRemoved,
		CurrentRoles: roleList,
	}, nil
}

// RemoveEnterpriseUser removes a user from an enterprise
func (s *DefaultEnterpriseUserManagementService) RemoveEnterpriseUser(
	ctx context.Context,
	enterpriseID uint,
	userID uint,
	operatorID uint,
) (*RemoveUserResult, error) {
	// Get enterprise_user.id and username
	enterpriseUserID, username, err := s.repo.GetEnterpriseUserWithUsername(ctx, enterpriseID, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found in enterprise: %w", err)
	}

	// Get all user roles for statistics (use userID from users table, not enterpriseUserID)
	roles, err := s.roleRepo.GetUserRoles(ctx, userID, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user roles: %w", err)
	}

	// Remove all role assignments
	removedRolesCount := 0
	for _, role := range roles {
		err = s.roleRepo.RemoveRoleFromUser(ctx, enterpriseUserID, role.ID)
		if err == nil {
			removedRolesCount++
		}
		// Continue even if some role removals fail
	}

	// Soft delete enterprise_users record
	_, err = s.repo.RemoveEnterpriseUser(ctx, enterpriseUserID)
	if err != nil {
		return nil, fmt.Errorf("failed to remove enterprise user: %w", err)
	}

	return &RemoveUserResult{
		EnterpriseUserID: enterpriseUserID,
		UserID:           userID,
		Username:         username,
		RemovedRoles:     removedRolesCount,
	}, nil
}
