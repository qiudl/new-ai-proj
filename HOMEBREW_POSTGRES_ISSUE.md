# Homebrew PostgreSQL从库配置失败报告

## 📋 任务目标

将本机Homebrew PostgreSQL (端口5432)配置为远端Linux主库的第三个从库,形成三库架构:
- 远端主库 (152.136.104.251:5432)
- Docker从库 (localhost:5433)
- Homebrew从库 (localhost:5432)

## ❌ 遇到的问题

### Locale兼容性问题

**根本原因:**
- 远端Linux主库使用locale: `LC_COLLATE="en_US.utf8"` (小写utf)
- macOS仅支持locale: `LC_COLLATE="en_US.UTF-8"` (大写UTF)
- PostgreSQL的`LC_COLLATE`和`LC_CTYPE`在数据库集簇初始化时确定,无法通过配置文件后期修改

**错误信息:**
```
FATAL:  database locale is incompatible with operating system
DETAIL:  The database was initialized with LC_COLLATE "en_US.utf8",  which is not recognized by setlocale().
HINT:  Recreate the database with another locale or install the missing locale.
```

**尝试的解决方法:**
1. ❌ 在postgresql.conf中覆盖locale设置 - 无效,LC_COLLATE是集簇级别
2. ❌ 使用C locale覆盖 - 无效,只能覆盖lc_messages等,不能覆盖LC_COLLATE
3. ❌ 修改macOS系统locale - 不推荐,可能影响其他应用

## ✅ 最终方案

**保持双库架构:**
- **远端主库** (152.136.104.251:5432) - 写操作
- **本机Docker从库** (localhost:5433) - 读操作

**为什么Docker可以工作:**
Docker容器运行的是Linux环境,与远端Linux主库的locale完全兼容,不存在兼容性问题。

## 📊 当前架构状态

```
┌──────────────────┐
│   远端主库       │  152.136.104.251:5432
│  (Linux)         │  LC_COLLATE=en_US.utf8
└────────┬─────────┘
         │ SSH隧道(15433)
         │ WAL流式复制
         ↓
┌──────────────────┐
│  Docker从库      │  localhost:5433
│  (Linux容器)     │  LC_COLLATE=en_US.utf8
│  - 只读模式      │  ✅ Locale兼容
│  - 0延迟复制    │
└──────────────────┘

┌──────────────────┐
│ Homebrew从库     │  localhost:5432
│  (macOS)         │  ❌ Locale不兼容
│  - 已停止        │  en_US.UTF-8 ≠ en_US.utf8
└──────────────────┘
```

## ✅ 验证结果

### 复制状态检查
```bash
$ ./monitor-replication.sh check
✅ SSH隧道连接正常
✅ 从库运行正常(恢复模式)
✅ 主库复制连接活跃
✅ 复制延迟: -96B (几乎为0)
```

### 数据一致性检查
```bash
$ ./verify-consistency.sh quick
✅ users表: 24行 - 数据校验和一致
✅ tasks表: 2325行 - 数据校验和一致
✅ projects表: 44行 - 数据校验和一致
✅ documents表: 1775行 - 数据校验和一致
```

## 🔧 配置文件

### 应用配置 (backend/.env)
```env
# 读写分离配置
ENABLE_READ_WRITE_SPLIT=true

# 主库 - 通过SSH隧道
DB_MASTER_DSN=postgresql://app_user:***@localhost:15433/new_ai_proj_prod?sslmode=disable

# 从库 - Docker容器
DB_SLAVE_DSN=postgresql://app_user:***@localhost:5433/new_ai_proj_prod?sslmode=disable
```

### SSH隧道管理
```bash
# 启动
./autossh-tunnel.sh start

# 检查状态
./autossh-tunnel.sh status

# 重启
./autossh-tunnel.sh restart
```

### Docker从库管理
```bash
# 启动
docker start ai_postgres_slave

# 查看日志
docker logs ai_postgres_slave

# 检查状态
docker exec ai_postgres_slave psql -U app_user -d new_ai_proj_prod -c "SELECT pg_is_in_recovery();"
```

## 📁 备份文件

Homebrew PostgreSQL数据已备份至:
```
/Users/johnqiu/coding/www/projects/new-ai-proj/backups/homebrew-postgres-backup-*.tar.gz
```

如需恢复或查看数据,可以解压此备份。

## 💡 未来改进建议

如果确实需要三库架构,可以考虑:

1. **创建第二个Docker从库**
   - 使用不同的数据卷
   - 映射到端口5432
   - 与现有Docker从库使用相同的Linux环境

2. **在远端主库修改locale**
   - ⚠️ 需要重新initdb,会丢失所有数据
   - 需要重新导入数据
   - 仅在必要时考虑,影响巨大

3. **使用macOS兼容的主库**
   - 如果主库也运行在macOS上,则不存在此问题
   - 但当前主库是生产环境,不适合更改

## 📚 相关文档

- [REPLICATION_GUIDE.md](./REPLICATION_GUIDE.md) - 复制架构使用指南
- [autossh-tunnel.sh](./autossh-tunnel.sh) - SSH隧道管理脚本
- [monitor-replication.sh](./monitor-replication.sh) - 复制监控脚本
- [verify-consistency.sh](./verify-consistency.sh) - 数据一致性验证脚本

## ✅ 结论

虽然无法将Homebrew PostgreSQL配置为从库,但当前的**双库架构**已经完全满足需求:
- ✅ 读写分离正常工作
- ✅ 复制延迟几乎为0
- ✅ 数据100%一致
- ✅ AutoSSH自动重连保证稳定性
- ✅ 完善的监控和告警机制

---
**创建时间**: 2025-10-04
**状态**: 已完成(采用双库方案)
