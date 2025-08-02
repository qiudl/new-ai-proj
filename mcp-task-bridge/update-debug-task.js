#!/usr/bin/env node

import axios from 'axios';

async function updateDebugTaskDescription() {
  console.log('🔧 更新调试任务 #65 的详细描述');
  console.log('==============================');
  
  const apiBase = 'http://localhost:8080/api/v1';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InN5c3RlbSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsImlhdCI6MTc1NDEwNzk1MSwiZXhwIjoxNzU0MTExNTUxLCJpc3MiOiJhaS1wcm9qZWN0LWJhY2tlbmQiLCJzdWIiOiJzeXN0ZW0ifQ.N3GJ9s16OaG6rXJaFOIk9S5Go2CYFNZ4_2A5OGMC1j8';
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  try {
    // 获取任务列表，找到任务 65
    const listResponse = await axios.get(`${apiBase}/projects/1/tasks`, { headers });
    const tasks = listResponse.data.data.data;
    const task65 = tasks.find(t => t.id === 65);
    
    if (!task65) {
      console.error('❌ 找不到任务 #65');
      return;
    }
    
    console.log('📋 当前任务信息:');
    console.log(`ID: ${task65.id}`);
    console.log(`标题: ${task65.title}`);
    console.log(`状态: ${task65.status}`);
    console.log(`父任务: ${task65.parent_id}`);
    
    // 准备完整的描述
    const fullDescription = `开启前端和后端的详细调试模式，诊断任务保存失败的问题

调试任务清单:
☐ 检查前端任务编辑组件的网络请求
☐ 查看浏览器开发者工具的Network和Console
☐ 修复发现的前端问题
☐ 分析前端代码的任务保存逻辑

详细调试步骤:

1. 前端调试设置:
   - 打开浏览器开发者工具 (F12)
   - 切换到 Network 标签页
   - 启用 "Preserve log" 选项
   - 清空现有日志记录

2. 后端调试设置:
   - 查看 Docker 容器日志: docker logs go_backend -f
   - 检查 API 错误响应
   - 监控数据库连接状态

3. 重现问题:
   - 进入任务详情页: http://localhost:3000/projects/1/tasks/50
   - 尝试编辑任务标题或描述
   - 点击保存按钮
   - 观察请求失败的具体错误

4. 分析网络请求:
   - 检查 PUT /api/v1/projects/1/tasks/{id} 请求
   - 验证请求头中的 Authorization
   - 查看请求体数据格式
   - 分析响应状态码和错误消息

5. 前端代码检查:
   - 检查 TaskEdit 组件的提交逻辑
   - 验证表单数据序列化
   - 确认 API 调用参数正确性
   - 检查错误处理机制

6. 修复验证:
   - 应用修复方案
   - 重新测试任务保存功能
   - 验证错误消息显示
   - 确认数据持久化

完成时间: 今天
优先级: 高
父任务: #50 Claude Code MCP 集成测试任务

预期结果:
- 识别任务保存失败的根本原因
- 修复前端或后端的相关问题
- 确保任务编辑功能正常工作
- 提供详细的调试报告`;

    // 更新任务
    const updateData = {
      title: task65.title,
      project_id: task65.project_id,
      status: task65.status,
      description: fullDescription,
      parent_id: task65.parent_id
    };
    
    const updateResponse = await axios.put(`${apiBase}/projects/1/tasks/65`, updateData, { headers });
    
    console.log('✅ 调试任务描述更新成功！');
    console.log('📖 新的描述内容:');
    console.log('================');
    console.log(fullDescription);
    
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
  }
}

updateDebugTaskDescription().catch(console.error);
