package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// ExampleRuleComposition 规则组合示例
func ExampleRuleComposition() {
	fmt.Println("=== 规则组合示例 ===")

	// 创建测试数据
	user := map[string]interface{}{
		"username": "john_doe",
		"email":    "john@example.com",
		"age":      25,
		"status":   "active",
		"password": "Password123!",
		"role":     "user",
	}

	// 创建验证引擎
	config := NewValidationConfig()
	engine := CreateEngine(config)

	// 启动引擎
	if err := engine.Start(); err != nil {
		fmt.Printf("启动验证引擎失败: %v\n", err)
		return
	}
	defer engine.Stop()

	// 1. AND组合规则：用户名必须同时满足长度和格式要求
	regexRule, _ := CreateRegexRule("regex_username", "用户名格式", "username", "^[a-zA-Z0-9_]+$")
	usernameRule := CreateAndRule(
		"username_and",
		"用户名AND规则",
		CreateLengthRule("len_username", "用户名长度", "username").SetMin(3).SetMax(20),
		regexRule,
	).SetDescription("用户名必须同时满足长度(3-20)和格式(字母数字下划线)要求")

	// 2. OR组合规则：联系方式可以是邮箱或电话
	emailRule, _ := CreateEmailRule("contact_email", "联系邮箱", "email")
	phoneRule, _ := CreateRegexRule("contact_phone", "联系电话", "phone", "^\\d{11}$")
	contactRule := CreateOrRule(
		"contact_or",
		"联系方式OR规则",
		emailRule,
		phoneRule,
	).SetDescription("联系方式可以是邮箱或11位电话号码")

	// 3. NOT组合规则：用户名不能是管理员保留字
	notAdminRule := CreateNotRule(
		"not_admin",
		"非管理员用户名",
		CreateEnumRule("admin_names", "管理员名称", "username", []interface{}{"admin", "root", "administrator"}),
	).SetDescription("用户名不能是系统保留的管理员名称")

	// 4. XOR组合规则：用户要么是VIP要么是普通用户，不能同时是两者
	user["is_vip"] = false
	user["is_regular"] = true
	
	vipXorRule := CreateXorRule(
		"vip_xor",
		"VIP状态XOR规则",
		CreateFieldEqualsRule("is_vip_check", "VIP检查", "is_vip", true, 
			CreateRequiredRule("vip_req", "VIP必填", []string{"vip_level"}), nil),
		CreateFieldEqualsRule("is_regular_check", "普通用户检查", "is_regular", true,
			CreateRequiredRule("regular_req", "普通用户必填", []string{"membership_type"}), nil),
	).SetDescription("用户只能是VIP或普通用户中的一种")

	// 注册规则
	engine.RegisterRule(usernameRule)
	engine.RegisterRule(contactRule)
	engine.RegisterRule(notAdminRule)
	engine.RegisterRule(vipXorRule)

	// 执行验证
	result := engine.Validate(context.Background(), user)

	// 输出结果
	fmt.Printf("规则组合验证结果: %t\n", result.IsValid())
	fmt.Printf("错误数量: %d, 警告数量: %d\n", result.GetErrorCount(), result.GetWarningCount())

	if !result.IsValid() {
		fmt.Println("验证错误:")
		for _, err := range result.GetErrors() {
			fmt.Printf("- %s: %s [%s]\n", err.Field, err.Message, err.Code)
		}
	}

	if result.HasWarnings() {
		fmt.Println("验证警告:")
		for _, warn := range result.GetWarnings() {
			fmt.Printf("- %s: %s [%s]\n", warn.Field, warn.Message, warn.Code)
		}
	}

	fmt.Println()
}

