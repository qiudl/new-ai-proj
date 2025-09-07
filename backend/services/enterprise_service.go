package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
)

// EnterpriseService provides business logic for managing enterprises
type EnterpriseService struct {
	enterpriseRepo database.EnterpriseRepository
	auditLogger    *AsyncAuditLogger
}

// NewEnterpriseService creates a new enterprise service
func NewEnterpriseService(enterpriseRepo database.EnterpriseRepository, auditLogger *AsyncAuditLogger) *EnterpriseService {
	return &EnterpriseService{
		enterpriseRepo: enterpriseRepo,
		auditLogger:    auditLogger,
	}
}

// Enterprise operations

// CreateEnterprise creates a new enterprise
func (s *EnterpriseService) CreateEnterprise(ctx context.Context, req *models.EnterpriseRequest, operatorID int) (*models.Enterprise, error) {
	// Check if code already exists
	existing, err := s.enterpriseRepo.GetByCode(ctx, req.Code)
	if err == nil && existing != nil {
		return nil, fmt.Errorf("enterprise code '%s' already exists", req.Code)
	}

	// Create enterprise object
	enterprise := &models.Enterprise{
		Name:                req.Name,
		Code:                req.Code,
		Description:         req.Description,
		IndustryType:        req.IndustryType,
		BusinessType:        req.BusinessType,
		RegistrationNumber:  req.RegistrationNumber,
		TaxID:              req.TaxID,
		LegalRepresentative: req.LegalRepresentative,
		ContactEmail:        req.ContactEmail,
		ContactPhone:        req.ContactPhone,
		Address:             req.Address,
		City:                req.City,
		Province:            req.Province,
		PostalCode:          req.PostalCode,
		Website:             req.Website,
		Status:              req.Status,
		CreatedBy:           &operatorID,
	}

	// Create enterprise
	createdEnterprise, err := s.enterpriseRepo.Create(ctx, enterprise)
	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise: %w", err)
	}

	// Log the creation event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "create",
		ResourceType: "enterprise",
		ResourceID:   fmt.Sprintf("%d", createdEnterprise.ID),
		Description:  fmt.Sprintf("Created enterprise %s (%s)", req.Name, req.Code),
		Status:       "success",
	})

	return createdEnterprise, nil
}

// GetEnterpriseByID gets an enterprise by ID
func (s *EnterpriseService) GetEnterpriseByID(ctx context.Context, id int) (*models.Enterprise, error) {
	enterprise, err := s.enterpriseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}

	return enterprise, nil
}

// GetEnterpriseByCode gets an enterprise by code
func (s *EnterpriseService) GetEnterpriseByCode(ctx context.Context, code string) (*models.Enterprise, error) {
	enterprise, err := s.enterpriseRepo.GetByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}

	return enterprise, nil
}

// UpdateEnterprise updates an enterprise
func (s *EnterpriseService) UpdateEnterprise(ctx context.Context, id int, req *models.EnterpriseUpdateRequest, operatorID int) (*models.Enterprise, error) {
	// Get existing enterprise
	enterprise, err := s.enterpriseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}

	// Check if code is being changed and conflicts with existing
	if req.Code != nil && *req.Code != enterprise.Code {
		existing, err := s.enterpriseRepo.GetByCode(ctx, *req.Code)
		if err == nil && existing != nil && existing.ID != id {
			return nil, fmt.Errorf("enterprise code '%s' already exists", *req.Code)
		}
	}

	// Update fields only if provided
	if req.Name != nil {
		enterprise.Name = *req.Name
	}
	if req.Code != nil {
		enterprise.Code = *req.Code
	}
	if req.Description != nil {
		enterprise.Description = req.Description
	}
	if req.IndustryType != nil {
		enterprise.IndustryType = req.IndustryType
	}
	if req.BusinessType != nil {
		enterprise.BusinessType = *req.BusinessType
	}
	if req.RegistrationNumber != nil {
		enterprise.RegistrationNumber = req.RegistrationNumber
	}
	if req.TaxID != nil {
		enterprise.TaxID = req.TaxID
	}
	if req.LegalRepresentative != nil {
		enterprise.LegalRepresentative = req.LegalRepresentative
	}
	if req.ContactEmail != nil {
		enterprise.ContactEmail = req.ContactEmail
	}
	if req.ContactPhone != nil {
		enterprise.ContactPhone = req.ContactPhone
	}
	if req.Address != nil {
		enterprise.Address = req.Address
	}
	if req.City != nil {
		enterprise.City = req.City
	}
	if req.Province != nil {
		enterprise.Province = req.Province
	}
	if req.PostalCode != nil {
		enterprise.PostalCode = req.PostalCode
	}
	if req.Website != nil {
		enterprise.Website = req.Website
	}
	if req.Status != nil {
		enterprise.Status = *req.Status
	}
	enterprise.UpdatedBy = &operatorID

	// Update enterprise
	updatedEnterprise, err := s.enterpriseRepo.Update(ctx, enterprise)
	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise: %w", err)
	}

	// Log the update event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "update",
		ResourceType: "enterprise",
		ResourceID:   fmt.Sprintf("%d", id),
		Description:  fmt.Sprintf("Updated enterprise %s (%s)", req.Name, req.Code),
		Status:       "success",
	})

	return updatedEnterprise, nil
}

