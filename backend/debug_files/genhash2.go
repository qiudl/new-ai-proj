package main

import (
    "fmt"
    "golang.org/x/crypto/bcrypt"
)

func main() {
    // 使用 cost=12 生成哈希
    cost := 12
    
    // 为 qiudl 生成密码哈希
    password := "Zhiyuncai2025~"
    hash, _ := bcrypt.GenerateFromPassword([]byte(password), cost)
    fmt.Printf("qiudl 密码哈希 (cost=12): %s\n", hash)
    
    // 为 admin 生成 password123 的哈希
    adminPassword := "password123"
    adminHash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), cost)
    fmt.Printf("admin 密码哈希 (cost=12): %s\n", adminHash)
}
