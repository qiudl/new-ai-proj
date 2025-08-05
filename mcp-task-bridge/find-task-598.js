#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask598() {
    console.log('🔍 查找任务598...\n');
    
    try {
        // 使用findTaskById方法查找任务598
        const task = await taskServer.findTaskById(598);
        
        if (task) {
            console.log('✅ 找到任务598！');
            console.log('任务详细信息：');
            console.log(`- ID: ${task.id}`);
            console.log(`- 标题: "${task.title}"`);
            console.log(`- 状态: ${task.status}`);
            console.log(`- 优先级: ${task.custom_fields?.priority || '未设置'}`);
            console.log(`- 项目ID: ${task.project_id}`);
            console.log(`- 父任务ID: ${task.parent_id || '无'}`);
            console.log(`- 创建时间: ${task.created_at}`);
            console.log(`- 更新时间: ${task.updated_at}`);
            console.log(`- 描述: ${task.description || '无描述'}`);
            
            return task;
        }
    } catch (error) {
        if (error.message.includes('任务 ID 598 不存在')) {
            console.log('❌ 任务598不存在');
            console.log('错误信息:', error.message);
            
            // 尝试列出所有任务看看最新的任务ID是多少
            console.log('\n🔍 查看项目1中的最新任务...');
            const listResult = await taskServer.listTasks(1);
            
            if (listResult.success && listResult.tasks.length > 0) {
                // 按ID降序排列，获取最新的几个任务
                const sortedTasks = listResult.tasks.sort((a, b) => b.id - a.id);
                const latestTasks = sortedTasks.slice(0, 10);
                
                console.log(`项目1中最新的10个任务：`);
                latestTasks.forEach(task => {
                    console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
                });
                
                const maxId = Math.max(...listResult.tasks.map(t => t.id));
                console.log(`\n当前最大任务ID: ${maxId}`);
                
                if (598 > maxId) {
                    console.log(`任务598的ID ${598} 大于当前最大ID ${maxId}，需要创建此任务`);
                }
            }
            
            return null;
        } else {
            console.error('查找任务时出错:', error);
            return null;
        }
    }
}

// 执行查找
findTask598().then(task => {
    if (task) {
        console.log('\n✅ 任务598存在，已显示详细信息');
    } else {
        console.log('\n❌ 任务598不存在，需要创建');
    }
}).catch(console.error);