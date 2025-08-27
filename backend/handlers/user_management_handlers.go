package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"golang.org/x/crypto/bcrypt"
)

// UserManagementHandler handles user management operations
type UserManagementHandler struct {
	userRepo  *database.UserManagementRepository
	validator *validator.Validate
}

// NewUserManagementHandler creates a new user management handler
func NewUserManagementHandler(userRepo *database.UserManagementRepository) *UserManagementHandler {
	return &UserManagementHandler{
		userRepo:  userRepo,
		validator: validator.New(),
	}
}

// GetUserList gets a paginated list of users with optional filtering
func (h *UserManagementHandler) GetUserList(c *gin.Context) {
	// Parse query parameters
	params := &models.UserListParams{
		Page:     1,
		PageSize: 20,
	}

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			params.Page = page
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 && pageSize <= 100 {
			params.PageSize = pageSize
		}
	}

	params.Role = c.Query("role")
	params.Status = c.Query("status")
	params.UserType = c.Query("user_type")
	params.Search = c.Query("search")

	// Validate parameters
	if err := h.validator.Struct(params); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid parameters", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Get users from database
	users, total, err := h.userRepo.ListUsers(c.Request.Context(), params)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get users", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Convert to response format
	userResponses := make([]models.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = user.ToResponse()
	}

	response := models.UserListResponse{
		Data:     userResponses,
		Total:    total,
		Page:     params.Page,
		PageSize: params.PageSize,
	}

	c.JSON(http.StatusOK, response)
}

// GetUser gets detailed information about a specific user
func (h *UserManagementHandler) GetUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", "User ID must be a valid integer")
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	user, err := h.userRepo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", fmt.Sprintf("User with ID %d not found", userID))
			c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get user", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	c.JSON(http.StatusOK, user.ToResponse())
}

// CreateUser creates a new user with the specified role and profile
func (h *UserManagementHandler) CreateUser(c *gin.Context) {
	var req models.UserCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Validate user type and role combination
	if err := models.ValidateUserRole(req.UserType, req.Role); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid role for user type", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Validate company requirements
	if err := models.ValidateCompanyUserFields(req.UserType, req.CompanyID); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid company fields", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to hash password", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Create user
	user := &models.User{
		Username:  req.Username,
		Email:     req.Email,
		PasswordHash: string(passwordHash),
		UserType:  req.UserType,
		CompanyID: req.CompanyID,
		Role:      req.Role,
		Status:    "active", // Default status
		Profile:   req.Profile,
	}

	createdUser, err := h.userRepo.CreateUser(c.Request.Context(), user)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			response := models.NewErrorResponse(models.ErrCodeConflict, "User already exists", "Username or email already exists")
			c.JSON(models.GetStatusCode(models.ErrCodeConflict), response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create user", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	c.JSON(http.StatusCreated, createdUser.ToResponse())
}

// UpdateUser updates user information including role, status, and profile
func (h *UserManagementHandler) UpdateUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", "User ID must be a valid integer")
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	var req models.UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Get current user to validate changes
	if req.UserType != nil && req.Role != nil {
		// Validate user type and role combination
		if err := models.ValidateUserRole(*req.UserType, *req.Role); err != nil {
			response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid role for user type", err.Error())
			c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
			return
		}
	} else if req.UserType != nil || req.Role != nil {
		// If only one is provided, get current user to validate
		currentUser, err := h.userRepo.GetUserByID(c.Request.Context(), userID)
		if err != nil {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", fmt.Sprintf("User with ID %d not found", userID))
			c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
			return
		}
		
		userType := currentUser.UserType
		role := currentUser.Role
		
		if req.UserType != nil {
			userType = *req.UserType
		}
		if req.Role != nil {
			role = *req.Role
		}
		
		if err := models.ValidateUserRole(userType, role); err != nil {
			response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid role for user type", err.Error())
			c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
			return
		}
	}

	// Validate company requirements if user type is being changed
	if req.UserType != nil {
		if err := models.ValidateCompanyUserFields(*req.UserType, req.CompanyID); err != nil {
			response := models.NewErrorResponse(models.ErrCodeValidation, "Invalid company fields", err.Error())
			c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
			return
		}
	}

	// Update user
	updatedUser, err := h.userRepo.UpdateUser(c.Request.Context(), userID, &req)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", fmt.Sprintf("User with ID %d not found", userID))
			c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
			return
		}
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			response := models.NewErrorResponse(models.ErrCodeConflict, "Conflict", "Username or email already exists")
			c.JSON(models.GetStatusCode(models.ErrCodeConflict), response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update user", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	c.JSON(http.StatusOK, updatedUser.ToResponse())
}

