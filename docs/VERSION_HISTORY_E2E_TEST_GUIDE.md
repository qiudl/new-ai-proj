# 版本历史功能端到端测试指南

## 🎯 测试目的

验证版本历史功能的完整流程，从创建版本数据到前端展示。

## ✅ 前置条件

1. **后端服务**: ✅ 正在运行 (http://localhost:8080)
2. **数据库**: ✅ `document_versions`表已存在
3. **前端代码**: ✅ 所有组件已实现并测试通过
4. **后端API**: ✅ 7个端点已实现

## 📋 测试步骤

### 步骤1: 通过前端UI创建文档版本

这是最简单的方式，无需手动操作API。

**操作流程**:
1. 打开前端应用 (http://localhost:3000)
2. 登录系统
3. 进入任意任务
4. 创建或编辑一个文档
5. 保存文档（这会自动创建第一个版本）
6. 再次编辑并保存（创建第二个版本）
7. 重复几次，创建多个版本

**预期结果**:
- 每次保存文档时，系统自动在`document_versions`表中创建新记录
- 版本号自动递增 (1, 2, 3, ...)

### 步骤2: 验证数据库中的版本数据

**查询SQL**:
```sql
-- 查看所有文档版本
SELECT
    dv.id,
    dv.document_id,
    dv.version_number,
    dv.title,
    LEFT(dv.content, 50) as content_preview,
    dv.file_size,
    dv.created_at,
    u.username as created_by_name
FROM document_versions dv
LEFT JOIN users u ON dv.changed_by = u.id
ORDER BY dv.document_id, dv.version_number DESC
LIMIT 20;

-- 查看特定文档的版本历史
SELECT
    version_number,
    title,
    change_summary,
    file_size,
    created_at
FROM document_versions
WHERE document_id = 123  -- 替换为实际的文档ID
ORDER BY version_number DESC;
```

**预期结果**:
- 看到多条版本记录
- 每条记录的`version_number`递增
- `content`字段包含文档内容

### 步骤3: 使用curl测试API端点

**3.1 获取JWT Token**

```bash
# 方式1: 使用标准登录
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'

# 方式2: 从浏览器DevTools获取
# 打开浏览器 → F12 → Application → Local Storage → 复制token
```

**3.2 测试版本历史API**

```bash
# 设置环境变量
export TOKEN="your_jwt_token_here"
export PROJECT_ID=1
export TASK_ID=123
export DOC_ID=456

# 1. 获取版本历史列表
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/projects/$PROJECT_ID/tasks/$TASK_ID/documents/$DOC_ID/versions"

# 预期响应:
# {
#   "success": true,
#   "data": {
#     "document_id": 456,
#     "versions": [
#       {
#         "id": 1,
#         "document_id": 456,
#         "version_number": 2,
#         "title": "文档标题",
#         "content": "...",
#         "created_at": "2025-01-01T00:00:00Z",
#         ...
#       },
#       {
#         "id": 2,
#         "document_id": 456,
#         "version_number": 1,
#         "title": "文档标题",
#         "content": "...",
#         "created_at": "2025-01-01T00:00:00Z",
#         ...
#       }
#     ],
#     "stats": {
#       "total_versions": 2,
#       "current_version": 2
#     }
#   }
# }

# 2. 获取特定版本
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/projects/$PROJECT_ID/tasks/$TASK_ID/documents/$DOC_ID/versions/1"

# 3. 对比两个版本
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/projects/$PROJECT_ID/tasks/$TASK_ID/documents/$DOC_ID/versions/compare?from_version=1&to_version=2"

# 4. 下载特定版本
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/projects/$PROJECT_ID/tasks/$TASK_ID/documents/$DOC_ID/versions/1/download" \
  -o version_1.md

# 5. 恢复到某个版本
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/v1/projects/$PROJECT_ID/tasks/$TASK_ID/documents/$DOC_ID/versions/1/restore" \
  -d '{}'
```

### 步骤4: 验证前端展示

**操作流程**:
1. 打开前端应用
2. 进入有版本数据的任务
3. 打开任务文档
4. 点击"版本历史"按钮

**预期结果**:
- ✅ 版本历史Modal弹出
- ✅ 左侧显示版本列表（不再是模拟数据！）
- ✅ 每个版本显示统计信息 (+X, -Y行)
- ✅ 右侧显示Git风格的diff对比
- ✅ 可以使用←/→键导航
- ✅ 可以点击"回滚"按钮恢复版本
- ✅ 可以点击"下载"按钮下载版本

**验证前端使用真实数据的标志**:
- Console中没有"使用模拟数据"警告
- 版本数据与数据库一致
- 统计信息准确（添加/删除/修改的行数）
- Diff对比显示真实的变更内容

### 步骤5: 测试所有交互功能

**功能清单**:
- [x] 版本列表滚动（>20版本测试虚拟滚动）
- [x] 选择不同版本查看diff
- [x] 使用←/→键快速导航
- [x] 使用Ctrl+S交换对比版本
- [x] 点击"显示全部"按钮（>500行diff）
- [x] 回滚到指定版本
- [x] 下载指定版本
- [x] 关闭Modal (ESC键或点击X)

## 🔍 故障排除

### 问题1: 仍然显示"使用模拟数据"

**可能原因**:
1. 数据库中没有版本数据
2. API返回格式不正确
3. axios拦截器解包失败

**解决方案**:
```bash
# 检查数据库
psql -U ai_prod_user -d ai_project_prod -c \
  "SELECT COUNT(*) FROM document_versions WHERE document_id = 456;"

# 如果返回0，说明没有数据
# 解决: 通过前端编辑文档几次
```

### 问题2: API返回401未授权

**可能原因**: Token过期或无效

**解决方案**:
```bash
# 重新获取token
# 或从浏览器DevTools复制最新的token
```

### 问题3: API返回404

**可能原因**: 文档ID不存在

**解决方案**:
```bash
# 查找存在的文档ID
psql -U ai_prod_user -d ai_project_prod -c \
  "SELECT id, title FROM documents WHERE deleted_at IS NULL LIMIT 10;"
```

### 问题4: Diff显示不正确

**可能原因**: 版本内容为空或格式问题

**解决方案**:
- 确保文档有实质性内容变更
- 检查`content`字段不为NULL

## 📊 测试检查清单

完成以下所有项目即表示测试通过：

### 后端测试
- [ ] 健康检查API返回200
- [ ] JWT token获取成功
- [ ] 版本历史API返回真实数据
- [ ] 版本对比API正常工作
- [ ] 版本下载功能正常
- [ ] 版本恢复功能正常

### 前端测试
- [ ] Console没有"使用模拟数据"警告
- [ ] 版本列表显示真实数据
- [ ] 统计信息准确
- [ ] Diff对比正确
- [ ] 所有交互功能正常
- [ ] 性能表现良好（60fps滚动）

### 端到端测试
- [ ] 编辑文档 → 自动创建版本
- [ ] 版本历史Modal展示 → 显示真实数据
- [ ] 回滚版本 → 文档内容恢复
- [ ] 下载版本 → 文件下载成功

## 🎯 成功标准

当你看到以下所有情况时，测试成功：

1. ✅ 前端Console没有任何"使用模拟数据"警告
2. ✅ 版本列表显示的数量与数据库一致
3. ✅ Diff对比显示真实的内容变更
4. ✅ 统计信息（+X/-Y行）准确
5. ✅ 所有交互功能流畅工作
6. ✅ 性能指标达标（60fps，<2s加载）

## 📝 测试报告模板

测试完成后，记录以下信息：

```markdown
## 版本历史功能测试报告

**测试日期**: 2025-XX-XX
**测试人员**: XXX
**环境**: Development

### 测试结果
- 后端API: ✅ 通过 / ❌ 失败
- 前端展示: ✅ 通过 / ❌ 失败
- 交互功能: ✅ 通过 / ❌ 失败
- 性能测试: ✅ 通过 / ❌ 失败

### 发现的问题
1. [描述问题]
2. [描述问题]

### 建议改进
1. [建议]
2. [建议]
```

---

**测试准备就绪！** 按照上述步骤，你可以完整验证版本历史功能的端到端流程。

**快速开始**:
1. 打开前端，编辑文档几次
2. 刷新页面
3. 点击"版本历史"按钮
4. 享受完整的版本控制功能！ 🎉
