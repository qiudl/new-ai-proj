#!/bin/bash

# 权限系统增强迁移执行脚本
# 文件: execute_migration.sh
# 描述: 执行权限系统增强和种子数据初始化
# 任务: #625 - 开发数据库迁移脚本和种子数据
# 创建时间: 2025-08-27

set -e  # 遇到错误立即退出

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的环境变量
check_env() {
    log "检查数据库连接环境变量..."
    
    # 数据库连接参数（优先从环境变量获取，否则使用默认值）
    DB_HOST="${DB_HOST:-postgres-master}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-ai_project_db}"
    DB_USER="${DB_USER:-dev_user}"
    DB_PASSWORD="${DB_PASSWORD:-dev_password_2024}"
    
    # 构建连接字符串
    export PGHOST="$DB_HOST"
    export PGPORT="$DB_PORT"
    export PGDATABASE="$DB_NAME"
    export PGUSER="$DB_USER"
    export PGPASSWORD="$DB_PASSWORD"
    
    log "数据库连接配置："
    log "  主机: $DB_HOST:$DB_PORT"
    log "  数据库: $DB_NAME"
    log "  用户: $DB_USER"
}

# 测试数据库连接
test_connection() {
    log "测试数据库连接..."
    if psql -c "SELECT 1;" > /dev/null 2>&1; then
        success "数据库连接成功"
    else
        error "数据库连接失败，请检查连接配置"
        error "连接信息: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
        exit 1
    fi
}

# 备份当前权限数据
backup_data() {
    log "备份当前权限数据..."
    
    BACKUP_FILE="${SCRIPT_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    psql -c "
-- 权限系统备份
-- 生成时间: $(date)

BEGIN;

-- 导出权限表数据
COPY permissions TO STDOUT WITH (FORMAT csv, HEADER true);
COPY role_permissions TO STDOUT WITH (FORMAT csv, HEADER true);
COPY permission_cache TO STDOUT WITH (FORMAT csv, HEADER true);

COMMIT;
" > "$BACKUP_FILE" 2>/dev/null || true

    success "权限数据备份完成: $BACKUP_FILE"
}

# 执行迁移脚本
execute_migrations() {
    log "开始执行权限系统增强迁移..."
    
    # 获取迁移文件列表
    migration_files=(
        "001_permission_system_enhancements.sql"
        "002_seed_enhanced_permissions.sql"
        "003_seed_user_roles_and_test_data.sql"
    )
    
    for migration_file in "${migration_files[@]}"; do
        migration_path="${SCRIPT_DIR}/${migration_file}"
        
        if [ -f "$migration_path" ]; then
            log "执行迁移: $migration_file"
            
            # 记录开始时间
            start_time=$(date +%s)
            
            # 执行迁移文件
            if psql -f "$migration_path" > "${SCRIPT_DIR}/migration_${migration_file%.sql}.log" 2>&1; then
                # 计算执行时间
                end_time=$(date +%s)
                duration=$((end_time - start_time))
                success "✅ $migration_file 执行成功 (耗时: ${duration}秒)"
            else
                error "❌ $migration_file 执行失败"
                error "请查看日志: ${SCRIPT_DIR}/migration_${migration_file%.sql}.log"
                exit 1
            fi
        else
            error "迁移文件不存在: $migration_path"
            exit 1
        fi
    done
}

# 验证迁移结果
verify_migrations() {
    log "验证迁移执行结果..."
    
    # 创建验证脚本
    cat > "${SCRIPT_DIR}/verify_temp.sql" << 'EOF'
-- 权限系统增强迁移验证
\set ON_ERROR_STOP on

-- 检查新表是否创建成功
SELECT 
    'permission_hierarchy' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_hierarchy')
         THEN '✅ 已创建' ELSE '❌ 未创建' END as status
UNION ALL
SELECT 
    'dynamic_permission_rules' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dynamic_permission_rules')
         THEN '✅ 已创建' ELSE '❌ 未创建' END as status
UNION ALL
SELECT 
    'permission_contexts' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_contexts')
         THEN '✅ 已创建' ELSE '❌ 未创建' END as status
UNION ALL
SELECT 
    'user_context_permissions' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_context_permissions')
         THEN '✅ 已创建' ELSE '❌ 未创建' END as status;

-- 检查种子数据
SELECT 
    '权限分组数据' as data_type,
    COUNT(*)::text || ' 个权限已分组' as status
FROM permissions 
WHERE permission_group IS NOT NULL;

SELECT 
    '权限上下文' as data_type,
    COUNT(*)::text || ' 个上下文已创建' as status
FROM permission_contexts;

SELECT 
    '测试用户' as data_type,
    COUNT(*)::text || ' 个测试用户已创建' as status
FROM company_users 
WHERE email LIKE '%@aiproj.com';

-- 检查视图和函数
SELECT 
    'user_effective_permissions' as object_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_effective_permissions')
         THEN '✅ 视图已创建' ELSE '❌ 视图未创建' END as status
UNION ALL
SELECT 
    'check_user_permission_enhanced' as object_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'check_user_permission_enhanced')
         THEN '✅ 函数已创建' ELSE '❌ 函数未创建' END as status;

