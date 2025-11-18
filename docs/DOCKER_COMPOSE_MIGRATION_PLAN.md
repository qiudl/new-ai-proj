# Docker Compose 生产环境迁移计划

## 📋 执行摘要

**目标**: 将当前手动管理的Docker容器迁移到完全由Docker Compose管理，使nginx配置能够使用服务名进行DNS解析。

**当前状态**:
- ✅ 生产环境正常运行
- ⚠️ 容器通过手动`docker run`启动，非docker-compose管理
- ⚠️ Nginx配置使用容器名（ai_backend_prod）而非服务名（backend-prod）
- ✅ PR #17已修改nginx配置使用服务名（为迁移做准备）

**预期收益**:
- ✅ 简化部署流程（一条命令启动/停止所有服务）
- ✅ 服务名DNS自动注册（backend-prod, frontend-prod等）
- ✅ 依赖管理自动化（healthcheck, depends_on）
- ✅ 配置版本化（docker-compose.prod.yml）
- ✅ 资源限制和日志管理标准化
- ✅ 更容易的水平扩展和滚动更新

**风险等级**: 🟡 中等（需要短暂服务中断，约5-10分钟）

**建议维护窗口**: 凌晨2:00-3:00 AM（用户活跃度最低）

---

## 🔍 当前环境分析

### 现有容器配置

```bash
容器名称              网络                    启动方式    重启策略
─────────────────────────────────────────────────────────────────
ai_backend_prod       ai-project_ai_prod      手动        always
ai_frontend_prod      ai-project_ai_prod      手动        always
ai_nginx              ai-project_ai_prod      手动        always
ai_postgres_prod      ai-project_ai_prod      手动        always
ai_postgres_slave     ai-project_ai_prod      手动        always
ai_redis_prod         ai-project_ai_prod      手动        always
ai_mcp_server_prod    ai-project_ai_prod      手动        always
```

### Docker Compose配置状态

**文件**: `docker-compose.prod.yml`

**服务定义** (已存在但未使用):
- `postgres-prod` → 容器名: `ai_postgres_prod`
- `backend-prod` → 容器名: `ai_backend_prod`
- `frontend-prod` → 容器名: `ai_frontend_prod`
- `redis-prod` → 容器名: `ai_redis_prod`
- `nginx` → 容器名: `ai_nginx`
- `mcp-server-prod` → 容器名: `ai_mcp_server_prod`

### DNS解析问题

**当前状态**:
```bash
# 容器名可以解析（手动启动时指定的--name）
ai_backend_prod → 172.30.0.6 ✅

# 服务名无法解析（未通过docker-compose启动）
backend-prod → DNS查询失败 ❌
```

**迁移后**:
```bash
# 容器名依然可以解析
ai_backend_prod → 172.30.0.6 ✅

# 服务名可以解析（docker-compose自动注册）
backend-prod → 172.30.0.6 ✅
```

---

## 📝 迁移方案设计

### 方案A: 蓝绿部署（推荐 - 零停机）

**优点**:
- ✅ 零停机时间
- ✅ 可以充分测试新环境
- ✅ 快速回滚（只需切换nginx upstream）

**缺点**:
- ❌ 需要双倍资源（临时）
- ❌ 数据库迁移较复杂

**适用场景**: 对可用性要求极高的生产环境

### 方案B: 滚动迁移（推荐 - 平衡方案）

**优点**:
- ✅ 资源占用合理
- ✅ 可控的停机时间（5-10分钟）
- ✅ 实施相对简单

**缺点**:
- ⚠️ 需要短暂停机
- ⚠️ 需要提前备份

**适用场景**: 可以接受短暂维护窗口的生产环境

**执行步骤**:
1. 创建完整备份（数据库、配置、volumes）
2. 准备docker-compose.prod.yml
3. 优雅停止现有容器
4. 使用docker-compose启动新环境
5. 验证所有服务
6. 更新nginx配置使用服务名
7. 清理旧容器镜像

### 方案C: 直接迁移（不推荐）

**优点**:
- ✅ 最快完成

**缺点**:
- ❌ 风险高
- ❌ 无回滚计划

**适用场景**: 仅开发/测试环境

---

## 🚀 推荐方案：滚动迁移详细步骤

### 阶段1: 准备阶段（不影响生产）

#### 1.1 备份当前环境

