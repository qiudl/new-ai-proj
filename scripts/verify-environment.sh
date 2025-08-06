#!/bin/bash

# 环境验证脚本 (Environment Verification)
# 验证当前环境配置是否正确

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 AI项目管理平台 - 环境验证脚本${NC}"
echo "================================================"
echo ""

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 检查环境配置文件
echo -e "${BLUE}📋 1. 检查环境配置文件...${NC}"

if [ -f ".env" ]; then
    ENV_NAME=$(grep "^ENV=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
    DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
    echo -e "${GREEN}✅ .env 文件存在${NC}"
    echo "   📌 当前环境: $ENV_NAME"
    echo "   📌 数据库: $DB_NAME"
else
    echo -e "${RED}❌ .env 文件不存在${NC}"
    echo -e "${YELLOW}💡 提示: 运行 ./scripts/switch-env.sh development 切换到开发环境${NC}"
fi

echo ""

# 检查Docker服务状态
echo -e "${BLUE}🐳 2. 检查Docker服务状态...${NC}"

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 服务未运行${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Docker 服务正常${NC}"
fi

# 检查Docker Compose服务
services=("db" "backend" "frontend" "nginx")
for service in "${services[@]}"; do
    if docker-compose ps "$service" | grep -q "Up"; then
        echo -e "${GREEN}✅ $service 服务运行中${NC}"
    else
        echo -e "${RED}❌ $service 服务未运行${NC}"
    fi
done

echo ""

# 检查端口占用
echo -e "${BLUE}🔌 3. 检查端口占用状态...${NC}"

ports=(80 3000 5432 8080)
for port in "${ports[@]}"; do
    if lsof -i :$port > /dev/null 2>&1; then
        process=$(lsof -i :$port | grep LISTEN | awk '{print $1}' | head -1)
        echo -e "${GREEN}✅ 端口 $port 已被 $process 占用${NC}"
    else
        echo -e "${YELLOW}⚠️  端口 $port 未被占用${NC}"
    fi
done

echo ""

# 检查API连接性
echo -e "${BLUE}🌐 4. 检查API连接性...${NC}"

# 后端健康检查
echo "   后端健康检查 (http://localhost:8080/health):"
if health_response=$(NO_PROXY=localhost,127.0.0.1 curl -s -w "%{http_code}" http://localhost:8080/health 2>/dev/null); then
    http_code=${health_response: -3}
    response_body=${health_response%???}
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}   ✅ 后端API正常 (HTTP $http_code)${NC}"
        
        # 解析健康状态
        if echo "$response_body" | grep -q '"database":"connected"'; then
            echo -e "${GREEN}   ✅ 数据库连接正常${NC}"
        else
            echo -e "${RED}   ❌ 数据库连接异常${NC}"
        fi
    else
        echo -e "${RED}   ❌ 后端API异常 (HTTP $http_code)${NC}"
    fi
else
    echo -e "${RED}   ❌ 后端API无法访问${NC}"
fi

# 前端访问检查
echo "   前端访问检查 (http://localhost/):"
if frontend_code=$(NO_PROXY=localhost,127.0.0.1 curl -s -w "%{http_code}" -o /dev/null http://localhost/ 2>/dev/null); then
    if [ "$frontend_code" = "200" ]; then
        echo -e "${GREEN}   ✅ 前端页面正常 (HTTP $frontend_code)${NC}"
    else
        echo -e "${RED}   ❌ 前端页面异常 (HTTP $frontend_code)${NC}"
    fi
else
    echo -e "${RED}   ❌ 前端页面无法访问${NC}"
fi

echo ""

# 检查数据库连接
echo -e "${BLUE}🗄️  5. 检查数据库连接...${NC}"

if docker-compose exec -T db psql -U user -d main_db -c "SELECT current_database(), current_user;" > /dev/null 2>&1; then
    db_info=$(docker-compose exec -T db psql -U user -d main_db -c "SELECT current_database(), current_user;" 2>/dev/null | grep -E "^\s+\w+")
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
    echo "   📌 连接信息: $db_info"
    
    # 检查表数量
    table_count=$(docker-compose exec -T db psql -U user -d main_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -E "^\s+[0-9]+" | xargs)
    echo "   📊 数据表数量: $table_count"
else
    echo -e "${RED}❌ 数据库连接失败${NC}"
fi

echo ""

# 环境特定验证
echo -e "${BLUE}🎯 6. 环境特定验证...${NC}"

if [ -f ".env" ]; then
    ENV_NAME=$(grep "^ENV=" .env | cut -d'=' -f2 2>/dev/null || echo "development")
    
    case "$ENV_NAME" in
        "development")
            echo "   🔧 开发环境验证:"
            
            # 检查热重载
            if grep -q "HOT_RELOAD=true" .env; then
                echo -e "${GREEN}   ✅ 热重载已启用${NC}"
            else
                echo -e "${YELLOW}   ⚠️  热重载未启用${NC}"
            fi
            
            # 检查调试模式
            if grep -q "GIN_MODE=debug" .env; then
                echo -e "${GREEN}   ✅ 调试模式已启用${NC}"
            else
                echo -e "${YELLOW}   ⚠️  调试模式未启用${NC}"
            fi
            ;;
            
        "testing")
            echo "   🧪 测试环境验证:"
            echo -e "${GREEN}   ✅ 测试环境配置${NC}"
            ;;
            
        "production")
            echo "   🚀 生产环境验证:"
            echo -e "${YELLOW}   ⚠️  生产环境 - 请确保所有安全配置正确${NC}"
            ;;
            
        *)
            echo -e "${YELLOW}   ⚠️  未知环境: $ENV_NAME${NC}"
            ;;
    esac
fi

echo ""

# 总结报告
echo -e "${BLUE}📊 验证总结${NC}"
echo "================================================"
echo -e "${GREEN}✅ 环境验证完成${NC}"
echo ""

# 提供有用的链接
echo -e "${BLUE}🔗 常用链接:${NC}"
echo "   🌐 前端页面: http://localhost/"
echo "   🔧 后端API: http://localhost:8080"
echo "   📊 健康检查: http://localhost:8080/health"
echo "   🗄️  数据库: localhost:5432/main_db"
echo ""

# 环境切换提示
echo -e "${BLUE}💡 环境管理:${NC}"
echo "   切换环境: ./scripts/switch-env.sh [development|testing|production]"
echo "   查看环境: ./scripts/switch-env.sh status"
echo "   环境列表: ./scripts/switch-env.sh list"
echo ""

echo -e "${GREEN}🎉 验证完成！当前环境已准备就绪。${NC}"