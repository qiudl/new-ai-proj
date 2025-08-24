#!/usr/bin/env node

import axios from 'axios';
import { TaskMCPServer } from './task-mcp.js';

async function main() {
  const taskId = 537;
  const projectId = 1;
  const documentId = 708;

  const server = new TaskMCPServer('http://localhost:8081/api/v1');
  const headers = server.getHeaders();

  console.log('== 更新文档状态为 published ==');
  await axios.put(`${server.apiBase}/documents/${documentId}`, { status: 'published' }, { headers, proxy: false });
  console.log('文档状态已更新');

  console.log('== 设为主文档关系 main ==');
  await axios.post(`${server.apiBase}/projects/${projectId}/tasks/${taskId}/documents/${documentId}/attach`, { relationship_type: 'main' }, { headers, proxy: false });
  console.log('主文档关系已设置');

  console.log('== 将任务切换为 in_progress ==');
  const res = await server.startTask(taskId);
  console.log(JSON.stringify(res, null, 2));

  console.log('完成');
}

main().catch(err => {
  console.error('执行失败:', err?.response?.data || err?.message || String(err));
  process.exit(1);
});

