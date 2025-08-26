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

type Permission struct {
	ID                    int    `json:"id"`
	PermissionCode        string `json:"permission_code"`
	PermissionName        string `json:"permission_name"`
	PermissionDescription string `json:"permission_description"`
	Module                string `json:"module"`
	Resource              string `json:"resource"`
	Action                string `json:"action"`
	IsActive              bool   `json:"is_active"`
}

type CompanyRole struct {
	ID           int    `json:"id"`
	RoleCode     string `json:"role_code"`
	RoleName     string `json:"role_name"`
	RoleDescription string `json:"role_description"`
	IsSystemRole bool   `json:"is_system_role"`
	IsActive     bool   `json:"is_active"`
}

type CompanyUser struct {
	ID     int    `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	RoleID int    `json:"role_id"`
}

func main() {
	// 数据库连接配置
	dbSource := os.Getenv("DB_SOURCE")
	if dbSource == "" {
		dbSource = "postgresql://dev_user:dev_password_2024@localhost:5433/ai_project_db?sslmode=disable"
	}

	log.Printf("连接数据库: %s", dbSource)

	// 连接数据库
	db, err := sql.Open("postgres", dbSource)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	defer db.Close()

	// 测试连接
	ctx := context.Background()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("数据库ping失败: %v", err)
	}
	log.Println("✅ 数据库连接成功")

	fmt.Println("========================================")
	fmt.Println("权限系统功能测试")
	fmt.Println("========================================")

	// 测试1: 获取所有权限
	fmt.Println("\n1. 测试获取所有权限...")
	permissions, err := getAllPermissions(db)
	if err != nil {
		log.Printf("❌ 获取权限失败: %v", err)
	} else {
		fmt.Printf("✅ 成功获取权限数量: %d\n", len(permissions))
		if len(permissions) > 0 {
			fmt.Printf("   示例权限: %s - %s\n", permissions[0].PermissionCode, permissions[0].PermissionName)
		}
		// 显示前5个权限
		fmt.Println("   权限列表（前10个）：")
		for i, p := range permissions {
			if i >= 10 {
				break
			}
			fmt.Printf("   - %s (%s.%s.%s)\n", p.PermissionName, p.Module, p.Resource, p.Action)
		}
	}

	// 测试2: 获取所有角色
	fmt.Println("\n2. 测试获取所有角色...")
	roles, err := getAllRoles(db)
	if err != nil {
		log.Printf("❌ 获取角色失败: %v", err)
	} else {
		fmt.Printf("✅ 成功获取角色数量: %d\n", len(roles))
		for _, role := range roles {
			permCount, _ := getRolePermissionCount(db, role.ID)
			fmt.Printf("   角色: %s (%s) - 权限数量: %d\n", role.RoleCode, role.RoleName, permCount)
		}
	}

	// 测试3: 检查角色权限
	fmt.Println("\n3. 测试角色权限分配...")
	if len(roles) > 0 {
		for _, role := range roles {
			rolePermissions, err := getRolePermissions(db, role.ID)
			if err != nil {
				log.Printf("❌ 获取角色权限失败: %v", err)
			} else {
				fmt.Printf("   角色 %s 拥有权限数量: %d\n", role.RoleName, len(rolePermissions))
				if len(rolePermissions) > 0 {
					fmt.Printf("     示例权限: %s", rolePermissions[0])
					if len(rolePermissions) > 1 {
						fmt.Printf(", %s", rolePermissions[1])
					}
					if len(rolePermissions) > 2 {
						fmt.Printf(", %s", rolePermissions[2])
					}
					fmt.Println()
				}
			}
		}
	}

	// 测试4: 模拟用户权限检查
	fmt.Println("\n4. 测试用户权限检查...")
	testUsers, err := getTestUsers(db)
	if err != nil {
		log.Printf("❌ 获取测试用户失败: %v", err)
	} else if len(testUsers) > 0 {
		for _, user := range testUsers[:min(3, len(testUsers))] {
			fmt.Printf("   测试用户: %s (ID: %d, Role ID: %d)\n", user.Name, user.ID, user.RoleID)
			
			// 测试一些基本权限
			testPermissions := []string{"project.read", "task.read", "system.admin", "company.info.read"}
			for _, permCode := range testPermissions {
				hasPermission, err := checkUserPermission(db, ctx, user.ID, permCode)
				if err != nil {
					fmt.Printf("     权限检查错误 (%s): %v\n", permCode, err)
				} else {
					status := "❌"
					if hasPermission {
						status = "✅"
					}
					fmt.Printf("     %s %s\n", status, permCode)
				}
			}
		}
	} else {
		// 创建测试用户
		fmt.Println("   没有找到现有用户，创建测试用户...")
		testUserID, err := createTestUser(db)
		if err != nil {
			log.Printf("❌ 创建测试用户失败: %v", err)
		} else {
			fmt.Printf("✅ 创建测试用户成功，ID: %d\n", testUserID)
		}
	}

	// 测试5: 性能测试
	fmt.Println("\n5. 权限查询性能测试...")
	if len(testUsers) > 0 {
		startTime := time.Now()
		iterations := 100
		
		successCount := 0
		for i := 0; i < iterations; i++ {
			user := testUsers[i%len(testUsers)]
			hasPermission, err := checkUserPermission(db, ctx, user.ID, "project.read")
			if err == nil {
				successCount++
				_ = hasPermission
			}
		}
		
		duration := time.Since(startTime)
		avgTime := duration / time.Duration(iterations)
		
		fmt.Printf("✅ 完成 %d 次权限检查 (成功: %d)\n", iterations, successCount)
		fmt.Printf("   总耗时: %v\n", duration)
		fmt.Printf("   平均耗时: %v\n", avgTime)
		fmt.Printf("   QPS: %.2f\n", float64(successCount)/duration.Seconds())
		
		// 性能评估
		if avgTime.Milliseconds() < 10 {
			fmt.Println("   🎯 性能评级: 优秀")
		} else if avgTime.Milliseconds() < 50 {
			fmt.Println("   🟢 性能评级: 良好")
		} else {
			fmt.Println("   🟡 性能评级: 需要优化")
		}
	}

	// 测试6: 数据完整性检查
	fmt.Println("\n6. 数据完整性检查...")
	integrityIssues := 0
	
	// 检查孤立的权限关联
	orphanRolePermissions, err := checkOrphanRolePermissions(db)
	if err != nil {
		log.Printf("❌ 检查孤立角色权限失败: %v", err)
	} else if orphanRolePermissions > 0 {
		fmt.Printf("⚠️  发现孤立角色权限关联: %d\n", orphanRolePermissions)
		integrityIssues++
	} else {
		fmt.Println("✅ 角色权限关联完整性检查通过")
	}

	// 检查无权限的角色
	rolesWithoutPermissions, err := checkRolesWithoutPermissions(db)
	if err != nil {
		log.Printf("❌ 检查无权限角色失败: %v", err)
	} else if rolesWithoutPermissions > 0 {
		fmt.Printf("⚠️  发现无权限的角色: %d\n", rolesWithoutPermissions)
		integrityIssues++
	} else {
		fmt.Println("✅ 角色权限分配检查通过")
	}

	if integrityIssues == 0 {
		fmt.Println("✅ 所有数据完整性检查通过")
	}

	// 测试7: 权限缓存测试（模拟）
	fmt.Println("\n7. 权限缓存性能对比测试...")
	if len(testUsers) > 0 {
		user := testUsers[0]
		
		// 无缓存查询10次
		startTime := time.Now()
		for i := 0; i < 10; i++ {
			_, _ = checkUserPermission(db, ctx, user.ID, "project.read")
		}
		noCacheTime := time.Since(startTime)
		
		fmt.Printf("   无缓存10次查询耗时: %v (平均: %v)\n", noCacheTime, noCacheTime/10)
		fmt.Printf("   建议: 实现Redis缓存可提升性能约5-10倍\n")
	}

	fmt.Println("\n========================================")
	fmt.Println("权限系统测试完成")
	fmt.Printf("测试总结:\n")
	fmt.Printf("- 权限数量: %d\n", len(permissions))
	fmt.Printf("- 角色数量: %d\n", len(roles))
	fmt.Printf("- 测试用户数量: %d\n", len(testUsers))
	if integrityIssues == 0 {
		fmt.Printf("- 数据完整性: ✅ 通过\n")
	} else {
		fmt.Printf("- 数据完整性: ⚠️ 发现%d个问题\n", integrityIssues)
	}
	fmt.Println("========================================")
}

// 辅助函数
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func getAllPermissions(db *sql.DB) ([]Permission, error) {
	query := `SELECT id, permission_code, permission_name, permission_description, module, resource, action, is_active FROM permissions WHERE is_active = true ORDER BY module, permission_code`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []Permission
	for rows.Next() {
		var p Permission
		err := rows.Scan(&p.ID, &p.PermissionCode, &p.PermissionName, &p.PermissionDescription, &p.Module, &p.Resource, &p.Action, &p.IsActive)
		if err != nil {
			return nil, err
		}
		permissions = append(permissions, p)
	}
	return permissions, nil
}

func getAllRoles(db *sql.DB) ([]CompanyRole, error) {
	query := `SELECT id, role_code, role_name, role_description, is_system_role, is_active FROM company_roles WHERE is_active = true ORDER BY role_code`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []CompanyRole
	for rows.Next() {
		var r CompanyRole
		err := rows.Scan(&r.ID, &r.RoleCode, &r.RoleName, &r.RoleDescription, &r.IsSystemRole, &r.IsActive)
		if err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, nil
}

func getRolePermissionCount(db *sql.DB, roleID int) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM role_permissions rp
		JOIN permissions p ON rp.permission_id = p.id
		WHERE rp.role_id = $1 AND rp.is_granted = true AND p.is_active = true
	`
	var count int
	err := db.QueryRow(query, roleID).Scan(&count)
	return count, err
}

