package application

import (
	"ai-project-backend/models"
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// mapUserToCompanyUser provides middleware for user mapping
func (app *Application) mapUserToCompanyUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"Authorization header is required",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		tokenParts := []string{}
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenParts = append(tokenParts, authHeader[7:])
		}

		if len(tokenParts) == 0 {
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"Invalid authorization format",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		token := tokenParts[0]

		// Validate and parse JWT token
		claims, err := app.jwtManager.ValidateToken(token)
		if err != nil {
			app.logger.Printf("Token validation error: %v", err)
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"Invalid or expired token",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// Get user ID from claims
		userID := int(claims.UserID)
		
		// Get user information from database to determine user type
		user, err := app.db.Users().GetByID(c.Request.Context(), userID)
		if err != nil {
			app.logger.Printf("User lookup error for userID %d: %v", userID, err)
			response := models.NewErrorResponse(
				models.ErrCodeUnauthorized,
				"认证失败，请重新登录",
				"User not found",
			)
			c.JSON(http.StatusUnauthorized, response)
			c.Abort()
			return
		}

		// Set basic user context for compatibility
		c.Set("user_id", userID)
		c.Set("user_name", user.Username)
		c.Set("user_role", user.Role)
		c.Set("current_user_role", user.Role)  // 为权限中间件使用
		
		// Set user type information for middleware
		userType := "system" // Default to system user for backward compatibility
		var companyID interface{}
		
		// Determine user type based on role:
		// - admin, project_manager, developer = system users
		// - company_admin, company_user = company users
		if user.Role == "company_admin" || user.Role == "company_user" {
			userType = "company"
			// Use actual company_id from user record when available
			if user.CompanyID != nil {
				companyID = *user.CompanyID
			}
		}
		
		c.Set("user_type", userType)
		c.Set("current_user_type", userType)  // 为权限中间件使用
		c.Set("company_id", companyID)
		
		// Map to company user (for now, map to same user ID)
		c.Set("company_user_id", userID)
		
		// Log user type information for debugging
		app.logger.Printf("mapUserToCompanyUser: userID=%d, userType=%s, role=%s, companyID=%v", 
			userID, userType, user.Role, companyID)
		
		c.Next()
	}
}

// validateNoCircularReference checks if setting parentID for taskID would create a circular reference
func (app *Application) validateNoCircularReference(ctx context.Context, parentID, taskID int) error {
	const maxDepth = 10 // Maximum hierarchy depth allowed

	// Follow the parent chain up to check for circular reference
	currentParentID := parentID
	depth := 0

	for currentParentID != 0 {
		// Check for circular reference
		if currentParentID == taskID {
			return fmt.Errorf("circular reference detected: setting parent would create a loop")
		}

		// Check depth limit
		depth++
		if depth > maxDepth {
			return fmt.Errorf("maximum hierarchy depth (%d) exceeded", maxDepth)
		}

		// Get the parent's parent
		parentTask, err := app.db.Tasks().GetByID(ctx, currentParentID)
		if err != nil {
			if err.Error() == "task not found" {
				break // Parent doesn't exist, no circular reference
			}
			return fmt.Errorf("error checking parent task: %v", err)
		}

		if parentTask.ParentID == nil {
			break // Reached root parent
		}
		currentParentID = *parentTask.ParentID
	}

	return nil
}

// fileDownloadHandler handles file downloads
func (app *Application) fileDownloadHandler(c *gin.Context) {
	filename := c.Query("file")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File parameter is required"})
		return
	}

	// Basic security check to prevent directory traversal
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file name"})
		return
	}

	// Define the download directory (should be configurable)
	downloadDir := "./downloads"
	filePath := filepath.Join(downloadDir, filename)

	// Check if file exists
	if _, err := filepath.Abs(filePath); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file path"})
		return
	}

	// Serve the file
	c.File(filePath)
}