package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"
)

// EnterpriseRoleService handles enterprise default role creation and management
type EnterpriseRoleService struct {
	db               database.DB
	permissionRepo   database.PermissionRepository
	logger           *log.Logger
	systemRoleService *SystemRoleService
}

// NewEnterpriseRoleService creates a new enterprise role service
func NewEnterpriseRoleService(db database.DB, permissionRepo database.PermissionRepository, logger *log.Logger) *EnterpriseRoleService {
	return &EnterpriseRoleService{
		db:               db,
		permissionRepo:   permissionRepo,
		logger:           logger,
		systemRoleService: NewSystemRoleService(),
	}
}

// EnterpriseRoleTemplate defines a template for creating enterprise roles
type EnterpriseRoleTemplate struct {
	RoleCode        string
	RoleName        string
	RoleDescription string
	Permissions     []string
	IsDefault       bool
	Priority        int // Lower number = higher priority
}

// DefaultEnterpriseRoles defines the default roles that should be created for each enterprise
var DefaultEnterpriseRoles = []EnterpriseRoleTemplate{
	{
		RoleCode:        "enterprise_admin",
		RoleName:        "企业管理员",
		RoleDescription: "企业管理员，拥有企业内所有管理权限",
		IsDefault:       true,
		Priority:        1,
		Permissions: []string{
			// 企业管理权限
			"company.read", "company.update", "company.members.read", 
			"company.members.create", "company.members.update", "company.members.delete",
			"company.departments.manage",
			
			// 项目管理权限
			"project.read", "project.create", "project.update", "project.delete",
			"project.detail.read", "project.members.read", "project.members.manage",
			"project.settings.read", "project.settings.update",
			
			// 任务管理权限
			"task.read", "task.create", "task.update", "task.delete", "task.assign",
			"task.status.update", "task.comment.read", "task.comment.create",
			"task.attachment.upload", "task.attachment.download",
			"task.time.log", "task.time.read", "task.bulk.update", "task.bulk.delete",
			
			// 文档管理权限
			"document.read", "document.create", "document.update", "document.delete",
			"document.share", "document.version.read", "document.version.restore",
			"document.folder.create", "document.folder.manage",
			
			// 财务管理权限
			"finance.read", "finance.contracts.read", "finance.contracts.manage",
			"finance.reports.read", "finance.reports.export",
			
			// 个人权限
			"profile.read", "profile.update", "profile.password.change", 
			"profile.sessions.manage", "profile.notifications.read", "profile.notifications.manage",
		},
	},
	{
		RoleCode:        "enterprise_manager",
		RoleName:        "企业经理",
		RoleDescription: "企业经理，负责部门项目管理和团队协调",
		IsDefault:       true,
		Priority:        2,
		Permissions: []string{
			// 公司信息查看
			"company.read", "company.members.read",
			
			// 项目管理权限
			"project.read", "project.create", "project.update",
			"project.detail.read", "project.members.read", "project.members.manage",
			"project.settings.read",
			
			// 任务管理权限
			"task.read", "task.create", "task.update", "task.assign",
			"task.status.update", "task.comment.read", "task.comment.create",
			"task.attachment.upload", "task.attachment.download",
			"task.time.log", "task.time.read", "task.bulk.update",
			
			// 文档管理权限
			"document.read", "document.create", "document.update",
			"document.share", "document.version.read", "document.folder.create",
			
			// 基础财务权限
			"finance.read", "finance.contracts.read", "finance.reports.read",
			
			// 个人权限
			"profile.read", "profile.update", "profile.password.change", 
			"profile.sessions.manage", "profile.notifications.read", "profile.notifications.manage",
		},
	},
	{
		RoleCode:        "enterprise_employee",
		RoleName:        "企业员工",
		RoleDescription: "企业普通员工，具有基本的项目参与和任务执行权限",
		IsDefault:       true,
		Priority:        3,
		Permissions: []string{
			// 公司信息查看
			"company.read", "company.members.read",
			
			// 项目参与权限
			"project.read", "project.detail.read", "project.members.read",
			
			// 任务执行权限
			"task.read", "task.update", "task.status.update",
			"task.comment.read", "task.comment.create",
			"task.attachment.upload", "task.attachment.download",
			"task.time.log", "task.time.read",
			
			// 文档权限
			"document.read", "document.create", "document.update",
			"document.version.read",
			
			// 个人权限
			"profile.read", "profile.update", "profile.password.change", 
			"profile.sessions.manage", "profile.notifications.read", "profile.notifications.manage",
		},
	},
	{
		RoleCode:        "enterprise_viewer",
		RoleName:        "企业查看者",
		RoleDescription: "企业查看者，只能查看基本信息，适用于外部顾问或临时访问者",
		IsDefault:       true,
		Priority:        4,
		Permissions: []string{
			// 基础查看权限
			"company.read", "company.members.read",
			"project.read", "project.detail.read", "project.members.read",
			"task.read", "task.comment.read", "task.attachment.download",
			"document.read", "document.version.read",
			
			// 个人权限
			"profile.read", "profile.update", "profile.password.change", 
			"profile.sessions.manage", "profile.notifications.read", "profile.notifications.manage",
		},
	},
	{
		RoleCode:        "enterprise_finance",
		RoleName:        "企业财务",
		RoleDescription: "企业财务人员，专注于财务相关功能",
		IsDefault:       false, // 可选角色，不是所有企业都需要
		Priority:        5,
		Permissions: []string{
			// 公司信息查看
			"company.read", "company.members.read",
			
			// 项目财务信息
			"project.read", "project.detail.read", "project.members.read",
			
			// 任务时间和成本
			"task.read", "task.time.read",
			
			// 文档查看
			"document.read", "document.version.read",
			
			// 财务权限
			"finance.read", "finance.contracts.read", "finance.contracts.manage",
			"finance.reports.read", "finance.reports.export",
			
			// 个人权限
			"profile.read", "profile.update", "profile.password.change", 
			"profile.sessions.manage", "profile.notifications.read", "profile.notifications.manage",
		},
	},
}

