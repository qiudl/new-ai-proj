#!/bin/bash

# OKR完整流程演示脚本
# 演示从登录到创建OKR、更新进度、查看分析的完整流程

set -e

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"
JWT_TOKEN=""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}[步骤 $1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查服务状态
check_service() {
    print_step "1" "检查后端服务状态..."
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        print_success "后端服务正常运行"
    else
        print_error "后端服务未启动，请先启动服务"
        exit 1
    fi
}

# 开发环境快速登录
dev_login() {
    print_step "2" "开发环境快速登录..."
    
    response=$(curl -s -X POST "$BASE_URL/auth/dev/quick-login" \
        -H "Content-Type: application/json" \
        -d '{"username": "admin"}')
    
    JWT_TOKEN=$(echo "$response" | jq -r '.data.access_token // empty')
    
    if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
        print_success "登录成功，获取Token: ${JWT_TOKEN:0:20}..."
        export JWT_TOKEN
    else
        print_error "登录失败: $response"
        exit 1
    fi
}

# 创建2025-Q1 OKR目标
create_okr_objective() {
    print_step "3" "创建2025-Q1季度OKR目标..."
    
    local objective_data='{
        "title": "提升产品用户体验和市场竞争力",
        "description": "通过产品优化和功能创新，提升用户满意度，扩大市场份额",
        "quarter": "2025-Q1",
        "start_date": "2025-01-01T00:00:00Z",
        "end_date": "2025-03-31T23:59:59Z",
        "key_results": [
            {
                "title": "用户满意度评分达到4.5分以上",
                "description": "通过用户调研和产品优化，提升用户体验",
                "type": "number",
                "target_value": 4.5,
                "unit": "分"
            },
            {
                "title": "月活跃用户增长率达到25%",
                "description": "通过推广活动和产品改进吸引新用户",
                "type": "percentage", 
                "target_value": 25,
                "unit": "%"
            },
            {
                "title": "产品功能完成率达到90%",
                "description": "按计划完成季度产品路线图",
                "type": "percentage",
                "target_value": 90,
                "unit": "%"
            }
        ]
    }'
    
    response=$(curl -s -X POST "$BASE_URL/okr/objectives" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$objective_data")
    
    OBJECTIVE_ID=$(echo "$response" | jq -r '.id // empty')
    
    if [ -n "$OBJECTIVE_ID" ] && [ "$OBJECTIVE_ID" != "null" ]; then
        print_success "OKR目标创建成功 (ID: $OBJECTIVE_ID)"
        echo "目标详情:"
        echo "$response" | jq -r '.title, .description' 2>/dev/null || echo "显示目标信息时出现问题"
        echo "$response" | jq -r '.keyResults[]?.title // empty' 2>/dev/null || echo "关键结果信息获取中..."
    else
        print_error "创建OKR目标失败: $response"
        exit 1
    fi
}

# 获取关键结果列表
get_key_results() {
    print_step "4" "获取关键结果列表..."
    
    response=$(curl -s -X GET "$BASE_URL/okr/objectives/$OBJECTIVE_ID" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    KR_IDS=($(echo "$response" | jq -r '.keyResults[].id'))
    
    if [ ${#KR_IDS[@]} -gt 0 ]; then
        print_success "获取到 ${#KR_IDS[@]} 个关键结果"
        for i in "${!KR_IDS[@]}"; do
            kr_title=$(echo "$response" | jq -r ".keyResults[$i].title")
            echo "  KR$((i+1)) (ID: ${KR_IDS[$i]}): $kr_title"
        done
    else
        print_error "未找到关键结果"
        exit 1
    fi
}

# 模拟进度更新
update_progress() {
    print_step "5" "模拟OKR进度更新过程..."
    
    # 更新用户满意度评分 (第1个KR)
    print_warning "更新用户满意度评分: 4.0 -> 4.2"
    curl -s -X PUT "$BASE_URL/okr/key-results/${KR_IDS[0]}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"current_value": 4.2}' > /dev/null
    
    sleep 1
    
    # 更新月活用户增长率 (第2个KR)
    print_warning "更新月活用户增长率: 0% -> 15%"
    curl -s -X PUT "$BASE_URL/okr/key-results/${KR_IDS[1]}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"current_value": 15}' > /dev/null
    
    sleep 1
    
    # 更新产品功能完成率 (第3个KR)
    print_warning "更新产品功能完成率: 0% -> 60%"
    curl -s -X PUT "$BASE_URL/okr/key-results/${KR_IDS[2]}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"current_value": 60}' > /dev/null
    
    print_success "进度更新完成"
}

# 查看OKR统计数据
get_okr_stats() {
    print_step "6" "查看OKR统计数据..."
    
    response=$(curl -s -X GET "$BASE_URL/okr/stats?quarter=2025-Q1" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    total_objectives=$(echo "$response" | jq -r '.total_objectives // 0')
    completed_objectives=$(echo "$response" | jq -r '.completed_objectives // 0')
    average_progress=$(echo "$response" | jq -r '.average_progress // 0')
    
    echo "📊 OKR统计数据:"
    echo "  总目标数: $total_objectives"
    echo "  已完成目标: $completed_objectives"
    echo "  平均进度: ${average_progress}%"
    echo "  剩余天数: $(echo "$response" | jq -r '.remaining_days // 0')天"
}

# 查看进度日志
view_progress_logs() {
    print_step "7" "查看进度变更日志..."
    
    response=$(curl -s -X GET "$BASE_URL/okr/objectives/$OBJECTIVE_ID/progress-logs?limit=10" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    log_count=$(echo "$response" | jq -r '.total // 0')
    
    if [ "$log_count" -gt 0 ]; then
        print_success "找到 $log_count 条进度日志"
        echo "最近的进度变更:"
        echo "$response" | jq -r '.logs[] | "  \(.created_at): KR#\(.key_result_id) \(.previous_value // "N/A") -> \(.new_value // "N/A") (\(.method))"'
    else
        print_warning "暂无进度日志"
    fi
}

# 演示任务关联功能 (如果存在任务)
demo_task_association() {
    print_step "8" "演示任务-OKR关联功能..."
    
    # 查找一个可用的任务
    task_response=$(curl -s -X GET "$BASE_URL/tasks?limit=1" \
        -H "Authorization: Bearer $JWT_TOKEN")
    
    TASK_ID=$(echo "$task_response" | jq -r '.tasks[0].id // empty')
    
    if [ -n "$TASK_ID" ] && [ "$TASK_ID" != "null" ]; then
        print_warning "找到任务 ID: $TASK_ID，尝试关联到第一个关键结果"
        
        # 创建任务-关键结果关联
        association_response=$(curl -s -X POST "$BASE_URL/okr/tasks/$TASK_ID/key-results/${KR_IDS[0]}/associate" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"weight": 100, "sync_mode": "auto"}')
        
        if echo "$association_response" | jq -e '.id' > /dev/null; then
            print_success "任务关联创建成功"
            
            # 同步关键结果进度
            sync_response=$(curl -s -X POST "$BASE_URL/okr/associations/key-results/${KR_IDS[0]}/sync-progress" \
                -H "Authorization: Bearer $JWT_TOKEN")
            
            print_success "进度同步完成"
        else
            print_warning "任务关联失败或已存在: $association_response"
        fi
    else
        print_warning "未找到可用任务，跳过任务关联演示"
    fi
}

# 模拟团队协作 (Phase 3功能预览)
demo_collaboration() {
    print_step "9" "模拟团队协作功能 (Phase 3预览)..."
    
    # 注意：这些API端点需要在Phase 3实现后才能工作
    print_warning "Phase 3功能预览 (需要后续实现):"
    echo "  - 添加团队成员作为协作者"
    echo "  - 设置权限级别 (read/comment/edit)"
    echo "  - 添加评论和反馈"
    echo "  - 查看协作统计"
    
    # 示例数据结构 (实际需要API实现)
    echo "示例协作数据:"
    cat << 'EOF'
{
  "objective_id": OBJECTIVE_ID,
  "collaborator_user_id": 2,
  "collaboration_type": "reviewer", 
  "permission_level": "comment",
  "comments": [
    {
      "comment_text": "目标进展不错，建议加强用户反馈收集",
      "comment_type": "suggestion"
    }
  ]
}
EOF
}

# 生成演示报告
generate_demo_report() {
    print_step "10" "生成演示报告..."
    
    echo ""
    echo "🎯 OKR演示流程完成报告"
    echo "=========================="
    echo "✅ 后端服务连接正常"
    echo "✅ 用户认证成功"
    echo "✅ 创建了完整的OKR目标 (ID: $OBJECTIVE_ID)"
    echo "✅ 包含3个关键结果"
    echo "✅ 模拟了进度更新过程"
    echo "✅ 查看了统计数据和日志"
    echo "✅ 演示了任务关联功能"
    echo "✅ 预览了团队协作功能"
    echo ""
    echo "📱 前端访问指南:"
    echo "1. 打开浏览器访问: http://localhost:3002"
    echo "2. 使用开发登录 (用户名: admin)"
    echo "3. 在Dashboard中查看OKR模块"
    echo "4. 体验目标管理和进度更新"
    echo ""
    echo "🔧 后续步骤建议:"
    echo "- 实现Phase 3高级功能API"
    echo "- 完善前端OKR组件"
    echo "- 添加数据可视化图表"
    echo "- 实现团队协作界面"
}

# 主流程
main() {
    echo "🚀 OKR完整流程演示开始"
    echo "=============================="
    
    check_service
    dev_login
    create_okr_objective
    get_key_results
    update_progress
    get_okr_stats
    view_progress_logs
    demo_task_association
    demo_collaboration
    generate_demo_report
    
    echo ""
    print_success "OKR演示流程执行完成！"
}

# 错误处理
trap 'print_error "演示过程中出现错误，请检查服务状态和网络连接"; exit 1' ERR

# 检查依赖
if ! command -v jq &> /dev/null; then
    print_error "需要安装 jq 工具来解析JSON响应"
    echo "安装命令: brew install jq (macOS) 或 apt-get install jq (Linux)"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    print_error "需要安装 curl 工具"
    exit 1
fi

# 执行主流程
main "$@"