package handlers

import (
	"net/http"
	"ai-project-backend/models"
	"ai-project-backend/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// TaskOrganizationHandler 任务组织Handler
type TaskOrganizationHandler struct {
	service *services.TaskOrganizationService
}

// NewTaskOrganizationHandler 创建任务组织Handler实例
func NewTaskOrganizationHandler(service *services.TaskOrganizationService) *TaskOrganizationHandler {
	return &TaskOrganizationHandler{service: service}
}

// ScanOrphanTasks 扫描孤立任务
// @Summary 扫描孤立任务
// @Description 扫描项目中没有父任务的孤立任务，并按周次进行分组预览
// @Tags Task Organization
// @Accept json
// @Produce json
// @Param projectId path int true "项目ID"
// @Success 200 {object} models.APIResponse{data=models.OrphanScanResult}
// @Failure 400 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/projects/{projectId}/tasks/scan-orphans [post]
func (h *TaskOrganizationHandler) ScanOrphanTasks(c *gin.Context) {
	// 解析项目ID
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的项目ID",
		})
		return
	}

	// 调用服务扫描孤立任务
	result, err := h.service.ScanOrphanTasks(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "扫描失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "扫描成功",
		"data":    result,
	})
}

// OrganizeTasksToWeeks 批量组织任务到周汇总
// @Summary 批量组织任务到周汇总
// @Description 将指定的任务批量组织到对应的周汇总任务下
// @Tags Task Organization
// @Accept json
// @Produce json
// @Param projectId path int true "项目ID"
// @Param request body models.OrganizeRequest true "组织请求"
// @Success 200 {object} models.APIResponse{data=models.OrganizeResult}
// @Failure 400 {object} models.APIResponse
// @Failure 500 {object} models.APIResponse
// @Router /api/v1/projects/{projectId}/tasks/organize-to-weeks [post]
func (h *TaskOrganizationHandler) OrganizeTasksToWeeks(c *gin.Context) {
	// 解析项目ID
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的项目ID",
		})
		return
	}

	// 解析请求体
	var req models.OrganizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 验证任务ID列表
	if len(req.TaskIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "任务ID列表不能为空",
		})
		return
	}

	// 调用服务组织任务
	result, err := h.service.OrganizeTasksToWeeks(projectID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "组织失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "组织完成",
		"data":    result,
	})
}
