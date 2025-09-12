package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/models"
	"ai-project-backend/routes"
)

func main() {
	// 设置测试模式
	gin.SetMode(gin.TestMode)

	// 创建路由器
	router := gin.New()

	// 创建模拟的应用服务
	app := &MockApplication{}

	// 创建API路由组（模拟认证中间件）
	api := router.Group("/api/v1")
	authorized := api.Group("")
	authorized.Use(func(c *gin.Context) {
		// 模拟系统管理员身份
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		c.Next()
	})

	// 注册模拟路由
	routes.RegisterImpersonationRoutes(authorized, app)

	// 测试1: 获取模拟状态 (非模拟状态)
	fmt.Println("=== 测试1: 获取模拟状态 (非模拟状态) ===")
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/api/v1/admin/impersonate/status", nil)
	router.ServeHTTP(w1, req1)
	fmt.Printf("状态码: %d\n", w1.Code)
	fmt.Printf("响应: %s\n\n", w1.Body.String())

	// 测试2: 开始模拟企业
	fmt.Println("=== 测试2: 开始模拟企业 ===")
	requestBody := map[string]string{
		"reason": "测试系统模拟功能，用于验证企业管理界面和权限控制",
	}
	jsonData, _ := json.Marshal(requestBody)

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/api/v1/admin/impersonate/enterprise/1", bytes.NewBuffer(jsonData))
	req2.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w2, req2)
	fmt.Printf("状态码: %d\n", w2.Code)
	fmt.Printf("响应: %s\n\n", w2.Body.String())

	// 测试3: 获取模拟历史
	fmt.Println("=== 测试3: 获取模拟历史 ===")
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("GET", "/api/v1/admin/impersonate/history?page=1&page_size=5", nil)
	router.ServeHTTP(w3, req3)
	fmt.Printf("状态码: %d\n", w3.Code)
	fmt.Printf("响应: %s\n\n", w3.Body.String())

	// 测试4: 测试带过滤条件的历史查询
	fmt.Println("=== 测试4: 测试带过滤条件的历史查询 ===")
	w4 := httptest.NewRecorder()
	req4, _ := http.NewRequest("GET", "/api/v1/admin/impersonate/history?user_id=1&action=start", nil)
	router.ServeHTTP(w4, req4)
	fmt.Printf("状态码: %d\n", w4.Code)
	fmt.Printf("响应: %s\n\n", w4.Body.String())

	// 测试5: 测试模拟状态下的退出
	fmt.Println("=== 测试5: 模拟退出功能 (使用模拟Token) ===")
	// 创建模拟中的Claims
	router2 := gin.New()
	authorized2 := router2.Group("/api/v1").Group("")
	authorized2.Use(func(c *gin.Context) {
		// 模拟处于模拟状态的Claims
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     1,
				EnterpriseName:   "Test Enterprise",
				EnterpriseCode:   "TEST001",
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
				StartedAt:        time.Now().Add(-30 * time.Minute),
				ExpiresAt:        time.Now().Add(90 * time.Minute),
				SessionID:        "test_session_123",
				Reason:           "测试模拟功能",
				IPAddress:        "127.0.0.1",
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	routes.RegisterImpersonationRoutes(authorized2, app)

	w5 := httptest.NewRecorder()
	req5, _ := http.NewRequest("POST", "/api/v1/admin/impersonate/exit", nil)
	router2.ServeHTTP(w5, req5)
	fmt.Printf("状态码: %d\n", w5.Code)
	fmt.Printf("响应: %s\n\n", w5.Body.String())

	fmt.Println("=== 所有测试完成 ===")
}

// MockApplication 模拟应用程序接口
type MockApplication struct{}

func (m *MockApplication) GetConfig() interface{} { return nil }
func (m *MockApplication) GetDB() interface{} { return nil }
func (m *MockApplication) GetJWTManager() interface{} { return nil }
func (m *MockApplication) GetAuthHandler() interface{} { return nil }
func (m *MockApplication) GetHealthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	}
}
func (m *MockApplication) GetVersionHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{"version": "1.0.0"})
	}
}
func (m *MockApplication) GetLoginHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetLogoutHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetQuickDevLoginHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetProjectsHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) CreateProjectHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetProjectHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) UpdateProjectHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) DeleteProjectHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetProjectStatsHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetProjectUsersHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) AddProjectUserHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) RemoveProjectUserHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetTasksHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) CreateTaskHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetTaskHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) UpdateTaskHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) DeleteTaskHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) MoveTaskHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) ReorderTaskHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) BulkReorderTasksHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) BulkDeleteTasksHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetAllTasksHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) CreateGlobalTaskHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetTaskByIdHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) GetTaskDetailedInfoHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) DeleteTaskByIdHandler() gin.HandlerFunc { return nil }
func (m *MockApplication) DevQuickLoginHandler() gin.HandlerFunc { return nil }