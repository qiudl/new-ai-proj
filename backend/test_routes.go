package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	
	requirements := r.Group("/api/v1/requirements")
	{
		// 模拟我们的路由注册
		requirements.GET("/stats", func(c *gin.Context) {})
		requirements.GET("/:id/history", func(c *gin.Context) {})
		requirements.GET("/:id/history/stats", func(c *gin.Context) {})
		requirements.GET("/:id", func(c *gin.Context) {})
		requirements.GET("/:id/tasks", func(c *gin.Context) {})
		requirements.GET("/:id/comments", func(c *gin.Context) {})
	}
	
	// 打印所有路由
	routes := r.Routes()
	for _, route := range routes {
		fmt.Printf("%s %s\n", route.Method, route.Path)
	}
}
