# MD文档统一管理系统 - 详细实施Prompts

## 🎯 项目概述

**父任务ID**: 253  
**项目目标**: 将项目中441个MD文件（根目录118个）整合为统一的任务文档系统  
**预期工期**: 5个子任务，每个2-4小时，总计16小时  

---

## 📋 子任务1: MD文件分析与分类策略设计

### 🎯 任务目标
深入分析现有MD文件的内容、结构和关联性，设计合理的分类和导入策略。

### 📝 详细Prompts

```markdown
**Prompt 1.1: 文件内容分析**
请分析项目根目录下的所有MD文件，执行以下任务：

1. **内容分析**：
   - 读取每个MD文件的前500字符，识别文档类型
   - 提取关键信息：标题、创建时间、主要内容主题
   - 识别文档的功能分类（报告、指南、设计文档、修复记录等）

2. **关联性分析**：
   - 通过文件名和内容识别与特定任务相关的文档
   - 查找文档中提到的任务ID、功能名称、组件名称
   - 建立文档间的引用关系图

3. **质量评估**：
   - 评估文档的完整性和有用性
   - 识别重复或过期的文档
   - 标记需要归档或删除的文档

4. **输出结果**：
   - 生成文档分析报告（JSON格式）
   - 提供分类建议和导入优先级
   - 创建文档关联关系图

代码实现要求：
- 使用Node.js编写分析脚本
- 支持批量文件处理
- 输出结构化的分析结果
```

```markdown
**Prompt 1.2: 分类策略设计**
基于文件分析结果，设计文档分类和管理策略：

1. **分类体系设计**：
   - 按功能分类：功能设计、Bug修复、优化报告、使用指南等
   - 按状态分类：活跃文档、归档文档、临时文档
   - 按关联度分类：任务关联、项目关联、通用文档

2. **数据库设计**：
   - 设计document_imports表结构
   - 设计document_categories表结构
   - 设计document_task_relations表结构
   - 设计document_versions表结构

3. **导入策略**：
   - 制定批量导入流程
   - 设计文档去重策略
   - 制定关联关系建立规则
   - 设计版本控制机制

输出要求：
- 完整的数据库Schema设计
- 详细的导入流程图
- 分类规则文档
```

### ⏱️ 预计时间：3小时
### 🏷️ 关键输出：文档分析报告、分类策略、数据库设计

---

## 📋 子任务2: 后端API开发 - 文档导入与管理

### 🎯 任务目标
开发完整的后端API系统，支持MD文档的导入、分类、关联和管理。

### 📝 详细Prompts

