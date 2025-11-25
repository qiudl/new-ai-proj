# 生产环境 SCP + Build 部署

> 使用 SCP 上传编译后的二进制文件，直接在服务器运行，无需 Docker
> 部署时间从 3-5 分钟缩短到 30-60 秒

## 快速开始

### 方式一：一键初始化（推荐）

```bash
# 部署前检查
./scripts/prod/pre-deploy-check.sh

# 一键初始化服务器（自动完成所有配置）
./scripts/prod/init-server.sh

# SSH 到服务器编辑敏感配置
ssh aiproject@proj.joylodging.com 'vim /opt/ai-project/backend/.env.prod'

# 执行部署
./scripts/prod/deploy-scp.sh
```

### 方式二：分步初始化

```bash
# 1. 初始化服务器环境
ssh ubuntu@proj.joylodging.com 'bash -s' < scripts/prod/server/setup-server.sh

# 2. 上传配置
scp scripts/prod/server/nginx-ai-project.conf aiproject@proj.joylodging.com:/tmp/
scp scripts/prod/server/ai-backend.conf aiproject@proj.joylodging.com:/tmp/
ssh aiproject@proj.joylodging.com << 'EOF'
sudo cp /tmp/nginx-ai-project.conf /etc/nginx/sites-available/ai-project
sudo ln -sf /etc/nginx/sites-available/ai-project /etc/nginx/sites-enabled/
sudo cp /tmp/ai-backend.conf /etc/supervisor/conf.d/
sudo supervisorctl reread && sudo supervisorctl update
sudo nginx -t && sudo systemctl reload nginx
EOF

# 3. 部署
./scripts/prod/deploy-scp.sh
```

### 部署选项

```bash
# 完整部署（后端+前端）
./scripts/prod/deploy-scp.sh

# 仅部署后端
./scripts/prod/deploy-scp.sh --backend-only

# 仅部署前端
./scripts/prod/deploy-scp.sh --frontend-only

# 跳过构建（使用已编译的文件）
./scripts/prod/deploy-scp.sh --skip-build
```

## 文件说明

```text
scripts/prod/
├── deploy-scp.sh              # 主部署脚本（本地执行）
├── init-server.sh             # 一键初始化服务器（本地执行）
├── pre-deploy-check.sh        # 部署前检查（本地执行）
├── README.md                  # 本文档
└── server/                    # 服务器端配置和脚本
    ├── setup-server.sh        # 服务器环境初始化
    ├── setup-ssl.sh           # SSL 证书配置
    ├── ai-backend.conf        # Supervisor 配置
    ├── nginx-ai-project.conf  # Nginx 配置
    ├── .env.prod.example      # 环境变量模板
    ├── health-check.sh        # 健康检查（支持 --json）
    ├── status.sh              # 服务状态面板
    ├── monitor.sh             # 监控脚本（可作为 cron）
    ├── notify.sh              # 部署通知（钉钉/企业微信/Slack）
    ├── rollback.sh            # 快速回滚
    ├── run-migrations.sh      # 数据库迁移
    ├── backup-db.sh           # 数据库备份
    └── logrotate-ai-project   # 日志轮转配置
```

## 环境变量

部署前需要设置以下环境变量（或使用默认值）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PROD_SERVER_IP` | proj.joylodging.com | 服务器 IP |
| `PROD_SERVER_USER` | aiproject | SSH 用户名 |
| `PROD_SSH_KEY` | ~/.ssh/id_rsa | SSH 私钥路径 |
| `API_URL` | https://$SERVER_IP/api/v1 | 前端 API 地址 |

## 常用命令

### 部署相关

```bash
# 本地部署
./scripts/prod/deploy-scp.sh

# GitHub Actions 部署
# 在 GitHub 仓库页面 -> Actions -> Deploy via SCP + Build -> Run workflow
```

### 服务器管理

```bash
# SSH 到服务器
ssh aiproject@proj.joylodging.com

