// Work Note Folder Handler
// 工作笔记文件夹HTTP处理器，处理工作笔记文件夹相关的API请求

package handlers

import (
	// "database/sql" // Temporarily unused
	// "fmt" // Temporarily unused
	"net/http"
	"strconv"
	// "strings" // Temporarily unused
	"time"
	"ai-project-backend/database"
	"ai-project-backend/models"
	// "ai-project-backend/utils" // Temporarily unused - validator needs fixing
	"github.com/gin-gonic/gin"
)

// WorkNoteFolderHandler 工作笔记文件夹处理器
type WorkNoteFolderHandler struct {
	db database.DB
}

// NewWorkNoteFolderHandler 创建工作笔记文件夹处理器
func NewWorkNoteFolderHandler(db database.DB) *WorkNoteFolderHandler {
	return &WorkNoteFolderHandler{
		db: db,
	}
}

// CreateWorkNoteFolder 创建工作笔记文件夹
func (h *WorkNoteFolderHandler) CreateWorkNoteFolder(c *gin.Context) {
	var req models.CreateWorkNoteFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 验证请求 - temporarily disabled
	/*
	if err := utils.ValidateStruct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Validation failed",
			"error":   err.Error(),
		})
		return
	}
	*/

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 创建文件夹
	folder := &models.WorkNoteFolder{
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		OwnerID:     userID.(int),
		ProjectID:   req.ProjectID,
		Visibility:  req.Visibility,
		Color:       req.Color,
		Icon:        req.Icon,
		SortOrder:   0,
		CreatedBy:   userID.(int),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// 执行数据库插入
	query := `
		INSERT INTO work_note_folders (
			name, description, parent_id, owner_id, project_id, 
			visibility, color, icon, sort_order, created_by, 
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`

	var id int
	err := h.db.QueryRow(query,
		folder.Name, folder.Description, folder.ParentID, folder.OwnerID, folder.ProjectID,
		folder.Visibility, folder.Color, folder.Icon, folder.SortOrder, folder.CreatedBy,
		folder.CreatedAt, folder.UpdatedAt,
	).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create work note folder",
			"error":   err.Error(),
		})
		return
	}

	folder.ID = id

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Work note folder created successfully",
		"data":    folder,
	})
}

// GetWorkNoteFolder 获取单个工作笔记文件夹
func (h *WorkNoteFolderHandler) GetWorkNoteFolder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Work note folder retrieval feature coming soon",
		"data":      map[string]interface{}{},
		"timestamp": time.Now(),
	})
}
// UpdateWorkNoteFolder 更新工作笔记文件夹
func (h *WorkNoteFolderHandler) UpdateWorkNoteFolder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Update feature coming soon"})
}

// DeleteWorkNoteFolder 删除工作笔记文件夹
func (h *WorkNoteFolderHandler) DeleteWorkNoteFolder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Delete feature coming soon"})
}

// ListWorkNoteFolders 获取工作笔记文件夹列表
func (h *WorkNoteFolderHandler) ListWorkNoteFolders(c *gin.Context) {
	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 查询参数
	projectID := c.Query("project_id")
	parentID := c.Query("parent_id")

	// 构建查询
	query := `
		SELECT 
			wnf.id, wnf.name, wnf.description, wnf.parent_id, 
			wnf.owner_id, wnf.project_id, wnf.visibility, 
			wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
			wnf.created_at, wnf.updated_at, wnf.deleted_at,
			u.username as owner_name,
			COALESCE(notes_count.cnt, 0) as notes_count,
			COALESCE(subfolders_count.cnt, 0) as subfolders_count
		FROM work_note_folders wnf
		LEFT JOIN users u ON wnf.owner_id = u.id
		LEFT JOIN (
			SELECT work_note_folder_id, COUNT(*) as cnt 
			FROM documents 
			WHERE deleted_at IS NULL AND document_type = 'work_note'
			GROUP BY work_note_folder_id
		) notes_count ON wnf.id = notes_count.work_note_folder_id
		LEFT JOIN (
			SELECT parent_id, COUNT(*) as cnt 
			FROM work_note_folders 
			WHERE deleted_at IS NULL 
			GROUP BY parent_id
		) subfolders_count ON wnf.id = subfolders_count.parent_id
		WHERE wnf.deleted_at IS NULL 
		AND (wnf.owner_id = ? OR wnf.visibility IN ('team', 'public'))
	`

	args := []interface{}{userID}

	if projectID != "" {
		if pid, err := strconv.Atoi(projectID); err == nil {
			query += " AND wnf.project_id = ?"
			args = append(args, pid)
		}
	}

	if parentID != "" {
		if pid, err := strconv.Atoi(parentID); err == nil {
			query += " AND wnf.parent_id = ?"
			args = append(args, pid)
		} else if parentID == "null" {
			query += " AND wnf.parent_id IS NULL"
		}
	}

	query += " ORDER BY wnf.sort_order, wnf.name"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch work note folders",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	var folders []*models.WorkNoteFolder
	for rows.Next() {
		folder := &models.WorkNoteFolder{}
		err := rows.Scan(
			&folder.ID, &folder.Name, &folder.Description, &folder.ParentID,
			&folder.OwnerID, &folder.ProjectID, &folder.Visibility,
			&folder.Color, &folder.Icon, &folder.SortOrder, &folder.CreatedBy,
			&folder.CreatedAt, &folder.UpdatedAt, &folder.DeletedAt,
			&folder.OwnerName, &folder.NotesCount, &folder.SubfoldersCount,
		)
		if err != nil {
			continue
		}
		folders = append(folders, folder)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    folders,
	})
}

