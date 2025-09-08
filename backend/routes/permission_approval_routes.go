//go:build approval
// +build approval

package routes

import (
	"ai-project-backend/handlers"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterPermissionApprovalRoutes configures the permission approval routes using Gin
func RegisterPermissionApprovalRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	ginHandler := app.GetPermissionApprovalGinHandler()
	if ginHandler == nil {
		return
	}

	// Create a subrouter for approval endpoints
	approvalGroup := authorized.Group("/approvals")

	// Approval request management
	approvalGroup.POST("/requests", ginHandler.CreateApprovalRequest)
	approvalGroup.GET("/requests", ginHandler.ListApprovalRequests)
	approvalGroup.GET("/requests/:id", ginHandler.GetApprovalRequest)
	approvalGroup.POST("/requests/:id/decision", ginHandler.ProcessApprovalDecision)
	approvalGroup.GET("/requests/:id/history", ginHandler.GetApprovalHistory)

	// User-specific endpoints
	approvalGroup.GET("/pending", ginHandler.GetPendingApprovals)
	approvalGroup.GET("/stats", ginHandler.GetApprovalStats)

	// Delegation management
	approvalGroup.POST("/delegations", ginHandler.CreateDelegation)
	approvalGroup.GET("/delegations", ginHandler.GetUserDelegations)
	approvalGroup.PUT("/delegations/:id", ginHandler.UpdateDelegation)
}

// RegisterPermissionApprovalAdminRoutes configures admin-only approval routes
func RegisterPermissionApprovalAdminRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	if app.GetPermissionApprovalHandler() == nil {
		return
	}

	handler := app.GetPermissionApprovalHandler()

	// Create admin approval routes group
	adminGroup := authorized.Group("/admin/approvals")
	
	// TODO: Add admin middleware when available
	// adminGroup.Use(AdminMiddleware())

	// Admin-only endpoints would go here
	// For example:
	// adminGroup.POST("/workflows", gin.WrapF(handler.CreateApprovalWorkflow))
	// adminGroup.GET("/workflows", gin.WrapF(handler.ListApprovalWorkflows))
	// adminGroup.PUT("/workflows/:id", gin.WrapF(handler.UpdateApprovalWorkflow))
	// adminGroup.DELETE("/workflows/:id", gin.WrapF(handler.DeleteApprovalWorkflow))

	// Placeholder for now
	_ = handler
}