import { TaskMCPServer } from './task-mcp.js';
import axios from 'axios';

async function testDuplicateTitleProtection() {
    const mcp = new TaskMCPServer();
    
    console.log('=== 测试重复标题防护功能 ===\n');
    
    try {
        // 1. 查询项目1中现有的任务
        console.log('1. 查询项目1中的现有任务...');
        const response = await axios.get('http://localhost:8080/api/v1/projects/1/tasks', {
            headers: mcp.getHeaders(),
            proxy: false
        });
        
        const tasks = response.data.data?.data || [];
        console.log(`项目1共有 ${tasks.length} 个任务`);
        
        // 2. 查找是否已有相同标题的任务
        const duplicateTitle = '重复标题防护测试任务';
        const existingTask = tasks.find(task => task.title === duplicateTitle);
        
        if (existingTask) {
            console.log(`✅ 发现已存在相同标题的任务:`);
            console.log(`   - ID: ${existingTask.id}`);
            console.log(`   - 标题: ${existingTask.title}`);
            console.log(`   - 描述: ${existingTask.description}`);
            console.log(`   - 状态: ${existingTask.status}`);
            console.log(`   - 创建时间: ${existingTask.created_at}`);
        } else {
            console.log('❌ 未发现相同标题的现有任务');
        }
        
        // 3. 尝试创建重复标题的任务
        console.log('\n2. 尝试创建重复标题的任务...');
        console.log(`标题: "${duplicateTitle}"`);
        console.log('描述: "这是第二个用于测试重复标题防护功能的任务，应该被系统阻止创建"');
        
        const createResponse = await axios.post('http://localhost:8080/api/v1/projects/1/tasks', {
            title: duplicateTitle,
            description: '这是第二个用于测试重复标题防护功能的任务，应该被系统阻止创建',
            priority: 'medium',
            status: 'pending'
        }, {
            headers: mcp.getHeaders(),
            proxy: false
        });
        
        if (createResponse.data.success) {
            console.log('⚠️  创建成功！这可能表示重复防护机制未生效');
            console.log('新任务信息:');
            console.log(JSON.stringify(createResponse.data.data, null, 2));
            
            // 记录新任务ID以便后续清理
            const newTaskId = createResponse.data.data.id;
            console.log(`\n📝 新任务ID: ${newTaskId}`);
            
            return {
                success: true,
                duplicateProtectionWorking: false,
                taskId: newTaskId,
                message: '重复标题任务创建成功，防护机制可能未生效'
            };
        }
        
    } catch (error) {
        console.log('\n❌ 创建失败！');
        console.log('错误类型:', error.constructor.name);
        console.log('错误状态码:', error.response?.status);
        console.log('错误消息:', error.message);
        
        if (error.response?.data) {
            console.log('服务器响应:');
            console.log(JSON.stringify(error.response.data, null, 2));
        }
        
        // 分析错误是否因为重复标题引起
        const errorMessage = error.response?.data?.message || error.message;
        const isDuplicateError = errorMessage.includes('重复') || 
                                errorMessage.includes('duplicate') || 
                                errorMessage.includes('already exists') ||
                                errorMessage.includes('唯一') ||
                                errorMessage.includes('unique');
        
        return {
            success: false,
            duplicateProtectionWorking: isDuplicateError,
            error: errorMessage,
            message: isDuplicateError ? '重复标题防护机制正常工作' : '任务创建失败，但可能不是因为重复标题'
        };
    }
}

// 运行测试
testDuplicateTitleProtection()
    .then(result => {
        console.log('\n=== 测试结果总结 ===');
        console.log(`创建成功: ${result.success}`);
        console.log(`重复防护机制工作: ${result.duplicateProtectionWorking}`);
        console.log(`结果: ${result.message}`);
        
        if (result.taskId) {
            console.log(`新任务ID: ${result.taskId}`);
        }
        
        if (result.error) {
            console.log(`错误信息: ${result.error}`);
        }
        
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 测试执行失败:', error);
        process.exit(1);
    });