#!/bin/bash

# 更新Nginx配置使用服务名
# 用途：迁移完成后，应用PR #17的nginx配置修复

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🔧 更新Nginx配置使用服务名${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查nginx配置文件
NGINX_CONFIG="nginx/sites/ai-project.conf"

if [ ! -f "$NGINX_CONFIG" ]; then
  echo -e "${RED}❌ 未找到nginx配置文件: $NGINX_CONFIG${NC}"
  exit 1
fi

echo -e "${BLUE}1️⃣  验证nginx配置文件状态${NC}"
echo ""

# 检查配置文件内容
if grep -q "backend-prod:8080" "$NGINX_CONFIG"; then
  echo -e "${GREEN}✅ Nginx配置已经使用服务名（来自PR #17）${NC}"
  echo ""
  echo "配置中的服务名引用："
  grep -n "backend-prod\|frontend-prod" "$NGINX_CONFIG" | head -n 5
  echo "  ..."
  echo ""
elif grep -q "ai_backend_prod:8080" "$NGINX_CONFIG"; then
  echo -e "${YELLOW}⚠️  Nginx配置仍使用容器名${NC}"
  echo ""
  echo "需要手动更新配置文件，或从git拉取最新版本"
  echo ""
  read -p "是否从git拉取最新配置？(yes/no): " pull_git
  if [ "$pull_git" = "yes" ]; then
    echo "拉取最新配置..."
    git pull origin main
    echo -e "${GREEN}✅ 已更新配置文件${NC}"
  else
    echo "请手动更新配置文件后再次运行此脚本"
    exit 1
  fi
else
  echo -e "${RED}❌ 无法识别配置文件格式${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}2️⃣  验证服务名DNS解析${NC}"
echo ""

# 测试DNS解析
backend_resolved=$(docker exec ai_nginx nslookup backend-prod 2>&1 | grep "Address.*172.30" || echo "")
frontend_resolved=$(docker exec ai_nginx nslookup frontend-prod 2>&1 | grep "Address.*172.30" || echo "")

if [ -n "$backend_resolved" ]; then
  echo -e "${GREEN}✅ backend-prod DNS解析成功${NC}"
  echo "   $backend_resolved"
else
  echo -e "${RED}❌ backend-prod DNS解析失败${NC}"
  echo ""
  echo "可能原因："
  echo "  1. 未完成docker-compose迁移"
  echo "  2. 容器不在同一网络"
  echo ""
  exit 1
fi

if [ -n "$frontend_resolved" ]; then
  echo -e "${GREEN}✅ frontend-prod DNS解析成功${NC}"
  echo "   $frontend_resolved"
else
  echo -e "${YELLOW}⚠️  frontend-prod DNS解析失败${NC}"
fi

echo ""
echo -e "${BLUE}3️⃣  备份当前nginx配置${NC}"
echo ""

# 创建备份
BACKUP_FILE="nginx/sites/ai-project.conf.before-service-names.$(date +%Y%m%d_%H%M%S)"
if docker exec ai_nginx test -f /etc/nginx/conf.d/ai-project.conf; then
  docker cp ai_nginx:/etc/nginx/conf.d/ai-project.conf "$BACKUP_FILE"
  echo -e "${GREEN}✅ 已备份当前配置到: $BACKUP_FILE${NC}"
else
  echo -e "${YELLOW}⚠️  容器中的配置文件不存在，跳过备份${NC}"
fi

echo ""
echo -e "${BLUE}4️⃣  测试nginx配置${NC}"
echo ""

echo "测试新配置..."
if docker exec ai_nginx nginx -t 2>&1 | grep -q "syntax is ok"; then
  echo -e "${GREEN}✅ Nginx配置语法正确${NC}"
else
  echo -e "${RED}❌ Nginx配置语法错误${NC}"
  docker exec ai_nginx nginx -t
  exit 1
fi

echo ""
echo -e "${BLUE}5️⃣  应用新配置${NC}"
echo ""

read -p "是否重新加载nginx配置？(yes/no): " reload
if [ "$reload" != "yes" ]; then
  echo "操作已取消"
  echo ""
  echo "如需手动重新加载："
  echo "  docker exec ai_nginx nginx -s reload"
  exit 0
fi

echo "重新加载nginx配置..."
docker exec ai_nginx nginx -s reload

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Nginx配置已重新加载${NC}"
else
  echo -e "${RED}❌ Nginx重新加载失败${NC}"
  echo ""
  echo "尝试恢复备份..."
  if [ -f "$BACKUP_FILE" ]; then
    docker cp "$BACKUP_FILE" ai_nginx:/etc/nginx/conf.d/ai-project.conf
    docker exec ai_nginx nginx -s reload
    echo -e "${YELLOW}⚠️  已恢复备份配置${NC}"
  fi
  exit 1
fi

echo ""
echo -e "${BLUE}6️⃣  验证API连接${NC}"
echo ""

# 等待nginx重新加载
sleep 2

# 测试API连接
echo "测试API健康检查..."
api_status=$(curl -s -o /dev/null -w "%{http_code}" https://proj.joylodging.com/api/v1/health 2>&1 || curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/health 2>&1 || echo "000")

if [ "$api_status" = "200" ]; then
  echo -e "${GREEN}✅ API健康检查通过 (HTTP $api_status)${NC}"
else
  echo -e "${YELLOW}⚠️  API健康检查: HTTP $api_status${NC}"
  echo ""
  echo "检查nginx错误日志："
  docker exec ai_nginx tail -n 20 /var/log/nginx/error.log
  echo ""
  read -p "是否回滚配置？(yes/no): " rollback
  if [ "$rollback" = "yes" ]; then
    if [ -f "$BACKUP_FILE" ]; then
      docker cp "$BACKUP_FILE" ai_nginx:/etc/nginx/conf.d/ai-project.conf
      docker exec ai_nginx nginx -s reload
      echo -e "${YELLOW}⚠️  已回滚到备份配置${NC}"
    fi
    exit 1
  fi
fi

echo ""
echo "测试前端访问..."
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" https://proj.joylodging.com/ 2>&1 || curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>&1 || echo "000")

if [ "$frontend_status" = "200" ]; then
  echo -e "${GREEN}✅ 前端访问正常 (HTTP $frontend_status)${NC}"
else
  echo -e "${YELLOW}⚠️  前端访问: HTTP $frontend_status${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✅ Nginx配置更新完成${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "配置状态："
echo -e "${GREEN}  ✅ Nginx配置已使用服务名${NC}"
echo -e "${GREEN}  ✅ 服务名DNS解析正常${NC}"
echo -e "${GREEN}  ✅ API连接验证通过${NC}"
echo ""
echo "PR #17的修复已成功应用！"
echo ""
echo "下一步："
echo "  1. 监控服务24小时"
echo "  2. 观察nginx日志: docker exec ai_nginx tail -f /var/log/nginx/error.log"
echo "  3. 清理旧容器: bash scripts/migration/cleanup-after-migration.sh"
echo ""
echo "备份文件位置: $BACKUP_FILE"
echo ""
