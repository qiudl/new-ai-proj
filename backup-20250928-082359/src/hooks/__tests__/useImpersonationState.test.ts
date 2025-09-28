/**
 * useImpersonationState Hook 的单元测试
 */

import { renderHook, act } from '@testing-library/react';
import { useImpersonationState } from '../useImpersonationState';
import impersonationService from '../../services/impersonationService';

// Mock 模拟服务
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

// Mock timers
jest.useFakeTimers();

describe('useImpersonationState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('初始状态', () => {
    it('应该返回正确的初始状态', () => {
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });
      
      mockImpersonationService.checkPermissions.mockResolvedValue({
        canStartImpersonation: false,
        canExitImpersonation: false,
        canViewHistory: false,
        restrictedActions: []
      });

      const { result } = renderHook(() => useImpersonationState());

      expect(result.current.isImpersonating).toBe(false);
      expect(result.current.loading).toBe(true); // 初始加载状态
      expect(result.current.error).toBe(null);
      expect(result.current.enterpriseInfo).toBe(null);
      expect(result.current.sessionInfo).toBe(null);
      expect(result.current.originalUserInfo).toBe(null);
    });
  });

  describe('模拟状态管理', () => {
    it('应该正确处理开始模拟', async () => {
      const mockStartResponse = {
        success: true,
        message: '模拟开始成功',
        session: {
          sessionId: 'test-session-id',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T01:00:00Z',
          duration: 60,
          reason: '测试模拟'
        }
      };

      mockImpersonationService.startImpersonation.mockResolvedValue(mockStartResponse);
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: true,
        session: mockStartResponse.session,
        enterprise: {
          id: 1,
          name: '测试企业',
          code: 'TEST'
        },
        original_user: {
          id: 1,
          username: 'testuser'
        }
      });

      const { result } = renderHook(() => useImpersonationState());

      await act(async () => {
        await result.current.startImpersonation(1, '测试模拟');
      });

      expect(mockImpersonationService.startImpersonation).toHaveBeenCalledWith(1, '测试模拟');
      expect(result.current.isImpersonating).toBe(true);
      expect(result.current.sessionInfo).toEqual(mockStartResponse.session);
    });

    it('应该正确处理退出模拟', async () => {
      const mockExitResponse = {
        success: true,
        message: '退出模拟成功'
      };

      mockImpersonationService.exitImpersonation.mockResolvedValue(mockExitResponse);
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });

      const { result } = renderHook(() => useImpersonationState());

      await act(async () => {
        await result.current.exitImpersonation();
      });

      expect(mockImpersonationService.exitImpersonation).toHaveBeenCalled();
      expect(result.current.isImpersonating).toBe(false);
      expect(result.current.sessionInfo).toBe(null);
    });

    it('应该正确处理API错误', async () => {
      const mockError = new Error('API 调用失败');
      mockImpersonationService.startImpersonation.mockRejectedValue(mockError);

      const { result } = renderHook(() => useImpersonationState());

      await act(async () => {
        try {
          await result.current.startImpersonation(1, '测试');
        } catch (error) {
          // 预期的错误
        }
      });

      expect(result.current.error).toBe('API 调用失败');
    });
  });

  describe('权限管理', () => {
    it('应该正确加载和管理权限', async () => {
      const mockPermissions = {
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: ['delete_user']
      };

      mockImpersonationService.checkPermissions.mockResolvedValue(mockPermissions);
      mockImpersonationService.getStatus.mockResolvedValue({
        is_impersonating: false
      });

      const { result } = renderHook(() => useImpersonationState());

      // 等待初始加载完成
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.permissions).toEqual(mockPermissions);
    });
  });

  describe('会话时间管理', () => {
    it('应该正确计算剩余时间', async () => {
      const now = new Date('2023-01-01T00:30:00Z');
      const expiresAt = new Date('2023-01-01T01:00:00Z');
      
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const mockStatus = {
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: expiresAt.toISOString(),
          duration: 60,
          reason: '测试'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue(mockStatus);
      
      const { result } = renderHook(() => useImpersonationState());

      // 等待状态更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.sessionTimeLeft).toBe(1800); // 30分钟 = 1800秒
    });

    it('应该正确识别即将过期的会话', async () => {
      const now = new Date('2023-01-01T00:56:00Z');
      const expiresAt = new Date('2023-01-01T01:00:00Z');
      
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const mockStatus = {
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: expiresAt.toISOString(),
          duration: 60,
          reason: '测试'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue(mockStatus);
      
      const { result } = renderHook(() => useImpersonationState());

      // 等待状态更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isExpiringSoon).toBe(true);
      expect(result.current.isExpired).toBe(false);
    });

    it('应该正确识别已过期的会话', async () => {
      const now = new Date('2023-01-01T01:01:00Z');
      const expiresAt = new Date('2023-01-01T01:00:00Z');
      
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const mockStatus = {
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: expiresAt.toISOString(),
          duration: 60,
          reason: '测试'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue(mockStatus);
      
      const { result } = renderHook(() => useImpersonationState());

      // 等待状态更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.isExpired).toBe(true);
      expect(result.current.canPerformSensitiveActions).toBe(false);
    });
  });

  describe('警告系统', () => {
    it('应该在会话即将过期时生成警告', async () => {
      const now = new Date('2023-01-01T00:56:00Z');
      const expiresAt = new Date('2023-01-01T01:00:00Z');
      
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const mockStatus = {
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: expiresAt.toISOString(),
          duration: 60,
          reason: '测试'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue(mockStatus);
      
      const { result } = renderHook(() => useImpersonationState());

      // 等待状态更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.warnings).toHaveLength(1);
      expect(result.current.warnings[0].type).toBe('session_expiring_soon');
    });

    it('应该在会话过期时生成错误警告', async () => {
      const now = new Date('2023-01-01T01:01:00Z');
      const expiresAt = new Date('2023-01-01T01:00:00Z');
      
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const mockStatus = {
        is_impersonating: true,
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: expiresAt.toISOString(),
          duration: 60,
          reason: '测试'
        }
      };

      mockImpersonationService.getStatus.mockResolvedValue(mockStatus);
      
      const { result } = renderHook(() => useImpersonationState());

      // 等待状态更新
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.warnings).toHaveLength(1);
      expect(result.current.warnings[0].type).toBe('session_expired');
    });
  });

  describe('历史记录管理', () => {
    it('应该正确获取模拟历史记录', async () => {
      const mockHistory = {
        data: [
          {
            id: '1',
            enterpriseId: 1,
            enterpriseName: '测试企业',
            action: 'start',
            reason: '测试模拟',
            timestamp: '2023-01-01T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        pageSize: 10
      };

      mockImpersonationService.getHistory.mockResolvedValue(mockHistory);
      
      const { result } = renderHook(() => useImpersonationState());

      let history;
      await act(async () => {
        history = await result.current.getImpersonationHistory(1, 10);
      });

      expect(mockImpersonationService.getHistory).toHaveBeenCalledWith(1, 10);
      expect(history).toEqual(mockHistory);
    });
  });

  describe('定时器管理', () => {
    it('应该正确启动和停止状态刷新定时器', async () => {
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

      const { result, unmount } = renderHook(() => useImpersonationState());

      // 验证定时器启动
      expect(setInterval).toHaveBeenCalled();

      // 快进时间，验证定时刷新
      act(() => {
        jest.advanceTimersByTime(30000); // 30秒
      });

      // 验证API被调用
      expect(mockImpersonationService.getStatus).toHaveBeenCalled();

      // 清理组件，验证定时器被清除
      unmount();
      expect(clearInterval).toHaveBeenCalled();
    });
  });
});