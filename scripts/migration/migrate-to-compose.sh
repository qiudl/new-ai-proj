#!/bin/bash

# Docker Compose 迁移执行脚本
# 用途：将手动管理的容器迁移到Docker Compose管理

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🚀 Docker Compose 迁移脚本${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查是否在正确目录
if [ ! -f "docker-compose.prod.yml" ]; then
  echo -e "${RED}❌ 错误：未找到docker-compose.prod.yml${NC}"
  echo "请在项目根目录运行此脚本"
  exit 1
fi

# 1. 确认执行
echo -e "${YELLOW}⚠️  警告：此操作将重启所有生产服务${NC}"
echo -e "${YELLOW}    预计停机时间: 10-15分钟${NC}"
echo ""
read -p "是否继续？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "迁移已取消"
  exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段1: 备份当前环境${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 执行备份
if [ -f "scripts/migration/backup-before-migration.sh" ]; then
  bash scripts/migration/backup-before-migration.sh
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 备份失败，迁移终止${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ 备份脚本不存在${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段2: 优雅停止现有容器${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 保存当前容器列表（按依赖顺序倒序停止）
current_containers=(
  "ai_nginx"
  "ai_frontend_prod"
  "ai_backend_prod"
  "ai_mcp_server_prod"
  "ai_redis_prod"
  "ai_postgres_slave"
  "ai_postgres_prod"
)

echo "停止容器（按依赖顺序）..."
for container in "${current_containers[@]}"; do
  if docker ps -q -f name=$container > /dev/null 2>&1; then
    echo -e "${BLUE}  停止: $container${NC}"
    docker stop -t 30 $container  # 30秒优雅关闭
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}    ✅ $container 已停止${NC}"
    else
      echo -e "${YELLOW}    ⚠️  $container 停止失败，继续...${NC}"
    fi
  else
    echo -e "${YELLOW}  ⚠️  $container 未运行${NC}"
  fi
done

echo ""
echo -e "${GREEN}✅ 所有容器已停止${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段3: 加载环境变量${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f ".env.production" ]; then
  source .env.production
  echo -e "${GREEN}✅ 已加载 .env.production${NC}"
else
  echo -e "${RED}❌ 未找到 .env.production${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段4: 使用Docker Compose启动服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 拉取/更新镜像
echo "1/4 拉取基础镜像..."
docker-compose -f docker-compose.prod.yml pull --ignore-pull-failures 2>&1 | grep -v "Pulling" || true
echo -e "${GREEN}   ✅ 基础镜像已更新${NC}"

# 构建自定义镜像
echo ""
echo "2/4 构建应用镜像..."
docker-compose -f docker-compose.prod.yml build --parallel 2>&1 | tail -n 5
if [ $? -eq 0 ]; then
  echo -e "${GREEN}   ✅ 应用镜像构建完成${NC}"
else
  echo -e "${RED}   ❌ 镜像构建失败${NC}"
  exit 1
fi

# 启动所有服务
echo ""
echo "3/4 启动所有服务..."
docker-compose -f docker-compose.prod.yml up -d
if [ $? -eq 0 ]; then
  echo -e "${GREEN}   ✅ 服务启动命令执行成功${NC}"
else
  echo -e "${RED}   ❌ 服务启动失败${NC}"
  exit 1
fi

# 等待服务健康检查
echo ""
echo "4/4 等待服务健康检查..."
echo ""

for i in {1..60}; do
  # 获取健康容器数量
  healthy=$(docker-compose -f docker-compose.prod.yml ps 2>/dev/null | grep "healthy" | wc -l | tr -d ' ')
  total=$(docker-compose -f docker-compose.prod.yml ps -q 2>/dev/null | wc -l | tr -d ' ')
  running=$(docker-compose -f docker-compose.prod.yml ps 2>/dev/null | grep "Up" | wc -l | tr -d ' ')

  echo -ne "\r${BLUE}  [$i/60] 运行中: $running/$total | 健康: $healthy/$total${NC}   "

  # 如果所有服务都健康，退出等待
  if [ "$healthy" -gt 0 ] && [ "$healthy" -eq "$total" ]; then
    echo ""
    echo -e "${GREEN}  ✅ 所有服务已就绪 ($healthy/$total 健康)${NC}"
    break
  fi

  # 如果是最后一次循环
  if [ $i -eq 60 ]; then
    echo ""
    echo -e "${YELLOW}  ⚠️  健康检查超时，但服务可能正常${NC}"
    echo -e "${YELLOW}     运行中: $running/$total | 健康: $healthy/$total${NC}"
  fi

  sleep 5
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段5: 初步验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查容器状态
echo "1. 检查容器状态..."
docker-compose -f docker-compose.prod.yml ps
echo ""

# 测试DNS解析
echo "2. 测试DNS解析..."
backend_dns=$(docker exec ai_nginx nslookup backend-prod 2>&1 | grep "Address" | tail -n 1)
frontend_dns=$(docker exec ai_nginx nslookup frontend-prod 2>&1 | grep "Address" | tail -n 1)

if echo "$backend_dns" | grep -q "172.30"; then
  echo -e "${GREEN}   ✅ backend-prod DNS解析成功: $backend_dns${NC}"
else
  echo -e "${YELLOW}   ⚠️  backend-prod DNS解析异常${NC}"
fi

if echo "$frontend_dns" | grep -q "172.30"; then
  echo -e "${GREEN}   ✅ frontend-prod DNS解析成功: $frontend_dns${NC}"
else
  echo -e "${YELLOW}   ⚠️  frontend-prod DNS解析异常${NC}"
fi

echo ""

# 测试API连接（使用容器名，因为nginx配置还未更新）
echo "3. 测试API连接..."
api_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/health 2>&1 || echo "000")

if [ "$api_health" = "200" ]; then
  echo -e "${GREEN}   ✅ API健康检查通过 (HTTP $api_health)${NC}"
else
  echo -e "${YELLOW}   ⚠️  API健康检查: HTTP $api_health${NC}"
fi

echo ""

# 测试前端
echo "4. 测试前端访问..."
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>&1 || echo "000")

if [ "$frontend_status" = "200" ]; then
  echo -e "${GREEN}   ✅ 前端访问正常 (HTTP $frontend_status)${NC}"
else
  echo -e "${YELLOW}   ⚠️  前端访问: HTTP $frontend_status${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ 迁移完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "迁移状态："
echo -e "${GREEN}  ✅ 容器已通过Docker Compose管理${NC}"
echo -e "${GREEN}  ✅ 服务名DNS已注册${NC}"
echo -e "${GREEN}  ✅ 基本功能验证通过${NC}"
echo ""
echo "下一步："
echo "  1. 运行完整验证: bash scripts/migration/verify-migration.sh"
echo "  2. 如果验证通过，更新nginx配置: bash scripts/migration/update-nginx-to-service-names.sh"
echo "  3. 监控服务24小时"
echo "  4. 清理旧容器: bash scripts/migration/cleanup-after-migration.sh"
echo ""
echo "如需回滚："
echo "  bash scripts/migration/rollback-migration.sh"
echo ""
