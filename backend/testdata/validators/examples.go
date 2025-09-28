package main

import (
	"context"
	"fmt"
	"log"
	"time"
)

// User 用户模型示例
type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Age      int    `json:"age"`
	Status   string `json:"status"`
	Birthday string `json:"birthday"`
}

// ExampleBasicValidation 基础验证示例
func ExampleBasicValidation() {
	fmt.Println("=== 基础验证示例 ===")
	
	// 创建测试用户数据
	user := &User{
		ID:       1,
		Username: "",  // 空用户名，应该验证失败
		Email:    "invalid-email", // 无效邮箱，应该验证失败
		Age:      15,  // 年龄过小，应该验证失败
		Status:   "unknown", // 无效状态，应该验证失败
		Birthday: "2023-13-40", // 无效日期，应该验证失败
	}
	
	// 创建验证规则
	rules := []IValidationRule{
		// 必填字段验证
		CreateRequiredRule("req_001", "必填字段验证", []string{"username", "email"}),
		
		// 长度验证
		CreateLengthRule("len_001", "用户名长度验证", "username").SetMin(3).SetMax(20),
		
		// 数值范围验证
		CreateRangeRule("range_001", "年龄范围验证", "age").SetMin(18).SetMax(100),
		
		// 枚举验证
		CreateEnumRule("enum_001", "状态枚举验证", "status", []interface{}{"active", "inactive", "pending"}),
		
		// 日期验证
		CreateDateRule("date_001", "生日格式验证", "birthday", "2006-01-02").
			SetAfter(time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)).
			SetBefore(time.Now()),
	}
	
	// 邮箱验证（可能出错的规则，需要错误处理）
	if emailRule, err := CreateEmailRule("email_001", "邮箱格式验证", "email"); err == nil {
		rules = append(rules, emailRule)
	}
	
	// 创建验证引擎
	config := NewValidationConfig()
	config.FailFast = false // 不要快速失败，收集所有错误
	
	engine := CreateEngine(config)
	
	// 注册规则到引擎
	for _, rule := range rules {
		engine.RegisterRule(rule)
	}
	
	// 启动引擎
	if err := engine.Start(); err != nil {
		fmt.Printf("启动验证引擎失败: %v\n", err)
		return
	}
	defer engine.Stop()
	
	// 执行验证
	result := engine.Validate(context.Background(), user)
	
	// 输出结果
	fmt.Printf("验证结果: %s\n", result.String())
	fmt.Printf("验证通过: %t\n", result.IsValid())
	fmt.Printf("错误数量: %d\n", result.GetErrorCount())
	fmt.Printf("警告数量: %d\n", result.GetWarningCount())
	
	// 输出详细错误信息
	if !result.IsValid() {
		fmt.Println("\n错误详情:")
		for _, err := range result.GetErrors() {
			fmt.Printf("- 字段 '%s': %s [%s]\n", err.Field, err.Message, err.Code)
		}
	}
	
	fmt.Println()
}

