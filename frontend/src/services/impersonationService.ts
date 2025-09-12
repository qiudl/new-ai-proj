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
      console.log('🔍 获取模拟状态...');
      const response = await api.get<any>(`${this.baseUrl}/status`);
      
      console.log('✅ 模拟状态获取成功:', response);
      
      // API拦截器已经处理了标准响应格式，直接返回了data部分
      // response就是原始data内容
      if (response && typeof response.is_impersonating !== 'undefined') {
        return response;
      } else {
        throw new Error('无效的响应格式');
      }
    } catch (error: any) {
      console.error('❌ 获取模拟状态失败:', error);
      
      // 处理404或其他错误，返回默认状态
      if (error.response?.status === 404) {
        console.log('ℹ️ 模拟状态API不存在，返回默认非模拟状态');
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
      console.log('🚀 开始模拟企业:', { enterpriseId, reason });
      
      const requestData: StartImpersonationRequest = { reason };
      const response = await api.post<any>(
        `${this.baseUrl}/enterprise/${enterpriseId}`,
        requestData
      );
      
      console.log('✅ 模拟开始请求成功:', response);
      
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
      console.log('🚪 退出模拟...');
      
      const response = await api.post<any>(`${this.baseUrl}/exit`);
      
      console.log('✅ 退出模拟请求成功:', response);
      
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
      console.log('📋 获取模拟历史:', { page, pageSize, filters });
      
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
      
      console.log('✅ 获取模拟历史成功:', response);
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
      console.log('🛑 强制退出会话:', sessionId);
      
      const response = await api.post<ApiResponse>(`${this.baseUrl}/force-exit/${sessionId}`);
      
      console.log('✅ 强制退出会话成功:', response);
      return response;
    } catch (error: any) {
      console.error('❌ 强制退出会话失败:', error);
      throw this.handleError(error, '强制退出会话失败');
    }
  }

  /**
   * 验证模拟权限
   */
  async checkPermissions(): Promise<{
    canStartImpersonation: boolean;
    canExitImpersonation: boolean;
    canViewHistory: boolean;
    restrictedActions: string[];
  }> {
    try {
      console.log('🔐 检查模拟权限...');
      
      const response = await api.get<ApiResponse<any>>(`${this.baseUrl}/permissions`);
      
      if (response.success && response.data) {
        console.log('✅ 权限检查成功:', response.data);
        return response.data;
      } else {
        // 如果API不存在，返回默认权限
        console.log('ℹ️ 权限检查API不存在，返回默认权限');
        return {
          canStartImpersonation: false,
          canExitImpersonation: false,
          canViewHistory: false,
          restrictedActions: []
        };
      }
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
   */
  async getActiveSessions(): Promise<ImpersonationHistoryItem[]> {
    try {
      console.log('🔍 获取活跃模拟会话...');
      
      const response = await api.get<ApiResponse<ImpersonationHistoryItem[]>>(`${this.baseUrl}/active-sessions`);
      
      if (response.success && response.data) {
        console.log('✅ 获取活跃会话成功:', response.data);
        return response.data;
      } else {
        return [];
      }
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
      console.log('🔄 刷新模拟令牌...');
      
      const response = await api.post<{ token: string }>(`${this.baseUrl}/refresh-token`);
      
      console.log('✅ 刷新令牌成功');
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
      console.log('📊 获取模拟统计信息...');
      
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await api.get<any>(`${this.baseUrl}/stats?${params.toString()}`);
      
      console.log('✅ 获取统计信息成功:', response);
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
      console.log('⏰ 延长模拟会话:', minutes, '分钟');
      
      const response = await api.post<{ session: ImpersonationSession }>(
        `${this.baseUrl}/extend`,
        { minutes }
      );
      
      console.log('✅ 延长会话成功:', response);
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
      console.log('🔒 验证模拟权限:', { action, enterpriseId });
      
      const response = await api.post<any>(`${this.baseUrl}/validate-permission`, {
        action,
        enterpriseId
      });
      
      console.log('✅ 权限验证成功:', response);
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
      console.log('📋 获取审计日志:', { sessionId, page, pageSize });
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });

      if (sessionId) {
        params.append('session_id', sessionId);
      }

      const response = await api.get<any>(`${this.baseUrl}/audit-logs?${params.toString()}`);
      
      console.log('✅ 获取审计日志成功:', response);
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
      console.log('🛑 管理员强制终止会话:', { sessionId, reason });
      
      await api.post(`${this.baseUrl}/admin/terminate/${sessionId}`, {
        reason
      });
      
      console.log('✅ 强制终止会话成功');
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
      console.log('🔍 批量检查企业模拟权限:', enterpriseIds);
      
      const response = await api.post<any>(`${this.baseUrl}/batch-check-permissions`, {
        enterpriseIds
      });
      
      console.log('✅ 批量权限检查成功:', response);
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