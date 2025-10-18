# 生产环境部署指南

## 快速开始

### 标准部署（推荐）
```bash
./scripts/deploy-to-production.sh
```

### 仅部署后端
```bash
./scripts/deploy-to-production.sh --backend-only
```

## 新增功能

### 1. 自动配置复制 ✅
脚本会自动从以下位置复制生产环境配置：
- 优先：`/opt/ai-project/backend/.env`
- 备用：`/opt/ai-project/.env.prod`

### 2. 数据库连接验证 ✅
启动服务前自动验证数据库连接，确保配置正确。

### 3. 详细错误日志 ✅
- 编译过程实时输出
- 服务启动详细状态
- 失败时自动收集诊断信息

## 部署流程

```
1. 检查SSH连接
2. 创建新发布目录
3. 同步代码
4. 复制生产配置 ← 新增
5. 编译后端
6. 验证数据库连接 ← 新增
7. 更新软链接
8. 重启服务
9. 健康检查（10次重试）
```

## 故障排查

### 配置文件错误
```bash
# 检查服务器配置
ssh ubuntu@152.136.104.251 "cat /opt/ai-project/backend/.env | grep DB_"
```

### 数据库连接失败
```bash
# 手动测试连接
ssh ubuntu@152.136.104.251 "docker ps | grep postgres"
```

### 服务启动失败
```bash
# 查看日志
ssh ubuntu@152.136.104.251 "tail -50 /opt/ai-project/releases/release_*/backend/backend.log"
```

## 回滚操作

```bash
# 查看所有版本
ssh ubuntu@152.136.104.251 "ls -lt /opt/ai-project/releases/"

# 回滚到指定版本
ssh ubuntu@152.136.104.251 "cd /opt/ai-project && ln -snf releases/release_YYYYMMDD_HHMMSS current && pkill -f 'ai-project.*main' && cd current/backend && nohup ./main > backend.log 2>&1 &"
```

## 命令行参数

- `--backend-only`: 仅部署后端
- `--frontend-only`: 仅部署前端
- `--no-build`: 跳过构建
- `--no-restart`: 跳过重启
- `--dry-run`: 模拟运行
- `--help`: 显示帮助

## 注意事项

1. **首次使用新脚本前**：确认 `/opt/ai-project/backend/.env` 存在
2. **部署期间**：服务会有短暂中断（约3-5秒）
3. **失败处理**：脚本会自动终止，不会影响当前运行的服务

