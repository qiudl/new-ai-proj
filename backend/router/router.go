package router

import (
	"database/sql"
	"net/http"
	"log"
)

// Router 主路由器结构
type Router struct {
	mux *http.ServeMux
	db  *sql.DB
}

// New 创建新的路由器实例
func New(db *sql.DB) *Router {
	return &Router{
		mux: http.NewServeMux(),
		db:  db,
	}
}

// Setup 配置所有路由
func (r *Router) Setup() *http.ServeMux {
	// 静态文件服务
	r.mux.Handle("/", http.FileServer(http.Dir("./frontend/dist/")))

	// 设置API路由
	r.setupAPIRoutes()

	return r.mux
}

// setupAPIRoutes 设置所有API路由
func (r *Router) setupAPIRoutes() {
	log.Println("正在设置API路由...")
	
	// 项目相关路由
	r.setupProjectRoutes()
	
	// 任务相关路由  
	r.setupTaskRoutes()
	
	// 全局路由
	r.setupGlobalRoutes()
	
	log.Println("API路由设置完成")
}

// setupProjectRoutes 设置项目路由
func (r *Router) setupProjectRoutes() {
	projectRoutes := NewProjectRoutes(r.db)
	
	r.mux.HandleFunc("/api/projects", r.withMiddleware(projectRoutes.HandleProjects))
	r.mux.HandleFunc("/api/projects/", r.withMiddleware(projectRoutes.HandleProject))
}

// setupTaskRoutes 设置任务路由
func (r *Router) setupTaskRoutes() {
	taskRoutes := NewTaskRoutes(r.db)
	
	r.mux.HandleFunc("/api/tasks", r.withMiddleware(taskRoutes.HandleTasks))
	r.mux.HandleFunc("/api/tasks/", r.withMiddleware(taskRoutes.HandleTask))
	r.mux.HandleFunc("/api/subtasks", r.withMiddleware(taskRoutes.HandleSubTasks))
}

// setupGlobalRoutes 设置全局路由
func (r *Router) setupGlobalRoutes() {
	globalRoutes := NewGlobalRoutes(r.db)
	
	r.mux.HandleFunc("/api/global-tasks", r.withMiddleware(globalRoutes.HandleGlobalTasks))
}

// withMiddleware 应用中间件
func (r *Router) withMiddleware(handler http.HandlerFunc) http.HandlerFunc {
	return r.corsMiddleware(r.loggingMiddleware(handler))
}

// corsMiddleware CORS中间件
func (r *Router) corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if req.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, req)
	}
}

// loggingMiddleware 日志中间件
func (r *Router) loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		log.Printf("%s %s", req.Method, req.URL.Path)
		next(w, req)
	}
}
