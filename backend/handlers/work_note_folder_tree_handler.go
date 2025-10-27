// Work Note Folder Tree Handler
// 三棵文件夹树的HTTP处理器
// 提供Private/Team/Public三棵独立树的API接口

package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// WorkNoteFolderTreeHandler 文件夹树处理器
type WorkNoteFolderTreeHandler struct {
	db database.DB
}

// NewWorkNoteFolderTreeHandler 创建文件夹树处理器
func NewWorkNoteFolderTreeHandler(db database.DB) *WorkNoteFolderTreeHandler {
	return &WorkNoteFolderTreeHandler{
		db: db,
	}
}

// GetTreesOverview 获取三棵树的概览信息
// GET /api/v1/work-note-folders/trees/overview
func (h *WorkNoteFolderTreeHandler) GetTreesOverview(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	trees := models.GetAllTreeRoots()

	// 为每棵树统计文件夹和笔记数量
	for i := range trees {
		tree := &trees[i]

		// 统计文件夹数量
		folderCountQuery := h.buildFolderCountQuery(tree.Type, userID.(int))
		var folderCount int
		h.db.QueryRow(folderCountQuery.SQL, folderCountQuery.Args...).Scan(&folderCount)
		tree.FolderCount = folderCount

		// 统计笔记数量
		noteCountQuery := h.buildNoteCountQuery(tree.Type, userID.(int))
		var noteCount int
		h.db.QueryRow(noteCountQuery.SQL, noteCountQuery.Args...).Scan(&noteCount)
		tree.NoteCount = noteCount
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Trees overview retrieved successfully",
		"data":    trees,
	})
}

// GetFolderTreeByType 获取指定类型的文件夹树
// GET /api/v1/work-note-folders/trees/:tree_type
func (h *WorkNoteFolderTreeHandler) GetFolderTreeByType(c *gin.Context) {
	treeTypeStr := c.Param("tree_type")
	treeType := models.FolderTreeType(treeTypeStr)

	// 验证树类型
	if !treeType.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid tree type",
			"error": gin.H{
				"valid_types": []string{"private", "team", "public"},
			},
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 解析查询参数
	parentIDStr := c.Query("parent_id")
	maxDepth, _ := strconv.Atoi(c.DefaultQuery("max_depth", "2"))
	if maxDepth < 1 {
		maxDepth = 1
	}
	if maxDepth > 5 {
		maxDepth = 5
	}

	var parentID *int
	if parentIDStr != "" && parentIDStr != "null" {
		if pid, err := strconv.Atoi(parentIDStr); err == nil {
			parentID = &pid
		}
	}

	// 构建查询
	query := h.buildTreeQuery(treeType, userID.(int), parentID, maxDepth)

	// 执行查询
	rows, err := h.db.Query(query.SQL, query.Args...)
	if err != nil {
		log.Printf("[GetFolderTreeByType] Query error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to retrieve folder tree",
			"error":   err.Error(),
		})
		return
	}
	defer rows.Close()

	// 读取文件夹
	folders := []models.WorkNoteFolder{}
	for rows.Next() {
		folder := models.WorkNoteFolder{}
		err := rows.Scan(
			&folder.ID, &folder.Name, &folder.Description, &folder.ParentID,
			&folder.OwnerID, &folder.ProjectID, &folder.Visibility,
			&folder.Color, &folder.Icon, &folder.SortOrder, &folder.CreatedBy,
			&folder.CreatedAt, &folder.UpdatedAt, &folder.DeletedAt,
			&folder.OwnerName, &folder.NotesCount, &folder.SubfoldersCount,
		)
		if err != nil {
			log.Printf("[GetFolderTreeByType] Scan error: %v", err)
			continue
		}
		folders = append(folders, folder)
	}

	// 获取树根信息
	treeRoot, _ := models.GetTreeRootByType(treeType)

	// 构建响应
	response := models.FolderTreeResponse{
		TreeType:   treeType,
		TreeName:   treeRoot.Name,
		TreeIcon:   treeRoot.Icon,
		TreeColor:  treeRoot.Color,
		Folders:    folders,
		TotalCount: len(folders),
		MaxDepth:   maxDepth,
	}

	if parentID != nil {
		response.IsLazyLoad = true
		response.ParentID = parentID
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Retrieved %s tree successfully", treeType),
		"data":    response,
	})
}

