# Google API 配置指南

## 🔧 Google API 设置步骤

### 1. 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击"选择项目" → "新建项目"
3. 输入项目名称（如：`document-management-system`）
4. 点击"创建"

### 2. 启用必要的 API

在 Google Cloud Console 中：

1. 进入"API 和服务" → "库"
2. 搜索并启用以下 API：
   - **Google Docs API**
   - **Google Drive API** 
   - **Google Sheets API**（可选）
   - **Google Identity Services API**

### 3. 创建凭据

#### 3.1 创建 API 密钥

1. 进入"API 和服务" → "凭据"
2. 点击"创建凭据" → "API 密钥"
3. 复制生成的 API 密钥
4. （推荐）点击"限制密钥"设置使用限制：
   - **应用限制**：HTTP 引用站点（网站）
   - **网站限制**：添加您的域名（如：`localhost:3000`, `yourapp.com`）
   - **API 限制**：限制为上述启用的 API

#### 3.2 创建 OAuth 2.0 客户端 ID

1. 在"凭据"页面，点击"创建凭据" → "OAuth 客户端 ID"
2. 选择应用类型："Web 应用"
3. 填写信息：
   - **名称**：Document Management System
   - **已获授权的 JavaScript 来源**：
     - `http://localhost:3000`（开发环境）
     - `https://yourdomain.com`（生产环境）
   - **已获授权的重定向 URI**：
     - `http://localhost:3000`
     - `https://yourdomain.com`
4. 点击"创建"
5. 复制生成的客户端 ID

### 4. 配置环境变量

#### 4.1 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
# 复制 .env.example 到 .env
cp .env.example .env
```

#### 4.2 填写配置信息

编辑 `.env` 文件：

```env
# Google API 配置
REACT_APP_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
REACT_APP_GOOGLE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz

# 其他配置...
REACT_APP_ENABLE_GOOGLE_DOCS=true
```

### 5. 域名验证（生产环境）

如果在生产环境使用，需要验证域名所有权：

1. 在 Google Cloud Console 中进入"API 和服务" → "凭据"
2. 编辑 OAuth 2.0 客户端
3. 添加生产域名到"已获授权的 JavaScript 来源"
4. 在 [Google Search Console](https://search.google.com/search-console) 中验证域名

## 🚀 快速测试

### 测试配置是否正确

1. 启动开发服务器：
```bash
npm start
```

2. 打开浏览器开发者工具
3. 访问包含 Google Docs 功能的页面
4. 查看控制台是否有错误信息

### 测试 Google API 连接

在浏览器控制台中运行：

```javascript
// 测试 Google API 是否加载
console.log('gapi loaded:', typeof window.gapi !== 'undefined');

// 测试环境变量
console.log('Client ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
console.log('API Key:', process.env.REACT_APP_GOOGLE_API_KEY);
```

## 🔒 安全配置

### API 密钥安全

1. **限制 API 密钥使用**：
   - 只允许必要的 API
   - 限制引用站点
   - 定期轮换密钥

2. **监控 API 使用量**：
   - 在 Google Cloud Console 中监控 API 调用
   - 设置配额和预算警报

### OAuth 安全

1. **域名限制**：
   - 只添加可信域名
   - 使用 HTTPS（生产环境）

2. **作用域限制**：
   - 只请求必要的权限
   - 当前使用的作用域：
     - `https://www.googleapis.com/auth/documents`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive.metadata.readonly`

## 📊 配额和限制

### API 配额

- **Google Docs API**：每天 100,000,000 次请求
- **Google Drive API**：每天 1,000,000,000 次请求
- **每用户每 100 秒**：1,000 次请求

### 提高配额

如需更高配额：
1. 在 Google Cloud Console 中申请配额增加
2. 提供使用案例和业务需求
3. 考虑升级到付费计划

## 🛠️ 常见问题

### Q: "API key not valid" 错误
**A:** 检查以下配置：
- API 密钥是否正确
- 是否启用了相关 API
- 域名限制是否正确设置

### Q: "Unauthorized" 错误
**A:** 检查 OAuth 配置：
- 客户端 ID 是否正确
- 域名是否在授权列表中
- 重定向 URI 是否匹配

### Q: CORS 错误
**A:** 确保：
- 在 OAuth 客户端中添加了正确的来源域名
- 使用正确的协议（http/https）

### Q: 如何在开发中调试
**A:** 启用调试模式：
```env
REACT_APP_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=debug
```

## 📝 环境配置检查清单

- [ ] 创建 Google Cloud 项目
- [ ] 启用 Google Docs API
- [ ] 启用 Google Drive API  
- [ ] 创建 API 密钥并设置限制
- [ ] 创建 OAuth 2.0 客户端 ID
- [ ] 配置授权域名
- [ ] 设置环境变量 `.env` 文件
- [ ] 测试 API 连接
- [ ] 验证 OAuth 流程
- [ ] 检查浏览器控制台无错误

## 🔍 高级配置

### 自定义作用域

如需修改权限作用域，编辑 `googleDocsService.ts`：

```typescript
private readonly SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  // 添加其他需要的作用域
];
```

### 批量操作优化

对于大量文档操作，考虑：
- 使用批量 API 请求
- 实现请求队列
- 添加重试机制

### 缓存策略

实现本地缓存以减少 API 调用：
- 文档列表缓存
- 用户信息缓存
- Token 自动刷新

---

完成以上配置后，您的应用就可以与 Google Docs 完美集成了！🎉