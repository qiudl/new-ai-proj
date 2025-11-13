# CSV需求批量导入功能 - 完整开发方案

## 📋 任务概述

**任务标题**: 实现CSV需求批量导入功能 - 支持团购系统76条需求导入

**任务描述**:
从CSV文件批量导入需求到AI项目管理系统，支持32个字段映射，使用custom_fields JSONB扩展字段存储CSV特有数据。

**业务价值**:
- 快速迁移历史需求数据（76条团购系统需求）
- 保留完整的历史信息（32个字段100%兼容）
- 提供灵活的数据导入机制，支持未来其他系统导入

**优先级**: 高
**预计工时**: 16小时
**所属项目**: 39 (AI项目管理系统)

---

## 🎯 功能需求

### 1. 核心功能

#### 1.1 数据库扩展
- 添加`custom_fields` JSONB字段到requirements表
- 创建GIN索引优化JSONB查询性能
- 支持存储任意JSON结构的扩展数据

#### 1.2 后端API
- 模型层支持CustomFields类型
- CreateRequirementRequest支持custom_fields
- UpdateRequirementRequest支持custom_fields
- API响应返回custom_fields数据

#### 1.3 导入工具
- Python脚本读取CSV文件
- 32个字段智能映射
- 状态、优先级、时间自动转换
- 用户名查找和ID转换
- 批量API调用
- 详细日志和进度显示

#### 1.4 前端展示（可选扩展）
- 需求详情页展示custom_fields
- 支持字段折叠/展开
- 格式化显示JSONB数据

### 2. 字段映射规则

| CSV字段 | 系统字段 | 映射方式 |
|---------|----------|----------|
| 需求名称 | title | 直接映射 |
| 功能模块 | category | 直接映射 |
| 需求背景+需求说明 | description | 合并 |
| 进度状态/完成状态 | status | 枚举映射 |
| 优先级排序 | priority | 枚举映射 |
| 提出人 | submitter_id | 用户查找 |
| 提出时间 | created_at | 日期解析 |
| 其他21个字段 | custom_fields | JSONB存储 |

### 3. 数据转换规则

#### 状态映射
```
已上线 → converted
开发中 → approved
待发版 → approved
排期中 → pending
不开发 → rejected
停止开发 → rejected
延期中 → need_more
待配置 → pending
```

#### 优先级映射
```
1/高 → urgent
2 → high
3/中 → medium
4/低 → low
空 → medium (默认)
```

#### 时间格式解析
- 支持: "2024年3月1日"
- 支持: "2024-03-01"
- 支持: "2024/03/01"
- 输出: ISO 8601格式

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     CSV需求导入系统                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   CSV文件    │─────▶│  导入工具    │─────▶│  后端API     │
│ (32字段)     │      │ (Python)     │      │  (Go)        │
└──────────────┘      └──────────────┘      └──────────────┘
                             │                      │
                             ▼                      ▼
                      ┌──────────────┐      ┌──────────────┐
                      │  字段映射    │      │  PostgreSQL  │
                      │  数据转换    │      │  (JSONB)     │
                      └──────────────┘      └──────────────┘
```

### 数据流图

```
CSV文件读取
    │
    ▼
逐行解析 (32字段)
    │
    ├──▶ 核心字段 ──▶ 直接映射 ──┐
    │                           │
    ├──▶ 状态字段 ──▶ 枚举转换 ──┤
    │                           │
    ├──▶ 时间字段 ──▶ 日期解析 ──┤
    │                           │
    ├──▶ 用户字段 ──▶ ID查找 ───┤
    │                           │
    └──▶ 扩展字段 ──▶ JSONB ────┤
                                │
                                ▼
                        组装Request对象
                                │
                                ▼
                        调用创建需求API
                                │
                                ▼
                        存储到PostgreSQL
