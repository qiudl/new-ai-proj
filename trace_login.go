package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "os/exec"
    "time"
)

func main() {
    log.Println("=== 跟踪登录请求 ===")
    
    // 1. 先清理日志
    exec.Command("docker", "exec", "go_backend", "sh", "-c", "echo '' > /tmp/login_trace.log").Run()
    
    // 2. 启动日志监控
    go func() {
        cmd := exec.Command("docker", "logs", "-f", "--tail", "100", "go_backend")
        cmd.Stdout = os.Stdout
        cmd.Stderr = os.Stderr
        cmd.Run()
    }()
    
    // 等待一下
    time.Sleep(2 * time.Second)
    
    // 3. 发送登录请求
    loginData := map[string]string{
        "username": "admin",
        "password": "password123",
    }
    
    jsonData, _ := json.Marshal(loginData)
    
    log.Println("\n发送登录请求...")
    resp, err := http.Post("http://localhost:8080/api/v1/auth/login", "application/json", bytes.NewBuffer(jsonData))
    if err != nil {
        log.Printf("请求失败: %v", err)
        return
    }
    defer resp.Body.Close()
    
    body, _ := ioutil.ReadAll(resp.Body)
    log.Printf("响应状态: %d", resp.StatusCode)
    log.Printf("响应内容: %s", string(body))
    
    // 4. 检查数据库连接
    log.Println("\n检查应用的数据库连接...")
    healthResp, err := http.Get("http://localhost:8080/health")
    if err == nil {
        defer healthResp.Body.Close()
        healthBody, _ := ioutil.ReadAll(healthResp.Body)
        log.Printf("健康检查响应: %s", string(healthBody))
    }
    
    // 5. 直接检查GetByUsername的实现
    log.Println("\n检查GetByUsername实现...")
    cmd := exec.Command("docker", "exec", "go_backend", "grep", "-n", "GetByUsername", "/app/database/user_repository.go")
    output, _ := cmd.Output()
    log.Printf("GetByUsername位置:\n%s", string(output))
}
