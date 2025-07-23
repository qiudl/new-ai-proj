# 用户类型系统部署和集成指南

## 🚀 快速部署

### 1. 检查系统完整性
```bash
# 运行完整测试，确保所有文件正确修改
node complete-user-type-test.js
```

### 2. 数据库迁移（如果需要）
```bash
# 如果有现有用户数据，执行迁移
psql -d your_database -f migrate_user_types.sql
```

### 3. 启动服务并测试
```bash
# 启动后端服务
cd backend
go run main.go

# 在另一个终端测试API
cd ..
node test-user-types-api.js
```

## 🔧 可选集成

### 权限中间件集成到主应用

如果需要启用严格的权限控制，可以在 `backend/main.go` 中添加：

```go
import "ai-project-backend/middleware"

// 在路由设置函数中添加
func (app *Application) setupRouter() *gin.Engine {
    // ... 现有代码

    // 在 authorized 路由组中添加中间件
    authorized.Use(middleware.UserTypeAccessMiddleware())
    authorized.Use(middleware.CompanyAccessMiddleware())

    // 管理员路由添加额外保护
    admin := authorized.Group("/admin")
    admin.Use(middleware.SystemUserOnlyMiddleware())
    {
        // 用户管理路由
        adminUsers := admin.Group("/users")
        adminUsers.Use(middleware.AdminOnlyMiddleware()) // 仅管理员
        {
            // ... 现有路由
        }
    }
}
```

### 企业API集成

在前端 `UserManagementPage.tsx` 中，将模拟企业数据替换为实际API调用：

```typescript
// 替换 fetchCompanies 函数
const fetchCompanies = useCallback(async () => {
    try {
        const response = await axios.get('/api/v1/companies');
        setCompanies(response.data.data || []);
    } catch (error) {
        console.error('Failed to fetch companies:', error);
        message.error('获取企业列表失败');
    }
}, []);
```

## ✅ 验证系统正常工作

### 1. API层面验证
- ✅ 创建系统用户（admin/project_manager/developer角色）
- ✅ 创建企业用户（client/company_admin/company_user角色）
- ✅ 验证角色验证逻辑（系统用户不能有企业角色，反之亦然）
- ✅ 测试用户类型筛选

### 2. 前端界面验证
- ✅ 用户类型选择按钮正常工作
- ✅ 角色选择根据用户类型动态更新
- ✅ 企业用户显示企业选择器
- ✅ 用户列表显示用户类型标识

### 3. 数据完整性验证
- ✅ 所有新字段正确保存到数据库
- ✅ 用户类型和角色关联正确
- ✅ 企业用户正确关联企业ID

## 🎯 功能特性总结

### 系统用户
- **admin**: 系统管理员 - 全系统权限
- **project_manager**: 项目经理 - 项目和任务管理权限  
- **developer**: 研发工程师 - 任务执行和项目查看权限

### 企业用户
- **client**: 甲方客户 - 只读权限，查看项目和任务
- **company_admin**: 企业管理员 - 企业内管理权限
- **company_user**: 企业普通用户 - 受限的项目和任务访问

### 关键功能
- ✅ 用户类型和角色严格验证
- ✅ 企业用户数据隔离（中间件支持）
- ✅ 完整的前端用户界面
- ✅ 数据库结构支持
- ✅ 完整的测试覆盖

## 📞 支持和故障排除

如果遇到问题：

1. **运行诊断测试**：`node complete-user-type-test.js`
2. **检查API响应**：`node test-user-types-api.js`  
3. **验证数据库结构**：确保 `user_type`, `company_id` 字段存在
4. **检查前端控制台**：查看是否有JavaScript错误

系统现在支持完整的用户类型管理，可以根据需要进一步扩展和定制！
