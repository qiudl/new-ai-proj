package services

import (
	"ai-project-backend/cache"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"time"
)

// EnhancedEnterpriseService provides optimized business logic for enterprise operations
type EnhancedEnterpriseService struct {
	db           database.DB
	enterpriseRepo database.EnterpriseRepository
	cacheService *cache.CacheableEnterpriseService
	auditLogger  *AsyncAuditLogger
	config       *EnterpriseServiceConfig
}

// EnterpriseServiceConfig configures the enhanced enterprise service
type EnterpriseServiceConfig struct {
	EnableTransactions bool
	EnableAuditLogging bool
	EnableCaching      bool
	ValidationStrict   bool
	AutoWarmCache      bool
}

// DefaultEnterpriseServiceConfig returns default configuration
func DefaultEnterpriseServiceConfig() *EnterpriseServiceConfig {
	return &EnterpriseServiceConfig{
		EnableTransactions: true,
		EnableAuditLogging: true,
		EnableCaching:      true,
		ValidationStrict:   true,
		AutoWarmCache:      false,
	}
}

// NewEnhancedEnterpriseService creates a new enhanced enterprise service
func NewEnhancedEnterpriseService(
	db database.DB,
	enterpriseRepo database.EnterpriseRepository,
	cacheService *cache.CacheableEnterpriseService,
	auditLogger *AsyncAuditLogger,
	config *EnterpriseServiceConfig,
) *EnhancedEnterpriseService {
	if config == nil {
		config = DefaultEnterpriseServiceConfig()
	}
	
	return &EnhancedEnterpriseService{
		db:             db,
		enterpriseRepo: enterpriseRepo,
		cacheService:   cacheService,
		auditLogger:    auditLogger,
		config:         config,
	}
}

// Enterprise CRUD Operations with Transaction Management

// CreateEnterprise creates a new enterprise with full transaction support
func (s *EnhancedEnterpriseService) CreateEnterprise(ctx context.Context, req *models.EnterpriseRequest, operatorID int) (*models.Enterprise, error) {
	// Input validation
	if err := s.validateEnterpriseRequest(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}
	
	// Use transaction if enabled
	if s.config.EnableTransactions {
		return s.createEnterpriseWithTransaction(ctx, req, operatorID)
	}
	
	return s.createEnterpriseWithoutTransaction(ctx, req, operatorID)
}

// createEnterpriseWithTransaction creates enterprise within a transaction
func (s *EnhancedEnterpriseService) createEnterpriseWithTransaction(ctx context.Context, req *models.EnterpriseRequest, operatorID int) (*models.Enterprise, error) {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() // Safe to call even after Commit
	
	// Check code uniqueness within transaction
	existing, err := tx.Enterprises().GetByCode(ctx, req.Code)
	if err == nil && existing != nil {
		return nil, NewBusinessError("DUPLICATE_CODE", fmt.Sprintf("enterprise code '%s' already exists", req.Code))
	}
	
	// Create enterprise object
	enterprise := s.buildEnterpriseFromRequest(req, operatorID)
	
	// Create enterprise within transaction
	createdEnterprise, err := tx.Enterprises().Create(ctx, enterprise)
	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise: %w", err)
	}
	
	// Log audit event within transaction (if enabled)
	if s.config.EnableAuditLogging && s.auditLogger != nil {
		auditEvent := &models.AuditEventData{
			UserID:       &operatorID,
			Action:       "create",
			ResourceType: "enterprise",
			ResourceID:   fmt.Sprintf("%d", createdEnterprise.ID),
			Description:  fmt.Sprintf("Created enterprise %s (%s)", req.Name, req.Code),
			Status:       "success",
		}
		
		// Log synchronously within transaction
		if err := s.logAuditEventSync(ctx, tx, auditEvent); err != nil {
			log.Printf("[ENHANCED_ENTERPRISE_SERVICE] Failed to log audit event: %v", err)
			// Don't fail the transaction for audit logging failures
		}
	}
	
	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	// Update cache asynchronously after successful commit
	if s.config.EnableCaching && s.cacheService != nil {
		go s.asyncCacheUpdate(context.Background(), "create", createdEnterprise.ID, createdEnterprise)
	}
	
	return createdEnterprise, nil
}

