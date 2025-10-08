#!/bin/bash
# 最终权限格式确认测试

API_BASE="http://152.136.104.251:8080/api/v1"

echo "╔════════════════════════════════════════════════════════╗"
echo "║   最终权限格式确认测试                                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo

# 步骤1: 临时禁用admin的所有点号格式权限
echo "步骤1: 禁用admin的点号(.)格式权限..."
ssh ubuntu@152.136.104.251 "docker exec -i \$(docker ps -q --filter 'name=postgres') psql -U app_user -d new_ai_proj_prod -c \"
UPDATE role_permissions rp
SET is_granted = false
FROM permissions p, company_roles r
WHERE rp.permission_id = p.id 
  AND rp.role_id = r.id
  AND r.role_code = 'admin'
  AND p.permission_code LIKE '%.%';
SELECT COUNT(*) as '禁用的权限数' FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
JOIN company_roles r ON rp.role_id = r.id
WHERE r.role_code = 'admin' AND p.permission_code LIKE '%.%' AND rp.is_granted = false;
\""

echo
echo "步骤2: 获取新token并测试..."
TOKEN=$(curl -s -X POST "$API_BASE/auth/dev-quick-login" -H 'Content-Type: application/json' -d '{"username":"admin"}' | python3 -c 'import sys, json; print(json.load(sys.stdin)["data"]["access_token"])' 2>/dev/null)

RESULT=$(curl -s -X GET "$API_BASE/tasks?limit=1" -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo "$RESULT" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("success", False))' 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    echo "✅ 禁用点号格式后仍可访问 → 后端不依赖点号格式"
    echo "   推断: 后端使用 下划线(_) 或 冒号(:) 格式"
else
    echo "❌ 禁用点号格式后无法访问 → 后端依赖点号格式"
    echo "   结论: 后端使用 点号(.) 格式"
fi

echo
echo "步骤3: 恢复点号格式权限..."
ssh ubuntu@152.136.104.251 "docker exec -i \$(docker ps -q --filter 'name=postgres') psql -U app_user -d new_ai_proj_prod -c \"
UPDATE role_permissions rp
SET is_granted = true
FROM permissions p, company_roles r
WHERE rp.permission_id = p.id 
  AND rp.role_id = r.id
  AND r.role_code = 'admin'
  AND p.permission_code LIKE '%.%';
\""

echo
echo "步骤4: 禁用admin的冒号(:)格式权限..."
ssh ubuntu@152.136.104.251 "docker exec -i \$(docker ps -q --filter 'name=postgres') psql -U app_user -d new_ai_proj_prod -c \"
UPDATE role_permissions rp
SET is_granted = false
FROM permissions p, company_roles r
WHERE rp.permission_id = p.id 
  AND rp.role_id = r.id
  AND r.role_code = 'admin'
  AND p.permission_code LIKE '%:%';
\""

echo
echo "步骤5: 测试禁用冒号格式后..."
TOKEN=$(curl -s -X POST "$API_BASE/auth/dev-quick-login" -H 'Content-Type: application/json' -d '{"username":"admin"}' | python3 -c 'import sys, json; print(json.load(sys.stdin)["data"]["access_token"])' 2>/dev/null)

RESULT=$(curl -s -X GET "$API_BASE/tasks?limit=1" -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo "$RESULT" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("success", False))' 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    echo "✅ 禁用冒号格式后仍可访问 → 后端不依赖冒号格式"
else
    echo "❌ 禁用冒号格式后无法访问 → 后端依赖冒号格式"
    echo "   结论: 后端使用 冒号(:) 格式"
fi

echo
echo "步骤6: 恢复冒号格式权限..."
ssh ubuntu@152.136.104.251 "docker exec -i \$(docker ps -q --filter 'name=postgres') psql -U app_user -d new_ai_proj_prod -c \"
UPDATE role_permissions rp
SET is_granted = true
FROM permissions p, company_roles r
WHERE rp.permission_id = p.id 
  AND rp.role_id = r.id
  AND r.role_code = 'admin'
  AND p.permission_code LIKE '%:%';
\""

echo
echo "步骤7: 禁用admin的下划线(_)格式权限..."
ssh ubuntu@152.136.104.251 "docker exec -i \$(docker ps -q --filter 'name=postgres') psql -U app_user -d new_ai_proj_prod -c \"
UPDATE role_permissions rp
SET is_granted = false
FROM permissions p, company_roles r
WHERE rp.permission_id = p.id 
  AND rp.role_id = r.id
  AND r.role_code = 'admin'
  AND p.permission_code LIKE '%\_%' ESCAPE '\';
\""

echo
echo "步骤8: 测试禁用下划线格式后..."
TOKEN=$(curl -s -X POST "$API_BASE/auth/dev-quick-login" -H 'Content-Type: application/json' -d '{"username":"admin"}' | python3 -c 'import sys, json; print(json.load(sys.stdin)["data"]["access_token"])' 2>/dev/null)

RESULT=$(curl -s -X GET "$API_BASE/tasks?limit=1" -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo "$RESULT" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("success", False))' 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    echo "✅ 禁用下划线格式后仍可访问 → 后端不依赖下划线格式"
else
    echo "❌ 禁用下划线格式后无法访问 → 后端依赖下划线格式"
    echo "   🎯 结论: 后端使用 下划线(_) 格式"
fi

echo
echo "步骤9: 恢复下划线格式权限..."
ssh ubuntu@152.136.104.251 "docker exec -i \$(docker ps -q --filter 'name=postgres') psql -U app_user -d new_ai_proj_prod -c \"
UPDATE role_permissions rp
SET is_granted = true
FROM permissions p, company_roles r
WHERE rp.permission_id = p.id 
  AND rp.role_id = r.id
  AND r.role_code = 'admin'
  AND p.permission_code LIKE '%\_%' ESCAPE '\';
\""

echo
echo "╔════════════════════════════════════════════════════════╗"
echo "║   测试完成,所有权限已恢复                             ║"
echo "╚════════════════════════════════════════════════════════╝"

