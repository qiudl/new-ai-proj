#!/usr/bin/env node
/**
 * 测试2: Token生成和持久化测试
 * 任务: #2513
 * 目的: 测试Token生成、持久化、加密和加载功能
 */
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
// 动态导入（需要编译后的文件）
const STORAGE_FILE = path.join(homedir(), '.mcp-task-bridge', 'token-storage.enc');
const ENCRYPTION_KEY_FILE = path.join(homedir(), '.mcp-task-bridge', '.encryption-key');
const MONITOR_LOG_FILE = path.join(homedir(), '.mcp-task-bridge', 'token-refresh.log');
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
 * 清理测试环境
 */
function cleanupTestEnvironment() {
    const files = [STORAGE_FILE, ENCRYPTION_KEY_FILE, MONITOR_LOG_FILE];
    files.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
    console.log('✓ 测试环境已清理');
}
/**
 * TC-003: devQuickLogin Token生成测试
 */
async function testDevQuickLoginTokenGeneration() {
    // 动态导入TaskMCPServer
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    // 调用devQuickLogin
    const result = await server.devQuickLogin('admin');
    if (!result.success) {
        throw new Error(`登录失败: ${result.error}`);
    }
    if (!result.data?.context) {
        throw new Error('返回数据中缺少context');
    }
    if (!result.data?.tokenState) {
        throw new Error('返回数据中缺少tokenState');
    }
    if (!result.data.tokenState.hasRefreshToken) {
        throw new Error('Token状态中缺少refreshToken');
    }
    console.log('  - 用户ID:', result.data.context.userId);
    console.log('  - 用户名:', result.data.context.username);
    console.log('  - 角色:', result.data.context.userRole);
    console.log('  - Token过期时间:', result.data.tokenState.expiresAt);
    console.log('  - 包含RefreshToken:', result.data.tokenState.hasRefreshToken);
    return {
        context: result.data.context,
        tokenState: result.data.tokenState,
        token: result.token
    };
}
/**
 * TC-004: Token持久化存储测试
 */
async function testTokenPersistence() {
    // 生成Token
    const { TaskMCPServer } = await import('./task-mcp.js');
    const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    await server.devQuickLogin('admin');
    // 等待异步持久化完成
    await new Promise(resolve => setTimeout(resolve, 500));
    // 检查持久化文件是否创建
    if (!fs.existsSync(STORAGE_FILE)) {
        throw new Error('持久化文件未创建');
    }
    // 检查文件权限
    const stats = fs.statSync(STORAGE_FILE);
    const permissions = (stats.mode & 0o777).toString(8);
    console.log('  - 持久化文件:', STORAGE_FILE);
    console.log('  - 文件大小:', stats.size, 'bytes');
    console.log('  - 文件权限:', permissions);
    // 读取文件内容（应该是加密的）
    const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
    // 验证内容是Base64编码的
    if (!/^[A-Za-z0-9+/=]+$/.test(content)) {
        throw new Error('持久化内容不是有效的Base64编码');
    }
    console.log('  - 内容格式: Base64编码');
    console.log('  - 内容长度:', content.length);
    // 尝试解码（应该是加密的，不是明文）
    const decoded = Buffer.from(content, 'base64');
    const decodedStr = decoded.toString('utf-8');
    if (decodedStr.includes('admin') || decodedStr.includes('access_token')) {
        throw new Error('检测到明文Token，加密可能未生效');
    }
    console.log('  - 内容已加密: ✓');
    return {
        file_exists: true,
        file_size: stats.size,
        file_permissions: permissions,
        encrypted: true
    };
}
/**
 * TC-005: 加密密钥管理测试
 */
async function testEncryptionKeyManagement() {
    // 检查加密密钥文件
    if (!fs.existsSync(ENCRYPTION_KEY_FILE)) {
        throw new Error('加密密钥文件未创建');
    }
    const stats = fs.statSync(ENCRYPTION_KEY_FILE);
    const permissions = (stats.mode & 0o777).toString(8);
    console.log('  - 密钥文件:', ENCRYPTION_KEY_FILE);
    console.log('  - 文件权限:', permissions);
    // 验证权限是否为600
    if (permissions !== '600') {
        console.warn(`  ⚠ 密钥文件权限不是600: ${permissions}`);
    }
    // 读取密钥内容
    const keyContent = fs.readFileSync(ENCRYPTION_KEY_FILE, 'utf-8').trim();
    // 验证密钥格式（应该是64个十六进制字符）
    if (!/^[0-9a-f]{64}$/i.test(keyContent)) {
        throw new Error('密钥格式不正确，应该是64个十六进制字符');
    }
    console.log('  - 密钥格式: 64位十六进制 ✓');
    console.log('  - 密钥长度:', keyContent.length);
    return {
        key_file_exists: true,
        key_permissions: permissions,
        key_format_valid: true
    };
}
/**
 * TC-006: Token加载和解密测试
 */
