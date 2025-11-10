# Migration: 添加 enterprise_id 到 users 表

## 版本
v1.5

## 目的
引入语义清晰的 `enterprise_id` 字段,替代命名混乱的 `company_id`,同时保持向后兼容。

## 背景

### 问题
当前系统中 `users.company_id` 字段存在以下问题:
1. **命名混乱**: company_id 实际指向 enterprises 表,不是 companies
2. **语义不清**: 开发者难以理解其真实含义
3. **双重引用**: 与 enterprise_users.enterprise_id 形成混乱的双重引用系统

### 解决方案
采用渐进式重构策略:
- **v1.5**: 引入 enterprise_id,保留 company_id 双写
- **v1.6-1.9**: 废弃警告期
- **v2.0**: 移除 company_id

## 变更内容

### 数据库变更

#### 新增字段
```sql
ALTER TABLE users ADD COLUMN enterprise_id INTEGER;
```

#### 数据迁移
```sql
UPDATE users SET enterprise_id = company_id WHERE company_id IS NOT NULL;
```

#### 索引优化
```sql
CREATE INDEX idx_users_enterprise_id ON users(enterprise_id);
```

#### 外键约束
```sql
ALTER TABLE users
    ADD CONSTRAINT fk_users_enterprise
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id);
```

## 向后兼容性

### API 响应
API 将同时返回两个字段:
```json
{
  "id": 1,
  "username": "admin",
  "enterprise_id": 3,  // 新字段 (推荐)
  "company_id": 3      // 旧字段 (deprecated,保持同步)
}
```

### 代码兼容
提供兼容方法:
```go
func (u *User) GetEnterpriseID() *int {
    if u.EnterpriseID != nil {
        return u.EnterpriseID
    }
    return u.CompanyID  // 向后兼容
}
```

## 影响范围

### 数据库
- ✅ 添加字段和索引
- ✅ 数据迁移验证
- ✅ 外键约束

### 后端代码 (后续子任务)
- 涉及文件: 18个
- 代码修改点: 112处
- 主要文件:
  - models/user.go
  - database/user_repository.go (15处)
  - handlers/requirement_handler.go (6处)
  - services/requirement_permission_service.go (2处)
  - 等...

### 前端代码 (后续子任务)
- types/user.ts
- 所有使用 company_id 的组件

## 执行步骤

### 开发环境
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend

# 运行迁移 (应用会自动执行)
go run main.go

# 或手动执行
PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -U ai_prod_user -d ai_project_prod -f migrations/20251110_01_add_enterprise_id_to_users/up.sql
```

### 验证
```sql
-- 检查字段是否添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('company_id', 'enterprise_id');

-- 检查数据一致性
SELECT COUNT(*)
FROM users
WHERE company_id IS NOT NULL
  AND (enterprise_id IS NULL OR company_id != enterprise_id);

-- 检查索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname = 'idx_users_enterprise_id';

-- 检查外键
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
  AND constraint_name = 'fk_users_enterprise';
```

## 回滚

如果需要回滚:
```bash
PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -U ai_prod_user -d ai_project_prod -f migrations/20251110_01_add_enterprise_id_to_users/down.sql
```

## 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|----------|
| 数据迁移失败 | 低 | 事务保护,验证脚本 |
| 性能影响 | 低 | 添加索引优化查询 |
| 数据不一致 | 低 | 外键约束保证完整性 |
| 回滚风险 | 低 | 提供完整回滚脚本 |

## 后续任务

- [ ] 任务 #3652: 更新后端模型和Repository层
- [ ] 任务 #3653: 更新Service和Handler层
- [ ] 任务 #3654: 前端类型更新
- [ ] 任务 #3655: 测试验证和文档更新

## 预计时间
2小时

## 相关文档
- 设计文档: 任务 #3650 文档
- 架构分析: backend/docs/architecture/
