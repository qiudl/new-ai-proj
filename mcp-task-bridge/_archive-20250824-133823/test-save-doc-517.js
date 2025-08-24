import { TaskMCPServer } from './task-mcp.js';

const apiBase = process.env.API_BASE_URL || 'http://localhost:8081/api/v1';
const taskId = Number(process.env.TASK_ID || 517);
const projectId = Number(process.env.PROJECT_ID || 1);

const content = `# MCP Save Smoke Test\n\nTime: ${new Date().toISOString()}\n`;

(async () => {
  const server = new TaskMCPServer(apiBase);
  console.error(`[TEST] Using API: ${apiBase}, taskId=${taskId}, projectId=${projectId}`);
  const res = await server.createOrUpdateTaskDocument(taskId, content, projectId);
  console.log(JSON.stringify(res, null, 2));
})();

