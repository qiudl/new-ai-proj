# Fuxing用户权限问题诊断指南

## 问题现状

用户fuxing(ID:112)在生产环境访问大量路由页面时显示"没有权限"。

## 已完成的修复

1. ✅ 已将fuxing(ID:112)添加到生产环境`.env`的`SUPER_ADMIN_IDS`
2. ✅ 后端进程(PID: 90124)已加载新配置
3. ✅ 环境变量验证通过：
   ```bash
   FEATURE_SUPERADMIN_ENABLE=true
   SUPER_ADMIN_IDS=1,2,112
   ```

## 诊断步骤

### 步骤1：清除浏览器缓存和Token

**原因：** 旧的JWT token可能还在浏览器中，需要强制重新登录获取新token。

**操作步骤：**
1. 在浏览器中打开 https://proj.joylodging.com
2. 按 `F12` 打开开发者工具
3. 切换到 `Console` 标签
4. 执行以下命令清除token：
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```
5. 或者直接点击"退出登录"按钮
6. 重新使用fuxing账号登录

### 步骤2：检查JWT Token内容

**操作步骤：**
1. 登录后，在开发者工具的Console中执行：
   ```javascript
   const token = localStorage.getItem('token');
   if (token) {
       const payload = JSON.parse(atob(token.split('.')[1]));
       console.log('JWT Payload:', payload);
       console.log('User ID:', payload.user_id);
       console.log('Username:', payload.username);
       console.log('Role:', payload.role);
   }
   ```
2. 确认输出中：
   - `user_id` 应该是 `112`
   - `username` 应该是 `"fuxing"`
   - `role` 应该是 `"admin"`

### 步骤3：测试权限检查API

在开发者工具Console中执行：

```javascript
// 获取当前token
const token = localStorage.getItem('token');

// 测试权限检查API
fetch('https://proj.joylodging.com/api/v1/permissions/check', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        permissionCode: 'enterprise_user_read'
    })
})
.then(res => res.json())
.then(data => {
    console.log('权限检查结果:', data);
    if (data.hasPermission) {
        console.log('✅ 有权限！');
    } else {
        console.log('❌ 无权限:', data.reason);
    }
});
```

**预期结果：**
```json
{
  "hasPermission": true,
  "reason": "Superadmin bypass",
  "source": "admin_override"
}
```

### 步骤4：检查后端日志

如果权限检查仍然失败，需要查看后端日志：

**SSH到生产服务器：**
```bash
ssh ubuntu@152.136.104.251

# 方案A：如果有日志文件
tail -f /tmp/backend.log | grep -E "SUPERADMIN|Permission|fuxing"

# 方案B：查看systemd日志（如果有）
sudo journalctl -u ai-project-backend -f --no-pager

# 方案C：查看进程输出（如果重定向了）
sudo tail -f /proc/90124/fd/1 /proc/90124/fd/2
```

**关键日志示例：**
```
[SUPERADMIN] Feature enabled: true
[SUPERADMIN] Checking user: username=fuxing, uid=112
[SUPERADMIN] Configured usernames: map[admin:{} sysadmin:{}], ids: map[1:{} 2:{} 112:{}]
[SUPERADMIN] UID match: 112 = true  ← 应该看到这个！
```

### 步骤5：强制重启后端服务

如果上述日志显示配置未加载或user_id不匹配，需要强制重启：

```bash
# SSH到生产服务器
ssh ubuntu@152.136.104.251

# 停止当前进程
sudo kill 90124

# 重新启动
cd /home/ubuntu/apps/new-ai-proj/backend
export $(grep -v '^#' ../.env | xargs)
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_SSL_MODE=disable
nohup ./main > /tmp/backend-$(date +%Y%m%d-%H%M%S).log 2>&1 &

# 验证启动
ps aux | grep main | grep -v grep
curl -s http://localhost:8080/health
```

## 可能的问题和解决方案

### 问题1：JWT Token未刷新

**症状：** 权限检查API返回无权限
**解决：** 清除浏览器存储，重新登录

### 问题2：后端未识别user_id

**症状：** 日志显示 `uid=0` 或其他错误值
**原因：** JWT中的user_id字段可能是字符串而非数字
**解决：** 检查JWT token生成逻辑，确保user_id是整数

### 问题3：Environment变量未正确加载

**症状：** 日志显示配置的ids不包含112
**解决：** 重启后端服务，确保.env文件正确加载

### 问题4：前端缓存了权限检查结果

**症状：** 后端日志显示有权限，但前端仍显示403
**解决：**
```javascript
// 清除前端权限缓存
localStorage.removeItem('userPermissions');
location.reload();
```

## 紧急联系

如果以上步骤都无法解决问题，请收集以下信息：

1. JWT Token payload（去除敏感信息）
2. 后端日志中的SUPERADMIN检查记录
3. 浏览器Network标签中 `/api/v1/permissions/check` 的请求/响应
4. 报错页面的完整截图

## 相关任务

- 任务 #2766: 调查用户fuxing(ID:112)生产环境权限异常问题
- 配置修改: commit f393b242
