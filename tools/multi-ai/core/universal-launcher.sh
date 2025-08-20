#!/bin/bash

# 通用多AI启动器
# 用法: universal-multi-ai.sh [配置文件路径]
# 默认配置文件: ./multi-ai-config.json

set -e

# 默认配置
DEFAULT_CONFIG="multi-ai-config.json"
CONFIG_FILE="${1:-$DEFAULT_CONFIG}"

# 默认代理配置（如果配置文件中没有指定）
DEFAULT_PROXY_COMMAND="source ~/proxy.sh local"

# 任务系统认证配置
TASK_SYSTEM_USERNAME="admin"
TASK_SYSTEM_PASSWORD="admin123"

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

# 获取JWT Token
get_jwt_token() {
    local task_url="$1"
    if [[ -z "$task_url" ]]; then
        return 1
    fi
    
    log "正在获取任务系统JWT token..."
    
    local login_response
    login_response=$(curl -s -X POST "${task_url}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${TASK_SYSTEM_USERNAME}\",\"password\":\"${TASK_SYSTEM_PASSWORD}\"}" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        warn "无法连接到任务系统: $task_url"
        return 1
    fi
    
    # 检查登录是否成功
    if echo "$login_response" | jq -e '.success == true' >/dev/null 2>&1; then
        # 提取token
        local token=$(echo "$login_response" | jq -r '.data.token')
        if [[ "$token" != "null" && -n "$token" ]]; then
            echo "$token"
            log "JWT token 获取成功"
            return 0
        fi
    fi
    
    # 登录失败，显示错误信息
    local error_msg=$(echo "$login_response" | jq -r '.error.message // .message // "未知错误"')
    warn "任务系统登录失败: $error_msg"
    return 1
}

# 获取任务信息
get_task_info() {
    local task_id="$1"
    if [[ -z "$task_id" || -z "$TASK_SYSTEM_URL" || -z "$PROJECT_ID" ]]; then
        return 1
    fi
    
    log "获取任务 $task_id 信息..."
    
    # 获取JWT token
    local token
    token=$(get_jwt_token "$TASK_SYSTEM_URL")
    if [[ $? -ne 0 || -z "$token" ]]; then
        warn "无法获取JWT token，跳过任务信息获取"
        return 1
    fi
    
    # 获取任务详情
    local task_response
    task_response=$(curl -s -X GET "$TASK_SYSTEM_URL/api/v1/projects/$PROJECT_ID/tasks/$task_id" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" 2>/dev/null)
    
    if [[ $? -eq 0 ]] && echo "$task_response" | jq -e '.success == true' >/dev/null 2>&1; then
        local task_title=$(echo "$task_response" | jq -r '.data.title // "未知任务"')
        local task_status=$(echo "$task_response" | jq -r '.data.status // "未知状态"')
        log "任务 $task_id: $task_title (状态: $task_status)"
        echo "$task_title"
        return 0
    else
        local error_msg=$(echo "$task_response" | jq -r '.error.message // .message // "获取失败"')
        warn "获取任务 $task_id 信息失败: $error_msg"
        return 1
    fi
}

# 检查依赖
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        error "jq 未安装，请安装: brew install jq"
        exit 1
    fi
    
    if ! command -v claude &> /dev/null; then
        error "Claude Code CLI 未安装"
        exit 1
    fi
    
    if [[ "$OSTYPE" != "darwin"* ]]; then
        error "此脚本仅支持 macOS (需要 osascript)"
        exit 1
    fi
}

# 检查配置文件
check_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "配置文件不存在: $CONFIG_FILE"
        log "创建示例配置..."
        create_sample_config
        exit 1
    fi
    
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        error "配置文件格式错误: $CONFIG_FILE"
        exit 1
    fi
    
    log "配置文件验证通过: $CONFIG_FILE"
}

