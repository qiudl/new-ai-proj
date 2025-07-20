#!/bin/bash

# 审计日志演示数据生成脚本
# Generate Demo Data for Audit Log Testing

echo "🎭 生成审计日志演示数据..."

# 配置
API_BASE_URL="http://localhost:8080/api/v1"
DB_NAME="ai_project_db"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查数据库连接
check_database() {
    echo -e "${BLUE}检查数据库连接...${NC}"
    
    # 检查PostgreSQL是否运行
    if ! pgrep -x "postgres" > /dev/null; then
        echo -e "${RED}❌ PostgreSQL 未运行${NC}"
        echo "请启动PostgreSQL服务"
        exit 1
    fi
    
    echo -e "${GREEN}✓ PostgreSQL 正在运行${NC}"
}

# 创建审计日志表（如果不存在）
create_audit_table() {
    echo -e "${BLUE}创建审计日志表...${NC}"
    
    psql -d "$DB_NAME" -c "
    CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        event_id VARCHAR(255) NOT NULL UNIQUE,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        user_id INTEGER,
        user_email VARCHAR(255),
        user_name VARCHAR(255),
        user_role VARCHAR(100),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100),
        resource_name VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(255),
        request_id VARCHAR(255),
        description TEXT,
        before_data JSONB,
        after_data JSONB,
        changes JSONB,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        project_id INTEGER,
        parent_event_id VARCHAR(255),
        correlation_id VARCHAR(255),
        metadata JSONB,
        tags TEXT[]
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    "
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 审计日志表创建成功${NC}"
    else
        echo -e "${RED}❌ 审计日志表创建失败${NC}"
        exit 1
    fi
}

# 生成演示数据
generate_demo_data() {
    echo -e "${BLUE}生成演示数据...${NC}"
    
    # 清理现有数据
    psql -d "$DB_NAME" -c "TRUNCATE TABLE audit_logs RESTART IDENTITY;"
    
    # 用户列表
    declare -a users=("张三" "李四" "王五" "赵六" "孙七" "周八" "吴九" "郑十")
    declare -a user_ids=(1 2 3 4 5 6 7 8)
    declare -a actions=("create" "update" "delete" "login" "logout" "restore" "export")
    declare -a entities=("project" "task" "user")
    declare -a statuses=("success" "success" "success" "failed" "error")
    declare -a ips=("192.168.1.100" "192.168.1.101" "192.168.1.102" "10.0.0.1" "172.16.0.1")
    
    # 生成过去30天的数据
    for day in {0..29}; do
        # 每天生成20-50条记录
        records_per_day=$((20 + RANDOM % 31))
        
        for ((i=1; i<=records_per_day; i++)); do
            # 随机选择数据
            user_idx=$((RANDOM % ${#users[@]}))
            user_name="${users[$user_idx]}"
            user_id="${user_ids[$user_idx]}"
            action="${actions[$((RANDOM % ${#actions[@]}))]}"
            entity="${entities[$((RANDOM % ${#entities[@]}))]}"
            status="${statuses[$((RANDOM % ${#statuses[@]}))]}"
            ip="${ips[$((RANDOM % ${#ips[@]}))]}"
            
            # 生成时间戳（过去N天内的随机时间）
            days_ago=$day
            hours=$((RANDOM % 24))
            minutes=$((RANDOM % 60))
            seconds=$((RANDOM % 60))
            
            # 生成事件ID
            event_id="evt_$(date +%s)_${RANDOM}"
            
            # 生成描述
            case $action in
                "create")
                    description="用户 $user_name 创建了新的$entity"
                    ;;
                "update")
                    description="用户 $user_name 更新了$entity信息"
                    ;;
                "delete")
                    description="用户 $user_name 删除了$entity"
                    ;;
                "login")
                    description="用户 $user_name 登录系统"
                    entity="user"
                    ;;
                "logout")
                    description="用户 $user_name 退出系统"
                    entity="user"
                    ;;
                "restore")
                    description="用户 $user_name 恢复了被删除的$entity"
                    ;;
                "export")
                    description="用户 $user_name 导出了$entity数据"
                    ;;
            esac
            
            # 生成错误消息（如果状态是失败的）
            error_message="NULL"
            if [ "$status" = "failed" ] || [ "$status" = "error" ]; then
                error_message="'操作失败: 权限不足或资源不存在'"
            fi
            
            # 生成JSON数据
            metadata="{\"browser\": \"Chrome\", \"os\": \"Windows\", \"version\": \"1.0\"}"
            after_data="{\"name\": \"示例$entity\", \"status\": \"active\"}"
            
            # 插入数据
            timestamp=$(date -d "$days_ago days ago $hours:$minutes:$seconds" '+%Y-%m-%d %H:%M:%S')
            
            psql -d "$DB_NAME" -c "
            INSERT INTO audit_logs (
                event_id, timestamp, user_id, user_name, user_role, action, 
                resource_type, resource_id, resource_name, ip_address, 
                user_agent, session_id, description, after_data, 
                status, error_message, metadata
            ) VALUES (
                '$event_id',
                '$timestamp',
                $user_id,
                '$user_name',
                'user',
                '$action',
                '$entity',
                '$((RANDOM % 100 + 1))',
                '示例${entity}_$((RANDOM % 1000))',
                '$ip',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'sess_$((RANDOM % 10000))',
                '$description',
                '$after_data',
                '$status',
                $error_message,
                '$metadata'
            );
            " > /dev/null 2>&1
        done
        
        echo -ne "\r${YELLOW}进度: $((day * 100 / 29))% - 已生成 $((day + 1)) 天的数据${NC}"
    done
    
    echo -e "\n${GREEN}✓ 演示数据生成完成${NC}"
}

