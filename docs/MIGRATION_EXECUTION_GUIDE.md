# Docker Compose迁移 - 生产服务器执行指南

## 📋 前置准备

此指南假设您已经：
- ✅ 审阅了迁移计划 (`MIGRATION_README.md`)
- ✅ 获得了团队批准
- ✅ 确定了维护窗口时间
- ✅ 准备好了回滚应急计划

## 🔐 第1步：登录生产服务器

```bash
# 使用您的SSH凭据登录生产服务器
ssh root@proj.joylodging.com
```

## 📥 第2步：拉取最新代码

```bash
# 进入项目目录
cd /opt/ai-project

# 拉取包含迁移脚本的最新代码
git fetch origin
git checkout main
git pull origin main

# 验证迁移脚本存在
ls -lh scripts/migration/
```

预期输出应包含7个脚本：
```
backup-before-migration.sh
validate-compose-config.sh
migrate-to-compose.sh
verify-migration.sh
rollback-migration.sh
update-nginx-to-service-names.sh
cleanup-after-migration.sh
```

## 🔍 第3步：执行迁移前验证

```bash
cd /opt/ai-project

# 确保脚本可执行
chmod +x scripts/migration/*.sh

# 执行配置验证
bash scripts/migration/validate-compose-config.sh
```

**重要**：只有当所有验证通过时才继续。如果有任何失败：
1. 查看错误消息
2. 修复配置问题
3. 重新运行验证

## 💾 第4步：执行完整备份

```bash
# 执行系统备份（需要5-10分钟）
bash scripts/migration/backup-before-migration.sh
```

此步骤会备份：
- PostgreSQL主从数据库
- Redis数据
- Docker volumes
- 所有配置文件
- 容器配置信息

**备份位置**：`/opt/ai-project/migration-backup-YYYYMMDD_HHMMSS/`

记录备份目录路径，以备回滚使用。

## 🚀 第5步：执行迁移

**⚠️ 关键时刻 - 服务将会重启**

```bash
# 执行迁移（预计10-15分钟停机）
bash scripts/migration/migrate-to-compose.sh
```

迁移过程会：
1. 创建完整备份
2. 按依赖顺序优雅停止现有容器
3. 通过docker-compose启动服务
4. 等待健康检查通过
5. 执行初步验证

### 监控进度

脚本会显示实时进度：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  阶段1: 备份当前环境
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

备份创建中...
✅ 备份完成

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  阶段2: 优雅停止现有容器
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  停止: ai_nginx
    ✅ ai_nginx 已停止
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  阶段4: 使用Docker Compose启动服务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [30/60] 运行中: 6/6 | 健康: 5/6
```

### 如果迁移失败

如果看到错误或超时：
1. **不要慌张** - 备份已创建
2. 记录错误消息
3. 执行回滚（见步骤7）

## ✅ 第6步：执行完整验证

```bash
# 运行60+项验证检查
bash scripts/migration/verify-migration.sh
```

验证包括：
1. ✅ 容器状态检查
2. ✅ 健康检查状态
3. ✅ 服务名DNS解析
4. ✅ 容器名DNS解析（向后兼容）
5. ✅ 服务连接测试
6. ✅ Docker Compose管理验证
7. ✅ 网络配置检查
8. ✅ 数据持久化验证
9. ✅ 日志配置检查

### 成功标准

所有检查应该显示：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  最终验证结果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 通过: 58
⚠️  警告: 2
❌ 失败: 0
```

如果有失败项：
- 查看详细错误信息
- 决定是否可以接受（某些警告可能无关紧要）
- 或执行回滚

## 🔧 第7步：应用PR #17的Nginx修复

**只有在验证完全通过后才执行此步骤！**

```bash
# 应用服务名配置到nginx
bash scripts/migration/update-nginx-to-service-names.sh
```

此脚本会：
1. 验证nginx配置已包含服务名
2. 测试服务名DNS解析
3. 备份当前nginx配置
4. 重载nginx
5. 验证API和前端访问
6. 如果失败自动回滚

### 验证最终结果

```bash
# 测试API
curl https://proj.joylodging.com/api/v1/health
# 应返回: {"status":"ok"}

# 测试前端
curl -I https://proj.joylodging.com/
# 应返回: HTTP/2 200

# 检查DNS解析（从nginx容器内部）
docker exec ai_nginx nslookup backend-prod
# 应返回: Address: 172.30.x.x

docker exec ai_nginx nslookup frontend-prod
# 应返回: Address: 172.30.x.x
```

## 🎉 第8步：监控和确认

### 立即验证

```bash
# 查看所有服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看服务日志
docker-compose -f docker-compose.prod.yml logs --tail=100

# 检查特定服务
docker-compose -f docker-compose.prod.yml logs backend-prod --tail=50
```

### 24小时监控清单

- [ ] API响应正常（每小时检查）
- [ ] 前端可访问（每小时检查）
- [ ] 数据库连接稳定
- [ ] Redis缓存工作正常
- [ ] 没有异常错误日志
- [ ] 性能指标正常