// ExampleConditionalRules 条件规则示例
func ExampleConditionalRules() {
	fmt.Println("=== 条件规则示例 ===")

	// 创建不同类型的用户数据进行测试
	testCases := []map[string]interface{}{
		{
			"username": "john_doe",
			"email":    "john@example.com",
			"age":      25,
			"role":     "admin",
			"status":   "active",
		},
		{
			"username": "jane_smith",
			"email":    "jane@example.com", 
			"age":      17,
			"role":     "user",
			"status":   "inactive",
		},
		{
			"username": "bob_wilson",
			"email":    "invalid-email",
			"age":      30,
			"role":     "moderator",
			"status":   "pending",
		},
	}

	// 创建验证引擎
	config := NewValidationConfig()
	engine := CreateEngine(config)

	// 启动引擎
	if err := engine.Start(); err != nil {
		fmt.Printf("启动验证引擎失败: %v\n", err)
		return
	}
	defer engine.Stop()

	// 1. 条件规则：如果是管理员，则需要额外的权限验证
	adminRule := CreateFieldEqualsRule(
		"admin_conditional",
		"管理员条件验证",
		"role",
		"admin",
		// THEN: 如果是管理员，验证权限
		CreateAndRule("admin_requirements", "管理员要求",
			CreateRequiredRule("admin_perms", "管理员权限", []string{"permissions"}),
			CreateRangeRule("admin_age", "管理员年龄", "age").SetMin(21),
		),
		nil, // ELSE: 如果不是管理员，不执行额外验证
	)

	// 2. 条件规则：如果年龄小于18，状态不能是active
	minorRule := CreateIfThenRule(
		"minor_status",
		"未成年人状态限制",
		&Condition{
			Type:  ConditionLessThan,
			Field: "age", 
			Value: 18,
		},
		CreateNotRule("minor_not_active", "未成年人不能激活",
			CreateEnumRule("active_status", "激活状态", "status", []interface{}{"active"}),
		),
	)

	// 3. 条件规则：如果邮箱字段存在，则必须验证邮箱格式
	emailFormatRule, _ := CreateEmailRule("email_format", "邮箱格式验证", "email")
	emailExistsRule := CreateFieldExistsRule(
		"email_format_conditional",
		"邮箱格式条件验证",
		"email",
		emailFormatRule, // THEN
		nil, // ELSE
	)

	// 4. 条件规则：根据用户角色应用不同的验证规则
	roleBasedRule := CreateConditionalRule(
		"role_based_validation",
		"基于角色的验证",
		&Condition{
			Type:   ConditionIn,
			Field:  "role",
			Values: []interface{}{"admin", "moderator"},
		},
		// THEN: 管理人员需要更严格的验证
		CreateAndRule("staff_requirements", "员工要求",
			CreateRangeRule("staff_age", "员工年龄", "age").SetMin(18),
			CreateEnumRule("staff_status", "员工状态", "status", []interface{}{"active", "pending"}),
		),
		// ELSE: 普通用户的验证
		CreateRangeRule("user_age", "用户年龄", "age").SetMin(13),
	)

	// 注册规则
	engine.RegisterRule(adminRule)
	engine.RegisterRule(minorRule)
	engine.RegisterRule(emailExistsRule)
	engine.RegisterRule(roleBasedRule)

	// 测试不同的用户数据
	for i, userData := range testCases {
		fmt.Printf("测试用例 %d: %s (角色: %s, 年龄: %d)\n", i+1, userData["username"], userData["role"], userData["age"])

		result := engine.Validate(context.Background(), userData)

		fmt.Printf("验证结果: %t", result.IsValid())
		if !result.IsValid() {
			fmt.Printf(" (%d 个错误)", result.GetErrorCount())
		}
		if result.HasWarnings() {
			fmt.Printf(" (%d 个警告)", result.GetWarningCount())
		}
		fmt.Println()

		// 显示错误详情
		if !result.IsValid() {
			for _, err := range result.GetErrors() {
				fmt.Printf("  错误: %s - %s\n", err.Field, err.Message)
			}
		}

		// 显示警告详情
		if result.HasWarnings() {
			for _, warn := range result.GetWarnings() {
				fmt.Printf("  警告: %s - %s\n", warn.Field, warn.Message)
			}
		}

		fmt.Println()
	}
}

