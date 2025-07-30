package main

import (
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
)

// 模拟AI响应解析测试
func main() {
	// 测试不同格式的AI响应
	testResponses := []string{
		// 测试1: 标准JSON格式
		`{"tasks": [{"title": "用户登录功能", "description": "实现用户登录功能，包括表单验证", "priority": "high", "estimated_hours": 8, "tags": ["auth", "backend"], "dependencies": [], "confidence": 0.9}]}`,
		
		// 测试2: 带代码块的响应
		"```json\n{\"tasks\": [{\"title\": \"用户登录功能\", \"description\": \"实现用户登录功能\", \"priority\": \"high\", \"estimated_hours\": 8, \"tags\": [\"auth\"], \"dependencies\": [], \"confidence\": 0.9}]}\n```",
		
		// 测试3: 带文字说明的响应
		"好的，我来帮您分解任务：\n\n{\"tasks\": [{\"title\": \"用户登录功能\", \"description\": \"实现用户登录功能\", \"priority\": \"high\", \"estimated_hours\": 8, \"tags\": [\"auth\"], \"dependencies\": [], \"confidence\": 0.9}]}\n\n以上是任务分解结果。",
		
		// 测试4: 只有文字没有JSON
		"我将为您创建以下任务：\n1. 用户登录功能\n2. 用户注册功能",
		
		// 测试5: 空响应
		"",
		
		// 测试6: 不完整的JSON
		`{"tasks": [{"title": "用户登录功能", "description": "实现用户登录功能"`,
		
		// 测试7: DeepSeek实际响应格式（可能的情况）
		"根据您的需求，我将创建以下任务：\n\n```json\n{\n  \"tasks\": [\n    {\n      \"title\": \"用户登录功能\",\n      \"description\": \"实现用户登录功能，包括表单验证和密码加密\",\n      \"priority\": \"high\",\n      \"estimated_hours\": 8,\n      \"tags\": [\"auth\", \"backend\"],\n      \"dependencies\": [],\n      \"confidence\": 0.95\n    }\n  ]\n}\n```",
	}
	
	for i, response := range testResponses {
		fmt.Printf("\n========== 测试 %d ==========\n", i+1)
		fmt.Printf("原始响应:\n%s\n", response)
		
		// 提取JSON
		jsonStr := extractJSONFromResponse(response)
		if jsonStr == "" {
			fmt.Println("结果: 未能提取到JSON")
			continue
		}
		
		fmt.Printf("\n提取的JSON:\n%s\n", jsonStr)
		
		// 尝试解析
		var taskData struct {
			Tasks []map[string]interface{} `json:"tasks"`
		}
		
		err := json.Unmarshal([]byte(jsonStr), &taskData)
		if err != nil {
			fmt.Printf("\n解析失败: %v\n", err)
		} else {
			fmt.Printf("\n解析成功! 任务数量: %d\n", len(taskData.Tasks))
			if len(taskData.Tasks) > 0 {
				fmt.Printf("第一个任务标题: %v\n", taskData.Tasks[0]["title"])
			}
		}
	}
	
	// 测试改进后的提取函数
	fmt.Println("\n\n========== 测试改进的提取函数 ==========")
	improvedResponse := "以下是生成的任务列表：\n\n```json\n{\n  \"tasks\": [\n    {\n      \"title\": \"设计购物车数据模型\",\n      \"description\": \"设计购物车相关的数据库表结构，包括购物车表、购物车商品表等\",\n      \"priority\": \"high\",\n      \"estimated_hours\": 4,\n      \"tags\": [\"database\", \"design\"],\n      \"dependencies\": [],\n      \"confidence\": 0.95\n    },\n    {\n      \"title\": \"实现购物车API接口\",\n      \"description\": \"开发购物车的后端API，包括添加商品、删除商品、更新数量等功能\",\n      \"priority\": \"high\",\n      \"estimated_hours\": 8,\n      \"tags\": [\"backend\", \"api\"],\n      \"dependencies\": [0],\n      \"confidence\": 0.9\n    }\n  ]\n}\n```\n\n这些任务涵盖了购物车功能的主要方面。"
	
	jsonStr := extractJSONFromResponseImproved(improvedResponse)
	fmt.Printf("提取的JSON:\n%s\n", jsonStr)
	
	var result struct {
		Tasks []map[string]interface{} `json:"tasks"`
	}
	
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		fmt.Printf("解析失败: %v\n", err)
	} else {
		fmt.Printf("解析成功! 任务数量: %d\n", len(result.Tasks))
		for i, task := range result.Tasks {
			fmt.Printf("任务%d: %v\n", i+1, task["title"])
		}
	}
}