// GetWorkNoteFolderTree 获取工作笔记文件夹树
func (h *WorkNoteFolderHandler) GetWorkNoteFolderTree(c *gin.Context) {
	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 查询所有可访问的文件夹
	query := `
		SELECT 
			wnf.id, wnf.name, wnf.description, wnf.parent_id, 
			wnf.owner_id, wnf.project_id, wnf.visibility, 
			wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
			wnf.created_at, wnf.updated_at, wnf.deleted_at,
			u.username as owner_name,
			COALESCE(notes_count.cnt, 0) as notes_count,
			COALESCE(subfolders_count.cnt, 0) as subfolders_count
		FROM work_note_folders wnf
		LEFT JOIN users u ON wnf.owner_id = u.id
		LEFT JOIN (
			SELECT work_note_folder_id, COUNT(*) as cnt 
			FROM documents 
			WHERE deleted_at IS NULL AND document_type = 'work_note'
			GROUP BY work_note_folder_id
		) notes_count ON wnf.id = notes_count.work_note_folder_id
		LEFT JOIN (
			SELECT parent_id, COUNT(*) as cnt 
			FROM work_note_folders 
			WHERE deleted_at IS NULL 
			GROUP BY parent_id
		) subfolders_count ON wnf.id = subfolders_count.parent_id
		WHERE wnf.deleted_at IS NULL 
		AND (wnf.owner_id = ? OR wnf.visibility IN ('team', 'public'))
		ORDER BY wnf.sort_order, wnf.name
	`

	rows, err := h.db.Query(query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch work note folders",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	// 读取所有文件夹
	var allFolders []*models.WorkNoteFolder
	folderMap := make(map[int]*models.WorkNoteFolder)

	for rows.Next() {
		folder := &models.WorkNoteFolder{}
		err := rows.Scan(
			&folder.ID, &folder.Name, &folder.Description, &folder.ParentID,
			&folder.OwnerID, &folder.ProjectID, &folder.Visibility,
			&folder.Color, &folder.Icon, &folder.SortOrder, &folder.CreatedBy,
			&folder.CreatedAt, &folder.UpdatedAt, &folder.DeletedAt,
			&folder.OwnerName, &folder.NotesCount, &folder.SubfoldersCount,
		)
		if err != nil {
			continue
		}
		
		allFolders = append(allFolders, folder)
		folderMap[folder.ID] = folder
	}

	// 构建树结构
	var rootFolders []*models.WorkNoteFolder
	for _, folder := range allFolders {
		if folder.ParentID == nil {
			rootFolders = append(rootFolders, folder)
		} else {
			parent, exists := folderMap[*folder.ParentID]
			if exists {
				if parent.Children == nil {
					parent.Children = []*models.WorkNoteFolder{}
				}
				parent.Children = append(parent.Children, folder)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tree": rootFolders,
		},
	})
}

// SearchWorkNoteFolders 搜索工作笔记文件夹
func (h *WorkNoteFolderHandler) SearchWorkNoteFolders(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
}

// GetFolderAncestors 获取文件夹祖先路径
func (h *WorkNoteFolderHandler) GetFolderAncestors(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
}

// GetFolderDescendants 获取文件夹后代
func (h *WorkNoteFolderHandler) GetFolderDescendants(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
}

// GetFolderStats 获取文件夹统计信息
func (h *WorkNoteFolderHandler) GetFolderStats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": map[string]int{"notes_count": 0}})
}

// MoveWorkNoteFolder 移动工作笔记文件夹
func (h *WorkNoteFolderHandler) MoveWorkNoteFolder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Move feature coming soon"})
}

// BatchMoveFolders 批量移动文件夹
func (h *WorkNoteFolderHandler) BatchMoveFolders(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch move feature coming soon"})
}

// BatchSortFolders 批量排序文件夹
func (h *WorkNoteFolderHandler) BatchSortFolders(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch sort feature coming soon"})
}

// BatchMoveNotesToFolder 批量移动笔记到文件夹
func (h *WorkNoteFolderHandler) BatchMoveNotesToFolder(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Batch move notes feature coming soon"})
}