#!/usr/bin/env node

import axios from 'axios';

async function updateTask53WithTestCase() {
  console.log('📝 为任务#53编写测试用例方案');
  console.log('===============================');
  
  const apiBase = 'http://localhost:8080/api/v1';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InN5c3RlbSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsImlhdCI6MTc1NDEwNzk1MSwiZXhwIjoxNzU0MTExNTUxLCJpc3MiOiJhaS1wcm9qZWN0LWJhY2tlbmQiLCJzdWIiOiJzeXN0ZW0ifQ.N3GJ9s16OaG6rXJaFOIk9S5Go2CYFNZ4_2A5OGMC1j8';
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  // 编写完整的测试用例方案
  const testCaseDescription = `# 测试1: create_task功能验证 - 测试用例方案

## 测试目标
验证任务管理系统的创建任务(create_task)功能是否正常工作，确保用户能够成功创建新任务并在界面中正确显示。

## 测试环境
- 浏览器: Chrome/Firefox 最新版
- 测试地址: http://localhost:3000
- 登录凭据: admin / password
- 父任务页面: http://localhost:3000/projects/1/tasks/50

## 测试前提条件
1. 系统服务正常运行 (前端、后端、数据库)
2. 用户已成功登录系统
3. 用户具有任务创建权限
4. 当前位于任务详情页面

## 测试用例设计

### 用例1: 基础任务创建功能验证
**测试步骤:**
1. 登录系统 (admin/password)
2. 导航到任务详情页: /projects/1/tasks/50
3. 查找并点击"创建子任务"或"添加任务"按钮
4. 在任务标题字段输入: "自动化测试创建的任务 - " + 当前时间戳
5. 在任务描述字段输入: "这是通过Playwright自动化测试创建的任务，用于验证create_task功能"
6. 点击"保存"或"创建"按钮
7. 等待页面响应(2秒)
8. 验证新任务是否出现在任务列表中

**预期结果:**
- 任务创建成功，页面显示成功提示
- 新任务出现在任务列表中
- 任务标题和描述正确显示
- 任务状态为"pending"或"待处理"

### 用例2: 表单验证测试
**测试步骤:**
1. 点击"创建子任务"按钮
2. 不填写任务标题，直接点击保存
3. 观察表单验证提示
4. 填写极长的任务标题(超过100字符)
5. 点击保存并观察系统响应

**预期结果:**
- 空标题时显示验证错误提示
- 超长标题得到适当处理(截断或错误提示)

### 用例3: 用户界面交互验证
**测试步骤:**
1. 验证创建任务表单的UI元素
2. 检查表单字段的可用性
3. 验证按钮的响应状态
4. 检查页面的响应式布局

**预期结果:**
- 所有UI元素正确显示和交互
- 表单提交后按钮状态正确更新
- 页面布局在不同屏幕尺寸下正常

## 测试执行策略

### 自动化测试脚本要求:
1. **录制视频**: 开启屏幕录制功能
2. **模拟人类操作**: 
   - 每次点击后等待500ms
   - 页面切换后等待2秒
   - 输入文字时模拟打字速度
3. **详细日志**: 记录每个操作步骤和结果
4. **截图保存**: 关键步骤自动截图
5. **错误处理**: 捕获并记录任何异常

### 验证检查点:
- ✅ 登录成功
- ✅ 页面加载完成
- ✅ 找到创建任务按钮
- ✅ 表单正确显示
- ✅ 任务创建成功
- ✅ 新任务在列表中显示
- ✅ 任务详情正确

## 测试数据
- 任务标题: "Playwright自动测试任务-" + 时间戳
- 任务描述: "通过自动化测试创建，验证create_task功能的正确性"
- 优先级: 中等
- 截止日期: 今天

## 成功标准
1. 任务创建流程完全无错误
2. 新任务正确保存到数据库
3. 前端界面正确显示新任务
4. 所有用户交互响应正常
5. 测试视频完整记录整个过程

## 风险和注意事项
- 网络延迟可能影响测试时序
- 页面加载时间可能变化
- 需要确保测试数据不与现有数据冲突
- 测试后清理创建的测试数据

## 执行时间估算
- 准备阶段: 1分钟
- 执行测试: 3-5分钟
- 结果验证: 1分钟
- 总计: 5-7分钟`;

  try {
    // 获取当前任务信息
    const getResponse = await axios.get(`${apiBase}/projects/1/tasks`, { headers });
    const tasks = getResponse.data.data.data;
    const task53 = tasks.find(t => t.id === 53);
    
    if (!task53) {
      console.error('❌ 找不到任务#53');
      return;
    }
    
    // 更新任务描述
    const updateData = {
      title: task53.title,
      project_id: task53.project_id,
      status: task53.status,
      description: testCaseDescription,
      parent_id: task53.parent_id,
      custom_fields: task53.custom_fields
    };
    
    const updateResponse = await axios.put(`${apiBase}/projects/1/tasks/53`, updateData, { headers });
    
    console.log('✅ 任务#53测试用例方案更新成功！');
    console.log('📖 已保存详细的测试用例方案到任务描述中');
    
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
  }
}

updateTask53WithTestCase().catch(console.error);
