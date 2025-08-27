// Work Note Folder Handler
// 工作笔记文件夹HTTP处理器，处理工作笔记文件夹相关的API请求

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

// WorkNoteFolderHandler 工作笔记文件夹处理器
type WorkNoteFolderHandler struct {
	workNoteFolderService *services.WorkNoteFolderService
	jwtManager           *utils.JWTManager
}

// NewWorkNoteFolderHandler 创建工作笔记文件夹处理器
func NewWorkNoteFolderHandler(workNoteFolderService *services.WorkNoteFolderService, jwtManager *utils.JWTManager) *WorkNoteFolderHandler {
	return &WorkNoteFolderHandler{
		workNoteFolderService: workNoteFolderService,
		jwtManager:           jwtManager,
	}
}

// CreateWorkNoteFolder 创建工作笔记文件夹
// @Summary 创建工作笔记文件夹
// @Description 创建新的工作笔记文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param request body models.CreateWorkNoteFolderRequest true "创建文件夹请求"
// @Success 201 {object} models.WorkNoteFolderWithStats
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders [post]
func (h *WorkNoteFolderHandler) CreateWorkNoteFolder(c *gin.Context) {
	var req models.CreateWorkNoteFolderRequest
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
	
	folder, err := h.workNoteFolderService.CreateFolder(c.Request.Context(), req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to create work note folder",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Work note folder created successfully",
		"data":    folder,
	})
}

// GetWorkNoteFolder 获取单个工作笔记文件夹
// @Summary 获取工作笔记文件夹详情
// @Description 根据ID获取工作笔记文件夹详情
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param id path int true "文件夹ID"
// @Success 200 {object} models.WorkNoteFolderWithStats
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/{id} [get]
func (h *WorkNoteFolderHandler) GetWorkNoteFolder(c *gin.Context) {
	folderID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid folder ID",
			Message: "Folder ID must be a valid integer",
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
	
	folder, err := h.workNoteFolderService.GetFolder(c.Request.Context(), folderID, userID.(int))
	if err != nil {
		if err.Error() == "folder not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "Work note folder not found",
				Message: "The requested folder does not exist or you don't have permission to access it",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get work note folder",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    folder,
	})
}

// UpdateWorkNoteFolder 更新工作笔记文件夹
// @Summary 更新工作笔记文件夹
// @Description 更新指定ID的工作笔记文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param id path int true "文件夹ID"
// @Param request body models.UpdateWorkNoteFolderRequest true "更新文件夹请求"
// @Success 200 {object} models.WorkNoteFolderWithStats
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/{id} [put]
func (h *WorkNoteFolderHandler) UpdateWorkNoteFolder(c *gin.Context) {
	folderID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid folder ID",
			Message: "Folder ID must be a valid integer",
		})
		return
	}
	
	var req models.UpdateWorkNoteFolderRequest
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
	
	folder, err := h.workNoteFolderService.UpdateFolder(c.Request.Context(), folderID, req, userID.(int))
	if err != nil {
		if err.Error() == "folder not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "Work note folder not found",
				Message: "The requested folder does not exist or you don't have permission to access it",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to update work note folder",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note folder updated successfully",
		"data":    folder,
	})
}

// DeleteWorkNoteFolder 删除工作笔记文件夹
// @Summary 删除工作笔记文件夹
// @Description 删除指定ID的工作笔记文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param id path int true "文件夹ID"
// @Param force query bool false "是否强制删除（包含子项）"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/{id} [delete]
func (h *WorkNoteFolderHandler) DeleteWorkNoteFolder(c *gin.Context) {
	folderID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid folder ID",
			Message: "Folder ID must be a valid integer",
		})
		return
	}
	
	force := c.Query("force") == "true"
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	err = h.workNoteFolderService.DeleteFolder(c.Request.Context(), folderID, userID.(int), force)
	if err != nil {
		if err.Error() == "folder not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error:   "Work note folder not found",
				Message: "The requested folder does not exist or you don't have permission to access it",
			})
			return
		}
		
		if strings.Contains(err.Error(), "has children") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "Cannot delete folder with children",
				Message: "This folder contains subfolders or notes. Use force=true to delete recursively.",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to delete work note folder",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note folder deleted successfully",
	})
}

