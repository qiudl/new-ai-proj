import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';
import axios from 'axios';

async function main() {
  console.log('🔧 按规定重新组织文档上传修复任务');
  console.log('=====================================');
  
  // 1. 获取新的认证token
  console.log('1. 获取认证token...');
  try {
    const loginResponse = await axios.post('http://localhost:8080/api/v1/auth/login', {
      username: 'admin',
      password: 'password123'
    }, {
      proxy: false
    });
    
    const newToken = loginResponse.data.data.token;
    console.log('✅ Token获取成功');
    
    // 2. 创建带有新token的任务服务器
    const taskServer = new TaskMCPServer();
    taskServer.authToken = newToken; // 更新token
    
    // 3. 分析任务性质
    console.log('\\n2. 分析任务性质...');
    console.log('• 任务类型: Bug修复');
    console.log('• 问题描述: 文档上传500错误');
    console.log('• 修复内容: unified_document_handler.go中Title字段传递问题');
    console.log('• 影响范围: TaskDocumentUploader批量上传功能');
    
    // 4. 查找本周根任务
    console.log('\\n3. 查找项目1中本周的根任务...');
    const tasks = await taskServer.listTasks(1);
    
    if (tasks.success) {
      const allTasks = tasks.data || [];
      console.log('总任务数:', allTasks.length);
      
      // 查找32周相关根任务
      const weeklyRootTasks = allTasks.filter(task => 
        (task.title.includes('32周') || task.title.includes('31周')) && !task.parent_id
      );
      
      console.log('📋 本周相关根任务:');
      weeklyRootTasks.forEach(task => {
        console.log('  ID:', task.id, '标题:', task.title, '状态:', task.status);
      });
      
      let rootTaskId = null;
      
      if (weeklyRootTasks.length > 0) {
        // 使用现有的根任务
        rootTaskId = weeklyRootTasks[0].id;
        console.log('✅ 找到根任务 ID:', rootTaskId);
      } else {
        // 创建新的32周根任务
        console.log('❌ 未找到32周根任务，创建新的根任务...');
        const rootTaskResult = await taskServer.createTask('32周：系统Bug修复与优化', 1);
        if (rootTaskResult.success) {
          rootTaskId = rootTaskResult.id;
          console.log('✅ 创建根任务成功 ID:', rootTaskId);
          
          // 更新根任务描述
          await taskServer.updateTask(rootTaskId, {
            description: '# 32周：系统Bug修复与优化\\n\\n本周重点进行系统稳定性改进和Bug修复工作。\\n\\n## 主要目标\\n\\n1. 修复文档上传相关问题\\n2. 优化用户界面交互体验\\n3. 提升系统整体稳定性\\n\\n## 工作计划\\n\\n- 深入分析和修复核心功能Bug\\n- 改进错误处理和用户反馈\\n- 完善系统监控和日志记录',
            status: 'in_progress'
          });
        } else {
          console.log('❌ 创建根任务失败:', rootTaskResult.error);
          return;
        }
      }
      
      // 5. 创建子任务记录已完成的修复工作
      console.log('\\n4. 创建子任务记录修复工作...');
      const subtaskResult = await taskServer.createSubTask(rootTaskId, '文档上传500错误修复');
      
      if (subtaskResult.success) {
        console.log('✅ 子任务创建成功 ID:', subtaskResult.id);
        
        // 更新子任务详情
        const updateResult = await taskServer.updateTask(subtaskResult.id, {
          description: '# 文档上传500错误修复\\n\\n## 🐛 问题描述\\n\\n用户在使用TaskDocumentUploader上传文档时遇到500 Internal Server Error：\\n- 错误链路: TaskDocumentUploader.tsx:235 → taskDocumentService.ts:525 → api.ts:164\\n- 影响功能: 批量文档上传功能完全不可用\\n\\n## 🔍 根本原因\\n\\n经过深入分析发现问题出现在后端 unified_document_handler.go 中：\\n- 前端发送包含 title 字段的请求\\n- 后端接收了 title 字段但没有传递给服务层\\n- 导致服务层接收不完整数据，引发500错误\\n\\n## 🔧 修复措施\\n\\n### 1. 接口定义修复 (document_service.go:56)\\n```go\\ntype CreateDocumentRequest struct {\\n    // ... 其他字段\\n    Title string `json:"title,omitempty"` // 添加title字段支持\\n}\\n```\\n\\n### 2. 处理器修复 (unified_document_handler.go:81)\\n```go\\nreq := &interfaces.CreateDocumentRequest{\\n    // ... 其他字段\\n    Title: request.Title, // 传递title字段到服务层\\n}\\n```\\n\\n## ✅ 验证结果\\n\\n- HTTP状态码: 201 (成功)\\n- 功能验证: 包含括号的文件名正常处理\\n- 日志验证: 无错误，正常处理请求\\n- 用户影响: TaskDocumentUploader批量上传功能恢复正常\\n\\n## 📊 技术细节\\n\\n- 修复文件: 2个 (接口定义 + 请求处理器)\\n- 测试案例: complete-system-architecture (1).md\\n- 性能影响: 无性能损失\\n- 向后兼容: 完全兼容现有功能\\n\\n**修复时间**: ' + new Date().toLocaleString() + '\\n**状态**: 已完成并验证',
          status: 'completed'
        });
        
        if (updateResult.success) {
          console.log('✅ 子任务详情更新成功');
          console.log('\\n🎉 任务重组织完成！');
          console.log('📋 任务层级结构:');
          console.log('  根任务 ID:', rootTaskId, '- 32周：系统Bug修复与优化');
          console.log('  └── 子任务 ID:', subtaskResult.id, '- 文档上传500错误修复 [已完成]');
          console.log('\\n🔗 任务链接:');
          console.log('  根任务: http://localhost/projects/1/tasks/' + rootTaskId);
          console.log('  子任务: http://localhost/projects/1/tasks/' + subtaskResult.id);
        } else {
          console.log('❌ 子任务详情更新失败:', updateResult.error);
        }
      } else {
        console.log('❌ 子任务创建失败:', subtaskResult.error);
      }
      
    } else {
      console.log('❌ 获取任务列表失败:', tasks.error);
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

main();