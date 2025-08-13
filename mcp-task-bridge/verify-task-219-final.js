#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function verifyTask219Final() {
    console.log('🔍 最终验证任务 219 状态...\n');
    
    try {
        // 获取任务详情
        const task = await taskServer.findTaskById(219);
        
        if (task) {
            console.log('✅ 任务 219 最终状态验证:');
            console.log('=' .repeat(50));
            console.log(`ID: ${task.id}`);
            console.log(`标题: ${task.title}`);
            console.log(`当前状态: ${task.status}`);
            console.log(`项目ID: ${task.project_id}`);
            console.log(`父任务ID: ${task.parent_id || '无'}`);
            console.log(`最后更新时间: ${task.updated_at}`);
            console.log('=' .repeat(50));
            
            if (task.status === 'completed') {
                console.log('🎉 确认：任务 219 已经处于 "completed" 状态！');
                console.log('✅ 无需进一步操作，任务状态已正确设置。');
                return true;
            } else {
                console.log(`⚠️ 注意：任务 219 当前状态为 "${task.status}", 而非 "completed"`);
                console.log('需要进行状态更新操作...');
                return false;
            }
        } else {
            console.log('❌ 任务 219 不存在！');
            return false;
        }
    } catch (error) {
        console.error('❌ 验证失败:', error.message);
        return false;
    }
}

// 同时检查同类任务的状态
async function checkRelatedTasks() {
    console.log('\n🔍 检查相关管道任务状态...');
    
    try {
        const listResult = await taskServer.listTasks(1);
        if (listResult.success && listResult.tasks.length > 0) {
            const pipelineTasks = listResult.tasks.filter(task => 
                task.title.includes('管道') && task.id >= 217 && task.id <= 221
            );
            
            console.log('\n📋 相关管道任务状态:');
            pipelineTasks.forEach(task => {
                const statusIcon = task.status === 'completed' ? '✅' : 
                                 task.status === 'in_progress' ? '🔄' : 
                                 task.status === 'todo' ? '📝' : '❓';
                console.log(`${statusIcon} ID ${task.id}: ${task.title} [${task.status}]`);
            });
        }
    } catch (error) {
        console.error('检查相关任务失败:', error.message);
    }
}

async function main() {
    const isCompleted = await verifyTask219Final();
    await checkRelatedTasks();
    
    console.log('\n' + '='.repeat(60));
    if (isCompleted) {
        console.log('🎯 结论: 任务 219 已经成功设置为 "completed" 状态');
        console.log('📅 更新时间: 2025-08-13T03:35:09.453104Z');
        console.log('💡 任务标题: 管道D：Redis缓存层与性能优化');
    } else {
        console.log('⚠️ 结论: 任务 219 需要状态更新操作');
    }
    console.log('='.repeat(60));
}

main().catch(console.error);