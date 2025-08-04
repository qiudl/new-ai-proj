#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');

// AI项目管理平台API配置
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

console.error(`[MCP Bridge] 完整版本启动`);
console.error(`[MCP Bridge] API_BASE: ${API_BASE}`);
console.error(`[MCP Bridge] Token configured: ${AUTH_TOKEN ? 'Yes' : 'No'}`);

class AIProjectAPIClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
  }

  // 1. Tasks Management - 任务管理
  async listTasks(projectId = 1) {
    try {
      const response = await this.client.get(`/projects/${projectId}/tasks`);
      return { success: true, data: response.data, message: `📋 项目${projectId}共有 ${response.data?.length || 0} 个任务` };
    } catch (error) {
      return { success: false, error: `获取任务列表失败: ${error.message}` };
    }
  }

  async createTask(projectId = 1, title, description = '', parentId = null) {
    try {
      const payload = {
        title,
        description: description || `通过Claude Code创建：${title}`,
        status: 'todo',
        parent_id: parentId
      };
      const response = await this.client.post(`/projects/${projectId}/tasks`, payload);
      return { success: true, data: response.data, message: `✅ 任务已创建 (ID: ${response.data.id})` };
    } catch (error) {
      return { success: false, error: `创建任务失败: ${error.message}` };
    }
  }

  async updateTask(projectId = 1, taskId, updates) {
    try {
      const response = await this.client.put(`/projects/${projectId}/tasks/${taskId}`, updates);
      return { success: true, data: response.data, message: `✅ 任务${taskId}已更新` };
    } catch (error) {
      return { success: false, error: `更新任务失败: ${error.message}` };
    }
  }

  async deleteTask(projectId = 1, taskId) {
    try {
      await this.client.delete(`/projects/${projectId}/tasks/${taskId}`);
      return { success: true, message: `✅ 任务${taskId}已删除` };
    } catch (error) {
      return { success: false, error: `删除任务失败: ${error.message}` };
    }
  }

  // 2. Task Status Management - 任务状态管理
  async startTask(projectId = 1, taskId) {
    return this.updateTask(projectId, taskId, { status: 'in_progress' });
  }

  async completeTask(projectId = 1, taskId) {
    return this.updateTask(projectId, taskId, { status: 'completed' });
  }

  async pauseTask(projectId = 1, taskId) {
    return this.updateTask(projectId, taskId, { status: 'paused' });
  }

  // 3. Projects Management - 项目管理
  async listProjects() {
    try {
      const response = await this.client.get('/projects');
      return { success: true, data: response.data, message: `📁 共有 ${response.data?.length || 0} 个项目` };
    } catch (error) {
      return { success: false, error: `获取项目列表失败: ${error.message}` };
    }
  }

  async createProject(name, description = '') {
    try {
      const response = await this.client.post('/projects', {
        name,
        description: description || `通过Claude Code创建：${name}`
      });
      return { success: true, data: response.data, message: `✅ 项目已创建 (ID: ${response.data.id})` };
    } catch (error) {
      return { success: false, error: `创建项目失败: ${error.message}` };
    }
  }

  // 4. Task Hierarchy - 任务层级管理
  async getTaskChildren(projectId = 1, taskId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/tasks/${taskId}/children`);
      return { success: true, data: response.data, message: `👥 任务${taskId}有 ${response.data?.length || 0} 个子任务` };
    } catch (error) {
      return { success: false, error: `获取子任务失败: ${error.message}` };
    }
  }

  async getTaskTree(projectId = 1) {
    try {
      const response = await this.client.get(`/projects/${projectId}/tasks/tree`);
      return { success: true, data: response.data, message: `🌳 项目${projectId}任务树结构已获取` };
    } catch (error) {
      return { success: false, error: `获取任务树失败: ${error.message}` };
    }
  }

  // 5. Statistics & Analytics - 统计分析
  async getTodayStats() {
    try {
      const response = await this.client.get('/statistics/today-stats');
      return { success: true, data: response.data, message: `📊 今日统计数据已获取` };
    } catch (error) {
      return { success: false, error: `获取今日统计失败: ${error.message}` };
    }
  }

  async getWeeklyStats() {
    try {
      const response = await this.client.get('/dashboard/weekly-stats');
      return { success: true, data: response.data, message: `📈 周统计数据已获取` };
    } catch (error) {
      return { success: false, error: `获取周统计失败: ${error.message}` };
    }
  }

  // 6. Timer System - 计时系统
  async startTimer(taskId) {
    try {
      const response = await this.client.post('/user/timer/start', { task_id: taskId });
      return { success: true, data: response.data, message: `⏱️ 任务${taskId}计时已开始` };
    } catch (error) {
      return { success: false, error: `开始计时失败: ${error.message}` };
    }
  }

  async stopTimer() {
    try {
      const response = await this.client.post('/user/timer/stop');
      return { success: true, data: response.data, message: `⏹️ 计时已停止` };
    } catch (error) {
      return { success: false, error: `停止计时失败: ${error.message}` };
    }
  }

  async getCurrentTimer() {
    try {
      const response = await this.client.get('/user/timer/current');
      return { success: true, data: response.data, message: `⏰ 当前计时状态已获取` };
    } catch (error) {
      return { success: false, error: `获取当前计时失败: ${error.message}` };
    }
  }
}

// 创建API客户端实例
const apiClient = new AIProjectAPIClient();

// 处理标准输入的JSON-RPC 2.0协议
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// 发送初始化响应
process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  method: "initialize",
  params: {
    serverInfo: {
      name: "ai-project-manager-full",
      version: "2.0.0"
    }
  }
}) + '\n');

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    console.error(`[MCP Bridge] 接收到请求:`, request.method);
    
    let response;
    
    switch (request.method) {
      case 'tools/list':
        response = {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: [
              // 任务管理 (5个)
              {
                name: 'list_tasks',
                description: '查看任务列表',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  }
                }
              },
              {
                name: 'create_task',
                description: '创建新任务',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: '任务标题' },
                    description: { type: 'string', description: '任务描述（可选）' },
                    projectId: { type: 'number', description: '项目ID（默认为1）' },
                    parentId: { type: 'number', description: '父任务ID（可选）' }
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
                    taskId: { type: 'number', description: '任务ID' },
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  },
                  required: ['taskId']
                }
              },
              {
                name: 'complete_task',
                description: '完成任务',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'number', description: '任务ID' },
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  },
                  required: ['taskId']
                }
              },
              {
                name: 'delete_task',
                description: '删除任务',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'number', description: '任务ID' },
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  },
                  required: ['taskId']
                }
              },
              
              // 项目管理 (2个)
              {
                name: 'list_projects',
                description: '查看项目列表',
                inputSchema: { type: 'object', properties: {} }
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
              
              // 任务层级 (2个)
              {
                name: 'get_task_children',
                description: '获取任务的子任务',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'number', description: '任务ID' },
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  },
                  required: ['taskId']
                }
              },
              {
                name: 'get_task_tree',
                description: '获取项目任务树',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  }
                }
              },
              
              // 统计分析 (2个)
              {
                name: 'get_today_stats',
                description: '获取今日统计数据',
                inputSchema: { type: 'object', properties: {} }
              },
              {
                name: 'get_weekly_stats',
                description: '获取周统计数据',
                inputSchema: { type: 'object', properties: {} }
              },
              
              // 计时系统 (3个)
              {
                name: 'start_timer',
                description: '开始任务计时',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'number', description: '任务ID' }
                  },
                  required: ['taskId']
                }
              },
              {
                name: 'stop_timer',
                description: '停止当前计时',
                inputSchema: { type: 'object', properties: {} }
              },
              {
                name: 'get_current_timer',
                description: '获取当前计时状态',
                inputSchema: { type: 'object', properties: {} }
              },
              
              // 批量操作 (1个)
              {
                name: 'pause_task',
                description: '暂停任务',
                inputSchema: {
                  type: 'object',
                  properties: {
                    taskId: { type: 'number', description: '任务ID' },
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  },
                  required: ['taskId']
                }
              }
            ]
          }
        };
        break;
        
      case 'tools/call':
        const { name, arguments: args } = request.params;
        let result;
        
        // 任务管理
        if (name === 'list_tasks') {
          result = await apiClient.listTasks(args?.projectId);
        } else if (name === 'create_task') {
          result = await apiClient.createTask(args?.projectId, args.title, args?.description, args?.parentId);
        } else if (name === 'start_task') {
          result = await apiClient.startTask(args?.projectId, args.taskId);
        } else if (name === 'complete_task') {
          result = await apiClient.completeTask(args?.projectId, args.taskId);
        } else if (name === 'delete_task') {
          result = await apiClient.deleteTask(args?.projectId, args.taskId);
        } else if (name === 'pause_task') {
          result = await apiClient.pauseTask(args?.projectId, args.taskId);
        }
        
        // 项目管理
        else if (name === 'list_projects') {
          result = await apiClient.listProjects();
        } else if (name === 'create_project') {
          result = await apiClient.createProject(args.name, args?.description);
        }
        
        // 任务层级
        else if (name === 'get_task_children') {
          result = await apiClient.getTaskChildren(args?.projectId, args.taskId);
        } else if (name === 'get_task_tree') {
          result = await apiClient.getTaskTree(args?.projectId);
        }
        
        // 统计分析
        else if (name === 'get_today_stats') {
          result = await apiClient.getTodayStats();
        } else if (name === 'get_weekly_stats') {
          result = await apiClient.getWeeklyStats();
        }
        
        // 计时系统
        else if (name === 'start_timer') {
          result = await apiClient.startTimer(args.taskId);
        } else if (name === 'stop_timer') {
          result = await apiClient.stopTimer();
        } else if (name === 'get_current_timer') {
          result = await apiClient.getCurrentTimer();
        }
        
        else {
          result = { success: false, error: `未知工具: ${name}` };
        }
        
        response = {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        };
        break;
        
      default:
        response = {
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: `方法未找到: ${request.method}`
          }
        };
    }
    
    process.stdout.write(JSON.stringify(response) + '\n');
    
  } catch (error) {
    console.error(`[MCP Bridge] 处理请求错误:`, error);
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "解析错误"
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});

console.error('[MCP Bridge] 完整版MCP服务器已启动 - 支持15个核心接口');