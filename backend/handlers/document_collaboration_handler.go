package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// DocumentCollaborationHandler 文档协作处理器
type DocumentCollaborationHandler struct {
	collaborationService *services.DocumentCollaborationService
}

// NewDocumentCollaborationHandler 创建文档协作处理器实例
func NewDocumentCollaborationHandler(collaborationService *services.DocumentCollaborationService) *DocumentCollaborationHandler {
	return &DocumentCollaborationHandler{
		collaborationService: collaborationService,
	}
}

// ====================
// 文档评论相关
// ====================

// AddComment 添加文档评论
// POST /api/v1/documents/:id/comments
func (h *DocumentCollaborationHandler) AddComment(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var request models.AddCommentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	comment, err := h.collaborationService.AddComment(c.Request.Context(), documentID, userID, request)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, comment)
}

// GetComments 获取文档评论列表
// GET /api/v1/documents/:id/comments
func (h *DocumentCollaborationHandler) GetComments(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// 解析查询参数
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	comments, err := h.collaborationService.GetComments(c.Request.Context(), documentID, userID, page, limit)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// UpdateComment 更新评论
// PUT /api/v1/comments/:id
func (h *DocumentCollaborationHandler) UpdateComment(c *gin.Context) {
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	var request models.UpdateCommentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	comment, err := h.collaborationService.UpdateComment(c.Request.Context(), commentID, userID, request)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		if err.Error() == "comment not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comment)
}

// DeleteComment 删除评论
// DELETE /api/v1/comments/:id
func (h *DocumentCollaborationHandler) DeleteComment(c *gin.Context) {
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	err = h.collaborationService.DeleteComment(c.Request.Context(), commentID, userID)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		if err.Error() == "comment not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ResolveComment 标记评论为已解决
// PATCH /api/v1/comments/:id/resolve
func (h *DocumentCollaborationHandler) ResolveComment(c *gin.Context) {
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid comment ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	comment, err := h.collaborationService.ResolveComment(c.Request.Context(), commentID, userID)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		if err.Error() == "comment not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comment)
}

// ====================
// 文档协作者管理
// ====================

// AddCollaborator 添加文档协作者
// POST /api/v1/documents/:id/collaborators
func (h *DocumentCollaborationHandler) AddCollaborator(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var request models.AddCollaboratorExtRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	collaborator, err := h.collaborationService.AddCollaborator(c.Request.Context(), documentID, userID, request)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, collaborator)
}

// GetCollaborators 获取文档协作者列表
// GET /api/v1/documents/:id/collaborators
func (h *DocumentCollaborationHandler) GetCollaborators(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	collaborators, err := h.collaborationService.GetCollaborators(c.Request.Context(), documentID, userID)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"collaborators": collaborators,
		"total":         len(collaborators),
	})
}

// UpdateCollaborator 更新协作者权限
// PUT /api/v1/documents/:id/collaborators/:userId
func (h *DocumentCollaborationHandler) UpdateCollaborator(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	collaboratorUserID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var request models.UpdateCollaboratorExtRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	collaborator, err := h.collaborationService.UpdateCollaborator(c.Request.Context(), documentID, collaboratorUserID, userID, request)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		if err.Error() == "collaborator not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Collaborator not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, collaborator)
}

// RemoveCollaborator 移除协作者
// DELETE /api/v1/documents/:id/collaborators/:userId
func (h *DocumentCollaborationHandler) RemoveCollaborator(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	collaboratorUserID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	err = h.collaborationService.RemoveCollaborator(c.Request.Context(), documentID, collaboratorUserID, userID)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		if err.Error() == "collaborator not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Collaborator not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ====================
// 文档变更历史
// ====================

// GetChangeHistory 获取文档变更历史
// GET /api/v1/documents/:id/history
func (h *DocumentCollaborationHandler) GetChangeHistory(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// 解析查询参数
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	history, err := h.collaborationService.GetChangeHistory(c.Request.Context(), documentID, userID, page, limit)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}

// ====================
// 实时协作支持
// ====================

// StartCollaborationSession 开始协作会话
// POST /api/v1/documents/:id/collaboration/start
func (h *DocumentCollaborationHandler) StartCollaborationSession(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	session, err := h.collaborationService.StartCollaborationSession(c.Request.Context(), documentID, userID)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// GetActiveCollaborators 获取当前活跃的协作者
// GET /api/v1/documents/:id/collaboration/active
func (h *DocumentCollaborationHandler) GetActiveCollaborators(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	activeUsers, err := h.collaborationService.GetActiveCollaborators(c.Request.Context(), documentID, userID)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"active_collaborators": activeUsers,
		"count":               len(activeUsers),
		"timestamp":           time.Now(),
	})
}

// ====================
// 统计信息
// ====================

// GetCollaborationStats 获取文档协作统计
// GET /api/v1/documents/:id/collaboration/stats
func (h *DocumentCollaborationHandler) GetCollaborationStats(c *gin.Context) {
	documentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	stats, err := h.collaborationService.GetCollaborationStats(c.Request.Context(), documentID, userID)
	if err != nil {
		if err.Error() == "permission denied" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetUserCollaborationDashboard 获取用户协作仪表板
// GET /api/v1/collaboration/dashboard
func (h *DocumentCollaborationHandler) GetUserCollaborationDashboard(c *gin.Context) {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	dashboard, err := h.collaborationService.GetUserCollaborationDashboard(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dashboard)
}