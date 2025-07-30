#!/usr/bin/env node

const http = require('http');

// 从环境变量或使用默认值
const HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.API_PORT || 8080;

// 测试AI配置API
async function testAIConfigAPI() {
  console.log('🔍 测试AI配置API...');
  console.log(`请求URL: http://${HOST}:${PORT}/api/v1/system/ai-configs`);
  
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/api/v1/system/ai-configs',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InN5c3RlbSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsImlhdCI6MTc1Mzc5NjU0OSwiZXhwIjoxNzUzODAwMTQ5LCJpc3MiOiJhaS1wcm9qZWN0LWJhY2tlbmQiLCJzdWIiOiJzeXN0ZW0ifQ.4rRP8VfdZbv-BSxtM3CoTQ5U1bXIf-Hr-OjYrH0kup0'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ 响应状态: ${res.statusCode}`);
        console.log(`📋 响应头:`, res.headers);
        console.log(`📄 响应体:`);
        
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
          
          // 分析数据结构
          console.log('\n🔍 数据结构分析:');
          console.log(`- success: ${jsonData.success} (类型: ${typeof jsonData.success})`);
          console.log(`- data: ${jsonData.data ? '存在' : '不存在'} (类型: ${typeof jsonData.data})`);
          if (jsonData.data) {
            console.log(`- data是数组: ${Array.isArray(jsonData.data)}`);
            if (Array.isArray(jsonData.data)) {
              console.log(`- 数组长度: ${jsonData.data.length}`);
              if (jsonData.data.length > 0) {
                console.log(`- 第一个元素结构:`, Object.keys(jsonData.data[0]));
              }
            } else {
              console.log(`- data结构:`, Object.keys(jsonData.data));
            }
          }
          console.log(`- message: ${jsonData.message}`);
          
          resolve(jsonData);
        } catch (error) {
          console.error('❌ JSON解析失败:', error.message);
          console.log('原始响应体:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.error('❌ 请求超时');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// 主函数
async function main() {
  try {
    await testAIConfigAPI();
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
