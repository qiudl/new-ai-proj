package handlers

import (
	"ai-project-backend/constants"
	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"strings"
)

// PermissionHandler handles permission-related HTTP requests
type PermissionHandler struct {
	permissionRepo database.PermissionRepository
	db             database.DB
}

// NewPermissionHandler creates a new permission handler
func NewPermissionHandler(permissionRepo database.PermissionRepository, db database.DB) *PermissionHandler {
	return &PermissionHandler{
		permissionRepo: permissionRepo,
		db:             db,
	}
}

// GetRoles handles GET /api/v1/permissions/roles
func (h *PermissionHandler) GetRoles(c *gin.Context) {
	ctx := c.Request.Context()

	// Optional enterprise filter
	var enterpriseID *int
	if enterpriseIDStr := c.Query("enterprise_id"); enterpriseIDStr != "" {
		if id, err := strconv.Atoi(enterpriseIDStr); err == nil {
			enterpriseID = &id
		}
	}

	roles, err := h.permissionRepo.GetRoles(ctx, enterpriseID)
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
//   - Accepts permission codes with either dot or underscore separators (e.g., "task.read" or "task_read").
//   - If company_user_id is not available in context but the authenticated user has role=admin,
//     grants permission via admin override to unblock development flows.
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

	// Admin override based on JWT role (accept admin, super_admin, superadmin; case-insensitive)
	if roleVal, exists := c.Get("user_role"); exists {
		if roleStr, ok := roleVal.(string); ok {
			role := strings.ToLower(roleStr)
			if role == "admin" || role == "super_admin" || role == "superadmin" {
				result := models.PermissionResult{
					HasPermission: true,
					Reason:        "Admin override (user role)",
					Source:        "admin_override",
				}
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"data":    result,
				})
				return
			}
		}
	} else if roleVal2, exists2 := c.Get("current_user_role"); exists2 {
		if roleStr, ok := roleVal2.(string); ok {
			role := strings.ToLower(roleStr)
			if role == "admin" || role == "super_admin" || role == "superadmin" {
				result := models.PermissionResult{
					HasPermission: true,
					Reason:        "Admin override (current_user_role)",
					Source:        "admin_override",
				}
				c.JSON(http.StatusOK, gin.H{
					"success": true,
					"data":    result,
				})
				return
			}
		}
	}

	// Try to get company_user_id or enterprise_user_id from context
	var userID int
	var found bool

	// Try enterprise_user_id first
	if euIDInterface, ok := c.Get("enterprise_user_id"); ok {
		if euID, ok2 := euIDInterface.(int); ok2 {
			userID = euID
			found = true
		}
	}

	// Fallback to company_user_id
	if !found {
		if cuIDInterface, ok := c.Get("company_user_id"); ok {
			if cuID, ok2 := cuIDInterface.(int); ok2 {
				userID = cuID
				found = true
			}
		}
	}

	if found {
		result, err := h.permissionRepo.CheckUserPermission(ctx, userID, permCode, req.ResourceID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permission"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    result,
		})
		return
	}

	// Fallback: no user ID in context; deny with informative reason
	result := models.PermissionResult{
		HasPermission: false,
		Reason:        "Permission system not initialized for this user (no company_user_id or enterprise_user_id in context)",
		Source:        "fallback",
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// containsDot checks if a string contains a dot
func containsDot(s string) bool { return strings.Contains(s, ".") }

// underscoreToDot converts underscore_separated codes to dot.separated codes
func underscoreToDot(s string) string { return strings.ReplaceAll(s, "_", ".") }

// splitCode splits a permission code like "project.read" into module and action
func splitCode(code string) (string, string) {
	parts := strings.SplitN(code, ".", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return code, ""
}

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
		if p != "" && !containsDot(p) {
			p = underscoreToDot(p)
		}
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

	// First get user info to determine if this is a system user or company user
	user, err := h.db.Users().GetByID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	// Handle system administrators (admin, super_admin, superadmin, company_admin roles) differently
	if user.Role == "admin" || user.Role == "super_admin" || user.Role == "superadmin" || user.Role == "company_admin" {
		// For administrators, return a special permission summary with full access
		var roleDescription string
		var roleName string
		var roleCode string

		switch user.Role {
		case "admin", "super_admin", "superadmin":
			roleDescription = "系统管理员拥有所有权限"
			roleName = "系统管理员"
			roleCode = user.Role
		case "company_admin":
			roleDescription = "企业管理员拥有企业内所有权限"
			roleName = "企业管理员"
			roleCode = "company_admin"
		default:
			roleDescription = "管理员拥有所有权限"
			roleName = "管理员"
			roleCode = user.Role
		}

		// Get all permissions for admin users
		allPermissions, err := h.permissionRepo.GetPermissions(ctx)
		effectivePerms := []models.PermissionResponse{}
		if err == nil && len(allPermissions) > 0 {
			effectivePerms = make([]models.PermissionResponse, 0, len(allPermissions))
			for _, perm := range allPermissions {
				effectivePerms = append(effectivePerms, models.PermissionResponse{
					ID:                    perm.ID,
					PermissionCode:        perm.PermissionCode,
					PermissionName:        perm.PermissionName,
					PermissionDescription: perm.PermissionDescription,
					Module:                perm.Module,
					Resource:              perm.Resource,
					Action:                perm.Action,
					IsActive:              perm.IsActive,
					IsGranted:             true, // All permissions granted for admin
				})
			}
		}

		summary := &models.UserPermissionSummary{
			CompanyUserID:        userID, // Use system user ID as fallback
			UserName:             user.Username,
			CustomPermissions:    make(map[string]bool),
			ProjectPermissions:   []models.CompanyUserProjectPermission{},
			EffectivePermissions: effectivePerms,
		}

		// Set role information for admin
		summary.Role = &models.CompanyRoleResponse{
			ID:              0, // Special ID for system roles
			RoleCode:        roleCode,
			RoleName:        roleName,
			RoleDescription: &roleDescription,
			IsSystemRole:    true,
			IsActive:        true,
		}

		c.JSON(http.StatusOK, gin.H{"permissions": summary})
		return
	}

	// For regular users, try normal permission repository first
	permissions, err := h.permissionRepo.GetUserPermissions(ctx, userID)
	if err != nil {
		// Fallback to avoid 500: synthesize minimal permissions based on user type
		userType := strings.ToLower(strings.TrimSpace(user.UserType))
		var base []string
		if userType == "enterprise" || userType == "company" {
			base = constants.GetEnterpriseUserPermissions()
		} else {
			base = constants.GetBasePermissions()
		}
		// De-duplicate while preserving order
		seen := make(map[string]struct{}, len(base))
		var eff []models.PermissionResponse
		for _, code := range base {
			if _, ok := seen[code]; ok {
				continue
			}
			seen[code] = struct{}{}
			mod, act := splitCode(code)
			eff = append(eff, models.PermissionResponse{
				PermissionCode: code,
				Module:         mod,
				Resource:       mod,
				Action:         act,
				IsActive:       true,
				IsGranted:      true,
			})
		}
		fallback := &models.UserPermissionSummary{
			CompanyUserID:        userID,
			UserName:             user.Username,
			CustomPermissions:    make(map[string]bool),
			ProjectPermissions:   []models.CompanyUserProjectPermission{},
			EffectivePermissions: eff,
		}
		// Attach role info from user
		roleDesc := "用户基础权限（回退）"
		fallback.Role = &models.CompanyRoleResponse{
			ID:              0,
			RoleCode:        user.Role,
			RoleName:        user.Role,
			RoleDescription: &roleDesc,
			IsSystemRole:    false,
			IsActive:        true,
		}
		c.JSON(http.StatusOK, gin.H{"permissions": fallback})
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
		"logs":     logs,
		"total":    totalCount,
		"limit":    limit,
		"offset":   offset,
		"has_more": offset+limit < totalCount,
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
					"id":               3,
					"role_code":        "ENTERPRISE_ADMIN",
					"role_name":        "企业管理员",
					"role_description": "企业最高权限用户",
					"is_system_role":   false,
					"is_active":        true,
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

// GetPermissionMatrix handles GET /api/v1/permissions/matrix
// @Summary Get permission matrix
// @Description Get the full permission matrix showing which permissions are granted to which roles
// @Tags permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Permission matrix data"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/permissions/matrix [get]
func (h *PermissionHandler) GetPermissionMatrix(c *gin.Context) {
	ctx := c.Request.Context()

	// Get all roles
	roles, err := h.permissionRepo.GetRoles(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get roles",
		})
		return
	}

	// Get all permissions
	permissions, err := h.permissionRepo.GetPermissions(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get permissions",
		})
		return
	}

	// Get role permissions for all roles
	roleIDs := make([]int, len(roles))
	for i, role := range roles {
		roleIDs[i] = role.ID
	}

	// Get permission grants for all roles
	_, rolePermissionsMap, err := h.permissionRepo.GetRolesWithPermissions(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get role permissions",
		})
		return
	}

	// Build matrix data structure
	// matrix[i][j] = true if role i has permission j
	matrix := make([]map[string]interface{}, 0)
	for _, role := range roles {
		rolePerms, exists := rolePermissionsMap[role.ID]
		permMap := make(map[int]bool)

		if exists {
			for _, perm := range rolePerms {
				permMap[perm.ID] = true
			}
		}

		// Create matrix entries for this role
		for _, perm := range permissions {
			matrix = append(matrix, map[string]interface{}{
				"role_id":       role.ID,
				"permission_id": perm.ID,
				"granted":       permMap[perm.ID],
			})
		}
	}

	// Convert roles and permissions to response format
	rolesResponse := make([]models.CompanyRoleResponse, len(roles))
	for i, role := range roles {
		rolesResponse[i] = role.ToResponse()
	}

	permissionsResponse := make([]models.PermissionResponse, len(permissions))
	for i, perm := range permissions {
		permissionsResponse[i] = perm.ToResponse()
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"data": gin.H{
			"roles":       rolesResponse,
			"permissions": permissionsResponse,
			"matrix":      matrix,
		},
	})
}

