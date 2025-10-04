# PostgreSQL主从复制架构使用指南

## 📚 目录
- [架构概览](#架构概览)
- [快速开始](#快速开始)
- [日常使用](#日常使用)
- [监控和维护](#监控和维护)
- [故障排查](#故障排查)
- [最佳实践](#最佳实践)

---

## 架构概览

### 🏗️ 系统架构

```
┌─────────────────┐         SSH隧道(15433)         ┌──────────────────┐
│   应用服务器    │ ←────────────────────────────→ │   远端主库       │
│  (localhost)    │                                 │ 152.136.104.251  │
│                 │                                 │                  │
│  ┌───────────┐  │                                 │  ┌────────────┐  │
│  │ 后端应用  │  │    写操作 → 主库:15433         │  │PostgreSQL16│  │
│  │ (Go)      │  │    读操作 → 从库:5432          │  │  (主库)    │  │
│  └───────────┘  │                                 │  └────────────┘  │
│                 │                                 └──────────────────┘
│  ┌───────────┐  │                                          │
│  │PostgreSQL │  │         流式复制(Streaming Replication)  │
│  │  (从库)   │  │ ←────────────────────────────────────────┘
│  └───────────┘  │
│  Port: 5432     │
│  (只读)         │
└─────────────────┘
```

### 📊 配置信息

| 组件 | 地址 | 用途 | 模式 |
|------|------|------|------|
| 远端主库 | 152.136.104.251:5432 | 生产数据库 | 读写 |
| SSH隧道 | localhost:15433 | 主库访问代理 | 转发 |
| 本机从库 | localhost:5432 | 本地只读副本 | 只读 |
| AutoSSH | - | 隧道自动重连 | 守护进程 |

---

## 快速开始

### 1️⃣ 启动AutoSSH隧道

```bash
# 启动隧道
./autossh-tunnel.sh start

# 查看状态
./autossh-tunnel.sh status

# 查看日志
./autossh-tunnel.sh logs
```

### 2️⃣ 启动从库容器

```bash
# 启动从库
docker start ai_postgres_slave

# 检查从库状态
docker logs ai_postgres_slave | tail -20
```

### 3️⃣ 验证复制状态

```bash
# 快速检查
./monitor-replication.sh check

# 验证数据一致性
./verify-consistency.sh quick
```

### 4️⃣ 启动应用

```bash
cd backend
go run main.go
```

---

## 日常使用

### 🔄 启动流程

```bash
# 1. 启动SSH隧道
./autossh-tunnel.sh start

# 2. 启动从库
docker start ai_postgres_slave

# 3. 检查复制
./monitor-replication.sh check

# 4. 启动应用
cd backend && go run main.go
```

### 🛑 停止流程

```bash
# 1. 停止应用 (Ctrl+C)

# 2. 停止从库
docker stop ai_postgres_slave

# 3. 停止SSH隧道
./autossh-tunnel.sh stop
```

### 📝 读写分离使用

应用会自动使用读写分离:
- **写操作** → 自动路由到主库(通过SSH隧道)
- **读操作** → 自动路由到从库(本机容器)

配置在 `.env`:
```env
ENABLE_READ_WRITE_SPLIT=true
DB_MASTER_DSN=postgresql://app_user:***@localhost:15433/new_ai_proj_prod
DB_SLAVE_DSN=postgresql://app_user:***@localhost:5432/new_ai_proj_prod
```

---

## 监控和维护

### 📊 复制监控

```bash
# 单次检查
./monitor-replication.sh check

# 持续监控(每10秒)
./monitor-replication.sh monitor

# 查看告警
./monitor-replication.sh alerts
```

**监控指标:**
- ✅ SSH隧道连接状态
- ✅ 从库恢复模式状态
- ✅ 主库复制连接活跃度
- ✅ 复制延迟(字节和时间)
- ✅ WAL日志同步状态

### 🔍 数据一致性验证

```bash
# 快速验证关键表
./verify-consistency.sh quick

# 完整验证所有表
./verify-consistency.sh full

# 查看差异记录
./verify-consistency.sh diff

# 定时验证(每小时)
./verify-consistency.sh schedule 3600
```

### 📈 健康检查SQL

**检查从库状态:**
```sql
-- 连接从库
docker exec ai_postgres_slave psql -U app_user -d new_ai_proj_prod

-- 检查是否在恢复模式
SELECT pg_is_in_recovery();  -- 应返回 't'

-- 检查WAL接收和回放
SELECT
  pg_last_wal_receive_lsn() as receive_lsn,
  pg_last_wal_replay_lsn() as replay_lsn,
  pg_last_xact_replay_timestamp() as last_replay;
```

**检查主库状态:**
```bash
# 通过SSH连接主库
ssh ubuntu@152.136.104.251 'docker exec $(docker ps -q --filter "name=postgres") psql -U app_user -d new_ai_proj_prod'

# 查看复制连接
SELECT
  client_addr,
  state,
  sync_state,
  replay_lsn,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication;
```

---

## 故障排查

### ❌ SSH隧道断开

**现象:**
- 应用无法连接主库
- 写操作失败

**解决:**
```bash
# 重启隧道
./autossh-tunnel.sh restart

# 检查状态
./autossh-tunnel.sh status

# 查看日志
tail -50 logs/autossh-tunnel.log
```

### ❌ 从库复制中断

**现象:**
- 复制延迟持续增大
- 从库日志显示连接错误

**诊断:**
```bash
# 检查从库日志
docker logs ai_postgres_slave | tail -50

# 检查主库连接
./monitor-replication.sh check
```

**解决:**
```bash
# 重启从库
docker restart ai_postgres_slave

# 如果仍失败,重建从库
docker stop ai_postgres_slave
docker rm ai_postgres_slave
# 重新执行pg_basebackup (参考部署文档)
```

### ❌ 数据不一致

**现象:**
- 一致性检查发现差异
- 读操作返回旧数据

**诊断:**
```bash
# 检查复制延迟
./monitor-replication.sh check

# 验证数据差异
./verify-consistency.sh full
```

**解决:**
1. 等待复制追上(通常几秒钟)
2. 如果长时间不一致,检查复制状态
3. 必要时重建从库

### ❌ 网络延迟过高

**现象:**
- 复制延迟 > 30秒
- 写操作响应慢

**解决:**
```bash
# 检查网络延迟
ping -c 10 152.136.104.251

# 检查SSH连接
ssh ubuntu@152.136.104.251 'echo OK'

# 考虑临时禁用读写分离
# 在 .env 中设置: ENABLE_READ_WRITE_SPLIT=false
```

---

## 最佳实践

### ✅ 启动顺序

1. **AutoSSH隧道** (最先启动)
2. **从库容器**
3. **复制状态检查**
4. **应用服务**

### ✅ 监控建议

- **实时监控**: 使用 `./monitor-replication.sh monitor`
- **定时验证**: 每小时运行一次一致性检查
- **告警设置**: 关注系统通知

### ✅ 备份策略

```bash
# 定期备份从库 (推荐每天)
docker exec ai_postgres_slave pg_dump -U app_user new_ai_proj_prod > \
  backups/slave_backup_$(date +%Y%m%d).sql
```

### ✅ 性能优化

**读写分离配置:**
```env
# 启用读写分离
ENABLE_READ_WRITE_SPLIT=true

# 从库连接池(更大,支持更多读请求)
DB_SLAVE_MAX_OPEN_CONNS=200
DB_SLAVE_MAX_IDLE_CONNS=20
```

**复制优化:**
- 主库 WAL 级别: `replica`
- 同步模式: `async` (异步,性能更好)
- WAL 发送者数量: 10 (足够)

### ✅ 安全建议

1. **SSH隧道**:
   - 定期更新SSH密钥
   - 使用防火墙限制访问IP

2. **数据库访问**:
   - 最小权限原则
   - 定期轮换密码
   - 审计日志开启

3. **监控告警**:
   - 设置延迟阈值告警
   - 连接失败通知
   - 数据不一致告警

---

## 📞 支持和文档

### 文件位置

```
new-ai-proj/
├── autossh-tunnel.sh          # SSH隧道管理
├── monitor-replication.sh     # 复制监控
├── verify-consistency.sh      # 一致性验证
├── REPLICATION_GUIDE.md       # 本文档
├── backend/.env               # 配置文件
└── logs/                      # 日志目录
    ├── autossh-tunnel.log
    ├── replication-monitor.log
    ├── replication-alerts.log
    └── consistency-check.log
```

### 常用命令速查

```bash
# 启动
./autossh-tunnel.sh start && docker start ai_postgres_slave

# 状态检查
./autossh-tunnel.sh status && ./monitor-replication.sh check

# 完整验证
./verify-consistency.sh full

# 重启一切
./autossh-tunnel.sh restart && docker restart ai_postgres_slave

# 查看日志
tail -f logs/*.log
```

---

**最后更新**: 2025-10-04
**版本**: 1.0.0
**维护者**: AI Project Team
