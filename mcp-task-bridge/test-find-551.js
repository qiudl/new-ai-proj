#!/usr/bin/env node

import { TaskMCPServerFixed } from './task-mcp-fixed.js';
import dotenv from 'dotenv';

dotenv.config();

const apiBase = process.env.TASK_API_BASE || 'http://localhost:8081/api/v1';
console.log('API Base:', apiBase);

const server = new TaskMCPServerFixed(apiBase);

async function test() {
    console.log('\n测试 findTask 接口查找任务551...\n');
    
    try {
        const result = await server.findTask({ id: 551 });
        console.log('✅ 成功找到任务551:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.log('❌ 查找失败:', error.message);
        console.log('错误详情:', error.response?.data || error);
    }
}

test();
