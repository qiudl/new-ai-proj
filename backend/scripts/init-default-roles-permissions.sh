#!/bin/bash

# 初始化默认角色和权限
# 此脚本创建系统预定义的12个角色及其关联权限

set -e

# 获取token
echo "📝 正在获取登录token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 获取token失败"
  echo "$TOKEN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Token获取成功"

# 创建角色的函数
create_role() {
  local role_code=$1
  local role_name=$2
  local role_description=$3
  local permissions=$4

  echo ""
  echo "📌 创建角色: $role_name ($role_code)"

  # 创建角色
  ROLE_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/roles \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"role_code\": \"$role_code\",
      \"role_name\": \"$role_name\",
      \"role_description\": \"$role_description\",
      \"permission_codes\": $permissions
    }")

  SUCCESS=$(echo "$ROLE_RESPONSE" | jq -r '.success')

  if [ "$SUCCESS" = "true" ]; then
    ROLE_ID=$(echo "$ROLE_RESPONSE" | jq -r '.data.id')
    echo "  ✅ 角色创建成功 (ID: $ROLE_ID)"
    PERM_COUNT=$(echo "$permissions" | jq 'length')
    echo "  📋 已分配 $PERM_COUNT 个权限"
  else
    ERROR=$(echo "$ROLE_RESPONSE" | jq -r '.error')
    echo "  ⚠️  $ERROR"
  fi
}

echo ""
echo "======================================"
echo "🚀 开始初始化默认角色和权限体系"
echo "======================================"

# ======================
# 系统角色 (6个)
# ======================

echo ""
echo "=== 系统角色 ==="

# 1. 超级管理员 - 完全权限
create_role \
  "SYSTEM_SUPER_ADMIN" \
  "超级管理员" \
  "系统最高权限用户，拥有所有功能的完全访问权限" \
  '[
    "system.admin", "system.config", "system.audit", "system.audit_logs.read", "system.settings.read", "system.settings.manage",
    "api.admin", "api.keys.create", "api.keys.read", "api.keys.update", "api.keys.delete", "api.logs.read", "api.quota.read",
    "user.create", "user.read", "user.update", "user.delete",
    "company.info.read", "company.info.update", "company.users.create", "company.users.read", "company.users.update", "company.users.delete", "company.roles.manage",
    "project.list.read", "project.detail.read", "project.create", "project.update", "project.delete", "project.members.manage", "project.read", "project:read", "project:list",
    "task.list.read", "task.detail.read", "task.create", "task.update", "task.delete", "task.assign", "task.read", "task:read", "task:create", "task:write", "task:status",
    "document:read", "document:create", "document:write", "document:attach",
    "finance.contracts.read", "finance.contracts.manage", "finance.reports.read",
    "work_note.create", "work_note.read", "work_note.update", "work_note.delete",
    "team_work_note_folder_create", "team_work_note_folder_update", "team_work_note_folder_delete",
    "team_work_note_create", "team_work_note_update", "team_work_note_delete",
    "timer:manage", "timer.start", "timer.stop", "timer.view",
    "daily_focus:manage",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 2. 开发工程师 - 技术开发和系统管理
create_role \
  "SYSTEM_DEVELOPER" \
  "开发工程师" \
  "负责系统开发、技术支持和系统维护" \
  '[
    "system.audit_logs.read", "system.settings.read",
    "api.keys.read", "api.logs.read", "api.quota.read",
    "user.read", "user.update",
    "company.info.read", "company.users.read",
    "project.list.read", "project.detail.read", "project.create", "project.update", "project.read", "project:read", "project:list",
    "task.list.read", "task.detail.read", "task.create", "task.update", "task.delete", "task.read", "task:read", "task:create", "task:write", "task:status",
    "document:read", "document:create", "document:write", "document:attach",
    "work_note.create", "work_note.read", "work_note.update", "work_note.delete",
    "team_work_note_create", "team_work_note_update", "team_work_note_delete",
    "timer:manage", "timer.start", "timer.stop", "timer.view",
    "daily_focus:manage",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 3. 运维工程师 - 系统运维和监控
