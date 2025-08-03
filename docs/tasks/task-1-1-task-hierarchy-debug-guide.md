# 项目任务列表层级显示调试指南

## 🐛 **问题描述**
项目详情页中的项目任务列表设置了层级模式，但显示仍然是平铺的，没有层级结构。

## 🔍 **问题排查与修复过程**

### **问题1: 默认视图模式错误**
- **发现**: `viewMode` 初始值设置为 `'list'` 而非 `'hierarchy'`
- **位置**: `ProjectTaskList.tsx:103`
- **修复**: 
  ```typescript
  // 修复前
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  
  // 修复后
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('hierarchy');
  ```

### **问题2: 默认展开状态不正确**
- **发现**: 父任务默认为收起状态（`isExpanded: false`），导致子任务不显示
- **位置**: `ProjectTaskList.tsx:159-180`
- **修复**: 添加智能展开逻辑
  ```typescript
  // 设置展开状态：如果expandedTaskIds为空，默认展开所有有子任务的节点
  taskMap.forEach((task, taskId) => {
    if (task.hasChildren) {
      if (expandedTaskIds.size === 0) {
        // 初始状态：默认展开所有父任务
        task.isExpanded = true;
      } else {
        // 用户已经有操作：根据expandedTaskIds决定
        task.isExpanded = expandedTaskIds.has(taskId);
      }
    }
  });
  ```

### **问题3: 展开/收起逻辑需要优化**
- **发现**: 首次点击时需要正确初始化所有父任务的状态
- **位置**: `ProjectTaskList.tsx:210-234`
- **修复**: 在首次操作时初始化所有父任务
  ```typescript
  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      
      // 如果这是首次操作，先初始化所有父任务为展开状态
      if (prev.size === 0) {
        tasks.forEach(task => {
          const hasChildren = tasks.some(t => t.parent_id === task.id);
          if (hasChildren) {
            newSet.add(task.id);
          }
        });
      }
      
      // 然后处理当前点击的任务
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      
      return newSet;
    });
  };
  ```

## 🧪 **测试验证步骤**

### **1. 基本层级显示测试**
1. 进入有父子任务关系的项目详情页
2. 切换到"项目任务" Tab
3. 验证是否显示层级结构：
   - ✅ 父任务左侧有展开/收起按钮（▼ 或 ▶）
   - ✅ 子任务有适当的缩进（20px * level）
   - ✅ 默认展开显示所有子任务

### **2. 展开/收起功能测试**
1. 点击父任务的展开/收起按钮
2. 验证子任务的显示/隐藏
3. 验证按钮图标的变化（▼ ↔ ▶）

### **3. 视图模式切换测试**
1. 在页面上找到视图模式切换器
2. 切换到"列表模式"
3. 验证所有任务平铺显示（无层级缩进）
4. 切换回"层级模式"
5. 验证层级结构恢复

### **4. 数据完整性测试**
1. 验证所有任务都正确显示
2. 验证任务数量与实际数据一致
3. 验证父子关系正确映射

## 🎯 **预期效果**

### **层级模式下的显示效果**
```
▼ 父任务1
    ○ 子任务1.1
    ○ 子任务1.2
    ▼ 子任务1.3（也是父任务）
        ○ 孙任务1.3.1
▼ 父任务2
    ○ 子任务2.1
```

### **样式效果**
- **缩进**: 每级子任务向右缩进 20px
- **展开按钮**: 只在有子任务的任务前显示
- **图标**: ▼ (展开) / ▶ (收起)

## 🔧 **技术细节**

### **核心数据结构**
```typescript
interface HierarchicalTask extends Task {
  children?: HierarchicalTask[];
  level?: number;           // 层级深度，从0开始
  hasChildren?: boolean;    // 是否有子任务
  isExpanded?: boolean;     // 是否展开状态
}
```

### **关键状态管理**
- `viewMode`: 控制显示模式（'list' | 'hierarchy'）
- `expandedTaskIds`: Set<number>，记录展开的父任务ID
- `hierarchicalTasks`: 构建的层级数据结构
- `flattenedTasks`: 扁平化后的显示数据

### **渲染逻辑**
1. **数据构建**: `tasks` → `hierarchicalTasks`（构建父子关系）
2. **扁平化**: `hierarchicalTasks` → `flattenedTasks`（根据展开状态展开）
3. **渲染**: Table 使用 `flattenedTasks` 数据

## 🚀 **后续优化建议**

### **性能优化**
1. 大量任务时的虚拟滚动
2. 展开状态的持久化（localStorage）
3. 懒加载子任务

### **用户体验优化**
1. 添加"全部展开/收起"按钮
2. 搜索时自动展开相关父任务
3. 拖拽重新排序任务层级

### **功能扩展**
1. 支持更深层级的任务嵌套
2. 批量操作层级任务
3. 层级统计信息显示

---

**修复完成时间**: 2025-07-27  
**修复状态**: ✅ 已完成  
**需要测试**: 请在项目详情页验证层级显示效果