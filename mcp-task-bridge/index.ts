import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp.js';

// 初始化任务服务器
const taskServer = new TaskMCPServer();

// 创建 MCP Server
const server = new Server(
  {
    name: 'task-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
        name: 'create_subtask',
        description: '创建子任务',
        inputSchema: {
          type: 'object',
          properties: {
            parentId: { 
              type: 'number', 
              description: '父任务ID' 
            },
            title: { 
              type: 'string', 
              description: '子任务标题' 
            }
          },
          required: ['parentId', 'title']
        }
      },
      {
        name: 'find_task',
        description: '根据名称搜索任务',
        inputSchema: {
          type: 'object',
          properties: {
            titlePattern: { 
              type: 'string', 
              description: '任务标题搜索关键词' 
            }
          },
          required: ['titlePattern']
        }
      },
      {
        name: 'delete_task',
        description: '删除单个任务',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'number', 
              description: '要删除的任务ID' 
            },
            force: { 
              type: 'boolean', 
              description: '是否强制删除（包含子任务）',
              default: false
            }
          },
          required: ['id']
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
                  enum: ['todo', 'pending', 'in_progress', 'completed', 'cancelled'],
                  description: '新状态',
                  default: 'todo'
                },
                priority: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high'],
                  description: '新优先级',
                  default: 'low'
                },
                due_date: { type: 'string', description: '新截止日期 (ISO 8601)' },
                assignee_id: { type: 'number', description: '新指派用户ID' }
              }
            }
          },
          required: ['id', 'updates']
        }
      },
      {
        name: 'move_task',
        description: '移动任务到其他项目',
        inputSchema: {
          type: 'object',
          properties: {
            id: { 
              type: 'number', 
              description: '要移动的任务ID' 
            },
            targetProjectId: { 
              type: 'number', 
              description: '目标项目ID' 
            }
          },
          required: ['id', 'targetProjectId']
        }
      },
      {
        name: 'create_or_update_task_document',
        description: '创建或更新任务文档',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { 
              type: 'number', 
              description: '任务ID' 
            },
            content: { 
              type: 'string', 
              description: '文档内容（Markdown格式）' 
            },
            projectId: { 
              type: 'number', 
              description: '项目ID（可选，默认为1）' 
            }
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
            taskId: { 
              type: 'number', 
              description: '任务ID' 
            },
            projectId: { 
              type: 'number', 
              description: '项目ID（可选，默认为1）' 
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
              description: '项目ID（可选，默认为1）' 
            }
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
            taskId: { 
              type: 'number', 
              description: '任务ID' 
            },
            projectId: { 
              type: 'number', 
              description: '项目ID（可选，默认为1）' 
            }
          },
          required: ['taskId']
        }
      },
      {
        name: 'pause_task',
        description: '暂停任务',
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
        name: 'list_projects',
        description: '查看项目列表',
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
            name: { 
              type: 'string', 
              description: '项目名称' 
            },
            description: { 
              type: 'string', 
              description: '项目描述（可选）' 
            }
          },
          required: ['name']
        }
      },
      {
        name: 'get_task_children',
        description: '获取任务的子任务',
        inputSchema: {
          type: 'object',
          properties: {
            parentId: { 
              type: 'number', 
              description: '父任务ID' 
            }
          },
          required: ['parentId']
        }
      },
      {
        name: 'start_timer',
        description: '开始任务计时',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { 
              type: 'number', 
              description: '任务ID' 
            },
            description: { 
              type: 'string', 
              description: '计时描述（可选）' 
            }
          },
          required: ['taskId']
        }
      },
      {
        name: 'stop_timer',
        description: '停止当前计时',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { 
              type: 'number', 
              description: '任务ID（可选，不指定则停止所有计时）' 
            }
          }
        }
      },
      {
        name: 'get_current_timer',
        description: '获取当前计时状态',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case 'create_task':
        result = await taskServer.createTask(args.title as string, args.projectId as number);
        break;      
      case 'start_task':
        result = await taskServer.startTask(args.id as number);
        break;
      
      case 'complete_task':
        result = await taskServer.completeTask(args.id as number);
        break;
      
      case 'list_tasks':
        result = await taskServer.listTasks(args.projectId as number);
        break;
      
      case 'create_subtask':
        result = await taskServer.createSubTask(args.parentId as number, args.title as string);
        break;
      
      case 'find_task':
        result = await taskServer.findTaskByName(args.titlePattern as string);
        break;
      
      case 'delete_task':
        result = await taskServer.deleteTask(args.id as number, args.force as boolean);
        break;
      
      case 'update_task':
        result = await taskServer.updateTask(args.id as number, args.updates as any);
        break;
      
      case 'move_task':
        result = await taskServer.moveTask(args.id as number, args.targetProjectId as number);
        break;
      
      case 'create_or_update_task_document':
        result = await taskServer.createOrUpdateTaskDocument(
          args.taskId as number, 
          args.content as string, 
          args.projectId as number
        );
        break;
      
      case 'get_task_document':
        result = await taskServer.getTaskDocument(args.taskId as number, args.projectId as number);
        break;
      
      case 'has_task_document':
        result = await taskServer.hasTaskDocument(args.taskId as number, args.projectId as number);
        break;
      
      case 'delete_task_document':
        result = await taskServer.deleteTaskDocument(args.taskId as number, args.projectId as number);
        break;
      
      case 'pause_task':
        result = await taskServer.pauseTask(args.id as number);
        break;
      
      case 'list_projects':
        result = await taskServer.listProjects();
        break;
      
      case 'create_project':
        result = await taskServer.createProject(args.name as string, args.description as string);
        break;
      
      case 'get_task_children':
        result = await taskServer.getTaskChildren(args.parentId as number);
        break;
      
      case 'start_timer':
        result = await taskServer.startTimer(args.taskId as number, args.description as string);
        break;
      
      case 'stop_timer':
        result = await taskServer.stopTimer(args.taskId as number);
        break;
      
      case 'get_current_timer':
        result = await taskServer.getCurrentTimer();
        break;
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error: any) {
    console.error(`[ERROR] Tool call failed:`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `工具调用失败: ${error.message}`
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
  console.error('Task MCP Server started successfully');
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
  console.error('Failed to start MCP Server:', error);
  process.exit(1);
});
