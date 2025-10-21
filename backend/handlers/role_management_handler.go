package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// RoleManagementHandler handles role management operations
type RoleManagementHandler struct {
	permissionRepo database.PermissionRepository
}

// NewRoleManagementHandler creates a new role management handler
func NewRoleManagementHandler(permissionRepo database.PermissionRepository) *RoleManagementHandler {
	return &RoleManagementHandler{
		permissionRepo: permissionRepo,
	}
}

// GetRoles handles GET /api/v1/roles
func (h *RoleManagementHandler) GetRoles(c *gin.Context) {
	ctx := c.Request.Context()

	// 解析查询参数
	includeInactive := c.Query("include_inactive") == "true"
	moduleFilter := c.Query("module")

	// 使用优化的批量方法获取角色和权限 (解决N+1问题)
	roles, rolePermissionsMap, err := h.permissionRepo.GetRolesWithPermissions(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve roles",
			"message": err.Error(),
		})
		return
	}

	// 构建响应
	var roleResponses []models.CompanyRoleResponse
	for _, role := range roles {
		// 跳过非活跃角色（如果不包括）
		if !includeInactive && !role.IsActive {
			continue
		}

		roleResponse := role.ToResponse()

		// 从map中获取该角色的权限（已经批量加载）
		if permissions, ok := rolePermissionsMap[role.ID]; ok {
			for _, perm := range permissions {
				// 应用模块过滤
				if moduleFilter != "" && perm.Module != moduleFilter {
					continue
				}
				response := perm.ToResponse()
				response.IsGranted = true
				roleResponse.Permissions = append(roleResponse.Permissions, response)
			}
		}

		// TODO: 获取用户数量统计 - GetRoleUserCount方法暂不可用
		// userCount, err := h.permissionRepo.GetRoleUserCount(ctx, role.ID)
		// if err == nil {
		// 	roleResponse.UserCount = userCount
		// }
		roleResponse.UserCount = 0 // 临时设为0

		roleResponses = append(roleResponses, roleResponse)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"roles": roleResponses,
			"total": len(roleResponses),
		},
	})
}

// GetRole handles GET /api/v1/roles/:id
func (h *RoleManagementHandler) GetRole(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	// 获取角色信息
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	roleResponse := role.ToResponse()

	// 获取角色权限
	permissions, err := h.permissionRepo.GetRolePermissions(ctx, roleID)
	if err == nil {
		for _, perm := range permissions {
			response := perm.ToResponse()
			response.IsGranted = true
			roleResponse.Permissions = append(roleResponse.Permissions, response)
		}
	}

	// TODO: 获取用户统计 - GetRoleUserCount方法暂不可用
	// userCount, err := h.permissionRepo.GetRoleUserCount(ctx, roleID)
	// if err == nil {
	// 	roleResponse.UserCount = userCount
	// }
	roleResponse.UserCount = 0 // 临时设为0

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    roleResponse,
	})
}

// CreateRole handles POST /api/v1/roles
func (h *RoleManagementHandler) CreateRole(c *gin.Context) {
	ctx := c.Request.Context()

	var req models.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// 检查角色代码是否已存在
	existingRole, _ := h.permissionRepo.GetRoleByCode(ctx, req.RoleCode)
	if existingRole != nil {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "Role code already exists",
		})
		return
	}

	// 创建角色
	role := &models.CompanyRole{
		RoleCode:        req.RoleCode,
		RoleName:        req.RoleName,
		RoleDescription: &req.RoleDescription,
		IsSystemRole:    false,
		IsActive:        true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	createdRole, err := h.permissionRepo.CreateRole(ctx, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create role",
			"message": err.Error(),
		})
		return
	}

	// 设置权限（如果提供）
	if len(req.PermissionCodes) > 0 {
		permissionIDs, err := h.getPermissionIDsByCodes(ctx, req.PermissionCodes)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid permission codes",
				"message": err.Error(),
			})
			return
		}

		err = h.permissionRepo.SetRolePermissions(ctx, createdRole.ID, permissionIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Role created but failed to set permissions",
				"message": err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    createdRole.ToResponse(),
		"message": "Role created successfully",
	})
}

