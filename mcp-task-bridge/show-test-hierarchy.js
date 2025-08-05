#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function showTestHierarchy() {
    console.log('🌳 批量父任务更改测试数据层级结构\n');
    
    const testTaskIds = [518, 519, 520, 521, 522, 523, 524, 530, 531, 532];
    const tasks = [];
    
    // 获取所有测试任务
    for (const taskId of testTaskIds) {
        try {
            const task = await taskServer.findTaskById(taskId);
            tasks.push(task);
        } catch (error) {
            console.log(`❌ 无法获取任务 ${taskId}: ${error.message}`);
        }
    }
    
    // 构建层级结构
    function buildHierarchy(parentId = null, level = 0) {
        const children = tasks.filter(t => t.parent_id === parentId);
        const indent = '  '.repeat(level);
        
        children.forEach(task => {
            let statusIcon = '';
            switch (task.status) {
                case 'todo': statusIcon = '📋'; break;
                case 'in_progress': statusIcon = '🚀'; break;
                case 'completed': statusIcon = '✅'; break;
                case 'cancelled': statusIcon = '❌'; break;
                default: statusIcon = '❓';
            }
            
            let roleIndicator = '';
            if (task.id === 518) roleIndicator = ' [测试容器]';
            else if ([519, 520].includes(task.id)) roleIndicator = ' [目标父任务]';
            else if ([521, 522, 523, 524].includes(task.id)) roleIndicator = ' [源任务]';
            else if ([530, 531, 532].includes(task.id)) roleIndicator = ' [深度层级测试]';
            
            console.log(`${indent}${statusIcon} ID:${task.id} - "${task.title}"${roleIndicator}`);
            
            // 递归显示子任务
            buildHierarchy(task.id, level + 1);
        });
    }
    
    console.log('📊 层级结构视图:');
    console.log('========================================');
    buildHierarchy(); // 从根任务开始
    
    console.log('\n📝 测试场景说明:');
    console.log('========================================');
    console.log('1. 测试容器 (ID: 518)');
    console.log('   └── 包含4个源任务 (IDs: 521-524)，用于批量父任务更改测试');
    console.log('');
    console.log('2. 目标父任务 (IDs: 519-520)');
    console.log('   └── 作为批量移动的目标父任务，用于接收源任务');
    console.log('');
    console.log('3. 深度层级测试 (IDs: 530-532)');
    console.log('   └── 测试深层级任务结构的父任务更改功能');
    console.log('   └── 530 → 531 → 532 形成3级层级结构');
    
    // 检查可能的子任务关系
    console.log('\n🔍 检查额外的子任务关系:');
    console.log('========================================');
    
    for (const task of tasks) {
        try {
            const childrenResult = await taskServer.getTaskChildren(task.id);
            if (childrenResult.success && childrenResult.total > 0) {
                console.log(`${task.id} "${task.title}" 有 ${childrenResult.total} 个子任务:`);
                childrenResult.children.forEach(child => {
                    if (!testTaskIds.includes(child.id)) {
                        let statusIcon = '';
                        switch (child.status) {
                            case 'todo': statusIcon = '📋'; break;
                            case 'in_progress': statusIcon = '🚀'; break;
                            case 'completed': statusIcon = '✅'; break;
                            case 'cancelled': statusIcon = '❌'; break;
                            default: statusIcon = '❓';
                        }
                        console.log(`  ${statusIcon} ID:${child.id} - "${child.title}" [额外子任务]`);
                    }
                });
            }
        } catch (error) {
            // 忽略获取子任务失败的情况
        }
    }
    
    console.log('\n✨ 测试数据状态总结:');
    console.log('========================================');
    console.log(`📊 总任务数: ${tasks.length}`);
    console.log(`📋 Todo状态: ${tasks.filter(t => t.status === 'todo').length}`);
    console.log(`🚀 进行中: ${tasks.filter(t => t.status === 'in_progress').length}`);
    console.log(`✅ 已完成: ${tasks.filter(t => t.status === 'completed').length}`);
    console.log(`❌ 已取消: ${tasks.filter(t => t.status === 'cancelled').length}`);
    console.log('\n🎯 数据已准备就绪，可以开始批量父任务更改的UI测试！');
}

showTestHierarchy()
    .then(() => {
        console.log('\n🏁 层级结构显示完成');
    })
    .catch(error => {
        console.error('\n💥 显示层级结构时出错:', error.message);
        process.exit(1);
    });