# Company体系清理 - 详细执行计划

## 📅 执行计划概览

| 阶段 | 预计时长 | 负责人 | 状态 |
|------|---------|--------|------|
| 准备阶段 | 2小时 | DevOps + DBA | ⏳ 待执行 |
| 备份阶段 | 1小时 | DBA | ⏳ 待执行 |
| 迁移阶段 | 2小时 | DBA + 后端 | ⏳ 待执行 |
| 验证阶段 | 1小时 | QA + 后端 | ⏳ 待执行 |
| 清理阶段 | 1小时 | DBA | ⏳ 待执行 |
| 代码更新 | 8小时 | 后端 + 前端 | ⏳ 待执行 |
| 测试阶段 | 4小时 | QA | ⏳ 待执行 |
| 上线阶段 | 2小时 | DevOps | ⏳ 待执行 |
| **总计** | **21小时** | - | - |

## 🎯 执行目标

1. **零数据丢失**: 确保所有company数据完整迁移到enterprise体系
2. **零停机迁移**: 迁移过程不影响生产环境正常运行
3. **可回滚**: 任何步骤出错都能快速回滚
4. **可追溯**: 完整的日志和审计记录

## 📋 详细执行步骤

### 阶段1: 准备阶段 (2小时)

#### 1.1 环境准备 (30分钟)

**负责人**: DevOps

**任务清单**:
- [ ] 检查数据库连接
- [ ] 检查磁盘空间（至少5GB可用）
- [ ] 检查备份目录权限
- [ ] 准备回滚脚本
- [ ] 配置监控告警

**执行命令**:
```bash
# 检查数据库连接
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -c "SELECT version();"

# 检查磁盘空间
df -h /Users/johnqiu/coding/www/projects/new-ai-proj/backend/backups

# 检查脚本权限
ls -la /Users/johnqiu/coding/www/projects/new-ai-proj/backend/scripts/company-cleanup/*.sh
```

**验收标准**:
- ✅ 数据库连接正常
- ✅ 磁盘空间充足（>=5GB）
- ✅ 所有脚本有执行权限
- ✅ 监控系统正常

#### 1.2 数据审计 (30分钟)

**负责人**: DBA

**任务清单**:
- [ ] 统计company体系数据量
- [ ] 检查数据完整性
- [ ] 识别重复用户
- [ ] 检查外键依赖

**执行命令**:
```bash
# 生成数据审计报告
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod << 'SQL'
-- Company体系统计
SELECT 'companies' as table_name, COUNT(*) as count FROM companies WHERE deleted_at IS NULL
UNION ALL
SELECT 'customers', COUNT(*) FROM customers WHERE deleted_at IS NULL
UNION ALL
SELECT 'company_users', COUNT(*) FROM company_users WHERE deleted_at IS NULL
UNION ALL
SELECT 'users (company)', COUNT(*) FROM users WHERE user_type = 'company' AND deleted_at IS NULL;

-- 重复用户检查
SELECT username, COUNT(*) as count, array_agg(id) as user_ids, array_agg(user_type) as types
FROM users WHERE deleted_at IS NULL
GROUP BY username HAVING COUNT(*) > 1;

-- 外键依赖检查
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name LIKE 'company%' OR ccu.table_name LIKE 'company%');
SQL
```

**验收标准**:
- ✅ 数据量统计完成
- ✅ 重复用户已识别
- ✅ 外键依赖已记录

#### 1.3 团队沟通 (30分钟)

**负责人**: 项目经理

**任务清单**:
- [ ] 通知所有相关团队成员
- [ ] 确认执行时间窗口
- [ ] 分配任务和责任
- [ ] 准备应急联系方式

**沟通内容**:
- 迁移时间: [待定]
- 预计持续时间: 8小时
- 影响范围: company相关功能
- 回滚方案: 已准备
- 应急联系: [待定]

#### 1.4 测试环境验证 (30分钟)

**负责人**: QA + DBA

**任务清单**:
- [ ] 在测试环境执行完整流程
- [ ] 验证备份脚本
- [ ] 验证迁移脚本
- [ ] 验证清理脚本
- [ ] 测试回滚流程

**验收标准**:
- ✅ 测试环境迁移成功
- ✅ 数据完整性验证通过
- ✅ 回滚测试成功

---

### 阶段2: 备份阶段 (1小时)

#### 2.1 完整数据库备份 (45分钟)

**负责人**: DBA

