package handlers

import (
	"ai-project-backend/interfaces"
	"ai-project-backend/services"
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// RouterDocumentHandler 基于DocumentRouter的文档处理器
type RouterDocumentHandler struct {
	router *services.DocumentRouter
}

// NewRouterDocumentHandler 创建新的路由文档处理器
func NewRouterDocumentHandler(router *services.DocumentRouter) *RouterDocumentHandler {
	return &RouterDocumentHandler{
		router: router,
	}
}

// CreateDocument 创建文档
func (h *RouterDocumentHandler) CreateDocument(c *gin.Context) {
	var req interfaces.CreateDocumentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 从JWT获取用户ID
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uint); ok {
			req.UserID = int(uid)
		}
	}

	// 验证必填字段
	if req.ProjectID <= 0 || req.TaskID <= 0 || req.UserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ProjectID, TaskID, and UserID are required and must be positive",
		})
		return
	}

	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Content cannot be empty",
		})
		return
	}

	// 设置默认格式
	if req.Format == "" {
		req.Format = "markdown"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 调用路由器创建文档
	if err := h.router.CreateDocument(ctx, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"message":    "Document created successfully",
		"project_id": req.ProjectID,
		"task_id":    req.TaskID,
	})
}

// GetDocument 获取文档
func (h *RouterDocumentHandler) GetDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	userID := 0
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(uint); ok {
			userID = int(u)
		}
	}

	req := &interfaces.ReadDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// 调用路由器读取文档
	response, err := h.router.ReadDocument(ctx, req)
	if err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Document not found",
				"exists":  false,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to read document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// UpdateDocument 更新文档
func (h *RouterDocumentHandler) UpdateDocument(c *gin.Context) {
	var req interfaces.UpdateDocumentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 从路径参数获取ID（如果有）
	if projectIDStr := c.Param("project_id"); projectIDStr != "" {
		if projectID, err := strconv.Atoi(projectIDStr); err == nil {
			req.ProjectID = projectID
		}
	}

	if taskIDStr := c.Param("task_id"); taskIDStr != "" {
		if taskID, err := strconv.Atoi(taskIDStr); err == nil {
			req.TaskID = taskID
		}
	}

	// 从JWT获取用户ID
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uint); ok {
			req.UserID = int(uid)
		}
	}

	// 验证必填字段
	if req.ProjectID <= 0 || req.TaskID <= 0 || req.UserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "ProjectID, TaskID, and UserID are required",
		})
		return
	}

	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Content cannot be empty",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 调用路由器更新文档
	if err := h.router.UpdateDocument(ctx, &req); err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Document not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Document updated successfully",
		"project_id": req.ProjectID,
		"task_id":    req.TaskID,
	})
}

// DeleteDocument 删除文档
func (h *RouterDocumentHandler) DeleteDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	userID := 0
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(uint); ok {
			userID = int(u)
		}
	}

	// 可选的删除原因
	var body struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&body)

	req := &interfaces.DeleteDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
		Reason:    body.Reason,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// 调用路由器删除文档
	if err := h.router.DeleteDocument(ctx, req); err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Document not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document deleted successfully",
	})
}

// CreateAndAttachDocument 创建并关联文档到任务（兼容现有API）
func (h *RouterDocumentHandler) CreateAndAttachDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("taskId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	var requestBody struct {
		Title   string `json:"title"`
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	userID := 0
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(uint); ok {
			userID = int(u)
		}
	}

	req := &interfaces.CreateDocumentRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		Content:   requestBody.Content,
		Format:    "markdown",
		UserID:    userID,
		Title:     requestBody.Title,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 调用路由器创建文档
	if err := h.router.CreateDocument(ctx, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create and attach document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":    true,
		"message":    "Document created and attached successfully",
		"project_id": projectID,
		"task_id":    taskID,
		"title":      requestBody.Title,
	})
}

// GetDocuments 获取多个文档（批量查询）
func (h *RouterDocumentHandler) GetDocuments(c *gin.Context) {
	// 由于当前接口设计为单文档操作，这里提供基本的分页响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Use project-specific document endpoints",
		"data":    []interface{}{},
		"total":   0,
	})
}

// GetDocumentHistory 获取文档历史
func (h *RouterDocumentHandler) GetDocumentHistory(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	userID := 0
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(uint); ok {
			userID = int(u)
		}
	}

	// 解析查询参数
	limit := 10
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	req := &interfaces.HistoryRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
		Limit:     limit,
		Offset:    offset,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	history, err := h.router.GetDocumentHistory(ctx, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get document history",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    history,
		"total":   len(history),
	})
}

