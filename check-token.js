
// 在浏览器Console中运行此代码检查token
function checkToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('❌ 未找到token');
    return;
  }
  
  try {
    // 解码JWT token
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('📋 Token信息:');
    console.log('- 用户ID:', payload.userId || payload.sub);
    console.log('- 过期时间:', new Date(payload.exp * 1000));
    console.log('- 当前时间:', new Date());
    console.log('- 是否过期:', payload.exp * 1000 < Date.now());
    
    if (payload.exp * 1000 < Date.now()) {
      console.log('❌ Token已过期');
    } else {
      console.log('✅ Token有效');
    }
    
  } catch (error) {
    console.log('❌ Token格式无效:', error);
  }
}

checkToken();
  