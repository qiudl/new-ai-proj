package routes

import (
	"ai-project-backend/handlers"
	"database/sql"
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// SetupCollaborationWebSocketRoutes 设置协作WebSocket路由
func SetupCollaborationWebSocketRoutes(router *gin.Engine, app ApplicationInterface) {
	// 获取底层的数据库连接
	dbInstance := app.GetDB().GetDB()

	var gormDB *gorm.DB
	var err error

	// 尝试直接获取gorm.DB
	if gdb, ok := dbInstance.(*gorm.DB); ok {
		gormDB = gdb
		log.Println("✅ WebSocket: Found *gorm.DB instance")
	} else if sqlDB, ok := dbInstance.(*sql.DB); ok {
		// 从sql.DB创建gorm.DB
		log.Println("✅ WebSocket: Converting *sql.DB to *gorm.DB")
		gormDB, err = gorm.Open(postgres.New(postgres.Config{
			Conn: sqlDB,
		}), &gorm.Config{})
		if err != nil {
			log.Printf("⚠️  WebSocket collaboration routes skipped: Failed to create GORM instance: %v", err)
			return
		}
	} else {
		log.Printf("⚠️  WebSocket collaboration routes skipped: Unsupported DB type: %T", dbInstance)
		return
	}

	// 创建WebSocket handler
	wsHandler := handlers.NewCollaborationWebSocketHandler(gormDB)

	// WebSocket路由 - 不需要认证中间件（通过query参数传递token）
	ws := router.Group("/ws")
	{
		// 实时协作WebSocket连接
		// GET /ws/collaboration/:document_id?room=<field_name>&userId=<id>&userName=<name>&token=<jwt>
		ws.GET("/collaboration/:document_id", wsHandler.HandleCollaborationWebSocket)
	}

	log.Println("✅ WebSocket collaboration routes registered: /ws/collaboration/:document_id")
}
