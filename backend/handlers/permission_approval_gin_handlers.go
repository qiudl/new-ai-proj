//go:build approval
// +build approval

package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// PermissionApprovalGinHandler handles permission approval HTTP requests using Gin
type PermissionApprovalGinHandler struct {
	approvalService *services.PermissionApprovalService
	logger          *log.Logger
}

// NewPermissionApprovalGinHandler creates a new Gin-compatible permission approval handler
func NewPermissionApprovalGinHandler(approvalService *services.PermissionApprovalService, logger *log.Logger) *PermissionApprovalGinHandler {
	return &PermissionApprovalGinHandler{
		approvalService: approvalService,
		logger:          logger,
	}
}

// CreateApprovalRequest creates a new permission approval request
func (h *PermissionApprovalGinHandler) CreateApprovalRequest(c *gin.Context) {
	var req models.CreateApprovalRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get user ID from context (assumed to be set by middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	response, err := h.approvalService.CreateApprovalRequest(c.Request.Context(), &req, userIDInt)
	if err != nil {
		h.logger.Printf("Error creating approval request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create approval request", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// GetApprovalRequest retrieves a specific approval request
func (h *PermissionApprovalGinHandler) GetApprovalRequest(c *gin.Context) {
	requestID := c.Param("id")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Request ID is required"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	response, err := h.approvalService.GetApprovalRequest(c.Request.Context(), requestID, userIDInt)
	if err != nil {
		if err.Error() == "approval request not found" {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrCodeNotFound,
				"Approval request not found",
				nil,
			))
			return
		}
		h.logger.Printf("Error getting approval request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get approval request", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ListApprovalRequests retrieves approval requests with filtering
func (h *PermissionApprovalGinHandler) ListApprovalRequests(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse query parameters
	filter := &models.ApprovalRequestFilter{
		RequesterID: parseIntQueryGin(c, "requester_id"),
		ApproverID:  parseIntQueryGin(c, "approver_id"),
		Status:      c.Query("status"),
		Priority:    c.Query("priority"),
		Limit:       parseIntQueryWithDefaultGin(c, "limit", 20),
		Offset:      parseIntQueryWithDefaultGin(c, "offset", 0),
	}

	if permissionCode := c.Query("permission_code"); permissionCode != "" {
		filter.PermissionCode = &permissionCode
	}
	if resourceType := c.Query("resource_type"); resourceType != "" {
		filter.ResourceType = &resourceType
	}

	response, err := h.approvalService.ListApprovalRequests(c.Request.Context(), filter, userIDInt)
	if err != nil {
		h.logger.Printf("Error listing approval requests: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list approval requests", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ProcessApprovalDecision processes an approval decision (approve/reject/delegate)
func (h *PermissionApprovalGinHandler) ProcessApprovalDecision(c *gin.Context) {
	requestID := c.Param("id")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Request ID is required"})
		return
	}

	var req models.ProcessApprovalDecisionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	response, err := h.approvalService.ProcessApprovalDecision(c.Request.Context(), requestID, &req, userIDInt)
	if err != nil {
		if err.Error() == "approval request not found" {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrCodeNotFound,
				"Approval request not found",
				nil,
			))
			return
		}
		if err.Error() == "user not authorized to approve this request" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to approve this request"})
			return
		}
		h.logger.Printf("Error processing approval decision: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process approval decision", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetApprovalHistory retrieves the approval history for a request
func (h *PermissionApprovalGinHandler) GetApprovalHistory(c *gin.Context) {
	requestID := c.Param("id")
	if requestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Request ID is required"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	limit := parseIntQueryWithDefaultGin(c, "limit", 50)
	offset := parseIntQueryWithDefaultGin(c, "offset", 0)

	response, err := h.approvalService.GetApprovalHistory(c.Request.Context(), requestID, userIDInt, limit, offset)
	if err != nil {
		if err.Error() == "approval request not found" {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrCodeNotFound,
				"Approval request not found",
				nil,
			))
			return
		}
		h.logger.Printf("Error getting approval history: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get approval history", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetPendingApprovals retrieves pending approvals for the current user
func (h *PermissionApprovalGinHandler) GetPendingApprovals(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	limit := parseIntQueryWithDefaultGin(c, "limit", 20)
	offset := parseIntQueryWithDefaultGin(c, "offset", 0)
	priority := c.Query("priority")

	response, err := h.approvalService.GetPendingApprovals(c.Request.Context(), userIDInt, priority, limit, offset)
	if err != nil {
		h.logger.Printf("Error getting pending approvals: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get pending approvals", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CreateDelegation creates a delegation for approval authority
func (h *PermissionApprovalGinHandler) CreateDelegation(c *gin.Context) {
	var req models.CreateDelegationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	response, err := h.approvalService.CreateDelegation(c.Request.Context(), &req, userIDInt)
	if err != nil {
		h.logger.Printf("Error creating delegation: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create delegation", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// GetUserDelegations retrieves delegations for a user
func (h *PermissionApprovalGinHandler) GetUserDelegations(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	limit := parseIntQueryWithDefaultGin(c, "limit", 20)
	offset := parseIntQueryWithDefaultGin(c, "offset", 0)
	includeExpired := c.Query("include_expired") == "true"

	response, err := h.approvalService.GetUserDelegations(c.Request.Context(), userIDInt, includeExpired, limit, offset)
	if err != nil {
		h.logger.Printf("Error getting user delegations: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user delegations", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// UpdateDelegation updates a delegation
func (h *PermissionApprovalGinHandler) UpdateDelegation(c *gin.Context) {
	delegationIDStr := c.Param("id")
	if delegationIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Delegation ID is required"})
		return
	}

	delegationID, err := strconv.Atoi(delegationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid delegation ID"})
		return
	}

	var req models.UpdateDelegationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Printf("Error decoding request body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	response, err := h.approvalService.UpdateDelegation(c.Request.Context(), delegationID, &req, userIDInt)
	if err != nil {
		if err.Error() == "delegation not found" {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				models.ErrCodeNotFound,
				"Delegation not found",
				nil,
			))
			return
		}
		if err.Error() == "user not authorized to update this delegation" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this delegation"})
			return
		}
		h.logger.Printf("Error updating delegation: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update delegation", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetApprovalStats retrieves approval statistics
func (h *PermissionApprovalGinHandler) GetApprovalStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userIDInt, ok := userID.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse query parameters for stats filter
	filter := &models.ApprovalStatsFilter{
		UserID:    &userIDInt,
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		GroupBy:   c.Query("group_by"), // "status", "priority", "permission", etc.
	}

	if requesterID := parseIntQueryGin(c, "requester_id"); requesterID != nil {
		filter.RequesterID = requesterID
	}
	if approverID := parseIntQueryGin(c, "approver_id"); approverID != nil {
		filter.ApproverID = approverID
	}

	response, err := h.approvalService.GetApprovalStats(c.Request.Context(), filter, userIDInt)
	if err != nil {
		h.logger.Printf("Error getting approval stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get approval stats", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// Gin-specific utility functions

func parseIntQueryGin(c *gin.Context, param string) *int {
	value := c.Query(param)
	if value == "" {
		return nil
	}
	if intValue, err := strconv.Atoi(value); err == nil {
		return &intValue
	}
	return nil
}

func parseIntQueryWithDefaultGin(c *gin.Context, param string, defaultValue int) int {
	value := c.Query(param)
	if value == "" {
		return defaultValue
	}
	if intValue, err := strconv.Atoi(value); err == nil {
		return intValue
	}
	return defaultValue
}