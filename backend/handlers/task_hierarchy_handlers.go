package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// TaskHierarchyHandler 任务层次结构处理器
type TaskHierarchyHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewTaskHierarchyHandler 创建任务层次结构处理器
func NewTaskHierarchyHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *TaskHierarchyHandler {
	return &TaskHierarchyHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetTaskDescendants 获取任务后代（平铺，含层级）
// Supports unified response format with backward compatibility
func (h *TaskHierarchyHandler) GetTaskDescendants(c *gin.Context) {
	// path params
	projectIDStr := c.Param("id")
	_, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}
	rootTaskIDStr := c.Param("taskId")
	rootTaskID, err := strconv.Atoi(rootTaskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// query params
	depth := 2
	limit := 200
	includeExtended := false
	apiVersion := "v1" // default to v1 for backward compatibility
	
	if v := c.Query("depth"); v != "" {
		if dv, err := strconv.Atoi(v); err == nil {
			depth = dv
		}
	}
	if v := c.Query("limit"); v != "" {
		if lv, err := strconv.Atoi(v); err == nil {
			limit = lv
		}
	}
	if v := c.Query("include_extended"); v == "true" {
		includeExtended = true
	}
	if v := c.Query("api_version"); v != "" {
		apiVersion = v
	}

	// fetch root basic info
	rootTask, err := h.db.Tasks().GetByID(c.Request.Context(), rootTaskID)
	if err != nil {
		h.logger.Printf("Error getting root task: %v", err)
		response := models.NewErrorResponse(models.ErrCodeNotFound, "Root task not found", nil)
		c.JSON(http.StatusNotFound, response)
		return
	}

	// Check API version and respond accordingly
	if apiVersion == "v2" || includeExtended {
		// Use new unified format
		h.getTaskDescendantsV2(c, rootTaskID, depth, limit, includeExtended, rootTask)
		return
	}

	// V1 API - maintain backward compatibility
	nodes, err := h.db.Tasks().GetDescendants(c.Request.Context(), rootTaskID, depth, limit)
	if err != nil {
		h.logger.Printf("Error getting descendants: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task descendants", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	resp := map[string]interface{}{
		"root": map[string]interface{}{
			"id":    rootTask.ID,
			"title": rootTask.Title,
		},
		"data": nodes,
		"page_info": map[string]interface{}{
			"has_more":    false,
			"next_cursor": nil,
		},
		"meta": map[string]interface{}{
			"requested_depth":        depth,
			"max_depth_reached":      true,
			"truncated":              len(nodes) >= limit,
			"total_returned":         len(nodes),
			"hidden_nodes_truncated": false,
		},
	}

	c.JSON(http.StatusOK, models.NewSuccessResponse(resp, "Task descendants retrieved successfully"))
}

// getTaskDescendantsV2 handles the new unified API format with pagination support
func (h *TaskHierarchyHandler) getTaskDescendantsV2(c *gin.Context, rootTaskID, depth, limit int, includeExtended bool, rootTask *models.Task) {
	// Parse pagination parameters
	page := 1
	pageSize := limit // Use limit as default page size for backward compatibility
	usePagination := false
	
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
			usePagination = true
		}
	}
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
			usePagination = true
		}
	}

	// Create unified response
	response := models.NewTaskHierarchyResponse("descendants", includeExtended)
	
	// Set root info
	response.Root = &models.TaskRootInfo{
		ID:          rootTask.ID,
		Title:       rootTask.Title,
		Description: rootTask.Description,
		Status:      rootTask.Status,
	}

	var total int
	var hasMore bool

	if usePagination {
		// Use paginated methods
		if includeExtended {
			// Get full task details with pagination
			tasks, totalCount, err := h.db.Tasks().GetDescendantsWithFullDetailsPaginated(c.Request.Context(), rootTaskID, depth, page, pageSize)
			if err != nil {
				h.logger.Printf("Error getting descendants with full details (paginated): %v", err)
				resp := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task descendants", nil)
				c.JSON(http.StatusInternalServerError, resp)
				return
			}

			total = totalCount
			hasMore = page*pageSize < total

			// Convert to unified nodes with extended fields
			for _, task := range tasks {
				node := models.NewUnifiedTaskNodeFromTask(task, task.TaskLevel)
				response.Data = append(response.Data, node)
			}
		} else {
			// Get minimal descendants with pagination
			descendants, totalCount, err := h.db.Tasks().GetDescendantsPaginated(c.Request.Context(), rootTaskID, depth, page, pageSize)
			if err != nil {
				h.logger.Printf("Error getting descendants (paginated): %v", err)
				resp := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task descendants", nil)
				c.JSON(http.StatusInternalServerError, resp)
				return
			}

			total = totalCount
			hasMore = page*pageSize < total

			// Convert to unified nodes with minimal fields
			for _, descendant := range descendants {
				node := models.NewUnifiedTaskNodeFromDescendant(descendant)
				response.Data = append(response.Data, node)
			}
		}

		// Set pagination info
		totalPages := (total + pageSize - 1) / pageSize
		response.PageInfo = &models.TaskHierarchyPage{
			HasMore:    hasMore,
			NextCursor: nil,
			Page:       &page,
			PageSize:   &pageSize,
			Total:      &total,
		}

		response.Pagination = &models.Pagination{
			Page:       page,
			PageSize:   pageSize,
			Total:      int64(total),
			TotalPages: totalPages,
			HasNext:    hasMore,
			HasPrev:    page > 1,
		}
	} else {
		// Use non-paginated methods for backward compatibility
		if includeExtended {
			// Get full task details for extended response
			tasks, err := h.db.Tasks().GetDescendantsWithFullDetails(c.Request.Context(), rootTaskID, depth, limit)
			if err != nil {
				h.logger.Printf("Error getting descendants with full details: %v", err)
				resp := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task descendants", nil)
				c.JSON(http.StatusInternalServerError, resp)
				return
			}

			// Convert to unified nodes with extended fields
			for _, task := range tasks {
				node := models.NewUnifiedTaskNodeFromTask(task, task.TaskLevel)
				response.Data = append(response.Data, node)
			}
		} else {
			// Get minimal descendants
			descendants, err := h.db.Tasks().GetDescendants(c.Request.Context(), rootTaskID, depth, limit)
			if err != nil {
				h.logger.Printf("Error getting descendants: %v", err)
				resp := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task descendants", nil)
				c.JSON(http.StatusInternalServerError, resp)
				return
			}

			// Convert to unified nodes with minimal fields
			for _, descendant := range descendants {
				node := models.NewUnifiedTaskNodeFromDescendant(descendant)
				response.Data = append(response.Data, node)
			}
		}

		// Set pagination info for non-paginated response
		response.PageInfo = &models.TaskHierarchyPage{
			HasMore:    false,
			NextCursor: nil,
		}
	}

	// Set metadata
	response.Meta.RequestedDepth = depth
	response.Meta.MaxDepthReached = true
	if usePagination {
		response.Meta.Truncated = false
	} else {
		response.Meta.Truncated = len(response.Data) >= limit
	}
	response.Meta.TotalReturned = len(response.Data)
	response.Meta.HiddenNodesTruncated = false

	c.JSON(http.StatusOK, models.NewSuccessResponse(response, "Task descendants retrieved successfully"))
}

