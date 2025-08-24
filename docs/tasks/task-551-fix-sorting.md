# 任务#551 - 修复任务列表页排序功能

## 📋 任务信息
- **ID**: 551
- **项目**: ai-proj (ID: 1)  
- **状态**: todo
- **优先级**: low
- **创建时间**: 2025-08-23 06:41:35

## 🔍 问题诊断

### API路径问题总结
在查找此任务时发现了一个重要的API路径问题：
- ❌ **错误路径**: `/api/v1/project/1/tasks/551` （单数 project）
- ✅ **正确路径**: `/api/v1/projects/1/tasks/551` （复数 projects）

这个问题可能影响了MCP集成中find_task接口的实现。

### 当前排序问题
- 点击表头（ID、标题、状态、创建时间等）进行排序不生效
- 没有任何响应或变化
- 默认排序不是按ID倒序

## 🎯 解决方案

### 1. 前端修复

#### 1.1 检查表头事件绑定
```typescript
// TaskListPage.tsx
const handleSort = (field: string) => {
  const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
  setSortField(field);
  setSortOrder(newOrder);
  
  // 重新获取数据
  fetchTasks({
    sort_by: field,
    order: newOrder,
    page: currentPage
  });
};
```

#### 1.2 添加排序指示器
```tsx
<th onClick={() => handleSort('id')} className="sortable-header">
  ID 
  {sortField === 'id' && (
    <span className="sort-arrow">
      {sortOrder === 'asc' ? '↑' : '↓'}
    </span>
  )}
</th>
```

### 2. 后端API支持

#### 2.1 确认API参数处理
```go
// task_handler.go
func GetTasks(c *gin.Context) {
    sortBy := c.DefaultQuery("sort_by", "id")
    order := c.DefaultQuery("order", "desc")
    
    // 白名单验证
    validSortFields := []string{"id", "title", "status", "created_at", "updated_at", "priority"}
    if !contains(validSortFields, sortBy) {
        sortBy = "id"
    }
    
    if order != "asc" && order != "desc" {
        order = "desc"
    }
    
    // 应用排序
    query = query.Order(fmt.Sprintf("%s %s", sortBy, order))
}
```

### 3. 状态持久化

#### 3.1 URL参数方式
```typescript
// 保存到URL
const updateURL = () => {
  const params = new URLSearchParams();
  params.set('sort_by', sortField);
  params.set('order', sortOrder);
  history.push(`?${params.toString()}`);
};
```

#### 3.2 localStorage备份
```typescript
// 保存到localStorage
useEffect(() => {
  localStorage.setItem('taskListSort', JSON.stringify({
    field: sortField,
    order: sortOrder
  }));
}, [sortField, sortOrder]);

// 恢复排序状态
useEffect(() => {
  const saved = localStorage.getItem('taskListSort');
  if (saved) {
    const { field, order } = JSON.parse(saved);
    setSortField(field);
    setSortOrder(order);
  }
}, []);
```

## 🧪 测试要点

### 前端测试
1. 点击表头触发排序
2. 排序指示器显示正确
3. URL参数更新
4. 刷新后保持排序

### 后端测试
1. API接受sort_by和order参数
2. 参数验证（白名单）
3. SQL注入防护
4. 性能（大数据量）

### 集成测试
```bash
# 测试默认排序
curl "http://localhost:8081/api/v1/projects/1/tasks" -H "Authorization: Bearer $TOKEN"

# 测试自定义排序
curl "http://localhost:8081/api/v1/projects/1/tasks?sort_by=created_at&order=asc" -H "Authorization: Bearer $TOKEN"
```

## 📝 实施步骤

1. **前端修复**（2小时）
   - [ ] 修复表头点击事件
   - [ ] 添加排序指示器
   - [ ] 实现状态持久化

2. **后端验证**（1小时）
   - [ ] 确认API参数支持
   - [ ] 添加参数验证
   - [ ] 测试排序功能

3. **集成测试**（1小时）
   - [ ] 端到端测试
   - [ ] 性能测试
   - [ ] 用户验收测试

## ✅ 验收标准

- [ ] 默认进入列表时，按ID倒序显示
- [ ] 点击任一可排序列表头，列表正确排序
- [ ] 排序方向有视觉指示（↑/↓）
- [ ] 刷新页面后保留排序设置
- [ ] 分页时保持当前排序
- [ ] API参数包含正确的sort_by与order
- [ ] 无SQL注入风险
- [ ] 测试覆盖率>80%

## 🔗 相关资源

- 任务API端点：`GET /api/v1/projects/1/tasks/551`
- 前端文件：`/frontend/src/pages/TaskListPage.tsx`
- 后端处理：`/backend/handlers/task_handler.go`
- 数据模型：`/backend/models/task.go`

## 📌 注意事项

1. **API路径**：确保使用正确的复数形式 `projects` 而不是 `project`
2. **认证**：所有API调用需要Bearer Token
3. **性能**：大数据量时考虑添加数据库索引
4. **安全**：严格验证排序字段，防止SQL注入

---
*文档创建于 2025-08-24*