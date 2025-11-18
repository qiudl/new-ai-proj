# GitHub Secrets 配置指南

本文档说明如何为 GitHub Actions CI/CD 部署配置必要的 Secrets。

## 一、配置位置

在 GitHub Repository 中配置 Secrets：

1. 进入你的 GitHub 仓库
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret` 添加以下 secrets

## 二、必需的 Secrets

### 1. SSH 连接配置

#### `PROD_SSH_HOST`
- **描述**: 生产服务器 IP 地址或域名
- **值**: `152.136.104.251`
- **示例**:
  ```
  152.136.104.251
  ```

#### `PROD_SSH_USER`
- **描述**: SSH 登录用户名
- **值**: `ubuntu`
- **示例**:
  ```
  ubuntu
  ```

#### `PROD_SSH_KEY`
- **描述**: SSH 私钥（用于免密登录）
- **获取方式**:
  ```bash
  # 在本地执行（如果还没有密钥对）
  ssh-keygen -t ed25519 -C "github-actions@ai-project" -f ~/.ssh/github_actions_key

  # 查看私钥（完整复制）
  cat ~/.ssh/github_actions_key

  # 复制公钥到服务器
  ssh-copy-id -i ~/.ssh/github_actions_key.pub ubuntu@152.136.104.251
  ```
- **格式**: 完整的私钥内容，包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`

### 2. 数据库配置（可选，用于数据库备份）

#### `PROD_DB_PASSWORD`
- **描述**: 生产数据库密码
- **示例**:
  ```
  your_secure_db_password_here
  ```

### 3. JWT 配置

#### `JWT_SECRET`
- **描述**: JWT Token 签名密钥
- **生成方式**:
  ```bash
  # 生成随机密钥
  openssl rand -base64 64
  ```
- **示例**:
  ```
  your_jwt_secret_key_here_change_in_production
  ```

## 三、配置步骤

### Step 1: 生成 SSH 密钥对（如果没有）

```bash
# 1. 在本地生成密钥对
ssh-keygen -t ed25519 -C "github-actions-cicd" -f ~/.ssh/github_actions_cicd

# 2. 将公钥复制到服务器
ssh-copy-id -i ~/.ssh/github_actions_cicd.pub ubuntu@152.136.104.251

# 3. 测试连接
ssh -i ~/.ssh/github_actions_cicd ubuntu@152.136.104.251 "echo 'SSH connection successful!'"

# 4. 如果成功，复制私钥内容
cat ~/.ssh/github_actions_cicd
```

### Step 2: 在 GitHub 添加 Secrets

1. **添加 SSH 私钥**:
   - Name: `PROD_SSH_KEY`
   - Secret: 粘贴完整的私钥内容（包括头尾标识）

2. **添加服务器地址**:
   - Name: `PROD_SSH_HOST`
   - Secret: `152.136.104.251`

3. **添加 SSH 用户**:
   - Name: `PROD_SSH_USER`
   - Secret: `ubuntu`

4. **添加 JWT 密钥** (可选，如果使用现有的):
   - Name: `JWT_SECRET`
   - Secret: 你的 JWT 密钥

5. **添加数据库密码** (可选):
   - Name: `PROD_DB_PASSWORD`
   - Secret: 你的数据库密码

### Step 3: 验证配置

添加完 Secrets 后，可以手动触发一次 workflow 测试：

1. 进入 `Actions` 标签页
2. 选择 `CI/CD Deploy to Production` workflow
3. 点击 `Run workflow`
4. 选择 `main` 分支
5. 点击 `Run workflow` 按钮

## 四、环境变量（Environment Variables）

除了 Secrets，还需要在服务器上配置环境变量文件：

### 创建 .env 文件

```bash
# 在服务器上执行
ssh ubuntu@152.136.104.251

# 创建环境变量文件
cat > /opt/ai-project-cicd/shared/env/.env << 'EOF'
# Database
DB_HOST=postgres-master
DB_PORT=5432
DB_USER=prod_user
DB_PASSWORD=your_secure_password_here
DB_NAME=ai_project_db

# Server
PORT=8080
APP_ENV=production
LOG_LEVEL=info

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# Features
FEATURE_SUPERADMIN_ENABLE=true
SUPER_ADMIN_USERNAMES=admin,guoym,weier,fuxing

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
EOF

# 设置文件权限
chmod 600 /opt/ai-project-cicd/shared/env/.env
```

## 五、安全最佳实践

### 1. SSH 密钥管理
- ✅ 使用专门的 SSH 密钥对，不要使用个人密钥
- ✅ 定期轮换密钥（建议每 90 天）
- ✅ 密钥只授予必要的权限
- ⚠️ 从不在代码中硬编码密钥

### 2. 密码管理
- ✅ 使用强密码（至少 16 位，包含大小写、数字、特殊字符）
- ✅ 每个服务使用不同的密码
- ✅ 定期更换密码
- ✅ 使用密码管理工具存储

### 3. JWT 密钥
- ✅ 使用足够长的随机密钥（至少 256 位）
- ✅ 生产环境和开发环境使用不同的密钥
- ✅ 定期轮换 JWT 密钥

### 4. Secrets 访问控制
- ✅ 限制对 repository secrets 的访问权限
- ✅ 使用 environment secrets 进行额外保护
- ✅ 启用 branch protection rules
- ✅ 审计 secrets 的使用

## 六、故障排查

### 问题 1: SSH 连接失败

```bash
# 检查 SSH 连接
ssh -i ~/.ssh/github_actions_cicd -v ubuntu@152.136.104.251

# 检查服务器上的 authorized_keys
cat ~/.ssh/authorized_keys
```

### 问题 2: Secrets 未生效

1. 确认 secret 名称完全匹配（区分大小写）
2. 重新触发 workflow
3. 检查 workflow 日志

### 问题 3: 权限错误

```bash
# 检查文件权限
ls -la /opt/ai-project-cicd/
ls -la /opt/ai-project-cicd/shared/env/

# 修复权限
sudo chown -R ubuntu:ubuntu /opt/ai-project-cicd/
chmod 600 /opt/ai-project-cicd/shared/env/.env
```

## 七、相关文档

- [GitHub Actions Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [SSH 密钥管理最佳实践](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [环境变量管理](../deployment/ENVIRONMENT_VARIABLES.md)

## 八、快速检查清单

部署前确认：

- [ ] `PROD_SSH_HOST` 已配置
- [ ] `PROD_SSH_USER` 已配置
- [ ] `PROD_SSH_KEY` 已配置且可正常连接
- [ ] SSH 密钥已添加到服务器 authorized_keys
- [ ] 服务器目录结构已创建 (`/opt/ai-project-cicd/`)
- [ ] 部署脚本已上传到服务器
- [ ] docker-compose.prod.yml 已上传
- [ ] .env 文件已在服务器上创建并配置
- [ ] 测试过 SSH 连接可正常工作

---

**最后更新**: 2025-11-18
**维护者**: AI Development Team
