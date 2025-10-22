#!/usr/bin/env node

/**
 * 通过MCP SSE连接创建工作笔记
 *
 * 使用方法:
 *   node scripts/save-via-mcp-sse.js
 *
 * 要求:
 *   - Node.js 18+
 *   - 在受信任的网络环境中运行（IP白名单）
 */

const fs = require('fs');
const https = require('https');

// 配置
const MCP_BASE_URL = 'https://proj.joylodging.com/mcp';
const API_KEY = process.env.MCP_API_KEY || 'mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06';
const ANALYSIS_FILE = 'docs/work-notes-crud-analysis.md';

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(icon, message, color = '') {
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

// 读取文件内容
function readAnalysisFile() {
  try {
    if (!fs.existsSync(ANALYSIS_FILE)) {
      throw new Error(`文件不存在: ${ANALYSIS_FILE}`);
    }
    const content = fs.readFileSync(ANALYSIS_FILE, 'utf8');
    log('📖', `读取分析报告成功 (${content.length} 字符)`, colors.green);
    return content;
  } catch (error) {
    log('❌', `读取文件失败: ${error.message}`, colors.red);
    throw error;
  }
}

// 构造MCP请求
function createMCPRequest(content) {
  return {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'create_work_note',
      arguments: {
        title: '工作笔记模块CRUD功能检查报告',
        content: content,
        work_note_type: 'log',
        priority: 'high',
        description: '全面检查工作笔记模块的CRUD功能实现，发现17个问题并制定4阶段改进方案',
        tags: ['CRUD检查', '工作笔记', '技术分析', '改进方案', 'MCP创建'],
        visibility: 'team',
        is_pinned: true,
        is_bookmarked: true
      }
    }
  };
}

// 发送HTTP请求
function sendRequest(path, data, method = 'POST') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, MCP_BASE_URL);
    const payload = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) })
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

// 连接SSE流
function connectSSE() {
  return new Promise((resolve, reject) => {
    const url = new URL('/sse', MCP_BASE_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    };

    log('📡', '连接到SSE端点...', colors.cyan);

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', (chunk) => errorData += chunk);
        res.on('end', () => {
          reject(new Error(`SSE连接失败 (${res.statusCode}): ${errorData}`));
        });
        return;
      }

      log('✅', 'SSE连接已建立', colors.green);

      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString();

        // 处理SSE消息
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // 保留不完整的消息

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              handleSSEMessage(data);
            } catch (e) {
              console.error('解析SSE消息失败:', e.message);
            }
          }
        });
      });

      res.on('end', () => {
        log('🔌', 'SSE连接已关闭', colors.yellow);
      });

      // SSE连接成功，返回响应对象
      resolve(res);
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// 处理SSE消息
function handleSSEMessage(data) {
  console.log('📨 收到消息:', JSON.stringify(data, null, 2));
}

// 主函数
async function main() {
  console.log(`${colors.bright}${colors.cyan}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  通过MCP SSE创建工作笔记
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${colors.reset}`);

  try {
    // 1. 读取分析报告
    const content = readAnalysisFile();

    // 2. 测试健康检查
    log('🏥', '测试MCP健康检查...', colors.blue);
    try {
      const health = await sendRequest('/health', null, 'GET');
      log('✅', '健康检查通过', colors.green);
      console.log('   ', health);
    } catch (error) {
      log('⚠️', `健康检查失败: ${error.message}`, colors.yellow);
      log('💡', '继续尝试创建笔记...', colors.yellow);
    }

    // 3. 构造MCP请求
    const mcpRequest = createMCPRequest(content);
    log('🔧', `MCP请求已构造 (${JSON.stringify(mcpRequest).length} 字节)`, colors.blue);

    // 4. 发送到message端点
    log('📤', '发送创建请求...', colors.cyan);
    const response = await sendRequest('/message', mcpRequest);

    // 5. 处理响应
    if (response.result) {
      const noteId = response.result.id || response.result.note_id;
      log('✅', '工作笔记创建成功！', colors.green);
      console.log(`
${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 笔记信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
  ID:        ${noteId || '(未返回)'}
  标题:      工作笔记模块CRUD功能检查报告
  类型:      工作日志 (log)
  优先级:    高 (high)
  状态:      ✨ 已置顶 + 已收藏
${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

🔗 访问链接: ${colors.cyan}https://proj.joylodging.com/work-notes/${noteId}${colors.reset}
`);

      // 保存笔记ID
      if (noteId) {
        fs.writeFileSync('.last-created-note-id', noteId.toString());
        log('💾', '笔记ID已保存到 .last-created-note-id', colors.green);
      }

      process.exit(0);
    } else if (response.error) {
      log('❌', `创建失败: ${response.error.message || JSON.stringify(response.error)}`, colors.red);
      process.exit(1);
    } else {
      log('⚠️', '未知响应格式:', colors.yellow);
      console.log(response);
      process.exit(1);
    }

  } catch (error) {
    log('❌', `执行失败: ${error.message}`, colors.red);

    if (error.message.includes('Access denied') || error.message.includes('403')) {
      console.log(`
${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  访问被拒绝
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

可能的原因:
  1. IP地址不在白名单中
  2. API Key无效或已过期
  3. 需要额外的认证权限

建议:
  ${colors.cyan}在本地开发机器或服务器上运行此脚本${colors.reset}

备选方案:
  1. 使用 ./scripts/save-analysis-remote.sh (REST API方式)
  2. 使用浏览器控制台（参考 scripts/README-remote-save.md）
  3. 手动在Web界面创建笔记
`);
    }

    process.exit(1);
  }
}

// 运行
main();