**执行命令**:
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend/scripts/company-cleanup
./01_backup_before_cleanup.sh
```

**备份内容**:
1. 完整数据库备份 (pg_dump custom format)
2. Company相关表SQL备份
3. CSV数据导出
4. 数据统计信息
5. 备份清单

**验收标准**:
- ✅ 备份文件创建成功
- ✅ 备份大小合理（预计1-2GB）
- ✅ 备份清单完整
- ✅ 统计信息准确

#### 2.2 备份验证 (15分钟)

**负责人**: DBA

**任务清单**:
- [ ] 检查备份文件完整性
- [ ] 验证备份文件可读
- [ ] 测试部分数据恢复

**执行命令**:
```bash
# 检查备份文件
BACKUP_DIR=$(find ../backups -name "company_cleanup_*" -type d | sort -r | head -1)
ls -lh ${BACKUP_DIR}

# 验证备份文件
pg_restore --list ${BACKUP_DIR}/full_database.backup | head -20

# 测试恢复单个表到临时数据库
createdb test_restore
pg_restore -d test_restore ${BACKUP_DIR}/full_database.backup -t companies
psql -d test_restore -c "SELECT COUNT(*) FROM companies;"
dropdb test_restore
```

**验收标准**:
- ✅ 备份文件可读
- ✅ 表结构完整
- ✅ 数据可恢复

---

### 阶段3: 迁移阶段 (2小时)

#### 3.1 数据迁移 (90分钟)

**负责人**: DBA

**执行命令**:
```bash
./02_migrate_data.sh
```

**迁移步骤**:

##### 步骤3.1.1: 处理重复用户 (15分钟)

**操作**:
- 识别重复用户名（已知: akang, litingting）
- 将company类型用户重命名为 `username_company`
- 记录所有修改

**SQL逻辑**:
```sql
UPDATE users u1
SET username = u1.username || '_company',
    updated_at = CURRENT_TIMESTAMP
WHERE u1.user_type = 'company'
  AND u1.deleted_at IS NULL
  AND EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.username = u1.username
        AND u2.user_type = 'enterprise'
        AND u2.id != u1.id
  );
```

**验证**:
```sql
-- 检查是否还有重复
SELECT username, COUNT(*) as count
FROM users WHERE deleted_at IS NULL
GROUP BY username HAVING COUNT(*) > 1;
```

##### 步骤3.1.2: 迁移Companies (30分钟)

**操作**:
- 将companies表数据插入enterprises表
- 创建company_id → enterprise_id映射表
- 记录所有迁移记录

**SQL逻辑**:
```sql
INSERT INTO enterprises (name, code, description, ...)
SELECT name, code, description, ...
FROM companies c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM enterprises e
      WHERE e.name = c.name AND e.deleted_at IS NULL
  );
```

**验证**:
```sql
-- 检查迁移数量
SELECT
    (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL) as companies_count,
    (SELECT COUNT(*) FROM enterprises WHERE deleted_at IS NULL) as enterprises_count;
```

##### 步骤3.1.3: 迁移Company Users (30分钟)

**操作**:
- 将company_users迁移到enterprise_users
- 更新users表的user_type和role
- 关联user_id

**SQL逻辑**:
```sql
-- 迁移到enterprise_users
INSERT INTO enterprise_users (enterprise_id, user_id, username, ...)
SELECT cem.enterprise_id, u.id, cu.username, ...
FROM company_users cu
JOIN company_enterprise_mapping cem ON cem.company_id = cu.company_id
LEFT JOIN users u ON u.username = cu.username
WHERE cu.deleted_at IS NULL;

-- 更新users表
UPDATE users u
SET user_type = 'enterprise',
    role = CASE cu.role
        WHEN 'company_admin' THEN 'enterprise_admin'
        ELSE 'enterprise_user'
    END
FROM company_users cu
WHERE u.username = cu.username AND u.user_type = 'company';
```

**验证**:
```sql
-- 检查迁移结果
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as with_user_id,
    COUNT(*) FILTER (WHERE user_id IS NULL) as without_user_id
FROM enterprise_users WHERE deleted_at IS NULL;
```

##### 步骤3.1.4: 更新项目关联 (15分钟)

**操作**:
- 识别project_companies表中的关联
- 记录需要手动处理的项目

**注意**: 项目关联可能需要单独的数据库迁移脚本来修改表结构

#### 3.2 迁移验证 (30分钟)

**负责人**: DBA + QA

**任务清单**:
- [ ] 验证数据完整性
- [ ] 验证用户关联
- [ ] 验证企业数据
- [ ] 检查数据一致性

**执行命令**:
```bash
# 查看迁移日志
MIGRATION_LOG=$(find ../backups -name "migration_*.log" | sort -r | head -1)
cat ${MIGRATION_LOG}

