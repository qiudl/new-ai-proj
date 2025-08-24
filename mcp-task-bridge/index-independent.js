import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema, } from '@modelcontextprotocol/sdk/types.js';

// 使用新的独立MCP服务器，而不是有问题的TaskMCPServer
import { IndependentMCPServer } from './independent-mcp-server.js';

// 初始化独立的MCP服务器 - 不依赖Jenkins
console.error('[MCP] 使用独立MCP服务器架构 - 不依赖外部系统');
const taskServer = new IndependentMCPServer({
    storagePath: './.mcp-documents',  // 使用本地存储
    taskLinking: 'optional'  // 任务关联是可选功能
});

// 创建 MCP Server
const server = new Server({
    name: 'task-manager-independent',
    version: '2.0.0',  // 版本升级表示架构改进
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
                        title: {
                            type: 'string',
                            description: '任务标题'
                        },
                        projectId: {
                            type: 'number',
                            description: '项目ID（可选，默认为1）'
                        }
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
                        id: {
                            type: 'number',
                            description: '任务ID'
                        }
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
                        id: {
                            type: 'number',
                            description: '任务ID'
                        }
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
                        projectId: {
                            type: 'number',
                            description: '项目ID（可选，不指定则显示所有任务）'
                        }
                    }
                }
            },
            {
                name: 'find_task',
                description: '根据名称或ID搜索任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        titlePattern: {
                            type: 'string',
                            description: '任务标题搜索关键词（可选）'
                        },
                        id: {
                            type: 'number',
                            description: '任务ID（可选，优先使用）'
                        }
                    }
                }
            },
            {
                name: 'update_task',
                description: '更新任务信息',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'number',
                            description: '要更新的任务ID'
                        },
                        updates: {
                            type: 'object',
                            description: '更新字段对象',
                            properties: {
                                title: { type: 'string', description: '新标题' },
                                description: { type: 'string', description: '新描述' },
                                status: {
                                    type: 'string',
                                    enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'],
                                    description: '新状态',
                                    default: 'todo'
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'medium', 'high'],
                                    description: '新优先级',
                                    default: 'low'
                                }
                            }
                        }
                    },
                    required: ['id', 'updates']
                }
            },
            {
                name: 'create-and-attach',
                description: '创建并关联任务文档（修复版 - 不依赖Jenkins验证）',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: {
                            type: 'number',
                            description: '任务ID（作为元数据存储，不需要预先存在）'
                        },
                        content: {
                            type: 'string',
                            description: '文档内容（Markdown格式）'
                        },
                        projectId: {
                            type: 'number',
                            description: '项目ID（可选，默认为1）',
                            default: 1
                        },
                        title: {
                            type: 'string',
                            description: '文档标题（可选）'
                        }
                    },
                    required: ['taskId', 'content']
                }
            },
            {
                name: 'create_batch_documents',
                description: '批量创建文档并自动关联到任务（修复版 - 不依赖Jenkins验证）',
                inputSchema: {
                    type: 'object',
                    properties: {
                        documents: {
                            type: 'array',
                            description: '文档列表',
                            items: {
                                type: 'object',
                                properties: {
                                    taskId: {
                                        type: 'number',
                                        description: '任务ID（作为元数据）'
                                    },
                                    title: {
                                        type: 'string',
                                        description: '文档标题'
                                    },
                                    content: {
                                        type: 'string',
                                        description: '文档内容'
                                    },
                                    projectId: {
                                        type: 'number',
                                        description: '项目ID（可选）'
                                    }
                                },
                                required: ['taskId', 'title', 'content']
                            }
                        }
                    },
                    required: ['documents']
                }
            },
            {
                name: 'get_task_document',
                description: '获取任务文档内容',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: {
                            type: 'number',
                            description: '任务ID'
                        },
                        projectId: {
                            type: 'number',
                            description: '项目ID（可选，默认为1）',
                            default: 1
                        }
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
                        taskId: {
                            type: 'number',
                            description: '任务ID'
                        },
                        projectId: {
                            type: 'number',
                            description: '项目ID（可选，默认为1）',
                            default: 1
                        }
                    },
                    required: ['taskId']
                }
            }
        ]
    };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    let { name, arguments: args } = request.params;
    
    // Robust arguments handling: allow stringified JSON
    if (typeof args === 'string') {
        try {
            args = JSON.parse(args);
        }
        catch (e) {
            console.error(`[MCP] Invalid arguments JSON for tool ${name}:`, e?.message || e);
            return {
                content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid arguments JSON: ${e.message}` }) }]
            };
        }
    }
    
    if (args == null || typeof args !== 'object') {
        console.error(`[MCP] Bad arguments for tool ${name}: not an object`);
        return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Arguments must be an object' }) }]
        };
    }
    
    try {
        console.error(`[MCP-INDEPENDENT] Tool call received: ${name}`);
        let result;
        
        switch (name) {
            // 任务管理功能
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
                result = await taskServer.findTask({ id: args.id, titlePattern: args.titlePattern });
                break;
            case 'update_task':
                result = await taskServer.updateTask(args.id, args.updates);
                break;
                
            // 文档管理功能 - 修复版本
            case 'create-and-attach':
                console.error(`[MCP-INDEPENDENT] 创建并关联文档: 任务 ${args.taskId}`);
                result = await taskServer.createAndAttachTaskDocument(
                    args.taskId, 
                    args.content, 
                    args.projectId || 1, 
                    args.title
                );
                break;
                
            case 'create_batch_documents':
                console.error(`[MCP-INDEPENDENT] 批量创建文档: ${args.documents.length} 个`);
                result = await taskServer.createBatchDocuments(args.documents);
                break;
                
            case 'get_task_document':
                result = await taskServer.getTaskDocument(args.taskId, args.projectId);
                break;
                
            case 'has_task_document':
                result = await taskServer.hasTaskDocument(args.taskId, args.projectId);
                break;
                
            default:
                console.error(`[MCP-INDEPENDENT] 未知工具: ${name}`);
                return {
                    content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) }]
                };
        }
        
        const response = {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
        
        console.error(`[MCP-INDEPENDENT] Tool call succeeded: ${name}`);
        return response;
        
    } catch (error) {
        console.error(`[MCP-INDEPENDENT] Tool call failed: ${name}`, error?.message || error);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: `工具调用失败: ${error?.message || String(error)}`
                    }, null, 2)
                }
            ]
        };
    }
});

// 启动服务器
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🚀 独立MCP服务器启动成功 - 无需Jenkins依赖！');
    console.error('   - 文档创建功能完全独立');
    console.error('   - create-and-attach 已修复');
    console.error('   - create_batch_documents 已修复');
    
    // 执行健康检查
    const health = await taskServer.healthCheck();
    console.error(`[HEALTH] ${health.message}`);
    
    // Keep the server alive until stdio is closed by the host
    await new Promise(() => { });
}

// 错误处理（不强制退出，避免关闭stdio通道）
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main().catch((error) => {
    console.error('Failed to start Independent MCP Server:', error);
    // do not exit; let host manage lifecycle
});
