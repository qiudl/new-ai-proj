package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "strings"
    "time"
)

// 创建一个带有详细日志的请求
func testLoginWithTrace(username, password string) {
    log.Printf("\n=== 测试登录: %s ===", username)
    
    // 创建请求体
    loginData := map[string]string{
        "username": username,
        "password": password,
    }
    
    jsonData, err := json.Marshal(loginData)
    if err != nil {
        log.Printf("JSON编码失败: %v", err)
        return
    }
    
    log.Printf("请求体: %s", string(jsonData))
    
    // 创建HTTP请求
    req, err := http.NewRequest("POST", "http://localhost:8080/api/v1/auth/login", bytes.NewBuffer(jsonData))
    if err != nil {
        log.Printf("创建请求失败: %v", err)
        return
    }
    
    // 设置请求头
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Accept", "application/json")
    req.Header.Set("User-Agent", "LoginDebugger/1.0")
    
    // 添加跟踪ID
    traceID := fmt.Sprintf("trace-%d", time.Now().Unix())
    req.Header.Set("X-Trace-ID", traceID)
    
    log.Printf("请求头: %v", req.Header)
    
    // 发送请求
    client := &http.Client{
        Timeout: 10 * time.Second,
    }
    
    start := time.Now()
    resp, err := client.Do(req)
    duration := time.Since(start)
    
    if err != nil {
        log.Printf("请求失败: %v", err)
        return
    }
    defer resp.Body.Close()
    
    // 读取响应
    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        log.Printf("读取响应失败: %v", err)
        return
    }
    
    log.Printf("响应状态: %d", resp.StatusCode)
    log.Printf("响应时间: %v", duration)
    log.Printf("响应头: %v", resp.Header)
    log.Printf("响应体: %s", string(body))
    
    // 尝试解析响应
    var result map[string]interface{}
    if err := json.Unmarshal(body, &result); err == nil {
        if success, ok := result["success"].(bool); ok && success {
            log.Println("✓ 登录成功!")
            if data, ok := result["data"].(map[string]interface{}); ok {
                if token, ok := data["token"].(string); ok {
                    log.Printf("Token: %s...", token[:20])
                }
            }
        } else {
            log.Println("✗ 登录失败")
            if errData, ok := result["error"].(map[string]interface{}); ok {
                log.Printf("错误: %v", errData)
            }
        }
    }
}

// 测试不同的用户名格式
func testVariousFormats() {
    log.Println("测试不同的用户名格式...")
    
    testCases := []struct {
        username string
        password string
        desc     string
    }{
        {"admin", "password123", "正常格式"},
        {"Admin", "password123", "首字母大写"},
        {"ADMIN", "password123", "全部大写"},
        {" admin", "password123", "前面有空格"},
        {"admin ", "password123", "后面有空格"},
        {" admin ", "password123", "前后都有空格"},
    }
    
    for _, tc := range testCases {
        log.Printf("\n测试用例: %s", tc.desc)
        testLoginWithTrace(tc.username, tc.password)
    }
}

// 检查实际的请求内容
func checkRawRequest() {
    log.Println("\n=== 检查原始请求 ===")
    
    // 使用strings.NewReader创建请求体
    body := strings.NewReader(`{"username":"admin","password":"password123"}`)
    
    resp, err := http.Post("http://localhost:8080/api/v1/auth/login", "application/json", body)
    if err != nil {
        log.Printf("请求失败: %v", err)
        return
    }
    defer resp.Body.Close()
    
    respBody, _ := ioutil.ReadAll(resp.Body)
    log.Printf("直接POST响应: %d - %s", resp.StatusCode, string(respBody))
}

func main() {
    log.SetFlags(log.LstdFlags | log.Lmicroseconds)
    
    // 1. 先测试健康检查
    log.Println("=== 测试健康检查 ===")
    resp, err := http.Get("http://localhost:8080/health")
    if err != nil {
        log.Printf("健康检查失败: %v", err)
    } else {
        body, _ := ioutil.ReadAll(resp.Body)
        resp.Body.Close()
        log.Printf("健康检查响应: %s", string(body))
    }
    
    // 2. 测试标准登录
    testLoginWithTrace("admin", "password123")
    testLoginWithTrace("qiudl", "Zhiyuncai2025~")
    
    // 3. 测试原始请求
    checkRawRequest()
    
    // 4. 测试各种格式
    // testVariousFormats()
}
