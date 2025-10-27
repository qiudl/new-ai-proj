#!/bin/bash

# 测试企业用户权限修复
# 验证huangcong用户权限是否正确,以及CreateEnterpriseUser是否正常工作

set -e

echo "======================================"
echo "企业用户权限修复测试"
echo "======================================"
echo ""

# 数据库连接信息
DB_HOST="127.0.0.1"
DB_PORT="5433"
DB_USER="ai_prod_user"
DB_NAME="ai_project_prod"
export PGPASSWORD='SecureAI2024!@#$%^'

# 测试1: 验证huangcong用户权限
echo "测试1: 验证huangcong用户权限"
echo "-----------------------------------"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    id,
    username,
    user_type,
    role,
    status,
    CASE
        WHEN user_type = 'enterprise' AND role IN ('enterprise_user', 'enterprise_admin') THEN '✅ 正确'
        ELSE '❌ 错误'
    END as validation
FROM users
WHERE username = 'huangcong';
"
echo ""

# 测试2: 验证enterprise_users关联
echo "测试2: 验证enterprise_users关联"
echo "-----------------------------------"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    eu.id,
    eu.user_id,
    u.username,
    u.user_type,
    u.role,
    eu.enterprise_id,
    e.name as enterprise_name,
    eu.access_level
FROM enterprise_users eu
LEFT JOIN users u ON eu.user_id = u.id
LEFT JOIN enterprises e ON eu.enterprise_id = e.id
WHERE u.username = 'huangcong';
"
echo ""

# 测试3: 检查是否还有其他system admin用户(可能的安全问题)
echo "测试3: 检查可疑的system admin用户"
echo "-----------------------------------"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    u.id,
    u.username,
    u.email,
    u.user_type,
    u.role,
    eu.enterprise_id,
    CASE
        WHEN u.user_type = 'system' AND u.role = 'admin' AND eu.id IS NOT NULL
        THEN '⚠️  警告: 企业用户拥有系统管理员权限'
        ELSE '✅ 正常'
    END as security_check
FROM users u
LEFT JOIN enterprise_users eu ON u.id = eu.user_id
WHERE u.user_type = 'system'
    AND u.role = 'admin'
    AND u.deleted_at IS NULL;
"
echo ""

# 测试4: 验证数据库约束
echo "测试4: 验证数据库约束"
echo "-----------------------------------"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
    con.conname AS constraint_name,
    CASE
        WHEN pg_get_constraintdef(con.oid) LIKE '%enterprise%' THEN '✅ 支持enterprise'
        ELSE '❌ 不支持enterprise'
    END as enterprise_support
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'users'
    AND con.contype = 'c'
    AND con.conname IN ('users_user_type_check', 'users_role_check', 'users_company_association_check');
"
echo ""

# 测试5: 测试创建新企业用户 (需要后端服务运行)
echo "测试5: 测试创建新企业用户API"
echo "-----------------------------------"

# 获取token
TOKEN=$(curl -s http://localhost:8080/api/v1/auth/dev-quick-login -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
    echo "⚠️  无法获取token,跳过API测试"
else
    echo "尝试创建测试用户..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/v1/enterprises/17/users" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"test_enterprise_user_$(date +%s)\",
            \"email\": \"test$(date +%s)@test.com\",
            \"name\": \"测试企业用户\",
            \"access_level\": 2
        }" 2>/dev/null)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        echo "✅ 创建成功"
        echo "响应: $BODY"

        # 验证新创建的用户
        NEW_USERNAME=$(echo "$BODY" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$NEW_USERNAME" ]; then
            echo ""
            echo "验证新用户权限:"
            psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
            SELECT
                id, username, user_type, role,
                CASE
                    WHEN user_type = 'enterprise' AND role = 'enterprise_user' THEN '✅ 正确'
                    ELSE '❌ 错误'
                END as validation
            FROM users
            WHERE username = '$NEW_USERNAME';
            "
        fi
    else
        echo "❌ 创建失败 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
    fi
fi

echo ""
echo "======================================"
echo "测试完成"
echo "======================================"
