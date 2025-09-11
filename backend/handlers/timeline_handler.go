package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// TimelineHandler 时间线API处理器
type TimelineHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewTimelineHandler 创建新的时间线处理器
func NewTimelineHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *TimelineHandler {
	return &TimelineHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetTaskTimeline 获取任务详细时间线
// GET /api/v1/tasks/:id/timeline
func (h *TimelineHandler) GetTaskTimeline(c *gin.Context) {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid task ID",
		})
		return
	}

	// 解析查询参数
	filter, err := h.parseTimelineFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid filter parameters: %v", err),
		})
		return
	}

	// 获取时间线事件
	timelineRepo := h.db.TimelineEvents()
	if timelineRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Timeline service not available",
		})
		return
	}

	events, total, err := timelineRepo.GetTaskTimeline(c.Request.Context(), taskID, filter)
	if err != nil {
		h.logger.Printf("Error getting task timeline: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve timeline events",
		})
		return
	}

	// 计算分页信息
	pagination := h.calculatePagination(filter, total)

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       events,
		"pagination": pagination,
		"total":      total,
		"message":    fmt.Sprintf("Successfully retrieved %d timeline events", len(events)),
	})
}

// GetTasksTimeline 获取批量任务时间线
// GET /api/v1/tasks/timeline/batch
func (h *TimelineHandler) GetTasksTimeline(c *gin.Context) {
	// 解析任务IDs
	taskIDsStr := c.Query("task_ids")
	if taskIDsStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "task_ids parameter is required",
		})
		return
	}

	taskIDs, err := h.parseTaskIDs(taskIDsStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid task_ids: %v", err),
		})
		return
	}

	if len(taskIDs) > 50 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Maximum 50 tasks allowed per request",
		})
		return
	}

	// 解析查询参数
	filter, err := h.parseTimelineFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid filter parameters: %v", err),
		})
		return
	}

	// 获取时间线事件
	timelineRepo := h.db.TimelineEvents()
	if timelineRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Timeline service not available",
		})
		return
	}

	events, total, err := timelineRepo.GetTasksTimeline(c.Request.Context(), taskIDs, filter)
	if err != nil {
		h.logger.Printf("Error getting tasks timeline: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve timeline events",
		})
		return
	}

	// 计算分页信息
	pagination := h.calculatePagination(filter, total)

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       events,
		"pagination": pagination,
		"total":      total,
		"message":    fmt.Sprintf("Successfully retrieved timeline for %d tasks", len(taskIDs)),
	})
}

// GetProjectTimeline 获取项目时间线
// GET /api/v1/projects/:id/tasks/timeline
func (h *TimelineHandler) GetProjectTimeline(c *gin.Context) {
	// 解析项目ID
	projectIDStr := c.Param("id")
	projectID, err := strconv.ParseInt(projectIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid project ID",
		})
		return
	}

	// 解析查询参数
	filter, err := h.parseTimelineFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid filter parameters: %v", err),
		})
		return
	}

	// 获取时间线事件
	timelineRepo := h.db.TimelineEvents()
	if timelineRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Timeline service not available",
		})
		return
	}

	events, total, err := timelineRepo.GetProjectTimeline(c.Request.Context(), projectID, filter)
	if err != nil {
		h.logger.Printf("Error getting project timeline: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve timeline events",
		})
		return
	}

	// 计算分页信息
	pagination := h.calculatePagination(filter, total)

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       events,
		"pagination": pagination,
		"total":      total,
		"message":    fmt.Sprintf("Successfully retrieved project timeline with %d events", len(events)),
	})
}

