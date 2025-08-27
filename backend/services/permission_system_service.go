package services

import (
	"ai-project-backend/models"
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"
)

// PermissionSystemService 权限系统服务
type PermissionSystemService struct {
	db     *sql.DB
	logger *log.Logger
}

// NewPermissionSystemService 创建新的权限系统服务
func NewPermissionSystemService(db *sql.DB, logger *log.Logger) *PermissionSystemService {
	return &PermissionSystemService{
		db:     db,
		logger: logger,
	}
}

// PermissionModule 权限模块定义
type PermissionModule struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Priority    int    `json:"priority"`
}

// GetPermissionModules 获取所有权限模块
func (s *PermissionSystemService) GetPermissionModules() []PermissionModule {
	return []PermissionModule{
		{
			Code:        "SYSTEM",
			Name:        "系统管理",
			Description: "系统配置、监控、维护等核心功能",
			Category:    "SYSTEM_MANAGEMENT",
			Priority:    1,
		},
		{
			Code:        "USER",
			Name:        "用户管理",
			Description: "用户账户、资料、会话管理",
			Category:    "USER_MANAGEMENT",
			Priority:    2,
		},
		{
			Code:        "ROLE",
			Name:        "角色管理",
			Description: "角色创建、权限分配、层级管理",
			Category:    "ROLE_MANAGEMENT",
			Priority:    3,
		},
		{
			Code:        "PERMISSION",
			Name:        "权限管理",
			Description: "权限定义、分配、监控",
			Category:    "PERMISSION_MANAGEMENT",
			Priority:    4,
		},
		{
			Code:        "ENTERPRISE",
			Name:        "企业管理",
			Description: "企业信息、成员、架构管理",
			Category:    "ENTERPRISE_MANAGEMENT",
			Priority:    5,
		},
		{
			Code:        "PROJECT",
			Name:        "项目管理",
			Description: "项目创建、成员、里程碑管理",
			Category:    "PROJECT_MANAGEMENT",
			Priority:    6,
		},
		{
			Code:        "TASK",
			Name:        "任务管理",
			Description: "任务创建、分配、跟踪管理",
			Category:    "TASK_MANAGEMENT",
			Priority:    7,
		},
		{
			Code:        "FINANCE",
			Name:        "财务管理",
			Description: "预算、费用、发票、支付管理",
			Category:    "FINANCE_MANAGEMENT",
			Priority:    8,
		},
		{
			Code:        "DOCUMENT",
			Name:        "文档管理",
			Description: "文档创建、分享、版本管理",
			Category:    "DOCUMENT_MANAGEMENT",
			Priority:    9,
		},
		{
			Code:        "DATA",
			Name:        "数据管理",
			Description: "数据读取、导出、备份管理",
			Category:    "DATA_MANAGEMENT",
			Priority:    10,
		},
		{
			Code:        "API",
			Name:        "API访问",
			Description: "API接口、密钥、访问管理",
			Category:    "API_ACCESS",
			Priority:    11,
		},
		{
			Code:        "UI",
			Name:        "界面访问",
			Description: "系统界面、功能模块访问",
			Category:    "UI_ACCESS",
			Priority:    12,
		},
		{
			Code:        "AUDIT",
			Name:        "审计管理",
			Description: "审计日志、配置、监控",
			Category:    "AUDIT_MANAGEMENT",
			Priority:    13,
		},
	}
}

// PermissionOperationType 权限操作类型
type PermissionOperationType struct {
	Code            string `json:"code"`
	Name            string `json:"name"`
	Category        string `json:"category"`
	RiskLevel       string `json:"risk_level"`
	RequireApproval bool   `json:"require_approval"`
	Description     string `json:"description"`
}

