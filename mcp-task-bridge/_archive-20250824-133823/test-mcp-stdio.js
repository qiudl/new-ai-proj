// 测试MCP Server的stdio通信
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// 创建一个简化的测试MCP服务器
const testServer = new Server(
    {
        name: 'test-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 注册工具列表
testServer.setRequestHandler('tools/list', async () => {
    console.error('[DEBUG] Received tools/list request');
    return {
        tools: [
            {
                name: 'test_echo',
                description: '测试回显工具',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: '要回显的消息' }
                    },
                    required: ['message']
                }
            }
        ]
    };
});

// 处理工具调用
testServer.setRequestHandler('tools/call', async (request) => {
    console.error(`[DEBUG] Received tools/call request: ${JSON.stringify(request.params)}`);
    
    const { name, arguments: args } = request.params;
    
    if (name === 'test_echo') {
        const result = {
            success: true,
            echo: args.message,
            timestamp: new Date().toISOString(),
            message: `✅ 回显: ${args.message}`
        };
        
        console.error(`[DEBUG] Returning result: ${JSON.stringify(result)}`);
        
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    
    throw new Error(`Unknown tool: ${name}`);
});

// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await testServer.connect(transport);
    console.error('Test MCP Server started successfully');
}

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
