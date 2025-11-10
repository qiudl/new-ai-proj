package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// RequirementCommentHandler handles all requirement comment operations
type RequirementCommentHandler struct {
	db                     database.DB
	notificationService    services.NotificationService
	contentSecurityService services.ContentSecurityService
	moderationService      services.CommentModerationService
}

// NewRequirementCommentHandler creates a new requirement comment handler
func NewRequirementCommentHandler(
	db database.DB,
	notificationService services.NotificationService,
	contentSecurityService services.ContentSecurityService,
	moderationService services.CommentModerationService,
	logger *log.Logger,
	validate interface{},
) *RequirementCommentHandler {
	return &RequirementCommentHandler{
		db:                     db,
		notificationService:    notificationService,
		contentSecurityService: contentSecurityService,
		moderationService:      moderationService,
	}
}

// CreateComment godoc
// @Summary Create requirement comment
// @Description Create a new comment on a requirement
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param request body models.CreateRequirementCommentRequest true "Comment data"
// @Success 201 {object} models.APIResponse{data=models.RequirementCommentResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments [post]
// @Security BearerAuth
func (h *RequirementCommentHandler) CreateComment(c *gin.Context) {
	userID := c.GetInt("user_id")

	var req models.CreateRequirementCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", nil))
		return
	}

	// 支持从路径参数获取requirement_id（RESTful风格）
	if idParam := c.Param("id"); idParam != "" {
		requirementID, err := strconv.Atoi(idParam)
		if err == nil {
			req.RequirementID = requirementID
		}
	}

	// Validate required fields
	if req.Content == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "评论内容不能为空", nil))
		return
	}

	// Validate content length
	if len(req.Content) > 2000 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "评论内容不能超过2000字符", nil))
		return
	}

	// Check if requirement exists and user has permission
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), req.RequirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// Check enterprise access
	user, err := h.db.Users().GetByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取用户信息失败", nil))
		return
	}

	// System users can comment on any requirement
	userRole, _ := c.Get("user_role")
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	if roleStr != "admin" && roleStr != "super_admin" {
		// Company users can only comment on requirements in their enterprise
		// v1.5: Use GetEnterpriseID() for backward compatibility
		enterpriseID := user.GetEnterpriseID()
		if enterpriseID == nil || *enterpriseID != requirement.EnterpriseID {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限评论该需求", nil))
			return
		}
	}

	// If parent comment specified, verify it exists and belongs to same requirement
	if req.ParentCommentID != nil {
		parentComment, err := h.db.RequirementComments().GetByID(c.Request.Context(), *req.ParentCommentID)
		if err != nil || parentComment.RequirementID != req.RequirementID {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "父评论不存在或不属于该需求", nil))
			return
		}
	}

	// Set default comment type
	if req.CommentType == "" {
		req.CommentType = string(models.RequirementCommentTypeGeneral)
	}

	// Validate comment type
	if !models.ValidateRequirementCommentType(req.CommentType) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的评论类型", nil))
		return
	}

	// Extract @mentions from content if not provided
	mentionedUserIDs := req.MentionedUserIDs
	if mentionedUserIDs == nil || len(mentionedUserIDs) == 0 {
		// Auto-extract from content using regex
		comment := &models.RequirementComment{Content: req.Content}
		mentionedUsernames := comment.ExtractMentionedUsernames()

		if len(mentionedUsernames) > 0 {
			// Resolve usernames to user IDs
			mentionedUserIDs = make([]int, 0, len(mentionedUsernames))
			for _, username := range mentionedUsernames {
				user, err := h.db.Users().GetByUsername(c.Request.Context(), username)
				if err == nil && user != nil {
					mentionedUserIDs = append(mentionedUserIDs, user.ID)
				}
			}
		}
	}

	// Validate mentioned users (max 10)
	if len(mentionedUserIDs) > 10 {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "最多只能@提及10个用户", nil))
		return
	}

	// ===== 安全检查 =====
	// 1. 内容安全验证（XSS防护、敏感词检查）
	if h.contentSecurityService != nil {
		// 验证内容安全性
		if err := h.contentSecurityService.ValidateContentSafety(c.Request.Context(), req.Content); err != nil {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, err.Error(), nil))
			return
		}

		// 清理内容（移除危险标签、转义HTML）
		sanitized, err := h.contentSecurityService.SanitizeContent(c.Request.Context(), req.Content)
		if err != nil {
			log.Printf("Error sanitizing content: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "内容安全检查失败", nil))
			return
		}

		// 使用清理后的内容
		req.Content = sanitized.CleanedContent

		// 记录安全检查结果
		if sanitized.HasXSSAttempt {
			log.Printf("XSS attempt detected from user %d: %s", userID, sanitized.OriginalContent)
		}
		if sanitized.HasSensitiveWord {
			log.Printf("Sensitive words detected from user %d: %v", userID, sanitized.SensitiveWords)
		}
	}

	// Create comment
	comment := &models.RequirementComment{
		RequirementID:    req.RequirementID,
		UserID:           userID,
		ParentCommentID:  req.ParentCommentID,
		Content:          req.Content,
		CommentType:      req.CommentType,
		Attachments:      req.Attachments,
		IsInternal:       req.IsInternal,
		MentionedUserIDs: models.IntArray(mentionedUserIDs),
	}

	// 2. 自动审核（决定评论状态）
	if h.moderationService != nil {
		moderationResult, err := h.moderationService.AutoModerate(c.Request.Context(), comment)
		if err != nil {
			log.Printf("Error in auto moderation: %v", err)
			// 审核失败时，默认设置为待审核状态
			comment.Status = string(models.RequirementCommentStatusPendingReview)
		} else {
			// 根据审核结果设置状态
			// comment.Status 已经在AutoModerate中设置

			// 如果自动拒绝，直接返回错误
			if moderationResult.AutoRejected {
				c.JSON(http.StatusBadRequest, models.NewErrorResponse(
					models.ErrCodeValidation,
					"评论内容不符合规范："+moderationResult.RejectionNote,
					gin.H{"moderation_flag": moderationResult.ModerationFlag},
				))
				return
			}

			// 如果需要人工审核，通知用户
			if moderationResult.NeedsReview {
				log.Printf("Comment from user %d requires manual review (flag: %s)", userID, moderationResult.ModerationFlag)
			}
		}
	} else {
		// 如果没有审核服务，默认为活跃状态
		comment.Status = string(models.RequirementCommentStatusActive)
	}

	if err := h.db.RequirementComments().Create(c.Request.Context(), comment); err != nil {
		log.Printf("Error creating requirement comment: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "创建评论失败", nil))
		return
	}

	// Populate mentioned users info
	if len(mentionedUserIDs) > 0 {
		comments := []*models.RequirementComment{comment}
		if err := h.db.RequirementComments().PopulateMentionedUsers(c.Request.Context(), comments); err != nil {
			log.Printf("Error populating mentioned users: %v", err)
		}
	}

	// Trigger notifications for @mentioned users
	if len(mentionedUserIDs) > 0 && h.notificationService != nil {
		// Get current user's username for notification
		currentUser, err := h.db.Users().GetByID(c.Request.Context(), userID)
		if err == nil {
			err = h.notificationService.CreateMentionNotifications(
				c.Request.Context(),
				req.RequirementID,
				comment.ID,
				mentionedUserIDs,
				userID,
				currentUser.Username,
				req.Content,
			)
			if err != nil {
				log.Printf("Warning: Failed to create mention notifications: %v", err)
				// Don't fail the request if notification creation fails
			}
		} else {
			log.Printf("Warning: Failed to get current user for notification: %v", err)
		}
	}

	c.JSON(http.StatusCreated, models.NewSuccessResponse(comment.ToResponse(), "评论创建成功"))
}

