import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ImpersonationProvider, useImpersonation } from '../ImpersonationContext';
import impersonationService from '../../services/impersonationService';

// Mock the service
jest.mock('../../services/impersonationService');
const mockImpersonationService = impersonationService as jest.Mocked<typeof impersonationService>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ImpersonationContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ImpersonationProvider>{children}</ImpersonationProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('初始化', () => {
    it('应该提供初始状态', () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: false,
        canExitImpersonation: false,
        canViewHistory: false,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      expect(result.current.state.isImpersonating).toBe(false);
      expect(result.current.state.loading).toBe(true);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.sessionInfo).toBe(null);
    });

    it('应该在挂载时加载初始状态', async () => {
      const mockStatus = {
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T01:00:00Z',
          duration: 60,
          reason: '测试'
        },
        enterprise: {
          id: 1,
          name: '测试企业',
          code: 'TEST'
        },
        original_user: {
          id: 1,
          username: 'admin'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue(mockStatus);
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.isImpersonating).toBe(true);
        expect(result.current.state.sessionInfo).toEqual(mockStatus.session);
        expect(result.current.state.enterpriseInfo).toEqual(mockStatus.enterprise);
      });
    });
  });

  describe('开始模拟', () => {
    it('应该成功开始模拟', async () => {
      const mockStartResponse = {
        success: true,
        message: '模拟开始成功',
        session: {
          sessionId: 'new-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T01:00:00Z',
          duration: 60,
          reason: '测试模拟'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      mockImpersonationService.startImpersonation.mockResolvedValue(mockStartResponse);

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await act(async () => {
        await result.current.startImpersonation(1, '测试模拟');
      });

      expect(mockImpersonationService.startImpersonation).toHaveBeenCalledWith(1, '测试模拟');
      expect(result.current.state.loading).toBe(false);
    });

    it('应该处理开始模拟失败', async () => {
      const mockError = new Error('模拟开始失败');
      
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      mockImpersonationService.startImpersonation.mockRejectedValue(mockError);

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await act(async () => {
        try {
          await result.current.startImpersonation(1, '测试');
        } catch (error) {
          // 预期错误
        }
      });

      expect(result.current.state.error).toBe('模拟开始失败');
      expect(result.current.state.loading).toBe(false);
    });

    it('应该在权限不足时阻止开始模拟', async () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: false,
        canExitImpersonation: false,
        canViewHistory: false,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.startImpersonation(1, '测试');
        } catch (error: any) {
          expect(error.message).toContain('权限不足');
        }
      });

      expect(mockImpersonationService.startImpersonation).not.toHaveBeenCalled();
    });
  });

  describe('退出模拟', () => {
    it('应该成功退出模拟', async () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T01:00:00Z',
          duration: 60,
          reason: '测试'
        }
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      mockImpersonationService.exitImpersonation.mockResolvedValue({
        success: true,
        message: '退出成功'
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.isImpersonating).toBe(true);
      });

      await act(async () => {
        await result.current.exitImpersonation();
      });

      expect(mockImpersonationService.exitImpersonation).toHaveBeenCalled();
    });

    it('应该处理退出模拟失败', async () => {
      const mockError = new Error('退出失败');
      
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: true
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      mockImpersonationService.exitImpersonation.mockRejectedValue(mockError);

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await act(async () => {
        try {
          await result.current.exitImpersonation();
        } catch (error) {
          // 预期错误
        }
      });

      expect(result.current.state.error).toBe('退出失败');
    });
  });

  describe('刷新状态', () => {
    it('应该能够手动刷新状态', async () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });

      // 清除之前的调用
      mockImpersonationService.getStatus.mockClear();

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(mockImpersonationService.getStatus).toHaveBeenCalled();
    });

    it('应该定期自动刷新状态', async () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T01:00:00Z',
          duration: 60,
          reason: '测试'
        }
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.isImpersonating).toBe(true);
      });

      // 清除之前的调用
      mockImpersonationService.getStatus.mockClear();

      // 快进30秒
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockImpersonationService.getStatus).toHaveBeenCalled();
      });
    });
  });

  describe('历史记录', () => {
    it('应该能够获取模拟历史', async () => {
      const mockHistory = {
        data: [
          {
            id: '1',
            enterpriseId: 1,
            enterpriseName: '测试企业',
            action: 'start',
            reason: '测试',
            timestamp: '2023-01-01T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 10
      };

      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      mockImpersonationService.getHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      let history;
      await act(async () => {
        history = await result.current.getImpersonationHistory(1, 10);
      });

      expect(mockImpersonationService.getHistory).toHaveBeenCalledWith(1, 10);
      expect(history).toEqual(mockHistory);
    });

    it('应该在无权限时阻止获取历史', async () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: false,
        canExitImpersonation: false,
        canViewHistory: false,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.getImpersonationHistory(1, 10);
        } catch (error: any) {
          expect(error.message).toContain('权限不足');
        }
      });

      expect(mockImpersonationService.getHistory).not.toHaveBeenCalled();
    });
  });

  describe('本地存储', () => {
    it('应该在状态改变时保存到localStorage', async () => {
      const mockStatus = {
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T01:00:00Z',
          duration: 60,
          reason: '测试'
        },
        enterprise: {
          id: 1,
          name: '测试企业',
          code: 'TEST'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue(mockStatus);
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      renderHook(() => useImpersonation(), { wrapper });

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'impersonation_state',
          expect.stringContaining('test-session')
        );
      });
    });

    it('应该从localStorage恢复状态', () => {
      const savedState = {
        isImpersonating: true,
        sessionInfo: {
          sessionId: 'saved-session',
          enterpriseId: 2
        }
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: true
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      // 初始状态应该从localStorage恢复
      expect(result.current.state.sessionInfo?.sessionId).toBe('saved-session');
    });

    it('应该在退出模拟时清除localStorage', async () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: true
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      mockImpersonationService.exitImpersonation.mockResolvedValue({
        success: true,
        message: '退出成功'
      });

      const { result } = renderHook(() => useImpersonation(), { wrapper });

      await act(async () => {
        await result.current.exitImpersonation();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('impersonation_state');
    });
  });

  describe('清理', () => {
    it('应该在组件卸载时清理定时器', () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: true
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      });

      const { unmount } = renderHook(() => useImpersonation(), { wrapper });

      unmount();

      // 验证定时器被清理
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // 不应该有新的API调用
      expect(mockImpersonationService.getStatus).toHaveBeenCalledTimes(1); // 只有初始调用
    });
  });
});