```

### 数据库Schema

```sql
-- requirements表结构
CREATE TABLE requirements (
    id SERIAL PRIMARY KEY,
    display_id VARCHAR(50),

    -- 核心字段
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- 关联
    project_id INTEGER,
    enterprise_id INTEGER NOT NULL,
    submitter_id INTEGER NOT NULL,

    -- 状态
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(20),

    -- 业务字段
    acceptance_criteria TEXT,
    attachments JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',  -- ⭐ 新增

    -- 时间
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    due_date TIMESTAMP,

    -- 其他字段...
);

-- custom_fields索引
CREATE INDEX idx_requirements_custom_fields
ON requirements USING GIN (custom_fields);
```

---

## 🎨 界面设计与交互逻辑

### 1. 导入工具CLI界面

#### 线框图 - 命令行交互流程

```
┌────────────────────────────────────────────────────────────┐
│  CSV需求导入工具                                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  步骤1: 准备阶段                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │ ✅ 当前用户: admin (ID: 1)                       │     │
│  │ ✅ 后端服务: http://localhost:8080 (已连接)     │     │
│  │ ✅ 项目验证: 项目156存在                         │     │
│  │ ✅ 企业验证: 企业3存在                           │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  步骤2: CSV解析                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ 📖 正在读取: 团购系统需求记录.csv                │     │
│  │                                                   │     │
│  │ [1] 审批订单跳转企业微信                         │     │
│  │ [2] 采购单销售单列表搜索增加备注信息搜索         │     │
│  │ [3] 占单转系统订单                               │     │
│  │ ...                                               │     │
│  │ [76] 最后一条需求                                │     │
│  │                                                   │     │
│  │ ✅ 成功解析 76 条需求                            │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  步骤3: 预览模式 (--dry-run)                               │
│  ┌──────────────────────────────────────────────────┐     │
│  │ 📋 前3条需求预览:                                │     │
│  │                                                   │     │
│  │ 需求1:                                            │     │
│  │   title: "审批订单跳转企业微信"                  │     │
│  │   status: "rejected" (不开发 → rejected)        │     │
│  │   category: "订单管理"                           │     │
│  │   custom_fields: {                               │     │
│  │     "system_name": "酷采团购系统",              │     │
│  │     "serial_number": "1"                         │     │
│  │   }                                               │     │
│  │                                                   │     │
│  │ 💡 去掉 --dry-run 参数执行正式导入               │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  步骤4: 确认导入                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │ ⚠️  即将导入 76 条需求到项目 156                 │     │
│  │                                                   │     │
│  │ 确认导入? (yes/no): _                            │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  步骤5: 导入进度                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │ 🚀 开始导入...                                    │     │
│  │                                                   │     │
│  │ ✅ [1/76] 审批订单跳转企业微信 (ID: 1001)        │     │
│  │ ✅ [2/76] 采购单销售单列表... (ID: 1002)         │     │
│  │ ✅ [3/76] 占单转系统订单 (ID: 1003)              │     │
│  │ ...                                               │     │
│  │ ❌ [45/76] 某需求失败: 状态码 400               │     │
│  │ ...                                               │     │
│  │ ✅ [76/76] 最后一条需求 (ID: 1076)               │     │
│  │                                                   │     │
│  │ [████████████████████████████] 100%              │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  步骤6: 导入总结                                            │
│  ┌──────────────────────────────────────────────────┐     │
│  │ ════════════════════════════════════════════     │     │
│  │ 导入完成!                                         │     │
│  │ ════════════════════════════════════════════     │     │
│  │ ✅ 成功: 75                                       │     │
│  │ ❌ 失败: 1                                        │     │
│  │ 📊 总计: 76                                       │     │
│  │                                                   │     │
│  │ 失败列表:                                         │     │
│  │   [45] 某需求: title字段超长                     │     │
│  └──────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────┘
```

### 2. 前端需求详情页扩展（可选）

#### 线框图 - 需求详情页custom_fields展示

```
┌────────────────────────────────────────────────────────────────┐
│  需求详情 - REQ-156-001                                  [关闭] │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  基本信息                                                       │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 需求名称: 审批订单跳转企业微信                       │     │
│  │ 所属项目: 团购系统 (156)                             │     │
│  │ 状态: 已拒绝 🔴                                       │     │
│  │ 优先级: 中 ⚡                                         │     │
│  │ 分类: 订单管理                                        │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  需求描述                                                       │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ **需求背景**                                          │     │
│  │ 审批订单跳转企业微信                                  │     │
│  │                                                       │     │
│  │ **需求说明**                                          │     │
│  │ 实现业务经理和部门经理在企业微信上对订单申请的审批   │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  扩展信息 (CSV导入) ▼                                          │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 📋 原始需求信息                                       │     │
│  │ ├─ 序号: 1                                            │     │
│  │ ├─ 系统名称: 酷采团购系统                            │     │
│  │ ├─ 进度描述: 审批订单跳转企业微信                    │     │
│  │ ├─ 功能进度(简): 暂不开发                            │     │
│  │ └─ 周例会沟通: 待确认微信接口                        │     │
│  │                                                       │     │
│  │ 📅 时间记录                                           │     │
│  │ ├─ 提出时间: 2024年3月1日                            │     │
│  │ └─ 内部测试: 未安排                                  │     │
│  │                                                       │     │
│  │ 👥 项目人员                                           │     │
│  │ ├─ 提出人: 李婷婷                                    │     │
│  │ ├─ 业务负责人: -                                     │     │
│  │ └─ 技术负责人: -                                     │     │
│  │                                                       │     │
│  │ [查看完整JSON] [折叠]                                │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  [编辑需求] [转为任务] [删除]                                  │
└────────────────────────────────────────────────────────────────┘
```

#### 交互逻辑 - custom_fields展示

```
用户操作                    系统响应
    │
    ├─ 打开需求详情
    │       │
    │       ├─ 加载需求基本信息
    │       ├─ 加载custom_fields (如果存在)
    │       └─ 渲染扩展信息区域
    │
    ├─ 点击"扩展信息"区域
    │       │
    │       └─ 展开/折叠扩展字段
    │              │
    │              ├─ 折叠状态: 显示字段数量
    │              └─ 展开状态: 显示所有字段
    │
    ├─ 点击"查看完整JSON"
    │       │
    │       └─ 弹出模态框
    │              │
    │              ├─ 显示格式化的JSON
    │              ├─ 支持复制
    │              └─ 支持下载
    │
    └─ 编辑需求
            │
            └─ custom_fields只读
                   │
                   └─ 提示: "CSV导入字段仅供查看"
