/**
 * 统一的Token管理工具类
 * 解决项目中token处理逻辑不一致的问题
 * 
 * 主要功能：
 * - 统一token存储和获取
 * - 一致的过期时间检查
 * - 安全的token解析
 * - 完整的错误处理
 */

export interface TokenPayload {
  user_id?: number;
  userId?: number;
  sub?: number;
  username?: string;
  name?: string;
  email?: string;
  exp: number;
  iat?: number;
  roles?: string[];
  permissions?: string[];
}

export class TokenManager {
  private static readonly TOKEN_KEY = 'token';
  private static readonly USER_KEY = 'currentUser';
  
  /**
   * 获取存储的token
   */
  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token from localStorage:', error);
      return null;
    }
  }
  
  /**
   * 设置token到本地存储
   * @param token JWT token字符串
   */
  static setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      
      // 同时解析并存储用户信息
      const payload = this.getTokenPayload(token);
      if (payload) {
        const userInfo = {
          id: payload.user_id || payload.userId || payload.sub,
          username: payload.username || payload.name,
          email: payload.email,
          roles: payload.roles,
          permissions: payload.permissions
        };
        localStorage.setItem(this.USER_KEY, JSON.stringify(userInfo));
      }
    } catch (error) {
      console.error('Failed to set token to localStorage:', error);
    }
  }
  
  /**
   * 移除token和用户信息
   */
  static removeToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to remove token from localStorage:', error);
    }
  }
  
  /**
   * 检查token是否过期
   * 统一使用秒为单位进行比较，解决时间单位不一致问题
   * @param token 可选的token字符串，不传则使用存储的token
   */
  static isTokenExpired(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return true;
    
    try {
      const payload = this.getTokenPayload(tokenToCheck);
      if (!payload || !payload.exp) return true;
      
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      const expireTimeInSeconds = payload.exp;
      
      // 添加5秒的缓冲时间，避免网络延迟导致的边界问题
      const isExpired = currentTimeInSeconds >= (expireTimeInSeconds - 5);
      
      if (isExpired) {
        console.log('Token expired:', {
          currentTime: new Date(currentTimeInSeconds * 1000).toISOString(),
          expireTime: new Date(expireTimeInSeconds * 1000).toISOString(),
          remainingSeconds: expireTimeInSeconds - currentTimeInSeconds
        });
      }
      
      return isExpired;
    } catch (error) {
      console.error('Token expiry check failed:', error);
      return true;
    }
  }
  
  /**
   * 检查token是否有效（存在且未过期）
   */
  static isTokenValid(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }
  
  /**
   * 安全地解析token载荷
   * @param token 可选的token字符串，不传则使用存储的token
   */
  static getTokenPayload(token?: string): TokenPayload | null {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return null;
    
    try {
      // 验证JWT格式
      const parts = tokenToCheck.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT format: expected 3 parts');
        return null;
      }
      
      // 解码载荷
      const payload = JSON.parse(atob(parts[1]));
      
      // 基本验证
      if (typeof payload !== 'object' || payload === null) {
        console.error('Invalid JWT payload: not an object');
        return null;
      }
      
      return payload as TokenPayload;
    } catch (error) {
      console.error('Token payload parsing error:', error);
      return null;
    }
  }
  
  /**
   * 获取当前用户ID
   */
  static getCurrentUserId(): number | null {
    const payload = this.getTokenPayload();
    return payload?.user_id || payload?.userId || payload?.sub || null;
  }
  
  /**
   * 获取当前用户信息
   */
  static getCurrentUser(): { id: number; username?: string; email?: string } | null {
    const payload = this.getTokenPayload();
    if (!payload) return null;
    
    const userId = payload.user_id || payload.userId || payload.sub;
    if (!userId) return null;
    
    return {
      id: userId,
      username: payload.username || payload.name,
      email: payload.email
    };
  }
  
  /**
   * 获取token剩余有效时间（秒）
   */
  static getTokenRemainingTime(): number | null {
    const payload = this.getTokenPayload();
    if (!payload?.exp) return null;
    
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const remainingSeconds = payload.exp - currentTimeInSeconds;
    
    return Math.max(0, remainingSeconds);
  }
  
  /**
   * 检查token是否即将过期（默认5分钟内）
   * @param thresholdSeconds 过期阈值（秒），默认300秒（5分钟）
   */
  static isTokenExpiringSoon(thresholdSeconds: number = 300): boolean {
    const remainingTime = this.getTokenRemainingTime();
    return remainingTime !== null && remainingTime <= thresholdSeconds;
  }
  
  /**
   * 获取token的创建时间
   */
  static getTokenIssuedAt(): Date | null {
    const payload = this.getTokenPayload();
    if (!payload?.iat) return null;
    
    return new Date(payload.iat * 1000);
  }
  
  /**
   * 获取token的过期时间
   */
  static getTokenExpireAt(): Date | null {
    const payload = this.getTokenPayload();
    if (!payload?.exp) return null;
    
    return new Date(payload.exp * 1000);
  }
  
  /**
   * 验证token格式的合法性
   * @param token 要验证的token
   */
  static validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // 尝试解码各部分
      atob(parts[0]); // header
      atob(parts[1]); // payload
      // signature不需要解码验证
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 清除所有认证相关的存储
   * 用于登出或认证失败时的清理工作
   */
  static clearAuthData(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      
      // 清除其他可能的认证相关数据
      const authKeys = ['refreshToken', 'userPreferences', 'lastLoginTime'];
      authKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }
  
  /**
   * 获取token的调试信息
   * 用于开发和调试
   */
  static getTokenDebugInfo(): any {
    const token = this.getToken();
    if (!token) return { error: 'No token found' };
    
    const payload = this.getTokenPayload(token);
    const remainingTime = this.getTokenRemainingTime();
    const isExpired = this.isTokenExpired(token);
    const isExpiringSoon = this.isTokenExpiringSoon();
    
    return {
      hasToken: true,
      isValid: this.isTokenValid(),
      isExpired,
      isExpiringSoon,
      remainingTime,
      payload,
      issuedAt: this.getTokenIssuedAt(),
      expireAt: this.getTokenExpireAt(),
      currentTime: new Date(),
      tokenLength: token.length
    };
  }
}

// 默认导出类
export default TokenManager;