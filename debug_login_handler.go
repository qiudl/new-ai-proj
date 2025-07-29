package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    
    _ "github.com/lib/pq"
    "golang.org/x/crypto/bcrypt"
)

// 模拟登录处理器的调试版本
func debugLoginHandler(w http.ResponseWriter, r *http.Request) {
    log.Println("[DEBUG] ========== 开始处理登录请求 ==========")
    log.Printf("[DEBUG] 请求方法: %s", r.Method)
    log.Printf("[DEBUG] 请求路径: %s", r.URL.Path)
    log.Printf("[DEBUG] 请求头: %v", r.Header)
    
    // 读取请求体
    var loginReq struct {
        Username string `json:"username"`
        Password string `json:"password"`
    }
    
    decoder := json.NewDecoder(r.Body)
    err := decoder.Decode(&loginReq)
    if err != nil {
        log.Printf("[ERROR] 解析请求体失败: %v", err)
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    log.Printf("[DEBUG] 登录请求: username=%s, password=***", loginReq.Username)
    
    // 连接数据库
    dbConn := "postgresql://prod_user:prod_secure_password_2024@db:5432/ai_project_prod?sslmode=disable"
    db, err := sql.Open("postgres", dbConn)
    if err != nil {
        log.Printf("[ERROR] 数据库连接失败: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    defer db.Close()
    
    // 查询用户
    log.Printf("[DEBUG] 查询用户: %s", loginReq.Username)
    
    var user struct {
        ID           int
        Username     string
        PasswordHash string
        Email        sql.NullString
        UserType     sql.NullString
        CompanyID    sql.NullInt64
        CompanyUserID sql.NullInt64
        Role         string
        Status       sql.NullString
        Profile      sql.NullString
        LastLoginAt  sql.NullTime
        CurrentTimingTaskID sql.NullInt64
        TimingStartTime sql.NullTime
        TimingStatus sql.NullString
        CreatedAt    sql.Time
        UpdatedAt    sql.NullTime
    }
    
    query := `
        SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
               role, status, profile, last_login_at,
               current_timing_task_id, timing_start_time, timing_status,
               created_at, updated_at
        FROM users WHERE username = $1`
    
    err = db.QueryRow(query, loginReq.Username).Scan(
        &user.ID, &user.Username, &user.Email, &user.PasswordHash,
        &user.UserType, &user.CompanyID, &user.CompanyUserID,
        &user.Role, &user.Status, &user.Profile, &user.LastLoginAt,
        &user.CurrentTimingTaskID, &user.TimingStartTime, &user.TimingStatus,
        &user.CreatedAt, &user.UpdatedAt,
    )
    
    if err == sql.ErrNoRows {
        log.Printf("[DEBUG] 用户不存在: %s", loginReq.Username)
        http.Error(w, "Invalid username or password", http.StatusUnauthorized)
        return
    }
    
    if err != nil {
        log.Printf("[ERROR] 查询用户失败: %v", err)
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }
    
    log.Printf("[DEBUG] 找到用户: ID=%d, Role=%s, Status=%v", user.ID, user.Role, user.Status.String)
    
    // 验证密码
    err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(loginReq.Password))
    if err != nil {
        log.Printf("[DEBUG] 密码验证失败: %v", err)
        http.Error(w, "Invalid username or password", http.StatusUnauthorized)
        return
    }
    
    log.Printf("[DEBUG] 密码验证成功!")
    
    // 返回成功响应
    response := map[string]interface{}{
        "success": true,
        "data": map[string]interface{}{
            "user": map[string]interface{}{
                "id":       user.ID,
                "username": user.Username,
                "role":     user.Role,
            },
            "token": "debug-token-12345",
        },
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
    
    log.Println("[DEBUG] ========== 登录请求处理完成 ==========")
}

func main() {
    // 启动测试服务器
    http.HandleFunc("/debug/login", debugLoginHandler)
    
    port := ":8081"
    log.Printf("启动调试服务器在端口 %s", port)
    
    if err := http.ListenAndServe(port, nil); err != nil {
        log.Fatal(err)
    }
}
