package main

import (
	"ai-project-backend/application"
	"ai-project-backend/routes"
	"log"
	"net/http"
	"os"
)

func main() {
	log.Println("🚀 启动AI项目后端服务...")

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
