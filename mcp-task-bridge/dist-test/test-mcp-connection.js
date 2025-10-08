#!/usr/bin/env node
/**
 * MCP连接综合测试
 * 任务: #2478
 * 验证MCP Bridge与远端API的完整功能
 */
const results = [];
async function runTest(name, testFn) {
    const start = Date.now();
    try {
        console.log(`\n▶ ${name}`);
        await testFn();
        const duration = Date.now() - start;
        results.push({ name, passed: true, duration });
        console.log(`✓ 通过 (${duration}ms)`);
        return true;
    }
    catch (error) {
        const duration = Date.now() - start;
        results.push({ name, passed: false, duration, error: error.message });
        console.error(`✗ 失败 (${duration}ms):`, error.message);
        return false;
    }
}
async function main() {
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   MCP连接综合测试                      ║');
    console.log('╚════════════════════════════════════════╝');
    // 登录
    await runTest('登录认证', async () => {
        const result = await server.devQuickLogin('admin');
        if (!result.success)
            throw new Error('登录失败');
    });
    // 任务管理测试
    let taskId;
    await runTest('创建任务', async () => {
        const result = await server.createTask('MCP测试任务', 1);
        if (!result.success)
            throw new Error('创建失败');
        taskId = result.data.id;
    });
    await runTest('列出任务', async () => {
        const result = await server.listTasks({ limit: 5 });
        if (!result.success || !result.data?.tasks)
            throw new Error('列出失败');
    });
    await runTest('查找任务', async () => {
        const result = await server.findTask({ id: taskId });
        if (!result.success)
            throw new Error('查找失败');
    });
    await runTest('更新任务', async () => {
        const result = await server.updateTask(taskId, { description: '已更新' });
        if (!result.success)
            throw new Error('更新失败');
    });
    await runTest('启动任务', async () => {
        const result = await server.startTask(taskId);
        if (!result.success)
            throw new Error('启动失败');
    });
    await runTest('完成任务', async () => {
        const result = await server.completeTask(taskId);
        if (!result.success)
            throw new Error('完成失败');
    });
    // 汇总
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   测试结果                             ║');
    console.log('╚════════════════════════════════════════╝');
    const passed = results.filter(r => r.passed).length;
    console.log(`通过: ${passed}/${results.length} (${(passed / results.length * 100).toFixed(1)}%)`);
    console.log(`总耗时: ${results.reduce((s, r) => s + r.duration, 0)}ms`);
    process.exit(passed === results.length ? 0 : 1);
}
main().catch(console.error);
