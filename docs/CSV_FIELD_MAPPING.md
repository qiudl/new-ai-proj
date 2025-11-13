# CSV字段映射详细说明

## CSV文件信息

- **文件**: 团购系统需求记录.csv
- **字段总数**: 32个
- **有效需求**: 76条
- **目标系统**: AI项目管理系统 Requirements模块

## 完整字段映射表

| # | CSV字段名 | 系统字段 | 类型 | 映射说明 | 示例值 |
|---|-----------|----------|------|----------|--------|
| 1 | 序号 | `custom_fields.serial_number` | String | 原始序号 | "1" |
| 2 | 系统 | `custom_fields.system_name` | String | 所属系统名称 | "酷采团购系统" |
| 3 | 功能模块 | `category` | String | 需求分类/模块 | "订单管理" |
| 4 | 需求名称 | `title` | String | 需求标题（必填） | "审批订单跳转企业微信" |
| 5 | 需求背景 | `description` | String | 合并到description（第一部分） | "审批订单跳转企业微信" |
| 6 | 需求说明 | `description` | String | 合并到description（第二部分） | "详细说明..." |
| 7 | 进度描述（需求点） | `custom_fields.progress_points` | String | 需求要点 | "审批订单跳转企业微信" |
| 8 | 进度状态 | `status` | Enum | 映射到RequirementStatus | "已上线" → "converted" |
| 9 | 功能进度（详细） | `custom_fields.progress_detail` | Text | 详细进度记录 | "7月2日：占单时效性..." |
| 10 | 功能进度（简） | `custom_fields.progress_summary` | String | 进度摘要 | "暂不开发" |
| 11 | 优先级排序 | `priority` | Enum | 映射到priority | "1" → "urgent" |
| 12 | 待办事项 | `custom_fields.todo_items` | Text | 待办清单 | "" |
| 13 | 完成状态 | `status` | Enum | 辅助状态映射 | "不开发" → "rejected" |
| 14 | 延期原因 | `custom_fields.delay_reason` | Text | 延期说明 | "原计划上线时间..." |
| 15 | 提出人 | `submitter_id` | Integer | 姓名→用户ID转换 | "李婷婷" → 查找用户ID |
| 16 | 提出时间 | `created_at`, `submitted_at` | DateTime | 中文日期解析 | "2024年3月1日" → "2024-03-01T00:00:00Z" |
| 17 | 预计解决时间 | `due_date` | DateTime | 截止日期 | "2024年11月8日" |
| 18 | 实际上线时间 | `converted_at` | DateTime | 转换时间（状态为converted时） | "2025年4月24日" |
| 19 | 周例会沟通内容 | `custom_fields.meeting_notes` | Text | 会议记录 | "待确认微信接口" |
| 20 | 方案说明 | `acceptance_criteria` | Text | 验收标准 | "" |
| 21 | 方案流程图 | `custom_fields.flowchart_url` | String | 流程图链接或标识 | "=DISPIMG(...)" |
| 22 | 方案原型图 | `custom_fields.prototype_url` | String | 原型图链接 | "" |
| 23 | 内部测试时间 | `custom_fields.internal_test_date` | String | 内测日期 | "11月4日" |
| 24 | 用户测试时间 | `custom_fields.user_test_date` | String | 用户测试日期 | "" |
| 25 | 备注 | `custom_fields.remarks` | Text | 备注信息 | "" |
| 26 | 补充/备注1 | `custom_fields.additional_note_1` | Text | 补充说明1 | "" |
| 27 | 补充/备注2 | `custom_fields.additional_note_2` | Text | 补充说明2 | "" |
| 28 | 要求解决时间 | `due_date` | DateTime | 优先级高于预计解决时间 | "" |
| 29 | 资源需求 | `custom_fields.resource_requirements` | Text | 所需资源 | "" |
| 30 | 项目主责人业务侧 | `custom_fields.business_lead` | String | 业务负责人 | "" |
| 31 | 项目主责人系统侧 | `custom_fields.technical_lead` | String | 技术负责人 | "" |
| 32 | 协同渠道 | `custom_fields.collaboration_channel` | String | 协作渠道 | "" |

## 字段分类处理

### 1. 核心标准字段（直接映射）

这些字段直接映射到requirements表的标准列：

```python
standard_fields = {
    "需求名称": "title",           # NOT NULL
    "功能模块": "category",         # 可选
    "方案说明": "acceptance_criteria"  # 可选
}
```

### 2. 合并字段（多对一）

