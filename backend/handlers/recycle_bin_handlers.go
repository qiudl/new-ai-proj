package handlers

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// RecycleBinHandler 回收站处理器
type RecycleBinHandler struct {
	db        database.DB
	logger    *log.Logger
	validator *validator.Validate
}

// NewRecycleBinHandler 创建回收站处理器
func NewRecycleBinHandler(db database.DB, logger *log.Logger, validator *validator.Validate) *RecycleBinHandler {
	return &RecycleBinHandler{
		db:        db,
		logger:    logger,
		validator: validator,
	}
}

// GetRecycledTasks 获取回收站中的任务
func (h *RecycleBinHandler) GetRecycledTasks(c *gin.Context) {
	// Get pagination parameters
	page := 1
	pageSize := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	offset := (page - 1) * pageSize

	// Get recycled tasks from system repository
	tasks, total, err := h.db.System().GetRecycledTasks(c.Request.Context(), pageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting recycled tasks: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取回收站任务失败", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Build response with pagination
	paginationData := map[string]interface{}{
		"page":        page,
		"page_size":   pageSize,
		"total":       total,
		"total_pages": (total + pageSize - 1) / pageSize,
		"has_next":    offset+pageSize < total,
		"has_prev":    page > 1,
	}

	response := map[string]interface{}{
		"success":    true,
		"message":    "获取回收站任务成功",
		"data":       tasks,
		"pagination": paginationData,
	}

	c.JSON(http.StatusOK, response)
}

// RestoreTask 恢复任务
func (h *RecycleBinHandler) RestoreTask(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的任务ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Restore task using system repository
	err = h.db.System().RestoreTask(c.Request.Context(), taskID)
	if err != nil {
		h.logger.Printf("Error restoring task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "恢复任务失败", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	h.logger.Printf("Successfully restored task %d", taskID)
	response := models.NewSuccessResponse(nil, "任务恢复成功")
	c.JSON(http.StatusOK, response)
}

// HardDeleteTask 永久删除任务
func (h *RecycleBinHandler) HardDeleteTask(c *gin.Context) {
	taskIDStr := c.Param("id")
	taskID, err := strconv.Atoi(taskIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的任务ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Permanently delete task using system repository
	err = h.db.System().HardDeleteTask(c.Request.Context(), taskID)
	if err != nil {
		h.logger.Printf("Error hard deleting task %d: %v", taskID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "永久删除任务失败", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	h.logger.Printf("Successfully hard deleted task %d", taskID)
	response := models.NewSuccessResponse(nil, "任务已永久删除")
	c.JSON(http.StatusOK, response)
}

// GetRecycledProjects 获取回收站中的项目
func (h *RecycleBinHandler) GetRecycledProjects(c *gin.Context) {
	// Get pagination parameters
	page := 1
	pageSize := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	offset := (page - 1) * pageSize

	// Get recycled projects from system repository
	projects, total, err := h.db.System().GetRecycledProjects(c.Request.Context(), pageSize, offset)
	if err != nil {
		h.logger.Printf("Error getting recycled projects: %v", err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "获取回收站项目失败", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	// Build response with pagination
	paginationData := map[string]interface{}{
		"page":        page,
		"page_size":   pageSize,
		"total":       total,
		"total_pages": (total + pageSize - 1) / pageSize,
		"has_next":    offset+pageSize < total,
		"has_prev":    page > 1,
	}

	response := map[string]interface{}{
		"success":    true,
		"message":    "获取回收站项目成功",
		"data":       projects,
		"pagination": paginationData,
	}

	c.JSON(http.StatusOK, response)
}

// RestoreProject 恢复项目
func (h *RecycleBinHandler) RestoreProject(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的项目ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Restore project using system repository
	err = h.db.System().RestoreProject(c.Request.Context(), projectID)
	if err != nil {
		h.logger.Printf("Error restoring project %d: %v", projectID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "恢复项目失败", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	h.logger.Printf("Successfully restored project %d", projectID)
	response := models.NewSuccessResponse(nil, "项目恢复成功")
	c.JSON(http.StatusOK, response)
}

// HardDeleteProject 永久删除项目
func (h *RecycleBinHandler) HardDeleteProject(c *gin.Context) {
	projectIDStr := c.Param("id")
	projectID, err := strconv.Atoi(projectIDStr)
	if err != nil {
		response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的项目ID", nil)
		c.JSON(http.StatusBadRequest, response)
		return
	}

	// Permanently delete project using system repository
	err = h.db.System().HardDeleteProject(c.Request.Context(), projectID)
	if err != nil {
		h.logger.Printf("Error hard deleting project %d: %v", projectID, err)
		response := models.NewErrorResponse(models.ErrCodeInternal, "永久删除项目失败", nil)
		c.JSON(http.StatusInternalServerError, response)
		return
	}

	h.logger.Printf("Successfully hard deleted project %d", projectID)
	response := models.NewSuccessResponse(nil, "项目已永久删除")
	c.JSON(http.StatusOK, response)
}

// EmptyRecycleBin 清空回收站（待实现）
func (h *RecycleBinHandler) EmptyRecycleBin(c *gin.Context) {
	// TODO: Implement batch deletion of all items in recycle bin
	h.logger.Printf("Emptying recycle bin (not implemented yet)")

	response := models.NewSuccessResponse(map[string]interface{}{
		"deleted_count": 0,
	}, "清空回收站功能暂未实现")
	c.JSON(http.StatusNotImplemented, response)
}