// DeleteUser deletes a user by ID
func (h *UserManagementHandler) DeleteUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", "User ID must be a valid integer")
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Prevent deletion of admin user with ID 1
	if userID == 1 {
		response := models.NewErrorResponse(models.ErrCodeAuthorization, "Cannot delete super admin", "The super admin user cannot be deleted")
		c.JSON(models.GetStatusCode(models.ErrCodeAuthorization), response)
		return
	}

	err = h.userRepo.DeleteUser(c.Request.Context(), userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", fmt.Sprintf("User with ID %d not found", userID))
			c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete user", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	c.Status(http.StatusNoContent)
}

// ResetUserPassword resets a user's password to a new password
func (h *UserManagementHandler) ResetUserPassword(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", "User ID must be a valid integer")
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	var req models.PasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Hash new password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to hash password", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Reset password
	err = h.userRepo.ResetPassword(c.Request.Context(), userID, string(passwordHash))
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", fmt.Sprintf("User with ID %d not found", userID))
			c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to reset password", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	response := models.NewSuccessResponse(nil, "Password reset successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateUserStatus updates a user's status (active, inactive, suspended)
func (h *UserManagementHandler) UpdateUserStatus(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid user ID", "User ID must be a valid integer")
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	var req models.UserStatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Update status
	updatedUser, err := h.userRepo.UpdateUserStatus(c.Request.Context(), userID, req.Status)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "User not found", fmt.Sprintf("User with ID %d not found", userID))
			c.JSON(models.GetStatusCode(models.ErrCodeNotFound), response)
			return
		}
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update user status", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	c.JSON(http.StatusOK, updatedUser.ToResponse())
}

// BatchUpdateUsers performs batch operations on multiple users (activate, suspend, delete)
func (h *UserManagementHandler) BatchUpdateUsers(c *gin.Context) {
	var req models.BatchUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeBadRequest), response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeValidation, "Validation failed", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeValidation), response)
		return
	}

	// Prevent batch operations on admin user with ID 1
	for _, userID := range req.UserIDs {
		if userID == 1 && req.Action == "delete" {
			response := models.NewErrorResponse(models.ErrCodeAuthorization, "Cannot delete super admin", "The super admin user cannot be deleted")
			c.JSON(models.GetStatusCode(models.ErrCodeAuthorization), response)
			return
		}
	}

	// Perform batch operation
	err := h.userRepo.BatchUpdateUsers(c.Request.Context(), req.UserIDs, req.Action)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to perform batch operation", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	successMessage := fmt.Sprintf("Successfully performed %s operation on %d users", req.Action, len(req.UserIDs))
	response := models.NewSuccessResponse(nil, successMessage)
	c.JSON(http.StatusOK, response)
}

// GetUserStats gets statistics about users including counts by role and status
func (h *UserManagementHandler) GetUserStats(c *gin.Context) {
	stats, err := h.userRepo.GetUserStats(c.Request.Context())
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get user statistics", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	response := models.NewSuccessResponse(stats, "User statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// ExportUsers exports user list to CSV format with optional filtering
func (h *UserManagementHandler) ExportUsers(c *gin.Context) {
	// Parse query parameters for filtering
	params := &models.UserListParams{
		Page:     1,
		PageSize: 10000, // Large number to get all users
		Role:     c.Query("role"),
		Status:   c.Query("status"),
		Search:   c.Query("search"),
	}

	// Get users from database
	users, _, err := h.userRepo.ListUsers(c.Request.Context(), params)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get users for export", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Set headers for CSV download
	filename := fmt.Sprintf("users_export_%s.csv", time.Now().Format("2006-01-02"))
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write CSV header
	header := []string{"ID", "Username", "Email", "Role", "Status", "Name", "Department", "Phone", "Created At", "Last Login"}
	if err := writer.Write(header); err != nil {
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to write CSV header", err.Error())
		c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
		return
	}

	// Write user data
	for _, user := range users {
		name := ""
		department := ""
		phone := ""
		
		if user.Profile.Name != nil {
			name = *user.Profile.Name
		}
		if user.Profile.Department != nil {
			department = *user.Profile.Department
		}
		if user.Profile.Phone != nil {
			phone = *user.Profile.Phone
		}

		lastLogin := ""
		if user.LastLoginAt != nil {
			lastLogin = user.LastLoginAt.Format("2006-01-02 15:04:05")
		}

		record := []string{
			strconv.Itoa(user.ID),
			user.Username,
			user.Email,
			user.Role,
			user.Status,
			name,
			department,
			phone,
			user.CreatedAt.Format("2006-01-02 15:04:05"),
			lastLogin,
		}

		if err := writer.Write(record); err != nil {
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to write CSV record", err.Error())
			c.JSON(models.GetStatusCode(models.ErrCodeInternal), response)
			return
		}
	}
}