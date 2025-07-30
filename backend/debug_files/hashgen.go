package main

import (
    "fmt"
    "golang.org/x/crypto/bcrypt"
)

func main() {
    password := []byte("Zhiyuncai2025~")
    hash, _ := bcrypt.GenerateFromPassword(password, 10)
    fmt.Println(string(hash))
}
