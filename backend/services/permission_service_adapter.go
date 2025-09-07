package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"

	"ai-project-backend/models"
	"github.com/go-redis/redis/v8"
)

// PermissionServiceAdapter adapts the new UnifiedPermissionService to work with existing interfaces
type PermissionServiceAdapter struct {
	legacyService  *PermissionService
	unifiedService *UnifiedPermissionService
	enabled        bool
}

// PermissionServiceAdapterConfig configures the permission service adapter
type PermissionServiceAdapterConfig struct {
	DB                      *sql.DB
	Cache                   *redis.Client
	UseUnifiedService       bool
	UnifiedServiceConfig    *PermissionServiceConfig
	FallbackToLegacy        bool
	LogPermissionChecks     bool
}

// NewPermissionServiceAdapter creates a new permission service adapter
func NewPermissionServiceAdapter(config *PermissionServiceAdapterConfig) (*PermissionServiceAdapter, error) {
	if config == nil {
		return nil, fmt.Errorf("adapter config is required")
	}

	adapter := &PermissionServiceAdapter{
		legacyService: NewPermissionService(config.DB),
		enabled:       config.UseUnifiedService,
	}

	// Initialize unified service if enabled
	if config.UseUnifiedService && config.UnifiedServiceConfig != nil {
		adapter.unifiedService = NewUnifiedPermissionService(config.DB, config.Cache, config.UnifiedServiceConfig)
	}

	return adapter, nil
}

// CheckUserPermission checks if a user has a specific permission, using unified service if available
func (a *PermissionServiceAdapter) CheckUserPermission(ctx context.Context, userID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	if a.enabled && a.unifiedService != nil {
		// Convert to unified permission check format
		check := &PermissionCheck{
			Subject: PermissionSubject{
				Type: SubjectSystemUser,
				ID:   userID,
			},
			Action: UnifiedPermissionAction(extractActionFromCode(permissionCode)),
			Object: PermissionObject{
				Type: determineResourceTypeFromCode(permissionCode),
				ID:   resourceID,
			},
			Context: map[string]interface{}{
				"permission_code": permissionCode,
				"legacy_check":    true,
			},
		}

		result, err := a.unifiedService.CheckPermission(ctx, check)
		if err != nil {
			log.Printf("[PERMISSION_ADAPTER] Unified service error for user %d, permission %s: %v", userID, permissionCode, err)
			// Fallback to legacy service
			hasPermission, err := a.legacyService.CheckUserPermission(ctx, userID, permissionCode)
			if err != nil {
				return nil, err
			}
			return &models.PermissionResult{
				HasPermission: hasPermission,
				Source:        "legacy",
				Reason:        "fallback to legacy service",
			}, nil
		}

		// Convert unified result to legacy format
		return &models.PermissionResult{
			HasPermission: result.Granted,
			Source:        string(result.Source),
			Reason:        result.Reason,
		}, nil
	}

	// Use legacy service
	hasPermission, err := a.legacyService.CheckUserPermission(ctx, userID, permissionCode)
	if err != nil {
		return nil, err
	}
	return &models.PermissionResult{
		HasPermission: hasPermission,
		Source:        "legacy",
		Reason:        "using legacy permission service",
	}, nil
}

// CheckMultiplePermissions checks multiple permissions for a user
func (a *PermissionServiceAdapter) CheckMultiplePermissions(ctx context.Context, userID int, permissionCodes []string, resourceID *int) (map[string]*models.PermissionResult, error) {
	results := make(map[string]*models.PermissionResult)

	// For now, use individual checks even with unified service
	// TODO: Implement true batch checking when available
	for _, code := range permissionCodes {
		result, err := a.CheckUserPermission(ctx, userID, code, resourceID)
		if err != nil {
			return nil, err
		}
		results[code] = result
	}

	return results, nil
}

