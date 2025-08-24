import { TaskMCPServer } from './task-mcp.js';

async function executeTask() {
    const taskServer = new TaskMCPServer();
    
    console.log('🎯 开始执行您要求的任务流程...\n');
    
    // 步骤1: 找到任务31-02-04
    console.log('📋 步骤1: 查找任务31-02-04...');
    const findResult = await taskServer.findTaskByName('31-02-04');
    
    if (!findResult.success) {
        console.error('❌ 查找任务失败:', findResult.error);
        return;
    }
    
    const task = findResult.tasks[0];
    console.log(`✅ 找到任务: ID ${task.id} - "${task.title}"`);
    console.log(`   状态: ${task.status}`);
    console.log(`   创建时间: ${new Date(task.created_at).toLocaleString()}`);
    
    // 步骤2: 为任务73创建子任务
    console.log('\n🏗️ 步骤2: 为任务73创建测试子任务...');
    const createResult = await taskServer.createSubTask(
        task.id, 
        '测试子任务：API接口参数验证逻辑实现'
    );
    
    if (!createResult.success) {
        console.error('❌ 创建子任务失败:', createResult.error);
        return;
    }
    
    console.log(`✅ 子任务创建成功!`);
    console.log(`   任务ID: ${createResult.id}`);
    console.log(`   标题: "${createResult.title}"`);
    console.log(`   父任务ID: ${createResult.parent_id}`);
    console.log(`   状态: ${createResult.status}`);
    
    // 等待2秒
    console.log('\n⏳ 等待2秒后删除任务...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤3: 调用delete_task接口删除该子任务
    console.log('🗑️ 步骤3: 调用delete_task接口删除刚创建的子任务...');
    const deleteResult = await taskServer.deleteTask(createResult.id);
    
    if (!deleteResult.success) {
        console.error('❌ 删除任务失败:', deleteResult.error);
        return;
    }
    
    console.log(`✅ 任务删除成功!`);
    console.log(`   删除的任务ID: ${deleteResult.deleted_task_id}`);
    console.log(`   任务标题: "${deleteResult.title}"`);
    console.log(`   受影响的子任务: ${deleteResult.affected_subtasks.length} 个`);
    
    console.log('\n🎉 任务流程执行完成！');
    console.log('📊 执行总结:');
    console.log(`   ✓ 找到任务: ${task.id} - "${task.title}"`);
    console.log(`   ✓ 创建子任务: ${createResult.id} - "${createResult.title}"`);
    console.log(`   ✓ 删除子任务: ${deleteResult.deleted_task_id}`);
    console.log('   ✓ 验证了MCP系统的create_task和delete_task功能正常');
}

executeTask().catch(console.error);
