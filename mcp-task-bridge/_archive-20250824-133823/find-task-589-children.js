#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask589Children() {
    console.log('🔍 查找任务589的所有子任务...\n');
    
    try {
        // 先检查任务589是否存在
        console.log('1. 验证任务589:');
        try {
            const task589 = await taskServer.findTaskById(589);
            console.log(`✅ 任务589存在: "${task589.title}" (状态: ${task589.status})`);
            console.log(`   描述: ${task589.description ? task589.description.substring(0, 150) + '...' : '无描述'}`);
        } catch (error) {
            console.log(`❌ 任务589不存在: ${error.message}`);
            return [];
        }
        
        // 获取项目1的所有任务
        const listResult = await taskServer.listTasks(1);
        
        if (listResult.success && listResult.tasks.length > 0) {
            console.log(`\n2. 搜索子任务 (从${listResult.tasks.length}个任务中):`);
            
            // 筛选出父任务ID为589的任务
            const childTasks = [];
            
            for (const task of listResult.tasks) {
                try {
                    const detailedTask = await taskServer.findTaskById(task.id);
                    if (detailedTask && detailedTask.parent_id === 589) {
                        childTasks.push({
                            id: detailedTask.id,
                            title: detailedTask.title,
                            status: detailedTask.status,
                            created_at: detailedTask.created_at,
                            description: detailedTask.description
                        });
                    }
                } catch (error) {
                    // 忽略单个任务查询错误
                    console.error(`   查询任务${task.id}详情失败: ${error.message}`);
                }
            }
            
            console.log(`\n📋 任务589的子任务列表 (共${childTasks.length}个):`);
            if (childTasks.length > 0) {
                // 按创建时间排序
                childTasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                
                childTasks.forEach((task, index) => {
                    console.log(`\n${index + 1}. ID: ${task.id} - "${task.title}"`);
                    console.log(`   状态: ${task.status}`);
                    console.log(`   创建时间: ${task.created_at}`);
                    if (task.description && task.description.length > 0) {
                        const shortDesc = task.description.length > 200 
                            ? task.description.substring(0, 200) + '...' 
                            : task.description;
                        console.log(`   描述: ${shortDesc}`);
                    }
                });
                
            } else {
                console.log('   未找到任务589的子任务');
            }
            
            return childTasks;
        } else {
            console.log('未找到任何任务');
            return [];
        }
    } catch (error) {
        console.error('查找失败:', error.message);
        return [];
    }
}

// 执行查找
findTask589Children()
    .then(children => {
        console.log(`\n🎯 总结: 找到 ${children.length} 个子任务`);
        if (children.length > 0) {
            console.log('子任务ID列表:', children.map(t => t.id).join(', '));
        }
    })
    .catch(console.error);