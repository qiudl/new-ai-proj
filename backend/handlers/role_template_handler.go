package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// RoleTemplateHandler handles role template HTTP requests
type RoleTemplateHandler struct {
	roleTemplateService *services.RoleTemplateService
	logger              *log.Logger
}

// NewRoleTemplateHandler creates a new role template handler
func NewRoleTemplateHandler(roleTemplateService *services.RoleTemplateService, logger *log.Logger) *RoleTemplateHandler {
	return &RoleTemplateHandler{
		roleTemplateService: roleTemplateService,
		logger:              logger,
	}
}

// CreateRoleTemplate handles POST /api/v1/role-templates
func (h *RoleTemplateHandler) CreateRoleTemplate(c *gin.Context) {
	var req models.CreateRoleTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	// Create role template
	response, err := h.roleTemplateService.CreateRoleTemplate(c.Request.Context(), &req, userIDInt)
	if err != nil {
		h.logger.Printf("Error creating role template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create role template",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
		"message": "Role template created successfully",
	})
}

// GetRoleTemplate handles GET /api/v1/role-templates/:id
func (h *RoleTemplateHandler) GetRoleTemplate(c *gin.Context) {
	templateIDStr := c.Param("id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid template ID",
		})
		return
	}

	response, err := h.roleTemplateService.GetRoleTemplate(c.Request.Context(), templateID)
	if err != nil {
		if err.Error() == "template not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Role template not found",
			})
			return
		}
		h.logger.Printf("Error getting role template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get role template",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// UpdateRoleTemplate handles PUT /api/v1/role-templates/:id
func (h *RoleTemplateHandler) UpdateRoleTemplate(c *gin.Context) {
	templateIDStr := c.Param("id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid template ID",
		})
		return
	}

	var req models.UpdateRoleTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	response, err := h.roleTemplateService.UpdateRoleTemplate(c.Request.Context(), templateID, &req, userIDInt)
	if err != nil {
		if err.Error() == "template not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Role template not found",
			})
			return
		}
		if err.Error() == "cannot modify system template" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Cannot modify system template",
			})
			return
		}
		h.logger.Printf("Error updating role template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update role template",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
		"message": "Role template updated successfully",
	})
}

// DeleteRoleTemplate handles DELETE /api/v1/role-templates/:id
func (h *RoleTemplateHandler) DeleteRoleTemplate(c *gin.Context) {
	templateIDStr := c.Param("id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid template ID",
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	err = h.roleTemplateService.DeleteRoleTemplate(c.Request.Context(), templateID, userIDInt)
	if err != nil {
		if err.Error() == "template not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Role template not found",
			})
			return
		}
		if err.Error() == "cannot delete system template" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Cannot delete system template",
			})
			return
		}
		if containsString(err.Error(), "active usage") {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "Cannot delete template with active usage",
				"details": err.Error(),
			})
			return
		}
		h.logger.Printf("Error deleting role template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete role template",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Role template deleted successfully",
	})
}

// ListRoleTemplates handles GET /api/v1/role-templates
func (h *RoleTemplateHandler) ListRoleTemplates(c *gin.Context) {
	// Parse query parameters
	req := &models.RoleTemplateListRequest{
		Limit:  parseIntQueryWithDefault(c, "limit", 20),
		Offset: parseIntQueryWithDefault(c, "offset", 0),
	}

	if category := c.Query("category"); category != "" {
		req.Category = &category
	}
	if industry := c.Query("industry"); industry != "" {
		req.Industry = &industry
	}
	if department := c.Query("department"); department != "" {
		req.Department = &department
	}
	if levelStr := c.Query("level"); levelStr != "" {
		if level, err := strconv.Atoi(levelStr); err == nil {
			req.Level = &level
		}
	}
	if search := c.Query("search"); search != "" {
		req.Search = &search
	}
	if parentIDStr := c.Query("parent_id"); parentIDStr != "" {
		if parentID, err := strconv.Atoi(parentIDStr); err == nil {
			req.ParentID = &parentID
		}
	}
	if isActiveStr := c.Query("is_active"); isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			req.IsActive = &isActive
		}
	}
	if isSystemStr := c.Query("is_system"); isSystemStr != "" {
		if isSystem, err := strconv.ParseBool(isSystemStr); err == nil {
			req.IsSystem = &isSystem
		}
	}
	if includeUsageStr := c.Query("include_usage"); includeUsageStr == "true" {
		req.IncludeUsage = true
	}

	// Parse tags
	if tagsStr := c.Query("tags"); tagsStr != "" {
		req.Tags = parseTagsFromQuery(tagsStr)
	}

	// Parse sort parameters
	if sortBy := c.Query("sort_by"); sortBy != "" {
		req.SortBy = sortBy
	}
	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		req.SortOrder = sortOrder
	}

	response, err := h.roleTemplateService.ListRoleTemplates(c.Request.Context(), req)
	if err != nil {
		h.logger.Printf("Error listing role templates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list role templates",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ApplyTemplateToRole handles POST /api/v1/role-templates/:id/apply
func (h *RoleTemplateHandler) ApplyTemplateToRole(c *gin.Context) {
	templateIDStr := c.Param("id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid template ID",
		})
		return
	}

	var req models.ApplyTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Set template ID from URL
	req.TemplateID = templateID

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	response, err := h.roleTemplateService.ApplyTemplateToRole(c.Request.Context(), &req, userIDInt)
	if err != nil {
		if err.Error() == "template not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Role template not found",
			})
			return
		}
		if err.Error() == "template is not active" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Template is not active",
			})
			return
		}
		if containsString(err.Error(), "role not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Target role not found",
			})
			return
		}
		if containsString(err.Error(), "cannot modify system role") {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Cannot modify system role",
			})
			return
		}
		h.logger.Printf("Error applying template to role: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to apply template to role",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
		"message": "Template applied successfully",
	})
}

