# 生产环境问题分析报告

**日期**: 2025-11-20
**环境**: 生产环境 (proj.joylodging.com)
**CI/CD**: GitHub Actions
**报告问题**:
1. 登录后页面出现遮罩
2. 任务项目等后端API没有连接成功

---

## 一、问题分析

### 1.1 前端构建配置问题 ⚠️ **关键问题**

#### 问题描述
GitHub Actions构建流程中,前端环境变量配置存在矛盾:

**文件**: `.github/workflows/deploy-cicd.yml`
```yaml
# Line 100-106: build-frontend job
env:
  REACT_APP_API_URL: https://proj.joylodging.com/api/v1
  REACT_APP_ENV: production
  GENERATE_SOURCEMAP: false
  NODE_ENV: production
```

**文件**: `docker-compose.prod.yml`
```yaml
# Line 121-125: frontend-prod service
environment:
  REACT_APP_API_URL: https://${DOMAIN_NAME}/api/v1
  REACT_APP_API_BASE_URL: https://${DOMAIN_NAME}/api/v1
  REACT_APP_ENV: production
```

#### 根本原因
**React环境变量的特性**:
- 环境变量在 `npm run build` 时被**编译进JavaScript文件**
- Docker容器runtime的环境变量**无法**改变已构建的静态文件
- 导致docker-compose.prod.yml中的环境变量设置**完全无效**

#### 影响
- 前端硬编码API URL为: `https://proj.joylodging.com/api/v1`
- 无法通过环境变量动态配置
- 部署灵活性降低

---

### 1.2 前端Dockerfile配置问题

**文件**: `frontend/Dockerfile` (Production阶段)

```dockerfile
# Line 100-108: Build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_ENV=production
ARG GENERATE_SOURCEMAP=false

ENV NODE_ENV=production
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_ENV=${REACT_APP_ENV}
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP}
```

**问题**:
- Dockerfile期望通过`build args`传入API URL
- 但GitHub Actions workflow在`build-frontend` job中**没有设置build args**
- 仅在环境变量中设置,导致Dockerfile无法获取

---

### 1.3 Nginx配置问题

**文件**: `nginx/sites/ai-project.conf`

#### 问题1: upstream配置错误
```nginx
# Line 113-116: upstream backend
upstream backend {
    server frontend-prod:80;  # ❌ 错误: 命名为backend但指向frontend
    keepalive 32;
}

upstream api {
    server backend-prod:8080;  # ✅ 正确
    keepalive 32;
}
```

**影响**: 虽然没有使用`upstream backend`,但配置混乱容易引起误解。

#### 问题2: proxy_pass配置不一致
```nginx
# Line 52-78: /api/ location
location /api/ {
    proxy_pass http://ai_backend_prod:8080;  # ✅ 直接使用容器名
    ...
}

# Line 82-99: / location
location / {
    proxy_pass http://ai_frontend_prod:80;   # ✅ 直接使用容器名
    ...
}
```

**当前状态**: 实际代理配置是正确的,直接使用容器名而非upstream。

---

### 1.4 后端CORS配置

**文件**: `backend/routes/setup.go`

```go
// Line 222-242: corsMiddleware
func corsMiddleware(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")  // ✅ 允许所有源
        c.Header("Access-Control-Allow-Credentials", "true")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
        c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers")
        c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
        c.Header("Access-Control-Max-Age", "86400")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        c.Next()
    }
}
```

**状态**: ✅ CORS配置正常,应该不会导致跨域问题。

---

### 1.5 前端API配置逻辑

**文件**: `frontend/src/utils/URLBuilder.ts`

```typescript
// Line 65-99: detectBaseUrlWithPrefix
private detectBaseUrlWithPrefix(apiPrefix: string, debug: boolean): string {
    const candidates = [
      process.env.REACT_APP_API_URL,
      process.env.REACT_APP_API_BASE_URL,
      process.env.REACT_APP_BASE_URL,
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.trim()) {
        const cleanCandidate = candidate.trim();
        if (cleanCandidate.includes(apiPrefix)) {
          const baseUrl = cleanCandidate.replace(new RegExp(apiPrefix.replace('/', '\\/') + '.*$'), '');
          return baseUrl;
        }
        return cleanCandidate;
      }
    }

    // Fallback to window.location
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}`;
    }

    return '';
}
```

**分析**:
- 优先使用环境变量
- 如果环境变量包含`/api/v1`,会自动移除后缀
- 最后fallback到当前域名

---

## 二、问题定位

### 2.1 后端API连接失败原因

可能的原因(按概率排序):

1. **前端请求的API URL不正确** (最可能)
   - 构建时API URL: `https://proj.joylodging.com/api/v1`
   - 如果实际访问域名不同,会导致跨域或404

2. **后端服务未正常启动**
   - 需要检查容器状态: `docker ps`
   - 需要检查后端日志: `docker logs ai_backend_prod`

3. **Nginx代理配置问题**
   - 检查Nginx是否正确转发API请求
   - 检查Nginx日志: `/opt/ai-project-cicd/current/logs/nginx/`

### 2.2 登录后遮罩问题原因

