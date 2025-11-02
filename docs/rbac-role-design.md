# AI Project 角色权限系统设计方案

## 一、系统概述

本系统采用**双层角色架构**设计:
- **系统级角色** (System Roles): 作为模板,由系统管理员统一管理
- **企业级角色** (Enterprise Roles): 从系统角色派生,企业管理员可自定义

### 核心设计理念

1. **模板继承**: 企业角色默认从系统角色继承权限配置
2. **权限隔离**: 系统角色和企业角色分离管理
3. **灵活定制**: 企业可基于模板自定义角色权限
4. **向后兼容**: 兼容现有数据,平滑迁移

---

## 二、系统级角色清单 (System Roles)

系统级角色作为标准模板,`is_system_role = true`,不属于任何企业。

### 1. SYSTEM_SUPER_ADMIN - 系统超级管理员

**角色代码**: `SYSTEM_SUPER_ADMIN`
**角色名称**: 系统超级管理员
**描述**: 拥有系统所有权限,包括跨企业管理能力

**权限范围**: 所有权限 (73个)

**使用场景**:
- 平台运营管理员
- 系统维护人员
- 跨企业数据管理

---

### 2. SYSTEM_ADMIN - 系统管理员

**角色代码**: `SYSTEM_ADMIN`
**角色名称**: 系统管理员
**描述**: 系统层面的管理员,负责系统配置和监控

**权限清单** (约50个权限):

**系统管理**:
- system.admin (系统管理)
- system.config (系统配置)
- system.audit (审计查看)
- system.audit_logs.read (查看审计日志)
- system.settings.read (查看系统设置)
- system.settings.manage (管理系统设置)

**API管理**:
- api.admin (API管理)
- api.keys.* (API密钥管理)
- api.logs.read (API日志查看)
- api.quota.read (配额查看)

**企业管理** (跨企业):
- company.info.read (查看企业信息)
- company.users.read (查看企业用户)

**审计与监控**:
- 所有审计相关权限

**使用场景**:
- 系统运维
- 安全合规管理
- 跨企业支持

---

### 3. ENTERPRISE_ADMIN - 企业管理员模板

**角色代码**: `ENTERPRISE_ADMIN`
**角色名称**: 企业管理员
**描述**: 企业内最高权限,管理企业所有资源

**权限清单** (约40个权限):

**企业管理**:
- company.info.read (查看企业信息)
- company.info.update (编辑企业信息)
- company.users.* (企业用户管理)
- company.roles.manage (管理企业角色)

**项目管理**:
- project.* (所有项目权限)
- enterprise.project.read (企业项目查看)

**任务管理**:
- task.* (所有任务权限)
- enterprise.task.read (企业任务查看)

**财务管理**:
- finance.contracts.* (合同管理)
- finance.reports.* (财务报表)

**文档管理**:
- document.* (所有文档权限)

**团队管理**:
- work_notes.team.* (团队笔记)

**基础权限**:
- 所有基础权限 (dashboard, profile, timer, etc.)

**使用场景**:
- 企业负责人
- 部门总监
- 企业Owner

---

### 4. ENTERPRISE_PM - 项目经理模板

**角色代码**: `ENTERPRISE_PM`
**角色名称**: 项目经理
**描述**: 负责项目计划、执行和团队协调

**权限清单** (约30个权限):

**项目管理**:
- project.read (查看项目)
- project.create (创建项目)
- project.update (编辑项目)
- project.detail.read (查看项目详情)
- project.members.manage (管理项目成员)
- project:list (列出项目)
- project:read (读取项目)

**任务管理**:
- task.read (查看任务)
- task.create (创建任务)
- task.update (编辑任务)
- task:create (创建任务)
- task:write (修改任务)
- task:read (读取任务)
- task:status (更新任务状态)
- task.detail.read (查看任务详情)

**文档管理**:
- document:read (读取文档)
- document:create (创建文档)
- document:write (修改文档)
- document:attach (关联文档)

**团队协作**:
- work_notes.read (查看工作笔记)
- work_notes.create (创建工作笔记)
- work_notes.team.read (查看团队笔记)

**财务查看**:
- finance.contracts.read (查看合同)
- finance.reports.read (查看报表)

**基础权限**:
- dashboard.read
- profile.*
- timer.*
- stats.view.own

**使用场景**:
- 项目经理
- 产品经理
- Scrum Master

---

### 5. ENTERPRISE_DEVELOPER - 开发人员模板

**角色代码**: `ENTERPRISE_DEVELOPER`
**角色名称**: 开发人员
**描述**: 执行开发任务、编写代码和技术文档

**权限清单** (约20个权限):

**项目访问**:
- project.read (查看项目)
- project.detail.read (查看项目详情)
- project:read (读取项目)

**任务管理**:
- task.read (查看任务)
- task.create (创建任务)
- task.update (编辑任务)
- task:read (读取任务)
- task:write (修改任务)
- task:status (更新任务状态)

**文档管理**:
- document:read (读取文档)
- document:create (创建文档)
- document:write (修改文档)
- document:attach (关联文档)

