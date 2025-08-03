# UnifiedDocumentManager 完整使用指南

## 📋 概述

`UnifiedDocumentManager` 是一个功能强大的React组件，它整合了 `DocumentFileManager` 和 `DocumentList` 的所有功能，并添加了实时协作、智能搜索、虚拟化列表等企业级高级特性。该组件提供简洁和高级两种模式，可以适应不同的使用场景。

## 🎯 核心特性

### 基础功能
- ✅ 文档列表展示（表格/网格视图）
- ✅ 搜索和过滤功能
- ✅ 排序和分页
- ✅ 批量操作（选择/删除）
- ✅ 文档CRUD操作
- ✅ 文件上传功能

### 高级功能
- 🚀 **实时协作**: 多用户同时编辑，实时同步
- 🧠 **智能搜索**: AI驱动的模糊匹配和个性化推荐
- ⚡ **虚拟化列表**: 处理大量数据的高性能渲染
- 🎨 **双模式切换**: 简洁模式和高级模式无缝切换
- 📊 **性能监控**: 内置性能分析和优化工具
- 🔒 **缓存机制**: 智能缓存减少API调用

## 🛠️ 安装和依赖

```bash
# 核心依赖
npm install antd react react-dom

# 拖拽功能
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# 虚拟化列表
npm install react-window react-virtualized-auto-sizer

# TypeScript支持
npm install -D @types/react @types/react-dom
```

## 📖 基础用法

### 简洁模式（推荐用于日常文档浏览）

```typescript
import UnifiedDocumentManager from '../components/UnifiedDocumentManager';

const SimpleDocumentPage: React.FC = () => {
  return (
    <UnifiedDocumentManager
      mode="simple"
      projectId={1}
      projectName="我的项目"
      onDocumentSelect={(doc) => console.log('选择文档:', doc)}
      onDocumentUpdate={() => console.log('文档更新')}
    />
  );
};
```

### 高级模式（推荐用于专业文档管理）

```typescript
const AdvancedDocumentPage: React.FC = () => {
  return (
    <UnifiedDocumentManager
      mode="advanced"
      folderId={1}
      allowUpload={true}
      allowBatch={true}
      showViewToggle={true}
      defaultView="grid"
      onDocumentSelect={(doc) => handleDocumentSelect(doc)}
      onDocumentUpdate={() => refreshData()}
    />
  );
};
```

## 🔧 属性配置

### 基础属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `mode` | `'simple' \| 'advanced'` | `'simple'` | 工作模式 |
| `projectId` | `number` | - | 项目ID |
| `projectName` | `string` | - | 项目名称 |
| `folderId` | `number` | - | 文件夹ID |

### 功能配置

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `showSearch` | `boolean` | `true` | 显示搜索框 |
| `showToolbar` | `boolean` | `true` | 显示工具栏 |
| `allowUpload` | `boolean` | `true` | 允许文件上传 |
| `allowBatch` | `boolean` | `false` | 允许批量操作 |

### 视图配置

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `defaultView` | `'table' \| 'grid' \| 'virtualized'` | `'table'` | 默认视图模式 |
| `showViewToggle` | `boolean` | `true` | 显示视图切换按钮 |

### 高级功能配置

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableRealtimeCollaboration` | `boolean` | `false` | 启用实时协作 |
| `enableIntelligentSearch` | `boolean` | `false` | 启用智能搜索 |
| `enableVirtualization` | `boolean` | `false` | 启用虚拟化列表 |

### 回调函数

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `onDocumentSelect` | `(doc) => void` | 文档选择回调 |
| `onDocumentUpdate` | `() => void` | 文档更新回调 |
| `onCreateDocument` | `() => void` | 创建文档回调 |
| `onEditDocument` | `(doc) => void` | 编辑文档回调 |

## 🚀 高级功能详解

### 1. 实时协作功能

实时协作允许多个用户同时编辑文档，并实时同步状态。

```typescript
<UnifiedDocumentManager
  mode="advanced"
  enableRealtimeCollaboration={true}
  onDocumentSelect={(doc) => {
    // 文档选择时会自动发送协作事件
    console.log('协作中选择文档:', doc);
  }}
/>
```

**协作功能包括：**
- 实时在线用户显示
- 文档锁定机制
- 操作历史同步
- WebSocket连接状态监控

### 2. 智能搜索功能

智能搜索提供AI驱动的搜索体验，支持模糊匹配和个性化推荐。

```typescript
<UnifiedDocumentManager
  mode="advanced"
  enableIntelligentSearch={true}
  showSearch={true}
/>
```

**智能搜索特性：**
- **模糊匹配**: 容错搜索，支持拼写错误
- **语义搜索**: 理解搜索意图，提供相关结果
- **个性化推荐**: 基于用户行为的智能推荐
- **搜索分析**: 搜索行为统计和分析

### 3. 虚拟化列表

虚拟化列表能够高效渲染大量数据，适用于1000+文档的场景。

```typescript
<UnifiedDocumentManager
  mode="advanced"
  enableVirtualization={true}
  defaultView="virtualized"