// GetPermissionOperationTypes 获取所有权限操作类型
func (s *PermissionSystemService) GetPermissionOperationTypes() []PermissionOperationType {
	return []PermissionOperationType{
		{Code: "CREATE", Name: "创建", Category: "CRUD", RiskLevel: "MEDIUM", RequireApproval: false, Description: "创建新的资源或记录"},
		{Code: "READ", Name: "读取", Category: "CRUD", RiskLevel: "LOW", RequireApproval: false, Description: "查看和读取资源信息"},
		{Code: "UPDATE", Name: "更新", Category: "CRUD", RiskLevel: "MEDIUM", RequireApproval: false, Description: "修改现有资源"},
		{Code: "DELETE", Name: "删除", Category: "CRUD", RiskLevel: "HIGH", RequireApproval: true, Description: "删除资源或记录"},
		{Code: "MANAGE", Name: "管理", Category: "ADMIN", RiskLevel: "HIGH", RequireApproval: true, Description: "完整管理权限，包含多种操作"},
		{Code: "ASSIGN", Name: "分配", Category: "ADMIN", RiskLevel: "MEDIUM", RequireApproval: false, Description: "分配资源或权限给用户"},
		{Code: "REVOKE", Name: "撤销", Category: "ADMIN", RiskLevel: "MEDIUM", RequireApproval: false, Description: "撤销资源或权限"},
		{Code: "APPROVE", Name: "审批", Category: "WORKFLOW", RiskLevel: "HIGH", RequireApproval: true, Description: "审批业务流程"},
		{Code: "EXPORT", Name: "导出", Category: "DATA", RiskLevel: "MEDIUM", RequireApproval: true, Description: "导出数据到外部系统"},
		{Code: "IMPORT", Name: "导入", Category: "DATA", RiskLevel: "HIGH", RequireApproval: true, Description: "从外部导入数据"},
		{Code: "BACKUP", Name: "备份", Category: "MAINTENANCE", RiskLevel: "MEDIUM", RequireApproval: false, Description: "创建数据备份"},
		{Code: "RESTORE", Name: "恢复", Category: "MAINTENANCE", RiskLevel: "CRITICAL", RequireApproval: true, Description: "从备份恢复数据"},
		{Code: "ACCESS", Name: "访问", Category: "UI", RiskLevel: "LOW", RequireApproval: false, Description: "访问界面或功能"},
		{Code: "LOG", Name: "记录", Category: "TRACKING", RiskLevel: "LOW", RequireApproval: false, Description: "记录操作日志"},
		{Code: "UPLOAD", Name: "上传", Category: "FILE", RiskLevel: "LOW", RequireApproval: false, Description: "上传文件"},
		{Code: "DOWNLOAD", Name: "下载", Category: "FILE", RiskLevel: "LOW", RequireApproval: false, Description: "下载文件"},
		{Code: "SHARE", Name: "分享", Category: "COLLABORATION", RiskLevel: "MEDIUM", RequireApproval: false, Description: "分享资源给其他用户"},
		{Code: "LOCK", Name: "锁定", Category: "SECURITY", RiskLevel: "HIGH", RequireApproval: false, Description: "锁定账户或资源"},
		{Code: "UNLOCK", Name: "解锁", Category: "SECURITY", RiskLevel: "MEDIUM", RequireApproval: false, Description: "解锁账户或资源"},
		{Code: "ARCHIVE", Name: "归档", Category: "LIFECYCLE", RiskLevel: "MEDIUM", RequireApproval: false, Description: "归档资源"},
	}
}

// PermissionCodeRule 权限编码规范
type PermissionCodeRule struct {
	Pattern     string   `json:"pattern"`
	Description string   `json:"description"`
	Examples    []string `json:"examples"`
	Required    bool     `json:"required"`
}