// ExamplePipelineValidation 验证管道示例
func ExamplePipelineValidation() {
	fmt.Println("=== 验证管道示例 ===")
	
	// 创建测试数据
	user := &User{
		ID:       2,
		Username: "john_doe",
		Email:    "john@example.com",
		Age:      25,
		Status:   "active",
		Birthday: "1998-05-15",
	}
	
	// 创建验证管道
	pipeline := CreatePipeline("user_validation", "用户验证管道")
	pipeline.SetDescription("多阶段用户数据验证")
	
	// 第一阶段：基础字段验证
	stage1 := NewValidationStage("basic_validation", "基础验证", 1)
	stage1.SetDescription("验证基础必填字段和格式")
	
	// 添加基础验证规则到第一阶段
	stage1.AddRule(CreateRequiredRule("req_basic", "基础必填字段", []string{"username", "email"}))
	
	if emailRule, err := CreateEmailRule("email_basic", "邮箱格式", "email"); err == nil {
		stage1.AddRule(emailRule)
	}
	
	pipeline.AddStage(stage1)
	
	// 第二阶段：业务逻辑验证
	stage2 := NewValidationStage("business_validation", "业务验证", 2)
	stage2.SetDescription("验证业务逻辑规则")
	
	// 添加业务规则到第二阶段
	stage2.AddRule(CreateLengthRule("len_username", "用户名长度", "username").SetMin(3).SetMax(20))
	stage2.AddRule(CreateRangeRule("range_age", "年龄范围", "age").SetMin(18).SetMax(120))
	stage2.AddRule(CreateEnumRule("enum_status", "用户状态", "status", []interface{}{"active", "inactive", "pending"}))
	
	pipeline.AddStage(stage2)
	
	// 第三阶段：自定义业务验证
	stage3 := NewValidationStage("custom_validation", "自定义验证", 3)
	stage3.SetDescription("自定义业务验证规则")
	
	// 添加自定义验证规则
	customRule := CreateCustomRule("custom_username", "用户名唯一性验证", func(ctx IValidationContext, result *ValidationResult) error {
		username := ctx.GetValue("username")
		if username == "admin" || username == "root" {
			result.AddError(ValidationError{
				Field:     "username",
				Message:   "用户名不能使用系统保留字",
				Type:      ErrorTypeBusiness,
				Severity:  ErrorSeverityHigh,
				Code:      "RESERVED_USERNAME",
				Timestamp: time.Now(),
			})
		}
		return nil
	})
	
	stage3.AddRule(customRule)
	pipeline.AddStage(stage3)
	
	// 设置回调函数
	pipeline.SetOnStart(func() {
		fmt.Println("验证管道开始执行...")
	})
	
	pipeline.SetOnComplete(func(result *ValidationResult) {
		fmt.Printf("验证管道执行完成，结果: %s\n", result.GetSummary().String())
	})
	
	pipeline.SetOnError(func(err error) {
		fmt.Printf("验证管道执行出错: %v\n", err)
	})
	
	// 执行验证管道
	result := pipeline.Execute(context.Background(), user)
	
	// 输出结果
	fmt.Printf("管道验证结果: %t\n", result.IsValid())
	fmt.Printf("管道执行统计: %+v\n", pipeline.GetStats())
	
	fmt.Println()
}

// ExampleConcurrentValidation 并发验证示例
func ExampleConcurrentValidation() {
	fmt.Println("=== 并发验证示例 ===")
	
	// 创建多个测试用户
	users := []*User{
		{ID: 1, Username: "user1", Email: "user1@example.com", Age: 25, Status: "active", Birthday: "1998-01-01"},
		{ID: 2, Username: "user2", Email: "user2@example.com", Age: 30, Status: "inactive", Birthday: "1993-02-02"},
		{ID: 3, Username: "", Email: "invalid-email", Age: 15, Status: "unknown", Birthday: "invalid-date"},
		{ID: 4, Username: "user4", Email: "user4@example.com", Age: 45, Status: "pending", Birthday: "1978-03-03"},
	}
	
	// 创建验证引擎，启用并发验证
	config := NewValidationConfig()
	config.MaxConcurrency = 4
	config.FailFast = false
	
	engine := CreateEngine(config)
	
	// 注册验证规则
	rules := []IValidationRule{
		CreateRequiredRule("req_concurrent", "必填字段", []string{"username", "email"}),
		CreateLengthRule("len_concurrent", "用户名长度", "username").SetMin(3).SetMax(20),
		CreateRangeRule("range_concurrent", "年龄范围", "age").SetMin(18).SetMax(100),
		CreateEnumRule("enum_concurrent", "状态枚举", "status", []interface{}{"active", "inactive", "pending"}),
		CreateDateRule("date_concurrent", "生日格式", "birthday", "2006-01-02"),
	}
	
	if emailRule, err := CreateEmailRule("email_concurrent", "邮箱格式", "email"); err == nil {
		rules = append(rules, emailRule)
	}
	
	for _, rule := range rules {
		engine.RegisterRule(rule)
	}
	
	// 启动引擎
	if err := engine.Start(); err != nil {
		log.Printf("启动验证引擎失败: %v", err)
		return
	}
	defer engine.Stop()
	
	// 并发验证所有用户
	fmt.Printf("开始并发验证 %d 个用户...\n", len(users))
	
	results := make([]*ValidationResult, len(users))
	ctx := context.Background()
	
	start := time.Now()
	
	// 提交验证任务
	for i, user := range users {
		result := engine.Validate(ctx, user)
		if validationResult, ok := result.(*ValidationResult); ok {
			results[i] = validationResult
		} else {
			// 如果类型断言失败，创建一个空的结果
			results[i] = &ValidationResult{}
		}
	}
	
	duration := time.Since(start)
	
	// 输出结果统计
	validCount := 0
	totalErrors := 0
	
	for i, result := range results {
		if result.IsValid() {
			validCount++
			fmt.Printf("用户 %d: 验证通过\n", users[i].ID)
		} else {
			totalErrors += result.GetErrorCount()
			fmt.Printf("用户 %d: 验证失败 (%d 个错误)\n", users[i].ID, result.GetErrorCount())
		}
	}
	
	fmt.Printf("\n并发验证统计:\n")
	fmt.Printf("- 总用户数: %d\n", len(users))
	fmt.Printf("- 验证通过: %d\n", validCount)
	fmt.Printf("- 验证失败: %d\n", len(users)-validCount)
	fmt.Printf("- 总错误数: %d\n", totalErrors)
	fmt.Printf("- 执行时间: %v\n", duration)
	
	// 输出引擎统计信息
	stats := engine.GetStats()
	fmt.Printf("- 引擎统计: 执行次数 %d, 成功 %d, 失败 %d\n", 
		stats.TotalValidations, stats.SuccessfulValidations, stats.FailedValidations)
	
	fmt.Println()
}

