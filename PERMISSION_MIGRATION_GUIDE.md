# 权限管理系统迁移指南

## 概述

本文档描述了从传统 company 模型到现代 enterprise/organization 权限管理系统的迁移过程。

## 🚨 重要变更说明

### 已移除的概念
- ❌ `COMPANY_PERMISSIONS` - 已移除
- ❌ `company_admin` 角色 - 已移除
- ❌ `/companies/*` 路由 - 已移除
- ❌ 公司管理相关的前端页面和组件

### 新的权限架构
- ✅ `ENTERPRISE_PERMISSIONS` - 企业管理权限
- ✅ `ORGANIZATION_PERMISSIONS` - 组织架构权限
- ✅ `enterprise_admin` 角色 - 替代原有 company_admin
- ✅ `/enterprises/*` 路由 - 企业管理
- ✅ `/organization-structure` - 组织架构管理
- ✅ `/position-management` - 职位管理
- ✅ `/enterprise-roles` - 企业角色管理

## 权限映射表

### 权限常量映射

| 旧权限常量 | 新权限常量 | 说明 |
|------------|------------|------|
| `COMPANY_PERMISSIONS.READ` | `ENTERPRISE_PERMISSIONS.READ` | 企业信息读取权限 |
| `COMPANY_PERMISSIONS.CREATE` | `ENTERPRISE_PERMISSIONS.CREATE` | 企业创建权限 |
| `COMPANY_PERMISSIONS.UPDATE` | `ENTERPRISE_PERMISSIONS.UPDATE` | 企业更新权限 |
| `COMPANY_PERMISSIONS.DELETE` | `ENTERPRISE_PERMISSIONS.DELETE` | 企业删除权限 |
| `COMPANY_PERMISSIONS.USER_ADMIN` | `ENTERPRISE_PERMISSIONS.USER_ADMIN` | 企业用户管理权限 |
| `COMPANY_PERMISSIONS.ADMIN` | `ENTERPRISE_PERMISSIONS.ADMIN` | 企业管理员权限 |

### 角色映射

| 旧角色 | 新角色 | 说明 |
|--------|--------|------|
| `company_admin` | `enterprise_admin` | 企业管理员角色 |

### 路由映射

| 旧路由 | 新路由 | 状态 |
|--------|--------|------|
| `/companies` | `/enterprises` | 已迁移 |
| `/companies/create` | `/enterprises/create` | 已迁移 |
| `/companies/:id` | `/enterprises/:id` | 已迁移 |
| `/companies/:id/edit` | `/enterprises/:id/edit` | 已迁移 |
| `/company-user-management` | `/enterprises/:id/users` | 已迁移到组织管理 |

## 新的组织管理路由

以下是新增的组织管理相关路由：

```typescript
// 组织架构管理
/organization-structure    // 查看和管理部门结构
/position-management      // 职位管理
/enterprise-roles        // 企业角色管理  
/enterprises/:enterpriseId/users  // 企业用户管理
```

## 迁移检查清单

### ✅ 已完成的迁移项目

- [x] 更新 `constants/permissions.ts` 中的权限定义
- [x] 替换 `App.tsx` 中的路由权限引用
- [x] 更新 `PermissionDemoPage.tsx` 中的权限演示
- [x] 移除所有对 `COMPANY_PERMISSIONS` 的引用
- [x] 更新权限类型定义

### 🔄 需要后续验证的项目

- [ ] 验证现有用户的权限映射是否正确
- [ ] 确保数据库中的角色权限已正确迁移
- [ ] 测试新的企业管理流程
- [ ] 验证组织架构管理功能
- [ ] 检查权限审计日志的完整性

## 开发者迁移指南

### 1. 更新代码中的权限引用

**旧代码:**
```typescript
import { COMPANY_PERMISSIONS } from '../constants/permissions';

// 使用旧权限
<PermissionRoute permission={COMPANY_PERMISSIONS.READ}>
```

**新代码:**
```typescript
import { ENTERPRISE_PERMISSIONS } from '../constants/permissions';

// 使用新权限
<PermissionRoute permission={ENTERPRISE_PERMISSIONS.READ}>
```

### 2. 更新角色检查逻辑

**旧代码:**
```typescript
const isCompanyAdmin = user.role === 'company_admin';
```

**新代码:**
```typescript
const isEnterpriseAdmin = user.role === 'enterprise_admin';
```

### 3. 更新路由导航

**旧代码:**
```typescript
navigate('/companies');
```

**新代码:**
```typescript
navigate('/enterprises');
```

## 权限系统新架构

### 三层权限架构

1. **系统层权限** (`SYSTEM_PERMISSIONS`)
   - 系统管理
   - 配置管理
   - 维护权限

2. **企业层权限** (`ENTERPRISE_PERMISSIONS`)
   - 企业信息管理
   - 企业用户管理
   - 企业级别的配置

3. **组织层权限** (`ORGANIZATION_PERMISSIONS`)
   - 部门结构管理
   - 职位管理
   - 企业角色管理
   - 用户-部门关系管理

### 权限继承关系

```
SYSTEM_PERMISSIONS (最高级)
├── ENTERPRISE_PERMISSIONS (企业级)
    ├── ORGANIZATION_PERMISSIONS (组织级)
        ├── PROJECT_PERMISSIONS (项目级)
        └── USER_PERMISSIONS (用户级)
```

## 最佳实践

### 1. 权限检查

优先使用更具体的权限而不是通用权限：

```typescript
// ✅ 推荐：使用具体权限
hasPermission(ORGANIZATION_PERMISSIONS.STRUCTURE_READ)

// ❌ 避免：使用过于宽泛的权限
hasPermission(ENTERPRISE_PERMISSIONS.ADMIN)
```

### 2. 角色分配

根据用户职责分配最小必要权限：

```typescript
// 部门主管
const departmentManager = {
  permissions: [
    ORGANIZATION_PERMISSIONS.STRUCTURE_READ,
    ORGANIZATION_PERMISSIONS.USER_READ,
    PROJECT_PERMISSIONS.READ
  ]
};

// 企业管理员
const enterpriseAdmin = {
  permissions: [
    ...ENTERPRISE_PERMISSIONS,
    ...ORGANIZATION_PERMISSIONS
  ]
};
```

## 故障排除

### 常见问题

1. **权限检查失败**
   - 检查是否已更新到新的权限常量
   - 确认用户角色已正确迁移

2. **路由访问被拒绝**
   - 检查路由配置是否使用了新的权限
   - 验证用户是否具有相应的企业/组织权限

3. **组织架构显示异常**
   - 确认已正确设置企业ID
   - 检查部门层级关系数据

### 调试工具

使用权限演示页面 `/permission-demo` 来测试和验证权限设置：

```typescript
// 访问演示页面查看当前用户权限
/permission-demo
```

## 更新日志

### v2.0.0 - 权限系统重构
- 移除 company 相关权限和路由
- 引入 enterprise/organization 权限架构  
- 更新所有相关组件和页面
- 添加组织架构管理功能

## 联系支持

如果在迁移过程中遇到问题，请：
1. 查看本指南的故障排除部分
2. 使用 `/permission-demo` 页面验证权限
3. 查看浏览器控制台的错误信息
4. 联系开发团队寻求支持

---

*本文档最后更新时间: 2025-09-08*