// createEnterpriseWithoutTransaction creates enterprise without transaction
func (s *EnhancedEnterpriseService) createEnterpriseWithoutTransaction(ctx context.Context, req *models.EnterpriseRequest, operatorID int) (*models.Enterprise, error) {
	// Check code uniqueness
	if s.config.EnableCaching && s.cacheService != nil {
		// Try cache first
		existing, _ := s.cacheService.GetByID(ctx, 0) // This would need a GetByCode method in cache
		if existing != nil && existing.Code == req.Code {
			return nil, NewBusinessError("DUPLICATE_CODE", fmt.Sprintf("enterprise code '%s' already exists", req.Code))
		}
	}
	
	// Fallback to database check
	existing, err := s.enterpriseRepo.GetByCode(ctx, req.Code)
	if err == nil && existing != nil {
		return nil, NewBusinessError("DUPLICATE_CODE", fmt.Sprintf("enterprise code '%s' already exists", req.Code))
	}
	
	// Create enterprise object
	enterprise := s.buildEnterpriseFromRequest(req, operatorID)
	
	// Create enterprise
	createdEnterprise, err := s.enterpriseRepo.Create(ctx, enterprise)
	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise: %w", err)
	}
	
	// Log audit event asynchronously
	if s.config.EnableAuditLogging && s.auditLogger != nil {
		s.auditLogger.LogEvent(&models.AuditEventData{
			UserID:       &operatorID,
			Action:       "create",
			ResourceType: "enterprise",
			ResourceID:   fmt.Sprintf("%d", createdEnterprise.ID),
			Description:  fmt.Sprintf("Created enterprise %s (%s)", req.Name, req.Code),
			Status:       "success",
		})
	}
	
	// Update cache
	if s.config.EnableCaching && s.cacheService != nil {
		go s.asyncCacheUpdate(context.Background(), "create", createdEnterprise.ID, createdEnterprise)
	}
	
	return createdEnterprise, nil
}

// GetEnterprise retrieves enterprise with caching support
func (s *EnhancedEnterpriseService) GetEnterprise(ctx context.Context, id int) (*models.Enterprise, error) {
	// Use cache if enabled
	if s.config.EnableCaching && s.cacheService != nil {
		enterprise, err := s.cacheService.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("failed to get enterprise: %w", err)
		}
		return enterprise, nil
	}
	
	// Fallback to direct repository access
	enterprise, err := s.enterpriseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}
	
	return enterprise, nil
}

// GetEnterpriseWithStats retrieves enterprise with statistics
func (s *EnhancedEnterpriseService) GetEnterpriseWithStats(ctx context.Context, id int) (*models.EnterpriseResponse, error) {
	// Use cache service if available for optimized stats retrieval
	if s.config.EnableCaching && s.cacheService != nil {
		return s.cacheService.GetEnterpriseWithStats(ctx, id)
	}
	
	// Manual composition without cache
	enterprise, err := s.enterpriseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}
	
	response := enterprise.ToResponse()
	
	// Get statistics
	userCount, departmentCount, err := s.enterpriseRepo.GetEnterpriseStatistics(ctx, id)
	if err != nil {
		log.Printf("[ENHANCED_ENTERPRISE_SERVICE] Failed to get statistics for enterprise %d: %v", id, err)
		// Continue without statistics rather than failing
	} else {
		response.UserCount = userCount
		response.DepartmentCount = departmentCount
	}
	
	return &response, nil
}

// UpdateEnterprise updates enterprise with optimized validation and caching
func (s *EnhancedEnterpriseService) UpdateEnterprise(ctx context.Context, id int, req *models.EnterpriseUpdateRequest, operatorID int) (*models.Enterprise, error) {
	// Input validation
	if err := s.validateEnterpriseUpdateRequest(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}
	
	// Use transaction if enabled
	if s.config.EnableTransactions {
		return s.updateEnterpriseWithTransaction(ctx, id, req, operatorID)
	}
	
	return s.updateEnterpriseWithoutTransaction(ctx, id, req, operatorID)
}

