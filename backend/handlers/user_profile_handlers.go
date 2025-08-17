package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// UserProfileHandler 用户资料处理器
type UserProfileHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewUserProfileHandler 创建用户资料处理器
func NewUserProfileHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *UserProfileHandler {
	return &UserProfileHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetUserProfile 获取用户资料
func (h *UserProfileHandler) GetUserProfile(c *gin.Context) {
	// Extract user ID from context (set by mapUserToCompanyUser middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Get user from database
	user, err := h.db.Users().GetByID(c.Request.Context(), userID.(int))
	if err != nil {
		h.logger.Printf("Error getting user profile: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve user profile", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(user, "User profile retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// UpdateUserProfile 更新用户资料
func (h *UserProfileHandler) UpdateUserProfile(c *gin.Context) {
	// Extract user ID from context (set by mapUserToCompanyUser middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	var req models.UserUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get current user
	currentUser, err := h.db.Users().GetByID(c.Request.Context(), userID.(int))
	if err != nil {
		h.logger.Printf("Error getting current user: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve current user", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Update user fields
	if req.Username != nil && *req.Username != "" {
		currentUser.Username = *req.Username
	}
	if req.Email != nil && *req.Email != "" {
		currentUser.Email = *req.Email
	}

	// Validate updated user
	if err := h.validator.Struct(currentUser); err != nil {
		h.logger.Printf("User validation failed: %v", err)
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Update in database
	updatedUser, err := h.db.Users().Update(c.Request.Context(), currentUser)
	if err != nil {
		h.logger.Printf("Error updating user profile: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update user profile", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(updatedUser, "User profile updated successfully")
	c.JSON(http.StatusOK, response)
}

// ChangePassword 更改密码
func (h *UserProfileHandler) ChangePassword(c *gin.Context) {
	// TODO: Extract user ID from JWT token in context
	// For now, return a placeholder response
	response := models.NewErrorResponse(models.ErrCodeInternal, "Password change not implemented yet", nil)
	c.JSON(http.StatusNotImplemented, response)
}

// GetProjectStatistics 获取项目统计信息
func (h *UserProfileHandler) GetProjectStatistics(dbConn *sql.DB, projectID int) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// Get task count
	var taskCount int
	err := dbConn.QueryRow("SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND deleted_at IS NULL", projectID).Scan(&taskCount)
	if err != nil {
		return nil, err
	}
	stats["task_count"] = taskCount

	// Get completed task count
	var completedCount int
	err = dbConn.QueryRow("SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status = 'completed' AND deleted_at IS NULL", projectID).Scan(&completedCount)
	if err != nil {
		return nil, err
	}
	stats["completed_count"] = completedCount

	// Calculate completion rate
	if taskCount > 0 {
		stats["completion_rate"] = float64(completedCount) / float64(taskCount) * 100
	} else {
		stats["completion_rate"] = 0.0
	}

	return stats, nil
}