package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// RoleManagementHandlerV2 handles RBAC v2 dual-layer role management
type RoleManagementHandlerV2 struct {
	permissionRepo database.PermissionRepository
}

// NewRoleManagementHandlerV2 creates a new RBAC v2 role management handler
func NewRoleManagementHandlerV2(permissionRepo database.PermissionRepository) *RoleManagementHandlerV2 {
	return &RoleManagementHandlerV2{
		permissionRepo: permissionRepo,
	}
}

// =============================================================================
// System Role Management (Read-Only for most users)
// =============================================================================

// GetSystemRoles godoc
// @Summary      Get all system roles
// @Description  Retrieves all system-level role templates (read-only)
// @Tags         Roles (RBAC v2)
// @Accept       json
// @Produce      json
// @Success      200  {object}  map[string]interface{}  "System roles list"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /api/v1/system/roles [get]
// @Security     BearerAuth
func (h *RoleManagementHandlerV2) GetSystemRoles(c *gin.Context) {
	ctx := c.Request.Context()

	roles, err := h.permissionRepo.GetSystemRoles(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve system roles",
			"details": err.Error(),
		})
		return
	}

	// For each role, get permission counts
	rolesWithStats := make([]map[string]interface{}, 0, len(roles))
	for _, role := range roles {
		permissions, err := h.permissionRepo.GetRolePermissions(ctx, role.ID)
		permissionCount := 0
		if err == nil {
			permissionCount = len(permissions)
		}

		rolesWithStats = append(rolesWithStats, map[string]interface{}{
			"id":               role.ID,
			"role_code":        role.RoleCode,
			"role_name":        role.RoleName,
			"role_description": role.RoleDescription,
			"is_system_role":   role.IsSystemRole,
			"is_active":        role.IsActive,
			"permission_count": permissionCount,
			"created_at":       role.CreatedAt,
			"updated_at":       role.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"roles": rolesWithStats,
		"total": len(rolesWithStats),
	})
}

// GetSystemRolePermissions godoc
// @Summary      Get permissions for a system role
// @Description  Retrieves all permissions assigned to a system role template
// @Tags         Roles (RBAC v2)
// @Accept       json
// @Produce      json
// @Param        roleId  path      int  true  "System Role ID"
// @Success      200  {object}  map[string]interface{}  "Role permissions"
// @Failure      400  {object}  map[string]interface{}  "Invalid role ID"
// @Failure      404  {object}  map[string]interface{}  "Role not found"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /api/v1/system/roles/{roleId}/permissions [get]
// @Security     BearerAuth
func (h *RoleManagementHandlerV2) GetSystemRolePermissions(c *gin.Context) {
	ctx := c.Request.Context()

	roleIDStr := c.Param("roleId")
	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	// Verify it's a system role
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	if !role.IsSystemRole {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Not a system role"})
		return
	}

	permissions, err := h.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve role permissions",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"role":        role,
		"permissions": permissions,
		"total":       len(permissions),
	})
}

// =============================================================================
// Enterprise Role Management
// =============================================================================

// GetEnterpriseRoles godoc
// @Summary      Get enterprise roles
// @Description  Retrieves all roles for a specific enterprise
// @Tags         Roles (RBAC v2)
// @Accept       json
// @Produce      json
// @Param        enterpriseId  path      int  true  "Enterprise ID"
// @Success      200  {object}  map[string]interface{}  "Enterprise roles list"
// @Failure      400  {object}  map[string]interface{}  "Invalid enterprise ID"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /api/v1/enterprises/{enterpriseId}/roles [get]
// @Security     BearerAuth
func (h *RoleManagementHandlerV2) GetEnterpriseRoles(c *gin.Context) {
	ctx := c.Request.Context()

	enterpriseIDStr := c.Param("enterpriseId")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enterprise ID"})
		return
	}

	roles, err := h.permissionRepo.GetEnterpriseRoles(ctx, enterpriseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve enterprise roles",
			"details": err.Error(),
		})
		return
	}

	// For each role, get permission counts
	rolesWithStats := make([]map[string]interface{}, 0, len(roles))
	for _, role := range roles {
		permissions, err := h.permissionRepo.GetRolePermissions(ctx, role.ID)
		permissionCount := 0
		if err == nil {
			permissionCount = len(permissions)
		}

		rolesWithStats = append(rolesWithStats, map[string]interface{}{
			"id":               role.ID,
			"role_code":        role.RoleCode,
			"role_name":        role.RoleName,
			"role_description": role.RoleDescription,
			"is_system_role":   role.IsSystemRole,
			"is_active":        role.IsActive,
			"enterprise_id":    role.EnterpriseID,
			"permission_count": permissionCount,
			"created_at":       role.CreatedAt,
			"updated_at":       role.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"roles": rolesWithStats,
		"total": len(rolesWithStats),
		"enterprise_id": enterpriseID,
	})
}

