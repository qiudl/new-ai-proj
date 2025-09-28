# 任务详情页刷新机制修复验证

## 问题分析
1. **根本原因**: TaskDetailPageNew.tsx 中重复包装了 RefreshConfigProvider，导致双重嵌套
2. **具体问题**: App.tsx 已经全局提供了 RefreshConfigProvider，TaskDetailPageNew 再次包装创建了新的 context 实例
3. **影响**: 内层的 RefreshConfigProvider 覆盖了外层的 context，导致刷新配置无法正确传递给组件

## 修复内容
1. **移除重复包装**: 删除 TaskDetailPageNew.tsx 中的 `<RefreshConfigProvider>` 包装
2. **简化导出**: 直接导出 TaskDetailPageNew 组件而不是包装后的组件
3. **清理导入**: 移除不再需要的 RefreshConfigProvider 导入

## 修复前后对比

### 修复前:
```tsx
// TaskDetailPageNew.tsx
import { RefreshConfigProvider } from '../contexts/RefreshConfigContext';

export default function WrappedTaskDetailPageNew() {
  return (
    <RefreshConfigProvider>  // 重复嵌套！
      <TaskDetailPageNew />
    </RefreshConfigProvider>
  );
}
```

### 修复后:
```tsx
// TaskDetailPageNew.tsx
export default TaskDetailPageNew;  // 直接导出，使用App.tsx中的全局Provider
```

## 验证要点
1. **刷新按钮可见**: UnifiedTaskRefresh 组件应该显示刷新按钮和进度条
2. **倒计时工作**: 应该能看到15秒倒计时（默认completionStatsInterval）
3. **手动刷新**: 点击刷新按钮应该能立即触发刷新
4. **配置生效**: RefreshConfigButton 应该能打开配置弹窗并生效
5. **页面可见性**: 切换标签页时应该暂停/恢复倒计时

## 测试方法
1. 访问任务详情页：http://localhost:3001/projects/1/tasks/2138
2. 查看"任务完成情况"卡片中是否有刷新按钮
3. 观察是否有倒计时进度环（15秒周期）
4. 在浏览器控制台运行: 
   ```javascript
   console.log(localStorage.getItem('taskDetailRefreshConfig'));
   ```
5. 切换浏览器标签页测试可见性检测

## 相关组件
- **UnifiedTaskRefresh**: 统一刷新组件，使用 useRefreshConfig() 获取配置
- **RefreshWithCountdown**: 倒计时刷新组件，实现定时器逻辑
- **RefreshConfigProvider**: 全局配置提供者（仅在 App.tsx 中）
- **RefreshConfigButton**: 配置按钮，允许用户自定义刷新设置