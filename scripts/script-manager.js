#!/usr/bin/env node

/**
 * 统一脚本管理器 - Script Manager
 * 提供所有合并后脚本的统一入口
 * 
 * 管理的脚本集:
 * - 测试套件 (Testing Suite)
 * - 调试工具 (Debug Toolkit)  
 * - 演示套件 (Demo Suite)
 * - 维护工具 (Maintenance Toolkit)
 * - 验证工具 (Validation Toolkit)
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// 全局配置
// =============================================================================

const SCRIPT_CONFIG = {
  testing: {
    path: 'scripts/testing/unified-test-suite.js',
    description: '运行完整的功能测试套件',
    type: 'node'
  },
  debug: {
    path: 'scripts/debugging/debug-toolkit.js', 
    description: '启动调试工具集',
    type: 'node'
  },
  demo: {
    path: 'scripts/demos/demo-suite.sh',
    description: '运行系统功能演示',
    type: 'bash'
  },
  maintenance: {
    path: 'scripts/maintenance/maintenance-toolkit.sh',
    description: '执行系统维护任务',
    type: 'bash'
  },
  validation: {
    path: 'scripts/validation/validation-toolkit.js',
    description: '验证系统完整性',
    type: 'node'
  }
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// =============================================================================
// 工具函数
// =============================================================================

function checkScriptExists(scriptPath) {
  return fs.existsSync(scriptPath);
}

function makeExecutable(scriptPath) {
  if (scriptPath.endsWith('.sh')) {
    try {
      execSync(`chmod +x ${scriptPath}`);
      return true;
    } catch (error) {
      return false;
    }
  }
  return true;
}

function runScript(scriptKey, args = []) {
  const script = SCRIPT_CONFIG[scriptKey];
  if (!script) {
    colorLog('red', `❌ 未知脚本: ${scriptKey}`);
    return false;
  }

  if (!checkScriptExists(script.path)) {
    colorLog('red', `❌ 脚本文件不存在: ${script.path}`);
    return false;
  }

  colorLog('cyan', `🚀 启动 ${script.description}...`);
  colorLog('blue', `📁 执行: ${script.path}`);

  try {
    let command, cmdArgs;
    
    if (script.type === 'node') {
      command = 'node';
      cmdArgs = [script.path, ...args];
    } else if (script.type === 'bash') {
      if (!makeExecutable(script.path)) {
        colorLog('yellow', '⚠️ 无法设置脚本执行权限');
      }
      command = 'bash';
      cmdArgs = [script.path, ...args];
    } else {
      colorLog('red', `❌ 不支持的脚本类型: ${script.type}`);
      return false;
    }

    const child = spawn(command, cmdArgs, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        colorLog('green', `✅ ${script.description} 执行完成`);
      } else {
        colorLog('red', `❌ ${script.description} 执行失败 (退出码: ${code})`);
      }
    });

    child.on('error', (error) => {
      colorLog('red', `❌ 执行错误: ${error.message}`);
    });

    return true;

  } catch (error) {
    colorLog('red', `❌ 启动失败: ${error.message}`);
    return false;
  }
}

function showScriptStatus() {
  colorLog('cyan', '\n📊 脚本状态检查');
  colorLog('cyan', '-'.repeat(40));
  
  Object.entries(SCRIPT_CONFIG).forEach(([key, config]) => {
    const exists = checkScriptExists(config.path);
    const status = exists ? '✅ 可用' : '❌ 缺失';
    const color = exists ? 'green' : 'red';
    
    colorLog(color, `${key.padEnd(12)} ${status}`);
    colorLog('white', `             路径: ${config.path}`);
    
    if (exists) {
      try {
        const stats = fs.statSync(config.path);
        const size = (stats.size / 1024).toFixed(1);
        const modified = stats.mtime.toLocaleDateString();
        colorLog('blue', `             大小: ${size}KB, 修改: ${modified}`);
      } catch (error) {
        colorLog('yellow', `             无法获取文件信息`);
      }
    }
    console.log();
  });
}

function listScripts() {
  colorLog('cyan', '\n📋 可用脚本列表');
  colorLog('cyan', '-'.repeat(40));
  
  Object.entries(SCRIPT_CONFIG).forEach(([key, config]) => {
    const exists = checkScriptExists(config.path);
    const status = exists ? '✅' : '❌';
    
    colorLog('white', `${key.padEnd(12)} ${status} ${config.description}`);
    colorLog('blue', `             ${config.path}`);
    console.log();
  });
}

function showHelp() {
  console.log(`
AI任务管理系统 - 脚本管理器

使用方法: 
  node script-manager.js [选项] [脚本名称] [脚本参数...]

选项:
  --help, -h           显示帮助信息
  --list, -l           列出所有可用脚本
  --status, -s         显示脚本状态
  --all, -a            运行所有脚本
  --clean, -c          清理环境
  --interactive, -i    启动交互模式 (默认)

脚本名称:
  testing              运行测试套件
  debug                启动调试工具
  demo                 运行演示
  maintenance          执行维护
  validation           验证系统

示例:
  node script-manager.js                    # 交互模式
  node script-manager.js testing            # 运行测试套件
  node script-manager.js debug --api        # 调试API功能
  node script-manager.js --all              # 运行所有脚本
  node script-manager.js --clean            # 清理环境

脚本参数会直接传递给对应的脚本。
  `);
}

// =============================================================================
// 主程序入口
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  
  // 处理命令行参数
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--list') || args.includes('-l')) {
    listScripts();
    return;
  }
  
  if (args.includes('--status') || args.includes('-s')) {
    showScriptStatus();
    return;
  }
  
  // 检查是否指定了特定脚本
  const scriptArg = args.find(arg => !arg.startsWith('--'));
  if (scriptArg && SCRIPT_CONFIG[scriptArg]) {
    const scriptArgs = args.slice(args.indexOf(scriptArg) + 1);
    runScript(scriptArg, scriptArgs);
    return;
  }
  
  // 默认启动交互模式
  colorLog('blue', '\n💡 启动交互模式...');
  colorLog('white', '使用 --help 查看更多选项');
  showScriptStatus();
}

// 启动主程序
if (require.main === module) {
  main();
}

module.exports = {
  runScript,
  showScriptStatus,
  listScripts,
  SCRIPT_CONFIG
};