// ListWorkNoteFolders 获取工作笔记文件夹列表
// @Summary 获取工作笔记文件夹列表
// @Description 获取当前用户的工作笔记文件夹列表，支持过滤和分页
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param parent_id query int false "父文件夹ID"
// @Param visibility query string false "可见性"
// @Param folder_type query string false "文件夹类型"
// @Param is_system_folder query bool false "是否系统文件夹"
// @Param search query string false "搜索关键词"
// @Param sort_by query string false "排序字段" default(name)
// @Param order query string false "排序方向" default(asc)
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(50)
// @Success 200 {object} models.WorkNoteFolderListResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders [get]
func (h *WorkNoteFolderHandler) ListWorkNoteFolders(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	// 解析查询参数
	filter := models.WorkNoteFolderFilter{}
	
	if parentIDStr := c.Query("parent_id"); parentIDStr != "" {
		if parentID, err := strconv.Atoi(parentIDStr); err == nil {
			filter.ParentID = &parentID
		}
	}
	
	if visibilityStr := c.Query("visibility"); visibilityStr != "" {
		visibility := models.Visibility(visibilityStr)
		filter.Visibility = &visibility
	}
	
	if folderTypeStr := c.Query("folder_type"); folderTypeStr != "" {
		folderType := models.FolderType(folderTypeStr)
		filter.FolderType = &folderType
	}
	
	if isSystemStr := c.Query("is_system_folder"); isSystemStr != "" {
		if isSystem, err := strconv.ParseBool(isSystemStr); err == nil {
			filter.IsSystemFolder = &isSystem
		}
	}
	
	filter.Search = c.Query("search")
	filter.SortBy = c.DefaultQuery("sort_by", "name")
	filter.Order = c.DefaultQuery("order", "asc")
	
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
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 200 {
			filter.Limit = limit
		} else {
			filter.Limit = 50
		}
	} else {
		filter.Limit = 50
	}
	
	// 设置用户ID
	uid := userID.(int)
	filter.OwnerID = &uid
	
	response, err := h.workNoteFolderService.ListFolders(c.Request.Context(), filter, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to list work note folders",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// GetWorkNoteFolderTree 获取工作笔记文件夹树
// @Summary 获取工作笔记文件夹树
// @Description 获取层级结构的工作笔记文件夹树
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param root_id query int false "根文件夹ID"
// @Param max_depth query int false "最大深度"
// @Param include_stats query bool false "是否包含统计信息" default(true)
// @Success 200 {object} models.WorkNoteFolderTreeResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/tree [get]
func (h *WorkNoteFolderHandler) GetWorkNoteFolderTree(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	var rootID *int
	if rootIDStr := c.Query("root_id"); rootIDStr != "" {
		if id, err := strconv.Atoi(rootIDStr); err == nil {
			rootID = &id
		}
	}
	
	var maxDepth *int
	if maxDepthStr := c.Query("max_depth"); maxDepthStr != "" {
		if depth, err := strconv.Atoi(maxDepthStr); err == nil && depth > 0 {
			maxDepth = &depth
		}
	}
	
	includeStats := c.DefaultQuery("include_stats", "true") == "true"
	
	tree, err := h.workNoteFolderService.GetFolderTree(c.Request.Context(), rootID, maxDepth, includeStats, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get work note folder tree",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    tree,
	})
}

// MoveWorkNoteFolder 移动工作笔记文件夹
// @Summary 移动工作笔记文件夹
// @Description 移动文件夹到新的父文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param id path int true "文件夹ID"
// @Param request body models.MoveWorkNoteFolderRequest true "移动请求"
// @Success 200 {object} models.WorkNoteFolderWithStats
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/{id}/move [post]
func (h *WorkNoteFolderHandler) MoveWorkNoteFolder(c *gin.Context) {
	folderID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid folder ID",
			Message: "Folder ID must be a valid integer",
		})
		return
	}
	
	var req models.MoveWorkNoteFolderRequest
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
	
	folder, err := h.workNoteFolderService.MoveFolder(c.Request.Context(), folderID, req.TargetParentID, req.Position, userID.(int))
	if err != nil {
		if strings.Contains(err.Error(), "circular reference") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error:   "Invalid move operation",
				Message: "Cannot move folder to its own descendant",
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to move work note folder",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note folder moved successfully",
		"data":    folder,
	})
}

// BatchMoveFolders 批量移动文件夹
// @Summary 批量移动文件夹
// @Description 批量移动多个文件夹到新的父文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param request body models.BatchMoveFoldersRequest true "批量移动请求"
// @Success 200 {object} models.FolderOperationResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/batch/move [post]
func (h *WorkNoteFolderHandler) BatchMoveFolders(c *gin.Context) {
	var req models.BatchMoveFoldersRequest
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
	
	result, err := h.workNoteFolderService.BatchMoveFolders(c.Request.Context(), req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to batch move folders",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": result.Success,
		"message": "Batch move operation completed",
		"data":    result,
	})
}

