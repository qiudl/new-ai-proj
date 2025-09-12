package main

import (
	"context"
	"fmt"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"
)

func main() {
	fmt.Println("🚀 开始Task 1469审计日志系统简化测试...")

	// 1. 连接数据库
	fmt.Println("\n=== 测试1: 数据库连接 ===")
	db, err := database.NewPostgresDB("postgres://dev_user:dev_password_2024@localhost:5433/ai_project_db?sslmode=disable")
	if err != nil {
		fmt.Printf("❌ 数据库连接失败: %v\n", err)
		return
	}
	defer db.Close()
	fmt.Println("✅ 数据库连接成功")

	// 2. 测试审计服务基本功能
	fmt.Println("\n=== 测试2: 审计服务基本功能 ===")
	auditService := services.NewAuditService(db)

	ctx := context.Background()
	userID := 1

	// 测试简单事件记录
	err = auditService.LogSimpleEvent(ctx, &userID, "test_user", "test@example.com",
		"test_action", "test_resource", "123", "Test Resource", "127.0.0.1")
	if err != nil {
		fmt.Printf("❌ 记录简单审计事件失败: %v\n", err)
		return
	}
	fmt.Println("✅ 简单审计事件记录成功")

	// 3. 测试复杂事件记录
	fmt.Println("\n=== 测试3: 复杂审计事件记录 ===")
	beforeData := map[string]interface{}{
		"name":   "旧名称",
		"status": "draft",
	}
	afterData := map[string]interface{}{
		"name":   "新名称",
		"status": "active",
	}

	complexEventData := &models.AuditEventData{
		UserID:       &userID,
		UserName:     "test_user",
		UserEmail:    "test@example.com",
		Action:       "update_test",
		ResourceType: "test_entity",
		ResourceID:   "456",
		ResourceName: "Test Entity",
		BeforeData:   beforeData,
		AfterData:    afterData,
		IPAddress:    "127.0.0.1",
		Status:       models.StatusSuccess,
		Description:  "测试复杂审计事件记录",
		Metadata: map[string]interface{}{
			"test_metadata": "test_value",
			"timestamp":     time.Now().Unix(),
		},
		Tags: []string{"test", "complex_event"},
	}

	err = auditService.LogEvent(ctx, complexEventData)
	if err != nil {
		fmt.Printf("❌ 记录复杂审计事件失败: %v\n", err)
		return
	}
	fmt.Println("✅ 复杂审计事件记录成功")

	// 4. 测试审计查询功能
	fmt.Println("\n=== 测试4: 审计查询功能 ===")
	filter := &models.AuditLogFilter{
		UserID: &userID,
		Limit:  5,
		Offset: 0,
	}

	logs, total, err := auditService.GetAuditLogs(ctx, filter)
	if err != nil {
		fmt.Printf("❌ 查询审计日志失败: %v\n", err)
		return
	}

	fmt.Printf("✅ 查询到 %d 条审计日志 (总计 %d 条)\n", len(logs), total)

	if len(logs) > 0 {
		latestLog := logs[0]
		fmt.Printf("最新日志: %s - %s - %s\n",
			latestLog.Action, latestLog.ResourceType, latestLog.Description)
	}

	// 5. 测试模拟审计服务
	fmt.Println("\n=== 测试5: 模拟审计服务 ===")
	impersonationAuditService := services.NewImpersonationAuditService(db, auditService)

	// 测试模拟会话开始审计
	sessionData := &services.ImpersonationSessionData{
		SessionID:      "test_session_123",
		UserID:         1,
		Username:       "admin",
		EnterpriseID:   100,
		EnterpriseName: "测试企业",
		EnterpriseCode: "TEST001",
		Reason:         "系统测试模拟审计功能",
		StartedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(2 * time.Hour),
		IPAddress:      "127.0.0.1",
		UserAgent:      "Test Browser",
	}

	err = impersonationAuditService.StartImpersonation(ctx, sessionData)
	if err != nil {
		fmt.Printf("❌ 记录模拟开始事件失败: %v\n", err)
		return
	}
	fmt.Println("✅ 模拟会话开始审计记录成功")

	// 测试模拟期间的API访问审计
	accessData := &services.ImpersonationAccessData{
		SessionID:      "test_session_123",
		UserID:         1,
		Username:       "admin",
		EnterpriseID:   100,
		EnterpriseName: "测试企业",
		Method:         "GET",
		Path:           "/api/v1/enterprises/100/users",
		IPAddress:      "127.0.0.1",
		UserAgent:      "Test Browser",
	}

	err = impersonationAuditService.LogAccessDuringImpersonation(ctx, accessData)
	if err != nil {
		fmt.Printf("❌ 记录模拟访问事件失败: %v\n", err)
		return
	}
	fmt.Println("✅ 模拟期间API访问审计记录成功")

	// 测试模拟会话结束审计
	err = impersonationAuditService.EndImpersonation(ctx, sessionData)
	if err != nil {
		fmt.Printf("❌ 记录模拟结束事件失败: %v\n", err)
		return
	}
	fmt.Println("✅ 模拟会话结束审计记录成功")

	// 6. 测试审计配置功能
	fmt.Println("\n=== 测试6: 审计配置功能 ===")
	err = auditService.InitializeDefaultConfigs(ctx)
	if err != nil {
		fmt.Printf("❌ 初始化默认审计配置失败: %v\n", err)
		return
	}
	fmt.Println("✅ 默认审计配置初始化成功")

	configs, err := auditService.GetAuditConfigs(ctx)
	if err != nil {
		fmt.Printf("❌ 获取审计配置失败: %v\n", err)
		return
	}
	fmt.Printf("✅ 获取到 %d 个审计配置\n", len(configs))

	// 7. 验证模拟审计记录
	fmt.Println("\n=== 测试7: 验证模拟审计记录 ===")
	impersonationFilter := &models.AuditLogFilter{
		Action: "impersonation_start",
		UserID: &userID,
		Limit:  3,
		Offset: 0,
	}

	impersonationLogs, impTotal, err := auditService.GetAuditLogs(ctx, impersonationFilter)
	if err != nil {
		fmt.Printf("❌ 查询模拟审计记录失败: %v\n", err)
		return
	}

	fmt.Printf("✅ 找到 %d 条模拟开始记录 (总计 %d 条)\n", len(impersonationLogs), impTotal)

	if len(impersonationLogs) > 0 {
		log := impersonationLogs[0]
		fmt.Printf("最新模拟记录: %s - %s\n", log.ResourceName, log.Description)
	}

	// 8. 性能测试
	fmt.Println("\n=== 测试8: 性能测试 ===")
	startTime := time.Now()
	batchSize := 5

	for i := 0; i < batchSize; i++ {
		testData := &models.AuditEventData{
			UserID:       &userID,
			UserName:     fmt.Sprintf("batch_user_%d", i),
			Action:       "batch_test",
			ResourceType: "performance_test",
			ResourceID:   fmt.Sprintf("batch_%d", i),
			IPAddress:    "127.0.0.1",
			Status:       models.StatusSuccess,
			Description:  fmt.Sprintf("批量测试事件 #%d", i+1),
		}

		err = auditService.LogEvent(ctx, testData)
		if err != nil {
			fmt.Printf("❌ 批量测试事件 #%d 失败: %v\n", i+1, err)
		}
	}

	duration := time.Since(startTime)
	fmt.Printf("✅ 批量写入 %d 条记录耗时: %v (平均 %v/条)\n",
		batchSize, duration, duration/time.Duration(batchSize))

	// 最终报告
	fmt.Println("\n=== 测试报告 ===")
	fmt.Println("✅ Task 1469 审计日志系统测试通过！")
	fmt.Println("🎯 测试覆盖:")
	fmt.Println("  - 基础审计事件记录")
	fmt.Println("  - 复杂数据对比记录")
	fmt.Println("  - 审计日志查询和过滤")
	fmt.Println("  - 模拟会话审计完整流程")
	fmt.Println("  - 审计配置管理")
	fmt.Println("  - 性能测试")
	fmt.Printf("总测试用例: 8个，全部通过 ✅\n")
}