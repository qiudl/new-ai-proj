#!/usr/bin/env node

const axios = require('axios');

// API配置
const API_BASE = 'http://localhost:8080/api/v1';
const PROJECT_ID = 34; // 32周系统优化任务的项目ID
const PARENT_TASK_ID = 397; // 父任务ID

// 创建API客户端
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer system-token' // 使用系统token
  },
  timeout: 10000
});

async function createFullscreenTestTask() {
  try {
    console.log('正在创建TaskDocumentEditor全屏功能测试任务...');
    
    const taskData = {
      title: '全屏功能测试任务',
      description: `# TaskDocumentEditor全屏功能测试任务

## 测试目标
验证TaskDocumentEditor组件的全屏功能是否正常工作

## 测试内容

### 1. 全屏按钮测试
- [ ] 点击工具栏中的全屏按钮
- [ ] 验证编辑器是否正确进入全屏模式
- [ ] 检查全屏状态下的UI布局

### 2. 键盘快捷键测试
- [ ] 测试F11键切换全屏功能
- [ ] 测试Ctrl+Shift+F键切换全屏功能
- [ ] 测试ESC键退出全屏功能

### 3. 全屏状态UI验证
- [ ] 验证全屏时编辑器占满整个屏幕
- [ ] 检查工具栏在全屏状态下的显示
- [ ] 验证底部信息栏的显示状态
- [ ] 确认全屏提示信息正确显示

### 4. 功能完整性测试
- [ ] 在全屏状态下测试文档编辑功能
- [ ] 验证保存功能在全屏模式下正常工作
- [ ] 测试Ctrl+S快捷键保存功能
- [ ] 检查未保存更改提示

### 5. 退出全屏测试
- [ ] 使用退出全屏按钮
- [ ] 使用ESC键退出
- [ ] 使用F11键退出
- [ ] 验证退出后UI恢复正常

## 测试数据
使用包含以下内容的测试文档：

\`\`\`markdown
# 全屏编辑器测试文档

这是一个用于测试TaskDocumentEditor全屏功能的测试文档。

## 功能列表
1. 全屏按钮点击
2. 键盘快捷键
3. UI布局验证
4. 编辑功能测试

### 代码块测试
\`\`\`javascript
function testFullscreen() {
  console.log('测试全屏功能');
}
\`\`\`

### 表格测试
| 功能 | 状态 | 备注 |
|------|------|------|
| 全屏按钮 | ✅ | 正常 |
| 键盘快捷键 | ✅ | 正常 |
| UI布局 | ✅ | 正常 |
\`\`\`

## 预期结果
- 全屏功能应该流畅无卡顿
- 所有快捷键应该正常响应
- UI在全屏状态下应该合理布局
- 编辑功能在全屏模式下完全可用
- 退出全屏后UI应该完全恢复

## 验收标准
1. 所有测试项目均通过
2. 无JavaScript错误发生
3. 用户体验流畅
4. 功能符合设计预期`,
      status: 'todo',
      priority: 'high',
      parent_id: PARENT_TASK_ID,
      tags: ['测试', '全屏功能', 'TaskDocumentEditor', 'UI测试'],
      estimated_hours: 2
    };

    const response = await apiClient.post(`/projects/${PROJECT_ID}/tasks`, taskData);
    
    if (response.data) {
      console.log('✅ 测试任务创建成功！');
      console.log(`任务ID: ${response.data.id}`);
      console.log(`任务标题: ${response.data.title}`);
      console.log(`父任务ID: ${response.data.parent_id}`);
      console.log(`项目ID: ${PROJECT_ID}`);
      
      // 创建任务文档
      await createTaskDocument(response.data.id);
      
      return response.data;
    } else {
      console.error('❌ 创建任务失败：无响应数据');
    }
    
  } catch (error) {
    console.error('❌ 创建任务失败：', error.message);
    if (error.response) {
      console.error('错误详情：', error.response.data);
    }
  }
}

async function createTaskDocument(taskId) {
  try {
    console.log(`正在为任务 ${taskId} 创建测试文档...`);
    
    const documentContent = `# TaskDocumentEditor全屏功能测试文档

## 测试场景1：基本全屏功能
这是一个测试TaskDocumentEditor全屏功能的示例文档。请按照以下步骤进行测试：

### 1. 全屏按钮测试
点击编辑器工具栏中的"全屏"按钮，验证：
- 编辑器是否正确进入全屏模式
- 工具栏是否显示"退出全屏"按钮
- 页面布局是否正确调整

### 2. 键盘快捷键测试
测试以下键盘快捷键：
- **F11**: 切换全屏模式
- **Ctrl+Shift+F**: 切换全屏模式  
- **ESC**: 退出全屏模式
- **Ctrl+S**: 保存文档

## 测试场景2：全屏状态下的编辑功能

在全屏模式下测试以下编辑功能：

### Markdown语法测试
- **粗体文本**
- *斜体文本*
- \`行内代码\`

### 代码块测试
\`\`\`javascript
// 测试代码块在全屏模式下的显示
function testFullscreenEditor() {
  console.log('全屏编辑器测试');
  return true;
}
\`\`\`

### 列表测试
1. 有序列表项1
2. 有序列表项2
   - 无序子列表项1
   - 无序子列表项2

### 表格测试
| 测试项目 | 预期结果 | 实际结果 |
|----------|----------|----------|
| 全屏按钮 | 正常切换 | ✅ 通过 |
| F11快捷键 | 正常切换 | ⏳ 待测试 |
| ESC退出 | 正常退出 | ⏳ 待测试 |

## 测试场景3：UI布局验证

在全屏状态下检查以下UI元素：

### 工具栏验证
- [ ] 保存按钮可见且可用
- [ ] 全屏/退出全屏按钮状态正确
- [ ] 未保存更改提示正确显示
- [ ] 快捷键提示信息显示

### 编辑区域验证
- [ ] 编辑器占满可用空间
- [ ] 滚动条正常工作
- [ ] 文本输入响应正常
- [ ] 光标定位准确

### 底部信息栏验证
- [ ] 任务ID和项目ID显示
- [ ] 字符数统计正确
- [ ] 全屏模式提示显示

## 性能测试
在全屏模式下测试：
- [ ] 大文档(>10KB)编辑性能
- [ ] 快速输入响应速度
- [ ] 切换全屏的流畅度

## 兼容性测试
测试不同浏览器下的全屏功能：
- [ ] Chrome
- [ ] Firefox  
- [ ] Safari
- [ ] Edge

---

**测试完成后请更新上述检查项目，并记录任何发现的问题。**`;

    const documentData = {
      content: documentContent
    };

    const docResponse = await apiClient.put(`/projects/${PROJECT_ID}/tasks/${taskId}/documents`, documentData);
    
    if (docResponse.data) {
      console.log('✅ 任务文档创建成功！');
    } else {
      console.log('⚠️  任务文档创建可能有问题');
    }
    
  } catch (error) {
    console.error('❌ 创建任务文档失败：', error.message);
  }
}

// 执行创建任务
createFullscreenTestTask().then(() => {
  console.log('\n🎉 TaskDocumentEditor全屏功能测试任务创建完成！');
  console.log('\n📝 使用说明：');
  console.log('1. 在任务管理界面找到刚创建的测试任务');
  console.log('2. 点击进入任务详情页面');
  console.log('3. 在文档编辑区域测试全屏功能');
  console.log('4. 按照文档中的测试步骤逐项验证');
  console.log('5. 测试完成后更新任务状态');
}).catch(error => {
  console.error('脚本执行失败：', error);
});