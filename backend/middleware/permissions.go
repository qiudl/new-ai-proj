// backend/middleware/permissions.go
package middleware

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Permission constants
const (
	// System permissions
	PermSystemAdmin      = "system.admin"
	PermSystemUsers      = "system.users"
	PermSystemAudit      = "system.audit"
	PermSystemConfig     = "system.config"

	// Project permissions
	PermProjectView      = "project.view"
	PermProjectCreate    = "project.create"
	PermProjectUpdate    = "project.update"
	PermProjectDelete    = "project.delete"
	PermProjectManage    = "project.manage"

	// Task permissions
	PermTaskView         = "task.view"
	PermTaskCreate       = "task.create"
	PermTaskUpdate       = "task.update"
	PermTaskDelete       = "task.delete"
	PermTaskAssign       = "task.assign"
	PermTaskBulkUpdate   = "task.bulk_update"
	PermTaskBulkDelete   = "task.bulk_delete"

	// User permissions
	PermUserProfile      = "user.profile"
	PermUserPassword     = "user.password"
	PermUserSessions     = "user.sessions"
)

// PermissionManager handles permission checks and caching
type PermissionManager struct {
	db                database.DB
	permissionCache   map[string]map[string]bool // userID -> permission -> allowed
	projectAccessCache map[string]map[int]bool   // userID -> projectID -> allowed
	cacheMutex        sync.RWMutex
	cacheExpiry       time.Duration
	lastCacheUpdate   map[string]time.Time // userID -> last update time
}

// Permission represents a system permission
type Permission struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