```

### 3. 需求列表页custom_fields筛选（未来扩展）

#### 线框图 - 列表筛选

```
┌────────────────────────────────────────────────────────────────┐
│  需求列表                                           [+ 新建需求] │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  筛选条件                                                       │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 项目: [团购系统 ▼]  状态: [全部 ▼]  优先级: [全部 ▼]│     │
│  │                                                       │     │
│  │ 高级筛选 ▼                                            │     │
│  │ ┌──────────────────────────────────────────────┐    │     │
│  │ │ 📋 CSV扩展字段筛选                            │    │     │
│  │ │                                               │    │     │
│  │ │ 系统名称: [酷采团购系统 ▼]                   │    │     │
│  │ │ 功能模块: [订单管理 ▼]                       │    │     │
│  │ │ 进度状态: [全部 ▼]                           │    │     │
│  │ │                                               │    │     │
│  │ │ [重置] [应用筛选]                            │    │     │
│  │ └──────────────────────────────────────────────┘    │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  结果 (共75条)                                                  │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ ID    标题                状态      系统       模块   │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │ 1001  审批订单跳转...    已拒绝    酷采       订单   │     │
│  │ 1002  采购单销售单...    已拒绝    酷采       订单   │     │
│  │ 1003  占单转系统订单     待发版    酷采       订单   │     │
│  │ ...                                                   │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  [1] 2 3 ... 8  下一页 ▶                                       │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔧 实施步骤

