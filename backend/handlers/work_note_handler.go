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
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request format",
			Message: err.Error(),
		})
		return
	}
	
	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	workNote, err := h.workNoteService.CreateWorkNote(c.Request.Context(), req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to create work note",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Work note created successfully",
		"data":    workNote,
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
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid note ID",
			Message: "Note ID must be a valid integer",
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	workNote, err := h.workNoteService.GetWorkNote(c.Request.Context(), noteID, userID.(int))
	if err != nil {
		if err.Error() == "document not found" || err.Error() == "work note not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "Work note not found",
				Message: "The requested work note does not exist or you don't have permission to access it",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get work note",
			Message: err.Error(),
		})
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
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid note ID",
			Message: "Note ID must be a valid integer",
		})
		return
	}
	
	var req models.UpdateWorkNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request format",
			Message: err.Error(),
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	workNote, err := h.workNoteService.UpdateWorkNote(c.Request.Context(), noteID, req, userID.(int))
	if err != nil {
		if err.Error() == "document not found" || err.Error() == "work note not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "Work note not found",
				Message: "The requested work note does not exist or you don't have permission to access it",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to update work note",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note updated successfully",
		"data":    workNote,
	})
}

// DeleteWorkNote 删除工作笔记
// @Summary 删除工作笔记
// @Description 删除指定ID的工作笔记
// @Tags work-notes
// @Accept json
// @Produce json
// @Param id path int true "工作笔记ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/{id} [delete]
func (h *WorkNoteHandler) DeleteWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid note ID",
			Message: "Note ID must be a valid integer",
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	err = h.workNoteService.DeleteWorkNote(c.Request.Context(), noteID, userID.(int))
	if err != nil {
		if err.Error() == "document not found" || err.Error() == "work note not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "Work note not found",
				Message: "The requested work note does not exist or you don't have permission to access it",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to delete work note",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note deleted successfully",
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
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
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
		// 假设标签以逗号分隔
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
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to list work notes",
			Message: err.Error(),
		})
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
// @Param folder_id query int false "文件夹ID"
// @Param work_note_type query string false "笔记类型"
// @Param priority query string false "优先级"
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {array} models.WorkNoteSearchResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/search [get]
func (h *WorkNoteHandler) SearchWorkNotes(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Missing search query",
			Message: "Search query parameter 'q' is required",
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	// 解析过滤参数
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
	
	results, err := h.workNoteService.SearchWorkNotes(c.Request.Context(), query, filter, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to search work notes",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
		"query":   query,
	})
}

// BatchUpdateWorkNotes 批量更新工作笔记
// @Summary 批量更新工作笔记
// @Description 批量执行工作笔记操作（移动、标签、优先级、删除、归档）
// @Tags work-notes
// @Accept json
// @Produce json
// @Param request body models.BatchWorkNoteOperation true "批量操作请求"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/batch [post]
func (h *WorkNoteHandler) BatchUpdateWorkNotes(c *gin.Context) {
	var req models.BatchWorkNoteOperation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request format",
			Message: err.Error(),
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	err := h.workNoteService.BatchUpdateWorkNotes(c.Request.Context(), req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to execute batch operation",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Batch operation completed successfully",
	})
}

