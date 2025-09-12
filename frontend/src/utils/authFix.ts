// 开发环境认证修复工具
export const fixDevAuth = async (): Promise<boolean> => {
  try {
    console.log('🔧 开始修复开发环境认证...');
    
    // 直接调用开发环境登录API
    const response = await fetch('/api/v1/auth/dev-quick-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: 'admin' })
    });

    console.log('📡 登录API响应状态:', response.status);

    if (!response.ok) {
      console.error('❌ 开发环境登录失败:', response.status, response.statusText);
      return false;
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
      
      console.log('✅ 认证修复成功:', data.data.user.username);
      console.log('🔐 Token已存储:', data.data.access_token.substring(0, 20) + '...');
      
      // 触发页面刷新以重新加载数据
      window.location.reload();
      return true;
    } else {
      console.error('❌ API响应格式错误:', data);
      return false;
    }
  } catch (error) {
    console.error('💥 认证修复异常:', error);
    return false;
  }
};

// 检查当前认证状态
export const checkAuthStatus = (): void => {
  const token = localStorage.getItem('token');
  const currentUser = localStorage.getItem('currentUser');
  
  console.log('🔍 当前认证状态:');
  console.log('- Token存在:', !!token);
  console.log('- Token内容:', token ? token.substring(0, 20) + '...' : 'null');
  console.log('- 用户信息:', currentUser ? JSON.parse(currentUser) : 'null');
  
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const now = Date.now() / 1000;
        console.log('- Token过期时间:', new Date(payload.exp * 1000).toLocaleString());
        console.log('- Token有效性:', payload.exp > now ? '有效' : '已过期');
      }
    } catch (error) {
      console.log('- Token解析失败:', error);
    }
  }
};

// 在控制台中可用的全局函数
if (typeof window !== 'undefined') {
  (window as any).fixDevAuth = fixDevAuth;
  (window as any).checkAuthStatus = checkAuthStatus;
}