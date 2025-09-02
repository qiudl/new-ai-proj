package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/services"
	"github.com/gin-gonic/gin"
)

// EnhancedSearchHandler handles advanced search operations
type EnhancedSearchHandler struct {
	searchService *services.EnhancedSearchService
}

// NewEnhancedSearchHandler creates a new enhanced search handler
func NewEnhancedSearchHandler(searchService *services.EnhancedSearchService) *EnhancedSearchHandler {
	return &EnhancedSearchHandler{
		searchService: searchService,
	}
}

// Search godoc
// @Summary Enhanced search across all content types
// @Description Perform advanced full-text search across documents, tasks, projects, and users
// @Tags Search
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Param type query string false "Content type filter (document, task, project, user)"
// @Param categories query array false "Category filters"
// @Param tags query array false "Tag filters"
// @Param date_from query string false "Start date filter (RFC3339 format)"
// @Param date_to query string false "End date filter (RFC3339 format)"
// @Param created_by query array false "Creator user ID filters"
// @Param assigned_to query array false "Assignee user ID filters"
// @Param project_ids query array false "Project ID filters"
// @Param status query array false "Status filters"
// @Param priority query array false "Priority filters"
// @Param file_types query array false "File type filters"
// @Param size_min query integer false "Minimum file size in bytes"
// @Param size_max query integer false "Maximum file size in bytes"
// @Param include_content query boolean false "Include content in results"
// @Param sort_by query string false "Sort field (relevance, date, size, title)"
// @Param sort_order query string false "Sort order (asc, desc)"
// @Param page query integer false "Page number (default: 1)"
// @Param limit query integer false "Results per page (default: 20)"
// @Success 200 {object} services.SearchResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search [get]
func (h *EnhancedSearchHandler) Search(c *gin.Context) {
	// Parse query parameters
	filter := &services.SearchFilter{
		Query:          c.Query("q"),
		Type:           c.Query("type"),
		Categories:     c.QueryArray("categories"),
		Tags:           c.QueryArray("tags"),
		Status:         c.QueryArray("status"),
		Priority:       c.QueryArray("priority"),
		FileTypes:      c.QueryArray("file_types"),
		IncludeContent: c.Query("include_content") == "true",
		SortBy:         c.DefaultQuery("sort_by", "relevance"),
		SortOrder:      c.DefaultQuery("sort_order", "desc"),
	}

	// Parse page and limit
	if page, err := strconv.Atoi(c.DefaultQuery("page", "1")); err == nil {
		filter.Page = page
	} else {
		filter.Page = 1
	}

	if limit, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil {
		filter.Limit = limit
	} else {
		filter.Limit = 20
	}

	// Parse date filters
	if dateFromStr := c.Query("date_from"); dateFromStr != "" {
		if dateFrom, err := time.Parse(time.RFC3339, dateFromStr); err == nil {
			filter.DateFrom = &dateFrom
		}
	}

	if dateToStr := c.Query("date_to"); dateToStr != "" {
		if dateTo, err := time.Parse(time.RFC3339, dateToStr); err == nil {
			filter.DateTo = &dateTo
		}
	}

	// Parse integer array filters
	if createdByStrs := c.QueryArray("created_by"); len(createdByStrs) > 0 {
		for _, idStr := range createdByStrs {
			if id, err := strconv.Atoi(idStr); err == nil {
				filter.CreatedBy = append(filter.CreatedBy, id)
			}
		}
	}

	if assignedToStrs := c.QueryArray("assigned_to"); len(assignedToStrs) > 0 {
		for _, idStr := range assignedToStrs {
			if id, err := strconv.Atoi(idStr); err == nil {
				filter.AssignedTo = append(filter.AssignedTo, id)
			}
		}
	}

	if projectIDStrs := c.QueryArray("project_ids"); len(projectIDStrs) > 0 {
		for _, idStr := range projectIDStrs {
			if id, err := strconv.Atoi(idStr); err == nil {
				filter.ProjectIDs = append(filter.ProjectIDs, id)
			}
		}
	}

	// Parse size filters
	if sizeMinStr := c.Query("size_min"); sizeMinStr != "" {
		if sizeMin, err := strconv.ParseInt(sizeMinStr, 10, 64); err == nil {
			filter.SizeMin = &sizeMin
		}
	}

	if sizeMaxStr := c.Query("size_max"); sizeMaxStr != "" {
		if sizeMax, err := strconv.ParseInt(sizeMaxStr, 10, 64); err == nil {
			filter.SizeMax = &sizeMax
		}
	}

	// Validate required parameters
	if filter.Query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "搜索查询不能为空",
		})
		return
	}

	// Perform search
	results, err := h.searchService.Search(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "搜索失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "搜索成功",
		"data":    results,
	})
}

