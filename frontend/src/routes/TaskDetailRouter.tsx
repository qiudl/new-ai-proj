/**
 * TaskDetailRouter - 任务详情页路由组件
 *
 * Phase 4完成后直接使用新版TaskDetail页面
 * 保留Router结构以便未来灰度发布使用
 */

import React from 'react';
import { Spin } from 'antd';

// 延迟导入以支持代码分割
const TaskDetailPageRefactored = React.lazy(() => import('../pages/TaskDetail/TaskDetailPageRefactored'));

export const TaskDetailRouter: React.FC = () => {
  // 直接渲染新版本（Phase 4已完成全量替换）
  return (
    <React.Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            gap: '16px',
          }}
        >
          <Spin size="large" />
          <div style={{ color: '#1890ff', fontSize: '16px' }}>加载任务详情...</div>
        </div>
      }
    >
      <TaskDetailPageRefactored />
    </React.Suspense>
  );
};

TaskDetailRouter.displayName = 'TaskDetailRouter';

export default TaskDetailRouter;
