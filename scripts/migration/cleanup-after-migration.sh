#!/bin/bash

# 迁移后清理脚本
# 用途：清理旧容器、镜像和临时文件

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🧹 迁移后清理脚本${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 确认执行
echo -e "${YELLOW}⚠️  此脚本将清理：${NC}"
echo "  1. 已停止的容器"
echo "  2. 未使用的镜像（24小时前的）"
echo "  3. 未使用的网络"
echo "  4. 未使用的构建缓存"
echo ""
echo "注意：不会删除volumes（数据）和正在运行的容器"
echo ""
read -p "是否继续？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "清理已取消"
  exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  1️⃣  查看当前Docker资源使用${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "清理前Docker磁盘使用情况："
docker system df
echo ""

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  2️⃣  列出待清理的资源${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 列出已停止的容器
echo "已停止的容器："
stopped_containers=$(docker ps -a -f status=exited -q)
if [ -n "$stopped_containers" ]; then
  docker ps -a -f status=exited --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
  echo ""
  echo "数量: $(echo "$stopped_containers" | wc -l | tr -d ' ')"
else
  echo "  无"
fi

echo ""

# 列出悬空镜像
echo "悬空镜像（<none>标签）："
dangling_images=$(docker images -f dangling=true -q)
if [ -n "$dangling_images" ]; then
  docker images -f dangling=true --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
  echo ""
  echo "数量: $(echo "$dangling_images" | wc -l | tr -d ' ')"
else
  echo "  无"
fi

echo ""

# 列出未使用的网络
echo "未使用的网络："
unused_networks=$(docker network ls -f type=custom -q | while read net; do
  if [ "$(docker network inspect "$net" --format='{{.Containers}}' | grep -c '{}')" -eq 0 ]; then
    echo "$net"
  fi
done)
if [ -n "$unused_networks" ]; then
  for net in $unused_networks; do
    docker network inspect "$net" --format='{{.Name}}\t{{.Driver}}\t{{.Created}}'
  done
  echo ""
  echo "数量: $(echo "$unused_networks" | wc -l | tr -d ' ')"
else
  echo "  无"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  3️⃣  清理已停止的容器${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$stopped_containers" ]; then
  echo "删除已停止的容器..."
  docker container prune -f
  echo -e "${GREEN}✅ 已停止的容器已清理${NC}"
else
  echo "无需清理"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  4️⃣  清理未使用的镜像${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "清理24小时前的未使用镜像..."
docker image prune -a -f --filter "until=24h"
echo -e "${GREEN}✅ 未使用的镜像已清理${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  5️⃣  清理未使用的网络${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "清理未使用的网络..."
docker network prune -f
echo -e "${GREEN}✅ 未使用的网络已清理${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  6️⃣  清理构建缓存${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "是否清理Docker构建缓存？(yes/no): " clean_cache
if [ "$clean_cache" = "yes" ]; then
  echo "清理构建缓存..."
  docker builder prune -f
  echo -e "${GREEN}✅ 构建缓存已清理${NC}"
else
  echo "跳过构建缓存清理"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  7️⃣  清理临时备份文件（可选）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 列出备份目录
backups=$(ls -td /opt/ai-project/migration-backup-* 2>/dev/null | tail -n +2)
if [ -n "$backups" ]; then
  echo "找到旧的备份目录（保留最新一个）："
  echo "$backups" | while read backup; do
    size=$(du -sh "$backup" | cut -f1)
    echo "  $backup ($size)"
  done
  echo ""
  read -p "是否删除旧备份？(yes/no): " clean_backup
  if [ "$clean_backup" = "yes" ]; then
    echo "删除旧备份..."
    echo "$backups" | xargs rm -rf
    echo -e "${GREEN}✅ 旧备份已清理${NC}"
  else
    echo "保留备份文件"
  fi
else
  echo "无旧备份需要清理"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  8️⃣  清理nginx配置备份（可选）${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

nginx_backups=$(ls -t nginx/sites/ai-project.conf.backup.* 2>/dev/null | tail -n +3)
if [ -n "$nginx_backups" ]; then
  echo "找到旧的nginx配置备份（保留最新2个）："
  echo "$nginx_backups"
  echo ""
  read -p "是否删除旧的nginx备份？(yes/no): " clean_nginx
  if [ "$clean_nginx" = "yes" ]; then
    echo "删除旧nginx备份..."
    echo "$nginx_backups" | xargs rm -f
    echo -e "${GREEN}✅ 旧nginx备份已清理${NC}"
  else
    echo "保留nginx备份"
  fi
else
  echo "无旧nginx备份需要清理"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  9️⃣  最终检查${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "清理后Docker磁盘使用情况："
docker system df
echo ""

echo "当前运行的容器："
docker-compose -f docker-compose.prod.yml ps
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✅ 清理完成${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "清理总结："
echo -e "${GREEN}  ✅ 已停止的容器已删除${NC}"
echo -e "${GREEN}  ✅ 未使用的镜像已清理${NC}"
echo -e "${GREEN}  ✅ 未使用的网络已删除${NC}"
echo -e "${GREEN}  ✅ 磁盘空间已释放${NC}"
echo ""
echo "保留项："
echo "  • 正在运行的容器"
echo "  • Docker volumes（数据）"
echo "  • 最新的备份（1个）"
echo "  • 最新的nginx备份（2个）"
echo ""
echo "如需完全清理系统（危险）："
echo "  docker system prune -a --volumes"
echo ""
echo -e "${YELLOW}⚠️  注意：请确保迁移完全成功后再删除备份${NC}"
echo ""