// BatchSortFolders 批量排序文件夹
// @Summary 批量排序文件夹
// @Description 批量设置文件夹的排序顺序
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param request body models.BatchSortFoldersRequest true "批量排序请求"
// @Success 200 {object} models.FolderOperationResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/batch/sort [post]
func (h *WorkNoteFolderHandler) BatchSortFolders(c *gin.Context) {
	var req models.BatchSortFoldersRequest
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
	
	result, err := h.workNoteFolderService.BatchSortFolders(c.Request.Context(), req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to batch sort folders",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": result.Success,
		"message": "Batch sort operation completed",
		"data":    result,
	})
}

// GetFolderAncestors 获取文件夹祖先路径
// @Summary 获取文件夹祖先路径
// @Description 获取指定文件夹的所有祖先文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param id path int true "文件夹ID"
// @Success 200 {array} models.FolderAncestor
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/{id}/ancestors [get]
func (h *WorkNoteFolderHandler) GetFolderAncestors(c *gin.Context) {
	folderID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid folder ID",
			Message: "Folder ID must be a valid integer",
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
	
	ancestors, err := h.workNoteFolderService.GetFolderAncestors(c.Request.Context(), folderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get folder ancestors",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ancestors,
	})
}

// GetFolderDescendants 获取文件夹后代
// @Summary 获取文件夹后代
// @Description 获取指定文件夹的所有后代文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param id path int true "文件夹ID"
// @Param max_depth query int false "最大深度"
// @Param include_stats query bool false "是否包含统计信息" default(true)
// @Success 200 {array} models.WorkNoteFolderWithStats
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/{id}/descendants [get]
func (h *WorkNoteFolderHandler) GetFolderDescendants(c *gin.Context) {
	folderID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid folder ID",
			Message: "Folder ID must be a valid integer",
		})
		return
	}
	
	var maxDepth *int
	if maxDepthStr := c.Query("max_depth"); maxDepthStr != "" {
		if depth, err := strconv.Atoi(maxDepthStr); err == nil && depth > 0 {
			maxDepth = &depth
		}
	}
	
	includeStats := c.DefaultQuery("include_stats", "true") == "true"
	
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error:   "Unauthorized",
			Message: "User ID not found in context",
		})
		return
	}
	
	descendants, err := h.workNoteFolderService.GetFolderDescendants(c.Request.Context(), folderID, maxDepth, includeStats)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get folder descendants",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    descendants,
	})
}

// SearchWorkNoteFolders 搜索工作笔记文件夹
// @Summary 搜索工作笔记文件夹
// @Description 在文件夹树中搜索文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param q query string true "搜索关键词"
// @Param root_id query int false "根文件夹ID"
// @Param max_results query int false "最大结果数" default(20)
// @Success 200 {array} models.FolderSearchResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/search [get]
func (h *WorkNoteFolderHandler) SearchWorkNoteFolders(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Missing search query",
			Message: "Search query parameter 'q' is required",
		})
		return
	}
	
	var rootID *int
	if rootIDStr := c.Query("root_id"); rootIDStr != "" {
		if id, err := strconv.Atoi(rootIDStr); err == nil {
			rootID = &id
		}
	}
	
	maxResults := 20
	if maxResultsStr := c.Query("max_results"); maxResultsStr != "" {
		if mr, err := strconv.Atoi(maxResultsStr); err == nil && mr > 0 && mr <= 100 {
			maxResults = mr
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
	
	results, err := h.workNoteFolderService.SearchFoldersInTree(c.Request.Context(), query, rootID, maxResults)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to search work note folders",
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

// BatchMoveNotesToFolder 批量移动笔记到文件夹
// @Summary 批量移动笔记到文件夹
// @Description 将多个工作笔记移动到指定文件夹
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param request body models.BatchMoveNotesToFolderRequest true "批量移动笔记请求"
// @Success 200 {object} models.FolderOperationResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/batch/move-notes [post]
func (h *WorkNoteFolderHandler) BatchMoveNotesToFolder(c *gin.Context) {
	var req models.BatchMoveNotesToFolderRequest
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
	
	result, err := h.workNoteFolderService.BatchMoveNotesToFolder(c.Request.Context(), req, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to batch move notes to folder",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": result.Success,
		"message": "Batch move notes operation completed",
		"data":    result,
	})
}

// GetFolderStats 获取文件夹统计信息
// @Summary 获取文件夹统计信息
// @Description 获取指定文件夹的详细统计信息
// @Tags work-note-folders
// @Accept json
// @Produce json
// @Param id path int true "文件夹ID"
// @Success 200 {object} models.FolderStatistics
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/work-note-folders/{id}/stats [get]
func (h *WorkNoteFolderHandler) GetFolderStats(c *gin.Context) {
	folderID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "Invalid folder ID",
			Message: "Folder ID must be a valid integer",
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
	
	stats, err := h.workNoteFolderService.GetFolderStatistics(c.Request.Context(), folderID, userID.(int))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "Failed to get folder statistics",
			Message: err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