create_role \
  "SYSTEM_OPERATOR" \
  "运维工程师" \
  "负责系统运维、监控和日常维护" \
  '[
    "system.config", "system.audit", "system.audit_logs.read", "system.settings.read",
    "api.logs.read", "api.quota.read",
    "user.read",
    "company.info.read", "company.users.read",
    "project.list.read", "project.detail.read", "project.read", "project:read", "project:list",
    "task.list.read", "task.detail.read", "task.read", "task:read",
    "document:read",
    "work_note.read",
    "timer.view",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 4. 数据分析师 - 数据查看和分析
create_role \
  "SYSTEM_ANALYST" \
  "数据分析师" \
  "负责数据分析、报表生成和业务洞察" \
  '[
    "system.audit_logs.read",
    "user.read",
    "company.info.read", "company.users.read",
    "project.list.read", "project.detail.read", "project.read", "project:read", "project:list",
    "task.list.read", "task.detail.read", "task.read", "task:read",
    "document:read",
    "finance.contracts.read", "finance.reports.read",
    "work_note.read",
    "timer.view",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 5. 审计员 - 审计日志查看
create_role \
  "SYSTEM_AUDITOR" \
  "审计员" \
  "负责系统审计、合规检查和日志查看" \
  '[
    "system.audit", "system.audit_logs.read", "system.settings.read",
    "user.read",
    "company.info.read", "company.users.read",
    "project.list.read", "project.detail.read", "project.read",
    "task.list.read", "task.detail.read", "task.read",
    "finance.contracts.read", "finance.reports.read",
    "dashboard.read", "profile.read", "profile.update", "password.change"
  ]'

# 6. 客服支持 - 基础支持
create_role \
  "SYSTEM_SUPPORT" \
  "客服支持" \
  "负责用户支持、问题解答和基础服务" \
  '[
    "user.read",
    "company.info.read", "company.users.read",
    "project.list.read", "project.detail.read", "project.read",
    "task.list.read", "task.detail.read", "task.read",
    "document:read",
    "work_note.read",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own"
  ]'

# ======================
# 企业角色 (6个)
# ======================

echo ""
echo "=== 企业角色 ==="

# 1. 企业管理员 - 企业完全管理
create_role \
  "ENTERPRISE_ADMIN" \
  "企业管理员" \
  "企业最高权限用户，管理企业内所有资源和用户" \
  '[
    "user.create", "user.read", "user.update", "user.delete",
    "company.info.read", "company.info.update", "company.users.create", "company.users.read", "company.users.update", "company.users.delete", "company.roles.manage",
    "project.list.read", "project.detail.read", "project.create", "project.update", "project.delete", "project.members.manage", "project.read", "project:read", "project:list",
    "task.list.read", "task.detail.read", "task.create", "task.update", "task.delete", "task.assign", "task.read", "task:read", "task:create", "task:write", "task:status",
    "document:read", "document:create", "document:write", "document:attach",
    "finance.contracts.read", "finance.contracts.manage", "finance.reports.read",
    "work_note.create", "work_note.read", "work_note.update", "work_note.delete",
    "team_work_note_folder_create", "team_work_note_folder_update", "team_work_note_folder_delete",
    "team_work_note_create", "team_work_note_update", "team_work_note_delete",
    "timer:manage", "timer.start", "timer.stop", "timer.view",
    "daily_focus:manage",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 2. 企业经理 - 项目和团队管理
create_role \
  "ENTERPRISE_MANAGER" \
  "企业经理" \
  "管理企业项目、任务和团队成员" \
  '[
    "user.read", "user.update",
    "company.info.read", "company.users.read", "company.users.update",
    "project.list.read", "project.detail.read", "project.create", "project.update", "project.members.manage", "project.read", "project:read", "project:list",
    "task.list.read", "task.detail.read", "task.create", "task.update", "task.delete", "task.assign", "task.read", "task:read", "task:create", "task:write", "task:status",
    "document:read", "document:create", "document:write", "document:attach",
    "finance.contracts.read", "finance.reports.read",
    "work_note.create", "work_note.read", "work_note.update", "work_note.delete",
    "team_work_note_create", "team_work_note_update", "team_work_note_delete",
    "timer:manage", "timer.start", "timer.stop", "timer.view",
    "daily_focus:manage",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 3. 项目经理 - 项目管理
