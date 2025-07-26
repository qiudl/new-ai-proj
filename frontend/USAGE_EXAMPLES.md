# 使用示例 - 企业级文档管理系统

## 🚀 快速开始

### 1. 基础配置

首先，配置 Google API（参考 [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md)）：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，添加您的 Google API 配置
REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
REACT_APP_GOOGLE_API_KEY=your_api_key_here
```

### 2. 基础使用

```jsx
import React from 'react';
import UnifiedDocumentManager from './components/UnifiedDocumentManager';

function App() {
  return (
    <div>
      {/* 基础文档管理 */}
      <UnifiedDocumentManager
        mode="simple"
        projectId={1}
        projectName="我的项目"
        showSearch={true}
        allowUpload={true}
      />
    </div>
  );
}

export default App;
```

## 📋 完整功能示例

### 企业级完整配置

```jsx
import React from 'react';
import UnifiedDocumentManager from './components/UnifiedDocumentManager';

function EnterpriseApp() {
  const handleDocumentSelect = (document) => {
    console.log('选择了文档:', document);
    // 自定义处理逻辑
  };

  const handleDocumentUpdate = () => {
    console.log('文档已更新');
    // 刷新相关数据
  };

  return (
    <UnifiedDocumentManager
      // 基础配置
      mode="advanced"
      projectId={1}
      projectName="企业文档中心"
      folderId={null}
      
      // 功能开关
      showSearch={true}
      showToolbar={true}
      allowUpload={true}
      allowBatch={true}
      
      // 视图配置
      defaultView="table"
      showViewToggle={true}
      
      // 高级功能
      enableRealtimeCollaboration={true}    // 实时协作
      enableIntelligentSearch={true}        // 智能搜索
      enableVirtualization={true}           // 虚拟化列表
      enableOnlineEditor={true}             // 在线编辑器
      enableVersionControl={true}           // 版本控制
      enableGoogleDocsIntegration={true}    // Google Docs 集成
      
      // 回调函数
      onDocumentSelect={handleDocumentSelect}
      onDocumentUpdate={handleDocumentUpdate}
      onCreateDocument={() => console.log('创建文档')}
      onEditDocument={(doc) => console.log('编辑文档:', doc)}
    />
  );
}
```

### 不同场景的配置示例

#### 1. 团队协作场景

```jsx
<UnifiedDocumentManager
  mode="advanced"
  enableRealtimeCollaboration={true}
  enableOnlineEditor={true}
  enableVersionControl={true}
  defaultView="grid"
  allowBatch={true}
/>
```

#### 2. 大数据场景

```jsx
<UnifiedDocumentManager
  mode="advanced"
  enableVirtualization={true}
  enableIntelligentSearch={true}
  defaultView="virtualized"
  showViewToggle={true}
/>
```

#### 3. Google Workspace 集成

```jsx
<UnifiedDocumentManager
  mode="advanced"
  enableGoogleDocsIntegration={true}
  enableOnlineEditor={true}
  enableRealtimeCollaboration={true}
/>
```

## 🎨 自定义样式

### CSS 样式覆盖

```css
/* 自定义文档卡片样式 */
.unified-document-manager .ant-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 自定义搜索框样式 */
.unified-document-manager .ant-input-search {
  border-radius: 20px;
}

/* 自定义工具栏样式 */
.document-toolbar {
  background: linear-gradient(90deg, #1890ff, #722ed1);
  border-radius: 6px;
  padding: 12px;
}
```

### 主题定制

```jsx
import { ConfigProvider } from 'antd';

const customTheme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};

<ConfigProvider theme={customTheme}>
  <UnifiedDocumentManager {...props} />
</ConfigProvider>
```

## 🔧 高级配置

### 自定义 Hook 使用

```jsx
import { useDocumentManager } from './hooks/useDocumentManager';

