package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"ai-project-backend/models"

	"github.com/gin-gonic/gin"
)

// SimpleDocumentFolderHandler 简化的文档文件夹处理器
type SimpleDocumentFolderHandler struct {
	// 临时内存存储，后续可以替换为数据库
	folders map[int]*models.DocumentFolder
	nextID  int
}

// NewSimpleDocumentFolderHandler 创建新的简化文档文件夹处理器
func NewSimpleDocumentFolderHandler() *SimpleDocumentFolderHandler {
	folders := make(map[int]*models.DocumentFolder)

	// 初始化一些示例数据
	folders[1] = &models.DocumentFolder{
		ID:             1,
		Name:           "项目文档",
		Description:    stringPtr("项目相关文档"),
		ParentFolderID: nil,
		OwnerID:        1,
		Visibility:     models.VisibilityTeam,
		Color:          stringPtr("#1890ff"),
		Icon:           stringPtr("project"),
		SortOrder:      1,
		CreatedBy:      1,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		DocumentCount:  5,
	}

	folders[2] = &models.DocumentFolder{
		ID:             2,
		Name:           "技术文档",
		Description:    stringPtr("技术相关文档"),
		ParentFolderID: nil,
		OwnerID:        1,
		Visibility:     models.VisibilityPublic,
		Color:          stringPtr("#722ed1"),
		Icon:           stringPtr("tech"),
		SortOrder:      2,
		CreatedBy:      1,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		DocumentCount:  8,
	}

	return &SimpleDocumentFolderHandler{
		folders: folders,
		nextID:  3,
	}
}

// CreateFolder 创建文件夹
func (h *SimpleDocumentFolderHandler) CreateFolder(c *gin.Context) {
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

	folder := &models.DocumentFolder{
		ID:             h.nextID,
		Name:           req.Name,
		Description:    req.Description,
		ParentFolderID: req.ParentFolderID,
		OwnerID:        userID.(int),
		Visibility:     req.Visibility,
		Color:          req.Color,
		Icon:           req.Icon,
		SortOrder:      req.SortOrder,
		CreatedBy:      userID.(int),
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		DocumentCount:  0,
	}

	h.folders[h.nextID] = folder
	h.nextID++

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Folder created successfully",
		Data:    folder,
	})
}

// GetFolderTree 获取文件夹树
func (h *SimpleDocumentFolderHandler) GetFolderTree(c *gin.Context) {
	// 构建文件夹树
	rootFolders := make([]models.DocumentFolderTree, 0)

	for _, folder := range h.folders {
		if folder.ParentFolderID == nil {
			tree := models.DocumentFolderTree{
				DocumentFolder: *folder,
				Children:       make([]models.DocumentFolderTree, 0),
			}
			h.addChildrenToTree(&tree)
			rootFolders = append(rootFolders, tree)
		}
	}

	// 创建符合前端期望的响应格式
	response := &models.FolderTreeResponse{
		Tree: rootFolders,
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Folder tree retrieved successfully",
		Data:    response,
	})
}

// ListFolders 列出所有文件夹
func (h *SimpleDocumentFolderHandler) ListFolders(c *gin.Context) {
	folders := make([]models.DocumentFolder, 0, len(h.folders))
	for _, folder := range h.folders {
		folders = append(folders, *folder)
	}

	response := &models.ListFoldersResponse{
		Folders:    folders,
		TotalCount: len(folders),
		Page:       1,
		Limit:      50,
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Folders retrieved successfully",
		Data:    response,
	})
}

// GetFolder 获取单个文件夹
func (h *SimpleDocumentFolderHandler) GetFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Message: "Invalid folder ID",
		})
		return
	}

	folder, exists := h.folders[id]
	if !exists {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Message: "Folder not found",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Folder retrieved successfully",
		Data:    folder,
	})
}

// UpdateFolder 更新文件夹
func (h *SimpleDocumentFolderHandler) UpdateFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
		})
		return
	}

	folder, exists := h.folders[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Folder not found",
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

	// 更新字段
	if req.Name != nil {
		folder.Name = *req.Name
	}
	if req.Description != nil {
		folder.Description = *req.Description
	}
	if req.ParentFolderID != nil {
		folder.ParentFolderID = *req.ParentFolderID
	}
	if req.Visibility != nil {
		folder.Visibility = *req.Visibility
	}
	if req.Color != nil {
		folder.Color = *req.Color
	}
	if req.Icon != nil {
		folder.Icon = *req.Icon
	}
	if req.SortOrder != nil {
		folder.SortOrder = *req.SortOrder
	}

	folder.UpdatedAt = time.Now()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder updated successfully",
		"data":    folder,
	})
}