**工作笔记**:
- work_note.* (个人工作笔记)
- work_notes.read (查看团队笔记)

**计时器**:
- timer.* (所有计时器权限)

**基础权限**:
- dashboard.read
- profile.*
- stats.view.own

**使用场景**:
- 软件工程师
- 前端/后端开发
- 测试工程师

---

### 6. ENTERPRISE_USER - 普通成员模板

**角色代码**: `ENTERPRISE_USER`
**角色名称**: 普通用户
**描述**: 企业普通成员,执行基本任务和查看信息

**权限清单** (约15个权限):

**项目查看**:
- project.read (查看项目)
- project.detail.read (查看项目详情)
- enterprise.project.read (企业项目查看)

**任务操作**:
- task.read (查看任务)
- task.update (更新分配给自己的任务)
- task:read (读取任务)
- task:status (更新任务状态)
- enterprise.task.read (企业任务查看)

**文档查看**:
- document:read (读取文档)

**工作笔记**:
- work_note.* (个人工作笔记)

**基础权限**:
- dashboard.read
- profile.*
- timer.*
- stats.view.own

**使用场景**:
- 一般员工
- 实习生
- 协作成员

---

### 7. ENTERPRISE_GUEST - 访客模板

**角色代码**: `ENTERPRISE_GUEST`
**角色名称**: 访客
**描述**: 临时访客,仅可查看授权的信息

**权限清单** (约8个权限):

**只读访问**:
- project.read (查看项目)
- task.read (查看任务)
- document:read (读取文档)

**基础权限**:
- dashboard.read
- profile.read
- profile.update (更新自己的资料)

**使用场景**:
- 外部合作伙伴
- 临时访客
- 客户代表

---

## 三、企业级角色 (Enterprise Roles)

企业级角色从系统角色派生,`is_system_role = false`,属于特定企业。

### 角色创建机制

1. **自动创建**: 企业注册时自动创建默认角色
2. **模板复制**: 从系统角色模板复制权限配置
3. **可自定义**: 企业管理员可修改角色权限
4. **命名规范**: `{enterprise_code}_{role_code}` 或直接使用 `role_code`

### 默认企业角色

每个企业创建时自动生成以下角色:

| 企业角色代码 | 对应系统模板 | 是否可删除 |
|------------|------------|----------|
| ENTERPRISE_ADMIN | ENTERPRISE_ADMIN | 否 |
| ENTERPRISE_PM | ENTERPRISE_PM | 是 |
| ENTERPRISE_DEVELOPER | ENTERPRISE_DEVELOPER | 是 |
| ENTERPRISE_USER | ENTERPRISE_USER | 否 |
| ENTERPRISE_GUEST | ENTERPRISE_GUEST | 是 |

### 企业自定义角色

企业可以:
- 基于模板创建新角色
- 自定义角色权限
- 调整角色描述和名称
- 停用/激活角色

---

## 四、权限映射方案

### 权限分类

#### 1. 基础权限 (Base Permissions)
所有用户自动拥有,无需配置:
```
- dashboard.read
- profile.read, profile.update, password.change
- work_note.create, work_note.read, work_note.update, work_note.delete
- timer.start, timer.stop, timer.view
- stats.view.own
```

#### 2. 系统级权限 (System Permissions)
仅系统管理员拥有:
```
- system.*
- api.*
- company.* (跨企业)
```

#### 3. 企业级权限 (Enterprise Permissions)
企业内管理:
```
- company.info.*
- company.users.*
- company.roles.*
```

#### 4. 项目级权限 (Project Permissions)
项目相关:
```
- project.*
- enterprise.project.*
```

#### 5. 任务级权限 (Task Permissions)
任务相关:
```
- task.*
- enterprise.task.*
```

#### 6. 文档级权限 (Document Permissions)
文档管理:
```
- document.*
```

#### 7. 财务级权限 (Finance Permissions)
财务管理:
```
- finance.*
```

### 权限继承规则

```
系统超级管理员 (所有权限)
  ↓
系统管理员 (系统级 + 审计权限)
  ↓
企业管理员 (企业内所有权限)
  ↓
项目经理 (项目 + 任务 + 文档)
  ↓
开发人员 (任务 + 文档)
  ↓
普通用户 (查看 + 基础操作)
  ↓
访客 (只读)
```

---

## 五、实施方案

### 数据库迁移

#### 步骤1: 添加 enterprise_id 字段

```sql
-- 为 company_roles 表添加 enterprise_id 字段
ALTER TABLE company_roles
ADD COLUMN enterprise_id INTEGER REFERENCES enterprises(id);

-- 添加索引
CREATE INDEX idx_company_roles_enterprise_id ON company_roles(enterprise_id);

-- 添加约束: 企业角色必须有 enterprise_id
ALTER TABLE company_roles
ADD CONSTRAINT chk_enterprise_role
CHECK (
  (is_system_role = true AND enterprise_id IS NULL) OR
  (is_system_role = false AND enterprise_id IS NOT NULL)
);
```

#### 步骤2: 清理现有数据

