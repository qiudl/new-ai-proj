#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function updateTasksToCompleted() {
    console.log('🔄 更新任务597-600状态为completed...\n');
    
    const taskIds = [597, 598, 599, 600];
    const updateResults = [];
    
    for (const taskId of taskIds) {
        try {
            console.log(`更新任务${taskId}状态...`);
            
            // 首先获取任务信息
            const task = await taskServer.findTaskById(taskId);
            if (!task) {
                console.log(`❌ 任务${taskId}不存在`);
                continue;
            }
            
            console.log(`当前状态: ${task.status}`);
            
            // 如果已经是completed状态，跳过
            if (task.status === 'completed') {
                console.log(`✅ 任务${taskId}已经是completed状态`);
                updateResults.push({
                    taskId,
                    success: true,
                    message: '任务已是completed状态',
                    previousStatus: task.status
                });
                continue;
            }
            
            // 更新任务状态为completed
            const updateResult = await taskServer.updateTask(taskId, {
                status: 'completed',
                updated_at: new Date().toISOString(),
                // 保持其他字段不变
                title: task.title,
                description: task.description,
                project_id: task.project_id,
                parent_id: task.parent_id,
                custom_fields: {
                    ...task.custom_fields,
                    completion_date: new Date().toISOString()
                }
            });
            
            if (updateResult.success) {
                console.log(`✅ 任务${taskId}状态更新成功: ${task.status} -> completed`);
                updateResults.push({
                    taskId,
                    success: true,
                    message: '状态更新成功',
                    previousStatus: task.status,
                    newStatus: 'completed'
                });
            } else {
                console.log(`❌ 任务${taskId}状态更新失败: ${updateResult.error}`);
                updateResults.push({
                    taskId,
                    success: false,
                    message: updateResult.error,
                    previousStatus: task.status
                });
            }
            
        } catch (error) {
            console.error(`❌ 更新任务${taskId}时出错:`, error.message);
            updateResults.push({
                taskId,
                success: false,
                message: error.message,
                previousStatus: 'unknown'
            });
        }
        
        // 添加短暂延迟避免过频繁的请求
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📋 更新结果汇总：');
    console.log('==================');
    
    let successCount = 0;
    let failureCount = 0;
    
    updateResults.forEach(result => {
        if (result.success) {
            successCount++;
            console.log(`✅ 任务${result.taskId}: ${result.message}`);
        } else {
            failureCount++;
            console.log(`❌ 任务${result.taskId}: ${result.message}`);
        }
    });
    
    console.log('\n📊 统计信息：');
    console.log(`成功更新: ${successCount} 个任务`);
    console.log(`更新失败: ${failureCount} 个任务`);
    
    // 验证最终状态
    console.log('\n🔍 验证最终状态：');
    for (const taskId of taskIds) {
        try {
            const task = await taskServer.findTaskById(taskId);
            if (task) {
                console.log(`任务${taskId}: ${task.status} - "${task.title}"`);
            }
        } catch (error) {
            console.log(`任务${taskId}: 获取状态失败`);
        }
    }
    
    return updateResults;
}

// 执行更新
updateTasksToCompleted().then((results) => {
    const allSuccess = results.every(r => r.success);
    if (allSuccess) {
        console.log('\n🎉 所有任务状态更新完成！');
        process.exit(0);
    } else {
        console.log('\n⚠️  部分任务更新失败，请检查错误信息');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ 执行更新过程中出现错误:', error);
    process.exit(1);
});