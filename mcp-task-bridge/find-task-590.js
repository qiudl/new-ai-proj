import { TaskMCPServer } from './task-mcp.js';

async function findTask590() {
    const taskServer = new TaskMCPServer();
    
    try {
        console.log('🔍 查找任务 ID 590...\n');
        
        // 直接使用findTaskById方法查找任务590
        const task = await taskServer.findTaskById(590);
        
        console.log('✅ 找到任务 #590:');
        console.log('════════════════════════════════════════════════════');
        console.log(`📋 任务ID: ${task.id}`);
        console.log(`🎯 标题: ${task.title}`);
        console.log(`📝 描述: ${task.description || '无描述'}`);
        console.log(`📊 状态: ${task.status}`);
        console.log(`🏷️ 优先级: ${task.custom_fields?.priority || '未设置'}`);
        console.log(`📁 项目ID: ${task.project_id}`);
        console.log(`👤 创建者ID: ${task.created_by || '未知'}`);
        console.log(`📅 创建时间: ${task.created_at}`);
        console.log(`🔄 更新时间: ${task.updated_at || '未更新'}`);
        console.log(`⏰ 截止日期: ${task.due_date || '未设置'}`);
        console.log(`👥 分配给: ${task.assignee_id || '未分配'}`);
        
        // 检查父任务
        if (task.parent_id) {
            console.log(`⬆️ 父任务ID: ${task.parent_id}`);
            try {
                const parentTask = await taskServer.findTaskById(task.parent_id);
                console.log(`   父任务标题: "${parentTask.title}"`);
            } catch (parentError) {
                console.log(`   父任务标题: 获取失败 (${parentError.message})`);
            }
        } else {
            console.log(`⬆️ 父任务ID: 无 (根任务)`);
        }
        
        // 检查子任务
        const childrenResult = await taskServer.getTaskChildren(590);
        if (childrenResult.success && childrenResult.total > 0) {
            console.log(`⬇️ 子任务数量: ${childrenResult.total}`);
            console.log(`   子任务列表:`);
            childrenResult.children.forEach(child => {
                console.log(`   - #${child.id}: ${child.title} [${child.status}]`);
            });
        } else {
            console.log(`⬇️ 子任务数量: 0`);
        }
        
        // 检查自定义字段
        if (task.custom_fields) {
            console.log(`🏷️ 自定义字段:`);
            Object.entries(task.custom_fields).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        }
        
        // 检查是否有文档
        const documentResult = await taskServer.hasTaskDocument(590);
        if (documentResult.success) {
            console.log(`📄 文档状态: ${documentResult.has_document ? '有文档' : '无文档'}`);
        }
        
        console.log('════════════════════════════════════════════════════\n');
        
        return task;
        
    } catch (error) {
        console.error('❌ 查找任务失败:', error.message);
        console.log('\n🔍 尝试在所有项目中搜索任务 590...');
        
        // 如果直接查找失败，尝试列出所有任务寻找590
        try {
            const projectsResult = await taskServer.listProjects();
            if (projectsResult.success) {
                console.log(`📁 在 ${projectsResult.total} 个项目中搜索...`);
                
                for (const project of projectsResult.projects) {
                    console.log(`   检查项目 ${project.id}: ${project.name}`);
                    
                    try {
                        const tasksResult = await taskServer.listTasks(project.id);
                        if (tasksResult.success) {
                            const task590 = tasksResult.tasks.find(t => t.id === 590);
                            if (task590) {
                                console.log(`✅ 在项目 ${project.id} 中找到任务 590!`);
                                console.log(`   标题: ${task590.title}`);
                                console.log(`   状态: ${task590.status}`);
                                return task590;
                            }
                        }
                    } catch (projectError) {
                        console.log(`   项目 ${project.id} 检查失败: ${projectError.message}`);
                    }
                }
            }
            
            console.log('❌ 在所有项目中都未找到任务 #590');
            
        } catch (searchError) {
            console.error('❌ 项目搜索失败:', searchError.message);
        }
        
        return null;
    }
}

// 运行查找
findTask590().then(task => {
    if (task) {
        console.log(`\n🎯 任务 #590 完整信息已获取`);
    } else {
        console.log(`\n❌ 任务 #590 不存在或无法访问`);
    }
}).catch(error => {
    console.error('脚本执行失败:', error.message);
});