# 创建示例配置
create_sample_config() {
    cat > "$CONFIG_FILE" << 'EOF'
{
  "project": {
    "name": "示例项目",
    "path": "/path/to/your/project",
    "taskSystem": {
      "url": "http://localhost:8081",
      "projectId": 39
    }
  },
  "environment": {
    "proxyScript": "~/proxy.sh local",
    "preCommands": [
      "echo '🚀 启动开发环境...'",
      "git status"
    ]
  },
  "aiExperts": [
    {
      "id": "backend",
      "name": "🔧 后端AI专家",
      "description": "负责后端开发、数据库、API等",
      "tasks": ["321", "322", "326"],
      "workingDir": "./backend",
      "specialties": ["Go", "数据库", "API", "微服务"],
      "concurrent": 2
    },
    {
      "id": "frontend", 
      "name": "🎨 前端AI专家",
      "description": "负责前端界面、组件开发等",
      "tasks": ["328", "323", "325"],
      "workingDir": "./frontend",
      "specialties": ["Vue3", "React", "UI/UX", "JavaScript"],
      "concurrent": 2
    },
    {
      "id": "devops",
      "name": "🏗️ 架构AI专家", 
      "description": "负责架构设计、运维、测试等",
      "tasks": ["329", "327"],
      "workingDir": "./",
      "specialties": ["架构", "Docker", "CI/CD", "测试"],
      "concurrent": 3
    }
  ]
}
EOF
    log "示例配置已创建: $CONFIG_FILE"
    log "请修改配置文件后重新运行"
}

# 解析配置
parse_config() {
    PROJECT_NAME=$(jq -r '.project.name' "$CONFIG_FILE")
    PROJECT_PATH=$(jq -r '.project.path' "$CONFIG_FILE")
    TASK_SYSTEM_URL=$(jq -r '.project.taskSystem.url // ""' "$CONFIG_FILE")
    PROJECT_ID=$(jq -r '.project.taskSystem.projectId // ""' "$CONFIG_FILE")
    
    PROXY_SCRIPT=$(jq -r '.environment.proxyScript // ""' "$CONFIG_FILE")
    PRE_COMMANDS=$(jq -r '.environment.preCommands[]? // ""' "$CONFIG_FILE")
    
    # 如果配置文件中没有指定代理脚本，使用默认代理
    if [[ -z "$PROXY_SCRIPT" ]]; then
        PROXY_SCRIPT="$DEFAULT_PROXY_COMMAND"
        log "使用默认代理配置: $DEFAULT_PROXY_COMMAND"
    fi
    
    # 展开路径中的 ~ 
    PROJECT_PATH="${PROJECT_PATH/#\~/$HOME}"
    # 注意：PROXY_SCRIPT 现在可能是完整命令，不只是路径
    
    log "项目: $PROJECT_NAME"
    log "路径: $PROJECT_PATH" 
    log "代理: $PROXY_SCRIPT"
}

# 验证项目路径
validate_project() {
    if [[ ! -d "$PROJECT_PATH" ]]; then
        error "项目路径不存在: $PROJECT_PATH"
        exit 1
    fi
    
    cd "$PROJECT_PATH" || {
        error "无法进入项目目录: $PROJECT_PATH"
        exit 1
    }
    
    log "项目目录验证通过"
}

