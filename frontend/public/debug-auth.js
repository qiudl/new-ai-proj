// 临时调试脚本 - 检查前端认证状态
console.log('=== 前端认证状态检查 ===');

// 1. 检查localStorage中的token
const token = localStorage.getItem('token');
console.log('localStorage token:', token ? 'exists' : 'not found');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
    console.log('Token expires:', new Date(payload.exp * 1000));
    console.log('Token valid:', payload.exp > Date.now() / 1000);
  } catch (e) {
    console.log('Token parse error:', e);
  }
}

// 2. 检查当前用户
const user = localStorage.getItem('currentUser');
console.log('Current user:', user);

// 3. 测试自动认证API
fetch('/api/v1/auth/dev-quick-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin' })
})
.then(r => r.json())
.then(data => {
  console.log('自动认证API测试:', data);
  if (data.success) {
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.data.user));
    console.log('✅ Token已更新');
    
    // 4. 测试项目API
    return fetch('/api/v1/projects', {
      headers: { 'Authorization': `Bearer ${data.data.token}` }
    });
  }
})
.then(r => r?.json())
.then(data => {
  if (data) {
    console.log('项目API测试:', data);
    console.log('项目数量:', data.data?.data?.length || 0);
  }
})
.catch(e => console.error('测试失败:', e));

console.log('=== 检查完成，查看上方结果 ===');
