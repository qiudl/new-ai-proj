import { spawn } from 'child_process';

console.log('🧪 直接测试MCP优化后的list_tasks');

const child = spawn('node', ['./mcp-task-bridge/dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: '/Users/johnqiu/coding/www/projects/new-ai-proj'
});

let responseCount = 0;

child.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      
      if (response.id === 1 && response.result) {
        console.log('✅ MCP服务初始化成功');
        
        // 测试优化后的list_tasks
        setTimeout(() => {
          console.log('\n📋 测试: list_tasks with limit=3');
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
        }, 500);
      }
      
      if (response.id === 2) {
        responseCount++;
        console.log(`\n📊 响应 ${response.id}:`);
        
        if (response.result) {
          const content = response.result.content?.[0];
          if (content?.text) {
            try {
              const data = JSON.parse(content.text);
              console.log(`✅ 成功！任务数量: ${data.data?.tasks?.length || 0}`);
              console.log(`📄 分页信息: 第${data.data?.pagination?.page}页，共${data.data?.pagination?.totalPages}页`);
              console.log(`📈 总任务数: ${data.data?.total}`);
              console.log(`💬 消息: ${data.message}`);
            } catch (e) {
              console.log(`📝 响应长度: ${content.text.length} 字符`);
              console.log(`📝 响应开始: ${content.text.substring(0, 200)}...`);
            }
          }
        } else if (response.error) {
          console.log(`❌ 错误: ${response.error.message}`);
        }
        
        setTimeout(() => process.exit(0), 1000);
      }
      
    } catch (e) {
      // 忽略非JSON输出
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
    clientInfo: { name: 'test', version: '1.0' }
  }
});

setTimeout(() => {
  if (responseCount === 0) {
    console.log('⏰ 超时，未收到预期响应');
    process.exit(1);
  }
}, 10000);