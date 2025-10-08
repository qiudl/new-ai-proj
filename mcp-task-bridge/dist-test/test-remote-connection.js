#!/usr/bin/env node
/**
 * 测试1: 远端连接和基础API测试
 * 任务: #2512
 * 目的: 验证MCP Bridge与远端服务器的连接性和基础API功能
 */
import axios from 'axios';
// 测试配置
const REMOTE_API_BASE = 'http://152.136.104.251:8080/api/v1';
const TEST_USERNAME = 'admin';
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
 * TC-001: 远端服务器连接性测试
 */
async function testServerConnectivity() {
    // 测试HTTP连接
    const response = await axios.get(`${REMOTE_API_BASE.replace('/api/v1', '')}/health`, {
        timeout: 5000
    });
    if (response.status !== 200) {
        throw new Error(`健康检查失败: HTTP ${response.status}`);
    }
    console.log('  - 健康检查接口: OK');
    console.log('  - 响应状态:', response.status);
    return {
        status: response.status,
        data: response.data
    };
}
/**
 * TC-002: dev_quick_login接口测试
 */
async function testDevQuickLogin() {
    const response = await axios.post(`${REMOTE_API_BASE}/auth/dev-quick-login`, { username: TEST_USERNAME }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
    });
    if (response.status !== 200) {
        throw new Error(`登录失败: HTTP ${response.status}`);
    }
    if (!response.data?.data?.access_token) {
        throw new Error('响应中缺少access_token');
    }
    if (!response.data?.data?.refresh_token) {
        throw new Error('响应中缺少refresh_token');
    }
    if (!response.data?.data?.expires_in) {
        throw new Error('响应中缺少expires_in');
    }
    const { access_token, refresh_token, expires_in } = response.data.data;
    console.log('  - access_token长度:', access_token.length);
    console.log('  - refresh_token长度:', refresh_token.length);
    console.log('  - expires_in:', expires_in, '秒');
    console.log('  - 过期时间:', new Date(Date.now() + expires_in * 1000).toISOString());
    return {
        access_token,
        refresh_token,
        expires_in,
        user: response.data.data.user
    };
}
/**
 * TC-003: 使用Token访问受保护接口
 */
async function testProtectedApiWithToken() {
    // 先获取Token
    const loginResponse = await axios.post(`${REMOTE_API_BASE}/auth/dev-quick-login`, { username: TEST_USERNAME }, { headers: { 'Content-Type': 'application/json' } });
    const token = loginResponse.data.data.access_token;
    // 使用Token访问用户信息接口
    const userResponse = await axios.get(`${REMOTE_API_BASE}/users/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        timeout: 5000
    });
    if (userResponse.status !== 200) {
        throw new Error(`获取用户信息失败: HTTP ${userResponse.status}`);
    }
    const user = userResponse.data.data || userResponse.data;
    console.log('  - 用户ID:', user.id);
    console.log('  - 用户名:', user.username);
    console.log('  - 角色:', user.role);
    console.log('  - 类型:', user.user_type);
    return {
        user,
        token_works: true
    };
}
/**
 * TC-004: Token刷新接口测试
 */
async function testTokenRefresh() {
    // 先获取Token
    const loginResponse = await axios.post(`${REMOTE_API_BASE}/auth/dev-quick-login`, { username: TEST_USERNAME }, { headers: { 'Content-Type': 'application/json' } });
    const refreshToken = loginResponse.data.data.refresh_token;
    // 使用refresh_token刷新
    const refreshResponse = await axios.post(`${REMOTE_API_BASE}/auth/refresh`, {}, {
        headers: {
            'Authorization': `Bearer ${refreshToken}`,
            'Content-Type': 'application/json'
        },
        timeout: 5000
    });
    if (refreshResponse.status !== 200) {
        throw new Error(`Token刷新失败: HTTP ${refreshResponse.status}`);
    }
    if (!refreshResponse.data?.data?.access_token) {
        throw new Error('刷新响应中缺少access_token');
    }
    const newToken = refreshResponse.data.data.access_token;
    const newRefreshToken = refreshResponse.data.data.refresh_token;
    const newExpiresIn = refreshResponse.data.data.expires_in;
    console.log('  - 新access_token长度:', newToken.length);
    console.log('  - 新refresh_token长度:', newRefreshToken.length);
    console.log('  - 新expires_in:', newExpiresIn, '秒');
    return {
        new_access_token: newToken,
        new_refresh_token: newRefreshToken,
        new_expires_in: newExpiresIn,
        refresh_works: true
    };
}
/**
 * TC-005: 数据库连接测试（通过API间接测试）
 */
async function testDatabaseConnectivity() {
    // 先获取Token
    const loginResponse = await axios.post(`${REMOTE_API_BASE}/auth/dev-quick-login`, { username: TEST_USERNAME }, { headers: { 'Content-Type': 'application/json' } });
    const token = loginResponse.data.data.access_token;
    // 获取任务列表（需要数据库查询）
    const tasksResponse = await axios.get(`${REMOTE_API_BASE}/tasks?limit=5`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        timeout: 5000
    });
    if (tasksResponse.status !== 200) {
        throw new Error(`获取任务列表失败: HTTP ${tasksResponse.status}`);
    }
    const tasks = tasksResponse.data.data?.tasks || tasksResponse.data.data || [];
    console.log('  - 数据库查询成功');
    console.log('  - 返回任务数:', tasks.length);
    return {
        database_works: true,
        sample_tasks_count: tasks.length
    };
}
/**
 * 主测试函数
 */
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   远端连接和基础API测试                                 ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n测试目标: ${REMOTE_API_BASE}`);
    console.log(`测试用户: ${TEST_USERNAME}\n`);
    // 运行所有测试
    await runTest('TC-001: 远端服务器连接性测试', testServerConnectivity);
    await runTest('TC-002: dev_quick_login接口测试', testDevQuickLogin);
    await runTest('TC-003: 使用Token访问受保护接口', testProtectedApiWithToken);
    await runTest('TC-004: Token刷新接口测试', testTokenRefresh);
    await runTest('TC-005: 数据库连接测试', testDatabaseConnectivity);
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
    // 返回退出码
    if (failed === 0) {
        console.log('\n✓ 所有测试通过！');
        process.exit(0);
    }
    else {
        console.log('\n✗ 部分测试失败');
        process.exit(1);
    }
}
// 运行测试
runAllTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
});
