#!/bin/bash

# Docker Compose 迁移验证脚本
# 用途：全面验证迁移后的系统状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🔍 迁移验证脚本${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

passed=0
failed=0
warnings=0

# 测试函数
test() {
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

# 警告函数
warn() {
  local name="$1"
  local command="$2"

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} $name"
    ((passed++))
    return 0
  else
    echo -e "${YELLOW}⚠️${NC}  $name"
    ((warnings++))
    return 1
  fi
}

# 检查是否在正确目录
if [ ! -f "docker-compose.prod.yml" ]; then
  echo -e "${RED}❌ 错误：未找到docker-compose.prod.yml${NC}"
  echo "请在项目根目录运行此脚本"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  1️⃣  容器状态检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test "postgres-prod 运行中" "docker-compose -f docker-compose.prod.yml ps postgres-prod | grep -q 'Up'"
test "backend-prod 运行中" "docker-compose -f docker-compose.prod.yml ps backend-prod | grep -q 'Up'"
test "frontend-prod 运行中" "docker-compose -f docker-compose.prod.yml ps frontend-prod | grep -q 'Up'"
test "nginx 运行中" "docker-compose -f docker-compose.prod.yml ps nginx | grep -q 'Up'"
test "redis-prod 运行中" "docker-compose -f docker-compose.prod.yml ps redis-prod | grep -q 'Up'"
test "mcp-server-prod 运行中" "docker-compose -f docker-compose.prod.yml ps mcp-server-prod | grep -q 'Up'"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  2️⃣  健康检查状态${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test "postgres-prod 健康" "docker inspect --format='{{.State.Health.Status}}' ai_postgres_prod | grep -q 'healthy'"
test "backend-prod 健康" "docker inspect --format='{{.State.Health.Status}}' ai_backend_prod | grep -q 'healthy'"
warn "frontend-prod 健康" "docker inspect --format='{{.State.Health.Status}}' ai_frontend_prod | grep -q 'healthy'"
warn "nginx 健康" "docker inspect --format='{{.State.Health.Status}}' ai_nginx | grep -q 'healthy'"
test "redis-prod 健康" "docker inspect --format='{{.State.Health.Status}}' ai_redis_prod | grep -q 'healthy'"
warn "mcp-server-prod 健康" "docker inspect --format='{{.State.Health.Status}}' ai_mcp_server_prod | grep -q 'healthy'"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  3️⃣  服务名DNS解析测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test "backend-prod DNS可解析" "docker exec ai_nginx nslookup backend-prod | grep -q 'Address.*172.30'"
test "frontend-prod DNS可解析" "docker exec ai_nginx nslookup frontend-prod | grep -q 'Address.*172.30'"
test "postgres-prod DNS可解析" "docker exec ai_nginx nslookup postgres-prod | grep -q 'Address.*172.30'"
test "redis-prod DNS可解析" "docker exec ai_nginx nslookup redis-prod | grep -q 'Address.*172.30'"
test "mcp-server-prod DNS可解析" "docker exec ai_nginx nslookup mcp-server-prod | grep -q 'Address.*172.30'"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  4️⃣  容器名DNS解析测试（向后兼容）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test "ai_backend_prod DNS可解析" "docker exec ai_nginx nslookup ai_backend_prod | grep -q 'Address.*172.30'"
test "ai_frontend_prod DNS可解析" "docker exec ai_nginx nslookup ai_frontend_prod | grep -q 'Address.*172.30'"
test "ai_postgres_prod DNS可解析" "docker exec ai_nginx nslookup ai_postgres_prod | grep -q 'Address.*172.30'"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  5️⃣  服务连接测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 后端API健康检查
api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/health 2>&1 || echo "000")
if [ "$api_status" = "200" ]; then
  echo -e "${GREEN}✅${NC} 后端API健康检查 (HTTP $api_status)"
  ((passed++))
else
  echo -e "${RED}❌${NC} 后端API健康检查 (HTTP $api_status)"
  ((failed++))
fi

# 前端页面访问
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>&1 || echo "000")
if [ "$frontend_status" = "200" ]; then
  echo -e "${GREEN}✅${NC} 前端页面访问 (HTTP $frontend_status)"
  ((passed++))
else
  echo -e "${YELLOW}⚠️${NC}  前端页面访问 (HTTP $frontend_status)"
  ((warnings++))
fi

# PostgreSQL连接（从backend容器测试）
if docker exec ai_backend_prod sh -c "command -v psql" > /dev/null 2>&1; then
  if docker exec ai_backend_prod psql -h postgres-prod -U ${DB_USER:-postgres} -d ${DB_NAME:-ai_project_db} -c 'SELECT 1' > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} PostgreSQL连接（使用服务名）"
    ((passed++))
  else
    echo -e "${RED}❌${NC} PostgreSQL连接失败"
    ((failed++))
  fi
else
  # 如果backend没有psql，从postgres容器测试
  if docker exec ai_postgres_prod psql -U ${DB_USER:-postgres} -d ${DB_NAME:-ai_project_db} -c 'SELECT 1' > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} PostgreSQL数据库可访问"
    ((passed++))
  else
    echo -e "${RED}❌${NC} PostgreSQL数据库不可访问"
    ((failed++))
  fi