# 验证数据
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod << 'SQL'
-- 1. 检查enterprise_users数量
SELECT COUNT(*) as enterprise_users_count FROM enterprise_users WHERE deleted_at IS NULL;

-- 2. 检查所有enterprise_users都有user_id
SELECT COUNT(*) as missing_user_id FROM enterprise_users WHERE user_id IS NULL AND deleted_at IS NULL;

-- 3. 检查users表的类型分布
SELECT user_type, role, COUNT(*) as count
FROM users WHERE deleted_at IS NULL
GROUP BY user_type, role;

-- 4. 检查重复用户名
SELECT username, COUNT(*) as count
FROM users WHERE deleted_at IS NULL
GROUP BY username HAVING COUNT(*) > 1;
SQL
```

**验收标准**:
- ✅ Enterprise用户数 = 原company用户数 + 原enterprise用户数
- ✅ 所有enterprise_users都有user_id
- ✅ 无重复用户名
- ✅ 无company类型用户（或已重命名）

---

### 阶段4: 验证阶段 (1小时)

#### 4.1 功能测试 (30分钟)

**负责人**: QA

**测试用例**:

1. **用户登录测试**
   - 测试enterprise用户登录
   - 测试重命名的company用户登录（使用新用户名）
   - 验证权限正常

2. **企业管理测试**
   - 查看企业列表
   - 编辑企业信息
   - 添加企业用户

3. **项目关联测试**
   - 查看项目的企业关联
   - 验证数据显示正常

**验收标准**:
- ✅ 所有测试用例通过
- ✅ 无功能异常
- ✅ 数据显示正确

#### 4.2 性能测试 (15分钟)

**负责人**: QA

**测试项**:
- 企业列表加载时间
- 用户列表加载时间
- 登录响应时间

**验收标准**:
- ✅ 响应时间在正常范围内
- ✅ 无性能退化

#### 4.3 日志审查 (15分钟)

**负责人**: DBA

**任务清单**:
- [ ] 检查迁移日志
- [ ] 检查错误日志
- [ ] 检查数据库慢查询日志

**验收标准**:
- ✅ 无严重错误
- ✅ 所有操作有记录
- ✅ 无异常查询

---

### 阶段5: 清理阶段 (1小时)

#### 5.1 软删除Company数据 (30分钟)

**负责人**: DBA

**执行命令**:
```bash
./03_cleanup_company_tables.sh soft
```

**操作内容**:
- 软删除companies表数据
- 软删除company_users表数据
- 软删除customers表数据
- 软删除其他company相关表数据
- 移除外键约束
- 更新CHECK约束

**验收标准**:
- ✅ 所有company数据已标记删除
- ✅ CHECK约束已更新
- ✅ 无活跃的company类型用户

#### 5.2 验证清理结果 (15分钟)

**负责人**: DBA

**执行命令**:
```bash
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod << 'SQL'
-- 检查活跃数据
SELECT 'companies' as table_name, COUNT(*) as count FROM companies WHERE deleted_at IS NULL
UNION ALL
SELECT 'company_users', COUNT(*) FROM company_users WHERE deleted_at IS NULL
UNION ALL
SELECT 'customers', COUNT(*) FROM customers WHERE deleted_at IS NULL;

