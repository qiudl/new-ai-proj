import { TaskMCPServer } from './task-mcp.js';

async function checkFinalStatus() {
    const mcp = new TaskMCPServer();
    
    console.log('=== 响应式布局优化项目最终状态检查 ===\n');
    
    // 检查关键任务的状态
    const keyTasks = [414, 415, 416, 417, 418]; // Phase 1-5 的任务ID
    
    for (const taskId of keyTasks) {
        try {
            const task = await mcp.findTaskById(taskId);
            const hasDoc = await mcp.hasTaskDocument(taskId);
            
            const statusIcon = task.status === 'completed' ? '✅' : 
                             task.status === 'in_progress' ? '🔄' : 
                             task.status === 'todo' ? '⏳' : '❓';
            
            console.log(`${statusIcon} 任务 ${taskId}: ${task.title}`);
            console.log(`   状态: ${task.status}`);
            console.log(`   文档: ${hasDoc.has_document ? '✅ 已创建' : '❌ 无文档'}`);
            console.log(`   更新时间: ${task.updated_at}`);
            console.log('');
        } catch (error) {
            console.log(`❌ 任务 ${taskId}: 无法获取信息 (${error.message})`);
        }
    }
    
    // 统计完成情况
    let completedCount = 0;
    let totalCount = keyTasks.length;
    
    for (const taskId of keyTasks) {
        try {
            const task = await mcp.findTaskById(taskId);
            if (task.status === 'completed') {
                completedCount++;
            }
        } catch (error) {
            // 忽略错误，继续统计
        }
    }
    
    console.log('=== 项目完成度统计 ===');
    console.log(`总任务数: ${totalCount}`);
    console.log(`已完成: ${completedCount}`);
    console.log(`完成率: ${Math.round(completedCount / totalCount * 100)}%`);
    
    if (completedCount === totalCount) {
        console.log('\n🎉 恭喜！响应式布局优化项目已100%完成！');
        console.log('✅ 所有Phase任务均已完成');
        console.log('✅ 项目达到交付标准');
        console.log('✅ 建议投入生产使用');
    } else {
        console.log(`\n⚠️  还有 ${totalCount - completedCount} 个任务需要完成`);
    }
}

checkFinalStatus().catch(console.error);