fi

# Redis连接
if docker exec ai_redis_prod redis-cli ping | grep -q "PONG"; then
  echo -e "${GREEN}✅${NC} Redis连接正常"
  ((passed++))
else
  echo -e "${RED}❌${NC} Redis连接失败"
  ((failed++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  6️⃣  Docker Compose管理测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test "docker-compose ps 可用" "docker-compose -f docker-compose.prod.yml ps"
test "docker-compose logs 可用" "docker-compose -f docker-compose.prod.yml logs --tail=1 postgres-prod"
test "服务重启策略为always" "docker inspect ai_backend_prod --format='{{.HostConfig.RestartPolicy.Name}}' | grep -q 'always'"

# 测试scale命令（不实际执行，只验证语法）
if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
  echo -e "${GREEN}✅${NC} Docker Compose配置有效"
  ((passed++))
else
  echo -e "${RED}❌${NC} Docker Compose配置无效"
  ((failed++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  7️⃣  网络配置验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查网络存在
if docker network ls | grep -q "ai-project_ai_prod_network"; then
  echo -e "${GREEN}✅${NC} ai_prod_network 网络存在"
  ((passed++))

  # 检查网络中的容器
  containers_in_network=$(docker network inspect ai-project_ai_prod_network --format='{{range $id, $cont := .Containers}}{{$cont.Name}} {{end}}')
  expected_containers=("ai_backend_prod" "ai_frontend_prod" "ai_nginx" "ai_postgres_prod" "ai_redis_prod")

  for container in "${expected_containers[@]}"; do
    if echo "$containers_in_network" | grep -q "$container"; then
      echo -e "${GREEN}✅${NC} $container 在网络中"
      ((passed++))
    else
      echo -e "${RED}❌${NC} $container 不在网络中"
      ((failed++))
    fi
  done
else
  echo -e "${RED}❌${NC} ai_prod_network 网络不存在"
  ((failed++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  8️⃣  数据持久化验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查volumes
if docker volume ls | grep -q "ai-project_postgres_prod_data"; then
  echo -e "${GREEN}✅${NC} PostgreSQL数据volume存在"
  ((passed++))
else
  echo -e "${RED}❌${NC} PostgreSQL数据volume不存在"
  ((failed++))
fi

if docker volume ls | grep -q "ai-project_redis_prod_data"; then
  echo -e "${GREEN}✅${NC} Redis数据volume存在"
  ((passed++))
else
  echo -e "${RED}❌${NC} Redis数据volume不存在"
  ((failed++))
fi

# 验证数据完整性（简单测试）
db_tables=$(docker exec ai_postgres_prod psql -U ${DB_USER:-postgres} -d ${DB_NAME:-ai_project_db} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
if [ -n "$db_tables" ] && [ "$db_tables" -gt 0 ]; then
  echo -e "${GREEN}✅${NC} 数据库包含 $db_tables 个表"
  ((passed++))
else
  echo -e "${YELLOW}⚠️${NC}  数据库表数量: $db_tables"
  ((warnings++))
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  9️⃣  日志和监控验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查日志可访问
if docker-compose -f docker-compose.prod.yml logs --tail=1 backend-prod | grep -q "." ; then
  echo -e "${GREEN}✅${NC} 后端日志可访问"
  ((passed++))
else
  echo -e "${YELLOW}⚠️${NC}  后端日志为空或不可访问"
  ((warnings++))
fi

# 检查日志驱动配置
log_driver=$(docker inspect ai_backend_prod --format='{{.HostConfig.LogConfig.Type}}')
if [ "$log_driver" = "json-file" ]; then
  echo -e "${GREEN}✅${NC} 日志驱动配置正确: $log_driver"
  ((passed++))
else
  echo -e "${YELLOW}⚠️${NC}  日志驱动: $log_driver"
  ((warnings++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}验证总结${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}通过: $passed${NC}"
echo -e "${RED}失败: $failed${NC}"
echo -e "${YELLOW}警告: $warnings${NC}"
echo ""

# 显示当前容器状态
echo "当前容器状态："
docker-compose -f docker-compose.prod.yml ps
echo ""

# 判断结果
if [ $failed -eq 0 ]; then
  if [ $warnings -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ 所有测试完美通过！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "迁移成功！现在可以："
    echo "  1. 更新nginx配置使用服务名:"
    echo "     bash scripts/migration/update-nginx-to-service-names.sh"
    echo ""
    echo "  2. 监控服务24小时"
    echo ""
    echo "  3. 清理旧容器:"
    echo "     bash scripts/migration/cleanup-after-migration.sh"
    exit 0
  else
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠️  验证通过，但有 $warnings 个警告${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "建议："
    echo "  - 检查警告项目"
    echo "  - 如果警告可接受，可以继续下一步"
    echo "  - 查看详细日志: docker-compose -f docker-compose.prod.yml logs"
    exit 0
  fi
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ❌ 验证失败，发现 $failed 个问题${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "建议："
  echo "  1. 查看失败的测试项"
  echo "  2. 检查日志: docker-compose -f docker-compose.prod.yml logs"
  echo "  3. 如果问题严重，考虑回滚:"
  echo "     bash scripts/migration/rollback-migration.sh"
  exit 1
fi
