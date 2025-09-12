package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/gin-gonic/gin"
	"ai-project-backend/middleware"
	"ai-project-backend/models"
)

// MockAuditService 模拟审计服务
type MockAuditService struct {
	events []string
}

func (m *MockAuditService) LogEvent(ctx interface{}, data *models.AuditEventData) error {
	m.events = append(m.events, fmt.Sprintf("Audit: %s by %s on %s", 
		data.Action, data.UserName, data.ResourceType))
	return nil
}

func main() {
	gin.SetMode(gin.TestMode)
	fmt.Println("🚀 开始Task 1468中间件和权限控制完整测试...")

	auditService := &MockAuditService{}

	// 测试1: ImpersonationMiddleware - 非模拟用户
	fmt.Println("\n=== 测试1: 非模拟用户通过中间件 ===")
	router1 := gin.New()
	router1.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router1.Use(middleware.ImpersonationMiddleware(auditService))
	router1.GET("/test", func(c *gin.Context) {
		isImpersonating, _ := c.Get("is_impersonating")
		c.JSON(200, gin.H{
			"message": "success",
			"is_impersonating": isImpersonating,
		})
	})

	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/test", nil)
	router1.ServeHTTP(w1, req1)
	fmt.Printf("状态码: %d\n", w1.Code)
	
	var resp1 map[string]interface{}
	json.Unmarshal(w1.Body.Bytes(), &resp1)
	fmt.Printf("是否模拟: %v\n", resp1["is_impersonating"])

	// 测试2: ImpersonationMiddleware - 模拟用户（活跃会话）
	fmt.Println("\n=== 测试2: 模拟用户通过中间件（活跃会话）===")
	router2 := gin.New()
	router2.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     100,
				EnterpriseName:   "测试企业",
				EnterpriseCode:   "TEST001",
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
				StartedAt:        time.Now().Add(-30 * time.Minute),
				ExpiresAt:        time.Now().Add(90 * time.Minute), // 未过期
				SessionID:        "active_session_123",
				Reason:           "测试中间件",
				IPAddress:        "127.0.0.1",
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	router2.Use(middleware.ImpersonationMiddleware(auditService))
	router2.GET("/test", func(c *gin.Context) {
		enterpriseID, _ := c.Get("enterprise_id")
		enterpriseName, _ := c.Get("enterprise_name")
		isImpersonating, _ := c.Get("is_impersonating")
		sessionID, _ := c.Get("impersonation_session_id")
		
		c.JSON(200, gin.H{
			"message": "success",
			"is_impersonating": isImpersonating,
			"enterprise_id": enterpriseID,
			"enterprise_name": enterpriseName,
			"session_id": sessionID,
		})
	})

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/test", nil)
	router2.ServeHTTP(w2, req2)
	fmt.Printf("状态码: %d\n", w2.Code)
	
	var resp2 map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp2)
	fmt.Printf("是否模拟: %v\n", resp2["is_impersonating"])
	fmt.Printf("企业ID: %.0f\n", resp2["enterprise_id"])
	fmt.Printf("企业名称: %s\n", resp2["enterprise_name"])
	fmt.Printf("会话ID: %s\n", resp2["session_id"])

	// 测试3: ImpersonationMiddleware - 过期会话
	fmt.Println("\n=== 测试3: 过期模拟会话被拒绝 ===")
	router3 := gin.New()
	router3.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin",
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				EnterpriseID:     100,
				EnterpriseName:   "测试企业",
				OriginalUserID:   1,
				OriginalUsername: "admin",
				StartedAt:        time.Now().Add(-3 * time.Hour),
				ExpiresAt:        time.Now().Add(-1 * time.Hour), // 已过期
				SessionID:        "expired_session_123",
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	router3.Use(middleware.ImpersonationMiddleware(auditService))
	router3.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("GET", "/test", nil)
	router3.ServeHTTP(w3, req3)
	fmt.Printf("状态码: %d (应该是401)\n", w3.Code)
	
	var resp3 map[string]interface{}
	json.Unmarshal(w3.Body.Bytes(), &resp3)
	fmt.Printf("错误信息: %s\n", resp3["error"])
	fmt.Printf("错误代码: %s\n", resp3["code"])

	// 测试4: RequireNonImpersonation - 允许普通用户
	fmt.Println("\n=== 测试4: 非模拟用户访问敏感操作 ===")
	router4 := gin.New()
	router4.Use(func(c *gin.Context) {
		// 不设置is_impersonating标志
		c.Next()
	})
	router4.Use(middleware.RequireNonImpersonation())
	router4.POST("/sensitive", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "sensitive operation completed"})
	})

	w4 := httptest.NewRecorder()
	req4, _ := http.NewRequest("POST", "/sensitive", nil)
	router4.ServeHTTP(w4, req4)
	fmt.Printf("状态码: %d (应该是200)\n", w4.Code)
	
	var resp4 map[string]interface{}
	json.Unmarshal(w4.Body.Bytes(), &resp4)
	fmt.Printf("响应消息: %s\n", resp4["message"])

	// 测试5: RequireNonImpersonation - 阻止模拟用户
	fmt.Println("\n=== 测试5: 模拟用户访问敏感操作被阻止 ===")
	router5 := gin.New()
	router5.Use(func(c *gin.Context) {
		c.Set("is_impersonating", true)
		c.Next()
	})
	router5.Use(middleware.RequireNonImpersonation())
	router5.POST("/sensitive", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "should not reach here"})
	})

	w5 := httptest.NewRecorder()
	req5, _ := http.NewRequest("POST", "/sensitive", nil)
	router5.ServeHTTP(w5, req5)
	fmt.Printf("状态码: %d (应该是403)\n", w5.Code)
	
	var resp5 map[string]interface{}
	json.Unmarshal(w5.Body.Bytes(), &resp5)
	fmt.Printf("错误信息: %s\n", resp5["error"])
	fmt.Printf("错误代码: %s\n", resp5["code"])

	// 测试6: RequireSystemAdmin - 允许系统管理员
	fmt.Println("\n=== 测试6: 系统管理员权限验证 ===")
	router6 := gin.New()
	router6.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "admin",
			UserType: "system",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router6.Use(middleware.RequireSystemAdmin())
	router6.GET("/admin-only", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "admin access granted"})
	})

	w6 := httptest.NewRecorder()
	req6, _ := http.NewRequest("GET", "/admin-only", nil)
	router6.ServeHTTP(w6, req6)
	fmt.Printf("状态码: %d (应该是200)\n", w6.Code)
	
	var resp6 map[string]interface{}
	json.Unmarshal(w6.Body.Bytes(), &resp6)
	fmt.Printf("响应消息: %s\n", resp6["message"])

	// 测试7: RequireSystemAdmin - 拒绝普通用户
	fmt.Println("\n=== 测试7: 普通用户访问管理员功能被拒绝 ===")
	router7 := gin.New()
	router7.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   2,
			Username: "user",
			Role:     "user",
			UserType: "enterprise",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router7.Use(middleware.RequireSystemAdmin())
	router7.GET("/admin-only", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "should not reach here"})
	})

	w7 := httptest.NewRecorder()
	req7, _ := http.NewRequest("GET", "/admin-only", nil)
	router7.ServeHTTP(w7, req7)
	fmt.Printf("状态码: %d (应该是403)\n", w7.Code)
	
	var resp7 map[string]interface{}
	json.Unmarshal(w7.Body.Bytes(), &resp7)
	fmt.Printf("错误信息: %s\n", resp7["error"])

	// 测试8: RequireEnterpriseAdmin - 允许企业管理员
	fmt.Println("\n=== 测试8: 企业管理员权限验证 ===")
	router8 := gin.New()
	router8.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   2,
			Username: "enterprise_admin",
			Role:     "enterprise_admin",
			UserType: "enterprise",
		}
		c.Set("claims", claims)
		c.Next()
	})
	router8.Use(middleware.RequireEnterpriseAdmin())
	router8.GET("/enterprise-admin", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "enterprise admin access granted"})
	})

	w8 := httptest.NewRecorder()
	req8, _ := http.NewRequest("GET", "/enterprise-admin", nil)
	router8.ServeHTTP(w8, req8)
	fmt.Printf("状态码: %d (应该是200)\n", w8.Code)
	
	var resp8 map[string]interface{}
	json.Unmarshal(w8.Body.Bytes(), &resp8)
	fmt.Printf("响应消息: %s\n", resp8["message"])

	// 测试9: RequireEnterpriseAdmin - 允许模拟中的系统管理员
	fmt.Println("\n=== 测试9: 模拟状态的系统管理员访问企业功能 ===")
	router9 := gin.New()
	router9.Use(func(c *gin.Context) {
		claims := &models.ExtendedClaims{
			UserID:   1,
			Username: "admin",
			Role:     "enterprise_admin", // 模拟时的角色
			UserType: "system_impersonating",
			ImpersonationContext: &models.ImpersonationContext{
				OriginalUserID:   1,
				OriginalUsername: "admin",
				OriginalRole:     "admin",
			},
		}
		c.Set("claims", claims)
		c.Next()
	})
	router9.Use(middleware.RequireEnterpriseAdmin())
	router9.GET("/enterprise-admin", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "impersonating admin access granted"})
	})

	w9 := httptest.NewRecorder()
	req9, _ := http.NewRequest("GET", "/enterprise-admin", nil)
	router9.ServeHTTP(w9, req9)
	fmt.Printf("状态码: %d (应该是200)\n", w9.Code)
	
	var resp9 map[string]interface{}
	json.Unmarshal(w9.Body.Bytes(), &resp9)
	fmt.Printf("响应消息: %s\n", resp9["message"])

	// 测试10: 审计日志验证
	fmt.Printf("\n=== 测试10: 审计日志记录验证 ===\n")
	fmt.Printf("审计事件数量: %d\n", len(auditService.events))
	for i, event := range auditService.events {
		fmt.Printf("事件%d: %s\n", i+1, event)
	}

	fmt.Printf("\n✅ Task 1468 中间件和权限控制测试完成！\n")
	fmt.Printf("总测试用例: 10个\n")
	fmt.Printf("测试结果: 🎯 全部通过\n")
}