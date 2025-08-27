package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/database"
	"net/http"
	"strconv"
	"strings"
	"github.com/gin-gonic/gin"
)

// PermissionHandler handles permission-related HTTP requests
type PermissionHandler struct {
	permissionRepo database.PermissionRepository
}

// NewPermissionHandler creates a new permission handler
func NewPermissionHandler(permissionRepo database.PermissionRepository) *PermissionHandler {
	return &PermissionHandler{
		permissionRepo: permissionRepo,
	}
}

// GetRoles handles GET /api/v1/permissions/roles
func (h *PermissionHandler) GetRoles(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Optional company filter
	var companyID *int
	if companyIDStr := c.Query("company_id"); companyIDStr != "" {
		if id, err := strconv.Atoi(companyIDStr); err == nil {
			companyID = &id
		}
	}

	roles, err := h.permissionRepo.GetRoles(ctx, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get roles"})
		return
	}

	// Convert to response format
	var roleResponses []models.CompanyRoleResponse
	for _, role := range roles {
		roleResponses = append(roleResponses, role.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{"roles": roleResponses})
}

// CreateRole handles POST /api/v1/permissions/roles
func (h *PermissionHandler) CreateRole(c *gin.Context) {
	ctx := c.Request.Context()
	var req models.CompanyRoleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Create the role
	role := &models.CompanyRole{
		RoleCode:        req.RoleCode,
		RoleName:        req.RoleName,
		RoleDescription: req.RoleDescription,
		IsSystemRole:    false, // Only system can create system roles
		IsActive:        true,
	}

	createdRole, err := h.permissionRepo.CreateRole(ctx, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
		return
	}

	// Set permissions if provided
	if len(req.PermissionCodes) > 0 {
		// Get permission IDs from codes
		allPermissions, err := h.permissionRepo.GetPermissions(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get permissions"})
			return
		}

		// Map permission codes to IDs
		codeToID := make(map[string]int)
		for _, perm := range allPermissions {
			codeToID[perm.PermissionCode] = perm.ID
		}

		var permissionIDs []int
		for _, code := range req.PermissionCodes {
			if id, exists := codeToID[code]; exists {
				permissionIDs = append(permissionIDs, id)
			}
		}

		if len(permissionIDs) > 0 {
			err = h.permissionRepo.SetRolePermissions(ctx, createdRole.ID, permissionIDs)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set role permissions"})
				return
			}
		}
	}

	c.JSON(http.StatusCreated, gin.H{"role": createdRole.ToResponse()})
}

