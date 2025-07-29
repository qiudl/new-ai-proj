# GitHub Actions Secrets 配置指南

本文档说明如何在 GitHub 仓库中配置 CI/CD 所需的 Secrets。

## 必需的 Secrets

### 1. 服务器连接相关

#### SERVER_HOST
- **说明**: proj-joylodging 生产服务器的 IP 地址或域名
- **示例**: `152.136.104.251` 或 `proj-joylodging.com`

#### SERVER_USER
- **说明**: 部署用户名
- **示例**: `deploy`

#### SERVER_SSH_KEY
- **说明**: SSH 私钥，用于连接服务器
- **获取方式**:
  ```bash
  # 在本地生成 SSH 密钥对
  ssh-keygen -t ed25519 -f deploy_key -C "github-actions@new-ai-proj"
  
  # 复制私钥内容
  cat deploy_key
  
  # 将公钥添加到服务器
  ssh-copy-id -i deploy_key.pub deploy@proj-joylodging.com
  ```

### 2. Docker Registry 相关

#### DOCKER_USERNAME
- **说明**: Docker Hub 用户名
- **示例**: `your-dockerhub-username`

#### DOCKER_PASSWORD
- **说明**: Docker Hub 密码或访问令牌
- **建议**: 使用访问令牌而非密码
- **获取方式**:
  1. 登录 [Docker Hub](https://hub.docker.com)
  2. 进入 Account Settings → Security
  3. 创建新的 Access Token

### 3. 应用配置相关

#### PROD_DB_NAME
- **说明**: 生产数据库名称
- **示例**: `ai_project_prod`

#### PROD_DB_USER
- **说明**: 生产数据库用户名
- **示例**: `prod_user`

#### PROD_DB_PASSWORD
- **说明**: 生产数据库密码
- **要求**: 至少16位，包含大小写字母、数字和特殊字符

#### PROD_JWT_SECRET
- **说明**: JWT 令牌签名密钥
- **生成方式**:
  ```bash
  openssl rand -base64 64
  ```

#### PROD_API_URL
- **说明**: 生产环境 API 地址
- **示例**: `https://api.proj-joylodging.com`

### 4. 开发环境相关（可选）

#### DEV_SERVER_HOST
- **说明**: 开发服务器地址
- **示例**: `dev.proj-joylodging.com`

#### DEV_SERVER_USER
- **说明**: 开发服务器部署用户
- **示例**: `deploy`

#### DEV_SERVER_SSH_KEY
- **说明**: 开发服务器 SSH 私钥

#### DEV_API_URL
- **说明**: 开发环境 API 地址
- **示例**: `https://dev-api.proj-joylodging.com`

### 5. 通知相关（可选）

#### SLACK_WEBHOOK
- **说明**: Slack Webhook URL，用于部署通知
- **获取方式**:
  1. 在 Slack 中创建 Incoming Webhook
  2. 复制 Webhook URL

#### SNYK_TOKEN
- **说明**: Snyk 安全扫描令牌
- **获取方式**:
  1. 注册 [Snyk](https://snyk.io)
  2. 在账户设置中获取 API Token

## 配置步骤

1. **进入仓库设置**
   - 打开 GitHub 仓库页面
   - 点击 `Settings` → `Secrets and variables` → `Actions`

2. **添加新的 Secret**
   - 点击 `New repository secret`
   - 输入 Secret 名称（必须与上述名称完全一致）
   - 输入 Secret 值
   - 点击 `Add secret`

3. **验证配置**
   - 所有必需的 Secrets 都应该显示在列表中
   - Secret 值是加密的，添加后无法查看

## 安全最佳实践

1. **定期轮换密钥**
   - 每 3-6 个月更新一次密码和密钥
   - 更新后立即测试部署流程

2. **最小权限原则**
   - 部署用户只授予必要的权限
   - 数据库用户限制在特定数据库

3. **使用强密码**
   - 所有密码至少 16 位
   - 包含大小写字母、数字和特殊字符
   - 避免使用常见词汇

4. **限制访问**
   - 只有管理员可以查看和修改 Secrets
   - 定期审查有权限的用户列表

## 故障排查

### Secret 未找到错误
```
Error: Input required and not supplied: xxx
```
**解决方案**: 检查 Secret 名称是否正确，大小写敏感

### SSH 连接失败
```
ssh: connect to host xxx port 22: Connection refused
```
**解决方案**: 
- 检查服务器 IP 是否正确
- 确认 SSH 端口是否为 22
- 验证 SSH 密钥是否匹配

### Docker 登录失败
```
Error: Cannot perform an interactive login from a non TTY device
```
**解决方案**: 使用 Access Token 而非密码

## 示例配置检查脚本

```bash
#!/bin/bash
# 检查必需的 Secrets 是否已配置

required_secrets=(
  "SERVER_HOST"
  "SERVER_USER"
  "SERVER_SSH_KEY"
  "DOCKER_USERNAME"
  "DOCKER_PASSWORD"
  "PROD_DB_NAME"
  "PROD_DB_USER"
  "PROD_DB_PASSWORD"
  "PROD_JWT_SECRET"
  "PROD_API_URL"
)

missing_secrets=()

for secret in "${required_secrets[@]}"; do
  if [ -z "${!secret}" ]; then
    missing_secrets+=("$secret")
  fi
done

if [ ${#missing_secrets[@]} -eq 0 ]; then
  echo "✅ 所有必需的 Secrets 已配置"
else
  echo "❌ 缺少以下 Secrets:"
  printf '%s\n' "${missing_secrets[@]}"
  exit 1
fi
```

## 下一步

配置完成后，可以：
1. 推送代码到 `main` 分支触发生产部署
2. 推送代码到 `develop` 分支触发开发部署
3. 在 Actions 页面查看部署进度
