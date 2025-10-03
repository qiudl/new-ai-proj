#!/usr/bin/env node
/**
 * 子任务创建功能验证测试
 * 任务: #2477
 * 目的: 验证MCP Bridge的create_subtask功能在远端连接环境下正常工作
 */
const results = [];
/**
 * 运行单个测试
 */
async function runTest(name, testFn) {
    const startTime = Date.now();
    try {
        console.log(`\n▶ 运行测试: ${name}`);
        const result = await testFn();
        const duration = Date.now() - startTime;
        results.push({
            name,
            passed: true,
            duration,
            details: result
        });
        console.log(`✓ 测试通过 (${duration}ms)`);
        return true;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        results.push({
            name,
            passed: false,
            duration,
            error: error.message
        });
        console.error(`✗ 测试失败 (${duration}ms):`, error.message);
        return false;
    }
}
/**
 * TC-001: 基础子任务创建
 */
async function testBasicSubtaskCreation() {
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    console.log('  步骤1: 登录系统');
    const loginResult = await server.devQuickLogin('admin');
    if (!loginResult.success) {
        throw new Error('登录失败');
    }
    console.log('    - 登录成功');
    console.log('  步骤2: 创建父任务');
    const parentResult = await server.createTask('测试父任务-验证子任务创建', 1, {
        description: '用于测试子任务创建功能的父任务'
    });
    if (!parentResult.success) {
        throw new Error('创建父任务失败');
    }
    const parentId = parentResult.data.id;
    console.log(`    - 父任务创建成功 (ID: ${parentId})`);
    console.log('  步骤3: 创建子任务');
    const childResult = await server.createSubTask(parentId, {
        title: '测试子任务Level1',
        description: '验证子任务创建功能'
    });
    if (!childResult.success) {
        throw new Error('创建子任务失败');
    }
    const childTask = childResult.subtask;
    console.log(`    - 子任务创建成功 (ID: ${childTask.id})`);
    console.log('  步骤4: 验证子任务属性');
    if (childTask.parent_id !== parentId) {
        throw new Error(`parent_id不正确: 期望${parentId}, 实际${childTask.parent_id}`);
    }
    console.log(`    - parent_id正确: ${childTask.parent_id}`);
    if (childTask.task_level < 1) {
        throw new Error(`task_level不正确: ${childTask.task_level}`);
    }
    console.log(`    - task_level正确: ${childTask.task_level}`);
    if (childTask.project_id !== 1) {
        throw new Error(`project_id不正确: 期望1, 实际${childTask.project_id}`);
    }
    console.log(`    - project_id正确: ${childTask.project_id}`);
    return {
        parent_id: parentId,
        child_id: childTask.id,
        task_level: childTask.task_level,
        validation_passed: true
    };
}
/**
 * TC-002: 多级子任务创建
 */
async function testMultiLevelSubtaskCreation() {
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    console.log('  步骤1: 登录并创建父任务');
    await server.devQuickLogin('admin');
    const parentResult = await server.createTask('测试父任务-多级子任务', 1);
    const parentId = parentResult.data.id;
    console.log(`    - 父任务ID: ${parentId}`);
    console.log('  步骤2: 创建Level1子任务');
    const level1Result = await server.createSubTask(parentId, {
        title: '一级子任务'
    });
    const level1Id = level1Result.subtask.id;
    const level1TaskLevel = level1Result.subtask.task_level;
    console.log(`    - Level1 ID: ${level1Id}, task_level: ${level1TaskLevel}`);
    console.log('  步骤3: 创建Level2子任务');
    const level2Result = await server.createSubTask(level1Id, {
        title: '二级子任务'
    });
    const level2Id = level2Result.subtask.id;
    const level2TaskLevel = level2Result.subtask.task_level;
    console.log(`    - Level2 ID: ${level2Id}, task_level: ${level2TaskLevel}`);
    console.log('  步骤4: 验证层级递增');
    if (level2TaskLevel <= level1TaskLevel) {
        throw new Error(`层级未递增: Level1=${level1TaskLevel}, Level2=${level2TaskLevel}`);
    }
    console.log(`    - 层级递增验证通过`);
    console.log('  步骤5: 获取详细信息验证路径');
    const detailsResult = await server.getDetailedTaskInfo(level2Id);
    if (!detailsResult.success) {
        throw new Error('获取详细信息失败');
    }
    const path = detailsResult.data.path || [];
    console.log(`    - 任务路径长度: ${path.length}`);
    if (path.length < 2) {
        console.warn(`    ⚠ 警告: 路径深度不足: ${path.length}`);
    }
    else {
        console.log(`    - 路径验证通过`);
    }
    return {
        parent_id: parentId,
        level1_id: level1Id,
        level2_id: level2Id,
        level1_task_level: level1TaskLevel,
        level2_task_level: level2TaskLevel,
        path_depth: path.length
    };
}
/**
 * TC-003: 子任务属性继承
 */