### Phase 1: 数据库层 (2小时)

#### 1.1 创建迁移文件
```bash
mkdir -p backend/migrations/20251112_01_add_custom_fields_to_requirements
```

#### 1.2 编写up.sql
```sql
-- 添加custom_fields列
ALTER TABLE requirements
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- 创建GIN索引
CREATE INDEX IF NOT EXISTS idx_requirements_custom_fields
ON requirements USING GIN (custom_fields);

-- 添加注释
COMMENT ON COLUMN requirements.custom_fields IS '扩展字段，存储CSV导入等特定业务数据';
```

#### 1.3 编写down.sql
```sql
DROP INDEX IF EXISTS idx_requirements_custom_fields;
ALTER TABLE requirements DROP COLUMN IF EXISTS custom_fields;
```

#### 1.4 测试迁移
```bash
# 启动后端，自动执行迁移
cd backend
go run main.go

# 验证字段创建
psql -c "\d requirements"
```

### Phase 2: 模型层 (2小时)

#### 2.1 定义CustomFields类型
在`backend/models/requirement.go`中添加:

```go
// CustomFields represents custom/extended fields stored as JSONB
type CustomFields map[string]interface{}

// Value implements the driver.Valuer interface
func (c CustomFields) Value() (driver.Value, error) {
    if c == nil {
        return []byte("{}"), nil
    }
    return json.Marshal(c)
}

// Scan implements the sql.Scanner interface
func (c *CustomFields) Scan(value interface{}) error {
    if value == nil {
        *c = CustomFields{}
        return nil
    }
    bytes, ok := value.([]byte)
    if !ok {
        return fmt.Errorf("cannot scan %T into CustomFields", value)
    }
    return json.Unmarshal(bytes, c)
}
```

#### 2.2 更新Requirement结构体
```go
type Requirement struct {
    // ... 其他字段
    CustomFields CustomFields `json:"custom_fields,omitempty" db:"custom_fields"`
}
```

#### 2.3 更新Request/Response结构
```go
type CreateRequirementRequest struct {
    // ... 其他字段
    CustomFields CustomFields `json:"custom_fields,omitempty"`
}

type UpdateRequirementRequest struct {
    // ... 其他字段
    CustomFields *CustomFields `json:"custom_fields,omitempty"`
}

type RequirementResponse struct {
    // ... 其他字段
    CustomFields CustomFields `json:"custom_fields,omitempty"`
}
```

#### 2.4 更新ToResponse方法
```go
func (r *Requirement) ToResponse() RequirementResponse {
    return RequirementResponse{
        // ... 其他字段
        CustomFields: r.CustomFields,
    }
}
```

#### 2.5 单元测试
```go
func TestCustomFieldsSerialization(t *testing.T) {
    cf := CustomFields{
        "system_name": "酷采团购系统",
        "serial_number": "1",
    }

    value, err := cf.Value()
    assert.NoError(t, err)

    var cf2 CustomFields
    err = cf2.Scan(value)
    assert.NoError(t, err)
    assert.Equal(t, cf, cf2)
}
```

### Phase 3: 导入工具开发 (8小时)

#### 3.1 脚本框架搭建
```python
# scripts/import_requirements_from_csv.py

import csv
import json
import sys
import os
from typing import Dict, Any, Optional

# 配置
API_BASE_URL = "http://localhost:8080"
PROJECT_ID = 156
ENTERPRISE_ID = 3

# 映射表
STATUS_MAPPING = {...}
PRIORITY_MAPPING = {...}
CSV_FIELD_MAPPING = {...}
```

#### 3.2 核心函数实现

