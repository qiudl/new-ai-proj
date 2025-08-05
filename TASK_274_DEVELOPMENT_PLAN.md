# 任务#274: 批量更改父任务功能 - 开发计划

## 📋 项目概述

**任务标题**: 31周-06：任务列表页批量更改父任务功能  
**任务ID**: 274  
**优先级**: 高  
**复杂度**: 中等  
**预估总工时**: 16-20小时  

## 🎯 功能需求分析

### 核心功能要求
1. **批量选择任务**: 在任务列表页面选择多个任务
2. **父任务选择**: 为选中的任务统一设置新的父任务
3. **层级验证**: 防止创建循环依赖和超级层级限制
4. **事务操作**: 确保批量操作的原子性
5. **用户反馈**: 操作进度显示和结果反馈

### 技术架构设计

#### 前端架构
- **组件扩展**: 扩展现有ProjectTaskList组件的批量操作功能
- **状态管理**: 利用现有的selectedRowKeys状态管理选中任务
- **UI组件**: 集成TaskParentSelector父任务选择器
- **API调用**: 扩展taskService支持批量父任务更新

#### 后端架构
- **API扩展**: 扩展现有的PATCH /api/v1/projects/{projectId}/tasks/batch接口
- **数据验证**: 添加父任务层级和循环依赖检测
- **事务处理**: 使用数据库事务确保操作原子性
- **错误处理**: 详细的错误报告和部分成功处理

## 🛠️ 开发子任务分解

### Phase 1: 后端API功能扩展 (6-8小时)

#### 子任务1.1: 扩展批量更新API接口
**文件**: `backend/main.go`, `backend/models/task.go`
**工时**: 2-3小时
**优先级**: 高

#### 子任务1.2: 实现父任务层级验证逻辑
**文件**: `backend/services/task_validation.go` (新建)
**工时**: 2-3小时
**优先级**: 高

#### 子任务1.3: 添加循环依赖检测功能
**文件**: `backend/services/task_validation.go`
**工时**: 2小时
**优先级**: 高

### Phase 2: 前端UI功能实现 (6-8小时)

#### 子任务2.1: 扩展批量操作菜单
**文件**: `frontend/src/components/ProjectTaskList.tsx`
**工时**: 1-2小时
**优先级**: 高

#### 子任务2.2: 集成父任务选择器组件
**文件**: `frontend/src/components/BatchParentTaskSelector.tsx` (新建)
**工时**: 3-4小时
**优先级**: 高

#### 子任务2.3: 实现批量操作预览功能
**文件**: `frontend/src/components/BatchOperationPreview.tsx` (新建)
**工时**: 2小时
**优先级**: 中

### Phase 3: 服务层和API集成 (3-4小时)

#### 子任务3.1: 扩展前端任务服务
**文件**: `frontend/src/services/taskService.ts`
**工时**: 1小时
**优先级**: 高

#### 子任务3.2: 实现错误处理和用户反馈
**文件**: `frontend/src/components/ProjectTaskList.tsx`
**工时**: 2-3小时
**优先级**: 中

### Phase 4: 测试和优化 (1-2小时)

#### 子任务4.1: 功能测试和bug修复
**工时**: 1-2小时
**优先级**: 中

## 📝 详细开发提示 (Development Prompts)

### 🚀 Phase 1 Prompts

#### Prompt 1.1: 后端API接口扩展
```
任务：扩展批量更新API接口支持父任务字段

目标文件：backend/main.go, backend/models/task.go

具体要求：
1. 修改BatchUpdateTasksRequest结构体，添加ParentID字段：
   ```go
   type BatchUpdateTasksRequest struct {
       TaskIDs   []int  `json:"task_ids" validate:"required,min=1"`
       Status    *string `json:"status,omitempty" validate:"omitempty,oneof=todo in_progress completed cancelled"`
       ParentID  *int   `json:"parent_id,omitempty"`
       UpdatedBy *int   `json:"updated_by,omitempty"`
   }
   ```

2. 修改batchUpdateTasks处理函数：
   - 支持同时更新status和parent_id字段
   - 保持向后兼容性（status和parent_id都是可选的）
   - 添加参数验证：至少提供status或parent_id中的一个

3. 更新SQL查询语句：
   - 动态构建UPDATE语句，根据提供的字段进行更新
   - 保持事务性操作

4. 添加响应信息：
   - 返回更新成功和失败的任务详情
   - 包含具体的错误原因

实现注意事项：
- 保持现有批量状态更新功能不受影响
- 添加详细的日志记录
- 确保数据库事务的正确性
```

