#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask397() {
    console.log('🔍 查找任务397（32周：系统Bug修复与优化）...\n');
    
    const listResult = await taskServer.listTasks(1);
    
    if (listResult.success && listResult.tasks.length > 0) {
        console.log(`找到 ${listResult.tasks.length} 个任务`);
        
        // 查找任务397
        const task397 = listResult.tasks.find(task => task.id === 397);
        
        if (task397) {
            console.log('✅ 找到任务397:');
            console.log(`- ID: ${task397.id}`);
            console.log(`- 标题: "${task397.title}"`);
            console.log(`- 状态: ${task397.status}`);
            console.log(`- 描述: ${task397.description?.substring(0, 200)}...`);
            console.log(`- 父任务ID: ${task397.parentTaskId || '无'}`);
            console.log(`- 项目ID: ${task397.projectId}`);
            
            // 查找任务397的所有子任务
            const childTasks = listResult.tasks.filter(task => task.parentTaskId === 397);
            console.log(`\n🔍 任务397的子任务 (${childTasks.length}个):`);
            childTasks.forEach(child => {
                console.log(`  - ID: ${child.id}, 标题: "${child.title}", 状态: ${child.status}`);
            });
            
            return task397;
        } else {
            console.log('❌ 未找到任务397');
            
            // 搜索包含"32周"或"Bug修复"的任务
            const searchTasks = listResult.tasks.filter(task => 
                (task.title && (task.title.includes('32周') || task.title.includes('Bug修复'))) ||
                (task.description && (task.description.includes('32周') || task.description.includes('Bug修复')))
            );
            
            if (searchTasks.length > 0) {
                console.log('🔍 找到相关任务:');
                searchTasks.forEach(task => {
                    console.log(`- ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
                });
            }
            
            return null;
        }
    } else {
        console.log('❌ 获取任务列表失败');
        return null;
    }
}

findTask397().then(task => {
    if (task) {
        console.log(`\n✅ 任务397查找完成，准备创建子任务`);
    } else {
        console.log('\n❌ 任务397未找到，请检查任务ID是否正确');
    }
}).catch(error => {
    console.error('❌ 查找任务时出错:', error);
});