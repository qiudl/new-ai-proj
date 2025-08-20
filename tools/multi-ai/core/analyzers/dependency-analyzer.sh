#!/bin/bash

# 任务依赖分析器
# 用于分析任务间的依赖关系，生成最优执行计划

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')]${NC} $1"
}

# 依赖分析器配置
TASK_SYSTEM_URL=""
PROJECT_ID=""
JWT_TOKEN=""

# 获取JWT Token (from auth manager)
get_jwt_token() {
    local task_url="$1"
    local username="${2:-admin}"
    local password="${3:-admin123}"
    
    if [[ -z "$task_url" ]]; then
        return 1
    fi
    
    log "正在获取JWT token..."
    
    local login_response
    login_response=$(curl -s -X POST "${task_url}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${username}\",\"password\":\"${password}\"}" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        warn "无法连接到任务系统: $task_url"
        return 1
    fi
    
    # 检查登录是否成功
    if echo "$login_response" | jq -e '.success == true' >/dev/null 2>&1; then
        local token=$(echo "$login_response" | jq -r '.data.token')
        if [[ "$token" != "null" && -n "$token" ]]; then
            echo "$token"
            return 0
        fi
    fi
    
    local error_msg=$(echo "$login_response" | jq -r '.error.message // .message // "未知错误"')
    warn "任务系统登录失败: $error_msg"
    return 1
}

# 获取任务详情
get_task_details() {
    local task_id="$1"
    
    if [[ -z "$task_id" || -z "$TASK_SYSTEM_URL" || -z "$PROJECT_ID" || -z "$JWT_TOKEN" ]]; then
        return 1
    fi
    
    local task_response
    task_response=$(curl -s -X GET "$TASK_SYSTEM_URL/api/v1/projects/$PROJECT_ID/tasks/$task_id" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && echo "$task_response" | jq -e '.success == true' >/dev/null 2>&1; then
        echo "$task_response" | jq -r '.data'
        return 0
    else
        return 1
    fi
}

# 获取项目所有任务
get_all_project_tasks() {
    if [[ -z "$TASK_SYSTEM_URL" || -z "$PROJECT_ID" || -z "$JWT_TOKEN" ]]; then
        return 1
    fi
    
    local tasks_response
    tasks_response=$(curl -s -X GET "$TASK_SYSTEM_URL/api/v1/projects/$PROJECT_ID/tasks?limit=1000" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && echo "$tasks_response" | jq -e '.success == true' >/dev/null 2>&1; then
        echo "$tasks_response" | jq -r '.data.list'
        return 0
    else
        return 1
    fi
}

# 构建依赖图
build_dependency_graph() {
    local task_list="$1"
    local dependency_graph="{}"
    
    # 遍历所有任务，提取依赖关系
    while IFS= read -r task; do
        if [[ -n "$task" && "$task" != "null" ]]; then
            local task_id=$(echo "$task" | jq -r '.id')
            local dependencies=$(echo "$task" | jq -r '.dependencies // []')
            local parent_id=$(echo "$task" | jq -r '.parentId // null')
            
            # 构建依赖节点
            local node="{
                \"id\": \"$task_id\",
                \"title\": $(echo "$task" | jq -r '.title'),
                \"status\": $(echo "$task" | jq -r '.status'),
                \"dependencies\": $dependencies,
                \"parent\": \"$parent_id\",
                \"children\": []
            }"
            
            dependency_graph=$(echo "$dependency_graph" | jq ". + {\"$task_id\": $node}")
        fi
    done <<< "$(echo "$task_list" | jq -c '.[]')"
    
    echo "$dependency_graph"
}

# 检测循环依赖
detect_circular_dependencies() {
    local dependency_graph="$1"
    local visited="{}"
    local rec_stack="{}"
    
    # DFS检测循环依赖的算法
    # 这里简化实现，实际可以更复杂
    log "检测循环依赖..."
    
    # 遍历所有节点
    local task_ids
    task_ids=$(echo "$dependency_graph" | jq -r 'keys[]')
    
    while IFS= read -r task_id; do
        if [[ -n "$task_id" ]]; then
            local dependencies
            dependencies=$(echo "$dependency_graph" | jq -r ".\"$task_id\".dependencies[]?")
            
            while IFS= read -r dep_id; do
                if [[ -n "$dep_id" && "$dep_id" != "null" ]]; then
                    # 检查依赖任务是否也依赖当前任务（简单循环检测）
                    local reverse_deps
                    reverse_deps=$(echo "$dependency_graph" | jq -r ".\"$dep_id\".dependencies[]?" 2>/dev/null)
                    
                    while IFS= read -r reverse_dep; do
                        if [[ "$reverse_dep" == "$task_id" ]]; then
                            error "发现循环依赖: $task_id <-> $dep_id"
                            return 1
                        fi
                    done <<< "$reverse_deps"
                fi
            done <<< "$dependencies"
        fi
    done <<< "$task_ids"
    
    log "未发现循环依赖"
    return 0
}

# 生成拓扑排序
generate_topological_sort() {
    local dependency_graph="$1"
    local sorted_tasks="[]"
    local in_degree="{}"
    
    # 计算入度
    local task_ids
    task_ids=$(echo "$dependency_graph" | jq -r 'keys[]')
    
    # 初始化入度
    while IFS= read -r task_id; do
        if [[ -n "$task_id" ]]; then
            in_degree=$(echo "$in_degree" | jq ". + {\"$task_id\": 0}")
        fi
    done <<< "$task_ids"
    
    # 计算每个任务的入度
    while IFS= read -r task_id; do
        if [[ -n "$task_id" ]]; then
            local dependencies
            dependencies=$(echo "$dependency_graph" | jq -r ".\"$task_id\".dependencies[]?")
            
            while IFS= read -r dep_id; do
                if [[ -n "$dep_id" && "$dep_id" != "null" ]]; then
                    local current_degree
                    current_degree=$(echo "$in_degree" | jq -r ".\"$task_id\" // 0")
                    in_degree=$(echo "$in_degree" | jq ".\"$task_id\" = $((current_degree + 1))")
                fi
            done <<< "$dependencies"
        fi
    done <<< "$task_ids"
    
    # 执行拓扑排序
    local queue="[]"
    local execution_plan="{\"parallel_groups\": [], \"serial_tasks\": []}"
    
    # 找到所有入度为0的任务（可以并行执行）
    while IFS= read -r task_id; do
        if [[ -n "$task_id" ]]; then
            local degree
            degree=$(echo "$in_degree" | jq -r ".\"$task_id\"")
            if [[ "$degree" == "0" ]]; then
                queue=$(echo "$queue" | jq ". + [\"$task_id\"]")
            fi
        fi
    done <<< "$task_ids"
    
    local level=0
    while [[ $(echo "$queue" | jq '. | length') -gt 0 ]]; do
        local current_level="[]"
        local next_queue="[]"
        
        # 当前层级的所有任务（可并行执行）
        while IFS= read -r task_id; do
            if [[ -n "$task_id" && "$task_id" != "null" ]]; then
                current_level=$(echo "$current_level" | jq ". + [\"$task_id\"]")
                
                # 减少依赖此任务的其他任务的入度
                while IFS= read -r other_task_id; do
                    if [[ -n "$other_task_id" ]]; then
                        local other_deps
                        other_deps=$(echo "$dependency_graph" | jq -r ".\"$other_task_id\".dependencies[]?")
                        
                        while IFS= read -r dep_id; do
                            if [[ "$dep_id" == "$task_id" ]]; then
                                local current_degree
                                current_degree=$(echo "$in_degree" | jq -r ".\"$other_task_id\"")
                                local new_degree=$((current_degree - 1))
                                in_degree=$(echo "$in_degree" | jq ".\"$other_task_id\" = $new_degree")
                                
                                if [[ "$new_degree" == "0" ]]; then
                                    next_queue=$(echo "$next_queue" | jq ". + [\"$other_task_id\"]")
                                fi
                            fi
                        done <<< "$other_deps"
                    fi
                done <<< "$(echo "$dependency_graph" | jq -r 'keys[]')"
            fi
        done <<< "$(echo "$queue" | jq -r '.[]')"
        
        # 添加当前层级到执行计划
        if [[ $(echo "$current_level" | jq '. | length') -gt 0 ]]; then
            local group="{\"level\": $level, \"tasks\": $current_level, \"parallel\": true}"
            execution_plan=$(echo "$execution_plan" | jq ".parallel_groups += [$group]")
            level=$((level + 1))
        fi
        
        queue="$next_queue"
    done
    
    echo "$execution_plan"
}

# 分析任务列表的依赖关系
analyze_task_dependencies() {
    local task_list="$1"
    
    log "开始分析任务依赖关系..."
    
    # 1. 构建依赖图
    log "构建依赖图..."
    local dependency_graph
    dependency_graph=$(build_dependency_graph "$task_list")
    
    # 2. 检测循环依赖
    if ! detect_circular_dependencies "$dependency_graph"; then
        error "存在循环依赖，无法生成执行计划"
        return 1
    fi
    
    # 3. 生成拓扑排序和执行计划
    log "生成执行计划..."
    local execution_plan
    execution_plan=$(generate_topological_sort "$dependency_graph")
    
    # 4. 输出分析结果
    echo "{
        \"dependency_graph\": $dependency_graph,
        \"execution_plan\": $execution_plan
    }"
    
    return 0
}

# 分析配置文件中的任务
analyze_config_tasks() {
    local config_file="$1"
    
    if [[ ! -f "$config_file" ]]; then
        error "配置文件不存在: $config_file"
        return 1
    fi
    
    # 解析配置文件
    TASK_SYSTEM_URL=$(jq -r '.project.taskSystem.url // ""' "$config_file")
    PROJECT_ID=$(jq -r '.project.taskSystem.projectId // ""' "$config_file")
    
    if [[ -z "$TASK_SYSTEM_URL" || -z "$PROJECT_ID" ]]; then
        error "配置文件中缺少任务系统信息"
        return 1
    fi
    
    # 获取JWT Token
    JWT_TOKEN=$(get_jwt_token "$TASK_SYSTEM_URL")
    if [[ $? -ne 0 || -z "$JWT_TOKEN" ]]; then
        error "无法获取JWT token"
        return 1
    fi
    
    # 提取配置中涉及的任务ID
    local task_ids
    task_ids=$(jq -r '.aiExperts[].tasks[]' "$config_file" | sort -u)
    
    log "配置中涉及的任务: $(echo "$task_ids" | tr '\n' ' ')"
    
    # 获取完整任务列表（用于依赖分析）
    log "获取项目所有任务..."
    local all_tasks
    all_tasks=$(get_all_project_tasks)
    
    if [[ $? -ne 0 ]]; then
        error "无法获取项目任务列表"
        return 1
    fi
    
    # 分析依赖关系
    local analysis_result
    analysis_result=$(analyze_task_dependencies "$all_tasks")
    
    if [[ $? -eq 0 ]]; then
        echo "$analysis_result"
        return 0
    else
        return 1
    fi
}

# 显示帮助
show_help() {
    echo "任务依赖分析器 - 分析多AI开发任务的依赖关系"
    echo ""
    echo "用法:"
    echo "  $0 [配置文件]              # 分析配置文件中的任务依赖"
    echo "  $0 --project [项目ID]      # 分析指定项目的所有任务"
    echo "  $0 --tasks [任务ID列表]    # 分析指定任务的依赖关系"
    echo "  $0 --help                 # 显示帮助"
    echo ""
    echo "示例:"
    echo "  $0 branding-config.json    # 分析品牌配置项目的任务依赖"
    echo "  $0 --project 39           # 分析项目39的所有任务依赖"
    echo "  $0 --tasks 331,332,330    # 分析特定任务的依赖关系"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "      任务依赖分析器 v1.0"
    echo "========================================"
    echo -e "${NC}"
    
    case "${1:-}" in
        --help)
            show_help
            ;;
        --project)
            if [[ -z "$2" ]]; then
                error "请指定项目ID"
                exit 1
            fi
            PROJECT_ID="$2"
            TASK_SYSTEM_URL="${3:-http://localhost:8081}"
            # TODO: 实现项目级分析
            ;;
        --tasks)
            if [[ -z "$2" ]]; then
                error "请指定任务ID列表"
                exit 1
            fi
            # TODO: 实现任务级分析
            ;;
        *)
            if [[ -n "$1" ]]; then
                analyze_config_tasks "$1"
            else
                show_help
            fi
            ;;
    esac
}

# 检查依赖
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        error "jq 未安装，请安装: brew install jq"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        error "curl 未安装，请安装curl"
        exit 1
    fi
}

# 运行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    main "$@"
fi