#### Prompt 1.2: 父任务层级验证逻辑
```
任务：实现父任务层级验证逻辑

目标文件：backend/services/task_validation.go (新建文件)

具体要求：
1. 创建任务验证服务：
   ```go
   type TaskValidationService struct {
       db *gorm.DB
   }
   
   func NewTaskValidationService(db *gorm.DB) *TaskValidationService
   ```

2. 实现层级深度检查函数：
   ```go
   func (s *TaskValidationService) ValidateTaskHierarchy(taskID int, newParentID int) error
   ```
   - 检查任务层级不超过4级
   - 递归计算新的层级深度
   - 返回详细的错误信息

3. 实现批量层级验证：
   ```go
   func (s *TaskValidationService) ValidateBatchParentUpdate(taskIDs []int, parentID int) error
   ```
   - 批量验证所有任务的层级合法性
   - 返回第一个违反规则的任务信息

4. 添加层级深度计算函数：
   ```go
   func (s *TaskValidationService) calculateTaskDepth(taskID int) (int, error)
   ```
   - 递归计算任务在层级树中的深度
   - 缓存计算结果提高性能

实现注意事项：
- 使用递归算法但要防止栈溢出
- 添加数据库查询优化
- 提供清晰的错误消息
- 考虑性能优化（缓存层级信息）
```

#### Prompt 1.3: 循环依赖检测功能
```
任务：添加循环依赖检测功能

目标文件：backend/services/task_validation.go

具体要求：
1. 实现循环依赖检测函数：
   ```go
   func (s *TaskValidationService) DetectCircularDependency(taskID int, newParentID int) error
   ```
   - 使用深度优先搜索(DFS)算法
   - 检测从newParentID到taskID是否存在路径
   - 如果存在路径，则会形成循环依赖

2. 实现批量循环依赖检测：
   ```go
   func (s *TaskValidationService) DetectBatchCircularDependency(taskIDs []int, parentID int) error
   ```
   - 对每个任务检查是否会与新的父任务形成循环
   - 返回第一个会造成循环依赖的任务信息

3. 添加路径追踪功能：
   ```go
   func (s *TaskValidationService) findPathToTask(fromTaskID, toTaskID int, visited map[int]bool) bool
   ```
   - 递归查找从一个任务到另一个任务的路径
   - 使用visited map防止无限循环
   - 返回是否存在路径

4. 集成到批量更新API：
   - 在执行批量更新前调用验证函数
   - 如果检测到循环依赖，返回详细错误信息
   - 指出具体哪些任务会导致循环依赖

实现注意事项：
- 算法要处理复杂的任务层级关系
- 优化查询性能，避免过多数据库访问
- 提供用户友好的错误提示
- 考虑大量任务时的性能问题
```

### 🎨 Phase 2 Prompts

#### Prompt 2.1: 扩展批量操作菜单
```
任务：扩展ProjectTaskList组件的批量操作菜单

目标文件：frontend/src/components/ProjectTaskList.tsx

具体要求：
1. 在现有批量操作菜单中添加"更改父任务"选项：
   ```tsx
   const batchActionItems = [
     {
       key: 'delete',
       label: '批量删除',
       icon: <DeleteOutlined />,
       danger: true,
     },
     {
       key: 'changeParent',
       label: '更改父任务',
       icon: <NodeIndexOutlined />,
     },
   ];
   ```

2. 修改handleBatchAction函数：
   ```tsx
   const handleBatchAction = (action: string) => {
     if (selectedRowKeys.length === 0) {
       message.warning('请先选择任务');
       return;
     }
     
     switch (action) {
       case 'delete':
         // 现有删除逻辑
         break;
       case 'changeParent':
         setShowBatchParentModal(true);
         break;
       default:
         message.info(`批量${action}功能开发中`);
     }
   };
   ```

3. 添加状态管理：
   ```tsx
   const [showBatchParentModal, setShowBatchParentModal] = useState(false);
   const [batchParentLoading, setBatchParentLoading] = useState(false);
   ```

4. 添加批量操作提示信息：
   - 显示选中任务数量
   - 显示将要执行的操作类型
   - 提供操作预览

实现注意事项：
- 保持与现有批量删除功能的一致性
- 添加合适的图标和样式
- 确保只有在选中任务时菜单才可用
```

