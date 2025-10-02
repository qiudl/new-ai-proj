#!/usr/bin/env node

import axios from 'axios';

// 模拟过期Token的测试
async function testExpiredToken() {
  console.log('=== 测试过期Token错误提示 ===\n');

  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTk5ODI5NzQsIm5iZiI6MTc1OTM3ODE3NCwiaWF0IjoxNzU5Mzc4MTc0LCJqdGkiOiJiMDlkZTFlOGQ0YjY5MWM3ZjdlMTEwYjk5NDlhZmQ3MCJ9.buv1NJBVbDjJZeoaR8r2QF2Bj8d8GoTs-QFhuAHpREk';

  try {
    const response = await axios.get('http://localhost:8080/api/v1/tasks', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      },
      params: { page: 1, limit: 5 }
    });
    console.log('Success:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Error Response:', JSON.stringify(error.response.data, null, 2));

      // 模拟MCP的错误处理逻辑
      const status = error.response.status;
      const data = error.response.data;
      let errorMessage = data?.message || data?.error || error.message;

      console.log('\n=== MCP错误处理结果 ===');
      if (status === 401) {
        if (errorMessage.toLowerCase().includes('token') &&
            (errorMessage.toLowerCase().includes('expired') ||
             errorMessage.toLowerCase().includes('过期') ||
             errorMessage.toLowerCase().includes('invalid'))) {
          console.log('✅ 新错误提示: Token已过期，请刷新Token后重试。提示：可使用 dev_quick_login 工具自动刷新');
        } else {
          console.log('旧错误提示: 认证失败，请检查API令牌');
        }
      }
    } else if (error.request) {
      console.log('❌ 旧的通用错误: 网络连接失败，请检查服务器是否正常运行');
    }
  }
}

testExpiredToken();