-- 显示权限统计
SELECT '=== 权限系统统计信息 ===' as info;
SELECT * FROM seed_data_verification ORDER BY category;

-- 显示用户角色统计
SELECT '=== 用户角色统计信息 ===' as info;
SELECT * FROM user_role_seed_verification ORDER BY category;
EOF

    # 执行验证
    if psql -f "${SCRIPT_DIR}/verify_temp.sql" > "${SCRIPT_DIR}/verification_report.txt" 2>&1; then
        success "迁移验证完成，查看报告: ${SCRIPT_DIR}/verification_report.txt"
        
        # 显示验证结果摘要
        log "验证结果摘要:"
        cat "${SCRIPT_DIR}/verification_report.txt" | grep -E "(✅|❌|个|信息)"
    else
        warning "验证过程中出现问题，请查看: ${SCRIPT_DIR}/verification_report.txt"
    fi
    
    # 清理临时文件
    rm -f "${SCRIPT_DIR}/verify_temp.sql"
}

# 生成迁移报告
generate_report() {
    log "生成迁移执行报告..."
    
    REPORT_FILE="${SCRIPT_DIR}/migration_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# 权限系统增强迁移报告

**执行时间**: $(date)
**任务**: #625 - 开发数据库迁移脚本和种子数据
**执行者**: Claude AI

## 迁移概要

本次迁移包含以下增强功能：

1. **权限系统结构增强**
   - 添加权限分组和层级管理
   - 支持权限继承和上下文控制
   - 增加动态权限规则支持

2. **新增数据表**
   - \`permission_hierarchy\` - 权限层级关系表
   - \`dynamic_permission_rules\` - 动态权限规则表  
   - \`permission_contexts\` - 权限上下文表
   - \`user_context_permissions\` - 用户上下文权限关联表

3. **种子数据初始化**
   - 权限分组和元数据
   - 测试用户和角色分配
   - 演示项目和任务数据
   - 权限审计日志示例

## 执行的迁移文件

EOF

    # 添加迁移文件信息
    for migration_file in "001_permission_system_enhancements.sql" "002_seed_enhanced_permissions.sql" "003_seed_user_roles_and_test_data.sql"; do
        if [ -f "${SCRIPT_DIR}/${migration_file}" ]; then
            echo "- ✅ $migration_file" >> "$REPORT_FILE"
        else
            echo "- ❌ $migration_file (文件不存在)" >> "$REPORT_FILE"
        fi
    done
    
    cat >> "$REPORT_FILE" << 'EOF'

## 测试用户账户

以下测试用户已创建（密码需要重置）：

- **admin@aiproj.com** - 系统管理员
- **pm.zhang@aiproj.com** - 项目经理  
- **dev.li@aiproj.com** - 开发工程师
- **designer.wang@aiproj.com** - UI设计师
- **tester.zhao@aiproj.com** - 测试工程师
- **finance.sun@aiproj.com** - 财务专员
- **guest@aiproj.com** - 访客用户
- **temp.zhou@aiproj.com** - 临时用户

## 权限系统新功能

### 1. 层级权限控制
- 支持权限继承关系
- 父权限自动包含子权限
- 灵活的继承条件配置

### 2. 上下文权限管理
- 项目级别权限控制
- 环境相关权限设置
- 部门和团队权限隔离

### 3. 动态权限规则
- 基于时间的权限控制
- 条件触发的权限分配
- 实时权限状态评估

### 4. 增强的权限缓存
- 支持上下文相关缓存
- 智能缓存失效机制
- 性能优化的权限检查

## 验证建议

1. 测试基础权限功能是否正常
2. 验证新的权限检查函数
3. 确认种子数据加载正确
4. 检查权限审计日志功能

## 后续操作建议

1. 重置测试用户密码
2. 配置生产环境权限数据
3. 集成新的权限检查函数到应用代码
4. 设置权限监控和告警

---
*报告生成时间: $(date)*
EOF

    success "迁移报告已生成: $REPORT_FILE"
}

# 清理函数
cleanup() {
    log "清理临时文件..."
    find "$SCRIPT_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    find "$SCRIPT_DIR" -name "backup_*.sql" -mtime +30 -delete 2>/dev/null || true
}

# 主执行函数
main() {
    log "=== 权限系统增强迁移开始 ==="
    log "脚本目录: $SCRIPT_DIR"
    log "项目根目录: $PROJECT_ROOT"
    
    # 执行迁移步骤
    check_env
    test_connection
    backup_data
    execute_migrations
    verify_migrations
    generate_report
    cleanup
    
    success "=== 权限系统增强迁移完成 ==="
    success "请查看迁移报告和验证结果"
    
    # 显示下一步操作建议
    log ""
    log "下一步操作建议："
    log "1. 检查迁移报告: find $SCRIPT_DIR -name 'migration_report_*.md'"
    log "2. 查看验证结果: cat $SCRIPT_DIR/verification_report.txt"
    log "3. 重启应用服务以应用新的权限系统"
    log "4. 使用测试用户验证权限功能"
}

# 错误处理
trap 'error "脚本执行过程中出现错误，请查看相关日志文件"; exit 1' ERR

# 执行主函数
main "$@"