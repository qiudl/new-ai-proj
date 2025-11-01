# 角色权限体系说明文档

本文档详细说明AI Project系统的角色和权限体系设计。

## 系统概述

AI Project采用基于角色的访问控制(RBAC)系统，预定义了12个角色（6个系统角色 + 6个企业角色），每个角色都配置了相应的权限集合。

## 角色类别

### 系统角色 (6个)

系统角色是系统级别的预定义角色，由系统管理员分配，不可删除。

| 角色代码 | 角色名称 | 描述 | 主要职责 |
|---------|---------|------|---------|
| SYSTEM_SUPER_ADMIN | 超级管理员 | 系统最高权限 | 完全访问所有系统功能，包括系统配置、用户管理、企业管理 |
| SYSTEM_DEVELOPER | 开发工程师 | 技术开发和维护 | 负责系统开发、技术支持、bug修复和系统维护 |
| SYSTEM_OPERATOR | 运维工程师 | 系统运维和监控 | 负责系统运维、性能监控、日志查看和日常维护 |
| SYSTEM_ANALYST | 数据分析师 | 数据分析和报表 | 负责数据分析、报表生成、业务洞察和决策支持 |
| SYSTEM_AUDITOR | 审计员 | 审计和合规 | 负责审计日志查看、合规检查、安全审计 |
| SYSTEM_SUPPORT | 客服支持 | 用户支持 | 负责用户支持、问题解答、基础服务 |

### 企业角色 (6个)

企业角色是企业级别的角色，由企业管理员分配和管理，可以根据企业需求修改权限。

| 角色代码 | 角色名称 | 描述 | 主要职责 |
|---------|---------|------|---------|
| ENTERPRISE_ADMIN | 企业管理员 | 企业最高权限 | 管理企业内所有资源、用户和权限配置 |
| ENTERPRISE_MANAGER | 企业经理 | 项目和团队管理 | 管理企业项目、任务分配、团队协调 |
| ENTERPRISE_PM | 项目经理 | 项目管理 | 负责项目计划、执行、成员管理 |
| ENTERPRISE_DEVELOPER | 开发人员 | 任务执行 | 执行开发任务、编写代码、技术文档 |
| ENTERPRISE_USER | 普通用户 | 基础操作 | 执行基本任务、查看信息 |
| ENTERPRISE_GUEST | 访客 | 只读访问 | 仅可查看授权的信息 |

## 权限模块

系统共有96个权限，分为以下模块：

### 1. 系统管理 (system.*)
- `system.admin` - 系统管理员权限
- `system.config` - 系统配置管理
- `system.audit` - 审计查看
- `system.audit_logs.read` - 查看审计日志
- `system.settings.read` - 查看系统设置
- `system.settings.manage` - 管理系统设置

### 2. API管理 (api.*)
- `api.admin` - API完全管理
- `api.keys.create` - 创建API密钥
- `api.keys.read` - 查看API密钥
- `api.keys.update` - 更新API密钥
- `api.keys.delete` - 删除API密钥
- `api.logs.read` - 查看API日志
- `api.quota.read` - 查看API配额

### 3. 用户管理 (user.*)
- `user.create` - 创建用户
- `user.read` - 查看用户
- `user.update` - 编辑用户
- `user.delete` - 删除用户

### 4. 企业管理 (company.*)
- `company.info.read` - 查看企业信息
- `company.info.update` - 编辑企业信息
- `company.users.create` - 添加企业用户
- `company.users.read` - 查看企业用户
- `company.users.update` - 编辑企业用户
- `company.users.delete` - 删除企业用户
- `company.roles.manage` - 管理企业角色

### 5. 项目管理 (project.*)
- `project.list.read` - 查看项目列表
- `project.detail.read` - 查看项目详情
- `project.create` - 创建项目
- `project.update` - 编辑项目
- `project.delete` - 删除项目
- `project.members.manage` - 管理项目成员
- `project.read` - 查看项目
- `project:read` - MCP查看项目
- `project:list` - MCP列出项目
- `enterprise.project.read` - 企业项目查看