// ExampleAsyncValidation 异步验证示例
func ExampleAsyncValidation() {
	fmt.Println("=== 异步验证示例 ===")

	// 创建测试数据
	users := []map[string]interface{}{
		{"username": "john_doe", "email": "john@example.com", "file_path": "/path/to/avatar.jpg"},
		{"username": "admin", "email": "admin@example.com", "file_path": "/path/to/profile.png"},
		{"username": "user123", "email": "user@example.com", "file_path": "/path/to/document.pdf"},
	}

	// 创建验证引擎
	config := NewValidationConfig()
	engine := CreateEngine(config)

	// 启动引擎
	if err := engine.Start(); err != nil {
		fmt.Printf("启动验证引擎失败: %v\n", err)
		return
	}
	defer engine.Stop()

	// 1. 创建异步远程API验证规则
	remoteRule := CreateAsyncRemoteValidationRule(
		"remote_username_check",
		"远程用户名验证",
		"https://api.example.com/validate/username",
		5*time.Second,
	).SetDescription("通过远程API验证用户名唯一性")

	// 2. 创建异步数据库验证规则
	dbRule := CreateAsyncDatabaseValidationRule(
		"db_username_unique",
		"数据库用户名唯一性",
		"users",
		"username",
		3*time.Second,
	).SetDescription("检查数据库中用户名是否已存在")

	// 3. 创建异步文件验证规则
	fileRule := CreateAsyncFileValidationRule(
		"file_exists_check",
		"文件存在性验证",
		"/default/path",
		2*time.Second,
	).SetDescription("验证文件是否存在且可读取")

	// 设置进度回调
	remoteRule.SetProgressCallback(func(stage string) {
		fmt.Printf("远程验证进度: %s\n", stage)
	})

	// 设置完成回调
	dbRule.SetCallback(func(result *ValidationResult, err error) {
		if err != nil {
			fmt.Printf("数据库验证回调: 失败 - %v\n", err)
		} else {
			fmt.Printf("数据库验证回调: 完成 - %t\n", result.IsValid())
		}
	})

	// 注册异步规则
	engine.RegisterRule(remoteRule)
	engine.RegisterRule(dbRule)
	engine.RegisterRule(fileRule)

	// 4. 使用异步批处理验证
	fmt.Println("执行异步批量验证...")
	batch := NewAsyncValidationBatch(3, 10*time.Second)
	batch.AddRule(remoteRule)
	batch.AddRule(dbRule)
	batch.AddRule(fileRule)

	start := time.Now()

	for i, user := range users {
		fmt.Printf("验证用户 %d: %s\n", i+1, user["username"])

		// 同步异步验证（等待结果）
		result := engine.Validate(context.Background(), user)

		fmt.Printf("验证结果: %t", result.IsValid())
		if !result.IsValid() {
			fmt.Printf(" (%d 个错误)", result.GetErrorCount())
		}
		fmt.Println()

		// 显示异步验证的详细结果
		if !result.IsValid() {
			for _, err := range result.GetErrors() {
				fmt.Printf("  - %s: %s\n", err.Field, err.Message)
			}
		}

		fmt.Println()
	}

	duration := time.Since(start)
	fmt.Printf("异步验证总时间: %v\n", duration)

	// 5. 演示纯异步验证（非阻塞）
	fmt.Println("执行纯异步验证（非阻塞）...")

	var wg sync.WaitGroup
	for i, user := range users {
		wg.Add(1)
		go func(index int, userData map[string]interface{}) {
			defer wg.Done()

			// 创建验证上下文
			ctx := NewValidationContext(userData)

			// 执行非阻塞异步验证
			remoteRule.ValidateAsync(ctx, func(result *ValidationResult, err error) {
				if err != nil {
					fmt.Printf("用户 %d 异步验证失败: %v\n", index+1, err)
				} else {
					fmt.Printf("用户 %d 异步验证完成: %t\n", index+1, result.IsValid())
				}
			})
		}(i, user)
	}

	// 等待所有异步验证完成
	wg.Wait()
	time.Sleep(200 * time.Millisecond) // 等待回调完成

	fmt.Println()
}

