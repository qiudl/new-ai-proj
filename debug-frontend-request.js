#!/usr/bin/env node

// 测试前端请求工具是否正确处理AI配置API响应

const http = require('http');

// 模拟前端的request工具
class MockRequest {
  async get(url) {
    console.log(`📞 发起GET请求: ${url}`);
    
    // 模拟request.ts中的响应处理逻辑
    const response = await this.fetch(`http://localhost:8080${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InN5c3RlbSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsImlhdCI6MTc1Mzc5NjU0OSwiZXhwIjoxNzUzODAwMTQ5LCJpc3MiOiJhaS1wcm9qZWN0LWJhY2tlbmQiLCJzdWIiOiJzeXN0ZW0ifQ.4rRP8VfdZbv-BSxtM3CoTQ5U1bXIf-Hr-OjYrH0kup0'
      }
    });
    
    return response;
  }
  
  async fetch(url, options) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: options.method,
        headers: options.headers
      };
      
      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`📋 原始响应状态: ${res.statusCode}`);
          console.log(`📄 原始响应体:`, data);
          
          if (!res.statusCode || res.statusCode >= 400) {
            console.log('❌ HTTP错误状态码');
            resolve({
              success: false,
              message: `HTTP ${res.statusCode}: ${res.statusMessage}`,
              code: res.statusCode.toString(),
            });
            return;
          }
          
          try {
            const jsonData = JSON.parse(data);
            console.log('✅ JSON解析成功');
            console.log('📊 解析后的数据结构分析:');
            console.log(`  - success: ${jsonData.success} (${typeof jsonData.success})`);
            console.log(`  - data存在: ${jsonData.data ? '是' : '否'} (${typeof jsonData.data})`);
            if (jsonData.data) {
              console.log(`  - data是数组: ${Array.isArray(jsonData.data)}`);
              if (Array.isArray(jsonData.data)) {
                console.log(`  - 数组长度: ${jsonData.data.length}`);
              }
            }
            console.log(`  - message: ${jsonData.message}`);
            
            // 模拟request.ts中的响应拦截器
            resolve({
              success: true,
              data: jsonData,
              message: jsonData.message,
            });
          } catch (error) {
            console.log('❌ JSON解析失败:', error.message);
            resolve({
              success: false,
              message: '响应数据格式错误',
              code: 'PARSE_ERROR',
            });
          }
        });
      });
      
      req.on('error', (error) => {
        console.log('❌ 请求失败:', error.message);
        resolve({
          success: false,
          message: error.message,
          code: 'NETWORK_ERROR',
        });
      });
      
      req.end();
    });
  }
}

// 测试函数
async function testFrontendRequest() {
  console.log('🔍 测试前端请求工具处理AI配置API...\n');
  
  const request = new MockRequest();
  const result = await request.get('/api/v1/system/ai-configs');
  
  console.log('\n📋 前端收到的最终结果:');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n🔍 前端代码条件检查:');
  const configData = result;
  console.log(`configData.success: ${configData.success}`);
  console.log(`configData.data: ${configData.data ? '存在' : '不存在'}`);
  if (configData.data) {
    console.log(`Array.isArray(configData.data): ${Array.isArray(configData.data)}`);
  }
  
  const condition = configData.success && configData.data && Array.isArray(configData.data);
  console.log(`\n最终条件结果: ${condition}`);
  
  if (condition) {
    console.log('✅ 前端条件检查通过，应该成功处理');
  } else {
    console.log('❌ 前端条件检查失败，会进入错误分支');
  }
}

if (require.main === module) {
  testFrontendRequest();
}
