package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
)

// 测试AI响应解析
func main() {
    // 模拟AI生成任务的提示词
    prompt := `你是一个专业的项目管理助手，擅长将复杂需求分解为具体的可执行任务。

项目背景：
- 项目名称：AI项目管理平台MVP
- 项目描述：智能项目管理平台的最小可行产品开发

请将以下需求分解为具体任务，返回JSON格式：

需求描述：
为一个电商网站开发购物车功能

请返回JSON格式，包含以下字段：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "详细描述",
      "priority": "high|medium|low",
      "estimated_hours": 数字,
      "tags": ["标签1", "标签2"],
      "dependencies": [依赖任务索引],
      "confidence": 0.95
    }
  ]
}

要求：
- 生成不超过5个任务
- 任务标题要具体明确
- 描述要详细可执行
- 工作量估算要合理（以小时为单位）
- 避免重复任务
- 分析任务间的依赖关系
- 为任务添加合适的技能标签`

    // 创建请求体
    requestBody := map[string]interface{}{
        "model":       "deepseek-chat",
        "temperature": 0.7,
        "max_tokens":  4000,
        "messages": []map[string]string{
            {
                "role":    "user",
                "content": prompt,
            },
        },
    }

    jsonData, err := json.Marshal(requestBody)
    if err != nil {
        log.Fatal("Marshal error:", err)
    }

    // 创建HTTP请求
    req, err := http.NewRequest("POST", "https://api.deepseek.com/v1/chat/completions", bytes.NewBuffer(jsonData))
    if err != nil {
        log.Fatal("Create request error:", err)
    }

    // 设置请求头
    apiKey := os.Getenv("DEEPSEEK_API_KEY")
    if apiKey == "" {
        log.Fatal("Please set DEEPSEEK_API_KEY environment variable")
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+apiKey)

    // 发送请求
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        log.Fatal("Request error:", err)
    }
    defer resp.Body.Close()

    // 读取响应
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        log.Fatal("Read response error:", err)
    }

    fmt.Println("Response status:", resp.Status)
    fmt.Println("Response body:")
    fmt.Println(string(body))

    // 解析响应
    var apiResp map[string]interface{}
    if err := json.Unmarshal(body, &apiResp); err != nil {
        log.Fatal("Unmarshal response error:", err)
    }

    // 检查是否有错误
    if apiError, ok := apiResp["error"]; ok {
        fmt.Println("API Error:", apiError)
        return
    }

    // 提取AI响应内容
    if choices, ok := apiResp["choices"].([]interface{}); ok && len(choices) > 0 {
        if choice, ok := choices[0].(map[string]interface{}); ok {
            if message, ok := choice["message"].(map[string]interface{}); ok {
                if content, ok := message["content"].(string); ok {
                    fmt.Println("\nAI Response content:")
                    fmt.Println(content)
                    
                    // 尝试提取JSON
                    fmt.Println("\nAttempting to extract JSON...")
                    
                    // 方法1: 查找```json代码块
                    startIdx := -1
                    endIdx := -1
                    
                    if idx := bytes.Index([]byte(content), []byte("```json")); idx != -1 {
                        startIdx = idx + 7
                        if idx2 := bytes.Index([]byte(content[startIdx:]), []byte("```")); idx2 != -1 {
                            endIdx = startIdx + idx2
                        }
                    } else if idx := bytes.Index([]byte(content), []byte("```")); idx != -1 {
                        startIdx = idx + 3
                        if idx2 := bytes.Index([]byte(content[startIdx:]), []byte("```")); idx2 != -1 {
                            endIdx = startIdx + idx2
                        }
                    }
                    
                    var jsonStr string
                    if startIdx != -1 && endIdx != -1 {
                        jsonStr = content[startIdx:endIdx]
                        fmt.Println("Found JSON in code block")
                    } else {
                        // 方法2: 查找{}包围的内容
                        if idx := bytes.IndexByte([]byte(content), '{'); idx != -1 {
                            if idx2 := bytes.LastIndexByte([]byte(content), '}'); idx2 != -1 && idx2 > idx {
                                jsonStr = content[idx : idx2+1]
                                fmt.Println("Found JSON by braces")
                            }
                        }
                    }
                    
                    if jsonStr != "" {
                        fmt.Println("\nExtracted JSON:")
                        fmt.Println(jsonStr)
                        
                        // 尝试解析JSON
                        var tasks map[string]interface{}
                        if err := json.Unmarshal([]byte(jsonStr), &tasks); err != nil {
                            fmt.Println("JSON parse error:", err)
                        } else {
                            fmt.Println("\nParsed successfully!")
                            prettyJSON, _ := json.MarshalIndent(tasks, "", "  ")
                            fmt.Println(string(prettyJSON))
                        }
                    } else {
                        fmt.Println("No JSON found in response")
                    }
                }
            }
        }
    }
}
