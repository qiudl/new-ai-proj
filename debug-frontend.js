// 前端文档列表调试脚本
// 在浏览器控制台中逐步执行以下代码来诊断问题

console.log('🔍 开始文档列表调试...');
console.log('='.repeat(50));

// 1. 检查Token状态
console.log('1️⃣ 检查Token状态:');
const token = localStorage.getItem('token');
console.log('Token存在:', !!token);
console.log('Token长度:', token?.length || 0);
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token用户:', payload.username);
    console.log('Token过期时间:', new Date(payload.exp * 1000));
    console.log('Token是否过期:', payload.exp < Date.now() / 1000);
  } catch (e) {
    console.log('❌ Token解析失败:', e.message);
  }
} else {
  console.log('❌ Token不存在');
}

console.log('');

// 2. 检查API配置
console.log('2️⃣ 检查API配置:');
console.log('当前页面URL:', window.location.href);
console.log('API Base URL:', process?.env?.REACT_APP_API_URL || '未配置');

console.log('');

// 3. 手动测试API调用
console.log('3️⃣ 测试API调用:');
if (token) {
  fetch('/api/v1/documents', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries([...response.headers.entries()]));
    return response.text();
  })
  .then(text => {
    console.log('原始响应:', text);
    try {
      const data = JSON.parse(text);
      console.log('解析后数据:', data);
      if (data.success && data.data) {
        console.log('✅ API调用成功!');
        console.log('文档数量:', data.data.length);
        console.log('前3个文档:', data.data.slice(0, 3));
      } else {
        console.log('❌ API返回错误:', data);
      }
    } catch (e) {
      console.log('❌ JSON解析失败:', e.message);
    }
  })
  .catch(error => {
    console.log('❌ 网络请求失败:', error);
  });
} else {
  console.log('❌ 无法测试，Token不存在');
}

console.log('');

// 4. 检查前端服务状态
console.log('4️⃣ 检查前端服务状态:');
console.log('React开发模式:', process?.env?.NODE_ENV);
console.log('当前域名:', window.location.hostname);
console.log('当前端口:', window.location.port);

console.log('');

// 5. 检查unifiedDocumentService
console.log('5️⃣ 检查文档服务:');
// 这个需要在实际页面中执行
try {
  // 检查是否能访问unifiedDocumentService
  console.log('unifiedDocumentService可用:', typeof window.unifiedDocumentService !== 'undefined');
} catch (e) {
  console.log('unifiedDocumentService检查失败:', e.message);
}

console.log('');
console.log('='.repeat(50));
console.log('📋 请将以上结果截图或复制给我分析');
