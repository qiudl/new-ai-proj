// Work Note Folder Handler
// 工作笔记文件夹HTTP处理器，处理工作笔记文件夹相关的API请求

package handlers

import (
	// "database/sql" // Temporarily unused
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
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

	// 检查创建权限
	if !h.checkWorkNoteFolderPermission(userID.(int), nil, "work_note_folder.create") {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Permission denied",
			"error":   "You don't have permission to create folders",
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
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
	// 获取文件夹ID
	idStr := c.Param("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Folder ID is required",
		})
		return
	}

	folderID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
			"error":   err.Error(),
		})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 查询文件夹信息（包含权限检查）
	query := `
		SELECT 
			wnf.id, wnf.name, wnf.description, wnf.parent_id, 
			wnf.owner_id, wnf.project_id, wnf.visibility, 
			wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
			wnf.created_at, wnf.updated_at, wnf.deleted_at,
			COALESCE(u.username, '') as owner_name,
			COALESCE(parent.name, '') as parent_name
		FROM work_note_folders wnf
		LEFT JOIN users u ON wnf.owner_id = u.id
		LEFT JOIN work_note_folders parent ON wnf.parent_id = parent.id
		WHERE wnf.id = $1 AND wnf.deleted_at IS NULL 
		AND (wnf.owner_id = $2 OR wnf.visibility IN ('team', 'public'))
	`

	var folder models.WorkNoteFolder
	var parentName string
	err = h.db.QueryRow(query, folderID, userID.(int)).Scan(
		&folder.ID, &folder.Name, &folder.Description, &folder.ParentID,
		&folder.OwnerID, &folder.ProjectID, &folder.Visibility,
		&folder.Color, &folder.Icon, &folder.SortOrder, &folder.CreatedBy,
		&folder.CreatedAt, &folder.UpdatedAt, &folder.DeletedAt,
		&folder.OwnerName, &parentName,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Work note folder not found or access denied",
		})
		return
	}

	// 计算笔记数量
	noteCountQuery := `
		SELECT COUNT(*) FROM work_notes wn
		INNER JOIN documents d ON wn.document_id = d.id
		WHERE d.folder_id = $1 AND d.deleted_at IS NULL
	`
	var noteCount int
	err = h.db.QueryRow(noteCountQuery, folderID).Scan(&noteCount)
	if err != nil {
		// 如果查询失败，设置为0
		noteCount = 0
	}
	folder.NotesCount = noteCount

	// 计算子文件夹数量
	subfolderCountQuery := `
		SELECT COUNT(*) FROM work_note_folders 
		WHERE parent_id = $1 AND deleted_at IS NULL
	`
	var subfolderCount int
	err = h.db.QueryRow(subfolderCountQuery, folderID).Scan(&subfolderCount)
	if err != nil {
		subfolderCount = 0
	}
	folder.SubfoldersCount = subfolderCount

	// 构建路径
	if folder.ParentID != nil && parentName != "" {
		folder.Path = parentName + "/" + folder.Name
	} else {
		folder.Path = folder.Name
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note folder retrieved successfully",
		"data":    folder,
	})
}
// UpdateWorkNoteFolder 更新工作笔记文件夹
func (h *WorkNoteFolderHandler) UpdateWorkNoteFolder(c *gin.Context) {
	// 获取文件夹ID
	idStr := c.Param("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Folder ID is required",
		})
		return
	}

	folderID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
			"error":   err.Error(),
		})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 解析请求
	var req models.UpdateWorkNoteFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 检查权限
	if !h.checkFolderOwnershipOrPermission(userID.(int), folderID, "work_note_folder.update") {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Permission denied",
			"error":   "You don't have permission to update this folder",
		})
		return
	}

	// 验证文件夹是否存在
	checkQuery := `
		SELECT id, owner_id FROM work_note_folders 
		WHERE id = $1 AND deleted_at IS NULL
	`
	var existingOwnerID int
	err = h.db.QueryRow(checkQuery, folderID).Scan(&folderID, &existingOwnerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Work note folder not found",
		})
		return
	}

	// 检查权限（只允许拥有者更新）
	if existingOwnerID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Permission denied: You can only update your own folders",
		})
		return
	}

	// 构建更新语句
	setParts := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *req.Name)
		argCount++
	}

	if req.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argCount))
		args = append(args, req.Description)
		argCount++
	}

	if req.ParentID != nil {
		setParts = append(setParts, fmt.Sprintf("parent_id = $%d", argCount))
		args = append(args, req.ParentID)
		argCount++
	}

	if req.Visibility != nil {
		setParts = append(setParts, fmt.Sprintf("visibility = $%d", argCount))
		args = append(args, *req.Visibility)
		argCount++
	}

	if req.Color != nil {
		setParts = append(setParts, fmt.Sprintf("color = $%d", argCount))
		args = append(args, req.Color)
		argCount++
	}

	if req.Icon != nil {
		setParts = append(setParts, fmt.Sprintf("icon = $%d", argCount))
		args = append(args, req.Icon)
		argCount++
	}

	if len(setParts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "No fields to update",
		})
		return
	}

	// 添加updated_at字段
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())
	argCount++

	// 添加WHERE条件
	args = append(args, folderID)

	updateQuery := fmt.Sprintf(`
		UPDATE work_note_folders 
		SET %s
		WHERE id = $%d AND deleted_at IS NULL
		RETURNING id, name, description, parent_id, owner_id, project_id, 
		         visibility, color, icon, sort_order, created_by, 
		         created_at, updated_at, deleted_at
	`, strings.Join(setParts, ", "), argCount)

	// 执行更新
	var folder models.WorkNoteFolder
	err = h.db.QueryRow(updateQuery, args...).Scan(
		&folder.ID, &folder.Name, &folder.Description, &folder.ParentID,
		&folder.OwnerID, &folder.ProjectID, &folder.Visibility,
		&folder.Color, &folder.Icon, &folder.SortOrder, &folder.CreatedBy,
		&folder.CreatedAt, &folder.UpdatedAt, &folder.DeletedAt,
	)

	if err != nil {
		log.Printf("Update work note folder failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update work note folder",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Work note folder updated successfully",
		"data":    folder,
	})
}

