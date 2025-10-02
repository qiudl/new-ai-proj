import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量（优先 index 所在目录，其次上级目录，兼容编译到 dist 的情况）
// 禁用 dotenv 调试输出
const envCandidates = [
  join(__dirname, '.env'),
  join(__dirname, '..', '.env')
];
for (const p of envCandidates) {
  if (existsSync(p)) {
    dotenv.config({ path: p, debug: false });
    break;
  }
}

// 初始化任务服务器 - 从环境变量读取API地址
// 优先使用 TASK_API_BASE，其次兼容 API_BASE_URL；若都未设置，基于 BACKEND_PORT/PORT 推断（默认 8080）
function detectApiBase(): string {
  const fromEnv = process.env.TASK_API_BASE || process.env.API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  const inferredPort = (process.env.BACKEND_PORT || process.env.PORT || '8080').trim();
  return `http://localhost:${inferredPort}/api/v1`;
}
const apiBaseUrl = detectApiBase();
console.error('[MCP] 初始化 TaskMCPServer（连接后端模式）');
console.error('[MCP] API基础URL:', apiBaseUrl);
const taskServer = new TaskMCPServer(apiBaseUrl);

// 创建 MCP Server
const server = new Server(
  {
    name: 'ai-proj',
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
        name: 'list_tasks',
        description: '查看任务列表',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { 
              type: 'number', 
              description: '项目ID（可选，不指定则显示所有任务）' 
            },
            page: {
              type: 'number',
              description: '页码，从1开始，默认1',
              default: 1,
              minimum: 1
            },
            limit: {
              type: 'number', 
              description: '每页数量，默认20，最大100',
              default: 20,
              minimum: 1,
              maximum: 100
            },
            status: {
              type: 'array',
              description: '过滤任务状态',
              items: {
                type: 'string',
                enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived']
              }
            },
            priority: {
              type: 'array',
              description: '过滤优先级',
              items: {
                type: 'string',
                enum: ['low', 'medium', 'high']
              }
            },
            search: {
              type: 'string',
              description: '搜索关键词（任务标题或描述）'
            },
            sort_by: {
              type: 'string',
              description: '排序字段',
              enum: ['created_at', 'updated_at', 'due_date', 'priority', 'title'],
              default: 'updated_at'
            },
            sort_order: {
              type: 'string',
              description: '排序方向',
              enum: ['asc', 'desc'],
              default: 'desc'
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
        name: 'create-and-attach',
        description: '创建任务文档并关联到数据库（原子操作：在事务中创建文档记录并建立任务关联关系）',
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
            title: {
              type: 'string',
              description: '文档标题（可选，默认根据任务标题生成）'
            },
            projectId: { 
              type: 'number', 
              description: '项目ID（可选，默认使用任务所在项目）' 
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
        name: 'create-and-attach-work-note',
        description: '创建工作笔记并关联到指定任务（专用于知识管理内容）',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { 
              type: 'number', 
              description: '任务ID' 
            },
            content: { 
              type: 'string', 
              description: '工作笔记内容（Markdown格式）' 
            },
            title: {
              type: 'string',
              description: '工作笔记标题（可选，默认根据任务标题生成）'
            }
          },
          required: ['taskId', 'content']
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
        name: 'get_detailed_task_info',
        description: '获取任务详细信息（包含格式化的父任务、同级任务和子任务，任务名称前显示ID）',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { 
              type: 'number', 
              description: '任务ID' 
            }
          },
          required: ['taskId']
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
        name: 'get_active_timers',
        description: '获取所有活跃计时器（running/paused）',
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
      },
      
      // 📝 工作笔记管理工具
      {
        name: 'create_work_note',
        description: '创建工作笔记',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: '笔记标题'
            },
            content: {
              type: 'string', 
              description: '笔记内容（支持Markdown格式）'
            },
            type: {
              type: 'string',
              enum: ['markdown', 'text', 'html'],
              description: '笔记类型',
              default: 'markdown'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: '标签列表'
            },
            visibility: {
              type: 'string',
              enum: ['private', 'team', 'public'],
              description: '可见性',
              default: 'private'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              description: '状态',
              default: 'draft'
            }
          },
          required: ['title', 'content']
        }
      },
      
      {
        name: 'list_work_notes',
        description: '列出工作笔记',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: '页码（从1开始）',
              default: 1
            },
            limit: {
              type: 'number', 
              description: '每页数量',
              default: 10
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'archived'],
              description: '按状态筛选'
            },
            type: {
              type: 'string',
              enum: ['markdown', 'text', 'html'],
              description: '按类型筛选'
            }
          }
        }
      },
      
      {
        name: 'search_work_notes',
        description: '搜索工作笔记',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词（搜索标题和内容）'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: '按标签筛选'
            },
            limit: {
              type: 'number',
              description: '返回结果数量限制',
              default: 10
            }
          },
          required: ['query']
        }
      },
      
      {
        name: 'get_work_note',
        description: '获取工作笔记详情',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: '工作笔记ID'
            }
          },
          required: ['id']
        }
      },
      
      {
        name: 'update_work_note',
        description: '更新工作笔记',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: '工作笔记ID'
            },
            updates: {
              type: 'object',
              properties: {
                title: { type: 'string', description: '新标题' },
                content: { type: 'string', description: '新内容' },
                type: { 
                  type: 'string', 
                  enum: ['markdown', 'text', 'html'],
                  description: '笔记类型' 
                },
                tags: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '标签列表' 
                },
                visibility: { 
                  type: 'string', 
                  enum: ['private', 'team', 'public'],
                  description: '可见性' 
                },
                status: { 
                  type: 'string', 
                  enum: ['draft', 'published', 'archived'],
                  description: '状态' 
                }
              }
            }
          },
          required: ['id', 'updates']
        }
      },
      
      // 🚀 核心功能1：智能启动任务并开始计时
      {
        name: 'start_task_with_timer',
        description: '启动任务并开始计时（支持标题模糊匹配）',
        inputSchema: {
          type: 'object',
          properties: {
            taskIdOrTitle: { 
              anyOf: [
                { type: 'number' },
                { type: 'string' }
              ],
              description: '任务ID或任务标题（支持模糊匹配）' 
            },
            timerDescription: {
              type: 'string',
              description: '计时器描述（可选）'
            },
            projectId: { 
              type: 'number', 
              description: '项目ID（可选，默认为1）' 
            }
          },
          required: ['taskIdOrTitle']
        }
      },
      
      // 🔄 核心功能2：智能工作切换
      {
        name: 'switch_to_task',
        description: '从当前任务切换到新任务（智能多维度匹配：标题相似度、任务状态、优先级、最近更新、Daily Focus）',
        inputSchema: {
          type: 'object',
          properties: {
            newTaskTitle: {
              type: 'string',
              description: '要切换到的任务标题（支持智能模糊匹配，会综合评分选择最佳任务）'
            },
            projectId: {
              type: 'number',
              description: '项目ID（可选，默认为1）'
            }
          },
          required: ['newTaskTitle']
        }
      },
      
      // 📊 核心功能3：工作报告生成
      {
        name: 'get_daily_work_report',
        description: '生成今日工作报告',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { 
              type: 'number', 
              description: '项目ID（可选，默认为1）' 
            }
          }
        }
      },
      
      {
        name: 'get_task_timeline',
        description: '获取任务时间线事件',
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
            },
            limit: { 
              type: 'number', 
              description: '返回记录数限制（默认20，最大100）' 
            },
            offset: { 
              type: 'number', 
              description: '偏移量（默认0）' 
            }
          },
          required: ['taskId']
        }
      },
      
      // 🎯 Daily Focus Tasks 功能
      {
        name: 'get_daily_focus_tasks',
        description: '获取今日主要任务列表',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: '日期（可选，格式：YYYY-MM-DD）'
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'removed'],
              description: '任务状态过滤（可选）'
            },
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: '优先级过滤（可选）'
            },
            include_suggestions: {
              type: 'boolean',
              description: '是否包含智能推荐（可选）'
            }
          }
        }
      },
      
      {
        name: 'add_daily_focus_task',
        description: '添加任务到今日主要任务',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'number',
              description: '任务ID'
            },
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: '优先级（可选，默认medium）'
            },
            notes: {
              type: 'string',
              description: '备注（可选）'
            },
            estimated_duration_minutes: {
              type: 'number',
              description: '预估时长（分钟，可选）'
            },
            focus_date: {
              type: 'string',
              description: '聚焦日期（可选，格式：YYYY-MM-DD）'
            }
          },
          required: ['task_id']
        }
      },

      {
        name: 'update_daily_focus_task',
        description: '更新今日主要任务信息',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Daily Focus任务ID'
            },
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: '新优先级（可选）'
            },
            notes: {
              type: 'string',
              description: '新备注（可选）'
            },
            estimated_duration_minutes: {
              type: 'number',
              description: '新预估时长（分钟，可选）'
            }
          },
          required: ['id']
        }
      },

      {
        name: 'remove_daily_focus_task',
        description: '从今日主要任务中移除',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Daily Focus任务ID'
            }
          },
          required: ['id']
        }
      },

      {
        name: 'complete_daily_focus_task',
        description: '标记今日主要任务完成',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Daily Focus任务ID'
            }
          },
          required: ['id']
        }
      },

      {
        name: 'get_daily_focus_stats',
        description: '获取今日主要任务统计信息',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: '日期（可选，格式：YYYY-MM-DD）'
            },
            period: {
              type: 'string',
              enum: ['daily', 'weekly', 'monthly'],
              description: '统计周期（可选）'
            }
          }
        }
      },

      {
        name: 'get_task_recommendations',
        description: '获取智能任务推荐',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '推荐数量限制（可选）'
            },
            date: {
              type: 'string',
              description: '日期（可选，格式：YYYY-MM-DD）'
            },
            exclude_existing: {
              type: 'boolean',
              description: '是否排除已存在的任务（可选）'
            }
          }
        }
      },

      {
        name: 'batch_add_daily_focus_tasks',
        description: '批量添加任务到今日主要任务',
        inputSchema: {
          type: 'object',
          properties: {
            task_ids: {
              type: 'array',
              items: { type: 'number' },
              description: '任务ID列表'
            },
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: '统一优先级（可选，默认medium）'
            },
            notes: {
              type: 'string',
              description: '统一备注（可选）'
            },
            focus_date: {
              type: 'string',
              description: '聚焦日期（可选，格式：YYYY-MM-DD）'
            }
          },
          required: ['task_ids']
        }
      },

      {
        name: 'clear_completed_tasks',
        description: '清理已完成的今日主要任务',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: '日期（可选，格式：YYYY-MM-DD）'
            },
            confirm: {
              type: 'boolean',
              description: '确认清理（必须设为true）'
            }
          }
        }
      },

      {
        name: 'quick_add_current_task',
        description: '快速添加当前正在进行的任务到今日主要任务',
        inputSchema: {
          type: 'object',
          properties: {
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: '优先级（可选，默认high）'
            },
            notes: {
              type: 'string',
              description: '备注（可选）'
            }
          }
        }
      },

      {
        name: 'focus_task_with_timer',
        description: '聚焦任务并开始计时',
        inputSchema: {
          type: 'object',
          properties: {
            daily_focus_task_id: {
              type: 'number',
              description: 'Daily Focus任务ID'
            },
            timer_description: {
              type: 'string',
              description: '计时器描述（可选）'
            }
          },
          required: ['daily_focus_task_id']
        }
      },

      {
        name: 'dev_quick_login',
        description: '开发环境快速登录，自动获取 JWT（仅 APP_ENV=development/dev 有效）',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: '登录用户名（可选，默认 admin 或 DEV_LOGIN_USERNAME 环境变量）'
            }
          }
        }
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`[MCP] 收到工具调用请求:`, JSON.stringify(request.params, null, 2));
  let { name, arguments: args } = request.params as any;
  console.error(`[MCP] 工具名称:`, name);

  // Robust arguments handling: allow stringified JSON
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (e: any) {
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
    console.error(`[MCP] Tool call received: ${name}`);
    let result: any;

    switch (name) {
      case 'create_task': {
        // 支持可选参数透传：description/priority/status/parent_id/tags/estimated_hours/custom_fields
        const options: any = {};
        if ((args as any).description) options.description = (args as any).description;
        if ((args as any).priority) options.priority = (args as any).priority;
        if ((args as any).status) options.status = (args as any).status;
        const parentId = (args as any).parent_id ?? (args as any).parentId;
        if (parentId != null) options.parent_id = parentId as number;
        if ((args as any).estimated_hours != null) options.estimated_hours = (args as any).estimated_hours;
        if (Array.isArray((args as any).tags)) options.tags = (args as any).tags as string[];
        if ((args as any).custom_fields) options.custom_fields = (args as any).custom_fields;
        result = await taskServer.createTask(args.title as string, args.projectId as number, options);
        break;
      }      
      case 'start_task':
        result = await taskServer.startTask(args.id as number);
        break;
      
      case 'complete_task':
        result = await taskServer.completeTask(args.id as number);
        break;
      
      case 'list_tasks':
        result = await taskServer.listTasks({
          projectId: args.projectId as number,
          page: args.page as number || 1,
          limit: args.limit as number || 20,
          status: args.status as string[],
          priority: args.priority as string[],
          search: args.search as string,
          sort_by: args.sort_by as string || 'updated_at',
          sort_order: (args.sort_order as 'asc' | 'desc') || 'desc'
        });
        break;
      
      case 'create_subtask':
        result = await taskServer.createSubTask(args.parentId as number, args.title as string);
        break;
      
      case 'find_task':
        result = await taskServer.findTask({ id: args.id as number, titlePattern: args.titlePattern as string });
        break;
      
      // 📝 工作笔记管理工具
      case 'create_work_note':
        result = await taskServer.createWorkNote(args.title as string, args.content as string, {
          type: args.type as any,
          tags: args.tags as string[],
          visibility: args.visibility as any,
          status: args.status as any
        });
        break;
      
      case 'list_work_notes':
        result = await taskServer.listWorkNotes({
          page: args.page as number,
          limit: args.limit as number,
          status: args.status as any,
          type: args.type as any
        });
        break;
      
      case 'search_work_notes':
        result = await taskServer.searchWorkNotes(args.query as string, {
          tags: args.tags as string[],
          limit: args.limit as number
        });
        break;
      
      case 'get_work_note':
        result = await taskServer.getWorkNote(args.id as number);
        break;
      
      case 'update_work_note':
        result = await taskServer.updateWorkNote(args.id as number, args.updates as any);
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
      
      case 'create-and-attach': {
        // 参数规范化：兼容 camelCase 与 snake_case
        const taskId = ((): number | undefined => {
          const v = (args as any).taskId ?? (args as any).task_id ?? (args as any).id ?? (args as any).task ?? (args as any).target_id;
          const n = typeof v === 'string' ? parseInt(v, 10) : v;
          return typeof n === 'number' && !isNaN(n) ? n : undefined;
        })();
        const projectId = ((): number | undefined => {
          const v = (args as any).projectId ?? (args as any).project_id ?? (args as any).project;
          const n = typeof v === 'string' ? parseInt(v, 10) : v;
          return typeof n === 'number' && !isNaN(n) ? n : undefined;
        })();
        const title = (args as any).title ?? (args as any).doc_title ?? (args as any).name;
        const rawContent = (args as any).content;
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent ?? '');

        if (!taskId) {
          result = { success: false, error: '缺少必要参数：taskId/task_id' };
          break;
        }
        if (!content || content.length === 0) {
          result = { success: false, error: '缺少必要参数：content' };
          break;
        }

        result = await taskServer.createAndAttachTaskDocument(
          taskId as number,
          content as string,
          projectId as number,
          title as string
        );
        break;
      }
      
      case 'get_task_document':
        try {
          result = await taskServer.getTaskDocument((args as any).taskId ?? (args as any).task_id as number, (args as any).projectId ?? (args as any).project_id as number);
        } catch (e: any) {
          result = { success: false, error: e?.message || String(e) };
        }
        // 本地回退：若后端无文档或失败，尝试读取 .mcp-documents/task-<id>.md
        if (!result?.success || (result && (result as any).not_found)) {
        try {
          const fs = await import('fs');
          const candidates = [
            join(process.cwd(), '.mcp-documents', `task-${(args as any).taskId ?? (args as any).task_id}.md`),
            join(process.cwd(), 'mcp-documents', `task-${(args as any).taskId ?? (args as any).task_id}.md`)
          ];
          for (const docPath of candidates) {
            if ((fs as any).existsSync(docPath)) {
              const content = (fs as any).readFileSync(docPath, 'utf8');
              result = {
                success: true,
                task_id: (args as any).taskId ?? (args as any).task_id,
                project_id: (args as any).projectId ?? (args as any).project_id,
                content,
                message: `文档内容已从本地 ${docPath.includes('/.mcp-documents/') ? '.mcp-documents' : 'mcp-documents'} 读取`
              };
              break;
            }
          }
        } catch (fallbackErr: any) {
          // 忽略本地回退错误，保持原始结果
        }
        }
        break;
      
      case 'has_task_document':
        try {
          result = await taskServer.hasTaskDocument(args.taskId as number, args.projectId as number);
        } catch (e: any) {
          result = { success: false, error: e?.message || String(e) };
        }
        // 本地回退检查
        try {
          const fs = await import('fs');
          const candidatePaths = [
            join(process.cwd(), '.mcp-documents', `task-${args.taskId}.md`),
            join(process.cwd(), 'mcp-documents', `task-${args.taskId}.md`)
          ];
          const existingPath = candidatePaths.find(p => (fs as any).existsSync(p));
          const hasLocal = !!existingPath;
          if (hasLocal && (!result?.success || (result && (result as any).has_document === false))) {
            result = {
              success: true,
              task_id: args.taskId,
              project_id: args.projectId,
              has_document: true,
              document_count: 1,
              message: `任务 ${args.taskId} 有本地文档（${existingPath && existingPath.includes('/.mcp-documents/') ? '.mcp-documents' : 'mcp-documents'}）`
            };
          } else if (!result?.success && !hasLocal) {
            // 若两边都无，则返回统一格式
            result = {
              success: true,
              task_id: args.taskId,
              project_id: args.projectId,
              has_document: false,
              document_count: 0,
              message: `任务 ${args.taskId} 没有文档`
            };
          }
        } catch (fallbackErr: any) {
          // 忽略本地回退错误
        }
        break;
      
      case 'create-and-attach-work-note': {
        const taskId = args.taskId as number;
        const content = args.content as string;
        const title = args.title as string;

        if (!taskId) {
          result = { success: false, error: '缺少必要参数：taskId' };
          break;
        }
        if (!content || content.length === 0) {
          result = { success: false, error: '缺少必要参数：content' };
          break;
        }

        result = await taskServer.createAndAttachWorkNote(
          taskId,
          content,
          title
        );
        break;
      }
      
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
        console.error(`[INDEX] 调用创建项目，参数:`, args);
        result = await taskServer.createProject(args.name as string, args.description as string);
        console.error(`[INDEX] 创建项目结果:`, result);
        break;
      
      case 'get_task_children':
        result = await taskServer.getTaskChildren(args.parentId as number);
        break;
      
      case 'get_detailed_task_info':
        result = await taskServer.getDetailedTaskInfo(args.taskId as number);
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
      case 'get_active_timers':
        result = await taskServer.getActiveTimers();
        break;
      
      case 'create_sibling_task':
        result = await taskServer.createSiblingTask(
          args.siblingId as number, 
          args.title as string, 
          {
            description: args.description as string,
            status: args.status as any,
            priority: args.priority as any
          }
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
      
      // 🚀 核心功能1：智能启动任务并开始计时
      case 'start_task_with_timer':
        // 首先处理taskIdOrTitle，智能识别是ID还是标题
        let taskId: number;
        const input = args.taskIdOrTitle;
        console.error(`[DEBUG] start_task_with_timer input: ${JSON.stringify(input)}, type: ${typeof input}`);
        
        // 如果是纯数字字符串或数字，尝试作为ID处理
        if (typeof input === 'number' || /^\d+$/.test(String(input))) {
          const numericId = typeof input === 'number' ? input : parseInt(String(input), 10);
          try {
            // 先尝试通过ID查找任务验证是否存在
            const task = await taskServer.findTaskById(numericId);
            if (task) {
              taskId = numericId;
            } else {
              throw new Error('Task not found by ID');
            }
          } catch (idError) {
            // ID查找失败，如果原输入是字符串，尝试标题匹配
            if (typeof input === 'string') {
              const findResult = await taskServer.findTaskByName(input);
              if (!findResult.success || !findResult.data?.tasks || findResult.data.tasks.length === 0) {
                result = {
                  success: false,
                  error: `找不到ID为 "${input}" 的任务，也找不到匹配标题 "${input}" 的任务`
                };
                break;
              }
              taskId = findResult.data.tasks[0].id;
            } else {
              result = {
                success: false,
                error: `找不到ID为 "${input}" 的任务`
              };
              break;
            }
          }
        } else {
          // 作为标题进行模糊匹配
          const findResult = await taskServer.findTaskByName(String(input));
          if (!findResult.success || !findResult.data?.tasks || findResult.data.tasks.length === 0) {
            result = {
              success: false,
              error: `找不到匹配标题 "${input}" 的任务`
            };
            break;
          }
          taskId = findResult.data.tasks[0].id;
        }
        result = await taskServer.startTaskWithTimer(taskId, args.timerDescription);
        break;
      
      // 🔄 核心功能2：智能工作切换
      case 'switch_to_task':
        result = await taskServer.switchToTask(args.newTaskTitle as string, args.projectId as number);
        break;
      
      // 📊 核心功能3：工作报告生成
      case 'get_daily_work_report':
        result = await taskServer.getDailyWorkReport(args.projectId as number);
        break;
      
      case 'get_task_timeline':
        console.error(`[MCP] 收到 get_task_timeline 调用，任务ID: ${args.taskId}`);
        result = await taskServer.getTaskTimeline(args.taskId as number, args.projectId as number, args.limit as number, args.offset as number);
        break;

      // 🎯 Daily Focus Tasks 处理
      case 'get_daily_focus_tasks':
        result = await taskServer.getDailyFocusTasks({
          date: args.date,
          status: args.status,
          priority: args.priority,
          include_suggestions: args.include_suggestions
        });
        break;

      case 'add_daily_focus_task':
        result = await taskServer.addDailyFocusTask({
          task_id: args.task_id,
          priority: args.priority,
          notes: args.notes,
          estimated_duration_minutes: args.estimated_duration_minutes,
          focus_date: args.focus_date
        });
        break;

      case 'update_daily_focus_task':
        result = await taskServer.updateDailyFocusTask(args.id, {
          priority: args.priority,
          notes: args.notes,
          estimated_duration_minutes: args.estimated_duration_minutes
        });
        break;

      case 'remove_daily_focus_task':
        result = await taskServer.removeDailyFocusTask(args.id);
        break;

      case 'complete_daily_focus_task':
        result = await taskServer.completeDailyFocusTask(args.id);
        break;

      case 'get_daily_focus_stats':
        result = await taskServer.getDailyFocusStats({
          date: args.date,
          period: args.period
        });
        break;

      case 'get_task_recommendations':
        result = await taskServer.getTaskRecommendations({
          limit: args.limit,
          date: args.date,
          exclude_existing: args.exclude_existing
        });
        break;

      case 'batch_add_daily_focus_tasks':
        result = await taskServer.batchAddDailyFocusTasks({
          task_ids: args.task_ids,
          priority: args.priority,
          notes: args.notes,
          focus_date: args.focus_date
        });
        break;

      case 'clear_completed_tasks':
        result = await taskServer.clearCompletedTasks({
          date: args.date,
          confirm: args.confirm
        });
        break;

      case 'quick_add_current_task':
        result = await taskServer.quickAddCurrentTask({
          priority: args.priority,
          notes: args.notes
        });
        break;

      case 'focus_task_with_timer':
        result = await taskServer.focusTaskWithTimer({
          daily_focus_task_id: args.daily_focus_task_id,
          timer_description: args.timer_description
        });
        break;

      case 'dev_quick_login':
        console.error(`[MCP] 收到 dev_quick_login 调用，用户名: ${args.username}`);
        result = await taskServer.devQuickLogin(args.username as string);
        break;
      
      default:
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
    } as any;
    console.error(`[MCP] Tool call succeeded: ${name}`);
    return response;
  } catch (error: any) {
    console.error(`[MCP] Tool call failed: ${name}`, error?.message || error);
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

// 进程锁管理已移除 - 允许多个MCP实例运行

// 启动服务器
async function main() {
  console.error('[MCP] 进程锁已禁用，允许多实例运行');

  process.on('SIGINT', () => {
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    process.exit(0);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Task MCP Server 已启动');
  console.error('[MCP] 连接到:', apiBaseUrl);
  console.error('[MCP] 文档本地回退目录优先级:', [
    join(process.cwd(), '.mcp-documents'),
    join(process.cwd(), 'mcp-documents')
  ]);

  // 开发环境自动登录（避免未授权导致的工具失败）
  try {
    const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
    const shouldAutoLogin = env === 'development' || env === 'dev' || process.env.AUTO_DEV_LOGIN === 'true';
    if (shouldAutoLogin) {
      const username = process.env.DEV_LOGIN_USERNAME?.split(',')?.[0]?.trim() || 'admin';
      console.error(`[MCP] 开发模式自动登录: ${username}`);
      const loginRes = await taskServer.devQuickLogin(username);
      console.error('[MCP] 登录响应:', JSON.stringify(loginRes));
      if (loginRes?.success && (loginRes as any).token) {
        taskServer.setAuthToken((loginRes as any).token as string);
        console.error('[MCP] 开发登录成功，已设置认证令牌');
      } else if (!loginRes?.success) {
        console.error('[MCP] 开发登录失败:', (loginRes as any)?.error || 'unknown');
      }
    }
  } catch (e: any) {
    console.error('[MCP] 自动登录过程发生错误:', e?.message || String(e));
  }

  // Keep the server alive until stdio is closed by the host
  console.error('[MCP] Server running, waiting for connections...');
  
  // Keep alive with event-driven approach
  const keepAlive = () => {
    return new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        console.error('[MCP] Received SIGINT, shutting down gracefully...');
        resolve();
      });
      
      process.on('SIGTERM', () => {
        console.error('[MCP] Received SIGTERM, shutting down gracefully...');
        resolve();
      });
      
      // Listen for stdin close (when parent process closes stdio connection)
      process.stdin.on('close', () => {
        console.error('[MCP] stdin closed, shutting down...');
        resolve();
      });
      
      
      // Optional heartbeat - reduced frequency
      const heartbeat = setInterval(() => {
        console.error('[MCP] Heartbeat - server is alive');
      }, 60000); // Every 60 seconds
      
      // Clean up on exit
      process.on('exit', () => {
        clearInterval(heartbeat);
      });
    });
  };
  
  await keepAlive();
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