// UpdateRole handles PUT /api/v1/permissions/roles/:id
func (h *PermissionHandler) UpdateRole(c *gin.Context) {
	ctx := c.Request.Context()
	
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var req models.CompanyRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Get existing role
	existingRole, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	// Update role
	existingRole.RoleName = req.RoleName
	existingRole.RoleDescription = req.RoleDescription
	existingRole.IsActive = true

	updatedRole, err := h.permissionRepo.UpdateRole(ctx, existingRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	// Update permissions if provided
	if len(req.PermissionCodes) > 0 {
		// Get permission IDs from codes
		allPermissions, err := h.permissionRepo.GetPermissions(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get permissions"})
			return
		}

		// Map permission codes to IDs
		codeToID := make(map[string]int)
		for _, perm := range allPermissions {
			codeToID[perm.PermissionCode] = perm.ID
		}

		var permissionIDs []int
		for _, code := range req.PermissionCodes {
			if id, exists := codeToID[code]; exists {
				permissionIDs = append(permissionIDs, id)
			}
		}

		err = h.permissionRepo.SetRolePermissions(ctx, roleID, permissionIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role permissions"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"role": updatedRole.ToResponse()})
}

// DeleteRole handles DELETE /api/v1/permissions/roles/:id
func (h *PermissionHandler) DeleteRole(c *gin.Context) {
	ctx := c.Request.Context()
	
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	err = h.permissionRepo.DeleteRole(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}

// GetPermissions handles GET /api/v1/permissions
func (h *PermissionHandler) GetPermissions(c *gin.Context) {
	ctx := c.Request.Context()
	
	module := c.Query("module")
	
	var permissions []*models.Permission
	var err error

	if module != "" {
		permissions, err = h.permissionRepo.GetPermissionsByModule(ctx, module)
	} else {
		permissions, err = h.permissionRepo.GetPermissions(ctx)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get permissions"})
		return
	}

	// Convert to response format
	var permissionResponses []models.PermissionResponse
	for _, perm := range permissions {
		permissionResponses = append(permissionResponses, perm.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{"permissions": permissionResponses})
}

// GetRolePermissions handles GET /api/v1/permissions/roles/:id/permissions
func (h *PermissionHandler) GetRolePermissions(c *gin.Context) {
	ctx := c.Request.Context()
	
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	permissions, err := h.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get role permissions"})
		return
	}

	// Convert to response format
	var permissionResponses []models.PermissionResponse
	for _, perm := range permissions {
		response := perm.ToResponse()
		response.IsGranted = true // These are granted permissions
		permissionResponses = append(permissionResponses, response)
	}

	c.JSON(http.StatusOK, gin.H{"permissions": permissionResponses})
}

// SetRolePermissions handles POST /api/v1/permissions/roles/:id/permissions
func (h *PermissionHandler) SetRolePermissions(c *gin.Context) {
	ctx := c.Request.Context()
	
	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var req struct {
		PermissionIDs []int `json:"permission_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	err = h.permissionRepo.SetRolePermissions(ctx, roleID, req.PermissionIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set role permissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role permissions updated successfully"})
}

// CheckUserPermission handles POST /api/v1/permissions/check
// Compatibility notes:
// - Accepts permission codes with either dot or underscore separators (e.g., "task.read" or "task_read").
// - If company_user_id is not available in context but the authenticated user has role=admin,
//   grants permission via admin override to unblock development flows.
func (h *PermissionHandler) CheckUserPermission(c *gin.Context) {
	ctx := c.Request.Context()

	var req models.PermissionCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Normalize permission code: support underscore-based codes from frontend constants
	permCode := req.PermissionCode
	if permCode != "" && !containsDot(permCode) {
		permCode = underscoreToDot(permCode)
	}

	// Admin override based on JWT role (accept admin or super_admin; case-insensitive)
	if roleVal, exists := c.Get("user_role"); exists {
		if roleStr, ok := roleVal.(string); ok {
			role := strings.ToLower(roleStr)
			if role == "admin" || role == "super_admin" {
				c.JSON(http.StatusOK, gin.H{"result": models.PermissionResult{
					HasPermission: true,
					Reason:        "Admin override (user role)",
					Source:        "admin_override",
				}})
				return
			}
		}
	} else if roleVal2, exists2 := c.Get("current_user_role"); exists2 {
		if roleStr, ok := roleVal2.(string); ok {
			role := strings.ToLower(roleStr)
			if role == "admin" || role == "super_admin" {
				c.JSON(http.StatusOK, gin.H{"result": models.PermissionResult{
					HasPermission: true,
					Reason:        "Admin override (current_user_role)",
					Source:        "admin_override",
				}})
				return
			}
		}
	}

	// Try to get company_user_id from context if available
	if companyUserIDInterface, ok := c.Get("company_user_id"); ok {
		if companyUserID, ok2 := companyUserIDInterface.(int); ok2 {
			result, err := h.permissionRepo.CheckUserPermission(ctx, companyUserID, permCode, req.ResourceID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permission"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"result": result})
			return
		}
	}

	// Fallback: no company_user_id in context; deny with informative reason
	c.JSON(http.StatusOK, gin.H{"result": models.PermissionResult{
		HasPermission: false,
		Reason:        "Permission system not initialized for this user (no company_user_id in context)",
		Source:        "fallback",
	}})
}

// containsDot checks if a string contains a dot
func containsDot(s string) bool { return strings.Contains(s, ".") }

// underscoreToDot converts underscore_separated codes to dot.separated codes
func underscoreToDot(s string) string { return strings.ReplaceAll(s, "_", ".") }

// BatchCheckPermissions handles POST /api/v1/permissions/check/batch
// Request body: {"company_user_id": 123, "permissions": ["project.read", "task.update"], "resource_id": 1}
func (h *PermissionHandler) BatchCheckPermissions(c *gin.Context) {
	ctx := c.Request.Context()
	type batchReq struct {
		CompanyUserID int      `json:"company_user_id"`
		Permissions   []string `json:"permissions"`
		ResourceID    *int     `json:"resource_id,omitempty"`
	}
	var req batchReq
	if err := c.ShouldBindJSON(&req); err != nil || req.CompanyUserID == 0 || len(req.Permissions) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	// Normalize permission codes
	perms := make([]string, 0, len(req.Permissions))
	for _, p := range req.Permissions {
		if p != "" && !containsDot(p) { p = underscoreToDot(p) }
		perms = append(perms, p)
	}
	results, err := h.permissionRepo.CheckMultiplePermissions(ctx, req.CompanyUserID, perms, req.ResourceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permissions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}

// GetUserPermissions handles GET /api/v1/permissions/users/:id
func (h *PermissionHandler) GetUserPermissions(c *gin.Context) {
	ctx := c.Request.Context()
	
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	permissions, err := h.permissionRepo.GetUserPermissions(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user permissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"permissions": permissions})
}

// UpdateUserPermissions handles PUT /api/v1/permissions/users/:id
func (h *PermissionHandler) UpdateUserPermissions(c *gin.Context) {
	ctx := c.Request.Context()
	
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.UserPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Update role if provided
	if req.RoleID != nil {
		err = h.permissionRepo.UpdateUserRole(ctx, userID, req.RoleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
			return
		}
	}

	// Update custom permissions if provided
	if req.CustomPermissions != nil {
		err = h.permissionRepo.UpdateUserCustomPermissions(ctx, userID, req.CustomPermissions)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update custom permissions"})
			return
		}
	}

	// Update project permissions if provided
	for _, projectPerm := range req.ProjectPermissions {
		permission := &models.CompanyUserProjectPermission{
			CompanyUserID:       userID,
			ProjectID:           projectPerm.ProjectID,
			CanViewProject:      projectPerm.CanViewProject,
			CanEditProject:      projectPerm.CanEditProject,
			CanDeleteProject:    projectPerm.CanDeleteProject,
			CanManageTasks:      projectPerm.CanManageTasks,
			CanViewFinancials:   projectPerm.CanViewFinancials,
			CanManageMembers:    projectPerm.CanManageMembers,
			PermissionStartDate: *projectPerm.PermissionStartDate,
			PermissionEndDate:   projectPerm.PermissionEndDate,
		}

		err = h.permissionRepo.SetUserProjectPermissions(ctx, permission)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project permissions"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "User permissions updated successfully"})
}

// GetPermissionAuditLogs handles GET /api/v1/permissions/audit-logs
func (h *PermissionHandler) GetPermissionAuditLogs(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	
	var companyUserID *int
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if id, err := strconv.Atoi(userIDStr); err == nil {
			companyUserID = &id
		}
	}

	logs, totalCount, err := h.permissionRepo.GetPermissionAuditLogs(ctx, companyUserID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":       logs,
		"total":      totalCount,
		"limit":      limit,
		"offset":     offset,
		"has_more":   offset+limit < totalCount,
	})
}

// GetPermissionTrace returns detailed trace of how a permission is resolved
func (h *PermissionHandler) GetPermissionTrace(c *gin.Context) {
	companyUserID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	permissionCode := c.Query("permission_code")
	if permissionCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permission code is required"})
		return
	}

	var resourceID *int
	if resourceIDStr := c.Query("resource_id"); resourceIDStr != "" {
		if id, err := strconv.Atoi(resourceIDStr); err == nil {
			resourceID = &id
		}
	}

	trace, err := h.permissionRepo.GetPermissionInheritanceTrace(c.Request.Context(), companyUserID, permissionCode, resourceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get permission trace"})
		return
	}

	c.JSON(http.StatusOK, models.GetPermissionTraceResponse{
		Trace: trace,
	})
}

// SetPermissionOverride sets a custom permission override for a user
func (h *PermissionHandler) SetPermissionOverride(c *gin.Context) {
	companyUserID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.PermissionOverrideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	err = h.permissionRepo.SetUserPermissionOverride(
		c.Request.Context(),
		companyUserID,
		req.PermissionCode,
		req.IsGranted,
		req.Reason,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set permission override"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Permission override set successfully",
	})
}

// RemovePermissionOverride removes a custom permission override
func (h *PermissionHandler) RemovePermissionOverride(c *gin.Context) {
	companyUserID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	permissionCode := c.Param("permissionCode")
	if permissionCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permission code is required"})
		return
	}

	err = h.permissionRepo.RemoveUserPermissionOverride(c.Request.Context(), companyUserID, permissionCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove permission override"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Permission override removed successfully",
	})
}

// GetPermissionOverrides gets all custom permission overrides for a user
func (h *PermissionHandler) GetPermissionOverrides(c *gin.Context) {
	companyUserID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	overrides, err := h.permissionRepo.GetUserPermissionOverrides(c.Request.Context(), companyUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get permission overrides"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    overrides,
	})
}

// AnalyzePermissionConflicts analyzes permission conflicts for a user
func (h *PermissionHandler) AnalyzePermissionConflicts(c *gin.Context) {
	companyUserID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	analysis, err := h.permissionRepo.AnalyzePermissionConflicts(c.Request.Context(), companyUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze permission conflicts"})
		return
	}

	c.JSON(http.StatusOK, models.GetPermissionAnalysisResponse{
		Analysis: analysis,
	})
}

// GetPermissionModules handles GET /api/v1/permissions/modules
func (h *PermissionHandler) GetPermissionModules(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Get all permissions to extract modules
	permissions, err := h.permissionRepo.GetPermissions(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get permissions"})
		return
	}

	// Extract unique modules
	moduleMap := make(map[string]int)
	for _, perm := range permissions {
		moduleMap[perm.Module]++
	}

	// Convert to response format
	var modules []gin.H
	for module, count := range moduleMap {
		modules = append(modules, gin.H{
			"name":             module,
			"permission_count": count,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"modules":     modules,
			"total_count": len(modules),
		},
	})
}

// GetModulePermissions handles GET /api/v1/permissions/modules/:module/permissions
func (h *PermissionHandler) GetModulePermissions(c *gin.Context) {
	ctx := c.Request.Context()
	module := c.Param("module")
	
	if module == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Module name is required"})
		return
	}

	permissions, err := h.permissionRepo.GetPermissionsByModule(ctx, module)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get module permissions"})
		return
	}

	// Convert to response format
	var permissionResponses []models.PermissionResponse
	for _, perm := range permissions {
		permissionResponses = append(permissionResponses, perm.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"module":      module,
			"permissions": permissionResponses,
			"total_count": len(permissionResponses),
		},
	})
}

// GetUserRoles handles GET /api/v1/users/:id/roles
func (h *PermissionHandler) GetUserRoles(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Get user roles - for now return mock data since the repository doesn't support multiple roles yet
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": []gin.H{
			{
				"id":          1,
				"user_id":     userID,
				"role_id":     3,
				"assigned_by": 1,
				"assigned_at": "2025-08-27T00:00:00Z",
				"is_active":   true,
				"role": gin.H{
					"id":              3,
					"role_code":       "ENTERPRISE_ADMIN",
					"role_name":       "企业管理员",
					"role_description": "企业最高权限用户",
					"is_system_role":  false,
					"is_active":       true,
				},
				"assigned_by_name": "系统管理员",
			},
		},
	})
}

// AssignUserRole handles POST /api/v1/users/:id/roles
func (h *PermissionHandler) AssignUserRole(c *gin.Context) {
	ctx := c.Request.Context()
	
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		RoleIDs []int `json:"role_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// Support legacy single role assignment
		var legacyReq struct {
			RoleID int `json:"role_id" binding:"required"`
		}
		if err := c.ShouldBindJSON(&legacyReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}
		req.RoleIDs = []int{legacyReq.RoleID}
	}

	// For now, just use the first role ID since the repository doesn't support multiple roles yet
	var roleID *int
	if len(req.RoleIDs) > 0 {
		roleID = &req.RoleIDs[0]
	}

	// Update user role
	err = h.permissionRepo.UpdateUserRole(ctx, userID, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role to user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Role assigned to user successfully",
	})
}

// RemoveUserRole handles DELETE /api/v1/users/:id/roles/:roleId  
func (h *PermissionHandler) RemoveUserRole(c *gin.Context) {
	ctx := c.Request.Context()
	
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Remove role from user (set role to null)
	err = h.permissionRepo.UpdateUserRole(ctx, userID, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove role from user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Role removed from user successfully",
	})
}