### 6. 任务管理 (task.*)
- `task.list.read` - 查看任务列表
- `task.detail.read` - 查看任务详情
- `task.create` - 创建任务
- `task.update` - 编辑任务
- `task.delete` - 删除任务
- `task.assign` - 分配任务
- `task.read` - 查看任务
- `task:read` - MCP读取任务
- `task:create` - MCP创建任务
- `task:write` - MCP修改任务
- `task:status` - MCP更新任务状态
- `enterprise.task.read` - 企业任务查看

### 7. 文档管理 (document:*)
- `document:read` - 读取文档
- `document:create` - 创建文档
- `document:write` - 修改文档
- `document:attach` - 关联文档

### 8. 财务管理 (finance.*)
- `finance.contracts.read` - 查看合同
- `finance.contracts.manage` - 管理合同
- `finance.reports.read` - 查看财务报表

### 9. 工作笔记 (work_note.*)
- `work_note.create` - 创建工作笔记
- `work_note.read` - 查看工作笔记
- `work_note.update` - 更新工作笔记
- `work_note.delete` - 删除工作笔记
- `team_work_note_folder_create` - 创建团队笔记文件夹
- `team_work_note_folder_update` - 编辑团队笔记文件夹
- `team_work_note_folder_delete` - 删除团队笔记文件夹
- `team_work_note_create` - 发布团队笔记
- `team_work_note_update` - 编辑团队笔记
- `team_work_note_delete` - 删除团队笔记

### 10. 计时器 (timer.*)
- `timer:manage` - 管理计时器
- `timer.start` - 启动计时器
- `timer.stop` - 停止计时器
- `timer.view` - 查看计时记录

### 11. 每日任务 (daily_focus:*)
- `daily_focus:manage` - 管理今日任务

### 12. 基础权限
- `dashboard.read` - 查看Dashboard
- `profile.read` - 查看个人资料
- `profile.update` - 更新个人资料
- `password.change` - 修改密码
- `stats.view.own` - 查看个人统计

## 角色权限矩阵

### 超级管理员 (SYSTEM_SUPER_ADMIN)
✅ 拥有所有96个权限

### 开发工程师 (SYSTEM_DEVELOPER)
✅ 系统审计、设置查看
✅ API查看（密钥、日志、配额）
✅ 用户查看和编辑
✅ 企业信息查看、用户查看
✅ 项目完全管理（除删除）
✅ 任务完全管理
✅ 文档完全管理
✅ 工作笔记管理
✅ 计时器管理
✅ 每日任务管理
✅ 基础功能

### 运维工程师 (SYSTEM_OPERATOR)
✅ 系统配置、审计、设置查看
✅ API日志和配额查看
✅ 用户查看
✅ 项目查看
✅ 任务查看
✅ 文档查看
✅ 计时器查看
✅ 基础功能

### 数据分析师 (SYSTEM_ANALYST)
✅ 审计日志查看
✅ 用户查看
✅ 企业信息和用户查看
✅ 项目查看
✅ 任务查看
✅ 文档查看
✅ 财务合同和报表查看
✅ 工作笔记查看
✅ 计时器查看
✅ 基础功能

### 审计员 (SYSTEM_AUDITOR)
✅ 系统审计、审计日志、设置查看
✅ 用户查看
✅ 企业信息和用户查看
✅ 项目查看
✅ 任务查看
✅ 财务合同和报表查看
✅ 基础功能（无统计）

### 客服支持 (SYSTEM_SUPPORT)
✅ 用户查看
✅ 企业信息和用户查看
✅ 项目查看
✅ 任务查看
✅ 文档查看
✅ 工作笔记查看
✅ 基础功能

### 企业管理员 (ENTERPRISE_ADMIN)
✅ 用户完全管理
✅ 企业完全管理
✅ 项目完全管理
✅ 任务完全管理
✅ 文档完全管理
✅ 财务管理
✅ 工作笔记和团队笔记完全管理
✅ 计时器管理
✅ 每日任务管理
✅ 基础功能

