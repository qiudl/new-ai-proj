package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	// "ai-project-backend/utils"
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	// "strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// CompanyUserService provides business logic for managing company users
type CompanyUserService struct {
	userRepo    database.UserRepository
	companyRepo database.CompanyRepository
	auditLogger *AsyncAuditLogger
}

// NewCompanyUserService creates a new company user service
func NewCompanyUserService(userRepo database.UserRepository, companyRepo database.CompanyRepository, auditLogger *AsyncAuditLogger) *CompanyUserService {
	return &CompanyUserService{
		userRepo:    userRepo,
		companyRepo: companyRepo,
		auditLogger: auditLogger,
	}
}

// CreateCompanyUser creates a new company user
func (s *CompanyUserService) CreateCompanyUser(ctx context.Context, req *models.CompanyUserCreateRequest, operatorID int) (*models.User, string, error) {
	// Validate company exists
	company, err := s.companyRepo.GetByID(ctx, req.CompanyID)
	if err != nil {
		return nil, "", fmt.Errorf("company not found: %w", err)
	}

	// Check if username or email already exists
	existingByUsername, _ := s.userRepo.GetByUsername(ctx, req.Username)
	if existingByUsername != nil {
		return nil, "", fmt.Errorf("username '%s' already exists", req.Username)
	}

	existingByEmail, _ := s.userRepo.GetByEmail(ctx, req.Email)
	if existingByEmail != nil {
		return nil, "", fmt.Errorf("email '%s' already exists", req.Email)
	}

	// If this is set as primary contact, ensure no other primary contact exists for this company
	if req.IsPrimaryContact {
		existing, err := s.GetPrimaryContactForCompany(ctx, req.CompanyID)
		if err == nil && existing != nil {
			name := ""
			if existing.ContactPersonName != nil {
				name = *existing.ContactPersonName
			}
			return nil, "", fmt.Errorf("company already has a primary contact: %s", name)
		}
	}

	// Generate initial password
	initialPassword, err := s.generateRandomPassword()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate password: %w", err)
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(initialPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("failed to hash password: %w", err)
	}

	// Convert request to user model
	user := req.ToUser(string(passwordHash))
	
	// Create user
	createdUser, err := s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create user: %w", err)
	}

	// Log the creation event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "create",
		ResourceType: "company_user",
		ResourceID:   fmt.Sprintf("%d", createdUser.ID),
		Description:  fmt.Sprintf("Created company user %s for company %s", req.Username, company.CompanyName),
		Status:       "success",
	})

	return createdUser, initialPassword, nil
}

// GetCompanyUserByID gets a company user by ID with company information
func (s *CompanyUserService) GetCompanyUserByID(ctx context.Context, userID int) (*models.EnterpriseUserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if user.UserType != "company" {
		return nil, fmt.Errorf("user is not a company user")
	}

	if user.CompanyID == nil {
		return nil, fmt.Errorf("company user has no associated company")
	}

	company, err := s.companyRepo.GetByID(ctx, *user.CompanyID)
	if err != nil {
		return nil, fmt.Errorf("company not found: %w", err)
	}

	return s.userToCompanyUserResponse(user, company.CompanyName), nil
}

// UpdateCompanyUser updates a company user
func (s *CompanyUserService) UpdateCompanyUser(ctx context.Context, userID int, req *models.CompanyUserUpdateRequest, operatorID int) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if user.UserType != "company" {
		return nil, fmt.Errorf("user is not a company user")
	}

	// If setting as primary contact, ensure no other primary contact exists for this company
	if req.IsPrimaryContact != nil && *req.IsPrimaryContact && user.CompanyID != nil {
		existing, err := s.GetPrimaryContactForCompany(ctx, *user.CompanyID)
		if err == nil && existing != nil && existing.ID != userID {
			return nil, fmt.Errorf("company already has a primary contact: %s", *existing.ContactPersonName)
		}
	}

	// Apply updates
	req.ApplyUpdate(user)

	// Update user
	updatedUser, err := s.userRepo.Update(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Log the update event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "update",
		ResourceType: "company_user",
		ResourceID:   fmt.Sprintf("%d", userID),
		Description:  fmt.Sprintf("Updated company user %s", user.Username),
		Status:       "success",
	})

	return updatedUser, nil
}

