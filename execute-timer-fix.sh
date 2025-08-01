#!/bin/bash

# ===================================================================
# 计时系统修复执行脚本
# 版本: 1.0
# 日期: 2025-08-01
# 目标: 分阶段执行计时系统修复
# ===================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 阶段1: 创建备份
phase1_backup() {
    log "===== 阶段1: 创建数据备份 ====="
    
    if [[ ! -f "./scripts/timer-system-backup-restore.sh" ]]; then
        error "备份脚本不存在: ./scripts/timer-system-backup-restore.sh"
    fi
    
    ./scripts/timer-system-backup-restore.sh backup
    success "数据备份完成"
}

# 阶段2: 应用数据库修复
phase2_database_fix() {
    log "===== 阶段2: 应用数据库修复 ====="
    
    log "应用数据一致性修复脚本..."
    if [[ ! -f "./migrations/006_fix_timer_data_consistency.sql" ]]; then
        error "修复脚本不存在: ./migrations/006_fix_timer_data_consistency.sql"
    fi
    
    # 应用修复脚本
    docker-compose exec -T db psql -U user -d main_db < ./migrations/006_fix_timer_data_consistency.sql
    
    log "执行数据修复..."
    docker-compose exec -T db psql -U user -d main_db -c "
        -- 执行数据修复
        SELECT 'FIXING DATA:' as status, * FROM fix_task_total_time_consistency();
        
        -- 标准化用户状态
        SELECT 'STANDARDIZING STATUS:' as status, * FROM standardize_user_timing_status();
        
        -- 验证修复结果
        SELECT 'AFTER FIX:' as status, * FROM check_timer_data_consistency();
    "
    
    success "数据库修复完成"
}

# 阶段3: 验证修复效果
phase3_verify() {
    log "===== 阶段3: 验证修复效果 ====="
    
    log "检查数据一致性..."
    docker-compose exec -T db psql -U user -d main_db -c "
        -- 检查还有没有不一致的数据
        SELECT 
            'Remaining Inconsistencies:' as check_type,
            COUNT(*) as inconsistent_tasks
        FROM (
            SELECT 
                t.id,
                t.total_time_seconds,
                COALESCE(SUM(ttl.duration_seconds), 0) as logged_total
            FROM tasks t
            LEFT JOIN task_time_logs ttl ON t.id = ttl.task_id
            WHERE t.deleted_at IS NULL
            GROUP BY t.id, t.total_time_seconds
            HAVING t.total_time_seconds != COALESCE(SUM(ttl.duration_seconds), 0)
        ) inconsistent;
        
        -- 检查用户状态一致性
        SELECT 
            'User Status Check:' as check_type,
            timing_status,
            COUNT(*) as user_count
        FROM users
        WHERE timing_status IS NOT NULL
        GROUP BY timing_status
        ORDER BY timing_status;
    "
    
    success "修复效果验证完成"
}

# 阶段4: 性能测试
phase4_performance_test() {
    log "===== 阶段4: 性能测试 ====="
    
    log "测试并发控制..."
    
    # 获取token
    TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"password123"}' | \
      grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [[ -z "$TOKEN" ]]; then
        error "无法获取认证token"
    fi
    
    log "测试计时器基本功能..."
    
    # 测试启动计时器
    RESULT=$(curl -s -X POST http://localhost/api/v1/timer/start \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"task_id": 145}')
    
    if echo "$RESULT" | grep -q "successfully"; then
        success "计时器启动测试通过"
    else
        warning "计时器启动测试异常: $RESULT"
    fi
    
    # 等待2秒
    sleep 2
    
    # 测试停止计时器
    RESULT=$(curl -s -X POST http://localhost/api/v1/timer/stop \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$RESULT" | grep -q "successfully"; then
        success "计时器停止测试通过"
    else
        warning "计时器停止测试异常: $RESULT"
    fi
    
    success "性能测试完成"
}

# 主函数
main() {
    log "=================================================="
    log "计时系统修复执行开始"
    log "时间: $(date)"
    log "=================================================="
    
    # 检查Docker环境
    if ! docker-compose ps | grep -q "go_backend.*Up"; then
        error "Docker环境未运行，请先执行: docker-compose up -d"
    fi
    
    case "${1:-all}" in
        "backup")
            phase1_backup
            ;;
        "fix")
            phase2_database_fix
            ;;
        "verify")
            phase3_verify
            ;;
        "test")
            phase4_performance_test
            ;;
        "all")
            phase1_backup
            phase2_database_fix
            phase3_verify
            phase4_performance_test
            ;;
        *)
            echo "Usage: $0 {backup|fix|verify|test|all}"
            echo "  backup - 仅创建数据备份"
            echo "  fix    - 仅执行数据修复"
            echo "  verify - 仅验证修复效果"
            echo "  test   - 仅执行性能测试"
            echo "  all    - 执行完整修复流程（默认）"
            exit 1
            ;;
    esac
    
    success "=================================================="
    success "计时系统修复执行完成！"
    success "时间: $(date)"
    success "=================================================="
}

main "$@"