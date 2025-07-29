package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    
    _ "github.com/lib/pq"
)

// 创建一个调试版本的GetByUsername函数
func debugGetByUsername(ctx context.Context, db *sql.DB, username string) error {
    log.Printf("[DEBUG GetByUsername] 开始查询用户: %s", username)
    
    query := `
        SELECT id, username, email, password_hash, user_type, company_id, company_user_id,
               role, status, profile, last_login_at,
               current_timing_task_id, timing_start_time, timing_status,
               created_at, updated_at
        FROM users WHERE username = $1`
    
    log.Printf("[DEBUG GetByUsername] SQL查询: %s", query)
    
    // 创建一个简化的结构来接收数据
    var (
        id                  int
        username_db         string
        email               sql.NullString
        passwordHash        string
        userType            sql.NullString
        companyID           sql.NullInt64
        companyUserID       sql.NullInt64
        role                string
        status              sql.NullString
        profile             sql.NullString
        lastLoginAt         sql.NullTime
        currentTimingTaskID sql.NullInt64
        timingStartTime     sql.NullTime
        timingStatus        sql.NullString
        createdAt           sql.NullTime
        updatedAt           sql.NullTime
    )
    
    row := db.QueryRowContext(ctx, query, username)
    
    err := row.Scan(
        &id, &username_db, &email, &passwordHash,
        &userType, &companyID, &companyUserID,
        &role, &status, &profile, &lastLoginAt,
        &currentTimingTaskID, &timingStartTime, &timingStatus,
        &createdAt, &updatedAt,
    )
    
    if err == sql.ErrNoRows {
        log.Printf("[DEBUG GetByUsername] 用户不存在: %s", username)
        return fmt.Errorf("user not found")
    }
    
    if err != nil {
        log.Printf("[DEBUG GetByUsername] 扫描错误: %v", err)
        log.Printf("[DEBUG GetByUsername] 错误类型: %T", err)
        
        // 尝试获取更多信息
        var count int
        countErr := db.QueryRow("SELECT COUNT(*) FROM users WHERE username = $1", username).Scan(&count)
        if countErr == nil {
            log.Printf("[DEBUG GetByUsername] 用户数量: %d", count)
        }
        
        // 检查列是否存在
        columnsQuery := `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position`
        
        rows, _ := db.Query(columnsQuery)
        if rows != nil {
            defer rows.Close()
            log.Printf("[DEBUG GetByUsername] 表中的列:")
            for rows.Next() {
                var colName string
                rows.Scan(&colName)
                log.Printf("  - %s", colName)
            }
        }
        
        return fmt.Errorf("failed to scan user: %w", err)
    }
    
    log.Printf("[DEBUG GetByUsername] 成功获取用户:")
    log.Printf("  ID: %d", id)
    log.Printf("  Username: %s", username_db)
    log.Printf("  Email: %v", email.String)
    log.Printf("  Role: %s", role)
    log.Printf("  UserType: %v", userType.String)
    log.Printf("  Status: %v", status.String)
    
    return nil
}

// 测试函数
func testDebugLogin() {
    // 连接数据库
    db, err := sql.Open("postgres", "postgresql://prod_user:prod_secure_password_2024@db:5432/ai_project_prod?sslmode=disable")
    if err != nil {
        log.Fatal("数据库连接失败:", err)
    }
    defer db.Close()
    
    // 测试查询
    ctx := context.Background()
    err = debugGetByUsername(ctx, db, "admin")
    if err != nil {
        log.Printf("测试失败: %v", err)
    } else {
        log.Println("测试成功!")
    }
}

func main() {
    testDebugLogin()
}
