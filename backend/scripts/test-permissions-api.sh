#!/bin/bash

# Permission API Routes Testing Script
# 检查和验证permissions相关API路由

echo "=== 权限API路由测试脚本 ==="
echo "测试时间: $(date)"
echo

# 基础配置
API_BASE="http://localhost:8080/api/v1"
ADMIN_TOKEN="your-admin-token"  # 需要替换为实际的admin token

# 测试权限检查API
echo "1. 测试权限检查API"
echo "POST $API_BASE/permissions/check"
curl -s -X POST "$API_BASE/permissions/check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"permission_code": "project.read", "resource_id": 1}' || echo "权限检查API不可用"
echo

# 测试获取权限列表
echo "2. 测试获取权限列表"
echo "GET $API_BASE/permissions"
curl -s -X GET "$API_BASE/permissions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" || echo "获取权限列表API不可用"
echo

# 测试获取权限模块
echo "3. 测试获取权限模块"
echo "GET $API_BASE/permissions/modules"
curl -s -X GET "$API_BASE/permissions/modules" \
  -H "Authorization: Bearer $ADMIN_TOKEN" || echo "获取权限模块API不可用"
echo

# 测试批量权限检查
echo "4. 测试批量权限检查"
echo "POST $API_BASE/permissions/check/batch"
curl -s -X POST "$API_BASE/permissions/check/batch" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"company_user_id": 1, "permissions": ["project.read", "task.create"], "resource_id": 1}' || echo "批量权限检查API不可用"
echo

# 测试角色管理API
echo "5. 测试角色管理API"
echo "GET $API_BASE/roles"
curl -s -X GET "$API_BASE/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" || echo "获取角色列表API不可用"
echo

# 测试权限监控API (如果启用)
echo "6. 测试权限监控API"
echo "GET $API_V1/enhanced-permissions/role-templates"
curl -s -X GET "$API_BASE/enhanced-permissions/role-templates" \
  -H "Authorization: Bearer $ADMIN_TOKEN" || echo "获取角色模板API不可用"
echo

# 测试权限审计日志
echo "7. 测试权限审计日志"
echo "GET $API_BASE/permissions/audit-logs"
curl -s -X GET "$API_BASE/permissions/audit-logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" || echo "获取权限审计日志API不可用"
echo

echo "=== 测试完成 ==="
echo "注意：上述测试需要有效的admin token才能成功"
echo "请检查每个API的响应状态来确定是否正常工作"