function CustomDocumentComponent() {
  const {
    documents,
    loading,
    searchText,
    updateState,
    refresh
  } = useDocumentManager({
    mode: 'advanced',
    projectId: 1,
    enableCache: true
  });

  return (
    <div>
      {/* 自定义界面 */}
      <input 
        value={searchText}
        onChange={(e) => updateState({ searchText: e.target.value })}
        placeholder="搜索文档..."
      />
      
      {loading ? (
        <div>加载中...</div>
      ) : (
        <div>
          {documents.map(doc => (
            <div key={doc.id}>{doc.title}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Google Docs 服务直接使用

```jsx
import { googleDocsService } from './services/googleDocsService';

async function handleGoogleDocsOperations() {
  try {
    // 认证
    await googleDocsService.authenticate();
    
    // 创建文档
    const newDoc = await googleDocsService.createDocument(
      '新文档标题',
      '文档内容...'
    );
    
    // 获取文档列表
    const documents = await googleDocsService.listDocuments(10);
    
    // 导入文档
    const importedDoc = await googleDocsService.importDocument('document-id');
    
    // 导出文档
    const exportedId = await googleDocsService.exportDocument(
      '标题',
      '内容'
    );
    
  } catch (error) {
    console.error('操作失败:', error);
  }
}
```

## 📊 性能优化

### 虚拟化列表配置

```jsx
<UnifiedDocumentManager
  enableVirtualization={true}
  defaultView="virtualized"
  // 虚拟化列表会在文档数量 > 100 时自动启用
/>
```

### 搜索性能优化

```jsx
// 使用防抖搜索
const [searchValue, setSearchValue] = useState('');
const debouncedSearch = useCallback(
  debounce((value) => {
    updateState({ searchText: value });
  }, 300),
  []
);

// 智能搜索配置
<UnifiedDocumentManager
  enableIntelligentSearch={true}
  // 智能搜索会自动缓存结果和用户行为
/>
```

## 🔍 调试和问题排查

### 开启调试模式

```bash
# .env 文件
REACT_APP_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=debug
```

### 使用配置检查器

```jsx
import GoogleConfigChecker from './components/GoogleConfigChecker';

function AdminPanel() {
  return (
    <div>
      {/* 其他管理界面 */}
      <GoogleConfigChecker />
    </div>
  );
}
```

### 手动检查配置

```jsx
import { getConfigStatus, validateGoogleConfig } from './config/googleConfig';

// 检查配置状态
console.log('配置状态:', getConfigStatus());

// 验证配置
if (!validateGoogleConfig()) {
  console.error('Google API 配置不完整');
}
```

## 🌐 部署配置

### 生产环境配置

```bash
# .env.production
REACT_APP_GOOGLE_CLIENT_ID=production_client_id
REACT_APP_GOOGLE_API_KEY=production_api_key
REACT_APP_API_BASE_URL=https://api.yourdomain.com/v1
REACT_APP_ENABLE_GOOGLE_DOCS=true
```

### Docker 部署

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📈 监控和分析

### 使用情况追踪

```jsx
// 在组件中添加分析代码
const handleDocumentView = (document) => {
  // Google Analytics
  gtag('event', 'document_view', {
    document_id: document.id,
    document_title: document.title
  });
  
  // 自定义分析
  analytics.track('Document Viewed', {
    documentId: document.id,
    projectId: projectId,
    feature: 'unified_manager'
  });
};
```

### 性能监控

```jsx
import { Profiler } from 'react';

<Profiler
  id="DocumentManager"
  onRender={(id, phase, actualDuration) => {
    console.log('渲染性能:', { id, phase, actualDuration });
  }}
>
  <UnifiedDocumentManager {...props} />
</Profiler>
```

## 🎯 最佳实践

### 1. 渐进式功能启用

```jsx
// 开始时使用基础功能
const [enabledFeatures, setEnabledFeatures] = useState({
  collaboration: false,
  intelligentSearch: false,
  versionControl: false
});

// 根据用户需求逐步启用功能
useEffect(() => {
  if (userRole === 'admin') {
    setEnabledFeatures(prev => ({
      ...prev,
      versionControl: true
    }));
  }
}, [userRole]);
```

### 2. 错误边界处理

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }) {
  return (
    <div>
      <h2>文档管理器加载失败</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <UnifiedDocumentManager {...props} />
</ErrorBoundary>
```

### 3. 国际化支持

```jsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

<ConfigProvider locale={zhCN}>
  <UnifiedDocumentManager {...props} />
</ConfigProvider>
```

---

有了这些示例，您就可以根据具体需求快速配置和使用企业级文档管理系统了！🚀