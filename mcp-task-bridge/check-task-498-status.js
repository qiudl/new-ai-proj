#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function checkTask498Status() {
    console.log('🔍 检查任务498的状态和最近创建的任务...\n');
    
    try {
        // 检查任务498是否存在
        console.log('1. 检查任务498是否存在:');
        try {
            const task498 = await taskServer.findTaskById(498);
            console.log(`✅ 任务498存在: "${task498.title}" (状态: ${task498.status})`);
            console.log(`   父任务ID: ${task498.parent_id || '无'}`);
            console.log(`   项目ID: ${task498.project_id}`);
        } catch (error) {
            console.log(`❌ 任务498不存在: ${error.message}`);
        }
        
        // 获取所有任务并按创建时间排序，显示最新的10个
        console.log('\n2. 最近创建的10个任务:');
        const listResult = await taskServer.listTasks(1);
        
        if (listResult.success && listResult.tasks.length > 0) {
            // 按创建时间排序，最新的在前
            const sortedTasks = listResult.tasks.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );
            
            const recentTasks = sortedTasks.slice(0, 10);
            recentTasks.forEach((task, index) => {
                console.log(`${index + 1}. ID: ${task.id} - "${task.title}" (状态: ${task.status}) [${task.created_at}]`);
            });
            
            // 查找ID最大的几个任务（通常是最新创建的）
            console.log('\n3. ID最大的10个任务（通常是最新创建的）:');
            const sortedByIdTasks = listResult.tasks.sort((a, b) => b.id - a.id);
            const highestIdTasks = sortedByIdTasks.slice(0, 10);
            
            for (const task of highestIdTasks) {
                try {
                    const detailedTask = await taskServer.findTaskById(task.id);
                    const parentInfo = detailedTask.parent_id ? ` (父任务: ${detailedTask.parent_id})` : '';
                    console.log(`   ID: ${task.id} - "${task.title}"${parentInfo}`);
                } catch (error) {
                    console.log(`   ID: ${task.id} - "${task.title}" (获取详情失败)`);
                }
            }
            
        } else {
            console.log('未找到任何任务');
        }
        
    } catch (error) {
        console.error('检查失败:', error.message);
    }
}

// 执行检查
checkTask498Status().catch(console.error);