# 验证数据
verify_data() {
    echo -e "\n${BLUE}验证生成的数据...${NC}"
    
    # 统计总记录数
    total_records=$(psql -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM audit_logs;")
    echo -e "总记录数: ${GREEN}$total_records${NC}"
    
    # 统计各种操作类型
    echo -e "\n操作类型分布:"
    psql -d "$DB_NAME" -c "
    SELECT action as 操作类型, COUNT(*) as 数量 
    FROM audit_logs 
    GROUP BY action 
    ORDER BY COUNT(*) DESC;
    "
    
    # 统计各种实体类型
    echo -e "\n实体类型分布:"
    psql -d "$DB_NAME" -c "
    SELECT resource_type as 实体类型, COUNT(*) as 数量 
    FROM audit_logs 
    GROUP BY resource_type 
    ORDER BY COUNT(*) DESC;
    "
    
    # 统计状态分布
    echo -e "\n状态分布:"
    psql -d "$DB_NAME" -c "
    SELECT status as 状态, COUNT(*) as 数量 
    FROM audit_logs 
    GROUP BY status 
    ORDER BY COUNT(*) DESC;
    "
    
    # 最近的10条记录
    echo -e "\n最近的10条记录:"
    psql -d "$DB_NAME" -c "
    SELECT timestamp::date as 日期, user_name as 用户, action as 操作, resource_type as 实体, description as 描述
    FROM audit_logs 
    ORDER BY timestamp DESC 
    LIMIT 10;
    "
}

# 测试API访问
test_api() {
    echo -e "\n${BLUE}测试API访问...${NC}"
    
    # 检查服务器是否运行
    if ! curl -s "http://localhost:8080/health" > /dev/null; then
        echo -e "${YELLOW}⚠️  后端服务器未运行，请先启动服务器${NC}"
        echo "启动命令: cd backend && go run main.go"
        return
    fi
    
    echo -e "${GREEN}✓ 后端服务器正在运行${NC}"
    
    # 测试审计日志API
    echo -e "\n测试审计日志API:"
    
    response=$(curl -s "$API_BASE_URL/system/audit/logs?page=1&page_size=5")
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✓ 审计日志API正常工作${NC}"
        
        # 显示返回的记录数
        if command -v jq &> /dev/null; then
            count=$(echo "$response" | jq '.data.pagination.total // 0')
            echo -e "API返回总记录数: ${GREEN}$count${NC}"
        fi
    else
        echo -e "${RED}❌ 审计日志API访问失败${NC}"
        echo "响应: $response"
    fi
    
    # 测试统计API
    echo -e "\n测试统计API:"
    response=$(curl -s "$API_BASE_URL/system/audit/stats")
    if echo "$response" | grep -q "success"; then
        echo -e "${GREEN}✓ 统计API正常工作${NC}"
    else
        echo -e "${RED}❌ 统计API访问失败${NC}"
    fi
}

# 主执行流程
main() {
    echo -e "${YELLOW}🚀 审计日志演示数据生成器${NC}"
    echo "======================================="
    
    check_database
    create_audit_table
    generate_demo_data
    verify_data
    test_api
    
    echo -e "\n${GREEN}🎉 演示数据生成完成！${NC}"
    echo -e "\n📋 接下来的步骤:"
    echo "1. 启动后端服务器: cd backend && go run main.go"
    echo "2. 启动前端服务器: cd frontend && npm start"
    echo "3. 打开浏览器访问: http://localhost:3000"
    echo "4. 进入系统管理 → 审计日志页面"
    echo "5. 测试各种筛选和查询功能"
    
    echo -e "\n🧪 运行测试脚本:"
    echo "./test-audit-log-enhanced.sh"
}

# 执行主函数
main "$@"
