import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp-full.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

// 初始化完整功能版本的TaskMCPServer
console.error('[MCP] 初始化完整功能版本的TaskMCPServer');
console.error('[MCP] API基础URL:', process.env.TASK_API_BASE || 'http://localhost:8081/api/v1');

// 使用完整功能版本的TaskMCPServer
const taskServer = new TaskMCPServer(
    process.env.TASK_API_BASE || 'http://localhost:8081/api/v1'
);

// 创建 MCP Server
const server = new Server({
    name: 'task-manager-full-featured',
    version: '4.0.0',  // 完整功能版本
}, {
    capabilities: {
        tools: {},
    },
});

// 注册完整工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            // 基础任务管理
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
                name: 'pause_task',
                description: '暂停任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID' }
                    },
                    required: ['id']
                }
            },
            {
                name: 'delete_task',
                description: '删除任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID' }
                    },
                    required: ['id']
                }
            },
            // 任务查询
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
                name: 'find_task_by_name',
                description: '按名称精确查找任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: '任务名称' },
                        projectId: { type: 'number', description: '项目ID（可选）' }
                    },
                    required: ['name']
                }
            },
            {
                name: 'get_detailed_task_info',
                description: '获取详细任务信息',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' }
                    },
                    required: ['taskId']
                }
            },
            {
                name: 'get_task_children',
                description: '获取任务的子任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' },
                        projectId: { type: 'number', description: '项目ID（可选）' }
                    },
                    required: ['taskId']
                }
            },
            // 任务更新
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
                name: 'update_task_title',
                description: '更新任务标题',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID' },
                        title: { type: 'string', description: '新标题' }
                    },
                    required: ['id', 'title']
                }
            },
            {
                name: 'update_task_description',
                description: '更新任务描述',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: '任务ID' },
                        description: { type: 'string', description: '新描述' }
                    },
                    required: ['id', 'description']
                }
            },
            {
                name: 'move_task',
                description: '移动任务到不同父任务或项目',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' },
                        newParentId: { type: 'number', description: '新父任务ID（可选）' },
                        newProjectId: { type: 'number', description: '新项目ID（可选）' }
                    },
                    required: ['taskId']
                }
            },
            // 子任务管理
            {
                name: 'create_subtask',
                description: '创建子任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parentId: { type: 'number', description: '父任务ID' },
                        title: { type: 'string', description: '子任务标题' },
                        description: { type: 'string', description: '子任务描述（可选）' }
                    },
                    required: ['parentId', 'title']
                }
            },
            {
                name: 'create_sibling_task',
                description: '创建兄弟任务',
                inputSchema: {
                    type: 'object',
                    properties: {
                        siblingId: { type: 'number', description: '兄弟任务ID' },
                        title: { type: 'string', description: '新任务标题' },
                        description: { type: 'string', description: '新任务描述（可选）' }
                    },
                    required: ['siblingId', 'title']
                }
            },
            // 项目管理
            {
                name: 'list_projects',
                description: '列出所有项目',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'create_project',
                description: '创建新项目',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: '项目名称' },
                        description: { type: 'string', description: '项目描述（可选）' }
                    },
                    required: ['name']
                }
            },
            // 文档管理
            {
                name: 'create_and_attach',
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
            },
            {
                name: 'create_or_update_task_document',
                description: '创建或更新任务文档',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' },
                        content: { type: 'string', description: '文档内容' },
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
            },
            {
                name: 'delete_task_document',
                description: '删除任务文档',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' }
                    },
                    required: ['taskId']
                }
            },
            {
                name: 'createBatchDocuments',
                description: '批量创建文档',
                inputSchema: {
                    type: 'object',
                    properties: {
                        documents: {
                            type: 'array',
                            description: '文档数组',
                            items: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string', description: '文档标题' },
                                    content: { type: 'string', description: '文档内容' },
                                    type: { type: 'string', description: '文档类型（默认markdown）' },
                                    project_id: { type: 'number', description: '项目ID（默认1）' },
                                    description: { type: 'string', description: '文档描述（可选）' }
                                },
                                required: ['title', 'content']
                            }
                        }
                    },
                    required: ['documents']
                }
            },
            {
                name: 'generate_document_from_template',
                description: '从模板生成文档',
                inputSchema: {
                    type: 'object',
                    properties: {
                        templateType: { type: 'string', description: '模板类型' },
                        context: {
                            type: 'object',
                            properties: {
                                title: { type: 'string', description: '文档标题' },
                                taskId: { type: 'number', description: '任务ID（可选）' },
                                projectId: { type: 'number', description: '项目ID（可选）' },
                                requirements: { type: 'string', description: '需求描述' }
                            }
                        },
                        autoCreate: { type: 'boolean', description: '是否自动创建到任务' }
                    },
                    required: ['templateType', 'context']
                }
            },
            // 计时器功能
            {
                name: 'start_timer',
                description: '开始任务计时',
                inputSchema: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'number', description: '任务ID' },
                        title: { type: 'string', description: '计时标题' },
                        category: { type: 'string', description: '分类' }
                    },
                    required: ['taskId']
                }
            },
            {
                name: 'stop_timer',
                description: '停止计时',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'get_current_timer',
                description: '获取当前计时状态',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            // 开发工具
            {
                name: 'dev_quick_login',
                description: '开发环境快速登录',
                inputSchema: {
                    type: 'object',
                    properties: {
                        username: { type: 'string', description: '用户名（可选）' }
                    }
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
            // 基础任务管理
            case 'create_task':
                result = await taskServer.createTask(args.title, args.projectId);
                break;
            case 'start_task':
                result = await taskServer.startTask(args.id);
                break;
            case 'complete_task':
                result = await taskServer.completeTask(args.id);
                break;
            case 'pause_task':
                result = await taskServer.pauseTask(args.id);
                break;
            case 'delete_task':
                result = await taskServer.deleteTask(args.id);
                break;
            
            // 任务查询
            case 'list_tasks':
                result = await taskServer.listTasks(args.projectId);
                break;
            case 'find_task':
                result = await taskServer.findTask(args);
                break;
            case 'find_task_by_name':
                result = await taskServer.findTaskByName(args.name, args.projectId);
                break;
            case 'get_detailed_task_info':
                result = await taskServer.getDetailedTaskInfo(args.taskId);
                break;
            case 'get_task_children':
                result = await taskServer.getTaskChildren(args.taskId, args.projectId);
                break;
            
            // 任务更新
            case 'update_task':
                result = await taskServer.updateTask(args.id, args.updates);
                break;
            case 'update_task_title':
                result = await taskServer.updateTaskTitle(args.id, args.title);
                break;
            case 'update_task_description':
                result = await taskServer.updateTaskDescription(args.id, args.description);
                break;
            case 'move_task':
                result = await taskServer.moveTask(args.taskId, args.newParentId, args.newProjectId);
                break;
            
            // 子任务管理
            case 'create_subtask':
                result = await taskServer.createSubTask(args.parentId, args.title, args.description);
                break;
            case 'create_sibling_task':
                result = await taskServer.createSiblingTask(args.siblingId, args.title, args.description);
                break;
            
            // 项目管理
            case 'list_projects':
                result = await taskServer.listProjects();
                break;
            case 'create_project':
                result = await taskServer.createProject(args.name, args.description);
                break;
            
            // 文档管理
            case 'create_and_attach':
                result = await taskServer.createAndAttachTaskDocument(
                    args.taskId,
                    args.content,
                    args.projectId || 1,
                    args.title
                );
                break;
            case 'create_or_update_task_document':
                result = await taskServer.createOrUpdateTaskDocument(
                    args.taskId,
                    args.content,
                    args.title
                );
                break;
            case 'get_task_document':
                result = await taskServer.getTaskDocument(args.taskId, args.projectId);
                break;
            case 'has_task_document':
                result = await taskServer.hasTaskDocument(args.taskId, args.projectId);
                break;
            case 'delete_task_document':
                result = await taskServer.deleteTaskDocument(args.taskId);
                break;
            case 'createBatchDocuments':
                result = await taskServer.createBatchDocuments(args.documents);
                break;
            case 'generate_document_from_template':
                result = await taskServer.generateDocumentFromTemplate(
                    args.templateType,
                    args.context,
                    args.autoCreate
                );
                break;
            
            // 计时器功能
            case 'start_timer':
                result = await taskServer.startTimer(args.taskId, args.title, args.category);
                break;
            case 'stop_timer':
                result = await taskServer.stopTimer();
                break;
            case 'get_current_timer':
                result = await taskServer.getCurrentTimer();
                break;
            
            // 开发工具
            case 'dev_quick_login':
                result = await taskServer.devQuickLogin(args.username);
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
    console.error('[MCP] TaskMCPServer完整功能版本已启动');
    console.error('[MCP] 连接到:', process.env.TASK_API_BASE || 'http://localhost:8081/api/v1');
    console.error('[MCP] 支持30+种工具，包括任务管理、文档处理、计时器等');
}

main().catch(console.error);
