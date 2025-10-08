package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterTaskOrganizationRoutes 注册任务组织路由
func RegisterTaskOrganizationRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取task organization handler
	taskOrgHandler := app.GetTaskOrganizationHandler()

	// 项目任务组织路由
	projects := authorized.Group("/projects/:id")
	{
		tasks := projects.Group("/tasks")
		{
			// 扫描孤立任务
			// POST /api/v1/projects/:id/tasks/scan-orphans
			tasks.POST("/scan-orphans", taskOrgHandler.ScanOrphanTasks)

			// 批量组织任务到周汇总
			// POST /api/v1/projects/:id/tasks/organize-to-weeks
			tasks.POST("/organize-to-weeks", taskOrgHandler.OrganizeTasksToWeeks)
		}
	}
}
