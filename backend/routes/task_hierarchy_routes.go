package routes

import (
	"ai-project-backend/handlers"
	"github.com/gin-gonic/gin"
)

// RegisterTaskHierarchyRoutes 注册任务层级结构相关路由（使用ltree）
func RegisterTaskHierarchyRoutes(authorized *gin.RouterGroup, hierarchyHandler *handlers.TaskLTreeHierarchyHandler) {
	// 任务层级查询路由
	hierarchy := authorized.Group("/hierarchy")
	{
		// 获取任务祖先
		hierarchy.GET("/tasks/:taskId/ancestors", hierarchyHandler.GetTaskAncestors)
		
		// 获取任务后代
		hierarchy.GET("/tasks/:taskId/descendants", hierarchyHandler.GetTaskDescendants)
		
		// 获取任务的直接子任务（ltree优化版本）
		hierarchy.GET("/tasks/:taskId/children", hierarchyHandler.GetTaskChildren)
		
		// 移动任务
		hierarchy.PUT("/tasks/:taskId/move", hierarchyHandler.MoveTask)
		
		// 按深度获取任务
		hierarchy.GET("/projects/:projectId/tasks/depth", hierarchyHandler.GetTasksByDepth)
		
		// 按路径模式查找任务
		hierarchy.GET("/projects/:projectId/tasks/pattern", hierarchyHandler.FindTasksByPattern)
		
		// 获取项目层级统计
		hierarchy.GET("/projects/:projectId/stats", hierarchyHandler.GetHierarchyStats)
		
		// 管理员功能：刷新任务路径
		hierarchy.POST("/admin/refresh-paths", hierarchyHandler.RefreshTaskPaths)
	}
}