// UpdateCompanyUserStatus updates a company user's status
func (s *CompanyUserService) UpdateCompanyUserStatus(ctx context.Context, userID int, status string, operatorID int) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if user.UserType != "company" {
		return nil, fmt.Errorf("user is not a company user")
	}

	oldStatus := user.Status
	user.Status = status
	user.UpdatedAt = time.Now()

	updatedUser, err := s.userRepo.Update(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to update user status: %w", err)
	}

	// Log the status change event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "update",
		ResourceType: "company_user",
		ResourceID:   fmt.Sprintf("%d", userID),
		Description:  fmt.Sprintf("Changed status of company user %s from %s to %s", user.Username, oldStatus, status),
		Status:       "success",
	})

	return updatedUser, nil
}

// ListCompanyUsers lists company users with pagination and filtering
func (s *CompanyUserService) ListCompanyUsers(ctx context.Context, params *models.CompanyUserListParams) (*models.CompanyUserListResponse, error) {
	// Set default values
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PageSize <= 0 {
		params.PageSize = 20
	}
	if params.PageSize > 100 {
		params.PageSize = 100 // Maximum page size
	}

	users, total, err := s.userRepo.ListCompanyUsersWithPagination(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to list company users: %w", err)
	}

	// Convert from []*EnterpriseUserResponse to []EnterpriseUserResponse
	data := make([]models.EnterpriseUserResponse, len(users))
	for i, user := range users {
		data[i] = *user
	}

	response := &models.CompanyUserListResponse{
		Data:     data,
		Total:    total,
		Page:     params.Page,
		PageSize: params.PageSize,
	}

	return response, nil
}

// GetPrimaryContactForCompany gets the primary contact for a company
func (s *CompanyUserService) GetPrimaryContactForCompany(ctx context.Context, companyID int) (*models.User, error) {
	user, err := s.userRepo.GetPrimaryContactByCompanyID(ctx, companyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get primary contact for company %d: %w", companyID, err)
	}
	
	return user, nil
}

// DeleteCompanyUser soft deletes a company user
func (s *CompanyUserService) DeleteCompanyUser(ctx context.Context, userID int, operatorID int) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if user.UserType != "company" {
		return fmt.Errorf("user is not a company user")
	}

	// Set status to inactive instead of hard delete
	user.Status = "inactive"
	user.UpdatedAt = time.Now()

	_, err = s.userRepo.Update(ctx, user)
	if err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	// Log the deletion event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "delete",
		ResourceType: "company_user",
		ResourceID:   fmt.Sprintf("%d", userID),
		Description:  fmt.Sprintf("Deleted company user %s", user.Username),
		Status:       "success",
	})

	return nil
}

// BatchUpdateCompanyUsers performs batch operations on company users
func (s *CompanyUserService) BatchUpdateCompanyUsers(ctx context.Context, req *models.BatchCompanyUserRequest, operatorID int) error {
	// Validate all user IDs exist and are company users
	for _, userID := range req.UserIDs {
		user, err := s.userRepo.GetByID(ctx, userID)
		if err != nil {
			return fmt.Errorf("user %d not found: %w", userID, err)
		}
		if user.UserType != "company" {
			return fmt.Errorf("user %d is not a company user", userID)
		}
	}

	// Perform batch operation
	switch req.Action {
	case "activate":
		return s.batchUpdateStatus(ctx, req.UserIDs, "active", operatorID)
	case "deactivate":
		return s.batchUpdateStatus(ctx, req.UserIDs, "inactive", operatorID)
	case "extend_expiry":
		return s.batchExtendExpiry(ctx, req.UserIDs, operatorID)
	default:
		return fmt.Errorf("unsupported batch action: %s", req.Action)
	}
}

// GetCompanyUserStats returns statistics about company users
func (s *CompanyUserService) GetCompanyUserStats(ctx context.Context) (*models.CompanyUserStats, error) {
	stats, err := s.userRepo.GetCompanyUserStatistics(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get company user statistics: %w", err)
	}
	
	return stats, nil
}

