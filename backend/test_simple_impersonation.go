package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/handlers"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

// SimpleEnterpriseService 简单企业服务
type SimpleEnterpriseService struct{}

func (s *SimpleEnterpriseService) GetEnterpriseByID(ctx context.Context, id int) (*models.Enterprise, error) {
	return &models.Enterprise{
		ID:   id,
		Name: "测试企业",
		Code: "TEST001",
		Status: "active",
	}, nil
}

// SimpleAuditService 简单审计服务
type SimpleAuditService struct{}

func (s *SimpleAuditService) LogEvent(ctx context.Context, data *models.AuditEventData) error {
	fmt.Printf("审计日志: %s 用户 %s 执行了操作 %s 在资源 %s\n", 
		data.Action, data.UserName, data.Action, data.ResourceType)
	return nil
}

func main() {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// 创建服务
	tokenService := services.NewTokenService(
		[]byte("test-secret-key"),
		24*3600,
		2*3600,
	)
	
	enterpriseService := &SimpleEnterpriseService{}
	auditService := &SimpleAuditService{}

	// 创建处理器
	impersonationHandler := handlers.NewImpersonationHandler(
		tokenService,
		enterpriseService,
		auditService,
	)

	// 创建路由
	api := router.Group("/api/v1")
	
	// 模拟认证中间件
	api.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		c.Next()
	})

	admin := api.Group("/admin")
	admin.Use(middleware.RequireSystemAdmin())

	impersonate := admin.Group("/impersonate")
	{
		impersonate.POST("/enterprise/:id", 
			middleware.RequireNonImpersonation(),
			impersonationHandler.StartImpersonation)
		impersonate.POST("/exit", impersonationHandler.ExitImpersonation)
		impersonate.GET("/status", impersonationHandler.GetImpersonationStatus)
		impersonate.GET("/history", impersonationHandler.GetImpersonationHistory)
	}

	fmt.Println("🚀 开始测试企业模拟API...")

	// 测试1: 获取模拟状态
	fmt.Println("\n=== 测试1: 获取模拟状态 ===")
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/api/v1/admin/impersonate/status", nil)
	router.ServeHTTP(w1, req1)
	fmt.Printf("状态码: %d\n", w1.Code)
	
	var response1 map[string]interface{}
	json.Unmarshal(w1.Body.Bytes(), &response1)
	fmt.Printf("是否正在模拟: %v\n", response1["is_impersonating"])

	// 测试2: 开始模拟
	fmt.Println("\n=== 测试2: 开始模拟企业 ===")
	requestBody := map[string]string{
		"reason": "测试系统模拟功能，验证企业权限管理",
	}
	jsonData, _ := json.Marshal(requestBody)

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/api/v1/admin/impersonate/enterprise/1", bytes.NewBuffer(jsonData))
	req2.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w2, req2)
	fmt.Printf("状态码: %d\n", w2.Code)
	
	var response2 map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &response2)
	if w2.Code == 200 {
		fmt.Printf("模拟成功: %s\n", response2["message"])
		if enterprise, ok := response2["enterprise"].(map[string]interface{}); ok {
			fmt.Printf("目标企业: %s (ID: %.0f)\n", enterprise["name"], enterprise["id"])
		}
		token := response2["token"].(string)
		fmt.Printf("获得新Token: %s...\n", token[:50])
	} else {
		fmt.Printf("模拟失败: %v\n", response2["error"])
	}

	// 测试3: 获取历史记录
	fmt.Println("\n=== 测试3: 获取模拟历史 ===")
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("GET", "/api/v1/admin/impersonate/history?page=1&page_size=5", nil)
	router.ServeHTTP(w3, req3)
	fmt.Printf("状态码: %d\n", w3.Code)
	
	var response3 map[string]interface{}
	json.Unmarshal(w3.Body.Bytes(), &response3)
	if data, ok := response3["data"].([]interface{}); ok {
		fmt.Printf("历史记录数量: %d\n", len(data))
		if len(data) > 0 {
			firstRecord := data[0].(map[string]interface{})
			fmt.Printf("最近记录: %s 在 %s 模拟了企业 %s\n", 
				firstRecord["username"], 
				firstRecord["started_at"], 
				firstRecord["enterprise_name"])
		}
	}

	// 测试4: 测试模拟状态下的退出 (创建新的模拟状态)
	fmt.Println("\n=== 测试4: 测试退出模拟 ===")
	router2 := gin.New()
	api2 := router2.Group("/api/v1")
	
	// 模拟处于模拟状态的认证中间件
	api2.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     1,
				EnterpriseName:   "测试企业",
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

	admin2 := api2.Group("/admin")
	impersonate2 := admin2.Group("/impersonate")
	impersonate2.POST("/exit", impersonationHandler.ExitImpersonation)

	w4 := httptest.NewRecorder()
	req4, _ := http.NewRequest("POST", "/api/v1/admin/impersonate/exit", nil)
	router2.ServeHTTP(w4, req4)
	fmt.Printf("状态码: %d\n", w4.Code)
	
	var response4 map[string]interface{}
	json.Unmarshal(w4.Body.Bytes(), &response4)
	if w4.Code == 200 {
		fmt.Printf("退出成功: %s\n", response4["message"])
		if originalUser, ok := response4["original_user"].(map[string]interface{}); ok {
			fmt.Printf("恢复到原始用户: %s (ID: %.0f)\n", originalUser["username"], originalUser["id"])
		}
	} else {
		fmt.Printf("退出失败: %v\n", response4["error"])
	}

	// 测试5: 权限验证 - 非管理员尝试模拟
	fmt.Println("\n=== 测试5: 权限验证测试 ===")
	router3 := gin.New()
	api3 := router3.Group("/api/v1")
	
	// 模拟普通用户
	api3.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   2,
			Username: "regular_user",
			Role:     "user",
			UserType: "enterprise",
		}
		c.Set("claims", claims)
		c.Next()
	})

	admin3 := api3.Group("/admin")
	admin3.Use(middleware.RequireSystemAdmin())
	impersonate3 := admin3.Group("/impersonate")
	impersonate3.POST("/enterprise/:id", impersonationHandler.StartImpersonation)

	w5 := httptest.NewRecorder()
	req5, _ := http.NewRequest("POST", "/api/v1/admin/impersonate/enterprise/1", bytes.NewBuffer(jsonData))
	req5.Header.Set("Content-Type", "application/json")
	router3.ServeHTTP(w5, req5)
	fmt.Printf("状态码: %d (应该是403 Forbidden)\n", w5.Code)
	
	var response5 map[string]interface{}
	json.Unmarshal(w5.Body.Bytes(), &response5)
	fmt.Printf("错误信息: %s\n", response5["error"])

	fmt.Println("\n✅ 所有测试完成！")
}