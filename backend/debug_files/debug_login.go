package main

import (
    "bytes"
    "database/sql"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "os"
    "time"
    
    _ "github.com/lib/pq"
    "golang.org/x/crypto/bcrypt"
)

// LoginRequest 结构体
type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

// LoginResponse 结构体
type LoginResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data"`
    Error   interface{} `json:"error"`
}

func main() {
    fmt.Println("=== 登录调试程序 ===")
    fmt.Println("时间:", time.Now().Format("2006-01-02 15:04:05"))
    
    // 步骤1: 测试数据库连接
    fmt.Println("\n[步骤1] 测试数据库连接...")
    dbConn := os.Getenv("DB_SOURCE")
    if dbConn == "" {
        dbConn = "postgresql://prod_user:prod_secure_password_2024@localhost:5432/ai_project_prod?sslmode=disable"
    }
    
    db, err := sql.Open("postgres", dbConn)
    if err != nil {
        log.Fatal("数据库连接失败:", err)
    }
    defer db.Close()
    
    err = db.Ping()
    if err != nil {
        log.Fatal("数据库ping失败:", err)
    }
    fmt.Println("✓ 数据库连接成功")
    
    // 步骤2: 检查用户表结构
    fmt.Println("\n[步骤2] 检查用户表结构...")
    rows, err := db.Query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
    `)
    if err != nil {
        log.Fatal("查询表结构失败:", err)
    }
    defer rows.Close()
    
    fmt.Println("用户表字段:")
    for rows.Next() {
        var colName, dataType, isNullable string
        rows.Scan(&colName, &dataType, &isNullable)
        fmt.Printf("  - %s (%s) nullable=%s\n", colName, dataType, isNullable)
    }
    
    // 步骤3: 检查用户数据
    fmt.Println("\n[步骤3] 检查用户数据...")
    userRows, err := db.Query("SELECT id, username, password_hash, email, user_type, status FROM users WHERE username IN ('admin', 'qiudl')")
    if err != nil {
        log.Fatal("查询用户失败:", err)
    }
    defer userRows.Close()
    
    type User struct {
        ID           int
        Username     string
        PasswordHash string
        Email        sql.NullString
        UserType     sql.NullString
        Status       sql.NullString
    }
    
    var users []User
    for userRows.Next() {
        var u User
        err := userRows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Email, &u.UserType, &u.Status)
        if err != nil {
            log.Printf("扫描用户数据失败: %v", err)
            continue
        }
        users = append(users, u)
        
        fmt.Printf("\n用户: %s (ID=%d)\n", u.Username, u.ID)
        fmt.Printf("  Email: %s\n", u.Email.String)
        fmt.Printf("  UserType: %s\n", u.UserType.String)
        fmt.Printf("  Status: %s\n", u.Status.String)
        fmt.Printf("  PasswordHash: %s...\n", u.PasswordHash[:20])
    }
    
    // 步骤4: 验证密码哈希
    fmt.Println("\n[步骤4] 验证密码哈希...")
    testPasswords := map[string]string{
        "admin": "password123",
        "qiudl": "Zhiyuncai2025~",
    }
    
    for _, user := range users {
        if pwd, ok := testPasswords[user.Username]; ok {
            err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(pwd))
            if err == nil {
                fmt.Printf("✓ %s 密码验证成功\n", user.Username)
            } else {
                fmt.Printf("✗ %s 密码验证失败: %v\n", user.Username, err)
                // 生成新的哈希
                newHash, _ := bcrypt.GenerateFromPassword([]byte(pwd), 12)
                fmt.Printf("  建议的新哈希: %s\n", newHash)
            }
        }
    }
    
    // 步骤5: 测试API登录
    fmt.Println("\n[步骤5] 测试API登录...")
    for username, password := range testPasswords {
        fmt.Printf("\n测试登录 %s...\n", username)
        
        loginReq := LoginRequest{
            Username: username,
            Password: password,
        }
        
        jsonData, _ := json.Marshal(loginReq)
        
        // 测试本地API
        resp, err := http.Post("http://localhost:8080/api/v1/auth/login", "application/json", bytes.NewBuffer(jsonData))
        if err != nil {
            fmt.Printf("  API请求失败: %v\n", err)
            continue
        }
        defer resp.Body.Close()
        
        body, _ := ioutil.ReadAll(resp.Body)
        fmt.Printf("  响应状态: %d\n", resp.StatusCode)
        fmt.Printf("  响应内容: %s\n", string(body))
        
        var loginResp LoginResponse
        if err := json.Unmarshal(body, &loginResp); err == nil {
            if loginResp.Success {
                fmt.Printf("  ✓ 登录成功!\n")
            } else {
                fmt.Printf("  ✗ 登录失败: %v\n", loginResp.Error)
            }
        }
    }
    
    // 步骤6: 检查应用配置
    fmt.Println("\n[步骤6] 检查应用环境变量...")
    envVars := []string{"DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET", "GIN_MODE"}
    for _, env := range envVars {
        value := os.Getenv(env)
        if value != "" {
            fmt.Printf("  %s = %s\n", env, value)
        } else {
            fmt.Printf("  %s = (未设置)\n", env)
        }
    }
    
    // 步骤7: 修复建议
    fmt.Println("\n[步骤7] 问题诊断和修复建议...")
    
    // 检查是否所有用户都有必需的字段
    nullCheckQuery := `
        SELECT username, 
               CASE WHEN email IS NULL OR email = '' THEN 'email' ELSE '' END ||
               CASE WHEN user_type IS NULL THEN ' user_type' ELSE '' END ||
               CASE WHEN status IS NULL THEN ' status' ELSE '' END as missing_fields
        FROM users 
        WHERE username IN ('admin', 'qiudl')
        AND (email IS NULL OR email = '' OR user_type IS NULL OR status IS NULL)
    `
    
    nullRows, err := db.Query(nullCheckQuery)
    if err == nil {
        defer nullRows.Close()
        hasIssues := false
        for nullRows.Next() {
            var username, missingFields string
            nullRows.Scan(&username, &missingFields)
            if missingFields != "" {
                fmt.Printf("  ! 用户 %s 缺少字段: %s\n", username, missingFields)
                hasIssues = true
            }
        }
        if !hasIssues {
            fmt.Println("  ✓ 所有用户字段完整")
        }
    }
    
    fmt.Println("\n调试完成!")
}