// CreateDefaultEnterpriseRoles creates default roles for a new enterprise
func (s *EnterpriseRoleService) CreateDefaultEnterpriseRoles(ctx context.Context, companyID int, createdBy int) error {
	s.logger.Printf("开始为企业 %d 创建默认角色", companyID)
	
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// 只创建默认角色
	defaultRoles := s.getDefaultRoles()
	
	createdRoles := make([]string, 0, len(defaultRoles))
	
	for _, roleTemplate := range defaultRoles {
		// 为企业定制角色代码，避免冲突
		enterpriseRoleCode := fmt.Sprintf("company_%d_%s", companyID, roleTemplate.RoleCode)
		
		// 检查角色是否已存在
		exists, err := s.checkRoleExists(ctx, tx, enterpriseRoleCode)
		if err != nil {
			return fmt.Errorf("failed to check role existence: %w", err)
		}
		
		if exists {
			s.logger.Printf("角色 %s 已存在，跳过创建", enterpriseRoleCode)
			continue
		}
		
		// 创建角色
		roleID, err := s.createEnterpriseRole(ctx, tx, enterpriseRoleCode, roleTemplate, createdBy)
		if err != nil {
			return fmt.Errorf("failed to create role %s: %w", roleTemplate.RoleCode, err)
		}
		
		// 分配权限
		err = s.assignPermissionsToRole(ctx, tx, roleID, roleTemplate.Permissions)
		if err != nil {
			return fmt.Errorf("failed to assign permissions to role %s: %w", roleTemplate.RoleCode, err)
		}
		
		createdRoles = append(createdRoles, roleTemplate.RoleName)
		s.logger.Printf("成功创建企业角色: %s (ID: %d)", roleTemplate.RoleName, roleID)
	}
	
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	s.logger.Printf("企业 %d 默认角色创建完成，共创建 %d 个角色: %v", companyID, len(createdRoles), createdRoles)
	return nil
}

// getDefaultRoles returns only the roles marked as default
func (s *EnterpriseRoleService) getDefaultRoles() []EnterpriseRoleTemplate {
	var defaultRoles []EnterpriseRoleTemplate
	for _, role := range DefaultEnterpriseRoles {
		if role.IsDefault {
			defaultRoles = append(defaultRoles, role)
		}
	}
	return defaultRoles
}