create_role \
  "ENTERPRISE_PM" \
  "项目经理" \
  "负责项目计划、执行和团队协调" \
  '[
    "user.read",
    "company.info.read", "company.users.read",
    "project.list.read", "project.detail.read", "project.create", "project.update", "project.members.manage", "project.read", "project:read", "project:list",
    "task.list.read", "task.detail.read", "task.create", "task.update", "task.delete", "task.assign", "task.read", "task:read", "task:create", "task:write", "task:status",
    "document:read", "document:create", "document:write", "document:attach",
    "work_note.create", "work_note.read", "work_note.update", "work_note.delete",
    "team_work_note_create", "team_work_note_update", "team_work_note_delete",
    "timer.start", "timer.stop", "timer.view",
    "daily_focus:manage",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 4. 开发人员 - 任务执行
create_role \
  "ENTERPRISE_DEVELOPER" \
  "开发人员" \
  "执行开发任务、编写代码和技术文档" \
  '[
    "user.read",
    "company.info.read",
    "project.list.read", "project.detail.read", "project.read", "project:read",
    "task.list.read", "task.detail.read", "task.create", "task.update", "task.read", "task:read", "task:create", "task:write", "task:status",
    "document:read", "document:create", "document:write", "document:attach",
    "work_note.create", "work_note.read", "work_note.update", "work_note.delete",
    "team_work_note_create", "team_work_note_update",
    "timer.start", "timer.stop", "timer.view",
    "daily_focus:manage",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 5. 普通用户 - 基础操作
create_role \
  "ENTERPRISE_USER" \
  "普通用户" \
  "企业普通成员，执行基本任务和查看信息" \
  '[
    "company.info.read",
    "project.list.read", "project.detail.read", "project.read", "project:read",
    "task.list.read", "task.detail.read", "task.update", "task.read", "task:write", "task:status",
    "document:read", "document:create",
    "work_note.create", "work_note.read", "work_note.update", "work_note.delete",
    "team_work_note_create",
    "timer.start", "timer.stop", "timer.view",
    "dashboard.read", "profile.read", "profile.update", "password.change", "stats.view.own",
    "enterprise.project.read", "enterprise.task.read"
  ]'

# 6. 访客 - 只读权限
create_role \
  "ENTERPRISE_GUEST" \
  "访客" \
  "临时访客，仅可查看授权的信息" \
  '[
    "company.info.read",
    "project.list.read", "project.detail.read", "project.read",
    "task.list.read", "task.detail.read", "task.read",
    "document:read",
    "work_note.read",
    "dashboard.read", "profile.read", "profile.update", "password.change",
    "enterprise.project.read", "enterprise.task.read"
  ]'

echo ""
echo "======================================"
echo "✅ 默认角色和权限初始化完成！"
echo "======================================"
echo ""
echo "📊 创建的角色统计："
echo "  • 系统角色: 6个"
echo "    - SYSTEM_SUPER_ADMIN (超级管理员)"
echo "    - SYSTEM_DEVELOPER (开发工程师)"
echo "    - SYSTEM_OPERATOR (运维工程师)"
echo "    - SYSTEM_ANALYST (数据分析师)"
echo "    - SYSTEM_AUDITOR (审计员)"
echo "    - SYSTEM_SUPPORT (客服支持)"
echo ""
echo "  • 企业角色: 6个"
echo "    - ENTERPRISE_ADMIN (企业管理员)"
echo "    - ENTERPRISE_MANAGER (企业经理)"
echo "    - ENTERPRISE_PM (项目经理)"
echo "    - ENTERPRISE_DEVELOPER (开发人员)"
echo "    - ENTERPRISE_USER (普通用户)"
echo "    - ENTERPRISE_GUEST (访客)"
echo ""
echo "  • 总计: 12个角色"
echo ""
echo "💡 提示："
echo "  • 访问 http://localhost:3000/admin/roles 查看角色列表"
echo "  • 系统角色为系统预定义角色"
echo "  • 企业角色可根据需求修改权限"
echo "  • 可在角色管理页面查看详细的权限分配"
echo ""
