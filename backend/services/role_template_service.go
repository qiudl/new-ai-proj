package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"log"
	"time"
)

// RoleTemplateService handles role template business logic
type RoleTemplateService struct {
	db             database.DB
	permissionRepo database.PermissionRepository
	logger         *log.Logger
}

// NewRoleTemplateService creates a new role template service
func NewRoleTemplateService(db database.DB, permissionRepo database.PermissionRepository, logger *log.Logger) *RoleTemplateService {
	return &RoleTemplateService{
		db:             db,
		permissionRepo: permissionRepo,
		logger:         logger,
	}
}

// CreateRoleTemplate creates a new role template
func (s *RoleTemplateService) CreateRoleTemplate(ctx context.Context, req *models.CreateRoleTemplateRequest, createdBy int) (*models.RoleTemplateResponse, error) {
	s.logger.Printf("Creating role template: %s for user %d", req.TemplateCode, createdBy)

	// Validate category
	if !models.ValidateTemplateCategory(req.Category) {
		return nil, fmt.Errorf("invalid template category: %s", req.Category)
	}

	// Check if template code already exists
	if exists, err := s.templateCodeExists(ctx, req.TemplateCode, 0); err != nil {
		return nil, fmt.Errorf("failed to check template code: %w", err)
	} else if exists {
		return nil, fmt.Errorf("template code already exists: %s", req.TemplateCode)
	}

	// Validate parent template if provided
	if req.ParentTemplateID != nil {
		if err := s.validateParentTemplate(ctx, *req.ParentTemplateID); err != nil {
			return nil, fmt.Errorf("invalid parent template: %w", err)
		}
	}

	// Validate permissions
	if err := s.validatePermissionCodes(ctx, req.PermissionCodes); err != nil {
		return nil, fmt.Errorf("invalid permissions: %w", err)
	}

	// Begin transaction
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Create the template
	template := &models.RoleTemplate{
		TemplateCode:        req.TemplateCode,
		TemplateName:        req.TemplateName,
		TemplateDescription: req.TemplateDescription,
		Category:            req.Category,
		Industry:            req.Industry,
		Department:          req.Department,
		Level:               req.Level,
		ParentTemplateID:    req.ParentTemplateID,
		IsSystemTemplate:    false, // Only system can create system templates
		IsActive:            true,
		Version:             1,
		CreatedBy:           &createdBy,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	// Set configuration and metadata
	if req.Configuration != nil {
		template.Configuration = models.CustomFields(req.Configuration)
	}
	if req.Metadata != nil {
		template.Metadata = models.CustomFields(req.Metadata)
	}

	// Create template in database
	createdTemplate, err := s.createTemplateInTx(ctx, tx, template)
	if err != nil {
		return nil, fmt.Errorf("failed to create template: %w", err)
	}

	// Add permissions
	if len(req.PermissionCodes) > 0 || len(req.PermissionSettings) > 0 {
		if err := s.setTemplatePermissionsInTx(ctx, tx, createdTemplate.ID, req.PermissionCodes, req.PermissionSettings); err != nil {
			return nil, fmt.Errorf("failed to set template permissions: %w", err)
		}
	}

	// Add tags
	if len(req.Tags) > 0 {
		if err := s.setTemplateTagsInTx(ctx, tx, createdTemplate.ID, req.Tags); err != nil {
			return nil, fmt.Errorf("failed to set template tags: %w", err)
		}
	}

	// Set up inheritance if parent template is specified
	if req.ParentTemplateID != nil && req.InheritanceSettings != nil {
		if err := s.setupInheritanceInTx(ctx, tx, *req.ParentTemplateID, createdTemplate.ID, req.InheritanceSettings); err != nil {
			return nil, fmt.Errorf("failed to setup inheritance: %w", err)
		}
	}

	// Create initial version
if err := s.createTemplateVersionInTx(ctx, tx, createdTemplate.ID, nil); err != nil {
		s.logger.Printf("Warning: Failed to create initial version for template %d: %v", createdTemplate.ID, err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return full template response
	return s.GetRoleTemplate(ctx, createdTemplate.ID)
}

// GetRoleTemplate retrieves a role template by ID
func (s *RoleTemplateService) GetRoleTemplate(ctx context.Context, templateID int) (*models.RoleTemplateResponse, error) {
	template, err := s.getTemplateByID(ctx, templateID)
	if err != nil {
		return nil, err
	}

	response := template.ToResponse()

	// Load permissions
	permissions, err := s.getTemplatePermissions(ctx, templateID)
	if err != nil {
		s.logger.Printf("Warning: Failed to load permissions for template %d: %v", templateID, err)
	} else {
		response.Permissions = permissions
	}

	// Load tags
	tags, err := s.getTemplateTags(ctx, templateID)
	if err != nil {
		s.logger.Printf("Warning: Failed to load tags for template %d: %v", templateID, err)
	} else {
		response.Tags = tags
	}

	// Load children templates
	children, err := s.getTemplateChildren(ctx, templateID)
	if err != nil {
		s.logger.Printf("Warning: Failed to load children for template %d: %v", templateID, err)
	} else {
		response.Children = children
	}

	// Load parent template name
	if response.ParentTemplateID != nil {
		if parentTemplate, err := s.getTemplateByID(ctx, *response.ParentTemplateID); err == nil {
			response.ParentTemplateName = &parentTemplate.TemplateName
		}
	}

	// Load usage count
	usageCount, err := s.getTemplateUsageCount(ctx, templateID)
	if err != nil {
		s.logger.Printf("Warning: Failed to load usage count for template %d: %v", templateID, err)
	} else {
		response.UsageCount = usageCount
	}

	// Load creator name
	if response.CreatedBy != nil {
		if user, err := s.db.Users().GetByID(ctx, *response.CreatedBy); err == nil {
			response.CreatedByName = &user.Username
		}
	}

	return &response, nil
}

// UpdateRoleTemplate updates an existing role template
func (s *RoleTemplateService) UpdateRoleTemplate(ctx context.Context, templateID int, req *models.UpdateRoleTemplateRequest, updatedBy int) (*models.RoleTemplateResponse, error) {
	s.logger.Printf("Updating role template %d by user %d", templateID, updatedBy)

	// Get existing template
	existingTemplate, err := s.getTemplateByID(ctx, templateID)
	if err != nil {
		return nil, err
	}

	// Check if system template (only system can modify)
	if existingTemplate.IsSystemTemplate && !s.isSystemUser(ctx, updatedBy) {
		return nil, fmt.Errorf("cannot modify system template")
	}

	// Validate category
	if !models.ValidateTemplateCategory(req.Category) {
		return nil, fmt.Errorf("invalid template category: %s", req.Category)
	}

	// Validate permissions
	if err := s.validatePermissionCodes(ctx, req.PermissionCodes); err != nil {
		return nil, fmt.Errorf("invalid permissions: %w", err)
	}

	// Begin transaction
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Create new version before updating
	if err := s.createTemplateVersionInTx(ctx, tx, templateID, req.ChangeLog); err != nil {
		s.logger.Printf("Warning: Failed to create version for template %d: %v", templateID, err)
	}

	// Update template
	existingTemplate.TemplateName = req.TemplateName
	existingTemplate.TemplateDescription = req.TemplateDescription
	existingTemplate.Category = req.Category
	existingTemplate.Industry = req.Industry
	existingTemplate.Department = req.Department
	existingTemplate.Level = req.Level
	existingTemplate.UpdatedAt = time.Now()
	existingTemplate.Version++

	// Update configuration and metadata
	if req.Configuration != nil {
		existingTemplate.Configuration = models.CustomFields(req.Configuration)
	}
	if req.Metadata != nil {
		existingTemplate.Metadata = models.CustomFields(req.Metadata)
	}

	// Update template in database
	if err := s.updateTemplateInTx(ctx, tx, existingTemplate); err != nil {
		return nil, fmt.Errorf("failed to update template: %w", err)
	}

	// Update permissions
	if len(req.PermissionCodes) > 0 || len(req.PermissionSettings) > 0 {
		if err := s.setTemplatePermissionsInTx(ctx, tx, templateID, req.PermissionCodes, req.PermissionSettings); err != nil {
			return nil, fmt.Errorf("failed to update template permissions: %w", err)
		}
	}

	// Update tags
	if len(req.Tags) >= 0 { // Allow empty tags to clear all
		if err := s.setTemplateTagsInTx(ctx, tx, templateID, req.Tags); err != nil {
			return nil, fmt.Errorf("failed to update template tags: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return updated template
	return s.GetRoleTemplate(ctx, templateID)
}

// DeleteRoleTemplate deletes a role template
func (s *RoleTemplateService) DeleteRoleTemplate(ctx context.Context, templateID int, deletedBy int) error {
	s.logger.Printf("Deleting role template %d by user %d", templateID, deletedBy)

	// Get template
	template, err := s.getTemplateByID(ctx, templateID)
	if err != nil {
		return err
	}

	// Check if system template
	if template.IsSystemTemplate && !s.isSystemUser(ctx, deletedBy) {
		return fmt.Errorf("cannot delete system template")
	}

	// Check usage
	usageCount, err := s.getTemplateUsageCount(ctx, templateID)
	if err != nil {
		return fmt.Errorf("failed to check template usage: %w", err)
	}
	if usageCount > 0 {
		return fmt.Errorf("cannot delete template with active usage (%d roles)", usageCount)
	}

	// Begin transaction
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete related records
	if err := s.deleteTemplateRelationsInTx(ctx, tx, templateID); err != nil {
		return fmt.Errorf("failed to delete template relations: %w", err)
	}

	// Delete template
	if err := s.deleteTemplateInTx(ctx, tx, templateID); err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// ListRoleTemplates retrieves role templates based on filters
func (s *RoleTemplateService) ListRoleTemplates(ctx context.Context, req *models.RoleTemplateListRequest) (*models.RoleTemplateListResponse, error) {
	s.logger.Printf("Listing role templates with filters: %+v", req)

	// Set defaults
	if req.Limit <= 0 || req.Limit > 100 {
		req.Limit = 20
	}
	if req.Offset < 0 {
		req.Offset = 0
	}
	if req.SortBy == "" {
		req.SortBy = "name"
	}
	if req.SortOrder == "" {
		req.SortOrder = "asc"
	}

	// Get templates
	templates, total, err := s.listTemplatesWithFilters(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to list templates: %w", err)
	}

	// Convert to response format
	var responses []models.RoleTemplateResponse
	for _, template := range templates {
		response := template.ToResponse()

		// Load basic info for each template
		if req.IncludeUsage {
			usageCount, _ := s.getTemplateUsageCount(ctx, template.ID)
			response.UsageCount = usageCount
		}

		// Load creator name
		if response.CreatedBy != nil {
			if user, err := s.db.Users().GetByID(ctx, *response.CreatedBy); err == nil {
				response.CreatedByName = &user.Username
			}
		}

		// Load parent template name
		if response.ParentTemplateID != nil {
			if parent, err := s.getTemplateByID(ctx, *response.ParentTemplateID); err == nil {
				response.ParentTemplateName = &parent.TemplateName
			}
		}

		responses = append(responses, response)
	}

	// Calculate pagination
	page := (req.Offset / req.Limit) + 1
	hasNext := (req.Offset + req.Limit) < total

	return &models.RoleTemplateListResponse{
		Templates: responses,
		Total:     total,
		Page:      page,
		PageSize:  req.Limit,
		HasNext:   hasNext,
		Filters:   s.buildFiltersMap(req),
	}, nil
}

// ApplyTemplateToRole applies a role template to create or update a role
func (s *RoleTemplateService) ApplyTemplateToRole(ctx context.Context, req *models.ApplyTemplateRequest, appliedBy int) (*models.ApplyTemplateResponse, error) {
	s.logger.Printf("Applying template %d by user %d", req.TemplateID, appliedBy)

	// Get template
	template, err := s.getTemplateByID(ctx, req.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("template not found: %w", err)
	}

	if !template.IsActive {
		return nil, fmt.Errorf("template is not active")
	}

	// Begin transaction
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	var targetRole *models.CompanyRole
	createdRole := false

	// Determine target role
	if req.RoleID != nil {
		// Update existing role
		role, err := s.permissionRepo.GetRoleByID(ctx, *req.RoleID)
		if err != nil {
			return nil, fmt.Errorf("target role not found: %w", err)
		}
		if role.IsSystemRole {
			return nil, fmt.Errorf("cannot modify system role")
		}
		targetRole = role
	} else {
		// Create new role
		if req.NewRoleCode == nil || req.NewRoleName == nil {
			return nil, fmt.Errorf("new role code and name required when creating role")
		}

		role := &models.CompanyRole{
			RoleCode:        *req.NewRoleCode,
			RoleName:        *req.NewRoleName,
			RoleDescription: template.TemplateDescription,
			IsSystemRole:    false,
			IsActive:        true,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		newRole, err := s.permissionRepo.CreateRole(ctx, role)
		if err != nil {
			return nil, fmt.Errorf("failed to create role: %w", err)
		}
		targetRole = newRole
		createdRole = true
	}

	// Apply template permissions
	templatePermissions, err := s.getTemplatePermissions(ctx, template.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get template permissions: %w", err)
	}

	var permissionIDs []int
	var permissionCodes []string
	for _, tp := range templatePermissions {
		if tp.IsDefault || req.OverrideMode == "replace" {
			permissionIDs = append(permissionIDs, tp.PermissionID)
			permissionCodes = append(permissionCodes, tp.PermissionCode)
		}
	}

	// Set role permissions based on override mode
	switch req.OverrideMode {
	case "replace":
		err = s.permissionRepo.SetRolePermissions(ctx, targetRole.ID, permissionIDs)
	case "merge":
		// Get existing permissions and merge
		existingPerms, _ := s.permissionRepo.GetRolePermissions(ctx, targetRole.ID)
		existingIDs := make(map[int]bool)
		for _, perm := range existingPerms {
			existingIDs[perm.ID] = true
		}
		// Add new permissions
		for _, id := range permissionIDs {
			existingIDs[id] = true
		}
		var mergedIDs []int
		for id := range existingIDs {
			mergedIDs = append(mergedIDs, id)
		}
		err = s.permissionRepo.SetRolePermissions(ctx, targetRole.ID, mergedIDs)
	case "append":
		// Just add new permissions
		existingPerms, _ := s.permissionRepo.GetRolePermissions(ctx, targetRole.ID)
		existingIDs := make(map[int]bool)
		for _, perm := range existingPerms {
			existingIDs[perm.ID] = true
		}
		var appendIDs []int
		for _, id := range permissionIDs {
			if !existingIDs[id] {
				appendIDs = append(appendIDs, id)
			}
		}
		// Add to existing
		allIDs := make([]int, 0, len(existingIDs)+len(appendIDs))
		for id := range existingIDs {
			allIDs = append(allIDs, id)
		}
		allIDs = append(allIDs, appendIDs...)
		err = s.permissionRepo.SetRolePermissions(ctx, targetRole.ID, allIDs)
	default:
		err = s.permissionRepo.SetRolePermissions(ctx, targetRole.ID, permissionIDs)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to set role permissions: %w", err)
	}

	// Record template usage
	usage := &models.RoleTemplateUsage{
		TemplateID:        template.ID,
		RoleID:            targetRole.ID,
		UsageType:         string(models.UsageTypeApplied),
		AppliedBy:         &appliedBy,
		AppliedAt:         time.Now(),
		IsCurrentTemplate: true,
	}

	if req.Customizations != nil {
		usage.Customizations = models.CustomFields(req.Customizations)
	}

	if err := s.recordTemplateUsageInTx(ctx, tx, usage); err != nil {
		s.logger.Printf("Warning: Failed to record template usage: %v", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Build response
	templateResponse, _ := s.GetRoleTemplate(ctx, template.ID)
	
	// Audit summary of template application (non-blocking)
	s.auditTemplateApplication(ctx, targetRole, permissionCodes, appliedBy, template.TemplateName)
	
	response := &models.ApplyTemplateResponse{
		Success:         true,
		RoleID:          targetRole.ID,
		RoleCode:        targetRole.RoleCode,
		RoleName:        targetRole.RoleName,
		PermissionsSet:  permissionCodes,
		CreatedRole:     createdRole,
		Message:         fmt.Sprintf("Template %s successfully applied to role %s", template.TemplateName, targetRole.RoleName),
	}

	if templateResponse != nil {
		response.TemplateApplied = *templateResponse
	}

	if req.Customizations != nil {
		response.CustomizationsApplied = req.Customizations
	}

	return response, nil
}

// GetTemplatesByCategory retrieves templates by category
func (s *RoleTemplateService) GetTemplatesByCategory(ctx context.Context, category string) ([]models.RoleTemplateResponse, error) {
	if !models.ValidateTemplateCategory(category) {
		return nil, fmt.Errorf("invalid category: %s", category)
	}

	req := &models.RoleTemplateListRequest{
		Category:  &category,
		IsActive:  boolPtr(true),
		Limit:     100,
		Offset:    0,
		SortBy:    "level",
		SortOrder: "asc",
	}

	response, err := s.ListRoleTemplates(ctx, req)
	if err != nil {
		return nil, err
	}

	return response.Templates, nil
}

// CloneTemplate creates a copy of an existing template
func (s *RoleTemplateService) CloneTemplate(ctx context.Context, templateID int, newCode, newName string, clonedBy int) (*models.RoleTemplateResponse, error) {
	s.logger.Printf("Cloning template %d to %s by user %d", templateID, newCode, clonedBy)

	// Get source template
	sourceTemplate, err := s.GetRoleTemplate(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("source template not found: %w", err)
	}

	// Check if new code is available
	if exists, err := s.templateCodeExists(ctx, newCode, 0); err != nil {
		return nil, fmt.Errorf("failed to check template code: %w", err)
	} else if exists {
		return nil, fmt.Errorf("template code already exists: %s", newCode)
	}

	// Create clone request
	cloneReq := &models.CreateRoleTemplateRequest{
		TemplateCode:        newCode,
		TemplateName:        newName,
		TemplateDescription: sourceTemplate.TemplateDescription,
		Category:            "custom", // Clones are always custom
		Industry:            sourceTemplate.Industry,
		Department:          sourceTemplate.Department,
		Level:               sourceTemplate.Level,
		Configuration:       sourceTemplate.Configuration,
		Metadata:            sourceTemplate.Metadata,
		Tags:                append(sourceTemplate.Tags, "cloned"),
	}

	// Add permissions
	for _, perm := range sourceTemplate.Permissions {
		cloneReq.PermissionCodes = append(cloneReq.PermissionCodes, perm.PermissionCode)
		cloneReq.PermissionSettings = append(cloneReq.PermissionSettings, models.TemplatePermissionItem{
			PermissionCode: perm.PermissionCode,
			IsRequired:     perm.IsRequired,
			IsDefault:      perm.IsDefault,
			Priority:       perm.Priority,
			Conditions:     perm.Conditions,
		})
	}

	// Create the clone
	return s.CreateRoleTemplate(ctx, cloneReq, clonedBy)
}

// Helper methods and private functions would be implemented here
// Due to length constraints, I'm showing the key public methods above
// The following would be implemented as private helper methods:

// Private helper method signatures (to be implemented):
// - templateCodeExists(ctx context.Context, code string, excludeID int) (bool, error)
// - validateParentTemplate(ctx context.Context, parentID int) error
// - validatePermissionCodes(ctx context.Context, codes []string) error
// - getTemplateByID(ctx context.Context, id int) (*models.RoleTemplate, error)
// - createTemplateInTx(ctx context.Context, tx database.Tx, template *models.RoleTemplate) (*models.RoleTemplate, error)
// - setTemplatePermissionsInTx(ctx context.Context, tx database.Tx, templateID int, codes []string, settings []models.TemplatePermissionItem) error
// - setTemplateTagsInTx(ctx context.Context, tx database.Tx, templateID int, tags []string) error
// - setupInheritanceInTx(ctx context.Context, tx database.Tx, parentID, childID int, settings *models.TemplateInheritanceItem) error
// - createTemplateVersionInTx(ctx context.Context, tx database.Tx, templateID int, changeLog *string) error
// - getTemplatePermissions(ctx context.Context, templateID int) ([]models.TemplatePermissionResponse, error)
// - getTemplateTags(ctx context.Context, templateID int) ([]string, error)
// - getTemplateChildren(ctx context.Context, templateID int) ([]models.RoleTemplateChildResponse, error)
// - getTemplateUsageCount(ctx context.Context, templateID int) (int, error)
// - isSystemUser(ctx context.Context, userID int) bool
// - listTemplatesWithFilters(ctx context.Context, req *models.RoleTemplateListRequest) ([]models.RoleTemplate, int, error)
// - buildFiltersMap(req *models.RoleTemplateListRequest) map[string]interface{}
// - recordTemplateUsageInTx(ctx context.Context, tx database.Tx, usage *models.RoleTemplateUsage) error
// - updateTemplateInTx(ctx context.Context, tx database.Tx, template *models.RoleTemplate) error
// - deleteTemplateRelationsInTx(ctx context.Context, tx database.Tx, templateID int) error
// - deleteTemplateInTx(ctx context.Context, tx database.Tx, templateID int) error

func boolPtr(b bool) *bool {
	return &b
}