// extractJSONFromResponse 原始的提取函数
func extractJSONFromResponse(response string) string {
	log.Printf("=== 开始提取JSON ===")
	log.Printf("原始AI响应长度: %d", len(response))
	
	// 如果响应为空
	if strings.TrimSpace(response) == "" {
		log.Printf("错误: AI响应为空")
		return ""
	}
	
	// 1. 尝试匹配JSON代码块
	re := regexp.MustCompile("```(?:json)?\\s*([\\s\\S]*?)\\s*```")
	matches := re.FindStringSubmatch(response)
	if len(matches) > 1 {
		jsonStr := strings.TrimSpace(matches[1])
		log.Printf("从代码块提取的JSON")
		return jsonStr
	}
	
	// 2. 尝试匹配大括号包围的内容
	re = regexp.MustCompile(`\{[\s\S]*\}`)
	match := re.FindString(response)
	if match != "" {
		log.Printf("从大括号提取的JSON")
		return match
	}
	
	// 3. 尝试查找tasks数组
	re = regexp.MustCompile(`"tasks"\s*:\s*\[[\s\S]*?\]`)
	tasksMatch := re.FindString(response)
	if tasksMatch != "" {
		jsonStr := "{" + tasksMatch + "}"
		log.Printf("从tasks数组构建的JSON")
		return jsonStr
	}
	
	// 4. 如果响应本身就是有效的JSON
	trimmedResponse := strings.TrimSpace(response)
	if strings.HasPrefix(trimmedResponse, "{") && strings.HasSuffix(trimmedResponse, "}") {
		log.Printf("响应本身就是JSON")
		return trimmedResponse
	}
	
	log.Printf("错误: 无法从响应中提取JSON格式数据")
	return ""
}

// extractJSONFromResponseImproved 改进的提取函数
func extractJSONFromResponseImproved(response string) string {
	// 空响应检查
	if strings.TrimSpace(response) == "" {
		return ""
	}
	
	// 1. 尝试提取markdown代码块中的JSON（最常见的情况）
	codeBlockRegex := regexp.MustCompile("(?s)```(?:json)?\\s*\\n?([^`]+)\\n?```")
	if matches := codeBlockRegex.FindStringSubmatch(response); len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	
	// 2. 查找完整的JSON对象（从第一个{到最后一个}）
	firstBrace := strings.Index(response, "{")
	lastBrace := strings.LastIndex(response, "}")
	if firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace {
		jsonCandidate := response[firstBrace : lastBrace+1]
		// 验证是否包含tasks字段
		if strings.Contains(jsonCandidate, `"tasks"`) {
			return jsonCandidate
		}
	}
	
	// 3. 尝试匹配包含tasks数组的JSON片段
	tasksRegex := regexp.MustCompile(`(?s)\{\s*"tasks"\s*:\s*\[[^\]]*\]\s*\}`)
	if match := tasksRegex.FindString(response); match != "" {
		return match
	}
	
	// 4. 如果整个响应是纯JSON
	trimmed := strings.TrimSpace(response)
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		var test map[string]interface{}
		if err := json.Unmarshal([]byte(trimmed), &test); err == nil {
			return trimmed
		}
	}
	
	return ""
}
