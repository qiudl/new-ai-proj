// 在浏览器控制台中运行此脚本来设置系统用户token
// 这样前端就可以访问AI配置API了

// 生成系统用户token
const systemToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InN5c3RlbSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsImlhdCI6MTc1Mzc5NjU0OSwiZXhwIjoxNzUzODAwMTQ5LCJpc3MiOiJhaS1wcm9qZWN0LWJhY2tlbmQiLCJzdWIiOiJzeXN0ZW0ifQ.4rRP8VfdZbv-BSxtM3CoTQ5U1bXIf-Hr-OjYrH0kup0';

// 设置到localStorage
localStorage.setItem('token', systemToken);

console.log('✅ 系统用户token已设置到localStorage');
console.log('现在可以刷新页面测试AI功能了');

// 验证token设置
const storedToken = localStorage.getItem('token');
if (storedToken === systemToken) {
  console.log('✅ Token验证成功');
} else {
  console.log('❌ Token设置失败');
}

// 显示token信息（解码）
try {
  const payload = JSON.parse(atob(systemToken.split('.')[1]));
  console.log('🔍 Token信息:', payload);
} catch (error) {
  console.error('❌ Token解析失败:', error);
}