多个CSV字段合并为一个系统字段：

```python
# description = 需求背景 + 需求说明
description_parts = []
if 需求背景:
    description_parts.append(f"**需求背景**\n{需求背景}")
if 需求说明:
    description_parts.append(f"**需求说明**\n{需求说明}")
description = "\n\n".join(description_parts)
```

### 3. 时间字段（格式转换）

CSV中的中文日期需要转换：

```python
def parse_chinese_date(date_str):
    # "2024年3月1日" → "2024-03-01T00:00:00Z"
    # "2024-03-01" → "2024-03-01T00:00:00Z"
    # "2024/03/01" → "2024-03-01T00:00:00Z"
    pass

# 时间字段映射优先级
due_date = 要求解决时间 or 预计解决时间
created_at = submitted_at = 提出时间
converted_at = 实际上线时间 (仅当status=converted时)
```

### 4. 状态字段（枚举映射）

CSV状态 → 系统RequirementStatus：

```python
STATUS_MAPPING = {
    # CSV进度状态/完成状态 → 系统状态
    "已上线": "converted",      # 已转任务
    "开发中": "approved",        # 已批准
    "待发版": "approved",        # 已批准
    "排期中": "pending",         # 待评审
    "不开发": "rejected",        # 已拒绝
    "停止开发": "rejected",      # 已拒绝
    "延期中": "need_more",       # 待补充
    "待配置": "pending",         # 待评审
    "": "draft",                 # 默认草稿
}

# 状态判断逻辑
status = STATUS_MAPPING.get(完成状态) or \
         STATUS_MAPPING.get(进度状态) or \
         "draft"
```

### 5. 优先级字段（值映射）

CSV优先级 → 系统priority：

```python
PRIORITY_MAPPING = {
    "1": "urgent",
    "2": "high",
    "3": "medium",
    "4": "low",
    "高": "high",
    "中": "medium",
    "低": "low",
    "": "medium",  # 默认
}

priority = PRIORITY_MAPPING.get(优先级排序, "medium")
```

### 6. 用户字段（姓名→ID）

提出人姓名需要转换为用户ID：

```python
def find_user_by_name(name: str) -> Optional[int]:
    # 1. 调用API搜索用户: GET /api/v1/admin/users?search={name}
    # 2. 精确匹配 username 或 real_name
    # 3. 如果找不到，返回None（使用当前用户ID）
    pass

submitter_id = find_user_by_name(提出人) or current_user_id
```

### 7. 扩展字段（JSONB存储）

CSV特有字段存入custom_fields：

```python
custom_fields = {
    "serial_number": 序号,
    "system_name": 系统,
    "progress_points": 进度描述,
    "progress_detail": 功能进度详细,
    "progress_summary": 功能进度简,
    "todo_items": 待办事项,
    "delay_reason": 延期原因,
    "meeting_notes": 周例会沟通内容,
    "flowchart_url": 方案流程图,
    "prototype_url": 方案原型图,
    "internal_test_date": 内部测试时间,
    "user_test_date": 用户测试时间,
    "remarks": 备注,
    "additional_note_1": 补充备注1,
    "additional_note_2": 补充备注2,
    "resource_requirements": 资源需求,
    "business_lead": 项目主责人业务侧,
    "technical_lead": 项目主责人系统侧,
    "collaboration_channel": 协同渠道,
}
```

### 8. 固定值字段

导入时使用固定值：

```python
fixed_values = {
    "project_id": 156,        # 团购系统项目
    "enterprise_id": 3,       # 李宁集团
}
```

## 数据转换示例

### 示例1: 完整需求转换

**CSV原始数据**:
```csv
序号: 1
系统: 酷采团购系统
功能模块: 订单管理
需求名称: 审批订单跳转企业微信
需求背景: 审批订单跳转企业微信
需求说明: 实现业务经理和部门经理在企业微信上对订单申请的审批
进度状态: 不开发
完成状态: 不开发
提出人: 李婷婷
提出时间: 2024年3月1日
周例会沟通内容: 待确认微信接口
```

**转换后的JSON**:
```json
{
  "title": "审批订单跳转企业微信",
  "description": "**需求背景**\n审批订单跳转企业微信\n\n**需求说明**\n实现业务经理和部门经理在企业微信上对订单申请的审批",
  "project_id": 156,
  "enterprise_id": 3,
  "submitter_id": 27,
  "category": "订单管理",
  "status": "rejected",
  "priority": "medium",
  "created_at": "2024-03-01T00:00:00Z",
  "submitted_at": "2024-03-01T00:00:00Z",
  "custom_fields": {
    "serial_number": "1",
    "system_name": "酷采团购系统",
    "progress_points": "审批订单跳转企业微信",
    "meeting_notes": "待确认微信接口"
  }
}
```

