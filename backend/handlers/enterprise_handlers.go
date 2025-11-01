package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"context"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"golang.org/x/crypto/bcrypt"
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

	// Get enterprises from database with statistics (optimized query - avoids N+1 problem)
	enterprises, userCounts, deptCounts, total, err := h.db.Enterprises().ListWithStats(c.Request.Context(), pagination.PageSize, offset, filterMap)
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
		response.UserCount = userCounts[i]
		response.DepartmentCount = deptCounts[i]
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

// UpdateEnterpriseUser handles PUT /api/v1/enterprises/:id/users/:userId
func (h *EnterpriseHandler) UpdateEnterpriseUser(c *gin.Context) {
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

	var req models.EnterpriseUserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set enterprise ID for validation
	req.EnterpriseID = enterpriseID

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get operator ID from context (TODO: implement proper auth context)
	operatorID := 1

	// Convert to EnterpriseUserRequest for service layer
	updateReq := &models.EnterpriseUserRequest{
		EnterpriseID:     req.EnterpriseID,
		Username:         req.Username,
		Email:            req.Email,
		Name:             req.Name,
		Phone:            req.Phone,
		Position:         req.Position,
		DepartmentID:     req.DepartmentID,
		IsPrimaryContact: req.IsPrimaryContact,
		AccessLevel:      req.AccessLevel,
		Status:           req.Status,
		Bio:              req.Bio,
	}

	// Update enterprise user using service
	updatedUser, err := h.enterpriseService.UpdateEnterpriseUser(c.Request.Context(), userID, updateReq, operatorID)
	if err != nil {
		if err.Error() == "user not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		if err.Error() == "user not found in this enterprise" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error updating enterprise user: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update enterprise user", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedUser.ToResponse(), "Enterprise user updated successfully")
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

// ========== 企业用户中心功能API ==========

// GetEnterpriseUserProjects handles GET /api/v1/enterprises/:id/users/:userId/projects
// 获取企业用户参与的项目列表
func (h *EnterpriseHandler) GetEnterpriseUserProjects(c *gin.Context) {
	// Parse parameters
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := c.Request.Context()

	// Verify enterprise exists
	if !h.enterpriseExists(ctx, enterpriseID) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Verify user exists and belongs to this enterprise
	user, err := h.enterpriseService.GetEnterpriseUserByID(ctx, userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Get user's projects
	projectRepo := h.db.Projects()
	projects, _, err := projectRepo.GetByUserID(ctx, user.ID, 100, 0) // Get up to 100 projects
	if err != nil {
		h.logger.Printf("Error getting user projects: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get user projects", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Transform to response format
	type ProjectResponse struct {
		ID        int       `json:"id"`
		Name      string    `json:"name"`
		Role      string    `json:"role"`
		Status    string    `json:"status"`
		Progress  int       `json:"progress"`
		CreatedAt time.Time `json:"created_at"`
	}

	var result []ProjectResponse
	for _, project := range projects {
		result = append(result, ProjectResponse{
			ID:        project.ID,
			Name:      project.Name,
			Role:      "Member", // Default role, could be enhanced with project_members table
			Status:    project.Status,
			Progress:  project.Progress,
			CreatedAt: project.CreatedAt,
		})
	}

	response := models.NewSuccessResponse(result, "User projects retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnterpriseUserStats handles GET /api/v1/enterprises/:id/users/:userId/stats
// 获取企业用户统计信息
func (h *EnterpriseHandler) GetEnterpriseUserStats(c *gin.Context) {
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := c.Request.Context()

	// Verify enterprise exists
	if !h.enterpriseExists(ctx, enterpriseID) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Verify user exists
	user, err := h.enterpriseService.GetEnterpriseUserByID(ctx, userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Initialize stats
	stats := struct {
		OnlineHours        int        `json:"online_hours"`
		ProjectCount       int        `json:"project_count"`
		CompletedTaskCount int        `json:"completed_task_count"`
		LastLoginAt        *time.Time `json:"last_login_at"`
	}{
		LastLoginAt: user.LastLoginAt,
	}

	// Get project count
	projectRepo := h.db.Projects()
	projects, _, err := projectRepo.GetByUserID(ctx, user.ID, 10000, 0)
	if err == nil {
		stats.ProjectCount = len(projects)
	}

	// Get completed task count using GetAllFiltered
	taskRepo := h.db.Tasks()
	opts := &models.TaskListOptions{
		Status:   "completed",
		Assignee: &user.ID,
		Search:   "",
	}
	_, total, err := taskRepo.GetAllFiltered(ctx, opts, 10000, 0)
	if err == nil {
		stats.CompletedTaskCount = total
	}

	// Calculate online hours from timer records
	timerRepo := h.db.Timer()
	// Note: This assumes Timer repository has a method to get user timers
	// You may need to adjust this based on actual Timer interface
	_ = timerRepo // Placeholder - implement based on your Timer interface

	// For now, calculate a simple approximation from task count
	stats.OnlineHours = stats.CompletedTaskCount * 2 // Rough estimate

	response := models.NewSuccessResponse(stats, "User statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnterpriseUserActivities handles GET /api/v1/enterprises/:id/users/:userId/activities
// 获取企业用户活动记录
func (h *EnterpriseHandler) GetEnterpriseUserActivities(c *gin.Context) {
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	ctx := c.Request.Context()

	// Verify enterprise exists
	if !h.enterpriseExists(ctx, enterpriseID) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Verify user exists
	_, err = h.enterpriseService.GetEnterpriseUserByID(ctx, userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Get audit logs for this user
	auditRepo := h.db.Audit()
	offset := (page - 1) * pageSize

	// Use GetAuditLogs with appropriate filters
	filter := &models.AuditLogFilter{
		UserID: &userID,
		Limit:  pageSize,
		Offset: offset,
	}
	logs, _, err := auditRepo.GetAuditLogs(ctx, filter)
	if err != nil {
		h.logger.Printf("Error getting audit logs: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get activities", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Transform to activity format
	type Activity struct {
		ID          int       `json:"id"`
		Type        string    `json:"type"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		Timestamp   time.Time `json:"timestamp"`
		Status      string    `json:"status,omitempty"`
	}

	var activities []Activity
	for _, log := range logs {
		actType := "system"
		resourceType := models.DerefString(log.ResourceType)
		if log.Action == "login" {
			actType = "login"
		} else if resourceType == "project" {
			actType = "project"
		} else if resourceType == "task" {
			actType = "task"
		}

		activities = append(activities, Activity{
			ID:          int(log.ID),
			Type:        actType,
			Title:       log.Action,
			Description: models.DerefString(log.Description),
			Timestamp:   log.CreatedAt,
			Status:      "success",
		})
	}

	response := models.NewSuccessResponse(activities, "User activities retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetEnterpriseUserPermissions handles GET /api/v1/enterprises/:id/users/:userId/permissions
// 获取企业用户权限详情
func (h *EnterpriseHandler) GetEnterpriseUserPermissions(c *gin.Context) {
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := c.Request.Context()

	// Verify enterprise exists
	if !h.enterpriseExists(ctx, enterpriseID) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Get user with role information
	user, err := h.enterpriseService.GetEnterpriseUserByID(ctx, userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Build permissions response
	// Note: EnterpriseUser uses AccessLevel instead of RoleID
	permissions := struct {
		AccessLevel       int      `json:"access_level"`
		IsPrimaryContact  bool     `json:"is_primary_contact"`
		Permissions       []string `json:"permissions"`
		CustomPermissions []string `json:"custom_permissions,omitempty"`
	}{
		AccessLevel:      user.AccessLevel,
		IsPrimaryContact: user.IsPrimaryContact,
		Permissions:       []string{}, // TODO: Get actual permissions based on access level
		CustomPermissions: []string{},
	}

	// TODO: Map access level to actual permissions
	// For now, return empty arrays

	response := models.NewSuccessResponse(permissions, "User permissions retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateEnterpriseUserPermissions handles PUT /api/v1/enterprises/:id/users/:userId/permissions
// 更新企业用户权限
func (h *EnterpriseHandler) UpdateEnterpriseUserPermissions(c *gin.Context) {
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := c.Request.Context()

	// Verify enterprise exists
	if !h.enterpriseExists(ctx, enterpriseID) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Parse request body
	var req struct {
		AccessLevel       *int     `json:"access_level"`
		IsPrimaryContact  *bool    `json:"is_primary_contact"`
		CustomPermissions []string `json:"custom_permissions"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid request body", gin.H{"error": err.Error()})
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get current user
	user, err := h.enterpriseService.GetEnterpriseUserByID(ctx, userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Get current operator ID
	operatorID := c.GetInt("user_id")

	// Update access level or primary contact if provided
	needsUpdate := false
	updateReq := &models.EnterpriseUserRequest{
		EnterpriseID:     user.EnterpriseID,
		Username:         user.Username,
		Email:            user.Email,
		Name:             user.Name,
		IsPrimaryContact: user.IsPrimaryContact,
		AccessLevel:      user.AccessLevel,
		Status:           user.Status,
	}

	if req.AccessLevel != nil && *req.AccessLevel != user.AccessLevel {
		updateReq.AccessLevel = *req.AccessLevel
		needsUpdate = true
	}

	if req.IsPrimaryContact != nil && *req.IsPrimaryContact != user.IsPrimaryContact {
		updateReq.IsPrimaryContact = *req.IsPrimaryContact
		needsUpdate = true
	}

	if needsUpdate {
		_, err = h.enterpriseService.UpdateEnterpriseUser(ctx, userID, updateReq, operatorID)
		if err != nil {
			h.logger.Printf("Error updating user permissions: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update permissions", nil)
			c.JSON(http.StatusInternalServerError, response)
			return
		}
	}

	// TODO: Handle custom_permissions if your system supports them
	// This would require a separate table like enterprise_user_permissions

	// Log the permission change
	currentUserID := c.GetInt("user_id")
	auditRepo := h.db.Audit()
	auditLog := &models.AuditLog{
		UserID:       &currentUserID,
		Action:       "update_permissions",
		ResourceType: models.StringPtr("enterprise_user"),
		ResourceID:   models.StringPtr(strconv.Itoa(userID)),
		Description:  models.StringPtr(fmt.Sprintf("Updated permissions for user ID %d", userID)),
		IPAddress:    models.StringPtr(c.ClientIP()),
		UserAgent:    models.StringPtr(c.GetHeader("User-Agent")),
	}
	_ = auditRepo.CreateAuditLog(ctx, auditLog)

	response := models.NewSuccessResponse(nil, "Permissions updated successfully")
	c.JSON(http.StatusOK, response)
}

// ResetEnterpriseUserPassword handles POST /api/v1/enterprises/:id/users/:userId/reset-password
// 重置企业用户密码
func (h *EnterpriseHandler) ResetEnterpriseUserPassword(c *gin.Context) {
	enterpriseID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	ctx := c.Request.Context()

	// Verify enterprise exists
	if !h.enterpriseExists(ctx, enterpriseID) {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Get user
	user, err := h.enterpriseService.GetEnterpriseUserByID(ctx, userID)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this enterprise", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Generate temporary password
	tempPassword := generateRandomPassword(12)

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Printf("Error hashing password: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to generate password", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Update user password using direct database update
	// Note: EnterpriseUserRequest doesn't have a Password field
	// We need to update the user's system account password if linked
	if user.UserID != nil {
		userRepo := h.db.Users()
		systemUser, err := userRepo.GetByID(ctx, *user.UserID)
		if err == nil {
			systemUser.PasswordHash = string(hashedPassword)
			_, err = userRepo.Update(ctx, systemUser)
			if err != nil {
				h.logger.Printf("Error updating system user password: %v", err)
				response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to reset password", nil)
				c.JSON(http.StatusInternalServerError, response)
				return
			}
		}
	}

	// Log the password reset
	currentUserID := c.GetInt("user_id")
	auditRepo := h.db.Audit()
	auditLog := &models.AuditLog{
		UserID:       &currentUserID,
		Action:       "reset_password",
		ResourceType: models.StringPtr("enterprise_user"),
		ResourceID:   models.StringPtr(strconv.Itoa(userID)),
		Description:  models.StringPtr(fmt.Sprintf("Reset password for user %s (ID: %d)", user.Name, userID)),
		IPAddress:    models.StringPtr(c.ClientIP()),
		UserAgent:    models.StringPtr(c.GetHeader("User-Agent")),
	}
	_ = auditRepo.CreateAuditLog(ctx, auditLog)

	// Return temporary password
	result := gin.H{
		"temporaryPassword": tempPassword,
	}

	response := models.NewSuccessResponse(result, "Password reset successfully")
	c.JSON(http.StatusOK, response)
}

// RemoveEnterpriseUser godoc
// @Summary 从企业移除用户
// @Description 系统管理员从指定企业中移除用户(软删除),不能移除主要联系人
// @Description 此操作会记录审计日志,被移除的用户仍可通过回收站恢复
// @Tags System - Enterprise Management
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param enterprise_id path int true "企业ID"
// @Param user_id path int true "用户ID"
// @Success 200 {object} map[string]interface{} "移除成功,返回用户信息"
// @Failure 400 {object} map[string]interface{} "请求参数错误 - 无效ID/用户不属于企业/不能移除主要联系人"
// @Failure 401 {object} map[string]interface{} "未认证 - Token缺失或无效"
// @Failure 403 {object} map[string]interface{} "权限不足 - 需要system.enterprise.manage_users权限"
// @Failure 404 {object} map[string]interface{} "资源不存在 - 企业或用户不存在"
// @Failure 500 {object} map[string]interface{} "服务器错误 - 数据库操作失败"
// @Router /system/enterprises/{enterprise_id}/users/{user_id} [delete]
func (h *EnterpriseHandler) RemoveEnterpriseUser(c *gin.Context) {
	ctx := context.WithValue(c.Request.Context(), "gin_context", c)

	// Get enterprise ID from path (adapted from :enterprise_id to :id)
	enterpriseIDStr := c.Param("id")
	enterpriseID, err := strconv.Atoi(enterpriseIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid enterprise ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get user ID from path (set by adapter as "userId")
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Verify the enterprise exists
	_, err = h.db.Enterprises().GetByID(ctx, enterpriseID)
	if err != nil {
		h.logger.Printf("Error getting enterprise %d: %v", enterpriseID, err)
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Enterprise not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Verify the user exists and belongs to this enterprise
	user, err := h.db.Enterprises().GetUserByID(ctx, userID)
	if err != nil {
		h.logger.Printf("Error getting enterprise user %d: %v", userID, err)
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Verify the user belongs to the specified enterprise
	if user.EnterpriseID != enterpriseID {
		h.logger.Printf("User %d does not belong to enterprise %d (belongs to %d)", userID, enterpriseID, user.EnterpriseID)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "User does not belong to this enterprise", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Check if user is the primary contact (optional - may want to prevent deletion)
	if user.IsPrimaryContact {
		h.logger.Printf("Attempted to remove primary contact user %d from enterprise %d", userID, enterpriseID)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Cannot remove primary contact. Please assign a new primary contact first.", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Perform soft delete
	err = h.db.Enterprises().DeleteUser(ctx, userID)
	if err != nil {
		h.logger.Printf("Error deleting enterprise user %d: %v", userID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to remove user from enterprise", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Log the removal action
	currentUserID := c.GetInt("user_id")
	auditRepo := h.db.Audit()
	auditLog := &models.AuditLog{
		UserID:       &currentUserID,
		Action:       "remove_enterprise_user",
		ResourceType: models.StringPtr("enterprise_user"),
		ResourceID:   models.StringPtr(strconv.Itoa(userID)),
		Description:  models.StringPtr(fmt.Sprintf("Removed user %s (ID: %d) from enterprise %d", user.Name, userID, enterpriseID)),
		IPAddress:    models.StringPtr(c.ClientIP()),
		UserAgent:    models.StringPtr(c.GetHeader("User-Agent")),
	}
	_ = auditRepo.CreateAuditLog(ctx, auditLog)

	// Return success response
	result := gin.H{
		"user_id":       userID,
		"enterprise_id": enterpriseID,
		"username":      user.Username,
		"name":          user.Name,
	}

	response := models.NewSuccessResponse(result, "User removed from enterprise successfully")
	c.JSON(http.StatusOK, response)
}

// ========== Helper Functions ==========

// generateRandomPassword generates a random password with specified length
func generateRandomPassword(length int) string {
	const (
		lowercase = "abcdefghijklmnopqrstuvwxyz"
		uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		digits    = "0123456789"
		special   = "!@#$%^&*"
		all       = lowercase + uppercase + digits + special
	)

	if length < 4 {
		length = 12
	}

	var password strings.Builder

	// Ensure at least one of each type
	password.WriteByte(lowercase[rand.Intn(len(lowercase))])
	password.WriteByte(uppercase[rand.Intn(len(uppercase))])
	password.WriteByte(digits[rand.Intn(len(digits))])
	password.WriteByte(special[rand.Intn(len(special))])

	// Fill the rest
	for i := 4; i < length; i++ {
		password.WriteByte(all[rand.Intn(len(all))])
	}

	// Shuffle the password
	runes := []rune(password.String())
	rand.Shuffle(len(runes), func(i, j int) {
		runes[i], runes[j] = runes[j], runes[i]
	})

	return string(runes)
}

// String returns a pointer to the string value
func String(s string) *string {
	return &s
}