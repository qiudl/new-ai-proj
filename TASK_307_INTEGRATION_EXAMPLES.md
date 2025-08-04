# Task 307: 任务文档上传下载功能 - 集成示例

## 📋 功能集成完成状态

### ✅ 已完成的组件和功能

1. **后端实现 (完整)**
   - ✅ 数据库迁移 (`006_add_task_documents_tables.sql`)
   - ✅ 文档服务 (`document_service.go`)
   - ✅ 任务文档处理器扩展 (`task_document_handler.go`)
   - ✅ API路由集成 (`main.go`)

2. **前端服务层 (完整)**
   - ✅ 任务文档服务扩展 (`taskDocumentService.ts`)
   - ✅ 文档管理Hook (`useTaskDocuments.ts`)

3. **前端UI组件 (完整)**
   - ✅ 文档上传器 (`TaskDocumentUploader.tsx`)
   - ✅ 文档管理器 (`TaskDocumentManager.tsx`)
   - ✅ 文档小部件 (`TaskDocumentWidget.tsx`)
   - ✅ 样式文件 (`TaskDocuments.css`)

## 🔧 集成方法

### 方法1: 在任务详情页中集成文档小部件

```typescript
// TaskDetailPageNew.tsx 示例集成
import TaskDocumentWidget from '../components/TaskDocumentWidget';

const TaskDetailPageNew: React.FC = () => {
  const { projectId, taskId } = useParams();
  
  return (
    <div className="task-detail-container">
      {/* 现有的任务详情内容 */}
      <TaskInfo />
      <TaskDescription />
      
      {/* 新增: 任务文档管理小部件 */}
      <TaskDocumentWidget
        projectId={Number(projectId)}
        taskId={Number(taskId)}
        compact={false}
        showTitle={true}
      />
      
      {/* 其他现有组件 */}
    </div>
  );
};
```

### 方法2: 在任务卡片中显示文档状态

```typescript
// TaskCard.tsx 示例集成
import TaskDocumentWidget from '../components/TaskDocumentWidget';

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  return (
    <Card className="task-card">
      <div className="task-header">
        <Title level={4}>{task.title}</Title>
      </div>
      
      <div className="task-content">
        {task.description}
      </div>
      
      <div className="task-footer">
        <Space>
          {/* 现有的操作按钮 */}
          <Button>编辑</Button>
          <Button>删除</Button>
          
          {/* 新增: 紧凑型文档小部件 */}
          <TaskDocumentWidget
            projectId={task.project_id}
            taskId={task.id}
            compact={true}
            showTitle={false}
          />
        </Space>
      </div>
    </Card>
  );
};
```

### 方法3: 独立的文档管理页面

```typescript
// DocumentManagementPage.tsx 示例
import TaskDocumentManager from '../components/TaskDocumentManager';

const DocumentManagementPage: React.FC = () => {
  const { projectId, taskId } = useParams();
  
  return (
    <div className="page-container">
      <TaskDocumentManager
        projectId={Number(projectId)}
        taskId={Number(taskId)}
        mode="embedded"
      />
    </div>
  );
};
```

### 方法4: 使用Hook进行自定义集成

```typescript
// CustomTaskView.tsx 示例
import { useTaskDocuments } from '../hooks/useTaskDocuments';

const CustomTaskView: React.FC = ({ projectId, taskId }) => {
  const {
    documents,
    loading,
    uploading,
    uploadDocument,
    downloadMarkdown,
    getDocumentStats
  } = useTaskDocuments({ projectId, taskId });

  const stats = getDocumentStats();

  return (
    <div>
      <h3>任务文档 ({stats.total})</h3>
      
      {documents.map(doc => (
        <div key={doc.file_name}>
          <span>{doc.original_name}</span>
          <span>{doc.file_size} bytes</span>
        </div>
      ))}
      
      <Button onClick={downloadMarkdown}>
        导出 Markdown
      </Button>
    </div>
  );
};
```

## 🚀 API端点使用示例