// UpdateRole handles PUT /api/v1/roles/:id
func (h *RoleManagementHandler) UpdateRole(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	var req models.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// 获取现有角色
	existingRole, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	// 检查是否为系统角色
	if existingRole.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot modify system roles",
		})
		return
	}

	// 更新角色信息
	existingRole.RoleName = req.RoleName
	existingRole.RoleDescription = &req.RoleDescription
	existingRole.UpdatedAt = time.Now()

	updatedRole, err := h.permissionRepo.UpdateRole(ctx, existingRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update role",
			"message": err.Error(),
		})
		return
	}

	// 更新权限（如果提供）
	if len(req.PermissionCodes) > 0 {
		permissionIDs, err := h.getPermissionIDsByCodes(ctx, req.PermissionCodes)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid permission codes",
				"message": err.Error(),
			})
			return
		}

		err = h.permissionRepo.SetRolePermissions(ctx, roleID, permissionIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Role updated but failed to set permissions",
				"message": err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updatedRole.ToResponse(),
		"message": "Role updated successfully",
	})
}

// DeleteRole handles DELETE /api/v1/roles/:id
func (h *RoleManagementHandler) DeleteRole(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	// 获取角色信息
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	// 检查是否为系统角色
	if role.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot delete system roles",
		})
		return
	}

	// TODO: 检查是否有用户使用该角色 - GetRoleUserCount方法暂不可用
	// userCount, err := h.permissionRepo.GetRoleUserCount(ctx, roleID)
	// if err != nil {
	// 	c.JSON(http.StatusInternalServerError, gin.H{
	// 		"success": false,
	// 		"message": "Failed to check role usage",
	// 		"error":   err.Error(),
	// 	})
	// 	return
	// }
	userCount := 0                       // 临时设为0
	if err := (error)(nil); err != nil { // 避免未使用变量警告
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to check role usage",
		})
		return
	}

	if userCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "Cannot delete role with active users",
			"details": fmt.Sprintf("Role has %d active users", userCount),
		})
		return
	}

	// 删除角色
	err = h.permissionRepo.DeleteRole(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete role",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Role deleted successfully",
	})
}

// UpdateRoleStatus handles PATCH /api/v1/roles/:id/status
func (h *RoleManagementHandler) UpdateRoleStatus(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// 获取角色信息
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	// 检查是否为系统角色
	if role.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot modify system role status",
		})
		return
	}

	// 更新状态
	role.IsActive = req.IsActive
	role.UpdatedAt = time.Now()

	updatedRole, err := h.permissionRepo.UpdateRole(ctx, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update role status",
			"message": err.Error(),
		})
		return
	}

	action := "activated"
	if !req.IsActive {
		action = "deactivated"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updatedRole.ToResponse(),
		"message": fmt.Sprintf("Role %s successfully", action),
	})
}

// GetRolePermissions handles GET /api/v1/roles/:id/permissions
func (h *RoleManagementHandler) GetRolePermissions(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	// 检查角色是否存在
	_, err = h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	// 获取所有权限以便对比
	allPermissions, err := h.permissionRepo.GetPermissions(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get permissions",
		})
		return
	}

	// 获取角色拥有的权限
	rolePermissions, err := h.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get role permissions",
		})
		return
	}

	// 创建权限映射
	grantedPermissions := make(map[int]bool)
	for _, perm := range rolePermissions {
		grantedPermissions[perm.ID] = true
	}

	// 构建响应
	var permissionResponses []models.PermissionResponse
	for _, perm := range allPermissions {
		response := perm.ToResponse()
		response.IsGranted = grantedPermissions[perm.ID]
		permissionResponses = append(permissionResponses, response)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"permissions":   permissionResponses,
			"granted_count": len(rolePermissions),
			"total_count":   len(allPermissions),
		},
	})
}

