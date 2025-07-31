# 数据库备份系统使用说明

## 快速开始

### 1. 设置权限
```bash
chmod +x scripts/backup/*.sh
```

### 2. 第一次备份
```bash
# 手动完整备份
./scripts/backup/manual_backup.sh full
```

### 3. 安装自动备份
```bash
# 安装定时任务
./scripts/backup/setup_cron.sh install
```

### 4. 健康检查
```bash
# 检查系统状态
./scripts/backup/health_check.sh check
```

## 脚本说明

- **manual_backup.sh** - 手动备份工具
- **auto_backup.sh** - 自动备份系统
- **restore.sh** - 数据恢复工具
- **setup_cron.sh** - 定时任务配置
- **health_check.sh** - 健康监控
- **backup_config.sh** - 系统配置

## 备份策略

- **日备份**: 每天凌晨2点，保留7天
- **周备份**: 每周日凌晨3点，保留30天
- **月备份**: 每月1号凌晨4点，保留365天

## 目录结构

```
backups/
├── daily/        # 日备份
├── weekly/       # 周备份
├── monthly/      # 月备份
├── manual/       # 手动备份
├── schema/       # 结构备份
├── pre-restore/  # 恢复前备份
└── logs/         # 系统日志
```

## 常用命令

```bash
# 手动备份
./scripts/backup/manual_backup.sh full

# 查看备份统计
./scripts/backup/manual_backup.sh stats

# 恢复数据
./scripts/backup/restore.sh

# 健康检查
./scripts/backup/health_check.sh check

# 查看定时任务
crontab -l | grep backup
```

## 详细文档

完整的使用文档请查看系统生成的详细文档。

## 系统要求

- Docker已安装并运行
- PostgreSQL容器正常运行
- 足够的磁盘空间（建议预留数据库大小的2倍空间）

## 故障排除

如遇问题，请按以下步骤检查：

1. 检查Docker状态: `docker info`
2. 检查数据库容器: `docker ps | grep postgres_db`
3. 检查数据库连接: `docker exec postgres_db pg_isready -U user -d main_db`
4. 查看系统日志: `tail -f backups/logs/*.log`
5. 执行健康检查: `./scripts/backup/health_check.sh check`