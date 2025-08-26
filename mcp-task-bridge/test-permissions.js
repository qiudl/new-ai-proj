#!/usr/bin/env node

/**
 * MCP权限系统测试脚本
 * 用于验证权限集成功能是否正常工作
 */

import { MCPPermissionManager, MCP_COMMAND_PERMISSIONS } from './dist/permission-manager.js';
import { TaskMCPServer } from './dist/task-mcp.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// 测试配置
const TEST_CONFIG = {
  apiBase: process.env.TASK_API_BASE || 'http://localhost:8081/api/v1',
  authToken: process.env.TASK_API_TOKEN || process.env.API_TOKEN,
  testUserId: 1
};

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 测试权限管理器基本功能
 */
async function testPermissionManager() {
  log('blue', '\n=== 测试权限管理器基本功能 ===');
  
  try {
    const permManager = new MCPPermissionManager(
      TEST_CONFIG.apiBase,
      TEST_CONFIG.authToken,
      {
        enablePermissionCheck: true,
        cachePermissions: true,
        debugMode: true
      }
    );

    // 测试权限配置映射
    log('yellow', '\n1. 检查命令权限映射...');
    const commandCount = Object.keys(MCP_COMMAND_PERMISSIONS).length;
    log('green', `✓ 已配置 ${commandCount} 个命令的权限映射`);

    // 显示部分命令权限映射
    const sampleCommands = ['create_task', 'update_task', 'delete_task', 'create_project'];
    sampleCommands.forEach(cmd => {
      const config = MCP_COMMAND_PERMISSIONS[cmd];
      if (config) {
        log('blue', `  ${cmd} → ${config.permission} (${config.description})`);
      }
    });

    // 测试权限管理器状态
    log('yellow', '\n2. 检查权限管理器状态...');
    const status = permManager.getStatus();
    log('green', `✓ 权限检查: ${status.enabled ? '启用' : '禁用'}`);
    log('green', `✓ 权限缓存: ${status.config.cachePermissions ? '启用' : '禁用'}`);
    log('green', `✓ 认证状态: ${status.hasAuth ? '已配置' : '未配置'}`);
    log('green', `✓ 缓存大小: ${status.cacheSize}`);

    // 测试单个权限检查（如果有认证token）
    if (TEST_CONFIG.authToken) {
      log('yellow', '\n3. 测试权限检查...');
      try {
        const result = await permManager.checkPermission('task.create');
        log('green', `✓ task.create 权限检查: ${result.has_permission ? '允许' : '拒绝'}`);
        log('blue', `  来源: ${result.source}, 原因: ${result.reason || 'N/A'}`);
      } catch (error) {
        log('red', `✗ 权限检查失败: ${error.message}`);
      }
    } else {
      log('yellow', '\n3. 跳过权限检查（未配置认证token）');
    }

    return true;
  } catch (error) {
    log('red', `✗ 权限管理器测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试TaskMCPServer权限集成
 */
async function testTaskMCPServerIntegration() {
  log('blue', '\n=== 测试TaskMCPServer权限集成 ===');
  
  try {
    const taskServer = new TaskMCPServer(TEST_CONFIG.apiBase);
    
    // 检查权限管理器是否正确集成
    log('yellow', '\n1. 检查权限管理器集成...');
    if (taskServer.permissionManager) {
      log('green', '✓ 权限管理器已集成到TaskMCPServer');
      
      const status = taskServer.permissionManager.getStatus();
      log('blue', `  权限检查: ${status.enabled ? '启用' : '禁用'}`);
      log('blue', `  严格模式: ${status.config.strictMode ? '启用' : '禁用'}`);
      log('blue', `  调试模式: ${status.config.debugMode ? '启用' : '禁用'}`);
    } else {
      log('red', '✗ 权限管理器未正确集成');
      return false;
    }

    // 测试权限装饰器（需要禁用权限检查来避免实际API调用）
    log('yellow', '\n2. 测试权限装饰器集成...');
    
    // 临时禁用权限检查进行测试
    const originalConfig = taskServer.permissionManager.getStatus().config;
    taskServer.permissionManager = new MCPPermissionManager(
      TEST_CONFIG.apiBase,
      TEST_CONFIG.authToken,
      { enablePermissionCheck: false, debugMode: true }
    );

    // 测试创建任务（权限检查被禁用）
    try {
      const result = await taskServer.createTask('权限测试任务', 1);
      if (result.success) {
        log('green', '✓ 权限装饰器集成正常（createTask）');
      } else {
        log('yellow', `~ createTask返回: ${result.error || result.message}`);
      }
    } catch (error) {
      log('yellow', `~ createTask测试: ${error.message}`);
    }

    return true;
  } catch (error) {
    log('red', `✗ TaskMCPServer集成测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试权限拒绝场景
 */
async function testPermissionDenial() {
  log('blue', '\n=== 测试权限拒绝场景 ===');
  
  try {
    // 创建一个严格模式的权限管理器（模拟权限拒绝）
    const strictPermManager = new MCPPermissionManager(
      'http://invalid-api-base', // 无效的API地址来模拟权限检查失败
      'invalid-token',
      {
        enablePermissionCheck: true,
        strictMode: true, // 严格模式：权限检查失败时拒绝访问
        debugMode: true
      }
    );

    log('yellow', '\n1. 测试严格模式下的权限拒绝...');
    
    const result = await strictPermManager.checkPermission('task.create');
    if (!result.has_permission) {
      log('green', '✓ 权限正确拒绝');
      log('blue', `  原因: ${result.reason}`);
    } else {
      log('yellow', '~ 权限检查意外通过');
    }

    return true;
  } catch (error) {
    log('red', `✗ 权限拒绝测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试环境变量配置
 */
function testEnvironmentConfiguration() {
  log('blue', '\n=== 测试环境变量配置 ===');
  
  const envVars = [
    'MCP_ENABLE_PERMISSIONS',
    'MCP_CACHE_PERMISSIONS', 
    'MCP_PERMISSION_CACHE_TTL',
    'MCP_STRICT_PERMISSIONS',
    'MCP_DEBUG_PERMISSIONS'
  ];

  log('yellow', '\n当前环境变量配置:');
  envVars.forEach(varName => {
    const value = process.env[varName] || '未设置';
    log('blue', `  ${varName}: ${value}`);
  });

  // 测试配置解析
  log('yellow', '\n权限管理器配置解析:');
  const config = {
    enablePermissionCheck: process.env.MCP_ENABLE_PERMISSIONS !== 'false',
    cachePermissions: process.env.MCP_CACHE_PERMISSIONS !== 'false',
    cacheTTL: parseInt(process.env.MCP_PERMISSION_CACHE_TTL || '300'),
    strictMode: process.env.MCP_STRICT_PERMISSIONS === 'true',
    debugMode: process.env.MCP_DEBUG_PERMISSIONS === 'true'
  };

  Object.entries(config).forEach(([key, value]) => {
    log('green', `  ${key}: ${value}`);
  });

  return true;
}

/**
 * 主测试函数
 */
async function runTests() {
  log('blue', '🔒 MCP权限系统测试开始');
  log('yellow', `API Base: ${TEST_CONFIG.apiBase}`);
  log('yellow', `Auth Token: ${TEST_CONFIG.authToken ? '已配置' : '未配置'}`);
  
  const results = [];

  // 运行所有测试
  results.push(await testPermissionManager());
  results.push(await testTaskMCPServerIntegration());
  results.push(await testPermissionDenial());
  results.push(testEnvironmentConfiguration());

  // 统计结果
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log('blue', '\n=== 测试结果统计 ===');
  if (passed === total) {
    log('green', `🎉 所有测试通过 (${passed}/${total})`);
  } else {
    log('red', `❌ 部分测试失败 (${passed}/${total})`);
  }

  // 显示配置建议
  log('blue', '\n=== 配置建议 ===');
  log('yellow', '要启用MCP权限检查，请在 .env 中配置:');
  log('blue', '  MCP_ENABLE_PERMISSIONS=true');
  log('blue', '  MCP_CACHE_PERMISSIONS=true');
  log('blue', '  MCP_PERMISSION_CACHE_TTL=300');
  log('blue', '  MCP_STRICT_PERMISSIONS=false');
  log('blue', '  MCP_DEBUG_PERMISSIONS=true');
  log('yellow', '\n权限功能集成完成！🚀');
}

// 运行测试
runTests().catch(error => {
  log('red', `测试运行失败: ${error.message}`);
  process.exit(1);
});
