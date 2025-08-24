#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findExistingTask() {
    console.log('🔍 查找现有任务...\n');
    
    const listResult = await taskServer.listTasks(1);
    
    if (listResult.success && listResult.tasks.length > 0) {
        console.log(`找到 ${listResult.tasks.length} 个任务`);
        
        // 显示前5个任务
        const firstFiveTasks = listResult.tasks.slice(0, 5);
        firstFiveTasks.forEach(task => {
            console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
        });
        
        // 返回第一个任务ID用于测试
        return firstFiveTasks[0].id;
    } else {
        console.log('未找到任务');
        return null;
    }
}

findExistingTask().then(taskId => {
    if (taskId) {
        console.log(`\n将使用任务 ID ${taskId} 进行文档测试`);
    }
}).catch(console.error);