**日期解析函数**
```python
def parse_chinese_date(date_str: str) -> Optional[str]:
    """解析中文日期: 2024年3月1日 → 2024-03-01T00:00:00Z"""
    patterns = [
        r"(\d{4})年(\d{1,2})月(\d{1,2})日",
        r"(\d{4})-(\d{1,2})-(\d{1,2})",
    ]
    for pattern in patterns:
        match = re.search(pattern, date_str.strip())
        if match:
            year, month, day = match.groups()
            dt = datetime(int(year), int(month), int(day))
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    return None
```

**状态映射函数**
```python
def map_status(progress_status: str, completion_status: str) -> str:
    """根据进度状态和完成状态映射系统状态"""
    if completion_status:
        mapped = STATUS_MAPPING.get(completion_status.strip())
        if mapped:
            return mapped
    if progress_status:
        mapped = STATUS_MAPPING.get(progress_status.strip())
        if mapped:
            return mapped
    return "draft"
```

**用户查找函数**
```python
def find_user_by_name(name: str, token: str) -> Optional[int]:
    """根据用户名查找用户ID"""
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/users",
            headers={"Authorization": f"Bearer {token}"},
            params={"search": name, "page": 1, "page_size": 10}
        )
        if response.status_code == 200:
            users = response.json().get("data", {}).get("users", [])
            for user in users:
                if user.get("username") == name or user.get("real_name") == name:
                    return user.get("id")
    except Exception as e:
        print(f"⚠️ 查找用户失败: {name}, 错误: {e}")
    return None
```

**CSV行处理函数**
```python
def process_csv_row(row: Dict[str, str], token: str, default_submitter_id: int) -> Dict[str, Any]:
    """处理单行CSV数据，转换为需求对象"""
    requirement = {
        "project_id": PROJECT_ID,
        "enterprise_id": ENTERPRISE_ID,
        "priority": "medium",
        "status": "draft",
    }

    temp_fields = {}
    custom_fields = {}

    # 遍历CSV字段映射
    for csv_field, (system_field, converter) in CSV_FIELD_MAPPING.items():
        value = row.get(csv_field, "")
        if not value or not value.strip():
            continue

        converted_value = converter(value.strip())

        if system_field.startswith("custom_fields."):
            field_name = system_field.replace("custom_fields.", "")
            custom_fields[field_name] = converted_value
        elif system_field.startswith("_"):
            temp_fields[system_field] = converted_value
        else:
            requirement[system_field] = converted_value

    # 后处理: 合并description
    description_parts = []
    if "_background" in temp_fields:
        description_parts.append(f"**需求背景**\n{temp_fields['_background']}")
    if "_specification" in temp_fields:
        description_parts.append(f"**需求说明**\n{temp_fields['_specification']}")
    if description_parts:
        requirement["description"] = "\n\n".join(description_parts)

    # 后处理: 状态映射
    requirement["status"] = map_status(
        temp_fields.get("_progress_status", ""),
        temp_fields.get("_completion_status", "")
    )

    # 后处理: 优先级映射
    requirement["priority"] = map_priority(temp_fields.get("_priority_raw", ""))

    # 后处理: 用户转换
    submitter_name = temp_fields.get("_submitter_name", "")
    submitter_id = find_user_by_name(submitter_name, token)
    requirement["submitter_id"] = submitter_id if submitter_id else default_submitter_id

    # 后处理: 时间字段
    submit_time = parse_chinese_date(temp_fields.get("_submit_time", ""))
    if submit_time:
        requirement["created_at"] = submit_time
        requirement["submitted_at"] = submit_time

    # 添加custom_fields
    if custom_fields:
        requirement["custom_fields"] = custom_fields

    # 清理空值
    requirement = {k: v for k, v in requirement.items() if v not in [None, "", []]}

    return requirement
```