```bash
#!/bin/bash
# 文件: scripts/backup-before-migration.sh

BACKUP_DIR="/opt/ai-project/migration-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 开始备份..."

# 1. 备份数据库
echo "1/6 备份PostgreSQL数据库..."
docker exec ai_postgres_prod pg_dump -U ${DB_USER} ${DB_NAME} > "$BACKUP_DIR/postgres_backup.sql"

# 2. 备份从数据库
echo "2/6 备份从数据库..."
docker exec ai_postgres_slave pg_dump -U ${DB_USER} ${DB_NAME} > "$BACKUP_DIR/postgres_slave_backup.sql"

# 3. 备份Redis数据
echo "3/6 备份Redis数据..."
docker exec ai_redis_prod redis-cli --rdb /data/backup.rdb
docker cp ai_redis_prod:/data/backup.rdb "$BACKUP_DIR/redis_backup.rdb"

# 4. 备份Docker volumes
echo "4/6 备份Docker volumes..."
docker run --rm -v ai-project_postgres_prod_data:/source -v "$BACKUP_DIR":/backup alpine \
  tar czf /backup/postgres_volume.tar.gz -C /source .

docker run --rm -v ai-project_redis_prod_data:/source -v "$BACKUP_DIR":/backup alpine \
  tar czf /backup/redis_volume.tar.gz -C /source .

# 5. 备份配置文件
echo "5/6 备份配置文件..."
tar czf "$BACKUP_DIR/configs.tar.gz" \
  docker-compose.prod.yml \
  .env.production \
  nginx/ \
  config/ \
  ssl/

# 6. 备份容器配置
echo "6/6 保存容器配置..."
for container in ai_backend_prod ai_frontend_prod ai_nginx ai_postgres_prod ai_redis_prod ai_mcp_server_prod; do
  docker inspect $container > "$BACKUP_DIR/${container}_config.json"
done

echo "✅ 备份完成: $BACKUP_DIR"
echo ""
echo "备份文件列表："
ls -lh "$BACKUP_DIR"
```

#### 1.2 验证docker-compose配置

```bash
#!/bin/bash
# 文件: scripts/validate-compose-config.sh

echo "🔍 验证docker-compose配置..."

# 1. 语法检查
docker-compose -f docker-compose.prod.yml config > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ docker-compose.prod.yml 语法正确"
else
  echo "❌ docker-compose.prod.yml 语法错误"
  exit 1
fi

# 2. 检查必需的环境变量
required_vars=(DB_USER DB_PASSWORD DB_NAME JWT_SECRET DOMAIN_NAME)
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ 缺少环境变量: $var"
    exit 1
  fi
done
echo "✅ 所有必需环境变量已设置"

# 3. 检查volumes是否存在
echo "检查Docker volumes..."
for volume in ai-project_postgres_prod_data ai-project_redis_prod_data; do
  if docker volume inspect $volume > /dev/null 2>&1; then
    echo "✅ Volume存在: $volume"
  else
    echo "⚠️  Volume不存在，迁移时会创建: $volume"
  fi
done

# 4. 检查网络
if docker network inspect ai-project_ai_prod_network > /dev/null 2>&1; then
  echo "✅ 网络已存在: ai-project_ai_prod_network"
else
  echo "⚠️  网络不存在，迁移时会创建"
fi

echo "✅ 配置验证完成"
```

#### 1.3 准备迁移脚本

创建以下脚本:
- ✅ `scripts/backup-before-migration.sh` (上面已定义)
- ✅ `scripts/validate-compose-config.sh` (上面已定义)
- ⏳ `scripts/migrate-to-compose.sh` (详见阶段2)
- ⏳ `scripts/rollback-migration.sh` (详见阶段4)
- ⏳ `scripts/verify-migration.sh` (详见阶段3)

### 阶段2: 执行迁移（维护窗口）

#### 2.1 迁移执行脚本

