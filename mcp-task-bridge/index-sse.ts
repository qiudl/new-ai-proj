#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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

// 加载环境变量
const envCandidates = [
  join(__dirname, '.env'),
  join(__dirname, '..', '.env'),
  join(__dirname, '.env.production')
];
for (const p of envCandidates) {
  if (existsSync(p)) {
    dotenv.config({ path: p, debug: false });
    break;
  }
}

// Express App
const app = express();
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Session管理: sessionId -> SSEServerTransport
const sessions = new Map<string, SSEServerTransport>();

// 检测API Base URL
function detectApiBase(): string {
  const fromEnv = process.env.TASK_API_BASE || process.env.API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  const inferredPort = (process.env.BACKEND_PORT || process.env.PORT || '8080').trim();
  return `http://localhost:${inferredPort}/api/v1`;
}

const apiBaseUrl = detectApiBase();
console.log('[MCP-SSE] 🚀 Initializing TaskMCPServer');
console.log('[MCP-SSE] 📡 API Base URL:', apiBaseUrl);

const taskServer = new TaskMCPServer(apiBaseUrl);

// 创建MCP Server
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

// 注册工具列表 (复用index.ts的逻辑)
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
        name: 'list_tasks',
        description: '查看任务列表',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: '项目ID（可选）' },
            page: { type: 'number', default: 1, minimum: 1 },
            limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
            status: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived']
              }
            },
            priority: {
              type: 'array',
              items: { type: 'string', enum: ['low', 'medium', 'high'] }
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
            parentId: { type: 'number', description: '父任务ID' },
            title: { type: 'string', description: '子任务标题' }
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
            id: { type: 'number', description: '任务ID' },
            titlePattern: { type: 'string', description: '标题搜索关键词' }
          }
        }
      },
      {
        name: 'delete_task',
        description: '删除单个任务',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: '任务ID' },
            force: { type: 'boolean', default: false, description: '是否强制删除(包含子任务)' }
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
            id: { type: 'number', description: '任务ID' },
            updates: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                assignee_id: { type: 'number' },
                due_date: { type: 'string' }
              }
            }
          },
          required: ['id', 'updates']
        }
      },
      {
        name: 'create-and-attach',
        description: '创建任务文档并关联到任务',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'number', description: '任务ID' },
            content: { type: 'string', description: '文档内容(Markdown格式)' },
            title: { type: 'string', description: '文档标题（可选）' },
            projectId: { type: 'number', description: '项目ID（可选）' }
          },
          required: ['taskId', 'content']
        }
      },
      {
        name: 'append-document-content',
        description: '向现有文档追加内容，支持无限次追加突破字数限制',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'number', description: '任务ID' },
            documentId: { type: 'number', description: '文档ID' },
            content: { type: 'string', description: '要追加的内容(Markdown格式)' },
            projectId: { type: 'number', description: '项目ID（可选，默认为1）' }
          },
          required: ['taskId', 'documentId', 'content']
        }
      }
    ],
  };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // 类型断言为any以便访问属性
  const params = args as any;

  console.log(`[MCP-SSE] 🔧 Tool called: ${name}`, params);

  try {
    let result;
    switch (name) {
      case 'create_task':
        result = await taskServer.createTask(params.title, params.projectId || 1);
        break;
      case 'start_task':
        result = await taskServer.startTask(params.id);
        break;
      case 'complete_task':
        result = await taskServer.completeTask(params.id);
        break;
      case 'pause_task':
        result = await taskServer.pauseTask(params.id);
        break;
      case 'list_tasks':
        result = await taskServer.listTasks(params);
        break;
      case 'create_subtask':
        result = await taskServer.createSubTask(params.parentId, { title: params.title });
        break;
      case 'find_task':
        result = await taskServer.findTask(params);
        break;
      case 'delete_task':
        result = await taskServer.deleteTask(params.id, params.force || false);
        break;
      case 'update_task':
        result = await taskServer.updateTask(params.id, params.updates);
        break;
      case 'create-and-attach':
        result = await taskServer.createAndAttachTaskDocument(
          params.taskId,
          params.content,
          params.projectId || 1,
          params.title
        );
        break;
      case 'append-document-content':
        result = await taskServer.appendDocumentContent(
          params.taskId,
          params.documentId,
          params.content,
          params.projectId
        );
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    console.error(`[MCP-SSE] ❌ Error executing ${name}:`, error.message);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mcp-bridge-sse',
    backend: apiBaseUrl,
    timestamp: new Date().toISOString()
  });
});

// SSE endpoint
app.get('/sse', async (req, res) => {
  console.log(`[MCP-SSE] 🔌 New SSE client connected from ${req.ip}`);

  const transport = new SSEServerTransport('/message', res);

  try {
    await server.connect(transport);
    console.log('[MCP-SSE] ✅ Server connected to transport');

    // 从transport获取sessionId并存储
    // SSEServerTransport会在endpoint URL中包含sessionId
    // 提取sessionId的方式:从res对象的session或从transport的endpoint
    const sessionIdMatch = transport.sessionId ||
                          (res as any)._sseSessionId ||
                          Math.random().toString(36).substring(7);

    sessions.set(sessionIdMatch, transport);
    console.log(`[MCP-SSE] 📝 Session ${sessionIdMatch} registered`);

    // 清理断开的连接
    res.on('close', () => {
      sessions.delete(sessionIdMatch);
      console.log(`[MCP-SSE] 🔌 Session ${sessionIdMatch} closed`);
    });
  } catch (error) {
    console.error('[MCP-SSE] ❌ Failed to connect transport:', error);
  }
});

// Message endpoint
app.post('/message', async (req, res) => {
  const sessionId = req.query.sessionId as string;

  console.log('[MCP-SSE] 📨 Received message for session:', sessionId);

  if (!sessionId) {
    console.error('[MCP-SSE] ❌ No sessionId provided');
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  const transport = sessions.get(sessionId);

  if (!transport) {
    console.error('[MCP-SSE] ❌ Session not found:', sessionId);
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  try {
    // 调用transport的handlePostMessage方法处理消息
    await transport.handlePostMessage(req, res, req.body);
    console.log('[MCP-SSE] ✅ Message processed successfully');
  } catch (error) {
    console.error('[MCP-SSE] ❌ Error processing message:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Start server
const PORT = process.env.MCP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`[MCP-SSE] ✨ Server running on port ${PORT}`);
  console.log(`[MCP-SSE] 📡 SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`[MCP-SSE] 💊 Health check: http://localhost:${PORT}/health`);
});
