#!/usr/bin/env ts-node
/**
 * Token自动刷新功能测试脚本
 * 测试场景：
 * 1. 使用dev_quick_login获取Token
 * 2. 验证Token状态已初始化
 * 3. 模拟Token即将过期的情况
 * 4. 验证自动刷新功能
 */
import { TaskMCPServer } from './task-mcp.js';
async function testTokenRefresh() {
    console.log('\n=== Token自动刷新功能测试 ===\n');
    // 初始化MCP Server
    const apiBase = process.env.TASK_API_BASE || 'http://localhost:8080/api/v1';
    const server = new TaskMCPServer(apiBase);
    try {
        // 测试1: 开发环境快速登录
        console.log('测试1: 开发环境快速登录');
        const loginResult = await server.devQuickLogin('admin');
        if (!loginResult.success) {
            throw new Error(`登录失败: ${loginResult.error}`);
        }
        console.log('✓ 登录成功');
        console.log('  Token:', loginResult.token?.substring(0, 20) + '...');
        console.log('  登录响应数据:', JSON.stringify(loginResult.data, null, 2));
        if (loginResult.data?.tokenState) {
            const tokenState = loginResult.data.tokenState;
            console.log('  Token过期时间:', tokenState.expiresAt);
            console.log('  有刷新Token:', tokenState.hasRefreshToken);
        }
        // 测试2: 获取任务列表（验证Token有效）
        console.log('\n测试2: 使用Token获取任务列表');
        const tasksResult = await server.listTasks({
            page: 1,
            limit: 5
        });
        if (tasksResult.success) {
            console.log('✓ 成功获取任务列表');
            console.log(`  任务总数: ${tasksResult.total || 0}`);
        }
        else {
            console.log('✗ 获取任务列表失败:', tasksResult.error);
        }
        // 测试3: 检查当前Token状态
        console.log('\n测试3: 检查内部Token状态');
        const baseClient = server;
        const taskService = baseClient.taskService; // 访问内部的taskService（它是BaseClient的实例）
        if (taskService && taskService.tokenState) {
            console.log('✓ Token状态已初始化');
            console.log('  过期时间:', taskService.tokenState.expiresAt.toISOString());
            console.log('  有刷新Token:', !!taskService.tokenState.refreshToken);
            const timeUntilExpiry = taskService.tokenState.expiresAt.getTime() - Date.now();
            console.log('  距离过期:', Math.floor(timeUntilExpiry / 1000) + '秒');
        }
        else {
            console.log('⚠ Token状态未初始化');
        }
        // 测试4: 模拟Token即将过期（手动修改expiresAt）
        console.log('\n测试4: 模拟Token即将过期');
        if (taskService && taskService.tokenState) {
            const originalExpiresAt = taskService.tokenState.expiresAt;
            console.log('  原始过期时间:', originalExpiresAt.toISOString());
            // 将过期时间设置为30秒后
            taskService.tokenState.expiresAt = new Date(Date.now() + 30 * 1000);
            console.log('  模拟过期时间:', taskService.tokenState.expiresAt.toISOString());
            // 再次请求，应该触发自动刷新
            console.log('\n  发起请求，应触发自动刷新...');
            const refreshTestResult = await server.listTasks({ page: 1, limit: 1 });
            if (refreshTestResult.success) {
                console.log('✓ 自动刷新成功，请求完成');
                if (taskService.tokenState) {
                    console.log('  新的过期时间:', taskService.tokenState.expiresAt.toISOString());
                }
            }
            else {
                console.log('✗ 自动刷新失败:', refreshTestResult.error);
            }
        }
        else {
            console.log('⚠ 跳过测试4: Token状态未初始化');
        }
        console.log('\n=== 测试完成 ===\n');
    }
    catch (error) {
        console.error('\n✗ 测试失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}
// 运行测试
testTokenRefresh().catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
});
