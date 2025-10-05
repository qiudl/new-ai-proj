package models

// AI配置管理权限常量
// 用于细粒度权限控制，确保只有授权用户可以操作敏感的AI配置和密钥

const (
	// ========== AI配置基础权限 ==========

	// PermissionAIConfigView 查看AI配置权限
	PermissionAIConfigView = "ai_config:view"

	// PermissionAIConfigCreate 创建AI配置权限
	PermissionAIConfigCreate = "ai_config:create"

	// PermissionAIConfigUpdate 更新AI配置权限
	PermissionAIConfigUpdate = "ai_config:update"

	// PermissionAIConfigDelete 删除AI配置权限
	PermissionAIConfigDelete = "ai_config:delete"

	// ========== AI配置高级权限 ==========

	// PermissionAIConfigViewAPIKey 查看API密钥权限（脱敏）
	PermissionAIConfigViewAPIKey = "ai_config:view_api_key"

	// PermissionAIConfigManageAPIKey 管理API密钥权限（完整访问）
	PermissionAIConfigManageAPIKey = "ai_config:manage_api_key"

	// PermissionAIConfigTest 测试AI连接权限
	PermissionAIConfigTest = "ai_config:test"

	// PermissionAIConfigToggle 切换启用/禁用状态权限
	PermissionAIConfigToggle = "ai_config:toggle"

	// ========== API密钥轮换权限 ==========

	// PermissionAIConfigRotateKey 轮换API密钥权限
	PermissionAIConfigRotateKey = "ai_config:rotate_key"

	// PermissionAIConfigViewRotationHistory 查看轮换历史权限
	PermissionAIConfigViewRotationHistory = "ai_config:view_rotation_history"

	// PermissionAIConfigManageExpiry 管理密钥过期时间权限
	PermissionAIConfigManageExpiry = "ai_config:manage_expiry"

	// PermissionAIConfigAutoRotate 管理自动轮换权限
	PermissionAIConfigAutoRotate = "ai_config:auto_rotate"

	// ========== 系统管理员权限 ==========

	// PermissionAIConfigAdminAll AI配置完全管理权限（超级管理员）
	PermissionAIConfigAdminAll = "ai_config:admin_all"

	// PermissionAIConfigViewStats 查看AI配置统计权限
	PermissionAIConfigViewStats = "ai_config:view_stats"

	// PermissionAIConfigCheckExpiry 检查过期状态权限
	PermissionAIConfigCheckExpiry = "ai_config:check_expiry"

	// PermissionAIConfigDisableExpired 自动禁用过期密钥权限
	PermissionAIConfigDisableExpired = "ai_config:disable_expired"

	// PermissionAIConfigSendWarnings 发送过期警告权限
	PermissionAIConfigSendWarnings = "ai_config:send_warnings"
)

// AI配置权限模块和资源定义
const (
	// ModuleAIConfig AI配置模块
	ModuleAIConfig = "ai_config"

	// ResourceAIConfig AI配置资源
	ResourceAIConfig = "ai_config"

	// ResourceAPIKey API密钥资源
	ResourceAPIKey = "api_key"

	// ResourceKeyRotation 密钥轮换资源
	ResourceKeyRotation = "key_rotation"
)

// AI配置权限动作定义
const (
	// ActionView 查看
	ActionView = "view"

	// ActionCreate 创建
	ActionCreate = "create"

	// ActionUpdate 更新
	ActionUpdate = "update"

	// ActionDelete 删除
	ActionDelete = "delete"

	// ActionManage 管理
	ActionManage = "manage"

	// ActionTest 测试
	ActionTest = "test"

	// ActionToggle 切换
	ActionToggle = "toggle"

	// ActionRotate 轮换
	ActionRotate = "rotate"

	// ActionCheckExpiry 检查过期
	ActionCheckExpiry = "check_expiry"

	// ActionDisableExpired 禁用过期
	ActionDisableExpired = "disable_expired"

	// ActionSendWarnings 发送警告
	ActionSendWarnings = "send_warnings"
)

