package constants

// BasePermissions 定义所有用户都应该拥有的基础权限
// 这些权限允许用户访问系统的核心功能，无需特殊角色或权限配置
//
// 基础权限包括：
// - Dashboard访问
// - 个人中心管理
// - 工作笔记管理
// - 计时器功能
// - 个人统计查看
//
// 设计理念：
// 1. 简化用户体验 - 新用户无需配置即可使用基本功能
// 2. 数据隔离 - 虽然开放功能权限，但严格限制只能访问自己的数据
// 3. 向后兼容 - 不影响现有的权限系统和角色配置
var BasePermissions = []string{
	// Dashboard - 首页访问
	"dashboard.read", // 查看Dashboard首页

	// Profile - 个人中心
	"profile.read",     // 查看个人信息
	"profile.update",   // 更新个人资料
	"password.change",  // 修改密码

	// Work Notes - 工作笔记（个人笔记）
	"work_note.create", // 创建工作笔记
	"work_note.read",   // 读取工作笔记
	"work_note.update", // 更新工作笔记
	"work_note.delete", // 删除工作笔记

	// Timer - 计时器
	"timer.start", // 开始计时
	"timer.stop",  // 停止计时
	"timer.view",  // 查看计时记录

	// Statistics - 个人统计
	"stats.view.own", // 查看个人统计信息
}

// BasePermissionSet 基础权限集合（用于快速查找）
// 使用map实现O(1)时间复杂度的权限检查
var BasePermissionSet map[string]bool

// init 初始化基础权限集合
func init() {
	BasePermissionSet = make(map[string]bool)
	for _, perm := range BasePermissions {
		BasePermissionSet[perm] = true
	}
}

// IsBasePermission 判断给定权限是否为基础权限
//
// 参数：
//   - permission: 权限代码（例如："dashboard.read"）
//
// 返回：
//   - bool: true表示是基础权限，false表示不是
//
// 示例：
//   if constants.IsBasePermission("dashboard.read") {
//       // 这是基础权限，直接放行
//   }
func IsBasePermission(permission string) bool {
	return BasePermissionSet[permission]
}

// GetBasePermissions 获取所有基础权限列表
//
// 返回：
//   - []string: 基础权限代码数组
//
// 用途：
//   - API返回用户权限列表时自动包含基础权限
//   - 管理界面显示基础权限说明
func GetBasePermissions() []string {
	result := make([]string, len(BasePermissions))
	copy(result, BasePermissions)
	return result
}

// BasePermissionDescriptions 基础权限的描述信息
// 用于前端展示和文档生成
var BasePermissionDescriptions = map[string]string{
	"dashboard.read":   "查看Dashboard首页，包括任务概览、统计图表等",
	"profile.read":     "查看个人信息、头像、联系方式等个人资料",
	"profile.update":   "更新个人资料，包括姓名、头像、联系方式等",
	"password.change":  "修改登录密码",
	"work_note.create": "创建个人工作笔记",
	"work_note.read":   "查看自己创建的工作笔记",
	"work_note.update": "编辑自己的工作笔记内容",
	"work_note.delete": "删除自己的工作笔记",
	"timer.start":      "启动任务计时器",
	"timer.stop":       "停止任务计时器",
	"timer.view":       "查看自己的计时记录",
	"stats.view.own":   "查看个人工作统计信息，如任务完成数、工时统计等",
}

// GetBasePermissionDescription 获取基础权限的描述
//
// 参数：
//   - permission: 权限代码
//
// 返回：
//   - string: 权限描述，如果不是基础权限则返回空字符串
func GetBasePermissionDescription(permission string) string {
	return BasePermissionDescriptions[permission]
}

// BasePermissionCategories 基础权限分类
// 用于在管理界面中分组显示
var BasePermissionCategories = map[string][]string{
	"dashboard": {
		"dashboard.read",
	},
	"profile": {
		"profile.read",
		"profile.update",
		"password.change",
	},
	"work_note": {
		"work_note.create",
		"work_note.read",
		"work_note.update",
		"work_note.delete",
	},
	"timer": {
		"timer.start",
		"timer.stop",
		"timer.view",
	},
	"statistics": {
		"stats.view.own",
	},
}

// GetBasePermissionsByCategory 按分类获取基础权限
//
// 参数：
//   - category: 权限分类（dashboard, profile, work_note, timer, statistics）
//
// 返回：
//   - []string: 该分类下的权限列表
func GetBasePermissionsByCategory(category string) []string {
	perms, exists := BasePermissionCategories[category]
	if !exists {
		return []string{}
	}
	result := make([]string, len(perms))
	copy(result, perms)
	return result
}

// EnterpriseUserBasePermissions 企业用户基础权限
// 企业用户除了拥有所有基础权限外，还应该拥有项目和任务的基础查看权限
var EnterpriseUserBasePermissions = []string{
	// 项目权限 - 所有可能的读取权限变体
	"project.read",         // 查看项目
	"project:read",         // 查看项目（冒号格式）
	"project.list.read",    // 查看项目列表
	"project.detail.read",  // 查看项目详情
	"enterprise.project.read", // 企业项目查看

	// 任务权限 - 所有可能的读取权限变体
	"task.read",           // 查看任务
	"task:read",           // 查看任务（冒号格式）
	"task.list.read",      // 查看任务列表
	"task.detail.read",    // 查看任务详情
	"enterprise.task.read", // 企业任务查看

	// 项目和任务的创建/编辑权限（企业用户常用功能）
	"project.create",      // 创建项目
	"project.update",      // 编辑项目
	"task.create",         // 创建任务
	"task:create",         // 创建任务（冒号格式）
	"task.update",         // 编辑任务
	"task:write",          // 修改任务（冒号格式）
	"task.assign",         // 分配任务
}

// GetEnterpriseUserPermissions 获取企业用户的所有权限
// 包括基础权限 + 企业用户特有权限
func GetEnterpriseUserPermissions() []string {
	allPerms := make([]string, 0, len(BasePermissions)+len(EnterpriseUserBasePermissions))
	allPerms = append(allPerms, BasePermissions...)
	allPerms = append(allPerms, EnterpriseUserBasePermissions...)
	return allPerms
}

// IsEnterpriseUserPermission 判断是否为企业用户基础权限
func IsEnterpriseUserPermission(permission string) bool {
	for _, perm := range EnterpriseUserBasePermissions {
		if perm == permission {
			return true
		}
	}
	return false
}