#### Prompt 2.2: 父任务选择器组件集成
```
任务：创建BatchParentTaskSelector组件

目标文件：frontend/src/components/BatchParentTaskSelector.tsx (新建)

具体要求：
1. 创建批量父任务选择器组件：
   ```tsx
   interface BatchParentTaskSelectorProps {
     visible: boolean;
     onCancel: () => void;
     onConfirm: (parentId: number | null) => void;
     selectedTaskIds: number[];
     projectId: number;
     loading?: boolean;
   }
   
   const BatchParentTaskSelector: React.FC<BatchParentTaskSelectorProps> = ({
     visible,
     onCancel,
     onConfirm,
     selectedTaskIds,
     projectId,
     loading = false
   }) => {
     // 组件实现
   };
   ```

2. 集成现有的父任务选择功能：
   - 复用TaskParentSelector的核心逻辑
   - 过滤掉当前选中的任务（防止自引用）
   - 显示可选的父任务列表

3. 添加批量操作预览：
   ```tsx
   const [previewData, setPreviewData] = useState<{
     selectedTasks: Task[];
     targetParent: Task | null;
     warnings: string[];
   }>({
     selectedTasks: [],
     targetParent: null,
     warnings: []
   });
   ```

4. 实现验证反馈：
   - 实时显示层级验证结果
   - 显示潜在的循环依赖警告
   - 提供操作影响预览

5. Modal界面设计：
   - 清晰的操作说明
   - 选中任务列表展示
   - 父任务选择器
   - 操作预览区域
   - 确认和取消按钮

实现注意事项：
- 组件要处理loading状态
- 提供清晰的用户交互反馈
- 错误处理和用户提示
- 响应式设计适配
```

#### Prompt 2.3: 批量操作预览功能
```
任务：实现批量操作预览功能

目标文件：frontend/src/components/BatchOperationPreview.tsx (新建)

具体要求：
1. 创建操作预览组件：
   ```tsx
   interface BatchOperationPreviewProps {
     selectedTasks: Task[];
     targetParent: Task | null;
     operation: 'changeParent';
     warnings?: string[];
   }
   
   const BatchOperationPreview: React.FC<BatchOperationPreviewProps> = ({
     selectedTasks,
     targetParent,
     operation,
     warnings = []
   }) => {
     // 组件实现
   };
   ```

2. 实现预览内容展示：
   - 操作类型说明
   - 受影响任务列表（显示任务标题和当前父任务）
   - 目标父任务信息
   - 操作后的层级结构预览

3. 添加警告和风险提示：
   ```tsx
   const RiskWarnings: React.FC<{ warnings: string[] }> = ({ warnings }) => (
     <Alert
       type="warning"
       showIcon
       message="操作风险提示"
       description={
         <ul>
           {warnings.map((warning, index) => (
             <li key={index}>{warning}</li>
           ))}
         </ul>
       }
     />
   );
   ```

4. 实现层级结构可视化：
   - 使用Tree组件展示新的层级关系
   - 高亮显示变更的部分
   - 显示层级深度信息

5. 添加操作统计信息：
   - 将要更新的任务数量
   - 层级变化统计
   - 预估操作时间

实现注意事项：
- 提供直观的可视化展示
- 突出显示重要信息和风险
- 保持良好的用户体验
- 支持大量任务的情况
```

### 🔧 Phase 3 Prompts

