package main

import (
    "fmt"
    "golang.org/x/crypto/bcrypt"
)

func main() {
    // 测试当前数据库中的密码哈希
    storedHash := "$2a$10$a2Xb7ktaBYAZpYhdvGxa5ekOchFNSuInmUINYRNP.Q0ATuw.rN3Ce"
    password := "Zhiyuncai2025~"
    
    err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password))
    if err == nil {
        fmt.Println("密码验证成功！")
    } else {
        fmt.Printf("密码验证失败: %v\n", err)
        
        // 生成新的哈希
        newHash, _ := bcrypt.GenerateFromPassword([]byte(password), 10)
        fmt.Printf("新的哈希值: %s\n", newHash)
    }
}