// GetUserActivity 获取用户活动时间线
// GET /api/v1/users/:id/activity
func (h *TimelineHandler) GetUserActivity(c *gin.Context) {
	// 解析用户ID
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid user ID",
		})
		return
	}

	// 解析查询参数
	filter, err := h.parseTimelineFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid filter parameters: %v", err),
		})
		return
	}

	// 获取时间线事件
	timelineRepo := h.db.TimelineEvents()
	if timelineRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Timeline service not available",
		})
		return
	}

	events, total, err := timelineRepo.GetUserActivity(c.Request.Context(), userID, filter)
	if err != nil {
		h.logger.Printf("Error getting user activity: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve user activity",
		})
		return
	}

	// 计算分页信息
	pagination := h.calculatePagination(filter, total)

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       events,
		"pagination": pagination,
		"total":      total,
		"message":    fmt.Sprintf("Successfully retrieved user activity with %d events", len(events)),
	})
}

// GetTimelineStatistics 获取时间线统计信息
// GET /api/v1/tasks/:id/timeline/stats
func (h *TimelineHandler) GetTimelineStatistics(c *gin.Context) {
	// 解析任务ID（可选）
	taskIDStr := c.Param("id")
	var taskID *int64
	if taskIDStr != "" && taskIDStr != "all" {
		id, err := strconv.ParseInt(taskIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Invalid task ID",
			})
			return
		}
		taskID = &id
	}

	// 解析查询参数
	filter, err := h.parseTimelineFilter(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid filter parameters: %v", err),
		})
		return
	}

	// 如果指定了任务ID，设置到过滤器中
	if taskID != nil {
		filter.TaskID = taskID
	}

	// 获取统计信息
	timelineRepo := h.db.TimelineEvents()
	if timelineRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Timeline service not available",
		})
		return
	}

	stats, err := timelineRepo.GetTimelineStatistics(c.Request.Context(), filter)
	if err != nil {
		h.logger.Printf("Error getting timeline statistics: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve timeline statistics",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
		"message": "Successfully retrieved timeline statistics",
	})
}