```sql
-- 标记系统级角色
UPDATE company_roles
SET is_system_role = true
WHERE role_code IN (
  'SYSTEM_SUPER_ADMIN',
  'SYSTEM_ADMIN',
  'ENTERPRISE_ADMIN',
  'ENTERPRISE_PM',
  'ENTERPRISE_DEVELOPER',
  'ENTERPRISE_USER',
  'ENTERPRISE_GUEST'
);

-- 删除重复的系统角色
DELETE FROM company_roles
WHERE role_code IN ('super_admin', 'admin', 'superadmin', 'system_admin')
  AND id NOT IN (
    SELECT MIN(id) FROM company_roles
    WHERE role_code IN ('super_admin', 'admin', 'superadmin', 'system_admin')
    GROUP BY role_code
  );
```

#### 步骤3: 创建系统角色

```sql
-- 使用预定义脚本创建标准系统角色
-- 见下文 "默认角色初始化脚本"
```

#### 步骤4: 为现有企业创建角色

```sql
-- 为每个企业创建默认角色集
-- 见下文 "企业角色自动创建"
```

### 默认角色初始化脚本

脚本位置: `backend/scripts/init-default-system-roles.sql`

### 企业角色自动创建

触发时机:
1. 新企业注册时
2. 现有企业数据迁移时

实现位置: `backend/services/enterprise_service.go`

---

## 六、API设计

### 系统角色管理 (仅系统管理员)

```
GET    /api/v1/system/roles              # 获取所有系统角色
POST   /api/v1/system/roles              # 创建系统角色
GET    /api/v1/system/roles/:id          # 获取系统角色详情
PUT    /api/v1/system/roles/:id          # 更新系统角色
DELETE /api/v1/system/roles/:id          # 删除系统角色
PUT    /api/v1/system/roles/:id/permissions  # 更新角色权限
```

### 企业角色管理 (企业管理员)

```
GET    /api/v1/enterprises/:eid/roles              # 获取企业角色
POST   /api/v1/enterprises/:eid/roles              # 创建企业角色
GET    /api/v1/enterprises/:eid/roles/:id          # 获取角色详情
PUT    /api/v1/enterprises/:eid/roles/:id          # 更新角色
DELETE /api/v1/enterprises/:eid/roles/:id          # 删除角色
PUT    /api/v1/enterprises/:eid/roles/:id/permissions  # 更新权限

# 从模板创建角色
POST   /api/v1/enterprises/:eid/roles/from-template
Body: { "template_role_code": "ENTERPRISE_PM", "custom_name": "高级PM" }
```

### 用户角色分配

```
# 分配角色给用户
PUT    /api/v1/enterprises/:eid/users/:uid/role
Body: { "role_id": 123 }

# 查看用户权限
GET    /api/v1/enterprises/:eid/users/:uid/permissions
```

---

## 七、前端实现

### 角色管理页面

**路径**: `/admin/roles`

**功能**:
1. 查看系统角色(只读,仅超级管理员)
2. 管理企业角色(企业管理员)
3. 从模板创建角色
4. 编辑角色权限
5. 分配角色给用户

### 权限组件

```typescript
// 按钮级权限控制
<PermissionButton permission="project.create">
  创建项目
</PermissionButton>

// 路由级权限控制
<PermissionRoute permission="finance.reports.read" path="/finance/reports">
  <FinanceReportsPage />
</PermissionRoute>
```

---

## 八、安全考虑

### 权限检查层级

1. **基础权限**: 自动放行
2. **系统权限**: 检查是否为系统管理员
3. **企业权限**: 检查企业归属和角色权限
4. **资源权限**: 检查资源所有权

### 审计日志

所有角色和权限变更记录到审计日志:
- 角色创建/更新/删除
- 权限分配/撤销
- 用户角色变更

---

## 九、迁移计划

### Phase 1: 准备阶段 (1小时)
- 创建迁移脚本
- 测试环境验证

### Phase 2: 数据清理 (1小时)
- 清理重复角色
- 标记系统角色
- 备份现有数据

### Phase 3: 结构调整 (2小时)
- 添加 enterprise_id 字段
- 创建标准系统角色
- 为现有企业创建角色

### Phase 4: 代码更新 (3小时)
- 更新 API
- 更新前端
- 更新中间件

### Phase 5: 测试验证 (2小时)
- 功能测试
- 权限测试
- 性能测试

**总预计时间**: 9小时 (AI开发效率)

---

## 十、测试用例

### 系统角色测试
- [ ] 创建系统角色
- [ ] 更新系统权限
- [ ] 企业无法修改系统角色

### 企业角色测试
- [ ] 企业注册自动创建默认角色
- [ ] 从模板创建角色
- [ ] 自定义角色权限
- [ ] 删除非必须角色

### 权限测试
- [ ] 基础权限自动放行
- [ ] 系统权限隔离
- [ ] 企业权限隔离
- [ ] 角色继承正确

### 用户测试
- [ ] 分配角色
- [ ] 权限生效
- [ ] 跨企业隔离

---

**文档版本**: v1.0
**创建时间**: 2025-11-02
**作者**: Claude Code AI
**状态**: 设计阶段