可能的原因:

1. **全局Loading状态未清除**
   - 检查`App.tsx`中的loading逻辑
   - 检查`TimerContext`等全局状态

2. **Modal组件未正确关闭**
   - 检查Modal清理逻辑

3. **路由跳转问题**
   - 登录后跳转逻辑可能有问题

---

## 三、修复方案

### 方案1: 修复GitHub Actions构建配置 (推荐)

**目标**: 确保前端构建时使用正确的环境变量

**步骤**:

1. **修改 `.github/workflows/deploy-cicd.yml`**

```yaml
# build-frontend job修改
- name: Build frontend Docker image
  run: |
    echo "Building frontend Docker image..."
    docker build \
      -t ai-frontend:${{ github.sha }} \
      -t ai-frontend:latest \
      -f frontend/Dockerfile.prod \
      --target production \
      --build-arg REACT_APP_API_URL=https://proj.joylodging.com/api/v1 \
      --build-arg REACT_APP_ENV=production \
      --build-arg GENERATE_SOURCEMAP=false \
      frontend/
```

2. **简化 `docker-compose.prod.yml`** (移除无效的environment)

```yaml
frontend-prod:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    target: production
    # 移除args,因为在CI/CD中已经构建好镜像
  container_name: ai_frontend_prod
  # 移除environment配置(对已构建的静态文件无效)
  ports:
    - "127.0.0.1:3000:80"
  restart: always
```

### 方案2: 使用runtime配置 (更灵活)

**目标**: 使前端支持runtime环境变量配置

**步骤**:

1. **创建配置注入脚本** `frontend/docker-entrypoint.sh`

```bash
#!/bin/sh
# 在容器启动时注入环境变量到window对象

cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV_CONFIG = {
  REACT_APP_API_URL: "${REACT_APP_API_URL}",
  REACT_APP_ENV: "${REACT_APP_ENV}"
};
EOF

exec "$@"
```

2. **修改 `frontend/Dockerfile`**

```dockerfile
# Production stage
FROM nginx:alpine AS production

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

3. **修改 `frontend/public/index.html`**

```html
<head>
  <!-- 加载runtime配置 -->
  <script src="%PUBLIC_URL%/env-config.js"></script>
  ...
</head>
```

4. **修改前端配置读取逻辑**

```typescript
// frontend/src/config/env.ts
export const getApiUrl = (): string => {
  // Runtime配置优先
  if (window.ENV_CONFIG?.REACT_APP_API_URL) {
    return window.ENV_CONFIG.REACT_APP_API_URL;
  }
  // Fallback to build-time
  return process.env.REACT_APP_API_URL || '';
};
```

### 方案3: 修复Nginx配置 (清理)

**目标**: 清理混乱的upstream配置

```nginx
# 删除错误的upstream配置
# upstream backend {
#     server frontend-prod:80;
#     keepalive 32;
# }

# 保留正确的upstream
upstream api {
    server ai_backend_prod:8080;
    keepalive 32;
}

# 可选: 使用upstream替代直接容器名
location /api/ {
    proxy_pass http://api;  # 使用upstream
    ...
}
```

---

## 四、诊断步骤

### 4.1 检查生产环境服务状态

```bash
# SSH到生产服务器
ssh root@proj.joylodging.com

# 检查容器状态
cd /opt/ai-project-cicd/current
docker-compose ps

# 检查容器日志
docker logs ai_backend_prod --tail=100
docker logs ai_frontend_prod --tail=100
docker logs ai_nginx --tail=100

# 检查后端健康状态
curl http://localhost:8080/health

# 检查前端
curl http://localhost:3000
```

### 4.2 检查前端构建的API配置

```bash
# 查看前端构建产物中的API URL
docker exec ai_frontend_prod grep -r "proj.joylodging.com" /usr/share/nginx/html/static/js/
```

### 4.3 检查浏览器控制台

在浏览器中:
1. 打开开发者工具 (F12)
2. 查看Console标签的错误信息
3. 查看Network标签,检查API请求状态
4. 检查请求的URL是否正确

---

## 五、优先级修复建议

### 立即修复 (P0)
1. ✅ 修改GitHub Actions workflow,添加`--build-arg`
2. ✅ 重新触发CI/CD部署
3. ✅ 验证前端能否正确连接后端API

### 短期优化 (P1)
1. 实施runtime配置方案(方案2)
2. 清理Nginx配置中的混乱部分
3. 添加部署后的健康检查脚本

### 长期优化 (P2)
1. 添加自动化测试,验证API连接
2. 实现配置中心管理环境变量
3. 完善监控和告警机制

---

## 六、验证清单

部署后验证:

- [ ] 容器状态正常: `docker ps`
- [ ] 后端健康检查通过: `curl http://localhost:8080/health`
- [ ] 前端可访问: `curl https://proj.joylodging.com`
- [ ] API请求成功: 浏览器开发者工具Network标签
- [ ] 登录功能正常
- [ ] 任务列表可加载
- [ ] 项目列表可加载

---

**报告生成时间**: 2025-11-20
**分析工具**: Claude Code
**建议执行人**: DevOps/运维团队
