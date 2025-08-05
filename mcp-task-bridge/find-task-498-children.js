#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask498Children() {
    console.log('🔍 查找任务498的所有子任务...\n');
    
    try {
        // 获取项目1的所有任务
        const listResult = await taskServer.listTasks(1);
        
        if (listResult.success && listResult.tasks.length > 0) {
            console.log(`总共找到 ${listResult.tasks.length} 个任务`);
            
            // 筛选出父任务ID为498的任务
            const childTasks = [];
            
            // 由于API可能没有直接返回parent_id，我们需要获取详细信息
            for (const task of listResult.tasks) {
                try {
                    const detailedTask = await taskServer.findTaskById(task.id);
                    if (detailedTask && detailedTask.parent_id === 498) {
                        childTasks.push({
                            id: detailedTask.id,
                            title: detailedTask.title,
                            status: detailedTask.status,
                            created_at: detailedTask.created_at
                        });
                    }
                } catch (error) {
                    // 忽略单个任务查询错误
                    console.error(`查询任务${task.id}详情失败: ${error.message}`);
                }
            }
            
            console.log(`\n📋 任务498的子任务列表 (共${childTasks.length}个):`);
            if (childTasks.length > 0) {
                childTasks.forEach((task, index) => {
                    console.log(`${index + 1}. ID: ${task.id} - "${task.title}" (状态: ${task.status})`);
                });
            } else {
                console.log('未找到任务498的子任务');
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
findTask498Children()
    .then(children => {
        console.log(`\n✅ 查找完成，共找到 ${children.length} 个子任务`);
    })
    .catch(console.error);