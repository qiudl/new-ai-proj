import { TaskMCPServer } from './task-mcp.js';

async function testFieldDuplicationFix() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🧪 重新测试字段双重存储修复效果');
    console.log('==================================');
    
    // 测试现有任务177的字段读取
    console.log('📋 测试现有任务177的字段读取...');
    const task177 = await taskServer.findTaskById(177);
    console.log('任务177当前状态:');
    console.log('  直接字段 priority:', JSON.stringify(task177.priority));
    console.log('  custom_fields.priority:', JSON.stringify(task177.custom_fields?.priority));
    
    // 测试优先级读取逻辑
    const getFieldValue = (field, task) => {
      const directValue = task[field];
      const customValue = task.custom_fields?.[field];
      
      if (directValue !== null && directValue !== undefined && directValue !== '') {
        return directValue;
      }
      return customValue;
    };
    
    const actualPriority = getFieldValue('priority', task177);
    console.log('  智能读取结果:', JSON.stringify(actualPriority));
    
    // 测试更新任务177的优先级
    console.log('\n📝 测试更新任务177的优先级为medium...');
    const updateResult = await taskServer.updateTask(177, {
      priority: 'medium'
    });
    
    if (updateResult.success) {
      console.log('✅ 优先级更新成功');
      console.log('   返回的优先级:', updateResult.updated_task.priority);
      console.log('   变更字段:', updateResult.changed_fields);
      
      // 重新获取任务验证
      const updatedTask = await taskServer.findTaskById(177);
      console.log('   更新后直接字段 priority:', JSON.stringify(updatedTask.priority));
      console.log('   更新后custom_fields.priority:', JSON.stringify(updatedTask.custom_fields?.priority));
      
      const finalPriority = getFieldValue('priority', updatedTask);
      console.log('   最终智能读取结果:', JSON.stringify(finalPriority));
      
      if (finalPriority === 'medium') {
        console.log('✅ 字段双重存储修复成功！');
      } else {
        console.log('❌ 字段读取逻辑仍有问题');
      }
    } else {
      console.log('❌ 优先级更新失败:', updateResult.error);
    }
    
    console.log('\n🎉 字段双重存储修复验证完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testFieldDuplicationFix();