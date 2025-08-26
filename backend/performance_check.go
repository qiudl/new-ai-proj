package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	dbSource := os.Getenv("DB_SOURCE")
	if dbSource == "" {
		dbSource = "postgresql://dev_user:dev_password_2024@localhost:5433/ai_project_db?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbSource)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("数据库ping失败: %v", err)
	}

	fmt.Println("========================================")
	fmt.Println("权限系统性能优化后测试")
	fmt.Println("========================================")

	// 1. 测试健康检查函数
	fmt.Println("\n1. 运行权限系统健康检查...")
	runHealthCheck(db)

	// 2. 测试高性能权限检查函数
	fmt.Println("\n2. 测试优化后的权限检查性能...")
	testOptimizedPermissionCheck(db, ctx)

	// 3. 测试批量权限检查
	fmt.Println("\n3. 测试批量权限检查功能...")
	testBatchPermissionCheck(db, ctx)

	// 4. 测试物化视图性能
	fmt.Println("\n4. 测试物化视图查询性能...")
	testMaterializedViewPerformance(db, ctx)

	// 5. 性能对比测试
	fmt.Println("\n5. 性能对比测试（优化前 vs 优化后）...")
	performanceComparison(db, ctx)

	// 6. 权限统计分析
	fmt.Println("\n6. 权限使用统计分析...")
	permissionAnalytics(db)

	fmt.Println("\n========================================")
	fmt.Println("性能优化测试完成")
	fmt.Println("========================================")
}

func runHealthCheck(db *sql.DB) {
	query := `SELECT check_name, status, details, recommendation FROM permission_system_health_check()`
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ 健康检查失败: %v", err)
		return
	}
	defer rows.Close()

	fmt.Printf("健康检查结果:\n")
	for rows.Next() {
		var checkName, status, details, recommendation string
		if err := rows.Scan(&checkName, &status, &details, &recommendation); err != nil {
			continue
		}
		
		statusIcon := "✅"
		if status == "WARN" {
			statusIcon = "⚠️"
		} else if status == "FAIL" {
			statusIcon = "❌"
		} else if status == "INFO" {
			statusIcon = "ℹ️"
		}
		
		fmt.Printf("   %s %s: %s\n", statusIcon, checkName, details)
		if status != "PASS" && status != "INFO" {
			fmt.Printf("     建议: %s\n", recommendation)
		}
	}
}

func testOptimizedPermissionCheck(db *sql.DB, ctx context.Context) {
	// 获取测试用户
	var userID int
	err := db.QueryRowContext(ctx, "SELECT id FROM company_users WHERE status = 'active' LIMIT 1").Scan(&userID)
	if err != nil {
		log.Printf("❌ 获取测试用户失败: %v", err)
		return
	}

	// 测试单个权限检查性能
	testPermissions := []string{"company.info.read", "project.create", "task.update", "finance.read"}
	
	for _, permission := range testPermissions {
		start := time.Now()
		
		var hasPermission bool
		var source, reason string
		err := db.QueryRowContext(ctx, 
			"SELECT has_permission, source, reason FROM check_user_permission_fast($1, $2)",
			userID, permission).Scan(&hasPermission, &source, &reason)
		
		duration := time.Since(start)
		
		if err != nil {
			fmt.Printf("   ❌ %s: 查询失败 (%v)\n", permission, err)
		} else {
			status := "❌"
			if hasPermission {
				status = "✅"
			}
			fmt.Printf("   %s %s: %v (耗时: %v, 来源: %s)\n", 
				status, permission, hasPermission, duration, source)
		}
	}
}

func testBatchPermissionCheck(db *sql.DB, ctx context.Context) {
	var userID int
	err := db.QueryRowContext(ctx, "SELECT id FROM company_users WHERE status = 'active' LIMIT 1").Scan(&userID)
	if err != nil {
		log.Printf("❌ 获取测试用户失败: %v", err)
		return
	}

	// 批量权限检查测试
	permissions := []string{"company.info.read", "project.create", "task.update", "finance.read", "system.admin"}
	
	start := time.Now()
	
	query := `SELECT permission_code, has_permission, source, reason 
	          FROM check_user_permissions_batch($1, $2)`
	rows, err := db.QueryContext(ctx, query, userID, fmt.Sprintf("{%s}", 
		fmt.Sprintf(`"%s"`, permissions[0])+
		fmt.Sprintf(`,"%s"`, permissions[1])+
		fmt.Sprintf(`,"%s"`, permissions[2])+
		fmt.Sprintf(`,"%s"`, permissions[3])+
		fmt.Sprintf(`,"%s"`, permissions[4])))
	
	if err != nil {
		log.Printf("❌ 批量权限检查失败: %v", err)
		return
	}
	defer rows.Close()

	duration := time.Since(start)
	count := 0
	
	fmt.Printf("   批量检查结果 (总耗时: %v):\n", duration)
	for rows.Next() {
		var permCode, source, reason string
		var hasPermission bool
		
		if err := rows.Scan(&permCode, &hasPermission, &source, &reason); err != nil {
			continue
		}
		
		status := "❌"
		if hasPermission {
			status = "✅"
		}
		fmt.Printf("     %s %s (来源: %s)\n", status, permCode, source)
		count++
	}
	
	avgTime := duration / time.Duration(count)
	fmt.Printf("   平均每个权限检查耗时: %v\n", avgTime)
}

