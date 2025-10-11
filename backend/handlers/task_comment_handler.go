package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// TaskCommentHandler 任务评论处理器
type TaskCommentHandler struct {
	commentRepo database.TaskCommentRepository
	taskRepo    database.TaskRepository
}

// NewTaskCommentHandler 创建Handler实例
func NewTaskCommentHandler(commentRepo database.TaskCommentRepository, taskRepo database.TaskRepository) *TaskCommentHandler {
	return &TaskCommentHandler{
		commentRepo: commentRepo,
		taskRepo:    taskRepo,
	}
}

// CreateComment 创建评论
// @Summary 创建任务评论
// @Description 为指定任务添加评论
// @Tags TaskComments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "任务ID"
// @Param body body models.CreateTaskCommentRequest true "评论内容"
// @Success 200 {object} models.TaskComment
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/tasks/{id}/comments [post]
func (h *TaskCommentHandler) CreateComment(c *gin.Context) {
	// 1. 获取任务ID (使用id参数名保持与现有任务路由一致)
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}

	// 2. 解析请求体
	var req models.CreateTaskCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 3. 验证内容
	if err := req.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// 4. 验证任务存在
	_, err = h.taskRepo.GetByID(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "任务不存在",
		})
		return
	}

	// 5. 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未登录",
		})
		return
	}

	// 6. 创建评论
	comment := &models.TaskComment{
		TaskID:  taskID,
		UserID:  userID.(int),
		Content: req.Content,
	}

	if err := h.commentRepo.Create(c.Request.Context(), comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "创建评论失败: " + err.Error(),
		})
		return
	}

	// 7. 加载用户信息
	fullComment, err := h.commentRepo.GetByID(c.Request.Context(), comment.ID)
	if err != nil {
		// 如果加载失败，返回基本信息
		comment.CanDelete = true
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    comment,
		})
		return
	}

	fullComment.CanDelete = true // 创建者可删除自己的评论

	// 8. 返回结果
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    fullComment,
	})
}

// ListComments 获取评论列表
// @Summary 获取任务评论列表
// @Description 获取指定任务的评论列表（分页）
// @Tags TaskComments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "任务ID"
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {object} models.ListTaskCommentsResponse
// @Failure 400 {object} map[string]interface{}
// @Router /api/tasks/{id}/comments [get]
func (h *TaskCommentHandler) ListComments(c *gin.Context) {
	// 1. 获取任务ID
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}

	// 2. 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// 3. 查询评论列表
	comments, total, err := h.commentRepo.ListByTask(c.Request.Context(), taskID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "查询评论失败: " + err.Error(),
		})
		return
	}

	// 4. 设置删除权限标记
	currentUserID, _ := c.Get("user_id")
	hasAdminPermission := h.hasPermission(c, "task.comment.delete.any")
	models.SetCanDeleteFlag(comments, currentUserID.(int), hasAdminPermission)

	// 5. 返回结果
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"comments":  comments,
			"total":     total,
			"page":      page,
			"page_size": limit,
		},
	})
}

// DeleteComment 删除评论
// @Summary 删除评论
// @Description 删除指定的评论（仅作者或管理员可删除）
// @Tags TaskComments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "任务ID"
// @Param commentId path int true "评论ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /api/tasks/{id}/comments/{commentId} [delete]
func (h *TaskCommentHandler) DeleteComment(c *gin.Context) {
	// 1. 获取评论ID
	commentID, err := strconv.Atoi(c.Param("commentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的评论ID",
		})
		return
	}

	// 2. 查询评论
	comment, err := h.commentRepo.GetByID(c.Request.Context(), commentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "评论不存在",
		})
		return
	}

	// 3. 权限检查
	currentUserID, _ := c.Get("user_id")
	hasAdminPermission := h.hasPermission(c, "task.comment.delete.any")

	if !models.CanDeleteComment(comment, currentUserID.(int), hasAdminPermission) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "无权删除此评论",
		})
		return
	}

	// 4. 执行软删除
	if err := h.commentRepo.SoftDelete(c.Request.Context(), commentID, currentUserID.(int)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "删除评论失败: " + err.Error(),
		})
		return
	}

	// 5. 返回成功
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "评论已删除",
	})
}

// GetCommentStats 获取评论统计
// @Summary 获取任务评论统计
// @Description 获取任务的评论数量、参与人数等统计信息
// @Tags TaskComments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "任务ID"
// @Success 200 {object} models.TaskCommentStats
// @Failure 400 {object} map[string]interface{}
// @Router /api/tasks/{id}/comments/stats [get]
func (h *TaskCommentHandler) GetCommentStats(c *gin.Context) {
	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的任务ID",
		})
		return
	}

	stats, err := h.commentRepo.GetStats(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "查询统计失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// hasPermission 检查用户是否有指定权限
func (h *TaskCommentHandler) hasPermission(c *gin.Context, permissionCode string) bool {
	// 从context中获取用户权限
	permissions, exists := c.Get("user_permissions")
	if !exists {
		return false
	}

	permList, ok := permissions.([]string)
	if !ok {
		return false
	}

	for _, perm := range permList {
		if perm == permissionCode {
			return true
		}
	}

	return false
}
