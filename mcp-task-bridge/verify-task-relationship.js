import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function verifyTaskRelationship() {
  console.log('✅ 验证任务203和任务200的父子关系\n');

  try {
    // 1. 获取任务200和203的详细信息
    console.log('📋 1. 获取任务详细信息...');
    
    const task200 = await taskServer.findTaskById(200);
    const task203 = await taskServer.findTaskById(203);
    
    console.log(`\n📋 任务 200 (父任务):`);
    console.log(`   ID: ${task200.id}`);
    console.log(`   标题: ${task200.title}`);
    console.log(`   状态: ${task200.status}`);
    console.log(`   任务级别: ${task200.task_level}`);
    console.log(`   父任务ID: ${task200.parent_task_id || '无 (根任务)'}`);
    console.log(`   有子任务: ${task200.has_children ? '是' : '否'}`);
    console.log(`   子任务数量: ${task200.children_count || 0}`);
    
    console.log(`\n📋 任务 203 (子任务):`);
    console.log(`   ID: ${task203.id}`);
    console.log(`   标题: ${task203.title}`);
    console.log(`   状态: ${task203.status}`);
    console.log(`   任务级别: ${task203.task_level}`);
    console.log(`   父任务ID: ${task203.parent_id}`);
    console.log(`   有子任务: ${task203.has_children ? '是' : '否'}`);
    console.log(`   子任务数量: ${task203.children_count || 0}`);
    
    // 2. 验证父子关系
    console.log('\n🔍 2. 验证父子关系...');
    
    if (task203.parent_id === 200) {
      console.log('✅ 关系验证成功：任务203是任务200的子任务');
      
      // 检查层级关系
      if (task200.task_level === 1 && task203.task_level === 2) {
        console.log('✅ 层级关系正确：父任务(级别1) -> 子任务(级别2)');
      } else {
        console.log(`⚠️  层级关系异常：父任务级别${task200.task_level}, 子任务级别${task203.task_level}`);
      }
      
      // 3. 尝试获取任务200的子任务列表来确认
      console.log('\n📋 3. 获取任务200的子任务列表...');
      try {
        const childTasks = await taskServer.getTaskChildren(200);
        if (childTasks && childTasks.length > 0) {
          console.log(`✅ 任务200有${childTasks.length}个子任务：`);
          childTasks.forEach(child => {
            const isTarget = child.id === 203 ? ' ⭐' : '';
            console.log(`   - ID: ${child.id}, 标题: ${child.title}, 状态: ${child.status}${isTarget}`);
          });
          
          const hasTask203 = childTasks.some(child => child.id === 203);
          if (hasTask203) {
            console.log('\n🎉 确认：任务203出现在任务200的子任务列表中！');
          } else {
            console.log('\n❌ 异常：任务203未出现在任务200的子任务列表中');
          }
        } else {
          console.log('❌ 任务200似乎没有子任务，这可能表示关系未正确建立');
        }
      } catch (childError) {
        console.log(`⚠️  无法获取子任务列表: ${childError.message}`);
      }
      
    } else {
      console.log(`❌ 关系验证失败：任务203的父任务ID是 ${task203.parent_id}，不是200`);
    }
    
    console.log('\n📊 总结:');
    console.log(`   任务200 "${task200.title}" (ID: 200)`);
    console.log(`   └── 任务203 "${task203.title}" (ID: 203) ✅`);
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
  }
}

verifyTaskRelationship();