```markdown
**Prompt 2.1: 数据库Schema实现**
根据子任务1的设计，实现数据库表结构：

1. **创建迁移文件**：
   ```sql
   -- 005_document_management_system.sql
   CREATE TABLE document_imports (
       id SERIAL PRIMARY KEY,
       original_path VARCHAR(500) NOT NULL,
       filename VARCHAR(255) NOT NULL,
       file_size INTEGER,
       content_hash VARCHAR(64),
       import_status VARCHAR(20) DEFAULT 'pending',
       category_id INTEGER,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE document_categories (
       id SERIAL PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       description TEXT,
       parent_id INTEGER REFERENCES document_categories(id),
       sort_order INTEGER DEFAULT 0,
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE document_task_relations (
       id SERIAL PRIMARY KEY,
       document_id INTEGER REFERENCES document_imports(id),
       task_id INTEGER REFERENCES tasks(id),
       relation_type VARCHAR(50), -- 'primary', 'reference', 'output'
       confidence_score FLOAT DEFAULT 1.0,
       created_by INTEGER REFERENCES users(id),
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE document_versions (
       id SERIAL PRIMARY KEY,
       document_id INTEGER REFERENCES document_imports(id),
       version_number INTEGER,
       content TEXT,
       change_summary TEXT,
       created_by INTEGER REFERENCES users(id),
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **创建索引和约束**
3. **执行迁移并验证**
```

```markdown
**Prompt 2.2: 文档导入API开发**
开发文档导入相关的API endpoints：

1. **批量导入API**：
   ```go
   // POST /api/v1/documents/import/batch
   func (h *DocumentHandler) BatchImport(c *gin.Context) {
       // 1. 接收文件路径列表或扫描目录
       // 2. 读取MD文件内容
       // 3. 计算文件hash，检测重复
       // 4. 解析文档metadata
       // 5. 自动分类和任务关联
       // 6. 批量插入数据库
       // 7. 返回导入结果统计
   }
   ```

2. **智能分类API**：
   ```go
   // POST /api/v1/documents/classify
   func (h *DocumentHandler) ClassifyDocument(c *gin.Context) {
       // 1. 分析文档内容和文件名
       // 2. 使用关键词匹配确定分类
       // 3. 分析任务关联度
       // 4. 返回分类建议
   }
   ```

3. **关联关系API**：
   ```go
   // POST /api/v1/documents/{id}/relations
   // GET /api/v1/documents/{id}/relations
   // DELETE /api/v1/documents/{id}/relations/{relationId}
   ```

实现要求：
- 支持事务处理
- 包含详细的错误处理
- 添加日志记录
- 实现进度回调
```

```markdown
**Prompt 2.3: 搜索和查询API**
实现强大的文档搜索功能：

1. **全文搜索API**：
   ```go
   // GET /api/v1/documents/search?q=关键词&category=&task_id=
   func (h *DocumentHandler) SearchDocuments(c *gin.Context) {
       // 1. 解析搜索参数
       // 2. 构建复合查询条件
       // 3. 执行全文搜索（PostgreSQL FTS）
       // 4. 按相关度排序
       // 5. 支持分页
       // 6. 返回高亮结果
   }
   ```

2. **文档统计API**：
   ```go
   // GET /api/v1/documents/stats
   func (h *DocumentHandler) GetDocumentStats(c *gin.Context) {
       // 按分类统计文档数量
       // 按状态统计导入情况
       // 按任务关联度统计
       // 返回可视化数据
   }
   ```

3. **版本历史API**：
   ```go
   // GET /api/v1/documents/{id}/versions
   // POST /api/v1/documents/{id}/versions
   ```
```

### ⏱️ 预计时间：4小时
### 🏷️ 关键输出：完整的后端API系统、数据库迁移文件

---

## 📋 子任务3: 前端文档导入界面开发

### 🎯 任务目标
创建直观易用的文档导入和管理界面，支持可视化操作。

### 📝 详细Prompts

```markdown
**Prompt 3.1: 文档导入页面开发**
创建功能完整的文档导入界面：

1. **页面组件结构**：
   ```typescript
   // DocumentImportPage.tsx
   interface DocumentImportPageProps {}

   const DocumentImportPage: React.FC<DocumentImportPageProps> = () => {
       // 1. 文件扫描区域 - 显示待导入的MD文件列表
       // 2. 分类预设区域 - 预定义的文档分类选择
       // 3. 导入配置区域 - 导入选项和规则设置
       // 4. 进度显示区域 - 实时显示导入进度
       // 5. 结果展示区域 - 导入结果统计和错误报告
   };
   ```

2. **核心功能组件**：
   ```typescript
   // FileScanner.tsx - 文件扫描组件
   interface FileScannerProps {
       onFilesScanned: (files: MDFileInfo[]) => void;
   }

   // CategoryMapper.tsx - 分类映射组件
   interface CategoryMapperProps {
       files: MDFileInfo[];
       categories: DocumentCategory[];
       onCategoryAssigned: (fileId: string, categoryId: number) => void;
   }

   // ImportProgress.tsx - 导入进度组件
   interface ImportProgressProps {
       progress: ImportProgress;
       onCancel: () => void;
   }
   ```

3. **交互功能**：
   - 拖拽式分类分配
   - 批量操作选择
   - 实时预览文档内容
   - 智能分类建议
   - 重复文档检测提示

UI设计要求：
- 使用Ant Design组件库
- 响应式布局设计
- 支持键盘快捷键
- 提供操作反馈和提示
```

```markdown
**Prompt 3.2: 文档关联管理界面**
开发任务-文档关联管理功能：

1. **关联视图组件**：
   ```typescript
   // DocumentRelationManager.tsx
   const DocumentRelationManager: React.FC = () => {
       // 1. 左侧：任务树形结构
       // 2. 右侧：相关文档列表
       // 3. 中间：拖拽关联操作区域
       // 4. 底部：关联关系图表可视化
   };
   ```

2. **拖拽关联功能**：
   ```typescript
   // DragDropRelation.tsx
   import { DndProvider, useDrag, useDrop } from 'react-dnd';
   
   // 支持从文档列表拖拽到任务节点
   // 支持关联强度设置（主要/参考/输出）
   // 支持批量关联操作
   // 提供关联建议和智能匹配
   ```

3. **关系可视化**：
   ```typescript
   // RelationshipGraph.tsx
   // 使用D3.js或G6图形库
   // 显示任务-文档关联关系图
   // 支持节点交互和筛选
   // 提供关系强度视觉指示
   ```

功能要求：
- 直观的拖拽操作体验
- 实时的关联关系更新
- 关联质量评分显示
- 批量操作支持
```

### ⏱️ 预计时间：3小时
### 🏷️ 关键输出：文档导入界面、关联管理界面

---

## 📋 子任务4: 统一文档浏览界面集成

### 🎯 任务目标
将新的文档管理功能集成到现有的任务文档系统中，提供无缝的用户体验。

### 📝 详细Prompts

```markdown
**Prompt 4.1: 任务详情页文档集成**
在现有任务详情页中集成导入的文档：

1. **增强TaskDocumentEditor组件**：
   ```typescript
   // 在现有的TaskDocumentEditor.tsx中添加
   interface EnhancedDocumentEditorProps extends TaskDocumentEditorProps {
       relatedDocuments?: ImportedDocument[];
       onDocumentLink?: (documentId: number) => void;
   }

   const EnhancedTaskDocumentEditor: React.FC<EnhancedDocumentEditorProps> = (props) => {
       // 1. 原有的任务文档编辑功能
       // 2. 右侧新增"关联文档"面板
       // 3. 支持引用导入的文档内容
       // 4. 支持从关联文档中复制内容
       // 5. 显示文档关联历史和版本
   };
   ```

2. **文档引用和链接功能**：
   ```typescript
   // DocumentReference.tsx
   const DocumentReference: React.FC<{documentId: number}> = ({documentId}) => {
       // 1. 显示文档摘要信息
       // 2. 提供快速预览功能
       // 3. 支持插入文档链接
       // 4. 支持复制文档内容片段
   };
   ```

3. **版本对比功能**：
   ```typescript
   // DocumentVersionCompare.tsx
   // 对比导入文档的不同版本
   // 高亮显示变更内容
   // 支持版本回退和合并
   ```
```

```markdown
**Prompt 4.2: 文档浏览和搜索界面**
创建统一的文档浏览中心：

1. **文档库主页面**：
   ```typescript
   // DocumentLibraryPage.tsx
   const DocumentLibraryPage: React.FC = () => {
       return (
           <div className="document-library">
               {/* 1. 左侧：分类导航树 */}
               <DocumentCategoryTree />
               
               {/* 2. 中间：文档列表区域 */}
               <DocumentList 
                   view="grid" // 支持grid/list视图切换
                   sortBy="relevance" // 多种排序方式
                   filters={filters} // 高级筛选
               />
               
               {/* 3. 右侧：预览面板 */}
               <DocumentPreview />
               
               {/* 4. 顶部：搜索和操作栏 */}
               <DocumentSearchBar />
           </div>
       );
   };
   ```

2. **高级搜索功能**：
   ```typescript
   // AdvancedDocumentSearch.tsx
   const AdvancedDocumentSearch: React.FC = () => {
       // 1. 全文搜索输入框
       // 2. 分类筛选器
       // 3. 任务关联筛选
       // 4. 日期范围筛选
       // 5. 文档状态筛选
       // 6. 搜索结果高亮显示
       // 7. 搜索历史记录
   };
   ```

3. **文档详情展示**：
   ```typescript
   // DocumentDetailView.tsx
   // 完整的文档内容展示
   // Markdown渲染和代码高亮
   // 评论和协作功能
   // 编辑和版本管理
   ```
```

### ⏱️ 预计时间：3小时
### 🏷️ 关键输出：集成的文档浏览界面、增强的任务文档功能

---

## 📋 子任务5: 系统测试与优化完善

### 🎯 任务目标
全面测试整个MD文档管理系统，优化性能和用户体验。

### 📝 详细Prompts

```markdown
**Prompt 5.1: 自动化测试开发**
为文档管理系统创建完整的测试套件：

1. **后端API测试**：
   ```javascript
   // tests/document-management.test.js
   describe('Document Management API', () => {
       test('批量导入MD文件', async () => {
           // 1. 准备测试文件
           // 2. 调用导入API
           // 3. 验证导入结果
           // 4. 检查数据库状态
       });

       test('文档分类和关联', async () => {
           // 测试自动分类功能
           // 测试关联关系建立
           // 验证关联质量评分
       });

       test('全文搜索功能', async () => {
           // 测试搜索准确性
           // 测试搜索性能
           // 验证高亮和排序
       });
   });
   ```

2. **前端组件测试**：
   ```typescript
   // __tests__/DocumentImport.test.tsx
   import { render, fireEvent, waitFor } from '@testing-library/react';
   import DocumentImportPage from '../DocumentImportPage';

   describe('文档导入页面', () => {
       test('文件扫描和预览', async () => {
           // 测试文件列表显示
           // 测试预览功能
           // 测试分类建议
       });

       test('拖拽关联功能', () => {
           // 模拟拖拽操作
           // 验证关联关系建立
           // 测试UI反馈
       });
   });
   ```

3. **集成测试脚本**：
   ```bash
   #!/bin/bash
   # test-document-system.sh
   # 1. 导入测试文档
   # 2. 验证分类正确性
   # 3. 测试搜索功能
   # 4. 验证关联关系
   # 5. 清理测试数据
   ```
```

```markdown
**Prompt 5.2: 性能优化**
优化系统性能和用户体验：

1. **数据库优化**：
   ```sql
   -- 创建搜索优化索引
   CREATE INDEX idx_document_content_search 
   ON document_versions USING GIN(to_tsvector('english', content));

   -- 创建关联查询优化索引
   CREATE INDEX idx_document_task_relations_composite
   ON document_task_relations (task_id, relation_type, confidence_score);

   -- 分析查询性能
   EXPLAIN ANALYZE SELECT * FROM documents WHERE ...;
   ```

2. **前端性能优化**：
   ```typescript
   // 实现虚拟滚动
   import { FixedSizeList as List } from 'react-window';

   // 文档内容懒加载
   const LazyDocumentContent = React.lazy(() => import('./DocumentContent'));

   // 搜索防抖优化
   const debouncedSearch = useMemo(
       () => debounce(searchFunction, 300),
       [searchFunction]
   );
   ```

3. **缓存策略**：
   ```typescript
   // 实现React Query缓存
   const useDocumentList = (filters: DocumentFilters) => {
       return useQuery({
           queryKey: ['documents', filters],
           queryFn: () => fetchDocuments(filters),
           staleTime: 5 * 60 * 1000, // 5分钟
       });
   };
   ```
```

```markdown
**Prompt 5.3: 用户体验完善**
完善用户界面和交互体验：

1. **操作指引和帮助**：
   ```typescript
   // TutorialGuide.tsx - 新手指引
   const DocumentManagementTutorial: React.FC = () => {
       // 1. 步骤式操作指引
       // 2. 交互式功能演示
       // 3. 快捷键提示
       // 4. 最佳实践建议
   };
   ```

2. **错误处理和反馈**：
   ```typescript
   // ErrorBoundary.tsx - 文档管理错误边界
   // LoadingStates.tsx - 各种加载状态
   // SuccessNotifications.tsx - 操作成功反馈
   // ValidationMessages.tsx - 表单验证信息
   ```

3. **响应式设计优化**：
   ```css
   /* 移动端适配 */
   @media (max-width: 768px) {
       .document-library {
           flex-direction: column;
       }
       
       .document-grid {
           grid-template-columns: 1fr;
       }
   }
   ```

4. **可访问性改进**：
   ```typescript
   // 添加ARIA标签
   // 支持键盘导航
   // 提供屏幕阅读器支持
   // 高对比度主题支持
   ```
```

### ⏱️ 预计时间：3小时
### 🏷️ 关键输出：完整的测试套件、性能优化、用户体验改进

---

## 🎉 项目交付清单

### ✅ 后端交付物
- [ ] 数据库迁移文件（005_document_management_system.sql）
- [ ] 文档管理API端点（15个以上）
- [ ] 智能分类和关联算法
- [ ] 全文搜索功能
- [ ] 版本控制系统

### ✅ 前端交付物
- [ ] 文档导入页面（DocumentImportPage.tsx）
- [ ] 关联管理界面（DocumentRelationManager.tsx）
- [ ] 统一浏览界面（DocumentLibraryPage.tsx）
- [ ] 增强的任务文档编辑器
- [ ] 搜索和筛选组件

### ✅ 系统功能
- [ ] 441个MD文件的成功导入
- [ ] 自动分类和标签系统
- [ ] 任务-文档关联关系
- [ ] 秒级全文搜索响应
- [ ] 版本历史和对比功能

### ✅ 测试和文档
- [ ] 完整的测试套件
- [ ] 性能测试报告
- [ ] 用户操作指南
- [ ] API文档
- [ ] 部署和维护文档

---

## 🚀 成功指标验证

1. **功能完整性**: 90%以上的MD文件成功导入并正确分类
2. **搜索性能**: 全文搜索响应时间 < 500ms
3. **用户体验**: 操作流程直观，无需培训即可使用
4. **数据完整性**: 文档内容和关联关系100%准确
5. **系统稳定性**: 支持并发访问，无数据丢失

这个系统将彻底改变项目的文档管理方式，从分散的文件管理升级为统一的知识库系统！🌟