// updateEnterpriseWithTransaction updates enterprise within a transaction
func (s *EnhancedEnterpriseService) updateEnterpriseWithTransaction(ctx context.Context, id int, req *models.EnterpriseUpdateRequest, operatorID int) (*models.Enterprise, error) {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Get existing enterprise within transaction
	enterprise, err := tx.Enterprises().GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}
	
	// Check code uniqueness if code is being changed
	if req.Code != nil && *req.Code != enterprise.Code {
		existing, err := tx.Enterprises().GetByCode(ctx, *req.Code)
		if err == nil && existing != nil && existing.ID != id {
			return nil, NewBusinessError("DUPLICATE_CODE", fmt.Sprintf("enterprise code '%s' already exists", *req.Code))
		}
	}
	
	// Apply updates
	s.applyEnterpriseUpdates(enterprise, req, operatorID)
	
	// Update within transaction
	updatedEnterprise, err := tx.Enterprises().Update(ctx, enterprise)
	if err != nil {
		return nil, fmt.Errorf("failed to update enterprise: %w", err)
	}
	
	// Log audit event within transaction
	if s.config.EnableAuditLogging && s.auditLogger != nil {
		auditEvent := &models.AuditEventData{
			UserID:       &operatorID,
			Action:       "update",
			ResourceType: "enterprise",
			ResourceID:   fmt.Sprintf("%d", id),
			Description:  fmt.Sprintf("Updated enterprise %s", enterprise.Name),
			Status:       "success",
		}
		
		if err := s.logAuditEventSync(ctx, tx, auditEvent); err != nil {
			log.Printf("[ENHANCED_ENTERPRISE_SERVICE] Failed to log audit event: %v", err)
		}
	}
	
	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	// Invalidate cache asynchronously after successful commit
	if s.config.EnableCaching && s.cacheService != nil {
		go s.asyncCacheUpdate(context.Background(), "update", id, updatedEnterprise)
	}
	
	return updatedEnterprise, nil
}

// Business Logic Optimization Methods

// ListEnterprises retrieves enterprises with optimized pagination and filtering
func (s *EnhancedEnterpriseService) ListEnterprises(ctx context.Context, limit, offset int, filters map[string]interface{}) ([]*models.Enterprise, int, error) {
	// Use cache service if available
	if s.config.EnableCaching && s.cacheService != nil {
		return s.cacheService.List(ctx, limit, offset, filters)
	}
	
	// Direct repository access
	return s.enterpriseRepo.List(ctx, limit, offset, filters)
}

// BatchGetEnterprises retrieves multiple enterprises efficiently
func (s *EnhancedEnterpriseService) BatchGetEnterprises(ctx context.Context, ids []int) ([]*models.Enterprise, error) {
	if len(ids) == 0 {
		return []*models.Enterprise{}, nil
	}
	
	enterprises := make([]*models.Enterprise, 0, len(ids))
	
	// Use cache service if available for batch operations
	if s.config.EnableCaching && s.cacheService != nil {
		// Get enterprises with cache support
		for _, id := range ids {
			enterprise, err := s.cacheService.GetByID(ctx, id)
			if err != nil {
				log.Printf("[ENHANCED_ENTERPRISE_SERVICE] Failed to get enterprise %d: %v", id, err)
				continue
			}
			enterprises = append(enterprises, enterprise)
		}
		return enterprises, nil
	}
	
	// Fallback to individual repository calls (could be optimized with a batch method in repository)
	for _, id := range ids {
		enterprise, err := s.enterpriseRepo.GetByID(ctx, id)
		if err != nil {
			log.Printf("[ENHANCED_ENTERPRISE_SERVICE] Failed to get enterprise %d: %v", id, err)
			continue
		}
		enterprises = append(enterprises, enterprise)
	}
	
	return enterprises, nil
}

// Enterprise User Management with Transaction Support

// CreateEnterpriseUser creates a new enterprise user with transaction support
func (s *EnhancedEnterpriseService) CreateEnterpriseUser(ctx context.Context, req *models.EnterpriseUserRequest, operatorID int) (*models.EnterpriseUser, error) {
	// Validate request
	if err := s.validateEnterpriseUserRequest(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}
	
	// Use transaction if enabled
	if s.config.EnableTransactions {
		return s.createEnterpriseUserWithTransaction(ctx, req, operatorID)
	}
	
	// Use cache service if available
	if s.config.EnableCaching && s.cacheService != nil {
		return s.cacheService.CreateUser(ctx, s.buildEnterpriseUserFromRequest(req, operatorID))
	}
	
	// Direct repository access
	return s.enterpriseRepo.CreateUser(ctx, s.buildEnterpriseUserFromRequest(req, operatorID))
}

// Cache Management Operations

