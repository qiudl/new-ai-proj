# CSV需求导入指南

本文档说明如何将CSV格式的需求数据批量导入到AI项目管理系统。

## 概述

- **CSV文件**: `/Users/johnqiu/Desktop/团购系统需求记录.csv`
- **目标项目**: 项目ID 156 (团购系统)
- **目标企业**: 企业ID 3 (李宁集团)
- **需求总数**: 76条有效需求
- **CSV字段**: 32个字段

## 字段映射方案

### 1. 直接映射字段

CSV中的以下字段直接映射到系统标准字段：

| CSV字段 | 系统字段 | 说明 |
|---------|----------|------|
| 需求名称 | `title` | 需求标题 |
| 需求背景 + 需求说明 | `description` | 合并为描述 |
| 功能模块 | `category` | 需求分类 |
| 方案说明 | `acceptance_criteria` | 验收标准 |
| 提出时间 | `created_at` / `submitted_at` | 创建时间 |
| 预计解决时间 | `due_date` | 截止日期 |
| 实际上线时间 | `converted_at` | 转换时间 |

### 2. 状态映射

CSV中的状态需要映射到系统RequirementStatus：

| CSV状态 | 系统状态 | 说明 |
|---------|----------|------|
| 已上线 | `converted` | 已转任务 |
| 开发中 | `approved` | 已批准 |
| 待发版 | `approved` | 已批准 |
| 排期中 | `pending` | 待评审 |
| 不开发 | `rejected` | 已拒绝 |
| 停止开发 | `rejected` | 已拒绝 |
| 延期中 | `need_more` | 待补充 |
| 待配置 | `pending` | 待评审 |

### 3. 优先级映射

| CSV优先级 | 系统优先级 |
|-----------|-----------|
| 1 / 高 | `urgent` |
| 2 | `high` |
| 3 / 中 | `medium` |
| 4 / 低 | `low` |
| 空 | `medium` (默认) |

### 4. 扩展字段 (custom_fields)

CSV特有字段存储在`custom_fields` JSONB字段：

```json
{
  "serial_number": "序号",
  "system_name": "系统",
  "module_name": "功能模块",
  "progress_points": "进度描述（需求点）",
  "progress_detail": "功能进度（详细）",
  "progress_summary": "功能进度（简）",
  "todo_items": "待办事项",
  "delay_reason": "延期原因",
  "meeting_notes": "周例会沟通内容",
  "flowchart_url": "方案流程图",
  "prototype_url": "方案原型图",
  "internal_test_date": "内部测试时间",
  "user_test_date": "用户测试时间",
  "remarks": "备注",
  "additional_note_1": "补充/备注1",
  "additional_note_2": "补充/备注2",
  "resource_requirements": "资源需求",
  "business_lead": "项目主责人业务侧",
  "technical_lead": "项目主责人系统侧",
  "collaboration_channel": "协同渠道"
}
```

## 准备工作

### 1. 数据库迁移

首先执行迁移添加`custom_fields`字段：

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend

# 启动后端服务，自动运行迁移
go run main.go
```

迁移文件位置：
- `backend/migrations/20251112_01_add_custom_fields_to_requirements/up.sql`
- `backend/migrations/20251112_01_add_custom_fields_to_requirements/down.sql`

### 2. 获取API Token

```bash
# 登录获取token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}' | jq -r '.token'

# 或使用MCP开发登录
curl -X POST http://localhost:8080/api/v1/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}' | jq -r '.token'

# 设置环境变量
export API_TOKEN="eyJhbGc..."
```

### 3. 验证项目和企业存在

```bash
# 检查项目156是否存在
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8080/api/v1/projects/156

# 检查企业3是否存在
curl -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:8080/api/v1/enterprises/3
```

## 使用导入工具

### 基本用法

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 1. 预览模式（不实际导入）
python3 scripts/import_requirements_from_csv.py \
  /Users/johnqiu/Desktop/团购系统需求记录.csv \
  --dry-run

# 2. 正式导入
export API_TOKEN="your-jwt-token"
python3 scripts/import_requirements_from_csv.py \
  /Users/johnqiu/Desktop/团购系统需求记录.csv
```

### 导入流程

1. **读取CSV文件**
   - 自动解析32个字段
   - 跳过空行和无需求名称的行

2. **数据转换**
   - 状态映射：CSV状态 → 系统状态
   - 优先级映射
   - 时间解析：支持 "2024年3月1日" 格式
   - 提出人转换：姓名 → 用户ID

