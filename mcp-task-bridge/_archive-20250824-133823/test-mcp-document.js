#!/usr/bin/env node

// 测试MCP Server的文档工具接口
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { spawn } from 'child_process';

async function testMCPDocumentTools() {
    console.log('🧪 开始测试MCP文档工具接口...\n');
    
    // 启动MCP Server进程
    const serverProcess = spawn('node', ['index.js'], {
        cwd: '/Users/johnqiu/coding/www/projects/new-ai-proj/mcp-task-bridge',
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // 创建MCP客户端
    const transport = new StdioClientTransport({
        reader: serverProcess.stdout,
        writer: serverProcess.stdin
    });
    
    const client = new Client(
        {
            name: 'test-client',
            version: '1.0.0'
        },
        {
            capabilities: {}
        }
    );
    
    try {
        await client.connect(transport);
        console.log('✅ MCP客户端连接成功\n');
        
        // 1. 获取工具列表
        console.log('1. 获取工具列表...');
        const toolsResult = await client.request({ method: 'tools/list' }, {});
        const documentTools = toolsResult.tools.filter(tool => 
            tool.name.includes('document')
        );
        
        console.log('文档相关工具:');
        documentTools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });
        console.log('');
        
        const testTaskId = 333;
        
        // 2. 测试创建文档
        console.log('2. 测试创建任务文档...');
        const createResult = await client.request(
            { method: 'tools/call' },
            {
                name: 'create_or_update_task_document',
                arguments: {
                    taskId: testTaskId,
                    content: '# MCP接口测试文档\n\n这是通过MCP接口创建的文档。\n\n## 测试状态\n- 接口调用 ✓',
                    title: 'MCP测试文档'
                }
            }
        );
        console.log('创建结果:', createResult.content[0].text);
        console.log('');
        
        // 3. 测试检查文档
        console.log('3. 测试检查文档存在性...');
        const hasResult = await client.request(
            { method: 'tools/call' },
            {
                name: 'has_task_document',
                arguments: { taskId: testTaskId }
            }
        );
        console.log('检查结果:', hasResult.content[0].text);
        console.log('');
        
        // 4. 测试获取文档
        console.log('4. 测试获取文档内容...');
        const getResult = await client.request(
            { method: 'tools/call' },
            {
                name: 'get_task_document',
                arguments: { taskId: testTaskId }
            }
        );
        console.log('获取结果:', getResult.content[0].text);
        console.log('');
        
        console.log('🎉 所有MCP文档工具接口测试通过！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    } finally {
        // 清理资源
        await client.close();
        serverProcess.kill();
        console.log('✅ 测试完成，资源已清理');
    }
}

testMCPDocumentTools().catch(console.error);