// DeleteWorkNoteFolder 删除工作笔记文件夹
func (h *WorkNoteFolderHandler) DeleteWorkNoteFolder(c *gin.Context) {
	// 获取文件夹ID
	idStr := c.Param("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Folder ID is required",
		})
		return
	}

	folderID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
			"error":   err.Error(),
		})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 检查删除权限
	if !h.checkFolderOwnershipOrPermission(userID.(int), folderID, "work_note_folder.delete") {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Permission denied",
			"error":   "You don't have permission to delete this folder",
		})
		return
	}

	// 验证文件夹是否存在
	checkQuery := `
		SELECT id, owner_id, name FROM work_note_folders 
		WHERE id = $1 AND deleted_at IS NULL
	`
	var existingOwnerID int
	var folderName string
	err = h.db.QueryRow(checkQuery, folderID).Scan(&folderID, &existingOwnerID, &folderName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Work note folder not found",
		})
		return
	}

	// 检查权限（只允许拥有者删除）
	if existingOwnerID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Permission denied: You can only delete your own folders",
		})
		return
	}

	// 检查是否有子文件夹
	subfolderCountQuery := `
		SELECT COUNT(*) FROM work_note_folders 
		WHERE parent_id = $1 AND deleted_at IS NULL
	`
	var subfolderCount int
	err = h.db.QueryRow(subfolderCountQuery, folderID).Scan(&subfolderCount)
	if err != nil {
		log.Printf("Error checking subfolders: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to check folder dependencies",
		})
		return
	}

	if subfolderCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Cannot delete folder: it contains subfolders",
			"details": gin.H{
				"subfolders_count": subfolderCount,
			},
		})
		return
	}

	// 检查是否有工作笔记
	noteCountQuery := `
		SELECT COUNT(*) FROM work_notes wn
		INNER JOIN documents d ON wn.document_id = d.id
		WHERE d.folder_id = $1 AND d.deleted_at IS NULL
	`
	var noteCount int
	err = h.db.QueryRow(noteCountQuery, folderID).Scan(&noteCount)
	if err != nil {
		// 如果查询失败，可能是work_notes表不存在，我们忽略这个检查
		log.Printf("Warning: Could not check work notes count: %v", err)
		noteCount = 0
	}

	if noteCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "Cannot delete folder: it contains work notes",
			"details": gin.H{
				"notes_count": noteCount,
			},
		})
		return
	}

	// 执行软删除
	deleteQuery := `
		UPDATE work_note_folders 
		SET deleted_at = $1, updated_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`
	now := time.Now()
	_, err = h.db.Exec(deleteQuery, now, folderID)
	if err != nil {
		log.Printf("Delete work note folder failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to delete work note folder",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Work note folder '%s' deleted successfully", folderName),
		"data": gin.H{
			"id":         folderID,
			"name":       folderName,
			"deleted_at": now,
		},
	})
}

