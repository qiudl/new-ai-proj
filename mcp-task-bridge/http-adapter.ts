// 简单的HTTP适配器，添加到现有MCP服务器
import express from 'express';
import cors from 'cors';
import { TaskMCPServer } from './task-mcp.js';

const app = express();
app.use(cors());
app.use(express.json());

// 创建任务服务器实例
const apiBaseUrl = process.env.API_BASE_URL || 'http://backend:8080/api/v1';
const taskServer = new TaskMCPServer(apiBaseUrl);

// 自动登录
async function autoLogin() {
  try {
    const username = 'admin';
    const loginRes = await taskServer.devQuickLogin(username);
    if (loginRes?.success && (loginRes as any).token) {
      taskServer.setAuthToken((loginRes as any).token as string);
      console.error('[HTTP] 自动登录成功');
    }
  } catch (e: any) {
    console.error('[HTTP] 自动登录失败:', e?.message);
  }
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'http-adapter',
    timestamp: new Date().toISOString()
  });
});

// MCP工具端点
app.post('/api/find_task', async (req, res) => {
  try {
    const result = await taskServer.findTask(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || String(error)
    });
  }
});

app.get('/api/list_tasks', async (req, res) => {
  try {
    const result = await taskServer.listTasks(req.query as any);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || String(error)
    });
  }
});

app.post('/api/create_task', async (req, res) => {
  try {
    const { title, projectId = 1 } = req.body;
    const result = await taskServer.createTask(title, projectId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || String(error)
    });
  }
});

app.post('/api/dev_quick_login', async (req, res) => {
  try {
    const { username } = req.body;
    const result = await taskServer.devQuickLogin(username);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || String(error)
    });
  }
});

// 启动HTTP服务器
async function startHttpAdapter() {
  await autoLogin();
  
  const port = process.env.HTTP_PORT || 3100;
  app.listen(port, () => {
    console.error(`[HTTP] MCP HTTP适配器启动在端口 ${port}`);
    console.error(`[HTTP] 健康检查: http://localhost:${port}/health`);
    console.error(`[HTTP] API端点: http://localhost:${port}/api/*`);
  });
}

startHttpAdapter().catch(console.error);
