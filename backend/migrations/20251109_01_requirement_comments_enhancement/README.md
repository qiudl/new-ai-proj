# 需求评论功能增强迁移

**迁移编号**: 20251109_01
**创建日期**: 2025-11-09
**作者**: Claude Code

## 概述

此迁移为需求评论系统添加了@提及功能和评论审核功能所需的数据库字段和约束。

## 变更内容

### 新增字段

1. **mentioned_user_ids** (INTEGER[])
   - 存储被@提及的用户ID列表
   - 使用PostgreSQL数组类型
   - 默认值: `{}`

2. **mentioned_count** (INTEGER)
   - 提及用户的数量
   - 通过触发器自动计算
   - 默认值: 0

3. **reviewed_at** (TIMESTAMP)
   - 评论审核时间
   - 可为空

4. **reviewed_by** (INTEGER)
   - 审核人用户ID
   - 外键关联到users表
   - 可为空

5. **rejection_note** (TEXT)
   - 评论被拒绝的原因说明
   - 可为空

6. **moderation_flag** (VARCHAR(50))
   - 审核标记（如：spam, offensive等）
   - 可为空

### 新增索引

- `idx_req_comments_mentioned`: GIN索引，优化@提及查询
- `idx_req_comments_reviewed`: B-tree索引，优化审核记录查询
- `idx_req_comments_moderation`: B-tree索引，优化按审核标记查询

### 约束变更

- **check_req_comment_status**: 扩展status字段允许值
  - 新增: `pending_review`, `rejected`
  - 保留: `active`, `deleted`

### 触发器

- **trigger_update_mentioned_count**: 自动更新mentioned_count字段
  - 在INSERT或UPDATE mentioned_user_ids时触发
  - 自动计算数组长度并更新mentioned_count

## 代码依赖

此迁移需要配合以下代码更改：

### 1. IntArray类型修复

**文件**: `backend/models/requirement_comment.go`

```go
// 修改前：使用JSON序列化
func (a IntArray) Value() (driver.Value, error) {
    return json.Marshal(a)
}

// 修改后：使用pq.Array支持PostgreSQL数组
func (a IntArray) Value() (driver.Value, error) {
    return pq.Array(a).Value()
}
```

### 2. 导入pq包

在`requirement_comment.go`中添加：
```go
import "github.com/lib/pq"
```

## 应用方法

### 手动应用

```bash
# 应用迁移
psql -h localhost -U ai_prod_user -d ai_project_prod -f up.sql

# 回滚迁移
psql -h localhost -U ai_prod_user -d ai_project_prod -f down.sql
```

### 使用隧道连接生产数据库

```bash
# 启动SSH隧道
./scripts/tunnel.sh start

# 应用迁移
source ~/.ai-proj-tunnel.env
PGPASSWORD="${DB_PASSWORD}" psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -f up.sql
```

## 验证

执行迁移后，验证以下内容：

```sql
-- 1. 检查字段是否添加
\d requirement_comments

-- 2. 检查索引
\di idx_req_comments_*

-- 3. 检查约束
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'requirement_comments'::regclass;

-- 4. 测试触发器
INSERT INTO requirement_comments (
    requirement_id, user_id, content, mentioned_user_ids
) VALUES (
    1, 1, 'Test', ARRAY[2, 3, 4]
);

-- 应该自动设置 mentioned_count = 3
SELECT mentioned_count FROM requirement_comments WHERE content = 'Test';
```

## 影响范围

- **向下兼容**: ✅ 是
- **数据迁移**: ✅ 自动更新现有记录的mentioned_count
- **需要重启服务**: ✅ 是（需要重启后端以应用代码更改）

## 回滚风险

⚠️ **警告**: 回滚将删除所有@提及和审核相关的数据

- 已存储的mentioned_user_ids数据将丢失
- 审核记录将丢失
- 如果有评论处于pending_review或rejected状态，回滚后这些评论的status将变为无效

## 相关Issue

- 修复需求评论POST接口500错误
- 添加@提及用户功能
- 添加评论审核功能

## 测试

迁移已在开发环境测试通过：

```bash
# 测试创建评论
curl -X POST 'http://localhost:8080/api/v1/requirements/8/comments' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content": "测试评论", "comment_type": "general"}'

# 预期结果: HTTP 201 Created
```
