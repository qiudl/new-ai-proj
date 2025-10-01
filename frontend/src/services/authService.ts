import api from './api';
import TokenManager from '../utils/tokenManager';

// Google认证相关接口定义
export interface GoogleConnectionStatus {
  is_connected: boolean;
  calendar_count?: number;
  last_sync_time?: string;
  user_email?: string;
}

export interface GoogleAuthResponse {
  success: boolean;
  data?: {
    auth_url: string;
    state: string;
  };
  message?: string;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 认证服务类
class AuthService {
  /**
   * 发起Google认证流程
   * 调用后端API获取Google OAuth认证URL
   */
  async initiateGoogleAuth(): Promise<GoogleAuthResponse> {
    try {
      const response = await api.get('/auth/google');
      return {
        success: true,
        ...response.data
      };
    } catch (error) {
      console.error('发起Google认证失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '发起认证失败'
      };
    }
  }

  /**
   * 获取Google连接状态
   * 检查用户是否已连接Google日历
   */
  async getGoogleConnectionStatus(): Promise<ApiResponse<GoogleConnectionStatus>> {
    try {
      const response = await api.get('/users/google-connection');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('获取Google连接状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取连接状态失败'
      };
    }
  }

  /**
   * 断开Google连接
   * 解除用户的Google日历集成
   */
  async disconnectGoogle(): Promise<ApiResponse> {
    try {
      const response = await api.delete('/users/google-connection');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('断开Google连接失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '断开连接失败'
      };
    }
  }

  /**
   * 登录用户
   * 基础登录功能
   */
  async login(credentials: { username: string; password: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const response = await api.post('/auth/login', credentials);
      
      // 处理后端返回的access_token
      const token = (response as any).data?.access_token || (response as any).data?.token;
      
      if ((response as any).success && token) {
        // 使用TokenManager保存token
        TokenManager.setToken(token);
      }
      
      return {
        success: true,
        data: {
          token: token,
          user: (response as any).data?.user
        }
      };
    } catch (error) {
      console.error('登录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败'
      };
    }
  }

  /**
   * 登出用户
   * 清除本地认证信息
   */
  async logout(): Promise<ApiResponse> {
    try {
      // 调用后端登出接口（如果存在）
      await api.post('/auth/logout');
    } catch (error) {
      // 即使后端登出失败，也要清除本地token
      console.warn('后端登出失败，但继续清除本地认证信息:', error);
    } finally {
      // 清除本地认证信息
      TokenManager.clearAuthData();
    }

    return {
      success: true,
      message: '登出成功'
    };
  }

  /**
   * 检查当前用户认证状态
   * 注意：后端暂不支持/auth/me端点，直接基于token有效性判断
   */
  async checkAuthStatus(): Promise<ApiResponse<{ user: any }>> {
    try {
      // 检查token是否存在且有效
      if (!TokenManager.isTokenValid()) {
        return {
          success: false,
          error: 'Token已过期或不存在'
        };
      }
      
      // 从TokenManager获取用户信息
      const user = TokenManager.getCurrentUser();
      if (!user) {
        return {
          success: false,
          error: '无法获取用户信息'
        };
      }
      
      return {
        success: true,
        data: { user }
      };
    } catch (error) {
      console.error('检查认证状态失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查认证状态失败'
      };
    }
  }

  /**
   * 获取当前存储的token
   */
  getToken(): string | null {
    return TokenManager.getToken();
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return TokenManager.isTokenValid();
  }

  /**
   * 获取当前用户ID
   * 通过TokenManager获取用户ID
   */
  getCurrentUserId(): number | null {
    return TokenManager.getCurrentUserId();
  }

  /**
   * 获取当前用户信息
   * 从TokenManager获取用户信息
   */
  getCurrentUser(): { id: number; username?: string } | null {
    return TokenManager.getCurrentUser();
  }

  /**
   * 刷新认证token（如果后端支持）
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await api.post('/auth/refresh');
      
      if ((response as any).success && (response as any).data?.token) {
        TokenManager.setToken((response as any).data.token);
      }
      
      return {
        success: true,
        data: {
          token: (response as any).data?.token
        }
      };
    } catch (error) {
      console.error('刷新token失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '刷新token失败'
      };
    }
  }
}

// 创建单例实例
export const authService = new AuthService();

// 默认导出
export default authService;