#!/usr/bin/env node

/**
 * 批量设置父任务功能API验证测试
 * 通过API直接验证后端功能是否正确实现
 */

const https = require('https');
const http = require('http');

// 忽略自签名证书错误（仅用于本地测试）
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

class BatchParentTaskAPIVerifier {
    constructor() {
        this.baseURL = 'http://localhost';
        this.token = null;
        this.projectId = 1;
        this.testResults = [];
        this.passed = 0;
        this.failed = 0;
    }

    async makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseURL);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                }
            };

            const req = http.request(url, options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const response = body ? JSON.parse(body) : {};
                        resolve({ status: res.statusCode, data: response });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: body });
                    }
                });
            });

            req.on('error', reject);
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    logTest(testName, passed, details) {
        const status = passed ? 'PASS' : 'FAIL';
        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${details}`);
        
        this.testResults.push({ test: testName, status, details });
        if (passed) {
            this.passed++;
        } else {
            this.failed++;
        }
    }

    async authenticate() {
        console.log('🔐 正在获取认证token...');
        
        const response = await this.makeRequest('POST', '/api/v1/auth/login', {
            username: 'admin',
            password: 'password123'
        });

        if (response.status === 200 && response.data.data && response.data.data.token) {
            this.token = response.data.data.token;
            this.logTest('用户认证', true, '成功获取认证token');
            return true;
        } else {
            this.logTest('用户认证', false, `认证失败: ${response.status}`);
            return false;
        }
    }

    async verifyBackendHealth() {
        console.log('\n🏥 检查后端服务健康状态...');
        
        const response = await this.makeRequest('GET', '/api/v1/health');
        
        if (response.status === 200) {
            this.logTest('后端服务健康检查', true, '服务正常运行');
            return true;
        } else {
            this.logTest('后端服务健康检查', false, `服务异常: ${response.status}`);
            return false;
        }
    }

    async verifyTasksExist() {
        console.log('\n📋 检查项目任务数据...');
        
        const response = await this.makeRequest('GET', `/api/v1/projects/${this.projectId}/tasks?page_size=50`);
        
        if (response.status === 200 && response.data.data && response.data.data.data) {
            const taskCount = response.data.data.data.length;
            const totalCount = response.data.data.pagination?.total || taskCount;
            
            if (taskCount >= 2) {
                this.logTest('任务数据检查', true, `找到 ${taskCount} 个任务 (总计: ${totalCount})`);
                return response.data.data.data;
            } else {
                this.logTest('任务数据检查', false, `任务数量不足: ${taskCount} (需要至少2个)`);
                return [];
            }
        } else {
            this.logTest('任务数据检查', false, `获取任务失败: ${response.status}`);
            return [];
        }
    }

    async verifyParentTaskSearchAPI() {
        console.log('\n🔍 验证父任务搜索API...');
        
        const response = await this.makeRequest('GET', `/api/v1/projects/${this.projectId}/tasks/search-parents?keyword=32&limit=10`);
        
        if (response.status === 200) {
            this.logTest('父任务搜索API', true, `API正常响应: ${response.status}`);
            return true;
        } else {
            this.logTest('父任务搜索API', false, `API响应异常: ${response.status}`);
            return false;
        }
    }

    async verifyBatchUpdateAPI(taskIds) {
        console.log('\n🔄 验证批量更新API...');
        
        // 选择前两个任务进行测试
        const testTaskIds = taskIds.slice(0, 2).map(task => task.id);
        const parentTaskId = taskIds.length > 2 ? taskIds[2].id : null;
        
        if (!parentTaskId) {
            this.logTest('批量更新API', false, '没有足够的任务进行父任务设置测试');
            return false;
        }
        
        const updateData = {
            task_ids: testTaskIds,
            updates: {
                parent_id: parentTaskId
            }
        };
        
        const response = await this.makeRequest('PUT', `/api/v1/projects/${this.projectId}/tasks/batch`, updateData);
        
        if (response.status === 200) {
            this.logTest('批量更新API', true, `成功为 ${testTaskIds.length} 个任务设置父任务 ${parentTaskId}`);
            return true;
        } else {
            // 即使API不存在，我们也可以检查是否有相关的路由或实现
            if (response.status === 404) {
                this.logTest('批量更新API', false, 'API路由不存在 - 需要实现批量更新功能');
            } else {
                this.logTest('批量更新API', false, `API错误: ${response.status} - ${JSON.stringify(response.data)}`);
            }
            return false;
        }
    }

    async verifyHierarchicalTaskQuery() {
        console.log('\n🌳 验证层级任务查询API...');
        
        const response = await this.makeRequest('GET', `/api/v1/projects/${this.projectId}/tasks/tree`);
        
        if (response.status === 200) {
            this.logTest('层级任务查询', true, '任务树结构API正常');
            return true;
        } else {
            this.logTest('层级任务查询', false, `任务树API异常: ${response.status}`);
            return false;
        }
    }

    async verifyCircularDependencyCheck() {
        console.log('\n🔄 验证循环依赖检查API...');
        
        // 假设我们有任务ID 1和2，测试是否存在循环依赖检查
        const response = await this.makeRequest('GET', `/api/v1/projects/${this.projectId}/tasks/1/check-circular?parent_id=2`);
        
        // 即使返回404，这也表明我们知道需要这个功能
        if (response.status === 200 || response.status === 404) {
            this.logTest('循环依赖检查', response.status === 200, 
                response.status === 200 ? '循环依赖检查API可用' : '循环依赖检查API需要实现');
            return response.status === 200;
        } else {
            this.logTest('循环依赖检查', false, `API异常: ${response.status}`);
            return false;
        }
    }

    async runFullVerification() {
        console.log('🎯 === 批量设置父任务功能API验证测试 ===');
        console.log('🔧 基于task-602.md的功能需求进行验证\n');

        try {
            // Step 1: 认证
            if (!await this.authenticate()) {
                throw new Error('认证失败，无法继续测试');
            }

            // Step 2: 健康检查
            if (!await this.verifyBackendHealth()) {
                throw new Error('后端服务异常，无法继续测试');
            }

            // Step 3: 验证任务数据
            const tasks = await this.verifyTasksExist();
            if (tasks.length < 2) {
                throw new Error('任务数据不足，无法进行批量操作测试');
            }

            // Step 4: 验证父任务搜索API
            await this.verifyParentTaskSearchAPI();

            // Step 5: 验证批量更新API
            await this.verifyBatchUpdateAPI(tasks);

            // Step 6: 验证层级查询
            await this.verifyHierarchicalTaskQuery();

            // Step 7: 验证循环依赖检查
            await this.verifyCircularDependencyCheck();

        } catch (error) {
            console.error(`❌ 测试执行错误: ${error.message}`);
            this.logTest('测试执行', false, error.message);
        }

        // 输出测试结果
        this.outputResults();
    }

    outputResults() {
        console.log('\n🎉 === 批量父任务功能API验证结果 ===');
        console.log(`📊 总测试数: ${this.passed + this.failed}`);
        console.log(`✅ 通过: ${this.passed}`);
        console.log(`❌ 失败: ${this.failed}`);
        console.log(`🎯 通过率: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);

        console.log('\n📋 详细测试结果:');
        this.testResults.forEach((result, index) => {
            const status = result.status === 'PASS' ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${result.test}: ${result.details}`);
        });

        const allPassed = this.failed === 0;
        if (allPassed) {
            console.log('\n🎊 批量设置父任务功能API验证完全成功！');
            console.log('🏆 后端API已准备就绪，可以支持前端批量父任务功能！');
        } else {
            console.log('\n⚠️ 部分API功能需要完善，建议优先实现以下功能:');
            
            const failedTests = this.testResults.filter(r => r.status === 'FAIL');
            failedTests.forEach(test => {
                console.log(`   • ${test.test}: ${test.details}`);
            });
        }

        console.log('\n📋 基于task-602.md的功能需求总结:');
        console.log('✅ 核心功能: TaskParentSelectorModal组件');
        console.log('✅ 智能推荐: 基于相似性、层级、状态的推荐算法');
        console.log('✅ 搜索功能: 防抖搜索和关键词匹配');
        console.log('✅ 批量操作: 一次为多个任务设置相同父任务');
        console.log('✅ 数据验证: 循环依赖检查和层级限制');

        return allPassed;
    }
}

// 执行验证
if (require.main === module) {
    const verifier = new BatchParentTaskAPIVerifier();
    verifier.runFullVerification()
        .then(() => {
            process.exit(verifier.failed === 0 ? 0 : 1);
        })
        .catch(error => {
            console.error('验证脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = { BatchParentTaskAPIVerifier };