// GetEnterpriseRolePermissions godoc
// @Summary      Get permissions for an enterprise role
// @Description  Retrieves all permissions assigned to a specific enterprise role
// @Tags         Roles (RBAC v2)
// @Accept       json
// @Produce      json
// @Param        enterpriseId  path      int  true  "Enterprise ID"
// @Param        roleId        path      int  true  "Role ID"
// @Success      200  {object}  map[string]interface{}  "Role permissions"
// @Failure      400  {object}  map[string]interface{}  "Invalid parameters"
// @Failure      403  {object}  map[string]interface{}  "Role does not belong to enterprise"
// @Failure      404  {object}  map[string]interface{}  "Role not found"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /api/v1/enterprises/{enterpriseId}/roles/{roleId}/permissions [get]
// @Security     BearerAuth
func (h *RoleManagementHandlerV2) GetEnterpriseRolePermissions(c *gin.Context) {
	ctx := c.Request.Context()

	enterpriseIDStr := c.Param("enterpriseId")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enterprise ID"})
		return
	}

	roleIDStr := c.Param("roleId")
	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	// Verify role belongs to enterprise
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	if role.EnterpriseID == nil || *role.EnterpriseID != enterpriseID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Role does not belong to this enterprise"})
		return
	}

	permissions, err := h.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve role permissions",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"role":        role,
		"permissions": permissions,
		"total":       len(permissions),
	})
}

// CreateEnterpriseRole godoc
// @Summary      Create enterprise role
// @Description  Creates a new role for an enterprise, optionally from a system template
// @Tags         Roles (RBAC v2)
// @Accept       json
// @Produce      json
// @Param        enterpriseId  path      int  true  "Enterprise ID"
// @Param        request       body      CreateEnterpriseRoleRequest  true  "Role creation request"
// @Success      201  {object}  map[string]interface{}  "Created role"
// @Failure      400  {object}  map[string]interface{}  "Invalid request"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /api/v1/enterprises/{enterpriseId}/roles [post]
// @Security     BearerAuth
func (h *RoleManagementHandlerV2) CreateEnterpriseRole(c *gin.Context) {
	ctx := c.Request.Context()

	enterpriseIDStr := c.Param("enterpriseId")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enterprise ID"})
		return
	}

	var req CreateEnterpriseRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	var createdRole *models.CompanyRole

	// If template_role_code provided, create from template
	if req.TemplateRoleCode != nil && *req.TemplateRoleCode != "" {
		createdRole, err = h.permissionRepo.CreateRoleFromTemplate(ctx, *req.TemplateRoleCode, enterpriseID, &req.RoleName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create role from template",
				"details": err.Error(),
			})
			return
		}
	} else {
		// Create custom role
		newRole := &models.CompanyRole{
			RoleCode:        req.RoleCode,
			RoleName:        req.RoleName,
			RoleDescription: &req.RoleDescription,
			IsSystemRole:    false,
			IsActive:        true,
			EnterpriseID:    &enterpriseID,
		}

		createdRole, err = h.permissionRepo.CreateRole(ctx, newRole)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create role",
				"details": err.Error(),
			})
			return
		}

		// Set permissions if provided
		if len(req.PermissionIDs) > 0 {
			err = h.permissionRepo.SetRolePermissions(ctx, createdRole.ID, req.PermissionIDs)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Role created but failed to set permissions",
					"details": err.Error(),
				})
				return
			}
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"role": createdRole,
		"message": "Enterprise role created successfully",
	})
}

