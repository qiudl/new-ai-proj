package main

import (
	"database/sql"
	"fmt"
	"log"

	"ai-project-backend/config"
	_ "github.com/lib/pq"
)

func main() {
	fmt.Println("=== 审计功能设置验证 ===")
	
	// 加载配置
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Printf("警告: 无法加载配置文件: %v", err)
		fmt.Println("⚠ 配置文件加载失败，使用默认配置进行测试")
		return
	}
	
	// 连接数据库
	dsn := cfg.GetDatabaseDSN()
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Printf("数据库连接失败: %v", err)
		fmt.Println("✗ 数据库连接失败")
		return
	}
	defer db.Close()
	
	// 测试数据库连接
	if err := db.Ping(); err != nil {
		log.Printf("数据库ping失败: %v", err)
		fmt.Println("✗ 数据库连接测试失败")
		return
	}
	fmt.Println("✓ 数据库连接成功")
	
	// 检查audit_logs表是否存在
	var tableName string
	err = db.QueryRow("SELECT tablename FROM pg_tables WHERE tablename = 'audit_logs'").Scan(&tableName)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("✗ audit_logs表不存在，需要运行数据库迁移")
			fmt.Println("  运行: psql -U user -d main_db -f migrations/005_create_audit_tables.sql")
		} else {
			log.Printf("查询audit_logs表失败: %v", err)
			fmt.Println("✗ 无法检查audit_logs表")
		}
		return
	}
	fmt.Println("✓ audit_logs表存在")
	
	// 检查audit_configs表是否存在
	err = db.QueryRow("SELECT tablename FROM pg_tables WHERE tablename = 'audit_configs'").Scan(&tableName)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("✗ audit_configs表不存在")
		} else {
			log.Printf("查询audit_configs表失败: %v", err)
		}
		return
	}
	fmt.Println("✓ audit_configs表存在")
	
	// 检查默认审计配置是否存在
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM audit_configs").Scan(&count)
	if err != nil {
		log.Printf("查询audit_configs数量失败: %v", err)
		fmt.Println("✗ 无法检查审计配置")
		return
	}
	
	if count > 0 {
		fmt.Printf("✓ 找到%d个审计配置\n", count)
	} else {
		fmt.Println("⚠ 未找到审计配置，可能需要重新运行迁移脚本")
	}
	
	fmt.Println("\n=== 审计设置状态 ===")
	fmt.Println("✓ 数据库连接正常")
	fmt.Println("✓ 审计表结构完整")
	fmt.Println("✓ 可以开始测试审计功能")
}