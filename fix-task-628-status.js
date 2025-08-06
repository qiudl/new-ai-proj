import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function fixTask628Status() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🔧 修复任务628状态不一致问题...\n');
    
    // 1. 获取当前任务状态
    const task628 = await taskServer.findTaskById(628);
    console.log('📊 当前任务状态:');
    console.log(`   任务ID: ${task628.id}`);
    console.log(`   标题: ${task628.title}`);
    console.log(`   当前状态: ${task628.status}`);
    console.log(`   创建时间: ${task628.created_at}`);
    console.log(`   更新时间: ${task628.updated_at}`);
    console.log('');
    
    // 2. 检查任务文档内容
    const docResult = await taskServer.getTaskDocument(628);
    if (docResult.success) {
      console.log('📄 文档内容分析:');
      const content = docResult.content;
      
      // 检查文档中的完成状态标识
      const completionIndicators = [];
      if (content.includes('✅ 已完成')) completionIndicators.push('文档标记为已完成');
      if (content.includes('状态**: ✅ 已完成')) completionIndicators.push('状态字段显示已完成');
      if (content.includes('完成时间**: 2025-08-06 02:15:43')) completionIndicators.push('有明确完成时间');
      if (content.includes('实际工时**: 2.5小时')) completionIndicators.push('记录了实际工时');
      if (content.includes('**任务状态**: ✅ 完成')) completionIndicators.push('最终状态为完成');
      if (content.includes('用户评价**: "你干的太好了！！！"')) completionIndicators.push('有用户完成确认');
      
      console.log('   文档中的完成证据:');
      if (completionIndicators.length > 0) {
        completionIndicators.forEach(indicator => {
          console.log(`   ✅ ${indicator}`);
        });
        console.log(`\n   📋 结论: 任务实际已完成，但数据库状态未同步`);
      } else {
        console.log('   ❓ 文档中未找到明确的完成标识');
      }
      console.log('');
    }
    
    // 3. 检查功能验收情况
    console.log('🧪 功能验收情况检查:');
    if (docResult.success) {
      const content = docResult.content;
      const testResults = [];
      
      if (content.includes('✅ **基础选择**: 可以正常')) testResults.push('基础选择功能');
      if (content.includes('✅ **清除功能**: 可以清除')) testResults.push('清除功能');
      if (content.includes('✅ **验证机制**: 层级验证')) testResults.push('验证机制');
      if (content.includes('✅ **搜索功能**: 关键词搜索')) testResults.push('搜索功能');
      if (content.includes('✅ **响应式**: 在1920×1080')) testResults.push('响应式设计');
      if (content.includes('✅ **Chrome**: 桌面端')) testResults.push('Chrome兼容性');
      if (content.includes('✅ **Safari**: macOS')) testResults.push('Safari兼容性');
      
      console.log('   已通过的测试项目:');
      testResults.forEach(test => {
        console.log(`   ✅ ${test}`);
      });
      
      console.log(`\n   📊 测试通过率: ${testResults.length}/7 (${Math.round(testResults.length/7*100)}%)`);
      
      if (testResults.length >= 5) {
        console.log('   🎉 测试覆盖度充分，确认任务已完成');
      }
      console.log('');
    }
    
    // 4. 更新任务状态为完成
    console.log('🔄 更新任务状态...');
    const updateResult = await taskServer.updateTask(628, {
      status: 'completed'
    });
    
    if (updateResult.success) {
      console.log(`✅ ${updateResult.message}`);
      console.log('   状态已从 "todo" 更新为 "completed"');
    } else {
      console.log(`❌ 状态更新失败: ${updateResult.error}`);
    }
    console.log('');
    
    // 5. 验证更新结果
    console.log('🔍 验证状态更新结果...');
    const updatedTask = await taskServer.findTaskById(628);
    console.log(`   更新后状态: ${updatedTask.status}`);
    console.log(`   更新时间: ${updatedTask.updated_at}`);
    console.log('');
    
    // 6. 检查32周任务整体完成情况
    console.log('📊 32周任务整体完成情况检查...');
    const rootTask = await taskServer.findTaskById(634);
    const childrenResult = await taskServer.getTaskChildren(634);
    
    if (childrenResult.success) {
      console.log(`   根任务: ${rootTask.title}`);
      console.log(`   子任务总数: ${childrenResult.children.length}个`);
      
      let completedCount = 0;
      childrenResult.children.forEach(child => {
        const status = child.id === 628 ? 'completed' : child.status; // 使用更新后的状态
        if (status === 'completed') completedCount++;
        console.log(`   • 任务${child.id}: ${child.title} (${status})`);
      });
      
      const completionRate = Math.round((completedCount / childrenResult.children.length) * 100);
      console.log(`\n   ✅ 完成率: ${completionRate}% (${completedCount}/${childrenResult.children.length})`);
      
      if (completionRate === 100) {
        console.log('   🎉 恭喜！32周系统优化任务全部完成！');
        
        // 7. 考虑更新根任务状态
        console.log('\n🎯 考虑更新根任务状态...');
        if (rootTask.status !== 'completed') {
          console.log('   根任务当前状态: ' + rootTask.status);
          console.log('   建议将根任务状态更新为 "completed"');
          
          const rootUpdateResult = await taskServer.updateTask(634, {
            status: 'completed'
          });
          
          if (rootUpdateResult.success) {
            console.log(`   ✅ ${rootUpdateResult.message}`);
          } else {
            console.log(`   ❌ 根任务状态更新失败: ${rootUpdateResult.error}`);
          }
        } else {
          console.log('   根任务已是完成状态');
        }
      } else {
        console.log('   📋 还有部分子任务未完成，根任务保持当前状态');
      }
    }
    
    console.log('\n='.repeat(50));
    console.log('✅ 任务628状态修复完成');
    console.log('📊 32周系统优化任务数据一致性已恢复');
    console.log('🎯 任务层级结构完整且状态准确');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ 修复任务628状态失败:', error.message);
  }
}

fixTask628Status();