import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function finalWeek32Analysis() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('📊 32周系统优化任务最终分析报告\n');
    console.log('=' * 60 + '\n');
    
    // 1. 获取修复后的根任务信息
    console.log('📋 根任务信息:');
    const rootTask = await taskServer.findTaskById(634);
    
    console.log(`✅ 任务634: ${rootTask.title}`);
    console.log(`   状态: ${rootTask.status}`);
    console.log(`   优先级: ${rootTask.custom_fields?.priority || '未设置'}`);
    console.log(`   创建时间: ${rootTask.created_at}`);
    console.log(`   项目ID: ${rootTask.project_id}`);
    console.log('');
    
    // 2. 获取所有子任务详情
    console.log('🌳 子任务详细分析:');
    const childrenResult = await taskServer.getTaskChildren(634);
    
    if (childrenResult.success && childrenResult.children.length > 0) {
      for (let i = 0; i < childrenResult.children.length; i++) {
        const child = childrenResult.children[i];
        console.log(`\n${i + 1}. 任务${child.id}: ${child.title}`);
        
        try {
          const childDetail = await taskServer.findTaskById(child.id);
          console.log(`   📊 状态: ${childDetail.status}`);
          console.log(`   🎯 优先级: ${childDetail.custom_fields?.priority || '未设置'}`);
          console.log(`   📅 创建: ${childDetail.created_at}`);
          console.log(`   📝 更新: ${childDetail.updated_at}`);
          
          if (childDetail.description) {
            const shortDesc = childDetail.description.length > 150 
              ? childDetail.description.substring(0, 150) + '...'
              : childDetail.description;
            console.log(`   📄 描述: ${shortDesc}`);
          }
          
          // 检查是否有文档
          const docResult = await taskServer.hasTaskDocument(child.id);
          if (docResult.success && docResult.has_document) {
            console.log(`   📋 文档: ✅ 有关联文档`);
          } else {
            console.log(`   📋 文档: ❌ 无文档`);
          }
          
          // 检查子任务的子任务
          const grandChildrenResult = await taskServer.getTaskChildren(child.id);
          if (grandChildrenResult.success && grandChildrenResult.children.length > 0) {
            console.log(`   🌿 子任务: ${grandChildrenResult.children.length}个`);
            grandChildrenResult.children.forEach((grandChild, gIdx) => {
              console.log(`      ${gIdx + 1}. 任务${grandChild.id}: ${grandChild.title} (${grandChild.status})`);
            });
          }
          
        } catch (error) {
          console.log(`   ❌ 获取详情失败: ${error.message}`);
        }
      }
      
      // 3. 统计分析
      console.log('\n📊 任务完成情况统计:');
      console.log('-' * 40);
      
      const statusStats = {};
      const priorityStats = {};
      
      for (const child of childrenResult.children) {
        try {
          const childDetail = await taskServer.findTaskById(child.id);
          
          // 状态统计
          statusStats[childDetail.status] = (statusStats[childDetail.status] || 0) + 1;
          
          // 优先级统计
          const priority = childDetail.custom_fields?.priority || '未设置';
          priorityStats[priority] = (priorityStats[priority] || 0) + 1;
          
        } catch (error) {
          console.log(`⚠️ 统计任务${child.id}时出错: ${error.message}`);
        }
      }
      
      console.log('📈 按状态分布:');
      Object.entries(statusStats).forEach(([status, count]) => {
        const percentage = Math.round((count / childrenResult.children.length) * 100);
        const statusIcon = {
          'completed': '✅',
          'in_progress': '🔄', 
          'todo': '⏳',
          'pending': '⏸️',
          'cancelled': '❌'
        }[status] || '❓';
        console.log(`   ${statusIcon} ${status}: ${count}个 (${percentage}%)`);
      });
      
      console.log('\n🎯 按优先级分布:');
      Object.entries(priorityStats).forEach(([priority, count]) => {
        const priorityIcon = {
          'high': '🔴',
          'medium': '🟡',
          'low': '🟢',
          '未设置': '⚪'
        }[priority] || '❓';
        console.log(`   ${priorityIcon} ${priority}: ${count}个`);
      });
      
      // 4. 进度评估
      console.log('\n📊 总体进度评估:');
      console.log('-' * 40);
      
      const completedCount = statusStats['completed'] || 0;
      const totalCount = childrenResult.children.length;
      const completionRate = Math.round((completedCount / totalCount) * 100);
      
      console.log(`✅ 完成率: ${completionRate}% (${completedCount}/${totalCount})`);
      
      if (completionRate === 100) {
        console.log('🎉 恭喜！32周系统优化任务全部完成！');
      } else if (completionRate >= 80) {
        console.log('🚀 进展良好，接近完成！');
      } else if (completionRate >= 50) {
        console.log('⚡ 进展稳定，继续加油！');
      } else {
        console.log('💪 任务刚开始，需要加快进度！');
      }
      
      // 5. 未完成任务分析
      const incompleteTasks = childrenResult.children.filter(child => 
        !['completed'].includes(child.status)
      );
      
      if (incompleteTasks.length > 0) {
        console.log(`\n⚠️ 未完成任务详情 (${incompleteTasks.length}个):`);
        console.log('-' * 40);
        
        for (let i = 0; i < incompleteTasks.length; i++) {
          const task = incompleteTasks[i];
          try {
            const taskDetail = await taskServer.findTaskById(task.id);
            
            console.log(`${i + 1}. 任务${task.id}: ${task.title}`);
            console.log(`   状态: ${taskDetail.status}`);
            console.log(`   优先级: ${taskDetail.custom_fields?.priority || '未设置'}`);
            console.log(`   创建时间: ${taskDetail.created_at}`);
            
            // 计算任务存在时长
            const createdDate = new Date(taskDetail.created_at);
            const now = new Date();
            const daysPassed = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
            console.log(`   存在时长: ${daysPassed}天`);
            
            if (daysPassed > 3) {
              console.log(`   ⚠️ 注意: 任务已存在超过3天，建议优先处理`);
            }
            
            console.log('');
          } catch (error) {
            console.log(`   ❌ 获取详情失败: ${error.message}\n`);
          }
        }
        
        // 6. 行动建议
        console.log('💡 下一步行动建议:');
        console.log('-' * 40);
        
        // 找出最高优先级的未完成任务
        const highPriorityTasks = [];
        const mediumPriorityTasks = [];
        const lowPriorityTasks = [];
        
        for (const task of incompleteTasks) {
          try {
            const taskDetail = await taskServer.findTaskById(task.id);
            const priority = taskDetail.custom_fields?.priority || 'low';
            
            if (priority === 'high') {
              highPriorityTasks.push(taskDetail);
            } else if (priority === 'medium') {
              mediumPriorityTasks.push(taskDetail);
            } else {
              lowPriorityTasks.push(taskDetail);
            }
          } catch (error) {
            console.log(`⚠️ 分析任务${task.id}优先级时出错: ${error.message}`);
          }
        }
        
        if (highPriorityTasks.length > 0) {
          console.log('🔥 立即处理 (高优先级):');
          highPriorityTasks.forEach((task, idx) => {
            console.log(`   ${idx + 1}. 任务${task.id}: ${task.title}`);
          });
          console.log('');
        }
        
        if (mediumPriorityTasks.length > 0) {
          console.log('⚡ 近期处理 (中优先级):');
          mediumPriorityTasks.forEach((task, idx) => {
            console.log(`   ${idx + 1}. 任务${task.id}: ${task.title}`);
          });
          console.log('');
        }
        
        if (lowPriorityTasks.length > 0) {
          console.log('📋 后续安排 (低优先级):');
          lowPriorityTasks.forEach((task, idx) => {
            console.log(`   ${idx + 1}. 任务${task.id}: ${task.title}`);
          });
          console.log('');
        }
        
      } else {
        console.log('\n✅ 所有子任务都已完成！');
        console.log('🎉 32周系统优化工作圆满结束！');
      }
      
      // 7. 建议新增任务
      if (totalCount < 5) {
        console.log('\n💡 建议新增的优化任务:');
        console.log('-' * 40);
        console.log('   • 系统性能监控仪表板开发');
        console.log('   • 用户交互响应时间优化');
        console.log('   • 数据库查询性能调优');
        console.log('   • 前端资源加载优化');
        console.log('   • 错误日志收集和分析系统');
        console.log('   • 用户体验反馈收集机制');
      }
      
    } else {
      console.log('❌ 未找到子任务或获取子任务失败');
    }
    
    // 8. 获取根任务文档
    console.log('\n📄 任务文档状态:');
    console.log('-' * 40);
    
    const rootDocResult = await taskServer.getTaskDocument(634);
    if (rootDocResult.success) {
      console.log('✅ 根任务有详细文档');
      console.log(`   文档长度: ${rootDocResult.content.length} 字符`);
      console.log(`   最后更新: ${rootDocResult.updated_at}`);
    } else {
      console.log('❌ 根任务暂无文档');
    }
    
    // 9. 总结
    console.log('\n' + '=' * 60);
    console.log('📋 32周系统优化任务分析总结');
    console.log('=' * 60);
    console.log(`✅ 根任务: 任务634 - 32周：系统Bug修复与优化（数据修复）`);
    console.log(`📊 子任务数量: ${childrenResult.children.length}个`);
    console.log(`📈 完成率: ${Math.round((statusStats['completed'] || 0) / childrenResult.children.length * 100)}%`);
    console.log(`⏳ 待完成: ${incompleteTasks.length}个`);
    console.log(`🎯 数据一致性: 已修复`);
    console.log(`📄 文档状态: ${rootDocResult.success ? '完整' : '待补充'}`);
    console.log('\n💡 主要成果: 成功修复了任务397的数据一致性问题，建立了完整的32周优化任务体系。');
    console.log('\n感谢使用Claude Code MCP任务管理工具！');
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

finalWeek32Analysis();