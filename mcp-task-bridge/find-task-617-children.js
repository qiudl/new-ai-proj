#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask617Children() {
    console.log('🔍 查找任务617的所有子任务...\n');
    
    try {
        // 先检查任务617是否存在
        console.log('1. 验证任务617:');
        try {
            const task617 = await taskServer.findTaskById(617);
            console.log(`✅ 任务617存在: "${task617.title}" (状态: ${task617.status})`);
            console.log(`   描述: ${task617.description ? task617.description.substring(0, 150) + '...' : '无描述'}`);
        } catch (error) {
            console.log(`❌ 任务617不存在: ${error.message}`);
            return [];
        }
        
        // 获取项目1的所有任务
        const listResult = await taskServer.listTasks(1);
        
        if (listResult.success && listResult.tasks.length > 0) {
            console.log(`\n2. 搜索子任务 (从${listResult.tasks.length}个任务中):`);
            
            // 筛选出父任务ID为617的任务
            const childTasks = [];
            
            for (const task of listResult.tasks) {
                try {
                    const detailedTask = await taskServer.findTaskById(task.id);
                    if (detailedTask && detailedTask.parent_id === 617) {
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
            
            console.log(`\n📋 任务617的子任务列表 (共${childTasks.length}个):`);
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
                
                console.log(`\n✅ 验证完成: 任务617共有 ${childTasks.length} 个子任务`);
                
                // 检查是否有刚创建的任务
                const recentTasks = childTasks.filter(task => {
                    const createdTime = new Date(task.created_at);
                    const now = new Date();
                    const diffHours = (now - createdTime) / (1000 * 60 * 60);
                    return diffHours < 2; // 最近2小时创建的
                });
                
                if (recentTasks.length > 0) {
                    console.log(`\n🆕 最近创建的子任务 (${recentTasks.length}个):`);
                    recentTasks.forEach(task => {
                        console.log(`   - ID: ${task.id} - "${task.title}" (${task.status})`);
                    });
                }
                
            } else {
                console.log('   未找到任务617的子任务');
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
findTask617Children()
    .then(children => {
        console.log(`\n🎯 总结: 找到 ${children.length} 个子任务`);
        if (children.length > 0) {
            console.log('子任务ID列表:', children.map(t => t.id).join(', '));
        }
    })
    .catch(console.error);