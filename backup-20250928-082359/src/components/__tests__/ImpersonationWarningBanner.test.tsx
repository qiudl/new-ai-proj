import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImpersonationWarningBanner } from '../ImpersonationWarningBanner';
import { useImpersonationState } from '../../hooks/useImpersonationState';

// Mock the hook
jest.mock('../../hooks/useImpersonationState');
const mockUseImpersonationState = useImpersonationState as jest.MockedFunction<typeof useImpersonationState>;

describe('ImpersonationWarningBanner', () => {
  const mockExitImpersonation = jest.fn();
  
  const defaultMockState = {
    isImpersonating: true,
    enterpriseInfo: {
      id: 1,
      name: '测试企业',
      code: 'TEST001'
    },
    sessionInfo: {
      sessionId: 'test-session',
      enterpriseId: 1,
      startedAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-01T01:00:00Z',
      duration: 60,
      reason: '测试模拟原因'
    },
    originalUserInfo: {
      id: 1,
      username: 'admin',
      role: 'admin'
    },
    sessionTimeLeft: 1800, // 30分钟
    isExpired: false,
    isExpiringSoon: false,
    exitImpersonation: mockExitImpersonation,
    loading: false,
    error: null,
    permissions: {
      canStartImpersonation: true,
      canExitImpersonation: true,
      canViewHistory: true,
      restrictedActions: []
    },
    warnings: [],
    canPerformSensitiveActions: true,
    startImpersonation: jest.fn(),
    refreshStatus: jest.fn(),
    getImpersonationHistory: jest.fn(),
    impersonationStatus: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseImpersonationState.mockReturnValue(defaultMockState);
  });

  describe('基础渲染', () => {
    it('应该在模拟状态下显示横幅', () => {
      render(<ImpersonationWarningBanner />);
      
      expect(screen.getByText(/您正在模拟企业账户/)).toBeInTheDocument();
      expect(screen.getByText(/测试企业/)).toBeInTheDocument();
      expect(screen.getByText(/TEST001/)).toBeInTheDocument();
    });

    it('不应该在非模拟状态下显示横幅', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        isImpersonating: false
      });

      const { container } = render(<ImpersonationWarningBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('应该显示原始用户信息', () => {
      render(<ImpersonationWarningBanner />);
      
      expect(screen.getByText(/原用户:/)).toBeInTheDocument();
      expect(screen.getByText(/admin/)).toBeInTheDocument();
    });

    it('应该显示模拟原因', () => {
      render(<ImpersonationWarningBanner />);
      
      expect(screen.getByText(/模拟原因:/)).toBeInTheDocument();
      expect(screen.getByText(/测试模拟原因/)).toBeInTheDocument();
    });
  });

  describe('时间管理', () => {
    it('应该显示剩余时间', () => {
      render(<ImpersonationWarningBanner />);
      
      expect(screen.getByText(/剩余时间:/)).toBeInTheDocument();
      expect(screen.getByText(/30:00/)).toBeInTheDocument(); // 30分钟
    });

    it('应该在即将过期时显示警告', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        sessionTimeLeft: 240, // 4分钟
        isExpiringSoon: true
      });

      render(<ImpersonationWarningBanner />);
      
      expect(screen.getByText(/即将过期/)).toBeInTheDocument();
    });

    it('应该在已过期时显示错误', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        sessionTimeLeft: 0,
        isExpired: true
      });

      render(<ImpersonationWarningBanner />);
      
      expect(screen.getByText(/会话已过期/)).toBeInTheDocument();
    });

    it('应该正确格式化时间显示', () => {
      // 测试小时:分钟:秒格式
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        sessionTimeLeft: 3661 // 1小时1分1秒
      });

      render(<ImpersonationWarningBanner />);
      expect(screen.getByText(/1:01:01/)).toBeInTheDocument();
    });
  });

  describe('用户交互', () => {
    it('应该能够最小化横幅', () => {
      render(<ImpersonationWarningBanner />);
      
      const minimizeButton = screen.getByText('—');
      fireEvent.click(minimizeButton);
      
      // 验证最小化后的视图
      expect(screen.queryByText(/您正在模拟企业账户/)).not.toBeInTheDocument();
      expect(screen.getByText(/模拟中: 测试企业/)).toBeInTheDocument();
    });

    it('应该能够从最小化状态恢复', () => {
      render(<ImpersonationWarningBanner />);
      
      // 先最小化
      const minimizeButton = screen.getByText('—');
      fireEvent.click(minimizeButton);
      
      // 再恢复
      const minimizedContent = screen.getByText(/模拟中: 测试企业/);
      fireEvent.click(minimizedContent);
      
      // 验证恢复后的视图
      expect(screen.getByText(/您正在模拟企业账户/)).toBeInTheDocument();
    });

    it('应该能够临时隐藏横幅', async () => {
      jest.useFakeTimers();
      
      render(<ImpersonationWarningBanner />);
      
      const hideButton = screen.getByText('×');
      fireEvent.click(hideButton);
      
      // 验证横幅被隐藏
      expect(screen.queryByText(/您正在模拟企业账户/)).not.toBeInTheDocument();
      
      // 快进10秒
      jest.advanceTimersByTime(10000);
      
      await waitFor(() => {
        // 验证横幅重新显示
        expect(screen.getByText(/您正在模拟企业账户/)).toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    it('应该能够退出模拟', () => {
      render(<ImpersonationWarningBanner />);
      
      const exitButton = screen.getByRole('button', { name: /退出模拟/i });
      expect(exitButton).toBeInTheDocument();
      
      // 点击退出按钮会触发Popconfirm，需要确认
      fireEvent.click(exitButton);
    });

    it('应该在loading状态下禁用退出按钮', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        loading: true
      });

      render(<ImpersonationWarningBanner />);
      
      const exitButton = screen.getByRole('button', { name: /退出模拟/i });
      expect(exitButton).toHaveClass('ant-btn-loading');
    });
  });

  describe('进度条显示', () => {
    it('应该显示正确的进度百分比', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        sessionTimeLeft: 1800 // 30分钟，总时长60分钟，已过30分钟
      });

      const { container } = render(<ImpersonationWarningBanner />);
      const progressBar = container.querySelector('.ant-progress');
      
      expect(progressBar).toBeInTheDocument();
      // 进度应该是50%（已过30分钟/总60分钟）
    });

    it('应该根据状态改变进度条颜色', () => {
      const { rerender, container } = render(<ImpersonationWarningBanner />);
      
      // 正常状态 - 绿色
      let progressBar = container.querySelector('.ant-progress-bg');
      expect(progressBar).toHaveStyle({ background: expect.stringContaining('#52c41a') });
      
      // 即将过期 - 橙色
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        isExpiringSoon: true,
        sessionTimeLeft: 240
      });
      rerender(<ImpersonationWarningBanner />);
      
      // 已过期 - 红色
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        isExpired: true,
        sessionTimeLeft: 0
      });
      rerender(<ImpersonationWarningBanner />);
    });
  });

  describe('警告提示', () => {
    it('应该显示审计警告信息', () => {
      render(<ImpersonationWarningBanner />);
      
      expect(screen.getByText(/模拟期间的所有操作将被审计记录/)).toBeInTheDocument();
    });

    it('应该根据状态显示不同的CSS类', () => {
      const { container, rerender } = render(<ImpersonationWarningBanner />);
      
      // 正常状态
      expect(container.firstChild).toHaveClass('impersonation-banner', 'active');
      
      // 即将过期状态
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        isExpiringSoon: true
      });
      rerender(<ImpersonationWarningBanner />);
      expect(container.firstChild).toHaveClass('impersonation-banner', 'expiring');
      
      // 已过期状态
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        isExpired: true
      });
      rerender(<ImpersonationWarningBanner />);
      expect(container.firstChild).toHaveClass('impersonation-banner', 'expired');
    });
  });

  describe('边界情况', () => {
    it('应该处理缺失的企业信息', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        enterpriseInfo: null
      });

      render(<ImpersonationWarningBanner />);
      
      // 不应该崩溃，应该优雅地处理
      expect(screen.getByText(/您正在模拟企业账户/)).toBeInTheDocument();
    });

    it('应该处理缺失的会话信息', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        sessionInfo: null,
        sessionTimeLeft: null
      });

      render(<ImpersonationWarningBanner />);
      
      // 不应该显示进度条
      const { container } = render(<ImpersonationWarningBanner />);
      const progressBar = container.querySelector('.ant-progress');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('应该处理缺失的原始用户信息', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockState,
        originalUserInfo: null
      });

      render(<ImpersonationWarningBanner />);
      
      // 应该能够正常渲染
      expect(screen.getByText(/您正在模拟企业账户/)).toBeInTheDocument();
    });
  });
});