```bash
#!/bin/bash
# 文件: scripts/migrate-to-compose.sh

set -e  # 遇到错误立即退出

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Docker Compose 迁移脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否在正确目录
if [ ! -f "docker-compose.prod.yml" ]; then
  echo -e "${RED}❌ 错误：未找到docker-compose.prod.yml${NC}"
  echo "请在项目根目录运行此脚本"
  exit 1
fi

# 1. 确认执行
echo -e "${YELLOW}⚠️  警告：此操作将重启所有生产服务${NC}"
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
bash scripts/backup-before-migration.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 备份失败，迁移终止${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段2: 优雅停止现有容器${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 2.1 保存当前容器列表
current_containers=(
  "ai_nginx"
  "ai_frontend_prod"
  "ai_backend_prod"
  "ai_mcp_server_prod"
  "ai_redis_prod"
  "ai_postgres_slave"
  "ai_postgres_prod"
)

# 2.2 按顺序优雅停止（反向依赖顺序）
echo "按依赖顺序停止容器..."
for container in "${current_containers[@]}"; do
  if docker ps -q -f name=$container > /dev/null 2>&1; then
    echo "停止: $container"
    docker stop -t 30 $container  # 30秒优雅关闭
  fi
done

echo ""
echo -e "${GREEN}✅ 所有容器已停止${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段3: 使用Docker Compose启动服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 3.1 拉取最新镜像（如果需要）
echo "拉取/构建镜像..."
docker-compose -f docker-compose.prod.yml pull --ignore-pull-failures || true

# 3.2 构建自定义镜像
echo "构建应用镜像..."
docker-compose -f docker-compose.prod.yml build

# 3.3 启动所有服务
echo "启动服务..."
docker-compose -f docker-compose.prod.yml up -d

# 3.4 等待服务健康检查
echo ""
echo "等待服务健康检查..."
sleep 10

for i in {1..30}; do
  healthy=$(docker-compose -f docker-compose.prod.yml ps | grep -c "healthy" || true)
  total=$(docker-compose -f docker-compose.prod.yml ps -q | wc -l | tr -d ' ')

  echo "[$i/30] 健康服务: $healthy/$total"

  if [ "$healthy" -eq "$total" ]; then
    echo -e "${GREEN}✅ 所有服务已就绪${NC}"
    break
  fi

  sleep 10
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  阶段4: 验证服务${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 4.1 检查容器状态
echo "检查容器状态..."
docker-compose -f docker-compose.prod.yml ps

# 4.2 测试服务名DNS解析
echo ""
echo "测试DNS解析..."
docker exec ai_nginx nslookup backend-prod && echo "✅ backend-prod DNS解析成功" || echo "❌ backend-prod DNS解析失败"
docker exec ai_nginx nslookup frontend-prod && echo "✅ frontend-prod DNS解析成功" || echo "❌ frontend-prod DNS解析失败"

# 4.3 测试API连接
echo ""
echo "测试API连接..."
curl -f http://localhost/api/v1/health && echo "✅ API健康检查通过" || echo "❌ API健康检查失败"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ 迁移完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "下一步："
echo "  1. 运行完整验证: bash scripts/verify-migration.sh"
echo "  2. 更新nginx配置使用服务名"
echo "  3. 清理旧容器: docker container prune"
echo ""
```

### 阶段3: 验证阶段

#### 3.1 验证脚本

```bash
#!/bin/bash
# 文件: scripts/verify-migration.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 迁移验证脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

passed=0
failed=0

# 测试函数
test() {
  local name="$1"
  local command="$2"

  if eval "$command" > /dev/null 2>&1; then
    echo "✅ $name"
    ((passed++))
  else
    echo "❌ $name"
    ((failed++))
  fi
}

echo "1️⃣  容器状态检查"
echo "─────────────────"
test "postgres-prod运行中" "docker-compose -f docker-compose.prod.yml ps postgres-prod | grep -q Up"
test "backend-prod运行中" "docker-compose -f docker-compose.prod.yml ps backend-prod | grep -q Up"
test "frontend-prod运行中" "docker-compose -f docker-compose.prod.yml ps frontend-prod | grep -q Up"
test "nginx运行中" "docker-compose -f docker-compose.prod.yml ps nginx | grep -q Up"
test "redis-prod运行中" "docker-compose -f docker-compose.prod.yml ps redis-prod | grep -q Up"
test "mcp-server-prod运行中" "docker-compose -f docker-compose.prod.yml ps mcp-server-prod | grep -q Up"
echo ""

echo "2️⃣  健康检查状态"
echo "─────────────────"
test "postgres-prod健康" "docker inspect --format='{{.State.Health.Status}}' ai_postgres_prod | grep -q healthy"
test "backend-prod健康" "docker inspect --format='{{.State.Health.Status}}' ai_backend_prod | grep -q healthy"
test "frontend-prod健康" "docker inspect --format='{{.State.Health.Status}}' ai_frontend_prod | grep -q healthy"
test "nginx健康" "docker inspect --format='{{.State.Health.Status}}' ai_nginx | grep -q healthy"
test "redis-prod健康" "docker inspect --format='{{.State.Health.Status}}' ai_redis_prod | grep -q healthy"
test "mcp-server-prod健康" "docker inspect --format='{{.State.Health.Status}}' ai_mcp_server_prod | grep -q healthy"
echo ""

echo "3️⃣  DNS解析测试"
echo "─────────────────"
test "backend-prod DNS" "docker exec ai_nginx nslookup backend-prod"
test "frontend-prod DNS" "docker exec ai_nginx nslookup frontend-prod"
test "postgres-prod DNS" "docker exec ai_nginx nslookup postgres-prod"
test "redis-prod DNS" "docker exec ai_nginx nslookup redis-prod"
test "mcp-server-prod DNS" "docker exec ai_nginx nslookup mcp-server-prod"
echo ""

echo "4️⃣  服务连接测试"
echo "─────────────────"
test "后端API健康检查" "curl -f http://localhost/api/v1/health"
test "前端页面访问" "curl -f http://localhost/"
test "PostgreSQL连接" "docker exec ai_backend_prod psql -h postgres-prod -U ${DB_USER} -d ${DB_NAME} -c 'SELECT 1' || docker exec ai_postgres_prod psql -U ${DB_USER} -d ${DB_NAME} -c 'SELECT 1'"
test "Redis连接" "docker exec ai_redis_prod redis-cli ping"
echo ""

echo "5️⃣  Docker Compose管理测试"
echo "─────────────────────────"
test "docker-compose ps可用" "docker-compose -f docker-compose.prod.yml ps"
test "docker-compose logs可用" "docker-compose -f docker-compose.prod.yml logs --tail=1"
test "服务自动重启配置" "docker inspect ai_backend_prod --format='{{.HostConfig.RestartPolicy.Name}}' | grep -q always"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  验证总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "通过: $passed"
echo "失败: $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo "✅ 所有测试通过！迁移成功"
  echo ""
  echo "现在可以："
  echo "  1. 更新nginx配置使用服务名（已在PR #17中完成）"
  echo "  2. 重新加载nginx: docker exec ai_nginx nginx -s reload"
  echo "  3. 清理旧容器: docker container prune"
  exit 0
else
  echo "❌ 部分测试失败，请检查日志"
  echo ""
  echo "查看日志："
  echo "  docker-compose -f docker-compose.prod.yml logs"
  exit 1
fi
```

