import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

// 初始化连接后端的MCP服务器
console.error('[MCP] 初始化连接后端的TaskMCPServer');
console.error('[MCP] API基础URL:', process.env.TASK_API_BASE || 'http://localhost:8081/api/v1');

// 使用正确的API端口（8081）和路径格式（projects复数）
const taskServer = new TaskMCPServer(
    process.env.TASK_API_BASE || 'http://localhost:8081/api/v1'
);

// 创建 MCP Server
const server = new Server({
    name: 'task-manager-backend',
    version: '3.0.0',  // 新版本：连接后端
}, {
    capabilities: {
        tools: {},
    },
});
// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'create_task',
                description: '创建新任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: '任务标题' },
                        projectId: { type: 'number', description: '项目ID（可选，默认为1）' }
                    },
                    required: ['title']
                }
            },
            {
                name: 'start_task',
                description: '开始执行任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID' }
                    },
                    required: ['id']
                }
            },
            {
                name: 'complete_task',
                description: '完成任务',
                inputSchema: {
                    type: 'object',                    properties: {
                        id: { type: 'number', description: '任务ID' }
                    },
                    required: ['id']
                }
            },
            {
                name: 'list_tasks',
                description: '查看任务列表',
                inputSchema: {
                    type: 'object',
                    properties: {
                        projectId: { type: 'number', description: '项目ID（可选）' }
                    }
                }
            },
            {
                name: 'find_task',
                description: '根据ID或标题搜索任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID（优先使用）' },
                        titlePattern: { type: 'string', description: '任务标题搜索关键词' }
                    }
                }
            },
            {
                name: 'update_task',
                description: '更新任务信息',                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID' },
                        updates: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                description: { type: 'string' },
                                status: { type: 'string' },
                                priority: { type: 'string' }
                            }
                        }
                    },
                    required: ['id', 'updates']
                }
            },
            {
                name: 'create-and-attach',
                description: '创建并关联任务文档',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' },
                        content: { type: 'string', description: '文档内容（Markdown格式）' },
                        projectId: { type: 'number', description: '项目ID（可选，默认为1）' },
                        title: { type: 'string', description: '文档标题（可选）' }
                    },
                    required: ['taskId', 'content']
                }
            }
        ]
    };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    let result;

    try {
        console.error(`[MCP] 调用工具: ${name}`, args);
        
        switch (name) {
            case 'create_task':
                result = await taskServer.createTask(args.title, args.projectId);
                break;
                
            case 'start_task':
                result = await taskServer.startTask(args.id);
                break;
                
            case 'complete_task':
                result = await taskServer.completeTask(args.id);
                break;
                
            case 'list_tasks':
                result = await taskServer.listTasks(args.projectId);
                break;
                
            case 'find_task':
                result = await taskServer.findTask(args);
                break;
                
            case 'update_task':
                result = await taskServer.updateTask(args.id, args.updates);
                break;
                
            case 'create-and-attach':
                result = await taskServer.createAndAttachDocument(
                    args.taskId,
                    args.content,
                    args.projectId || 1,
                    args.title
                );
                break;
                
            default:
                result = { success: false, error: `Unknown tool: ${name}` };
        }
        
        console.error(`[MCP] 工具 ${name} 执行结果:`, result?.success ? '成功' : '失败');
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result)
            }]
        };
    } catch (error) {
        console.error(`[MCP] 工具 ${name} 执行错误:`, error);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error.message
                })
            }]
        };
    }
});

// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] TaskMCPServer (后端连接模式) 已启动');
    console.error('[MCP] 连接到:', process.env.TASK_API_BASE || 'http://localhost:8081/api/v1');
}

main().catch(console.error);