// GetComments godoc
// @Summary Get requirement comments
// @Description Get comments for a specific requirement with pagination
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param requirement_id query int true "Requirement ID"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Param with_replies query boolean false "Include replies" default(false)
// @Success 200 {object} models.APIResponse{data=models.RequirementCommentListResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments [get]
// @Security BearerAuth
func (h *RequirementCommentHandler) GetComments(c *gin.Context) {
	// 支持两种方式获取requirement_id：路径参数（新的RESTful风格）或查询参数（兼容旧API）
	var requirementIDStr string
	if idParam := c.Param("id"); idParam != "" {
		// RESTful style: /requirements/:id/comments
		requirementIDStr = idParam
	} else {
		// Legacy style: /requirements/comments?requirement_id=X
		requirementIDStr = c.Query("requirement_id")
	}

	if requirementIDStr == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "缺少requirement_id参数", nil))
		return
	}

	requirementID, err := strconv.Atoi(requirementIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的requirement_id", nil))
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	withReplies := c.Query("with_replies") == "true"

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Verify requirement exists
	requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
		return
	}

	// Check access permission
	userID := c.GetInt("user_id")
	user, err := h.db.Users().GetByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取用户信息失败", nil))
		return
	}

	userRole, _ := c.Get("user_role")
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	// Check enterprise access
	if roleStr != "admin" && roleStr != "super_admin" {
		// v1.5: Use GetEnterpriseID() for backward compatibility
		enterpriseID := user.GetEnterpriseID()
		if enterpriseID == nil || *enterpriseID != requirement.EnterpriseID {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限查看该需求评论", nil))
			return
		}
	}

	// Get comments
	comments, total, err := h.db.RequirementComments().ListByRequirement(c.Request.Context(), requirementID, page, pageSize)
	if err != nil {
		log.Printf("Error getting requirement comments: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取评论列表失败", nil))
		return
	}

	// Filter internal comments for non-system users
	userType, _ := c.Get("user_type")
	userTypeStr := ""
	if userType != nil {
		userTypeStr = userType.(string)
	}

	filteredComments := make([]*models.RequirementComment, 0)
	for _, comment := range comments {
		if comment.CanViewComment(userTypeStr) {
			filteredComments = append(filteredComments, comment)
		}
	}

	// Populate mentioned users
	if len(filteredComments) > 0 {
		if err := h.db.RequirementComments().PopulateMentionedUsers(c.Request.Context(), filteredComments); err != nil {
			log.Printf("Error populating mentioned users: %v", err)
		}
	}

	// Load replies if requested
	if withReplies {
		for _, comment := range filteredComments {
			replies, err := h.db.RequirementComments().GetReplies(c.Request.Context(), comment.ID)
			if err == nil && len(replies) > 0 {
				// Filter replies based on user type
				filteredReplies := make([]models.RequirementComment, 0)
				for _, reply := range replies {
					if reply.CanViewComment(userTypeStr) {
						filteredReplies = append(filteredReplies, *reply)
					}
				}
				comment.Replies = filteredReplies
			}
		}
	}

	// Convert to response
	responseData := make([]models.RequirementCommentResponse, 0, len(filteredComments))
	for _, comment := range filteredComments {
		responseData = append(responseData, comment.ToResponse())
	}

	response := models.RequirementCommentListResponse{
		Data:     responseData,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "获取评论列表成功"))
}