// SearchByPrefix godoc
// @Summary Search by name or path prefix
// @Description Search content by name or path prefix matching
// @Tags Search
// @Accept json
// @Produce json
// @Param prefix query string true "Name or path prefix to search"
// @Param type query string false "Content type filter (document, task, project, user)"
// @Param include_path query boolean false "Include path-based search (default: true)"
// @Param include_name query boolean false "Include name-based search (default: true)"
// @Param limit query integer false "Maximum results (default: 20, max: 100)"
// @Param sort_by query string false "Sort field (name, path, date, relevance)"
// @Param sort_order query string false "Sort order (asc, desc, default: asc)"
// @Success 200 {object} services.PrefixSearchResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/prefix [get]
func (h *EnhancedSearchHandler) SearchByPrefix(c *gin.Context) {
	prefix := c.Query("prefix")
	if prefix == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "前缀搜索参数不能为空",
		})
		return
	}

	// Parse query parameters
	filter := &services.PrefixSearchFilter{
		Prefix:      prefix,
		Type:        c.Query("type"),
		IncludePath: c.Query("include_path") != "false", // default true
		IncludeName: c.Query("include_name") != "false", // default true
		SortBy:      c.DefaultQuery("sort_by", "name"),
		SortOrder:   c.DefaultQuery("sort_order", "asc"),
	}

	// Parse limit
	if limit, err := strconv.Atoi(c.DefaultQuery("limit", "20")); err == nil {
		if limit > 100 {
			limit = 100 // Cap at 100
		}
		filter.Limit = limit
	} else {
		filter.Limit = 20
	}

	// Perform prefix search
	results, err := h.searchService.SearchByPrefix(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "前缀搜索失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "前缀搜索成功",
		"data":    results,
	})
}

// AutoComplete godoc
// @Summary Get search suggestions
// @Description Get autocomplete suggestions for search queries
// @Tags Search
// @Accept json
// @Produce json
// @Param q query string true "Partial search query"
// @Param type query string false "Content type filter"
// @Param limit query integer false "Maximum suggestions (default: 10)"
// @Success 200 {object} []string
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/autocomplete [get]
func (h *EnhancedSearchHandler) AutoComplete(c *gin.Context) {
	query := c.Query("q")
	contentType := c.Query("type")
	limit := 10

	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "查询参数不能为空",
		})
		return
	}

	// Generate suggestions based on query and type
	suggestions := h.generateAutocompleteSuggestions(query, contentType, limit)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取建议成功",
		"data":    suggestions,
	})
}

// SearchStats godoc
// @Summary Get search statistics
// @Description Get search usage statistics and popular queries
// @Tags Search
// @Accept json
// @Produce json
// @Param period query string false "Time period (day, week, month, year)"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/stats [get]
func (h *EnhancedSearchHandler) SearchStats(c *gin.Context) {
	period := c.DefaultQuery("period", "week")

	// Generate mock statistics for now
	// In production, this would query actual search logs
	stats := map[string]interface{}{
		"total_searches": 1250,
		"unique_queries": 890,
		"avg_results":    12.5,
		"most_searched":  []string{"项目文档", "任务管理", "用户指南", "API文档", "会议记录"},
		"search_types": map[string]int{
			"document": 850,
			"task":     300,
			"project":  75,
			"user":     25,
		},
		"period": period,
		"date_range": map[string]string{
			"from": time.Now().AddDate(0, 0, -7).Format("2006-01-02"),
			"to":   time.Now().Format("2006-01-02"),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取搜索统计成功",
		"data":    stats,
	})
}

