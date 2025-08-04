#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');

// AI项目管理平台API配置
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

console.error(`[MCP Bridge] 正确版本启动`);
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

  // 1. 任务管理接口 (4个)
  async createTask(title, description = '', status = 'todo') {
    try {
      const payload = { title, description, status };
      const response = await this.client.post('/tasks', payload);
      return { success: true, data: response.data, message: `✅ 任务已创建 (ID: ${response.data.id})` };
    } catch (error) {
      return { success: false, error: `创建任务失败: ${error.message}` };
    }
  }

  async getTasks() {
    try {
      const response = await this.client.get('/tasks');
      return { success: true, data: response.data, message: `📋 共有 ${response.data?.length || 0} 个任务` };
    } catch (error) {
      return { success: false, error: `获取任务列表失败: ${error.message}` };
    }
  }

  async updateTask(id, updates) {
    try {
      const response = await this.client.put(`/tasks/${id}`, updates);
      return { success: true, data: response.data, message: `✅ 任务${id}已更新` };
    } catch (error) {
      return { success: false, error: `更新任务失败: ${error.message}` };
    }
  }

  async deleteTask(id) {
    try {
      await this.client.delete(`/tasks/${id}`);
      return { success: true, message: `✅ 任务${id}已删除` };
    } catch (error) {
      return { success: false, error: `删除任务失败: ${error.message}` };
    }
  }

  // 2. 项目管理接口 (2个)
  async getProjectTasks(projectId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/tasks`);
      return { success: true, data: response.data, message: `📁 项目${projectId}共有 ${response.data?.length || 0} 个任务` };
    } catch (error) {
      return { success: false, error: `获取项目任务失败: ${error.message}` };
    }
  }

  async moveTaskToProject(projectId, taskId, targetProjectId) {
    try {
      const response = await this.client.post(`/projects/${projectId}/tasks/${taskId}/move`, {
        target_project_id: targetProjectId
      });
      return { success: true, data: response.data, message: `✅ 任务${taskId}已移动到项目${targetProjectId}` };
    } catch (error) {
      return { success: false, error: `任务移动失败: ${error.message}` };
    }
  }

  // 3. 任务层级管理接口 (3个)
  async createSubTask(title, parentId, description = '') {
    try {
      const payload = { title, parent_id: parentId, description };
      const response = await this.client.post('/subtasks', payload);
      return { success: true, data: response.data, message: `✅ 子任务已创建 (ID: ${response.data.id})` };
    } catch (error) {
      return { success: false, error: `创建子任务失败: ${error.message}` };
    }
  }

  async archiveTask(projectId, taskId) {
    try {
      const response = await this.client.post(`/projects/${projectId}/tasks/${taskId}/archive`);
      return { success: true, data: response.data, message: `📦 任务${taskId}已归档` };
    } catch (error) {
      return { success: false, error: `归档任务失败: ${error.message}` };
    }
  }

  async unarchiveTask(projectId, taskId) {
    try {
      const response = await this.client.post(`/projects/${projectId}/tasks/${taskId}/unarchive`);
      return { success: true, data: response.data, message: `📤 任务${taskId}已恢复` };
    } catch (error) {
      return { success: false, error: `恢复任务失败: ${error.message}` };
    }
  }

  // 4. 任务文档管理接口 (2个)
  async getTaskDocument(projectId, taskId) {
    try {
      const response = await this.client.get(`/projects/${projectId}/tasks/${taskId}/document`);
      return { success: true, data: response.data, message: `📄 任务${taskId}文档已获取` };
    } catch (error) {
      return { success: false, error: `获取任务文档失败: ${error.message}` };
    }
  }

  async updateTaskDocument(projectId, taskId, content) {
    try {
      const response = await this.client.put(`/projects/${projectId}/tasks/${taskId}/document`, {
        content
      });
      return { success: true, data: response.data, message: `📝 任务${taskId}文档已更新` };
    } catch (error) {
      return { success: false, error: `更新任务文档失败: ${error.message}` };
    }
  }

  // 5. 计时器管理接口 (3个)
  async startTimer(taskId) {
    try {
      const response = await this.client.post('/timers/start', { task_id: taskId });
      return { success: true, data: response.data, message: `⏱️ 任务${taskId}计时已开始` };
    } catch (error) {
      return { success: false, error: `开始计时失败: ${error.message}` };
    }
  }

  async stopTimer() {
    try {
      const response = await this.client.post('/timers/stop');
      return { success: true, data: response.data, message: `⏹️ 计时已停止` };
    } catch (error) {
      return { success: false, error: `停止计时失败: ${error.message}` };
    }
  }

  async getActiveTimer() {
    try {
      const response = await this.client.get('/timers/active');
      return { success: true, data: response.data, message: `⏰ 活跃计时器状态已获取` };
    } catch (error) {
      return { success: false, error: `获取活跃计时器失败: ${error.message}` };
    }
  }

  // 6. 文档管理接口 (1个)
  async getWorkNotes() {
    try {
      const response = await this.client.get('/work-notes');
      return { success: true, data: response.data, message: `📝 工作笔记列表已获取` };
    } catch (error) {
      return { success: false, error: `获取工作笔记失败: ${error.message}` };
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
      name: "ai-project-manager-correct",
      version: "3.0.0"
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
              // 1. 任务管理接口 (4个)
              {
                name: 'create_task',
                description: '创建任务 (POST /api/v1/tasks)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: '任务标题' },
                    description: { type: 'string', description: '任务描述（可选）' },
                    status: { type: 'string', description: '任务状态（可选，默认todo）' }
                  },
                  required: ['title']
                }
              },
              {
                name: 'get_tasks',
                description: '获取任务列表 (GET /api/v1/tasks)',
                inputSchema: { type: 'object', properties: {} }
              },
              {
                name: 'update_task',
                description: '更新任务 (PUT /api/v1/tasks/{id})',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', description: '任务ID' },
                    title: { type: 'string', description: '任务标题（可选）' },
                    description: { type: 'string', description: '任务描述（可选）' },
                    status: { type: 'string', description: '任务状态（可选）' }
                  },
                  required: ['id']
                }
              },
              {
                name: 'delete_task',
                description: '删除任务 (DELETE /api/v1/tasks/{id})',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', description: '任务ID' }
                  },
                  required: ['id']
                }
              },
              
              // 2. 项目管理接口 (2个)
              {
                name: 'get_project_tasks',
                description: '获取项目任务 (GET /api/v1/projects/{id}/tasks)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '项目ID' }
                  },
                  required: ['projectId']
                }
              },
              {
                name: 'move_task_to_project',
                description: '任务移动到其他项目 (POST /api/v1/projects/{id}/tasks/{taskId}/move)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '当前项目ID' },
                    taskId: { type: 'number', description: '任务ID' },
                    targetProjectId: { type: 'number', description: '目标项目ID' }
                  },
                  required: ['projectId', 'taskId', 'targetProjectId']
                }
              },
              
              // 3. 任务层级管理接口 (3个)
              {
                name: 'create_subtask',
                description: '创建子任务 (POST /api/v1/subtasks)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: '子任务标题' },
                    parentId: { type: 'number', description: '父任务ID' },
                    description: { type: 'string', description: '子任务描述（可选）' }
                  },
                  required: ['title', 'parentId']
                }
              },
              {
                name: 'archive_task',
                description: '归档任务 (POST /api/v1/projects/{projectId}/tasks/{taskId}/archive)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '项目ID' },
                    taskId: { type: 'number', description: '任务ID' }
                  },
                  required: ['projectId', 'taskId']
                }
              },
              {
                name: 'unarchive_task',
                description: '恢复归档任务 (POST /api/v1/projects/{projectId}/tasks/{taskId}/unarchive)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '项目ID' },
                    taskId: { type: 'number', description: '任务ID' }
                  },
                  required: ['projectId', 'taskId']
                }
              },
              
              // 4. 任务文档管理接口 (2个)
              {
                name: 'get_task_document',
                description: '获取任务文档 (GET /api/v1/projects/{projectId}/tasks/{taskId}/document)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '项目ID' },
                    taskId: { type: 'number', description: '任务ID' }
                  },
                  required: ['projectId', 'taskId']
                }
              },
              {
                name: 'update_task_document',
                description: '更新任务文档 (PUT /api/v1/projects/{projectId}/tasks/{taskId}/document)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: { type: 'number', description: '项目ID' },
                    taskId: { type: 'number', description: '任务ID' },
                    content: { type: 'string', description: '文档内容' }
                  },
                  required: ['projectId', 'taskId', 'content']
                }
              },
              
              // 5. 计时器管理接口 (3个)
              {
                name: 'start_timer',
                description: '启动计时器 (POST /api/v1/timers/start)',
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
                description: '停止计时器 (POST /api/v1/timers/stop)',
                inputSchema: { type: 'object', properties: {} }
              },
              {
                name: 'get_active_timer',
                description: '获取活跃计时器 (GET /api/v1/timers/active)',
                inputSchema: { type: 'object', properties: {} }
              },
              
              // 6. 文档管理接口 (1个)
              {
                name: 'get_work_notes',
                description: '获取工作笔记列表 (GET /api/v1/work-notes)',
                inputSchema: { type: 'object', properties: {} }
              }
            ]
          }
        };
        break;
        
      case 'tools/call':
        const { name, arguments: args } = request.params;
        let result;
        
        // 1. 任务管理接口
        if (name === 'create_task') {
          result = await apiClient.createTask(args.title, args?.description, args?.status);
        } else if (name === 'get_tasks') {
          result = await apiClient.getTasks();
        } else if (name === 'update_task') {
          result = await apiClient.updateTask(args.id, {
            title: args?.title,
            description: args?.description,
            status: args?.status
          });
        } else if (name === 'delete_task') {
          result = await apiClient.deleteTask(args.id);
        }
        
        // 2. 项目管理接口
        else if (name === 'get_project_tasks') {
          result = await apiClient.getProjectTasks(args.projectId);
        } else if (name === 'move_task_to_project') {
          result = await apiClient.moveTaskToProject(args.projectId, args.taskId, args.targetProjectId);
        }
        
        // 3. 任务层级管理接口
        else if (name === 'create_subtask') {
          result = await apiClient.createSubTask(args.title, args.parentId, args?.description);
        } else if (name === 'archive_task') {
          result = await apiClient.archiveTask(args.projectId, args.taskId);
        } else if (name === 'unarchive_task') {
          result = await apiClient.unarchiveTask(args.projectId, args.taskId);
        }
        
        // 4. 任务文档管理接口
        else if (name === 'get_task_document') {
          result = await apiClient.getTaskDocument(args.projectId, args.taskId);
        } else if (name === 'update_task_document') {
          result = await apiClient.updateTaskDocument(args.projectId, args.taskId, args.content);
        }
        
        // 5. 计时器管理接口
        else if (name === 'start_timer') {
          result = await apiClient.startTimer(args.taskId);
        } else if (name === 'stop_timer') {
          result = await apiClient.stopTimer();
        } else if (name === 'get_active_timer') {
          result = await apiClient.getActiveTimer();
        }
        
        // 6. 文档管理接口
        else if (name === 'get_work_notes') {
          result = await apiClient.getWorkNotes();
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

console.error('[MCP Bridge] 正确版本MCP服务器已启动 - 支持标准15个核心接口');