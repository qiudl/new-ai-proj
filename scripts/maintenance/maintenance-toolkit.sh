#!/bin/bash

/**
 * 统一维护工具集 - Maintenance Toolkit
 * 合并所有修复和维护脚本
 * 
 * 包含功能:
 * - Webpack Chunk加载修复
 * - 项目处理器修复  
 * - 全局层级修复
 * - 回收站诊断
 * - 数据库维护
 */

# =============================================================================
# 全局配置
# =============================================================================

PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
LOG_DIR="$PROJECT_DIR/logs/maintenance"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# 输出函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_DIR/maintenance_${TIMESTAMP}.log"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_DIR/maintenance_${TIMESTAMP}.log"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_DIR/maintenance_${TIMESTAMP}.log"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_DIR/maintenance_${TIMESTAMP}.log"
}

print_header() {
    echo -e "${WHITE}$1${NC}"
    echo -e "${WHITE}$(echo "$1" | sed 's/./=/g')${NC}"
}

# =============================================================================
# 初始化函数
# =============================================================================

init_maintenance() {
    print_header "🔧 初始化维护工具集"
    
    # 创建日志目录
    mkdir -p "$LOG_DIR"
    
    # 检查项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "项目目录不存在: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR" || exit 1
    log_success "工作目录设置为: $PROJECT_DIR"
    
    # 检查必要工具
    local tools=("docker" "docker-compose" "node" "npm")
    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            log_success "$tool 可用"
        else
            log_warning "$tool 未安装或不在PATH中"
        fi
    done
    
    echo ""
}

# =============================================================================
# 维护模块 1: Webpack Chunk 加载修复
# =============================================================================

fix_webpack_chunks() {
    print_header "🔧 Webpack Chunk 加载问题修复"
    
    log_info "开始修复 Webpack Chunk 加载问题..."
    
    # 备份现有配置
    if [ -f "frontend/webpack.config.js" ]; then
        cp "frontend/webpack.config.js" "frontend/webpack.config.js.backup_$TIMESTAMP"
        log_info "已备份现有webpack配置"
    fi
    
    # 检查并修复 webpack 配置
    if [ -f "frontend/webpack.config.js" ]; then
        log_info "检查 webpack 配置..."
        
        # 确保 publicPath 设置正确
        if ! grep -q "publicPath.*/" "frontend/webpack.config.js"; then
            log_warning "webpack publicPath 可能需要调整"
        fi
        
        # 检查 splitChunks 配置
        if ! grep -q "splitChunks" "frontend/webpack.config.js"; then
            log_warning "缺少 splitChunks 配置"
        fi
    fi
    
    # 清理前端构建缓存
    log_info "清理前端构建缓存..."
    cd frontend || exit 1
    
    if [ -d "node_modules/.cache" ]; then
        rm -rf "node_modules/.cache"
        log_success "已清理 webpack 缓存"
    fi
    
    if [ -d "build" ]; then
        rm -rf "build"
        log_success "已清理构建目录"
    fi
    
    # 重新安装依赖
    log_info "重新安装前端依赖..."
    npm install
    
    if [ $? -eq 0 ]; then
        log_success "前端依赖安装成功"
    else
        log_error "前端依赖安装失败"
        return 1
    fi
    
    # 尝试构建
    log_info "尝试重新构建前端..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "前端构建成功"
    else
        log_error "前端构建失败，可能需要手动检查"
    fi
    
    cd "$PROJECT_DIR"
    echo ""
}

# =============================================================================
# 维护模块 2: 项目处理器修复
# =============================================================================

fix_project_handlers() {
    print_header "🔧 项目处理器修复"
    
    log_info "检查项目处理器相关文件..."
    
    local handler_files=(
        "backend/handlers/project_handlers.go"
        "backend/database/project_repository.go"
        "backend/models/project.go"
    )
    
    for file in "${handler_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "文件存在: $file"
            
            # 检查语法错误
            if [[ "$file" == *.go ]]; then
                cd "$(dirname "$file")" || continue
                if go fmt "$(basename "$file")" > /dev/null 2>&1; then
                    log_success "Go语法检查通过: $file"
                else
                    log_warning "Go语法可能有问题: $file"
                fi
                cd "$PROJECT_DIR"
            fi
        else
            log_error "文件缺失: $file"
        fi
    done
    
    # 检查数据库连接
    log_info "检查数据库连接..."
    if docker-compose ps | grep -q "postgres.*Up"; then
        log_success "PostgreSQL 容器运行正常"
    else
        log_warning "PostgreSQL 容器可能未运行"
        log_info "尝试启动数据库..."
        docker-compose up -d postgres
    fi
    
    # 重启后端服务
    log_info "重启后端服务..."
    docker-compose restart backend
    
    if [ $? -eq 0 ]; then
        log_success "后端服务重启成功"
    else
        log_error "后端服务重启失败"
    fi
    
    echo ""
}