监控命令：
```bash
# 持续监控日志
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# 检查容器资源使用
docker stats

# 检查磁盘使用
df -h
docker system df
```

## 🧹 第9步：清理（24小时后）

**只有在确认迁移完全成功后才执行清理！**

```bash
# 清理旧容器、镜像和备份
bash scripts/migration/cleanup-after-migration.sh
```

此脚本会交互式清理：
- 已停止的容器
- 未使用的镜像（24小时前）
- 未使用的网络
- Docker构建缓存
- 旧的备份目录（保留最新1个）
- 旧的nginx配置备份（保留最新2个）

---

## 🔙 紧急回滚流程

### 何时回滚

如果遇到以下情况，应立即回滚：
- ❌ 迁移脚本执行失败
- ❌ 验证检查大量失败
- ❌ 服务无法正常启动
- ❌ API或前端无法访问
- ❌ 数据库连接问题

### 回滚步骤

```bash
# 1. 执行回滚脚本
bash scripts/migration/rollback-migration.sh

# 回滚脚本会：
# - 停止docker-compose服务
# - 恢复配置文件
# - 提供手动容器重启指导
# - 可选恢复数据库和Redis

# 2. 手动重启容器（根据脚本指导）
# 示例：
docker run -d --name ai_postgres_prod \
  --restart always \
  --network ai-project_ai_prod_network \
  -v ai-project_postgres_prod_data:/var/lib/postgresql/data \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -e POSTGRES_DB=$DB_NAME \
  postgres:16

# 3. 验证服务恢复
curl http://localhost/api/v1/health
```

### 联系支持

如果回滚遇到问题：
1. 保留所有错误日志
2. 记录执行的所有命令
3. 联系技术支持团队

---

## 📞 支持信息

### 关键文件位置

- **迁移脚本**: `/opt/ai-project/scripts/migration/`
- **备份目录**: `/opt/ai-project/migration-backup-*/`
- **配置文件**: `/opt/ai-project/docker-compose.prod.yml`
- **环境变量**: `/opt/ai-project/.env.production`
- **Nginx配置**: `/opt/ai-project/nginx/sites/ai-project.conf`

### 有用的命令

```bash
# 查看docker-compose服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs <service-name>

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart <service-name>

# 查看服务健康状态
docker-compose -f docker-compose.prod.yml ps --format json | jq '.[] | {name: .Name, health: .Health}'

# 进入容器
docker exec -it <container-name> bash
```

### 故障排查

**问题：服务名DNS解析失败**
```bash
# 检查容器网络
docker network inspect ai-project_ai_prod_network

# 验证服务定义
docker-compose -f docker-compose.prod.yml config
```

**问题：容器无法启动**
```bash
# 查看详细日志
docker-compose -f docker-compose.prod.yml logs <service-name>

# 检查容器配置
docker inspect <container-name>
```

**问题：健康检查失败**
```bash
# 手动运行健康检查命令
docker exec <container-name> <health-check-command>

# 例如后端健康检查
docker exec ai_backend_prod curl -f http://localhost:8080/health
```

---

## ✅ 成功标准

迁移成功的标志：

1. ✅ 所有6个服务显示为 "Up" 状态
2. ✅ 健康检查全部通过
3. ✅ API健康检查返回200
4. ✅ 前端可正常访问
5. ✅ 服务名DNS解析成功（backend-prod, frontend-prod）
6. ✅ Docker Compose命令正常工作
7. ✅ 数据库数据完整
8. ✅ 用户登录和核心功能正常

## 📊 迁移时间估算

- **备份**：5-10分钟
- **迁移执行**：10-15分钟
  - 停止容器：2-3分钟
  - 启动服务：3-5分钟
  - 健康检查：5-7分钟
- **验证**：5-10分钟
- **Nginx配置更新**：2-3分钟

**总计**：约25-40分钟（建议预留60分钟维护窗口）

---

## 🎯 执行检查清单

打印此清单并在执行过程中逐项确认：

```
准备阶段：
[ ] 团队审阅批准
[ ] 确定维护窗口
[ ] 通知用户服务中断
[ ] 准备应急联系方式

执行阶段：
[ ] 登录生产服务器
[ ] 拉取最新代码
[ ] 验证配置
[ ] 执行备份
[ ] 记录备份目录
[ ] 执行迁移
[ ] 运行完整验证
[ ] 应用nginx修复
[ ] 测试API
[ ] 测试前端
[ ] 检查服务日志

后续阶段：
[ ] 通知用户服务恢复
[ ] 开始24小时监控
[ ] 每小时检查服务状态
[ ] 24小时后执行清理
[ ] 更新运维文档

应急准备：
[ ] 回滚脚本已测试
[ ] 备份可访问
[ ] 技术支持待命
[ ] 用户通知渠道就绪
```

---

**准备好了吗？按照此指南逐步执行，迁移将顺利完成！** 🚀
