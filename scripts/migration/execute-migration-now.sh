#!/bin/bash

# 一键执行Docker Compose迁移
# 用途：在生产服务器上一次性完成整个迁移流程
#
# 使用方法：
#   1. SSH到生产服务器：ssh root@proj.joylodging.com
#   2. 进入项目目录：cd /opt/ai-project
#   3. 拉取最新代码：git pull origin main
#   4. 执行此脚本：bash scripts/migration/execute-migration-now.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🚀 Docker Compose 迁移 - 一键执行${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查是否在正确目录
if [ ! -f "docker-compose.prod.yml" ]; then
  echo -e "${RED}❌ 错误：未找到docker-compose.prod.yml${NC}"
  echo "请在项目根目录（/opt/ai-project）运行此脚本"
  exit 1
fi

# 最终确认
echo -e "${YELLOW}⚠️  即将执行Docker Compose迁移${NC}"
echo ""
echo "此操作将："
echo "  1. 创建完整系统备份"
echo "  2. 停止所有现有容器（10-15分钟停机）"
echo "  3. 通过docker-compose重新启动服务"
echo "  4. 执行完整验证"
echo "  5. 应用nginx服务名修复"
echo ""
echo -e "${YELLOW}预计总时间：25-40分钟${NC}"
echo -e "${YELLOW}预计停机时间：10-15分钟${NC}"
echo ""
read -p "确认开始迁移？(yes/no): " final_confirm
if [ "$final_confirm" != "yes" ]; then
  echo "迁移已取消"
  exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段 1/5: 配置验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

chmod +x scripts/migration/*.sh

if bash scripts/migration/validate-compose-config.sh; then
  echo -e "${GREEN}✅ 配置验证通过${NC}"
else
  echo -e "${RED}❌ 配置验证失败，迁移终止${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段 2/5: 完整备份${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if bash scripts/migration/backup-before-migration.sh; then
  echo -e "${GREEN}✅ 备份完成${NC}"
else
  echo -e "${RED}❌ 备份失败，迁移终止${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段 3/5: 执行迁移${NC}"
echo -e "${BLUE}  ⚠️  服务即将停止 (10-15分钟)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if bash scripts/migration/migrate-to-compose.sh; then
  echo -e "${GREEN}✅ 迁移执行完成${NC}"
else
  echo -e "${RED}❌ 迁移失败${NC}"
  echo ""
  echo -e "${YELLOW}正在尝试回滚...${NC}"
  bash scripts/migration/rollback-migration.sh
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段 4/5: 完整验证${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if bash scripts/migration/verify-migration.sh; then
  echo -e "${GREEN}✅ 验证通过${NC}"
else
  echo -e "${YELLOW}⚠️  验证发现问题${NC}"
  echo ""
  read -p "是否继续应用nginx修复？(yes/no): " continue_nginx
  if [ "$continue_nginx" != "yes" ]; then
    echo "已停止，请检查验证输出"
    exit 1
  fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段 5/5: 应用Nginx服务名修复 (PR #17)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if bash scripts/migration/update-nginx-to-service-names.sh; then
  echo -e "${GREEN}✅ Nginx修复应用成功${NC}"
else
  echo -e "${YELLOW}⚠️  Nginx修复失败，但迁移已完成${NC}"
  echo "可以稍后手动应用nginx修复"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✅ 迁移完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "最终测试："
echo ""

# 测试API
echo -n "测试API健康检查..."
api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/health 2>&1 || echo "000")
if [ "$api_status" = "200" ]; then
  echo -e " ${GREEN}✅ HTTP $api_status${NC}"
else
  echo -e " ${YELLOW}⚠️  HTTP $api_status${NC}"
fi

# 测试前端
echo -n "测试前端访问..."
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>&1 || echo "000")
if [ "$frontend_status" = "200" ]; then
  echo -e " ${GREEN}✅ HTTP $frontend_status${NC}"
else
  echo -e " ${YELLOW}⚠️  HTTP $frontend_status${NC}"
fi

# 测试外部访问
echo -n "测试外部访问..."
external_status=$(curl -s -o /dev/null -w "%{http_code}" https://proj.joylodging.com/api/v1/health 2>&1 || echo "000")
if [ "$external_status" = "200" ]; then
  echo -e " ${GREEN}✅ HTTPS $external_status${NC}"
else
  echo -e " ${YELLOW}⚠️  HTTPS $external_status${NC}"
fi

echo ""
echo "当前服务状态："
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "下一步："
echo "  1. ✅ 迁移已完成"
echo "  2. 📊 监控服务24小时"
echo "  3. 🧹 24小时后执行清理: bash scripts/migration/cleanup-after-migration.sh"
echo ""
echo "监控命令："
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo "  docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "如需回滚："
echo "  bash scripts/migration/rollback-migration.sh"
echo ""
echo -e "${GREEN}迁移成功完成！${NC}"
echo ""
