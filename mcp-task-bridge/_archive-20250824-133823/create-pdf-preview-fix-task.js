
import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createPDFPreviewFixTask() {
  console.log('🚀 创建子任务：修复PDF预览打印内容一片空白的bug');
  
  const parentId = 631; // 使用最新的根任务作为父任务
  const title = "修复PDF预览打印内容一片空白的bug";
  
  const description = `## 问题现象
PDF预览功能生成空白页面，无法正常显示内容，导致用户无法预览或打印PDF文档。

## 影响范围
- 文档导出和打印功能完全失效
- 用户无法正常查看生成的PDF内容
- 严重影响文档管理工作流程

## 优先级
高优先级 - 严重影响用户核心工作流程

## 技术分析
1. **前端问题排查**：
   - 检查PDF渲染组件的实现
   - 验证PDF.js或其他PDF库的配置
   - 检查CSS样式是否影响PDF显示

2. **后端问题排查**：
   - 验证PDF生成接口的响应
   - 检查PDF文件内容是否正确生成
   - 确认Content-Type和文件头信息

3. **数据流问题**：
   - 检查从后端到前端的数据传输
   - 验证Base64编码/解码过程
   - 确认文件流处理逻辑

## 解决方案
1. **立即排查**：
   - 检查浏览器控制台错误信息
   - 验证网络请求是否正常返回PDF数据
   - 测试不同浏览器的兼容性

2. **代码修复**：
   - 修复PDF渲染组件的bug
   - 优化PDF生成逻辑
   - 添加错误处理和用户友好提示

3. **测试验证**：
   - 多浏览器兼容性测试
   - 不同PDF内容类型测试
   - 性能和稳定性验证

## 验收标准
- PDF预览正常显示内容
- 打印功能完全可用
- 无控制台错误信息
- 多浏览器兼容性良好

这是一个高优先级的关键功能修复任务，需要立即处理以恢复PDF预览和打印功能。`;

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

createPDFPreviewFixTask()
  .then(result => {
    console.log('\n📋 创建结果:', JSON.stringify(result, null, 2));
  })
  .catch(console.error);
