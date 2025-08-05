import { TaskMCPServer } from './task-mcp.js';

async function testSpecificDuplicateTitle() {
    const mcp = new TaskMCPServer();
    const testTitle = "重复标题防护测试任务";
    
    console.log('=== 测试指定重复标题防护功能 ===\n');
    console.log(`测试标题: "${testTitle}"`);
    
    try {
        // 1. 首先尝试创建这个标题的任务
        console.log('\n1. 尝试创建任务...');
        const createResult = await mcp.createTask(testTitle, 1);
        
        if (createResult.success) {
            console.log(`✅ 任务创建成功: ${createResult.message}`);
            console.log(`   任务ID: ${createResult.id}`);
            
            // 2. 再次尝试创建相同标题的任务
            console.log('\n2. 尝试创建重复标题的任务...');
            const duplicateResult = await mcp.createTask(testTitle, 1);
            
            if (!duplicateResult.success) {
                console.log('✅ 重复创建被正确阻止');
                console.log('错误信息:');
                console.log(JSON.stringify(duplicateResult, null, 2));
                
                // 分析错误信息的用户友好性
                console.log('\n3. 错误信息分析:');
                const errorMessage = duplicateResult.error;
                console.log(`完整错误信息: ${errorMessage}`);
                
                // 检查是否包含用户友好的元素
                const checks = {
                    '明确错误原因': errorMessage.includes('重复') || errorMessage.includes('已存在') || errorMessage.includes('duplicate'),
                    '包含已存在任务ID': /ID:\s*\d+/.test(errorMessage) || /任务ID[:\s]*\d+/.test(errorMessage),
                    '提供解决建议': errorMessage.includes('修改') || errorMessage.includes('重试') || errorMessage.includes('查看'),
                    '使用中文友好语言': errorMessage.includes('请') || errorMessage.includes('建议')
                };
                
                console.log('\n用户友好性检查:');
                Object.entries(checks).forEach(([key, value]) => {
                    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value ? '是' : '否'}`);
                });
                
                // 计算友好度评分
                const friendlyScore = Object.values(checks).filter(Boolean).length;
                const totalChecks = Object.keys(checks).length;
                console.log(`\n友好度评分: ${friendlyScore}/${totalChecks} (${Math.round(friendlyScore/totalChecks*100)}%)`);
                
                if (friendlyScore >= 3) {
                    console.log('🎉 错误信息用户友好性良好');
                } else {
                    console.log('⚠️  错误信息用户友好性需要改进');
                }
                
            } else {
                console.log('❌ 重复创建竟然成功了！防护机制可能有问题');
                console.log(`意外成功的任务ID: ${duplicateResult.id}`);
            }
            
        } else {
            // 如果第一次创建就失败，可能是因为任务已经存在
            console.log('⚠️  首次创建失败，可能任务已存在');
            console.log('错误信息:');
            console.log(JSON.stringify(createResult, null, 2));
            
            // 直接测试重复创建的错误信息
            console.log('\n分析错误信息的用户友好性...');
            const errorMessage = createResult.error;
            
            const checks = {
                '明确错误原因': errorMessage.includes('重复') || errorMessage.includes('已存在') || errorMessage.includes('duplicate'),
                '包含已存在任务ID': /ID:\s*\d+/.test(errorMessage) || /任务ID[:\s]*\d+/.test(errorMessage),
                '提供解决建议': errorMessage.includes('修改') || errorMessage.includes('重试') || errorMessage.includes('查看'),
                '使用中文友好语言': errorMessage.includes('请') || errorMessage.includes('建议')
            };
            
            console.log('\n用户友好性检查:');
            Object.entries(checks).forEach(([key, value]) => {
                console.log(`   ${value ? '✅' : '❌'} ${key}: ${value ? '是' : '否'}`);
            });
            
            const friendlyScore = Object.values(checks).filter(Boolean).length;
            const totalChecks = Object.keys(checks).length;
            console.log(`\n友好度评分: ${friendlyScore}/${totalChecks} (${Math.round(friendlyScore/totalChecks*100)}%)`);
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生未预期错误:', error.message);
    }
}

// 运行测试
testSpecificDuplicateTitle().catch(console.error);