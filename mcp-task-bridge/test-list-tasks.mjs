import { spawn } from 'child_process';

// 测试优化后的list_tasks接口
function testListTasks() {
  console.log('🧪 测试优化后的list_tasks接口');
  
  const child = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let buffer = '';
  
  child.stdout.on('data', (data) => {
    buffer += data.toString();
    let lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          if (response.id === 1) {
            console.log('✅ MCP服务启动成功');
            
            // 测试1: 基础分页 (默认参数)
            console.log('\n📋 测试1: 基础分页 (默认20条)');
            send({ 
              jsonrpc: '2.0', 
              id: 2, 
              method: 'tools/call', 
              params: { 
                name: 'list_tasks', 
                arguments: {} 
              } 
            });
            
            setTimeout(() => {
              // 测试2: 指定分页参数
              console.log('\n📋 测试2: 指定分页参数 (第1页,5条)');
              send({ 
                jsonrpc: '2.0', 
                id: 3, 
                method: 'tools/call', 
                params: { 
                  name: 'list_tasks', 
                  arguments: { 
                    page: 1, 
                    limit: 5 
                  } 
                } 
              });
            }, 1000);
            
            setTimeout(() => {
              // 测试3: 状态过滤
              console.log('\n📋 测试3: 状态过滤 (仅进行中任务)');
              send({ 
                jsonrpc: '2.0', 
                id: 4, 
                method: 'tools/call', 
                params: { 
                  name: 'list_tasks', 
                  arguments: { 
                    status: ['in_progress'], 
                    limit: 10 
                  } 
                } 
              });
            }, 2000);
            
            setTimeout(() => {
              // 测试4: 项目过滤 + 分页
              console.log('\n📋 测试4: 项目过滤 + 分页');
              send({ 
                jsonrpc: '2.0', 
                id: 5, 
                method: 'tools/call', 
                params: { 
                  name: 'list_tasks', 
                  arguments: { 
                    projectId: 1,
                    page: 1, 
                    limit: 3,
                    sort_by: 'created_at',
                    sort_order: 'desc'
                  } 
                } 
              });
            }, 3000);
            
            setTimeout(() => {
              process.exit(0);
            }, 5000);
          }
          
          if (response.id >= 2) {
            console.log(`\n📊 响应 ${response.id}:`, JSON.stringify(response, null, 2).substring(0, 500) + '...');
            
            if (response.result && response.result.content) {
              const content = response.result.content[0];
              if (content.type === 'text') {
                try {
                  const data = JSON.parse(content.text);
                  console.log(`📈 任务数量: ${data.data?.tasks?.length || 0}/${data.data?.total || 0}`);
                  console.log(`📄 分页信息: 第${data.data?.pagination?.page}页，共${data.data?.pagination?.totalPages}页`);
                } catch (e) {
                  console.log('📝 响应内容:', content.text.substring(0, 200));
                }
              }
            }
          }
        } catch (e) {
          // 忽略非JSON输出
        }
      }
    });
  });

  function send(message) {
    child.stdin.write(JSON.stringify(message) + '\n');
  }

  // 初始化MCP服务
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { capabilities: {}, clientInfo: { name: 'test', version: '1.0' } } });

  child.on('error', (error) => {
    console.error('❌ 启动失败:', error);
  });
}

testListTasks();