package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	// 从环境变量读取数据库连接信息
	dsn := os.Getenv("DB_MASTER_DSN")
	if dsn == "" {
		// 构建DSN
		host := getEnv("DB_HOST", "127.0.0.1")
		port := getEnv("DB_PORT", "5433")
		user := getEnv("DB_USER", "ai_prod_user")
		password := getEnv("DB_PASSWORD", "")
		dbname := getEnv("DB_NAME", "ai_project_prod")
		sslmode := getEnv("DB_SSL_MODE", "disable")

		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode)
	}

	log.Println("连接数据库...")
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("无法连接数据库: %v", err)
	}
	defer db.Close()

	// 测试连接
	if err := db.Ping(); err != nil {
		log.Fatalf("数据库ping失败: %v", err)
	}
	log.Println("✅ 数据库连接成功")

	// 先执行清理脚本
	cleanupFile := "scripts/fix-roles-before-init.sql"
	log.Printf("执行清理脚本: %s", cleanupFile)
	cleanupBytes, err := os.ReadFile(cleanupFile)
	if err != nil {
		log.Printf("⚠️  读取清理脚本失败: %v (跳过)", err)
	} else {
		_, err = db.Exec(string(cleanupBytes))
		if err != nil {
			log.Printf("⚠️  执行清理脚本失败: %v (继续)", err)
		} else {
			log.Println("✅ 清理脚本执行完成")
		}
	}

	// 读取SQL文件
	sqlFile := "scripts/init-default-system-roles.sql"
	log.Printf("读取SQL文件: %s", sqlFile)
	sqlBytes, err := os.ReadFile(sqlFile)
	if err != nil {
		log.Fatalf("读取SQL文件失败: %v", err)
	}

	// 执行SQL
	log.Println("执行SQL脚本...")
	_, err = db.Exec(string(sqlBytes))
	if err != nil {
		log.Fatalf("执行SQL失败: %v", err)
	}

	log.Println("✅ 系统角色初始化完成")

	// 验证角色数量
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM company_roles WHERE is_system_role = true AND enterprise_id IS NULL").Scan(&count)
	if err != nil {
		log.Printf("⚠️  无法验证角色数量: %v", err)
	} else {
		log.Printf("✅ 已创建 %d 个系统角色", count)
	}

	// 读取并执行企业角色SQL
	enterpriseSQL := "scripts/create-enterprise-roles.sql"
	log.Printf("读取企业角色SQL文件: %s", enterpriseSQL)
	entSQLBytes, err := os.ReadFile(enterpriseSQL)
	if err != nil {
		log.Printf("⚠️  读取企业角色SQL文件失败: %v", err)
	} else {
		log.Println("执行企业角色SQL脚本...")
		_, err = db.Exec(string(entSQLBytes))
		if err != nil {
			log.Printf("⚠️  执行企业角色SQL失败: %v", err)
		} else {
			log.Println("✅ 企业角色初始化完成")
		}
	}

	// 验证企业角色数量
	err = db.QueryRow("SELECT COUNT(*) FROM company_roles WHERE enterprise_id IS NOT NULL").Scan(&count)
	if err != nil {
		log.Printf("⚠️  无法验证企业角色数量: %v", err)
	} else {
		log.Printf("✅ 已创建 %d 个企业角色", count)
	}

	log.Println("🎉 角色初始化完成！")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
