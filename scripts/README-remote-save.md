# 保存分析报告到远程工作笔记

由于远程服务器 `https://proj.joylodging.com` 有IP白名单限制，需要在受信任的环境中运行脚本。

## 问题说明

当前从Claude Code环境访问远程API时遇到 **403 Forbidden** 错误：

```
HTTP/2 403
Access denied
```

这表明服务器配置了访问控制（可能是IP白名单、WAF规则等）。

## 解决方案

### 方案1: 在本地环境运行（推荐）

在你的本地开发机器上运行脚本：

```bash
# 1. 进入项目目录
cd /path/to/new-ai-proj

# 2. 确保有JWT token（可选，脚本已内置）
export JWT_TOKEN="your-token-here"

# 3. 运行脚本
./scripts/save-analysis-remote.sh
```

### 方案2: 在服务器上运行

如果你有SSH访问权限：

```bash
# SSH到服务器
ssh user@your-server

# 克隆或复制脚本
git clone <repo> && cd new-ai-proj

# 运行脚本
./scripts/save-analysis-remote.sh
```

### 方案3: 使用浏览器控制台

1. 在浏览器中打开 `https://proj.joylodging.com`
2. 登录你的账号
3. 打开开发者工具（F12）
4. 切换到 Console 标签
5. 粘贴并执行以下代码：

```javascript
// 读取分析报告内容（你需要先复制内容）
const content = `# 工作笔记模块CRUD功能检查报告
...（完整的markdown内容）...
`;

// 获取token
const token = localStorage.getItem('token');

// 创建工作笔记
fetch('https://proj.joylodging.com/api/v1/work-notes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: '工作笔记模块CRUD功能检查报告',
    content: content,
    work_note_type: 'log',
    priority: 'high',
    description: '全面检查工作笔记模块的CRUD功能实现，发现17个问题并制定4阶段改进方案',
    tags: ['CRUD检查', '工作笔记', '技术分析', '改进方案'],
    visibility: 'team',
    is_pinned: true,
    is_bookmarked: true
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ 创建成功！', data);
  console.log('🔗 访问链接:', `https://proj.joylodging.com/work-notes/${data.data.id}`);
})
.catch(err => console.error('❌ 创建失败:', err));
```

### 方案4: 手动创建

1. 登录 `https://proj.joylodging.com`
2. 进入工作笔记页面
3. 点击"新建笔记"
4. 复制 `docs/work-notes-crud-analysis.md` 的内容
5. 粘贴并设置属性：
   - 类型: 工作日志
   - 优先级: 高
   - 标签: CRUD检查, 工作笔记, 技术分析, 改进方案
   - 可见性: 团队
   - 勾选: 置顶 + 收藏

## 当前Token信息

脚本中已内置的JWT token信息：
- **用户**: admin
- **过期时间**: 2025-10-23 00:41:44 UTC
- **状态**: ✅ 有效

如果token过期，需要重新获取：

```bash
# 方法1: 从浏览器获取
# 登录后，在开发者工具 -> Application -> Local Storage 中复制 'token'

# 方法2: 使用dev-quick-login（如果启用）
curl -X POST https://proj.joylodging.com/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}' | jq -r '.data.access_token'

# 方法3: 使用正常登录
curl -X POST https://proj.joylodging.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}' | jq -r '.data.access_token'
```

## 脚本特性

`save-analysis-remote.sh` 脚本包含：

✅ Token有效期检查
✅ 文件存在性验证
✅ 详细的错误信息
✅ HTTP状态码检测
✅ 友好的进度输出
✅ 自动保存笔记ID
✅ 完整的成功/失败处理

## 故障排查

### 403 Forbidden

```
❌ 访问被拒绝 (403)
```

**原因**: IP不在白名单中

**解决**: 在受信任的环境（本地/服务器）运行，或使用浏览器方案

### 401 Unauthorized

```
❌ 未授权 (401) - Token无效或已过期
```

**原因**: Token过期或无效

**解决**: 获取新token并设置环境变量

```bash
export JWT_TOKEN="new-token-here"
./scripts/save-analysis-remote.sh
```

### Token过期

检查token过期时间：

```bash
TOKEN="your-token"
echo "$TOKEN" | cut -d'.' -f2 | base64 -d | jq -r '.exp' | xargs -I {} date -d @{}
```

### 网络连接问题

测试服务器可达性：

```bash
curl -I https://proj.joylodging.com/api/v1/health
```

## 预期输出

成功执行后的输出：

```
📝 保存工作笔记CRUD分析报告到远程服务器...
🌐 服务器: https://proj.joylodging.com/api/v1

🔍 检查token有效期...
   Token过期时间: Thu Oct 23 00:41:44 UTC 2025

📖 读取分析报告...
   文件大小: 21567 字节

🔧 构造请求数据...
   请求数据大小: 22145 字节

📤 发送创建请求...
   HTTP状态码: 201

✅ 工作笔记创建成功！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 笔记信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ID:        123
  标题:      工作笔记模块CRUD功能检查报告
  类型:      log
  优先级:    high
  创建时间:  2025-10-22T12:00:00Z
  状态:      ✨ 已置顶 + 已收藏
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 访问链接:
   https://proj.joylodging.com/work-notes/123

💾 笔记ID已保存到 .last-created-note-id
```

## 需要帮助？

如果遇到问题：

1. 检查token是否有效
2. 确认在受信任的网络环境中
3. 查看完整错误信息
4. 尝试浏览器方案作为备选

---

**注意**: 由于服务器安全配置，必须从受信任的IP地址访问API。
