package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"github.com/gin-gonic/gin"
)

// HybridDocumentFolderHandler 混合文档文件夹处理器，直接使用SQL查询
type HybridDocumentFolderHandler struct {
	db database.DB
}

// NewHybridDocumentFolderHandler 创建新的混合文档文件夹处理器
func NewHybridDocumentFolderHandler(db database.DB) *HybridDocumentFolderHandler {
	return &HybridDocumentFolderHandler{
		db: db,
	}
}

// GetFolderTree 获取文件夹树
func (h *HybridDocumentFolderHandler) GetFolderTree(c *gin.Context) {
	sqlDB := h.db.GetDB().(*sql.DB)
	
	query := `
		SELECT df.id, df.name, df.description, df.parent_folder_id, df.owner_id, 
			   df.visibility, df.color, df.icon, df.sort_order, df.created_at, 
			   df.updated_at, df.created_by,
			   u.username as owner_name,
			   COUNT(d.id) as documents_count
		FROM document_folders df
		LEFT JOIN users u ON df.owner_id = u.id
		LEFT JOIN documents d ON df.id = d.folder_id
		GROUP BY df.id, u.username
		ORDER BY df.sort_order, df.name
	`
	
	rows, err := sqlDB.Query(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to query folders",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()
	
	var folders []map[string]interface{}
	
	for rows.Next() {
		var folder models.DocumentFolder
		var ownerName sql.NullString
		var documentsCount int
		
		err := rows.Scan(
			&folder.ID, &folder.Name, &folder.Description, &folder.ParentFolderID,
			&folder.OwnerID, &folder.Visibility, &folder.Color, &folder.Icon,
			&folder.SortOrder, &folder.CreatedAt, &folder.UpdatedAt, &folder.CreatedBy,
			&ownerName, &documentsCount,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to scan folder",
				"error":   err.Error(),
			})
			return
		}
		
		folderResponse := map[string]interface{}{
			"id":               folder.ID,
			"name":             folder.Name,
			"description":      folder.Description,
			"parent_folder_id": folder.ParentFolderID,
			"owner_id":         folder.OwnerID,
			"visibility":       folder.Visibility,
			"color":            folder.Color,
			"icon":             folder.Icon,
			"sort_order":       folder.SortOrder,
			"created_at":       folder.CreatedAt,
			"updated_at":       folder.UpdatedAt,
			"created_by":       folder.CreatedBy,
			"documents_count":  documentsCount,
		}
		
		if ownerName.Valid {
			folderResponse["owner_name"] = ownerName.String
		}
		
		folders = append(folders, folderResponse)
	}
	
	if err = rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Error iterating folders",
			"error":   err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder tree retrieved successfully",
		"data":    folders,
	})
}

// ListFolders 获取文件夹列表
func (h *HybridDocumentFolderHandler) ListFolders(c *gin.Context) {
	// 对于简化实现，复用GetFolderTree
	h.GetFolderTree(c)
}

// CreateFolder 创建文件夹
func (h *HybridDocumentFolderHandler) CreateFolder(c *gin.Context) {
	var req models.CreateDocumentFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 获取用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 设置默认值
	if req.Visibility == "" {
		req.Visibility = models.VisibilityTeam
	}
	if req.Color == nil {
		defaultColor := "#1890ff"
		req.Color = &defaultColor
	}
	if req.Icon == nil {
		defaultIcon := "folder"
		req.Icon = &defaultIcon
	}
	if req.SortOrder == 0 {
		req.SortOrder = 1
	}

	now := time.Now()
	
	query := `
		INSERT INTO document_folders (
			name, description, parent_folder_id, owner_id, visibility,
			color, icon, sort_order, created_at, updated_at, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id
	`
	
	var newID int
	err := sqlDB.QueryRow(
		query,
		req.Name, req.Description, req.ParentFolderID, userID.(int), req.Visibility,
		req.Color, req.Icon, req.SortOrder, now, now, userID.(int),
	).Scan(&newID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create folder",
			"error":   err.Error(),
		})
		return
	}

	// 返回创建的文件夹
	createdFolder := map[string]interface{}{
		"id":               newID,
		"name":             req.Name,
		"description":      req.Description,
		"parent_folder_id": req.ParentFolderID,
		"owner_id":         userID.(int),
		"visibility":       req.Visibility,
		"color":            req.Color,
		"icon":             req.Icon,
		"sort_order":       req.SortOrder,
		"created_at":       now,
		"updated_at":       now,
		"created_by":       userID.(int),
		"documents_count":  0,
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Folder created successfully",
		"data":    createdFolder,
	})
}