#### Prompt 3.1: 扩展前端任务服务
```
任务：扩展taskService支持批量父任务更新

目标文件：frontend/src/services/taskService.ts

具体要求：
1. 添加批量更新父任务的API方法：
   ```typescript
   export interface BatchUpdateParentRequest {
     task_ids: number[];
     parent_id: number | null;
     updated_by?: number;
   }
   
   export interface BatchUpdateParentResponse {
     success: boolean;
     message: string;
     data: {
       updated_count: number;
       failed_tasks: {
         task_id: number;
         error: string;
       }[];
     };
   }
   
   export const batchUpdateParentTask = async (
     projectId: number,
     request: BatchUpdateParentRequest
   ): Promise<BatchUpdateParentResponse> => {
     const response = await api.patch(
       `/projects/${projectId}/tasks/batch`,
       request
     );
     return response.data;
   };
   ```

2. 添加父任务验证API方法：
   ```typescript
   export interface ValidateParentRequest {
     task_ids: number[];
     parent_id: number | null;
   }
   
   export interface ValidationResult {
     valid: boolean;
     warnings: string[];
     errors: string[];
   }
   
   export const validateBatchParentUpdate = async (
     projectId: number,
     request: ValidateParentRequest
   ): Promise<ValidationResult> => {
     const response = await api.post(
       `/projects/${projectId}/tasks/validate-parent`,
       request
     );
     return response.data;
   };
   ```

3. 扩展现有的批量更新方法：
   - 支持同时更新状态和父任务
   - 保持向后兼容性
   - 添加更详细的错误处理

4. 添加批量操作进度跟踪：
   ```typescript
   export const batchUpdateWithProgress = async (
     projectId: number,
     request: BatchUpdateParentRequest,
     onProgress?: (progress: number) => void
   ): Promise<BatchUpdateParentResponse> => {
     // 实现进度跟踪的批量更新
   };
   ```

实现注意事项：
- 保持API接口的一致性
- 添加完整的TypeScript类型定义
- 实现错误处理和重试机制
- 考虑大批量操作的性能优化
```

#### Prompt 3.2: 错误处理和用户反馈
```
任务：实现完整的错误处理和用户反馈机制

目标文件：frontend/src/components/ProjectTaskList.tsx

具体要求：
1. 实现批量父任务更新的主要处理函数：
   ```tsx
   const handleBatchParentUpdate = async (parentId: number | null) => {
     setBatchParentLoading(true);
     
     try {
       // 1. 验证操作合法性
       const validationResult = await validateBatchParentUpdate(projectId, {
         task_ids: selectedRowKeys as number[],
         parent_id: parentId
       });
       
       if (!validationResult.valid) {
         // 显示验证错误
         Modal.error({
           title: '操作验证失败',
           content: validationResult.errors.join('\n')
         });
         return;
       }
       
       // 2. 显示警告（如果有）
       if (validationResult.warnings.length > 0) {
         const confirmed = await new Promise((resolve) => {
           Modal.confirm({
             title: '操作警告',
             content: validationResult.warnings.join('\n'),
             onOk: () => resolve(true),
             onCancel: () => resolve(false)
           });
         });
         
         if (!confirmed) return;
       }
       
       // 3. 执行批量更新
       const result = await batchUpdateParentTask(projectId, {
         task_ids: selectedRowKeys as number[],
         parent_id: parentId
       });
       
       // 4. 处理结果
       if (result.success) {
         message.success(`成功更新 ${result.data.updated_count} 个任务的父任务`);
         
         if (result.data.failed_tasks.length > 0) {
           // 显示部分失败的详情
           Modal.warning({
             title: '部分任务更新失败',
             content: (
               <div>
                 <p>以下任务更新失败：</p>
                 <ul>
                   {result.data.failed_tasks.map(failed => (
                     <li key={failed.task_id}>
                       任务 #{failed.task_id}: {failed.error}
                     </li>
                   ))}
                 </ul>
               </div>
             )
           });
         }
         
         // 刷新任务列表
         await loadTasks();
         setSelectedRowKeys([]);
       } else {
         message.error(`批量更新失败: ${result.message}`);
       }
       
     } catch (error) {
       console.error('批量更新父任务失败:', error);
       message.error('批量更新父任务失败，请重试');
     } finally {
       setBatchParentLoading(false);
       setShowBatchParentModal(false);
     }
   };
   ```

2. 添加操作进度显示：
   ```tsx
   const [batchProgress, setBatchProgress] = useState(0);
   
   // 在批量操作中使用进度回调
   const result = await batchUpdateWithProgress(
     projectId,
     request,
     (progress) => setBatchProgress(progress)
   );
   ```

3. 实现详细的错误类型处理：
   - 网络错误处理
   - 权限错误处理
   - 业务逻辑错误处理
   - 服务器错误处理

4. 添加操作日志和审计：
   ```tsx
   const logBatchOperation = (
     operation: string,
     taskIds: number[],
     result: 'success' | 'failure' | 'partial',
     details?: any
   ) => {
     // 记录操作日志
     console.log('批量操作日志:', {
       operation,
       taskIds,
       result,
       details,
       timestamp: new Date().toISOString()
     });
   };
   ```

实现注意事项：
- 提供清晰的用户反馈信息
- 处理各种异常情况
- 保持界面响应和用户体验
- 添加操作确认和撤销机制
```