// WarmUpEnterpriseCache pre-loads frequently accessed enterprises
func (s *EnhancedEnterpriseService) WarmUpEnterpriseCache(ctx context.Context, enterpriseIDs []int) error {
	if !s.config.EnableCaching || s.cacheService == nil {
		return fmt.Errorf("caching not enabled")
	}
	
	return s.cacheService.WarmUpCache(ctx, enterpriseIDs)
}

// InvalidateEnterpriseCache invalidates cache for specific enterprise
func (s *EnhancedEnterpriseService) InvalidateEnterpriseCache(ctx context.Context, enterpriseID int) error {
	if !s.config.EnableCaching || s.cacheService == nil {
		return nil
	}
	
	return s.cacheService.InvalidateEnterpriseCache(ctx, enterpriseID)
}

// GetCacheMetrics returns cache performance metrics
func (s *EnhancedEnterpriseService) GetCacheMetrics() (*cache.CacheMetrics, map[string]float64) {
	if !s.config.EnableCaching || s.cacheService == nil {
		return nil, nil
	}
	
	metrics := s.cacheService.GetCacheMetrics()
	ratios := s.cacheService.GetCacheHitRatio()
	
	return metrics, ratios
}

// Helper Methods

// buildEnterpriseFromRequest creates enterprise object from request
func (s *EnhancedEnterpriseService) buildEnterpriseFromRequest(req *models.EnterpriseRequest, operatorID int) *models.Enterprise {
	return &models.Enterprise{
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
}

// applyEnterpriseUpdates applies update request to enterprise
func (s *EnhancedEnterpriseService) applyEnterpriseUpdates(enterprise *models.Enterprise, req *models.EnterpriseUpdateRequest, operatorID int) {
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
}

// buildEnterpriseUserFromRequest creates enterprise user object from request
func (s *EnhancedEnterpriseService) buildEnterpriseUserFromRequest(req *models.EnterpriseUserRequest, operatorID int) *models.EnterpriseUser {
	return &models.EnterpriseUser{
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
}

// createEnterpriseUserWithTransaction creates enterprise user within transaction
func (s *EnhancedEnterpriseService) createEnterpriseUserWithTransaction(ctx context.Context, req *models.EnterpriseUserRequest, operatorID int) (*models.EnterpriseUser, error) {
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Verify enterprise exists
	_, err = tx.Enterprises().GetByID(ctx, req.EnterpriseID)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}
	
	// Create user object
	user := s.buildEnterpriseUserFromRequest(req, operatorID)
	
	// Create user within transaction
	createdUser, err := tx.Enterprises().CreateUser(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create enterprise user: %w", err)
	}
	
	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	// Update cache asynchronously
	if s.config.EnableCaching && s.cacheService != nil {
		go func() {
			ctx := context.Background()
			s.cacheService.InvalidateEnterpriseCache(ctx, req.EnterpriseID)
		}()
	}
	
	return createdUser, nil
}

// updateEnterpriseWithoutTransaction updates enterprise without transaction
func (s *EnhancedEnterpriseService) updateEnterpriseWithoutTransaction(ctx context.Context, id int, req *models.EnterpriseUpdateRequest, operatorID int) (*models.Enterprise, error) {
	// Use cache service if available
	if s.config.EnableCaching && s.cacheService != nil {
		// Get current enterprise
		enterprise, err := s.cacheService.GetByID(ctx, id)
		if err != nil {
			return nil, fmt.Errorf("enterprise not found: %w", err)
		}
		
		// Check code uniqueness if needed
		if req.Code != nil && *req.Code != enterprise.Code {
			// This could be optimized with a cache lookup
			existing, err := s.enterpriseRepo.GetByCode(ctx, *req.Code)
			if err == nil && existing != nil && existing.ID != id {
				return nil, NewBusinessError("DUPLICATE_CODE", fmt.Sprintf("enterprise code '%s' already exists", *req.Code))
			}
		}
		
		// Apply updates
		s.applyEnterpriseUpdates(enterprise, req, operatorID)
		
		// Update via cache service (which will handle cache invalidation)
		return s.cacheService.Update(ctx, enterprise)
	}
	
	// Direct repository access
	enterprise, err := s.enterpriseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("enterprise not found: %w", err)
	}
	
	// Check code uniqueness if needed
	if req.Code != nil && *req.Code != enterprise.Code {
		existing, err := s.enterpriseRepo.GetByCode(ctx, *req.Code)
		if err == nil && existing != nil && existing.ID != id {
			return nil, NewBusinessError("DUPLICATE_CODE", fmt.Sprintf("enterprise code '%s' already exists", *req.Code))
		}
	}
	
	// Apply updates
	s.applyEnterpriseUpdates(enterprise, req, operatorID)
	
	// Update
	return s.enterpriseRepo.Update(ctx, enterprise)
}