func testMaterializedViewPerformance(db *sql.DB, ctx context.Context) {
	// 测试物化视图查询性能
	start := time.Now()
	
	var count int
	err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM mv_user_effective_permissions").Scan(&count)
	
	duration := time.Since(start)
	
	if err != nil {
		fmt.Printf("   ❌ 物化视图查询失败: %v\n", err)
	} else {
		fmt.Printf("   ✅ 物化视图记录数: %d (查询耗时: %v)\n", count, duration)
	}
	
	// 测试复杂权限查询
	start = time.Now()
	query := `
		SELECT module, COUNT(*) as user_count 
		FROM mv_user_effective_permissions 
		GROUP BY module 
		ORDER BY user_count DESC
	`
	rows, err := db.QueryContext(ctx, query)
	if err == nil {
		defer rows.Close()
		duration = time.Since(start)
		
		fmt.Printf("   权限模块分布查询 (耗时: %v):\n", duration)
		for rows.Next() {
			var module string
			var userCount int
			if err := rows.Scan(&module, &userCount); err == nil {
				fmt.Printf("     %s: %d 用户权限\n", module, userCount)
			}
		}
	}
}

func performanceComparison(db *sql.DB, ctx context.Context) {
	var userID int
	err := db.QueryRowContext(ctx, "SELECT id FROM company_users WHERE status = 'active' LIMIT 1").Scan(&userID)
	if err != nil {
		log.Printf("❌ 获取测试用户失败: %v", err)
		return
	}

	permission := "company.info.read"
	iterations := 50

	// 测试优化前的查询方式（传统JOIN查询）
	fmt.Printf("   传统查询方式 (%d次)...\n", iterations)
	start := time.Now()
	for i := 0; i < iterations; i++ {
		var hasPermission bool
		query := `
			SELECT COALESCE(rp.is_granted, false)
			FROM company_users cu
			JOIN company_roles cr ON cu.role_id = cr.id
			JOIN role_permissions rp ON cr.id = rp.role_id
			JOIN permissions p ON rp.permission_id = p.id
			WHERE cu.id = $1 AND p.permission_code = $2 AND p.is_active = true AND cr.is_active = true
		`
		_ = db.QueryRowContext(ctx, query, userID, permission).Scan(&hasPermission)
	}
	traditionalTime := time.Since(start)

	// 测试优化后的函数查询
	fmt.Printf("   优化后函数查询 (%d次)...\n", iterations)
	start = time.Now()
	for i := 0; i < iterations; i++ {
		var hasPermission bool
		var source, reason string
		_ = db.QueryRowContext(ctx, 
			"SELECT has_permission, source, reason FROM check_user_permission_fast($1, $2)",
			userID, permission).Scan(&hasPermission, &source, &reason)
	}
	optimizedTime := time.Since(start)

	// 计算性能提升
	improvement := float64(traditionalTime.Nanoseconds()) / float64(optimizedTime.Nanoseconds())
	
	fmt.Printf("   性能对比结果:\n")
	fmt.Printf("     传统方式总耗时: %v (平均: %v)\n", traditionalTime, traditionalTime/time.Duration(iterations))
	fmt.Printf("     优化后总耗时: %v (平均: %v)\n", optimizedTime, optimizedTime/time.Duration(iterations))
	fmt.Printf("     性能提升: %.2f倍\n", improvement)
	
	if improvement > 2.0 {
		fmt.Printf("     🎯 优化效果: 显著提升\n")
	} else if improvement > 1.5 {
		fmt.Printf("     🟢 优化效果: 良好提升\n")
	} else {
		fmt.Printf("     🟡 优化效果: 轻微提升\n")
	}
}

func permissionAnalytics(db *sql.DB) {
	// 权限分析统计
	query := `SELECT module, total_permissions, granted_count, users_with_permission, grant_percentage 
	          FROM v_permission_analytics ORDER BY total_permissions DESC`
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ 权限分析失败: %v", err)
		return
	}
	defer rows.Close()

	fmt.Printf("   权限模块统计:\n")
	fmt.Printf("   %-15s %-8s %-8s %-8s %-8s\n", "模块", "总权限", "已授予", "用户数", "授予率%")
	fmt.Printf("   %s\n", "-------------------------------------------------------------")
	
	totalPermissions := 0
	totalGranted := 0
	
	for rows.Next() {
		var module string
		var total, granted, users int
		var percentage float64
		
		if err := rows.Scan(&module, &total, &granted, &users, &percentage); err != nil {
			continue
		}
		
		fmt.Printf("   %-15s %-8d %-8d %-8d %-7.1f%%\n", 
			module, total, granted, users, percentage)
		
		totalPermissions += total
		totalGranted += granted
	}
	
	overallPercentage := 0.0
	if totalPermissions > 0 {
		overallPercentage = float64(totalGranted) * 100.0 / float64(totalPermissions)
	}
	
	fmt.Printf("   %s\n", "-------------------------------------------------------------")
	fmt.Printf("   %-15s %-8d %-8d %-8s %-7.1f%%\n", 
		"总计", totalPermissions, totalGranted, "-", overallPercentage)
}
