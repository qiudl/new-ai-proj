package main

import (
    "database/sql"
    "fmt"
    "log"
    _ "github.com/lib/pq"
    "golang.org/x/crypto/bcrypt"
)

func main() {
    // 连接数据库
    db, err := sql.Open("postgres", "postgresql://prod_user:prod_secure_password_2024@db:5432/ai_project_prod?sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // 列出所有用户
    rows, err := db.Query("SELECT id, username, password_hash FROM users ORDER BY id")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    fmt.Println("数据库中的用户:")
    for rows.Next() {
        var id int
        var username, passwordHash string
        rows.Scan(&id, &username, &passwordHash)
        fmt.Printf("ID: %d, Username: %s, Hash: %s\n", id, username, passwordHash[:20]+"...")
    }

    // 测试密码
    testCases := []struct {
        username string
        password string
    }{
        {"admin", "password123"},
        {"qiudl", "Zhiyuncai2025~"},
    }

    for _, tc := range testCases {
        var hash string
        err := db.QueryRow("SELECT password_hash FROM users WHERE username = $1", tc.username).Scan(&hash)
        if err != nil {
            fmt.Printf("\n用户 %s 不存在\n", tc.username)
            continue
        }

        fmt.Printf("\n测试用户 %s, 密码: %s\n", tc.username, tc.password)
        
        // 使用应用的 cost=12 验证
        err = bcrypt.CompareHashAndPassword([]byte(hash), []byte(tc.password))
        if err == nil {
            fmt.Println("✓ 密码验证成功!")
        } else {
            fmt.Printf("✗ 密码验证失败: %v\n", err)
            
            // 生成新的哈希
            newHash, _ := bcrypt.GenerateFromPassword([]byte(tc.password), 12)
            fmt.Printf("建议的新哈希: %s\n", newHash)
        }
    }
}