### 阶段4: 更新Nginx配置

```bash
#!/bin/bash
# 文件: scripts/update-nginx-to-service-names.sh

echo "🔧 更新Nginx配置使用服务名..."

# 1. 验证nginx配置文件已经是使用服务名（PR #17的修改）
if grep -q "backend-prod:8080" nginx/sites/ai-project.conf; then
  echo "✅ Nginx配置已经使用服务名（来自PR #17）"
else
  echo "❌ Nginx配置仍使用容器名，需要手动更新"
  exit 1
fi

# 2. 测试nginx配置
echo "测试nginx配置..."
docker exec ai_nginx nginx -t

# 3. 重新加载nginx
echo "重新加载nginx配置..."
docker exec ai_nginx nginx -s reload

echo "✅ Nginx配置已更新并重新加载"

# 4. 验证
echo ""
echo "验证API连接..."
sleep 2
curl -f https://proj.joylodging.com/api/v1/health && echo "✅ API连接正常" || echo "❌ API连接失败"
```

### 阶段5: 清理和优化

```bash
#!/bin/bash
# 文件: scripts/cleanup-after-migration.sh

echo "🧹 清理旧容器和镜像..."

# 1. 删除已停止的容器
echo "删除已停止的容器..."
docker container prune -f

# 2. 删除未使用的镜像
echo "删除未使用的镜像..."
docker image prune -a -f --filter "until=24h"

# 3. 删除未使用的网络（保留ai_prod_network）
echo "删除未使用的网络..."
docker network prune -f

# 4. 显示磁盘使用情况
echo ""
echo "Docker磁盘使用情况："
docker system df

echo ""
echo "✅ 清理完成"
```

---

## 🔙 回滚计划

### 回滚脚本

```bash
#!/bin/bash
# 文件: scripts/rollback-migration.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⏪ Docker Compose 迁移回滚脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 查找最新备份
BACKUP_DIR=$(ls -td /opt/ai-project/migration-backup-* 2>/dev/null | head -n 1)

if [ -z "$BACKUP_DIR" ]; then
  echo "❌ 未找到备份目录"
  exit 1
fi

echo "找到备份: $BACKUP_DIR"
echo ""

read -p "是否使用此备份进行回滚？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "回滚已取消"
  exit 0
fi

echo ""
echo "1️⃣  停止docker-compose服务..."
docker-compose -f docker-compose.prod.yml down

echo ""
echo "2️⃣  恢复数据库..."
docker exec ai_postgres_prod psql -U ${DB_USER} -d ${DB_NAME} -f /backups/postgres_backup.sql

echo ""
echo "3️⃣  恢复Redis..."
docker cp "$BACKUP_DIR/redis_backup.rdb" ai_redis_prod:/data/dump.rdb
docker restart ai_redis_prod

echo ""
echo "4️⃣  恢复配置文件..."
cd /opt/ai-project
tar xzf "$BACKUP_DIR/configs.tar.gz"

echo ""
echo "5️⃣  重新启动容器（手动方式）..."
# 根据备份的容器配置重新启动
# 这里需要根据实际的容器启动命令进行调整

echo ""
echo "✅ 回滚完成"
echo ""
echo "验证服务："
echo "  - API: curl http://localhost/api/v1/health"
echo "  - Frontend: curl http://localhost/"
```

