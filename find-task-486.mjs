#!/usr/bin/env node

import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask486() {
    console.log('🔍 查找任务 486...\n');
    
    try {
        // 尝试直接获取任务 486
        const task = await taskServer.findTaskById(486);
        
        if (task) {
            console.log('✅ 找到任务 486:');
            console.log(`标题: ${task.title}`);
            console.log(`状态: ${task.status}`);
            console.log(`描述: ${task.description}`);
            console.log(`项目ID: ${task.project_id}`);
            console.log(`创建时间: ${task.created_at}`);
            console.log(`更新时间: ${task.updated_at}`);
            
            if (task.parent_id) {
                console.log(`父任务ID: ${task.parent_id}`);
            }
            
            if (task.custom_fields) {
                console.log(`自定义字段: ${JSON.stringify(task.custom_fields, null, 2)}`);
            }
            
            return task;
        }
    } catch (error) {
        console.log('❌ 未找到任务 486 或访问出错:', error.message);
        
        // 尝试在所有任务中搜索包含mermaid或PDF相关的任务
        console.log('\n🔍 搜索可能相关的任务...');
        try {
            const listResult = await taskServer.listTasks(1);
            
            if (listResult.success && listResult.tasks.length > 0) {
                const relevantTasks = listResult.tasks.filter(task => 
                    task.title.toLowerCase().includes('mermaid') ||
                    (task.description && task.description.toLowerCase().includes('mermaid')) ||
                    task.title.toLowerCase().includes('pdf') ||
                    (task.description && task.description.toLowerCase().includes('pdf')) ||
                    task.id === 486
                );
                
                if (relevantTasks.length > 0) {
                    console.log(`找到 ${relevantTasks.length} 个相关任务:`);
                    relevantTasks.forEach(task => {
                        console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
                    });
                } else {
                    console.log('未找到包含mermaid或PDF关键词的任务');
                }
                
                // 查找ID范围在480-490的任务
                console.log('\n🔍 查找ID在480-490范围的任务:');
                const nearbyTasks = listResult.tasks.filter(task => task.id >= 480 && task.id <= 490);
                if (nearbyTasks.length > 0) {
                    nearbyTasks.forEach(task => {
                        console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
                    });
                } else {
                    console.log('未找到ID在480-490范围的任务');
                }
            }
        } catch (searchError) {
            console.error('搜索任务失败:', searchError.message);
        }
        
        return null;
    }
}

findTask486().then(task => {
    if (!task) {
        console.log('\n任务 486 可能不存在或已被删除');
    }
}).catch(console.error);