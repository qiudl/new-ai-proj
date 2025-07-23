#!/bin/bash

# Docker环境下的数据库备份和用户类型迁移脚本
# Docker Database Backup and User Type Migration Script

set -e  # 遇到错误时停止执行

# Docker 容器名称
DB_CONTAINER="postgres_db"

# 从 .env 文件读取配置
if [[ -f ".env" ]]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 数据库配置
DB_HOST="localhost"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-main_db}"
DB_USER="${DB_USER:-user}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# 备份目录
BACKUP_DIR="./backups"
MIGRATION_DIR="./migrations"

# 时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 检查Docker容器状态
check_docker_container() {
    log_step "检查Docker容器状态..."
    
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        log_error "PostgreSQL容器 '$DB_CONTAINER' 未运行"
        echo "请先启动数据库容器:"
        echo "  docker-compose up -d db"
        exit 1
    fi
    
    log_success "Docker容器运行正常"
}

# 检查数据库连接
check_database_connection() {
    log_step "检查数据库连接..."
    
    if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
        log_error "无法连接到数据库"
        echo "容器内数据库配置:"
        echo "  数据库: $DB_NAME"
        echo "  用户: $DB_USER"
        exit 1
    fi
    
    log_success "数据库连接正常"
}

# 创建备份目录
create_backup_directory() {
    log_info "创建备份目录..."
    mkdir -p "$BACKUP_DIR"
    log_success "备份目录创建完成: $BACKUP_DIR"
}

# 显示数据库信息
show_database_info() {
    log_step "显示当前数据库信息..."
    
    echo "数据库配置:"
    echo "  容器: $DB_CONTAINER"
    echo "  数据库: $DB_NAME"
    echo "  用户: $DB_USER"
    echo
    
    # 获取数据库大小
    db_size=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    " | xargs)
    log_info "数据库大小: $db_size"
    
    # 获取表数量
    table_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " | xargs)
    log_info "表数量: $table_count"
    
    # 获取用户数量
    user_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM users;
    " 2>/dev/null | xargs || echo "0")
    log_info "用户数量: $user_count"
    
    echo
}

# 完整数据库备份
backup_full_database() {
    log_step "开始完整数据库备份..."
    
    backup_file="$BACKUP_DIR/full_backup_${DB_NAME}_${TIMESTAMP}.sql"
    
    log_info "备份文件: $backup_file"
    log_info "正在备份，请稍候..."
    
    # 使用Docker容器内的pg_dump进行备份
    if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" \
       --no-password \
       --format=plain \
       --no-tablespaces \
       --no-owner \
       --no-privileges \
       > "$backup_file"; then
        
        backup_size=$(du -h "$backup_file" | cut -f1)
        log_success "完整数据库备份完成"
        log_success "备份文件大小: $backup_size"
        log_success "备份路径: $backup_file"
        
        # 创建备份信息文件
        info_file="$BACKUP_DIR/backup_info_${TIMESTAMP}.txt"
        cat > "$info_file" << EOF
数据库备份信息
===================
备份时间: $(date)
Docker容器: $DB_CONTAINER
数据库名称: $DB_NAME
备份用户: $DB_USER
备份文件: $backup_file
备份大小: $backup_size
备份类型: 完整备份（结构+数据）

恢复命令:
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$backup_file"
EOF
        log_success "备份信息已保存: $info_file"
        
    else
        log_error "数据库备份失败！"
        exit 1
    fi
}

# 验证备份文件
verify_backup() {
    log_step "验证备份文件..."
    
    backup_file="$BACKUP_DIR/full_backup_${DB_NAME}_${TIMESTAMP}.sql"
    
    if [[ ! -f "$backup_file" ]]; then
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
    
    # 检查备份文件大小
    backup_size_bytes=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    
    if [[ "$backup_size_bytes" -lt 1000 ]]; then
        log_error "备份文件太小，可能备份失败: $backup_size_bytes bytes"
        exit 1
    fi
    
    # 检查备份文件内容
    if head -10 "$backup_file" | grep -q "PostgreSQL database dump"; then
        log_success "备份文件验证通过"
    else
        log_error "备份文件格式异常"
        exit 1
    fi
}

# 显示迁移前状态
show_pre_migration_status() {
    log_step "显示迁移前数据状态..."
    
    echo "当前用户角色分布:"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            role,
            status,
            COUNT(*) as count
        FROM users 
        GROUP BY role, status
        ORDER BY role, status;
    " 2>/dev/null || echo "用户表不存在或为空"
    
    echo
    echo "检查是否已存在用户类型字段:"
    existing_columns=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name IN ('user_type', 'company_id');
    " 2>/dev/null | xargs || echo "")
    
    if [[ -n "$existing_columns" ]]; then
        log_warning "发现已存在的字段: $existing_columns"
        log_warning "可能已经执行过用户类型迁移"
    else
        log_info "未发现用户类型字段，可以安全执行迁移"
    fi
    echo
}

# 执行迁移
execute_migration() {
    log_step "执行用户类型系统迁移..."
    
    migration_file="$MIGRATION_DIR/008_user_type_system_migration.sql"
    
    if [[ ! -f "$migration_file" ]]; then
        log_error "迁移文件不存在: $migration_file"
        exit 1
    fi
    
    log_info "开始执行迁移脚本..."
    
    # 将迁移文件复制到容器并执行
    if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$migration_file"; then
        log_success "迁移执行完成！"
    else
        log_error "迁移执行失败！"
        echo
        log_info "如需恢复，可以使用以下命令:"
        echo "docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < $BACKUP_DIR/full_backup_${DB_NAME}_${TIMESTAMP}.sql"
        exit 1
    fi
}

