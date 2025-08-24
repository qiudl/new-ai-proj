#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTasks597To600() {
    console.log('🔍 查找任务597-600...\n');
    
    const taskIds = [597, 598, 599, 600];
    const foundTasks = [];
    const missingTasks = [];
    
    for (const taskId of taskIds) {
        try {
            console.log(`查找任务${taskId}...`);
            const task = await taskServer.findTaskById(taskId);
            
            if (task) {
                console.log(`✅ 找到任务${taskId}: "${task.title}"`);
                foundTasks.push(task);
            }
        } catch (error) {
            if (error.message.includes(`任务 ID ${taskId} 不存在`)) {
                console.log(`❌ 任务${taskId}不存在`);
                missingTasks.push(taskId);
            } else {
                console.error(`查找任务${taskId}时出错:`, error.message);
                missingTasks.push(taskId);
            }
        }
    }
    
    console.log('\n📋 任务汇总：');
    console.log(`已找到 ${foundTasks.length} 个任务，缺失 ${missingTasks.length} 个任务\n`);
    
    if (foundTasks.length > 0) {
        console.log('✅ 已找到的任务：');
        foundTasks.forEach(task => {
            console.log(`\n📝 任务${task.id}: "${task.title}"`);
            console.log(`   状态: ${task.status} | 优先级: ${task.custom_fields?.priority || '未设置'} | 父任务: ${task.parent_id || '无'}`);
            console.log(`   创建时间: ${task.created_at}`);
            console.log(`   描述摘要: ${task.description ? task.description.substring(0, 100) + '...' : '无描述'}`);
        });
    }
    
    if (missingTasks.length > 0) {
        console.log('\n❌ 缺失的任务：');
        missingTasks.forEach(taskId => {
            console.log(`- 任务${taskId}`);
        });
    }
    
    return { foundTasks, missingTasks };
}

// 执行查找
findTasks597To600().then(({ foundTasks, missingTasks }) => {
    console.log(`\n🎯 查找完成！找到 ${foundTasks.length} 个任务，缺失 ${missingTasks.length} 个任务`);
    
    if (foundTasks.length > 0) {
        console.log('\n接下来可以开始实现这些任务：');
        foundTasks.forEach(task => {
            console.log(`- 任务${task.id}: ${task.title} (状态: ${task.status})`);
        });
    }
}).catch(console.error);