import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createThirdSubtask() {
  console.log('🚀 创建子任务：管道C：API Key认证中间件与安全验证');
  
  const parentId = 210;
  const title = "管道C：API Key认证中间件与安全验证";
  
  const description = `这是并行开发架构中的安全认证管道，包含：
- APIKeyAuthMiddleware中间件实现
- HMAC-SHA256签名验证算法
- 请求时间戳验证
- 速率限制和防护机制
- JWT Token兼容性处理

此任务依赖管道B完成，预计4小时完成。`;

  try {
    // 创建子任务
    const result = await taskServer.createSubTask(parentId, {
      title: title,
      description: description,
      priority: 'high',
      estimated_hours: 4,
      status: 'todo'
    });
    
    if (result.success) {
      console.log(`✅ 子任务创建成功: ID ${result.id}`);
      console.log(`🎯 任务 "${title}" 创建完成！`);
      return {
        success: true,
        taskId: result.id,
        title: title
      };
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

createThirdSubtask()
  .then(result => {
    console.log('\n📋 创建结果:', JSON.stringify(result, null, 2));
  })
  .catch(console.error);