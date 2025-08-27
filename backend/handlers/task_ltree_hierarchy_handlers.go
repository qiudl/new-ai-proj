package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TaskLTreeHierarchyHandler struct {
	taskRepo       models.TaskRepository
	ltreeRepo      *database.TaskLTreeRepository
}

func NewTaskLTreeHierarchyHandler(taskRepo models.TaskRepository, ltreeRepo *database.TaskLTreeRepository) *TaskLTreeHierarchyHandler {
	return &TaskLTreeHierarchyHandler{
		taskRepo:  taskRepo,
		ltreeRepo: ltreeRepo,
	}
}

// GetTaskAncestors 获取任务的所有祖先
func (h *TaskLTreeHierarchyHandler) GetTaskAncestors(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	ancestors, err := h.ltreeRepo.GetTaskAncestors(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ancestors": ancestors,
		"count":     len(ancestors),
	})
}

// GetTaskDescendants 获取任务的所有后代
func (h *TaskLTreeHierarchyHandler) GetTaskDescendants(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	descendants, err := h.ltreeRepo.GetTaskDescendants(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"descendants": descendants,
		"count":       len(descendants),
	})
}

// GetTasksByDepth 获取指定深度的所有任务
func (h *TaskLTreeHierarchyHandler) GetTasksByDepth(c *gin.Context) {
	projectIDStr := c.Param("projectId")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的项目ID"})
		return
	}

	depthStr := c.Query("depth")
	if depthStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "需要指定depth参数"})
		return
	}

	depth, err := strconv.Atoi(depthStr)
	if err != nil || depth < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的深度值"})
		return
	}

	tasks, err := h.ltreeRepo.GetTasksByDepth(c.Request.Context(), projectID, depth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks": tasks,
		"count": len(tasks),
		"depth": depth,
	})
}

// FindTasksByPattern 使用ltree路径模式查找任务
func (h *TaskLTreeHierarchyHandler) FindTasksByPattern(c *gin.Context) {
	projectIDStr := c.Param("projectId")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的项目ID"})
		return
	}

	pattern := c.Query("pattern")
	if pattern == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "需要指定pattern参数"})
		return
	}

	tasks, err := h.ltreeRepo.FindTasksByPathPattern(c.Request.Context(), projectID, pattern)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tasks":   tasks,
		"count":   len(tasks),
		"pattern": pattern,
	})
}

// MoveTask 移动任务到新的父任务
func (h *TaskLTreeHierarchyHandler) MoveTask(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	var request struct {
		NewParentID *int `json:"new_parent_id"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
		return
	}

	// 检查循环引用
	if request.NewParentID != nil {
		isAncestor, err := h.ltreeRepo.IsTaskAncestor(c.Request.Context(), taskID, *request.NewParentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if isAncestor {
			c.JSON(http.StatusBadRequest, gin.H{"error": "不能将任务移动到其后代任务下"})
			return
		}
	}

	err = h.ltreeRepo.MoveTask(c.Request.Context(), taskID, request.NewParentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "任务移动成功",
		"task_id":       taskID,
		"new_parent_id": request.NewParentID,
	})
}

// GetHierarchyStats 获取项目层级统计信息
func (h *TaskLTreeHierarchyHandler) GetHierarchyStats(c *gin.Context) {
	projectIDStr := c.Param("projectId")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的项目ID"})
		return
	}

	stats, err := h.ltreeRepo.GetTaskHierarchyStats(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// RefreshTaskPaths 刷新任务路径（管理员功能）
func (h *TaskLTreeHierarchyHandler) RefreshTaskPaths(c *gin.Context) {
	err := h.ltreeRepo.RefreshTaskPaths(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "任务路径刷新成功",
	})
}

// GetTaskChildren 获取任务的直接子任务（使用ltree优化）
func (h *TaskLTreeHierarchyHandler) GetTaskChildren(c *gin.Context) {
	taskIDStr := c.Param("taskId")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的任务ID"})
		return
	}

	children, err := h.ltreeRepo.GetTaskChildren(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"children": children,
		"count":    len(children),
	})
}
