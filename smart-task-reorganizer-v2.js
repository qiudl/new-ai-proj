import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function smartTaskReorganizerV2() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🧠 智能任务层级重建系统 V2');
    console.log('============================');
    
    // 获取项目1的所有任务
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
      console.log(`     - ${task.id}: ${task.title}`);
    });
    
    // 找出不以31周开头的根任务（这些需要重新分配）
    const orphanTasks = rootTasks.filter(task => !task.title.startsWith('31周'));
    console.log(`\n   需要重新分配的根任务数: ${orphanTasks.length}`);
    
    console.log('\n🔍 智能匹配分析 V2 (更精确):');
    console.log('============================');
    
    const reorganizationPlan = [];
    
    for (const task of orphanTasks) {
      console.log(`\n📋 分析任务: ID:${task.id} - "${task.title}"`);
      
      let suggestedParent = null;
      let matchReason = '';
      let confidence = 0; // 匹配置信度 (0-100)
      
      // 先检查是否是Phase子任务，需要找到真正的父任务
      if (task.title.startsWith('Phase') && task.title.includes(':')) {
        console.log('   📌 检测到Phase子任务，寻找真正的父任务...');
        
        // 通过描述或相关任务找父任务
        const taskDetail = await taskServer.findTaskById(task.id);
        
        // 检查描述中是否提到父任务编号
        if (taskDetail.description && taskDetail.description.includes('父任务')) {
          const parentMatch = taskDetail.description.match(/父任务.*?[#:]\s*(\d+)/);
          if (parentMatch) {
            const parentTaskId = parseInt(parentMatch[1]);
            const parentTask = allTasks.find(t => t.id === parentTaskId);
            if (parentTask) {
              suggestedParent = parentTask;
              matchReason = `描述中明确指出父任务#${parentTaskId}`;
              confidence = 95;
            }
          }
        }
        
        // 如果没找到明确的父任务编号，根据Phase内容判断
        if (!suggestedParent) {
          if (task.title.includes('任务编辑') || task.title.includes('父任务选择') || task.title.includes('自定义字段')) {
            suggestedParent = weekTasks.find(wt => wt.title.includes('任务管理'));
            matchReason = 'Phase内容与任务管理相关';
            confidence = 80;
          } else if (task.title.includes('文档') || task.title.includes('优化')) {
            suggestedParent = weekTasks.find(wt => wt.title.includes('文档管理'));
            matchReason = 'Phase内容与文档管理相关';
            confidence = 80;
          } else if (task.title.includes('测试') || task.title.includes('部署')) {
            // 测试部署任务可能属于多个项目，需要更仔细分析
            suggestedParent = weekTasks.find(wt => wt.title.includes('报告报表'));
            matchReason = 'Phase内容与系统优化相关';
            confidence = 60;
          }
        }
      } else {
        // 非Phase任务的常规匹配
        if (task.title.includes('任务管理') || task.title.includes('编辑') || task.title.includes('Bug') || 
            task.title.includes('搜索') || task.title.includes('列表') || task.title.includes('父任务')) {
          suggestedParent = weekTasks.find(wt => wt.title.includes('任务管理'));
          matchReason = '包含任务管理相关关键词';
          confidence = 90;
        } else if (task.title.includes('文档') || task.title.includes('Markdown') || task.title.includes('统一处理')) {
          suggestedParent = weekTasks.find(wt => wt.title.includes('文档管理'));
          matchReason = '包含文档管理相关关键词';
          confidence = 90;
        } else if (task.title.includes('AI') || task.title.includes('智能') || task.title.includes('claude')) {
          suggestedParent = weekTasks.find(wt => wt.title.includes('claude-mcp'));
          matchReason = '包含AI/Claude相关关键词';
          confidence = 85;
        } else if (task.title.includes('Timer') || task.title.includes('计时') || task.title.includes('定时器')) {
          suggestedParent = weekTasks.find(wt => wt.title.includes('定时器'));
          matchReason = '包含定时器相关关键词';
          confidence = 95;
        } else if (task.title.includes('报告') || task.title.includes('报表') || task.title.includes('优化')) {
          suggestedParent = weekTasks.find(wt => wt.title.includes('报告报表'));
          matchReason = '包含报告报表相关关键词';
          confidence = 85;
        }
      }
      
      if (suggestedParent) {
        console.log(`   ✅ 推荐父任务: ${suggestedParent.id} - "${suggestedParent.title}"`);
        console.log(`   📝 匹配原因: ${matchReason}`);
        console.log(`   🎯 置信度: ${confidence}%`);
        
        reorganizationPlan.push({
          taskId: task.id,
          taskTitle: task.title,
          parentId: suggestedParent.id,
          parentTitle: suggestedParent.title,
          reason: matchReason,
          confidence: confidence
        });
      } else {
        console.log('   ❓ 推荐父任务: 无明确匹配，需要人工判断');
        console.log('   📝 建议: 检查任务描述或手动分析');
      }
    }
    
    console.log('\n📊 重新组织计划汇总:');
    console.log('====================');
    console.log(`发现 ${orphanTasks.length} 个需要重新分配的根任务`);
    console.log(`其中 ${reorganizationPlan.length} 个有明确的推荐父任务`);
    console.log(`需要人工判断的任务: ${orphanTasks.length - reorganizationPlan.length} 个`);
    
    // 按置信度排序
    reorganizationPlan.sort((a, b) => b.confidence - a.confidence);
    
    if (reorganizationPlan.length > 0) {
      console.log('\n🎯 自动重新分配计划 (按置信度排序):');
      reorganizationPlan.forEach((plan, index) => {
        console.log(`${index + 1}. [${plan.confidence}%] 任务${plan.taskId}("${plan.taskTitle}")`);
        console.log(`   → 父任务${plan.parentId}("${plan.parentTitle}")`);
        console.log(`   理由: ${plan.reason}\n`);
      });
      
      console.log('🚀 准备执行重新分配...');
      
      // 执行重新分配
      let successCount = 0;
      let failureCount = 0;
      
      for (const plan of reorganizationPlan) {
        console.log(`\n🔄 处理任务${plan.taskId}: "${plan.taskTitle}"`);
        
        const updateResult = await taskServer.updateTask(plan.taskId, {
          parent_id: plan.parentId
        });
        
        if (updateResult.success) {
          console.log(`   ✅ 成功移动到父任务${plan.parentId}`);
          successCount++;
        } else {
          console.log(`   ❌ 移动失败: ${updateResult.error}`);
          failureCount++;
        }
      }
      
      console.log('\n🎉 重新组织完成!');
      console.log('================');
      console.log(`✅ 成功移动: ${successCount} 个任务`);
      console.log(`❌ 移动失败: ${failureCount} 个任务`);
      console.log(`📊 成功率: ${Math.round(successCount / (successCount + failureCount) * 100)}%`);
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

smartTaskReorganizerV2();