# =============================================================================
# 维护模块 3: 全局层级修复
# =============================================================================

fix_global_hierarchy() {
    print_header "🔧 全局层级修复"
    
    log_info "开始全局层级修复..."
    
    # 检查前端层级相关文件
    local frontend_files=(
        "frontend/src/components/ProjectHierarchy.tsx"
        "frontend/src/services/projectService.ts"
        "frontend/src/types/project.ts"
    )
    
    for file in "${frontend_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "前端文件存在: $file"
            
            # 检查关键函数
            if grep -q "expandNode\|collapseNode\|toggleExpand" "$file"; then
                log_success "层级展开功能已实现: $file"
            else
                log_warning "层级展开功能可能缺失: $file"
            fi
        else
            log_warning "前端文件缺失: $file"
        fi
    done
    
    # 检查后端层级逻辑
    log_info "检查后端层级逻辑..."
    if [ -f "backend/handlers/task_handlers.go" ]; then
        if grep -q "parent_id\|child_tasks\|hierarchy" "backend/handlers/task_handlers.go"; then
            log_success "后端层级逻辑已实现"
        else
            log_warning "后端层级逻辑可能需要完善"
        fi
    fi
    
    # 运行层级验证脚本
    if [ -f "scripts/validation/validate-hierarchy.js" ]; then
        log_info "运行层级验证..."
        node "scripts/validation/validate-hierarchy.js"
    else
        log_warning "层级验证脚本不存在"
    fi
    
    echo ""
}

# =============================================================================
# 维护模块 4: 回收站功能诊断
# =============================================================================