// ExampleComplexScenario 复杂场景示例
func ExampleComplexScenario() {
	fmt.Println("=== 复杂验证场景示例 ===")

	// 创建一个复杂的用户注册场景
	registrationData := map[string]interface{}{
		"username":      "john_doe_2023",
		"email":         "john.doe@example.com",
		"password":      "SecurePass123!",
		"confirm_password": "SecurePass123!",
		"age":           25,
		"country":       "US",
		"phone":         "1234567890",
		"terms_accepted": true,
		"newsletter_subscription": false,
		"profile_type": "premium",
		"referral_code": "REF123",
	}

	// 创建验证引擎
	config := NewValidationConfig()
	config.MaxConcurrency = 4
	engine := CreateEngine(config)

	// 启动引擎
	if err := engine.Start(); err != nil {
		fmt.Printf("启动验证引擎失败: %v\n", err)
		return
	}
	defer engine.Stop()

	// 1. 基础字段验证
	basicEmailRule, _ := CreateEmailRule("email_format", "邮箱格式", "email")
	basicRules := CreateAndRule(
		"basic_validation",
		"基础字段验证",
		CreateRequiredRule("basic_required", "基础必填", []string{"username", "email", "password"}),
		basicEmailRule,
		CreateLengthRule("username_length", "用户名长度", "username").SetMin(3).SetMax(30),
	)

	// 2. 密码复杂度验证（使用组合规则）
	pwdUpperRule, _ := CreateRegexRule("pwd_uppercase", "密码大写字母", "password", "[A-Z]")
	pwdLowerRule, _ := CreateRegexRule("pwd_lowercase", "密码小写字母", "password", "[a-z]")
	pwdDigitRule, _ := CreateRegexRule("pwd_digit", "密码数字", "password", "[0-9]")
	pwdSpecialRule, _ := CreateRegexRule("pwd_special", "密码特殊字符", "password", "[!@#$%^&*]")
	passwordRules := CreateAndRule(
		"password_complexity",
		"密码复杂度验证",
		CreateLengthRule("pwd_length", "密码长度", "password").SetMin(8).SetMax(50),
		pwdUpperRule,
		pwdLowerRule,
		pwdDigitRule,
		pwdSpecialRule,
	)

	// 3. 条件验证：根据国家应用不同的验证规则
	countryBasedRule := CreateConditionalRule(
		"country_based_validation",
		"基于国家的验证",
		&Condition{
			Type:  ConditionEquals,
			Field: "country",
			Value: "US",
		},
		// 如果是美国用户
		CreateAndRule("us_validation", "美国用户验证",
			func() IValidationRule {
				usPhoneRule, _ := CreateRegexRule("us_phone", "美国电话格式", "phone", "^[0-9]{10}$")
				return usPhoneRule
			}(),
			CreateRangeRule("us_age", "美国最低年龄", "age").SetMin(18),
		),
		// 如果是其他国家用户
		CreateRangeRule("intl_age", "国际最低年龄", "age").SetMin(16),
	)

	// 4. 条件验证：Premium用户需要额外验证
	premiumRule := CreateFieldEqualsRule(
		"premium_validation",
		"Premium用户验证",
		"profile_type",
		"premium",
		CreateAndRule("premium_requirements", "Premium要求",
			CreateRequiredRule("premium_phone", "Premium电话必填", []string{"phone"}),
			CreateFieldNotEmptyRule("premium_referral", "Premium推荐码", "referral_code", 
				CreateLengthRule("referral_length", "推荐码长度", "referral_code").SetMin(5).SetMax(10),
				nil,
			),
		),
		nil,
	)

	// 5. 异步验证：用户名唯一性和推荐码有效性
	asyncRules := CreateAndRule(
		"async_validations", 
		"异步验证",
		CreateAsyncDatabaseValidationRule("username_unique", "用户名唯一性", "users", "username", 2*time.Second),
		CreateAsyncRemoteValidationRule("referral_valid", "推荐码验证", "https://api.example.com/validate/referral", 3*time.Second),
	)

	// 6. 最终组合规则：所有验证都必须通过
	finalRule := CreateAndRule(
		"complete_registration_validation",
		"完整注册验证",
		basicRules,
		passwordRules,
		countryBasedRule,
		premiumRule,
		asyncRules,
	).SetDescription("用户注册的完整验证流程")

	// 注册最终规则
	engine.RegisterRule(finalRule)

	// 执行验证
	fmt.Println("开始执行复杂验证场景...")
	start := time.Now()

	result := engine.Validate(context.Background(), registrationData)

	duration := time.Since(start)

	// 输出详细结果
	fmt.Printf("验证完成！耗时: %v\n", duration)
	fmt.Printf("验证结果: %s\n", result.String())
	
	// 获取验证摘要
	summary := result.GetSummary()
	fmt.Printf("验证摘要: %s\n", summary.String())

	// 如果有错误，按严重程度分类显示
	if !result.IsValid() {
		fmt.Println("\n错误详情（按严重程度分类）:")
		
		// 使用类型断言获取ValidationResult实例
		if validationResult, ok := result.(*ValidationResult); ok {
			criticalErrors := validationResult.FilterErrors(func(err ValidationError) bool {
				return err.Severity == ErrorSeverityCritical
			})
			if len(criticalErrors) > 0 {
				fmt.Println("严重错误:")
				for _, err := range criticalErrors {
					fmt.Printf("  - %s: %s\n", err.Field, err.Message)
				}
			}

			highErrors := validationResult.FilterErrors(func(err ValidationError) bool {
				return err.Severity == ErrorSeverityHigh
			})
			if len(highErrors) > 0 {
				fmt.Println("高级错误:")
				for _, err := range highErrors {
					fmt.Printf("  - %s: %s\n", err.Field, err.Message)
				}
			}

			mediumErrors := validationResult.FilterErrors(func(err ValidationError) bool {
				return err.Severity == ErrorSeverityMedium
			})
			if len(mediumErrors) > 0 {
				fmt.Println("中等错误:")
				for _, err := range mediumErrors {
					fmt.Printf("  - %s: %s\n", err.Field, err.Message)
				}
			}
		}
	}

	// 显示警告
	if result.HasWarnings() {
		fmt.Println("\n警告信息:")
		for _, warn := range result.GetWarnings() {
			fmt.Printf("  - %s: %s\n", warn.Field, warn.Message)
		}
	}

	fmt.Println()
}

// RunAdvancedExamples 运行所有高级示例
func RunAdvancedExamples() {
	fmt.Println("Go 验证引擎高级功能演示")
	fmt.Println("============================")
	
	ExampleRuleComposition()
	ExampleConditionalRules()
	ExampleAsyncValidation()
	ExampleComplexScenario()
	
	fmt.Println("所有高级示例运行完成！")
}