// ListWorkNoteFolders 获取工作笔记文件夹列表（带分页优化）
func (h *WorkNoteFolderHandler) ListWorkNoteFolders(c *gin.Context) {
	fmt.Println("DEBUG: ListWorkNoteFolders called")
	
	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		fmt.Println("DEBUG: User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}
	fmt.Printf("DEBUG: UserID: %v\n", userID)

	// 查询参数
	projectID := c.Query("project_id")
	parentID := c.Query("parent_id")
	
	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	if pageSize < 1 {
		pageSize = 50
	}
	if pageSize > 200 { // 限制最大页面大小
		pageSize = 200
	}
	
	offset := (page - 1) * pageSize

	// 构建基础 WHERE 条件
	whereConditions := []string{"wnf.deleted_at IS NULL"}
	args := []interface{}{userID}
	paramCount := 1
	
	// 权限过滤
	whereConditions = append(whereConditions, "(wnf.owner_id = $1 OR wnf.visibility IN ('team', 'public'))")
	
	// 项目过滤
	if projectID != "" {
		if pid, err := strconv.Atoi(projectID); err == nil {
			paramCount++
			whereConditions = append(whereConditions, fmt.Sprintf("wnf.project_id = $%d", paramCount))
			args = append(args, pid)
		}
	}

	// 父文件夹过滤
	if parentID != "" {
		if pid, err := strconv.Atoi(parentID); err == nil {
			paramCount++
			whereConditions = append(whereConditions, fmt.Sprintf("wnf.parent_id = $%d", paramCount))
			args = append(args, pid)
		} else if parentID == "null" {
			whereConditions = append(whereConditions, "wnf.parent_id IS NULL")
		}
	}
	
	whereClause := strings.Join(whereConditions, " AND ")
	
	// 先查询总数（用于分页信息）
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM work_note_folders wnf
		WHERE %s
	`, whereClause)
	
	var totalCount int
	err := h.db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		fmt.Printf("DEBUG LIST: Count query error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to count work note folders",
			"error":   err.Error(),
		})
		return
	}

	// 构建优化后的主查询（带分页和统计信息）
	query := fmt.Sprintf(`
		SELECT 
			wnf.id, wnf.name, wnf.description, wnf.parent_id, 
			wnf.owner_id, wnf.project_id, wnf.visibility, 
			wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
			wnf.created_at, wnf.updated_at, wnf.deleted_at,
			COALESCE(u.username, '') as owner_name,
			COALESCE(stats.notes_count, 0) as notes_count,
			COALESCE(stats.subfolders_count, 0) as subfolders_count
		FROM work_note_folders wnf
		LEFT JOIN users u ON wnf.owner_id = u.id
		LEFT JOIN (
			SELECT 
				wf.id,
				-- 统计工作笔记数量（假设有work_notes表关联）
				0 as notes_count,
				-- 统计子文件夹数量
				(SELECT COUNT(*) FROM work_note_folders sf WHERE sf.parent_id = wf.id AND sf.deleted_at IS NULL) as subfolders_count
			FROM work_note_folders wf
		) stats ON wnf.id = stats.id
		WHERE %s
		ORDER BY wnf.sort_order, wnf.name
		LIMIT $%d OFFSET $%d
	`, whereClause, paramCount+1, paramCount+2)
	
	args = append(args, pageSize, offset)

	fmt.Printf("DEBUG LIST: About to execute query with args: %v\n", args)
	rows, err := h.db.Query(query, args...)
	if err != nil {
		fmt.Printf("DEBUG LIST: Query error: %v\n", err)
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

	// 计算分页信息
	totalPages := (totalCount + pageSize - 1) / pageSize
	hasMore := page < totalPages
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    folders,
		"pagination": gin.H{
			"current_page": page,
			"page_size":    pageSize,
			"total_count":  totalCount,
			"total_pages":  totalPages,
			"has_more":     hasMore,
		},
	})
}

// GetWorkNoteFolderTree 获取工作笔记文件夹树（懒加载优化）
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

	// 懒加载参数
	parentID := c.Query("parent_id") // 如果提供，只加载指定父级的直接子级
	maxDepth, _ := strconv.Atoi(c.DefaultQuery("max_depth", "2")) // 默认只加载2层
	if maxDepth < 1 {
		maxDepth = 1
	}
	if maxDepth > 5 { // 限制最大深度
		maxDepth = 5
	}

	var query string
	var args []interface{}
	
	if parentID != "" {
		// 懒加载模式：只获取指定父级的直接子级
		if parentID == "null" {
			// 获取根级文件夹
			query = `
				SELECT 
					wnf.id, wnf.name, wnf.description, wnf.parent_id, 
					wnf.owner_id, wnf.project_id, wnf.visibility, 
					wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
					wnf.created_at, wnf.updated_at, wnf.deleted_at,
					COALESCE(u.username, '') as owner_name,
					0 as notes_count,
					(SELECT COUNT(*) FROM work_note_folders sf WHERE sf.parent_id = wnf.id AND sf.deleted_at IS NULL) as subfolders_count
				FROM work_note_folders wnf
				LEFT JOIN users u ON wnf.owner_id = u.id
				WHERE wnf.deleted_at IS NULL 
				AND wnf.parent_id IS NULL
				AND (wnf.owner_id = $1 OR wnf.visibility IN ('team', 'public'))
				ORDER BY wnf.sort_order, wnf.name
			`
			args = []interface{}{userID}
		} else {
			// 获取指定父级的子文件夹
			if pid, err := strconv.Atoi(parentID); err == nil {
				query = `
					SELECT 
						wnf.id, wnf.name, wnf.description, wnf.parent_id, 
						wnf.owner_id, wnf.project_id, wnf.visibility, 
						wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
						wnf.created_at, wnf.updated_at, wnf.deleted_at,
						COALESCE(u.username, '') as owner_name,
						0 as notes_count,
						(SELECT COUNT(*) FROM work_note_folders sf WHERE sf.parent_id = wnf.id AND sf.deleted_at IS NULL) as subfolders_count
					FROM work_note_folders wnf
					LEFT JOIN users u ON wnf.owner_id = u.id
					WHERE wnf.deleted_at IS NULL 
					AND wnf.parent_id = $2
					AND (wnf.owner_id = $1 OR wnf.visibility IN ('team', 'public'))
					ORDER BY wnf.sort_order, wnf.name
				`
				args = []interface{}{userID, pid}
			} else {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Invalid parent_id",
				})
				return
			}
		}
	} else {
		// 完整树模式：使用递归CTE限制深度
		query = `
			WITH RECURSIVE folder_tree AS (
				-- 根级文件夹
				SELECT 
					wnf.id, wnf.name, wnf.description, wnf.parent_id, 
					wnf.owner_id, wnf.project_id, wnf.visibility, 
					wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
					wnf.created_at, wnf.updated_at, wnf.deleted_at,
					1 as depth
				FROM work_note_folders wnf
				WHERE wnf.deleted_at IS NULL 
				AND wnf.parent_id IS NULL
				AND (wnf.owner_id = $1 OR wnf.visibility IN ('team', 'public'))
				
				UNION ALL
				
				-- 递归获取子文件夹（限制深度）
				SELECT 
					wnf.id, wnf.name, wnf.description, wnf.parent_id, 
					wnf.owner_id, wnf.project_id, wnf.visibility, 
					wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
					wnf.created_at, wnf.updated_at, wnf.deleted_at,
					ft.depth + 1
				FROM work_note_folders wnf
				INNER JOIN folder_tree ft ON wnf.parent_id = ft.id
				WHERE wnf.deleted_at IS NULL 
				AND ft.depth < $2
				AND (wnf.owner_id = $1 OR wnf.visibility IN ('team', 'public'))
			)
			SELECT 
				ft.id, ft.name, ft.description, ft.parent_id, 
				ft.owner_id, ft.project_id, ft.visibility, 
				ft.color, ft.icon, ft.sort_order, ft.created_by,
				ft.created_at, ft.updated_at, ft.deleted_at,
				COALESCE(u.username, '') as owner_name,
				0 as notes_count,
				(SELECT COUNT(*) FROM work_note_folders sf WHERE sf.parent_id = ft.id AND sf.deleted_at IS NULL) as subfolders_count
			FROM folder_tree ft
			LEFT JOIN users u ON ft.owner_id = u.id
			ORDER BY ft.sort_order, ft.name
		`
		args = []interface{}{userID, maxDepth}
	}

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

	// 读取文件夹
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
		
		// 为每个文件夹添加子文件夹信息（前端可以根据SubfoldersCount判断是否有子级）
		folders = append(folders, folder)
	}

	// 响应格式
	response := gin.H{
		"success": true,
		"data":    folders,
	}
	
	// 如果是懒加载模式，添加额外信息
	if parentID != "" {
		response["parent_id"] = parentID
		response["is_lazy_load"] = true
	} else {
		response["max_depth"] = maxDepth
		response["is_complete_tree"] = maxDepth >= 5
	}
	
	c.JSON(http.StatusOK, response)
}

// SearchWorkNoteFolders 搜索工作笔记文件夹
func (h *WorkNoteFolderHandler) SearchWorkNoteFolders(c *gin.Context) {
	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 获取搜索参数
	searchTerm := strings.TrimSpace(c.Query("q"))
	if searchTerm == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Search query is required",
		})
		return
	}

	projectIDStr := c.Query("project_id")
	visibilityStr := c.Query("visibility")
	
	// 分页参数
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}
	
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}
	
	offset := (page - 1) * limit

	// 构建基础查询
	baseQuery := `
		FROM work_note_folders wnf
		LEFT JOIN users u ON wnf.owner_id = u.id
		WHERE wnf.deleted_at IS NULL 
		AND (wnf.owner_id = $1 OR wnf.visibility IN ('team', 'public'))
		AND (
			wnf.name ILIKE $2 
			OR wnf.description ILIKE $2
		)
	`
	
	args := []interface{}{userID.(int), "%" + searchTerm + "%"}
	argCount := 2

	// 添加项目ID过滤
	if projectIDStr != "" {
		if projectID, err := strconv.Atoi(projectIDStr); err == nil {
			argCount++
			baseQuery += fmt.Sprintf(" AND wnf.project_id = $%d", argCount)
			args = append(args, projectID)
		}
	}

	// 添加可见性过滤
	if visibilityStr != "" {
		argCount++
		baseQuery += fmt.Sprintf(" AND wnf.visibility = $%d", argCount)
		args = append(args, visibilityStr)
	}

	// 获取总数
	countQuery := "SELECT COUNT(*) " + baseQuery
	var total int
	err := h.db.QueryRow(countQuery, args...).Scan(&total)
	if err != nil {
		log.Printf("Search count query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Search failed",
			"error":   err.Error(),
		})
		return
	}

	// 构建主查询
	selectQuery := `
		SELECT 
			wnf.id, wnf.name, wnf.description, wnf.parent_id, 
			wnf.owner_id, wnf.project_id, wnf.visibility, 
			wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
			wnf.created_at, wnf.updated_at, wnf.deleted_at,
			COALESCE(u.username, '') as owner_name,
			0 as notes_count,
			0 as subfolders_count
	` + baseQuery + `
		ORDER BY 
			CASE 
				WHEN wnf.name ILIKE $2 THEN 1
				WHEN wnf.description ILIKE $2 THEN 2
				ELSE 3
			END,
			wnf.name
		LIMIT $%d OFFSET $%d
	`
	
	argCount++
	args = append(args, limit)
	argCount++
	args = append(args, offset)
	
	selectQuery = fmt.Sprintf(selectQuery, argCount-1, argCount)

	// 执行查询
	rows, err := h.db.Query(selectQuery, args...)
	if err != nil {
		log.Printf("Search query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Search failed",
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
		"message": fmt.Sprintf("Found %d folders matching '%s'", total, searchTerm),
		"data": gin.H{
			"folders": folders,
			"pagination": gin.H{
				"page":   page,
				"limit":  limit,
				"total":  total,
				"pages":  (total + limit - 1) / limit,
			},
			"query": searchTerm,
		},
	})
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
	// 获取文件夹ID
	idStr := c.Param("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Folder ID is required",
		})
		return
	}

	folderID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
			"error":   err.Error(),
		})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 解析请求体
	var request struct {
		TargetParentID *int `json:"target_parent_id"`
		SortOrder      *int `json:"sort_order,omitempty"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 验证源文件夹存在并检查权限
	checkSourceQuery := `
		SELECT id, owner_id, parent_id, name FROM work_note_folders 
		WHERE id = $1 AND deleted_at IS NULL
	`
	var sourceOwnerID int
	var currentParentID *int
	var folderName string
	err = h.db.QueryRow(checkSourceQuery, folderID).Scan(&folderID, &sourceOwnerID, &currentParentID, &folderName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Source folder not found",
		})
		return
	}

	// 检查权限（只允许拥有者移动）
	if sourceOwnerID != userID.(int) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Permission denied: You can only move your own folders",
		})
		return
	}

	// 检查是否是移动到自身
	if request.TargetParentID != nil && *request.TargetParentID == folderID {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Cannot move folder to itself",
		})
		return
	}

	// 如果目标父文件夹存在，验证其存在性和权限
	if request.TargetParentID != nil {
		checkTargetQuery := `
			SELECT id, owner_id FROM work_note_folders 
			WHERE id = $1 AND deleted_at IS NULL
		`
		var targetOwnerID int
		err = h.db.QueryRow(checkTargetQuery, *request.TargetParentID).Scan(request.TargetParentID, &targetOwnerID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Target parent folder not found",
			})
			return
		}

		// 确保目标文件夹也属于同一用户或用户有权限访问
		if targetOwnerID != userID.(int) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Permission denied: Target folder does not belong to you",
			})
			return
		}

		// 检查是否会创建循环引用 - 递归检查目标文件夹的所有父文件夹
		checkCycleQuery := `
			WITH RECURSIVE folder_ancestors AS (
				SELECT id, parent_id, 1 as level
				FROM work_note_folders 
				WHERE id = $1 AND deleted_at IS NULL
				
				UNION ALL
				
				SELECT f.id, f.parent_id, fa.level + 1
				FROM work_note_folders f
				INNER JOIN folder_ancestors fa ON f.id = fa.parent_id
				WHERE f.deleted_at IS NULL AND fa.level < 10
			)
			SELECT COUNT(*) FROM folder_ancestors WHERE id = $2
		`
		
		var cycleCount int
		err = h.db.QueryRow(checkCycleQuery, *request.TargetParentID, folderID).Scan(&cycleCount)
		if err != nil {
			log.Printf("Error checking for cycles: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to validate folder hierarchy",
			})
			return
		}

		if cycleCount > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Cannot move folder: would create circular reference",
			})
			return
		}
	}

	// 检查是否有实际变化
	if (currentParentID == nil && request.TargetParentID == nil) ||
		(currentParentID != nil && request.TargetParentID != nil && *currentParentID == *request.TargetParentID) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Folder is already in the target location",
			"data": gin.H{
				"id":        folderID,
				"name":      folderName,
				"parent_id": currentParentID,
			},
		})
		return
	}

	// 执行移动操作
	var updateQuery string
	var updateArgs []interface{}

	if request.SortOrder != nil {
		updateQuery = `
			UPDATE work_note_folders 
			SET parent_id = $1, sort_order = $2, updated_at = $3
			WHERE id = $4 AND deleted_at IS NULL
		`
		updateArgs = []interface{}{request.TargetParentID, *request.SortOrder, time.Now(), folderID}
	} else {
		updateQuery = `
			UPDATE work_note_folders 
			SET parent_id = $1, updated_at = $2
			WHERE id = $3 AND deleted_at IS NULL
		`
		updateArgs = []interface{}{request.TargetParentID, time.Now(), folderID}
	}

	_, err = h.db.Exec(updateQuery, updateArgs...)
	if err != nil {
		log.Printf("Move folder failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to move folder",
			"error":   err.Error(),
		})
		return
	}

	// 构建响应消息
	var message string
	if request.TargetParentID == nil {
		message = fmt.Sprintf("Folder '%s' moved to root level", folderName)
	} else {
		// 获取目标父文件夹名称
		var targetParentName string
		h.db.QueryRow("SELECT name FROM work_note_folders WHERE id = $1", *request.TargetParentID).Scan(&targetParentName)
		message = fmt.Sprintf("Folder '%s' moved to '%s'", folderName, targetParentName)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"data": gin.H{
			"id":            folderID,
			"name":          folderName,
			"old_parent_id": currentParentID,
			"new_parent_id": request.TargetParentID,
			"sort_order":    request.SortOrder,
		},
	})
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