**主函数**
```python
def main():
    if len(sys.argv) < 2:
        print("用法: python3 import_requirements_from_csv.py <csv_file> [--dry-run]")
        sys.exit(1)

    csv_file = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    # 读取CSV
    requirements = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, 1):
            if not row.get("需求名称", "").strip():
                continue
            req = process_csv_row(row, API_TOKEN, default_submitter_id)
            requirements.append(req)
            print(f"  [{idx}] {req.get('title', 'N/A')[:50]}")

    print(f"\n✅ 成功解析 {len(requirements)} 条需求")

    # 预览模式
    if dry_run:
        print("\n预览模式 - 前3条需求:")
        for req in requirements[:3]:
            print(json.dumps(req, ensure_ascii=False, indent=2))
        return

    # 确认导入
    confirm = input(f"\n⚠️ 即将导入 {len(requirements)} 条需求，确认? (yes/no): ")
    if confirm.lower() != "yes":
        return

    # 执行导入
    success_count = 0
    fail_count = 0

    for idx, req in enumerate(requirements, 1):
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/mcp/requirements/create",
                headers={"Authorization": f"Bearer {API_TOKEN}"},
                json=req
            )
            if response.status_code in [200, 201]:
                req_id = response.json().get("id")
                print(f"  ✅ [{idx}/{len(requirements)}] {req['title'][:40]} (ID: {req_id})")
                success_count += 1
            else:
                print(f"  ❌ [{idx}/{len(requirements)}] {req['title'][:40]} - 失败")
                fail_count += 1
        except Exception as e:
            print(f"  ❌ [{idx}/{len(requirements)}] 异常: {e}")
            fail_count += 1

    # 总结
    print(f"\n✅ 成功: {success_count}")
    print(f"❌ 失败: {fail_count}")
    print(f"📊 总计: {len(requirements)}")
```

#### 3.3 测试脚本

```bash
# 测试1: 预览模式
python3 scripts/import_requirements_from_csv.py \
  /Users/johnqiu/Desktop/团购系统需求记录.csv --dry-run

# 测试2: 导入单条
# (修改脚本限制只导入第一条)

# 测试3: 完整导入
export API_TOKEN="your-jwt-token"
python3 scripts/import_requirements_from_csv.py \
  /Users/johnqiu/Desktop/团购系统需求记录.csv
```

### Phase 4: 前端展示（可选，4小时）

#### 4.1 需求详情组件更新

```typescript
// frontend/src/pages/RequirementDetailPage.tsx

interface CustomFields {
  serial_number?: string;
  system_name?: string;
  progress_detail?: string;
  meeting_notes?: string;
  // ... 其他字段
}

const RequirementDetail: React.FC = () => {
  const [requirement, setRequirement] = useState<Requirement>();
  const [showCustomFields, setShowCustomFields] = useState(false);

  return (
    <div>
      {/* 基本信息 */}
      <Card title="基本信息">
        <Descriptions>
          <Descriptions.Item label="需求名称">{requirement.title}</Descriptions.Item>
          <Descriptions.Item label="状态">{requirement.status}</Descriptions.Item>
          {/* ... */}
        </Descriptions>
      </Card>

      {/* custom_fields展示 */}
      {requirement.custom_fields && Object.keys(requirement.custom_fields).length > 0 && (
        <Card
          title={
            <div onClick={() => setShowCustomFields(!showCustomFields)} style={{cursor: 'pointer'}}>
              扩展信息 (CSV导入) {showCustomFields ? '▼' : '▶'}
            </div>
          }
        >
          {showCustomFields && (
            <Descriptions column={2} bordered>
              {requirement.custom_fields.serial_number && (
                <Descriptions.Item label="序号">
                  {requirement.custom_fields.serial_number}
                </Descriptions.Item>
              )}
              {requirement.custom_fields.system_name && (
                <Descriptions.Item label="系统名称">
                  {requirement.custom_fields.system_name}
                </Descriptions.Item>
              )}
              {/* ... 其他字段 */}
            </Descriptions>
          )}

          <Button
            size="small"
            onClick={() => showJsonModal(requirement.custom_fields)}
          >
            查看完整JSON
          </Button>
        </Card>
      )}
    </div>
  );
};
```

#### 4.2 JSON查看模态框