# 查看服务状态
sudo supervisorctl status ai-backend

# 重启服务
sudo supervisorctl restart ai-backend

# 查看日志
tail -f /opt/ai-project/logs/backend.log

# 健康检查
/opt/ai-project/scripts/health-check.sh

# 回滚
/opt/ai-project/scripts/rollback.sh
```

### 数据库操作

```bash
# 执行迁移
/opt/ai-project/scripts/run-migrations.sh

# 备份数据库
/opt/ai-project/scripts/backup-db.sh

# 查看备份
ls -la /opt/ai-project/backups/db/
```

## Cron 任务配置

```bash
# 编辑 crontab
crontab -e

# 添加以下任务：

# 每5分钟健康检查
*/5 * * * * /opt/ai-project/scripts/monitor.sh >> /opt/ai-project/logs/monitor.log 2>&1

# 每天凌晨2点备份数据库
0 2 * * * /opt/ai-project/scripts/backup-db.sh >> /opt/ai-project/logs/backup.log 2>&1
```

## 回滚

```bash
# 在服务器上执行
/opt/ai-project/scripts/rollback.sh

# 或指定版本
/opt/ai-project/scripts/rollback.sh 20251122_143052
```

## 故障排除

### 后端启动失败

```bash
# 查看日志
tail -100 /opt/ai-project/logs/backend.log
tail -100 /opt/ai-project/logs/backend.err

# 手动启动测试
cd /opt/ai-project/backend
./ai-backend
```

### Nginx 502 错误

```bash
# 检查后端是否运行
curl http://localhost:8080/health

# 检查 Nginx 错误日志
sudo tail -100 /var/log/nginx/error.log

# 测试配置
sudo nginx -t
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -h localhost -U ai_prod_user -d ai_project_prod
```

## 性能对比

| 指标 | Docker | SCP + Build |
|------|--------|-------------|
| 部署时间 | 3-5分钟 | **30-60秒** |
| 启动时间 | 10-30秒 | **3-5秒** |
| 回滚速度 | 1-2分钟 | **10秒** |
| 内存占用 | ~500MB | **~200MB** |

## SSL 证书配置

```bash
# 使用域名（Let's Encrypt）
ssh aiproject@proj.joylodging.com '/opt/ai-project/scripts/setup-ssl.sh ai.example.com admin@example.com'

# 使用 IP（自签名证书）
ssh aiproject@proj.joylodging.com '/opt/ai-project/scripts/setup-ssl.sh proj.joylodging.com'
```

## 部署通知配置

在服务器 `.env.prod` 中添加:

```bash
# 钉钉机器人
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx

# 企业微信机器人
WECHAT_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx

# Slack
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```

使用:

```bash
# 在服务器上
/opt/ai-project/scripts/notify.sh "部署成功" success
/opt/ai-project/scripts/notify.sh "部署失败" error
```

## 服务状态面板

```bash
# 在服务器上查看状态面板
/opt/ai-project/scripts/status.sh
```

输出示例:

```text
╔══════════════════════════════════════════════════════════════╗
║                   AI Project 服务状态面板                      ║
╚══════════════════════════════════════════════════════════════╝

═══ 系统信息 ═══
  主机名:    prod-server
  运行时间:  up 30 days

═══ 服务状态 ═══
  Backend:    ● 运行中
  Nginx:      ● 运行中
  PostgreSQL: ● 运行中
  Redis:      ● 运行中
```

## GitHub Actions 部署

在 GitHub 仓库设置以下 Secrets:

| Secret | 说明 |
|--------|------|
| `PROD_SSH_HOST` | 服务器 IP |
| `PROD_SSH_USER` | SSH 用户名 |
| `PROD_SSH_KEY` | SSH 私钥 (base64 编码) |
| `API_URL` | API 地址 |
| `HEALTH_URL` | 健康检查地址 |

触发部署: GitHub → Actions → "Deploy via SCP + Build" → Run workflow
