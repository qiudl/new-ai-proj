#!/bin/bash

# 数据库种子数据管理脚本
# 文件: seed_database.sh
# 描述: 统一的数据库种子数据初始化和管理脚本
# 任务: #625 - 开发数据库迁移脚本和种子数据
# 创建时间: 2025-08-27

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 帮助信息
show_help() {
    cat << EOF
数据库种子数据管理脚本

用法: $0 [选项] [命令]

命令:
  init              初始化所有种子数据
  permissions       只初始化权限相关数据
  users            只初始化用户测试数据  
  demo             初始化演示数据（项目、任务等）
  reset            重置所有种子数据
  verify           验证种子数据完整性
  backup           备份当前数据
  restore <file>   从备份文件恢复数据

选项:
  -h, --help       显示帮助信息
  -v, --verbose    详细输出模式
  -y, --yes        自动确认所有操作
  --docker         使用Docker环境配置
  --production     生产环境模式（跳过测试数据）

环境变量:
  DB_HOST          数据库主机 (默认: postgres-master)
  DB_PORT          数据库端口 (默认: 5432)
  DB_NAME          数据库名称 (默认: ai_project_db)
  DB_USER          数据库用户 (默认: dev_user)
  DB_PASSWORD      数据库密码 (默认: dev_password_2024)

示例:
  $0 init              # 初始化所有种子数据
  $0 --docker init     # 在Docker环境中初始化
  $0 permissions       # 只初始化权限数据
  $0 backup            # 备份当前数据
  $0 verify            # 验证数据完整性

EOF
}

# 解析命令行参数
VERBOSE=false
AUTO_YES=false
DOCKER_MODE=false
PRODUCTION_MODE=false
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
        --docker)
            DOCKER_MODE=true
            shift
            ;;
        --production)
            PRODUCTION_MODE=true
            shift
            ;;
        init|permissions|users|demo|reset|verify|backup|restore)
            COMMAND=$1
            shift
            ;;
        *)
            if [[ "$1" =~ ^-.* ]]; then
                error "未知选项: $1"
                exit 1
            else
                # 可能是restore命令的文件参数
                if [[ "$COMMAND" == "restore" && -z "$RESTORE_FILE" ]]; then
                    RESTORE_FILE=$1
                else
                    error "未知参数: $1"
                    exit 1
                fi
            fi
            shift
            ;;
    esac
done

# 检查是否提供了命令
if [[ -z "$COMMAND" ]]; then
    error "请提供一个命令"
    show_help
    exit 1
fi

# 配置数据库连接
setup_database_config() {
    if [[ "$DOCKER_MODE" == true ]]; then
        log "使用Docker环境配置"
        export DB_HOST="${DB_HOST:-postgres-master}"
        export DB_PORT="${DB_PORT:-5432}"
    else
        log "使用本地环境配置"
        export DB_HOST="${DB_HOST:-localhost}"
        export DB_PORT="${DB_PORT:-5433}"
    fi
    
    export DB_NAME="${DB_NAME:-ai_project_db}"
    export DB_USER="${DB_USER:-dev_user}"
    export DB_PASSWORD="${DB_PASSWORD:-dev_password_2024}"
    
    export PGHOST="$DB_HOST"
    export PGPORT="$DB_PORT"
    export PGDATABASE="$DB_NAME"
    export PGUSER="$DB_USER"
    export PGPASSWORD="$DB_PASSWORD"
    
    if [[ "$VERBOSE" == true ]]; then
        log "数据库连接配置："
        log "  主机: $DB_HOST:$DB_PORT"
        log "  数据库: $DB_NAME"
        log "  用户: $DB_USER"
    fi
}

# 测试数据库连接
test_connection() {
    log "测试数据库连接..."
    if psql -c "SELECT version();" > /dev/null 2>&1; then
        success "数据库连接成功"
        if [[ "$VERBOSE" == true ]]; then
            psql -c "SELECT version();" | head -1
        fi
    else
        error "数据库连接失败"
        error "请检查连接配置: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
        exit 1
    fi
}

