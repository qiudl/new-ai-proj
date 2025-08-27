package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// CompanyHandler handles company-related HTTP requests
type CompanyHandler struct {
	db                   database.DB
	logger               *log.Logger
	validator            *validator.Validate
}

// NewCompanyHandler creates a new CompanyHandler instance
func NewCompanyHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *CompanyHandler {
	return &CompanyHandler{
		db:                   db,
		logger:               logger,
		validator:            validator,
	}
}

// GetCompanies handles GET /api/v1/companies
func (h *CompanyHandler) GetCompanies(c *gin.Context) {
	// 添加CORS头部
	
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
		Status   *string `form:"status"`
		Priority *string `form:"priority"`
		Industry *string `form:"industry"`
		Search   *string `form:"search"`
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
	if filters.Priority != nil && *filters.Priority != "" {
		filterMap["priority"] = *filters.Priority
	}
	if filters.Industry != nil && *filters.Industry != "" {
		filterMap["industry"] = *filters.Industry
	}
	if filters.Search != nil && *filters.Search != "" {
		filterMap["search"] = *filters.Search
	}

	// Get companies from database
	companies, total, err := h.db.Companies().List(c.Request.Context(), pagination.PageSize, offset, filterMap)
	if err != nil {
		h.logger.Printf("Error getting companies: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve companies", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	companyResponses := make([]models.CompanyResponse, len(companies))
	for i, company := range companies {
		companyResponses[i] = company.ToResponse()
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
		Data:       companyResponses,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Companies retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateCompany handles POST /api/v1/companies
func (h *CompanyHandler) CreateCompany(c *gin.Context) {
	
	var req models.CompanyRequest
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

	// Create company model
	company := &models.Company{
		CompanyName:          req.CompanyName,
		CompanyCode:          req.CompanyCode,
		Industry:             req.Industry,
		CompanyType:          req.CompanyType,
		BusinessLicense:      req.BusinessLicense,
		TaxNumber:            req.TaxNumber,
		LegalRepresentative:  req.LegalRepresentative,
		Address:              req.Address,
		City:                 req.City,
		Province:             req.Province,
		PostalCode:           req.PostalCode,
		Website:              req.Website,
		MainPhone:            req.MainPhone,
		MainEmail:            req.MainEmail,
		Status:               req.Status,
		Priority:             req.Priority,
		AnnualContractValue:  req.AnnualContractValue,
		StartDate:            req.StartDate,
		EmployeeCount:        req.EmployeeCount,
		CompanySize:          req.CompanySize,
		CreatedBy:            intPtr(1), // TODO: Get from authenticated user context
	}

	// Create company in database
	createdCompany, err := h.db.Companies().Create(c.Request.Context(), company)
	if err != nil {
		h.logger.Printf("Error creating company: %v", err)
		
		// Check for duplicate company name constraint violation
		if strings.Contains(err.Error(), "duplicate key value violates unique constraint") && 
		   strings.Contains(err.Error(), "customers_company_name_key") {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, 
				"Company name already exists. Please choose a different name.", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
		
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create company", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdCompany.ToResponse(), "Company created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetCompany handles GET /api/v1/companies/:id
func (h *CompanyHandler) GetCompany(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

company, err := h.db.Companies().GetByID(c.Request.Context(), companyID)
if err != nil {
	if err.Error() == "company not found" {
		// Try to load including soft-deleted records and return minimal info
		deletedCompany, derr := h.db.Companies().GetByIDIncludeDeleted(c.Request.Context(), companyID)
		if derr == nil && deletedCompany != nil && deletedCompany.DeletedAt != nil {
			resp := deletedCompany.ToResponse()
			resp.Deleted = true
			c.JSON(http.StatusOK, models.NewSuccessResponse(resp, "Company retrieved (soft-deleted)"))
			return
		}
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Company not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}
	h.logger.Printf("Error getting company: %v", err)
	response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company", nil)
	c.JSON(http.StatusInternalServerError, response)
	return
}

response := models.NewSuccessResponse(company.ToResponse(), "Company retrieved successfully")
c.JSON(http.StatusOK, response)
}

// UpdateCompany handles PUT /api/v1/companies/:id
func (h *CompanyHandler) UpdateCompany(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CompanyUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error binding JSON request: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, fmt.Sprintf("Invalid request body: %v", err), nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing company
	existingCompany, err := h.db.Companies().GetByID(c.Request.Context(), companyID)
	if err != nil {
		if err.Error() == "company not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Company not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error getting company: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Check if company name is being changed and if the new name already exists
	if req.CompanyName != nil && *req.CompanyName != existingCompany.CompanyName {
		// Check if the new company name already exists
		companies, _, err := h.db.Companies().List(c.Request.Context(), 1000, 0, map[string]interface{}{
			"company_name": *req.CompanyName,
		})
		if err != nil {
			h.logger.Printf("Error checking company name uniqueness: %v", err)
		} else if len(companies) > 0 {
			// Check if any of the found companies has a different ID
			for _, company := range companies {
				if company.ID != companyID {
					response := models.NewErrorResponse(models.ErrCodeBadRequest, 
						"Company name already exists. Please choose a different name.", nil)
					c.JSON(http.StatusBadRequest, response)
					return
				}
			}
		}
	}

	// Update company fields only if provided in request
	if req.CompanyName != nil {
		existingCompany.CompanyName = *req.CompanyName
	}
	if req.CompanyCode != nil {
		existingCompany.CompanyCode = req.CompanyCode
	}
	if req.Industry != nil {
		existingCompany.Industry = req.Industry
	}
	if req.CompanyType != nil {
		existingCompany.CompanyType = *req.CompanyType
	}
	if req.BusinessLicense != nil {
		existingCompany.BusinessLicense = req.BusinessLicense
	}
	if req.TaxNumber != nil {
		existingCompany.TaxNumber = req.TaxNumber
	}
	if req.LegalRepresentative != nil {
		existingCompany.LegalRepresentative = req.LegalRepresentative
	}
	if req.Address != nil {
		existingCompany.Address = req.Address
	}
	if req.City != nil {
		existingCompany.City = req.City
	}
	if req.Province != nil {
		existingCompany.Province = req.Province
	}
	if req.PostalCode != nil {
		existingCompany.PostalCode = req.PostalCode
	}
	if req.Website != nil {
		existingCompany.Website = req.Website
	}
	if req.MainPhone != nil {
		existingCompany.MainPhone = req.MainPhone
	}
	if req.MainEmail != nil {
		existingCompany.MainEmail = req.MainEmail
	}
	if req.Status != nil {
		existingCompany.Status = *req.Status
	}
	if req.Priority != nil {
		existingCompany.Priority = *req.Priority
	}
	if req.AnnualContractValue != nil {
		existingCompany.AnnualContractValue = req.AnnualContractValue
	}
	if req.StartDate != nil {
		existingCompany.StartDate = req.StartDate
	}
	if req.EmployeeCount != nil {
		existingCompany.EmployeeCount = req.EmployeeCount
	}
	if req.CompanySize != nil {
		existingCompany.CompanySize = req.CompanySize
	}

	userID := 1 // TODO: Get from authenticated user context
	existingCompany.UpdatedBy = &userID

	// Update company in database
	updatedCompany, err := h.db.Companies().Update(c.Request.Context(), existingCompany)
	if err != nil {
		h.logger.Printf("Error updating company: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update company", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedCompany.ToResponse(), "Company updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteCompany handles DELETE /api/v1/companies/:id
func (h *CompanyHandler) DeleteCompany(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.db.Companies().Delete(c.Request.Context(), companyID)
	if err != nil {
		if err.Error() == "company not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Company not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error deleting company: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete company", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Company deleted successfully")
	c.JSON(http.StatusOK, response)
}

// GetCompanyStats handles GET /api/v1/companies/stats
func (h *CompanyHandler) GetCompanyStats(c *gin.Context) {
	
	stats, err := h.db.Companies().GetStats(c.Request.Context())
	if err != nil {
		h.logger.Printf("Error getting company stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company statistics", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Company statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetCompanyUsers handles GET /api/v1/companies/:id/users
func (h *CompanyHandler) GetCompanyUsers(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	users, err := h.db.Companies().GetUsers(c.Request.Context(), companyID)
	if err != nil {
		h.logger.Printf("Error getting company users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	userResponses := make([]models.CompanyUserResponse, len(users))
	for i, user := range users {
		userResponses[i] = user.ToResponse()
	}

	response := models.NewSuccessResponse(userResponses, "Company users retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateCompanyUser handles POST /api/v1/companies/:id/users
func (h *CompanyHandler) CreateCompanyUser(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CompanyUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set company ID
	req.CustomerID = companyID

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Create company user model
	user := &models.CompanyUser{
		CustomerID:       req.CustomerID,
		Name:             req.Name,
		Position:         req.Position,
		Department:       req.Department,
		Email:            req.Email,
		Phone:            req.Phone,
		Mobile:           req.Mobile,
		WorkPhone:        req.WorkPhone,
		Role:             req.Role,
		IsPrimaryContact: req.IsPrimaryContact,
		CanMakeDecisions: req.CanMakeDecisions,
		AccessLevel:      req.AccessLevel,
		Status:           req.Status,
		Notes:            req.Notes,
	}

	// Create company user in database
	createdUser, err := h.db.Companies().CreateUser(c.Request.Context(), user)
	if err != nil {
		h.logger.Printf("Error creating company user: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create company user", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdUser.ToResponse(), "Company user created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetCompanyUser handles GET /api/v1/companies/:id/users/:userId
func (h *CompanyHandler) GetCompanyUser(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
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

	// Get all users for this company and find the specific user
	users, err := h.db.Companies().GetUsers(c.Request.Context(), companyID)
	if err != nil {
		h.logger.Printf("Error getting company users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Find the specific user
	var targetUser *models.CompanyUser
	for _, user := range users {
		if user.ID == userID {
			targetUser = user
			break
		}
	}

	if targetUser == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this company", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Get user permissions if available
	userResponse := targetUser.ToResponse()
	
	// Try to get user permissions from permission system
	userPermissions, err := h.db.Permissions().GetUserPermissions(c.Request.Context(), userID)
	if err == nil {
		// Add permission information to response
		userResponse.CompanyName = userPermissions.UserName
	}

	response := models.NewSuccessResponse(userResponse, "Company user retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateCompanyUser handles PUT /api/v1/companies/:id/users/:userId
func (h *CompanyHandler) UpdateCompanyUser(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
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

	var req models.CompanyUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set company ID and user ID
	req.CustomerID = companyID

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing user to verify it belongs to this company
	users, err := h.db.Companies().GetUsers(c.Request.Context(), companyID)
	if err != nil {
		h.logger.Printf("Error getting company users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var existingUser *models.CompanyUser
	for _, user := range users {
		if user.ID == userID {
			existingUser = user
			break
		}
	}

	if existingUser == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this company", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Update user model
	existingUser.Name = req.Name
	existingUser.Position = req.Position
	existingUser.Department = req.Department
	existingUser.Email = req.Email
	existingUser.Phone = req.Phone
	existingUser.Mobile = req.Mobile
	existingUser.WorkPhone = req.WorkPhone
	existingUser.Role = req.Role
	existingUser.IsPrimaryContact = req.IsPrimaryContact
	existingUser.CanMakeDecisions = req.CanMakeDecisions
	existingUser.AccessLevel = req.AccessLevel
	existingUser.Status = req.Status
	existingUser.Notes = req.Notes

	// Update company user in database
	updatedUser, err := h.db.Companies().UpdateUser(c.Request.Context(), existingUser)
	if err != nil {
		h.logger.Printf("Error updating company user: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update company user", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedUser.ToResponse(), "Company user updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteCompanyUser handles DELETE /api/v1/companies/:id/users/:userId
func (h *CompanyHandler) DeleteCompanyUser(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
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

	// Verify user belongs to this company
	users, err := h.db.Companies().GetUsers(c.Request.Context(), companyID)
	if err != nil {
		h.logger.Printf("Error getting company users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	var targetUser *models.CompanyUser
	for _, user := range users {
		if user.ID == userID {
			targetUser = user
			break
		}
	}

	if targetUser == nil {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this company", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Check if this is the primary contact and if there are other users
	if targetUser.IsPrimaryContact && len(users) > 1 {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Cannot delete primary contact when other users exist. Please assign a new primary contact first.", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Delete company user
	err = h.db.Companies().DeleteUser(c.Request.Context(), userID)
	if err != nil {
		h.logger.Printf("Error deleting company user: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete company user", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Company user deleted successfully")
	c.JSON(http.StatusOK, response)
}

// AssignUserRole handles POST /api/v1/companies/:id/users/:userId/role
func (h *CompanyHandler) AssignUserRole(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
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

	var req struct {
		RoleID *int `json:"role_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Verify user belongs to this company
	users, err := h.db.Companies().GetUsers(c.Request.Context(), companyID)
	if err != nil {
		h.logger.Printf("Error getting company users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	userFound := false
	for _, user := range users {
		if user.ID == userID {
			userFound = true
			break
		}
	}

	if !userFound {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this company", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Verify role exists if provided
	if req.RoleID != nil {
		_, err := h.db.Permissions().GetRoleByID(c.Request.Context(), *req.RoleID)
		if err != nil {
			response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid role ID", nil)
			c.JSON(http.StatusBadRequest, response)
			return
		}
	}

	// Update user role
	err = h.db.Permissions().UpdateUserRole(c.Request.Context(), userID, req.RoleID)
	if err != nil {
		h.logger.Printf("Error updating user role: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update user role", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "User role updated successfully")
	c.JSON(http.StatusOK, response)
}

// GetUserPermissions handles GET /api/v1/companies/:id/users/:userId/permissions
func (h *CompanyHandler) GetUserPermissions(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
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

	// Verify user belongs to this company
	users, err := h.db.Companies().GetUsers(c.Request.Context(), companyID)
	if err != nil {
		h.logger.Printf("Error getting company users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	userFound := false
	for _, user := range users {
		if user.ID == userID {
			userFound = true
			break
		}
	}

	if !userFound {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this company", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Get user permissions
	permissions, err := h.db.Permissions().GetUserPermissions(c.Request.Context(), userID)
	if err != nil {
		h.logger.Printf("Error getting user permissions: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve user permissions", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(permissions, "User permissions retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateUserPermissions handles PUT /api/v1/companies/:id/users/:userId/permissions
func (h *CompanyHandler) UpdateUserPermissions(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
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

	var req models.UserPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Verify user belongs to this company
	users, err := h.db.Companies().GetUsers(c.Request.Context(), companyID)
	if err != nil {
		h.logger.Printf("Error getting company users: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve company users", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	userFound := false
	for _, user := range users {
		if user.ID == userID {
			userFound = true
			break
		}
	}

	if !userFound {
		response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found in this company", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Update role if provided
	if req.RoleID != nil {
		err = h.db.Permissions().UpdateUserRole(c.Request.Context(), userID, req.RoleID)
		if err != nil {
			h.logger.Printf("Error updating user role: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update user role", nil)
			c.JSON(http.StatusInternalServerError, response)
			return
		}
	}

	// Update custom permissions if provided
	if req.CustomPermissions != nil {
		err = h.db.Permissions().UpdateUserCustomPermissions(c.Request.Context(), userID, req.CustomPermissions)
		if err != nil {
			h.logger.Printf("Error updating custom permissions: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update custom permissions", nil)
			c.JSON(http.StatusInternalServerError, response)
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
			PermissionStartDate: time.Now(),
		}

		if projectPerm.PermissionStartDate != nil {
			permission.PermissionStartDate = *projectPerm.PermissionStartDate
		}
		if projectPerm.PermissionEndDate != nil {
			permission.PermissionEndDate = projectPerm.PermissionEndDate
		}

		err = h.db.Permissions().SetUserProjectPermissions(c.Request.Context(), permission)
		if err != nil {
			h.logger.Printf("Error updating project permissions: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update project permissions", nil)
			c.JSON(http.StatusInternalServerError, response)
			return
		}
	}

	response := models.NewSuccessResponse(nil, "User permissions updated successfully")
	c.JSON(http.StatusOK, response)
}

// GetCompanyContacts handles GET /api/v1/companies/:id/contacts
func (h *CompanyHandler) GetCompanyContacts(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
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

	contacts, total, err := h.db.Companies().GetContacts(c.Request.Context(), companyID, pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting company contacts: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve contact records", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
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
		Data:       contacts,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Contact records retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateCompanyContact handles POST /api/v1/companies/:id/contacts
func (h *CompanyHandler) CreateCompanyContact(c *gin.Context) {
	
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid company ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CompanyContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Set company ID
	req.CustomerID = companyID

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", h.extractValidationErrors(err))
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Create contact record
	contactDate := time.Now()
	if req.ContactDate != nil {
		contactDate = *req.ContactDate
	}

	contact := &models.CompanyContact{
		CustomerID:        req.CustomerID,
		CompanyUserID:     req.CompanyUserID,
		ContactType:       req.ContactType,
		Subject:           req.Subject,
		Content:           req.Content,
		ContactDate:       contactDate,
		NextContactDate:   req.NextContactDate,
		Status:            req.Status,
		Result:            req.Result,
		FollowUpRequired:  req.FollowUpRequired,
		RelatedProjectID:  req.RelatedProjectID,
		RelatedContractID: req.RelatedContractID,
		ContactedBy:       &[]int{1}[0], // TODO: Get from authenticated user context
	}

	createdContact, err := h.db.Companies().CreateContact(c.Request.Context(), contact)
	if err != nil {
		h.logger.Printf("Error creating company contact: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create contact record", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdContact, "Contact record created successfully")
	c.JSON(http.StatusCreated, response)
}

// extractValidationErrors extracts validation errors from validator error
func (h *CompanyHandler) extractValidationErrors(err error) map[string]string {
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

// intPtr returns a pointer to the given int value
func intPtr(i int) *int {
	return &i
}
// GetEnterpriseRoles handles GET /api/v1/companies/:id/roles
func (h *CompanyHandler) GetEnterpriseRoles(c *gin.Context) {
	response := models.NewErrorResponse(models.ErrCodeInternal, "Enterprise role service not implemented", nil)
	c.JSON(http.StatusNotImplemented, response)
}

// CreateEnterpriseRoles handles POST /api/v1/companies/:id/roles
func (h *CompanyHandler) CreateEnterpriseRoles(c *gin.Context) {
	response := models.NewErrorResponse(models.ErrCodeInternal, "Enterprise role service not implemented", nil)
	c.JSON(http.StatusNotImplemented, response)
}

// GetAvailableRoleTemplates handles GET /api/v1/enterprise-role-templates
func (h *CompanyHandler) GetAvailableRoleTemplates(c *gin.Context) {
	response := models.NewErrorResponse(models.ErrCodeInternal, "Enterprise role templates not implemented", nil)
	c.JSON(http.StatusNotImplemented, response)
}