// ExampleFactoryUsage 工厂使用示例
func ExampleFactoryUsage() {
	fmt.Println("=== 验证工厂示例 ===")
	
	// 使用工厂创建验证规则
	factory := GetDefaultFactory()
	
	// 通过模板创建规则
	requiredConfig := map[string]interface{}{
		"id":     "factory_req",
		"name":   "工厂必填规则",
		"fields": []interface{}{"username", "email"},
	}
	
	lengthConfig := map[string]interface{}{
		"id":    "factory_len",
		"name":  "工厂长度规则",
		"field": "username",
		"min":   3,
		"max":   20,
	}
	
	emailConfig := map[string]interface{}{
		"id":    "factory_email",
		"name":  "工厂邮箱规则",
		"field": "email",
	}
	
	// 从模板创建规则
	reqRule, err := factory.CreateRuleFromTemplate(RuleTypeRequired, requiredConfig)
	if err != nil {
		log.Printf("创建必填规则失败: %v", err)
		return
	}
	
	lenRule, err := factory.CreateRuleFromTemplate(RuleTypeLength, lengthConfig)
	if err != nil {
		log.Printf("创建长度规则失败: %v", err)
		return
	}
	
	emailRule, err := factory.CreateRuleFromTemplate(RuleTypeEmail, emailConfig)
	if err != nil {
		log.Printf("创建邮箱规则失败: %v", err)
		return
	}
	
	// 创建验证引擎和管道
	engine := factory.CreateEngine(NewValidationConfig())
	pipeline := factory.CreatePipeline("factory_pipeline", "工厂创建的管道")
	
	// 注册规则
	engine.RegisterRule(reqRule)
	engine.RegisterRule(lenRule)
	engine.RegisterRule(emailRule)
	
	// 测试数据
	user := &User{
		Username: "factory_user",
		Email:    "factory@example.com",
		Age:      28,
		Status:   "active",
	}
	
	// 验证
	result := engine.Validate(context.Background(), user)
	
	fmt.Printf("工厂创建的规则验证结果: %t\n", result.IsValid())
	fmt.Printf("规则实例统计: %+v\n", factory.GetInstanceCounter())
	fmt.Printf("已注册模板: %v\n", factory.GetRegisteredTemplates())
	fmt.Printf("管道创建成功: %s\n", pipeline.GetID())
	
	fmt.Println()
}

