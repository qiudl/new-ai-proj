import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function searchWeek32Tasks() {
  const taskServer = new TaskMCPServer();
  try {
    console.log('🔍 正在查询项目1中的所有任务...');
    
    // 获取项目1的所有任务
    const response = await taskServer.listTasks(1);
    
    if (!response.success) {
      console.error('❌ 获取任务列表失败:', response.error);
      return;
    }
    
    const allTasks = response.tasks || [];
    console.log(`📊 项目1中共有 ${allTasks.length} 个任务`);
    
    // 首先查找32周相关的任务
    const week32Keywords = ['32周', '32', 'week32', 'week 32', '系统优化', '优化', 'optimization'];
    
    const week32Tasks = allTasks.filter(task => {
      const title = task.title.toLowerCase();
      const hasKeyword = week32Keywords.some(keyword => 
        title.includes(keyword.toLowerCase())
      );
      return hasKeyword;
    });
    
    console.log('\n🎯 查找32周相关任务:');
    if (week32Tasks.length > 0) {
      week32Tasks.forEach(task => {
        console.log(`📋 任务${task.id}: ${task.title}`);
        console.log(`   状态: ${task.status}, 创建时间: ${task.created_at}`);
        console.log(`   项目ID: ${task.project_id}`);
        console.log('');
      });
    } else {
      console.log('❌ 未找到32周相关的任务');
    }
    
    // 查找根任务（没有parent_id的任务）
    console.log('\n🌳 查找所有根任务（顶级任务）:');
    
    // 为了获取完整的任务信息包括parent_id，我们需要调用详细的API
    const detailedTasks = [];
    for (const task of allTasks.slice(0, 50)) { // 限制查询数量避免太多请求
      try {
        const detailedTask = await taskServer.findTaskById(task.id);
        detailedTasks.push(detailedTask);
      } catch (error) {
        console.log(`⚠️ 无法获取任务${task.id}的详细信息: ${error.message}`);
      }
    }
    
    const rootTasks = detailedTasks.filter(task => !task.parent_id);
    
    console.log(`📊 找到 ${rootTasks.length} 个根任务:`);
    rootTasks.forEach(task => {
      console.log(`📋 根任务${task.id}: ${task.title}`);
      console.log(`   状态: ${task.status}, 创建时间: ${task.created_at}`);
      if (task.description) {
        console.log(`   描述: ${task.description.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // 查找最近的周任务
    console.log('\n📅 查找最近的周任务:');
    const weekKeywords = ['周', 'week', '第', '本周', '上周', '下周'];
    const weekTasks = rootTasks.filter(task => {
      const title = task.title.toLowerCase();
      return weekKeywords.some(keyword => title.includes(keyword.toLowerCase()));
    });
    
    // 按创建时间排序，找最近的
    weekTasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log(`📊 找到 ${weekTasks.length} 个周相关的根任务:`);
    weekTasks.slice(0, 10).forEach((task, index) => {
      console.log(`📋 ${index + 1}. 任务${task.id}: ${task.title}`);
      console.log(`   状态: ${task.status}, 创建时间: ${task.created_at}`);
      if (task.description) {
        console.log(`   描述: ${task.description.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // 查找包含"优化"关键词的根任务
    console.log('\n🔧 查找系统优化相关的根任务:');
    const optimizationTasks = rootTasks.filter(task => {
      const title = task.title.toLowerCase();
      const desc = (task.description || '').toLowerCase();
      return title.includes('优化') || title.includes('optimization') || 
             desc.includes('优化') || desc.includes('optimization') ||
             title.includes('系统') || title.includes('system');
    });
    
    console.log(`📊 找到 ${optimizationTasks.length} 个优化相关的根任务:`);
    optimizationTasks.forEach(task => {
      console.log(`📋 任务${task.id}: ${task.title}`);
      console.log(`   状态: ${task.status}, 创建时间: ${task.created_at}`);
      if (task.description) {
        console.log(`   描述: ${task.description.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    // 总结推荐
    console.log('\n💡 推荐结果:');
    if (week32Tasks.length > 0) {
      const week32RootTasks = week32Tasks.filter(task => 
        detailedTasks.some(dt => dt.id === task.id && !dt.parent_id)
      );
      if (week32RootTasks.length > 0) {
        console.log('✅ 找到32周相关的根任务:');
        week32RootTasks.forEach(task => {
          console.log(`   📋 任务${task.id}: ${task.title} (状态: ${task.status})`);
        });
      } else {
        console.log('⚠️ 找到32周相关任务，但都不是根任务');
      }
    } else if (weekTasks.length > 0) {
      console.log('💡 建议使用最近的周任务作为根任务:');
      console.log(`   📋 任务${weekTasks[0].id}: ${weekTasks[0].title} (状态: ${weekTasks[0].status})`);
    } else if (optimizationTasks.length > 0) {
      console.log('💡 建议使用系统优化相关的根任务:');
      console.log(`   📋 任务${optimizationTasks[0].id}: ${optimizationTasks[0].title} (状态: ${optimizationTasks[0].status})`);
    } else {
      console.log('❌ 未找到合适的根任务，建议创建新的32周系统优化根任务');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

searchWeek32Tasks();