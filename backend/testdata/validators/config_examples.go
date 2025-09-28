package main

import (
	"fmt"
	"log"
	"strings"
)

// ConfigExample 演示如何使用配置文件加载验证规则
func ConfigExample() {
	fmt.Println("\n=== 配置文件验证示例 ===")

	// 创建验证工厂和配置加载器
	factory := NewValidationFactory()
	loader := NewConfigLoader(factory)

	// 获取配置文件路径
	configPath := "example-config.yaml"

	// 从YAML文件加载配置
	fmt.Printf("从配置文件加载验证规则: %s\n", configPath)
	config, err := loader.LoadFromFile(configPath)
	if err != nil {
		log.Printf("加载配置文件失败: %v\n", err)
		// 如果文件不存在，我们使用内嵌的配置字符串作为示例
		config, err = loadConfigFromString(loader)
		if err != nil {
			log.Printf("加载内嵌配置失败: %v\n", err)
			return
		}
	}

	// 显示配置信息
	fmt.Printf("配置名称: %s\n", config.Name)
	fmt.Printf("配置版本: %s\n", config.Version)
	fmt.Printf("配置描述: %s\n", config.Description)
	fmt.Printf("规则数量: %d\n", len(config.Rules))
	fmt.Printf("管道数量: %d\n", len(config.Pipelines))

	// 创建验证引擎
	engine := NewValidationEngine(*NewValidationConfig())

	// 从配置创建验证规则
	fmt.Println("\n创建验证规则...")
	err = loader.CreateRulesFromConfig(config)
	if err != nil {
		log.Printf("创建验证规则失败: %v\n", err)
		return
	}

	// 注册创建的规则到引擎
	rules := loader.GetRules()
	fmt.Printf("注册 %d 个验证规则到引擎\n", len(rules))
	for _, rule := range rules {
		engine.RegisterRule(rule)
	}

	// 暂时跳过管道创建，使用单个规则进行演示
	fmt.Println("\n使用单个规则进行验证演示...")

	// 演示用户注册验证
	fmt.Println("\n=== 用户注册验证演示 ===")
	registrationData := map[string]interface{}{
		"username":     "john_doe_123",
		"email":        "john.doe@example.com",
		"password":     "StrongPass123",
		"age":          25,
		"status":       "active",
		"role":         "user", // 非管理员
		"account_type": "basic", // 非Premium用户
	}

	// 使用单个规则进行验证演示
	if len(rules) > 0 {
		// 找到一个用户名规则进行演示
		for ruleID, rule := range rules {
			if strings.Contains(ruleID, "username") {
				fmt.Printf("使用规则验证: %s\n", rule.GetName())
				ctx := NewValidationContext(registrationData)
				result := NewValidationResult()
				err := rule.Validate(ctx, result)
				if err != nil {
					fmt.Printf("规则执行错误: %v\n", err)
				}
				displayValidationResult("用户注册(用户名规则)", result)
				break
			}
		}
	}

	fmt.Println("\n配置加载成功！规则已注册到验证引擎。")

	// 演示保存配置到文件
	fmt.Println("\n=== 保存配置演示 ===")
	outputPath := "output-config.yaml"
	err = loader.SaveToFile(config, outputPath)
	if err != nil {
		log.Printf("保存配置文件失败: %v\n", err)
	} else {
		fmt.Printf("配置已保存到: %s\n", outputPath)
	}
}

// loadConfigFromString 从字符串加载配置（作为备选方案）
func loadConfigFromString(loader *ConfigLoader) (*ValidationConfigFile, error) {
	configYAML := `
version: "1.0"
name: "简化用户验证规则"
description: "演示用的简化验证规则集"

settings:
  strict_mode: true
  fail_fast: false
  max_errors: 5

rules:
  # 基础必填字段
  - id: "user_required"
    name: "用户必填字段"
    type: "required"
    priority: 100
    enabled: true
    params:
      fields: ["username", "password"]

  # 用户名长度
  - id: "username_length"
    name: "用户名长度"
    type: "length"
    priority: 90
    enabled: true
    params:
      field: "username"
      min: 3
      max: 20

  # 密码复杂度（简化版）
  - id: "password_complex"
    name: "密码复杂度"
    type: "and"
    priority: 80
    enabled: true
    children:
      - id: "password_min_length"
        name: "密码最小长度"
        type: "length"
        params:
          field: "password"
          min: 6
          max: 50
      - id: "password_has_digit"
        name: "密码包含数字"
        type: "regex"
        params:
          field: "password"
          pattern: "[0-9]"

pipelines:
  - id: "simple_user_pipeline"
    name: "简化用户验证管道"
    description: "简化的用户验证流程"
    stages:
      - id: "basic_stage"
        name: "基础验证"
        order: 1
        rule_ids:
          - "user_required"
          - "username_length"
          - "password_complex"
`

	return loader.LoadFromString(configYAML, "yaml")
}

