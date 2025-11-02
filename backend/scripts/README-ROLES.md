# 角色权限系统初始化指南

## 概述

本目录包含了完整的角色权限系统初始化和管理脚本,用于建立AI Project的双层角色架构(系统级 + 企业级)。

## 文件说明

### 配置文件

| 文件 | 说明 |
|------|------|
| `role-permissions-mapping.json` | 角色权限映射配置,定义了每个角色的权限集 |

### SQL脚本

| 文件 | 说明 |
|------|------|
| `init-default-system-roles.sql` | 创建系统级角色和权限分配 |
| `create-enterprise-roles.sql` | 为现有企业创建企业级角色 |

### Shell脚本

| 文件 | 说明 |
|------|------|
| `init-roles-system.sh` | 主初始化脚本,一键执行完整初始化 |
| `test-roles-system.sh` | 测试脚本,验证角色系统配置 |

### 文档

| 文件 | 说明 |
|------|------|
| `README-ROLES.md` | 本文档 |
| `../../docs/rbac-role-design.md` | 完整的设计文档 |

---

## 快速开始

### 前置条件

1. PostgreSQL 数据库已运行
2. 已配置 `.env` 文件中的数据库连接
3. 已执行基础数据库迁移

### 一键初始化

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend/scripts

# 执行初始化脚本
./init-roles-system.sh
```

该脚本会:
1. 检查数据库连接
2. 备份现有角色数据
3. 创建7个系统级角色
4. 为每个角色分配相应权限
5. 为所有现有企业创建默认角色
6. 迁移现有用户到新角色

### 验证安装

```bash
# 运行测试脚本
./test-roles-system.sh
```

---

## 系统角色说明

### 1. SYSTEM_SUPER_ADMIN - 系统超级管理员
- **权限**: 所有权限 (73个)
- **用途**: 平台运营管理,系统维护
- **用户**: 平台管理员

### 2. SYSTEM_ADMIN - 系统管理员
- **权限**: ~50个系统管理权限
- **用途**: 系统配置、监控、跨企业支持
- **用户**: 系统运维人员

### 3. ENTERPRISE_ADMIN - 企业管理员模板
- **权限**: ~40个企业管理权限
- **用途**: 企业内最高权限
- **用户**: 企业负责人、部门总监

### 4. ENTERPRISE_PM - 项目经理模板
- **权限**: ~30个项目管理权限
- **用途**: 项目管理、团队协调
- **用户**: 项目经理、产品经理

### 5. ENTERPRISE_DEVELOPER - 开发人员模板
- **权限**: ~20个开发权限
- **用途**: 开发任务、技术文档
- **用户**: 开发工程师、测试人员

### 6. ENTERPRISE_USER - 普通用户模板
- **权限**: ~15个基础权限
- **用途**: 基本任务执行
- **用户**: 一般员工

### 7. ENTERPRISE_GUEST - 访客模板
- **权限**: ~8个只读权限
- **用途**: 临时访问
- **用户**: 外部合作伙伴

---

## 权限体系

### 基础权限 (所有用户)
```
- dashboard.read          # 查看Dashboard
- profile.read/update     # 个人资料
- password.change         # 修改密码
- work_note.*             # 个人笔记
- timer.*                 # 计时器
- stats.view.own          # 个人统计
```

### 权限继承关系
```
SYSTEM_SUPER_ADMIN (所有)
  ↓
SYSTEM_ADMIN (系统管理)
  ↓
ENTERPRISE_ADMIN (企业管理)
  ↓
ENTERPRISE_PM (项目管理)
  ↓
ENTERPRISE_DEVELOPER (开发)
  ↓
ENTERPRISE_USER (基础操作)
  ↓
ENTERPRISE_GUEST (只读)
```

---

## 企业角色管理

### 企业创建时自动生成

每个新企业创建时,系统会自动创建以下5个默认角色:
- ENTERPRISE_ADMIN
- ENTERPRISE_PM
- ENTERPRISE_DEVELOPER
- ENTERPRISE_USER
- ENTERPRISE_GUEST

### 企业自定义角色

企业管理员可以:
1. 从系统模板创建新角色
2. 自定义角色权限
3. 修改角色名称和描述
4. 停用/激活角色

### API端点

```
# 系统角色管理 (仅系统管理员)
GET    /api/v1/system/roles
POST   /api/v1/system/roles
PUT    /api/v1/system/roles/:id
DELETE /api/v1/system/roles/:id

