package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
	"log"
)

func main() {
	password := "test123"
	hash := "$2a$10$ouKQUR/pAOhVmCrsQGn7nuDYjfa9Nla0g.j8G10hrF8IPRr5gipBa"
	
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		log.Printf("Password does not match: %v", err)
	} else {
		fmt.Println("Password matches!")
	}
}
