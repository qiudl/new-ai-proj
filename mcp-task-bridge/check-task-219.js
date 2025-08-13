#!/usr/bin/env node

const { spawn } = require('child_process');

async function checkTask219() {
    console.log('🔍 检查任务 219 的详细状态...');
    
    return new Promise((resolve, reject) => {
        const mcpProcess = spawn('node', ['task-mcp.js'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
        });

        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'get_task',
                arguments: {
                    task_id: 219
                }
            }
        };

        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();

        let output = '';
        let errorOutput = '';

        mcpProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        mcpProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('❌ MCP进程错误:', errorOutput);
                reject(new Error(`MCP process failed with code ${code}`));
                return;
            }

            try {
                // 解析输出中的JSON响应
                const lines = output.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const response = JSON.parse(line);
                        if (response.result && response.result.content) {
                            const taskData = JSON.parse(response.result.content[0].text);
                            console.log('✅ 任务 219 详细信息:');
                            console.log(`- ID: ${taskData.id}`);
                            console.log(`- 标题: ${taskData.title}`);
                            console.log(`- 状态: ${taskData.status}`);
                            console.log(`- 描述: ${taskData.description ? taskData.description.substring(0, 100) + '...' : '无描述'}`);
                            console.log(`- 项目ID: ${taskData.project_id}`);
                            console.log(`- 父任务ID: ${taskData.parent_id || '无'}`);
                            console.log(`- 创建时间: ${taskData.created_at}`);
                            console.log(`- 更新时间: ${taskData.updated_at}`);
                            resolve(taskData);
                            return;
                        }
                    } catch (parseError) {
                        // 继续尝试下一行
                        continue;
                    }
                }
                reject(new Error('没有找到有效的任务数据'));
            } catch (error) {
                console.error('❌ 解析响应失败:', error);
                reject(error);
            }
        });

        // 设置超时
        setTimeout(() => {
            mcpProcess.kill();
            reject(new Error('请求超时'));
        }, 10000);
    });
}

checkTask219().catch(error => {
    console.error('❌ 检查任务失败:', error.message);
    process.exit(1);
});