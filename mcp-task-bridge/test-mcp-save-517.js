// Simple test case: invoke the MCP tool create_or_update_task_document to save content to task 517
// Usage: node test-mcp-save-517.js

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskMCPServer } from './task-mcp.js';

// This test directly calls the TaskMCPServer method as the tool handler does.
// If you want to exercise the full MCP stdio path, use test-mcp-stdio.js instead.

const apiBase = process.env.API_BASE_URL || 'http://localhost:8081/api/v1';
const taskId = Number(process.env.TASK_ID || 517);
const projectId = Number(process.env.PROJECT_ID || 1);

(async () => {
  const taskServer = new TaskMCPServer(apiBase);
  const content = `MCP create_or_update_task_document smoke test at ${new Date().toISOString()}`;
  console.error(`[TEST] Calling create_or_update_task_document: taskId=${taskId}, projectId=${projectId}`);
  const result = await taskServer.createOrUpdateTaskDocument(taskId, content, projectId);
  console.log(JSON.stringify(result, null, 2));
})();

