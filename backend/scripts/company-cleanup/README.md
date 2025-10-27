# Company体系清理方案

## 📋 概述

本目录包含用于系统性清理company体系、统一为enterprise企业管理体系的完整脚本和文档。

### 背景

系统目前存在两套并行的企业管理体系：
- **Company体系**: 较早的企业管理系统，包含companies、company_users等表
- **Enterprise体系**: 更完善的企业管理系统，包含enterprises、enterprise_users等表

这种双体系设计导致：
- 数据重复和不一致
- 代码维护复杂
- 用户名冲突（同一用户同时存在于两个体系）
- 业务逻辑混乱

### 目标

1. ✅ 将所有company数据迁移到enterprise体系
2. ✅ 清理company相关表和约束
3. ✅ 确保数据完整性和一致性
4. ✅ 提供完整的备份和回滚机制

## 📁 文件清单

```
company-cleanup/
├── README.md                              # 本文档
├── EXECUTION_PLAN.md                      # 详细执行计划
├── 01_backup_before_cleanup.sh           # 数据库备份脚本
├── 02_migrate_data.sh                     # 数据迁移脚本
└── 03_cleanup_company_tables.sh          # 清理脚本
```

## 🚀 快速开始

### 前置条件

1. **数据库访问权限**
   ```bash
   export PGPASSWORD='SecureAI2024!@#$%^'
   export DB_HOST='127.0.0.1'
   export DB_PORT='5433'
   export DB_NAME='ai_project_prod'
   export DB_USER='ai_prod_user'
   ```

2. **必要工具**
   - PostgreSQL客户端 (psql, pg_dump)
   - Bash 4.0+
   - 足够的磁盘空间（至少2GB用于备份）

3. **权限**
   - 数据库读写权限
   - 脚本执行权限

### 执行步骤

#### 步骤1: 完整备份

**目的**: 创建完整的数据库备份，确保可以回滚

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend/scripts/company-cleanup
./01_backup_before_cleanup.sh
```

**输出**:
- 完整数据库备份: `backups/company_cleanup_YYYYMMDD_HHMMSS/full_database.backup`
- SQL备份: `backups/company_cleanup_YYYYMMDD_HHMMSS/sql_backups/*.sql`
- CSV导出: `backups/company_cleanup_YYYYMMDD_HHMMSS/csv_exports/*.csv`
- 统计信息: `backups/company_cleanup_YYYYMMDD_HHMMSS/statistics.txt`

**验证**:
```bash
# 查看备份文件
ls -lh ../backups/company_cleanup_*/

# 查看统计信息
cat ../backups/company_cleanup_*/statistics.txt
```

#### 步骤2: 数据迁移

**目的**: 将company数据迁移到enterprise体系

```bash
./02_migrate_data.sh
```

**迁移内容**:
1. 处理重复用户名（company类型用户重命名为 `username_company`）
2. 迁移companies → enterprises
3. 迁移company_users → enterprise_users
4. 更新users表的user_type和role
5. 验证迁移结果

**日志**:
- 迁移日志: `../backups/migration_YYYYMMDD_HHMMSS.log`

**验证**:
```bash
# 检查迁移结果
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod << 'SQL'
-- 检查enterprise用户数
SELECT COUNT(*) as enterprise_users FROM enterprise_users WHERE deleted_at IS NULL;

-- 检查是否还有company类型用户
SELECT COUNT(*) as company_users FROM users WHERE user_type = 'company' AND deleted_at IS NULL;

-- 检查重复用户名
SELECT username, COUNT(*) as count
FROM users WHERE deleted_at IS NULL
GROUP BY username HAVING COUNT(*) > 1;
SQL
```

#### 步骤3: 清理Company表

**目的**: 清理company相关表和约束

##### 3a. 软删除（推荐，可回滚）

```bash
./03_cleanup_company_tables.sh soft
```

- ✅ 标记数据为已删除（deleted_at）
- ✅ 保留表结构
- ✅ 可以恢复
- ✅ 更新CHECK约束

##### 3b. 硬删除（不可逆！）

```bash
./03_cleanup_company_tables.sh hard
```

- ❌ 物理删除表
- ❌ 数据不可恢复（除非从备份还原）
- ⚠️ 需要输入 `DELETE_TABLES` 确认

**验证**:
```bash
# 查看清理结果
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod << 'SQL'
-- 检查活跃的company数据
SELECT 'companies' as table_name, COUNT(*) as count FROM companies WHERE deleted_at IS NULL
UNION ALL
SELECT 'company_users', COUNT(*) FROM company_users WHERE deleted_at IS NULL
UNION ALL
SELECT 'users (company)', COUNT(*) FROM users WHERE user_type = 'company' AND deleted_at IS NULL;