### 示例2: 已上线需求

**CSV原始数据**:
```csv
序号: 7
需求名称: 采购售后增加收件人
进度状态: 已上线
完成状态: 已上线
提出人: 准航
提出时间: 2024年8月1日
预计解决时间: 2024年11月8日
实际上线时间: 2025年4月24日
```

**转换后的JSON**:
```json
{
  "title": "采购售后增加收件人",
  "project_id": 156,
  "enterprise_id": 3,
  "submitter_id": 1,
  "status": "converted",
  "priority": "medium",
  "created_at": "2024-08-01T00:00:00Z",
  "submitted_at": "2024-08-01T00:00:00Z",
  "due_date": "2024-11-08T00:00:00Z",
  "converted_at": "2025-04-24T00:00:00Z",
  "custom_fields": {
    "serial_number": "7"
  }
}
```

## 数据质量处理

### 1. 空值处理

```python
# 跳过空值字段
if not value or not value.strip():
    continue

# 清理后的对象，移除所有空值
requirement = {k: v for k, v in requirement.items()
               if v not in [None, "", []]}
```

### 2. 长文本截断

```python
# 标题最大500字符
if len(title) > 500:
    title = title[:497] + "..."
```

### 3. 日期验证

```python
try:
    dt = datetime(int(year), int(month), int(day))
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
except ValueError:
    return None  # 无效日期返回None
```

### 4. 重复检查

```python
# 可选：导入前检查是否已存在相同标题的需求
existing = search_requirement_by_title(title, project_id)
if existing:
    print(f"警告: 需求'{title}'已存在")
```

## 数据库Schema

### requirements表结构

```sql
CREATE TABLE requirements (
    id SERIAL PRIMARY KEY,
    display_id VARCHAR(50) UNIQUE,

    -- 核心字段
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- 关联
    project_id INTEGER REFERENCES projects(id),
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id),
    submitter_id INTEGER NOT NULL REFERENCES users(id),
    reviewer_id INTEGER REFERENCES users(id),

    -- 状态
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(20),

    -- 业务字段
    business_value TEXT,
    expected_outcome TEXT,
    acceptance_criteria TEXT,
    attachments JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',  -- ← CSV扩展字段

    -- 评审
    review_status VARCHAR(50),
    review_comment TEXT,
    review_score INTEGER,
    reviewed_at TIMESTAMP,

    -- 估算
    estimated_hours NUMERIC,
    estimated_cost NUMERIC,
    complexity VARCHAR(50),

    -- 转化
    converted_task_id INTEGER REFERENCES tasks(id),
    converted_at TIMESTAMP,
    converted_by INTEGER REFERENCES users(id),

    -- 时间
    submitted_at TIMESTAMP,
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id)
);

-- custom_fields索引
CREATE INDEX idx_requirements_custom_fields
ON requirements USING GIN (custom_fields);
```

### custom_fields查询示例

```sql
-- 查询特定系统的需求
SELECT * FROM requirements
WHERE custom_fields->>'system_name' = '酷采团购系统';

-- 查询有延期原因的需求
SELECT
    id,
    title,
    custom_fields->>'delay_reason' as delay_reason
FROM requirements
WHERE custom_fields ? 'delay_reason'
  AND custom_fields->>'delay_reason' != '';

-- 统计各系统需求数
SELECT
    custom_fields->>'system_name' as system_name,
    COUNT(*) as count
FROM requirements
WHERE custom_fields ? 'system_name'
GROUP BY custom_fields->>'system_name';
```

## 兼容性说明

### 向后兼容

- ✅ 新增`custom_fields`字段为可选，不影响现有需求
- ✅ 现有API继续工作，custom_fields默认为`{}`
- ✅ 前端可选择性显示custom_fields内容

### 扩展性

- ✅ JSONB格式允许未来添加新字段无需迁移
- ✅ GIN索引支持高效查询
- ✅ 可存储任意JSON结构

## 相关资源

- **导入脚本**: `scripts/import_requirements_from_csv.py`
- **使用指南**: `docs/CSV_IMPORT_GUIDE.md`
- **数据库迁移**: `backend/migrations/20251112_01_add_custom_fields_to_requirements/`
- **模型定义**: `backend/models/requirement.go`
