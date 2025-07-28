package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
)

// 简单的编译测试
func main() {
	// 获取当前目录
	currentDir, err := os.Getwd()
	if err != nil {
		log.Fatal("获取当前目录失败:", err)
	}
	
	fmt.Printf("当前目录: %s\n", currentDir)
	
	// 检查是否在backend目录
	if filepath.Base(currentDir) != "backend" {
		fmt.Println("请在backend目录下运行此脚本")
		return
	}
	
	fmt.Println("=== 验证Go模块和依赖 ===")
	
	// 检查go.mod
	if _, err := os.Stat("go.mod"); os.IsNotExist(err) {
		log.Fatal("go.mod文件不存在")
	} else {
		fmt.Println("✅ go.mod 存在")
	}
	
	// 检查main.go
	if _, err := os.Stat("main.go"); os.IsNotExist(err) {
		log.Fatal("main.go文件不存在")
	} else {
		fmt.Println("✅ main.go 存在")
	}
	
	// 检查handlers目录
	if _, err := os.Stat("handlers"); os.IsNotExist(err) {
		log.Fatal("handlers目录不存在")
	} else {
		fmt.Println("✅ handlers 目录存在")
	}
	
	// 检查statistics_handlers.go
	if _, err := os.Stat("handlers/statistics_handlers.go"); os.IsNotExist(err) {
		log.Fatal("handlers/statistics_handlers.go文件不存在")
	} else {
		fmt.Println("✅ statistics_handlers.go 存在")
	}
	
	fmt.Println("\n=== 编译验证完成 ===")
	fmt.Println("文件结构正确，可以尝试编译")
	fmt.Println("\n建议执行以下命令:")
	fmt.Println("1. go mod tidy")
	fmt.Println("2. go build -o main main.go")
	fmt.Println("3. 如果编译成功，可以运行: ./main")
}