// Helper methods

// generateRandomPassword generates a secure random password
func (s *CompanyUserService) generateRandomPassword() (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	const length = 12

	password := make([]byte, length)
	for i := range password {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		password[i] = charset[num.Int64()]
	}

	return string(password), nil
}

// userToCompanyUserResponse converts User and company name to EnterpriseUserResponse
func (s *CompanyUserService) userToCompanyUserResponse(user *models.User, companyName string) *models.EnterpriseUserResponse {
	response := &models.EnterpriseUserResponse{
		ID:                user.ID,
		Username:          user.Username,
		Email:             user.Email,
		Status:            user.Status,
		CompanyID:         *user.CompanyID,
		CompanyName:       companyName,
		LastLoginAt:       user.LastLoginAt,
		AccountExpiresAt:  user.AccountExpiresAt,
		LastProjectAccess: user.LastProjectAccess,
		Notes:             user.Notes,
		CreatedAt:         user.CreatedAt,
		UpdatedAt:         user.UpdatedAt,
		IsPrimaryContact:  user.IsPrimaryContact,
	}

	// Handle potentially nil fields
	if user.ContactPersonName != nil {
		response.ContactPersonName = *user.ContactPersonName
	}
	if user.ContactPhone != nil {
		response.ContactPhone = *user.ContactPhone
	}
	if user.DepartmentTitle != nil {
		response.DepartmentTitle = *user.DepartmentTitle
	}

	return response
}

// batchUpdateStatus updates status for multiple users
func (s *CompanyUserService) batchUpdateStatus(ctx context.Context, userIDs []int, status string, operatorID int) error {
	for _, userID := range userIDs {
		_, err := s.UpdateCompanyUserStatus(ctx, userID, status, operatorID)
		if err != nil {
			return fmt.Errorf("failed to update status for user %d: %w", userID, err)
		}
	}
	
	// Log batch operation
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "batch_update",
		ResourceType: "company_user",
		Description:  fmt.Sprintf("Batch updated status to %s for %d users", status, len(userIDs)),
		Status:       "success",
	})

	return nil
}

// batchExtendExpiry extends expiry for multiple users
func (s *CompanyUserService) batchExtendExpiry(ctx context.Context, userIDs []int, operatorID int) error {
	// Extend expiry by 1 year from current time
	newExpiry := time.Now().AddDate(1, 0, 0)
	
	for _, userID := range userIDs {
		user, err := s.userRepo.GetByID(ctx, userID)
		if err != nil {
			return fmt.Errorf("failed to get user %d: %w", userID, err)
		}
		
		user.AccountExpiresAt = &newExpiry
		user.UpdatedAt = time.Now()
		
		_, err = s.userRepo.Update(ctx, user)
		if err != nil {
			return fmt.Errorf("failed to extend expiry for user %d: %w", userID, err)
		}
	}
	
	// Log batch operation
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "batch_update",
		ResourceType: "company_user",
		Description:  fmt.Sprintf("Batch extended expiry to %s for %d users", newExpiry.Format("2006-01-02"), len(userIDs)),
		Status:       "success",
	})

	return nil
}

// SendWelcomeEmail sends welcome email to new company user
func (s *CompanyUserService) SendWelcomeEmail(user *models.User, password string) error {
	// Email service implementation would go here
	// For now, this is a placeholder
	return nil
}

// IsAccountExpired checks if a company user account is expired
func (s *CompanyUserService) IsAccountExpired(user *models.User) bool {
	if user.AccountExpiresAt == nil {
		return false
	}
	return time.Now().After(*user.AccountExpiresAt)
}

// GetExpiringAccounts gets company users whose accounts are expiring soon
func (s *CompanyUserService) GetExpiringAccounts(ctx context.Context, days int) ([]*models.User, error) {
	users, err := s.userRepo.GetExpiringAccounts(ctx, days)
	if err != nil {
		return nil, fmt.Errorf("failed to get expiring accounts: %w", err)
	}
	
	return users, nil
}