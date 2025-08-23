import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp.js';

// 初始化任务服务器 - 从环境变量读取API地址
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8081/api/v1';
const taskServer = new TaskMCPServer(apiBaseUrl);

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
                  enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'],
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
      },
      {
        name: 'create_sibling_task',
        description: '创建兄弟任务（与指定任务共享相同的父任务）',
        inputSchema: {
          type: 'object',
          properties: {
            siblingId: { 
              type: 'number', 
              description: '兄弟任务ID（参考任务）' 
            },
            title: { 
              type: 'string', 
              description: '新任务标题' 
            },
            description: { 
              type: 'string', 
              description: '任务描述' 
            },
            status: { 
              type: 'string', 
              enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'],
              description: '任务状态',
              default: 'todo'
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high'],
              description: '优先级',
              default: 'medium'
            }
          },
          required: ['siblingId', 'title']
        }
      },
      {
        name: 'create_batch_documents',
        description: '批量创建文档并自动关联到任务',
        inputSchema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              description: '文档列表',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: '文档标题' },
                  content: { type: 'string', description: '文档内容' },
                  description: { type: 'string', description: '文档描述' },
                  type: { 
                    type: 'string', 
                    enum: ['markdown', 'txt', 'pdf'],
                    description: '文档类型',
                    default: 'markdown'
                  },
                  status: { 
                    type: 'string', 
                    enum: ['draft', 'published', 'archived'],
                    description: '文档状态',
                    default: 'draft'
                  },
                  visibility: { 
                    type: 'string', 
                    enum: ['private', 'team', 'public'],
                    description: '可见性',
                    default: 'team'
                  },
                  tags: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: '标签列表' 
                  },
                  taskId: { type: 'number', description: '关联任务ID（可选）' },
                  projectId: { type: 'number', description: '项目ID（可选）' },
                  attachToTask: { type: 'boolean', description: '是否自动关联到任务', default: false },
                  relationType: { 
                    type: 'string', 
                    enum: ['attachment', 'main', 'reference'],
                    description: '关联类型',
                    default: 'attachment'
                  },
                  isTemplate: { type: 'boolean', description: '是否为模板', default: false }
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
        description: '基于模板生成智能文档内容',
        inputSchema: {
          type: 'object',
          properties: {
            templateType: { 
              type: 'string', 
              enum: ['bug_report', 'feature_spec', 'meeting_notes', 'project_plan', 'api_documentation', 'test_plan', 'user_story', 'technical_design'],
              description: '文档模板类型'
            },
            context: {
              type: 'object',
              description: '上下文信息',
              properties: {
                taskId: { type: 'number', description: '任务ID' },
                projectId: { type: 'number', description: '项目ID' },
                title: { type: 'string', description: '文档标题' },
                requirements: { type: 'string', description: '具体需求或描述' },
                priority: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high'],
                  description: '优先级' 
                },
                deadline: { type: 'string', description: '截止日期' },
                assignee: { type: 'string', description: '负责人' },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '相关标签' 
                }
              }
            },
            autoCreate: { 
              type: 'boolean', 
              description: '是否自动创建文档',
              default: false 
            }
          },
          required: ['templateType', 'context']
        }
      },
      {
        name: 'auto_fill_task_context',
        description: '自动填充任务上下文到文档模板',
        inputSchema: {
          type: 'object',
          properties: {
            taskIds: {
              type: 'array',
              items: { type: 'number' },
              description: '任务ID列表'
            },
            templateType: { 
              type: 'string', 
              enum: ['progress_report', 'task_summary', 'completion_report', 'status_update'],
              description: '报告模板类型'
            },
            includeSubtasks: { 
              type: 'boolean', 
              description: '是否包含子任务',
              default: true 
            },
            includeDocuments: { 
              type: 'boolean', 
              description: '是否包含相关文档',
              default: true 
            },
            includeTimeLogs: { 
              type: 'boolean', 
              description: '是否包含时间记录',
              default: true 
            },
            dateRange: {
              type: 'object',
              description: '日期范围',
              properties: {
                startDate: { type: 'string', description: '开始日期 (YYYY-MM-DD)' },
                endDate: { type: 'string', description: '结束日期 (YYYY-MM-DD)' }
              }
            }
          },
          required: ['taskIds', 'templateType']
        }
      },
      {
        name: 'create_task_docs',
        description: '批量为任务创建技术文档（Claude Code专用命令）',
        inputSchema: {
          type: 'object',
          properties: {
            task_ids: {
              type: 'array',
              items: { type: 'number' },
              description: '指定任务ID列表（可选，与date_filter二选一）'
            },
            date_filter: {
              type: 'string', 
              enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
              description: '按日期过滤任务（可选，与task_ids二选一）'
            },
            template_type: {
              type: 'string', 
              enum: ['auto', 'bug_fix', 'feature', 'project_phase', 'technical_design', 'api_documentation'],
              description: '文档模板类型',
              default: 'auto'
            },
            auto_attach: {
              type: 'boolean',
              description: '是否自动关联文档到任务',
              default: true
            },
            skip_existing: {
              type: 'boolean', 
              description: '是否跳过已有文档的任务',
              default: true
            },
            project_id: {
              type: 'number',
              description: '项目ID（可选，默认为1）',
              default: 1
            },
            batch_size: {
              type: 'number',
              description: '批量处理大小',
              default: 10
            }
          }
        }
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  let { name, arguments: args } = request.params as any;

  // Robust arguments handling: allow stringified JSON
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (e: any) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Invalid arguments JSON: ${e.message}` }) }]
      };
    }
  }
  if (args == null || typeof args !== 'object') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Arguments must be an object' }) }]
    };
  }

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
        result = await taskServer.findTask({ id: args.id as number, titlePattern: args.titlePattern as string });
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
      
      case 'create_sibling_task':
        result = await taskServer.createSiblingTask(
          args.siblingId as number, 
          args.title as string, 
          args.description as string,
          args.status as 'draft' | 'planning' | 'todo' | 'in_progress' | 'testing' | 'completed' | 'cancelled' | 'on_hold' | 'suspended' | 'blocked' | 'archived',
          args.priority as 'low' | 'medium' | 'high'
        );
        break;

      case 'create_batch_documents':
        result = await taskServer.createBatchDocuments(args.documents as any[]);
        break;

      case 'generate_document_from_template':
        result = await taskServer.generateDocumentFromTemplate(
          args.templateType as string,
          args.context as any,
          args.autoCreate as boolean
        );
        break;

      case 'auto_fill_task_context':
        result = await taskServer.autoFillTaskContext(
          args.taskIds as number[],
          args.templateType as string,
          args.includeSubtasks as boolean,
          args.includeDocuments as boolean,
          args.includeTimeLogs as boolean,
          args.dateRange as any
        );
        break;

      case 'create_task_docs':
        result = await taskServer.createTaskDocs({
          task_ids: args.task_ids as number[],
          date_filter: args.date_filter as string,
          template_type: args.template_type as string,
          auto_attach: args.auto_attach as boolean,
          skip_existing: args.skip_existing as boolean,
          project_id: args.project_id as number,
          batch_size: args.batch_size as number
        });
        break;
      
      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Unknown tool: ${name}` }) }]
        };
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
  console.error('Task MCP Server started successfully');

  // Keep the server alive until stdio is closed by the host
  await new Promise(() => {});
}

// 错误处理（不强制退出，避免关闭stdio通道）
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main().catch((error) => {
  console.error('Failed to start MCP Server:', error);
  // do not exit; let host manage lifecycle
});
