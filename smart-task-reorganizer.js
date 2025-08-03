import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function smartTaskReorganizer() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🧠 智能任务层级重建系统');
    console.log('========================');
    
    // 获取项目1的所有任务
    console.log('1. 获取项目1的所有任务...');
    const tasksResult = await taskServer.listTasks(1);
    if (!tasksResult.success) {
      throw new Error('Failed to get tasks: ' + tasksResult.error);
    }
    
    const allTasks = tasksResult.tasks;
    console.log('   总任务数:', allTasks.length);
    
    // 找出所有根任务（parent_id为null的任务）
    const rootTasks = allTasks.filter(task => !task.parent_id);
    console.log('   根任务数:', rootTasks.length);
    
    // 找出以31周开头的根任务（这些是正确的父任务）
    const weekTasks = rootTasks.filter(task => task.title.startsWith('31周'));
    console.log('   31周任务数:', weekTasks.length);
    
    console.log('\n📋 31周父任务列表:');
    weekTasks.forEach(task => {
      console.log('     - ' + task.id + ': ' + task.title);
    });
    
    // 找出不以31周开头的根任务（这些需要重新分配）
    const orphanTasks = rootTasks.filter(task => !task.title.startsWith('31周'));
    console.log('\n   需要重新分配的根任务数:', orphanTasks.length);
    
    console.log('\n🔍 智能匹配分析:');
    console.log('=================');
    
    const reorganizationPlan = [];
    
    orphanTasks.forEach((task, index) => {
      console.log(`${index + 1}. ID:${task.id} - "${task.title}"`);
      
      // 智能匹配：根据标题关键词判断应该属于哪个31周任务
      let suggestedParent = null;
      let matchReason = '';
      
      if (task.title.includes('任务管理') || task.title.includes('编辑') || task.title.includes('表单') || task.title.includes('父任务') || task.title.includes('搜索') || task.title.includes('列表') || task.title.includes('ID') || task.title.includes('Bug')) {
        suggestedParent = weekTasks.find(wt => wt.title.includes('任务管理'));
        matchReason = '包含任务管理相关关键词';
      } else if (task.title.includes('文档') || task.title.includes('Markdown') || task.title.includes('统一') || task.title.includes('处理')) {
        suggestedParent = weekTasks.find(wt => wt.title.includes('文档') || wt.title.includes('处理'));
        matchReason = '包含文档处理相关关键词';
      } else if (task.title.includes('AI') || task.title.includes('智能') || task.title.includes('自动') || task.title.includes('生成')) {
        suggestedParent = weekTasks.find(wt => wt.title.includes('AI') || wt.title.includes('智能'));
        matchReason = '包含AI智能相关关键词';
      } else if (task.title.includes('系统') || task.title.includes('架构') || task.title.includes('重构') || task.title.includes('优化')) {
        suggestedParent = weekTasks.find(wt => wt.title.includes('系统') || wt.title.includes('架构') || wt.title.includes('优化'));
        matchReason = '包含系统架构相关关键词';
      } else if (task.title.includes('Timer') || task.title.includes('计时') || task.title.includes('时间')) {
        suggestedParent = weekTasks.find(wt => wt.title.includes('Timer') || wt.title.includes('计时'));
        matchReason = '包含计时器相关关键词';
      } else if (task.title.includes('Phase') || task.title.includes('阶段') || task.title.includes('问题') || task.title.includes('诊断')) {
        // Phase类任务通常是子任务，应该找它们的实际父任务
        const possibleParents = allTasks.filter(t => 
          task.title.includes(t.title.split(' ')[0]) || 
          t.title.includes(task.title.split(' ')[0])
        );
        if (possibleParents.length > 0) {
          suggestedParent = possibleParents[0];
          matchReason = '检测到Phase子任务，匹配到相关父任务';
        }
      }
      
      if (suggestedParent) {
        console.log(`   ✅ 推荐父任务: ${suggestedParent.id} - "${suggestedParent.title}"`);
        console.log(`   📝 匹配原因: ${matchReason}`);
        
        reorganizationPlan.push({
          taskId: task.id,
          taskTitle: task.title,
          parentId: suggestedParent.id,
          parentTitle: suggestedParent.title,
          reason: matchReason
        });
      } else {
        console.log('   ❓ 推荐父任务: 无明确匹配，需要人工判断');
        console.log('   📝 建议: 可能需要手动分析内容相关性');
      }
      console.log('');
    });
    
    console.log('📋 重新组织计划汇总:');
    console.log('====================');
    console.log(`发现 ${orphanTasks.length} 个需要重新分配的根任务`);
    console.log(`其中 ${reorganizationPlan.length} 个有明确的推荐父任务`);
    console.log(`需要人工判断的任务: ${orphanTasks.length - reorganizationPlan.length} 个`);
    
    if (reorganizationPlan.length > 0) {
      console.log('\n🎯 自动重新分配计划:');
      reorganizationPlan.forEach((plan, index) => {
        console.log(`${index + 1}. 任务${plan.taskId}("${plan.taskTitle}") → 父任务${plan.parentId}("${plan.parentTitle}")`);
      });
      
      console.log('\n❓ 是否执行自动重新分配？');
      console.log('提示：可以分步执行或全部执行');
    }
    
    // 暂时不执行，等待确认
    console.log('\n⏸️  分析完成，等待进一步指令...');
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

smartTaskReorganizer();