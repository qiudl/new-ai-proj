package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// AuditHandler handles audit log related operations
type AuditHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *AuditHandler {
	return &AuditHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetAuditLogs handles GET /system/audit/logs
func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	// Parse pagination parameters
	var pagination models.PaginationParams
	if err := c.ShouldBindQuery(&pagination); err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid pagination parameters", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Default pagination values
	if pagination.Page == 0 {
		pagination.Page = 1
	}
	if pagination.PageSize == 0 {
		pagination.PageSize = 20
	}

	// Parse filter parameters
	filter := &models.AuditLogFilter{
		Limit:  pagination.PageSize,
		Offset: (pagination.Page - 1) * pagination.PageSize,
	}

	// Parse query parameters for filtering
	if action := c.Query("action"); action != "" {
		filter.Action = action
	}

	if entityType := c.Query("entity_type"); entityType != "" {
		filter.ResourceType = entityType
	}

	if resourceType := c.Query("resource_type"); resourceType != "" {
		filter.ResourceType = resourceType
	}

	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startTime, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartTime = startTime
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endTime, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// Set to end of day
			filter.EndTime = endTime.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}

	if ipAddress := c.Query("ip_address"); ipAddress != "" {
		filter.IPAddress = ipAddress
	}

	if status := c.Query("status"); status != "" {
		filter.Status = status
	}

	if sessionID := c.Query("session_id"); sessionID != "" {
		filter.SessionID = sessionID
	}

	// Search parameter - can be used for full-text search
	if search := c.Query("search"); search != "" {
		// For now, we'll use it as a general search term
		// Implementation will depend on database capabilities
		filter.Description = search
	}

	// Get audit logs from database
	logs, total, err := h.db.System().GetAuditLogsWithFilter(c.Request.Context(), filter)
	if err != nil {
		h.logger.Printf("Error getting audit logs: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit logs", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Create pagination metadata
	totalPages := (total + pagination.PageSize - 1) / pagination.PageSize
	paginationMeta := models.Pagination{
		Page:       pagination.Page,
		PageSize:   pagination.PageSize,
		Total:      int64(total),
		TotalPages: totalPages,
		HasNext:    pagination.Page < totalPages,
		HasPrev:    pagination.Page > 1,
	}

	paginatedResponse := models.PaginatedResponse{
		Data:       logs,
		Pagination: paginationMeta,
	}

	response := models.NewSuccessResponse(paginatedResponse, "Audit logs retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetAuditLog handles GET /system/audit/logs/:id
func (h *AuditHandler) GetAuditLog(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid audit log ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Get specific audit log
	auditLog, err := h.db.System().GetAuditLogByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "audit log not found" {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Audit log not found", nil)
			c.JSON(http.StatusNotFound, response)
			return
		}
		h.logger.Printf("Error getting audit log: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve audit log", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	response := models.NewSuccessResponse(auditLog, "Audit log retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetAuditStats handles GET /system/audit/stats
func (h *AuditHandler) GetAuditStats(c *gin.Context) {
	// Parse request parameters
	req := &models.AuditStatsRequest{
		StartTime: time.Now().AddDate(0, 0, -7), // Last 7 days by default
		EndTime:   time.Now(),
		GroupBy:   c.DefaultQuery("group_by", "day"),
	}

	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if startTime, err := time.Parse("2006-01-02", startTimeStr); err == nil {
			req.StartTime = startTime
		}
	}

	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if endTime, err := time.Parse("2006-01-02", endTimeStr); err == nil {
			req.EndTime = endTime.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}

	// Create filter for stats
	filter := &models.AuditLogFilter{
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	}

	// Apply additional filters from query params
	if action := c.Query("action"); action != "" {
		filter.Action = action
	}
	if entityType := c.Query("entity_type"); entityType != "" {
		filter.ResourceType = entityType
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}

	// Get audit statistics
	stats, err := h.db.System().GetAuditStats(c.Request.Context(), filter, req.GroupBy)
	if err != nil {
		h.logger.Printf("Error getting audit stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to retrieve audit statistics", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Enhance stats with additional metrics
	enhancedStats := h.enhanceAuditStats(*c, stats, filter)

	response := models.NewSuccessResponse(enhancedStats, "Audit statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// ExportAuditLogs handles GET /system/audit/export
func (h *AuditHandler) ExportAuditLogs(c *gin.Context) {
	format := c.DefaultQuery("format", "csv")
	if format != "csv" && format != "excel" {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid format. Supported formats: csv, excel", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Parse filter parameters (similar to GetAuditLogs)
	filter := &models.AuditLogFilter{
		Limit: 10000, // Set a reasonable limit for export
	}

	// Parse query parameters for filtering
	if action := c.Query("action"); action != "" {
		filter.Action = action
	}
	if entityType := c.Query("entity_type"); entityType != "" {
		filter.ResourceType = entityType
	}
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if userID, err := strconv.Atoi(userIDStr); err == nil {
			filter.UserID = &userID
		}
	}
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startTime, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartTime = startTime
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endTime, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filter.EndTime = endTime.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		}
	}
	if search := c.Query("search"); search != "" {
		filter.Description = search
	}

	// Get audit logs for export
	logs, _, err := h.db.System().GetAuditLogsWithFilter(c.Request.Context(), filter)
	if err != nil {
		h.logger.Printf("Error getting audit logs for export: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit logs for export", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	if format == "csv" {
		h.exportAsCSV(c, logs)
	} else {
		h.exportAsExcel(c, logs)
	}
}

// exportAsCSV exports audit logs as CSV
func (h *AuditHandler) exportAsCSV(c *gin.Context, logs []interface{}) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment;filename=audit_logs.csv")

	// Write CSV header
	csvContent := "时间,用户,操作,实体类型,实体ID,IP地址,状态,描述\n"

	// Write data rows
	for _, logInterface := range logs {
		if log, ok := logInterface.(*models.AuditLog); ok {
			csvContent += h.formatCSVRow(log)
		}
	}

	c.String(http.StatusOK, csvContent)
}

// exportAsExcel exports audit logs as Excel (placeholder implementation)
func (h *AuditHandler) exportAsExcel(c *gin.Context, logs []interface{}) {
	// For now, return CSV with Excel headers
	// In a real implementation, you would use a library like excelize
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment;filename=audit_logs.xlsx")

	// For simplicity, return CSV content
	// TODO: Implement proper Excel export
	csvContent := "时间,用户,操作,实体类型,实体ID,IP地址,状态,描述\n"
	for _, logInterface := range logs {
		if log, ok := logInterface.(*models.AuditLog); ok {
			csvContent += h.formatCSVRow(log)
		}
	}

	c.String(http.StatusOK, csvContent)
}

// formatCSVRow formats a single audit log as CSV row
func (h *AuditHandler) formatCSVRow(log *models.AuditLog) string {
	return log.Timestamp.Format("2006-01-02 15:04:05") + "," +
		models.DerefString(log.UserName) + "," +
		log.Action + "," +
		models.DerefString(log.ResourceType) + "," +
		models.DerefString(log.ResourceID) + "," +
		models.DerefString(log.IPAddress) + "," +
		models.DerefString(log.Status) + "," +
		"\"" + models.DerefString(log.Description) + "\"" + "\n"
}

// enhanceAuditStats enhances basic stats with additional metrics
func (h *AuditHandler) enhanceAuditStats(ctx gin.Context, basicStats interface{}, filter *models.AuditLogFilter) map[string]interface{} {
	enhanced := make(map[string]interface{})

	// Add basic stats
	enhanced["basic_stats"] = basicStats

	// Add additional metrics
	enhanced["total_events"] = h.getTotalEventsCount(ctx, filter)
	enhanced["unique_users"] = h.getUniqueUsersCount(ctx, filter)
	enhanced["unique_ips"] = h.getUniqueIPsCount(ctx, filter)
	enhanced["error_rate"] = h.getErrorRate(ctx, filter)

	// Add time-based distributions
	enhanced["actions_distribution"] = h.getActionsDistribution(ctx, filter)
	enhanced["entities_distribution"] = h.getEntitiesDistribution(ctx, filter)
	enhanced["timeline_data"] = h.getTimelineData(ctx, filter)
	enhanced["top_users"] = h.getTopUsers(ctx, filter)
	enhanced["peak_hours"] = h.getPeakHours(ctx, filter)

	return enhanced
}

// Helper methods for enhanced stats (placeholder implementations)
func (h *AuditHandler) getTotalEventsCount(ctx gin.Context, filter *models.AuditLogFilter) int64 {
	// Implementation would query the database
	return 0
}

func (h *AuditHandler) getUniqueUsersCount(ctx gin.Context, filter *models.AuditLogFilter) int64 {
	// Implementation would query the database
	return 0
}

func (h *AuditHandler) getUniqueIPsCount(ctx gin.Context, filter *models.AuditLogFilter) int64 {
	// Implementation would query the database
	return 0
}

func (h *AuditHandler) getErrorRate(ctx gin.Context, filter *models.AuditLogFilter) float64 {
	// Implementation would calculate error rate
	return 0.0
}

func (h *AuditHandler) getActionsDistribution(ctx gin.Context, filter *models.AuditLogFilter) []map[string]interface{} {
	// Implementation would query action distribution
	return []map[string]interface{}{}
}

func (h *AuditHandler) getEntitiesDistribution(ctx gin.Context, filter *models.AuditLogFilter) []map[string]interface{} {
	// Implementation would query entity type distribution
	return []map[string]interface{}{}
}

func (h *AuditHandler) getTimelineData(ctx gin.Context, filter *models.AuditLogFilter) []map[string]interface{} {
	// Implementation would query timeline data
	return []map[string]interface{}{}
}

func (h *AuditHandler) getTopUsers(ctx gin.Context, filter *models.AuditLogFilter) []map[string]interface{} {
	// Implementation would query top active users
	return []map[string]interface{}{}
}

func (h *AuditHandler) getPeakHours(ctx gin.Context, filter *models.AuditLogFilter) []map[string]interface{} {
	// Implementation would query peak hours distribution
	return []map[string]interface{}{}
}
