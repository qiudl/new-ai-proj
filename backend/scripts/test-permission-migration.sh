#!/bin/bash

# 团队笔记权限迁移测试脚本
# 用于测试和验证权限系统迁移

echo "=========================================="
echo "🚀 开始执行团队笔记权限迁移"
echo "=========================================="

# 数据库连接信息
DB_HOST="127.0.0.1"
DB_PORT="5433"
DB_USER="ai_prod_user"
DB_NAME="ai_project_prod"
export PGPASSWORD='SecureAI2024!@#$%^'

MIGRATION_FILE="migrations/20251027_01_add_team_folder_permissions.sql"

echo ""
echo "📁 迁移文件: $MIGRATION_FILE"
echo "🗄️  目标数据库: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""

# 检查迁移文件是否存在
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ 错误: 迁移文件不存在: $MIGRATION_FILE"
    exit 1
fi

echo "步骤 1: 检查数据库连接..."
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

echo ""
echo "步骤 2: 执行迁移文件..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE

if [ $? -eq 0 ]; then
    echo "✅ 迁移执行成功"
else
    echo "❌ 迁移执行失败"
    exit 1
fi

echo ""
echo "步骤 3: 验证权限定义..."
PERMISSION_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM permissions WHERE permission_code LIKE 'team_work_note%';
")

echo "   新增权限数量: $PERMISSION_COUNT (预期: 6)"

if [ "$PERMISSION_COUNT" -ge "6" ]; then
    echo "✅ 权限定义验证通过"
else
    echo "⚠️  警告: 权限定义数量不足"
fi

echo ""
echo "步骤 4: 测试SQL函数..."

# 测试 is_enterprise_admin
echo "   测试 is_enterprise_admin(1)..."
ADMIN_TEST=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT is_enterprise_admin(1);
")
echo "   结果: $ADMIN_TEST (预期: t)"

# 测试 can_create_team_note
echo "   测试 can_create_team_note(1)..."
NOTE_TEST=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT can_create_team_note(1);
")
echo "   结果: $NOTE_TEST (预期: t)"

# 测试 can_manage_team_folder
echo "   测试 can_manage_team_folder(1, NULL, 'create')..."
FOLDER_TEST=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT can_manage_team_folder(1, NULL, 'create');
")
echo "   结果: $FOLDER_TEST (预期: t)"

echo ""
echo "步骤 5: 查看权限概览视图..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT
        user_id,
        username,
        is_admin,
        can_publish_team_notes,
        team_note_role
    FROM v_user_work_note_permissions
    WHERE user_id IN (1, 112)
    ORDER BY user_id;
"

echo ""
echo "步骤 6: 统计信息..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT
        COUNT(DISTINCT eu.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN eu.access_level >= 4 OR eu.can_make_decisions THEN eu.user_id END) as admin_count,
        COUNT(DISTINCT CASE WHEN eu.status = 'active' THEN eu.user_id END) as active_members
    FROM enterprise_users eu
    WHERE eu.deleted_at IS NULL;
"

echo ""
echo "=========================================="
echo "🎉 团队笔记权限迁移测试完成！"
echo "=========================================="

unset PGPASSWORD
