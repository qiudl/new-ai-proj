# 任务307深度分析与执行Prompts

## 🎯 任务基本信息

- **任务ID**: 307
- **父任务**: 266 (32周-02：任务管理优化)
- **标题**: 任务文档支持手工和接口上传，md和pdf格式下载
- **优先级**: High
- **状态**: Todo
- **预估工时**: 64小时

## 📊 需求分析

### 核心功能矩阵

| 功能类别 | 子功能 | 实现方式 | 技术要求 |
|---------|--------|----------|----------|
| **文档上传** | 手工上传 | Web界面 | 拖拽上传、格式验证 |
| | 接口上传 | REST API | 文件流处理、鉴权 |
| **文档下载** | MD格式 | 服务端导出 | Markdown生成 |
| | PDF格式 | 服务端转换 | HTML to PDF |
| **文档管理** | 版本控制 | 数据库记录 | 历史版本追踪 |
| | 权限控制 | 用户验证 | 读写权限分离 |

### 用户故事

#### 🎨 手工上传场景
**作为** 项目经理  
**我希望** 能够通过界面直接上传任务相关的Markdown或PDF文档  
**以便于** 快速关联外部文档到具体任务

#### 🔌 接口上传场景  
**作为** 开发人员  
**我希望** 能够通过API接口程序化上传文档  
**以便于** 实现自动化的文档管理流程

#### 📥 文档下载场景
**作为** 任务执行者  
**我希望** 能够下载任务文档为标准格式  
**以便于** 离线查看、存档或分享给其他人

## 🛠️ 技术架构分析

### 前端技术栈
```
React + TypeScript + Ant Design
├── 文件上传组件 (Upload)
├── 格式验证器 (Validator) 
├── 进度指示器 (Progress)
├── 文档预览器 (Preview)
└── 下载管理器 (Downloader)
```

### 后端技术栈
```
Go + Gin + PostgreSQL
├── 文件存储服务 (FileService)
├── 格式转换器 (Converter)
├── API路由层 (Router)
├── 权限中间件 (AuthMW)
└── 文档处理器 (DocProcessor)
```

### 数据库设计
```sql
-- 任务文档表
CREATE TABLE task_documents (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    upload_type VARCHAR(20), -- 'manual' | 'api'
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);
```

## 📝 执行Prompts

### Phase 1: 数据库设计与迁移

#### Prompt 1.1: 数据库表设计
```
请设计任务文档系统的数据库表结构，包括：

1. 主要需求：
   - 任务文档存储表 (task_documents)
   - 文档版本管理表 (document_versions)  
   - 文档操作日志表 (document_logs)

2. 字段要求：
   - 支持文档元数据存储（文件名、大小、类型等）
   - 支持版本控制和历史记录
   - 支持权限控制字段
   - 支持上传方式标记（手工/API）

3. 约束要求：
   - 外键约束到tasks和users表
   - 文件路径唯一性约束
   - 软删除支持

请提供完整的CREATE TABLE语句和必要的索引创建语句。
```

#### Prompt 1.2: 数据库迁移脚本
```
请创建数据库迁移脚本文件，包括：

1. 创建新表的UP迁移
2. 回滚删除表的DOWN迁移  
3. 必要的初始数据插入
4. 权限设置和索引优化

文件路径：backend/migrations/006_add_task_documents_tables.sql
```

### Phase 2: 后端API开发

#### Prompt 2.1: 文件上传API设计
```
请实现任务文档上传的后端API，需要包括：

1. 手工上传接口：
   - 路由：POST /api/v1/projects/{id}/tasks/{taskId}/documents/upload
   - 支持multipart/form-data
   - 文件类型验证（.md, .pdf）
   - 文件大小限制（10MB）

2. API上传接口：
   - 路由：POST /api/v1/projects/{id}/tasks/{taskId}/documents/api-upload
   - 支持base64编码文件内容
   - JSON格式请求体

3. 通用功能：
   - 文件存储到指定目录
   - 数据库记录创建
   - 权限验证
   - 错误处理

请创建handlers/task_document_handler.go文件实现。
```

#### Prompt 2.2: 文件下载API设计
```
请实现任务文档下载的后端API，需要包括：

1. MD格式下载：
   - 路由：GET /api/v1/projects/{id}/tasks/{taskId}/documents/download/md
   - 将任务描述和关联文档导出为Markdown
   - 支持模板自定义

2. PDF格式下载：
   - 路由：GET /api/v1/projects/{id}/tasks/{taskId}/documents/download/pdf
   - 将任务内容转换为PDF格式
   - 支持样式配置

3. 文档列表API：
   - 路由：GET /api/v1/projects/{id}/tasks/{taskId}/documents
   - 返回任务的所有关联文档

请实现文档转换和下载功能。
```

#### Prompt 2.3: 文档处理服务
```
请创建文档处理服务，实现以下功能：

1. 文件存储管理：
   - 文件路径生成策略
   - 文件名冲突处理
   - 存储空间管理

2. 格式转换功能：
   - Markdown内容提取和处理
   - HTML到PDF转换
   - 模板渲染系统

3. 版本控制：
   - 文档版本比较
   - 历史版本恢复
   - 版本清理策略

文件位置：services/document_service.go
```

### Phase 3: 前端界面开发

