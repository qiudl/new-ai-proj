package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"ai-project-backend/models"
	"ai-project-backend/services"

	_ "github.com/lib/pq"
)

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

	// 创建权限服务
	permissionService := services.NewPermissionService(db)

	// 开始权限系统测试
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
	}

	// 测试2: 获取所有角色
	fmt.Println("\n2. 测试获取所有角色...")
	roles, err := getAllRoles(db)
	if err != nil {
		log.Printf("❌ 获取角色失败: %v", err)
	} else {
		fmt.Printf("✅ 成功获取角色数量: %d\n", len(roles))
		for _, role := range roles {
			fmt.Printf("   角色: %s (%s)\n", role.RoleCode, role.RoleName)
		}
	}

	// 测试3: 检查角色权限
	fmt.Println("\n3. 测试角色权限检查...")
	if len(roles) > 0 {
		rolePermissions, err := getRolePermissions(db, roles[0].ID)
		if err != nil {
			log.Printf("❌ 获取角色权限失败: %v", err)
		} else {
			fmt.Printf("✅ 角色 %s 拥有权限数量: %d\n", roles[0].RoleName, len(rolePermissions))
		}
	}

	// 测试4: 模拟用户权限检查
	fmt.Println("\n4. 测试模拟用户权限检查...")
	testUsers, err := getTestUsers(db)
	if err != nil {
		log.Printf("❌ 获取测试用户失败: %v", err)
	} else if len(testUsers) > 0 {
		for _, user := range testUsers[:min(3, len(testUsers))] {
			fmt.Printf("   测试用户: %s (ID: %d, Role ID: %d)\n", user.Name, user.ID, user.RoleID)
			
			// 测试一些基本权限
			testPermissions := []string{"project.read", "task.read", "system.admin"}
			for _, permCode := range testPermissions {
				hasPermission, source, err := checkUserPermission(permissionService, ctx, user.ID, permCode)
				if err != nil {
					fmt.Printf("     权限检查错误 (%s): %v\n", permCode, err)
				} else {
					status := "❌"
					if hasPermission {
						status = "✅"
					}
					fmt.Printf("     %s %s (来源: %s)\n", status, permCode, source)
				}
			}
		}
	}

	// 测试5: 性能测试
	fmt.Println("\n5. 权限查询性能测试...")
	if len(testUsers) > 0 {
		startTime := time.Now()
		iterations := 100
		
		for i := 0; i < iterations; i++ {
			user := testUsers[i%len(testUsers)]
			_, _, _ = checkUserPermission(permissionService, ctx, user.ID, "project.read")
		}
		
		duration := time.Since(startTime)
		avgTime := duration / time.Duration(iterations)
		
		fmt.Printf("✅ 完成 %d 次权限检查\n", iterations)
		fmt.Printf("   总耗时: %v\n", duration)
		fmt.Printf("   平均耗时: %v\n", avgTime)
		fmt.Printf("   QPS: %.2f\n", float64(iterations)/duration.Seconds())
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
	}

	// 检查无权限的角色
	rolesWithoutPermissions, err := checkRolesWithoutPermissions(db)
	if err != nil {
		log.Printf("❌ 检查无权限角色失败: %v", err)
	} else if rolesWithoutPermissions > 0 {
		fmt.Printf("⚠️  发现无权限的角色: %d\n", rolesWithoutPermissions)
		integrityIssues++
	}

	if integrityIssues == 0 {
		fmt.Println("✅ 数据完整性检查通过")
	}

	fmt.Println("\n========================================")
	fmt.Println("权限系统测试完成")
	fmt.Println("========================================")
}

// 辅助函数
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func getAllPermissions(db *sql.DB) ([]models.Permission, error) {
	query := `SELECT id, permission_code, permission_name, permission_description, module, resource, action, is_active FROM permissions WHERE is_active = true ORDER BY module, permission_code`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []models.Permission
	for rows.Next() {
		var p models.Permission
		err := rows.Scan(&p.ID, &p.PermissionCode, &p.PermissionName, &p.PermissionDescription, &p.Module, &p.Resource, &p.Action, &p.IsActive)
		if err != nil {
			return nil, err
		}
		permissions = append(permissions, p)
	}
	return permissions, nil
}

func getAllRoles(db *sql.DB) ([]models.CompanyRole, error) {
	query := `SELECT id, role_code, role_name, role_description, is_system_role, is_active FROM company_roles WHERE is_active = true ORDER BY role_code`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []models.CompanyRole
	for rows.Next() {
		var r models.CompanyRole
		err := rows.Scan(&r.ID, &r.RoleCode, &r.RoleName, &r.RoleDescription, &r.IsSystemRole, &r.IsActive)
		if err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, nil
}

func getRolePermissions(db *sql.DB, roleID int) ([]string, error) {
	query := `
		SELECT p.permission_code 
		FROM role_permissions rp
		JOIN permissions p ON rp.permission_id = p.id
		WHERE rp.role_id = $1 AND rp.is_granted = true AND p.is_active = true
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

func getTestUsers(db *sql.DB) ([]models.CompanyUser, error) {
	query := `SELECT id, name, email, role_id FROM company_users WHERE status = 'active' AND role_id IS NOT NULL LIMIT 5`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.CompanyUser
	for rows.Next() {
		var u models.CompanyUser
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

func checkUserPermission(permissionService *services.PermissionService, ctx context.Context, userID int, permissionCode string) (bool, string, error) {
	// 先检查角色权限
	query := `
		SELECT rp.is_granted 
		FROM company_users cu
		JOIN company_roles cr ON cu.role_id = cr.id
		JOIN role_permissions rp ON cr.id = rp.role_id
		JOIN permissions p ON rp.permission_id = p.id
		WHERE cu.id = $1 AND p.permission_code = $2 AND p.is_active = true AND cr.is_active = true
	`
	var hasPermission bool
	err := permissionService.GetDB().QueryRowContext(ctx, query, userID, permissionCode).Scan(&hasPermission)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, "role", nil
		}
		return false, "", err
	}
	return hasPermission, "role", nil
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