-- 检查约束
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%user_type%';
SQL
```

**验收标准**:
- ✅ 无活跃的company数据
- ✅ 约束已正确更新

#### 5.3 功能回归测试 (15分钟)

**负责人**: QA

**任务清单**:
- [ ] 重复阶段4的功能测试
- [ ] 确认无regression

**验收标准**:
- ✅ 所有功能正常
- ✅ 无新bug出现

---

### 阶段6: 代码更新 (8小时)

#### 6.1 后端代码清理 (4小时)

**负责人**: 后端开发

**任务清单**:

1. **删除文件** (1小时)
   - [ ] `handlers/company_handler.go`
   - [ ] `services/company_service.go`
   - [ ] `database/company_repository.go`
   - [ ] `models/company.go`

2. **更新路由** (30分钟)
   - [ ] `routes/company_routes.go` - 删除company路由
   - [ ] `routes/routes.go` - 移除company路由注册

3. **更新中间件** (30分钟)
   - [ ] `middleware/auth_middleware.go` - 移除company相关权限
   - [ ] `middleware/role_middleware.go` - 移除company角色检查

4. **更新用户处理** (1小时)
   - [ ] `handlers/user_handler.go` - 移除company类型处理
   - [ ] `services/user_service.go` - 移除company逻辑

5. **更新测试** (1小时)
   - [ ] 删除company相关测试文件
   - [ ] 更新集成测试
   - [ ] 运行所有测试确保通过

**验收标准**:
- ✅ 编译通过
- ✅ 所有测试通过
- ✅ 无编译警告

#### 6.2 前端代码清理 (4小时)

**负责人**: 前端开发

**任务清单**:

1. **删除页面** (1小时)
   - [ ] `src/pages/CompanyManagePage.tsx`
   - [ ] `src/pages/CompanyEditPage.tsx`
   - [ ] `src/pages/CompanyCreatePage.tsx`

2. **删除组件** (1小时)
   - [ ] `src/components/CompanySelector.tsx`
   - [ ] `src/components/CompanyForm.tsx`

3. **删除服务** (30分钟)
   - [ ] `src/services/companyService.ts`

4. **更新路由** (30分钟)
   - [ ] 移除company相关路由
   - [ ] 更新导航配置

5. **更新用户管理** (1小时)
   - [ ] 移除company类型选项
   - [ ] 更新用户表单

**验收标准**:
- ✅ 编译通过
- ✅ 无TypeScript错误
- ✅ 无未使用的导入

---

### 阶段7: 测试阶段 (4小时)

#### 7.1 单元测试 (1小时)

**负责人**: 开发团队

**任务清单**:
- [ ] 运行后端单元测试
- [ ] 运行前端单元测试
- [ ] 修复失败的测试

#### 7.2 集成测试 (1小时)

**负责人**: QA

**任务清单**:
- [ ] 用户管理测试
- [ ] 企业管理测试
- [ ] 权限系统测试
- [ ] API接口测试

#### 7.3 UI测试 (1小时)

**负责人**: QA

**任务清单**:
- [ ] 导航菜单验证
- [ ] 页面跳转验证
- [ ] 表单提交验证
- [ ] 数据展示验证

#### 7.4 回归测试 (1小时)

**负责人**: QA

**任务清单**:
- [ ] 核心功能全流程测试
- [ ] 边界情况测试
- [ ] 错误处理测试

---

### 阶段8: 上线阶段 (2小时)

#### 8.1 预上线准备 (30分钟)

**负责人**: DevOps

**任务清单**:
- [ ] 代码合并到main分支
- [ ] 创建release标签
- [ ] 准备部署脚本
- [ ] 通知运维团队

#### 8.2 生产环境部署 (1小时)

**负责人**: DevOps

**部署步骤**:

1. **停止服务** (5分钟)
   ```bash
   # 停止后端服务
   sudo systemctl stop ai-project-backend

   # 停止前端服务
   sudo systemctl stop ai-project-frontend
   ```

2. **部署后端** (20分钟)
   ```bash
   # 备份当前版本
   cp ai-project-backend ai-project-backend.backup

   # 部署新版本
   scp ai-project-backend-prod-linux ubuntu@152.136.104.251:/path/to/backend/

   # 重启服务
   sudo systemctl start ai-project-backend
   ```

3. **部署前端** (20分钟)
   ```bash
   # 构建生产版本
   npm run build

   # 部署到服务器
   rsync -avz build/ ubuntu@152.136.104.251:/path/to/frontend/

   # 重启服务
   sudo systemctl start ai-project-frontend
   ```

4. **验证部署** (15分钟)
   ```bash
   # 检查服务状态
   sudo systemctl status ai-project-backend
   sudo systemctl status ai-project-frontend

   # 检查健康接口
   curl http://localhost:8080/api/v1/health
   ```

#### 8.3 上线验证 (30分钟)

**负责人**: QA + DevOps

**任务清单**:
- [ ] 验证服务启动正常
- [ ] 验证关键功能可用
- [ ] 检查日志无异常
- [ ] 监控系统正常

**验收标准**:
- ✅ 所有服务运行正常
- ✅ 关键功能测试通过
- ✅ 无错误日志
- ✅ 监控指标正常

---

## 🚨 应急预案

### 场景1: 迁移过程中发现数据丢失

**症状**: 迁移后发现某些数据缺失

**处理步骤**:
1. 立即停止迁移流程
2. 从备份恢复到临时数据库
3. 对比数据差异
4. 分析原因
5. 修复迁移脚本
6. 重新执行迁移

**回滚命令**:
```bash
# 恢复备份
BACKUP_DIR=$(find ../backups -name "company_cleanup_*" -type d | sort -r | head -1)
pg_restore -h 127.0.0.1 -p 5433 -U ai_prod_user \
    -d ai_project_prod_temp -c -v \
    "${BACKUP_DIR}/full_database.backup"