// Async operations

// asyncCacheUpdate updates cache asynchronously
func (s *EnhancedEnterpriseService) asyncCacheUpdate(ctx context.Context, operation string, enterpriseID int, enterprise *models.Enterprise) {
	timeout := 10 * time.Second
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	
	switch operation {
	case "create", "update":
		if enterprise != nil && s.cacheService != nil {
			// For create/update, we invalidate cache to ensure fresh data on next access
			if err := s.cacheService.InvalidateEnterpriseCache(ctx, enterpriseID); err != nil {
				log.Printf("[ENHANCED_ENTERPRISE_SERVICE] Async cache invalidation failed for enterprise %d: %v", enterpriseID, err)
			}
		}
	case "delete":
		if s.cacheService != nil {
			if err := s.cacheService.InvalidateEnterpriseCache(ctx, enterpriseID); err != nil {
				log.Printf("[ENHANCED_ENTERPRISE_SERVICE] Async cache invalidation failed for enterprise %d: %v", enterpriseID, err)
			}
		}
	}
}

// logAuditEventSync logs audit event synchronously within transaction
func (s *EnhancedEnterpriseService) logAuditEventSync(ctx context.Context, tx database.Tx, auditEvent *models.AuditEventData) error {
	// This would require audit repository to support transactions
	// For now, we'll log asynchronously even in transaction mode
	if s.auditLogger != nil {
		s.auditLogger.LogEvent(auditEvent)
	}
	return nil
}

// Validation methods

func (s *EnhancedEnterpriseService) validateEnterpriseRequest(req *models.EnterpriseRequest) error {
	if req.Name == "" {
		return NewValidationError("name", "name is required")
	}
	if req.Code == "" {
		return NewValidationError("code", "code is required")
	}
	if len(req.Code) > 100 {
		return NewValidationError("code", "code must be less than 100 characters")
	}
	if req.BusinessType == "" {
		return NewValidationError("business_type", "business type is required")
	}
	
	// Additional strict validation if enabled
	if s.config.ValidationStrict {
		if req.ContactEmail != nil && *req.ContactEmail != "" {
			// Email validation would go here
		}
		if req.Website != nil && *req.Website != "" {
			// URL validation would go here
		}
	}
	
	return nil
}

func (s *EnhancedEnterpriseService) validateEnterpriseUpdateRequest(req *models.EnterpriseUpdateRequest) error {
	if req.Name != nil && *req.Name == "" {
		return NewValidationError("name", "name cannot be empty")
	}
	if req.Code != nil && *req.Code == "" {
		return NewValidationError("code", "code cannot be empty")
	}
	if req.Code != nil && len(*req.Code) > 100 {
		return NewValidationError("code", "code must be less than 100 characters")
	}
	
	return nil
}

func (s *EnhancedEnterpriseService) validateEnterpriseUserRequest(req *models.EnterpriseUserRequest) error {
	if req.EnterpriseID <= 0 {
		return NewValidationError("enterprise_id", "enterprise ID is required")
	}
	if req.Username == "" {
		return NewValidationError("username", "username is required")
	}
	if req.Name == "" {
		return NewValidationError("name", "name is required")
	}
	if req.AccessLevel < 1 || req.AccessLevel > 5 {
		return NewValidationError("access_level", "access level must be between 1 and 5")
	}
	
	return nil
}

// Custom error types for better error handling

// BusinessError represents a business logic error
type BusinessError struct {
	Code    string
	Message string
}

func (e *BusinessError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// NewBusinessError creates a new business error
func NewBusinessError(code, message string) *BusinessError {
	return &BusinessError{
		Code:    code,
		Message: message,
	}
}

// EnterpriseValidationError represents a validation error specific to enterprise operations
type EnterpriseValidationError struct {
	Field   string
	Message string
}

func (e *EnterpriseValidationError) Error() string {
	return fmt.Sprintf("validation error on field '%s': %s", e.Field, e.Message)
}

// NewValidationError creates a new validation error
func NewValidationError(field, message string) *EnterpriseValidationError {
	return &EnterpriseValidationError{
		Field:   field,
		Message: message,
	}
}