// SavedSearches godoc
// @Summary Get user's saved searches
// @Description Retrieve saved search queries for the current user
// @Tags Search
// @Accept json
// @Produce json
// @Success 200 {object} []map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/saved [get]
func (h *EnhancedSearchHandler) GetSavedSearches(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	// Mock saved searches for now
	// In production, this would query the database
	savedSearches := []map[string]interface{}{
		{
			"id":         1,
			"name":       "最新项目文档",
			"query":      "项目 type:document",
			"filters":    map[string]interface{}{"type": "document", "status": []string{"published"}},
			"created_at": time.Now().AddDate(0, 0, -5).Format(time.RFC3339),
		},
		{
			"id":         2,
			"name":       "我的待办任务",
			"query":      "assigned_to:me status:todo",
			"filters":    map[string]interface{}{"type": "task", "assigned_to": []int{userID.(int)}},
			"created_at": time.Now().AddDate(0, 0, -10).Format(time.RFC3339),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取保存的搜索成功",
		"data":    savedSearches,
	})
}

// SaveSearch godoc
// @Summary Save a search query
// @Description Save a search query for future use
// @Tags Search
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Save search request"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/saved [post]
func (h *EnhancedSearchHandler) SaveSearch(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	var request struct {
		Name    string                 `json:"name" binding:"required"`
		Query   string                 `json:"query" binding:"required"`
		Filters map[string]interface{} `json:"filters"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// Mock save operation
	// In production, this would save to database
	savedSearch := map[string]interface{}{
		"id":         3,
		"name":       request.Name,
		"query":      request.Query,
		"filters":    request.Filters,
		"user_id":    userID,
		"created_at": time.Now().Format(time.RFC3339),
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "搜索保存成功",
		"data":    savedSearch,
	})
}

// DeleteSavedSearch godoc
// @Summary Delete a saved search
// @Description Delete a saved search query
// @Tags Search
// @Accept json
// @Produce json
// @Param id path int true "Saved search ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/saved/{id} [delete]
func (h *EnhancedSearchHandler) DeleteSavedSearch(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的搜索ID",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	// Mock delete operation
	// In production, this would delete from database with ownership check
	_ = userID
	_ = id

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "保存的搜索删除成功",
		"data": gin.H{
			"deleted_id": id,
			"timestamp":  time.Now(),
		},
	})
}

// GetIndexStatus godoc
// @Summary Get search index status
// @Description Get the status of the search index
// @Tags Search
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/index/status [get]
func (h *EnhancedSearchHandler) GetIndexStatus(c *gin.Context) {
	// Mock index status for now
	status := map[string]interface{}{
		"total_documents":   25000,
		"indexed_documents": 24850,
		"pending_documents": 150,
		"last_index_time":   time.Now().Add(-time.Hour * 2).Format(time.RFC3339),
		"index_health":      "green",
		"index_size":        "2.5GB",
		"avg_query_time":    "45ms",
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取索引状态成功",
		"data":    status,
	})
}

// RebuildIndex godoc
// @Summary Rebuild search index
// @Description Rebuild the search index
// @Tags Search
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/index/rebuild [post]
func (h *EnhancedSearchHandler) RebuildIndex(c *gin.Context) {
	// Mock rebuild operation
	job := map[string]interface{}{
		"job_id":             fmt.Sprintf("rebuild_%d", time.Now().Unix()),
		"status":             "started",
		"message":            "索引重建已开始",
		"started_at":         time.Now().Format(time.RFC3339),
		"estimated_duration": "30-45分钟",
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "索引重建已启动",
		"data":    job,
	})
}

// ExportResults godoc
// @Summary Export search results
// @Description Export search results in various formats
// @Tags Search
// @Accept json
// @Produce application/octet-stream
// @Param q query string true "Search query"
// @Param format query string false "Export format (csv, json, xlsx)"
// @Success 200 {file} binary
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/export [get]
func (h *EnhancedSearchHandler) ExportResults(c *gin.Context) {
	query := c.Query("q")
	format := c.DefaultQuery("format", "csv")

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "搜索查询不能为空",
		})
		return
	}

	// Mock export data
	var content string
	var contentType string
	var filename string

	switch format {
	case "csv":
		contentType = "text/csv"
		filename = fmt.Sprintf("search_results_%s.csv", time.Now().Format("20060102"))
		content = "ID,Type,Title,Description,URL,Created At\n"
		content += "1,document,Test Document,Test Description,/documents/1,2025-01-15\n"
		content += "2,task,Test Task,Test Task Description,/tasks/2,2025-01-14\n"
	case "json":
		contentType = "application/json"
		filename = fmt.Sprintf("search_results_%s.json", time.Now().Format("20060102"))
		content = `[{"id":1,"type":"document","title":"Test Document","description":"Test Description","url":"/documents/1","created_at":"2025-01-15"}]`
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "不支持的导出格式",
		})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Data(http.StatusOK, contentType, []byte(content))
}

// BatchOperation godoc
// @Summary Batch operation on search results
// @Description Perform batch operations on search results
// @Tags Search
// @Accept json
// @Produce json
// @Param body body map[string]interface{} true "Batch operation request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/batch [post]
func (h *EnhancedSearchHandler) BatchOperation(c *gin.Context) {
	var request struct {
		ResultIDs []int                  `json:"result_ids" binding:"required"`
		Operation string                 `json:"operation" binding:"required"`
		Params    map[string]interface{} `json:"params"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误",
			"error":   err.Error(),
		})
		return
	}

	// Mock batch operation
	result := map[string]interface{}{
		"success_count": len(request.ResultIDs) - 1,
		"failed_count":  1,
		"errors":        []string{"无法删除受保护的文档ID:123"},
		"processed_ids": request.ResultIDs,
		"operation":     request.Operation,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "批量操作完成",
		"data":    result,
	})
}