// GetPermissionCodeRules 获取权限编码规范
func (s *PermissionSystemService) GetPermissionCodeRules() []PermissionCodeRule {
	return []PermissionCodeRule{
		{
			Pattern:     "{MODULE}_{RESOURCE}_{ACTION}_{SCOPE?}",
			Description: "标准权限编码格式：模块_资源_操作_范围(可选)",
			Examples: []string{
				"USER_ACCOUNT_CREATE",
				"PROJECT_TASK_UPDATE",
				"FINANCE_BUDGET_READ_COMPANY",
				"SYSTEM_CONFIG_UPDATE",
			},
			Required: true,
		},
		{
			Pattern:     "模块前缀标准化",
			Description: "使用预定义的模块前缀，确保一致性",
			Examples: []string{
				"SYSTEM_", "USER_", "ROLE_", "PROJECT_",
				"TASK_", "FINANCE_", "ENTERPRISE_", "DOCUMENT_",
			},
			Required: true,
		},
		{
			Pattern:     "操作类型标准化",
			Description: "使用标准操作动词，避免自定义动词",
			Examples: []string{
				"CREATE", "READ", "UPDATE", "DELETE",
				"MANAGE", "ASSIGN", "REVOKE", "APPROVE",
			},
			Required: true,
		},
		{
			Pattern:     "范围限定符(可选)",
			Description: "为权限添加范围限定，提供细粒度控制",
			Examples: []string{
				"_OWN", "_COMPANY", "_DEPARTMENT", "_PROJECT",
				"_PUBLIC", "_INTERNAL", "_CONFIDENTIAL",
			},
			Required: false,
		},
	}
}

// InitializePermissionSystem 初始化权限系统基础数据
func (s *PermissionSystemService) InitializePermissionSystem(ctx context.Context) error {
	s.logger.Printf("开始初始化权限系统基础数据...")

	// 开启事务
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("开启事务失败: %w", err)
	}
	defer tx.Rollback()

	// 执行权限数据初始化SQL
	sqlFile := "/Users/johnqiu/coding/www/projects/new-ai-proj/database/migrations/050_comprehensive_permissions_data.sql"
	
	// 读取SQL文件（这里简化为直接执行核心权限数据插入）
	if err := s.executePermissionDataInit(tx); err != nil {
		return fmt.Errorf("执行权限数据初始化失败: %w", err)
	}

	// 提交事务
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}

	s.logger.Printf("权限系统基础数据初始化完成")
	return nil
}

// executePermissionDataInit 执行权限数据初始化
func (s *PermissionSystemService) executePermissionDataInit(tx *sql.Tx) error {
	// 核心权限数据批量插入
	permissions := s.getCorePermissions()
	
	// 准备批量插入语句
	stmt, err := tx.Prepare(`
		INSERT INTO permissions (
			code, name, display_name, description, resource, action,
			resource_type, category, risk_level, is_system, requires_approval, sort_order
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			name = VALUES(name),
			display_name = VALUES(display_name),
			description = VALUES(description),
			updated_at = CURRENT_TIMESTAMP
	`)
	if err != nil {
		return fmt.Errorf("准备权限插入语句失败: %w", err)
	}
	defer stmt.Close()

	// 批量插入权限数据
	for _, perm := range permissions {
		_, err := stmt.Exec(
			perm.Code, perm.Name, perm.DisplayName, perm.Description,
			perm.Resource, perm.Action, perm.ResourceType, perm.Category,
			perm.RiskLevel, perm.IsSystem, perm.RequiresApproval, perm.SortOrder,
		)
		if err != nil {
			return fmt.Errorf("插入权限 %s 失败: %w", perm.Code, err)
		}
	}

	s.logger.Printf("成功插入 %d 个核心权限", len(permissions))
	return nil
}

// PermissionData 权限数据结构
type PermissionData struct {
	Code             string `json:"code"`
	Name             string `json:"name"`
	DisplayName      string `json:"display_name"`
	Description      string `json:"description"`
	Resource         string `json:"resource"`
	Action           string `json:"action"`
	ResourceType     string `json:"resource_type"`
	Category         string `json:"category"`
	RiskLevel        string `json:"risk_level"`
	IsSystem         bool   `json:"is_system"`
	RequiresApproval bool   `json:"requires_approval"`
	SortOrder        int    `json:"sort_order"`
}