// Role represents a user role with permissions
type Role struct {
	ID          int          `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	IsSystem    bool         `json:"is_system"`
	Permissions []Permission `json:"permissions"`
}

// NewPermissionManager creates a new permission manager
func NewPermissionManager(db database.DB) *PermissionManager {
	return &PermissionManager{
		db:                 db,
		permissionCache:    make(map[string]map[string]bool),
		projectAccessCache: make(map[string]map[int]bool),
		cacheExpiry:        5 * time.Minute,
		lastCacheUpdate:    make(map[string]time.Time),
	}
}

// RequirePermission middleware that requires a specific permission
func (pm *PermissionManager) RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			pm.respondForbidden(c, "Authentication required")
			return
		}

		uid, ok := userID.(int)
		if !ok {
			pm.respondForbidden(c, "Invalid user context")
			return
		}

		// Check permission
		hasPermission, err := pm.HasPermission(c.Request.Context(), uid, permission, nil)
		if err != nil || !hasPermission {
			pm.respondForbidden(c, fmt.Sprintf("Permission denied: %s", permission))
			return
		}

		c.Next()
	}
}

// RequireProjectPermission middleware that requires permission on a specific project
func (pm *PermissionManager) RequireProjectPermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			pm.respondForbidden(c, "Authentication required")
			return
		}

		uid, ok := userID.(int)
		if !ok {
			pm.respondForbidden(c, "Invalid user context")
			return
		}

		// Extract project ID from URL
		projectIDStr := c.Param("id")
		if projectIDStr == "" {
			pm.respondBadRequest(c, "Project ID required")
			return
		}

		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			pm.respondBadRequest(c, "Invalid project ID")
			return
		}

		// Check project-specific permission
		hasPermission, err := pm.HasPermission(c.Request.Context(), uid, permission, &projectID)
		if err != nil || !hasPermission {
			pm.respondForbidden(c, fmt.Sprintf("Permission denied for project %d: %s", projectID, permission))
			return
		}

		c.Set("project_id", projectID)
		c.Next()
	}
}

// RequireProjectAccess middleware that requires basic access to a project
func (pm *PermissionManager) RequireProjectAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			pm.respondForbidden(c, "Authentication required")
			return
		}

		uid, ok := userID.(int)
		if !ok {
			pm.respondForbidden(c, "Invalid user context")
			return
		}

		// Extract project ID from URL
		projectIDStr := c.Param("id")
		if projectIDStr == "" {
			pm.respondBadRequest(c, "Project ID required")
			return
		}

		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			pm.respondBadRequest(c, "Invalid project ID")
			return
		}

		// Check project access
		hasAccess, err := pm.HasProjectAccess(c.Request.Context(), uid, projectID)
		if err != nil || !hasAccess {
			pm.respondForbidden(c, fmt.Sprintf("Access denied to project %d", projectID))
			return
		}

		c.Set("project_id", projectID)
		c.Next()
	}
}

// HasPermission checks if a user has a specific permission
func (pm *PermissionManager) HasPermission(ctx context.Context, userID int, permission string, projectID *int) (bool, error) {
	userKey := fmt.Sprintf("%d", userID)

	// Check cache first
	pm.cacheMutex.RLock()
	if userPerms, exists := pm.permissionCache[userKey]; exists {
		if lastUpdate, hasUpdate := pm.lastCacheUpdate[userKey]; hasUpdate {
			if time.Since(lastUpdate) < pm.cacheExpiry {
				var permKey string
				if projectID != nil {
					permKey = fmt.Sprintf("%s:%d", permission, *projectID)
				} else {
					permKey = permission
				}
				if allowed, cached := userPerms[permKey]; cached {
					pm.cacheMutex.RUnlock()
					return allowed, nil
				}
			}
		}
	}
	pm.cacheMutex.RUnlock()

	// Query database
	allowed, err := pm.checkPermissionInDB(ctx, userID, permission, projectID)
	if err != nil {
		return false, err
	}

	// Update cache
	pm.updatePermissionCache(userKey, permission, projectID, allowed)

	return allowed, nil
}

// HasProjectAccess checks if a user has access to a project
func (pm *PermissionManager) HasProjectAccess(ctx context.Context, userID, projectID int) (bool, error) {
	userKey := fmt.Sprintf("%d", userID)

	// Check cache first
	pm.cacheMutex.RLock()
	if projectAccess, exists := pm.projectAccessCache[userKey]; exists {
		if lastUpdate, hasUpdate := pm.lastCacheUpdate[userKey]; hasUpdate {
			if time.Since(lastUpdate) < pm.cacheExpiry {
				if allowed, cached := projectAccess[projectID]; cached {
					pm.cacheMutex.RUnlock()
					return allowed, nil
				}
			}
		}
	}
	pm.cacheMutex.RUnlock()

	// Query database
	allowed, err := pm.checkProjectAccessInDB(ctx, userID, projectID)
	if err != nil {
		return false, err
	}

	// Update cache
	pm.updateProjectAccessCache(userKey, projectID, allowed)

	return allowed, nil
}

// CanModifyTask checks if a user can modify a specific task
func (pm *PermissionManager) CanModifyTask(ctx context.Context, userID, taskID int) (bool, error) {
	// Get task details
	task, err := pm.db.Tasks().GetByID(ctx, taskID)
	if err != nil {
		return false, err
	}

	// Check if user is the task assignee
	if task.AssigneeID != nil && *task.AssigneeID == userID {
		return true, nil
	}

	// Check if user has task update permission for the project
	return pm.HasPermission(ctx, userID, PermTaskUpdate, &task.ProjectID)
}

// GrantPermission grants a permission to a user
func (pm *PermissionManager) GrantPermission(ctx context.Context, userID, permissionID int, projectID *int, grantedBy int) error {
	query := `
		INSERT INTO user_permissions (user_id, permission_id, project_id, granted, granted_by, created_at)
		VALUES ($1, $2, $3, true, $4, NOW())
		ON CONFLICT (user_id, permission_id, COALESCE(project_id, 0))
		DO UPDATE SET granted = true, granted_by = $4, created_at = NOW()`

	_, err := pm.db.Exec(query, userID, permissionID, projectID, grantedBy)
	if err != nil {
		return err
	}

	// Clear cache for this user
	pm.clearUserCache(fmt.Sprintf("%d", userID))

	return nil
}

// RevokePermission revokes a permission from a user
func (pm *PermissionManager) RevokePermission(ctx context.Context, userID, permissionID int, projectID *int, revokedBy int) error {
	query := `
		INSERT INTO user_permissions (user_id, permission_id, project_id, granted, granted_by, created_at)
		VALUES ($1, $2, $3, false, $4, NOW())
		ON CONFLICT (user_id, permission_id, COALESCE(project_id, 0))
		DO UPDATE SET granted = false, granted_by = $4, created_at = NOW()`

	_, err := pm.db.Exec(query, userID, permissionID, projectID, revokedBy)
	if err != nil {
		return err
	}

	// Clear cache for this user
	pm.clearUserCache(fmt.Sprintf("%d", userID))

	return nil
}

// GetUserPermissions gets all permissions for a user
func (pm *PermissionManager) GetUserPermissions(ctx context.Context, userID int, projectID *int) ([]Permission, error) {
	var query string
	var args []interface{}

	if projectID == nil {
		// Get global permissions
		query = `
			SELECT DISTINCT p.id, p.name, p.description, p.category
			FROM permissions p
			JOIN (
				-- Role-based permissions
				SELECT rp.permission_id
				FROM users u
				JOIN roles r ON u.role = r.name
				JOIN role_permissions rp ON r.id = rp.role_id
				WHERE u.id = $1
				
				UNION
				
				-- Direct user permissions (global)
				SELECT up.permission_id
				FROM user_permissions up
				WHERE up.user_id = $1 AND up.project_id IS NULL AND up.granted = true
				AND up.id = (
					SELECT MAX(id) FROM user_permissions up2 
					WHERE up2.user_id = up.user_id AND up2.permission_id = up.permission_id 
					AND up2.project_id IS NULL
				)
			) AS user_perms ON p.id = user_perms.permission_id
			ORDER BY p.category, p.name`
		args = []interface{}{userID}
	} else {
		// Get project-specific permissions
		query = `
			SELECT DISTINCT p.id, p.name, p.description, p.category
			FROM permissions p
			JOIN (
				-- Project member role permissions
				SELECT rp.permission_id
				FROM project_members pm
				JOIN role_permissions rp ON pm.role_id = rp.role_id
				WHERE pm.user_id = $1 AND pm.project_id = $2
				
				UNION
				
				-- Direct project permissions
				SELECT up.permission_id
				FROM user_permissions up
				WHERE up.user_id = $1 AND up.project_id = $2 AND up.granted = true
				AND up.id = (
					SELECT MAX(id) FROM user_permissions up2 
					WHERE up2.user_id = up.user_id AND up2.permission_id = up.permission_id 
					AND up2.project_id = up.project_id
				)
			) AS user_perms ON p.id = user_perms.permission_id
			ORDER BY p.category, p.name`
		args = []interface{}{userID, *projectID}
	}

	rows, err := pm.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []Permission
	for rows.Next() {
		var perm Permission
		err := rows.Scan(&perm.ID, &perm.Name, &perm.Description, &perm.Category)
		if err != nil {
			continue
		}
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

// Database query methods

func (pm *PermissionManager) checkPermissionInDB(ctx context.Context, userID int, permission string, projectID *int) (bool, error) {
	var query string
	var args []interface{}

	if projectID == nil {
		// Check global permission
		query = `
			SELECT EXISTS(
				-- Role-based permissions
				SELECT 1
				FROM users u
				JOIN roles r ON u.role = r.name
				JOIN role_permissions rp ON r.id = rp.role_id
				JOIN permissions p ON rp.permission_id = p.id
				WHERE u.id = $1 AND p.name = $2
				
				UNION
				
				-- Direct user permissions (global)
				SELECT 1
				FROM user_permissions up
				JOIN permissions p ON up.permission_id = p.id
				WHERE up.user_id = $1 AND p.name = $2 AND up.project_id IS NULL AND up.granted = true
				AND up.id = (
					SELECT MAX(id) FROM user_permissions up2 
					WHERE up2.user_id = up.user_id AND up2.permission_id = up.permission_id 
					AND up2.project_id IS NULL
				)
			)`
		args = []interface{}{userID, permission}
	} else {
		// Check project-specific permission
		query = `
			SELECT EXISTS(
				-- Project member role permissions
				SELECT 1
				FROM project_members pm
				JOIN role_permissions rp ON pm.role_id = rp.role_id
				JOIN permissions p ON rp.permission_id = p.id
				WHERE pm.user_id = $1 AND pm.project_id = $2 AND p.name = $3
				
				UNION
				
				-- Direct project permissions
				SELECT 1
				FROM user_permissions up
				JOIN permissions p ON up.permission_id = p.id
				WHERE up.user_id = $1 AND up.project_id = $2 AND p.name = $3 AND up.granted = true
				AND up.id = (
					SELECT MAX(id) FROM user_permissions up2 
					WHERE up2.user_id = up.user_id AND up2.permission_id = up.permission_id 
					AND up2.project_id = up.project_id
				)
				
				UNION
				
				-- Global permissions that apply to projects
				SELECT 1
				FROM users u
				JOIN roles r ON u.role = r.name
				JOIN role_permissions rp ON r.id = rp.role_id
				JOIN permissions p ON rp.permission_id = p.id
				WHERE u.id = $1 AND p.name = $3 AND p.category IN ('system', 'project')
			)`
		args = []interface{}{userID, *projectID, permission}
	}

	var exists bool
	err := pm.db.QueryRow(query, args...).Scan(&exists)
	return exists, err
}

func (pm *PermissionManager) checkProjectAccessInDB(ctx context.Context, userID, projectID int) (bool, error) {
	query := `
		SELECT EXISTS(
			-- Project owner
			SELECT 1 FROM projects WHERE id = $2 AND owner_id = $1
			
			UNION
			
			-- Project member
			SELECT 1 FROM project_members WHERE user_id = $1 AND project_id = $2
			
			UNION
			
			-- Admin users have access to all projects
			SELECT 1 FROM users WHERE id = $1 AND role = 'admin'
		)`

	var exists bool
	err := pm.db.QueryRow(query, userID, projectID).Scan(&exists)
	return exists, err
}

// Cache management methods

func (pm *PermissionManager) updatePermissionCache(userKey, permission string, projectID *int, allowed bool) {
	pm.cacheMutex.Lock()
	defer pm.cacheMutex.Unlock()

	if pm.permissionCache[userKey] == nil {
		pm.permissionCache[userKey] = make(map[string]bool)
	}

	var permKey string
	if projectID != nil {
		permKey = fmt.Sprintf("%s:%d", permission, *projectID)
	} else {
		permKey = permission
	}

	pm.permissionCache[userKey][permKey] = allowed
	pm.lastCacheUpdate[userKey] = time.Now()
}

func (pm *PermissionManager) updateProjectAccessCache(userKey string, projectID int, allowed bool) {
	pm.cacheMutex.Lock()
	defer pm.cacheMutex.Unlock()

	if pm.projectAccessCache[userKey] == nil {
		pm.projectAccessCache[userKey] = make(map[int]bool)
	}

	pm.projectAccessCache[userKey][projectID] = allowed
	pm.lastCacheUpdate[userKey] = time.Now()
}

func (pm *PermissionManager) clearUserCache(userKey string) {
	pm.cacheMutex.Lock()
	defer pm.cacheMutex.Unlock()

	delete(pm.permissionCache, userKey)
	delete(pm.projectAccessCache, userKey)
	delete(pm.lastCacheUpdate, userKey)
}

// Response helpers

func (pm *PermissionManager) respondForbidden(c *gin.Context, message string) {
	response := models.NewErrorResponse(models.ErrCodeAuthorization, message, nil)
	c.JSON(http.StatusForbidden, response)
	c.Abort()
}

func (pm *PermissionManager) respondBadRequest(c *gin.Context, message string) {
	response := models.NewErrorResponse(models.ErrCodeBadRequest, message, nil)
	c.JSON(http.StatusBadRequest, response)
	c.Abort()
}

// Default permissions and roles

func DefaultPermissions() []Permission {
	return []Permission{
		// System permissions
		{Name: PermSystemAdmin, Description: "Full system administration", Category: "system"},
		{Name: PermSystemUsers, Description: "Manage users and roles", Category: "system"},
		{Name: PermSystemAudit, Description: "View audit logs", Category: "system"},
		{Name: PermSystemConfig, Description: "Manage system configuration", Category: "system"},

		// Project permissions
		{Name: PermProjectView, Description: "View projects", Category: "project"},
		{Name: PermProjectCreate, Description: "Create new projects", Category: "project"},
		{Name: PermProjectUpdate, Description: "Update project details", Category: "project"},
		{Name: PermProjectDelete, Description: "Delete projects", Category: "project"},
		{Name: PermProjectManage, Description: "Full project management", Category: "project"},

		// Task permissions
		{Name: PermTaskView, Description: "View tasks", Category: "task"},
		{Name: PermTaskCreate, Description: "Create new tasks", Category: "task"},
		{Name: PermTaskUpdate, Description: "Update task details", Category: "task"},
		{Name: PermTaskDelete, Description: "Delete tasks", Category: "task"},
		{Name: PermTaskAssign, Description: "Assign tasks to users", Category: "task"},
		{Name: PermTaskBulkUpdate, Description: "Bulk update tasks", Category: "task"},
		{Name: PermTaskBulkDelete, Description: "Bulk delete tasks", Category: "task"},

		// User permissions
		{Name: PermUserProfile, Description: "Update own profile", Category: "user"},
		{Name: PermUserPassword, Description: "Change own password", Category: "user"},
		{Name: PermUserSessions, Description: "Manage own sessions", Category: "user"},
	}
}

func DefaultRoles() []Role {
	permissions := DefaultPermissions()
	
	// Helper function to find permissions by name
	findPerms := func(names ...string) []Permission {
		var result []Permission
		for _, name := range names {
			for _, perm := range permissions {
				if perm.Name == name {
					result = append(result, perm)
					break
				}
			}
		}
		return result
	}

	return []Role{
		{
			Name:        "admin",
			Description: "System administrator with full access",
			IsSystem:    true,
			Permissions: permissions, // All permissions
		},
		{
			Name:        "manager",
			Description: "Project manager with project and task management access",
			IsSystem:    true,
			Permissions: findPerms(
				PermProjectView, PermProjectCreate, PermProjectUpdate, PermProjectManage,
				PermTaskView, PermTaskCreate, PermTaskUpdate, PermTaskDelete, PermTaskAssign,
				PermTaskBulkUpdate, PermTaskBulkDelete,
				PermUserProfile, PermUserPassword, PermUserSessions,
			),
		},
		{
			Name:        "user",
			Description: "Regular user with basic task access",
			IsSystem:    true,
			Permissions: findPerms(
				PermProjectView,
				PermTaskView, PermTaskCreate, PermTaskUpdate,
				PermUserProfile, PermUserPassword, PermUserSessions,
			),
		},
		{
			Name:        "viewer",
			Description: "Read-only access to projects and tasks",
			IsSystem:    true,
			Permissions: findPerms(
				PermProjectView,
				PermTaskView,
				PermUserProfile, PermUserSessions,
			),
		},
	}
}
