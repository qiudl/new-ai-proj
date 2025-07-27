// 简单的前端测试脚本
const axios = require('axios');

console.log('=== 前端API调用测试 ===\n');

async function testAPIConnections() {
  const tests = [
    {
      name: '直接API调用 - 项目列表',
      url: 'http://localhost/api/projects',
      headers: {}
    },
    {
      name: '前端配置的API - 项目列表', 
      url: 'http://localhost:8080/api/v1/projects',
      headers: {}
    },
    {
      name: '后端服务器直接调用',
      url: 'http://localhost:8080/api/projects',
      headers: {}
    }
  ];

  for (const test of tests) {
    try {
      console.log(`测试: ${test.name}`);
      const response = await axios.get(test.url, { 
        headers: test.headers,
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500; // 允许所有非5xx状态码
        }
      });
      
      console.log(`  状态码: ${response.status}`);
      console.log(`  响应头: ${JSON.stringify(response.headers, null, 2)}`);
      
      if (response.status === 200) {
        console.log(`  ✓ 成功 - 响应长度: ${JSON.stringify(response.data).length} 字符`);
      } else if (response.status === 401) {
        console.log(`  ⚠ 需要认证 - 这是正常的，需要登录`);
      } else {
        console.log(`  ✗ 错误状态 - ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`  ✗ 请求失败: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`    连接被拒绝 - 服务可能未运行`);
      }
    }
    console.log('');
  }
}

// 检查前端的环境变量设置
console.log('前端环境变量设置:');
console.log('REACT_APP_API_URL应该设置为: http://localhost/api');
console.log('当前设置可能是: http://localhost:8080/api/v1');
console.log('');

testAPIConnections();