```typescript
const JsonViewModal: React.FC<{data: any, onClose: () => void}> = ({data, onClose}) => {
  return (
    <Modal
      title="完整JSON数据"
      visible
      onCancel={onClose}
      footer={[
        <Button key="copy" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>
          复制
        </Button>,
        <Button key="close" onClick={onClose}>关闭</Button>
      ]}
    >
      <pre style={{maxHeight: '500px', overflow: 'auto'}}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </Modal>
  );
};
```

---

## 📊 测试计划

### 单元测试

#### 后端模型测试
```go
// backend/models/requirement_test.go

func TestCustomFieldsMarshaling(t *testing.T) {
    cf := CustomFields{
        "system_name": "酷采团购系统",
        "serial_number": "1",
    }

    // 测试Value
    value, err := cf.Value()
    require.NoError(t, err)

    // 测试Scan
    var cf2 CustomFields
    err = cf2.Scan(value)
    require.NoError(t, err)
    assert.Equal(t, "酷采团购系统", cf2["system_name"])
}

func TestRequirementWithCustomFields(t *testing.T) {
    req := &Requirement{
        Title: "测试需求",
        CustomFields: CustomFields{
            "test_field": "test_value",
        },
    }

    resp := req.ToResponse()
    assert.Equal(t, "test_value", resp.CustomFields["test_field"])
}
```

#### Python脚本测试
```python
# tests/test_import_script.py

def test_parse_chinese_date():
    assert parse_chinese_date("2024年3月1日") == "2024-03-01T00:00:00Z"
    assert parse_chinese_date("2024-03-01") == "2024-03-01T00:00:00Z"
    assert parse_chinese_date("") is None

def test_map_status():
    assert map_status("已上线", "") == "converted"
    assert map_status("", "不开发") == "rejected"
    assert map_status("", "") == "draft"

def test_map_priority():
    assert map_priority("1") == "urgent"
    assert map_priority("高") == "high"
    assert map_priority("") == "medium"
```

### 集成测试

```bash
# 测试1: 数据库迁移
psql -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='requirements' AND column_name='custom_fields'"

# 测试2: API创建需求（带custom_fields）
curl -X POST http://localhost:8080/api/v1/requirements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试需求",
    "project_id": 156,
    "enterprise_id": 3,
    "custom_fields": {
      "system_name": "测试系统",
      "serial_number": "999"
    }
  }'

# 测试3: 查询需求（验证custom_fields返回）
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/requirements/1001" | jq '.custom_fields'

# 测试4: JSONB查询
psql -c "SELECT title, custom_fields->>'system_name' as system FROM requirements WHERE custom_fields ? 'system_name'"
```

### 端到端测试

```bash
# E2E测试流程

# 1. 准备测试CSV（5条数据）
cat > /tmp/test_requirements.csv << EOF
序号,系统,功能模块,需求名称,进度状态
1,测试系统,测试模块,测试需求1,已上线
2,测试系统,测试模块,测试需求2,开发中
EOF

# 2. 执行导入
python3 scripts/import_requirements_from_csv.py /tmp/test_requirements.csv

# 3. 验证导入
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/requirements?project_id=156&search=测试需求"

# 4. 验证custom_fields
psql -c "SELECT title, custom_fields FROM requirements WHERE title LIKE '测试需求%'"

# 5. 清理测试数据
psql -c "DELETE FROM requirements WHERE title LIKE '测试需求%'"
```

---

## 📈 验收标准

### 功能验收

- [ ] 数据库迁移成功执行，custom_fields列创建
- [ ] GIN索引创建成功
- [ ] Go模型编译无错误，CustomFields类型正常工作
- [ ] API可以接收和返回custom_fields
- [ ] Python脚本可以正常运行
- [ ] CSV 76条需求100%成功导入
- [ ] 所有32个字段正确映射
- [ ] 状态映射准确
- [ ] 时间格式解析正确
- [ ] 用户查找功能正常
- [ ] custom_fields数据完整存储
- [ ] JSONB查询性能正常

