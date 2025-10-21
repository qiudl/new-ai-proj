import api from './api';
import {
  ImpersonationStatus,
  StartImpersonationRequest,
  StartImpersonationResponse,
  ExitImpersonationResponse,
  ImpersonationHistoryResponse,
  ImpersonationHistoryItem,
  ImpersonationSession,
  ImpersonationPermissions,
  ApiResponse
} from '../types/impersonation';

class ImpersonationService {
  private readonly baseUrl = '/admin/impersonate';

  /**
   * 获取当前模拟状态
   */
  async getStatus(): Promise<ImpersonationStatus> {
    try {
      const response = await api.get<any>(`${this.baseUrl}/status`);

      // 兼容两种响应格式:
      // 1. API拦截器已解包: {is_impersonating: false}
      // 2. 标准格式: {success: true, data: {is_impersonating: false}}

      // 如果是已解包的格式
      if (response && typeof response.is_impersonating !== 'undefined') {
        return response;
      }

      // 如果是标准响应格式(未被拦截器解包)
      if (response && response.data && typeof response.data.is_impersonating !== 'undefined') {
        return response.data;
      }

      throw new Error('无效的响应格式');
    } catch (error: any) {
      console.error('❌ 获取模拟状态失败:', error);

      // 处理404或其他错误，返回默认状态
      if (error.response?.status === 404) {
        return {
          is_impersonating: false
        };
      }

      throw error;
    }
  }

  /**
   * 开始模拟指定企业
   */
  async startImpersonation(enterpriseId: number, reason: string): Promise<StartImpersonationResponse> {
    try {
      
      const requestData: StartImpersonationRequest = { reason };
      const response = await api.post<any>(
        `${this.baseUrl}/enterprise/${enterpriseId}`,
        requestData
      );
      
      
      // API拦截器已经处理了标准响应格式，直接返回了data部分
      // 所以response就是data内容，包含 token, enterprise, message 等
      if (response && response.token && response.enterprise) {
        return {
          success: true,
          message: response.message || '模拟开始成功',
          token: response.token,
          enterprise: response.enterprise,
          session: response.impersonation_info || {
            id: response.impersonation_info?.session_id || '',
            started_at: response.impersonation_info?.started_at || new Date().toISOString(),
            expires_at: response.impersonation_info?.expires_at || '',
            reason: reason
          }
        };
      } else {
        throw new Error('无效的响应格式');
      }
    } catch (error: any) {
      console.error('❌ 开始模拟失败:', error);
      throw this.handleError(error, '开始模拟失败');
    }
  }

  /**
   * 退出模拟
   */
  async exitImpersonation(): Promise<ExitImpersonationResponse> {
    try {
      
      const response = await api.post<any>(`${this.baseUrl}/exit`);
      
      
      // API拦截器已经处理了标准响应格式，直接返回了data部分
      if (response && (response.token || response.original_user)) {
        return {
          success: true,
          message: response.message || '退出模拟成功',
          token: response.token || '',
          original_user: response.original_user || {
            id: 0,
            username: 'unknown',
            role: 'unknown'
          }
        };
      } else {
        throw new Error('无效的响应格式');
      }
    } catch (error: any) {
      console.error('❌ 退出模拟失败:', error);
      throw this.handleError(error, '退出模拟失败');
    }
  }

  /**
   * 获取模拟历史记录
   */
  async getHistory(page = 1, pageSize = 10, filters?: {
    userId?: number;
    enterpriseId?: number;
    action?: 'start' | 'end';
  }): Promise<ImpersonationHistoryResponse> {
    try {
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (filters) {
        if (filters.userId) {
          params.append('user_id', filters.userId.toString());
        }
        if (filters.enterpriseId) {
          params.append('enterprise_id', filters.enterpriseId.toString());
        }
        if (filters.action) {
          params.append('action', filters.action);
        }
      }

      const response = await api.get<ImpersonationHistoryResponse>(
        `${this.baseUrl}/history?${params.toString()}`
      );
      
      return response;
    } catch (error: any) {
      console.error('❌ 获取模拟历史失败:', error);
      throw this.handleError(error, '获取模拟历史失败');
    }
  }

  /**
   * 强制退出指定会话（系统管理员功能）
   */
  async forceExitSession(sessionId: string): Promise<ApiResponse> {
    try {
      
      const response = await api.post<ApiResponse>(`${this.baseUrl}/force-exit/${sessionId}`);
      
      return response;
    } catch (error: any) {
      console.error('❌ 强制退出会话失败:', error);
      throw this.handleError(error, '强制退出会话失败');
    }
  }

  /**
   * 验证模拟权限
   * Note: api interceptor auto-unwraps response, returns data directly
   */
  async checkPermissions(): Promise<{
    canStartImpersonation: boolean;
    canExitImpersonation: boolean;
    canViewHistory: boolean;
    restrictedActions: string[];
  }> {
    try {
      // Note: api interceptor auto-unwraps response, returns data directly
      const permissions: {
        canStartImpersonation: boolean;
        canExitImpersonation: boolean;
        canViewHistory: boolean;
        restrictedActions: string[];
      } = await api.get(`${this.baseUrl}/permissions`);

      return permissions;
    } catch (error: any) {
      console.error('❌ 检查模拟权限失败:', error);

      // 权限检查失败时，返回最保守的权限
      if (error.response?.status === 404 || error.response?.status === 403) {
        return {
          canStartImpersonation: false,
          canExitImpersonation: false,
          canViewHistory: false,
          restrictedActions: ['*']
        };
      }

      throw this.handleError(error, '检查模拟权限失败');
    }
  }

