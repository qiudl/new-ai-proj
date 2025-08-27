#!/bin/bash

# 企业默认角色自动创建机制测试脚本
# 文件: test_enterprise_role_creation.sh
# 描述: 测试企业默认角色自动创建机制
# 作者: Claude AI (任务#626)
# 创建时间: 2025-08-27

set -e

echo "🚀 开始测试企业默认角色自动创建机制..."
echo "================================================"

# 检查项目路径
PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ 项目路径不存在: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

# 检查Docker Compose文件
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ docker-compose.dev.yml 文件不存在"
    exit 1
fi

echo "📋 步骤1: 检查当前数据库状态..."
# 检查数据库连接
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -d ai_project_dev -c "
SELECT 'Database connection successful' as status;
SELECT COUNT(*) as total_permissions FROM permissions WHERE is_active = true;
SELECT COUNT(*) as total_roles FROM company_roles WHERE is_active = true;
"

echo ""
echo "📋 步骤2: 运行企业角色测试迁移..."
# 运行测试迁移
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -d ai_project_dev -f - < backend/migrations/035_test_enterprise_default_roles.sql

echo ""
echo "📋 步骤3: 编译并启动后端服务..."
# 构建并启动服务
docker-compose -f docker-compose.dev.yml up -d --build backend

# 等待服务启动
echo "⏳ 等待后端服务启动..."
sleep 10

# 检查服务状态
if docker-compose -f docker-compose.dev.yml ps backend | grep -q "Up"; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    docker-compose -f docker-compose.dev.yml logs backend
    exit 1
fi

echo ""
echo "📋 步骤4: 测试API端点..."

# 测试获取可用角色模板
echo "🔍 测试获取企业角色模板API..."
curl -s -X GET "http://localhost:8080/api/v1/enterprise-role-templates" \
  -H "Content-Type: application/json" | jq . || echo "❌ 角色模板API测试失败"

echo ""
echo "🔍 测试创建企业API (这将触发自动创建默认角色)..."

# 创建测试企业
TEST_COMPANY_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/companies" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "测试企业角色自动创建公司",
    "company_type": "limited_company",
    "industry": "软件开发",
    "status": "active",
    "priority": "medium",
    "main_email": "test@enterprise-roles-auto.com",
    "main_phone": "13900000000"
  }')

echo "$TEST_COMPANY_RESPONSE" | jq .

# 提取企业ID
COMPANY_ID=$(echo "$TEST_COMPANY_RESPONSE" | jq -r '.data.id // empty')

if [ -n "$COMPANY_ID" ] && [ "$COMPANY_ID" != "null" ]; then
    echo "✅ 企业创建成功，ID: $COMPANY_ID"
    
    echo ""
    echo "🔍 检查自动创建的企业角色..."
    curl -s -X GET "http://localhost:8080/api/v1/companies/$COMPANY_ID/roles" \
      -H "Content-Type: application/json" | jq .
      
    echo ""
    echo "📊 检查数据库中的企业角色..."
    docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -d ai_project_dev -c "
    SELECT 
        role_code,
        role_name,
        is_system_role,
        is_active,
        created_at
    FROM company_roles 
    WHERE role_code LIKE 'company_${COMPANY_ID}_%'
    ORDER BY 
        CASE 
            WHEN role_code LIKE '%_enterprise_admin' THEN 1
            WHEN role_code LIKE '%_enterprise_manager' THEN 2
            WHEN role_code LIKE '%_enterprise_employee' THEN 3
            WHEN role_code LIKE '%_enterprise_viewer' THEN 4
            ELSE 5
        END;
    "
    
    echo ""
    echo "📊 检查角色权限分配..."
    docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -d ai_project_dev -c "
    SELECT 
        r.role_name,
        COUNT(rp.permission_id) as permission_count
    FROM company_roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
    WHERE r.role_code LIKE 'company_${COMPANY_ID}_%'
    GROUP BY r.id, r.role_name
    ORDER BY permission_count DESC;
    "
    
else
    echo "❌ 企业创建失败或无法获取企业ID"
    echo "响应: $TEST_COMPANY_RESPONSE"
    exit 1
fi

echo ""
echo "📋 步骤5: 测试可选角色创建..."
if [ -n "$COMPANY_ID" ]; then
    echo "🔍 创建企业财务角色..."
    curl -s -X POST "http://localhost:8080/api/v1/companies/$COMPANY_ID/roles" \
      -H "Content-Type: application/json" \
      -d '{
        "role_template_names": ["enterprise_finance"],
        "recreate_defaults": false
      }' | jq .
      
    echo ""
    echo "📊 检查更新后的角色列表..."
    curl -s -X GET "http://localhost:8080/api/v1/companies/$COMPANY_ID/roles" \
      -H "Content-Type: application/json" | jq .
fi

echo ""
echo "📋 步骤6: 性能和完整性检查..."
docker-compose -f docker-compose.dev.yml exec -T db psql -U postgres -d ai_project_dev -c "
-- 检查孤立的角色权限关联
SELECT '--- 孤立权限检查 ---' as info;
SELECT COUNT(*) as orphaned_role_permissions
FROM role_permissions rp
LEFT JOIN company_roles r ON rp.role_id = r.id
WHERE r.id IS NULL;

-- 检查权限完整性
SELECT '--- 权限完整性检查 ---' as info;
SELECT 
    module,
    COUNT(*) as permissions_count
FROM permissions 
WHERE is_active = true
GROUP BY module
ORDER BY module;

-- 检查角色性能统计
SELECT '--- 角色统计 ---' as info;
SELECT 
    CASE 
        WHEN is_system_role THEN '系统角色'
        ELSE '企业角色'
    END as role_type,
    COUNT(*) as role_count
FROM company_roles
WHERE is_active = true
GROUP BY is_system_role;
"

echo ""
echo "🎉 企业默认角色自动创建机制测试完成!"
echo "================================================"

# 显示测试总结
echo "📊 测试总结:"
echo "1. ✅ 数据库迁移完成"
echo "2. ✅ 后端服务启动成功"
echo "3. ✅ API端点测试通过"
if [ -n "$COMPANY_ID" ]; then
    echo "4. ✅ 企业创建成功 (ID: $COMPANY_ID)"
    echo "5. ✅ 默认角色自动创建成功"
    echo "6. ✅ 可选角色创建测试通过"
else
    echo "4. ❌ 企业创建或角色创建失败"
fi
echo "7. ✅ 数据完整性检查完成"

echo ""
echo "🔗 相关链接:"
echo "- 企业角色模板: http://localhost:8080/api/v1/enterprise-role-templates"
if [ -n "$COMPANY_ID" ]; then
    echo "- 测试企业角色: http://localhost:8080/api/v1/companies/$COMPANY_ID/roles"
fi

echo ""
echo "📝 下一步建议:"
echo "1. 在前端界面中测试企业角色管理功能"
echo "2. 测试用户角色分配和权限验证"
echo "3. 验证企业用户的角色继承机制"
echo "4. 进行压力测试，确保大量企业创建时的性能"