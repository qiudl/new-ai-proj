#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

// AI项目管理平台API配置
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

console.error(`[MCP Bridge] Starting with API_BASE: ${API_BASE}`);
console.error(`[MCP Bridge] Token configured: ${AUTH_TOKEN ? 'Yes' : 'No'}`);

class AIProjectManagerMCP {
  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  // 创建任务
  async createTask(title, projectId = 1) {
    try {
      console.error(`[MCP Bridge] Creating task: ${title} in project ${projectId}`);
      const response = await this.apiClient.post(`/projects/${projectId}/tasks`, {
        title,
        status: 'todo',
        description: `通过Claude Code创建：${title}`
      });
      return {
        success: true,
        task: response.data,
        message: `✅ 任务已创建 (ID: ${response.data.id})`
      };
    } catch (error) {
      console.error(`[MCP Bridge] Create task error:`, error.message);
      return {
        success: false,
        error: `创建任务失败: ${error.message}`
      };
    }
  }

  // 查看任务列表
  async listTasks(projectId = 1) {
    try {
      console.error(`[MCP Bridge] Listing tasks for project ${projectId}`);
      const response = await this.apiClient.get(`/projects/${projectId}/tasks`);
      const tasks = response.data;
      
      return {
        success: true,
        tasks: Array.isArray(tasks) ? tasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          created_at: task.created_at
        })) : [],
        message: `📋 共找到 ${Array.isArray(tasks) ? tasks.length : 0} 个任务`
      };
    } catch (error) {
      console.error(`[MCP Bridge] List tasks error:`, error.message);
      return {
        success: false,
        error: `获取任务列表失败: ${error.message}`
      };
    }
  }

  // 开始任务
  async startTask(id) {
    try {
      console.error(`[MCP Bridge] Starting task ${id}`);
      const response = await this.apiClient.put(`/projects/1/tasks/${id}`, {
        status: 'in_progress'
      });
      
      return {
        success: true,
        task: response.data,
        message: `🚀 任务 ID:${id} 已开始执行`
      };
    } catch (error) {
      console.error(`[MCP Bridge] Start task error:`, error.message);
      return {
        success: false,
        error: `开始任务失败: ${error.message}`
      };
    }
  }

  // 完成任务
  async completeTask(id) {
    try {
      console.error(`[MCP Bridge] Completing task ${id}`);
      const response = await this.apiClient.put(`/projects/1/tasks/${id}`, {
        status: 'completed'
      });
      
      return {
        success: true,
        task: response.data,
        message: `✅ 任务 ID:${id} 已完成`
      };
    } catch (error) {
      console.error(`[MCP Bridge] Complete task error:`, error.message);
      return {
        success: false,
        error: `完成任务失败: ${error.message}`
      };
    }
  }
}

// 创建MCP服务器实例
const server = new Server(
  {
    name: 'ai-project-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const aiProjManager = new AIProjectManagerMCP();

// 注册工具列表
server.setRequestHandler('tools/list', async () => {
  console.error('[MCP Bridge] Tools list requested');
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
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[MCP Bridge] Tool called: ${name} with args:`, args);

  let result;
  try {
    switch (name) {
      case 'create_task':
        result = await aiProjManager.createTask(args.title, args.projectId);
        break;
      case 'list_tasks':
        result = await aiProjManager.listTasks(args.projectId);
        break;
      case 'start_task':
        result = await aiProjManager.startTask(args.id);
        break;
      case 'complete_task':
        result = await aiProjManager.completeTask(args.id);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`[MCP Bridge] Tool execution error:`, error);
    result = {
      success: false,
      error: `工具执行失败: ${error.message}`
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
});

// 启动服务器
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP Bridge] AI Project Manager MCP Server started successfully');
  } catch (error) {
    console.error('[MCP Bridge] Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[MCP Bridge] Fatal error:', error);
  process.exit(1);
});