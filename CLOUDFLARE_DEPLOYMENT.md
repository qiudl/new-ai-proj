# 🌟 Cloudflare Pages 部署指南

## 📋 概述

本指南详细介绍如何将 AI 项目管理系统的前端应用部署到 Cloudflare Pages。

## 🚀 快速开始

### 方法一：命令行部署

```bash
# 1. 安装依赖
cd frontend
npm install

# 2. 构建和部署到生产环境
npm run deploy:cf

# 3. 构建和部署到预览环境
npm run preview:cf
```

### 方法二：脚本部署

```bash
# 部署到生产环境
./scripts/deploy-cloudflare.sh production

# 部署到预览环境
./scripts/deploy-cloudflare.sh preview
```

## 🔧 详细配置

### 1. Cloudflare 账户设置

#### 1.1 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择 "Pages" > "Create a project"
3. 选择 "Upload assets" 或连接 Git 仓库
4. 设置项目名称: `ai-project-frontend`

#### 1.2 获取 API 令牌

1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Custom token" 模板
4. 配置权限：
   - Zone: Zone:Read, Zone Settings:Edit
   - Account: Cloudflare Pages:Edit
   - Include: All accounts

### 2. 环境变量配置

#### 2.1 本地环境变量

创建 `frontend/.env.production` 文件：

```env
# API 配置
REACT_APP_API_BASE_URL=https://your-api-domain.com/api/v1

# 应用配置
REACT_APP_APP_NAME=AI项目管理系统
REACT_APP_VERSION=1.0.0

# 功能开关
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_SW=true
```

#### 2.2 Cloudflare Pages 环境变量

在 Cloudflare Pages 控制台设置以下环境变量：

**生产环境变量：**
- `NODE_ENV`: `production`
- `REACT_APP_API_BASE_URL`: `https://your-api-domain.com/api/v1`
- `REACT_APP_APP_NAME`: `AI项目管理系统`
- `GENERATE_SOURCEMAP`: `false`

**构建配置：**
- `NODE_VERSION`: `18`
- `NPM_VERSION`: `9`

### 3. GitHub Actions 自动部署

#### 3.1 GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

- `CLOUDFLARE_API_TOKEN`: Cloudflare API 令牌
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 账户 ID
- `REACT_APP_API_BASE_URL`: 后端 API 地址

#### 3.2 工作流触发条件

- **自动部署**: 推送到 `main` 分支时自动部署到生产环境
- **预览部署**: 推送到 `develop` 分支时部署到预览环境
- **PR 部署**: 创建 Pull Request 时部署到预览环境

## 🌐 域名配置

### 1. 自定义域名设置

#### 1.1 在 Cloudflare Pages 中添加自定义域名

1. 在 Pages 项目中点击 "Custom domains"
2. 添加你的域名，如 `ai-project.yourdomain.com`
3. 配置 DNS 记录

#### 1.2 DNS 配置

在你的域名 DNS 设置中添加：

```
Type: CNAME
Name: ai-project
Value: ai-project-frontend.pages.dev
```

### 2. SSL 证书

Cloudflare Pages 自动提供 SSL 证书，无需额外配置。

## 📊 性能优化

### 1. 构建优化配置

项目已配置以下优化：

- **代码分割**: 自动 chunk 分割
- **资源压缩**: Gzip 压缩
- **缓存策略**: 静态资源长期缓存
- **Source Map**: 生产环境禁用

### 2. Cloudflare 优化功能

推荐启用以下 Cloudflare 功能：

- **Auto Minify**: HTML, CSS, JavaScript
- **Brotli 压缩**: 更好的压缩效果
- **图片优化**: Polish 和 WebP
- **HTTP/3**: 启用 QUIC 协议

## 🛠️ 故障排除

### 常见问题

#### 1. 构建失败

**症状**: 部署时构建过程失败
**解决方案**:
```bash
# 检查本地构建
cd frontend
npm run build:cloudflare

# 检查依赖
npm audit --audit-level moderate
```

#### 2. 路由不工作

**症状**: 直接访问页面路径时返回 404
**解决方案**: 确保 `_redirects` 文件已正确配置：

```
/*    /index.html   200
```

#### 3. API 请求失败

**症状**: 前端无法连接到后端 API
**解决方案**:
1. 检查 `REACT_APP_API_BASE_URL` 环境变量
2. 确保后端服务器配置了 CORS
3. 检查 Cloudflare Workers 代理设置

#### 4. 环境变量不生效

**症状**: React 应用中读取不到环境变量
**解决方案**:
1. 确保变量名以 `REACT_APP_` 开头
2. 重新部署应用
3. 检查 Cloudflare Pages 环境变量设置

### 日志调试

#### 1. 查看部署日志

1. 访问 Cloudflare Pages 控制台
2. 选择项目 > "Deployments"
3. 点击特定部署查看详细日志

#### 2. 本地调试

```bash
# 模拟生产环境构建
cd frontend
npm run build:cloudflare

# 本地预览构建结果
npx serve -s build -l 3000
```

## 📈 监控和分析

### 1. Cloudflare Analytics

Cloudflare Pages 提供内置分析功能：
- 页面访问量统计
- 性能指标监控
- 错误率跟踪

### 2. 自定义监控

可以集成以下工具：

```javascript
// 性能监控
if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
  // Google Analytics
  // Sentry 错误监控
  // 自定义埋点
}
```

## 🔄 版本管理和回滚

### 1. 版本标记

每次部署会自动创建版本：
- 生产版本: `v1.0.0-{commit-hash}`
- 预览版本: `preview-{branch}-{commit-hash}`

### 2. 快速回滚

在 Cloudflare Pages 控制台中：
1. 访问 "Deployments" 页面
2. 选择之前的稳定版本
3. 点击 "Retry deployment"

### 3. 蓝绿部署

通过自定义域名实现蓝绿部署：
```bash
# 部署到预览环境测试
npm run preview:cf

# 测试通过后部署到生产环境
npm run deploy:cf
```

## 🎯 最佳实践

### 1. 部署策略

- **开发分支**: 自动部署到预览环境
- **PR 审查**: 每个 PR 自动创建预览部署
- **主分支**: 仅在测试通过后部署到生产环境

### 2. 安全考虑

- 敏感信息使用环境变量
- API 密钥不写入前端代码
- 启用 HTTPS 强制重定向

### 3. 性能监控

```bash
# 使用 Lighthouse 进行性能审计
npx lighthouse https://ai-project-frontend.pages.dev

# 分析 bundle 大小
cd frontend
npm run analyze
```

## 📞 技术支持

### 文档资源

- [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [React 部署指南](https://create-react-app.dev/docs/deployment/)

### 常用命令

```bash
# 查看 Wrangler 版本
npx wrangler --version

# 登录 Cloudflare
npx wrangler auth login

# 查看项目列表
npx wrangler pages project list

# 查看部署状态
npx wrangler pages deployment list --project-name=ai-project-frontend
```

---

## 🎉 部署完成

按照本指南完成配置后，你将拥有：

- ✅ 自动化 CI/CD 部署流程
- ✅ 多环境部署支持（生产/预览/开发）
- ✅ 自定义域名和 SSL 证书
- ✅ 性能优化和缓存配置
- ✅ 错误监控和日志记录

**访问地址**:
- 生产环境: `https://ai-project-frontend.pages.dev`
- 预览环境: `https://preview-ai-project-frontend.pages.dev`
- 自定义域名: `https://your-domain.com`

祝你部署成功！🚀