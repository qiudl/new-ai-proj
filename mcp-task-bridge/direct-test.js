// MCP 测试脚本 - 使用 TypeScript 直接运行
import { TaskMCPServer } from './task-mcp.js';

const testServer = new TaskMCPServer();

async function testBasicConnection() {
  console.log('🧪 基础连接测试...');
  
  // 直接测试 API 连接
  try {
    const axios = await import('axios');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTg2MTUsIm5iZiI6MTc1NDExMzgxNSwiaWF0IjoxNzU0MTEzODE1fQ.HruXn6s19u0VPkiwuIkn9BS9UuFYytoNasTJ4hdi-j8';
    
    console.log('📡 直接测试 API...');
    const response = await axios.default.get('http://localhost/api/v1/projects/1/tasks', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      proxy: false
    });
    
    console.log('✅ 直接 API 调用成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 现在测试 MCP Server
    console.log('\n🔧 测试 MCP Server...');
    const listResult = await testServer.listTasks(1);
    console.log('MCP Server 结果:', JSON.stringify(listResult, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
      console.error('响应状态:', error.response.status);
    }
  }
}

testBasicConnection();