// GetSearchHistory godoc
// @Summary Get search history
// @Description Get user's search history
// @Tags Search
// @Accept json
// @Produce json
// @Param limit query int false "Number of history entries"
// @Success 200 {object} []map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/history [get]
func (h *EnhancedSearchHandler) GetSearchHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Mock search history
	history := []map[string]interface{}{
		{
			"query":        "项目文档",
			"timestamp":    time.Now().Add(-time.Hour * 1).Format(time.RFC3339),
			"result_count": 15,
			"type":         "document",
		},
		{
			"query":        "任务管理",
			"timestamp":    time.Now().Add(-time.Hour * 3).Format(time.RFC3339),
			"result_count": 8,
			"type":         "task",
		},
		{
			"query":        "用户指南",
			"timestamp":    time.Now().Add(-time.Hour * 24).Format(time.RFC3339),
			"result_count": 3,
			"type":         "document",
		},
	}

	// Limit results
	if len(history) > limit {
		history = history[:limit]
	}

	// Add user ID for context
	_ = userID

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取搜索历史成功",
		"data":    history,
	})
}

// ClearSearchHistory godoc
// @Summary Clear search history
// @Description Clear user's search history
// @Tags Search
// @Accept json
// @Produce json
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/history [delete]
func (h *EnhancedSearchHandler) ClearSearchHistory(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未授权",
		})
		return
	}

	// Mock clear operation
	_ = userID

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "搜索历史已清空",
		"data": gin.H{
			"cleared_at": time.Now(),
		},
	})
}