# 企业角色管理 (企业管理员)
GET    /api/v1/enterprises/:eid/roles
POST   /api/v1/enterprises/:eid/roles
PUT    /api/v1/enterprises/:eid/roles/:id
DELETE /api/v1/enterprises/:eid/roles/:id

# 从模板创建
POST   /api/v1/enterprises/:eid/roles/from-template
```

---

## 数据库查询示例

### 查看系统角色
```sql
SELECT * FROM v_system_roles_summary
ORDER BY role_code;
```

### 查看企业角色
```sql
SELECT * FROM v_enterprise_roles_summary
WHERE enterprise_id = 1
ORDER BY role_code;
```

### 查看角色权限
```sql
SELECT
    r.role_code,
    r.role_name,
    p.permission_code,
    p.permission_name
FROM company_roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.role_code = 'ENTERPRISE_ADMIN'
  AND rp.is_granted = true
ORDER BY p.module, p.resource, p.action;
```

### 查看用户角色
```sql
SELECT
    eu.id,
    eu.name,
    eu.email,
    r.role_code,
    r.role_name,
    e.name as enterprise_name
FROM enterprise_users eu
JOIN company_roles r ON eu.role_id = r.id
JOIN enterprises e ON eu.enterprise_id = e.id
WHERE eu.deleted_at IS NULL
ORDER BY e.id, r.role_code;
```

---

## 故障排除

### 问题1: 数据库连接失败
```bash
# 检查 .env 配置
cat ../../.env | grep DB_

# 测试连接
PGPASSWORD='your_password' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod -c "SELECT 1"
```

### 问题2: 角色已存在冲突
```sql
-- 查看现有角色
SELECT role_code, role_name, is_system_role, is_active
FROM company_roles
WHERE role_code LIKE '%ADMIN%';

-- 停用旧角色
UPDATE company_roles
SET is_active = false
WHERE role_code IN ('admin', 'super_admin')
  AND is_system_role = true;
```

### 问题3: 权限缺失
```bash
# 重新运行初始化
./init-roles-system.sh

# 检查权限数量
psql -c "SELECT r.role_code, COUNT(rp.permission_id)
FROM company_roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.is_system_role = true
GROUP BY r.role_code;"
```

---

## 回滚方案

### 方法1: 从备份恢复
```bash
# 查找备份
ls -la ./backups/roles-*

# 恢复
BACKUP_DIR=./backups/roles-20251102_123456
psql < $BACKUP_DIR/restore.sql
```

### 方法2: 重置角色
```sql
-- 删除新创建的角色
DELETE FROM role_permissions
WHERE role_id IN (
    SELECT id FROM company_roles
    WHERE role_code IN (
        'SYSTEM_SUPER_ADMIN', 'SYSTEM_ADMIN',
        'ENTERPRISE_ADMIN', 'ENTERPRISE_PM',
        'ENTERPRISE_DEVELOPER', 'ENTERPRISE_USER', 'ENTERPRISE_GUEST'
    )
);

DELETE FROM company_roles
WHERE role_code IN (
    'SYSTEM_SUPER_ADMIN', 'SYSTEM_ADMIN',
    'ENTERPRISE_ADMIN', 'ENTERPRISE_PM',
    'ENTERPRISE_DEVELOPER', 'ENTERPRISE_USER', 'ENTERPRISE_GUEST'
);

-- 恢复旧角色活跃状态
UPDATE company_roles
SET is_active = true
WHERE role_code IN ('admin', 'super_admin', 'member', 'guest');
```

---

## 后续开发

### 添加新权限
1. 在 `permissions` 表中添加新权限
2. 更新 `role-permissions-mapping.json`
3. 更新相应角色的权限映射
4. 重新运行初始化脚本

### 添加新角色模板
1. 在 `role-permissions-mapping.json` 中定义
2. 在 `init-default-system-roles.sql` 中添加创建和权限分配
3. 在 `create-enterprise-roles.sql` 中添加到企业默认角色
4. 更新文档

---

## 相关文档

- [完整设计文档](../../docs/rbac-role-design.md)
- [权限常量定义](../constants/permissions.go)
- [前端权限定义](../../frontend/src/constants/permissions.ts)
- [角色管理页面](http://localhost:3000/admin/roles)

---

## 技术支持

如有问题,请:
1. 查看测试脚本输出: `./test-roles-system.sh`
2. 检查数据库日志
3. 查看应用日志: `backend/logs/`
4. 联系系统管理员

---

**版本**: v1.0
**最后更新**: 2025-11-02
**作者**: Claude Code AI
