#!/usr/bin/env node

/**
 * Daily Focus Tasks MCP Interface Test Script
 * 测试所有Daily Focus Tasks MCP接口功能
 */

import { TaskMCPServer } from './dist/task-mcp.js';

const API_BASE = process.env.TASK_API_BASE || 'http://localhost:8080/api/v1';
const TEST_TASK_ID = 1579; // 刚创建的测试任务

async function runTests() {
    console.log('🚀 开始测试Daily Focus Tasks MCP接口...\n');
    
    const server = new TaskMCPServer(API_BASE);
    
    try {
        // 1. 开发环境登录
        console.log('1️⃣ 测试开发环境登录...');
        const loginResult = await server.devQuickLogin();
        if (loginResult.success) {
            console.log('✅ 登录成功:', loginResult.username);
        } else {
            console.log('❌ 登录失败:', loginResult.error);
            return;
        }

        // 2. 获取今日主要任务列表（空列表）
        console.log('\n2️⃣ 测试获取今日主要任务列表...');
        const focusTasksResult = await server.getDailyFocusTasks();
        if (focusTasksResult.success) {
            console.log('✅ 获取今日主要任务成功, 任务数量:', focusTasksResult.data.tasks.length);
            console.log('📊 统计信息:', focusTasksResult.data.stats);
        } else {
            console.log('❌ 获取今日主要任务失败:', focusTasksResult.error);
        }

        // 3. 添加任务到今日主要任务
        console.log('\n3️⃣ 测试添加任务到今日主要任务...');
        const addResult = await server.addDailyFocusTask({
            task_id: TEST_TASK_ID,
            priority: 'high',
            notes: 'MCP测试任务',
            estimated_duration_minutes: 60
        });
        
        let dailyFocusTaskId = null;
        if (addResult.success) {
            dailyFocusTaskId = addResult.data.id;
            console.log('✅ 添加今日主要任务成功, ID:', dailyFocusTaskId);
        } else {
            console.log('❌ 添加今日主要任务失败:', addResult.error);
            return;
        }

        // 4. 再次获取今日主要任务列表（应该有1个任务）
        console.log('\n4️⃣ 测试获取更新后的今日主要任务列表...');
        const updatedFocusTasksResult = await server.getDailyFocusTasks();
        if (updatedFocusTasksResult.success) {
            console.log('✅ 获取今日主要任务成功, 任务数量:', updatedFocusTasksResult.data.tasks.length);
            if (updatedFocusTasksResult.data.tasks.length > 0) {
                const task = updatedFocusTasksResult.data.tasks[0];
                console.log('📋 任务详情:', {
                    id: task.id,
                    task_title: task.task_title,
                    priority: task.priority,
                    notes: task.notes
                });
            }
        } else {
            console.log('❌ 获取今日主要任务失败:', updatedFocusTasksResult.error);
        }

        // 5. 更新今日主要任务
        console.log('\n5️⃣ 测试更新今日主要任务...');
        const updateResult = await server.updateDailyFocusTask(dailyFocusTaskId, {
            priority: 'critical',
            notes: 'MCP测试任务 - 已更新',
            estimated_duration_minutes: 90
        });
        if (updateResult.success) {
            console.log('✅ 更新今日主要任务成功');
        } else {
            console.log('❌ 更新今日主要任务失败:', updateResult.error);
        }

        // 6. 获取智能推荐
        console.log('\n6️⃣ 测试获取智能推荐...');
        const recommendationsResult = await server.getTaskRecommendations({
            limit: 5,
            exclude_existing: true
        });
        if (recommendationsResult.success) {
            console.log('✅ 获取智能推荐成功, 推荐数量:', recommendationsResult.data.suggestions.length);
        } else {
            console.log('❌ 获取智能推荐失败:', recommendationsResult.error);
        }

        // 7. 获取统计信息
        console.log('\n7️⃣ 测试获取统计信息...');
        const statsResult = await server.getDailyFocusStats();
        if (statsResult.success) {
            console.log('✅ 获取统计信息成功');
            console.log('📊 统计详情:', statsResult.data);
        } else {
            console.log('❌ 获取统计信息失败:', statsResult.error);
        }

        // 8. 标记任务完成
        console.log('\n8️⃣ 测试标记任务完成...');
        const completeResult = await server.completeDailyFocusTask(dailyFocusTaskId);
        if (completeResult.success) {
            console.log('✅ 标记任务完成成功');
        } else {
            console.log('❌ 标记任务完成失败:', completeResult.error);
        }

        // 9. 获取已完成的任务
        console.log('\n9️⃣ 测试获取已完成的任务...');
        const completedTasksResult = await server.getDailyFocusTasks({
            status: 'completed'
        });
        if (completedTasksResult.success) {
            console.log('✅ 获取已完成任务成功, 数量:', completedTasksResult.data.tasks.length);
        } else {
            console.log('❌ 获取已完成任务失败:', completedTasksResult.error);
        }

        // 10. 清理已完成任务
        console.log('\n🔟 测试清理已完成任务...');
        const clearResult = await server.clearCompletedTasks({
            confirm: true
        });
        if (clearResult.success) {
            console.log('✅ 清理已完成任务成功, 清理数量:', clearResult.data.cleared_count);
        } else {
            console.log('❌ 清理已完成任务失败:', clearResult.error);
        }

        // 11. 验证清理结果
        console.log('\n1️⃣1️⃣ 验证清理结果...');
        const finalFocusTasksResult = await server.getDailyFocusTasks();
        if (finalFocusTasksResult.success) {
            console.log('✅ 验证成功, 最终任务数量:', finalFocusTasksResult.data.tasks.length);
            console.log('📊 最终统计:', finalFocusTasksResult.data.stats);
        } else {
            console.log('❌ 验证失败:', finalFocusTasksResult.error);
        }

        // 12. 测试批量添加
        console.log('\n1️⃣2️⃣ 测试批量添加任务...');
        const batchAddResult = await server.batchAddDailyFocusTasks({
            task_ids: [TEST_TASK_ID],
            priority: 'medium',
            notes: '批量添加测试'
        });
        if (batchAddResult.success) {
            console.log('✅ 批量添加任务成功');
        } else {
            console.log('❌ 批量添加任务失败:', batchAddResult.error);
        }

        // 13. 测试快速添加当前任务（需要先有进行中的任务）
        console.log('\n1️⃣3️⃣ 测试快速添加当前任务...');
        
        // 先启动测试任务
        await server.startTask(TEST_TASK_ID);
        
        const quickAddResult = await server.quickAddCurrentTask({
            priority: 'high',
            notes: '快速添加的当前任务'
        });
        if (quickAddResult.success) {
            console.log('✅ 快速添加当前任务成功');
        } else {
            console.log('❌ 快速添加当前任务失败:', quickAddResult.error);
        }

        console.log('\n🎉 所有Daily Focus Tasks MCP接口测试完成！');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

// 运行测试
runTests().catch(console.error);