// DeleteFolder 删除文件夹
func (h *SimpleDocumentFolderHandler) DeleteFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
		})
		return
	}

	_, exists := h.folders[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Folder not found",
		})
		return
	}

	delete(h.folders, id)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder deleted successfully",
	})
}

// 辅助函数
func (h *SimpleDocumentFolderHandler) addChildren(folder *models.DocumentFolder) {
	children := make([]models.DocumentFolder, 0)

	for _, child := range h.folders {
		if child.ParentFolderID != nil && *child.ParentFolderID == folder.ID {
			h.addChildren(child)
			children = append(children, *child)
		}
	}

	folder.Children = children
}

func (h *SimpleDocumentFolderHandler) addChildrenToTree(tree *models.DocumentFolderTree) {
	for _, folder := range h.folders {
		if folder.ParentFolderID != nil && *folder.ParentFolderID == tree.ID {
			childTree := models.DocumentFolderTree{
				DocumentFolder: *folder,
				Children:       make([]models.DocumentFolderTree, 0),
			}
			h.addChildrenToTree(&childTree)
			tree.Children = append(tree.Children, childTree)
		}
	}
}

// MoveFolderRequest 移动文件夹请求
type MoveFolderRequest struct {
	ParentFolderID *int `json:"parent_folder_id"`
	SortOrder      int  `json:"sort_order"`
}

// BatchUpdateFoldersRequest 批量更新文件夹请求
type BatchUpdateFoldersRequest struct {
	Folders []FolderUpdate `json:"folders"`
}

type FolderUpdate struct {
	ID             int  `json:"id"`
	ParentFolderID *int `json:"parent_folder_id"`
	SortOrder      int  `json:"sort_order"`
}

// MoveFolder 移动文件夹（拖拽功能）
func (h *SimpleDocumentFolderHandler) MoveFolder(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid folder ID",
		})
		return
	}

	folder, exists := h.folders[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Folder not found",
		})
		return
	}

	var req MoveFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 检查是否会造成循环引用
	if req.ParentFolderID != nil && h.wouldCreateCycle(id, *req.ParentFolderID) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Cannot move folder: would create circular reference",
		})
		return
	}

	// 更新文件夹位置和排序
	folder.ParentFolderID = req.ParentFolderID
	folder.SortOrder = req.SortOrder
	folder.UpdatedAt = time.Now()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folder moved successfully",
		"data":    folder,
	})
}

// BatchUpdateFolders 批量更新文件夹排序
func (h *SimpleDocumentFolderHandler) BatchUpdateFolders(c *gin.Context) {
	var req BatchUpdateFoldersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request format",
			"error":   err.Error(),
		})
		return
	}

	// 批量更新文件夹
	updatedFolders := make([]*models.DocumentFolder, 0)
	for _, update := range req.Folders {
		if folder, exists := h.folders[update.ID]; exists {
			// 检查循环引用
			if update.ParentFolderID != nil && h.wouldCreateCycle(update.ID, *update.ParentFolderID) {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": fmt.Sprintf("Cannot move folder %d: would create circular reference", update.ID),
				})
				return
			}

			folder.ParentFolderID = update.ParentFolderID
			folder.SortOrder = update.SortOrder
			folder.UpdatedAt = time.Now()
			updatedFolders = append(updatedFolders, folder)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Folders updated successfully",
		"data":    updatedFolders,
	})
}

// wouldCreateCycle 检查是否会创建循环引用
func (h *SimpleDocumentFolderHandler) wouldCreateCycle(folderId int, newParentId int) bool {
	if folderId == newParentId {
		return true
	}

	// 遍历新父文件夹的所有祖先
	currentParentId := newParentId
	for {
		if currentParentId == folderId {
			return true
		}

		parent, exists := h.folders[currentParentId]
		if !exists || parent.ParentFolderID == nil {
			break
		}

		currentParentId = *parent.ParentFolderID
	}

	return false
}

func stringPtr(s string) *string {
	return &s
}
