package routes

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

// RegisterProjectRoutes 注册项目和任务管理路由（简化版，专注于权限测试）
func RegisterProjectRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	fmt.Println("DEBUG: RegisterProjectRoutes called")
	// Projects routes with permission requirements
	projects := authorized.Group("/projects")
	{
		fmt.Println("DEBUG: Setting up project routes")
		// 基础项目管理路由
		projects.GET("", app.GetProjectsHandler())
		projects.POST("", app.CreateProjectHandler())
		projects.GET("/:id", app.GetProjectHandler())
		projects.PUT("/:id", app.UpdateProjectHandler())
		projects.DELETE("/:id", app.DeleteProjectHandler())

		// Project statistics endpoint
		projects.GET("/:id/stats", app.GetProjectStatsHandler())

		// Project user management routes
		projects.GET("/:id/users", app.GetProjectUsersHandler())
		projects.POST("/:id/users", app.AddProjectUserHandler())
		projects.DELETE("/:id/users/:userId", app.RemoveProjectUserHandler())

		// 注册简化的任务相关路由
		registerSimpleTaskRoutes(projects, app)

		// 注册任务层级路由
		registerTaskHierarchyRoutes(projects, app)
	}
}

// registerSimpleTaskRoutes 注册简化的任务管理路由
func registerSimpleTaskRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// Basic tasks routes only
	projects.GET("/:id/tasks", app.GetTasksHandler())
	projects.POST("/:id/tasks", app.CreateTaskHandler())
	projects.GET("/:id/tasks/:taskId", app.GetTaskHandler())
	projects.PUT("/:id/tasks/:taskId", app.UpdateTaskHandler())
	projects.DELETE("/:id/tasks/:taskId", app.DeleteTaskHandler())

	// Task timeline route
	projects.GET("/:id/tasks/:taskId/timeline", app.GetTaskTimelineHandler())

	// Task movement and positioning routes
	projects.POST("/:id/tasks/:taskId/move", app.MoveTaskHandler())
	projects.POST("/:id/tasks/:taskId/reorder", app.ReorderTaskHandler())
	projects.POST("/:id/tasks/bulk-reorder", app.BulkReorderTasksHandler())
}

// registerTaskHierarchyRoutes 注册任务层级路由
func registerTaskHierarchyRoutes(projects *gin.RouterGroup, app ApplicationInterface) {
	// 获取任务层级处理器
	hierarchyHandler := app.GetTaskHierarchyHandler()

	// 任务层级相关路由
	projects.GET("/:id/tasks/root", hierarchyHandler.GetRootTasks)
	projects.GET("/:id/tasks/tree", hierarchyHandler.GetTaskTree)
	projects.GET("/:id/tasks/:taskId/descendants", hierarchyHandler.GetTaskDescendants)
	projects.GET("/:id/tasks/:taskId/children", hierarchyHandler.GetTaskChildren)
}