// AIConfigPermissionDefinitions 返回所有AI配置权限的详细定义
// 用于初始化数据库权限表
func AIConfigPermissionDefinitions() []PermissionDefinition {
	return []PermissionDefinition{
		// 基础权限
		{
			Code:        PermissionAIConfigView,
			Name:        "查看AI配置",
			Description: "允许查看AI配置列表和详情（不包含完整API密钥）",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionView,
		},
		{
			Code:        PermissionAIConfigCreate,
			Name:        "创建AI配置",
			Description: "允许创建新的AI配置",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionCreate,
		},
		{
			Code:        PermissionAIConfigUpdate,
			Name:        "更新AI配置",
			Description: "允许更新现有AI配置（不包含API密钥）",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionUpdate,
		},
		{
			Code:        PermissionAIConfigDelete,
			Name:        "删除AI配置",
			Description: "允许删除AI配置",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionDelete,
		},

		// 高级权限
		{
			Code:        PermissionAIConfigViewAPIKey,
			Name:        "查看API密钥",
			Description: "允许查看脱敏的API密钥",
			Module:      ModuleAIConfig,
			Resource:    ResourceAPIKey,
			Action:      ActionView,
		},
		{
			Code:        PermissionAIConfigManageAPIKey,
			Name:        "管理API密钥",
			Description: "允许完整管理API密钥（包括查看、更新、删除）",
			Module:      ModuleAIConfig,
			Resource:    ResourceAPIKey,
			Action:      ActionManage,
		},
		{
			Code:        PermissionAIConfigTest,
			Name:        "测试AI连接",
			Description: "允许测试AI配置连接",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionTest,
		},
		{
			Code:        PermissionAIConfigToggle,
			Name:        "切换启用状态",
			Description: "允许启用/禁用AI配置",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionToggle,
		},

		// 密钥轮换权限
		{
			Code:        PermissionAIConfigRotateKey,
			Name:        "轮换API密钥",
			Description: "允许轮换API密钥",
			Module:      ModuleAIConfig,
			Resource:    ResourceKeyRotation,
			Action:      ActionRotate,
		},
		{
			Code:        PermissionAIConfigViewRotationHistory,
			Name:        "查看轮换历史",
			Description: "允许查看API密钥轮换历史记录",
			Module:      ModuleAIConfig,
			Resource:    ResourceKeyRotation,
			Action:      ActionView,
		},
		{
			Code:        PermissionAIConfigManageExpiry,
			Name:        "管理密钥过期",
			Description: "允许设置和管理API密钥过期时间",
			Module:      ModuleAIConfig,
			Resource:    ResourceKeyRotation,
			Action:      ActionManage,
		},
		{
			Code:        PermissionAIConfigAutoRotate,
			Name:        "管理自动轮换",
			Description: "允许启用/禁用API密钥自动轮换",
			Module:      ModuleAIConfig,
			Resource:    ResourceKeyRotation,
			Action:      ActionManage,
		},

		// 系统管理员权限
		{
			Code:        PermissionAIConfigAdminAll,
			Name:        "AI配置完全管理",
			Description: "拥有所有AI配置相关权限（超级管理员）",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionManage,
		},
		{
			Code:        PermissionAIConfigViewStats,
			Name:        "查看AI配置统计",
			Description: "允许查看AI配置统计信息",
			Module:      ModuleAIConfig,
			Resource:    ResourceAIConfig,
			Action:      ActionView,
		},
		{
			Code:        PermissionAIConfigCheckExpiry,
			Name:        "检查密钥过期",
			Description: "允许检查所有密钥的过期状态",
			Module:      ModuleAIConfig,
			Resource:    ResourceKeyRotation,
			Action:      ActionCheckExpiry,
		},
		{
			Code:        PermissionAIConfigDisableExpired,
			Name:        "禁用过期密钥",
			Description: "允许自动禁用所有过期的API密钥",
			Module:      ModuleAIConfig,
			Resource:    ResourceKeyRotation,
			Action:      ActionDisableExpired,
		},
		{
			Code:        PermissionAIConfigSendWarnings,
			Name:        "发送过期警告",
			Description: "允许发送API密钥即将过期的警告通知",
			Module:      ModuleAIConfig,
			Resource:    ResourceKeyRotation,
			Action:      ActionSendWarnings,
		},
	}
}

// PermissionDefinition 权限定义结构
type PermissionDefinition struct {
	Code        string
	Name        string
	Description string
	Module      string
	Resource    string
	Action      string
}

