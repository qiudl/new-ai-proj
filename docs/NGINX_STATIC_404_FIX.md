# Nginx静态资源404错误修复记录

## 问题描述

生产环境出现静态资源404错误：
```
GET https://proj.joylodging.com/static/css/main.76f3efa8.css net::ERR_ABORTED 404
GET https://proj.joylodging.com/static/js/main.a285a5fd.js net::ERR_ABORTED 404
```

## 根本原因分析

### 问题1: 静态资源路径配置错误

nginx配置中设置了：
```nginx
root /var/www/html;
location ~* \.(js|css|...)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    # 没有proxy_pass，会在root目录查找文件
}
```

**问题**：
- `/var/www/html`目录在nginx容器中**不存在**或为空
- 静态资源location规则匹配.js和.css文件，但没有proxy_pass
- nginx尝试在本地文件系统查找文件，找不到返回404

**实际情况**：
- 前端文件在`ai_frontend_prod`容器的`/usr/share/nginx/html/`中
- 前端容器内已经有完整的nginx配置处理静态资源缓存和gzip

### 问题2: upstream主机名解析失败

第一次修复后，nginx无法启动：
```
nginx: [emerg] host not found in upstream "frontend-prod" in /etc/nginx/conf.d/ai-project.conf:54
```

**原因**：
- 使用了服务名`frontend-prod`作为upstream
- 在某些Docker网络配置下，容器无法解析服务名
- 需要使用容器名`ai_frontend_prod`

## 解决方案

### 最终配置

`nginx/sites/ai-project.conf`:
```nginx
# 前端应用 - 直接代理到前端容器
# 前端容器内的nginx已经配置了静态资源缓存和gzip
location / {
    proxy_pass http://ai_frontend_prod:80;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;

    # 缓存配置
    proxy_cache_bypass $http_upgrade;
    proxy_no_cache $http_upgrade;

    # 超时配置
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

### 改进点

1. **移除不必要的配置**：
   - 删除`root /var/www/html;`
   - 删除复杂的静态资源location规则
   - 删除@frontend named location

2. **简化架构**：
   - 所有前端请求（包括静态资源）直接代理到前端容器
   - 利用前端容器内nginx的配置处理缓存和压缩
   - 避免配置重复和不一致

3. **使用正确的主机名**：
   - 使用容器名`ai_frontend_prod`而不是服务名`frontend-prod`
   - 确保Docker网络中可以正确解析

## 部署步骤

```bash
# 1. 修改nginx配置
vim nginx/sites/ai-project.conf

# 2. 提交代码
git add nginx/sites/ai-project.conf
git commit -m "fix(nginx): 修复静态资源404错误"
git push

# 3. 上传到生产服务器
scp nginx/sites/ai-project.conf ubuntu@152.136.104.251:/home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf

# 4. 重启nginx容器
ssh ubuntu@152.136.104.251 'docker restart ai_nginx'

# 5. 验证
ssh ubuntu@152.136.104.251 'curl -skI https://localhost/static/css/main.76f3efa8.css'
# 应该返回: HTTP/2 200
```

## 验证结果

### 服务器端测试
```bash
$ curl -skI https://localhost/static/css/main.76f3efa8.css
HTTP/2 200
server: nginx
date: Wed, 22 Oct 2025 13:17:54 GMT
content-type: text/css
content-length: 27301
```

### 文件引用检查
```bash
$ curl -sk https://localhost/ | grep -o "static/[^\"]*"
static/js/main.a285a5fd.js
static/css/main.76f3efa8.css
```

## 相关提交

- `475b295`: fix(nginx): 修复静态资源404错误 - 直接代理到前端容器
- `0f73792`: fix(nginx): 使用容器名而不是服务名作为upstream

## 经验教训

1. **容器化架构**：
   - 在Docker环境中，每个容器有独立的文件系统
   - nginx容器无法直接访问其他容器的文件
   - 必须通过网络代理访问

2. **避免重复配置**：
   - 前端容器已有nginx处理静态资源
   - 主nginx应该简单地代理请求，而不是重复配置

3. **Docker网络**：
   - 服务名可能在某些情况下无法解析
   - 容器名更可靠
   - 确保容器在同一网络中

4. **配置简化原则**：
   - 更简单的配置更容易维护
   - 利用现有的容器配置，避免重复
   - 每层只负责自己的职责

## 后续优化建议

1. **健康检查**：
   - 确保nginx的depends_on配置正确
   - 添加readiness probe

2. **监控告警**：
   - 添加404错误率监控
   - 设置告警阈值

3. **文档完善**：
   - 更新部署文档
   - 记录nginx配置规范

## 时间线

- **2025-10-22 13:00**: 发现问题 - 静态资源404
- **2025-10-22 13:05**: 定位问题 - nginx配置错误
- **2025-10-22 13:10**: 第一次修复 - 简化配置，代理到前端容器
- **2025-10-22 13:15**: 发现新问题 - upstream解析失败
- **2025-10-22 13:17**: 最终修复 - 使用容器名
- **2025-10-22 13:18**: 验证通过 - 静态资源正常访问