# 启动AI专家
start_ai_expert() {
    local expert_id="$1"
    local expert_data="$2"
    
    local name=$(echo "$expert_data" | jq -r '.name')
    local description=$(echo "$expert_data" | jq -r '.description')
    local tasks=$(echo "$expert_data" | jq -r '.tasks | join(", ")')
    local working_dir=$(echo "$expert_data" | jq -r '.workingDir // "."')
    local specialties=$(echo "$expert_data" | jq -r '.specialties | join(", ")')
    
    # 构建完整路径
    local full_working_dir="$PROJECT_PATH/$working_dir"
    full_working_dir=$(realpath "$full_working_dir" 2>/dev/null || echo "$full_working_dir")
    
    log "启动 $name..."
    
    # 构建终端命令
    local terminal_cmd="cd '$full_working_dir'"
    
    # 添加代理脚本（每个终端都会应用）
    if [[ -n "$PROXY_SCRIPT" ]]; then
        # 如果是完整命令（包含source），直接使用
        if [[ "$PROXY_SCRIPT" == *"source"* ]]; then
            terminal_cmd="$terminal_cmd && $PROXY_SCRIPT"
        else
            # 如果只是路径，检查文件存在性
            if [[ -f "${PROXY_SCRIPT/#\~/$HOME}" ]]; then
                terminal_cmd="$terminal_cmd && source '$PROXY_SCRIPT'"
            else
                warn "代理脚本不存在: $PROXY_SCRIPT"
            fi
        fi
        log "为 $name 应用代理配置"
    fi
    
    # 添加预命令
    if [[ -n "$PRE_COMMANDS" ]]; then
        while IFS= read -r cmd; do
            if [[ -n "$cmd" ]]; then
                terminal_cmd="$terminal_cmd && $cmd"
            fi
        done <<< "$PRE_COMMANDS"
    fi
    
    # 添加AI信息显示
    terminal_cmd="$terminal_cmd && echo '$name' && echo '$description'"
    
    # 获取并显示真实任务信息
    if [[ -n "$TASK_SYSTEM_URL" && -n "$PROJECT_ID" ]]; then
        local task_array=$(echo "$expert_data" | jq -r '.tasks[]?')
        local task_details=""
        
        # 为每个任务获取详细信息
        while IFS= read -r task_id; do
            if [[ -n "$task_id" ]]; then
                local task_title
                task_title=$(get_task_info "$task_id" 2>/dev/null)
                if [[ $? -eq 0 && -n "$task_title" ]]; then
                    task_details="$task_details\n  - 任务$task_id: $task_title"
                else
                    task_details="$task_details\n  - 任务$task_id: 获取信息失败"
                fi
            fi
        done <<< "$task_array"
        
        terminal_cmd="$terminal_cmd && echo -e '负责任务:$task_details'"
        terminal_cmd="$terminal_cmd && echo '任务系统: $TASK_SYSTEM_URL/projects/$PROJECT_ID'"
    else
        terminal_cmd="$terminal_cmd && echo '负责任务: $tasks'"
    fi
    
    terminal_cmd="$terminal_cmd && echo '专长领域: $specialties'"
    terminal_cmd="$terminal_cmd && echo '工作目录: $working_dir'"
    
    # 添加快速开始提示
    if [[ -n "$TASK_SYSTEM_URL" && -n "$PROJECT_ID" ]]; then
        local first_task=$(echo "$expert_data" | jq -r '.tasks[0] // ""')
        if [[ -n "$first_task" ]]; then
            terminal_cmd="$terminal_cmd && echo ''"
            terminal_cmd="$terminal_cmd && echo '💡 快速开始: 输入 \"请执行任务ID $first_task\" 开始开发'"
            terminal_cmd="$terminal_cmd && echo ''"
        fi
    fi
    
    terminal_cmd="$terminal_cmd && echo '---' && claude code"
    
    # 启动终端
    osascript -e "
    tell application \"Terminal\"
        do script \"$terminal_cmd\"
    end tell" > /dev/null 2>&1
    
    log "$name 已启动"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "      通用多AI启动器 v2.0"
    echo "========================================"
    echo -e "${NC}"
    
    check_dependencies
    check_config
    parse_config
    validate_project
    
    log "开始启动 $PROJECT_NAME 的AI专家团队..."
    
    # 获取AI专家数量
    local expert_count=$(jq -r '.aiExperts | length' "$CONFIG_FILE")
    log "发现 $expert_count 个AI专家"
    
    # 启动每个AI专家
    for ((i=0; i<expert_count; i++)); do
        local expert_data=$(jq -r ".aiExperts[$i]" "$CONFIG_FILE")
        local expert_id=$(echo "$expert_data" | jq -r '.id')
        
        start_ai_expert "$expert_id" "$expert_data"
        sleep 2  # 避免终端启动冲突
    done
    
    echo ""
    log "✅ 所有AI专家已启动完成！"
    
    # 显示启动总结
    echo -e "\n${YELLOW}📋 启动总结:${NC}"
    for ((i=0; i<expert_count; i++)); do
        local expert_data=$(jq -r ".aiExperts[$i]" "$CONFIG_FILE")
        local name=$(echo "$expert_data" | jq -r '.name')
        local tasks=$(echo "$expert_data" | jq -r '.tasks | join(", ")')
        
        # 如果有任务系统连接，显示详细任务信息
        if [[ -n "$TASK_SYSTEM_URL" && -n "$PROJECT_ID" ]]; then
            local task_array=$(echo "$expert_data" | jq -r '.tasks[]?')
            local task_summary=""
            
            while IFS= read -r task_id; do
                if [[ -n "$task_id" ]]; then
                    local task_title
                    task_title=$(get_task_info "$task_id" 2>/dev/null)
                    if [[ $? -eq 0 && -n "$task_title" ]]; then
                        if [[ -z "$task_summary" ]]; then
                            task_summary="$task_id($task_title)"
                        else
                            task_summary="$task_summary, $task_id($task_title)"
                        fi
                    else
                        if [[ -z "$task_summary" ]]; then
                            task_summary="$task_id"
                        else
                            task_summary="$task_summary, $task_id"
                        fi
                    fi
                fi
            done <<< "$task_array"
            
            echo -e "   $name: $task_summary"
        else
            echo -e "   $name: 任务 $tasks"
        fi
    done
    
    echo -e "\n${YELLOW}💡 使用提示:${NC}"
    echo "   在每个终端中输入任务ID开始开发，例如："
    echo "   \"请执行任务ID 321\""
    
    if [[ -n "$TASK_SYSTEM_URL" ]]; then
        echo "   任务管理: $TASK_SYSTEM_URL/projects/$PROJECT_ID"
    fi
}

