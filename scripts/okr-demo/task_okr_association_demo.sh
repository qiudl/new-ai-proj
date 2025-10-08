#!/bin/bash

# OKR任务关联功能演示脚本
# 展示如何将任务与OKR关键结果关联，实现自动进度同步

set -e

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
JWT_TOKEN=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[步骤 $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 获取认证Token
get_auth_token() {
    print_step "1" "获取认证Token..."
    
    response=$(curl -s -X POST "$BASE_URL/auth/dev/quick-login" \
        -H "Content-Type: application/json" \
        -d '{"username": "admin"}')
    
    JWT_TOKEN=$(echo "$response" | jq -r '.data.access_token // empty')
    
    if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
        print_success "认证成功，Token: ${JWT_TOKEN:0:20}..."
        export JWT_TOKEN
    else
        print_warning "认证失败: $response"
        exit 1
    fi
}

# 获取现有OKR目标
get_existing_okr() {
    print_step "2" "获取现有OKR目标..."
    
    response=$(curl -s -X GET "$BASE_URL/okr/objectives?quarter=2025-Q1" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    OBJECTIVE_ID=$(echo "$response" | jq -r '.objectives[0].id // empty')
    KR_ID=$(echo "$response" | jq -r '.objectives[0].key_results[0].id // empty')
    
    if [ -n "$OBJECTIVE_ID" ] && [ "$OBJECTIVE_ID" != "null" ]; then
        print_success "找到OKR目标 (ID: $OBJECTIVE_ID), 关键结果 (ID: $KR_ID)"
        echo "$response" | jq -r '.objectives[0].title, .objectives[0].key_results[0].title'
    else
        print_warning "未找到OKR数据，请先运行 test_okr_complete_flow.sh"
        exit 1
    fi
}

# 获取可用任务
get_available_tasks() {
    print_step "3" "获取可用任务..."
    
    response=$(curl -s -X GET "$BASE_URL/tasks?limit=5" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    TASK_ID=$(echo "$response" | jq -r '.data.data[0].id // empty')
    
    if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
        print_success "找到可用任务 (ID: $TASK_ID)"
        echo "$response" | jq -r '.data.data[0].title // "任务标题"'
    else
        print_warning "未找到可用任务"
        exit 1
    fi
}

# 创建任务-OKR关联
create_task_okr_association() {
    print_step "4" "创建任务-OKR关联..."
    
    association_data=$(cat <<EOF
{
    "task_id": $TASK_ID,
    "key_result_id": $KR_ID,
    "weight": 100,
    "sync_mode": "auto"
}
EOF
)
    
    response=$(curl -s -X POST "$BASE_URL/okr/tasks/$TASK_ID/key-results/$KR_ID/associate" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$association_data")
    
    ASSOCIATION_ID=$(echo "$response" | jq -r '.id // empty')
    
    if [ -n "$ASSOCIATION_ID" ] && [ "$ASSOCIATION_ID" != "null" ]; then
        print_success "任务-OKR关联创建成功 (ID: $ASSOCIATION_ID)"
        echo "关联详情:"
        echo "$response" | jq '.'
    else
        print_warning "关联创建失败: $response"
    fi
}

# 查看任务的OKR关联
view_task_associations() {
    print_step "5" "查看任务的OKR关联..."
    
    response=$(curl -s -X GET "$BASE_URL/okr/tasks/$TASK_ID/associations" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    print_info "任务 $TASK_ID 的OKR关联:"
    echo "$response" | jq '.associations // []'
}

# 查看关键结果的任务关联
view_kr_associations() {
    print_step "6" "查看关键结果的任务关联..."
    
    response=$(curl -s -X GET "$BASE_URL/okr/key-results/$KR_ID/tasks" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    print_info "关键结果 $KR_ID 的任务关联:"
    echo "$response" | jq '.tasks // []'
}

# 手动同步进度
sync_progress() {
    print_step "7" "手动同步关键结果进度..."
    
    response=$(curl -s -X POST "$BASE_URL/okr/key-results/$KR_ID/sync-progress" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    old_progress=$(echo "$response" | jq -r '.old_progress // 0')
    new_progress=$(echo "$response" | jq -r '.new_progress // 0')
    
    print_info "进度同步结果:"
    echo "  旧进度: ${old_progress}%"
    echo "  新进度: ${new_progress}%"
    echo "$response" | jq '.key_result // {}'
}

# 演示权重机制
demo_weight_mechanism() {
    print_step "8" "演示权重机制..."
    
    print_info "权重机制说明:"
    echo "  - Weight: 100% = 任务完全影响关键结果进度"
    echo "  - Weight: 50%  = 任务影响关键结果进度的50%"
    echo "  - Weight: 25%  = 任务影响关键结果进度的25%"
    echo ""
    echo "  示例计算:"
    echo "  任务A (权重50%) + 任务B (权重30%) + 任务C (权重20%)"
    echo "  如果任务A完成 → 关键结果进度增加50%"
    echo "  如果任务B完成 → 关键结果进度增加30%"
    echo "  全部完成 → 关键结果进度 = 100%"
}

# 使用场景演示
demo_use_cases() {
    print_step "9" "常见使用场景演示..."
    
    echo ""
    echo "🎯 使用场景1: 产品功能开发"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "OKR目标: 提升用户体验"
    echo "关键结果: 完成5个核心功能 (目标值: 5)"
    echo "关联任务:"
    echo "  ├── 任务1: 用户登录优化 (权重: 20%)"
    echo "  ├── 任务2: 界面响应速度提升 (权重: 20%)"
    echo "  ├── 任务3: 搜索功能改进 (权重: 20%)"
    echo "  ├── 任务4: 移动端适配 (权重: 20%)"
    echo "  └── 任务5: 用户反馈系统 (权重: 20%)"
    echo ""
    
    echo "🎯 使用场景2: 销售目标"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "OKR目标: 增加营收"
    echo "关键结果: 新客户获取100个 (目标值: 100)"
    echo "关联任务:"
    echo "  ├── 任务1: 线上推广活动 (权重: 40%)"
    echo "  ├── 任务2: 客户拜访计划 (权重: 35%)"
    echo "  └── 任务3: 转介绍奖励机制 (权重: 25%)"
    echo ""
    
    echo "🎯 使用场景3: 技术债务清理"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "OKR目标: 提升系统稳定性"
    echo "关键结果: 系统可用率达到99.9% (目标值: 99.9)"
    echo "关联任务:"
    echo "  ├── 任务1: 数据库性能优化 (权重: 30%)"
    echo "  ├── 任务2: 监控系统完善 (权重: 25%)"
    echo "  ├── 任务3: 错误处理机制 (权重: 25%)"
    echo "  └── 任务4: 自动化测试覆盖 (权重: 20%)"
}

# 最佳实践指南
best_practices() {
    print_step "10" "OKR任务关联最佳实践..."
    
    echo ""
    echo "📋 最佳实践指南"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. 🎯 明确关联逻辑"
    echo "   ├── 确保任务直接贡献于关键结果"
    echo "   ├── 避免过度细分任务"
    echo "   └── 保持关联的可追踪性"
    echo ""
    echo "2. ⚖️  合理分配权重"
    echo "   ├── 权重总和通常为100%"
    echo "   ├── 重要任务分配较高权重"
    echo "   └── 定期review权重分配"
    echo ""
    echo "3. 🔄 选择同步模式"
    echo "   ├── auto: 适合直接影响的任务"
    echo "   ├── manual: 适合需要人工判断的任务"
    echo "   └── 混合使用以保证准确性"
    echo ""
    echo "4. 📊 监控与调整"
    echo "   ├── 定期查看进度同步情况"
    echo "   ├── 根据实际情况调整权重"
    echo "   └── 分析关联效果并优化"
    echo ""
    echo "5. 🎖️  团队协作"
    echo "   ├── 让团队了解OKR-任务关联"
    echo "   ├── 鼓励主动更新任务状态"
    echo "   └── 定期团队review进度"
}

# 生成总结报告
generate_summary() {
    print_step "11" "生成功能总结..."
    
    echo ""
    echo "🎉 OKR任务关联功能总结"
    echo "=========================="
    echo ""
    echo "✅ 核心功能:"
    echo "  ├── 任务-关键结果双向关联"
    echo "  ├── 自动/手动进度同步"
    echo "  ├── 权重机制灵活配置"
    echo "  └── 实时进度跟踪"
    echo ""
    echo "✅ API接口:"
    echo "  ├── POST /okr/tasks/{id}/key-results/{id}/associate"
    echo "  ├── GET  /okr/tasks/{id}/associations"
    echo "  ├── GET  /okr/key-results/{id}/tasks"
    echo "  ├── POST /okr/key-results/{id}/sync-progress"
    echo "  └── DELETE /okr/task-associations/{id}"
    echo ""
    echo "✅ 前端集成:"
    echo "  ├── Dashboard中的OKR模块"
    echo "  ├── 任务详情页面的OKR关联"
    echo "  ├── 实时进度展示"
    echo "  └── 关联管理界面"
    echo ""
    echo "📈 效益:"
    echo "  ├── 任务执行与战略目标直接对齐"
    echo "  ├── 进度跟踪自动化，减少手工统计"
    echo "  ├── 提升团队目标导向意识"
    echo "  └── 数据驱动的决策支持"
}

# 主函数
main() {
    echo "🔗 OKR任务关联功能演示"
    echo "========================"
    
    get_auth_token
    get_existing_okr
    get_available_tasks
    create_task_okr_association
    view_task_associations
    view_kr_associations
    sync_progress
    demo_weight_mechanism
    demo_use_cases
    best_practices
    generate_summary
    
    echo ""
    print_success "演示完成！请在前端界面体验实际功能"
}

# 错误处理
trap 'echo "演示过程中出现错误，请检查服务状态"; exit 1' ERR

# 检查依赖
if ! command -v jq &> /dev/null; then
    echo "需要安装 jq 工具: brew install jq"
    exit 1
fi

# 执行主函数
main "$@"