3. **字段处理**
   - 核心字段：直接映射
   - 扩展字段：存入custom_fields JSONB
   - description：合并需求背景和需求说明
   - 附件处理：图片URL存入custom_fields

4. **批量导入**
   - 逐条调用 `/api/v1/mcp/requirements/create`
   - 显示进度和成功/失败状态
   - 最后输出导入总结

### 输出示例

```
✅ 当前用户: admin (ID: 1)

📖 正在读取CSV: /Users/johnqiu/Desktop/团购系统需求记录.csv
  [1] 审批订单跳转企业微信
  [2] 采购单销售单列表搜索增加备注信息搜索
  [3] 占单转系统订单
  ...
  [76] 需求名称76

✅ 成功解析 76 条需求

⚠️  即将导入 76 条需求到项目 156
确认导入? (yes/no): yes

🚀 开始导入...
  ✅ [1/76] 成功: 审批订单跳转企业微信 (ID: 1001)
  ✅ [2/76] 成功: 采购单销售单列表搜索增加备注信息搜索 (ID: 1002)
  ...
  ✅ [76/76] 成功: 需求名称76 (ID: 1076)

============================================================
导入完成!
============================================================
✅ 成功: 76
❌ 失败: 0
📊 总计: 76
```

## 验证导入结果

### 1. 查询需求列表

```bash
# 查询项目156的所有需求
curl -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:8080/api/v1/requirements?project_id=156&page=1&page_size=10"
```

### 2. 检查custom_fields

```bash
# 查询单个需求，查看custom_fields
curl -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:8080/api/v1/requirements/1001" | jq '.custom_fields'
```

示例输出：
```json
{
  "serial_number": "1",
  "system_name": "酷采团购系统",
  "module_name": "订单管理",
  "progress_detail": "做审批流...",
  "meeting_notes": "待确认微信接口"
}
```

### 3. 数据库验证

```sql
-- 查看导入的需求
SELECT
  id,
  display_id,
  title,
  status,
  priority,
  category,
  custom_fields->>'system_name' as system_name,
  custom_fields->>'serial_number' as serial_number
FROM requirements
WHERE project_id = 156
ORDER BY id
LIMIT 10;

-- 统计各状态需求数量
SELECT
  status,
  COUNT(*) as count
FROM requirements
WHERE project_id = 156
GROUP BY status;
```

## 常见问题

### Q1: 找不到提出人用户

**问题**: CSV中的提出人姓名在系统中找不到对应用户

**解决**: 工具会自动使用当前登录用户作为submitter_id

### Q2: 时间格式解析失败

**问题**: CSV中的时间格式无法识别

**支持格式**:
- `2024年3月1日`
- `2024-03-01`
- `2024/03/01`

**解决**: 修改`parse_chinese_date`函数添加新格式

### Q3: 状态映射不正确

**问题**: CSV状态映射到错误的系统状态

**解决**: 检查并修改`STATUS_MAPPING`字典

### Q4: custom_fields为空

**问题**: 导入后custom_fields字段为空

**检查**:
1. 数据库迁移是否执行成功
2. CSV中扩展字段是否有值
3. 模型是否正确添加CustomFields字段

## 脚本配置

可在脚本中修改以下配置：

```python
# API配置
API_BASE_URL = "http://localhost:8080"
PROJECT_ID = 156  # 目标项目ID
ENTERPRISE_ID = 3  # 目标企业ID

# 状态映射
STATUS_MAPPING = {
    "已上线": "converted",
    "开发中": "approved",
    # ... 添加更多映射
}

# 优先级映射
PRIORITY_MAPPING = {
    "高": "high",
    "中": "medium",
    # ... 添加更多映射
}
```

## 注意事项

1. **备份数据**: 导入前建议备份数据库
2. **测试环境**: 先在测试环境验证
3. **分批导入**: 大量数据建议分批导入
4. **日志记录**: 保存导入日志便于追溯
5. **权限检查**: 确保API token有足够权限

## 相关文件

- 导入脚本: `scripts/import_requirements_from_csv.py`
- 数据库迁移: `backend/migrations/20251112_01_add_custom_fields_to_requirements/`
- 模型定义: `backend/models/requirement.go`
- CSV文件: `/Users/johnqiu/Desktop/团购系统需求记录.csv`

## 下一步

导入完成后，可以：

1. 在前端查看导入的需求
2. 对需求进行评审
3. 将需求转换为任务
4. 关联任务到需求
5. 添加评论和附件