// GetFolder 获取单个文件夹
func (h *HybridDocumentFolderHandler) GetFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	query := `
		SELECT df.id, df.name, df.description, df.parent_folder_id, df.owner_id, 
			   df.visibility, df.color, df.icon, df.sort_order, df.created_at, 
			   df.updated_at, df.created_by,
			   u.username as owner_name,
			   COUNT(d.id) as documents_count
		FROM document_folders df
		LEFT JOIN users u ON df.owner_id = u.id
		LEFT JOIN documents d ON df.id = d.folder_id
		WHERE df.id = $1
		GROUP BY df.id, u.username
	`
	
	var folder models.DocumentFolder
	var ownerName sql.NullString
	var documentsCount int
	
	err = sqlDB.QueryRow(query, id).Scan(
		&folder.ID, &folder.Name, &folder.Description, &folder.ParentFolderID,
		&folder.OwnerID, &folder.Visibility, &folder.Color, &folder.Icon,
		&folder.SortOrder, &folder.CreatedAt, &folder.UpdatedAt, &folder.CreatedBy,
		&ownerName, &documentsCount,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Folder not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to get folder",
				"error":   err.Error(),
			})
		}
		return
	}
	
	folderResponse := map[string]interface{}{
		"id":               folder.ID,
		"name":             folder.Name,
		"description":      folder.Description,
		"parent_folder_id": folder.ParentFolderID,
		"owner_id":         folder.OwnerID,
		"visibility":       folder.Visibility,
		"color":            folder.Color,
		"icon":             folder.Icon,
		"sort_order":       folder.SortOrder,
		"created_at":       folder.CreatedAt,
		"updated_at":       folder.UpdatedAt,
		"created_by":       folder.CreatedBy,
		"documents_count":  documentsCount,
	}
	
	if ownerName.Valid {
		folderResponse["owner_name"] = ownerName.String
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder retrieved successfully",
		"data":    folderResponse,
	})
}

// UpdateFolder 更新文件夹
func (h *HybridDocumentFolderHandler) UpdateFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
		})
		return
	}

	var req models.UpdateDocumentFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 构建动态更新查询
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1
	
	if req.Name != nil {
		setParts = append(setParts, "name = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Description != nil {
		setParts = append(setParts, "description = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Description)
		argIndex++
	}
	if req.Visibility != nil {
		setParts = append(setParts, "visibility = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Visibility)
		argIndex++
	}
	if req.Color != nil {
		setParts = append(setParts, "color = $" + strconv.Itoa(argIndex))
		args = append(args, *req.Color)
		argIndex++
	}
	
	if len(setParts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No fields to update",
		})
		return
	}
	
	// 添加updated_at
	setParts = append(setParts, "updated_at = $" + strconv.Itoa(argIndex))
	args = append(args, time.Now())
	argIndex++
	
	// 添加WHERE条件
	args = append(args, id)
	
	query := "UPDATE document_folders SET " + strings.Join(setParts, ", ") + " WHERE id = $" + strconv.Itoa(argIndex)
	
	result, err := sqlDB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update folder",
			"error":   err.Error(),
		})
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Folder not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder updated successfully",
	})
}

// DeleteFolder 删除文件夹
func (h *HybridDocumentFolderHandler) DeleteFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 首先检查是否有子文件夹或文档
	checkQuery := `
		SELECT 
			(SELECT COUNT(*) FROM document_folders WHERE parent_folder_id = $1) as subfolders,
			(SELECT COUNT(*) FROM documents WHERE folder_id = $1) as documents
	`
	
	var subfolders, documents int
	err = sqlDB.QueryRow(checkQuery, id).Scan(&subfolders, &documents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to check folder contents",
			"error":   err.Error(),
		})
		return
	}
	
	if subfolders > 0 || documents > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Cannot delete folder with contents",
		})
		return
	}
	
	query := "DELETE FROM document_folders WHERE id = $1"
	result, err := sqlDB.Exec(query, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete folder",
			"error":   err.Error(),
		})
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Folder not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder deleted successfully",
	})
}

// MoveFolder 移动文件夹
func (h *HybridDocumentFolderHandler) MoveFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
		})
		return
	}

	var req models.MoveFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	query := `
		UPDATE document_folders 
		SET parent_folder_id = $1, updated_at = $2
		WHERE id = $3
	`
	
	result, err := sqlDB.Exec(query, req.ParentFolderID, time.Now(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to move folder",
			"error":   err.Error(),
		})
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Folder not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder moved successfully",
	})
}

// BatchUpdateFolders 批量更新文件夹
func (h *HybridDocumentFolderHandler) BatchUpdateFolders(c *gin.Context) {
	var req struct {
		Folders []struct {
			ID             int  `json:"id"`
			ParentFolderID *int `json:"parent_folder_id"`
			SortOrder      int  `json:"sort_order"`
		} `json:"folders"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	sqlDB := h.db.GetDB().(*sql.DB)
	
	// 简单实现：逐个更新
	for _, folderUpdate := range req.Folders {
		query := `
			UPDATE document_folders 
			SET parent_folder_id = $1, sort_order = $2, updated_at = $3
			WHERE id = $4
		`
		
		_, err := sqlDB.Exec(query, folderUpdate.ParentFolderID, folderUpdate.SortOrder, time.Now(), folderUpdate.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to batch update folders",
				"error":   err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folders updated successfully",
	})
}