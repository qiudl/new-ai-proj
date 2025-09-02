package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// CustomerHandler handles customer-related HTTP requests
type CustomerHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewCustomerHandler creates a new CustomerHandler instance
func NewCustomerHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *CustomerHandler {
	return &CustomerHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetCustomers handles GET /api/v1/customers
func (h *CustomerHandler) GetCustomers(c *gin.Context) {
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
	var filters models.CustomerFilter
	if err := c.ShouldBindQuery(&filters); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid filter parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Convert filters to map[string]interface{}
	filterMap := make(map[string]interface{})
	if filters.Status != nil {
		filterMap["status"] = *filters.Status
	}
	if filters.Priority != nil {
		filterMap["priority"] = *filters.Priority
	}
	if filters.Industry != nil {
		filterMap["industry"] = *filters.Industry
	}
	if filters.Search != nil {
		filterMap["search"] = *filters.Search
	}

	// Get customers from database
	customers, total, err := h.db.Customers().List(c.Request.Context(), pagination.PageSize, offset, filterMap)
	if err != nil {
		h.logger.Printf("Error getting customers: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve customers", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Convert to response format
	customerResponses := make([]models.CustomerResponse, len(customers))
	for i, customer := range customers {
		customerResponses[i] = customer.ToResponse()
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
		Data:       customerResponses,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Customers retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// CreateCustomer handles POST /api/v1/customers
func (h *CustomerHandler) CreateCustomer(c *gin.Context) {
	var req models.CustomerRequest
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

	// Create customer model
	customer := &models.Customer{
		Name:          req.Name,
		Company:       req.Company,
		Industry:      req.Industry,
		ContactPerson: req.ContactPerson,
		Email:         req.Email,
		Phone:         req.Phone,
		Address:       req.Address,
		Website:       req.Website,
		Status:        req.Status,
		Priority:      req.Priority,
		ContractValue: req.ContractValue,
		StartDate:     req.StartDate,
		EndDate:       req.EndDate,
		CustomFields:  req.CustomFields,
		CreatedBy:     1, // TODO: Get from authenticated user context
	}

	// Create customer in database
	createdCustomer, err := h.db.Customers().Create(c.Request.Context(), customer)
	if err != nil {
		h.logger.Printf("Error creating customer: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create customer", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdCustomer.ToResponse(), "Customer created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetCustomer handles GET /api/v1/customers/:id
func (h *CustomerHandler) GetCustomer(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := strconv.Atoi(customerIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid customer ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	customer, err := h.db.Customers().GetByID(c.Request.Context(), customerID)
	if err != nil {
		if err.Error() == "customer not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Customer not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error getting customer: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve customer", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(customer.ToResponse(), "Customer retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateCustomer handles PUT /api/v1/customers/:id
func (h *CustomerHandler) UpdateCustomer(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := strconv.Atoi(customerIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid customer ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get existing customer
	existingCustomer, err := h.db.Customers().GetByID(c.Request.Context(), customerID)
	if err != nil {
		if err.Error() == "customer not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Customer not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error getting customer: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve customer", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Update customer fields
	if req.Name != "" {
		existingCustomer.Name = req.Name
	}
	if req.Company != "" {
		existingCustomer.Company = req.Company
	}
	if req.Industry != "" {
		existingCustomer.Industry = req.Industry
	}
	if req.ContactPerson != "" {
		existingCustomer.ContactPerson = req.ContactPerson
	}
	if req.Email != "" {
		existingCustomer.Email = req.Email
	}
	if req.Phone != "" {
		existingCustomer.Phone = req.Phone
	}
	if req.Address != "" {
		existingCustomer.Address = req.Address
	}
	if req.Website != nil && *req.Website != "" {
		existingCustomer.Website = req.Website
	}
	if req.Status != "" {
		existingCustomer.Status = req.Status
	}
	if req.Priority != "" {
		existingCustomer.Priority = req.Priority
	}
	if req.ContractValue != nil {
		existingCustomer.ContractValue = req.ContractValue
	}
	if req.StartDate != nil {
		existingCustomer.StartDate = req.StartDate
	}
	if req.EndDate != nil {
		existingCustomer.EndDate = req.EndDate
	}
	if req.CustomFields != nil {
		existingCustomer.CustomFields = req.CustomFields
	}

	userID := 1 // TODO: Get from authenticated user context
	existingCustomer.UpdatedBy = &userID

	// Update customer in database
	updatedCustomer, err := h.db.Customers().Update(c.Request.Context(), existingCustomer)
	if err != nil {
		h.logger.Printf("Error updating customer: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update customer", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedCustomer.ToResponse(), "Customer updated successfully")
	c.JSON(http.StatusOK, response)
}

// DeleteCustomer handles DELETE /api/v1/customers/:id
func (h *CustomerHandler) DeleteCustomer(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := strconv.Atoi(customerIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid customer ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	err = h.db.Customers().Delete(c.Request.Context(), customerID)
	if err != nil {
		if err.Error() == "customer not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Customer not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error deleting customer: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete customer", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Customer deleted successfully")
	c.JSON(http.StatusOK, response)
}

// AddCustomerUser handles POST /api/v1/customers/:id/users
func (h *CustomerHandler) AddCustomerUser(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := strconv.Atoi(customerIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid customer ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CustomerUserRequest
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

	// Create CustomerUser association
	customerUser := &models.CustomerUser{
		CustomerID:  customerID,
		UserID:      req.UserID,
		Role:        req.Role,
		IsPrimary:   req.IsPrimary,
		Permissions: req.Permissions,
		AccessLevel: req.AccessLevel,
	}

	// Associate user with customer
	_, err = h.db.Customers().AssociateUser(c.Request.Context(), customerUser)
	if err != nil {
		h.logger.Printf("Error associating user with customer: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to associate user with customer", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "User associated with customer successfully")
	c.JSON(http.StatusCreated, response)
}

// RemoveCustomerUser handles DELETE /api/v1/customers/:id/users/:userId
func (h *CustomerHandler) RemoveCustomerUser(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := strconv.Atoi(customerIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid customer ID", nil)
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

	err = h.db.Customers().DisassociateUser(c.Request.Context(), customerID, userID)
	if err != nil {
		h.logger.Printf("Error disassociating user from customer: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to disassociate user from customer", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "User disassociated from customer successfully")
	c.JSON(http.StatusOK, response)
}

// CreateContact handles POST /api/v1/customers/:id/contacts
func (h *CustomerHandler) CreateContact(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := strconv.Atoi(customerIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid customer ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var req models.CustomerContactRequest
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

	// Create contact record
	contactDate := time.Now()
	if req.ContactDate != nil {
		contactDate = *req.ContactDate
	}

	contact := &models.CustomerContact{
		CustomerID:      customerID,
		ContactType:     req.ContactType,
		Subject:         req.Subject,
		Content:         req.Content,
		ContactDate:     contactDate,
		NextContactDate: req.NextContactDate,
		Status:          req.Status,
		Result:          req.Result,
		ContactedBy:     &[]int{1}[0], // TODO: Get from authenticated user context
	}

	createdContact, err := h.db.Customers().CreateContact(c.Request.Context(), contact)
	if err != nil {
		h.logger.Printf("Error creating customer contact: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create contact record", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(createdContact, "Contact record created successfully")
	c.JSON(http.StatusCreated, response)
}

// GetCustomerContacts handles GET /api/v1/customers/:id/contacts
func (h *CustomerHandler) GetCustomerContacts(c *gin.Context) {
	customerIDStr := c.Param("id")
	customerID, err := strconv.Atoi(customerIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid customer ID", nil)
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

	contacts, total, err := h.db.Customers().GetContacts(c.Request.Context(), customerID, pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting customer contacts: %v", err)
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

// GetCustomerStats handles GET /api/v1/customers/stats
func (h *CustomerHandler) GetCustomerStats(c *gin.Context) {
	stats, err := h.db.Customers().GetCustomerStats(c.Request.Context())
	if err != nil {
		h.logger.Printf("Error getting customer stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve customer statistics", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(stats, "Customer statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// extractValidationErrors extracts validation errors from validator error
func (h *CustomerHandler) extractValidationErrors(err error) map[string]string {
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
