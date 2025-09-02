package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"golang.org/x/crypto/bcrypt"
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
	// Debug: 打印所有上下文键值
	h.logger.Printf("[PROFILE] Processing GetUserProfile request")
	h.logger.Printf("[PROFILE] Context keys available:")
	for key, value := range c.Keys {
		h.logger.Printf("[PROFILE] - %s: %v", key, value)
	}

	// Extract user ID from context (set by mapUserToCompanyUser middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		h.logger.Printf("[PROFILE] user_id not found in context")
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	h.logger.Printf("[PROFILE] user_id found: %v", userID)

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

// ChangePasswordRequest 修改密码请求结构
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=6"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
}

// ChangePassword 更改密码
func (h *UserProfileHandler) ChangePassword(c *gin.Context) {
	// Extract user ID from context (set by mapUserToCompanyUser middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request body", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate request
	if err := h.validator.Struct(&req); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Validation failed", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Check if new password and confirm password match
	if req.NewPassword != req.ConfirmPassword {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "New password and confirm password do not match", nil)
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

	// Verify current password
	err = bcrypt.CompareHashAndPassword([]byte(currentUser.PasswordHash), []byte(req.CurrentPassword))
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Current password is incorrect", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Hash new password
	hashedNewPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Printf("Error hashing new password: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to hash new password", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Update password in database
	currentUser.PasswordHash = string(hashedNewPassword)
	_, err = h.db.Users().Update(c.Request.Context(), currentUser)
	if err != nil {
		h.logger.Printf("Error updating password: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update password", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(nil, "Password changed successfully")
	c.JSON(http.StatusOK, response)
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

// UploadAvatar 上传用户头像
func (h *UserProfileHandler) UploadAvatar(c *gin.Context) {
	// Extract user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// Get uploaded file
	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "No file uploaded", err.Error())
		c.JSON(http.StatusBadRequest, response)
		return
	}
	defer file.Close()

	// Validate file type
	if !isValidImageFile(header) {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid file type", "Only image files (jpg, jpeg, png, gif) are allowed")
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Validate file size (max 5MB)
	const maxSize = 5 * 1024 * 1024 // 5MB
	if header.Size > maxSize {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "File too large", "File size must be less than 5MB")
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "uploads/avatars"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		h.logger.Printf("Error creating upload directory: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create upload directory", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("avatar_%d_%d%s", userID, time.Now().Unix(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		h.logger.Printf("Error creating file: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to create file", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		h.logger.Printf("Error copying file: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to save file", nil)
		c.JSON(http.StatusInternalServerError, response)
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

	// Delete old avatar if exists
	if currentUser.Profile.Avatar != nil && *currentUser.Profile.Avatar != "" {
		oldPath := *currentUser.Profile.Avatar
		if _, err := os.Stat(oldPath); err == nil {
			os.Remove(oldPath)
		}
	}

	// Update user profile with new avatar path
	avatarURL := fmt.Sprintf("/api/v1/uploads/avatars/%s", filename)
	currentUser.Profile.Avatar = &avatarURL

	// Update in database
	updatedUser, err := h.db.Users().Update(c.Request.Context(), currentUser)
	if err != nil {
		h.logger.Printf("Error updating user profile: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to update user profile", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(map[string]interface{}{
		"avatar_url": avatarURL,
		"user":       updatedUser.ToResponse(),
	}, "Avatar uploaded successfully")
	c.JSON(http.StatusOK, response)
}

// isValidImageFile 验证是否为有效的图片文件
func isValidImageFile(header *multipart.FileHeader) bool {
	allowedTypes := []string{".jpg", ".jpeg", ".png", ".gif"}
	ext := strings.ToLower(filepath.Ext(header.Filename))

	for _, allowedType := range allowedTypes {
		if ext == allowedType {
			return true
		}
	}
	return false
}

// GetUserStatistics 获取用户统计信息
func (h *UserProfileHandler) GetUserStatistics(c *gin.Context) {
	// Extract user ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		response := models.NewErrorResponse(models.ErrCodeUnauthorized, "User not authenticated", nil)
		c.JSON(http.StatusUnauthorized, response)
		return
	}

	// For now, return basic statistics
	stats := map[string]interface{}{
		"user_id":         userID,
		"total_projects":  0,
		"overall_tasks":   0,
		"completed_tasks": 0,
		"completion_rate": 0.0,
	}

	response := models.NewSuccessResponse(stats, "User statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}
