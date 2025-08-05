#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const __dirname = __dirname;

// MCP 服务器配置
const mcpServerPath = path.join(__dirname, 'mcp-task-bridge', 'index.js');

/**
 * 调用 MCP 工具
 */
async function callMCPTool(toolName, args) {
    return new Promise((resolve, reject) => {
        const mcpProcess = spawn('node', [mcpServerPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        mcpProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        mcpProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    // 解析 JSON 响应
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message}\nOutput: ${stdout}`));
                }
            } else {
                reject(new Error(`MCP process exited with code ${code}\nStderr: ${stderr}`));
            }
        });

        // 发送 MCP 请求
        const request = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: toolName,
                arguments: args
            }
        };

        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();
    });
}

/**
 * 创建响应式布局修复子任务
 */
async function createResponsiveFixTask() {
    try {
        console.log('正在创建任务详情页响应式布局修复子任务...');

        const taskData = {
            siblingId: 397, // 父任务ID（32周：系统Bug修复与优化）
            title: "任务详情页响应式布局修复 - 解决小屏幕浮层遮盖问题",
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
- /Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/components/task/TaskDetail.css
- /Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/components/TaskDetailPageNew.tsx
- /Users/johnqiu/coding/www/projects/new-ai-proj/debug-responsive.html
- /Users/johnqiu/coding/www/projects/new-ai-proj/test-responsive-layout.html`,
            status: "completed",
            priority: "high"
        };

        // 创建子任务
        const result = await callMCPTool('create_sibling_task', taskData);
        
        console.log('✅ 任务创建成功：');
        console.log(JSON.stringify(result, null, 2));

        return result;

    } catch (error) {
        console.error('❌ 创建任务失败：', error);
        throw error;
    }
}

// 运行脚本
createResponsiveFixTask()
    .then(() => {
        console.log('\n✅ 任务详情页响应式布局修复子任务创建完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 脚本执行失败：', error);
        process.exit(1);
    });