// GetTaskTree 获取任务树结构
func (h *TaskHierarchyHandler) GetTaskTree(c *gin.Context) {

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get task tree from database
	taskTree, err := h.db.Tasks().GetTaskTree(c.Request.Context(), projectID)
	if err != nil {
		h.logger.Printf("Error getting task tree: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task tree", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(taskTree, "Task tree retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetRootTasks 获取根任务列表（没有父任务的任务）
func (h *TaskHierarchyHandler) GetRootTasks(c *gin.Context) {

	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Get root tasks from database
	tasks, total, err := h.db.Tasks().GetRootTasks(c.Request.Context(), projectID, pagination.PageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting root tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve root tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       tasks,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Root tasks retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// SearchParentTasks 搜索可用作父任务的任务列表
func (h *TaskHierarchyHandler) SearchParentTasks(c *gin.Context) {
	query := c.Query("query")
	taskIDStr := c.Query("task_id")                  // 新增：支持任务ID精确搜索
	excludeTaskIDsStr := c.Query("exclude_task_ids") // 新增：支持批量排除任务

	// Get project ID from path parameter
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid project ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// 处理排除的任务ID列表
	var excludeTaskIDs []int

	// 从 exclude_task_ids 参数解析
	if excludeTaskIDsStr != "" {
		for _, idStr := range strings.Split(excludeTaskIDsStr, ",") {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				excludeTaskIDs = append(excludeTaskIDs, id)
			}
		}
	}

	// 保持对旧参数的兼容性
	currentTaskIDStr := c.Query("current_task_id")
	if currentTaskIDStr != "" {
		if ctid, err := strconv.Atoi(currentTaskIDStr); err == nil {
			// 避免重复添加
			found := false
			for _, id := range excludeTaskIDs {
				if id == ctid {
					found = true
					break
				}
			}
			if !found {
				excludeTaskIDs = append(excludeTaskIDs, ctid)
			}
		}
	}

	// 如果提供了 task_id 参数，优先进行精确搜索
	if taskIDStr != "" {
		if taskID, err := strconv.Atoi(taskIDStr); err == nil {
			// 获取指定的任务
			task, err := h.db.Tasks().GetByID(c.Request.Context(), taskID)
			if err == nil && task != nil && task.ProjectID == projectID {
				// 检查是否在排除列表中
				isExcluded := false
				for _, excludeID := range excludeTaskIDs {
					if task.ID == excludeID {
						isExcluded = true
						break
					}
				}

				// 检查层级限制 (默认最大层级为3)
				maxLevel := 3
				if maxLevelStr := c.Query("max_level"); maxLevelStr != "" {
					if ml, err := strconv.Atoi(maxLevelStr); err == nil {
						maxLevel = ml
					}
				}

				if !isExcluded && task.TaskLevel <= maxLevel {
					response := models.NewSuccessResponse([]*models.Task{task}, "Task found by ID")
					c.JSON(http.StatusOK, response)
					return
				}
			}
		}
	}

	// 解析分页参数
	page := 1
	pageSize := 50
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}
	offset := (page - 1) * pageSize

	// 解析最大层级参数
	maxLevel := 3
	if maxLevelStr := c.Query("max_level"); maxLevelStr != "" {
		if ml, err := strconv.Atoi(maxLevelStr); err == nil {
			maxLevel = ml
		}
	}

	// 使用标题搜索
	tasks, total, err := h.db.Tasks().SearchParentTasks(c.Request.Context(), projectID, query, excludeTaskIDs, maxLevel, pageSize, offset)
	if err != nil {
		h.logger.Printf("Error searching parent tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to search parent tasks", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// 构建分页响应
	result := map[string]interface{}{
		"data": tasks,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": (total + pageSize - 1) / pageSize,
		},
	}

	response := models.NewSuccessResponse(result, "Parent tasks search completed successfully")
	c.JSON(http.StatusOK, response)
}

// GetTaskChildren 获取任务的子任务列表
func (h *TaskHierarchyHandler) GetTaskChildren(c *gin.Context) {
	// Support both "id" (from /tasks/:id) and "taskId" (from /projects/:id/tasks/:taskId) parameter names
	taskIDStr := c.Param("taskId")
	if taskIDStr == "" {
		taskIDStr = c.Param("id")
	}
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid task ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page <= 0 {
		pagination.Page = 1
	}
	if pagination.PageSize <= 0 {
		pagination.PageSize = 20
	}

	offset := (pagination.Page - 1) * pagination.PageSize

	// Get child tasks from database
	children, err := h.db.Tasks().GetChildren(c.Request.Context(), taskID)
	if err != nil {
		h.logger.Printf("Error getting task children: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve task children", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Since GetChildren doesn't support pagination, we'll simulate it
	total := len(children)
	start := offset
	end := start + pagination.PageSize
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	paginatedChildren := children[start:end]

	// Create pagination metadata
	totalPages := int((int64(total) + int64(pagination.PageSize) - 1) / int64(pagination.PageSize))
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       paginatedChildren,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Task children retrieved successfully")
	c.JSON(http.StatusOK, response)
}