func getRolePermissions(db *sql.DB, roleID int) ([]string, error) {
	query := `
		SELECT p.permission_code 
		FROM role_permissions rp
		JOIN permissions p ON rp.permission_id = p.id
		WHERE rp.role_id = $1 AND rp.is_granted = true AND p.is_active = true
		ORDER BY p.permission_code
	`
	rows, err := db.Query(query, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var permissionCode string
		if err := rows.Scan(&permissionCode); err != nil {
			return nil, err
		}
		permissions = append(permissions, permissionCode)
	}
	return permissions, nil
}

func getTestUsers(db *sql.DB) ([]CompanyUser, error) {
	query := `SELECT id, name, email, role_id FROM company_users WHERE status = 'active' AND role_id IS NOT NULL LIMIT 5`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []CompanyUser
	for rows.Next() {
		var u CompanyUser
		var roleID sql.NullInt32
		err := rows.Scan(&u.ID, &u.Name, &u.Email, &roleID)
		if err != nil {
			return nil, err
		}
		if roleID.Valid {
			u.RoleID = int(roleID.Int32)
		}
		users = append(users, u)
	}
	return users, nil
}

func createTestUser(db *sql.DB) (int, error) {
	// 先获取一个角色
	var roleID int
	err := db.QueryRow("SELECT id FROM company_roles WHERE is_active = true ORDER BY id LIMIT 1").Scan(&roleID)
	if err != nil {
		return 0, err
	}

	// 创建测试用户
	var userID int
	err = db.QueryRow(`
		INSERT INTO company_users (name, email, role_id, status, created_at, updated_at)
		VALUES ('Test User', 'test@example.com', $1, 'active', NOW(), NOW())
		RETURNING id
	`, roleID).Scan(&userID)
	
	return userID, err
}

