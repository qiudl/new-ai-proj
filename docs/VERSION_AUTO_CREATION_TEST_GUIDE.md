# 文档自动版本创建功能 - 测试指南

## 🎯 功能说明

实现了文档更新时自动创建版本快照的功能。当通过API更新文档时，系统会自动在`document_versions`表中保存更新前的文档状态。

## ⚠️ 重要说明

**自动版本创建发生在Go代码层面，而非数据库层面**

- ✅ 通过API更新文档 → 触发 `documentRepository.Update()` → 自动创建版本
- ❌ 直接SQL UPDATE → **不会**触发自动版本创建
- ✅ 通过前端UI保存文档 → 调用API → 自动创建版本

## 📋 测试前提条件

1. ✅ 后端服务已重启（包含新代码）
2. ✅ 数据库连接正常
3. ✅ 有可测试的文档数据

## 🧪 测试方法

### 方法1: 通过前端UI测试 (推荐)

这是最简单直接的测试方法：

#### 步骤：

1. **打开前端应用**
   ```bash
   http://localhost:3000
   ```

2. **登录系统**
   - 使用你的账号登录

3. **打开任意任务的文档**
   - 进入任意项目
   - 选择任意任务
   - 打开任务文档（如果没有，创建一个）

4. **第一次编辑并保存**
   - 修改文档内容（例如：添加"测试版本1"）
   - 点击保存按钮
   - 这会创建第一个版本快照

5. **第二次编辑并保存**
   - 再次修改文档（例如：添加"测试版本2"）
   - 再次保存
   - 这会创建第二个版本快照

6. **验证版本历史**
   - 点击"版本历史"按钮
   - **检查Console** (F12 → Console)
   - 应该**不再显示**"使用模拟数据"警告
   - 版本列表应显示真实的版本数据

#### 预期结果：

- ✅ Console没有"使用模拟数据"警告
- ✅ 版本列表显示2个或更多版本
- ✅ 每个版本显示准确的统计（+X, -Y行）
- ✅ Diff对比显示真实的内容变更

### 方法2: 直接查询数据库验证

在前端操作后，通过SQL验证版本记录：

```sql
-- 查看最新创建的版本（应该看到刚才编辑的文档版本）
SELECT
    dv.id,
    dv.document_id,
    dv.version_number,
    dv.title,
    dv.changes_summary,
    LEFT(dv.content, 100) as content_preview,
    dv.file_size,
    dv.created_at,
    u.username as created_by_name
FROM document_versions dv
LEFT JOIN users u ON dv.created_by = u.id
ORDER BY dv.created_at DESC
LIMIT 10;
```

**期望看到**:
- 新的版本记录
- `changes_summary` = "版本 vX 自动快照"
- `content` 包含完整内容
- `file_size` 自动计算
- `created_at` 是最近的时间戳

## 🔍 验证自动版本创建是否工作

### 检查清单：

- [ ] 后端服务已用新编译的binary重启
- [ ] 通过前端UI编辑并保存文档
- [ ] `document_versions`表中出现新记录
- [ ] 版本记录的`content`字段包含更新前的内容
- [ ] `changes_summary`显示"版本 vX 自动快照"
- [ ] 前端版本历史Modal不再显示"模拟数据"警告

## 📊 测试场景

### 场景1: 新建文档后首次编辑

1. 创建新文档并保存（版本1，但无版本快照）
2. 编辑并保存（创建版本1的快照，文档变为版本2）
3. 再次编辑并保存（创建版本2的快照，文档变为版本3）

**预期**:
- document_versions表有2条记录（版本1和版本2的快照）
- 文档的version字段为3

### 场景2: 已有文档继续编辑

1. 打开已存在的文档（当前版本X）
2. 编辑并保存（创建版本X的快照，文档变为版本X+1）
3. 再次编辑并保存（创建版本X+1的快照，文档变为版本X+2）

**预期**:
- document_versions表增加2条新记录
- 可以看到完整的版本演变历史

## 🐛 故障排除

### 问题1: 仍然显示"使用模拟数据"

**可能原因**:
- 数据库中没有版本记录（需要先通过前端编辑文档）
- API返回格式不正确

**解决方案**:
```bash
# 检查是否有版本记录
SELECT COUNT(*) FROM document_versions;

# 如果为0，说明还没有通过新代码创建过版本
# 解决：通过前端UI编辑并保存文档
```

### 问题2: document_versions表仍然为空

**可能原因**:
- 后端服务没有重启
- 使用的是旧的binary

**解决方案**:
```bash
# 1. 确认使用的是新编译的binary
ls -lh /Users/johnqiu/coding/www/projects/new-ai-proj/backend/ai-project-backend

# 应该看到最近的修改时间（今天）

# 2. 确认后端进程使用的是新binary
ps aux | grep ai-project-backend

# 3. 如有疑问，重新编译并重启
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
go build -o ai-project-backend
pkill ai-project-backend
./ai-project-backend &
```

### 问题3: 后端日志显示WARNING

**如果看到**:
```
[WARNING] Failed to create version snapshot for document X: ...
```

**这是正常的容错行为**:
- 版本创建失败不会阻止文档更新
- 检查具体的错误信息
- 可能是数据库连接问题或字段类型不匹配

## ✅ 成功标准

当满足以下所有条件时，功能正常工作：

1. ✅ 通过前端UI编辑并保存文档
2. ✅ `document_versions`表中出现对应的版本记录
3. ✅ 版本记录包含完整的content
4. ✅ `changes_summary`为"版本 vX 自动快照"
5. ✅ 前端版本历史显示真实数据
6. ✅ Console无"使用模拟数据"警告
7. ✅ Diff对比显示真实的内容变更

## 📝 测试记录模板

```markdown
## 测试日期: YYYY-MM-DD
## 测试人员: XXX

### 测试步骤：
1. [ ] 重启后端服务
2. [ ] 通过前端编辑文档ID: ___
3. [ ] 保存文档（第1次）
4. [ ] 修改并保存（第2次）
5. [ ] 打开版本历史Modal

### 测试结果：
- document_versions记录数: ___ (期望: >= 1)
- Console警告: 有 / 无 (期望: 无)
- Diff对比: 正常 / 异常 (期望: 正常)
- 版本统计准确性: ✅ / ❌

### 数据库验证：
```sql
SELECT * FROM document_versions WHERE document_id = ___
ORDER BY created_at DESC LIMIT 5;
```

结果: ___

### 结论：
✅ 通过 / ❌ 失败

### 备注：
___
```

---

## 🚀 快速测试命令

如果需要快速验证数据库状态：

```bash
# 检查最新的版本记录
PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -c "
SELECT
    COUNT(*) as total_versions,
    MAX(created_at) as last_created
FROM document_versions;
"

# 查看最近10条版本记录
PGPASSWORD='SecureAI2024!@#$%^' psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -c "
SELECT
    id,
    document_id,
    version_number,
    changes_summary,
    created_at
FROM document_versions
ORDER BY created_at DESC
LIMIT 10;
"
```

---

**记住**: 自动版本创建只在通过API更新文档时触发，最简单的测试方法就是通过前端UI操作！ 🎉