// CreateFolderInTree 在指定树中创建文件夹
// POST /api/v1/work-note-folders/trees/:tree_type/folders
func (h *WorkNoteFolderTreeHandler) CreateFolderInTree(c *gin.Context) {
	treeTypeStr := c.Param("tree_type")
	treeType := models.FolderTreeType(treeTypeStr)

	// 验证树类型
	if !treeType.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid tree type",
		})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	// 解析请求(手动解析JSON，不使用binding验证)
	var req models.CreateFolderInTreeRequest
	if err := c.ShouldBind(&req); err != nil {
		// 忽略TreeType的required错误，因为它来自URL
	}

	// 从URL设置TreeType(优先级高于请求体)
	req.TreeType = treeType

	// 验证请求
	if err := req.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Validation failed",
			"error":   err.Error(),
		})
		return
	}

	// ✅ 检查权限（使用新的权限函数，支持公开树权限控制）
	userType, _ := c.Get("user_type")
	userRole, _ := c.Get("user_role")

	var userTypeStr, userRoleStr string
	if userType != nil {
		userTypeStr = userType.(string)
	}
	if userRole != nil {
		userRoleStr = userRole.(string)
	}

	permission := models.GetTreePermissionWithUserType(userID.(int), userTypeStr, userRoleStr, treeType)
	if !permission.CanCreate {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Permission denied",
			"error":   permission.Reason,
		})
		return
	}

	// 如果指定了父文件夹，验证父文件夹的visibility是否匹配
	if req.ParentID != nil {
		var parentVisibility string
		err := h.db.QueryRow(`
			SELECT visibility FROM work_note_folders
			WHERE id = $1 AND deleted_at IS NULL
		`, *req.ParentID).Scan(&parentVisibility)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Parent folder not found",
			})
			return
		}

		if parentVisibility != string(treeType) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Cannot create folder: parent folder belongs to a different tree",
				"error": gin.H{
					"parent_tree": parentVisibility,
					"target_tree": string(treeType),
				},
			})
			return
		}
	}

	// 创建文件夹
	folder := &models.WorkNoteFolder{
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		OwnerID:     userID.(int),
		ProjectID:   req.ProjectID,
		Visibility:  models.Visibility(treeType), // TreeType自动转为Visibility
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
		log.Printf("[CreateFolderInTree] Insert error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create folder",
			"error":   err.Error(),
		})
		return
	}

	folder.ID = id

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": fmt.Sprintf("Folder created in %s tree successfully", treeType),
		"data":    folder,
	})
}

// GetTreeStats 获取指定树的统计信息
// GET /api/v1/work-note-folders/trees/:tree_type/stats
func (h *WorkNoteFolderTreeHandler) GetTreeStats(c *gin.Context) {
	treeTypeStr := c.Param("tree_type")
	treeType := models.FolderTreeType(treeTypeStr)

	if !treeType.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid tree type",
		})
		return
	}

	userID, _ := c.Get("user_id")

	// 统计文件夹数量
	folderCountQuery := h.buildFolderCountQuery(treeType, userID.(int))
	var folderCount int
	h.db.QueryRow(folderCountQuery.SQL, folderCountQuery.Args...).Scan(&folderCount)

	// 统计笔记数量
	noteCountQuery := h.buildNoteCountQuery(treeType, userID.(int))
	var noteCount int
	h.db.QueryRow(noteCountQuery.SQL, noteCountQuery.Args...).Scan(&noteCount)

	// 统计根文件夹数量
	rootCountQuery := h.buildRootFolderCountQuery(treeType, userID.(int))
	var rootCount int
	h.db.QueryRow(rootCountQuery.SQL, rootCountQuery.Args...).Scan(&rootCount)

	stats := models.FolderTreeStats{
		TreeType:     treeType,
		FolderCount:  folderCount,
		NoteCount:    noteCount,
		RootFolders:  rootCount,
		LastModified: time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tree statistics retrieved successfully",
		"data":    stats,
	})
}

// ==========================================
// 辅助方法
// ==========================================

// QueryBuilder 查询构建器
type QueryBuilder struct {
	SQL  string
	Args []interface{}
}