// SetRolePermissions handles POST /api/v1/roles/:id/permissions
func (h *RoleManagementHandler) SetRolePermissions(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	var req struct {
		PermissionIDs   []int    `json:"permission_ids"`
		PermissionCodes []string `json:"permission_codes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// 检查角色是否存在且不是系统角色
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	if role.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot modify system role permissions",
		})
		return
	}

	// 处理权限ID或代码
	var permissionIDs []int
	if len(req.PermissionIDs) > 0 {
		permissionIDs = req.PermissionIDs
	} else if len(req.PermissionCodes) > 0 {
		permissionIDs, err = h.getPermissionIDsByCodes(ctx, req.PermissionCodes)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid permission codes",
				"message": err.Error(),
			})
			return
		}
	}

	// 设置角色权限
	err = h.permissionRepo.SetRolePermissions(ctx, roleID, permissionIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to set role permissions",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Role permissions updated successfully",
		"data": gin.H{
			"granted_count": len(permissionIDs),
		},
	})
}

// UpdateRolePermissions handles PATCH /api/v1/roles/:id/permissions
func (h *RoleManagementHandler) UpdateRolePermissions(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	var req struct {
		Add    []string `json:"add"`    // 要添加的权限代码
		Remove []string `json:"remove"` // 要移除的权限代码
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// 检查角色是否存在且不是系统角色
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	if role.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot modify system role permissions",
		})
		return
	}

	// 获取当前角色权限
	currentPermissions, err := h.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get current permissions",
		})
		return
	}

	// 创建当前权限映射
	currentPermissionIDs := make(map[int]bool)
	for _, perm := range currentPermissions {
		currentPermissionIDs[perm.ID] = true
	}

	// 处理要添加的权限
	if len(req.Add) > 0 {
		addIDs, err := h.getPermissionIDsByCodes(ctx, req.Add)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid permission codes in add list",
				"message": err.Error(),
			})
			return
		}

		for _, id := range addIDs {
			currentPermissionIDs[id] = true
		}
	}

	// 处理要移除的权限
	if len(req.Remove) > 0 {
		removeIDs, err := h.getPermissionIDsByCodes(ctx, req.Remove)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid permission codes in remove list",
				"message": err.Error(),
			})
			return
		}

		for _, id := range removeIDs {
			delete(currentPermissionIDs, id)
		}
	}

	// 构建最终权限列表
	var finalPermissionIDs []int
	for id := range currentPermissionIDs {
		finalPermissionIDs = append(finalPermissionIDs, id)
	}

	// 更新角色权限
	err = h.permissionRepo.SetRolePermissions(ctx, roleID, finalPermissionIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update role permissions",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Role permissions updated successfully",
		"data": gin.H{
			"granted_count": len(finalPermissionIDs),
			"added":         len(req.Add),
			"removed":       len(req.Remove),
		},
	})
}

// RemoveRolePermission handles DELETE /api/v1/roles/:id/permissions/:permissionId
func (h *RoleManagementHandler) RemoveRolePermission(c *gin.Context) {
	ctx := c.Request.Context()

	roleID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid role ID",
		})
		return
	}

	permissionID, err := strconv.Atoi(c.Param("permissionId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid permission ID",
		})
		return
	}

	// 检查角色是否存在且不是系统角色
	role, err := h.permissionRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Role not found",
		})
		return
	}

	if role.IsSystemRole {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Cannot modify system role permissions",
		})
		return
	}

	// 获取当前角色权限
	currentPermissions, err := h.permissionRepo.GetRolePermissions(ctx, roleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get current permissions",
			"error":   err.Error(),
		})
		return
	}

	// 移除指定权限
	var newPermissionIDs []int
	for _, perm := range currentPermissions {
		if perm.ID != permissionID {
			newPermissionIDs = append(newPermissionIDs, perm.ID)
		}
	}

	// 设置新的权限列表
	err = h.permissionRepo.SetRolePermissions(ctx, roleID, newPermissionIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to remove permission",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Permission removed from role successfully",
	})
}

// getPermissionIDsByCodes 根据权限代码获取权限ID列表
func (h *RoleManagementHandler) getPermissionIDsByCodes(ctx context.Context, permissionCodes []string) ([]int, error) {
	allPermissions, err := h.permissionRepo.GetPermissions(ctx)
	if err != nil {
		return nil, err
	}

	// 创建代码到ID的映射
	codeToID := make(map[string]int)
	for _, perm := range allPermissions {
		codeToID[perm.PermissionCode] = perm.ID
	}

	// 获取请求的权限ID
	var permissionIDs []int
	for _, code := range permissionCodes {
		if id, exists := codeToID[code]; exists {
			permissionIDs = append(permissionIDs, id)
		} else {
			return nil, fmt.Errorf("permission code not found: %s", code)
		}
	}

	return permissionIDs, nil
}