// CheckEnterpriseUserPermission checks permission for enterprise users
func (a *PermissionServiceAdapter) CheckEnterpriseUserPermission(ctx context.Context, enterpriseUserID int, permissionCode string, resourceID *int) (*models.PermissionResult, error) {
	if a.enabled && a.unifiedService != nil {
		check := &PermissionCheck{
			Subject: PermissionSubject{
				Type: SubjectEnterpriseUser,
				ID:   enterpriseUserID,
			},
			Action: UnifiedPermissionAction(extractActionFromCode(permissionCode)),
			Object: PermissionObject{
				Type: determineResourceTypeFromCode(permissionCode),
				ID:   resourceID,
			},
			Context: map[string]interface{}{
				"permission_code": permissionCode,
				"enterprise_user": true,
			},
		}

		result, err := a.unifiedService.CheckPermission(ctx, check)
		if err != nil {
			log.Printf("[PERMISSION_ADAPTER] Unified service error for enterprise user %d, permission %s: %v", enterpriseUserID, permissionCode, err)
			// Fallback to legacy service (treat as regular user for backward compatibility)
			hasPermission, err := a.legacyService.CheckUserPermission(ctx, enterpriseUserID, permissionCode)
			if err != nil {
				return nil, err
			}
			return &models.PermissionResult{
				HasPermission: hasPermission,
				Source:        "legacy",
				Reason:        "fallback to legacy service for enterprise user",
			}, nil
		}

		return &models.PermissionResult{
			HasPermission: result.Granted,
			Source:        string(result.Source),
			Reason:        result.Reason,
		}, nil
	}

	// Use legacy service
	hasPermission, err := a.legacyService.CheckUserPermission(ctx, enterpriseUserID, permissionCode)
	if err != nil {
		return nil, err
	}
	return &models.PermissionResult{
		HasPermission: hasPermission,
		Source:        "legacy",
		Reason:        "using legacy permission service for enterprise user",
	}, nil
}

// InvalidateUserPermissions invalidates cached permissions for a user
func (a *PermissionServiceAdapter) InvalidateUserPermissions(ctx context.Context, userID int) error {
	if a.enabled && a.unifiedService != nil {
		// TODO: Implement cache invalidation when available in unified service
		log.Printf("[PERMISSION_ADAPTER] Cache invalidation requested for user %d", userID)
	}

	// Legacy service doesn't have caching, so no-op
	return nil
}

// Helper functions for permission code analysis
func extractActionFromCode(permissionCode string) string {
	parts := strings.Split(permissionCode, ".")
	if len(parts) >= 2 {
		return parts[len(parts)-1]
	}
	return "read" // default action
}

func determineResourceTypeFromCode(permissionCode string) UnifiedResourceType {
	if strings.HasPrefix(permissionCode, "system.") {
		return UnifiedResourceSystem
	}
	if strings.HasPrefix(permissionCode, "company.") {
		return UnifiedResourceEnterprise
	}
	if strings.HasPrefix(permissionCode, "project.") {
		return UnifiedResourceProject
	}
	if strings.HasPrefix(permissionCode, "task.") {
		return UnifiedResourceTask
	}
	if strings.HasPrefix(permissionCode, "user.") {
		return UnifiedResourceUser
	}
	if strings.HasPrefix(permissionCode, "document.") {
		return UnifiedResourceDocument
	}
	return UnifiedResourceProject // default resource
}

// IsUnifiedServiceEnabled returns whether the unified service is active
func (a *PermissionServiceAdapter) IsUnifiedServiceEnabled() bool {
	return a.enabled && a.unifiedService != nil
}

// GetLegacyService returns the legacy permission service for direct access
func (a *PermissionServiceAdapter) GetLegacyService() *PermissionService {
	return a.legacyService
}

// GetUnifiedService returns the unified permission service for direct access
func (a *PermissionServiceAdapter) GetUnifiedService() *UnifiedPermissionService {
	return a.unifiedService
}