async function testTokenLoadingAndDecryption() {
    // 先生成并持久化Token
    const { TaskMCPServer } = await import('./task-mcp.js');
    let server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    const loginResult = await server.devQuickLogin('admin');
    const originalToken = loginResult.token;
    const originalExpiresAt = loginResult.data?.tokenState?.expiresAt;
    console.log('  - 原始Token长度:', originalToken?.length);
    console.log('  - 原始过期时间:', originalExpiresAt);
    // 等待持久化完成
    await new Promise(resolve => setTimeout(resolve, 500));
    // 创建新的Server实例（模拟进程重启）
    server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
    // 等待Token加载完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    // 获取Token状态
    const stats = server.getTokenRefreshStats();
    console.log('  - 新实例Token统计:', stats);
    // 尝试使用加载的Token调用API
    const tasksResult = await server.listTasks({ limit: 1 });
    if (!tasksResult.success) {
        throw new Error('使用加载的Token调用API失败');
    }
    console.log('  - Token加载成功 ✓');
    console.log('  - Token可用于API调用 ✓');
    return {
        token_loaded: true,
        token_works: true,
        stats
    };
}
/**
 * TC-007: 监控事件记录测试
 */
async function testMonitoringEvents() {
    // 检查监控日志文件
    if (!fs.existsSync(MONITOR_LOG_FILE)) {
        throw new Error('监控日志文件未创建');
    }
    const logContent = fs.readFileSync(MONITOR_LOG_FILE, 'utf-8');
    const logLines = logContent.trim().split('\n');
    console.log('  - 监控日志文件:', MONITOR_LOG_FILE);
    console.log('  - 日志行数:', logLines.length);
    // 检查是否包含TOKEN_LOADED事件
    const hasTokenLoaded = logLines.some(line => line.includes('[TOKEN_LOADED]'));
    const hasTokenPersisted = logLines.some(line => line.includes('[TOKEN_PERSISTED]'));
    console.log('  - 包含TOKEN_LOADED事件:', hasTokenLoaded ? '✓' : '✗');
    console.log('  - 包含TOKEN_PERSISTED事件:', hasTokenPersisted ? '✓' : '✗');
    // 显示最近的几条日志
    console.log('\n  最近的监控日志:');
    logLines.slice(-5).forEach(line => {
        console.log('    ' + line);
    });
    return {
        log_file_exists: true,
        log_lines_count: logLines.length,
        has_token_loaded: hasTokenLoaded,
        has_token_persisted: hasTokenPersisted
    };
}
/**
 * 主测试函数
 */
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Token生成和持久化测试                                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    // 清理测试环境
    console.log('准备测试环境...');
    cleanupTestEnvironment();
    // 运行所有测试
    await runTest('TC-003: devQuickLogin Token生成测试', testDevQuickLoginTokenGeneration);
    await runTest('TC-004: Token持久化存储测试', testTokenPersistence);
    await runTest('TC-005: 加密密钥管理测试', testEncryptionKeyManagement);
    await runTest('TC-006: Token加载和解密测试', testTokenLoadingAndDecryption);
    await runTest('TC-007: 监控事件记录测试', testMonitoringEvents);
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
    console.log(`总耗时: ${totalDuration}ms`);
    // 显示失败的测试
    if (failed > 0) {
        console.log('\n失败的测试:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  ✗ ${r.name}`);
            console.log(`    错误: ${r.error}`);
        });
    }
    // 清理测试环境
    console.log('\n清理测试环境...');
    cleanupTestEnvironment();
    // 返回退出码
    if (failed === 0) {
        console.log('✓ 所有测试通过！\n');
        process.exit(0);
    }
    else {
        console.log('✗ 部分测试失败\n');
        process.exit(1);
    }
}
// 运行测试
runAllTests().catch(error => {
    console.error('测试执行失败:', error);
    cleanupTestEnvironment();
    process.exit(1);
});