// DeleteEnterprise soft deletes an enterprise
func (s *EnterpriseService) DeleteEnterprise(ctx context.Context, id int, operatorID int) error {
	// Check if enterprise exists
	enterprise, err := s.enterpriseRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("enterprise not found: %w", err)
	}

	// Delete enterprise
	err = s.enterpriseRepo.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete enterprise: %w", err)
	}

	// Log the deletion event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "delete",
		ResourceType: "enterprise",
		ResourceID:   fmt.Sprintf("%d", id),
		Description:  fmt.Sprintf("Deleted enterprise %s (%s)", enterprise.Name, enterprise.Code),
		Status:       "success",
	})

	return nil
}

// ListEnterprises lists enterprises with pagination and filtering
func (s *EnterpriseService) ListEnterprises(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Enterprise, int, error) {
	enterprises, total, err := s.enterpriseRepo.List(ctx, limit, offset, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list enterprises: %w", err)
	}

	return enterprises, total, nil
}

// GetEnterpriseStats returns statistics about enterprises
func (s *EnterpriseService) GetEnterpriseStats(ctx context.Context) (*models.EnterpriseStats, error) {
	stats, err := s.enterpriseRepo.GetStats(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise statistics: %w", err)
	}

	return stats, nil
}

// Enterprise User operations

// CreateEnterpriseUser creates a new enterprise user with generated password
func (s *EnterpriseService) CreateEnterpriseUser(ctx context.Context, req *models.EnterpriseUserRequest, operatorID int) (*models.EnterpriseUser, string, error) {
	// Validate enterprise exists
	_, err := s.enterpriseRepo.GetByID(ctx, req.EnterpriseID)
	if err != nil {
		return nil, "", fmt.Errorf("enterprise not found: %w", err)
	}

	// Check if username already exists in this enterprise
	users, _, err := s.enterpriseRepo.GetUsers(ctx, req.EnterpriseID, 1000, 0) // Get all users
	if err != nil {
		return nil, "", fmt.Errorf("failed to check existing users: %w", err)
	}

	for _, user := range users {
		if user.Username == req.Username {
			return nil, "", fmt.Errorf("username '%s' already exists in this enterprise", req.Username)
		}
	}

	// If this is set as primary contact, ensure no other primary contact exists for this enterprise
	if req.IsPrimaryContact {
		existing, err := s.GetEnterprisePrimaryContact(ctx, req.EnterpriseID)
		if err == nil && existing != nil {
			return nil, "", fmt.Errorf("enterprise already has a primary contact: %s", existing.Name)
		}
	}

	// Generate initial password
	initialPassword, err := s.generateRandomPassword()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate password: %w", err)
	}

	// Create user object
	user := &models.EnterpriseUser{
		EnterpriseID:     req.EnterpriseID,
		Username:         req.Username,
		Email:            req.Email,
		Name:             req.Name,
		Phone:            req.Phone,
		Position:         req.Position,
		IsPrimaryContact: req.IsPrimaryContact,
		AccessLevel:      req.AccessLevel,
		Status:           req.Status,
		Bio:              req.Bio,
		CreatedBy:        &operatorID,
	}

	// Create user
	createdUser, err := s.enterpriseRepo.CreateUser(ctx, user)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create enterprise user: %w", err)
	}

	// Log the creation event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "create",
		ResourceType: "enterprise_user",
		ResourceID:   fmt.Sprintf("%d", createdUser.ID),
		Description:  fmt.Sprintf("Created enterprise user %s for enterprise %d", req.Username, req.EnterpriseID),
		Status:       "success",
	})

	return createdUser, initialPassword, nil
}

// GetEnterpriseUserByID gets an enterprise user by ID
func (s *EnterpriseService) GetEnterpriseUserByID(ctx context.Context, userID int) (*models.EnterpriseUser, error) {
	user, err := s.enterpriseRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("enterprise user not found: %w", err)
	}

	return user, nil
}