-- 检查约束
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%user_type%';
SQL
```

## 📊 数据统计

### 迁移前（截至2025-01-27）

| 项目 | Company体系 | Enterprise体系 |
|------|------------|---------------|
| 企业数 | 2 | 2 |
| 客户数 | 6 | - |
| 用户数 | 8 | 9 |
| 部门数 | 0 | - |
| 重复用户 | 2 (akang, litingting) | - |

### 迁移后（预期）

| 项目 | 数量 |
|------|-----|
| 企业数 | 4 (原有2 + 迁移2) |
| 企业用户 | 17 (原有9 + 迁移8) |
| 重复用户 | 0 |
| Company类型用户 | 0 |

## 🔄 回滚方案

### 如果需要回滚

#### 方案1: 从完整备份恢复

```bash
# 找到最新的备份
BACKUP_DIR=$(find ../backups -name "company_cleanup_*" -type d | sort -r | head -1)
echo "使用备份: ${BACKUP_DIR}"

# 恢复完整数据库（会覆盖当前数据！）
pg_restore -h 127.0.0.1 -p 5433 -U ai_prod_user \
    -d ai_project_prod -c -v \
    "${BACKUP_DIR}/full_database.backup"
```

#### 方案2: 从SQL备份恢复特定表

```bash
BACKUP_DIR=$(find ../backups -name "company_cleanup_*" -type d | sort -r | head -1)

# 恢复单个表
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod \
    -f "${BACKUP_DIR}/sql_backups/companies.sql"
```

#### 方案3: 软删除回滚（仅限软删除模式）

```bash
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod << 'SQL'
BEGIN;

-- 恢复软删除的数据
UPDATE companies SET deleted_at = NULL WHERE deleted_at IS NOT NULL;
UPDATE company_users SET deleted_at = NULL WHERE deleted_at IS NOT NULL;
UPDATE customers SET deleted_at = NULL WHERE deleted_at IS NOT NULL;

-- 恢复users表的company类型
UPDATE users SET deleted_at = NULL
WHERE user_type = 'company' AND deleted_at IS NOT NULL;

COMMIT;
SQL
```

## ⚠️ 风险和注意事项

### 高风险项

1. **重复用户名处理**
   - 风险: company类型用户被重命名，可能影响登录
   - 缓解: 迁移后通知用户使用新用户名

2. **外键约束**
   - 风险: 其他表可能引用company_id
   - 缓解: 脚本会检测并报告所有外键

3. **应用程序兼容性**
   - 风险: 后端/前端代码仍引用company接口
   - 缓解: 需要同步更新代码

### 中风险项

1. **数据完整性**
   - 风险: 迁移过程中数据丢失
   - 缓解: 完整备份 + 事务保护

2. **性能影响**
   - 风险: 迁移期间数据库负载
   - 缓解: 建议在低峰期执行

### 低风险项

1. **备份空间**
   - 风险: 备份文件占用磁盘空间
   - 缓解: 定期清理旧备份

## 📝 后续工作清单

### 数据库层面 ✅

- [x] 备份数据
- [x] 迁移数据
- [x] 清理表和约束

### 代码层面 ⏳

#### 后端 (Go)

需要清理的文件：
- [ ] `handlers/company_handler.go`
- [ ] `services/company_service.go`
- [ ] `database/company_repository.go`
- [ ] `routes/company_routes.go`
- [ ] `models/company.go`

需要更新的文件：
- [ ] `middleware/auth_middleware.go` - 移除company相关权限检查
- [ ] `handlers/user_handler.go` - 移除company类型用户处理
- [ ] `services/user_service.go` - 移除company逻辑

#### 前端 (React/Vue)

需要清理的文件：
- [ ] `src/pages/CompanyManagePage.tsx`
- [ ] `src/pages/CompanyEditPage.tsx`
- [ ] `src/components/CompanySelector.tsx`
- [ ] `src/services/companyService.ts`

需要更新的文件：
- [ ] 路由配置 - 移除company相关路由
- [ ] 导航菜单 - 移除company菜单项
- [ ] 用户管理页面 - 移除company类型选项

### 文档和测试 ⏳

- [ ] 更新API文档
- [ ] 更新数据库设计文档
- [ ] 更新用户手册
- [ ] 更新测试用例

### 通知和沟通 ⏳

- [ ] 通知开发团队
- [ ] 通知运维团队
- [ ] 通知产品团队
- [ ] 更新变更日志

## 📞 支持和联系

如有问题，请联系：
- 开发负责人: Claude Code
- 任务编号: #2852
- 文档版本: 1.0
- 最后更新: 2025-01-27

## 📚 相关文档

- [详细执行计划](./EXECUTION_PLAN.md)
- [任务文档](../docs/task-2852-company-cleanup-design.md)
- [数据库设计文档](../docs/database-design.md)
