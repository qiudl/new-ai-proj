package routes

import (
	"github.com/gin-gonic/gin"
)

// RegisterTimerRoutes 注册计时器相关路由
func RegisterTimerRoutes(authorized *gin.RouterGroup, app ApplicationInterface) {
	// 获取计时器处理器
	timerHandler := app.GetUnifiedTimerHandler()
	
	// 用户计时器路由
	user := authorized.Group("/user")
	{
		timer := user.Group("/timer")
		{
			timer.GET("/current", timerHandler.GetCurrentTimer)
			timer.POST("/start", timerHandler.StartTimer)
			timer.POST("/stop", timerHandler.StopTimer)
		}
	}
}