// UpdateEnterpriseUser updates an enterprise user
func (s *EnterpriseService) UpdateEnterpriseUser(ctx context.Context, userID int, req *models.EnterpriseUserRequest, operatorID int) (*models.EnterpriseUser, error) {
	// Get existing user
	user, err := s.enterpriseRepo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("enterprise user not found: %w", err)
	}

	// If setting as primary contact, ensure no other primary contact exists for this enterprise
	if req.IsPrimaryContact && !user.IsPrimaryContact {
		existing, err := s.GetEnterprisePrimaryContact(ctx, user.EnterpriseID)
		if err == nil && existing != nil && existing.ID != userID {
			return nil, fmt.Errorf("enterprise already has a primary contact: %s", existing.Name)
		}
	}

	// Update fields
	user.Username = req.Username
	user.Email = req.Email
	user.Name = req.Name
	user.Phone = req.Phone
	user.Position = req.Position
	user.IsPrimaryContact = req.IsPrimaryContact
	user.AccessLevel = req.AccessLevel
	user.Status = req.Status
	user.Bio = req.Bio
	user.UpdatedBy = &operatorID

	// Update user
	updatedUser, err := s.enterpriseRepo.UpdateUser(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise user: %w", err)
	}

	// Log the update event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "update",
		ResourceType: "enterprise_user",
		ResourceID:   fmt.Sprintf("%d", userID),
		Description:  fmt.Sprintf("Updated enterprise user %s", user.Username),
		Status:       "success",
	})

	return updatedUser, nil
}

// DeleteEnterpriseUser soft deletes an enterprise user
func (s *EnterpriseService) DeleteEnterpriseUser(ctx context.Context, userID int, operatorID int) error {
	// Get user for logging
	user, err := s.enterpriseRepo.GetUserByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("enterprise user not found: %w", err)
	}

	// Delete user
	err = s.enterpriseRepo.DeleteUser(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to delete enterprise user: %w", err)
	}

	// Log the deletion event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "delete",
		ResourceType: "enterprise_user",
		ResourceID:   fmt.Sprintf("%d", userID),
		Description:  fmt.Sprintf("Deleted enterprise user %s", user.Username),
		Status:       "success",
	})

	return nil
}

// GetEnterpriseUsers lists users for an enterprise
func (s *EnterpriseService) GetEnterpriseUsers(ctx context.Context, enterpriseID int, limit, offset int) ([]*models.EnterpriseUser, int, error) {
	// Validate enterprise exists
	_, err := s.enterpriseRepo.GetByID(ctx, enterpriseID)
	if err != nil {
		return nil, 0, fmt.Errorf("enterprise not found: %w", err)
	}

	users, total, err := s.enterpriseRepo.GetUsers(ctx, enterpriseID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get enterprise users: %w", err)
	}

	return users, total, nil
}

// GetEnterprisePrimaryContact gets the primary contact for an enterprise
func (s *EnterpriseService) GetEnterprisePrimaryContact(ctx context.Context, enterpriseID int) (*models.EnterpriseUser, error) {
	user, err := s.enterpriseRepo.GetPrimaryContact(ctx, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get primary contact for enterprise %d: %w", enterpriseID, err)
	}

	return user, nil
}

// Enterprise Department operations

// CreateEnterpriseDepartment creates a new enterprise department
func (s *EnterpriseService) CreateEnterpriseDepartment(ctx context.Context, req *models.EnterpriseDepartmentRequest, operatorID int) (*models.EnterpriseDepartment, error) {
	// Validate enterprise exists
	_, err := s.enterpriseRepo.GetByID(ctx, req.EnterpriseID)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}

	// Validate parent department if specified
	if req.ParentID != nil {
		parent, err := s.enterpriseRepo.GetDepartmentByID(ctx, *req.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent department not found: %w", err)
		}
		if parent.EnterpriseID != req.EnterpriseID {
			return nil, fmt.Errorf("parent department belongs to different enterprise")
		}
	}

	// Create department object
	dept := &models.EnterpriseDepartment{
		EnterpriseID:  req.EnterpriseID,
		Name:          req.Name,
		ParentID:      req.ParentID,
		SortOrder:     req.SortOrder,
		ManagerID:     req.ManagerID,
		Description:   req.Description,
		EmployeeCount: req.EmployeeCount,
		Status:        req.Status,
		CreatedBy:     &operatorID,
	}

	// Create department
	createdDept, err := s.enterpriseRepo.CreateDepartment(ctx, dept)
	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise department: %w", err)
	}

	// Log the creation event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "create",
		ResourceType: "enterprise_department",
		ResourceID:   fmt.Sprintf("%d", createdDept.ID),
		Description:  fmt.Sprintf("Created enterprise department %s for enterprise %d", req.Name, req.EnterpriseID),
		Status:       "success",
	})

	return createdDept, nil
}

