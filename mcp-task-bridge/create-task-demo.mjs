#!/usr/bin/env node
/**
 * MCP任务创建演示脚本
 * 展示如何通过MCP服务器创建任务
 *
 * 使用方法：
 * 1. 本地后端模式: node create-task-demo.mjs local
 * 2. 远程MCP模式: node create-task-demo.mjs remote
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// 配置
const CONFIG = {
  local: {
    apiBase: 'http://localhost:8080/api/v1',
    token: process.env.API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTcyNTYxMDMsIm5iZiI6MTc1NjY1MTMwMywiaWF0IjoxNzU2NjUxMzAzLCJqdGkiOiIwZDcwODAwMzA2MDM1MDAyNTEzMDhkNjc2MjVlMGU5NiJ9.9RxYTjRawiP_j410jsjM8BbZBWQMDp9HbFrxRsE0hQ8'
  },
  remote: {
    mcpUrl: 'https://152.136.104.251/mcp',
    apiKey: process.env.MCP_API_KEY || 'mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06'
  }
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP/HTTPS请求封装
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      // 忽略SSL证书验证（仅用于测试）
      rejectUnauthorized: false
    };

    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            data: null
          };

          // 尝试解析JSON
          if (body) {
            try {
              response.data = JSON.parse(body);
            } catch (e) {
              // 如果不是JSON，保持原始body
            }
          }

          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }

    req.end();
  });
}

// 方法1: 直接调用后端API创建任务
async function createTaskViaAPI(taskData) {
  log('\n=== 方法1: 直接调用后端API ===', 'blue');

  const { apiBase, token } = CONFIG.local;
  const url = `${apiBase}/tasks`;

  log(`API地址: ${url}`, 'cyan');
  log(`任务数据: ${JSON.stringify(taskData, null, 2)}`, 'cyan');

  try {
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, taskData);

    if (response.statusCode === 200 || response.statusCode === 201) {
      log('✓ 任务创建成功！', 'green');
      log(`响应: ${JSON.stringify(response.data, null, 2)}`, 'green');
      return response.data;
    } else {
      log(`✗ 创建失败 (${response.statusCode})`, 'red');
      log(`响应: ${response.body}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ 请求失败: ${error.message}`, 'red');
    log('提示: 请确保后端服务正在运行 (localhost:8080)', 'yellow');
    return null;
  }
}

// 方法2: 通过远程MCP创建任务
async function createTaskViaMCP(taskData) {
  log('\n=== 方法2: 通过远程MCP服务器 ===', 'blue');

  const { mcpUrl, apiKey } = CONFIG.remote;

  // 首先测试健康检查
  log('步骤1: 测试MCP健康检查...', 'cyan');
  try {
    const healthResponse = await makeRequest(`${mcpUrl}/health`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (healthResponse.statusCode === 200) {
      log('✓ MCP服务器健康检查通过', 'green');
      log(`响应: ${JSON.stringify(healthResponse.data, null, 2)}`, 'cyan');
    } else {
      log(`⚠ 健康检查返回: ${healthResponse.statusCode}`, 'yellow');
      log(`响应: ${healthResponse.body}`, 'yellow');
    }
  } catch (error) {
    log(`✗ 无法连接到MCP服务器: ${error.message}`, 'red');
    log('提示: 请检查网络连接和防火墙设置', 'yellow');
    return null;
  }

  // 创建会话并发送消息
  log('\n步骤2: 通过MCP创建任务...', 'cyan');
  const sessionId = `session-${Date.now()}`;

  // 构造MCP消息
  const mcpMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'create_task',
      arguments: {
        title: taskData.title,
        description: taskData.description || '',
        project_id: taskData.project_id || 1,
        priority: taskData.priority || 'medium',
        status: taskData.status || 'pending'
      }
    }
  };

  log(`MCP消息: ${JSON.stringify(mcpMessage, null, 2)}`, 'cyan');

  try {
    const response = await makeRequest(`${mcpUrl}/message?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    }, mcpMessage);

    if (response.statusCode === 200) {
      log('✓ MCP任务创建成功！', 'green');
      log(`响应: ${JSON.stringify(response.data, null, 2)}`, 'green');
      return response.data;
    } else {
      log(`✗ 创建失败 (${response.statusCode})`, 'red');
      log(`响应: ${response.body}`, 'red');
      return null;
    }
  } catch (error) {
    log(`✗ MCP请求失败: ${error.message}`, 'red');
    return null;
  }
}

// 主函数
async function main() {
  const mode = process.argv[2] || 'local';

  log('╔═══════════════════════════════════════╗', 'blue');
  log('║   MCP任务创建演示脚本                ║', 'blue');
  log('╚═══════════════════════════════════════╝', 'blue');

  // 示例任务数据
  const taskData = {
    title: `测试任务 - ${new Date().toLocaleString('zh-CN')}`,
    description: '这是一个通过MCP API创建的测试任务',
    project_id: 1,
    priority: 'medium',
    status: 'pending'
  };

  log(`\n当前模式: ${mode}`, 'yellow');
  log('任务信息:', 'yellow');
  log(`  标题: ${taskData.title}`, 'cyan');
  log(`  描述: ${taskData.description}`, 'cyan');
  log(`  项目ID: ${taskData.project_id}`, 'cyan');
  log(`  优先级: ${taskData.priority}`, 'cyan');

  if (mode === 'local') {
    await createTaskViaAPI(taskData);
  } else if (mode === 'remote') {
    await createTaskViaMCP(taskData);
  } else if (mode === 'both') {
    await createTaskViaAPI(taskData);
    await createTaskViaMCP(taskData);
  } else {
    log('\n使用方法:', 'yellow');
    log('  node create-task-demo.mjs local   - 使用本地后端API', 'cyan');
    log('  node create-task-demo.mjs remote  - 使用远程MCP服务器', 'cyan');
    log('  node create-task-demo.mjs both    - 同时测试两种方式', 'cyan');
  }

  log('\n提示:', 'yellow');
  log('1. 本地模式需要后端服务运行在 localhost:8080', 'cyan');
  log('2. 远程模式需要网络能够访问 152.136.104.251', 'cyan');
  log('3. 可以通过环境变量自定义配置:', 'cyan');
  log('   export API_TOKEN=your_token', 'cyan');
  log('   export MCP_API_KEY=your_key', 'cyan');
  log('\n配置Claude Code连接MCP:', 'yellow');
  log('编辑 ~/.config/claude/mcp-servers.json:', 'cyan');
  log(JSON.stringify({
    "mcpServers": {
      "ai-proj": {
        "type": "sse",
        "url": "https://152.136.104.251/mcp/sse",
        "headers": {
          "X-API-Key": "mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06"
        }
      }
    }
  }, null, 2), 'cyan');
}

// 运行主函数
main().catch(error => {
  log(`\n✗ 程序错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