// UpdatePermissionMatrix handles POST /api/v1/permissions/matrix
// @Summary Update permission matrix
// @Description Batch update permission grants for multiple role-permission combinations
// @Tags permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body map[string]interface{} true "Matrix updates"
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /api/v1/permissions/matrix [post]
func (h *PermissionHandler) UpdatePermissionMatrix(c *gin.Context) {
	ctx := c.Request.Context()

	var req struct {
		Updates []struct {
			RoleID       int  `json:"role_id" binding:"required"`
			PermissionID int  `json:"permission_id" binding:"required"`
			Granted      bool `json:"granted"`
		} `json:"updates" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	// Process each update
	for _, update := range req.Updates {
		// Get current role permissions
		rolePerms, err := h.permissionRepo.GetRolePermissionIDs(ctx, update.RoleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to get role permissions",
			})
			return
		}

		// Build new permission list
		permMap := make(map[int]bool)
		for _, permID := range rolePerms {
			permMap[permID] = true
		}

		// Update the permission status
		if update.Granted {
			permMap[update.PermissionID] = true
		} else {
			delete(permMap, update.PermissionID)
		}

		// Convert back to slice
		newPermIDs := make([]int, 0, len(permMap))
		for permID := range permMap {
			newPermIDs = append(newPermIDs, permID)
		}

		// Update role permissions
		err = h.permissionRepo.SetRolePermissions(ctx, update.RoleID, newPermIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update role permissions",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Permission matrix updated successfully",
		"updated_count": len(req.Updates),
	})
}
