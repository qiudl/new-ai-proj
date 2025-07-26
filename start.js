#!/usr/bin/env node

/**
 * AI任务管理系统 - 快速启动脚本
 * Quick Start Script for AI Task Management System
 */

const { execSync } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function showWelcome() {
  colorLog('bright', '🎉 欢迎使用AI任务管理系统！');
  colorLog('bright', '='.repeat(50));
  colorLog('cyan', '📋 已整合的功能工具:');
  colorLog('white', '  📊 统一测试套件 - 完整功能测试');
  colorLog('white', '  🔧 调试工具集 - 问题诊断和调试');
  colorLog('white', '  🎬 演示套件 - 系统功能展示');
  colorLog('white', '  🛠️ 维护工具集 - 系统维护和修复');
  colorLog('white', '  ✅ 验证工具集 - 系统完整性验证');
  colorLog('bright', '='.repeat(50));
}

function quickStart() {
  showWelcome();
  
  colorLog('blue', '\n🚀 快速开始选项:');
  colorLog('white', '  1. 启动脚本管理器 (交互模式)');
  colorLog('white', '  2. 运行系统验证');
  colorLog('white', '  3. 运行完整测试');
  colorLog('white', '  4. 启动调试工具');
  colorLog('white', '  5. 查看帮助');
  colorLog('white', '  q. 退出');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n请选择 (1-5 或 q): ', (answer) => {
    rl.close();
    
    const choice = answer.trim();
    
    try {
      switch (choice) {
        case '1':
          colorLog('cyan', '🎛️ 启动脚本管理器...');
          execSync('node scripts/script-manager.js', { stdio: 'inherit' });
          break;
        case '2':
          colorLog('cyan', '✅ 运行系统验证...');
          execSync('node scripts/validation/validation-toolkit.js', { stdio: 'inherit' });
          break;
        case '3':
          colorLog('cyan', '🧪 运行完整测试...');
          execSync('node scripts/testing/unified-test-suite.js', { stdio: 'inherit' });
          break;
        case '4':
          colorLog('cyan', '🔧 启动调试工具...');
          execSync('node scripts/debugging/debug-toolkit.js', { stdio: 'inherit' });
          break;
        case '5':
          showHelp();
          break;
        case 'q':
          colorLog('green', '👋 再见！');
          break;
        default:
          colorLog('red', '❌ 无效选择');
          break;
      }
    } catch (error) {
      colorLog('red', `❌ 执行错误: ${error.message}`);
    }
  });
}

function showHelp() {
  console.log(`
AI任务管理系统 - 脚本使用指南
===============================

🎯 主要工具:

1. 脚本管理器 (Script Manager)
   命令: node scripts/script-manager.js
   功能: 统一管理所有脚本，提供交互式界面

2. 测试套件 (Testing Suite)  
   命令: node scripts/testing/unified-test-suite.js
   功能: 运行完整的功能测试，包括API、用户系统、计时器等

3. 调试工具 (Debug Toolkit)
   命令: node scripts/debugging/debug-toolkit.js
   功能: 诊断系统问题，检查服务状态，生成调试脚本

4. 演示套件 (Demo Suite)
   命令: bash scripts/demos/demo-suite.sh
   功能: 展示系统功能，包括API演示、功能展示等

5. 维护工具 (Maintenance Toolkit)
   命令: bash scripts/maintenance/maintenance-toolkit.sh
   功能: 系统维护，修复问题，清理环境

6. 验证工具 (Validation Toolkit)
   命令: node scripts/validation/validation-toolkit.js
   功能: 验证系统完整性，检查配置和依赖

📁 文件结构:
scripts/
├── script-manager.js          # 主管理器
├── testing/
│   └── unified-test-suite.js  # 统一测试套件
├── debugging/
│   └── debug-toolkit.js       # 调试工具集
├── demos/
│   └── demo-suite.sh          # 演示套件
├── maintenance/
│   └── maintenance-toolkit.sh # 维护工具集
└── validation/
    └── validation-toolkit.js  # 验证工具集

🔧 常用命令:
- node start.js                # 快速启动 (当前脚本)
- node scripts/script-manager.js  # 脚本管理器
- node scripts/script-manager.js --help  # 查看帮助
- node scripts/script-manager.js testing # 直接运行测试
- node scripts/script-manager.js --all   # 运行所有脚本

💡 提示:
- 所有原始脚本已备份到 backups/original-scripts/
- 每个工具都支持 --help 参数查看详细帮助
- 建议先运行验证工具检查系统状态
  `);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    quickStart();
  }
}