  /**
   * 获取活跃的模拟会话列表（系统管理员功能）
   * Note: api interceptor auto-unwraps response, returns data directly
   */
  async getActiveSessions(): Promise<ImpersonationHistoryItem[]> {
    try {
      // Note: api interceptor auto-unwraps response, returns data directly
      const sessions: ImpersonationHistoryItem[] = await api.get(`${this.baseUrl}/active-sessions`);

      return sessions || [];
    } catch (error: any) {
      console.error('❌ 获取活跃会话失败:', error);

      if (error.response?.status === 404) {
        return [];
      }

      throw this.handleError(error, '获取活跃会话失败');
    }
  }

  /**
   * 刷新当前模拟会话令牌
   */
  async refreshToken(): Promise<{ token: string }> {
    try {
      
      const response = await api.post<{ token: string }>(`${this.baseUrl}/refresh-token`);
      
      return response;
    } catch (error: any) {
      console.error('❌ 刷新令牌失败:', error);
      throw this.handleError(error, '刷新令牌失败');
    }
  }

  /**
   * 错误处理辅助方法
   */
  private handleError(error: any, defaultMessage: string): Error {
    if (error.response) {
      // API返回了错误响应
      const errorMessage = error.response.data?.message || 
                          error.response.data?.error || 
                          `HTTP ${error.response.status}: ${error.response.statusText}`;
      return new Error(errorMessage);
    } else if (error.request) {
      // 网络错误
      return new Error('网络连接失败，请检查网络连接');
    } else {
      // 其他错误
      return new Error(error.message || defaultMessage);
    }
  }

  /**
   * 检查是否处于模拟状态（同步方法，基于当前上下文）
   */
  isCurrentlyImpersonating(): boolean {
    // 这里可以检查localStorage或其他同步状态
    // 但主要应该依赖Context的状态
    return false; // 实际实现应该从Context获取
  }

  /**
   * 获取当前模拟的企业信息（同步方法）
   */
  getCurrentImpersonatedEnterprise(): { id: number; name: string } | null {
    // 实际实现应该从Context获取
    return null;
  }

  /**
   * 获取模拟会话统计信息
   */
  async getSessionStats(startDate?: string, endDate?: string): Promise<{
    totalSessions: number;
    totalDuration: number;
    averageDuration: number;
    sessionsByUser: Array<{
      userId: number;
      username: string;
      sessionCount: number;
      totalDuration: number;
    }>;
    sessionsByEnterprise: Array<{
      enterpriseId: number;
      enterpriseName: string;
      sessionCount: number;
      totalDuration: number;
    }>;
  }> {
    try {
      
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await api.get<any>(`${this.baseUrl}/stats?${params.toString()}`);
      
      return response;
    } catch (error: any) {
      console.error('❌ 获取统计信息失败:', error);
      throw this.handleError(error, '获取统计信息失败');
    }
  }

  /**
   * 延长当前模拟会话时间
   */
  async extendSession(minutes: number = 60): Promise<ImpersonationSession> {
    try {
      
      const response = await api.post<{ session: ImpersonationSession }>(
        `${this.baseUrl}/extend`,
        { minutes }
      );
      
      return response.session;
    } catch (error: any) {
      console.error('❌ 延长会话失败:', error);
      throw this.handleError(error, '延长会话失败');
    }
  }

  /**
   * 验证模拟权限
   */
  async validatePermission(action: string, enterpriseId?: number): Promise<{
    allowed: boolean;
    reason?: string;
    restrictions?: string[];
  }> {
    try {
      
      const response = await api.post<any>(`${this.baseUrl}/validate-permission`, {
        action,
        enterpriseId
      });
      
      return response;
    } catch (error: any) {
      console.error('❌ 权限验证失败:', error);
      throw this.handleError(error, '权限验证失败');
    }
  }

  /**
   * 获取模拟审计日志
   */
  async getAuditLogs(sessionId?: string, page: number = 1, pageSize: number = 20): Promise<{
    logs: Array<{
      id: string;
      sessionId: string;
      action: string;
      details: any;
      timestamp: string;
      ipAddress?: string;
      userAgent?: string;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });

      if (sessionId) {
        params.append('session_id', sessionId);
      }

      const response = await api.get<any>(`${this.baseUrl}/audit-logs?${params.toString()}`);
      
      return response;
    } catch (error: any) {
      console.error('❌ 获取审计日志失败:', error);
      throw this.handleError(error, '获取审计日志失败');
    }
  }

  /**
   * 管理员强制终止指定会话
   */
  async adminTerminateSession(sessionId: string, reason?: string): Promise<void> {
    try {
      
      await api.post(`${this.baseUrl}/admin/terminate/${sessionId}`, {
        reason
      });
      
    } catch (error: any) {
      console.error('❌ 强制终止会话失败:', error);
      throw this.handleError(error, '强制终止会话失败');
    }
  }

  /**
   * 批量获取企业模拟权限状态
   */
  async batchCheckEnterprisePermissions(enterpriseIds: number[]): Promise<{
    [enterpriseId: number]: {
      canImpersonate: boolean;
      reason?: string;
      restrictions?: string[];
    };
  }> {
    try {
      
      const response = await api.post<any>(`${this.baseUrl}/batch-check-permissions`, {
        enterpriseIds
      });
      
      return response;
    } catch (error: any) {
      console.error('❌ 批量权限检查失败:', error);
      throw this.handleError(error, '批量权限检查失败');
    }
  }
}

// 导出单例
const impersonationService = new ImpersonationService();
export default impersonationService;