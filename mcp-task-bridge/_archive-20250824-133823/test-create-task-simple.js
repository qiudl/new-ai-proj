#!/usr/bin/env node

// 简单的MCP创建任务测试
// 用于验证 create_task 功能是否正常

import { TaskMCPServerFixed } from './task-mcp-fixed.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '.env') });

console.log('=== MCP Create Task 测试 ===\n');

// 初始化TaskMCPServer
const taskServer = new TaskMCPServerFixed(
    process.env.TASK_API_BASE || 'http://localhost:8081/api/v1'
);

async function testCreateTask() {
    try {
        console.log('1. 测试创建任务...');
        const result = await taskServer.createTask('MCP测试任务-' + Date.now(), 1);
        
        console.log('创建结果：', result);
        
        if (result.success) {
            console.log('✅ 任务创建成功！');
            console.log(`   任务ID: ${result.id}`);
            console.log(`   任务标题: ${result.title}`);
            console.log(`   任务状态: ${result.status}`);
            
            // 测试获取任务
            console.log('\n2. 测试获取任务...');
            const findResult = await taskServer.findTask({ id: result.id });
            console.log('查找结果：', findResult);
            
            if (findResult.success) {
                console.log('✅ 任务查找成功！');
            } else {
                console.log('❌ 任务查找失败：', findResult.error);
            }
        } else {
            console.log('❌ 任务创建失败：', result.error);
        }
    } catch (error) {
        console.error('❌ 测试过程中出错：', error.message);
    }
}

// 运行测试
testCreateTask();
