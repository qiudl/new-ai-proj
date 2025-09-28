#!/bin/bash

# Test Data Generator CLI Tool
# 测试数据生成命令行工具

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8081}"
API_BASE="$BASE_URL/api/v1/test-data"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"
CONFIG_FILE="$HOME/.ai-proj-test-data.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Load configuration
load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
        log_info "已加载配置文件: $CONFIG_FILE"
    fi
}

# Save configuration
save_config() {
    cat > "$CONFIG_FILE" << EOF
# AI Project Test Data Generator Configuration
BASE_URL="$BASE_URL"
ACCESS_TOKEN="$ACCESS_TOKEN"
EOF
    log_success "配置已保存到: $CONFIG_FILE"
}

# Setup configuration
setup_config() {
    echo "=== 测试数据生成器配置 ==="
    
    read -p "API基础URL [$BASE_URL]: " input_url
    if [[ -n "$input_url" ]]; then
        BASE_URL="$input_url"
    fi
    
    read -s -p "访问令牌 (ACCESS_TOKEN): " input_token
    echo
    if [[ -n "$input_token" ]]; then
        ACCESS_TOKEN="$input_token"
    fi
    
    API_BASE="$BASE_URL/api/v1/test-data"
    
    save_config
    log_success "配置完成！"
}

# Make API request
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local url="$API_BASE$endpoint"
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        log_error "访问令牌未设置，请运行 'setup' 命令"
        exit 1
    fi
    
    local curl_args=(
        -s
        -X "$method"
        -H "Content-Type: application/json"
        -H "Authorization: Bearer $ACCESS_TOKEN"
    )
    
    if [[ -n "$data" ]]; then
        curl_args+=(-d "$data")
    fi
    
    local response
    response=$(curl "${curl_args[@]}" "$url" 2>/dev/null)
    local status=$?
    
    if [[ $status -ne 0 ]]; then
        log_error "API请求失败: $url"
        exit 1
    fi
    
    echo "$response"
}

# Get work patterns
get_patterns() {
    log_info "获取工作模式列表..."
    
    local response
    response=$(api_request "GET" "/work-patterns")
    
    if [[ $(echo "$response" | jq -r '.success // false') == "true" ]]; then
        echo "$response" | jq -r '.patterns | to_entries[] | "\(.key): \(.value.description)"'
        log_success "工作模式列表获取成功"
    else
        log_error "获取工作模式失败: $(echo "$response" | jq -r '.message // .error // "未知错误"')"
        exit 1
    fi
}

# Get task templates
get_templates() {
    log_info "获取任务模板列表..."
    
    local response
    response=$(api_request "GET" "/task-templates")
    
    if [[ $(echo "$response" | jq -r '.success // false') == "true" ]]; then
        echo "$response" | jq -r '.templates[] | "\(.category) (\(.priority)): \(.title_pattern)"'
        log_success "任务模板列表获取成功"
    else
        log_error "获取任务模板失败: $(echo "$response" | jq -r '.message // .error // "未知错误"')"
        exit 1
    fi
}

# Quick generate
quick_generate() {
    local days="$1"
    local pattern="$2"
    
    if [[ -z "$days" ]]; then
        read -p "生成天数 [7]: " days
        days="${days:-7}"
    fi
    
    if [[ -z "$pattern" ]]; then
        echo "可用的工作模式:"
        get_patterns
        echo
        read -p "工作模式 [balanced_worker]: " pattern
        pattern="${pattern:-balanced_worker}"
    fi
    
    local data
    data=$(cat << EOF
{
    "days": $days,
    "work_pattern": "$pattern"
}
EOF
)
    
    log_info "快速生成测试数据: $days 天，模式: $pattern"
    
    local response
    response=$(api_request "POST" "/quick-generate" "$data")
    
    if [[ $(echo "$response" | jq -r '.success // false') == "true" ]]; then
        log_success "测试数据生成成功！"
        echo "创建任务数: $(echo "$response" | jq -r '.tasks_created')"
        echo "创建会话数: $(echo "$response" | jq -r '.sessions_created')"
        echo "总工作时长: $(echo "$response" | jq -r '.total_hours') 小时"
        echo "工作模式: $(echo "$response" | jq -r '.work_pattern')"
    else
        log_error "生成测试数据失败: $(echo "$response" | jq -r '.message // .error // "未知错误"')"
        exit 1
    fi
}

# Custom generate
custom_generate() {
    local start_date="$1"
    local end_date="$2"
    local pattern="$3"
    local dry_run="$4"
    
    if [[ -z "$start_date" ]]; then
        read -p "开始日期 (YYYY-MM-DD): " start_date
    fi
    
    if [[ -z "$end_date" ]]; then
        read -p "结束日期 (YYYY-MM-DD): " end_date
    fi
    
    if [[ -z "$pattern" ]]; then
        echo "可用的工作模式:"
        get_patterns
        echo
        read -p "工作模式 [balanced_worker]: " pattern
        pattern="${pattern:-balanced_worker}"
    fi
    
    if [[ -z "$dry_run" ]]; then
        read -p "预览模式 (y/N): " dry_run_input
        if [[ "$dry_run_input" =~ ^[Yy]$ ]]; then
            dry_run="true"
        else
            dry_run="false"
        fi
    fi
    
    local data
    data=$(cat << EOF
{
    "start_date": "$start_date",
    "end_date": "$end_date",
    "work_pattern": "$pattern",
    "dry_run": $dry_run
}
EOF
)
    
    log_info "自定义生成测试数据: $start_date 到 $end_date，模式: $pattern，预览: $dry_run"
    
    local response
    response=$(api_request "POST" "/" "$data")
    
    if [[ $(echo "$response" | jq -r '.success // false') == "true" ]]; then
        log_success "测试数据生成成功！"
        echo "创建任务数: $(echo "$response" | jq -r '.tasks_created')"
        echo "创建会话数: $(echo "$response" | jq -r '.sessions_created')"
        echo "日期范围: $(echo "$response" | jq -r '.date_range')"
        echo "工作模式: $(echo "$response" | jq -r '.work_pattern')"
        echo "总工作时长: $(echo "$response" | jq -r '.total_hours') 小时"
        
        local metadata
        metadata=$(echo "$response" | jq -r '.metadata')
        if [[ "$metadata" != "null" ]]; then
            echo "平均会话时长: $(echo "$metadata" | jq -r '.avg_session_length') 分钟"
        fi
    else
        log_error "生成测试数据失败: $(echo "$response" | jq -r '.message // .error // "未知错误"')"
        exit 1
    fi
}

