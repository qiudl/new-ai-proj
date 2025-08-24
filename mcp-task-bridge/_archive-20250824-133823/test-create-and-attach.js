#!/usr/bin/env node

// 测试 create-and-attach 功能的独立脚本

import { TaskMCPServerFixed } from './task-mcp-fixed.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

console.log('=== MCP Create-and-Attach 功能测试 ===\n');

// 初始化TaskMCPServer
const taskServer = new TaskMCPServerFixed(
    process.env.TASK_API_BASE || 'http://localhost:8081/api/v1'
);

async function testCreateAndAttach() {
    try {
        console.log('1. 测试create-and-attach功能...');
        
        const content = `# MCP测试文档

## 测试目的
测试 create-and-attach 功能是否能正常为任务创建和关联文档。

## 测试内容
- 任务ID: 636
- 文档类型: Markdown
- 创建时间: ${new Date().toISOString()}

## 功能验证
如果文档创建成功，说明 create-and-attach 功能工作正常！
`;

        const result = await taskServer.createAndAttachDocument(
            636, // taskId
            content, 
            1, // projectId
            'MCP功能测试文档'
        );
        
        console.log('创建结果：', result);
        
        if (result.success) {
            console.log('✅ create-and-attach功能测试成功！');
            console.log(`   文档已创建，ID: ${result.document_id || 'N/A'}`);
            console.log(`   关联任务: ${result.task_id}`);
        } else {
            console.log('❌ create-and-attach功能测试失败：', result.error);
        }
    } catch (error) {
        console.error('❌ 测试过程中出错：', error.message);
    }
}

// 运行测试
testCreateAndAttach();
