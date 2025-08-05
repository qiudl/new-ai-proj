import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function updateTask426Status() {
    const transport = new StdioClientTransport({
        command: 'node',
        args: ['mcp-task-bridge/index.js']
    });

    const client = new Client({
        name: 'task-updater',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log('✅ MCP客户端已连接');

        // 首先查找任务426来确认其存在
        console.log('\n🔍 查找任务426...');
        const findResult = await client.callTool({
            name: 'find_task',
            arguments: { titlePattern: '清理TypeScript编译错误' }
        });
        
        console.log('查找结果:', JSON.stringify(findResult.content, null, 2));
        
        // 更新任务426状态为completed
        console.log('\n📝 更新任务426状态为completed...');
        const updateResult = await client.callTool({
            name: 'update_task',
            arguments: {
                task_id: 426,
                updates: {
                    status: 'completed'
                }
            }
        });

        console.log('更新结果:', JSON.stringify(updateResult.content, null, 2));

        // 验证更新结果
        console.log('\n✅ 验证更新...');
        const verifyResult = await client.callTool({
            name: 'find_task',
            arguments: { titlePattern: '清理TypeScript编译错误' }
        });
        
        console.log('验证结果:', JSON.stringify(verifyResult.content, null, 2));

    } catch (error) {
        console.error('❌ 操作失败:', error.message);
        console.error('错误详情:', error);
    } finally {
        await client.close();
        console.log('\n🔐 MCP客户端已关闭');
    }
}

updateTask426Status();