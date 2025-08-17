package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// AuditEnhancedHandler 增强版审计处理器
type AuditEnhancedHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewAuditEnhancedHandler 创建增强版审计处理器
func NewAuditEnhancedHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *AuditEnhancedHandler {
	return &AuditEnhancedHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetAuditLogs 获取审计日志
func (h *AuditEnhancedHandler) GetAuditLogs(c *gin.Context) {
	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	action := c.Query("action")
	resourceType := c.Query("resource_type")
	userID := c.Query("user_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	exportFormat := c.Query("export")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build query
	sqlDB := h.db.GetDB().(*sql.DB)
	whereClause := []string{"1=1"}
	args := []interface{}{}
	argIndex := 1

	if action != "" {
		whereClause = append(whereClause, fmt.Sprintf("action = $%d", argIndex))
		args = append(args, action)
		argIndex++
	}

	if resourceType != "" {
		whereClause = append(whereClause, fmt.Sprintf("resource_type = $%d", argIndex))
		args = append(args, resourceType)
		argIndex++
	}

	if userID != "" {
		whereClause = append(whereClause, fmt.Sprintf("user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}

	if startDate != "" {
		whereClause = append(whereClause, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, startDate)
		argIndex++
	}

	if endDate != "" {
		whereClause = append(whereClause, fmt.Sprintf("created_at <= $%d", argIndex))
		args = append(args, endDate)
		argIndex++
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs WHERE %s", strings.Join(whereClause, " AND "))
	var total int
	err := sqlDB.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		h.logger.Printf("Error getting audit log count: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit log count", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Get logs
	query := fmt.Sprintf(`
		SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at 
		FROM audit_logs 
		WHERE %s 
		ORDER BY created_at DESC 
		LIMIT $%d OFFSET $%d`,
		strings.Join(whereClause, " AND "), argIndex, argIndex+1)
	
	args = append(args, limit, offset)

	rows, err := sqlDB.Query(query, args...)
	if err != nil {
		h.logger.Printf("Error querying audit logs: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to query audit logs", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	defer rows.Close()

	var logs []interface{}
	for rows.Next() {
		var log models.AuditLog
		var details sql.NullString
		var ipAddress sql.NullString
		var userAgent sql.NullString

		err := rows.Scan(&log.ID, &log.UserID, &log.Action, &log.ResourceType, &log.ResourceID, &details, &ipAddress, &userAgent, &log.CreatedAt)
		if err != nil {
			h.logger.Printf("Error scanning audit log: %v", err)
			continue
		}

		// Note: AuditLog model doesn't have Details, IPAddress, UserAgent fields
		// This is a placeholder implementation

		logs = append(logs, log)
	}

	// Handle export formats
	if exportFormat == "csv" {
		h.exportAuditLogsAsCSV(c, logs)
		return
	}

	// Return paginated response
	response := models.NewSuccessResponse(map[string]interface{}{
		"logs":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	}, "Audit logs retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetAuditLog 获取单个审计日志
func (h *AuditEnhancedHandler) GetAuditLog(c *gin.Context) {
	logIDStr := c.Param("id")
	logID, err := strconv.Atoi(logIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "Invalid log ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	query := `
		SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at 
		FROM audit_logs 
		WHERE id = $1`

	var log models.AuditLog
	var details sql.NullString
	var ipAddress sql.NullString
	var userAgent sql.NullString

	err = sqlDB.QueryRow(query, logID).Scan(&log.ID, &log.UserID, &log.Action, &log.ResourceType, &log.ResourceID, &details, &ipAddress, &userAgent, &log.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			response := models.NewErrorResponse(models.ErrCodeNotFound, "Audit log not found", nil)
			c.JSON(http.StatusNotFound, response)
		} else {
			h.logger.Printf("Error getting audit log: %v", err)
			response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit log", nil)
			c.JSON(http.StatusInternalServerError, response)
		}
		return
	}

	// Note: AuditLog model doesn't have Details, IPAddress, UserAgent fields
	// This is a placeholder implementation

	response := models.NewSuccessResponse(log, "Audit log retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// GetAuditStats 获取审计统计信息
func (h *AuditEnhancedHandler) GetAuditStats(c *gin.Context) {
	sqlDB := h.db.GetDB().(*sql.DB)
	
	// Get total count
	var totalCount int
	err := sqlDB.QueryRow("SELECT COUNT(*) FROM audit_logs").Scan(&totalCount)
	if err != nil {
		h.logger.Printf("Error getting audit log total count: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit stats", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Get today's count
	var todayCount int
	err = sqlDB.QueryRow("SELECT COUNT(*) FROM audit_logs WHERE DATE(created_at) = CURRENT_DATE").Scan(&todayCount)
	if err != nil {
		h.logger.Printf("Error getting today's audit log count: %v", err)
		todayCount = 0
	}

	// Get action statistics
	actionQuery := `
		SELECT action, COUNT(*) as count 
		FROM audit_logs 
		GROUP BY action 
		ORDER BY count DESC 
		LIMIT 10`

	rows, err := sqlDB.Query(actionQuery)
	if err != nil {
		h.logger.Printf("Error getting action stats: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "Failed to get audit stats", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}
	defer rows.Close()

	var actionStats []map[string]interface{}
	for rows.Next() {
		var action string
		var count int
		if err := rows.Scan(&action, &count); err != nil {
			continue
		}
		actionStats = append(actionStats, map[string]interface{}{
			"action": action,
			"count":  count,
		})
	}

	stats := map[string]interface{}{
		"total_count":   totalCount,
		"today_count":   todayCount,
		"action_stats":  actionStats,
	}

	response := models.NewSuccessResponse(stats, "Audit statistics retrieved successfully")
	c.JSON(http.StatusOK, response)
}

// exportAuditLogsAsCSV 导出审计日志为CSV格式
func (h *AuditEnhancedHandler) exportAuditLogsAsCSV(c *gin.Context, logs []interface{}) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=audit_logs.csv")

	// Write CSV header
	c.String(http.StatusOK, "ID,User ID,Action,Resource Type,Resource ID,Created At\n")

	// Write CSV data
	for _, logInterface := range logs {
		if log, ok := logInterface.(models.AuditLog); ok {
			csvRow := h.formatAuditLogCSVRow(&log)
			c.String(http.StatusOK, csvRow)
		}
	}
}


// formatAuditLogCSVRow 格式化审计日志为CSV行
func (h *AuditEnhancedHandler) formatAuditLogCSVRow(log *models.AuditLog) string {
	// Escape CSV fields that contain commas or quotes
	escapeCSV := func(field string) string {
		if strings.Contains(field, ",") || strings.Contains(field, "\"") || strings.Contains(field, "\n") {
			return "\"" + strings.ReplaceAll(field, "\"", "\"\"") + "\""
		}
		return field
	}

	return fmt.Sprintf("%d,%d,%s,%s,%d,%s\n",
		log.ID,
		log.UserID,
		escapeCSV(log.Action),
		escapeCSV(log.ResourceType),
		log.ResourceID,
		log.CreatedAt.Format(time.RFC3339),
	)
}