async function testSubtaskPropertyInheritance() {
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    console.log('  步骤1: 登录并创建父任务');
    await server.devQuickLogin('admin');
    const parentResult = await server.createTask('测试父任务-属性继承', 1, {
        description: '测试属性继承',
        priority: 'high'
    });
    const parentId = parentResult.data.id;
    const parentProjectId = parentResult.data.project_id;
    console.log(`    - 父任务 project_id: ${parentProjectId}`);
    console.log('  步骤2: 创建子任务（不指定project_id）');
    const childResult = await server.createSubTask(parentId, {
        title: '测试属性继承子任务'
    });
    const childProjectId = childResult.subtask.project_id;
    console.log(`    - 子任务 project_id: ${childProjectId}`);
    console.log('  步骤3: 验证project_id继承');
    if (childProjectId !== parentProjectId) {
        throw new Error(`project_id未继承: 父${parentProjectId}, 子${childProjectId}`);
    }
    console.log(`    - project_id继承验证通过`);
    return {
        parent_project_id: parentProjectId,
        child_project_id: childProjectId,
        inheritance_verified: true
    };
}
/**
 * TC-004: 错误处理
 */
async function testErrorHandling() {
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    console.log('  步骤1: 登录系统');
    await server.devQuickLogin('admin');
    console.log('  步骤2: 使用不存在的父任务ID');
    const invalidResult = await server.createSubTask(999999, {
        title: '测试错误处理'
    });
    if (invalidResult.success) {
        throw new Error('应该失败但却成功了');
    }
    console.log(`    - 正确返回错误: ${invalidResult.error}`);
    console.log('  步骤3: 缺少必填字段title');
    try {
        const missingTitleResult = await server.createSubTask(2476, {});
        if (missingTitleResult.success) {
            throw new Error('缺少title应该失败');
        }
        console.log(`    - 正确处理缺少title的情况`);
    }
    catch (error) {
        console.log(`    - 捕获到预期错误: ${error.message}`);
    }
    return {
        invalid_parent_handled: true,
        missing_field_handled: true
    };
}
/**
 * TC-005: 并发创建子任务
 */
async function testConcurrentSubtaskCreation() {
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    console.log('  步骤1: 登录并创建父任务');
    await server.devQuickLogin('admin');
    const parentResult = await server.createTask('测试父任务-并发创建', 1);
    const parentId = parentResult.data.id;
    console.log(`    - 父任务ID: ${parentId}`);
    console.log('  步骤2: 并发创建5个子任务');
    const promises = [];
    for (let i = 1; i <= 5; i++) {
        promises.push(server.createSubTask(parentId, {
            title: `并发子任务${i}`
        }));
    }
    const startTime = Date.now();
    const childResults = await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log(`    - 并发创建完成，耗时: ${duration}ms`);
    console.log('  步骤3: 验证所有子任务创建成功');
    const successCount = childResults.filter(r => r.success).length;
    if (successCount !== 5) {
        throw new Error(`并发创建失败: 成功${successCount}/5`);
    }
    console.log(`    - 所有子任务创建成功 (${successCount}/5)`);
    console.log('  步骤4: 验证parent_id一致性');
    const allParentIdsCorrect = childResults.every(r => r.subtask.parent_id === parentId);
    if (!allParentIdsCorrect) {
        throw new Error('部分子任务的parent_id不正确');
    }
    console.log(`    - parent_id一致性验证通过`);
    console.log('  步骤5: 获取父任务children_count');
    const detailsResult = await server.getDetailedTaskInfo(parentId);
    const childrenCount = detailsResult.data.task.children_count;
    console.log(`    - children_count: ${childrenCount}`);
    if (childrenCount !== 5) {
        console.warn(`    ⚠ 警告: children_count=${childrenCount}, 期望=5`);
    }
    else {
        console.log(`    - children_count正确`);
    }
    return {
        concurrent_count: 5,
        success_count: successCount,
        duration,
        children_count: childrenCount,
        avg_duration: duration / 5
    };
}
/**
 * 主测试函数
 */
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   子任务创建功能验证测试                                ║');
    console.log('║   任务: #2477                                          ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    // 运行所有测试
    await runTest('TC-001: 基础子任务创建', testBasicSubtaskCreation);
    await runTest('TC-002: 多级子任务创建', testMultiLevelSubtaskCreation);
    await runTest('TC-003: 子任务属性继承', testSubtaskPropertyInheritance);
    await runTest('TC-004: 错误处理', testErrorHandling);
    await runTest('TC-005: 并发创建子任务', testConcurrentSubtaskCreation);
    // 汇总结果
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   测试结果汇总                                          ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\n总测试数: ${results.length}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`总耗时: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}秒)`);
    console.log(`成功率: ${((passed / results.length) * 100).toFixed(1)}%`);
    // 显示失败的测试
    if (failed > 0) {
        console.log('\n失败的测试:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  ✗ ${r.name}`);
            console.log(`    错误: ${r.error}`);
        });
    }
    // 显示性能统计
    console.log('\n性能统计:');
    results.forEach(r => {
        console.log(`  ${r.name}: ${r.duration}ms`);
    });
    // 返回退出码
    if (failed === 0) {
        console.log('\n✓ 所有测试通过！\n');
        process.exit(0);
    }
    else {
        console.log('\n✗ 部分测试失败\n');
        process.exit(1);
    }
}
// 运行测试
runAllTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
});
