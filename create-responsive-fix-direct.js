const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 读取认证token
let configToken = 'your-auth-token-here';
try {
  const configPath = path.join(os.homedir(), '.claude-code', 'config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const aiProjectManager = config.mcpServers?.['ai-project-manager'];
    if (aiProjectManager?.env?.AUTH_TOKEN) {
      configToken = aiProjectManager.env.AUTH_TOKEN;
    }
  }
} catch (error) {
  console.error(`读取配置文件失败: ${error.message}`);
}

const API_BASE = 'http://localhost:8080/api/v1';
const AUTH_TOKEN = configToken;

console.log(`API_BASE: ${API_BASE}`);
console.log(`Token configured: ${AUTH_TOKEN ? 'Yes' : 'No'}`);

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

async function createResponsiveFixSubtask() {
  try {
    console.log('正在创建响应式布局修复子任务...');
    
    const taskData = {
      title: "任务详情页响应式布局修复 - 解决小屏幕浮层遮盖问题",
      parent_id: 397,
      description: `详细记录小屏幕下右侧浮层遮盖主页面问题的完整解决方案

## 问题现象
TaskDetailPageNew.tsx在小屏幕设备（手机、平板）下，右侧信息面板以浮层形式显示，完全遮盖了主要内容区域，导致用户无法正常查看和操作任务详情。

## 根本原因分析
1. CSS响应式断点设置与Ant Design Grid系统的断点不匹配
2. TaskDetail.css中的媒体查询规则在小屏幕下未能正确触发
3. 布局容器的flex-direction属性在移动端未正确设置为column

## 解决方案实施
### 1. 修复CSS媒体查询
- 文件位置：TaskDetail.css
- 修改内容：调整媒体查询断点，确保与Ant Design Grid断点一致
- 具体修改：强制小屏幕下使用flex-direction: column布局

### 2. 验证和测试
- 创建responsive-test.html测试页面验证响应式行为
- 重新编译前端代码
- 重启Docker容器确保更改生效

## 技术细节
- 涉及组件：TaskDetailPageNew.tsx
- 涉及样式文件：TaskDetail.css
- 使用技术：Ant Design Grid System、CSS Media Queries
- 测试设备：移动端浏览器、开发者工具响应式模式

## 验证结果
✅ 小屏幕下右侧信息区域正确显示在主内容下方
✅ 浮层遮盖问题完全解决
✅ 响应式布局在不同屏幕尺寸下表现正常
✅ 用户体验显著改善

## 影响范围
- 改善移动端用户体验
- 提升响应式设计质量
- 解决用户反馈的关键问题

## 参考文件
- TaskDetail.css (响应式样式修复)
- TaskDetailPageNew.tsx (主要页面组件)
- debug-responsive.html (测试页面)
- test-responsive-layout.html (验证页面)`,
      status: "completed",
      priority: "high"
    };

    console.log('发送请求到API:', JSON.stringify(taskData, null, 2));
    
    const response = await client.post('/subtasks', taskData);
    
    console.log('✅ 任务创建成功！');
    console.log('任务详情:', JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 创建任务失败:', error.message);
    if (error.response) {
      console.error('API响应:', error.response.data);
      console.error('状态码:', error.response.status);
    }
    throw error;
  }
}

// 运行脚本
createResponsiveFixSubtask()
  .then(result => {
    console.log('\n🎉 响应式布局修复子任务创建完成！');
    console.log(`任务ID: ${result.id}`);
    console.log(`标题: ${result.title}`);
    console.log(`状态: ${result.status}`);
    console.log(`优先级: ${result.priority}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 脚本执行失败:', error.message);
    process.exit(1);
  });