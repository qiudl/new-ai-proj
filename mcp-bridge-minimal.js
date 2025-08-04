#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');

// AI项目管理平台API配置
const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

console.error(`[MCP Bridge] Minimal version starting`);
console.error(`[MCP Bridge] API_BASE: ${API_BASE}`);
console.error(`[MCP Bridge] Token configured: ${AUTH_TOKEN ? 'Yes' : 'No'}`);

class SimpleAPIClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  async createTask(title, projectId = 1) {
    try {
      const response = await this.client.post(`/projects/${projectId}/tasks`, {
        title,
        status: 'todo',
        description: `通过Claude Code创建：${title}`
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async listTasks(projectId = 1) {
    try {
      const response = await this.client.get(`/projects/${projectId}/tasks`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// 创建简单的JSON-RPC 2.0 处理器
const apiClient = new SimpleAPIClient();

// 处理标准输入
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
      name: "ai-project-manager",
      version: "1.0.0"
    }
  }
}) + '\n');

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    console.error(`[MCP Bridge] Received request:`, request.method);
    
    let response;
    
    switch (request.method) {
      case 'tools/list':
        response = {
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: [
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
                    projectId: { type: 'number', description: '项目ID（默认为1）' }
                  },
                  required: ['title']
                }
              }
            ]
          }
        };
        break;
        
      case 'tools/call':
        const { name, arguments: args } = request.params;
        let result;
        
        if (name === 'list_tasks') {
          result = await apiClient.listTasks(args?.projectId);
        } else if (name === 'create_task') {
          result = await apiClient.createTask(args.title, args?.projectId);
        } else {
          result = { success: false, error: `Unknown tool: ${name}` };
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
            message: `Method not found: ${request.method}`
          }
        };
    }
    
    process.stdout.write(JSON.stringify(response) + '\n');
    
  } catch (error) {
    console.error(`[MCP Bridge] Error processing request:`, error);
    const errorResponse = {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error"
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});

console.error('[MCP Bridge] Minimal MCP server started');