// ExampleCustomValidation 自定义验证示例
func ExampleCustomValidation() {
	fmt.Println("=== 自定义验证示例 ===")
	
	// 创建复杂的自定义验证规则
	passwordRule := CreateCustomRule("password_policy", "密码策略验证", func(ctx IValidationContext, result *ValidationResult) error {
		passwordValue, found := ctx.GetFieldValue("password")
		if !found {
			result.AddError(ValidationError{
				Field:     "password",
				Message:   "密码字段不存在",
				Type:      ErrorTypeRequired,
				Severity:  ErrorSeverityHigh,
				Code:      "PASSWORD_MISSING",
				Timestamp: time.Now(),
			})
			return nil
		}
		
		password, ok := passwordValue.(string)
		if !ok {
			result.AddError(ValidationError{
				Field:     "password",
				Message:   "密码必须是字符串类型",
				Type:      ErrorTypeFormat,
				Severity:  ErrorSeverityHigh,
				Code:      "PASSWORD_TYPE_ERROR",
				Timestamp: time.Now(),
			})
			return nil
		}
		
		// 检查长度
		if len(password) < 8 {
			result.AddError(ValidationError{
				Field:     "password",
				Message:   "密码长度至少8位",
				Type:      ErrorTypeLength,
				Severity:  ErrorSeverityHigh,
				Code:      "PASSWORD_TOO_SHORT",
				Timestamp: time.Now(),
			})
		}
		
		// 检查复杂度
		hasUpper := false
		hasLower := false
		hasDigit := false
		hasSpecial := false
		
		for _, char := range password {
			switch {
			case 'A' <= char && char <= 'Z':
				hasUpper = true
			case 'a' <= char && char <= 'z':
				hasLower = true
			case '0' <= char && char <= '9':
				hasDigit = true
			case char == '!' || char == '@' || char == '#' || char == '$' || char == '%' || char == '^' || char == '&' || char == '*':
				hasSpecial = true
			}
		}
		
		if !hasUpper {
			result.AddWarning(ValidationWarning{
				Field:     "password",
				Message:   "密码建议包含大写字母",
				Code:      "PASSWORD_NO_UPPERCASE",
				Timestamp: time.Now(),
			})
		}
		
		if !hasLower {
			result.AddWarning(ValidationWarning{
				Field:     "password",
				Message:   "密码建议包含小写字母",
				Code:      "PASSWORD_NO_LOWERCASE",
				Timestamp: time.Now(),
			})
		}
		
		if !hasDigit {
			result.AddWarning(ValidationWarning{
				Field:     "password",
				Message:   "密码建议包含数字",
				Code:      "PASSWORD_NO_DIGIT",
				Timestamp: time.Now(),
			})
		}
		
		if !hasSpecial {
			result.AddWarning(ValidationWarning{
				Field:     "password",
				Message:   "密码建议包含特殊字符(!@#$%^&*)",
				Code:      "PASSWORD_NO_SPECIAL",
				Timestamp: time.Now(),
			})
		}
		
		return nil
	})
	
	// 测试不同强度的密码
	passwords := []string{
		"123",           // 太短
		"password",      // 只有小写
		"Password",      // 大小写但没有数字和特殊字符
		"Password123",   // 大小写和数字，没有特殊字符
		"Password123!",  // 符合所有要求
	}
	
	engine := CreateEngine(NewValidationConfig())
	engine.RegisterRule(passwordRule)
	
	// 启动引擎
	if err := engine.Start(); err != nil {
		fmt.Printf("启动验证引擎失败: %v\n", err)
		return
	}
	defer engine.Stop()
	
	for i, pwd := range passwords {
		fmt.Printf("\n测试密码 %d: %s\n", i+1, pwd)
		
		testData := map[string]interface{}{
			"password": pwd,
		}
		
		result := engine.Validate(context.Background(), testData)
		
		fmt.Printf("验证结果: %s\n", result.GetSummary().String())
		
		if len(result.GetErrors()) > 0 {
			fmt.Println("错误:")
			for _, err := range result.GetErrors() {
				fmt.Printf("  - %s\n", err.Message)
			}
		}
		
		if len(result.GetWarnings()) > 0 {
			fmt.Println("警告:")
			for _, warn := range result.GetWarnings() {
				fmt.Printf("  - %s\n", warn.Message)
			}
		}
	}
	
	fmt.Println()
}

// RunAllExamples 运行所有示例
func RunAllExamples() {
	fmt.Println("验证引擎框架使用示例")
	fmt.Println("========================")
	
	ExampleBasicValidation()
	ExamplePipelineValidation()
	ExampleConcurrentValidation()
	ExampleFactoryUsage()
	ExampleCustomValidation()
	
	fmt.Println("所有示例运行完成！")
}