# JWT本地签名工具 - 3分钟快速上手

## 🎯 为什么需要这个工具?

**问题**: 每次需要调用API时,都要通过MCP的`dev_quick_login`获取token,效率低。

**解决方案**: 使用本地JWT签名工具,一次生成,多次使用,有效期长达7天。

## 🚀 三步开始使用

### 第1步: 生成Token (只需一次)

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj
./scripts/gen-jwt.sh admin 168
```

**输出示例**:
```
🔐 本地JWT生成工具
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ JWT Token 生成成功!
  用户: admin (ID: 1)
  角色: admin
  过期时间: 2025-11-20T22:46:18+08:00

💾 已保存到:
  • ~/.ai-proj-jwt-token
  • ~/.ai-proj-jwt.env
```

### 第2步: 加载Token到环境变量

```bash
source ~/.ai-proj-jwt.env
```

### 第3步: 使用Token调用API

```bash
# 现在可以直接使用 $TOKEN 变量
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/tasks?page=1&page_size=1

# 或者在Claude Code的bash命令中使用
# TOKEN=$(cat ~/.ai-proj-jwt-token)
```

## ✅ 验证是否工作

```bash
# 检查token文件
cat ~/.ai-proj-jwt-token

# 测试API调用
bash -c 'TOKEN=$(cat ~/.ai-proj-jwt-token) && \
  curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/tasks?page=1&page_size=1" | jq .success'
# 应该输出: true
```

## 📝 常用场景

### 场景1: 在Claude Code中使用

在Claude Code的bash命令中:
```bash
TOKEN=$(cat ~/.ai-proj-jwt-token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks
```

### 场景2: 在终端中使用

```bash
# 加载环境变量
source ~/.ai-proj-jwt.env

# 使用 $TOKEN 变量
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks
```

### 场景3: Token过期后刷新

```bash
# 重新生成(会覆盖旧token)
./scripts/gen-jwt.sh admin 168

# 重新加载
source ~/.ai-proj-jwt.env
```

## 🔄 刷新Token

Token默认有效期7天,过期后重新生成:

```bash
./scripts/gen-jwt.sh admin 168
source ~/.ai-proj-jwt.env
```

## 🎨 可选: 设置别名(更方便)

```bash
# 配置别名
source scripts/setup-jwt-alias.sh

# 以后就可以用简短命令
gen-jwt admin 168    # 生成token
load-jwt             # 加载token
```

## 💡 提示

1. **Token有效期**: 默认168小时(7天),可自定义
2. **自动保存**: Token自动保存到`~/.ai-proj-jwt-token`
3. **权限保护**: Token文件权限设为600,只有所有者可读写
4. **多用户**: 可以为不同用户生成不同token

## 🐛 常见问题

### Q: Token无法使用?
**A**: 检查后端服务是否启动:
```bash
curl http://localhost:8080/health
```

### Q: 数据库连接失败?
**A**: 确保SSH隧道已启动:
```bash
./scripts/tunnel.sh start
```

### Q: 想换其他用户?
**A**: 指定用户名:
```bash
./scripts/gen-jwt.sh weier 168
```

## 📚 更多文档

- [详细使用指南](./LOCAL_JWT_GENERATION.md)
- [快速参考](./JWT_TOOL_SUMMARY.md)
- [脚本README](../scripts/README_JWT.md)

## 🎉 完成!

现在你可以:
- ✅ 避免频繁调用MCP认证
- ✅ 快速生成有效token
- ✅ 在任何地方使用token
- ✅ 7天内无需重新生成

---

**最后更新**: 2025-11-13