// getCorePermissions 获取核心权限数据
func (s *PermissionSystemService) getCorePermissions() []PermissionData {
	return []PermissionData{
		// 系统管理模块权限
		{Code: "SYSTEM_CONFIG_READ", Name: "Read System Config", DisplayName: "系统配置查看", Description: "查看系统全局配置信息", Resource: "SYSTEM_CONFIG", Action: "READ", ResourceType: "SYSTEM", Category: "SYSTEM_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 100},
		{Code: "SYSTEM_CONFIG_UPDATE", Name: "Update System Config", DisplayName: "系统配置修改", Description: "修改系统全局配置", Resource: "SYSTEM_CONFIG", Action: "UPDATE", ResourceType: "SYSTEM", Category: "SYSTEM_MANAGEMENT", RiskLevel: "CRITICAL", IsSystem: true, RequiresApproval: true, SortOrder: 101},
		{Code: "SYSTEM_BACKUP_CREATE", Name: "Create System Backup", DisplayName: "系统备份创建", Description: "创建系统数据备份", Resource: "SYSTEM", Action: "BACKUP_CREATE", ResourceType: "SYSTEM", Category: "SYSTEM_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: false, SortOrder: 102},
		
		// 用户管理模块权限
		{Code: "USER_CREATE", Name: "Create User", DisplayName: "用户创建", Description: "创建新用户账户", Resource: "USER", Action: "CREATE", ResourceType: "SYSTEM", Category: "USER_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 200},
		{Code: "USER_READ", Name: "Read User", DisplayName: "用户查看", Description: "查看用户基本信息", Resource: "USER", Action: "READ", ResourceType: "SYSTEM", Category: "USER_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 201},
		{Code: "USER_UPDATE", Name: "Update User", DisplayName: "用户修改", Description: "修改用户信息", Resource: "USER", Action: "UPDATE", ResourceType: "SYSTEM", Category: "USER_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 202},
		{Code: "USER_DELETE", Name: "Delete User", DisplayName: "用户删除", Description: "删除用户账户", Resource: "USER", Action: "DELETE", ResourceType: "SYSTEM", Category: "USER_MANAGEMENT", RiskLevel: "CRITICAL", IsSystem: true, RequiresApproval: true, SortOrder: 203},
		
		// 项目管理模块权限
		{Code: "PROJECT_CREATE", Name: "Create Project", DisplayName: "项目创建", Description: "创建新项目", Resource: "PROJECT", Action: "CREATE", ResourceType: "BUSINESS", Category: "PROJECT_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 300},
		{Code: "PROJECT_READ", Name: "Read Project", DisplayName: "项目查看", Description: "查看项目信息", Resource: "PROJECT", Action: "READ", ResourceType: "BUSINESS", Category: "PROJECT_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 301},
		{Code: "PROJECT_UPDATE", Name: "Update Project", DisplayName: "项目修改", Description: "修改项目基本信息", Resource: "PROJECT", Action: "UPDATE", ResourceType: "BUSINESS", Category: "PROJECT_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 302},
		{Code: "PROJECT_DELETE", Name: "Delete Project", DisplayName: "项目删除", Description: "删除项目", Resource: "PROJECT", Action: "DELETE", ResourceType: "BUSINESS", Category: "PROJECT_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 303},
		
		// 任务管理模块权限
		{Code: "TASK_CREATE", Name: "Create Task", DisplayName: "任务创建", Description: "创建新任务", Resource: "TASK", Action: "CREATE", ResourceType: "BUSINESS", Category: "TASK_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 400},
		{Code: "TASK_READ", Name: "Read Task", DisplayName: "任务查看", Description: "查看任务详细信息", Resource: "TASK", Action: "READ", ResourceType: "BUSINESS", Category: "TASK_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 401},
		{Code: "TASK_UPDATE", Name: "Update Task", DisplayName: "任务修改", Description: "修改任务信息", Resource: "TASK", Action: "UPDATE", ResourceType: "BUSINESS", Category: "TASK_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 402},
		{Code: "TASK_DELETE", Name: "Delete Task", DisplayName: "任务删除", Description: "删除任务", Resource: "TASK", Action: "DELETE", ResourceType: "BUSINESS", Category: "TASK_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 403},
		{Code: "TASK_ASSIGN", Name: "Assign Task", DisplayName: "任务分配", Description: "分配任务给用户", Resource: "TASK", Action: "ASSIGN", ResourceType: "BUSINESS", Category: "TASK_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 404},
		
		// 财务管理模块权限
		{Code: "FINANCE_BUDGET_READ", Name: "Read Budget", DisplayName: "预算查看", Description: "查看项目/企业预算信息", Resource: "BUDGET", Action: "READ", ResourceType: "BUSINESS", Category: "FINANCE_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 500},
		{Code: "FINANCE_BUDGET_CREATE", Name: "Create Budget", DisplayName: "预算创建", Description: "创建预算计划", Resource: "BUDGET", Action: "CREATE", ResourceType: "BUSINESS", Category: "FINANCE_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 501},
		{Code: "FINANCE_EXPENSE_READ", Name: "Read Expenses", DisplayName: "费用查看", Description: "查看费用记录", Resource: "EXPENSE", Action: "READ", ResourceType: "BUSINESS", Category: "FINANCE_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 502},
		{Code: "FINANCE_EXPENSE_CREATE", Name: "Create Expense", DisplayName: "费用创建", Description: "创建费用记录", Resource: "EXPENSE", Action: "CREATE", ResourceType: "BUSINESS", Category: "FINANCE_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 503},
		{Code: "FINANCE_EXPENSE_APPROVE", Name: "Approve Expense", DisplayName: "费用审批", Description: "审批费用申请", Resource: "EXPENSE", Action: "APPROVE", ResourceType: "BUSINESS", Category: "FINANCE_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 504},
		
		// 企业管理模块权限
		{Code: "ENTERPRISE_CREATE", Name: "Create Enterprise", DisplayName: "企业创建", Description: "创建新企业/组织", Resource: "ENTERPRISE", Action: "CREATE", ResourceType: "BUSINESS", Category: "ENTERPRISE_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 600},
		{Code: "ENTERPRISE_READ", Name: "Read Enterprise", DisplayName: "企业信息查看", Description: "查看企业基本信息", Resource: "ENTERPRISE", Action: "READ", ResourceType: "BUSINESS", Category: "ENTERPRISE_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 601},
		{Code: "ENTERPRISE_UPDATE", Name: "Update Enterprise", DisplayName: "企业信息修改", Description: "修改企业基本信息", Resource: "ENTERPRISE", Action: "UPDATE", ResourceType: "BUSINESS", Category: "ENTERPRISE_MANAGEMENT", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 602},
		{Code: "ENTERPRISE_DELETE", Name: "Delete Enterprise", DisplayName: "企业删除", Description: "删除企业/组织", Resource: "ENTERPRISE", Action: "DELETE", ResourceType: "BUSINESS", Category: "ENTERPRISE_MANAGEMENT", RiskLevel: "CRITICAL", IsSystem: true, RequiresApproval: true, SortOrder: 603},
		
		// 角色管理模块权限
		{Code: "ROLE_CREATE", Name: "Create Role", DisplayName: "角色创建", Description: "创建新角色", Resource: "ROLE", Action: "CREATE", ResourceType: "SYSTEM", Category: "ROLE_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 700},
		{Code: "ROLE_READ", Name: "Read Role", DisplayName: "角色查看", Description: "查看角色信息", Resource: "ROLE", Action: "READ", ResourceType: "SYSTEM", Category: "ROLE_MANAGEMENT", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 701},
		{Code: "ROLE_UPDATE", Name: "Update Role", DisplayName: "角色修改", Description: "修改角色信息", Resource: "ROLE", Action: "UPDATE", ResourceType: "SYSTEM", Category: "ROLE_MANAGEMENT", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 702},
		{Code: "ROLE_DELETE", Name: "Delete Role", DisplayName: "角色删除", Description: "删除角色", Resource: "ROLE", Action: "DELETE", ResourceType: "SYSTEM", Category: "ROLE_MANAGEMENT", RiskLevel: "CRITICAL", IsSystem: true, RequiresApproval: true, SortOrder: 703},
		
		// API访问模块权限
		{Code: "API_READ", Name: "API Read Access", DisplayName: "API读取访问", Description: "通过API读取数据", Resource: "API", Action: "READ", ResourceType: "SYSTEM", Category: "API_ACCESS", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 800},
		{Code: "API_WRITE", Name: "API Write Access", DisplayName: "API写入访问", Description: "通过API写入数据", Resource: "API", Action: "WRITE", ResourceType: "SYSTEM", Category: "API_ACCESS", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 801},
		{Code: "API_DELETE", Name: "API Delete Access", DisplayName: "API删除访问", Description: "通过API删除数据", Resource: "API", Action: "DELETE", ResourceType: "SYSTEM", Category: "API_ACCESS", RiskLevel: "HIGH", IsSystem: true, RequiresApproval: true, SortOrder: 802},
		
		// 界面访问模块权限
		{Code: "UI_DASHBOARD", Name: "Dashboard Access", DisplayName: "仪表盘访问", Description: "访问系统仪表盘", Resource: "UI_DASHBOARD", Action: "ACCESS", ResourceType: "UI", Category: "UI_ACCESS", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 900},
		{Code: "UI_USER_MANAGEMENT", Name: "User Management UI", DisplayName: "用户管理界面", Description: "访问用户管理界面", Resource: "UI_USER_MGMT", Action: "ACCESS", ResourceType: "UI", Category: "UI_ACCESS", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 901},
		{Code: "UI_PROJECT_MANAGEMENT", Name: "Project Management UI", DisplayName: "项目管理界面", Description: "访问项目管理界面", Resource: "UI_PROJECT_MGMT", Action: "ACCESS", ResourceType: "UI", Category: "UI_ACCESS", RiskLevel: "LOW", IsSystem: true, RequiresApproval: false, SortOrder: 902},
		{Code: "UI_FINANCE_MANAGEMENT", Name: "Finance Management UI", DisplayName: "财务管理界面", Description: "访问财务管理界面", Resource: "UI_FINANCE_MGMT", Action: "ACCESS", ResourceType: "UI", Category: "UI_ACCESS", RiskLevel: "MEDIUM", IsSystem: true, RequiresApproval: false, SortOrder: 903},
	}
}

// GetPermissionsByCategory 根据分类获取权限列表
func (s *PermissionSystemService) GetPermissionsByCategory(ctx context.Context, category string) ([]models.Permission, error) {
	query := `
		SELECT id, code, name, display_name, description, resource, action, 
		       resource_type, category, risk_level, is_system, is_active, 
		       requires_approval, sort_order, created_at, updated_at
		FROM permissions 
		WHERE category = ? AND is_active = TRUE
		ORDER BY sort_order, code
	`
	
	rows, err := s.db.QueryContext(ctx, query, category)
	if err != nil {
		return nil, fmt.Errorf("查询权限失败: %w", err)
	}
	defer rows.Close()

	var permissions []models.Permission
	for rows.Next() {
		var perm models.Permission
		err := rows.Scan(
			&perm.ID, &perm.Code, &perm.Name, &perm.DisplayName, &perm.Description,
			&perm.Resource, &perm.Action, &perm.ResourceType, &perm.Category,
			&perm.RiskLevel, &perm.IsSystem, &perm.IsActive, &perm.RequiresApproval,
			&perm.SortOrder, &perm.CreatedAt, &perm.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描权限数据失败: %w", err)
		}
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

// GetAllPermissions 获取所有权限列表
func (s *PermissionSystemService) GetAllPermissions(ctx context.Context) ([]models.Permission, error) {
	query := `
		SELECT id, code, name, display_name, description, resource, action, 
		       resource_type, category, risk_level, is_system, is_active, 
		       requires_approval, sort_order, created_at, updated_at
		FROM permissions 
		WHERE is_active = TRUE
		ORDER BY category, sort_order, code
	`
	
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("查询权限失败: %w", err)
	}
	defer rows.Close()

	var permissions []models.Permission
	for rows.Next() {
		var perm models.Permission
		err := rows.Scan(
			&perm.ID, &perm.Code, &perm.Name, &perm.DisplayName, &perm.Description,
			&perm.Resource, &perm.Action, &perm.ResourceType, &perm.Category,
			&perm.RiskLevel, &perm.IsSystem, &perm.IsActive, &perm.RequiresApproval,
			&perm.SortOrder, &perm.CreatedAt, &perm.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("扫描权限数据失败: %w", err)
		}
		permissions = append(permissions, perm)
	}

	return permissions, nil
}

// ValidatePermissionCode 验证权限编码是否符合规范
func (s *PermissionSystemService) ValidatePermissionCode(code string) error {
	// 基本格式检查
	if len(code) == 0 {
		return fmt.Errorf("权限编码不能为空")
	}
	
	if len(code) > 100 {
		return fmt.Errorf("权限编码长度不能超过100个字符")
	}
	
	// 检查格式：MODULE_RESOURCE_ACTION(_SCOPE?)
	parts := strings.Split(code, "_")
	if len(parts) < 3 {
		return fmt.Errorf("权限编码格式不正确，应为：MODULE_RESOURCE_ACTION(_SCOPE?)")
	}
	
	// 验证模块前缀
	validModules := []string{
		"SYSTEM", "USER", "ROLE", "PERMISSION", "ENTERPRISE", "PROJECT", 
		"TASK", "FINANCE", "DOCUMENT", "DATA", "API", "UI", "AUDIT",
	}
	
	moduleValid := false
	for _, validModule := range validModules {
		if parts[0] == validModule {
			moduleValid = true
			break
		}
	}
	
	if !moduleValid {
		return fmt.Errorf("无效的模块前缀: %s，有效值: %s", parts[0], strings.Join(validModules, ", "))
	}
	
	return nil
}

// GetPermissionStatistics 获取权限统计信息
func (s *PermissionSystemService) GetPermissionStatistics(ctx context.Context) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// 总权限数量
	var totalCount int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM permissions WHERE is_active = TRUE").Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("查询总权限数量失败: %w", err)
	}
	stats["total_permissions"] = totalCount
	
	// 系统权限数量
	var systemCount int
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM permissions WHERE is_active = TRUE AND is_system = TRUE").Scan(&systemCount)
	if err != nil {
		return nil, fmt.Errorf("查询系统权限数量失败: %w", err)
	}
	stats["system_permissions"] = systemCount
	
	// 按风险级别统计
	riskQuery := `
		SELECT risk_level, COUNT(*) as count 
		FROM permissions 
		WHERE is_active = TRUE 
		GROUP BY risk_level
	`
	
	rows, err := s.db.QueryContext(ctx, riskQuery)
	if err != nil {
		return nil, fmt.Errorf("查询权限风险级别统计失败: %w", err)
	}
	defer rows.Close()
	
	riskStats := make(map[string]int)
	for rows.Next() {
		var riskLevel string
		var count int
		if err := rows.Scan(&riskLevel, &count); err != nil {
			return nil, fmt.Errorf("扫描风险级别统计失败: %w", err)
		}
		riskStats[riskLevel] = count
	}
	stats["risk_level_distribution"] = riskStats
	
	// 按分类统计
	categoryQuery := `
		SELECT category, COUNT(*) as count 
		FROM permissions 
		WHERE is_active = TRUE 
		GROUP BY category
		ORDER BY count DESC
	`
	
	rows2, err := s.db.QueryContext(ctx, categoryQuery)
	if err != nil {
		return nil, fmt.Errorf("查询权限分类统计失败: %w", err)
	}
	defer rows2.Close()
	
	categoryStats := make(map[string]int)
	for rows2.Next() {
		var category string
		var count int
		if err := rows2.Scan(&category, &count); err != nil {
			return nil, fmt.Errorf("扫描分类统计失败: %w", err)
		}
		categoryStats[category] = count
	}
	stats["category_distribution"] = categoryStats
	
	// 需要审批的权限数量
	var approvalCount int
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM permissions WHERE is_active = TRUE AND requires_approval = TRUE").Scan(&approvalCount)
	if err != nil {
		return nil, fmt.Errorf("查询需要审批权限数量失败: %w", err)
	}
	stats["approval_required_count"] = approvalCount
	
	// 最后更新时间
	var lastUpdated time.Time
	err = s.db.QueryRowContext(ctx, "SELECT MAX(updated_at) FROM permissions WHERE is_active = TRUE").Scan(&lastUpdated)
	if err != nil {
		return nil, fmt.Errorf("查询权限最后更新时间失败: %w", err)
	}
	stats["last_updated"] = lastUpdated
	
	return stats, nil
}
