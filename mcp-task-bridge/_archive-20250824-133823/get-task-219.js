#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function getTask217() {
    console.log('🔍 获取任务 217 的详细信息...\n');
    
    try {
        const task = await taskServer.findTaskById(217);
        
        if (task) {
            console.log('✅ 任务 217 详细信息:');
            console.log(`- ID: ${task.id}`);
            console.log(`- 标题: ${task.title}`);
            console.log(`- 状态: ${task.status}`);
            console.log(`- 描述: ${task.description ? task.description.substring(0, 200) + '...' : '无描述'}`);
            console.log(`- 项目ID: ${task.project_id}`);
            console.log(`- 父任务ID: ${task.parent_id || '无'}`);
            console.log(`- 创建时间: ${task.created_at}`);
            console.log(`- 更新时间: ${task.updated_at}`);
            
            return task;
        } else {
            console.log('❌ 未找到任务 217');
            return null;
        }
    } catch (error) {
        console.error('❌ 获取任务失败:', error.message);
        return null;
    }
}

getTask217().then(task => {
    if (task) {
        console.log(`\n当前状态: ${task.status}`);
        if (task.status === 'completed') {
            console.log('✅ 任务 217 已经是完成状态!');
        } else {
            console.log(`⚠️ 任务 217 当前状态为: ${task.status}, 需要开始执行`);
        }
    }
}).catch(console.error);