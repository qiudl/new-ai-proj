#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');

console.log('=== 时间管理页面诊断工具 ===\n');

// 检查基础页面响应
console.log('1. 检查页面基础响应...');
const req = http.get('http://localhost/time-management', (res) => {
  console.log(`   状态码: ${res.statusCode}`);
  console.log(`   内容类型: ${res.headers['content-type']}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`   响应长度: ${data.length} 字符`);
    
    // 检查是否包含React根元素
    if (data.includes('<div id="root">')) {
      console.log('   ✓ 包含React根元素');
    } else {
      console.log('   ✗ 未找到React根元素');
    }
    
    // 检查是否包含JS bundle引用
    if (data.includes('bundle.js')) {
      console.log('   ✓ 包含JavaScript bundle引用');
    } else {
      console.log('   ✗ 未找到JavaScript bundle引用');
    }
    
    console.log('\n2. 检查JavaScript bundle...');
    // 检查JS bundle是否可访问
    const bundleReq = http.get('http://localhost/static/js/bundle.js', (bundleRes) => {
      console.log(`   Bundle状态码: ${bundleRes.statusCode}`);
      
      if (bundleRes.statusCode === 200) {
        let bundleData = '';
        let receivedLength = 0;
        
        bundleRes.on('data', (chunk) => {
          receivedLength += chunk.length;
          if (bundleData.length < 1000) {
            bundleData += chunk;
          }
        });
        
        bundleRes.on('end', () => {
          console.log(`   Bundle大小: ${receivedLength} 字节`);
          
          // 检查bundle内容
          if (bundleData.includes('TimeManagementHomePage')) {
            console.log('   ✓ Bundle包含TimeManagementHomePage组件');
          } else {
            console.log('   ✗ Bundle中未找到TimeManagementHomePage组件');
          }
          
          console.log('\n3. 运行前端服务状态...');
          checkFrontendService();
        });
      } else {
        console.log(`   ✗ Bundle加载失败: ${bundleRes.statusCode}`);
        console.log('\n3. 运行前端服务状态...');
        checkFrontendService();
      }
    });
    
    bundleReq.on('error', (err) => {
      console.log(`   ✗ Bundle请求错误: ${err.message}`);
      console.log('\n3. 运行前端服务状态...');
      checkFrontendService();
    });
  });
});

req.on('error', (err) => {
  console.log(`   ✗ 页面请求错误: ${err.message}`);
  console.log('\n请检查前端服务是否正在运行！');
});

function checkFrontendService() {
  // 检查前端进程
  exec('ps aux | grep "react-scripts start" | grep -v grep', (error, stdout, stderr) => {
    if (stdout.trim()) {
      console.log('   ✓ React开发服务器正在运行');
      console.log(`   进程信息: ${stdout.trim()}`);
    } else {
      console.log('   ✗ React开发服务器未运行');
    }
    
    console.log('\n4. 检查前端构建状态...');
    checkBuildStatus();
  });
}

function checkBuildStatus() {
  // 检查前端构建是否有错误
  exec('cd /Users/johnqiu/coding/www/projects/new-ai-proj/frontend && npm run build 2>&1 | head -50', (error, stdout, stderr) => {
    if (error) {
      console.log('   构建检查失败，可能的原因:');
      console.log(`   ${error.message}`);
    } else {
      if (stdout.includes('Failed to compile') || stdout.includes('error')) {
        console.log('   ✗ 前端代码存在编译错误:');
        console.log(stdout);
      } else if (stdout.includes('Compiled successfully')) {
        console.log('   ✓ 前端代码编译成功');
      } else {
        console.log('   构建状态检查结果:');
        console.log(stdout.substring(0, 500));
      }
    }
    
    console.log('\n5. 检查API连接...');
    checkApiConnection();
  });
}

function checkApiConnection() {
  // 检查后端API是否可访问
  const apiReq = http.get('http://localhost/api/projects', (apiRes) => {
    console.log(`   API状态码: ${apiRes.statusCode}`);
    
    if (apiRes.statusCode === 200 || apiRes.statusCode === 401) {
      console.log('   ✓ 后端API服务正常');
    } else {
      console.log(`   ⚠ 后端API状态异常: ${apiRes.statusCode}`);
    }
    
    console.log('\n=== 诊断完成 ===');
    console.log('\n建议检查步骤:');
    console.log('1. 确认前端开发服务器正在运行: npm start');
    console.log('2. 检查浏览器控制台是否有JavaScript错误');
    console.log('3. 检查网络面板中的API请求状态');
    console.log('4. 确认用户已登录且有有效的JWT token');
  });
  
  apiReq.on('error', (err) => {
    console.log(`   ✗ API连接错误: ${err.message}`);
    console.log('\n=== 诊断完成 ===');
  });
}