func checkUserPermission(db *sql.DB, ctx context.Context, userID int, permissionCode string) (bool, error) {
	// 检查用户通过角色拥有的权限
	query := `
		SELECT COALESCE(rp.is_granted, false) as has_permission
		FROM company_users cu
		JOIN company_roles cr ON cu.role_id = cr.id
		JOIN role_permissions rp ON cr.id = rp.role_id
		JOIN permissions p ON rp.permission_id = p.id
		WHERE cu.id = $1 AND p.permission_code = $2 AND p.is_active = true AND cr.is_active = true
	`
	var hasPermission bool
	err := db.QueryRowContext(ctx, query, userID, permissionCode).Scan(&hasPermission)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return hasPermission, nil
}

func checkOrphanRolePermissions(db *sql.DB) (int, error) {
	query := `
		SELECT COUNT(*) FROM role_permissions rp
		LEFT JOIN company_roles cr ON rp.role_id = cr.id
		LEFT JOIN permissions p ON rp.permission_id = p.id
		WHERE cr.id IS NULL OR p.id IS NULL
	`
	var count int
	err := db.QueryRow(query).Scan(&count)
	return count, err
}

func checkRolesWithoutPermissions(db *sql.DB) (int, error) {
	query := `
		SELECT COUNT(*) FROM company_roles cr
		LEFT JOIN role_permissions rp ON cr.id = rp.role_id AND rp.is_granted = true
		WHERE cr.is_active = true AND rp.role_id IS NULL
	`
	var count int
	err := db.QueryRow(query).Scan(&count)
	return count, err
}