### 性能验收

- [ ] 单条需求导入 < 500ms
- [ ] 76条需求批量导入 < 60s
- [ ] JSONB查询响应 < 100ms
- [ ] GIN索引有效提升查询速度

### 数据质量验收

- [ ] 无数据丢失（32字段100%保留）
- [ ] 状态映射准确率 100%
- [ ] 时间解析成功率 > 95%
- [ ] 用户匹配成功率 > 80%

---

## 📚 文档交付

### 开发文档
- [x] 本开发方案文档
- [x] CSV字段映射详细说明 (`docs/CSV_FIELD_MAPPING.md`)
- [x] 导入工具使用指南 (`docs/CSV_IMPORT_GUIDE.md`)
- [x] 方案总结 (`docs/CSV_IMPORT_SUMMARY.md`)

### 代码文档
- [ ] CustomFields类型注释
- [ ] 导入脚本函数注释
- [ ] API接口Swagger更新

### 用户文档
- [x] 快速参考 (`scripts/README_IMPORT.md`)
- [ ] 故障排查指南
- [ ] FAQ文档

---

## 🚀 部署计划

### 开发环境
```bash
# 1. 拉取代码
git pull origin main

# 2. 运行迁移
cd backend && go run main.go

# 3. 验证迁移
psql -c "\d requirements"

# 4. 测试导入
export API_TOKEN="..."
python3 scripts/import_requirements_from_csv.py \
  /Users/johnqiu/Desktop/团购系统需求记录.csv --dry-run
```

### 生产环境
```bash
# 1. 备份数据库
pg_dump ai_project_db > backup_$(date +%Y%m%d).sql

# 2. 执行迁移
# (后端启动时自动执行)

# 3. 验证功能
# 先导入1条测试数据

# 4. 正式导入
# 导入全部76条

# 5. 验证数据
psql -c "SELECT COUNT(*) FROM requirements WHERE project_id=156"
```

---

## 💡 优化建议

### 短期优化
1. **批量插入**: 改为批量API调用，提升导入速度
2. **重复检查**: 导入前检查标题重复
3. **增量导入**: 支持CSV更新后的增量同步
4. **错误恢复**: 导入失败自动回滚

### 长期优化
1. **通用导入框架**: 支持多种CSV模板
2. **导入历史**: 记录每次导入的日志
3. **数据校验**: 更严格的数据验证
4. **前端导入**: 网页界面上传CSV导入
5. **导出功能**: 需求导出为CSV
6. **模板管理**: 支持自定义字段模板

---

## 📞 联系方式

**开发负责人**: AI开发团队
**技术支持**: 参考文档或提Issue

---

## 附录

### A. 完整字段映射表

见 `docs/CSV_FIELD_MAPPING.md`

### B. 状态枚举说明

```go
const (
    RequirementStatusDraft     = "draft"      // 草稿
    RequirementStatusPending   = "pending"    // 待评审
    RequirementStatusReviewing = "reviewing"  // 评审中
    RequirementStatusNeedMore  = "need_more"  // 待补充
    RequirementStatusApproved  = "approved"   // 已通过
    RequirementStatusRejected  = "rejected"   // 已拒绝
    RequirementStatusConverted = "converted"  // 已转任务
    RequirementStatusArchived  = "archived"   // 已归档
)
```

### C. custom_fields示例

```json
{
  "serial_number": "3",
  "system_name": "酷采团购系统",
  "module_name": "订单管理",
  "progress_points": "占单转系统订单",
  "progress_detail": "7月2日：占单时效性设置...",
  "progress_summary": "10月23日：会议确认...",
  "delay_reason": "原计划上线时间为3月7日...",
  "meeting_notes": "占单转订单3.8下午会议...",
  "internal_test_date": "11月4日",
  "business_lead": "李婷婷",
  "technical_lead": ""
}
```

---

**文档版本**: v1.0
**创建日期**: 2025-11-12
**最后更新**: 2025-11-12