// GetEnterpriseDepartmentByID gets an enterprise department by ID
func (s *EnterpriseService) GetEnterpriseDepartmentByID(ctx context.Context, id int) (*models.EnterpriseDepartment, error) {
	dept, err := s.enterpriseRepo.GetDepartmentByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise department not found: %w", err)
	}

	return dept, nil
}

// UpdateEnterpriseDepartment updates an enterprise department
func (s *EnterpriseService) UpdateEnterpriseDepartment(ctx context.Context, id int, req *models.EnterpriseDepartmentRequest, operatorID int) (*models.EnterpriseDepartment, error) {
	// Get existing department
	dept, err := s.enterpriseRepo.GetDepartmentByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise department not found: %w", err)
	}

	// Validate parent department if specified
	if req.ParentID != nil {
		parent, err := s.enterpriseRepo.GetDepartmentByID(ctx, *req.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent department not found: %w", err)
		}
		if parent.EnterpriseID != dept.EnterpriseID {
			return nil, fmt.Errorf("parent department belongs to different enterprise")
		}
		// Prevent circular reference
		if *req.ParentID == id {
			return nil, fmt.Errorf("department cannot be its own parent")
		}
	}

	// Update fields
	dept.Name = req.Name
	dept.ParentID = req.ParentID
	dept.SortOrder = req.SortOrder
	dept.ManagerID = req.ManagerID
	dept.Description = req.Description
	dept.EmployeeCount = req.EmployeeCount
	dept.Status = req.Status
	dept.UpdatedBy = &operatorID

	// Update department
	updatedDept, err := s.enterpriseRepo.UpdateDepartment(ctx, dept)
	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise department: %w", err)
	}

	// Log the update event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "update",
		ResourceType: "enterprise_department",
		ResourceID:   fmt.Sprintf("%d", id),
		Description:  fmt.Sprintf("Updated enterprise department %s", dept.Name),
		Status:       "success",
	})

	return updatedDept, nil
}

// DeleteEnterpriseDepartment soft deletes an enterprise department
func (s *EnterpriseService) DeleteEnterpriseDepartment(ctx context.Context, id int, operatorID int) error {
	// Get department for logging
	dept, err := s.enterpriseRepo.GetDepartmentByID(ctx, id)
	if err != nil {
		return fmt.Errorf("enterprise department not found: %w", err)
	}

	// Check if department has children (you might want to prevent deletion)
	children, err := s.GetEnterpriseDepartments(ctx, dept.EnterpriseID)
	if err != nil {
		return fmt.Errorf("failed to check department children: %w", err)
	}

	for _, child := range children {
		if child.ParentID != nil && *child.ParentID == id {
			return fmt.Errorf("cannot delete department with child departments")
		}
	}

	// Delete department
	err = s.enterpriseRepo.DeleteDepartment(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete enterprise department: %w", err)
	}

	// Log the deletion event
	s.auditLogger.LogEvent(&models.AuditEventData{
		UserID:       &operatorID,
		Action:       "delete",
		ResourceType: "enterprise_department",
		ResourceID:   fmt.Sprintf("%d", id),
		Description:  fmt.Sprintf("Deleted enterprise department %s", dept.Name),
		Status:       "success",
	})

	return nil
}

// GetEnterpriseDepartments lists departments for an enterprise
func (s *EnterpriseService) GetEnterpriseDepartments(ctx context.Context, enterpriseID int) ([]*models.EnterpriseDepartment, error) {
	// Validate enterprise exists
	_, err := s.enterpriseRepo.GetByID(ctx, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}

	departments, err := s.enterpriseRepo.GetDepartments(ctx, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise departments: %w", err)
	}

	return departments, nil
}

// GetEnterpriseDepartmentStats returns department statistics for an enterprise
func (s *EnterpriseService) GetEnterpriseDepartmentStats(ctx context.Context, enterpriseID int) (*models.EnterpriseDepartmentStats, error) {
	// Validate enterprise exists
	_, err := s.enterpriseRepo.GetByID(ctx, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}

	stats, err := s.enterpriseRepo.GetDepartmentStats(ctx, enterpriseID)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise department statistics: %w", err)
	}

	return stats, nil
}

// Helper methods

// generateRandomPassword generates a secure random password
func (s *EnterpriseService) generateRandomPassword() (string, error) {
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

// SendWelcomeEmail sends welcome email to new enterprise user
func (s *EnterpriseService) SendWelcomeEmail(user *models.EnterpriseUser, password string) error {
	// Email service implementation would go here
	// For now, this is a placeholder
	return nil
}

// IsAccountExpired checks if an enterprise user account is expired (placeholder for future implementation)
func (s *EnterpriseService) IsAccountExpired(user *models.EnterpriseUser) bool {
	// Enterprise users don't have expiration by default in this implementation
	// This can be extended in the future
	return false
}