// GetComment godoc
// @Summary Get single comment
// @Description Get a requirement comment by ID
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param id path int true "Comment ID"
// @Success 200 {object} models.APIResponse{data=models.RequirementCommentResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments/{id} [get]
// @Security BearerAuth
func (h *RequirementCommentHandler) GetComment(c *gin.Context) {
	idStr := c.Param("comment_id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的评论ID", nil))
		return
	}

	comment, err := h.db.RequirementComments().GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "评论不存在", nil))
		return
	}

	// Check view permission
	userType, _ := c.Get("user_type")
	userTypeStr := ""
	if userType != nil {
		userTypeStr = userType.(string)
	}

	if !comment.CanViewComment(userTypeStr) {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限查看该评论", nil))
		return
	}

	// Populate mentioned users
	comments := []*models.RequirementComment{comment}
	if err := h.db.RequirementComments().PopulateMentionedUsers(c.Request.Context(), comments); err != nil {
		log.Printf("Error populating mentioned users: %v", err)
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(comment.ToResponse(), "获取评论成功"))
}

// UpdateComment godoc
// @Summary Update comment
// @Description Update a requirement comment (only author can update content)
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param id path int true "Comment ID"
// @Param request body models.UpdateRequirementCommentRequest true "Update data"
// @Success 200 {object} models.APIResponse{data=models.RequirementCommentResponse}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments/{id} [put]
// @Security BearerAuth
func (h *RequirementCommentHandler) UpdateComment(c *gin.Context) {
	userID := c.GetInt("user_id")
	idStr := c.Param("comment_id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的评论ID", nil))
		return
	}

	var req models.UpdateRequirementCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "请求数据格式错误", nil))
		return
	}

	// Get existing comment
	comment, err := h.db.RequirementComments().GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "评论不存在", nil))
		return
	}

	// Check update permission
	userRole, _ := c.Get("user_role")
	userType, _ := c.Get("user_type")
	roleStr := ""
	userTypeStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}
	if userType != nil {
		userTypeStr = userType.(string)
	}

	if !comment.CanUpdateComment(userID, userTypeStr, roleStr) {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限修改该评论", nil))
		return
	}

	// Only comment author can update content
	if req.Content != nil && comment.UserID != userID {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "只有评论作者可以修改内容", nil))
		return
	}

	// Apply updates
	if req.Content != nil {
		if len(*req.Content) == 0 {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "评论内容不能为空", nil))
			return
		}
		if len(*req.Content) > 2000 {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "评论内容不能超过2000字符", nil))
			return
		}
		comment.Content = *req.Content
	}

	if req.CommentType != nil {
		if !models.ValidateRequirementCommentType(*req.CommentType) {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeValidation, "无效的评论类型", nil))
			return
		}
		comment.CommentType = *req.CommentType
	}

	if req.Attachments != nil {
		comment.Attachments = *req.Attachments
	}

	if req.IsInternal != nil {
		comment.IsInternal = *req.IsInternal
	}

	// Only admins/managers can pin comments
	if req.IsPinned != nil {
		if userTypeStr == "system" && (roleStr == "admin" || roleStr == "project_manager") {
			comment.IsPinned = *req.IsPinned
		}
	}

	// Update comment
	if err := h.db.RequirementComments().Update(c.Request.Context(), comment); err != nil {
		log.Printf("Error updating requirement comment: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "更新评论失败", nil))
		return
	}

	// Record history: comment updated
	commentIDStr := strconv.Itoa(id)
	updateComment := "更新了评论内容"
	if req.Content != nil {
		updateComment = "更新了评论 #" + commentIDStr
	}
	history := &models.RequirementHistory{
		RequirementID: comment.RequirementID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionCommented),
		NewValue:      &commentIDStr,
		Comment:       &updateComment,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusOK, models.NewSuccessResponse(comment.ToResponse(), "评论更新成功"))
}