// AIConfigRolePermissions 定义默认角色的AI配置权限映射
var AIConfigRolePermissions = map[string][]string{
	// 系统管理员：拥有所有权限
	"system_admin": {
		PermissionAIConfigAdminAll,
		PermissionAIConfigView,
		PermissionAIConfigCreate,
		PermissionAIConfigUpdate,
		PermissionAIConfigDelete,
		PermissionAIConfigViewAPIKey,
		PermissionAIConfigManageAPIKey,
		PermissionAIConfigTest,
		PermissionAIConfigToggle,
		PermissionAIConfigRotateKey,
		PermissionAIConfigViewRotationHistory,
		PermissionAIConfigManageExpiry,
		PermissionAIConfigAutoRotate,
		PermissionAIConfigViewStats,
		PermissionAIConfigCheckExpiry,
		PermissionAIConfigDisableExpired,
		PermissionAIConfigSendWarnings,
	},

	// AI管理员：除超级管理员权限外的所有AI配置权限
	"ai_admin": {
		PermissionAIConfigView,
		PermissionAIConfigCreate,
		PermissionAIConfigUpdate,
		PermissionAIConfigViewAPIKey,
		PermissionAIConfigManageAPIKey,
		PermissionAIConfigTest,
		PermissionAIConfigToggle,
		PermissionAIConfigRotateKey,
		PermissionAIConfigViewRotationHistory,
		PermissionAIConfigManageExpiry,
		PermissionAIConfigAutoRotate,
		PermissionAIConfigViewStats,
	},

	// 运维人员：查看、测试、轮换权限
	"ops_user": {
		PermissionAIConfigView,
		PermissionAIConfigViewAPIKey,
		PermissionAIConfigTest,
		PermissionAIConfigRotateKey,
		PermissionAIConfigViewRotationHistory,
		PermissionAIConfigCheckExpiry,
	},

	// 普通开发者：仅查看权限
	"developer": {
		PermissionAIConfigView,
		PermissionAIConfigViewAPIKey,
		PermissionAIConfigViewStats,
	},

	// 只读用户：仅基础查看权限
	"viewer": {
		PermissionAIConfigView,
	},
}

// HasAIConfigPermission 检查用户是否具有指定的AI配置权限
func HasAIConfigPermission(userPermissions []string, requiredPermission string) bool {
	// 如果用户拥有完全管理权限，则自动拥有所有AI配置权限
	for _, perm := range userPermissions {
		if perm == PermissionAIConfigAdminAll {
			return true
		}
		if perm == requiredPermission {
			return true
		}
	}
	return false
}

// GetRequiredPermissionsForEndpoint 返回指定API端点所需的权限
func GetRequiredPermissionsForEndpoint(method, path string) []string {
	// 定义端点到权限的映射
	endpointPermissions := map[string]map[string][]string{
		// GET请求
		"GET": {
			"/api/v1/system/ai-configs":                        {PermissionAIConfigView},
			"/api/v1/system/ai-configs/enabled":                {PermissionAIConfigView},
			"/api/v1/system/ai-configs/stats":                  {PermissionAIConfigViewStats},
			"/api/v1/system/ai-configs/:provider":              {PermissionAIConfigView},
			"/api/v1/system/ai-configs/expiry-status":          {PermissionAIConfigCheckExpiry},
			"/api/v1/system/ai-configs/:id/rotation-history":   {PermissionAIConfigViewRotationHistory},
			"/api/v1/system/ai-configs/:id/expiry-notifications": {PermissionAIConfigViewRotationHistory},
		},
		// POST请求
		"POST": {
			"/api/v1/system/ai-configs":                          {PermissionAIConfigCreate},
			"/api/v1/system/ai-configs/test":                     {PermissionAIConfigTest},
			"/api/v1/system/ai-configs/:id/rotate-key":           {PermissionAIConfigRotateKey},
			"/api/v1/system/ai-configs/:id/set-expiry":           {PermissionAIConfigManageExpiry},
			"/api/v1/system/ai-configs/:id/enable-auto-rotation": {PermissionAIConfigAutoRotate},
			"/api/v1/system/ai-configs/:id/disable-auto-rotation": {PermissionAIConfigAutoRotate},
			"/api/v1/system/ai-configs/auto-disable-expired":     {PermissionAIConfigDisableExpired},
			"/api/v1/system/ai-configs/send-expiry-warnings":     {PermissionAIConfigSendWarnings},
		},
		// PUT请求
		"PUT": {
			"/api/v1/system/ai-configs/:provider": {PermissionAIConfigUpdate, PermissionAIConfigManageAPIKey},
		},
		// PATCH请求
		"PATCH": {
			"/api/v1/system/ai-configs/:provider/toggle": {PermissionAIConfigToggle},
		},
		// DELETE请求
		"DELETE": {
			"/api/v1/system/ai-configs/:provider": {PermissionAIConfigDelete},
		},
	}

	if methodMap, ok := endpointPermissions[method]; ok {
		if perms, ok := methodMap[path]; ok {
			return perms
		}
	}

	// 对于非AI配置相关的端点，返回空权限列表
	// 只有明确定义的AI配置端点才需要权限检查
	return nil
}
