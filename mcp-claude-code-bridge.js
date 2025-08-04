#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

// AI项目管理平台API配置
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
let AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

class AIProjectManagerMCP {
  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // 创建任务
  async createTask(title, projectId = 1) {
    try {
      const response = await this.apiClient.post('/tasks', {
        title,
        project_id: projectId,
        status: 'todo',
        description: `通过Claude Code创建：${title}`
      });
      return {
        success: true,
        task: response.data,
        message: `✅ 任务已创建 (ID: ${response.data.id})`
      };
    } catch (error) {
      return {
        success: false,
        error: `创建任务失败: ${error.message}`
      };
    }
  }

  // 开始任务
  async startTask(id) {
    try {
      const getResponse = await this.apiClient.get(`/tasks/${id}`);
      const task = getResponse.data;
      
      const response = await this.apiClient.put(`/tasks/${id}`, {
        ...task,
        status: 'in_progress'
      });
      
      return {
        success: true,
        task: response.data,
        message: `🚀 任务 "${task.title}" 已开始执行`
      };
    } catch (error) {
      return {
        success: false,
        error: `开始任务失败: ${error.message}`
      };
    }
  }

  // 完成任务
  async completeTask(id) {
    try {
      const getResponse = await this.apiClient.get(`/tasks/${id}`);
      const task = getResponse.data;
      
      const response = await this.apiClient.put(`/tasks/${id}`, {
        ...task,
        status: 'completed'
      });
      
      return {
        success: true,
        task: response.data,
        message: `✅ 任务 "${task.title}" 已完成`
      };
    } catch (error) {
      return {
        success: false,
        error: `完成任务失败: ${error.message}`
      };
    }
  }

  // 查看任务列表
  async listTasks(projectId) {
    try {
      const url = projectId ? `/tasks?project_id=${projectId}` : `/tasks`;
      const response = await this.apiClient.get(url);
      const tasks = response.data;
      
      return {
        success: true,
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
          created_at: task.created_at
        })),
        message: `📋 共找到 ${tasks.length} 个任务`
      };
    } catch (error) {
      return {
        success: false,
        error: `获取任务列表失败: ${error.message}`
      };
    }
  }

  // 创建子任务
  async createSubTask(parentId, title) {
    try {
      const response = await this.apiClient.post('/subtasks', {
        title,
        parent_id: parentId,
        status: 'todo',
        description: `通过Claude Code创建的子任务：${title}`
      });
      
      return {
        success: true,
        task: response.data,
        message: `✅ 子任务已创建 (ID: ${response.data.id})`
      };
    } catch (error) {
      return {
        success: false,
        error: `创建子任务失败: ${error.message}`
      };
    }
  }
}

// 创建MCP服务器
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

// 注册工具
server.setRequestHandler('tools/list', async () => {
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
            projectId: { type: 'number', description: '项目ID（可选）' }
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
      }
    ]
  };
});

// 处理工具调用
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  let result;
  switch (name) {
    case 'create_task':
      result = await aiProjManager.createTask(args.title, args.projectId);
      break;
    case 'start_task':
      result = await aiProjManager.startTask(args.id);
      break;
    case 'complete_task':
      result = await aiProjManager.completeTask(args.id);
      break;
    case 'list_tasks':
      result = await aiProjManager.listTasks(args.projectId);
      break;
    case 'create_subtask':
      result = await aiProjManager.createSubTask(args.parentId, args.title);
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
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Project Manager MCP Server started');
}

main().catch(console.error);
