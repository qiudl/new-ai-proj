// 开发环境自动认证工具
import { getEnvironmentConfig } from './environmentDetection';

/**
 * 开发环境自动获取认证token
 */
export const getDevAuthToken = async (): Promise<string | null> => {
  const { isLocal } = getEnvironmentConfig();
  
  console.log('🔍 开发认证检查 - 环境:', { isLocal });
  
  // 只在本地开发环境执行
  if (!isLocal) {
    console.log('❌ 非本地开发环境，跳过自动认证');
    return null;
  }

  try {
    console.log('🚀 开始调用开发登录API...');
    const response = await fetch('/api/v1/auth/dev-quick-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'admin' })
    });

    console.log('📡 API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      console.warn('❌ 开发环境自动登录失败:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('📦 API响应数据:', data);
    
    if (data.success && data.data && data.data.access_token) {
      // 存储token和用户信息
      localStorage.setItem('token', data.data.access_token);
      localStorage.setItem('currentUser', JSON.stringify({
        id: data.data.user.id,
        username: data.data.user.username,
        role: data.data.user.role
      }));
      
      console.log('✅ 开发环境自动登录成功:', data.data.user.username);
      console.log('🔐 Token已存储到localStorage');
      return data.data.access_token;
    } else {
      console.warn('❌ 开发环境自动登录响应格式错误:', data);
      return null;
    }
  } catch (error) {
    console.warn('💥 开发环境自动登录异常:', error);
    return null;
  }
};

/**
 * 检查token有效性
 */
export const isTokenValid = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    // 检查是否过期（提前5分钟判断过期）
    if (payload.exp && payload.exp < (now + 300)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 确保有有效的认证token（开发环境下自动获取）
 */
export const ensureAuthToken = async (): Promise<boolean> => {
  const currentToken = localStorage.getItem('token');
  
  // 如果当前token有效，直接返回
  if (currentToken && isTokenValid(currentToken)) {
    return true;
  }

  // 清除无效token
  if (currentToken) {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  }

  // 在开发环境下尝试自动获取token
  const devToken = await getDevAuthToken();
  return devToken !== null;
};
