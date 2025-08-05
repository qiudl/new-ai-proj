import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createParentTaskSelectionFix() {
  console.log('🚀 创建子任务：修复任务编辑页父任务选择弹窗问题');
  
  const parentId = 397;
  const title = "修复任务编辑页父任务选择弹窗问题";
  
  const description = `修复任务编辑独立页中的父任务选择功能，包括：

**技术问题修复**：
1. 实现弹窗效果的父任务选择器
2. 修复useParentValidation.ts中的404错误
3. 完善父任务验证API端点/api/v1/tasks/validate-parent
4. 改进用户交互体验，确保选择父任务时有友好的弹窗界面
5. 测试循环依赖检测功能

**具体任务细节**：
- 检查并修复useParentValidation.ts中的API调用问题
- 确保父任务验证端点正确响应请求
- 实现用户友好的弹窗选择界面
- 添加循环依赖检测和错误提示
- 测试所有相关功能的正常工作

**预期成果**：
- 用户可以正常选择父任务
- 弹窗界面友好且功能完整
- API端点正常响应
- 循环依赖检测工作正常
- 所有相关错误得到修复

这是一个高优先级的用户界面关键功能修复任务。`;

  try {
    // 首先验证父任务存在
    const parentTask = await taskServer.findTaskById(parentId);
    console.log(`✅ 找到父任务: "${parentTask.title}" (ID: ${parentId})`);
    
    // 创建子任务
    const result = await taskServer.createSubTask(parentId, title);
    
    if (result.success) {
      console.log(`✅ 子任务创建成功: ID ${result.id}`);
      
      // 更新描述
      const updateResult = await taskServer.updateTaskDescription(result.id, description);
      
      if (updateResult.success) {
        console.log(`✅ 描述更新成功`);
        
        // 设置高优先级
        const priorityResult = await taskServer.updateTask(result.id, { priority: 'high' });
        
        if (priorityResult.success) {
          console.log(`✅ 优先级设置为高`);
        } else {
          console.log(`⚠️ 优先级设置失败: ${priorityResult.error}`);
        }
        
        console.log(`🎯 任务 "${title}" 创建完成！`);
        return {
          success: true,
          taskId: result.id,
          title: title,
          priority: 'high',
          status: 'todo'
        };
      } else {
        console.log(`⚠️ 描述更新失败: ${updateResult.error}`);
        return {
          success: true,
          taskId: result.id,
          title: title,
          warning: '描述更新失败'
        };
      }
    } else {
      console.log(`❌ 子任务创建失败: ${result.error}`);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.log(`❌ 执行失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

createParentTaskSelectionFix()
  .then(result => {
    console.log('\n📋 创建结果:', JSON.stringify(result, null, 2));
  })
  .catch(console.error);