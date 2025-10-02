package main

import (
	"ai-project-backend/application"
	"ai-project-backend/routes"
	"log"
	"net/http"
	"os"
)

// @title			AI Project Backend API
// @version		1.0
// @description	AI项目管理后端API服务，提供项目管理、任务管理、文档生成等功能
// @termsOfService	http://swagger.io/terms/

// @contact.name	API Support
// @contact.url	http://www.swagger.io/support
// @contact.email	support@swagger.io

// @license.name	Apache 2.0
// @license.url	http://www.apache.org/licenses/LICENSE-2.0.html

// @host		localhost:8080
// @BasePath	/api/v1

// @securityDefinitions.apikey	BearerAuth
// @in							header
// @name						Authorization
// @description				Type "Bearer" followed by a space and JWT token.

func main() {

	// 创建应用程序实例
	app, err := application.NewApplication()
	if err != nil {
		log.Fatalf("❌ 应用程序初始化失败: %v", err)
	}
	defer app.Close()

	// 设置路由
	router := routes.SetupRouter(app)

	// 获取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // 默认端口
	}

	log.Printf("✅ 服务启动成功，监听端口 %s", port)
	log.Printf("🔗 健康检查: http://localhost:%s/health", port)
	log.Printf("🔗 认证API: http://localhost:%s/api/v1/auth/login", port)
	log.Printf("🔗 API文档: http://localhost:%s/docs", port)

	// 启动服务器
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatalf("❌ 服务启动失败: %v", err)
	}
}