// checkRoleExists checks if a role with the given code already exists
func (s *EnterpriseRoleService) checkRoleExists(ctx context.Context, tx *sql.Tx, roleCode string) (bool, error) {
	var count int
	query := "SELECT COUNT(*) FROM company_roles WHERE role_code = $1"
	err := tx.QueryRowContext(ctx, query, roleCode).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
// createEnterpriseRole creates a single enterprise role
func (s *EnterpriseRoleService) createEnterpriseRole(ctx context.Context, tx *sql.Tx, roleCode string, template EnterpriseRoleTemplate, createdBy int) (int, error) {
	var roleID int
	query := `
		INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, false, true, $4, $5)
		RETURNING id
	`
	
	now := time.Now()
	err := tx.QueryRowContext(ctx, query, roleCode, template.RoleName, template.RoleDescription, now, now).Scan(&roleID)
	if err != nil {
		return 0, fmt.Errorf("failed to insert role: %w", err)
	}
	
	return roleID, nil
}

// assignPermissionsToRole assigns a list of permissions to a role
func (s *EnterpriseRoleService) assignPermissionsToRole(ctx context.Context, tx *sql.Tx, roleID int, permissionCodes []string) error {
	for _, permCode := range permissionCodes {
		// 获取权限ID
		var permID int
		permQuery := "SELECT id FROM permissions WHERE permission_code = $1 AND is_active = true"
		err := tx.QueryRowContext(ctx, permQuery, permCode).Scan(&permID)
		if err != nil {
			if err == sql.ErrNoRows {
				s.logger.Printf("警告：权限 %s 不存在，跳过分配", permCode)
				continue
			}
			return fmt.Errorf("failed to get permission %s: %w", permCode, err)
		}
		
		// 分配权限给角色
		rolePermQuery := `
			INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
			VALUES ($1, $2, true, $3)
			ON CONFLICT (role_id, permission_id) DO UPDATE SET
				is_granted = EXCLUDED.is_granted,
				granted_at = EXCLUDED.created_at
		`
		
		_, err = tx.ExecContext(ctx, rolePermQuery, roleID, permID, time.Now())
		if err != nil {
			return fmt.Errorf("failed to assign permission %s to role: %w", permCode, err)
		}
	}
	
	return nil
}

// CreateOptionalEnterpriseRoles creates optional roles for an enterprise
func (s *EnterpriseRoleService) CreateOptionalEnterpriseRoles(ctx context.Context, companyID int, roleTemplateNames []string, createdBy int) error {
	s.logger.Printf("开始为企业 %d 创建可选角色: %v", companyID, roleTemplateNames)
	
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// 找到对应的角色模板
	templateMap := make(map[string]EnterpriseRoleTemplate)
	for _, template := range DefaultEnterpriseRoles {
		templateMap[template.RoleCode] = template
	}
	
	createdRoles := make([]string, 0)
	
	for _, roleTemplateName := range roleTemplateNames {
		template, exists := templateMap[roleTemplateName]
		if !exists {
			s.logger.Printf("角色模板 %s 不存在，跳过", roleTemplateName)
			continue
		}
		
		// 为企业定制角色代码
		enterpriseRoleCode := fmt.Sprintf("company_%d_%s", companyID, template.RoleCode)
		
		// 检查角色是否已存在
		exists, err := s.checkRoleExists(ctx, tx, enterpriseRoleCode)
		if err != nil {
			return fmt.Errorf("failed to check role existence: %w", err)
		}
		
		if exists {
			s.logger.Printf("角色 %s 已存在，跳过创建", enterpriseRoleCode)
			continue
		}
		
		// 创建角色
		roleID, err := s.createEnterpriseRole(ctx, tx, enterpriseRoleCode, template, createdBy)
		if err != nil {
			return fmt.Errorf("failed to create role %s: %w", template.RoleCode, err)
		}
		
		// 分配权限
		err = s.assignPermissionsToRole(ctx, tx, roleID, template.Permissions)
		if err != nil {
			return fmt.Errorf("failed to assign permissions to role %s: %w", template.RoleCode, err)
		}
		
		createdRoles = append(createdRoles, template.RoleName)
		s.logger.Printf("成功创建企业可选角色: %s (ID: %d)", template.RoleName, roleID)
	}
	
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	s.logger.Printf("企业 %d 可选角色创建完成，共创建 %d 个角色: %v", companyID, len(createdRoles), createdRoles)
	return nil
}
// GetEnterpriseRoles returns all roles for a specific enterprise
func (s *EnterpriseRoleService) GetEnterpriseRoles(ctx context.Context, companyID int) ([]*models.CompanyRole, error) {
	query := `
		SELECT id, role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at
		FROM company_roles 
		WHERE role_code LIKE $1 AND is_active = true
		ORDER BY 
			CASE 
				WHEN role_code LIKE '%_enterprise_admin' THEN 1
				WHEN role_code LIKE '%_enterprise_manager' THEN 2
				WHEN role_code LIKE '%_enterprise_employee' THEN 3
				WHEN role_code LIKE '%_enterprise_viewer' THEN 4
				ELSE 5
			END,
			role_name ASC
	`
	
	companyPattern := fmt.Sprintf("company_%d_%%", companyID)
	
	rows, err := s.db.QueryContext(ctx, query, companyPattern)
	if err != nil {
		return nil, fmt.Errorf("failed to get enterprise roles: %w", err)
	}
	defer rows.Close()
	
	var roles []*models.CompanyRole
	for rows.Next() {
		role := &models.CompanyRole{}
		err := rows.Scan(
			&role.ID, &role.RoleCode, &role.RoleName, &role.RoleDescription,
			&role.IsSystemRole, &role.IsActive, &role.CreatedAt, &role.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}
		roles = append(roles, role)
	}
	
	return roles, nil
}

// DeleteEnterpriseRoles deletes all roles for a specific enterprise
func (s *EnterpriseRoleService) DeleteEnterpriseRoles(ctx context.Context, companyID int) error {
	s.logger.Printf("开始删除企业 %d 的所有角色", companyID)
	
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// 首先删除角色权限关联
	companyPattern := fmt.Sprintf("company_%d_%%", companyID)
	deletePermissionsQuery := `
		DELETE FROM role_permissions 
		WHERE role_id IN (
			SELECT id FROM company_roles WHERE role_code LIKE $1
		)
	`
	
	result, err := tx.ExecContext(ctx, deletePermissionsQuery, companyPattern)
	if err != nil {
		return fmt.Errorf("failed to delete role permissions: %w", err)
	}
	
	permissionsDeleted, _ := result.RowsAffected()
	s.logger.Printf("删除了 %d 条角色权限关联", permissionsDeleted)
	
	// 然后删除角色
	deleteRolesQuery := `
		DELETE FROM company_roles 
		WHERE role_code LIKE $1 AND is_system_role = false
	`
	
	result, err = tx.ExecContext(ctx, deleteRolesQuery, companyPattern)
	if err != nil {
		return fmt.Errorf("failed to delete roles: %w", err)
	}
	
	rolesDeleted, _ := result.RowsAffected()
	
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	s.logger.Printf("企业 %d 角色删除完成，删除了 %d 个角色", companyID, rolesDeleted)
	return nil
}

// GetAvailableRoleTemplates returns all available role templates
func (s *EnterpriseRoleService) GetAvailableRoleTemplates() []EnterpriseRoleTemplate {
	return DefaultEnterpriseRoles
}

// GetDefaultRoleTemplates returns only the default role templates
func (s *EnterpriseRoleService) GetDefaultRoleTemplates() []EnterpriseRoleTemplate {
	return s.getDefaultRoles()
}

// ValidateEnterpriseRole validates if a role belongs to the specified enterprise
func (s *EnterpriseRoleService) ValidateEnterpriseRole(roleCode string, companyID int) bool {
	expectedPrefix := fmt.Sprintf("company_%d_", companyID)
	return strings.HasPrefix(roleCode, expectedPrefix)
}

// IsEnterpriseRole checks if a role code is an enterprise role
func (s *EnterpriseRoleService) IsEnterpriseRole(roleCode string) bool {
	return strings.HasPrefix(roleCode, "company_") && strings.Contains(roleCode, "_enterprise_")
}

// ExtractCompanyIDFromRole extracts company ID from enterprise role code
func (s *EnterpriseRoleService) ExtractCompanyIDFromRole(roleCode string) (int, error) {
	if !strings.HasPrefix(roleCode, "company_") {
		return 0, fmt.Errorf("not an enterprise role")
	}
	
	parts := strings.Split(roleCode, "_")
	if len(parts) < 3 {
		return 0, fmt.Errorf("invalid enterprise role format")
	}
	
	companyIDStr := parts[1]
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		return 0, fmt.Errorf("invalid company ID in role code: %w", err)
	}
	
	return companyID, nil
}