### 企业经理 (ENTERPRISE_MANAGER)
✅ 用户查看和编辑
✅ 企业用户查看和编辑
✅ 项目管理（除删除）、成员管理
✅ 任务完全管理
✅ 文档完全管理
✅ 财务查看
✅ 工作笔记和团队笔记管理
✅ 计时器管理
✅ 每日任务管理
✅ 基础功能

### 项目经理 (ENTERPRISE_PM)
✅ 用户查看
✅ 企业查看
✅ 项目管理、成员管理
✅ 任务完全管理
✅ 文档完全管理
✅ 工作笔记和团队笔记管理
✅ 计时器使用
✅ 每日任务管理
✅ 基础功能

### 开发人员 (ENTERPRISE_DEVELOPER)
✅ 用户查看
✅ 企业查看
✅ 项目查看
✅ 任务创建和更新
✅ 文档完全管理
✅ 工作笔记管理、团队笔记创建和编辑
✅ 计时器使用
✅ 每日任务管理
✅ 基础功能

### 普通用户 (ENTERPRISE_USER)
✅ 企业查看
✅ 项目查看
✅ 任务更新
✅ 文档创建和查看
✅ 工作笔记管理、团队笔记创建
✅ 计时器使用
✅ 基础功能

### 访客 (ENTERPRISE_GUEST)
✅ 企业查看
✅ 项目查看
✅ 任务查看
✅ 文档查看
✅ 工作笔记查看
✅ 基础功能（无统计）

## 使用指南

### 初始化默认角色

运行初始化脚本创建所有预定义角色：

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
./scripts/init-default-roles-permissions.sh
```

### 查看角色列表

访问角色管理页面：
```
http://localhost:3000/admin/roles
```

### API接口

#### 获取所有角色
```bash
GET /api/v1/roles?include_inactive=true&include_stats=true
```

#### 获取角色详情
```bash
GET /api/v1/roles/:id
```

#### 创建角色
```bash
POST /api/v1/roles
{
  "role_code": "CUSTOM_ROLE",
  "role_name": "自定义角色",
  "role_description": "描述",
  "permission_codes": ["permission.code1", "permission.code2"]
}
```

#### 更新角色
```bash
PUT /api/v1/roles/:id
{
  "role_name": "新名称",
  "role_description": "新描述",
  "permission_codes": ["permission.code1"]
}
```

#### 删除角色
```bash
DELETE /api/v1/roles/:id
```

#### 分配角色权限
```bash
POST /api/v1/roles/:id/permissions
{
  "permission_ids": [1, 2, 3],
  "permission_codes": ["perm1", "perm2"]
}
```

## 最佳实践

1. **最小权限原则**: 为用户分配完成工作所需的最小权限集
2. **角色层级**: 使用系统角色处理系统级操作，企业角色处理业务操作
3. **定期审计**: 定期检查用户权限，移除不必要的权限
4. **权限分离**: 避免将冲突的权限分配给同一角色
5. **文档化**: 记录自定义角色的用途和权限配置

## 常见问题

### Q: 如何为用户分配角色？
A: 在用户管理页面，选择用户后点击"编辑"，在角色下拉框中选择相应角色。

### Q: 系统角色和企业角色的区别？
A: 系统角色是系统级别的，不可删除；企业角色是企业级别的，可以自定义修改。

### Q: 如何创建自定义角色？
A: 访问角色管理页面，点击"新建角色"，配置权限后保存。

### Q: 角色权限修改后何时生效？
A: 立即生效，用户下次请求时会使用新的权限配置。

### Q: 能否为用户分配多个角色？
A: 当前系统支持用户拥有一个主角色，但可以通过自定义权限补充额外权限。

## 技术实现

- **后端**: Go + GORM + PostgreSQL
- **前端**: React + TypeScript + Ant Design
- **权限检查**: JWT Token + 中间件验证
- **缓存**: Redis缓存用户权限，提升性能

## 更新日志

- **2025-11-01**: 创建角色权限体系文档
- **2025-11-01**: 实现12个预定义角色
- **2025-11-01**: 完成96个权限定义
- **2025-11-01**: 创建角色初始化脚本

---

**文档维护**: AI Project Development Team
**最后更新**: 2025-11-01
