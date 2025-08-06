import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function analyzeTask397AndWeek32() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🎯 正在分析32周系统Bug修复与优化任务...\n');
    
    // 1. 首先尝试查找任务ID 397
    let task397 = null;
    try {
      task397 = await taskServer.findTaskById(397);
      console.log('✅ 找到任务ID 397:');
      console.log(`📋 标题: ${task397.title}`);
      console.log(`📊 状态: ${task397.status}`);
      console.log(`🕒 创建时间: ${task397.created_at}`);
      console.log(`📂 项目ID: ${task397.project_id}`);
      console.log(`👤 父任务ID: ${task397.parent_id || '无(根任务)'}`);
      if (task397.description) {
        console.log(`📝 描述: ${task397.description.substring(0, 200)}...`);
      }
      console.log('');
      
      // 2. 获取任务397的所有子任务
      const childrenResult = await taskServer.getTaskChildren(397);
      if (childrenResult.success && childrenResult.children.length > 0) {
        console.log(`🌳 任务397的子任务列表 (共 ${childrenResult.children.length} 个):`);
        childrenResult.children.forEach((child, index) => {
          console.log(`  ${index + 1}. 任务${child.id}: ${child.title}`);
          console.log(`     状态: ${child.status} | 优先级: ${child.priority} | 创建: ${child.created_at}`);
        });
        console.log('');
        
        // 3. 分析子任务状态
        const statusCounts = {};
        childrenResult.children.forEach(child => {
          statusCounts[child.status] = (statusCounts[child.status] || 0) + 1;
        });
        
        console.log('📊 子任务状态分析:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          const percentage = Math.round((count / childrenResult.children.length) * 100);
          console.log(`   ${status}: ${count}个 (${percentage}%)`);
        });
        console.log('');
        
        // 4. 找出未完成的子任务
        const incompleteTasks = childrenResult.children.filter(child => 
          !['completed'].includes(child.status)
        );
        
        if (incompleteTasks.length > 0) {
          console.log(`⚠️ 未完成的子任务 (${incompleteTasks.length}个):`);
          incompleteTasks.forEach((task, index) => {
            console.log(`  ${index + 1}. 任务${task.id}: ${task.title} (${task.status})`);
          });
          console.log('');
        } else {
          console.log('✅ 所有子任务都已完成！\n');
        }
        
        // 5. 分析每个子任务的详细信息和其子任务
        console.log('🔍 详细分析每个子任务:');
        for (let i = 0; i < childrenResult.children.length; i++) {
          const child = childrenResult.children[i];
          console.log(`\n📋 子任务${child.id}: ${child.title}`);
          
          // 获取子任务的详细信息
          try {
            const childDetail = await taskServer.findTaskById(child.id);
            console.log(`   状态: ${childDetail.status}`);
            console.log(`   优先级: ${childDetail.custom_fields?.priority || '未设置'}`);
            if (childDetail.description) {
              console.log(`   描述: ${childDetail.description.substring(0, 150)}...`);
            }
            
            // 检查这个子任务是否还有自己的子任务
            const grandChildrenResult = await taskServer.getTaskChildren(child.id);
            if (grandChildrenResult.success && grandChildrenResult.children.length > 0) {
              console.log(`   🌳 子任务的子任务 (${grandChildrenResult.children.length}个):`);
              grandChildrenResult.children.forEach((grandChild, gIndex) => {
                console.log(`     ${gIndex + 1}. 任务${grandChild.id}: ${grandChild.title} (${grandChild.status})`);
              });
            }
          } catch (error) {
            console.log(`   ⚠️ 无法获取详细信息: ${error.message}`);
          }
        }
        
      } else {
        console.log('ℹ️ 任务397暂无子任务');
      }
      
    } catch (error) {
      console.log('❌ 任务ID 397不存在，开始搜索32周相关任务...\n');
    }
    
    // 6. 搜索所有32周相关的任务
    console.log('\n🔍 搜索32周相关的所有任务:');
    const listResult = await taskServer.listTasks(1);
    if (!listResult.success) {
      console.error('❌ 获取任务列表失败:', listResult.error);
      return;
    }
    
    const allTasks = listResult.tasks;
    console.log(`📊 项目1中共有 ${allTasks.length} 个任务`);
    
    // 搜索32周相关关键词
    const week32Keywords = ['32周', '32', 'week32', 'week 32', '系统优化', '优化', 'Bug修复', 'bug修复', 'system', 'optimization'];
    
    const week32Tasks = allTasks.filter(task => {
      const title = task.title.toLowerCase();
      return week32Keywords.some(keyword => 
        title.includes(keyword.toLowerCase())
      );
    });
    
    console.log(`\n🎯 找到 ${week32Tasks.length} 个32周相关任务:`);
    if (week32Tasks.length > 0) {
      for (let i = 0; i < week32Tasks.length; i++) {
        const task = week32Tasks[i];
        console.log(`\n📋 ${i + 1}. 任务${task.id}: ${task.title}`);
        console.log(`   状态: ${task.status} | 创建时间: ${task.created_at}`);
        
        // 获取详细信息以检查是否为根任务
        try {
          const taskDetail = await taskServer.findTaskById(task.id);
          console.log(`   父任务ID: ${taskDetail.parent_id || '无(根任务)'}`);
          console.log(`   优先级: ${taskDetail.custom_fields?.priority || '未设置'}`);
          
          if (taskDetail.description) {
            console.log(`   描述: ${taskDetail.description.substring(0, 100)}...`);
          }
          
          // 如果是根任务，检查其子任务
          if (!taskDetail.parent_id) {
            const childrenResult = await taskServer.getTaskChildren(task.id);
            if (childrenResult.success && childrenResult.children.length > 0) {
              console.log(`   🌳 子任务数量: ${childrenResult.children.length}个`);
              console.log('   子任务列表:');
              childrenResult.children.forEach((child, cIndex) => {
                console.log(`     ${cIndex + 1}. 任务${child.id}: ${child.title} (${child.status})`);
              });
            }
          }
        } catch (error) {
          console.log(`   ⚠️ 无法获取详细信息: ${error.message}`);
        }
      }
    } else {
      console.log('❌ 未找到32周相关任务');
    }
    
    // 7. 推荐分析
    console.log('\n💡 分析结论和建议:');
    
    if (task397) {
      console.log('✅ 任务397存在且符合32周系统优化任务');
      
      const childrenResult = await taskServer.getTaskChildren(397);
      if (childrenResult.success) {
        const incompleteTasks = childrenResult.children.filter(child => 
          !['completed'].includes(child.status)
        );
        
        if (incompleteTasks.length > 0) {
          console.log(`⚠️ 还有 ${incompleteTasks.length} 个子任务未完成，建议优先处理这些任务`);
        } else {
          console.log('✅ 所有子任务都已完成，可以考虑创建新的32周系统优化子任务');
        }
      }
    } else if (week32Tasks.length > 0) {
      console.log('💡 找到了32周相关任务，但不是ID 397');
      const rootTasks = week32Tasks.filter(task => !task.parent_id);
      if (rootTasks.length > 0) {
        console.log(`建议使用任务${rootTasks[0].id}作为32周系统优化的根任务`);
      }
    } else {
      console.log('❌ 没有找到32周相关的任务');
      console.log('建议创建一个新的"32周：系统Bug修复与优化"根任务');
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

// 运行分析
analyzeTask397AndWeek32();