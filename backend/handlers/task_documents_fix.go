package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	
	"ai-project-backend/models"
	// "ai-project-backend/database" // Temporarily unused
)

// GetTaskDocumentsFix 修复版本的获取任务文档方法
func GetTaskDocumentsFix(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取路径参数
		projectIDStr := c.Param("id")
		taskIDStr := c.Param("taskId")
		
		projectID, err := strconv.Atoi(projectIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid project ID",
			})
			return
		}
		
		taskID, err := strconv.Atoi(taskIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid task ID",
			})
			return
		}
		
		// 查询任务关联的文档
		query := `
			SELECT d.id, d.project_id, d.title, d.content, d.type, d.status,
			       d.file_url, d.file_size, d.mime_type, d.description, d.tags,
			       d.owner_id, d.visibility, d.version, d.is_template,
			       d.created_by, d.created_at, d.updated_at,
			       u.username as owner_name, td.relationship_type
			FROM documents d
			INNER JOIN task_documents td ON d.id = td.document_id
			LEFT JOIN users u ON d.owner_id = u.id
			WHERE td.task_id = $1 AND d.project_id = $2 
			  AND d.deleted_at IS NULL AND td.deleted_at IS NULL
			ORDER BY td.sort_order, td.created_at`
		
		rows, err := db.Query(query, taskID, projectID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to retrieve task documents",
				"error":   err.Error(),
			})
			return
		}
		defer rows.Close()
		
		documents := []map[string]interface{}{}
		
		for rows.Next() {
			var doc models.Document
			var ownerName sql.NullString
			var relationshipType sql.NullString
			var tags pq.StringArray
			
			err := rows.Scan(
				&doc.ID, &doc.ProjectID, &doc.Title, &doc.Content, &doc.Type, &doc.Status,
				&doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.Description, &tags,
				&doc.OwnerID, &doc.Visibility, &doc.Version, &doc.IsTemplate,
				&doc.CreatedBy, &doc.CreatedAt, &doc.UpdatedAt,
				&ownerName, &relationshipType,
			)
			if err != nil {
				continue // 跳过有问题的记录
			}
			
			docData := map[string]interface{}{
				"id":           doc.ID,
				"project_id":   doc.ProjectID,
				"title":        doc.Title,
				"content":      doc.Content,
				"type":         doc.Type,
				"status":       doc.Status,
				"file_url":     doc.FileURL,
				"file_size":    doc.FileSize,
				"mime_type":    doc.MimeType,
				"description":  doc.Description,
				"tags":         []string(tags),
				"owner_id":     doc.OwnerID,
				"visibility":   doc.Visibility,
				"version":      doc.Version,
				"is_template":  doc.IsTemplate,
				"created_by":   doc.CreatedBy,
				"created_at":   doc.CreatedAt,
				"updated_at":   doc.UpdatedAt,
			}
			
			if ownerName.Valid {
				docData["owner_name"] = ownerName.String
			}
			if relationshipType.Valid {
				docData["relationship_type"] = relationshipType.String
			}
			
			documents = append(documents, docData)
		}
		
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    documents,
			"total":   len(documents),
			"message": fmt.Sprintf("Retrieved %d documents for task %d", len(documents), taskID),
		})
	}
}
