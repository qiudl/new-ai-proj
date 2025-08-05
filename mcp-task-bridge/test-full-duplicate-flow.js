import { TaskMCPServer } from './task-mcp.js';

async function testFullDuplicateFlow() {
    const mcp = new TaskMCPServer();
    const testTitle = `重复标题防护测试任务-${Date.now()}`;
    
    console.log('=== 完整重复标题防护测试流程 ===\n');
    console.log(`测试标题: "${testTitle}"`);
    
    try {
        // 1. 首次创建任务
        console.log('\n步骤1: 首次创建任务...');
        const firstCreateResult = await mcp.createTask(testTitle, 1);
        
        if (firstCreateResult.success) {
            console.log(`✅ 首次创建成功: ${firstCreateResult.message}`);
            console.log(`   任务ID: ${firstCreateResult.id}`);
            
            // 2. 尝试创建重复标题的任务
            console.log('\n步骤2: 尝试创建重复标题的任务...');
            const duplicateResult = await mcp.createTask(testTitle, 1);
            
            if (!duplicateResult.success) {
                console.log('✅ 重复创建被正确阻止');
                console.log('\n📋 错误信息详情:');
                console.log(`   完整错误信息: ${duplicateResult.error}`);
                
                // 分析错误信息的用户友好性
                console.log('\n🔍 用户友好性分析:');
                const errorMessage = duplicateResult.error;
                
                const checks = {
                    '明确错误原因说明': errorMessage.includes('重复') || errorMessage.includes('已存在') || errorMessage.includes('duplicate'),
                    '包含已存在任务的ID': /任务ID[:\s]*\d+/.test(errorMessage) || /ID[:\s]*\d+/.test(errorMessage),
                    '提供具体解决建议': errorMessage.includes('修改') && (errorMessage.includes('重试') || errorMessage.includes('查看')),
                    '使用用户友好的中文': errorMessage.includes('请') || errorMessage.includes('建议') || errorMessage.includes('可以')
                };
                
                console.log('\n✓ 检查项目:');
                Object.entries(checks).forEach(([key, value]) => {
                    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value ? '是' : '否'}`);
                });
                
                // 计算友好度评分
                const passedChecks = Object.values(checks).filter(Boolean).length;
                const totalChecks = Object.keys(checks).length;
                const score = Math.round(passedChecks / totalChecks * 100);
                
                console.log(`\n📊 用户体验评分: ${passedChecks}/${totalChecks} (${score}%)`);
                
                // 评估等级
                let rating;
                if (score >= 90) {
                    rating = '🌟 优秀 - 错误信息非常用户友好';
                } else if (score >= 70) {
                    rating = '👍 良好 - 错误信息基本用户友好';
                } else if (score >= 50) {
                    rating = '⚠️  一般 - 错误信息需要改进';
                } else {
                    rating = '❌ 较差 - 错误信息不够用户友好';
                }
                
                console.log(`\n🎯 评估结果: ${rating}`);
                
                // 提取具体信息
                const taskIdMatch = errorMessage.match(/任务ID[:\s]*(\d+)/);
                if (taskIdMatch) {
                    console.log(`\n📌 已存在任务ID: ${taskIdMatch[1]}`);
                }
                
                // 3. 验证建议的可行性
                console.log('\n步骤3: 验证解决建议的可行性...');
                
                if (taskIdMatch) {
                    const existingTaskId = parseInt(taskIdMatch[1]);
                    console.log(`正在查询已存在的任务 ID ${existingTaskId}...`);
                    
                    try {
                        const existingTask = await mcp.findTaskById(existingTaskId);
                        console.log('✅ 用户可以查看已存在的任务:');
                        console.log(`   - 标题: ${existingTask.title}`);
                        console.log(`   - 状态: ${existingTask.status}`);
                        console.log(`   - 创建时间: ${existingTask.created_at}`);
                        console.log(`   - 描述: ${existingTask.description || '无描述'}`);
                    } catch (findError) {
                        console.log('❌ 用户无法查看已存在的任务，这降低了错误信息的实用性');
                    }
                }
                
                // 4. 测试修改标题后重试
                const modifiedTitle = testTitle + '-修正版';
                console.log(`\n步骤4: 测试修改标题后重试...`);
                console.log(`新标题: "${modifiedTitle}"`);
                
                const retryResult = await mcp.createTask(modifiedTitle, 1);
                if (retryResult.success) {
                    console.log('✅ 修改标题后重试成功，建议有效');
                    console.log(`   新任务ID: ${retryResult.id}`);
                } else {
                    console.log('❌ 修改标题后重试仍然失败');
                    console.log(`   失败原因: ${retryResult.error}`);
                }
                
            } else {
                console.log('❌ 重复创建竟然成功了！防护机制可能有问题');
                console.log(`意外成功的任务ID: ${duplicateResult.id}`);
            }
            
        } else {
            console.log('❌ 首次创建失败');
            console.log(`失败原因: ${firstCreateResult.error}`);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生未预期错误:', error.message);
    }
    
    console.log('\n=== 测试完成 ===');
}

// 运行测试
testFullDuplicateFlow().catch(console.error);