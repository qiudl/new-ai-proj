
企业编辑功能测试指南
==================

🧪 测试步骤:

第1步: 准备测试环境
- 确保前端服务运行在 http://localhost:3000
- 确保后端服务运行在 http://localhost:8080
- 清除浏览器缓存和localStorage

第2步: 登录系统
- 访问 http://localhost:3000/login
- 使用有效凭据登录
- 确认获得了新的token

第3步: 测试企业编辑功能
- 访问企业列表页: http://localhost:3000/companies
- 点击任意企业进入详情页
- 点击"编辑"按钮
- 观察是否正常跳转到编辑页面

第4步: 测试token过期处理
在浏览器Console中执行:
```javascript
// 设置过期token
localStorage.setItem('token', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid');
// 刷新页面
location.reload();
```
- 应该自动跳转到登录页

第5步: 测试API错误处理
- 停止后端服务
- 尝试访问企业编辑页面
- 观察错误提示和处理

✅ 预期结果:
- 点击编辑按钮正常跳转，不退出登录
- Token过期时自动跳转到登录页
- 显示友好的错误提示
- 不会出现强制页面刷新

❌ 如果仍有问题:
1. 检查浏览器Console的错误信息
2. 检查Network标签的API请求
3. 确认后端服务端口配置
4. 重启前端开发服务器
  