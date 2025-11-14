#!/usr/bin/env node

import { TaskMCPServer } from './dist/task-mcp.js';

console.log('=== 直接测试TaskMCPServer ===\n');

const server = new TaskMCPServer('http://localhost:8080/api/v1');

console.log('调用 createSubTask...\n');

try {
  const result = await server.createSubTask(3698, 'test from direct call');
  console.log('\n结果:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\n错误:', error.message);
  console.error('Stack:', error.stack);
}