# Get status
get_status() {
    log_info "获取测试数据状态..."
    
    local response
    response=$(api_request "GET" "/status")
    
    if [[ $(echo "$response" | jq -r '.success // false') == "true" ]]; then
        local stats
        stats=$(echo "$response" | jq -r '.stats')
        
        log_success "测试数据状态："
        echo "总会话数: $(echo "$stats" | jq -r '.total_timer_sessions')"
        echo "总工作时长: $(echo "$stats" | jq -r '.total_hours') 小时"
        echo "数据时间范围: $(echo "$stats" | jq -r '.date_range')"
        
        local last_generated
        last_generated=$(echo "$stats" | jq -r '.last_generated')
        if [[ "$last_generated" != "null" ]]; then
            echo "最后生成时间: $last_generated"
        fi
        
        local daily_breakdown
        daily_breakdown=$(echo "$stats" | jq -r '.daily_breakdown')
        if [[ "$daily_breakdown" != "null" && "$daily_breakdown" != "[]" ]]; then
            echo -e "\n最近每日统计:"
            echo "$daily_breakdown" | jq -r '.[] | "\(.date): \(.sessions)次会话, \(.hours)小时"'
        fi
        
        local sessions_by_pattern
        sessions_by_pattern=$(echo "$stats" | jq -r '.sessions_by_pattern')
        if [[ "$sessions_by_pattern" != "null" && "$sessions_by_pattern" != "{}" ]]; then
            echo -e "\n按模式分布:"
            echo "$sessions_by_pattern" | jq -r 'to_entries[] | "\(.key): \(.value)次"'
        fi
    else
        log_error "获取状态失败: $(echo "$response" | jq -r '.message // .error // "未知错误"')"
        exit 1
    fi
}

# Cleanup data
cleanup_data() {
    local days="$1"
    
    if [[ -z "$days" ]]; then
        read -p "清理多少天前的数据: " days
    fi
    
    log_warning "将删除 $days 天前的测试数据，此操作不可恢复！"
    read -p "确认删除? (y/N): " confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        return 0
    fi
    
    local data
    data=$(cat << EOF
{
    "older_than_days": $days,
    "confirm": true
}
EOF
)
    
    log_info "清理 $days 天前的测试数据..."
    
    local response
    response=$(api_request "POST" "/cleanup" "$data")
    
    if [[ $(echo "$response" | jq -r '.success // false') == "true" ]]; then
        log_success "测试数据清理完成！"
    else
        log_error "清理失败: $(echo "$response" | jq -r '.message // .error // "未知错误"')"
        exit 1
    fi
}

# Show usage
show_usage() {
    cat << EOF
AI Project 测试数据生成器

用法: $0 <命令> [参数]

命令:
  setup                          配置API访问参数
  patterns                       显示可用的工作模式
  templates                      显示可用的任务模板
  quick [天数] [模式]              快速生成测试数据
  generate [开始日期] [结束日期] [模式] [预览]  自定义生成测试数据
  status                         显示当前测试数据状态
  cleanup [天数]                 清理指定天数前的测试数据
  help                           显示此帮助信息

示例:
  $0 setup                       # 首次使用前配置
  $0 quick 7 balanced_worker     # 生成7天的平衡型工作数据
  $0 generate 2024-01-01 2024-01-07 focused_developer  # 自定义生成
  $0 status                      # 查看当前状态
  $0 cleanup 30                  # 清理30天前的数据

工作模式:
  focused_developer              专注型开发者
  meeting_heavy                  会议密集型
  balanced_worker                平衡型工作者
  creative_burst                 创意爆发型

环境变量:
  BASE_URL                       API基础URL (默认: http://localhost:8081)
  ACCESS_TOKEN                   访问令牌

配置文件: $CONFIG_FILE
EOF
}

# Check dependencies
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        log_error "需要安装 jq 工具来解析JSON"
        log_info "安装命令: brew install jq (macOS) 或 apt-get install jq (Ubuntu)"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "需要安装 curl 工具"
        exit 1
    fi
}

# Main function
main() {
    check_dependencies
    load_config
    
    local command="${1:-help}"
    
    case "$command" in
        "setup")
            setup_config
            ;;
        "patterns")
            get_patterns
            ;;
        "templates")
            get_templates
            ;;
        "quick")
            quick_generate "$2" "$3"
            ;;
        "generate")
            custom_generate "$2" "$3" "$4" "$5"
            ;;
        "status")
            get_status
            ;;
        "cleanup")
            cleanup_data "$2"
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "未知命令: $command"
            echo
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"