// CreateTimelineEvent 创建时间线事件
// POST /api/v1/tasks/:id/timeline
func (h *TimelineHandler) CreateTimelineEvent(c *gin.Context) {
	// 解析任务ID
	taskIDStr := c.Param("id")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid task ID",
		})
		return
	}

	// 解析请求体
	var req struct {
		EventType   string                                 `json:"event_type" validate:"required"`
		Description string                                 `json:"description" validate:"required"`
		Metadata    *models.TaskTimelineEventMetadata     `json:"metadata"`
		Severity    string                                 `json:"severity"`
		Category    string                                 `json:"category"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}

	// 验证请求
	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Validation failed: %v", err),
		})
		return
	}

	// 验证事件类型
	if !models.IsValidEventType(req.EventType) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid event type",
		})
		return
	}

	// 获取用户信息
	userID, _ := c.Get("user_id")
	username, _ := c.Get("username")

	// 创建时间线事件
	event := &models.TaskTimelineEvent{
		TaskID:      taskID,
		EventType:   models.TaskTimelineEventType(req.EventType),
		EventDate:   time.Now(),
		Description: req.Description,
		Metadata:    req.Metadata,
		Severity:    models.EventSeverity(req.Severity),
		Category:    models.EventCategory(req.Category),
	}

	if userID != nil {
		if uid, ok := userID.(int64); ok {
			event.UserID = &uid
		}
	}
	if username != nil {
		if uname, ok := username.(string); ok {
			event.Username = uname
		}
	}

	// 设置默认值
	if event.Severity == "" {
		event.Severity = models.SeverityInfo
	}
	if event.Category == "" {
		event.Category = models.CategoryUser
	}

	// 保存事件
	timelineRepo := h.db.TimelineEvents()
	if timelineRepo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Timeline service not available",
		})
		return
	}

	if err := timelineRepo.CreateEvent(c.Request.Context(), event); err != nil {
		h.logger.Printf("Error creating timeline event: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create timeline event",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    event,
		"message": "Timeline event created successfully",
	})
}

// Helper functions

// parseTimelineFilter 解析时间线过滤器
func (h *TimelineHandler) parseTimelineFilter(c *gin.Context) (*models.TimelineEventFilter, error) {
	filter := &models.TimelineEventFilter{}

	// 解析事件类型
	if eventTypesStr := c.Query("event_types"); eventTypesStr != "" {
		eventTypes := strings.Split(eventTypesStr, ",")
		filter.EventTypes = make([]models.TaskTimelineEventType, 0, len(eventTypes))
		for _, et := range eventTypes {
			et = strings.TrimSpace(et)
			if models.IsValidEventType(et) {
				filter.EventTypes = append(filter.EventTypes, models.TaskTimelineEventType(et))
			}
		}
	}

	// 解析用户IDs
	if userIDsStr := c.Query("user_ids"); userIDsStr != "" {
		userIDStrs := strings.Split(userIDsStr, ",")
		filter.UserIDs = make([]int64, 0, len(userIDStrs))
		for _, uidStr := range userIDStrs {
			uidStr = strings.TrimSpace(uidStr)
			if uid, err := strconv.ParseInt(uidStr, 10, 64); err == nil {
				filter.UserIDs = append(filter.UserIDs, uid)
			}
		}
	}

	// 解析类别
	if categoriesStr := c.Query("categories"); categoriesStr != "" {
		categories := strings.Split(categoriesStr, ",")
		filter.Categories = make([]models.EventCategory, 0, len(categories))
		for _, cat := range categories {
			cat = strings.TrimSpace(cat)
			filter.Categories = append(filter.Categories, models.EventCategory(cat))
		}
	}

	// 解析严重性
	if severitiesStr := c.Query("severities"); severitiesStr != "" {
		severities := strings.Split(severitiesStr, ",")
		filter.Severities = make([]models.EventSeverity, 0, len(severities))
		for _, sev := range severities {
			sev = strings.TrimSpace(sev)
			filter.Severities = append(filter.Severities, models.EventSeverity(sev))
		}
	}

	// 解析时间范围
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartDate = &startDate
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// 设置为当天结束时间
			endOfDay := endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filter.EndDate = &endOfDay
		}
	}

	// 解析批次ID
	if batchID := c.Query("batch_id"); batchID != "" {
		filter.BatchID = batchID
	}

	// 解析是否包含系统事件
	if includeSystemStr := c.Query("include_system"); includeSystemStr != "" {
		filter.IncludeSystem = includeSystemStr == "true"
	} else {
		filter.IncludeSystem = true // 默认包含系统事件
	}

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filter.Page = page
		}
	}
	if filter.Page == 0 {
		filter.Page = 1
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 {
			filter.PageSize = pageSize
		}
	}
	if filter.PageSize == 0 {
		filter.PageSize = 50
	}
	if filter.PageSize > 200 {
		filter.PageSize = 200
	}

	// 解析排序参数
	if sortBy := c.Query("sort_by"); sortBy != "" {
		filter.SortBy = sortBy
	}
	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		filter.SortOrder = sortOrder
	}

	return filter, nil
}

// parseTaskIDs 解析任务ID列表
func (h *TimelineHandler) parseTaskIDs(taskIDsStr string) ([]int64, error) {
	taskIDStrs := strings.Split(taskIDsStr, ",")
	taskIDs := make([]int64, 0, len(taskIDStrs))

	for _, tidStr := range taskIDStrs {
		tidStr = strings.TrimSpace(tidStr)
		if tid, err := strconv.ParseInt(tidStr, 10, 64); err == nil {
			taskIDs = append(taskIDs, tid)
		} else {
			return nil, fmt.Errorf("invalid task ID: %s", tidStr)
		}
	}

	return taskIDs, nil
}

// calculatePagination 计算分页信息
func (h *TimelineHandler) calculatePagination(filter *models.TimelineEventFilter, total int64) map[string]interface{} {
	totalPages := int((total + int64(filter.PageSize) - 1) / int64(filter.PageSize))
	hasNext := filter.Page < totalPages
	hasPrev := filter.Page > 1

	return map[string]interface{}{
		"page":        filter.Page,
		"page_size":   filter.PageSize,
		"total":       total,
		"total_pages": totalPages,
		"has_next":    hasNext,
		"has_prev":    hasPrev,
	}
}