import impersonationService from '../impersonationService';
import api from '../api';
import { ImpersonationStatus, ImpersonationPermissions } from '../../types/impersonation';

// Mock the API
jest.mock('../api');
const mockApi = api as jest.Mocked<typeof api>;

describe('ImpersonationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatus', () => {
    it('应该成功获取模拟状态', async () => {
      const mockStatus: ImpersonationStatus = {
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
          code: 'TEST001'
        },
        original_user: {
          id: 1,
          username: 'admin'
        }
      };

      mockApi.get.mockResolvedValue({
        success: true,
        data: mockStatus
      });

      const result = await impersonationService.getStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/impersonate/status');
      expect(result).toEqual(mockStatus);
    });

    it('应该在API错误时返回默认状态', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 404 }
      });

      const result = await impersonationService.getStatus();

      expect(result).toEqual({ is_impersonating: false });
    });

    it('应该处理API响应错误', async () => {
      mockApi.get.mockResolvedValue({
        success: false,
        message: '获取状态失败'
      });

      await expect(impersonationService.getStatus()).rejects.toThrow('获取状态失败');
    });
  });

  describe('startImpersonation', () => {
    it('应该成功开始模拟', async () => {
      const mockResponse = {
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

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await impersonationService.startImpersonation(1, '测试模拟');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/admin/impersonate/enterprise/1',
        { reason: '测试模拟' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该处理模拟开始失败', async () => {
      const mockError = {
        response: {
          data: { message: '权限不足' },
          status: 403
        }
      };

      mockApi.post.mockRejectedValue(mockError);

      await expect(
        impersonationService.startImpersonation(1, '测试')
      ).rejects.toThrow('权限不足');
    });

    it('应该处理网络错误', async () => {
      const mockError = {
        request: {},
        message: 'Network Error'
      };

      mockApi.post.mockRejectedValue(mockError);

      await expect(
        impersonationService.startImpersonation(1, '测试')
      ).rejects.toThrow('网络连接失败，请检查网络连接');
    });
  });

  describe('exitImpersonation', () => {
    it('应该成功退出模拟', async () => {
      const mockResponse = {
        success: true,
        message: '退出模拟成功'
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await impersonationService.exitImpersonation();

      expect(mockApi.post).toHaveBeenCalledWith('/admin/impersonate/exit');
      expect(result).toEqual(mockResponse);
    });

    it('应该处理退出失败', async () => {
      const mockError = {
        response: {
          data: { error: '退出失败' },
          status: 500
        }
      };

      mockApi.post.mockRejectedValue(mockError);

      await expect(impersonationService.exitImpersonation()).rejects.toThrow('退出失败');
    });
  });

  describe('checkPermissions', () => {
    it('应该成功获取权限信息', async () => {
      const mockPermissions: ImpersonationPermissions = {
        canStartImpersonation: true,
        canExitImpersonation: true,
        canViewHistory: true,
        restrictedActions: []
      };

      mockApi.get.mockResolvedValue({
        success: true,
        data: mockPermissions
      });

      const result = await impersonationService.checkPermissions();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/impersonate/permissions');
      expect(result).toEqual(mockPermissions);
    });

    it('应该在API不存在时返回默认权限', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 404 }
      });

      const result = await impersonationService.checkPermissions();

      expect(result).toEqual({
        canStartImpersonation: false,
        canExitImpersonation: false,
        canViewHistory: false,
        restrictedActions: ['*']
      });
    });

    it('应该在权限不足时返回限制性权限', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 403 }
      });

      const result = await impersonationService.checkPermissions();

      expect(result).toEqual({
        canStartImpersonation: false,
        canExitImpersonation: false,
        canViewHistory: false,
        restrictedActions: ['*']
      });
    });
  });

  describe('getHistory', () => {
    it('应该成功获取历史记录', async () => {
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

      mockApi.get.mockResolvedValue(mockHistory);

      const result = await impersonationService.getHistory(1, 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/admin/impersonate/history?page=1&page_size=10'
      );
      expect(result).toEqual(mockHistory);
    });

    it('应该支持过滤参数', async () => {
      const mockHistory = { data: [], total: 0, page: 1, pageSize: 10 };
      mockApi.get.mockResolvedValue(mockHistory);

      await impersonationService.getHistory(1, 10, {
        userId: 1,
        enterpriseId: 2,
        action: 'start'
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        '/admin/impersonate/history?page=1&page_size=10&user_id=1&enterprise_id=2&action=start'
      );
    });
  });

  describe('getActiveSessions', () => {
    it('应该成功获取活跃会话', async () => {
      const mockSessions = [
        {
          id: '1',
          sessionId: 'session-1',
          enterpriseId: 1,
          enterpriseName: '企业A',
          userId: 1,
          username: 'user1',
          startedAt: '2023-01-01T00:00:00Z'
        }
      ];

      mockApi.get.mockResolvedValue({
        success: true,
        data: mockSessions
      });

      const result = await impersonationService.getActiveSessions();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/impersonate/active-sessions');
      expect(result).toEqual(mockSessions);
    });

    it('应该在API不存在时返回空数组', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 404 }
      });

      const result = await impersonationService.getActiveSessions();

      expect(result).toEqual([]);
    });
  });

  describe('getSessionStats', () => {
    it('应该成功获取统计信息', async () => {
      const mockStats = {
        totalSessions: 10,
        totalDuration: 600,
        averageDuration: 60,
        sessionsByUser: [
          {
            userId: 1,
            username: 'user1',
            sessionCount: 5,
            totalDuration: 300
          }
        ],
        sessionsByEnterprise: [
          {
            enterpriseId: 1,
            enterpriseName: '企业A',
            sessionCount: 3,
            totalDuration: 180
          }
        ]
      };

      mockApi.get.mockResolvedValue(mockStats);

      const result = await impersonationService.getSessionStats();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/impersonate/stats?');
      expect(result).toEqual(mockStats);
    });

    it('应该支持日期范围过滤', async () => {
      const mockStats = { totalSessions: 0 };
      mockApi.get.mockResolvedValue(mockStats);

      await impersonationService.getSessionStats('2023-01-01', '2023-01-31');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/admin/impersonate/stats?start_date=2023-01-01&end_date=2023-01-31'
      );
    });
  });

  describe('extendSession', () => {
    it('应该成功延长会话', async () => {
      const mockSession = {
        session: {
          sessionId: 'test-session',
          enterpriseId: 1,
          startedAt: '2023-01-01T00:00:00Z',
          expiresAt: '2023-01-01T02:00:00Z', // 延长后的过期时间
          duration: 120, // 延长后的总时长
          reason: '测试'
        }
      };

      mockApi.post.mockResolvedValue(mockSession);

      const result = await impersonationService.extendSession(60);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/admin/impersonate/extend',
        { minutes: 60 }
      );
      expect(result).toEqual(mockSession.session);
    });

    it('应该使用默认延长时间', async () => {
      const mockSession = { session: {} };
      mockApi.post.mockResolvedValue(mockSession);

      await impersonationService.extendSession();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/admin/impersonate/extend',
        { minutes: 60 }
      );
    });
  });

  describe('validatePermission', () => {
    it('应该成功验证权限', async () => {
      const mockValidation = {
        allowed: true,
        reason: '权限验证通过'
      };

      mockApi.post.mockResolvedValue(mockValidation);

      const result = await impersonationService.validatePermission('start_impersonation', 1);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/admin/impersonate/validate-permission',
        {
          action: 'start_impersonation',
          enterpriseId: 1
        }
      );
      expect(result).toEqual(mockValidation);
    });

    it('应该处理权限验证失败', async () => {
      const mockValidation = {
        allowed: false,
        reason: '权限不足',
        restrictions: ['sensitive_operations']
      };

      mockApi.post.mockResolvedValue(mockValidation);

      const result = await impersonationService.validatePermission('sensitive_action');

      expect(result.allowed).toBe(false);
      expect(result.restrictions).toContain('sensitive_operations');
    });
  });

  describe('batchCheckEnterprisePermissions', () => {
    it('应该成功批量检查权限', async () => {
      const mockPermissions = {
        1: { canImpersonate: true },
        2: { canImpersonate: false, reason: '企业已暂停' },
        3: { canImpersonate: true }
      };

      mockApi.post.mockResolvedValue(mockPermissions);

      const result = await impersonationService.batchCheckEnterprisePermissions([1, 2, 3]);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/admin/impersonate/batch-check-permissions',
        { enterpriseIds: [1, 2, 3] }
      );
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('getAuditLogs', () => {
    it('应该成功获取审计日志', async () => {
      const mockLogs = {
        logs: [
          {
            id: '1',
            sessionId: 'session-1',
            action: 'start_impersonation',
            details: { enterpriseId: 1 },
            timestamp: '2023-01-01T00:00:00Z',
            ipAddress: '192.168.1.1'
          }
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1
        }
      };

      mockApi.get.mockResolvedValue(mockLogs);

      const result = await impersonationService.getAuditLogs('session-1', 1, 20);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/admin/impersonate/audit-logs?page=1&page_size=20&session_id=session-1'
      );
      expect(result).toEqual(mockLogs);
    });

    it('应该支持不指定会话ID', async () => {
      const mockLogs = { logs: [], pagination: {} };
      mockApi.get.mockResolvedValue(mockLogs);

      await impersonationService.getAuditLogs();

      expect(mockApi.get).toHaveBeenCalledWith(
        '/admin/impersonate/audit-logs?page=1&page_size=20'
      );
    });
  });

  describe('adminTerminateSession', () => {
    it('应该成功终止会话', async () => {
      mockApi.post.mockResolvedValue({});

      await impersonationService.adminTerminateSession('session-1', '违规操作');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/admin/impersonate/admin/terminate/session-1',
        { reason: '违规操作' }
      );
    });

    it('应该支持不指定原因', async () => {
      mockApi.post.mockResolvedValue({});

      await impersonationService.adminTerminateSession('session-1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/admin/impersonate/admin/terminate/session-1',
        { reason: undefined }
      );
    });
  });

  describe('错误处理', () => {
    it('应该正确处理HTTP错误响应', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: '请求参数错误' }
        }
      };

      mockApi.get.mockRejectedValue(mockError);

      await expect(impersonationService.getStatus()).rejects.toThrow('请求参数错误');
    });

    it('应该正确处理网络错误', async () => {
      const mockError = {
        request: {},
        message: 'Network timeout'
      };

      mockApi.get.mockRejectedValue(mockError);

      await expect(impersonationService.getStatus()).rejects.toThrow('网络连接失败，请检查网络连接');
    });

    it('应该正确处理未知错误', async () => {
      const mockError = new Error('未知错误');

      mockApi.get.mockRejectedValue(mockError);

      await expect(impersonationService.getStatus()).rejects.toThrow('未知错误');
    });

    it('应该处理空的错误响应', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      };

      mockApi.get.mockRejectedValue(mockError);

      await expect(impersonationService.getStatus()).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });
});