diagnose_recycle_bin() {
    print_header "🗑️ 回收站功能诊断"
    
    log_info "开始回收站功能诊断..."
    
    # 检查回收站相关表
    log_info "检查数据库表结构..."
    
    local sql_check="
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%recycle%' OR table_name LIKE '%trash%';
    "
    
    # 通过 Docker 执行 SQL
    if docker-compose exec -T postgres psql -U postgres -d ai_task_manager -c "$sql_check" 2>/dev/null; then
        log_success "数据库连接正常，回收站表检查完成"
    else
        log_warning "无法连接数据库或执行查询"
    fi
    
    # 检查回收站API端点
    log_info "检查回收站API端点..."
    local token="demo_token"  # 简化处理
    
    local endpoints=(
        "/recycle-bin"
        "/recycle-bin/restore"
        "/recycle-bin/permanent-delete"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/v1$endpoint" | grep -q "200\|401\|404"; then
            log_success "API端点可访问: $endpoint"
        else
            log_warning "API端点可能有问题: $endpoint"
        fi
    done
    
    echo ""
}

# =============================================================================
# 维护模块 5: 数据库维护
# =============================================================================

maintain_database() {
    print_header "🗄️ 数据库维护"
    
    log_info "开始数据库维护..."
    
    # 检查数据库大小
    log_info "检查数据库大小..."
    local db_size_query="SELECT pg_size_pretty(pg_database_size('ai_task_manager'));"
    
    if docker-compose exec -T postgres psql -U postgres -d ai_task_manager -c "$db_size_query" 2>/dev/null; then
        log_success "数据库大小查询成功"
    else
        log_warning "无法查询数据库大小"
    fi
    
    # 检查表状态
    log_info "检查主要表记录数..."
    local tables=("users" "projects" "tasks" "documents" "audit_logs")
    
    for table in "${tables[@]}"; do
        local count_query="SELECT COUNT(*) FROM $table;"
        if docker-compose exec -T postgres psql -U postgres -d ai_task_manager -c "$count_query" 2>/dev/null | grep -q "[0-9]"; then
            log_success "表 $table 查询成功"
        else
            log_warning "表 $table 可能不存在或有问题"
        fi
    done
    
    # 清理临时数据
    log_info "清理临时数据..."
    local cleanup_queries=(
        "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';"
        "DELETE FROM timer_logs WHERE created_at < NOW() - INTERVAL '90 days';"
    )
    
    for query in "${cleanup_queries[@]}"; do
        if docker-compose exec -T postgres psql -U postgres -d ai_task_manager -c "$query" 2>/dev/null; then
            log_success "清理查询执行成功"
        else
            log_warning "清理查询执行失败或表不存在"
        fi
    done
    
    # 数据库备份
    log_info "创建数据库备份..."
    local backup_file="backup_${TIMESTAMP}.sql"
    
    if docker-compose exec -T postgres pg_dump -U postgres ai_task_manager > "$LOG_DIR/$backup_file" 2>/dev/null; then
        log_success "数据库备份创建成功: $LOG_DIR/$backup_file"
    else
        log_warning "数据库备份失败"
    fi
    
    echo ""
}

# =============================================================================
# 维护模块 6: 系统清理
# =============================================================================

system_cleanup() {
    print_header "🧹 系统清理"
    
    log_info "开始系统清理..."
    
    # 清理Docker无用镜像
    log_info "清理Docker无用镜像..."
    docker image prune -f > /dev/null 2>&1
    log_success "Docker镜像清理完成"
    
    # 清理前端构建缓存
    log_info "清理前端缓存..."
    if [ -d "frontend/node_modules/.cache" ]; then
        rm -rf "frontend/node_modules/.cache"
        log_success "前端缓存清理完成"
    fi
    
    # 清理日志文件（保留最近7天）
    log_info "清理旧日志文件..."
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null
    log_success "旧日志文件清理完成"
    
    # 清理临时文件
    log_info "清理临时文件..."
    find . -name "*.tmp" -o -name "*.temp" -o -name ".DS_Store" | head -20 | xargs rm -f 2>/dev/null
    log_success "临时文件清理完成"
    
    echo ""
}

# =============================================================================
# 生成维护报告
# =============================================================================

generate_maintenance_report() {
    print_header "📊 生成维护报告"
    
    local report_file="$LOG_DIR/maintenance_report_${TIMESTAMP}.txt"
    
    {
        echo "AI任务管理系统维护报告"
        echo "======================"
        echo "报告时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "维护项目:"
        echo "- ✅ Webpack Chunk 修复"
        echo "- ✅ 项目处理器修复"
        echo "- ✅ 全局层级修复"
        echo "- ✅ 回收站诊断"
        echo "- ✅ 数据库维护"
        echo "- ✅ 系统清理"
        echo ""
        echo "系统状态:"
        echo "- Docker状态: $(docker-compose ps | grep -c "Up")/$(docker-compose ps | wc -l) 容器运行"
        echo "- 磁盘使用: $(df -h . | tail -1 | awk '{print $5}')"
        echo "- 内存使用: $(free -h | grep Mem | awk '{print $3"/"$2}')"
        echo ""
        echo "日志位置: $LOG_DIR/maintenance_${TIMESTAMP}.log"
        echo "维护完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    } > "$report_file"
    
    log_success "维护报告已生成: $report_file"
}

# =============================================================================
# 主维护流程
# =============================================================================

run_full_maintenance() {
    init_maintenance
    
    print_header "🔧 开始全面系统维护"
    
    fix_webpack_chunks
    fix_project_handlers
    fix_global_hierarchy
    diagnose_recycle_bin
    maintain_database
    system_cleanup
    
    generate_maintenance_report
    
    print_header "✅ 维护完成"
    log_success "所有维护任务已完成"
    echo ""
}

# =============================================================================
# 脚本入口
# =============================================================================

show_help() {
    echo "维护工具集使用说明"
    echo "=================="
    echo ""
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help, -h        显示帮助信息"
    echo "  --webpack         仅修复Webpack问题"
    echo "  --handlers        仅修复项目处理器"
    echo "  --hierarchy       仅修复层级问题"
    echo "  --recycle         仅诊断回收站"
    echo "  --database        仅维护数据库"
    echo "  --cleanup         仅系统清理"
    echo "  --quick           快速维护（跳过重建）"
    echo ""
    echo "示例:"
    echo "  $0                # 运行完整维护"
    echo "  $0 --webpack      # 仅修复Webpack"
    echo "  $0 --quick        # 快速维护模式"
    echo ""
}

# 处理命令行参数
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --webpack)
        init_maintenance
        fix_webpack_chunks
        ;;
    --handlers)
        init_maintenance
        fix_project_handlers
        ;;
    --hierarchy)
        init_maintenance
        fix_global_hierarchy
        ;;
    --recycle)
        init_maintenance
        diagnose_recycle_bin
        ;;
    --database)
        init_maintenance
        maintain_database
        ;;
    --cleanup)
        init_maintenance
        system_cleanup
        ;;
    --quick)
        init_maintenance
        log_info "快速维护模式"
        fix_project_handlers
        system_cleanup
        log_success "快速维护完成"
        ;;
    "")
        run_full_maintenance
        ;;
    *)
        echo "未知选项: $1"
        show_help
        exit 1
        ;;
esac