/>
```

## 📱 企业级使用场景

### 场景1：企业文档协作平台

```typescript
const EnterpriseDocumentPlatform: React.FC = () => {
  return (
    <UnifiedDocumentManager
      mode="advanced"
      enableRealtimeCollaboration={true}
      enableIntelligentSearch={true}
      enableVirtualization={true}
      allowUpload={true}
      allowBatch={true}
      showViewToggle={true}
      onDocumentSelect={(doc) => {
        // 跳转到文档详情页
        navigate(`/documents/${doc.id}`);
      }}
      onCreateDocument={() => {
        // 打开文档创建向导
        openDocumentWizard();
      }}
    />
  );
};
```

### 场景2：项目文档管理

```typescript
const ProjectDocumentManager: React.FC = ({ projectId }) => {
  return (
    <UnifiedDocumentManager
      mode="advanced"
      projectId={projectId}
      enableRealtimeCollaboration={true}
      defaultView="grid"
      allowUpload={true}
      allowBatch={true}
      onDocumentUpdate={() => {
        // 刷新项目统计
        refreshProjectStats();
      }}
    />
  );
};
```

### 场景3：大数据量文档浏览

```typescript
const BigDataDocumentBrowser: React.FC = () => {
  return (
    <UnifiedDocumentManager
      mode="advanced"
      enableVirtualization={true}
      enableIntelligentSearch={true}
      defaultView="virtualized"
      showViewToggle={true}
      // 处理10000+文档的高性能展示
    />
  );
};
```

## 🎨 界面定制

### 主题定制

```typescript
import { ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
  components: {
    Card: {
      borderRadiusLG: 8,
    },
    Table: {
      headerBg: '#fafafa',
    },
  },
};

const ThemedDocumentManager: React.FC = () => {
  return (
    <ConfigProvider theme={themeConfig}>
      <UnifiedDocumentManager mode="advanced" />
    </ConfigProvider>
  );
};
```

## 📊 性能监控和优化

### 性能监控

```typescript
import { documentManagerPerf } from '../utils/documentManagerPerformance';

// 在开发环境中监控性能
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const interval = setInterval(() => {
      const report = documentManagerPerf.generateReport();
      console.log('性能报告:', report);
    }, 30000); // 每30秒输出一次

    return () => clearInterval(interval);
  }
}, []);
```

### 智能搜索分析

```typescript
import { intelligentSearch } from '../utils/intelligentSearch';

// 获取搜索统计
const SearchAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const data = intelligentSearch.getSearchAnalytics();
    setAnalytics(data);
  }, []);

  return (
    <Card title="搜索分析">
      <Statistic title="总搜索次数" value={analytics?.totalSearches} />
      <Statistic title="点击率" value={analytics?.clickThroughRate * 100} suffix="%" />
    </Card>
  );
};
```

## 🧪 测试指南

### 功能测试

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnifiedDocumentManager from '../UnifiedDocumentManager';

describe('UnifiedDocumentManager', () => {
  test('应该支持模式切换', async () => {
    render(<UnifiedDocumentManager />);
    
    const modeSwitch = screen.getByRole('switch');
    fireEvent.click(modeSwitch);
    
    await waitFor(() => {
      expect(screen.getByText('高级')).toBeInTheDocument();
    });
  });

  test('应该正确处理文档选择', async () => {
    const mockOnSelect = jest.fn();
    render(
      <UnifiedDocumentManager
        onDocumentSelect={mockOnSelect}
      />
    );
    
    // 模拟点击文档
    const documentItem = screen.getByTestId('document-item-1');
    fireEvent.click(documentItem);
    
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 })
    );
  });
});
```

### 性能测试

```typescript
describe('Performance Tests', () => {
  test('虚拟化列表应该快速渲染大量数据', () => {
    const largeMockData = Array(5000).fill(null).map((_, i) => ({
      id: i,
      title: `Document ${i}`,
      updated_at: new Date().toISOString(),
    }));

    const startTime = performance.now();
    
    render(
      <UnifiedDocumentManager
        mode="advanced"
        enableVirtualization={true}
        defaultView="virtualized"
      />
    );

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // 1秒内完成
  });
});
```

## 🔧 故障排除

### 常见问题

#### 1. 实时协作连接失败

```typescript
// 检查WebSocket连接状态
const collaboration = useRealtimeCollaboration({ enabled: true });

useEffect(() => {
  console.log('连接状态:', collaboration.connected);
  console.log('连接质量:', collaboration.checkConnectionQuality());
  
  if (!collaboration.connected) {
    // 手动重连
    collaboration.connect();
  }
}, []);
```

#### 2. 智能搜索不工作

```typescript
// 检查搜索数据
import { intelligentSearch } from '../utils/intelligentSearch';

// 确保有足够的搜索数据
const analytics = intelligentSearch.getSearchAnalytics();
console.log('搜索统计:', analytics);

// 手动测试搜索功能
const testResults = intelligentSearch.search(mockDocuments, '测试查询');
console.log('搜索结果:', testResults);
```

#### 3. 虚拟化列表显示异常