// CloneTemplate handles POST /api/v1/role-templates/:id/clone
func (h *RoleTemplateHandler) CloneTemplate(c *gin.Context) {
	templateIDStr := c.Param("id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid template ID",
		})
		return
	}

	var req struct {
		NewCode string `json:"new_code" validate:"required,min=1,max=50"`
		NewName string `json:"new_name" validate:"required,min=1,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "User not authenticated",
		})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	response, err := h.roleTemplateService.CloneTemplate(c.Request.Context(), templateID, req.NewCode, req.NewName, userIDInt)
	if err != nil {
		if err.Error() == "source template not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Source template not found",
			})
			return
		}
		if containsString(err.Error(), "template code already exists") {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "Template code already exists",
			})
			return
		}
		h.logger.Printf("Error cloning template: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to clone template",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
		"message": "Template cloned successfully",
	})
}

// GetTemplatesByCategory handles GET /api/v1/role-templates/category/:category
func (h *RoleTemplateHandler) GetTemplatesByCategory(c *gin.Context) {
	category := c.Param("category")
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Category is required",
		})
		return
	}

	templates, err := h.roleTemplateService.GetTemplatesByCategory(c.Request.Context(), category)
	if err != nil {
		if containsString(err.Error(), "invalid category") {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid category",
			})
			return
		}
		h.logger.Printf("Error getting templates by category: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get templates by category",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"category":  category,
			"templates": templates,
			"total":     len(templates),
		},
	})
}

// GetTemplatePermissions handles GET /api/v1/role-templates/:id/permissions
func (h *RoleTemplateHandler) GetTemplatePermissions(c *gin.Context) {
	templateIDStr := c.Param("id")
	templateID, err := strconv.Atoi(templateIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid template ID",
		})
		return
	}

	template, err := h.roleTemplateService.GetRoleTemplate(c.Request.Context(), templateID)
	if err != nil {
		if err.Error() == "template not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Role template not found",
			})
			return
		}
		h.logger.Printf("Error getting template permissions: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get template permissions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"template_id":   templateID,
			"template_name": template.TemplateName,
			"permissions":   template.Permissions,
			"total":         len(template.Permissions),
		},
	})
}

// GetDefaultTemplates handles GET /api/v1/role-templates/defaults
func (h *RoleTemplateHandler) GetDefaultTemplates(c *gin.Context) {
	defaults := models.GetDefaultSystemTemplates()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"default_templates": defaults,
			"total":             len(defaults),
		},
		"message": "Default system templates retrieved",
	})
}

// Helper functions

func parseIntQueryWithDefault(c *gin.Context, param string, defaultValue int) int {
	value := c.Query(param)
	if value == "" {
		return defaultValue
	}
	if intValue, err := strconv.Atoi(value); err == nil {
		return intValue
	}
	return defaultValue
}

func parseTagsFromQuery(tagsStr string) []string {
	if tagsStr == "" {
		return []string{}
	}
	// Split by comma and trim spaces
	tags := []string{}
	for _, tag := range strings.Split(tagsStr, ",") {
		trimmed := strings.TrimSpace(tag)
		if trimmed != "" {
			tags = append(tags, trimmed)
		}
	}
	return tags
}

func containsString(s, substr string) bool {
	return strings.Contains(s, substr)
}