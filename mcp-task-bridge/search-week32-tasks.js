#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function searchWeek32Tasks() {
    console.log('🔍 搜索32周相关任务...\n');
    
    const listResult = await taskServer.listTasks(1);
    
    if (listResult.success && listResult.tasks.length > 0) {
        console.log(`总共 ${listResult.tasks.length} 个任务\n`);
        
        // 搜索关键词
        const keywords = ['32周', '32', 'week32', 'Week32', 'Bug修复', 'bug修复', '优化', '系统Bug'];
        
        const matchedTasks = listResult.tasks.filter(task => {
            const title = task.title || '';
            const description = task.description || '';
            
            return keywords.some(keyword => 
                title.toLowerCase().includes(keyword.toLowerCase()) || 
                description.toLowerCase().includes(keyword.toLowerCase())
            );
        });
        
        if (matchedTasks.length > 0) {
            console.log(`✅ 找到 ${matchedTasks.length} 个相关任务:`);
            matchedTasks.forEach(task => {
                console.log(`\n- ID: ${task.id}`);
                console.log(`  标题: "${task.title}"`);
                console.log(`  状态: ${task.status}`);
                console.log(`  父任务: ${task.parentTaskId || '无'}`);
                if (task.description) {
                    console.log(`  描述: ${task.description.substring(0, 150)}...`);
                }
            });
        } else {
            console.log('❌ 未找到32周相关任务');
        }
        
        // 显示所有根任务（没有父任务的任务）
        const rootTasks = listResult.tasks.filter(task => !task.parentTaskId);
        console.log(`\n🌳 根任务列表 (${rootTasks.length}个):`);
        rootTasks.forEach(task => {
            console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
        });
        
        // 显示最近的任务（ID较大的）
        const recentTasks = listResult.tasks
            .sort((a, b) => b.id - a.id)
            .slice(0, 10);
        
        console.log(`\n📅 最近的任务 (按ID排序):`);
        recentTasks.forEach(task => {
            console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}, 父任务: ${task.parentTaskId || '无'}`);
        });
        
    } else {
        console.log('❌ 获取任务列表失败');
    }
}

searchWeek32Tasks().catch(console.error);