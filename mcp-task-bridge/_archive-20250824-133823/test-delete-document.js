#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function testDeleteDocument() {
    console.log('🧪 测试删除文档功能...\n');
    
    const testTaskId = 333;
    
    // 1. 确认文档存在
    console.log('1. 确认文档存在...');
    const hasResult = await taskServer.hasTaskDocument(testTaskId);
    console.log('检查结果:', JSON.stringify(hasResult, null, 2));
    console.log('');
    
    // 2. 删除文档
    console.log('2. 删除文档...');
    const deleteResult = await taskServer.deleteTaskDocument(testTaskId);
    console.log('删除结果:', JSON.stringify(deleteResult, null, 2));
    console.log('');
    
    // 3. 验证文档已被删除
    console.log('3. 验证文档已被删除...');
    const hasAfterDelete = await taskServer.hasTaskDocument(testTaskId);
    console.log('删除后检查结果:', JSON.stringify(hasAfterDelete, null, 2));
    console.log('');
    
    console.log('✅ 删除文档测试完成！');
}

testDeleteDocument().catch(console.error);
