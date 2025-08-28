// Work Note Handler
// 工作笔记HTTP处理器，处理工作笔记相关的API请求
// 与DocumentHandler协作但专门处理工作笔记特有功能

package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"ai-project-backend/models"
	"ai-project-backend/services"
	"ai-project-backend/utils"
	"github.com/gin-gonic/gin"
)

// WorkNoteHandler 工作笔记处理器
type WorkNoteHandler struct {
	workNoteService *services.WorkNoteService
	jwtManager      *utils.JWTManager
}

// NewWorkNoteHandler 创建工作笔记处理器
func NewWorkNoteHandler(workNoteService *services.WorkNoteService, jwtManager *utils.JWTManager) *WorkNoteHandler {
	return &WorkNoteHandler{
		workNoteService: workNoteService,
		jwtManager:      jwtManager,
	}
}

// CreateWorkNote 创建工作笔记
// @Summary 创建工作笔记
// @Description 创建新的工作笔记
// @Tags work-notes
// @Accept json
// @Produce json
// @Param request body models.CreateWorkNoteRequest true "创建工作笔记请求"
// @Success 201 {object} models.WorkNote
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes [post]
func (h *WorkNoteHandler) CreateWorkNote(c *gin.Context) {
	var req models.CreateWorkNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error()))
		return
	}
	
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	
	workNote, err := h.workNoteService.CreateWorkNote(c.Request.Context(), req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to create work note", err.Error()))
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Work note created successfully",
		"data":    workNote,
	})
}

// ListWorkNotes 获取工作笔记列表
// @Summary 获取工作笔记列表
// @Description 获取当前用户的工作笔记列表，支持过滤和分页
// @Tags work-notes
// @Accept json
// @Produce json
// @Param folder_id query int false "文件夹ID"
// @Param work_note_type query string false "笔记类型"
// @Param priority query string false "优先级"
// @Param visibility query string false "可见性"
// @Param status query string false "状态"
// @Param is_pinned query bool false "是否置顶"
// @Param is_bookmarked query bool false "是否收藏"
// @Param tags query string false "标签，逗号分隔"
// @Param search query string false "搜索关键词"
// @Param sort_by query string false "排序字段" default(updated_at)
// @Param order query string false "排序方向" default(desc)
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {object} models.WorkNoteListResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes [get]
func (h *WorkNoteHandler) ListWorkNotes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	
	// 解析查询参数
	filter := models.WorkNoteFilter{}
	
	if folderIDStr := c.Query("folder_id"); folderIDStr != "" {
		if folderID, err := strconv.Atoi(folderIDStr); err == nil {
			filter.WorkNoteFolderID = &folderID
		}
	}
	
	if workNoteTypeStr := c.Query("work_note_type"); workNoteTypeStr != "" {
		workNoteType := models.WorkNoteType(workNoteTypeStr)
		filter.WorkNoteType = &workNoteType
	}
	
	if priorityStr := c.Query("priority"); priorityStr != "" {
		priority := models.WorkNotePriority(priorityStr)
		filter.Priority = &priority
	}
	
	if visibilityStr := c.Query("visibility"); visibilityStr != "" {
		visibility := models.Visibility(visibilityStr)
		filter.Visibility = &visibility
	}
	
	if statusStr := c.Query("status"); statusStr != "" {
		status := models.DocumentStatus(statusStr)
		filter.Status = &status
	}
	
	if isPinnedStr := c.Query("is_pinned"); isPinnedStr != "" {
		if isPinned, err := strconv.ParseBool(isPinnedStr); err == nil {
			filter.IsPinned = &isPinned
		}
	}
	
	if isBookmarkedStr := c.Query("is_bookmarked"); isBookmarkedStr != "" {
		if isBookmarked, err := strconv.ParseBool(isBookmarkedStr); err == nil {
			filter.IsBookmarked = &isBookmarked
		}
	}
	
	if tagsStr := c.Query("tags"); tagsStr != "" {
		// 标签以逗号分隔
		tags := []string{}
		for _, tag := range strings.Split(tagsStr, ",") {
			if trimmed := strings.TrimSpace(tag); trimmed != "" {
				tags = append(tags, trimmed)
			}
		}
		filter.Tags = tags
	}
	
	filter.Search = c.Query("search")
	filter.SortBy = c.DefaultQuery("sort_by", "updated_at")
	filter.Order = c.DefaultQuery("order", "desc")
	
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		} else {
			filter.Page = 1
		}
	} else {
		filter.Page = 1
	}
	
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filter.Limit = limit
		} else {
			filter.Limit = 20
		}
	} else {
		filter.Limit = 20
	}
	
	// 设置用户ID
	uid := userID.(int)
	filter.OwnerID = &uid
	
	response, err := h.workNoteService.ListWorkNotes(c.Request.Context(), filter, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to list work notes", err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// SearchWorkNotes 搜索工作笔记
// @Summary 搜索工作笔记
// @Description 根据关键词搜索工作笔记
// @Tags work-notes
// @Accept json
// @Produce json
// @Param q query string true "搜索关键词"
// @Param tags query string false "标签，逗号分隔"
// @Param limit query int false "返回结果数量限制" default(10)
// @Success 200 {array} models.WorkNoteSearchResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/search [get]
func (h *WorkNoteHandler) SearchWorkNotes(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Missing search query", "Search query parameter 'q' is required"))
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	
	// 解析标签过滤
	var tags []string
	if tagsStr := c.Query("tags"); tagsStr != "" {
		for _, tag := range strings.Split(tagsStr, ",") {
			if trimmed := strings.TrimSpace(tag); trimmed != "" {
				tags = append(tags, trimmed)
			}
		}
	}
	
	// 解析限制数量
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}
	
	results, err := h.workNoteService.SearchWorkNotes(c.Request.Context(), query, tags, userID.(int), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to search work notes", err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
		"query":   query,
	})
}