# 确认操作
confirm_action() {
    local message=$1
    if [[ "$AUTO_YES" == true ]]; then
        return 0
    fi
    
    echo -n -e "${YELLOW}$message [y/N]: ${NC}"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# 备份数据
backup_data() {
    log "创建数据备份..."
    
    local backup_file="${SCRIPT_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # 备份核心表数据
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --data-only \
        --inserts \
        -t permissions \
        -t company_roles \
        -t role_permissions \
        -t company_users \
        -t permission_audit_logs \
        -t permission_cache \
        > "$backup_file" 2>/dev/null || {
        
        # 如果pg_dump失败，使用psql导出
        psql -c "\\copy permissions TO '$backup_file.permissions.csv' WITH CSV HEADER;" 2>/dev/null || true
        psql -c "\\copy company_roles TO '$backup_file.roles.csv' WITH CSV HEADER;" 2>/dev/null || true
        psql -c "\\copy role_permissions TO '$backup_file.role_perms.csv' WITH CSV HEADER;" 2>/dev/null || true
        psql -c "\\copy company_users TO '$backup_file.users.csv' WITH CSV HEADER;" 2>/dev/null || true
        
        success "数据已导出为CSV文件: $backup_file.*.csv"
        return 0
    }
    
    success "数据备份完成: $backup_file"
    echo "$backup_file"
}

# 执行权限系统初始化
init_permissions() {
    log "初始化权限系统增强功能..."
    
    local migration_dir="${PROJECT_ROOT}/backend/migrations/034_role_permission_enhancements"
    
    if [[ ! -d "$migration_dir" ]]; then
        error "权限系统迁移目录不存在: $migration_dir"
        return 1
    fi
    
    # 执行权限系统增强迁移
    if [[ -f "$migration_dir/execute_migration.sh" ]]; then
        log "执行权限系统增强迁移..."
        cd "$migration_dir"
        chmod +x execute_migration.sh
        ./execute_migration.sh
        cd "$SCRIPT_DIR"
    else
        # 手动执行迁移文件
        for sql_file in "$migration_dir"/*.sql; do
            if [[ -f "$sql_file" ]]; then
                log "执行: $(basename "$sql_file")"
                psql -f "$sql_file" > /dev/null 2>&1 || {
                    error "执行失败: $(basename "$sql_file")"
                    return 1
                }
            fi
        done
    fi
    
    success "权限系统初始化完成"
}

# 初始化用户测试数据
init_users() {
    log "初始化用户测试数据..."
    
    if [[ "$PRODUCTION_MODE" == true ]]; then
        warning "生产模式：跳过测试用户创建"
        return 0
    fi
    
    # 执行用户数据初始化
    psql << 'EOF'
-- 创建基础测试用户（如果不存在）
INSERT INTO company_users (name, email, password_hash, status, role_id, created_at, updated_at)
SELECT 
    '管理员用户', 'admin@test.local',
    '$2a$10$dummy_hash_admin', 'active',
    (SELECT id FROM company_roles WHERE role_code = 'system_admin' LIMIT 1),
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM company_users WHERE email = 'admin@test.local');

INSERT INTO company_users (name, email, password_hash, status, role_id, created_at, updated_at)
SELECT 
    '开发用户', 'dev@test.local',
    '$2a$10$dummy_hash_dev', 'active',
    (SELECT id FROM company_roles WHERE role_code = 'developer' LIMIT 1),
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM company_users WHERE email = 'dev@test.local');

-- 输出创建结果
SELECT 'Test users created: ' || COUNT(*) FROM company_users WHERE email LIKE '%@test.local';
EOF
    
    success "用户测试数据初始化完成"
}

# 初始化演示数据
init_demo_data() {
    log "初始化演示数据..."
    
    if [[ "$PRODUCTION_MODE" == true ]]; then
        warning "生产模式：跳过演示数据创建"
        return 0
    fi
    
    # 检查并创建演示项目和任务
    psql << 'EOF'
-- 创建演示项目（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        INSERT INTO projects (name, description, status, created_by, created_at, updated_at)
        SELECT 
            '演示项目', '用于测试的演示项目', 'active',
            (SELECT id FROM company_users WHERE email LIKE '%admin%' LIMIT 1),
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = '演示项目');
        
        RAISE NOTICE '演示项目数据已创建';
    ELSE
        RAISE NOTICE 'projects表不存在，跳过项目数据';
    END IF;
END $$;

-- 创建演示任务（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        INSERT INTO tasks (title, description, status, created_by, project_id, created_at, updated_at)
        SELECT 
            '演示任务', '用于测试的演示任务', 'todo',
            (SELECT id FROM company_users WHERE email LIKE '%admin%' LIMIT 1),
            (SELECT id FROM projects WHERE name = '演示项目' LIMIT 1),
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE EXISTS (SELECT 1 FROM projects WHERE name = '演示项目')
          AND NOT EXISTS (SELECT 1 FROM tasks WHERE title = '演示任务');
        
        RAISE NOTICE '演示任务数据已创建';
    ELSE
        RAISE NOTICE 'tasks表不存在，跳过任务数据';
    END IF;
END $$;
EOF
    
    success "演示数据初始化完成"
}

# 重置种子数据
reset_data() {
    log "重置种子数据..."
    
    if ! confirm_action "确定要重置所有种子数据吗？这将删除测试用户和演示数据。"; then
        log "操作已取消"
        return 0
    fi
    
    # 备份现有数据
    local backup_file
    backup_file=$(backup_data)
    
    # 清理测试数据
    psql << 'EOF'
-- 清理测试用户
DELETE FROM company_users WHERE email LIKE '%@test.local' OR email LIKE '%@aiproj.com';

-- 清理权限缓存
TRUNCATE TABLE permission_cache;

-- 清理演示项目和任务（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DELETE FROM tasks WHERE title LIKE '演示%' OR title LIKE '%测试%';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        DELETE FROM projects WHERE name LIKE '演示%' OR name LIKE '%测试%';
    END IF;
END $$;

-- 重置权限分组数据
UPDATE permissions SET permission_group = NULL, metadata = '{}' WHERE is_system = TRUE;

-- 清理新增的权限系统表
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_context_permissions') THEN
        TRUNCATE TABLE user_context_permissions;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_contexts') THEN
        TRUNCATE TABLE permission_contexts;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dynamic_permission_rules') THEN
        TRUNCATE TABLE dynamic_permission_rules;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_hierarchy') THEN
        TRUNCATE TABLE permission_hierarchy;
    END IF;
END $$;

SELECT 'Seed data has been reset' as result;
EOF
    
    success "种子数据已重置"
    success "数据已备份至: $backup_file"
}

# 验证数据完整性
verify_data() {
    log "验证种子数据完整性..."
    
    psql << 'EOF'
-- 数据完整性检查
\set ON_ERROR_STOP on

SELECT '=== 数据完整性检查报告 ===' as report_header;

-- 检查基础权限数据
SELECT 
    'Permissions' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN permission_group IS NOT NULL THEN 1 END) as grouped_count
FROM permissions;

-- 检查角色数据
SELECT 
    'Company Roles' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN is_system_role = true THEN 1 END) as system_roles_count
FROM company_roles;

-- 检查用户数据
SELECT 
    'Users' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN role_id IS NOT NULL THEN 1 END) as assigned_roles_count
FROM company_users;

-- 检查权限分配
SELECT 
    'Role Permissions' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_granted = true THEN 1 END) as granted_count
FROM role_permissions;

-- 检查新增表（如果存在）
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_hierarchy') INTO table_exists;
    IF table_exists THEN
        PERFORM 1 FROM permission_hierarchy LIMIT 1;
        RAISE NOTICE 'Permission Hierarchy: % records', (SELECT COUNT(*) FROM permission_hierarchy);
    END IF;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_contexts') INTO table_exists;
    IF table_exists THEN
        PERFORM 1 FROM permission_contexts LIMIT 1;
        RAISE NOTICE 'Permission Contexts: % records', (SELECT COUNT(*) FROM permission_contexts);
    END IF;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dynamic_permission_rules') INTO table_exists;
    IF table_exists THEN
        PERFORM 1 FROM dynamic_permission_rules LIMIT 1;
        RAISE NOTICE 'Dynamic Rules: % records', (SELECT COUNT(*) FROM dynamic_permission_rules);
    END IF;
END $$;

SELECT '=== 检查完成 ===' as report_footer;
EOF
    
    success "数据完整性验证完成"
}

# 从备份恢复数据
restore_data() {
    local restore_file="$RESTORE_FILE"
    
    if [[ -z "$restore_file" ]]; then
        error "请指定要恢复的备份文件"
        exit 1
    fi
    
    if [[ ! -f "$restore_file" ]]; then
        error "备份文件不存在: $restore_file"
        exit 1
    fi
    
    log "从备份恢复数据: $restore_file"
    
    if ! confirm_action "确定要从备份文件恢复数据吗？这将覆盖现有数据。"; then
        log "操作已取消"
        return 0
    fi
    
    # 创建当前数据备份
    backup_data
    
    # 恢复数据
    if [[ "$restore_file" =~ \.sql$ ]]; then
        psql -f "$restore_file" > /dev/null 2>&1 || {
            error "恢复SQL备份失败"
            return 1
        }
    else
        error "不支持的备份文件格式: $restore_file"
        return 1
    fi
    
    success "数据恢复完成"
}

# 主执行函数
main() {
    log "=== 数据库种子数据管理 ==="
    log "命令: $COMMAND"
    log "模式: $(if [[ "$PRODUCTION_MODE" == true ]]; then echo "生产环境"; else echo "开发环境"; fi)"
    
    # 设置数据库连接
    setup_database_config
    test_connection
    
    # 执行对应命令
    case "$COMMAND" in
        init)
            log "执行完整的种子数据初始化..."
            init_permissions
            init_users
            init_demo_data
            verify_data
            ;;
        permissions)
            init_permissions
            ;;
        users)
            init_users
            ;;
        demo)
            init_demo_data
            ;;
        reset)
            reset_data
            ;;
        verify)
            verify_data
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_data
            ;;
        *)
            error "未知命令: $COMMAND"
            exit 1
            ;;
    esac
    
    success "=== 操作完成 ==="
}

# 错误处理
trap 'error "脚本执行过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"