package main

import (
    "fmt"
    "golang.org/x/crypto/bcrypt"
)

func main() {
    password := "password123"
    hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    if err \!= nil {
        panic(err)
    }
    fmt.Print(string(hash))
}