---

## 📋 执行检查清单

### 迁移前检查

- [ ] 已通知所有团队成员维护窗口时间
- [ ] 已创建完整备份
- [ ] 已验证docker-compose.prod.yml配置
- [ ] 已准备所有迁移脚本
- [ ] 已测试回滚流程
- [ ] 已设置监控告警
- [ ] 已准备好回滚联系人

### 迁移中监控

- [ ] 容器启动状态
- [ ] 健康检查状态
- [ ] 数据库连接
- [ ] Redis连接
- [ ] API响应时间
- [ ] 错误日志监控

### 迁移后验证

- [ ] 所有容器运行中且健康
- [ ] DNS解析正常（服务名可解析）
- [ ] API功能正常
- [ ] 前端访问正常
- [ ] 数据库数据完整
- [ ] Redis缓存正常
- [ ] 日志记录正常
- [ ] 监控指标正常

---

## ⏰ 详细时间表

### 维护窗口建议时间

**日期**: 待定
**时间**: 凌晨 2:00 AM - 3:00 AM CST
**预计时长**: 60分钟
**风险缓冲**: +30分钟

### 分钟级时间表

| 时间 | 任务 | 负责人 | 预计耗时 |
|------|------|--------|----------|
| 01:45 | 团队集合，最后检查 | 全员 | 15分钟 |
| 02:00 | 执行备份脚本 | 运维 | 10分钟 |
| 02:10 | 停止当前容器 | 运维 | 5分钟 |
| 02:15 | 启动docker-compose | 运维 | 10分钟 |
| 02:25 | 等待健康检查 | 运维 | 10分钟 |
| 02:35 | 运行验证脚本 | QA | 10分钟 |
| 02:45 | 更新nginx配置 | 运维 | 5分钟 |
| 02:50 | 最终验证和测试 | 全员 | 10分钟 |
| 03:00 | 确认完成或回滚决策 | PM | - |

---

## 🎯 成功标准

### 技术指标

- ✅ 所有容器状态: Up (healthy)
- ✅ 服务名DNS解析成功率: 100%
- ✅ API健康检查: 200 OK
- ✅ 前端页面加载: < 2秒
- ✅ 数据库查询响应: < 100ms
- ✅ Redis命令响应: < 10ms

### 业务指标

- ✅ 服务可用性: > 99.5%（允许10分钟停机）
- ✅ 用户体验无明显变化
- ✅ 数据零丢失
- ✅ 功能完全正常

---

## 📞 联系人和支持

### 角色和职责

| 角色 | 姓名 | 职责 | 联系方式 |
|------|------|------|----------|
| 项目经理 | TBD | 决策和协调 | - |
| 运维工程师 | TBD | 执行迁移 | - |
| 后端开发 | TBD | 后端问题支持 | - |
| 前端开发 | TBD | 前端问题支持 | - |
| DBA | TBD | 数据库支持 | - |
| QA工程师 | TBD | 验证测试 | - |

### 升级路径

1. **Level 1**: 运维工程师处理常见问题
2. **Level 2**: 相关开发人员支持
3. **Level 3**: 项目经理决定回滚

---

## 📚 参考资料

### Docker Compose文档

- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Container Networking](https://docs.docker.com/network/)

### 项目文档

- [PR #17: Nginx配置修复](https://github.com/qiudl/new-ai-proj/pull/17)
- [生产环境后端连接修复报告](./PROD_BACKEND_CONNECTION_FIX.md)
- [生产部署计划](./PRODUCTION_DEPLOYMENT_PLAN.md)
- [协同开发指南](./COLLABORATION_GUIDE.md)

### 脚本文件

所有迁移脚本位于 `scripts/` 目录：
- `backup-before-migration.sh`
- `validate-compose-config.sh`
- `migrate-to-compose.sh`
- `verify-migration.sh`
- `rollback-migration.sh`
- `update-nginx-to-service-names.sh`
- `cleanup-after-migration.sh`

---

## 📝 变更日志

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2025-11-18 | 1.0 | 初始版本，完整迁移计划 | AI Team |

---

**最后更新**: 2025-11-18
**文档状态**: Draft - 待审核
**下一步**: 团队审核 → 制定具体日期 → 执行迁移
