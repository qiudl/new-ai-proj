package main

import (
    "fmt"
    "golang.org/x/crypto/bcrypt"
)

func main() {
    // 为 qiudl 生成密码哈希
    password := "Zhiyuncai2025~"
    hash, _ := bcrypt.GenerateFromPassword([]byte(password), 10)
    fmt.Printf("qiudl 密码哈希: %s\n", hash)
    
    // 为 admin 生成 password123 的哈希
    adminPassword := "password123"
    adminHash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), 10)
    fmt.Printf("admin 密码哈希: %s\n", adminHash)
}