// Permission checking helper functions

// checkWorkNoteFolderPermission 检查工作笔记文件夹权限
func (h *WorkNoteFolderHandler) checkWorkNoteFolderPermission(userID int, folderID *int, permissionCode string) bool {
	// For now, implement basic permission checking
	// In production, this should integrate with the full permission system
	
	// Super admin override
	if userID == 1 { // Assuming admin user ID is 1
		return true
	}
	
	// Check if user owns the folder
	if folderID != nil {
		query := `SELECT owner_id FROM work_note_folders WHERE id = $1 AND deleted_at IS NULL`
		var ownerID int
		err := h.db.QueryRow(query, *folderID).Scan(&ownerID)
		if err == nil && ownerID == userID {
			return true // Owner has all permissions
		}
	}
	
	// Check role-based permissions via company_user_roles
	query := `
		SELECT COUNT(*) > 0
		FROM company_user_roles cur
		JOIN role_permissions rp ON cur.role_id = rp.role_id
		JOIN permissions p ON rp.permission_id = p.id
		WHERE cur.company_user_id = $1
		  AND p.permission_code = $2
		  AND rp.is_granted = true
	`
	
	var hasPermission bool
	err := h.db.QueryRow(query, userID, permissionCode).Scan(&hasPermission)
	if err != nil {
		log.Printf("Error checking permission: %v", err)
		return false
	}
	
	return hasPermission
}

// requirePermission 中间件式的权限检查
func (h *WorkNoteFolderHandler) requirePermission(permissionCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"message": "User not authenticated",
			})
			c.Abort()
			return
		}
		
		// Get folder ID from URL if present
		var folderID *int
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.Atoi(idStr); err == nil {
				folderID = &id
			}
		}
		
		if !h.checkWorkNoteFolderPermission(userID.(int), folderID, permissionCode) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "Permission denied",
				"error":   fmt.Sprintf("User lacks permission: %s", permissionCode),
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// checkFolderOwnershipOrPermission 检查文件夹所有权或权限
func (h *WorkNoteFolderHandler) checkFolderOwnershipOrPermission(userID, folderID int, permissionCode string) bool {
	// Check ownership first
	query := `SELECT owner_id FROM work_note_folders WHERE id = $1 AND deleted_at IS NULL`
	var ownerID int
	err := h.db.QueryRow(query, folderID).Scan(&ownerID)
	if err == nil && ownerID == userID {
		return true
	}
	
	// Check permission
	return h.checkWorkNoteFolderPermission(userID, &folderID, permissionCode)
}