// SearchDocuments 搜索文档
func (h *RouterDocumentHandler) SearchDocuments(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Search query is required",
		})
		return
	}

	userID := 0
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(uint); ok {
			userID = int(u)
		}
	}

	// 解析项目ID列表
	var projectIDs []int
	if p := c.Query("projects"); p != "" {
		for _, idStr := range c.QueryArray("projects") {
			if id, err := strconv.Atoi(idStr); err == nil {
				projectIDs = append(projectIDs, id)
			}
		}
	}

	// 解析任务ID列表
	var taskIDs []int
	if t := c.Query("tasks"); t != "" {
		for _, idStr := range c.QueryArray("tasks") {
			if id, err := strconv.Atoi(idStr); err == nil {
				taskIDs = append(taskIDs, id)
			}
		}
	}

	// 分页参数
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	// 排序参数
	sortBy := c.DefaultQuery("sort_by", "score")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	req := &interfaces.SearchRequest{
		UserID:     userID,
		Query:      query,
		ProjectIDs: projectIDs,
		TaskIDs:    taskIDs,
		SortBy:     sortBy,
		SortOrder:  sortOrder,
		Limit:      limit,
		Offset:     offset,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	response, err := h.router.SearchDocuments(ctx, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Search failed",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// ArchiveDocument 归档文档
func (h *RouterDocumentHandler) ArchiveDocument(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("project_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid project ID",
		})
		return
	}

	taskID, err := strconv.Atoi(c.Param("task_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid task ID",
		})
		return
	}

	userID := 0
	if uid, exists := c.Get("user_id"); exists {
		if u, ok := uid.(uint); ok {
			userID = int(u)
		}
	}

	// 可选的归档原因
	var body struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&body)

	req := &interfaces.ArchiveRequest{
		ProjectID: projectID,
		TaskID:    taskID,
		UserID:    userID,
		Reason:    body.Reason,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := h.router.ArchiveDocument(ctx, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to archive document",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Document archived successfully",
	})
}

// BatchCreateDocuments 批量创建文档
func (h *RouterDocumentHandler) BatchCreateDocuments(c *gin.Context) {
	var req interfaces.BatchCreateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 从JWT获取用户ID
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uint); ok {
			req.UserID = int(uid)
		}
	}

	if req.UserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID is required",
		})
		return
	}

	if len(req.Documents) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "At least one document is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	response, err := h.router.BatchCreateDocuments(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Batch create failed",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Batch create completed",
		"data":    response,
	})
}

// BatchUpdateDocuments 批量更新文档
func (h *RouterDocumentHandler) BatchUpdateDocuments(c *gin.Context) {
	var req interfaces.BatchUpdateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 从JWT获取用户ID
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uint); ok {
			req.UserID = int(uid)
		}
	}

	if req.UserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID is required",
		})
		return
	}

	if len(req.Documents) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "At least one document is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	response, err := h.router.BatchUpdateDocuments(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Batch update failed",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Batch update completed",
		"data":    response,
	})
}

// ExportDocuments 导出文档
func (h *RouterDocumentHandler) ExportDocuments(c *gin.Context) {
	var req interfaces.ExportRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 从JWT获取用户ID
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(uint); ok {
			req.UserID = int(uid)
		}
	}

	if req.UserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "User ID is required",
		})
		return
	}

	// 设置默认格式
	if req.Format == "" {
		req.Format = "zip"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	response, err := h.router.ExportDocuments(ctx, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Export failed",
			"error":   err.Error(),
		})
		return
	}

	// 设置下载响应头
	c.Header("Content-Disposition", "attachment; filename="+response.FileName)
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Length", strconv.FormatInt(response.Size, 10))

	c.Data(http.StatusOK, "application/octet-stream", response.Data)
}

// GetRouterStatus 获取路由器状态（管理接口）
func (h *RouterDocumentHandler) GetRouterStatus(c *gin.Context) {
	info := h.router.GetRouterInfo()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    info,
	})
}

// SetRoutingStrategy 设置路由策略（管理接口）
func (h *RouterDocumentHandler) SetRoutingStrategy(c *gin.Context) {
	var req struct {
		Strategy string `json:"strategy" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	strategy := services.RoutingStrategy(req.Strategy)

	// 验证策略是否有效
	validStrategies := []services.RoutingStrategy{
		services.StrategyDefault,
		services.StrategyV1Only,
		services.StrategyV2Only,
		services.StrategyDBOnly,
		services.StrategyLoadBalanced,
		services.StrategyMigration,
	}

	valid := false
	for _, validStrategy := range validStrategies {
		if strategy == validStrategy {
			valid = true
			break
		}
	}

	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid routing strategy",
			"valid_strategies": []string{
				string(services.StrategyDefault),
				string(services.StrategyV1Only),
				string(services.StrategyV2Only),
				string(services.StrategyDBOnly),
				string(services.StrategyLoadBalanced),
				string(services.StrategyMigration),
			},
		})
		return
	}

	h.router.SetRoutingStrategy(strategy)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Routing strategy updated successfully",
		"strategy": string(strategy),
	})
}

// EnableService 启用服务（管理接口）
func (h *RouterDocumentHandler) EnableService(c *gin.Context) {
	version := services.ServiceVersion(c.Param("version"))

	if err := h.router.EnableService(version); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Service not found",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Service enabled successfully",
		"version": string(version),
	})
}

// DisableService 禁用服务（管理接口）
func (h *RouterDocumentHandler) DisableService(c *gin.Context) {
	version := services.ServiceVersion(c.Param("version"))

	h.router.DisableService(version)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Service disabled successfully",
		"version": string(version),
	})
}

// ResetStats 重置统计信息（管理接口）
func (h *RouterDocumentHandler) ResetStats(c *gin.Context) {
	h.router.ResetStats()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Statistics reset successfully",
	})
}
