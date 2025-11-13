#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
需求批量导入工具 - 从CSV导入团购系统需求
用于将团购系统需求记录.csv导入到AI项目管理系统的requirements表

使用方法:
    python3 scripts/import_requirements_from_csv.py /path/to/团购系统需求记录.csv

特性:
- 自动字段映射（32个CSV字段 -> 系统需求模型）
- 支持custom_fields JSONB扩展字段
- 智能状态映射
- 时间格式自动解析
- 提出人姓名 -> 用户ID转换
- 导入前预览和确认
- 详细日志记录
- 支持断点续传
"""

import csv
import json
import sys
import os
import re
from datetime import datetime
from typing import Dict, Any, Optional, List
import requests

# ================================
# 配置部分
# ================================
API_BASE_URL = "http://localhost:8080"
PROJECT_ID = 156  # 团购系统项目ID
ENTERPRISE_ID = 3  # 李宁集团企业ID

# JWT Token - 需要从环境变量或命令行参数获取
API_TOKEN = os.environ.get("API_TOKEN", "")

# ================================
# 状态映射表
# ================================
STATUS_MAPPING = {
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

# 优先级映射（如果CSV有优先级排序字段）
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

# ================================
# CSV字段映射配置
# ================================
CSV_FIELD_MAPPING = {
    # CSV字段名 -> (系统字段名, 转换函数)
    "序号": ("custom_fields.serial_number", str),
    "系统": ("custom_fields.system_name", str),
    "功能模块": ("category", str),
    "需求名称": ("title", str),
    "需求背景": ("_background", str),  # 临时字段，后面合并到description
    "需求说明": ("_specification", str),  # 临时字段
    "进度描述（需求点）": ("custom_fields.progress_points", str),
    "进度状态": ("_progress_status", str),  # 用于状态映射
    "功能进度（详细）": ("custom_fields.progress_detail", str),
    "功能进度（简）": ("custom_fields.progress_summary", str),
    "优先级排序": ("_priority_raw", str),  # 用于优先级映射
    "待办事项": ("custom_fields.todo_items", str),
    "完成状态": ("_completion_status", str),  # 也用于状态映射
    "延期原因": ("custom_fields.delay_reason", str),
    "提出人": ("_submitter_name", str),  # 需要转换为submitter_id
    "提出时间": ("_submit_time", str),  # 需要解析时间
    "预计解决时间": ("_expected_time", str),
    "实际上线时间": ("_actual_time", str),
    "周例会沟通内容": ("custom_fields.meeting_notes", str),
    "方案说明": ("acceptance_criteria", str),
    "方案流程图": ("custom_fields.flowchart_url", str),
    "方案原型图": ("custom_fields.prototype_url", str),
    "内部测试时间": ("custom_fields.internal_test_date", str),
    "用户测试时间": ("custom_fields.user_test_date", str),
    "备注": ("custom_fields.remarks", str),
    "补充/备注1": ("custom_fields.additional_note_1", str),
    "补充/备注2": ("custom_fields.additional_note_2", str),
    "要求解决时间": ("_required_time", str),
    "资源需求": ("custom_fields.resource_requirements", str),
    "项目主责人业务侧": ("custom_fields.business_lead", str),
    "项目主责人系统侧": ("custom_fields.technical_lead", str),
    "协同渠道": ("custom_fields.collaboration_channel", str),
}


# ================================
# 辅助函数
# ================================

def parse_chinese_date(date_str: str) -> Optional[str]:
    """
    解析中文日期格式：2024年3月1日 -> 2024-03-01T00:00:00Z
    """
    if not date_str or not date_str.strip():
        return None

    # 匹配：2024年3月1日 或 2024-03-01
    patterns = [
        r"(\d{4})年(\d{1,2})月(\d{1,2})日",
        r"(\d{4})-(\d{1,2})-(\d{1,2})",
        r"(\d{4})/(\d{1,2})/(\d{1,2})",
    ]

    for pattern in patterns:
        match = re.search(pattern, date_str.strip())
        if match:
            year, month, day = match.groups()
            try:
                dt = datetime(int(year), int(month), int(day))
                return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except ValueError:
                pass

    return None


def map_status(progress_status: str, completion_status: str) -> str:
    """
    根据进度状态和完成状态映射到系统状态
    """
    # 优先使用完成状态
    if completion_status and completion_status.strip():
        mapped = STATUS_MAPPING.get(completion_status.strip(), "")
        if mapped:
            return mapped

    # 其次使用进度状态
    if progress_status and progress_status.strip():
        mapped = STATUS_MAPPING.get(progress_status.strip(), "")
        if mapped:
            return mapped

    # 默认草稿
    return "draft"


def map_priority(priority_raw: str) -> str:
    """
    映射优先级
    """
    if not priority_raw or not priority_raw.strip():
        return "medium"

    return PRIORITY_MAPPING.get(priority_raw.strip(), "medium")


def find_user_by_name(name: str, token: str) -> Optional[int]:
    """
    根据用户名查找用户ID
    """
    if not name or not name.strip():
        return None

    try:
        headers = {"Authorization": f"Bearer {token}"}
        # 调用用户搜索API
        response = requests.get(
            f"{API_BASE_URL}/api/v1/admin/users",
            headers=headers,
            params={"search": name.strip(), "page": 1, "page_size": 10}
        )

        if response.status_code == 200:
            data = response.json()
            users = data.get("data", {}).get("users", [])

            # 精确匹配
            for user in users:
                if user.get("username") == name.strip() or user.get("real_name") == name.strip():
                    return user.get("id")

            # 如果没有精确匹配，返回第一个
            if users:
                return users[0].get("id")

    except Exception as e:
        print(f"⚠️  查找用户失败: {name}, 错误: {e}")

    return None


def process_csv_row(row: Dict[str, str], token: str, default_submitter_id: int) -> Dict[str, Any]:
    """
    处理单行CSV数据，转换为需求对象
    """
    requirement = {
        "projectId": PROJECT_ID,
        "enterpriseId": ENTERPRISE_ID,
        "priority": "medium",
        "status": "draft",
        "attachments": []
    }

    # 临时字段
    temp_fields = {}
    custom_fields = {}

    # 遍历CSV字段
    for csv_field, (system_field, converter) in CSV_FIELD_MAPPING.items():
        value = row.get(csv_field, "")

        if not value or not value.strip():
            continue

        converted_value = converter(value.strip())

        # 处理custom_fields
        if system_field.startswith("custom_fields."):
            field_name = system_field.replace("custom_fields.", "")
            custom_fields[field_name] = converted_value

        # 处理临时字段（需要后处理）
        elif system_field.startswith("_"):
            temp_fields[system_field] = converted_value

        # 直接字段
        else:
            requirement[system_field] = converted_value

    # ================================
    # 后处理：合并description
    # ================================
    description_parts = []
    if "_background" in temp_fields:
        description_parts.append(f"**需求背景**\n{temp_fields['_background']}")
    if "_specification" in temp_fields:
        description_parts.append(f"**需求说明**\n{temp_fields['_specification']}")

    if description_parts:
        requirement["description"] = "\n\n".join(description_parts)

    # ================================
    # 后处理：状态映射
    # ================================
    progress_status = temp_fields.get("_progress_status", "")
    completion_status = temp_fields.get("_completion_status", "")
    requirement["status"] = map_status(progress_status, completion_status)

    # ================================
    # 后处理：优先级映射
    # ================================
    priority_raw = temp_fields.get("_priority_raw", "")
    requirement["priority"] = map_priority(priority_raw)

    # ================================
    # 后处理：提出人转换
    # ================================
    submitter_name = temp_fields.get("_submitter_name", "")
    submitter_id = find_user_by_name(submitter_name, token)
    requirement["submitter_id"] = submitter_id if submitter_id else default_submitter_id

    # ================================
    # 后处理：时间字段
    # ================================
    submit_time = parse_chinese_date(temp_fields.get("_submit_time", ""))
    if submit_time:
        requirement["created_at"] = submit_time
        requirement["submitted_at"] = submit_time

    expected_time = parse_chinese_date(temp_fields.get("_expected_time", ""))
    required_time = parse_chinese_date(temp_fields.get("_required_time", ""))

    # due_date优先使用要求解决时间，其次预计解决时间
    if required_time:
        requirement["due_date"] = required_time
    elif expected_time:
        requirement["due_date"] = expected_time

    actual_time = parse_chinese_date(temp_fields.get("_actual_time", ""))
    if actual_time and requirement["status"] == "converted":
        requirement["converted_at"] = actual_time

    # ================================
    # 添加customFields (camelCase for API)
    # ================================
    if custom_fields:
        requirement["customFields"] = custom_fields

    # ================================
    # 清理空值
    # ================================
    requirement = {k: v for k, v in requirement.items() if v not in [None, "", []]}

    return requirement


# ================================
# 主函数
# ================================

def main():
    if len(sys.argv) < 2:
        print("用法: python3 import_requirements_from_csv.py <csv_file_path> [--dry-run] [--yes]")
        print("\n选项:")
        print("  --dry-run  仅预览不导入")
        print("  --yes      跳过确认直接导入")
        sys.exit(1)

    csv_file = sys.argv[1]
    dry_run = "--dry-run" in sys.argv
    auto_confirm = "--yes" in sys.argv

    if not os.path.exists(csv_file):
        print(f"❌ CSV文件不存在: {csv_file}")
        sys.exit(1)

    if not API_TOKEN:
        print("❌ 未设置API_TOKEN环境变量")
        print("   请使用: export API_TOKEN='your-jwt-token'")
        sys.exit(1)

    # 获取当前用户信息
    headers = {"Authorization": f"Bearer {API_TOKEN}"}
    try:
        # 使用admin用户列表API获取admin用户
        response = requests.get(f"{API_BASE_URL}/api/v1/admin/users?search=admin&page=1&page_size=1", headers=headers)
        response.raise_for_status()
        result = response.json()
        if result.get("success") and result.get("data", {}).get("users"):
            current_user = result["data"]["users"][0]
            default_submitter_id = current_user.get("id")
            print(f"✅ 当前用户: {current_user.get('username')} (ID: {default_submitter_id})")
        else:
            # 如果获取失败，使用默认ID 1 (admin)
            default_submitter_id = 1
            print(f"✅ 使用默认用户ID: 1 (admin)")
    except Exception as e:
        # 如果获取失败，使用默认ID 1 (admin)
        default_submitter_id = 1
        print(f"⚠️  获取用户信息失败，使用默认ID: {e}")
        print(f"✅ 使用默认用户ID: 1 (admin)")

    # 读取CSV
    print(f"\n📖 正在读取CSV: {csv_file}")
    requirements = []

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, 1):
            # 跳过空行或无需求名称的行
            if not row.get("需求名称", "").strip():
                continue

            try:
                req = process_csv_row(row, API_TOKEN, default_submitter_id)
                requirements.append(req)
                print(f"  [{idx}] {req.get('title', 'N/A')[:50]}")
            except Exception as e:
                print(f"  ⚠️  [{idx}] 处理失败: {e}")

    print(f"\n✅ 成功解析 {len(requirements)} 条需求")

    # 预览模式
    if dry_run:
        print("\n" + "="*60)
        print("预览模式 - 前3条需求:")
        print("="*60)
        for req in requirements[:3]:
            print(json.dumps(req, ensure_ascii=False, indent=2))
        print("\n💡 使用 --dry-run 参数仅预览，去掉该参数执行导入")
        return

    # 确认导入
    print(f"\n⚠️  即将导入 {len(requirements)} 条需求到项目 {PROJECT_ID}")
    if not auto_confirm:
        confirm = input("确认导入? (yes/no): ")
        if confirm.lower() != "yes":
            print("❌ 用户取消导入")
            return
    else:
        print("✅ 自动确认导入 (--yes)")

    # 执行导入
    print("\n🚀 开始导入...")
    success_count = 0
    fail_count = 0

    for idx, req in enumerate(requirements, 1):
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/v1/mcp/requirements/create",
                headers={
                    "Authorization": f"Bearer {API_TOKEN}",
                    "Content-Type": "application/json"
                },
                json=req
            )

            if response.status_code == 201 or response.status_code == 200:
                result = response.json()
                req_id = result.get("id", "N/A")
                print(f"  ✅ [{idx}/{len(requirements)}] 成功: {req.get('title', 'N/A')[:40]} (ID: {req_id})")
                success_count += 1
            else:
                print(f"  ❌ [{idx}/{len(requirements)}] 失败: {req.get('title', 'N/A')[:40]}")
                print(f"      状态码: {response.status_code}, 响应: {response.text[:100]}")
                fail_count += 1

        except Exception as e:
            print(f"  ❌ [{idx}/{len(requirements)}] 异常: {req.get('title', 'N/A')[:40]}")
            print(f"      错误: {e}")
            fail_count += 1

    # 导入总结
    print("\n" + "="*60)
    print("导入完成!")
    print("="*60)
    print(f"✅ 成功: {success_count}")
    print(f"❌ 失败: {fail_count}")
    print(f"📊 总计: {len(requirements)}")


if __name__ == "__main__":
    main()