// displayValidationResult 显示验证结果
func displayValidationResult(scenario string, result *ValidationResult) {
	fmt.Printf("场景: %s\n", scenario)
	fmt.Printf("验证状态: %s\n", getValidationStatus(result))
	fmt.Printf("是否成功: %v\n", result.IsValid())

	if !result.IsValid() {
		errors := result.GetErrors()
		fmt.Printf("错误数量: %d\n", len(errors))
		for i, err := range errors {
			fmt.Printf("  错误 %d: %s\n", i+1, err.Message)
		}
	}

	warnings := result.GetWarnings()
	if len(warnings) > 0 {
		fmt.Printf("警告数量: %d\n", len(warnings))
		for i, warning := range warnings {
			fmt.Printf("  警告 %d: %s\n", i+1, warning.Message)
		}
	}
	
	fmt.Printf("验证耗时: %v\n", result.GetExecutionTime())
	fmt.Println("---")
}

// getValidationStatus 获取验证状态字符串
func getValidationStatus(result *ValidationResult) string {
	if result.IsValid() {
		return "成功"
	}
	return "失败"
}

// ConfigAdvancedExample 演示高级配置功能
func ConfigAdvancedExample() {
	fmt.Println("\n=== 高级配置功能演示 ===")

	factory := NewValidationFactory()
	loader := NewConfigLoader(factory)

	// 演示条件规则配置
	conditionalConfigYAML := `
version: "1.0"
name: "条件验证规则演示"

rules:
  # 条件规则：VIP用户需要额外验证
  - id: "vip_user_validation"
    name: "VIP用户验证"
    type: "conditional"
    priority: 90
    enabled: true
    conditions:
      - type: "equals"
        field: "user_level"
        value: "vip"
    children:
      - id: "vip_phone_required"
        name: "VIP用户电话必填"
        type: "required"
        params:
          fields: ["phone", "emergency_contact"]
      
      - id: "vip_phone_format"
        name: "VIP用户电话格式"
        type: "regex"
        params:
          field: "phone"
          pattern: "^1[3-9]\\d{9}$"

  # 多条件规则：企业用户验证
  - id: "enterprise_user_validation"
    name: "企业用户验证"
    type: "conditional"
    priority: 85
    enabled: true
    conditions:
      - type: "equals"
        field: "account_type"
        value: "enterprise"
      - type: "greater_than"
        field: "employee_count"
        value: 50
    children:
      - id: "enterprise_info_required"
        name: "企业信息必填"
        type: "required"
        params:
          fields: ["company_name", "tax_id", "business_license"]

  # XOR规则：登录方式验证
  - id: "login_method_validation"
    name: "登录方式验证"
    type: "xor"
    priority: 80
    enabled: true
    children:
      - id: "password_login"
        name: "密码登录"
        type: "required"
        params:
          fields: ["password"]
      
      - id: "oauth_login"
        name: "第三方登录"
        type: "required"
        params:
          fields: ["oauth_provider", "oauth_token"]

pipelines:
  - id: "advanced_validation_pipeline"
    name: "高级验证管道"
    stages:
      - id: "conditional_stage"
        name: "条件验证阶段"
        order: 1
        rule_ids:
          - "vip_user_validation"
          - "enterprise_user_validation"
          - "login_method_validation"
`

	config, err := loader.LoadFromString(conditionalConfigYAML, "yaml")
	if err != nil {
		log.Printf("加载条件配置失败: %v\n", err)
		return
	}

	err = loader.CreateRulesFromConfig(config)
	if err != nil {
		log.Printf("创建条件验证规则失败: %v\n", err)
		return
	}

	// 暂时跳过管道创建

	fmt.Println("\n条件验证规则加载成功！")
	fmt.Println("已实现的高级功能：")
	fmt.Println("- VIP用户条件验证")
	fmt.Println("- 企业用户多条件验证")
	fmt.Println("- XOR登录方式验证")

	rules := loader.GetRules()
	fmt.Printf("\n成功创建 %d 个高级验证规则\n", len(rules))
}