# 字段双重存储解决策略

## 🎯 策略概述

采用**直接字段优先**策略，确保数据一致性和查询性能。

## 📋 字段处理规则

### 1. 权威数据源定义
- **直接字段为权威**: `priority`, `estimated_hours`, `tags`
- **custom_fields作为备份**: 保留用于向后兼容和数据迁移

### 2. 读取优先级
```javascript
// 优先级: 直接字段 > custom_fields > 默认值
const priority = task.priority || task.custom_fields?.priority || 'low';
const estimatedHours = task.estimated_hours || task.custom_fields?.estimated_hours || 0;
const tags = task.tags || task.custom_fields?.tags || [];
```

### 3. 写入策略
```javascript
// 同时更新两个位置以保证兼容性
updateData.priority = newPriority;
updateData.custom_fields = {
  ...updateData.custom_fields,
  priority: newPriority
};
```

## 🔧 MCP接口修复方案

### 问题
当前MCP接口将这些字段都处理为直接字段，但某些数据仍存储在custom_fields中。

### 解决方案
实现智能字段处理逻辑：

```javascript
// 在updateTask方法中添加字段合并逻辑
const mergeFieldValues = (task, updates) => {
  const dualStorageFields = ['priority', 'estimated_hours', 'tags'];
  const mergedUpdates = { ...updates };
  
  dualStorageFields.forEach(field => {
    if (field in updates) {
      // 更新直接字段
      mergedUpdates[field] = updates[field];
      
      // 同时更新custom_fields保持兼容性
      if (!mergedUpdates.custom_fields) {
        mergedUpdates.custom_fields = { ...task.custom_fields };
      }
      mergedUpdates.custom_fields[field] = updates[field];
    }
  });
  
  return mergedUpdates;
};
```

## 📊 数据迁移计划

### Phase 1: 数据同步
- 扫描所有任务记录
- 将custom_fields中的值同步到直接字段
- 确保数据一致性

### Phase 2: 接口优化
- 更新MCP接口使用新的字段处理逻辑
- 更新前端组件使用直接字段
- 保留custom_fields的读取兼容性

### Phase 3: 渐进清理
- 监控一段时间确保稳定性
- 逐步清理custom_fields中的冗余数据
- 最终建立单一数据源

## 🔍 验证方案

### 数据一致性检查
```sql
-- 检查不一致的priority字段
SELECT id, title, priority, custom_fields->>'priority' as cf_priority
FROM tasks 
WHERE priority != (custom_fields->>'priority')::text 
   OR (priority IS NULL AND custom_fields->>'priority' IS NOT NULL)
   OR (priority IS NOT NULL AND custom_fields->>'priority' IS NULL);
```

### API测试用例
- 测试直接字段更新
- 测试custom_fields兼容性
- 测试混合数据的读取
- 测试边界情况处理

## 💡 最佳实践

1. **渐进式迁移**: 避免一次性大规模变更
2. **双写单读**: 更新时写入两处，读取时优先直接字段
3. **向后兼容**: 保持对旧数据格式的支持
4. **监控告警**: 建立数据不一致的监控机制

## 🚀 立即行动项

1. 修复MCP接口的字段处理逻辑
2. 实现数据一致性检查脚本
3. 更新API文档说明字段优先级
4. 建立数据迁移时间表