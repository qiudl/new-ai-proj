#!/usr/bin/env node

import { spawn } from 'child_process';

// 直接设置MCP token的脚本
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTcyMTMyNTAsIm5iZiI6MTc1NjYwODQ1MCwiaWF0IjoxNzU2NjA4NDUwLCJqdGkiOiJmZWQ2YTYzOTZlNDk3ZTA5MDBkNWYyNTYzOGNhZTkyNyJ9.nw02FKdc9FQFFd0fNxlIrfDzjpxM9o3r93FUQisPmZE';

console.log('🔑 设置MCP token并测试list_tasks...');

// 设置环境变量并启动MCP
const env = { ...process.env };
env.TASK_API_TOKEN = token;
env.API_TOKEN = token;

const child = spawn('node', ['./mcp-task-bridge/dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: '/Users/johnqiu/coding/www/projects/new-ai-proj',
  env: env
});

let responseReceived = false;

child.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 1 && response.result) {
        console.log('✅ MCP服务已启动');
        
        // 测试list_tasks
        setTimeout(() => {
          console.log('\n📋 测试优化后的list_tasks (limit=3)');
          send({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'list_tasks',
              arguments: {
                limit: 3,
                page: 1
              }
            }
          });
        }, 1000);
      }
      
      if (response.id === 2) {
        responseReceived = true;
        console.log(`\n📊 list_tasks响应:`);
        
        if (response.result) {
          const content = response.result.content?.[0];
          if (content?.text) {
            try {
              const data = JSON.parse(content.text);
              if (data.success) {
                console.log(`✅ 成功！任务数量: ${data.data.tasks.length}/${data.data.total}`);
                console.log(`📄 分页: 第${data.data.pagination.page}页，共${data.data.pagination.totalPages}页`);
                console.log(`🎯 优化生效：响应大小 ${content.text.length} 字符 (vs 之前的84269+ tokens)`);
              } else {
                console.log(`❌ API错误: ${data.error}`);
              }
            } catch (e) {
              console.log(`📝 响应长度: ${content.text.length} 字符`);
            }
          }
        } else if (response.error) {
          console.log(`❌ MCP错误: ${response.error.message}`);
        }
        
        setTimeout(() => process.exit(0), 1000);
      }
      
    } catch (e) {
      // 忽略非JSON
    }
  });
});

function send(message) {
  child.stdin.write(JSON.stringify(message) + '\n');
}

// 初始化
send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    capabilities: {},
    clientInfo: { name: 'token-test', version: '1.0' }
  }
});

setTimeout(() => {
  if (!responseReceived) {
    console.log('⏰ 测试超时');
    process.exit(1);
  }
}, 15000);