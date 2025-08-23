import { TaskMCPServer } from './task-mcp.js';

const apiBase = process.env.API_BASE_URL || 'http://localhost:8081/api/v1';
const taskId = Number(process.env.TASK_ID || 517);
const projectId = Number(process.env.PROJECT_ID || 1);

(async () => {
  const server = new TaskMCPServer(apiBase);
  console.error(`[TEST] Reading latest doc for taskId=${taskId} via ${apiBase}`);
  const res = await server.getTaskDocument(taskId, projectId);
  console.log(JSON.stringify({
    success: res.success,
    task_id: res.task_id,
    project_id: res.project_id,
    document_id: res.document_id,
    title: res.title,
    content_length: res.content ? res.content.length : 0,
    updated_at: res.updated_at
  }, null, 2));
})();

