import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServerFixed } from './task-mcp-fixed.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

// 初始化修复后的连接后端的MCP服务器
console.error('[MCP] 初始化修复后的TaskMCPServer（连接后端模式）');
console.error('[MCP] API基础URL:', process.env.TASK_API_BASE || 'http://localhost:8081/api/v1');

// 使用修复后的TaskMCPServer
const taskServer = new TaskMCPServerFixed(
    process.env.TASK_API_BASE || 'http://localhost:8081/api/v1'
);

// 创建 MCP Server
const server = new Server({
    name: 'task-manager-backend-fixed',
    version: '3.1.0',  // 修复版本
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
                    type: 'object',
                    properties: {
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
                        projectId: { type: 'number', description: '项目ID（可选，默认为1）' }
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
                description: '更新任务信息',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID' },
                        updates: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                description: { type: 'string' },
                                status: { type: 'string', enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'] },
                                priority: { type: 'string', enum: ['low', 'medium', 'high'] }
                            }
                        }
                    },
                    required: ['id', 'updates']
                }
            },
            {
                name: 'create-and-attach',
                description: '创建并关联任务文档（修复版）',
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
            },
            {
                name: 'get_task_document',
                description: '获取任务文档内容',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' },
                        projectId: { type: 'number', description: '项目ID（可选，默认为1）' }
                    },
                    required: ['taskId']
                }
            },
            {
                name: 'has_task_document',
                description: '检查任务是否有文档',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' },
                        projectId: { type: 'number', description: '项目ID（可选，默认为1）' }
                    },
                    required: ['taskId']
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
                result = await taskServer.updateTask(args.id, { status: 'in_progress' });
                break;
                
            case 'complete_task':
                result = await taskServer.updateTask(args.id, { status: 'completed' });
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
                
            case 'get_task_document':
                // 暂时返回本地文档
                const fs = await import('fs');
                const path = await import('path');
                const docPath = path.join(process.cwd(), '.mcp-documents', `task-${args.taskId}.md`);
                
                if (fs.existsSync(docPath)) {
                    const content = fs.readFileSync(docPath, 'utf8');
                    result = {
                        success: true,
                        task_id: args.taskId,
                        content: content,
                        message: '文档内容已获取'
                    };
                } else {
                    result = {
                        success: false,
                        task_id: args.taskId,
                        error: `任务 ${args.taskId} 暂无文档`,
                        not_found: true
                    };
                }
                break;
                
            case 'has_task_document':
                // 检查本地文档是否存在
                const fs2 = await import('fs');
                const path2 = await import('path');
                const docPath2 = path2.join(process.cwd(), '.mcp-documents', `task-${args.taskId}.md`);
                
                result = {
                    success: true,
                    task_id: args.taskId,
                    has_document: fs2.existsSync(docPath2),
                    document_count: fs2.existsSync(docPath2) ? 1 : 0,
                    message: fs2.existsSync(docPath2) ? `任务 ${args.taskId} 有文档` : `任务 ${args.taskId} 没有文档`
                };
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
    console.error('[MCP] TaskMCPServerFixed (后端连接模式) 已启动');
    console.error('[MCP] 连接到:', process.env.TASK_API_BASE || 'http://localhost:8081/api/v1');
    console.error('[MCP] 文档存储路径:', join(process.cwd(), '.mcp-documents'));
}

main().catch(console.error);