### 🧪 Phase 4 Prompts

#### Prompt 4.1: 功能测试和优化
```
任务：全面测试批量更改父任务功能并进行优化

测试范围：
1. 单元测试案例
2. 集成测试案例  
3. 用户界面测试
4. 性能测试
5. 错误场景测试

具体测试要求：

1. **API接口测试**：
   - 测试批量更新API的各种参数组合
   - 测试层级验证逻辑的边界情况
   - 测试循环依赖检测的准确性
   - 测试大批量操作的性能

2. **前端功能测试**：
   - 测试批量选择和操作菜单
   - 测试父任务选择器的交互
   - 测试操作预览的准确性
   - 测试错误处理和用户反馈

3. **边界条件测试**：
   - 测试最大层级限制（4级）
   - 测试循环依赖的各种情况
   - 测试大量任务的批量操作
   - 测试网络错误等异常情况

4. **性能优化**：
   - 优化数据库查询性能
   - 优化前端渲染性能
   - 添加操作缓存机制
   - 实现懒加载和分页

5. **用户体验优化**：
   - 改进加载状态显示
   - 优化错误消息提示
   - 添加操作快捷方式
   - 改进响应式设计

测试用例设计：
- 正常流程测试
- 异常流程测试
- 压力测试
- 兼容性测试

性能基准：
- API响应时间 < 2秒
- 支持同时更新100+任务
- 界面响应时间 < 500ms
- 内存使用合理
```

## 📊 项目里程碑

### 里程碑1: 后端API完成 (第1-2天)
- ✅ 批量更新API扩展
- ✅ 层级验证逻辑实现
- ✅ 循环依赖检测功能

### 里程碑2: 前端UI完成 (第3-4天)
- ✅ 批量操作菜单扩展
- ✅ 父任务选择器集成
- ✅ 操作预览功能实现

### 里程碑3: 集成测试完成 (第5天)
- ✅ 前后端集成
- ✅ 错误处理完善
- ✅ 用户反馈优化

### 里程碑4: 功能发布 (第6天)
- ✅ 全面测试通过
- ✅ 性能优化完成
- ✅ 文档更新完成

## 🎯 验收标准

### 功能验收
1. ✅ 用户可以选择多个任务进行批量父任务更改
2. ✅ 系统能够正确验证层级关系和循环依赖
3. ✅ 批量操作具有事务性（全部成功或全部失败）
4. ✅ 提供清晰的操作预览和结果反馈

### 性能验收
1. ✅ 支持同时更新100个以上任务
2. ✅ API响应时间在正常网络条件下小于2秒
3. ✅ 前端界面响应流畅，无明显卡顿

### 用户体验验收
1. ✅ 操作流程直观易懂
2. ✅ 错误提示清晰准确
3. ✅ 提供完整的操作反馈
4. ✅ 支持操作撤销和确认

## 🔧 技术风险和缓解策略

### 高风险项
1. **循环依赖检测复杂性**
   - 风险：算法复杂度高，可能影响性能
   - 缓解：使用缓存和优化算法，添加超时机制

2. **大批量操作性能**
   - 风险：大量任务更新可能导致超时
   - 缓解：实现分批处理和进度显示

3. **数据一致性**
   - 风险：批量操作中途失败可能导致数据不一致
   - 缓解：使用数据库事务确保原子性

### 中等风险项
1. **用户界面复杂性**
   - 风险：操作界面过于复杂影响用户体验
   - 缓解：设计简洁直观的交互流程

2. **错误处理完整性**
   - 风险：各种边界情况可能导致异常
   - 缓解：全面的测试和错误处理机制

## 📚 相关文档

- [任务管理系统API文档](./API_DOCUMENTATION.md)
- [前端组件设计规范](./FRONTEND_COMPONENTS.md)
- [数据库设计文档](./DATABASE_SCHEMA.md)
- [测试用例文档](./TEST_CASES.md)

---

**创建时间**: 2025年8月5日  
**最后更新**: 2025年8月5日  
**文档版本**: v1.0  
**负责人**: Claude Code Assistant