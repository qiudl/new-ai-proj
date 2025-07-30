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

    // 查询 admin 用户
    var id int
    var username, passwordHash string
    err = db.QueryRow("SELECT id, username, password_hash FROM users WHERE username = $1", "admin").Scan(&id, &username, &passwordHash)
    if err != nil {
        log.Printf("查询用户失败: %v", err)
        return
    }

    fmt.Printf("找到用户: ID=%d, Username=%s\n", id, username)
    fmt.Printf("密码哈希: %s\n", passwordHash)

    // 测试密码
    testPassword := "Zhiyuncai2025~"
    err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(testPassword))
    if err == nil {
        fmt.Println("密码验证成功！")
    } else {
        fmt.Printf("密码验证失败: %v\n", err)
    }
}
