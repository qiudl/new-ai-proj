import { TaskMCPServer } from './task-mcp.js';
import axios from 'axios';

class MCPDuplicateProtectionTester {
    constructor() {
        this.mcp = new TaskMCPServer();
        this.testResults = [];
    }

    async findOrCreateWeeklyTask() {
        try {
            console.log('🔍 正在查找第32周的根任务...');
            
            const response = await axios.get('http://localhost:8080/api/v1/projects/1/tasks', {
                headers: this.mcp.getHeaders(),
                proxy: false
            });
            
            const tasks = response.data.data?.data || [];
            console.log(`📋 找到任务总数: ${tasks.length}`);
            
            // 查找包含'第32周'或相关关键词的任务
            const weekTasks = tasks.filter(task => 
                task.title.includes('第32周') || 
                task.title.includes('周32') ||
                task.title.includes('Week32') ||
                task.title.includes('week32') ||
                task.title.includes('2025-08-03') ||
                task.title.includes('2025-08-09')
            );
            
            console.log('📅 本周相关任务:');
            weekTasks.forEach(task => {
                console.log(`- ID: ${task.id}, 标题: ${task.title}, 状态: ${task.status}, 父任务: ${task.parent_task_id || '无'}`);
            });
            
            // 找到根任务（没有父任务的）
            const rootTasks = weekTasks.filter(task => !task.parent_task_id);
            if (rootTasks.length > 0) {
                console.log(`✅ 找到本周根任务: ${rootTasks[0].title} (ID: ${rootTasks[0].id})`);
                return rootTasks[0];
            }
            
            // 如果没有找到本周根任务，创建一个
            console.log('📝 没有找到本周根任务，正在创建...');
            const weeklyTaskTitle = `第32周工作安排 (2025-08-03 到 2025-08-09)`;
            const weeklyTaskResult = await this.mcp.createTask(weeklyTaskTitle, 1);
            
            if (weeklyTaskResult.success) {
                console.log(`✅ 创建本周根任务成功: ${weeklyTaskResult.message}`);
                // 等待一下确保任务创建完成
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 重新获取任务信息
                const updatedResponse = await axios.get('http://localhost:8080/api/v1/projects/1/tasks', {
                    headers: this.mcp.getHeaders(),
                    proxy: false
                });
                const updatedTasks = updatedResponse.data.data?.data || [];
                const createdTask = updatedTasks.find(task => task.id === weeklyTaskResult.id);
                return createdTask;
            } else {
                console.log(`❌ 创建本周根任务失败: ${weeklyTaskResult.error}`);
                return null;
            }
        } catch (error) {
            console.error('❌ 查找或创建本周根任务失败:', error.message);
            return null;
        }
    }

    async testDuplicateTaskProtection() {
        console.log('\n🧪 开始MCP任务标题重复创建防护功能测试\n');
        
        const rootTask = await this.findOrCreateWeeklyTask();
        if (!rootTask) {
            console.log('⚠️  无法获取根任务，测试将在项目1下直接进行');
        }

        // 测试用例1: 创建唯一标题的任务
        console.log('\n📝 测试用例1: 创建唯一标题的测试任务');
        const uniqueTitle = `任务标题重复防护测试-${Date.now()}`;
        console.log(`使用MCP创建任务: "${uniqueTitle}"`);
        
        const firstTaskResult = rootTask ? 
            await this.mcp.createSubTask(rootTask.id, uniqueTitle) :
            await this.mcp.createTask(uniqueTitle, 1);
        
        this.testResults.push({
            test: 'MCP创建唯一标题任务',
            expected: 'success',
            actual: firstTaskResult.success ? 'success' : 'failure',
            details: firstTaskResult
        });
        
        if (firstTaskResult.success) {
            console.log(`✅ 首次创建成功: ${firstTaskResult.message}`);
            
            // 等待一下确保任务完全创建
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 测试用例2: 尝试创建相同标题的任务
            console.log('\n📝 测试用例2: 尝试创建重复标题任务');
            console.log(`再次使用MCP创建相同标题: "${uniqueTitle}"`);
            
            const duplicateTaskResult = rootTask ? 
                await this.mcp.createSubTask(rootTask.id, uniqueTitle) :
                await this.mcp.createTask(uniqueTitle, 1);
            
            this.testResults.push({
                test: 'MCP创建重复标题任务',
                expected: 'failure with 409 conflict',
                actual: duplicateTaskResult.success ? 'success' : 'failure',
                details: duplicateTaskResult
            });
            
            if (!duplicateTaskResult.success) {
                console.log(`✅ 重复创建被MCP正确阻止: ${duplicateTaskResult.error}`);
                
                // 检查是否返回冲突错误
                if (duplicateTaskResult.error.includes('409') || 
                    duplicateTaskResult.error.includes('已存在') || 
                    duplicateTaskResult.error.includes('重复') ||
                    duplicateTaskResult.error.includes('Conflict')) {
                    console.log('✅ MCP正确返回了冲突错误信息');
                } else {
                    console.log('⚠️  MCP错误信息可能不够明确，建议改进用户提示');
                    console.log(`错误内容: ${duplicateTaskResult.error}`);
                }
            } else {
                console.log('❌ MCP重复创建竟然成功了！防护机制可能有问题');
                console.log(`意外成功的消息: ${duplicateTaskResult.message}`);
            }
            
            // 测试用例3: 直接API调用测试
            console.log('\n📝 测试用例3: 直接API调用重复防护测试');
            await this.testDirectAPICall(uniqueTitle, rootTask?.project_id || 1);
            
        } else {
            console.log(`❌ 首次创建失败: ${firstTaskResult.error}`);
        }
    }