# 验证迁移结果
verify_migration_result() {
    log_step "验证迁移结果..."
    
    # 检查新字段
    new_columns=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name IN ('user_type', 'company_id', 'company_user_id');
    " | xargs)
    
    if [[ "$new_columns" == "3" ]]; then
        log_success "新字段添加成功"
    else
        log_warning "新字段添加情况: 期望3个，实际$new_columns个"
    fi
    
    # 检查数据迁移结果
    echo
    echo "迁移后用户类型分布:"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            COALESCE(user_type, 'NULL') as user_type,
            role,
            COUNT(*) as count
        FROM users 
        GROUP BY user_type, role
        ORDER BY user_type, role;
    "
    
    # 检查企业用户关联情况
    echo
    echo "企业用户关联统计:"
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            COUNT(*) as total_company_users,
            COUNT(company_id) as users_with_company,
            COUNT(company_user_id) as users_with_company_user_link
        FROM users 
        WHERE user_type = 'company';
    " 2>/dev/null || echo "暂无企业用户数据"
}

# 创建迁移报告
create_migration_report() {
    log_step "生成迁移报告..."
    
    report_file="$BACKUP_DIR/migration_report_${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# 用户类型系统迁移报告

## 基本信息
- **迁移时间**: $(date)
- **Docker容器**: $DB_CONTAINER
- **数据库**: $DB_NAME
- **执行用户**: $DB_USER
- **备份文件**: full_backup_${DB_NAME}_${TIMESTAMP}.sql

## 迁移内容
1. 添加用户类型字段 (user_type)
2. 添加企业关联字段 (company_id, company_user_id)  
3. 更新角色约束和权限控制
4. 创建权限检查函数
5. 自动数据迁移

## 迁移后统计

### 用户类型分布
EOF

    # 添加统计数据到报告
    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT 
            '| ' || COALESCE(user_type, 'NULL') || ' | ' || role || ' | ' || COUNT(*) || ' |'
        FROM users 
        GROUP BY user_type, role
        ORDER BY user_type, role;
    " >> "$report_file" 2>/dev/null || echo "| - | - | 0 |" >> "$report_file"

    cat >> "$report_file" << EOF

### 企业用户关联情况
EOF

    docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT 
            '- 企业用户总数: ' || COUNT(*) ||
            CASE WHEN COUNT(company_id) > 0 
                THEN '\n- 已关联企业: ' || COUNT(company_id) 
                ELSE '\n- 已关联企业: 0' 
            END ||
            CASE WHEN COUNT(company_user_id) > 0 
                THEN '\n- 已关联企业用户记录: ' || COUNT(company_user_id)
                ELSE '\n- 已关联企业用户记录: 0'
            END
        FROM users 
        WHERE user_type = 'company';
    " >> "$report_file" 2>/dev/null || echo "- 企业用户总数: 0" >> "$report_file"

    cat >> "$report_file" << EOF

## 回滚方案
如需回滚此次迁移，请执行以下步骤：

1. **使用回滚脚本** (推荐):
   \`\`\`bash
   docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < migrations/008_rollback_user_type_system.sql
   \`\`\`

2. **完整数据库恢复**:
   \`\`\`bash
   docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < backups/full_backup_${DB_NAME}_${TIMESTAMP}.sql
   \`\`\`

## 注意事项
- 此迁移修改了用户表结构和权限控制逻辑
- 企业用户现在只能访问所属企业的项目和数据
- 系统用户保持原有权限不变
- 建议在生产环境充分测试新的权限控制

## 下一步
1. 更新后端代码以支持新的用户类型逻辑
2. 更新前端界面以支持用户类型选择
3. 测试权限控制功能
4. 更新API文档
EOF

    log_success "迁移报告已生成: $report_file"
}

# 显示完成摘要
show_completion_summary() {
    log_step "迁移完成摘要"
    
    echo
    echo "🎉 用户类型系统迁移已成功完成！"
    echo
    echo "📁 生成的文件："
    echo "   • 完整数据库备份: $BACKUP_DIR/full_backup_${DB_NAME}_${TIMESTAMP}.sql"
    echo "   • 备份信息: $BACKUP_DIR/backup_info_${TIMESTAMP}.txt"
    echo "   • 迁移报告: $BACKUP_DIR/migration_report_${TIMESTAMP}.md"
    echo
    echo "📊 主要改进："
    echo "   • ✅ 区分系统用户和企业用户"
    echo "   • ✅ 企业用户只能访问所属企业数据"
    echo "   • ✅ 增强的权限控制和安全性"
    echo "   • ✅ 完整的审计和日志功能"
    echo
    echo "🔄 如需回滚："
    echo "   docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < migrations/008_rollback_user_type_system.sql"
    echo
    echo "📖 详细信息请查看迁移报告文件"
}

# 主执行函数
main() {
    echo "======================================"
    echo "   Docker用户类型系统迁移工具"
    echo "======================================"
    echo
    
    # 检查Docker环境
    check_docker_container
    check_database_connection
    
    # 显示当前状态
    show_database_info
    show_pre_migration_status
    
    # 确认执行
    log_warning "此操作将修改数据库结构并迁移用户数据"
    echo "当前将要操作的数据库："
    echo "  • 容器: $DB_CONTAINER"
    echo "  • 数据库: $DB_NAME"
    echo "  • 用户: $DB_USER"
    echo
    read -p "确定要继续执行完整备份和迁移吗？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi
    
    # 执行步骤
    create_backup_directory
    backup_full_database
    verify_backup
    
    # 最后确认
    log_warning "备份完成，即将开始迁移"
    read -p "确认开始执行迁移？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "迁移已取消，备份文件已保存"
        exit 0
    fi
    
    execute_migration
    verify_migration_result
    create_migration_report
    show_completion_summary
    
    echo
    log_success "所有操作已完成！"
}

# 执行主函数
main "$@"
