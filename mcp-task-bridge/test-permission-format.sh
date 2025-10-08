#!/bin/bash
# 测试后端实际使用哪种权限格式

API_BASE="http://152.136.104.251:8080/api/v1"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   测试后端实际使用的权限格式                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo

# 获取新的token
echo "1. 获取admin token..."
TOKEN=$(curl -s -X POST "$API_BASE/auth/dev-quick-login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin"}' | python3 -c 'import sys, json; print(json.load(sys.stdin)["data"]["access_token"])')

echo "Token: ${TOKEN:0:50}..."
echo

# 测试1: 清除admin所有下划线格式权限,看是否还能访问
echo "2. 测试当前访问状态..."
echo "   测试任务列表:"
RESULT=$(curl -s -X GET "$API_BASE/tasks?limit=1" -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo $RESULT | python3 -c 'import sys, json; print(json.load(sys.stdin).get("success", False))')
echo "   结果: $SUCCESS"

if [ "$SUCCESS" = "True" ]; then
    echo "   ✅ 可以访问(当前有权限)"
else
    echo "   ❌ 无法访问(缺少权限)"
fi
echo

echo "3. 分析数据库中admin的权限..."
ssh ubuntu@152.136.104.251 "docker exec -i \$(docker ps -q --filter 'name=postgres') psql -U app_user -d new_ai_proj_prod" << 'EOSQL'
\echo '=== Admin角色的所有权限 ==='
SELECT 
    CASE 
        WHEN p.permission_code LIKE '%\_%' ESCAPE '\' THEN '下划线(_)'
        WHEN p.permission_code LIKE '%.%' THEN '点号(.)'
        WHEN p.permission_code LIKE '%:%' THEN '冒号(:)'
        ELSE '其他'
    END as 格式,
    COUNT(*) as 数量
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
JOIN company_roles r ON rp.role_id = r.id
WHERE r.role_code = 'admin' AND rp.is_granted = true
GROUP BY 
    CASE 
        WHEN p.permission_code LIKE '%\_%' ESCAPE '\' THEN '下划线(_)'
        WHEN p.permission_code LIKE '%.%' THEN '点号(.)'
        WHEN p.permission_code LIKE '%:%' THEN '冒号(:)'
        ELSE '其他'
    END
ORDER BY 数量 DESC;

\echo ''
\echo '=== Task相关权限详情 ==='
SELECT p.permission_code, 
    CASE 
        WHEN p.permission_code LIKE '%\_%' ESCAPE '\' THEN '下划线'
        WHEN p.permission_code LIKE '%.%' THEN '点号'
        WHEN p.permission_code LIKE '%:%' THEN '冒号'
    END as 格式
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id  
JOIN company_roles r ON rp.role_id = r.id
WHERE r.role_code = 'admin' 
  AND rp.is_granted = true
  AND (p.permission_code LIKE '%task%' OR p.permission_code LIKE '%project%')
ORDER BY p.permission_code;
EOSQL