// DeleteComment godoc
// @Summary Delete comment
// @Description Soft delete a requirement comment
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param id path int true "Comment ID"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments/{id} [delete]
// @Security BearerAuth
func (h *RequirementCommentHandler) DeleteComment(c *gin.Context) {
	userID := c.GetInt("user_id")
	idStr := c.Param("comment_id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的评论ID", nil))
		return
	}

	// Get existing comment
	comment, err := h.db.RequirementComments().GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "评论不存在", nil))
		return
	}

	// Check delete permission
	userRole, _ := c.Get("user_role")
	userType, _ := c.Get("user_type")
	roleStr := ""
	userTypeStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}
	if userType != nil {
		userTypeStr = userType.(string)
	}

	if !comment.CanDeleteComment(userID, userTypeStr, roleStr) {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限删除该评论", nil))
		return
	}

	// Soft delete
	if err := h.db.RequirementComments().SoftDelete(c.Request.Context(), id, userID); err != nil {
		log.Printf("Error deleting requirement comment: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "删除评论失败", nil))
		return
	}

	// Record history: comment deleted
	commentIDStr := strconv.Itoa(id)
	deleteComment := "删除了评论 #" + commentIDStr
	history := &models.RequirementHistory{
		RequirementID: comment.RequirementID,
		UserID:        userID,
		Action:        string(models.RequirementHistoryActionCommented),
		OldValue:      &commentIDStr,
		Comment:       &deleteComment,
	}
	_ = h.db.RequirementHistory().Create(c.Request.Context(), history)

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, "评论删除成功"))
}

// GetMentionedComments godoc
// @Summary Get comments mentioning user
// @Description Get comments where the current user was @mentioned
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} models.APIResponse{data=models.RequirementCommentListResponse}
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments/mentions/me [get]
// @Security BearerAuth
func (h *RequirementCommentHandler) GetMentionedComments(c *gin.Context) {
	userID := c.GetInt("user_id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	filters := &models.RequirementCommentFilters{
		Page:     page,
		PageSize: pageSize,
	}

	response, err := h.db.RequirementComments().GetByMentionedUser(c.Request.Context(), userID, filters)
	if err != nil {
		log.Printf("Error getting mentioned comments: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取@提及评论失败", nil))
		return
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "获取@提及评论成功"))
}

