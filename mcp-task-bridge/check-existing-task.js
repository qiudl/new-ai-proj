import { TaskMCPServer } from './task-mcp.js';

async function checkExistingTask() {
    const mcp = new TaskMCPServer();
    const taskId = 459;
    
    console.log(`=== 查看已存在的任务 ID ${taskId} ===\n`);
    
    try {
        const task = await mcp.findTaskById(taskId);
        
        console.log('📋 任务详细信息:');
        console.log(`   ID: ${task.id}`);
        console.log(`   标题: ${task.title}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   项目ID: ${task.project_id}`);
        console.log(`   父任务ID: ${task.parent_id || '无'}`);
        console.log(`   创建时间: ${task.created_at}`);
        console.log(`   更新时间: ${task.updated_at || '无'}`);
        console.log(`   描述: ${task.description || '无描述'}`);
        console.log(`   优先级: ${task.custom_fields?.priority || '未设置'}`);
        
        // 检查是否有文档
        const hasDoc = await mcp.hasTaskDocument(taskId);
        if (hasDoc.success && hasDoc.has_document) {
            console.log('\n📄 任务文档:');
            const doc = await mcp.getTaskDocument(taskId);
            if (doc.success) {
                console.log(`   文档内容长度: ${doc.content.length} 字符`);
                console.log(`   文档更新时间: ${doc.updated_at || '未知'}`);
                if (doc.content.length > 0 && doc.content.length <= 200) {
                    console.log(`   文档内容预览: ${doc.content}`);
                } else if (doc.content.length > 200) {
                    console.log(`   文档内容预览: ${doc.content.substring(0, 200)}...`);
                }
            }
        } else {
            console.log('\n📄 任务文档: 无');
        }
        
        // 检查是否有子任务
        const children = await mcp.getTaskChildren(taskId);
        if (children.success && children.total > 0) {
            console.log(`\n🌳 子任务 (${children.total} 个):`);
            children.children.forEach(child => {
                console.log(`   - ID ${child.id}: ${child.title} [${child.status}]`);
            });
        } else {
            console.log('\n🌳 子任务: 无');
        }
        
    } catch (error) {
        console.error(`❌ 查看任务失败: ${error.message}`);
    }
}

checkExistingTask().catch(console.error);