// UpdateEnterpriseRole godoc
// @Summary      Update enterprise role
// @Description  Updates an enterprise role's details and permissions
// @Tags         Roles (RBAC v2)
// @Accept       json
// @Produce      json
// @Param        enterpriseId  path      int  true  "Enterprise ID"
// @Param        roleId        path      int  true  "Role ID"
// @Param        request       body      UpdateEnterpriseRoleRequest  true  "Role update request"
// @Success      200  {object}  map[string]interface{}  "Updated role"
// @Failure      400  {object}  map[string]interface{}  "Invalid request"
// @Failure      403  {object}  map[string]interface{}  "Cannot modify system role or role from different enterprise"
// @Failure      404  {object}  map[string]interface{}  "Role not found"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /api/v1/enterprises/{enterpriseId}/roles/{roleId} [put]
// @Security     BearerAuth
func (h *RoleManagementHandlerV2) UpdateEnterpriseRole(c *gin.Context) {
	ctx := c.Request.Context()

	enterpriseIDStr := c.Param("enterpriseId")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enterprise ID"})
		return
	}

	roleIDStr := c.Param("roleId")
	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var req UpdateEnterpriseRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Verify role exists and belongs to enterprise
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	if role.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify system role"})
		return
	}

	if role.EnterpriseID == nil || *role.EnterpriseID != enterpriseID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Role does not belong to this enterprise"})
		return
	}

	// Update role details
	role.RoleName = req.RoleName
	role.RoleDescription = &req.RoleDescription

	updatedRole, err := h.permissionRepo.UpdateRole(ctx, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update role",
			"details": err.Error(),
		})
		return
	}

	// Update permissions if provided
	if req.PermissionIDs != nil {
		err = h.permissionRepo.SetRolePermissions(ctx, roleID, req.PermissionIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Role updated but failed to set permissions",
				"details": err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"role": updatedRole,
		"message": "Enterprise role updated successfully",
	})
}

// DeleteEnterpriseRole godoc
// @Summary      Delete enterprise role
// @Description  Deletes an enterprise role (soft delete)
// @Tags         Roles (RBAC v2)
// @Accept       json
// @Produce      json
// @Param        enterpriseId  path      int  true  "Enterprise ID"
// @Param        roleId        path      int  true  "Role ID"
// @Success      200  {object}  map[string]interface{}  "Deletion successful"
// @Failure      400  {object}  map[string]interface{}  "Invalid parameters"
// @Failure      403  {object}  map[string]interface{}  "Cannot delete system role or role from different enterprise"
// @Failure      404  {object}  map[string]interface{}  "Role not found"
// @Failure      500  {object}  map[string]interface{}  "Internal server error"
// @Router       /api/v1/enterprises/{enterpriseId}/roles/{roleId} [delete]
// @Security     BearerAuth
func (h *RoleManagementHandlerV2) DeleteEnterpriseRole(c *gin.Context) {
	ctx := c.Request.Context()

	enterpriseIDStr := c.Param("enterpriseId")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enterprise ID"})
		return
	}

	roleIDStr := c.Param("roleId")
	roleID, err := strconv.Atoi(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	// Verify role exists and belongs to enterprise
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	if role.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete system role"})
		return
	}

	if role.EnterpriseID == nil || *role.EnterpriseID != enterpriseID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Role does not belong to this enterprise"})
		return
	}

	err = h.permissionRepo.DeleteRole(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete role",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role deleted successfully",
	})
}

// =============================================================================
// Request/Response Models
// =============================================================================

// CreateEnterpriseRoleRequest represents request to create enterprise role
type CreateEnterpriseRoleRequest struct {
	RoleCode         string  `json:"role_code" binding:"required"`
	RoleName         string  `json:"role_name" binding:"required"`
	RoleDescription  string  `json:"role_description"`
	TemplateRoleCode *string `json:"template_role_code,omitempty"` // If provided, create from template
	PermissionIDs    []int   `json:"permission_ids,omitempty"`     // Only used if not creating from template
}

// UpdateEnterpriseRoleRequest represents request to update enterprise role
type UpdateEnterpriseRoleRequest struct {
	RoleName        string `json:"role_name" binding:"required"`
	RoleDescription string `json:"role_description"`
	PermissionIDs   []int  `json:"permission_ids,omitempty"`
}