// GetWorkNoteStats 获取工作笔记统计信息
// @Summary 获取工作笔记统计信息
// @Description 获取当前用户的工作笔记统计数据
// @Tags work-notes
// @Accept json
// @Produce json
// @Success 200 {object} models.WorkNoteStats
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/stats [get]
func (h *WorkNoteHandler) GetWorkNoteStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	stats, err := h.workNoteService.GetWorkNoteStats(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get work note stats",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// PinWorkNote 置顶/取消置顶工作笔记
// @Summary 置顶/取消置顶工作笔记
// @Description 设置工作笔记的置顶状态
// @Tags work-notes
// @Accept json
// @Produce json
// @Param id path int true "工作笔记ID"
// @Param request body object{pinned:bool} true "置顶状态"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/{id}/pin [post]
func (h *WorkNoteHandler) PinWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid note ID",
			Message: "Note ID must be a valid integer",
		})
		return
	}
	
	var req struct {
		Pinned bool `json:"pinned"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request format",
			Message: err.Error(),
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	err = h.workNoteService.PinWorkNote(c.Request.Context(), noteID, req.Pinned, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to pin/unpin work note",
			Message: err.Error(),
		})
		return
	}
	
	action := "unpinned"
	if req.Pinned {
		action = "pinned"
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note " + action + " successfully",
	})
}

// BookmarkWorkNote 收藏/取消收藏工作笔记
// @Summary 收藏/取消收藏工作笔记
// @Description 设置工作笔记的收藏状态
// @Tags work-notes
// @Accept json
// @Produce json
// @Param id path int true "工作笔记ID"
// @Param request body object{bookmarked:bool} true "收藏状态"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/{id}/bookmark [post]
func (h *WorkNoteHandler) BookmarkWorkNote(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid note ID",
			Message: "Note ID must be a valid integer",
		})
		return
	}
	
	var req struct {
		Bookmarked bool `json:"bookmarked"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid request format",
			Message: err.Error(),
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	err = h.workNoteService.BookmarkWorkNote(c.Request.Context(), noteID, req.Bookmarked, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to bookmark/unbookmark work note",
			Message: err.Error(),
		})
		return
	}
	
	action := "unbookmarked"
	if req.Bookmarked {
		action = "bookmarked"
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note " + action + " successfully",
	})
}

// GetRelatedNotes 获取相关笔记
// @Summary 获取相关笔记
// @Description 获取与指定笔记相关的其他笔记
// @Tags work-notes
// @Accept json
// @Produce json
// @Param id path int true "工作笔记ID"
// @Success 200 {array} models.WorkNote
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/{id}/related [get]
func (h *WorkNoteHandler) GetRelatedNotes(c *gin.Context) {
	noteID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid note ID",
			Message: "Note ID must be a valid integer",
		})
		return
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	relatedNotes, err := h.workNoteService.GetRelatedNotes(c.Request.Context(), noteID, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get related notes",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    relatedNotes,
	})
}

// GetRecentNotes 获取最近的工作笔记
// @Summary 获取最近的工作笔记
// @Description 获取最近更新的工作笔记列表
// @Tags work-notes
// @Accept json
// @Produce json
// @Param limit query int false "数量限制" default(10)
// @Success 200 {array} models.WorkNote
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/recent [get]
func (h *WorkNoteHandler) GetRecentNotes(c *gin.Context) {
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	recentNotes, err := h.workNoteService.GetRecentNotes(c.Request.Context(), userID.(int), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get recent notes",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    recentNotes,
	})
}

// GetPinnedNotes 获取置顶的工作笔记
// @Summary 获取置顶的工作笔记
// @Description 获取当前用户置顶的工作笔记列表
// @Tags work-notes
// @Accept json
// @Produce json
// @Success 200 {array} models.WorkNote
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/pinned [get]
func (h *WorkNoteHandler) GetPinnedNotes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	pinnedNotes, err := h.workNoteService.GetPinnedNotes(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get pinned notes",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pinnedNotes,
	})
}

// GetBookmarkedNotes 获取收藏的工作笔记
// @Summary 获取收藏的工作笔记
// @Description 获取当前用户收藏的工作笔记列表
// @Tags work-notes
// @Accept json
// @Produce json
// @Success 200 {array} models.WorkNote
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-notes/bookmarked [get]
func (h *WorkNoteHandler) GetBookmarkedNotes(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	bookmarkedNotes, err := h.workNoteService.GetBookmarkedNotes(c.Request.Context(), userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get bookmarked notes",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    bookmarkedNotes,
	})
}