```typescript
// 检查虚拟化配置
import { VIRTUALIZED_CONFIGS } from '../components/VirtualizedDocumentList';

// 使用合适的配置
<VirtualizedDocumentList
  {...VIRTUALIZED_CONFIGS.advanced}
  documents={documents}
  height={600} // 确保有明确的高度
/>
```

## 🚀 扩展开发

### 自定义插件

```typescript
// 创建导出插件
interface DocumentExportPlugin {
  exportToExcel: (documents: Document[]) => void;
  exportToPDF: (documents: Document[]) => void;
}

const useExportPlugin = (): DocumentExportPlugin => {
  const exportToExcel = useCallback((documents) => {
    // Excel导出逻辑
    const worksheet = XLSX.utils.json_to_sheet(documents);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');
    XLSX.writeFile(workbook, 'documents.xlsx');
  }, []);

  const exportToPDF = useCallback((documents) => {
    // PDF导出逻辑
    const doc = new jsPDF();
    documents.forEach((document, index) => {
      doc.text(document.title, 10, 10 + (index * 10));
    });
    doc.save('documents.pdf');
  }, []);

  return { exportToExcel, exportToPDF };
};
```

### 自定义工具栏动作

```typescript
const CustomDocumentManager: React.FC = () => {
  const exportPlugin = useExportPlugin();

  const customActions = [
    {
      key: 'export-excel',
      label: '导出Excel',
      icon: <FileExcelOutlined />,
      onClick: (selectedDocs: Document[]) => {
        exportPlugin.exportToExcel(selectedDocs);
      }
    },
    {
      key: 'export-pdf',
      label: '导出PDF',
      icon: <FilePdfOutlined />,
      onClick: (selectedDocs: Document[]) => {
        exportPlugin.exportToPDF(selectedDocs);
      }
    }
  ];

  return (
    <UnifiedDocumentManager
      mode="advanced"
      customActions={customActions}
    />
  );
};
```

## 📈 最佳实践

### 1. 性能优化建议

```typescript
// 使用React.memo优化渲染
const OptimizedDocumentManager = React.memo(UnifiedDocumentManager, (prevProps, nextProps) => {
  return (
    prevProps.projectId === nextProps.projectId &&
    prevProps.mode === nextProps.mode
  );
});

// 使用useMemo缓存计算结果
const memoizedDocuments = useMemo(() => {
  return documents.map(doc => ({
    ...doc,
    formattedDate: formatDate(doc.updated_at)
  }));
}, [documents]);
```

### 2. 错误处理

```typescript
const DocumentManagerWithErrorBoundary: React.FC = (props) => {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <Result
          status="error"
          title="文档管理器加载失败"
          subTitle={error.message}
          extra={[
            <Button key="retry" type="primary" onClick={retry}>
              重试
            </Button>,
            <Button key="home" onClick={() => navigate('/')}>
              返回首页
            </Button>
          ]}
        />
      )}
    >
      <UnifiedDocumentManager {...props} />
    </ErrorBoundary>
  );
};
```

### 3. 国际化支持

```typescript
import { useTranslation } from 'react-i18next';

const LocalizedDocumentManager: React.FC = (props) => {
  const { t } = useTranslation('document');
  
  return (
    <UnifiedDocumentManager
      {...props}
      strings={{
        createButton: t('create'),
        searchPlaceholder: t('searchPlaceholder'),
        deleteConfirm: t('deleteConfirm'),
        batchDeleteConfirm: t('batchDeleteConfirm')
      }}
    />
  );
};
```

## 📚 参考资料

### API参考

完整的API文档请参考：
- [UnifiedDocumentManager API](./api/UnifiedDocumentManager.md)
- [useDocumentManager Hook](./api/useDocumentManager.md)
- [智能搜索API](./api/intelligentSearch.md)
- [实时协作API](./api/realtimeCollaboration.md)

### 相关组件

- [DocumentTableView](../components/DocumentTableView.tsx)
- [DocumentGridView](../components/DocumentGridView.tsx)
- [VirtualizedDocumentList](../components/VirtualizedDocumentList.tsx)
- [DocumentToolbar](../components/DocumentToolbar.tsx)

### 工具和Hook

- [useDocumentManager](../hooks/useDocumentManager.ts)
- [useRealtimeCollaboration](../hooks/useRealtimeCollaboration.ts)
- [useCache](../hooks/useCache.ts)
- [documentManagerPerformance](../utils/documentManagerPerformance.ts)

## 📝 更新日志

### v2.0.0 (当前版本)
- ✨ 新增实时协作功能
- ✨ 集成智能搜索系统
- ✨ 添加虚拟化列表支持
- 🔧 优化性能监控
- 📱 改进响应式设计
- 🐛 修复内存泄漏问题
- 📚 完善文档和示例

### v1.3.x (历史版本)
- ✅ 双模式支持（简洁/高级）
- ✅ 完整的CRUD操作
- ✅ 批量操作功能
- ✅ 搜索和过滤
- ✅ 响应式设计

---

*文档最后更新时间: 2024年1月*
*如有问题或建议，请提交Issue或Pull Request*