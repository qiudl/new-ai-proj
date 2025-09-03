#!/usr/bin/env node

/**
 * MCP双协议服务器 - 同时支持stdio和HTTP协议
 * 
 * 功能特性：
 * - 统一的MCP服务器实例和工具处理
 * - 智能协议检测和选择
 * - 环境适应性配置
 * - 统一错误处理和日志
 * - 开发环境自动认证
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import * as cors from 'cors';
import * as http from 'http';

// ESM模块路径处理
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 类型定义
interface EnvironmentInfo {
  isDocker: boolean;
  isProduction: boolean;
  isDevelopment: boolean;
  hasStdio: boolean;
  forceStdio: boolean;
  forceHttp: boolean;
  shouldUseStdio: boolean;
  shouldUseHttp: boolean;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

interface ErrorResult {
  success: false;
  error: string;
  toolName?: string;
  protocol?: string;
  timestamp: string;
  duration?: number;
  details?: any;
}

// 环境检测和配置
class EnvironmentDetector {
  static detectEnvironment(): EnvironmentInfo {
    const isDocker = existsSync('/.dockerenv') || process.env.DOCKER === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = (process.env.NODE_ENV || process.env.APP_ENV || '').toLowerCase().includes('dev');
    const hasStdio = process.stdin.isTTY !== undefined;
    const forceStdio = process.env.FORCE_STDIO === 'true';
    const forceHttp = process.env.FORCE_HTTP === 'true';
    
    // 修复协议选择逻辑
    let shouldUseStdio = false;
    let shouldUseHttp = false;
    
    if (forceStdio && !forceHttp) {
      shouldUseStdio = true;
    } else if (forceHttp && !forceStdio) {
      shouldUseHttp = true;
    } else if (isDocker || isProduction) {
      // Docker或生产环境优先HTTP
      shouldUseHttp = true;
    } else if (hasStdio) {
      // 本地开发有stdio就用stdio
      shouldUseStdio = true;
    } else {
      // 默认情况下，开发环境尝试使用HTTP
      shouldUseHttp = true;
    }
    
    return {
      isDocker,
      isProduction,
      isDevelopment,
      hasStdio,
      forceStdio,
      forceHttp,
      shouldUseStdio,
      shouldUseHttp
    };
  }

  static logEnvironment(): EnvironmentInfo {
    const env = this.detectEnvironment();
    console.error('[HOOK] 环境检测结果:');
    console.error(`[HOOK]   Docker环境: ${env.isDocker}`);
    console.error(`[HOOK]   生产环境: ${env.isProduction}`);
    console.error(`[HOOK]   开发环境: ${env.isDevelopment}`);
    console.error(`[HOOK]   Stdio可用: ${env.hasStdio}`);
    console.error(`[HOOK]   强制Stdio: ${env.forceStdio}`);
    console.error(`[HOOK]   强制HTTP: ${env.forceHttp}`);
    console.error(`[HOOK]   启用Stdio: ${env.shouldUseStdio}`);
    console.error(`[HOOK]   启用HTTP: ${env.shouldUseHttp}`);
    return env;
  }
}

// 环境变量加载
const envCandidates = [
  join(__dirname, '.env'),
  join(__dirname, '..', '.env')
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, debug: false });
    console.error(`[HOOK] 加载环境变量: ${envPath}`);
    break;
  }
}

// API地址检测
function detectApiBase(): string {
  const fromEnv = process.env.TASK_API_BASE || process.env.API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  
  const inferredPort = (process.env.BACKEND_PORT || process.env.PORT || '8080').trim();
  const baseUrl = `http://localhost:${inferredPort}/api/v1`;
  console.error(`[HOOK] 推断API地址: ${baseUrl}`);
  return baseUrl;
}

// 初始化TaskMCP服务器
const apiBaseUrl = detectApiBase();
console.error(`[HOOK] TaskMCP服务器API地址: ${apiBaseUrl}`);
const taskServer = new TaskMCPServer(apiBaseUrl);

// MCP工具定义集合
const TOOL_DEFINITIONS: ToolDefinition[] = [
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
    },
    handler: async (args) => await taskServer.createTask(args.title, args.projectId || 1)
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
    },
    handler: async (args) => await taskServer.startTask(args.id)
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
    },
    handler: async (args) => await taskServer.completeTask(args.id)
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
    },
    handler: async (args) => await taskServer.pauseTask(args.id)
  },
  {
    name: 'list_tasks',
    description: '查看任务列表',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'number', description: '项目ID（可选，不指定则显示所有任务）' },
        page: { type: 'number', description: '页码，从1开始，默认1', default: 1, minimum: 1 },
        limit: { type: 'number', description: '每页数量，默认20，最大100', default: 20, minimum: 1, maximum: 100 },
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
        search: { type: 'string', description: '搜索关键词（任务标题或描述）' },
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
    },
    handler: async (args) => await taskServer.listTasks(args)
  },
  {
    name: 'create_subtask',
    description: '创建子任务',
    inputSchema: {
      type: 'object',
      properties: {
        parentId: { type: 'number', description: '父任务ID' },
        title: { type: 'string', description: '子任务标题' }
      },
      required: ['parentId', 'title']
    },
    handler: async (args) => await taskServer.createSubTask(args.parentId, args.title)
  },
  {
    name: 'find_task',
    description: '根据名称或ID搜索任务',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '任务ID（可选，优先使用）' },
        titlePattern: { type: 'string', description: '任务标题搜索关键词（可选）' }
      }
    },
    handler: async (args) => await taskServer.findTask(args)
  },
  {
    name: 'delete_task',
    description: '删除单个任务',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '要删除的任务ID' },
        force: { type: 'boolean', description: '是否强制删除（包含子任务）', default: false }
      },
      required: ['id']
    },
    handler: async (args) => await taskServer.deleteTask(args.id, args.force || false)
  },
  {
    name: 'update_task',
    description: '更新任务信息',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '要更新的任务ID' },
        updates: {
          type: 'object',
          description: '更新字段对象',
          properties: {
            title: { type: 'string', description: '新标题' },
            description: { type: 'string', description: '新描述' },
            status: {
              type: 'string',
              description: '新状态',
              enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'],
              default: 'todo'
            },
            priority: {
              type: 'string',
              description: '新优先级',
              enum: ['low', 'medium', 'high'],
              default: 'low'
            },
            due_date: { type: 'string', description: '新截止日期 (ISO 8601)' },
            assignee_id: { type: 'number', description: '新指派用户ID' }
          }
        }
      },
      required: ['id', 'updates']
    },
    handler: async (args) => await taskServer.updateTask(args.id, args.updates)
  },
  {
    name: 'move_task',
    description: '移动任务到其他项目', 
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '要移动的任务ID' },
        targetProjectId: { type: 'number', description: '目标项目ID' }
      },
      required: ['id', 'targetProjectId']
    },
    handler: async (args) => await taskServer.moveTask(args.id, args.targetProjectId)
  },
  {
    name: 'create_work_note',
    description: '创建工作笔记',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '工作笔记标题' },
        content: { type: 'string', description: '工作笔记内容（Markdown格式）' },
        type: { type: 'string', enum: ['markdown', 'text', 'html'], description: '笔记类型', default: 'markdown' },
        status: { type: 'string', enum: ['draft', 'published', 'archived'], description: '状态', default: 'draft' },
        visibility: { type: 'string', enum: ['private', 'team', 'public'], description: '可见性', default: 'private' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' }
      },
      required: ['title', 'content']
    },
    handler: async (args) => await taskServer.createWorkNote(args.title, args.content, { 
      type: args.type, 
      status: args.status, 
      visibility: args.visibility, 
      tags: args.tags 
    })
  },
  {
    name: 'list_work_notes',
    description: '列出工作笔记',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: '页码（从1开始）', default: 1 },
        limit: { type: 'number', description: '每页数量', default: 10 },
        status: { type: 'string', enum: ['draft', 'published', 'archived'], description: '按状态筛选' },
        type: { type: 'string', enum: ['markdown', 'text', 'html'], description: '按类型筛选' }
      }
    },
    handler: async (args) => {
      console.error('[DEBUG] hook.ts list_work_notes args:', JSON.stringify(args, null, 2));
      const result = await taskServer.listWorkNotes({
        page: args.page,
        limit: args.limit,
        status: args.status,
        type: args.type
      });
      console.error('[DEBUG] hook.ts list_work_notes result:', JSON.stringify(result, null, 2));
      return result;
    }
  },
  {
    name: 'search_work_notes',
    description: '搜索工作笔记',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签过滤' },
        limit: { type: 'number', description: '返回结果数量限制', default: 10 }
      },
      required: ['query']
    },
    handler: async (args) => await taskServer.searchWorkNotes(args.query, {
      tags: args.tags,
      limit: args.limit
    })
  },
  {
    name: 'get_work_note',
    description: '获取工作笔记详情',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '工作笔记ID' }
      },
      required: ['id']
    },
    handler: async (args) => await taskServer.getWorkNote(args.id)
  },
  {
    name: 'update_work_note',
    description: '更新工作笔记',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '工作笔记ID' },
        updates: {
          type: 'object',
          description: '更新字段对象',
          properties: {
            title: { type: 'string', description: '新标题' },
            content: { type: 'string', description: '新内容' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'], description: '新状态' },
            type: { type: 'string', enum: ['markdown', 'text', 'html'], description: '新类型' },
            visibility: { type: 'string', enum: ['private', 'team', 'public'], description: '新可见性' },
            tags: { type: 'array', items: { type: 'string' }, description: '新标签列表' }
          }
        }
      },
      required: ['id', 'updates']
    },
    handler: async (args) => await taskServer.updateWorkNote(args.id, args.updates)
  },
  {
    name: 'create-and-attach-work-note',
    description: '创建工作笔记并关联到指定任务（专用于知识管理内容）',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'number', description: '任务ID' },
        content: { type: 'string', description: '工作笔记内容（Markdown格式）' },
        title: { type: 'string', description: '工作笔记标题（可选，默认根据任务标题生成）' }
      },
      required: ['taskId', 'content']
    },
    handler: async (args) => await taskServer.createAndAttachWorkNote(args.taskId, args.content, args.title)
  },
  {
    name: 'dev_quick_login',
    description: '开发环境快速登录，自动获取 JWT（仅 APP_ENV=development/dev 有效）',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: '登录用户名（可选，默认 admin 或 DEV_LOGIN_USERNAME 环境变量）' }
      }
    },
    handler: async (args) => await taskServer.devQuickLogin(args.username)
  }
];

// 统一的工具处理函数
async function handleToolCall(toolName: string, args: any, protocol: string = 'unknown'): Promise<any> {
  const startTime = Date.now();
  
  try {
    console.error(`[HOOK] 工具调用开始: ${toolName} (协议: ${protocol})`);
    console.error(`[HOOK] 参数:`, JSON.stringify(args, null, 2));
    
    // 查找工具定义
    const toolDef = TOOL_DEFINITIONS.find(t => t.name === toolName);
    if (!toolDef) {
      throw new Error(`未知工具: ${toolName}`);
    }
    
    // 调用处理函数
    const result = await toolDef.handler(args);
    const duration = Date.now() - startTime;
    
    console.error(`[HOOK] 工具调用成功: ${toolName} (耗时: ${duration}ms)`);
    console.error(`[HOOK] 返回结果:`, JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[HOOK] 工具调用失败: ${toolName} (耗时: ${duration}ms)`);
    console.error(`[HOOK] 错误详情:`, error?.message || error);
    console.error(`[HOOK] 错误堆栈:`, error?.stack);
    
    const errorResult: ErrorResult = {
      success: false,
      error: `工具调用失败: ${error?.message || String(error)}`,
      toolName,
      protocol,
      timestamp: new Date().toISOString(),
      duration
    };
    
    // 对于某些工具，提供更详细的错误信息
    if (toolName === 'create_task' && error?.message) {
      errorResult.details = {
        endpoint: args.projectId ? `/projects/${args.projectId}/tasks` : '/tasks',
        title: args.title,
        isDuplicate: error.message.includes('duplicate') || error.message.includes('已存在')
      };
    }
    
    return errorResult;
  }
}

// 响应格式化函数
function formatResponse(result: any, protocol: string): any {
  if (protocol === 'mcp') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } else {
    return result;
  }
}

// 创建MCP服务器
const server = new Server(
  {
    name: 'ai-proj-hook',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`[HOOK] 列出工具列表 (协议: stdio)`);
  return {
    tools: TOOL_DEFINITIONS.map(tool => ({
      name: tool.name,
      description: tool.description, 
      inputSchema: tool.inputSchema
    }))
  };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleToolCall(name, args || {}, 'mcp');
  return formatResponse(result, 'mcp');
});

// 创建HTTP服务器
function createHttpServer(): express.Application {
  const app = express();
  
  // 中间件
  app.use(cors.default({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // 请求日志中间件
  app.use((req, res, next) => {
    console.error(`[HTTP] ${req.method} ${req.path} - ${req.ip}`);
    next();
  });
  
  // 健康检查
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      mode: 'dual-protocol-hook',
      timestamp: new Date().toISOString(),
      protocols: ['stdio', 'http'],
      apiBaseUrl: apiBaseUrl
    });
  });
  
  // 工具列表端点
  app.get('/api/tools', async (req: Request, res: Response) => {
    try {
      const tools = TOOL_DEFINITIONS.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
      res.json({
        success: true,
        tools: tools,
        count: tools.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || String(error)
      });
    }
  });
  
  // 动态注册工具端点
  TOOL_DEFINITIONS.forEach(tool => {
    const endpoint = `/api/${tool.name}`;
    
    app.post(endpoint, async (req: Request, res: Response) => {
      try {
        const result = await handleToolCall(tool.name, req.body, 'http');
        const statusCode = result.success === false ? 400 : 200;
        res.status(statusCode).json(result);
      } catch (error: any) {
        console.error(`[HTTP] 端点 ${endpoint} 异常:`, error);
        res.status(500).json({
          success: false,
          error: error?.message || String(error),
          endpoint: endpoint
        });
      }
    });
    
    console.error(`[HTTP] 注册端点: POST ${endpoint}`);
  });
  
  // 404处理
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `端点不存在: ${req.method} ${req.path}`,
      availableEndpoints: TOOL_DEFINITIONS.map(t => `POST /api/${t.name}`)
    });
  });
  
  // 错误处理中间件
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[HTTP] 服务器错误:`, err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  });
  
  return app;
}

// 开发环境自动认证
async function performAutoLogin(): Promise<void> {
  try {
    const env = EnvironmentDetector.detectEnvironment();
    
    if (!env.isDevelopment) {
      console.error('[HOOK] 非开发环境，跳过自动登录');
      return;
    }
    
    const username = process.env.DEV_LOGIN_USERNAME?.split(',')?.[0]?.trim() || 'admin';
    console.error(`[HOOK] 开发环境自动登录: ${username}`);
    
    const loginRes = await taskServer.devQuickLogin(username);
    console.error('[HOOK] 登录响应:', JSON.stringify(loginRes, null, 2));
    
    if (loginRes?.success && (loginRes as any).token) {
      taskServer.setAuthToken((loginRes as any).token as string);
      console.error('[HOOK] 自动登录成功，已设置认证令牌');
    } else {
      console.error('[HOOK] 自动登录失败:', (loginRes as any)?.error || 'unknown error');
    }
  } catch (error: any) {
    console.error('[HOOK] 自动登录过程异常:', error?.message || String(error));
  }
}

// 主启动函数
async function main(): Promise<void> {
  console.error('='.repeat(60));
  console.error('[HOOK] MCP双协议Hook服务器启动');
  console.error('='.repeat(60));
  
  // 环境检测
  const env = EnvironmentDetector.logEnvironment();
  
  // 自动认证
  await performAutoLogin();
  
  let httpServer: http.Server | null = null;
  let stdioConnected = false;
  
  // 启动HTTP协议
  if (env.shouldUseHttp) {
    try {
      const app = createHttpServer();
      const httpPort = process.env.HTTP_PORT || process.env.PORT || 3100;
      
      httpServer = http.createServer(app);
      
      httpServer.listen(httpPort, () => {
        console.error(`[HOOK] HTTP协议启动成功 - 端口: ${httpPort}`);
        console.error(`[HOOK] 健康检查: http://localhost:${httpPort}/health`);
        console.error(`[HOOK] 工具列表: http://localhost:${httpPort}/api/tools`);
        console.error(`[HOOK] 工具端点: http://localhost:${httpPort}/api/{tool_name}`);
      });
      
      httpServer.on('error', (error: any) => {
        console.error('[HOOK] HTTP服务器错误:', error);
      });
      
    } catch (error: any) {
      console.error('[HOOK] HTTP协议启动失败:', error);
    }
  }
  
  // 启动Stdio协议
  if (env.shouldUseStdio) {
    try {
      console.error('[HOOK] 初始化Stdio协议...');
      const transport = new StdioServerTransport();
      await server.connect(transport);
      stdioConnected = true;
      console.error('[HOOK] Stdio协议启动成功');
    } catch (error: any) {
      console.error('[HOOK] Stdio协议启动失败:', error?.message || error);
      if (!env.shouldUseHttp) {
        console.error('[HOOK] 无可用协议，退出');
        process.exit(1);
      }
    }
  }
  
  // 启动状态总结
  console.error('='.repeat(60));
  console.error('[HOOK] 双协议服务器运行状态:');
  console.error(`[HOOK]   Stdio协议: ${stdioConnected ? '✓ 已连接' : '✗ 未连接'}`);
  console.error(`[HOOK]   HTTP协议: ${httpServer ? '✓ 已启动' : '✗ 未启动'}`);
  console.error(`[HOOK]   后端API: ${apiBaseUrl}`);
  console.error(`[HOOK]   工具数量: ${TOOL_DEFINITIONS.length}`);
  console.error('='.repeat(60));
  
  // 保持服务运行
  const keepAlive = (): Promise<void> => {
    return new Promise((resolve) => {
      // 信号处理
      ['SIGINT', 'SIGTERM'].forEach(signal => {
        process.on(signal, () => {
          console.error(`[HOOK] 收到 ${signal}，正在优雅关闭...`);
          if (httpServer) {
            httpServer.close(() => {
              console.error('[HOOK] HTTP服务器已关闭');
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
      
      // Stdio关闭处理
      if (stdioConnected) {
        process.stdin.on('close', () => {
          console.error('[HOOK] Stdio连接关闭');
          resolve();
        });
      }
      
      // 定期心跳（降低频率）
      setInterval(() => {
        const protocols: string[] = [];
        if (stdioConnected) protocols.push('stdio');
        if (httpServer) protocols.push('http');
        console.error(`[HOOK] 心跳 - 活跃协议: [${protocols.join(', ')}]`);
      }, 30000); // 30秒
    });
  };
  
  await keepAlive();
  console.error('[HOOK] 双协议服务器已停止');
}

// 全局错误处理
process.on('uncaughtException', (error: Error) => {
  console.error('[HOOK] 未捕获异常:', error);
  // 不退出，让服务继续运行
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[HOOK] 未处理的Promise拒绝:', promise, 'reason:', reason);
  // 不退出，让服务继续运行
});

// 启动服务器
main().catch((error: any) => {
  console.error('[HOOK] 启动失败:', error);
  process.exit(1);
});
