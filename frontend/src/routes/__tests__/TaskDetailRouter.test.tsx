/**
 * TaskDetailRouter 单元测试
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TaskDetailRouter } from '../TaskDetailRouter';
import { FeatureFlagService, FeatureFlag } from '../../utils/featureFlags';

// Mock页面组件
jest.mock('../../pages/TaskDetailPageNew', () => {
  return function TaskDetailPageNew() {
    return <div data-testid="task-detail-old">Old Task Detail Page</div>;
  };
});

jest.mock('../../pages/TaskDetail/TaskDetailPageRefactored', () => {
  return function TaskDetailPageRefactored() {
    return <div data-testid="task-detail-refactored">New Task Detail Page</div>;
  };
});

const renderWithRouter = (userId?: number) => {
  // 在render之前设置userId到localStorage
  if (userId !== undefined) {
    localStorage.setItem('userId', String(userId));
  } else {
    // 如果没有提供userId,确保localStorage中没有userId
    localStorage.removeItem('userId');
  }

  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailRouter />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('TaskDetailRouter', () => {
  beforeEach(() => {
    localStorage.clear();
    FeatureFlagService.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    FeatureFlagService.reset();
  });

  describe('版本路由', () => {
    it('应该在特性启用时渲染新版本', async () => {
      // 初始化FeatureFlag并设置100%灰度
      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 100,
          whitelistUsers: [],
          blacklistUsers: [],
          environmentOverride: false,
        },
      });

      // 设置路由路径
      window.history.pushState({}, '', '/projects/1/tasks/123');

      renderWithRouter(111);

      // 等待异步加载完成
      await waitFor(() => {
        const newVersion = screen.queryByTestId('task-detail-refactored');
        expect(newVersion).toBeInTheDocument();
      }, { timeout: 3000 });

      // 确保旧版本没有渲染
      expect(screen.queryByTestId('task-detail-old')).not.toBeInTheDocument();
    });

    it('应该在特性禁用时渲染旧版本', async () => {
      // 初始化FeatureFlag并禁用
      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 0,
          whitelistUsers: [],
          blacklistUsers: [],
          environmentOverride: false,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/123');

      renderWithRouter(111);

      // 等待异步加载完成
      await waitFor(() => {
        const oldVersion = screen.queryByTestId('task-detail-old');
        expect(oldVersion).toBeInTheDocument();
      }, { timeout: 3000 });

      // 确保新版本没有渲染
      expect(screen.queryByTestId('task-detail-refactored')).not.toBeInTheDocument();
    });

    it('应该对白名单用户显示新版本', async () => {
      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 0,
          whitelistUsers: [111],
          blacklistUsers: [],
          environmentOverride: false,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/123');

      renderWithRouter(111);

      await waitFor(() => {
        expect(screen.queryByTestId('task-detail-refactored')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该对黑名单用户显示旧版本', async () => {
      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 100,
          whitelistUsers: [],
          blacklistUsers: [222],
          environmentOverride: false,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/123');

      renderWithRouter(222);

      await waitFor(() => {
        expect(screen.queryByTestId('task-detail-old')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 100,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/123');

      renderWithRouter(111);

      // 初始加载状态应该显示
      expect(screen.getByText(/加载中/i)).toBeInTheDocument();
    });
  });

  describe('埋点', () => {
    it('应该记录版本选择到console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 100,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/123');

      renderWithRouter(111);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[TaskDetailRouter] Version selected'),
          expect.objectContaining({
            version: 'refactored',
            userId: 111,
            taskId: '123',
            projectId: '1',
          })
        );
      });

      consoleSpy.mockRestore();
    });

    it('应该调用analytics.track（如果存在）', async () => {
      const mockTrack = jest.fn();
      (window as any).analytics = { track: mockTrack };

      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 0,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/456');

      renderWithRouter(222);

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          'task_detail_version_selected',
          expect.objectContaining({
            version: 'old',
            userId: 222,
            taskId: 456,
            projectId: 1,
          })
        );
      });

      delete (window as any).analytics;
    });
  });

  describe('边界情况', () => {
    it('应该处理无userId的情况', async () => {
      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 100,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/123');

      // 不设置userId
      renderWithRouter();

      await waitFor(() => {
        // rolloutPercentage=100，即使没有userId也应该显示新版本
        expect(screen.queryByTestId('task-detail-refactored')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该处理无效的userId', async () => {
      localStorage.setItem('userId', 'invalid');

      FeatureFlagService.init({
        [FeatureFlag.NEW_TASK_DETAIL]: {
          enabled: true,
          rolloutPercentage: 100,
        },
      });

      window.history.pushState({}, '', '/projects/1/tasks/123');

      render(
        <BrowserRouter>
          <Routes>
            <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailRouter />} />
          </Routes>
        </BrowserRouter>
      );

      // 应该能正常渲染，不应该崩溃
      await waitFor(() => {
        const hasOldOrNew =
          screen.queryByTestId('task-detail-old') ||
          screen.queryByTestId('task-detail-refactored');
        expect(hasOldOrNew).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