// GetTrendingSearches godoc
// @Summary Get trending searches
// @Description Get trending search queries
// @Tags Search
// @Accept json
// @Produce json
// @Param limit query int false "Number of trending searches"
// @Success 200 {object} []map[string]interface{}
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/trends [get]
func (h *EnhancedSearchHandler) GetTrendingSearches(c *gin.Context) {
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	// Mock trending searches
	trending := []map[string]interface{}{
		{
			"query":          "项目文档",
			"count":          156,
			"trend":          "up",
			"change_percent": 23.5,
		},
		{
			"query":          "API文档",
			"count":          134,
			"trend":          "up",
			"change_percent": 18.2,
		},
		{
			"query":          "任务管理",
			"count":          98,
			"trend":          "stable",
			"change_percent": 2.1,
		},
		{
			"query":          "用户指南",
			"count":          87,
			"trend":          "down",
			"change_percent": -5.3,
		},
		{
			"query":          "会议记录",
			"count":          76,
			"trend":          "up",
			"change_percent": 12.8,
		},
	}

	// Limit results
	if len(trending) > limit {
		trending = trending[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取热门搜索成功",
		"data":    trending,
	})
}

// FindSimilarContent godoc
// @Summary Find similar content
// @Description Find content similar to the specified item
// @Tags Search
// @Accept json
// @Produce json
// @Param type path string true "Content type (document, task, project, user)"
// @Param id path int true "Content ID"
// @Param limit query int false "Number of similar items"
// @Success 200 {object} []SearchResult
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /api/v1/search/trends/similar/{type}/{id} [get]
func (h *EnhancedSearchHandler) FindSimilarContent(c *gin.Context) {
	contentType := c.Param("type")
	idStr := c.Param("id")

	contentID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的内容ID",
		})
		return
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	// Validate content type
	validTypes := []string{"document", "task", "project", "user"}
	valid := false
	for _, t := range validTypes {
		if contentType == t {
			valid = true
			break
		}
	}
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的内容类型",
		})
		return
	}

	// Mock similar content based on type and ID
	similar := []map[string]interface{}{
		{
			"id":          contentID + 1,
			"type":        contentType,
			"title":       fmt.Sprintf("相似%s %d", contentType, contentID+1),
			"description": "这是一个相似的内容项",
			"score":       0.85,
			"url":         fmt.Sprintf("/%ss/%d", contentType, contentID+1),
		},
		{
			"id":          contentID + 2,
			"type":        contentType,
			"title":       fmt.Sprintf("相关%s %d", contentType, contentID+2),
			"description": "这是另一个相关的内容项",
			"score":       0.72,
			"url":         fmt.Sprintf("/%ss/%d", contentType, contentID+2),
		},
	}

	// Limit results
	if len(similar) > limit {
		similar = similar[:limit]
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取相似内容成功",
		"data":    similar,
	})
}

// Helper methods

func (h *EnhancedSearchHandler) generateAutocompleteSuggestions(query, contentType string, limit int) []string {
	suggestions := []string{}

	// Basic suggestions based on query
	if query != "" {
		baseSuggestions := []string{
			query + " 文档",
			query + " 任务",
			query + " 项目",
			query + " 用户",
			query + " 最新",
			query + " 已完成",
			query + " 进行中",
			query + " 重要",
		}

		// Filter by content type if specified
		if contentType != "" {
			switch contentType {
			case "document":
				baseSuggestions = []string{
					query + " 文档",
					query + " markdown",
					query + " pdf",
					query + " 模板",
				}
			case "task":
				baseSuggestions = []string{
					query + " 任务",
					query + " 待办",
					query + " 已完成",
					query + " 进行中",
				}
			case "project":
				baseSuggestions = []string{
					query + " 项目",
					query + " 计划",
					query + " 里程碑",
				}
			case "user":
				baseSuggestions = []string{
					query + " 用户",
					query + " 成员",
					query + " 团队",
				}
			}
		}

		// Add common search modifiers
		modifiers := []string{
			query + " status:published",
			query + " type:" + contentType,
			query + " created:today",
			query + " updated:week",
		}

		suggestions = append(suggestions, baseSuggestions...)
		suggestions = append(suggestions, modifiers...)
	}

	// Limit results
	if len(suggestions) > limit {
		suggestions = suggestions[:limit]
	}

	return suggestions
}