// GetCommentStats godoc
// @Summary Get comment statistics
// @Description Get statistics for requirement comments (total, active, by type, etc.)
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param requirement_id query int false "Requirement ID (optional, for single requirement stats)"
// @Success 200 {object} models.APIResponse{data=models.RequirementCommentStats}
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments/stats [get]
// @Security BearerAuth
func (h *RequirementCommentHandler) GetCommentStats(c *gin.Context) {
	// Check if requirement_id is provided
	requirementIDStr := c.Query("requirement_id")

	// If requirement_id provided, get stats for specific requirement
	if requirementIDStr != "" {
		requirementID, err := strconv.Atoi(requirementIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的requirement_id", nil))
			return
		}

		// Verify requirement exists
		requirement, err := h.db.Requirements().GetByID(c.Request.Context(), requirementID)
		if err != nil {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "需求不存在", nil))
			return
		}

		// Check access permission
		userID := c.GetInt("user_id")
		user, err := h.db.Users().GetByID(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取用户信息失败", nil))
			return
		}

		userRole, _ := c.Get("user_role")
		roleStr := ""
		if userRole != nil {
			roleStr = userRole.(string)
		}

		// Check enterprise access
		if roleStr != "admin" && roleStr != "super_admin" {
			// v1.5: Use GetEnterpriseID() for backward compatibility
			enterpriseID := user.GetEnterpriseID()
			if enterpriseID == nil || *enterpriseID != requirement.EnterpriseID {
				c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限查看该需求评论统计", nil))
				return
			}
		}

		// Get stats for specific requirement
		stats, err := h.db.RequirementComments().GetStats(c.Request.Context(), requirementID)
		if err != nil {
			log.Printf("Error getting requirement comment stats: %v", err)
			c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "获取评论统计失败", nil))
			return
		}

		c.JSON(http.StatusOK, models.NewSuccessResponse(stats, "获取评论统计成功"))
		return
	}

	// If no requirement_id, return global stats (requires admin permission)
	userRole, _ := c.Get("user_role")
	roleStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}

	if roleStr != "admin" && roleStr != "super_admin" {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限查看全局评论统计", nil))
		return
	}

	// Return empty stats for global view (can be implemented later if needed)
	stats := &models.RequirementCommentStats{
		TotalComments:     0,
		ActiveComments:    0,
		DeletedComments:   0,
		InternalComments:  0,
		PinnedComments:    0,
		TopLevelComments:  0,
		ReplyComments:     0,
		TodaysComments:    0,
		ThisWeeksComments: 0,
		ByCommentType:     make(map[string]int),
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(stats, "获取全局评论统计成功"))
}

// TogglePin godoc
// @Summary Toggle comment pin
// @Description Pin or unpin a comment (admin/manager only)
// @Tags requirement-comments
// @Accept json
// @Produce json
// @Param id path int true "Comment ID"
// @Param is_pinned query boolean true "Pin status"
// @Success 200 {object} models.APIResponse
// @Failure 400 {object} models.APIResponse
// @Failure 401 {object} models.APIResponse
// @Failure 403 {object} models.APIResponse
// @Failure 404 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/requirements/comments/{id}/pin [put]
// @Security BearerAuth
func (h *RequirementCommentHandler) TogglePin(c *gin.Context) {
	idStr := c.Param("comment_id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "无效的评论ID", nil))
		return
	}

	isPinnedStr := c.Query("is_pinned")
	if isPinnedStr == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "缺少is_pinned参数", nil))
		return
	}

	isPinned := isPinnedStr == "true"

	// Check permission - only admin/manager can pin
	userRole, _ := c.Get("user_role")
	userType, _ := c.Get("user_type")
	roleStr := ""
	userTypeStr := ""
	if userRole != nil {
		roleStr = userRole.(string)
	}
	if userType != nil {
		userTypeStr = userType.(string)
	}

	if userTypeStr != "system" || (roleStr != "admin" && roleStr != "project_manager") {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(models.ErrCodeAuthorization, "无权限置顶评论", nil))
		return
	}

	if err := h.db.RequirementComments().TogglePin(c.Request.Context(), id, isPinned); err != nil {
		log.Printf("Error toggling pin: %v", err)
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "切换置顶状态失败", nil))
		return
	}

	message := "评论已取消置顶"
	if isPinned {
		message = "评论已置顶"
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(nil, message))
}