# 显示帮助
show_help() {
    echo "通用多AI启动器 - 自动启动多个Claude Code实例"
    echo ""
    echo "用法:"
    echo "  $0 [配置文件]          # 使用指定配置文件启动"
    echo "  $0                    # 使用默认配置 multi-ai-config.json"
    echo "  $0 --help            # 显示帮助"
    echo "  $0 --init [项目名]    # 创建新项目配置"
    echo ""
    echo "配置文件结构:"
    echo "  project.name         - 项目名称"  
    echo "  project.path         - 项目路径"
    echo "  aiExperts[]          - AI专家配置数组"
    echo "  environment          - 环境配置"
    echo ""
    echo "示例:"
    echo "  $0 my-project.json   # 使用自定义配置"
    echo "  $0 --init web-app    # 为web-app项目创建配置"
}

# 创建项目配置
create_project_config() {
    local project_name="$1"
    local config_name="${project_name}-ai-config.json"
    
    log "为项目 '$project_name' 创建配置: $config_name"
    
    cat > "$config_name" << EOF
{
  "project": {
    "name": "$project_name",
    "path": "$(pwd)",
    "taskSystem": {
      "url": "http://localhost:8081",
      "projectId": 1
    }
  },
  "environment": {
    "proxyScript": "~/proxy.sh local",
    "preCommands": [
      "echo '🚀 启动 $project_name 开发环境...'",
      "git status"
    ]
  },
  "aiExperts": [
    {
      "id": "backend",
      "name": "🔧 后端AI专家",
      "description": "负责后端开发、数据库、API等",
      "tasks": ["1", "2", "3"],
      "workingDir": "./backend",
      "specialties": ["Go", "Python", "数据库", "API"],
      "concurrent": 2
    },
    {
      "id": "frontend", 
      "name": "🎨 前端AI专家",
      "description": "负责前端界面、组件开发等",
      "tasks": ["4", "5", "6"],
      "workingDir": "./frontend",
      "specialties": ["Vue3", "React", "JavaScript", "CSS"],
      "concurrent": 2
    }
  ]
}
EOF
    
    log "配置文件已创建: $config_name"
    log "请根据实际项目修改配置后使用"
}

# 处理命令行参数
case "${1:-}" in
    --help)
        show_help
        ;;
    --init)
        if [[ -z "$2" ]]; then
            error "请指定项目名称: $0 --init <项目名>"
            exit 1
        fi
        create_project_config "$2"
        ;;
    *)
        main "$@"
        ;;
esac