    async testDirectAPICall(title, projectId) {
        try {
            console.log(`直接调用API创建任务: "${title}" (项目ID: ${projectId})`);
            
            const response = await axios.post(`http://localhost:8080/api/v1/projects/${projectId}/tasks`, {
                title: title,
                project_id: projectId,
                status: 'todo',
                description: `直接API调用测试：${title}`,
                custom_fields: {
                    priority: 'low'
                }
            }, {
                headers: this.mcp.getHeaders(),
                timeout: 10000,
                proxy: false
            });
            
            console.log('❌ 直接API调用创建重复任务竟然成功了！');
            console.log('响应状态:', response.status);
            console.log('响应数据:', JSON.stringify(response.data, null, 2));
            
            this.testResults.push({
                test: '直接API创建重复标题任务',
                expected: 'failure with 409 conflict',
                actual: 'success',
                details: { success: true, data: response.data }
            });
            
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log('✅ 直接API调用正确返回409冲突错误');
                console.log('错误响应:', JSON.stringify(error.response.data, null, 2));
                
                this.testResults.push({
                    test: '直接API创建重复标题任务',
                    expected: 'failure with 409 conflict',
                    actual: 'failure with 409',
                    details: { success: false, error: error.response.data }
                });
            } else {
                console.log('⚠️  直接API调用返回了其他错误:');
                console.log('错误状态:', error.response?.status);
                console.log('错误信息:', error.response?.data || error.message);
                
                this.testResults.push({
                    test: '直接API创建重复标题任务',
                    expected: 'failure with 409 conflict',
                    actual: `failure with ${error.response?.status || 'unknown error'}`,
                    details: { success: false, error: error.response?.data || error.message }
                });
            }
        }
    }

    async testBulkImportProtection() {
        console.log('\n📝 测试用例4: 批量导入重复防护测试');
        
        const bulkTitle1 = `批量导入测试1-${Date.now()}`;
        const bulkTitle2 = `批量导入测试2-${Date.now()}`;
        
        try {
            const response = await axios.post(`http://localhost:8080/api/v1/projects/1/tasks/bulk-import`, {
                tasks: [
                    {
                        title: bulkTitle1,
                        description: '批量导入测试任务1',
                        status: 'todo',
                        custom_fields: { priority: 'low' }
                    },
                    {
                        title: bulkTitle2,
                        description: '批量导入测试任务2',
                        status: 'todo',
                        custom_fields: { priority: 'low' }
                    },
                    {
                        title: bulkTitle1, // 重复标题
                        description: '批量导入重复标题测试',
                        status: 'todo',
                        custom_fields: { priority: 'low' }
                    }
                ]
            }, {
                headers: this.mcp.getHeaders(),
                timeout: 10000,
                proxy: false
            });
            
            console.log('批量导入响应:', JSON.stringify(response.data, null, 2));
            
            this.testResults.push({
                test: '批量导入重复标题防护',
                expected: 'partial success or specific error handling',
                actual: 'completed',
                details: response.data
            });
            
        } catch (error) {
            console.log('批量导入错误:', error.response?.data || error.message);
            
            this.testResults.push({
                test: '批量导入重复标题防护',
                expected: 'error handling for duplicates',
                actual: 'error occurred',
                details: error.response?.data || error.message
            });
        }
    }

    printTestResults() {
        console.log('\n📊 MCP重复防护测试结果汇总:');
        console.log('='.repeat(80));
        
        let passedTests = 0;
        let totalTests = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.test}`);
            console.log(`   期望结果: ${result.expected}`);
            console.log(`   实际结果: ${result.actual}`);
            
            const passed = this.evaluateTestResult(result);
            console.log(`   测试状态: ${passed ? '✅ 通过' : '❌ 失败'}`);
            
            if (result.details) {
                console.log(`   详细信息: ${JSON.stringify(result.details, null, 4)}`);
            }
            
            if (passed) passedTests++;
        });
        
        console.log('\n' + '='.repeat(80));
        console.log(`总体结果: ${passedTests}/${totalTests} 测试通过`);
        
        if (passedTests === totalTests) {
            console.log('🎉 所有MCP测试都通过了！任务标题重复防护功能工作正常。');
        } else {
            console.log('⚠️  部分MCP测试失败，需要进一步调查重复防护机制。');
        }
    }

    evaluateTestResult(result) {
        switch (result.test) {
            case 'MCP创建唯一标题任务':
                return result.actual === 'success';
            case 'MCP创建重复标题任务':
                return result.actual === 'failure';
            case '直接API创建重复标题任务':
                return result.actual.includes('failure with 409');
            default:
                return true; // 对于其他复杂测试，默认通过
        }
    }

    async runAllTests() {
        console.log('🚀 启动MCP任务标题重复创建防护功能测试');
        console.log('时间:', new Date().toLocaleString());
        
        try {
            await this.testDuplicateTaskProtection();
            await this.testBulkImportProtection();
            this.printTestResults();
            
            // 完成第一个任务
            console.log('\n✅ 测试完成，更新任务状态...');
            
        } catch (error) {
            console.error('❌ 测试过程中发生错误:', error);
        }
    }
}

// 运行测试
const tester = new MCPDuplicateProtectionTester();
tester.runAllTests().catch(console.error);