# 标准系统角色数据初始化

> **任务**: #622 - 创建默认系统角色数据初始化  
> **作者**: Claude AI  
> **创建时间**: 2025-08-27  
> **所属阶段**: 任务#600 - 阶段2：角色权限定义与初始化 (3周)

## 概述

本迁移实现了6个标准系统角色的创建和权限分配，为系统建立完整的基于角色的访问控制(RBAC)基础。

## 创建的角色

### 1. SuperAdmin (superadmin)
- **描述**: 超级管理员，拥有系统所有权限的最高级别管理员
- **权限**: 所有系统权限，无任何限制
- **用途**: 系统初始化、紧急维护、最高级别管理操作

### 2. SystemAdmin (system_admin)  
- **描述**: 系统管理员，负责系统配置和用户管理
- **权限**: 除超级管理员专属权限外的大部分管理权限
- **用途**: 日常系统管理、用户管理、配置管理

### 3. SystemOperator (system_operator)
- **描述**: 系统操作员，负责日常操作和监控
- **权限**: 操作和监控相关权限，可以进行日常业务操作
- **用途**: 项目操作、任务管理、文档管理、基础监控

### 4. SystemAuditor (system_auditor)
- **描述**: 系统审计员，负责安全审计和合规检查
- **权限**: 主要为查看权限，用于审计和监控
- **用途**: 安全审计、合规检查、系统监控

### 5. SystemSupport (system_support)
- **描述**: 系统支持员，负责技术支持和故障排除
- **权限**: 技术支持相关权限，可以帮助用户解决问题
- **用途**: 技术支持、故障排除、用户协助

### 6. SystemGuest (system_guest)
- **描述**: 系统访客，只有基础的查看权限
- **权限**: 最基础的查看权限
- **用途**: 临时访问、演示账号、受限访问

## 权限分配原则

1. **最小权限原则**: 每个角色只获得执行其职责所需的最小权限集
2. **职责分离**: 不同角色承担不同职责，避免权限过度集中
3. **层次化设计**: 角色按权限级别分层，便于管理和理解
4. **安全优先**: 敏感操作权限严格控制，确保系统安全

## 文件结构

```
032_standard_system_roles/
├── README.md                           # 本说明文档
├── 001_create_standard_system_roles.sql # SQL迁移文件
├── execute_migration.sh                 # 执行脚本
└── verify_roles.sh                     # 验证脚本
```

## 使用方法

### 1. 执行迁移

```bash
cd /path/to/backend/migrations/032_standard_system_roles
chmod +x execute_migration.sh verify_roles.sh
./execute_migration.sh
```

### 2. 验证结果

```bash
./verify_roles.sh
```

### 3. 手动执行SQL

```bash
psql $DATABASE_URL -f 001_create_standard_system_roles.sql
```

## 验证检查项

- [x] 6个标准角色全部创建成功
- [x] 角色代码唯一性检查
- [x] 系统角色标记正确
- [x] 角色状态为激活
- [x] 权限分配符合预期
- [x] SuperAdmin拥有所有权限
- [x] SystemGuest拥有最少权限
- [x] 无重复角色定义

## 技术细节

### 数据库表依赖
- `company_roles`: 角色基本信息
- `permissions`: 权限定义
- `role_permissions`: 角色权限关联

### 冲突处理
使用 `ON CONFLICT ... DO UPDATE` 确保迁移可重复执行，已存在的角色会被更新而不会报错。

### 事务保护
整个迁移过程在事务中执行，确保数据一致性。

### 备份机制
执行前自动备份现有角色数据，出现问题时可以恢复。

## 后续任务

本任务完成后，需要继续执行：
- 任务#623: 创建权限系统基础数据初始化
- 任务#624: 实现角色权限关联表初始化
- 任务#625: 开发数据库迁移脚本和种子数据

## 注意事项

1. **执行环境**: 确保数据库服务正常运行
2. **权限要求**: 需要数据库写入权限
3. **数据备份**: 执行前会自动创建备份
4. **重复执行**: 支持安全的重复执行
5. **验证必要**: 执行后务必运行验证脚本

## 问题排查

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务状态
   - 验证连接配置信息

2. **表不存在错误**
   - 确认RBAC权限系统已正确创建
   - 检查依赖表是否存在

3. **权限分配不完整**
   - 运行验证脚本检查
   - 查看详细错误日志

### 回滚方法

如果需要回滚，可以使用备份文件：

```bash
# 恢复角色数据
psql $DATABASE_URL -c "DELETE FROM company_roles WHERE role_code IN ('superadmin', 'system_admin', 'system_operator', 'system_auditor', 'system_support', 'system_guest');"
psql $DATABASE_URL -c "\\copy company_roles FROM 'system_roles_backup_YYYYMMDD_HHMMSS.sql'"
```

## 相关文档

- [角色权限系统设计文档](../../docs/rbac-design.md)
- [权限管理API文档](../../docs/permission-api.md)
- [任务#600详细分解](../../../docs/task-600-breakdown.md)