// GetWorkNote 获取单个工作笔记
// @Summary 获取工作笔记详情
// @Description 根据ID获取工作笔记详情
// @Tags work-notes
// @Accept json
// @Produce json
// @Param id path int true "工作笔记ID"
// @Success 200 {object} models.WorkNote
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/{id} [get]
func (h *WorkNoteHandler) GetWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid note ID", "Note ID must be a valid integer"))
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	
	workNote, err := h.workNoteService.GetWorkNote(c.Request.Context(), noteID, userID.(int))
	if err != nil {
		if err.Error() == "document not found" || strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "Work note not found", "The requested work note does not exist or you don't have permission to access it"))
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to get work note", err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    workNote,
	})
}

// UpdateWorkNote 更新工作笔记
// @Summary 更新工作笔记
// @Description 更新指定ID的工作笔记
// @Tags work-notes
// @Accept json
// @Produce json
// @Param id path int true "工作笔记ID"
// @Param request body models.UpdateWorkNoteRequest true "更新工作笔记请求"
// @Success 200 {object} models.WorkNote
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/{id} [put]
func (h *WorkNoteHandler) UpdateWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid note ID", "Note ID must be a valid integer"))
		return
	}
	
	var req models.UpdateWorkNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error()))
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	
	workNote, err := h.workNoteService.UpdateWorkNote(c.Request.Context(), noteID, req, userID.(int))
	if err != nil {
		if err.Error() == "document not found" || strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(models.ErrCodeNotFound, "Work note not found", "The requested work note does not exist or you don't have permission to access it"))
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to update work note", err.Error()))
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note updated successfully",
		"data":    workNote,
	})
}

// DeleteWorkNote 删除工作笔记
func (h *WorkNoteHandler) DeleteWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid note ID", "Note ID must be a valid integer"))
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	if err := h.workNoteService.DeleteWorkNote(c.Request.Context(), noteID, userID.(int)); err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to delete work note", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true })
}

// BatchUpdateWorkNotes 批量更新工作笔记
func (h *WorkNoteHandler) BatchUpdateWorkNotes(c *gin.Context) {
	var op models.BatchWorkNoteOperation
	if err := c.ShouldBindJSON(&op); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid request format", err.Error()))
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	if err := h.workNoteService.BatchUpdateWorkNotes(c.Request.Context(), op, userID.(int)); err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to batch update work notes", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "message": "Batch update completed" })
}

// GetWorkNoteStats 获取工作笔记统计
func (h *WorkNoteHandler) GetWorkNoteStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	stats, err := h.workNoteService.GetWorkNoteStats(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to get work note stats", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "data": stats })
}

// GetRecentNotes 获取最近笔记
func (h *WorkNoteHandler) GetRecentNotes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	limit := 10
	if s := c.Query("limit"); s != "" {
		if v, err := strconv.Atoi(s); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	notes, err := h.workNoteService.GetRecentNotes(c.Request.Context(), userID.(int), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to get recent notes", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "data": notes })
}

// GetPinnedNotes 获取置顶笔记
func (h *WorkNoteHandler) GetPinnedNotes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	notes, err := h.workNoteService.GetPinnedNotes(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to get pinned notes", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "data": notes })
}

// GetBookmarkedNotes 获取收藏笔记
func (h *WorkNoteHandler) GetBookmarkedNotes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	notes, err := h.workNoteService.GetBookmarkedNotes(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to get bookmarked notes", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "data": notes })
}

// PinWorkNote 置顶/取消置顶
func (h *WorkNoteHandler) PinWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid note ID", "Note ID must be a valid integer"))
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	var body struct { Pinned *bool `json:"pinned"` }
	_ = c.ShouldBindJSON(&body)
	pinned := true
	if body.Pinned != nil { pinned = *body.Pinned }
	req := models.UpdateWorkNoteRequest{ IsPinned: &pinned }
	updated, err := h.workNoteService.UpdateWorkNote(c.Request.Context(), noteID, req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to update pin state", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "data": updated })
}

// BookmarkWorkNote 收藏/取消收藏
func (h *WorkNoteHandler) BookmarkWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid note ID", "Note ID must be a valid integer"))
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	var body struct { Bookmarked *bool `json:"bookmarked"` }
	_ = c.ShouldBindJSON(&body)
	bookmarked := true
	if body.Bookmarked != nil { bookmarked = *body.Bookmarked }
	req := models.UpdateWorkNoteRequest{ IsBookmarked: &bookmarked }
	updated, err := h.workNoteService.UpdateWorkNote(c.Request.Context(), noteID, req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to update bookmark state", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "data": updated })
}

// GetRelatedNotes 获取相关笔记
func (h *WorkNoteHandler) GetRelatedNotes(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid note ID", "Note ID must be a valid integer"))
		return
	}
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(models.ErrCodeUnauthorized, "Unauthorized", "User ID not found in context"))
		return
	}
	related, err := h.workNoteService.GetRelatedNotes(c.Request.Context(), noteID, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(models.ErrCodeInternal, "Failed to get related notes", err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{ "success": true, "data": related })
}