### 手工上传文档
```javascript
// POST /api/v1/projects/:projectId/tasks/:taskId/upload
const formData = new FormData();
formData.append('document', file);

const response = await fetch(`/api/v1/projects/1/tasks/123/upload`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### API上传文档
```javascript
// POST /api/v1/projects/:projectId/tasks/:taskId/upload-api
const response = await fetch(`/api/v1/projects/1/tasks/123/upload-api`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    file_name: 'document.md',
    content: btoa('# 文档内容'), // base64 encoded
    mime_type: 'text/markdown',
    description: '通过API上传的文档'
  })
});
```

### 获取任务文档列表
```javascript
// GET /api/v1/projects/:projectId/tasks/:taskId/uploads
const response = await fetch(`/api/v1/projects/1/tasks/123/uploads`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

### 下载Markdown格式
```javascript
// GET /api/v1/projects/:projectId/tasks/:taskId/download/md
const response = await fetch(`/api/v1/projects/1/tasks/123/download/md`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const blob = await response.blob();
```

### 下载PDF格式
```javascript
// GET /api/v1/projects/:projectId/tasks/:taskId/download/pdf
const response = await fetch(`/api/v1/projects/1/tasks/123/download/pdf`, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const blob = await response.blob();
```

## 📊 数据库表结构

### task_documents 表
```sql
id              SERIAL PRIMARY KEY
task_id         INTEGER NOT NULL REFERENCES tasks(id)
file_name       VARCHAR(255) NOT NULL
original_name   VARCHAR(255) NOT NULL
file_path       VARCHAR(500) NOT NULL
file_size       BIGINT NOT NULL
mime_type       VARCHAR(100) NOT NULL
upload_type     VARCHAR(20) CHECK (upload_type IN ('manual', 'api'))
uploaded_by     INTEGER NOT NULL REFERENCES users(id)
uploaded_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
version         INTEGER DEFAULT 1
is_active       BOOLEAN DEFAULT TRUE
checksum        VARCHAR(64)
metadata        JSONB DEFAULT '{}'
```

### document_versions 表
```sql
id              SERIAL PRIMARY KEY
document_id     INTEGER NOT NULL REFERENCES task_documents(id)
version_number  INTEGER NOT NULL
file_path       VARCHAR(500) NOT NULL
file_size       BIGINT NOT NULL
checksum        VARCHAR(64)
created_by      INTEGER NOT NULL REFERENCES users(id)
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
change_notes    TEXT
metadata        JSONB DEFAULT '{}'
```

### document_logs 表
```sql
id                  SERIAL PRIMARY KEY
document_id         INTEGER NOT NULL REFERENCES task_documents(id)
operation           VARCHAR(50) NOT NULL
operation_by        INTEGER NOT NULL REFERENCES users(id)
operation_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
ip_address          VARCHAR(45)
user_agent          TEXT
operation_details   JSONB DEFAULT '{}'
success             BOOLEAN DEFAULT TRUE
error_message       TEXT
```

## 🎯 功能特性总结

### ✅ 支持的功能
1. **手工上传**: 拖拽上传，支持 .md, .pdf, .txt 格式
2. **API上传**: 程序化上传，支持base64内容
3. **批量上传**: 一次上传多个文件
4. **文档管理**: 查看、删除、下载文档
5. **格式导出**: 导出 Markdown 和 PDF 格式
6. **版本控制**: 自动版本管理和历史记录
7. **操作日志**: 完整的操作审计日志
8. **文件验证**: 大小、格式、内容完整性验证
9. **进度追踪**: 上传进度实时显示
10. **统计信息**: 文档数量、大小、类型统计

### 🔒 安全特性
1. **用户认证**: 所有操作需要有效JWT Token
2. **权限控制**: 基于用户角色的访问控制
3. **文件验证**: 严格的文件类型和大小限制
4. **路径安全**: 防止目录遍历攻击
5. **内容检查**: Checksum验证确保文件完整性
6. **操作日志**: 详细记录所有文档操作

### 📈 性能优化
1. **分页加载**: 大量文档的分页显示
2. **懒加载**: 按需加载文档内容
3. **缓存策略**: 文件内容和元数据缓存
4. **异步处理**: 非阻塞的文件上传和处理
5. **压缩优化**: PDF生成和文件传输优化

## 🚀 部署和使用

### 1. 数据库迁移
```bash
# 运行迁移脚本
psql -U user -d main_db -f backend/migrations/006_add_task_documents_tables.sql
```

### 2. 后端配置
确保后端服务包含文档处理功能，main.go已包含所需路由。

### 3. 前端集成
```typescript
// 在需要的页面中导入组件
import TaskDocumentWidget from '../components/TaskDocumentWidget';
import TaskDocumentManager from '../components/TaskDocumentManager';
import { useTaskDocuments } from '../hooks/useTaskDocuments';
```

### 4. 文件存储
确保后端有适当的文件存储目录权限：
```bash
mkdir -p ./backend/docs/uploads
chmod 755 ./backend/docs/uploads
```

## 💡 最佳实践

1. **组件选择**:
   - 任务详情页使用 `TaskDocumentWidget`
   - 独立管理使用 `TaskDocumentManager`
   - 自定义功能使用 `useTaskDocuments` Hook

2. **错误处理**:
   - 始终包装API调用在try-catch中
   - 提供用户友好的错误消息
   - 记录详细错误信息用于调试

3. **用户体验**:
   - 显示上传进度
   - 提供操作反馈
   - 支持拖拽上传
   - 响应式设计

4. **性能考虑**:
   - 大文件上传分块处理
   - 合理设置文件大小限制
   - 使用适当的缓存策略

---

**Task 307 实现状态**: ✅ **完成**
**最后更新**: 2025-01-04
**开发时长**: 约18小时 (实际3个Phase实现)