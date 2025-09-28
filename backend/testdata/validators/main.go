package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Println("Go 验证引擎框架演示")
	fmt.Println("===================\n")
	
	// 检查是否指定了特定的示例
	if len(os.Args) > 1 {
		switch os.Args[1] {
		// 基础示例
		case "basic":
			ExampleBasicValidation()
		case "pipeline":
			ExamplePipelineValidation()
		case "concurrent":
			ExampleConcurrentValidation()
		case "factory":
			ExampleFactoryUsage()
		case "custom":
			ExampleCustomValidation()
		// 高级示例
		case "composition":
			ExampleRuleComposition()
		case "conditional":
			ExampleConditionalRules()
		case "async":
			ExampleAsyncValidation()
		case "complex":
			ExampleComplexScenario()
		case "advanced":
			RunAdvancedExamples()
		case "config":
			ConfigExample()
		case "config-advanced":
			ConfigAdvancedExample()
		case "web":
			WebExample()
		case "web-file":
			FileUploadExample()
		case "web-custom":
			CustomErrorHandlerExample()
		case "web-format":
			MultiFormatErrorExample()
		case "web-csrf":
			CSRFValidationExample()
		case "web-standalone":
			StandaloneValidationExample()
		case "all":
			RunAllExamples()
			RunAdvancedExamples()
			// 添加配置示例到完整演示
			ConfigExample()
			ConfigAdvancedExample()
			// 添加Web集成示例
			WebExample()
			FileUploadExample()
			CustomErrorHandlerExample()
			MultiFormatErrorExample()
			CSRFValidationExample()
			StandaloneValidationExample()
		default:
			fmt.Printf("未知示例: %s\n", os.Args[1])
			fmt.Println("可用示例:")
			fmt.Println("  基础示例: basic, pipeline, concurrent, factory, custom")
			fmt.Println("  高级示例: composition, conditional, async, complex, advanced")
			fmt.Println("  配置示例: config, config-advanced")
			fmt.Println("  Web集成: web, web-file, web-custom, web-format, web-csrf, web-standalone")
			fmt.Println("  综合示例: all")
			return
		}
		return
	}
	
	// 运行所有示例
	RunAllExamples()
}
