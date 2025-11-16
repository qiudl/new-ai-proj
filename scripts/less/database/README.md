# PostgreSQL 数据库脚本

本目录包含PostgreSQL主从复制相关的配置和监控脚本。

## 架构概览

- **主库**: 152.136.104.251:5432 (Docker容器 ai_postgres_prod)
- **远端从库**: 152.136.104.251:5433 (Docker容器 ai_postgres_slave)
- **本地从库**: 127.0.0.1:5432 (Homebrew PostgreSQL)
- **复制方式**: 异步流复制 (Asynchronous Streaming Replication)
- **连接方式**: SSH隧道 (本地从库 → 远端主库)

## 脚本说明

### 1. setup-local-slave.sh
**用途**: 配置本地PostgreSQL作为远端主库的从库

**功能**:
- 备份本地PostgreSQL数据目录
- 使用pg_basebackup从远端主库克隆数据
- 配置从库连接参数
- 启动从库并验证复制状态

**使用方法**:
```bash
# 确保SSH隧道已建立 (127.0.0.1:5433 → 152.136.104.251:5432)
ssh -L 5433:localhost:5432 ubuntu@152.136.104.251 -N -f

# 运行脚本
./scripts/database/setup-local-slave.sh
```

**注意事项**:
- ⚠️ 此脚本会清空本地PostgreSQL数据，请确保已备份重要数据
- 需要replicator用户的密码: `Repl1c@t0r2024!`
- 本地数据目录: `/opt/homebrew/var/postgresql@16`

### 2. setup-slave-simple.sh
**用途**: 在远端服务器上创建PostgreSQL从库容器

**功能**:
- 使用pg_basebackup创建主库的物理备份
- 配置从库连接参数和复制槽
- 启动从库Docker容器
- 验证复制状态

**使用方法**:
```bash
# 在远端服务器上运行
ssh ubuntu@152.136.104.251
./apps/new-ai-proj/scripts/database/setup-slave-simple.sh
```

**配置说明**:
- 从库数据目录: `/home/ubuntu/apps/new-ai-proj/postgres-slave-data`
- 从库容器名: `ai_postgres_slave`
- 从库端口: `127.0.0.1:5433`
- 复制槽名: `slave_slot_1`

### 3. monitor-replication.sh
**用途**: 监控PostgreSQL主从复制状态

**功能**:
- 显示容器运行状态
- 显示复制连接状态和延迟
- 显示从库恢复状态
- 显示复制槽状态
- 显示数据库统计信息
- 显示WAL归档状态
- 健康评分 (0-100分)

**使用方法**:
```bash
# 单次检查
ssh ubuntu@152.136.104.251 './apps/new-ai-proj/scripts/database/monitor-replication.sh'

# 持续监控 (每5秒刷新)
ssh ubuntu@152.136.104.251 './apps/new-ai-proj/scripts/database/monitor-replication.sh --watch'
```

**健康评分标准**:
- 🟢 90-100分: 优秀 (Excellent)
- 🟡 70-89分: 良好 (Good)
- 🟠 50-69分: 警告 (Warning)
- 🔴 <50分: 严重 (Critical)

## 复制用户凭据

- **用户名**: replicator
- **密码**: Repl1c@t0r2024!
- **权限**: REPLICATION, LOGIN

## 常用命令

### 检查主库复制状态
```bash
ssh ubuntu@152.136.104.251 'docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -c "SELECT * FROM pg_stat_replication;"'
```

### 检查从库复制延迟
```bash
ssh ubuntu@152.136.104.251 'docker exec -i ai_postgres_slave psql -U ai_prod_user -d ai_project_prod -c "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"'
```

### 检查复制槽状态
```bash
ssh ubuntu@152.136.104.251 'docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -c "SELECT * FROM pg_replication_slots;"'
```

### 查看本地从库状态
```bash
psql -h 127.0.0.1 -p 5432 -U ai_prod_user -d ai_project_prod -c "SELECT pg_is_in_recovery();"
```

## 相关文档

详细的部署指南请参考: [PostgreSQL主从复制部署指南](../../docs/database/postgres-replication-deployment-guide.md)

## 维护建议

1. **定期监控**: 建议每天至少检查一次复制状态
2. **延迟监控**: 正常情况下复制延迟应小于10KB
3. **备份策略**: 主从复制不能替代备份,仍需定期pg_dump
4. **故障切换**: 从库可以手动提升为主库,参考部署指南
5. **清理WAL**: 监控WAL磁盘使用,必要时调整wal_keep_size

## 故障排查

### 从库无法连接主库
```bash
# 检查SSH隧道
ps aux | grep "ssh.*5433"

# 重建SSH隧道
ssh -L 5433:localhost:5432 ubuntu@152.136.104.251 -N -f

# 检查防火墙
ssh ubuntu@152.136.104.251 'sudo ufw status'
```

### 复制延迟过大
```bash
# 检查主库负载
ssh ubuntu@152.136.104.251 'docker stats ai_postgres_prod --no-stream'

# 检查网络延迟
ping 152.136.104.251

# 检查WAL发送速率
ssh ubuntu@152.136.104.251 'docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod -c "SELECT * FROM pg_stat_replication;"'
```

### 从库停止复制
```bash
# 检查从库日志
docker logs ai_postgres_slave --tail 100

# 重启从库
docker restart ai_postgres_slave

# 如果需要重新初始化,运行setup-slave-simple.sh
```

## 安全注意事项

1. **密码安全**: 生产环境应使用更强的密码
2. **网络隔离**: 复制流量应在VPN或专网中传输
3. **SSL加密**: 考虑启用PostgreSQL SSL连接
4. **最小权限**: replicator用户仅有REPLICATION权限

---

**创建日期**: 2025-10-25
**最后更新**: 2025-10-25
**维护人员**: Claude Code AI
