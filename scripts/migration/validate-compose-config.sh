#!/bin/bash

# Docker Compose配置验证脚本
# 用途：在迁移前验证docker-compose.prod.yml配置正确性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🔍 Docker Compose配置验证${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

passed=0
failed=0

# 测试函数
check() {
    local name="$1"
    local command="$2"

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name"
        ((passed++))
        return 0
    else
        echo -e "${RED}❌${NC} $name"
        ((failed++))
        return 1
    fi
}

# 1. 检查文件存在
echo -e "${BLUE}1️⃣  文件检查${NC}"
check "docker-compose.prod.yml存在" "[ -f docker-compose.prod.yml ]"
check ".env.production存在" "[ -f .env.production ]"
echo ""

# 2. 语法检查
echo -e "${BLUE}2️⃣  语法检查${NC}"
check "docker-compose语法正确" "docker-compose -f docker-compose.prod.yml config"
echo ""

# 3. 环境变量检查
echo -e "${BLUE}3️⃣  环境变量检查${NC}"

# 加载环境变量
if [ -f ".env.production" ]; then
    source .env.production
fi

required_vars=(DB_USER DB_PASSWORD DB_NAME JWT_SECRET DOMAIN_NAME)
for var in "${required_vars[@]}"; do
    if [ -n "${!var}" ]; then
        echo -e "${GREEN}✅${NC} $var 已设置"
        ((passed++))
    else
        echo -e "${RED}❌${NC} $var 未设置"
        ((failed++))
    fi
done
echo ""

# 4. Docker volumes检查
echo -e "${BLUE}4️⃣  Docker Volumes检查${NC}"
if docker volume ls | grep -q ai-project_postgres_prod_data; then
    echo -e "${GREEN}✅${NC} postgres_prod_data volume存在"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  postgres_prod_data volume不存在（迁移时会创建）"
fi

if docker volume ls | grep -q ai-project_redis_prod_data; then
    echo -e "${GREEN}✅${NC} redis_prod_data volume存在"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  redis_prod_data volume不存在（迁移时会创建）"
fi
echo ""

# 5. Docker网络检查
echo -e "${BLUE}5️⃣  Docker Network检查${NC}"
if docker network ls | grep -q ai-project_ai_prod_network; then
    echo -e "${GREEN}✅${NC} ai_prod_network存在"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  ai_prod_network不存在（迁移时会创建）"
fi
echo ""

# 6. 服务定义检查
echo -e "${BLUE}6️⃣  服务定义检查${NC}"
services=$(docker-compose -f docker-compose.prod.yml config --services)
expected_services=("postgres-prod" "backend-prod" "frontend-prod" "redis-prod" "nginx" "mcp-server-prod")

for service in "${expected_services[@]}"; do
    if echo "$services" | grep -q "^${service}$"; then
        echo -e "${GREEN}✅${NC} 服务定义: $service"
        ((passed++))
    else
        echo -e "${RED}❌${NC} 服务缺失: $service"
        ((failed++))
    fi
done
echo ""

# 7. 镜像检查
echo -e "${BLUE}7️⃣  Docker镜像检查${NC}"
if docker images | grep -q postgres:16; then
    echo -e "${GREEN}✅${NC} PostgreSQL镜像存在"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  PostgreSQL镜像不存在（将自动拉取）"
fi

if docker images | grep -q redis:7-alpine; then
    echo -e "${GREEN}✅${NC} Redis镜像存在"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  Redis镜像不存在（将自动拉取）"
fi

if docker images | grep -q nginx:alpine; then
    echo -e "${GREEN}✅${NC} Nginx镜像存在"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  Nginx镜像不存在（将自动拉取）"
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}验证总结${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}通过: $passed${NC}"
echo -e "${RED}失败: $failed${NC}"
echo ""

if [ $failed -gt 0 ]; then
    echo -e "${RED}❌ 配置验证未通过，请修复上述问题后再次运行${NC}"
    exit 1
else
    echo -e "${GREEN}✅ 所有检查通过！可以继续迁移流程${NC}"
    echo ""
    echo "下一步："
    echo "  bash scripts/migration/backup-before-migration.sh"
    echo "  bash scripts/migration/migrate-to-compose.sh"
    exit 0
fi