#### Prompt 3.1: 文档上传组件
```
请创建文档上传React组件，需要实现：

1. 上传界面：
   - 拖拽上传区域
   - 文件选择按钮
   - 上传进度显示
   - 格式验证提示

2. 功能特性：
   - 支持MD和PDF格式
   - 文件大小验证
   - 批量上传支持
   - 上传失败重试

3. 用户体验：
   - 上传预览功能
   - 实时状态反馈
   - 错误信息显示
   - 成功提示

组件路径：frontend/src/components/TaskDocumentUploader.tsx
```

#### Prompt 3.2: 文档管理界面
```
请创建任务文档管理界面，包括：

1. 文档列表展示：
   - 表格形式显示文档信息
   - 文件类型图标
   - 上传时间和用户
   - 文件大小显示

2. 操作功能：
   - 文档预览（MD渲染、PDF展示）
   - 文档下载（原文件、MD、PDF）
   - 文档删除（软删除）
   - 版本历史查看

3. 界面交互：
   - 搜索和筛选
   - 排序功能
   - 批量操作
   - 响应式设计

组件路径：frontend/src/components/TaskDocumentManager.tsx
```

#### Prompt 3.3: 文档下载功能
```
请实现文档下载功能，包括：

1. 下载按钮组件：
   - 下载原文件
   - 导出为MD格式
   - 导出为PDF格式
   - 批量下载支持

2. 下载处理：
   - 文件流处理
   - 下载进度显示
   - 错误处理
   - 成功提示

3. 用户体验：
   - 下载状态指示
   - 取消下载功能
   - 下载历史记录
   - 文件预览选项

实现文件：frontend/src/services/documentDownloadService.ts
```

### Phase 4: API集成与服务层

#### Prompt 4.1: API服务封装
```
请创建文档API服务封装，包括：

1. HTTP客户端配置：
   - 基础URL设置
   - 认证头处理
   - 超时配置
   - 错误拦截

2. API方法实现：
   - uploadDocument(file, taskId, type)
   - downloadDocument(taskId, format)
   - getDocuments(taskId)
   - deleteDocument(documentId)

3. 错误处理：
   - 网络错误处理
   - 业务错误处理
   - 重试机制
   - 用户友好的错误消息

文件：frontend/src/services/taskDocumentService.ts
```

#### Prompt 4.2: 状态管理集成
```
请将文档管理功能集成到状态管理中：

1. Redux/Context状态设计：
   - 文档列表状态
   - 上传状态管理
   - 下载状态管理
   - 错误状态处理

2. Action和Reducer：
   - 文档CRUD操作
   - 异步操作处理
   - 乐观更新
   - 错误回滚

3. Selector设计：
   - 文档列表选择器
   - 状态计算选择器
   - 性能优化

集成到现有的状态管理系统中。
```

### Phase 5: 测试与部署

#### Prompt 5.1: 单元测试
```
请为文档系统编写全面的单元测试：

1. 后端测试：
   - API接口测试
   - 文件处理逻辑测试
   - 数据库操作测试
   - 权限验证测试

2. 前端测试：
   - 组件渲染测试
   - 用户交互测试
   - API调用测试
   - 状态管理测试

3. 集成测试：
   - 端到端上传下载流程
   - 错误场景测试
   - 性能测试

测试文件组织在相应的__tests__目录下。
```

#### Prompt 5.2: 文档和部署
```
请创建部署文档和用户手册：

1. 技术文档：
   - API文档（Swagger/OpenAPI）
   - 数据库迁移指南
   - 配置说明文档
   - 故障排除指南

2. 用户手册：
   - 功能使用说明
   - 常见问题解答
   - 最佳实践指南
   - 截图和示例

3. 部署指南：
   - 环境要求
   - 部署步骤
   - 配置说明
   - 监控和维护

文档保存在docs/task-document-system/目录下。
```

## 🎯 验收标准

### 功能验收
- [ ] 用户可通过界面上传MD/PDF文档到任务
- [ ] 开发者可通过API上传文档到任务  
- [ ] 用户可下载任务文档为MD或PDF格式
- [ ] 文档操作有完整的权限控制
- [ ] 支持文档版本管理和历史查看

### 性能验收
- [ ] 单文件上传时间 < 30秒（10MB以内）
- [ ] 文档列表加载时间 < 3秒
- [ ] PDF转换时间 < 10秒
- [ ] 支持并发用户操作

### 安全验收
- [ ] 文件类型严格验证
- [ ] 上传文件病毒扫描
- [ ] 权限验证完整性
- [ ] 敏感信息过滤

## 📈 实施计划

### 第1周：数据库和后端基础
- 数据库表设计和迁移
- 基础API接口实现
- 文件存储服务

### 第2周：核心功能开发  
- 文档上传功能完整实现
- 文档下载和转换功能
- 权限控制和版本管理

### 第3周：前端界面开发
- 上传组件和管理界面
- 用户交互和体验优化
- API集成和状态管理

### 第4周：测试和优化
- 单元测试和集成测试
- 性能优化和安全加固
- 文档完善和部署准备

## 🔗 相关资源

- **任务文档**: `backend/docs/tasks/projects/project-1/task-307.md`
- **父任务**: 任务266 (32周-02：任务管理优化)
- **项目仓库**: `/Users/johnqiu/coding/www/projects/new-ai-proj`
- **数据库**: PostgreSQL主数据库
- **存储**: 本地文件系统 + 云存储备份

---

**任务创建时间**: 2025-01-08  
**预计完成时间**: 2025-02-05  
**负责团队**: 全栈开发团队  
**优先级**: 高