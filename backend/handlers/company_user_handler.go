package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// CompanyUserHandler handles company user management HTTP requests
type CompanyUserHandler struct {
	companyUserService *services.CompanyUserService
	validator          *validator.Validate
}

// NewCompanyUserHandler creates a new company user handler
func NewCompanyUserHandler(
	userRepo database.UserRepository,
	companyRepo database.CompanyRepository,
	auditLogger *services.AsyncAuditLogger,
	validator *validator.Validate,
) *CompanyUserHandler {
	companyUserService := services.NewCompanyUserService(userRepo, companyRepo, auditLogger)
	return &CompanyUserHandler{
		companyUserService: companyUserService,
		validator:          validator,
	}
}

// CreateCompanyUser handles POST /admin/company-users
func (h *CompanyUserHandler) CreateCompanyUser(c *gin.Context) {
	var req models.CompanyUserCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request data", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context
	operatorID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	operatorIDInt, ok := operatorID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID format", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create company user
	user, password, err := h.companyUserService.CreateCompanyUser(c.Request.Context(), &req, operatorIDInt)
	if err != nil {
		if utils.IsValidationError(err) {
			response := models.NewErrorResponse(models.ErrCodeValidation, err.Error(), nil)
			c.JSON(http.StatusBadRequest, response)
		} else if utils.IsNotFoundError(err) {
			response := models.NewErrorResponse(models.ErrCodeNotFound, err.Error(), nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create company user", err.Error())
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Return user response with initial password
	responseData := map[string]interface{}{
		"user":     user.ToResponse(),
		"password": password,
	}

	response := models.NewSuccessResponse(responseData, "Company user created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetCompanyUserList handles GET /admin/company-users
func (h *CompanyUserHandler) GetCompanyUserList(c *gin.Context) {
	// Parse query parameters
	var params models.CompanyUserListParams

	// Set defaults
	params.Page = 1
	params.PageSize = 20

	// Parse page
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			params.Page = page
		}
	}

	// Parse page size
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 && pageSize <= 100 {
			params.PageSize = pageSize
		}
	}

	// Parse company ID
	if companyIDStr := c.Query("company_id"); companyIDStr != "" {
		if companyID, err := strconv.Atoi(companyIDStr); err == nil {
			params.CompanyID = &companyID
		}
	}

	// Parse status
	params.Status = c.Query("status")

	// Parse search
	params.Search = c.Query("search")

	// Validate parameters
	if err := h.validator.Struct(&params); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid query parameters", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get company users
	result, err := h.companyUserService.ListCompanyUsers(c.Request.Context(), &params)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get company users", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(result, "Company users retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetCompanyUser handles GET /admin/company-users/:id
func (h *CompanyUserHandler) GetCompanyUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	user, err := h.companyUserService.GetCompanyUserByID(c.Request.Context(), userID)
	if err != nil {
		if utils.IsNotFoundError(err) {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Company user not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get company user", err.Error())
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(user, "Company user retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateCompanyUser handles PUT /admin/company-users/:id
func (h *CompanyUserHandler) UpdateCompanyUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CompanyUserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request data", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context
	operatorID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	operatorIDInt, ok := operatorID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID format", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Update company user
	user, err := h.companyUserService.UpdateCompanyUser(c.Request.Context(), userID, &req, operatorIDInt)
	if err != nil {
		if utils.IsValidationError(err) {
			response := models.NewErrorResponse(models.ErrCodeValidation, err.Error(), nil)
			c.JSON(http.StatusBadRequest, response)
		} else if utils.IsNotFoundError(err) {
			response := models.NewErrorResponse(models.ErrCodeNotFound, err.Error(), nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update company user", err.Error())
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(user.ToResponse(), "Company user updated successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateCompanyUserStatus handles PUT /admin/company-users/:id/status
func (h *CompanyUserHandler) UpdateCompanyUserStatus(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CompanyUserStatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request data", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context
	operatorID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	operatorIDInt, ok := operatorID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID format", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Update company user status
	user, err := h.companyUserService.UpdateCompanyUserStatus(c.Request.Context(), userID, req.Status, operatorIDInt)
	if err != nil {
		if utils.IsNotFoundError(err) {
			response := models.NewErrorResponse(models.ErrCodeNotFound, err.Error(), nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update company user status", err.Error())
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(user.ToResponse(), "Company user status updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteCompanyUser handles DELETE /admin/company-users/:id
func (h *CompanyUserHandler) DeleteCompanyUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context
	operatorID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	operatorIDInt, ok := operatorID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID format", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Delete company user
	err = h.companyUserService.DeleteCompanyUser(c.Request.Context(), userID, operatorIDInt)
	if err != nil {
		if utils.IsNotFoundError(err) {
			response := models.NewErrorResponse(models.ErrCodeNotFound, err.Error(), nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete company user", err.Error())
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(nil, "Company user deleted successfully")
	c.JSON(http.StatusOK, response)
}

// BatchUpdateCompanyUsers handles POST /admin/company-users/batch
func (h *CompanyUserHandler) BatchUpdateCompanyUsers(c *gin.Context) {
	var req models.BatchCompanyUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request data", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context
	operatorID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	operatorIDInt, ok := operatorID.(int)
	if !ok {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Invalid user ID format", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Perform batch update
	err := h.companyUserService.BatchUpdateCompanyUsers(c.Request.Context(), &req, operatorIDInt)
	if err != nil {
		if utils.IsValidationError(err) {
			response := models.NewErrorResponse(models.ErrCodeValidation, err.Error(), nil)
			c.JSON(http.StatusBadRequest, response)
		} else {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to perform batch update", err.Error())
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	response := models.NewSuccessResponse(nil, "Batch update completed successfully")
	c.JSON(http.StatusOK, response)
}

// GetCompanyUserStats handles GET /admin/company-users/stats
func (h *CompanyUserHandler) GetCompanyUserStats(c *gin.Context) {
	stats, err := h.companyUserService.GetCompanyUserStats(c.Request.Context())
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get company user statistics", err.Error())
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Company user statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}