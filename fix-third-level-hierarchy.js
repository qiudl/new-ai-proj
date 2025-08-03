import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function fixThirdLevelHierarchy() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔧 修复第三级任务层级关系');
    console.log('===========================');
    
    // Step 1: 分析128任务下的所有子任务
    console.log('1. 分析任务128下的层级结构...');
    const tasksResult = await taskServer.listTasks(1);
    if (!tasksResult.success) {
      throw new Error('Failed to get tasks: ' + tasksResult.error);
    }
    
    const allTasks = tasksResult.tasks;
    
    // 获取128任务下的所有直接子任务
    const childrenOf128 = allTasks.filter(task => task.parent_id === 128);
    console.log(`   任务128下共有 ${childrenOf128.length} 个直接子任务`);
    
    // 分类：Phase任务（应该是第三级）vs 正常的第二级任务
    const phaseTasks = childrenOf128.filter(task => 
      task.title.startsWith('Phase') || 
      task.title.includes('Phase')
    );
    
    const normalSecondLevelTasks = childrenOf128.filter(task => 
      !task.title.startsWith('Phase') && 
      !task.title.includes('Phase')
    );
    
    console.log('\n📊 任务分类结果:');
    console.log('================');
    console.log(`🔗 正常的第二级任务: ${normalSecondLevelTasks.length} 个`);
    normalSecondLevelTasks.forEach(task => {
      console.log(`     - ${task.id}: ${task.title}`);
    });
    
    console.log(`\n❗ 错误放置的Phase任务: ${phaseTasks.length} 个`);
    phaseTasks.forEach(task => {
      console.log(`     - ${task.id}: ${task.title}`);
    });
    
    if (phaseTasks.length === 0) {
      console.log('\n✅ 没有发现错误放置的Phase任务，层级结构正确！');
      return;
    }
    
    console.log('\n2. 智能匹配Phase任务到正确的父任务...');
    console.log('==========================================');
    
    const fixPlan = [];
    
    for (const phaseTask of phaseTasks) {
      console.log(`\n🔍 分析Phase任务: ${phaseTask.id} - "${phaseTask.title}"`);
      
      let suggestedParent = null;
      let matchReason = '';
      let confidence = 0;
      
      // 获取任务详情以分析描述
      const taskDetail = await taskServer.findTaskById(phaseTask.id);
      
      // 方法1: 检查描述中是否有明确的父任务编号
      if (taskDetail.description && taskDetail.description.includes('父任务')) {
        const parentMatch = taskDetail.description.match(/父任务.*?[#:]\\s*(\\d+)/);
        if (parentMatch) {
          const parentTaskId = parseInt(parentMatch[1]);
          const parentTask = normalSecondLevelTasks.find(t => t.id === parentTaskId);
          if (parentTask) {
            suggestedParent = parentTask;
            matchReason = `描述中明确指出父任务#${parentTaskId}`;
            confidence = 95;
            console.log(`   ✅ 发现明确的父任务引用: #${parentTaskId}`);
          }
        }
      }
      
      // 方法2: 检查描述中是否提到关联任务
      if (!suggestedParent && taskDetail.description) {
        const taskIdMatches = taskDetail.description.match(/任务.*?[#:]?\\s*(\\d+)/g);
        if (taskIdMatches) {
          for (const match of taskIdMatches) {
            const idMatch = match.match(/\\d+/);
            if (idMatch) {
              const referencedId = parseInt(idMatch[0]);
              const referencedTask = normalSecondLevelTasks.find(t => t.id === referencedId);
              if (referencedTask) {
                suggestedParent = referencedTask;
                matchReason = `描述中引用了任务#${referencedId}`;
                confidence = 85;
                console.log(`   ✅ 发现任务引用: #${referencedId}`);
                break;
              }
            }
          }
        }
      }
      
      // 方法3: 基于Phase内容的智能匹配
      if (!suggestedParent) {
        console.log('   🤔 未找到明确引用，进行内容分析...');
        
        if (phaseTask.title.includes('诊断') || phaseTask.title.includes('问题') || phaseTask.title.includes('分析')) {
          // 寻找Bug相关的任务
          suggestedParent = normalSecondLevelTasks.find(task => 
            task.title.includes('Bug') || 
            task.title.includes('修复') || 
            task.title.includes('bug')
          );
          if (suggestedParent) {
            matchReason = 'Phase内容与Bug修复相关';
            confidence = 80;
          }
        } else if (phaseTask.title.includes('搜索') || phaseTask.title.includes('列表') || phaseTask.title.includes('优化')) {
          // 寻找功能优化相关的任务
          suggestedParent = normalSecondLevelTasks.find(task => 
            task.title.includes('搜索') || 
            task.title.includes('列表') || 
            task.title.includes('优化') ||
            task.title.includes('功能')
          );
          if (suggestedParent) {
            matchReason = 'Phase内容与功能优化相关';
            confidence = 75;
          }
        } else if (phaseTask.title.includes('组件') || phaseTask.title.includes('开发')) {
          // 寻找组件开发相关的任务
          suggestedParent = normalSecondLevelTasks.find(task => 
            task.title.includes('组件') || 
            task.title.includes('开发') ||
            task.title.includes('实现')
          );
          if (suggestedParent) {
            matchReason = 'Phase内容与组件开发相关';
            confidence = 75;
          }
        }
      }
      
      // 方法4: 默认匹配策略 - 如果还是没找到，匹配到最相关的任务
      if (!suggestedParent && normalSecondLevelTasks.length > 0) {
        // 优先匹配包含"任务"关键词的第二级任务
        suggestedParent = normalSecondLevelTasks.find(task => 
          task.title.includes('任务') || 
          task.title.includes('管理')
        ) || normalSecondLevelTasks[0]; // 如果没找到，默认选择第一个
        
        matchReason = '默认匹配到相关任务（低置信度）';
        confidence = 50;
      }
      
      if (suggestedParent) {
        console.log(`   ✅ 推荐父任务: ${suggestedParent.id} - "${suggestedParent.title}"`);
        console.log(`   📝 匹配原因: ${matchReason}`);
        console.log(`   🎯 置信度: ${confidence}%`);
        
        fixPlan.push({
          phaseTaskId: phaseTask.id,
          phaseTaskTitle: phaseTask.title,
          newParentId: suggestedParent.id,
          newParentTitle: suggestedParent.title,
          reason: matchReason,
          confidence: confidence
        });
      } else {
        console.log('   ❌ 无法找到合适的父任务');
      }
    }
    
    console.log('\n📋 层级修复计划汇总:');
    console.log('====================');
    if (fixPlan.length === 0) {
      console.log('❓ 没有可执行的修复计划');
      return;
    }
    
    // 按置信度排序
    fixPlan.sort((a, b) => b.confidence - a.confidence);
    
    fixPlan.forEach((plan, index) => {
      console.log(`${index + 1}. [${plan.confidence}%] Phase任务${plan.phaseTaskId}("${plan.phaseTaskTitle}")`);
      console.log(`   → 移动到父任务${plan.newParentId}("${plan.newParentTitle}")`);
      console.log(`   理由: ${plan.reason}\\n`);
    });
    
    console.log('🚀 执行层级修复...');
    console.log('==================');
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const plan of fixPlan) {
      console.log(`\\n🔄 处理Phase任务${plan.phaseTaskId}: "${plan.phaseTaskTitle}"`);
      console.log(`   从父任务128 → 移动到父任务${plan.newParentId}`);
      
      const updateResult = await taskServer.updateTask(plan.phaseTaskId, {
        parent_id: plan.newParentId
      });
      
      if (updateResult.success) {
        console.log(`   ✅ 成功移动到父任务${plan.newParentId}`);
        successCount++;
      } else {
        console.log(`   ❌ 移动失败: ${updateResult.error}`);
        failureCount++;
      }
    }
    
    console.log('\\n🎉 层级修复完成!');
    console.log('=================');
    console.log(`✅ 成功修复: ${successCount} 个Phase任务`);
    console.log(`❌ 修复失败: ${failureCount} 个Phase任务`);
    
    if (successCount > 0) {
      console.log(`📊 成功率: ${Math.round(successCount / (successCount + failureCount) * 100)}%`);
      
      console.log('\\n📈 最终层级结构:');
      console.log('================');
      console.log('一级任务(128) → 二级任务 → 三级任务(Phase)');
      console.log('层级关系已正确优化! 🎯');
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

fixThirdLevelHierarchy();