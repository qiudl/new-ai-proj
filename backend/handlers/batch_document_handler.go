package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// BatchDocumentHandler 批量文档处理器
type BatchDocumentHandler struct {
	db *sql.DB
}

// NewBatchDocumentHandler 创建批量文档处理器
func NewBatchDocumentHandler(db *sql.DB) *BatchDocumentHandler {
	return &BatchDocumentHandler{db: db}
}

// DocumentStatusInfo 文档状态信息
type DocumentStatusInfo struct {
	TaskID            int     `json:"task_id"`
	DocumentExists    bool    `json:"document_exists"`
	DocumentID        *int    `json:"document_id,omitempty"`
	DocumentTitle     *string `json:"document_title,omitempty"`
	DocumentUpdatedAt *string `json:"document_updated_at,omitempty"`
	DocumentCreatedAt *string `json:"document_created_at,omitempty"`
}

// BatchGetDocumentStatus 批量获取任务文档状态
// POST /api/v1/documents/batch-status
func (h *BatchDocumentHandler) BatchGetDocumentStatus(c *gin.Context) {
	var request struct {
		TaskIDs []int `json:"task_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"code":    "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}

	// 限制一次最多查询的任务数
	if len(request.TaskIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Task IDs cannot be empty",
			"code":  "EMPTY_TASK_IDS",
		})
		return
	}

	if len(request.TaskIDs) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Too many task IDs (max 1000)",
			"code":  "TOO_MANY_TASK_IDS",
		})
		return
	}

	// 构建IN查询的占位符
	placeholders := make([]string, len(request.TaskIDs))
	args := make([]interface{}, len(request.TaskIDs))
	for i, taskID := range request.TaskIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = taskID
	}

	// 查询文档信息 - 通过task_documents关联表JOIN
	query := fmt.Sprintf(`
		SELECT
			td.task_id,
			d.id as document_id,
			d.title as document_title,
			d.created_at as document_created_at,
			d.updated_at as document_updated_at
		FROM task_documents td
		JOIN documents d ON td.document_id = d.id
		WHERE td.task_id IN (%s)
		  AND td.deleted_at IS NULL
		  AND d.deleted_at IS NULL
		ORDER BY td.task_id, d.updated_at DESC
	`, strings.Join(placeholders, ","))

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to query documents",
			"code":    "QUERY_FAILED",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	// 构建任务ID到文档信息的映射
	taskDocMap := make(map[int]*DocumentStatusInfo)

	// 初始化所有任务为无文档状态
	for _, taskID := range request.TaskIDs {
		taskDocMap[taskID] = &DocumentStatusInfo{
			TaskID:         taskID,
			DocumentExists: false,
		}
	}

	// 填充有文档的任务信息（每个任务只取最新的一个文档）
	for rows.Next() {
		var taskID, documentID int
		var documentTitle, createdAt, updatedAt string

		if err := rows.Scan(&taskID, &documentID, &documentTitle, &createdAt, &updatedAt); err != nil {
			continue
		}

		// 只保存每个任务的第一条记录（最新的文档）
		if info, exists := taskDocMap[taskID]; exists && !info.DocumentExists {
			info.DocumentExists = true
			info.DocumentID = &documentID
			info.DocumentTitle = &documentTitle
			info.DocumentCreatedAt = &createdAt
			info.DocumentUpdatedAt = &updatedAt
		}
	}

	// 转换为数组返回
	result := make([]DocumentStatusInfo, 0, len(request.TaskIDs))
	for _, taskID := range request.TaskIDs {
		if info, exists := taskDocMap[taskID]; exists {
			result = append(result, *info)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
		"total":   len(result),
	})
}