// buildTreeQuery 构建树查询SQL
func (h *WorkNoteFolderTreeHandler) buildTreeQuery(
	treeType models.FolderTreeType,
	userID int,
	parentID *int,
	maxDepth int,
) QueryBuilder {
	if parentID != nil {
		// 懒加载模式：只获取指定父级的直接子级
		sql := `
			SELECT
				wnf.id, wnf.name, wnf.description, wnf.parent_id,
				wnf.owner_id, wnf.project_id, wnf.visibility,
				wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
				wnf.created_at, wnf.updated_at, wnf.deleted_at,
				COALESCE(u.username, '') as owner_name,
				(SELECT COUNT(*) FROM documents d
				 WHERE d.folder_id = wnf.id
				 AND d.deleted_at IS NULL
				 AND d.metadata->>'work_note_type' IS NOT NULL) as notes_count,
				(SELECT COUNT(*) FROM work_note_folders sf
				 WHERE sf.parent_id = wnf.id
				 AND sf.deleted_at IS NULL) as subfolders_count
			FROM work_note_folders wnf
			LEFT JOIN users u ON wnf.owner_id = u.id
			WHERE wnf.deleted_at IS NULL
			  AND wnf.visibility = $1
			  AND wnf.parent_id = $2
		`
		args := []interface{}{string(treeType), *parentID}

		// 添加权限过滤
		permFilter := h.buildPermissionFilter(treeType, userID, 3)
		if permFilter != "" {
			sql += permFilter
			args = append(args, userID)
		}

		sql += ` ORDER BY wnf.sort_order, wnf.name`

		return QueryBuilder{SQL: sql, Args: args}
	}

	// 完整树模式：使用递归CTE
	sql := `
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
			  AND wnf.visibility = $1
			  AND wnf.parent_id IS NULL
	`

	args := []interface{}{string(treeType)}
	argCount := 1

	// 添加根级权限过滤
	permFilter := h.buildPermissionFilter(treeType, userID, argCount+1)
	if permFilter != "" {
		sql += permFilter
		args = append(args, userID)
		argCount++
	}

	sql += `
			UNION ALL

			-- 递归获取子文件夹
			SELECT
				wnf.id, wnf.name, wnf.description, wnf.parent_id,
				wnf.owner_id, wnf.project_id, wnf.visibility,
				wnf.color, wnf.icon, wnf.sort_order, wnf.created_by,
				wnf.created_at, wnf.updated_at, wnf.deleted_at,
				ft.depth + 1
			FROM work_note_folders wnf
			INNER JOIN folder_tree ft ON wnf.parent_id = ft.id
			WHERE wnf.deleted_at IS NULL
			  AND ft.depth < $` + strconv.Itoa(argCount+1) + `
		)
		SELECT
			ft.id, ft.name, ft.description, ft.parent_id,
			ft.owner_id, ft.project_id, ft.visibility,
			ft.color, ft.icon, ft.sort_order, ft.created_by,
			ft.created_at, ft.updated_at, ft.deleted_at,
			COALESCE(u.username, '') as owner_name,
			(SELECT COUNT(*) FROM documents d
			 WHERE d.folder_id = ft.id
			 AND d.deleted_at IS NULL
			 AND d.metadata->>'work_note_type' IS NOT NULL) as notes_count,
			(SELECT COUNT(*) FROM work_note_folders sf
			 WHERE sf.parent_id = ft.id
			 AND sf.deleted_at IS NULL) as subfolders_count
		FROM folder_tree ft
		LEFT JOIN users u ON ft.owner_id = u.id
		ORDER BY ft.sort_order, ft.name
	`
	args = append(args, maxDepth)

	return QueryBuilder{SQL: sql, Args: args}
}

// buildPermissionFilter 构建权限过滤SQL片段
func (h *WorkNoteFolderTreeHandler) buildPermissionFilter(
	treeType models.FolderTreeType,
	userID int,
	paramIndex int,
) string {
	switch treeType {
	case models.TreeTypePrivate:
		// 私人树：只显示当前用户的文件夹
		return fmt.Sprintf(" AND wnf.owner_id = $%d", paramIndex)

	case models.TreeTypeTeam:
		// 团队树：显示用户所在团队的文件夹
		return fmt.Sprintf(` AND (wnf.owner_id = $%d OR wnf.project_id IN (
			SELECT project_id FROM project_users WHERE user_id = $%d
		))`, paramIndex, paramIndex)

	case models.TreeTypePublic:
		// 公开树：所有人可见，不需要额外过滤
		return ""

	default:
		return ""
	}
}

// buildFolderCountQuery 构建文件夹统计查询
func (h *WorkNoteFolderTreeHandler) buildFolderCountQuery(
	treeType models.FolderTreeType,
	userID int,
) QueryBuilder {
	sql := `
		SELECT COUNT(*)
		FROM work_note_folders
		WHERE deleted_at IS NULL
		  AND visibility = $1
	`
	args := []interface{}{string(treeType)}

	permFilter := h.buildPermissionFilter(treeType, userID, 2)
	sql += permFilter
	args = append(args, userID)

	return QueryBuilder{SQL: sql, Args: args}
}

// buildNoteCountQuery 构建笔记统计查询
func (h *WorkNoteFolderTreeHandler) buildNoteCountQuery(
	treeType models.FolderTreeType,
	userID int,
) QueryBuilder {
	sql := `
		SELECT COUNT(DISTINCT d.id)
		FROM documents d
		JOIN work_note_folders wnf ON d.folder_id = wnf.id
		WHERE d.deleted_at IS NULL
		  AND wnf.deleted_at IS NULL
		  AND d.metadata->>'work_note_type' IS NOT NULL
		  AND wnf.visibility = $1
	`
	args := []interface{}{string(treeType)}

	permFilter := h.buildPermissionFilter(treeType, userID, 2)
	sql += permFilter
	args = append(args, userID)

	return QueryBuilder{SQL: sql, Args: args}
}

// buildRootFolderCountQuery 构建根文件夹统计查询
func (h *WorkNoteFolderTreeHandler) buildRootFolderCountQuery(
	treeType models.FolderTreeType,
	userID int,
) QueryBuilder {
	sql := `
		SELECT COUNT(*)
		FROM work_note_folders
		WHERE deleted_at IS NULL
		  AND visibility = $1
		  AND parent_id IS NULL
	`
	args := []interface{}{string(treeType)}

	permFilter := h.buildPermissionFilter(treeType, userID, 2)
	sql += permFilter
	args = append(args, userID)

	return QueryBuilder{SQL: sql, Args: args}
}
