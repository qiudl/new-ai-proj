package handlers

import (
	"ai-project-backend/models"
	"ai-project-backend/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// HybridDocumentFolderHandler 处理文档文件夹相关的HTTP请求
// 使用Hybrid名称以兼容现有接口
type HybridDocumentFolderHandler struct {
	db      *gorm.DB
	service *services.DocumentFolderService
}

// NewHybridDocumentFolderHandler 创建新的文档文件夹处理器
func NewHybridDocumentFolderHandler(db *gorm.DB) *HybridDocumentFolderHandler {
	return &HybridDocumentFolderHandler{
		db:      db,
		service: services.NewDocumentFolderService(db),
	}
}

// CreateFolder 创建文件夹
func (h *HybridDocumentFolderHandler) CreateFolder(c *gin.Context) {
	var req struct {
		Name           string `json:"name" binding:"required"`
		ParentID       *uint  `json:"parent_id"`
		ParentFolderID *uint  `json:"parent_folder_id"`
		Description    string `json:"description"`
		Color          string `json:"color"`
		Icon           string `json:"icon"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 兼容 parent_id 与 parent_folder_id，两者同时存在时以 parent_folder_id 为准
	parentID := req.ParentID
	if req.ParentFolderID != nil {
		parentID = req.ParentFolderID
	}

	folder := &models.DocumentFolder{
		Name:        req.Name,
		ParentID:    parentID,
		Description: req.Description,
		Color:       req.Color,
		Icon:        req.Icon,
		CreatedBy:   GetUserIDFromContextAsUint(c),
	}

	if err := h.service.CreateFolder(folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    folder,
	})
}

// ListFolders 获取文件夹列表
func (h *HybridDocumentFolderHandler) ListFolders(c *gin.Context) {
	folders, err := h.service.ListFolders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    folders,
	})
}

// GetFolderTree 获取文件夹树形结构
func (h *HybridDocumentFolderHandler) GetFolderTree(c *gin.Context) {
	tree, err := h.service.GetFolderTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 统一返回结构：{ data: { tree: [...] } }
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tree": tree,
		},
	})
}

// GetFolder 获取单个文件夹
func (h *HybridDocumentFolderHandler) GetFolder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid folder ID",
		})
		return
	}

	folder, err := h.service.GetFolder(uint(id))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Folder not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    folder,
	})
}

// UpdateFolder 更新文件夹
func (h *HybridDocumentFolderHandler) UpdateFolder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid folder ID",
		})
		return
	}

	var req struct {
		Name           string `json:"name"`
		Description    string `json:"description"`
		Color          string `json:"color"`
		Icon           string `json:"icon"`
		ParentID       *uint  `json:"parent_id"`
		ParentFolderID *uint  `json:"parent_folder_id"`
		SortOrder      *int   `json:"sort_order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Color != "" {
		updates["color"] = req.Color
	}
	if req.Icon != "" {
		updates["icon"] = req.Icon
	}
	// 兼容 parent_id 与 parent_folder_id
	if req.ParentFolderID != nil {
		updates["parent_id"] = req.ParentFolderID
	} else if req.ParentID != nil {
		updates["parent_id"] = req.ParentID
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	folder, err := h.service.UpdateFolder(uint(id), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    folder,
	})
}

// DeleteFolder 删除文件夹
func (h *HybridDocumentFolderHandler) DeleteFolder(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid folder ID",
		})
		return
	}

	if err := h.service.DeleteFolder(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
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
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid folder ID",
		})
		return
	}

	var req struct {
		NewParentID    *uint `json:"new_parent_id"`
		ParentFolderID *uint `json:"parent_folder_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 兼容两种字段名
	parentID := req.NewParentID
	if req.ParentFolderID != nil {
		parentID = req.ParentFolderID
	}

	if req.NewParentID == nil && req.ParentFolderID == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Missing parent folder id",
		})
		return
	}

	if err := h.service.MoveFolder(uint(id), parentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
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
	// 兼容两种请求格式：
	// 1) { "updates": [ { id, fields: { parent_id|parent_folder_id, sort_order, ... } } ] }
	// 2) { "folders": [ { id, parent_folder_id?, sort_order? } ] }
	var req struct {
		Updates []struct {
			ID     uint                   `json:"id"`
			Fields map[string]interface{} `json:"fields"`
		} `json:"updates"`
		Folders []struct {
			ID             uint  `json:"id"`
			ParentFolderID *uint `json:"parent_folder_id"`
			ParentID       *uint `json:"parent_id"`
			SortOrder      *int  `json:"sort_order"`
		} `json:"folders"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	// 如果没有 updates 但有 folders，则转换为 updates 结构
	if len(req.Updates) == 0 && len(req.Folders) > 0 {
		for _, f := range req.Folders {
			fields := map[string]interface{}{}
			if f.ParentFolderID != nil {
				fields["parent_id"] = f.ParentFolderID
			} else if f.ParentID != nil {
				fields["parent_id"] = f.ParentID
			}
			if f.SortOrder != nil {
				fields["sort_order"] = *f.SortOrder
			}
			req.Updates = append(req.Updates, struct {
				ID     uint                   `json:"id"`
				Fields map[string]interface{} `json:"fields"`
			}{ID: f.ID, Fields: fields})
		}
	}

	if len(req.Updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No updates provided",
		})
		return
	}

	results := make([]interface{}, 0)
	for _, update := range req.Updates {
		folder, err := h.service.UpdateFolder(update.ID, update.Fields)
		if err != nil {
			results = append(results, gin.H{
				"id":      update.ID,
				"success": false,
				"error":   err.Error(),
			})
		} else {
			results = append(results, gin.H{
				"id":      update.ID,
				"success": true,
				"data":    folder,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": results,
	})
}

// 使用通用的getUserIDFromContext函数
// 如果需要uint类型，可以进行类型转换
