package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// EnterpriseHandler handles enterprise-related HTTP requests
type EnterpriseHandler struct {
	enterpriseService *services.EnterpriseService
	db                database.DB
	logger            *log.Logger
	validator         *validator.Validate
}

// NewEnterpriseHandler creates a new EnterpriseHandler instance
func NewEnterpriseHandler(enterpriseService *services.EnterpriseService, db database.DB, logger *log.Logger, validator *validator.Validate) *EnterpriseHandler {
	return &EnterpriseHandler{
		enterpriseService: enterpriseService,
		db:                db,
		logger:            logger,
		validator:         validator,
	}
}

// GetEnterprises handles GET /api/v1/enterprises
func (h *EnterpriseHandler) GetEnterprises(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	// Parse filter parameters
	var filters struct {
		Status       *string `form:"status"`
		BusinessType *string `form:"business_type"`
		IndustryType *string `form:"industry_type"`
		Search       *string `form:"search"`
	}
	if err := c.ShouldBindQuery(&filters); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid filter parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Convert filters to map[string]interface{}
	filterMap := make(map[string]interface{})
	if filters.Status != nil && *filters.Status != "" {
		filterMap["status"] = *filters.Status
	}
	if filters.BusinessType != nil && *filters.BusinessType != "" {
		filterMap["business_type"] = *filters.BusinessType
	}
	if filters.IndustryType != nil && *filters.IndustryType != "" {
		filterMap["industry_type"] = *filters.IndustryType
	}
	if filters.Search != nil && *filters.Search != "" {
		filterMap["search"] = *filters.Search
	}

	// Get enterprises from database
	enterprises, total, err := h.db.Enterprises().List(c.Request.Context(), pagination.PageSize, offset, filterMap)
	if err != nil {
		h.logger.Printf("Error getting enterprises: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve enterprises", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format with statistics
	enterpriseResponses := make([]models.EnterpriseResponse, len(enterprises))
	for i, enterprise := range enterprises {
		response := enterprise.ToResponse()
		
		// Get user and department counts for each enterprise
		userCount, departmentCount, err := h.db.Enterprises().GetEnterpriseStatistics(c.Request.Context(), enterprise.ID)
		if err != nil {
			h.logger.Printf("Warning: Failed to get statistics for enterprise %d: %v", enterprise.ID, err)
			// Continue with zero counts instead of failing the entire request
			userCount = 0
			departmentCount = 0
		}
		
		response.UserCount = userCount
		response.DepartmentCount = departmentCount
		enterpriseResponses[i] = response
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       enterpriseResponses,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Enterprises retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateEnterprise handles POST /api/v1/enterprises
func (h *EnterpriseHandler) CreateEnterprise(c *gin.Context) {
	var req models.EnterpriseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Create enterprise using service
	createdEnterprise, err := h.enterpriseService.CreateEnterprise(c.Request.Context(), &req, operatorID)
	if err != nil {
		h.logger.Printf("Error creating enterprise: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create enterprise", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdEnterprise.ToResponse(), "Enterprise created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetEnterprise handles GET /api/v1/enterprises/:id
func (h *EnterpriseHandler) GetEnterprise(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	enterprise, err := h.db.Enterprises().GetByID(c.Request.Context(), enterpriseID)
	if err != nil {
		if err.Error() == "enterprise not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error getting enterprise: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve enterprise", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Get statistics for the enterprise
	enterpriseResponse := enterprise.ToResponse()
	userCount, departmentCount, err := h.db.Enterprises().GetEnterpriseStatistics(c.Request.Context(), enterprise.ID)
	if err != nil {
		h.logger.Printf("Warning: Failed to get statistics for enterprise %d: %v", enterprise.ID, err)
		// Continue with zero counts instead of failing the request
		userCount = 0
		departmentCount = 0
	}
	
	enterpriseResponse.UserCount = userCount
	enterpriseResponse.DepartmentCount = departmentCount

	response := models.NewSuccessResponse(enterpriseResponse, "Enterprise retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateEnterprise handles PUT /api/v1/enterprises/:id
func (h *EnterpriseHandler) UpdateEnterprise(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.EnterpriseUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error binding JSON request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, fmt.Sprintf("Invalid request body: %v", err), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Update enterprise using service
	updatedEnterprise, err := h.enterpriseService.UpdateEnterprise(c.Request.Context(), enterpriseID, &req, operatorID)
	if err != nil {
		if err.Error() == "enterprise not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error updating enterprise: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update enterprise", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedEnterprise.ToResponse(), "Enterprise updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteEnterprise handles DELETE /api/v1/enterprises/:id
func (h *EnterpriseHandler) DeleteEnterprise(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Delete enterprise using service
	err = h.enterpriseService.DeleteEnterprise(c.Request.Context(), enterpriseID, operatorID)
	if err != nil {
		if err.Error() == "enterprise not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error deleting enterprise: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete enterprise", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Enterprise deleted successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnterpriseStats handles GET /api/v1/enterprises/stats
func (h *EnterpriseHandler) GetEnterpriseStats(c *gin.Context) {
	stats, err := h.enterpriseService.GetEnterpriseStats(c.Request.Context())
	if err != nil {
		h.logger.Printf("Error getting enterprise stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve enterprise statistics", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Enterprise statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnterpriseUsers handles GET /api/v1/enterprises/:id/users
func (h *EnterpriseHandler) GetEnterpriseUsers(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	users, total, err := h.db.Enterprises().ListUsers(c.Request.Context(), enterpriseID, pagination.PageSize, offset, nil)
	if err != nil {
		h.logger.Printf("Error getting enterprise users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve enterprise users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	userResponses := make([]models.EnterpriseUserResponseNew, len(users))
	for i, user := range users {
		userResponses[i] = user.ToResponse()
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       userResponses,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Enterprise users retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateEnterpriseUser handles POST /api/v1/enterprises/:id/users
func (h *EnterpriseHandler) CreateEnterpriseUser(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.EnterpriseUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set enterprise ID
	req.EnterpriseID = enterpriseID

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Create enterprise user using service
	createdUser, generatedPassword, err := h.enterpriseService.CreateEnterpriseUser(c.Request.Context(), &req, operatorID)
	if err != nil {
		h.logger.Printf("Error creating enterprise user: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create enterprise user", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Include password in response for new user (in real app, send via email)
	userResponse := createdUser.ToResponse()
	responseData := gin.H{
		"user":                userResponse,
		"temporary_password": generatedPassword, // TODO: Send via email instead
	}

	response := models.NewSuccessResponse(responseData, "Enterprise user created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetEnterpriseUser handles GET /api/v1/enterprises/:id/users/:userId
func (h *EnterpriseHandler) GetEnterpriseUser(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	user, err := h.db.Enterprises().GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if err.Error() == "user not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error getting enterprise user: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve enterprise user", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Verify user belongs to this enterprise
	if user.EnterpriseID != enterpriseID {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	response := models.NewSuccessResponse(user.ToResponse(), "Enterprise user retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnterpriseDepartments handles GET /api/v1/enterprises/:id/departments
func (h *EnterpriseHandler) GetEnterpriseDepartments(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	departments, err := h.db.Enterprises().ListDepartments(c.Request.Context(), enterpriseID, 1000, 0, nil)
	if err != nil {
		h.logger.Printf("Error getting enterprise departments: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve enterprise departments", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	departmentResponses := make([]models.EnterpriseDepartmentResponse, len(departments))
	for i, dept := range departments {
		departmentResponses[i] = dept.ToResponse()
	}

	response := models.NewSuccessResponse(departmentResponses, "Enterprise departments retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateEnterpriseDepartment handles POST /api/v1/enterprises/:id/departments
func (h *EnterpriseHandler) CreateEnterpriseDepartment(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.EnterpriseDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set enterprise ID
	req.EnterpriseID = enterpriseID

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Create enterprise department using service
	createdDepartment, err := h.enterpriseService.CreateEnterpriseDepartment(c.Request.Context(), &req, operatorID)
	if err != nil {
		h.logger.Printf("Error creating enterprise department: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create enterprise department", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdDepartment.ToResponse(), "Enterprise department created successfully")
	c.JSON(http.StatusCreated, response)
}

// UpdateEnterpriseDepartment handles PUT /api/v1/enterprises/:id/departments/:dept_id
func (h *EnterpriseHandler) UpdateEnterpriseDepartment(c *gin.Context) {
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	departmentIDStr := c.Param("dept_id")
	departmentID, err := strconv.Atoi(departmentIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid department ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.EnterpriseDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set enterprise ID
	req.EnterpriseID = enterpriseID

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Update enterprise department using service
	updatedDepartment, err := h.enterpriseService.UpdateEnterpriseDepartment(c.Request.Context(), departmentID, &req, operatorID)
	if err != nil {
		if err.Error() == "department not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Department not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error updating enterprise department: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update enterprise department", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedDepartment.ToResponse(), "Enterprise department updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteEnterpriseDepartment handles DELETE /api/v1/enterprises/:id/departments/:dept_id
func (h *EnterpriseHandler) DeleteEnterpriseDepartment(c *gin.Context) {
	departmentIDStr := c.Param("dept_id")
	departmentID, err := strconv.Atoi(departmentIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid department ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Delete enterprise department using service
	err = h.enterpriseService.DeleteEnterpriseDepartment(c.Request.Context(), departmentID, operatorID)
	if err != nil {
		if err.Error() == "department not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Department not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error deleting enterprise department: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete enterprise department", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Enterprise department deleted successfully")
	c.JSON(http.StatusOK, response)
}

// extractValidationErrors extracts validation errors from validator error
func (h *EnterpriseHandler) extractValidationErrors(err error) map[string]string {
	errors := make(map[string]string)

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			field := fieldError.Field()
			tag := fieldError.Tag()

			switch tag {
			case "required":
				errors[field] = fmt.Sprintf("%s is required", field)
			case "email":
				errors[field] = "Invalid email format"
			case "url":
				errors[field] = "Invalid URL format"
			case "min":
				errors[field] = fmt.Sprintf("%s must be at least %s characters", field, fieldError.Param())
			case "max":
				errors[field] = fmt.Sprintf("%s must be no more than %s characters", field, fieldError.Param())
			case "oneof":
				errors[field] = fmt.Sprintf("%s must be one of: %s", field, fieldError.Param())
			default:
				errors[field] = fmt.Sprintf("%s is invalid", field)
			}
		}
	} else {
		// Fallback for non-validation errors
		errors["general"] = err.Error()
	}

	return errors
}

// GetEnterpriseProjects handles GET /api/v1/enterprises/:id/projects
func (h *EnterpriseHandler) GetEnterpriseProjects(c *gin.Context) {
	// Parse enterprise ID from path
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	// Calculate offset
	offset := (pagination.Page - 1) * pagination.PageSize

	// Get projects by enterprise ID
	ctx := c.Request.Context()
	projectRepo := h.db.Projects()
	projects, total, err := projectRepo.GetByEnterpriseID(ctx, enterpriseID, pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting enterprise projects: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get enterprise projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Build pagination response
	paginationData := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: (total + pagination.PageSize - 1) / pagination.PageSize,
		HasNext:    pagination.Page < (total+pagination.PageSize-1)/pagination.PageSize,
		HasPrev:    pagination.Page > 1,
	}

	responseData := gin.H{
		"data":       projects,
		"pagination": paginationData,
	}
	response := models.NewSuccessResponse(responseData, "Enterprise projects retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateProjectForEnterprise handles POST /api/v1/enterprises/:id/projects
func (h *EnterpriseHandler) CreateProjectForEnterprise(c *gin.Context) {
	// Parse enterprise ID from path
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Verify enterprise exists
	ctx := c.Request.Context()
	if !h.enterpriseExists(ctx, enterpriseID) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Parse request body
	var req struct {
		Name          string  `json:"name" binding:"required"`
		Description   *string `json:"description"`
		ProjectNumber *string `json:"project_number"`
		Status        *string `json:"status"`
		Priority      *string `json:"priority"`
		StartDate     *string `json:"start_date"`
		EndDate       *string `json:"end_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", gin.H{"error": err.Error()})
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get current user ID
	userID := c.GetInt("user_id")
	if userID == 0 {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Create project model
	project := &models.Project{
		Name:          req.Name,
		ProjectNumber: req.ProjectNumber,
		OwnerID:       userID,
		EnterpriseID:  &enterpriseID,
		Status:        "planning", // default status
		Priority:      "medium",   // default priority
		Progress:      0,          // default progress
	}

	// Set optional description
	if req.Description != nil {
		project.Description = *req.Description
	}

	// Set optional fields
	if req.Status != nil {
		project.Status = *req.Status
	}
	if req.Priority != nil {
		project.Priority = *req.Priority
	}
	if req.StartDate != nil && *req.StartDate != "" {
		if startDate, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			project.StartDate = &startDate
		}
	}
	if req.EndDate != nil && *req.EndDate != "" {
		if endDate, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			project.EndDate = &endDate
		}
	}

	// Create project in database
	projectRepo := h.db.Projects()
	createdProject, err := projectRepo.Create(ctx, project)
	if err != nil {
		h.logger.Printf("Error creating project for enterprise: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create project", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdProject, "Project created successfully")
	c.JSON(http.StatusCreated, response)
}

// enterpriseExists checks if an enterprise exists
func (h *EnterpriseHandler) enterpriseExists(ctx context.Context, enterpriseID int) bool {
	// Use the enterprise service to check if enterprise exists
	enterprise, err := h.enterpriseService.GetEnterpriseByID(ctx, enterpriseID)
	return err == nil && enterprise != nil
}