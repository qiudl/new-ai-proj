# 数据库备份系统

## 📅 自动备份计划
- **每天 06:00** - 早晨备份
- **每天 12:00** - 中午备份  
- **每天 18:00** - 晚上备份

## 📂 备份文件格式
```
YYYYMMDD_HHMM_dbbackup.sql
例如: 20250801_1800_dbbackup.sql
```

## 🛠️ 管理命令

### 查看备份状态
```bash
./scripts/backup-manager.sh status
```

### 列出所有备份
```bash
./scripts/backup-manager.sh list
```

### 立即执行备份
```bash
./scripts/backup-manager.sh backup
```

### 从备份恢复
```bash
./scripts/backup-manager.sh restore
```

### 清理旧备份
```bash
./scripts/backup-manager.sh clean
```

### 查看备份日志
```bash
./scripts/backup-manager.sh logs
```

## 📋 备份保留策略
- 自动保留最近 **7天** 的备份文件
- 超过7天的备份会被自动清理
- 备份文件存储在 `backups/` 目录

## 🔧 手动备份
如需手动备份，可直接运行:
```bash
./scripts/auto-backup.sh
```

## 📊 备份验证
每次备份后系统会自动验证备份文件的完整性，确保数据安全。

## ⚠️ 注意事项
1. 备份过程中请勿关闭数据库容器
2. 恢复操作会覆盖当前数据库，请谨慎操作
3. 定期检查备份系统状态，确保正常运行