```

### 场景2: 清理后发现业务功能异常

**症状**: 清理后某些功能无法使用

**处理步骤**:
1. 检查错误日志确定原因
2. 如果是数据问题：
   - 从软删除恢复数据
   - 或从备份恢复特定表
3. 如果是代码问题：
   - 回滚代码到上一版本
   - 重新部署

**回滚命令**:
```bash
# 方案1: 恢复软删除的数据
psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod << 'SQL'
UPDATE companies SET deleted_at = NULL WHERE deleted_at > '2025-01-27';
UPDATE company_users SET deleted_at = NULL WHERE deleted_at > '2025-01-27';
SQL

# 方案2: 回滚代码
git revert <commit-hash>
./deploy.sh
```

### 场景3: 性能严重下降

**症状**: 迁移后系统响应缓慢

**处理步骤**:
1. 检查数据库慢查询日志
2. 分析查询计划
3. 添加缺失的索引
4. 更新表统计信息

**优化命令**:
```sql
-- 更新统计信息
ANALYZE enterprises;
ANALYZE enterprise_users;

-- 检查索引
SELECT * FROM pg_indexes WHERE tablename IN ('enterprises', 'enterprise_users');

-- 添加缺失的索引（如需要）
CREATE INDEX IF NOT EXISTS idx_enterprise_users_enterprise_id ON enterprise_users(enterprise_id);
```

---

## ✅ 验收标准

### 数据层面

- [ ] 所有company用户已迁移到enterprise体系
- [ ] 无数据丢失
- [ ] 无重复用户名
- [ ] 所有enterprise_users都有user_id关联
- [ ] Company相关表已清理（软删除或物理删除）
- [ ] 数据库约束已更新

### 代码层面

- [ ] 后端编译通过，无警告
- [ ] 前端编译通过，无错误
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 无未使用的导入或变量

### 功能层面

- [ ] 用户登录正常
- [ ] 企业管理功能正常
- [ ] 权限系统正常
- [ ] 无功能regression
- [ ] 响应时间在正常范围内

### 文档层面

- [ ] README文档完整
- [ ] API文档已更新
- [ ] 变更日志已更新
- [ ] 用户手册已更新（如需要）

---

## 📊 成功指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 数据完整性 | 100% | 对比迁移前后记录数 |
| 功能可用性 | 100% | 关键功能测试通过率 |
| 零停机时间 | 0分钟 | 监控系统记录 |
| 响应时间 | <500ms | API响应时间统计 |
| 错误率 | <0.1% | 日志分析 |
| 代码覆盖率 | >80% | 单元测试报告 |

---

## 📝 执行记录模板

### 执行日期: [待填写]

| 阶段 | 开始时间 | 结束时间 | 状态 | 负责人 | 备注 |
|------|---------|---------|------|--------|------|
| 准备阶段 | | | | | |
| 备份阶段 | | | | | |
| 迁移阶段 | | | | | |
| 验证阶段 | | | | | |
| 清理阶段 | | | | | |
| 代码更新 | | | | | |
| 测试阶段 | | | | | |
| 上线阶段 | | | | | |

### 问题记录

| 时间 | 问题描述 | 影响范围 | 解决方案 | 处理人 | 状态 |
|------|---------|---------|---------|--------|------|
| | | | | | |

### 变更记录

| 时间 | 变更内容 | 变更原因 | 审批人 |
|------|---------|---------|--------|
| | | | |

---

## 📞 联系人

| 角色 | 姓名 | 联系方式 | 备注 |
|------|------|---------|------|
| 项目负责人 | | | |
| DBA | | | |
| 后端开发 | | | |
| 前端开发 | | | |
| QA | | | |
| DevOps | | | |

---

## 📚 参考文档

- [README.md](./README.md) - 快速开始指南
- [任务文档 #2852](../docs/task-2852-company-cleanup-design.md) - 设计方案
- [数据库备份脚本](./01_backup_before_cleanup.sh)
- [数据迁移脚本](./02_migrate_data.sh)
- [清理脚本](./03_cleanup_company_tables.sh)

---

**文档版本**: 1.0
**最后更新**: 2025-01-27
**下次评审**: 执行前24小时
