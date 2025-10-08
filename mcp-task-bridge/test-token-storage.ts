#!/usr/bin/env node
/**
 * Token持久化和加密存储功能测试
 * 测试TokenStorageManager和BaseClient的Token持久化功能
 */

import { TokenStorageManager, PersistedTokenData } from './token-storage.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

// 测试配置
const TEST_STORAGE_DIR = path.join(homedir(), '.mcp-task-bridge-test');
const TEST_ENCRYPTION_KEY = 'test-encryption-key-for-unit-testing-32bytes';

// 测试数据
const mockTokenData: PersistedTokenData = {
  accessToken: 'test_access_token_12345',
  refreshToken: 'test_refresh_token_67890',
  expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1小时后过期
  lastUpdate: new Date().toISOString()
};

/**
 * 清理测试环境
 */
function cleanup() {
  try {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
      console.log('✓ 测试环境已清理');
    }
  } catch (error: any) {
    console.error('清理测试环境失败:', error.message);
  }
}

/**
 * 测试1: 加密存储和加载Token
 */
async function testEncryptedStorage() {
  console.log('\n=== 测试1: 加密存储和加载Token ===');

  try {
    // 创建存储管理器（启用加密）
    const storage = new TokenStorageManager({
      storageDir: TEST_STORAGE_DIR,
      encryptionKey: TEST_ENCRYPTION_KEY,
      enableEncryption: true
    });

    console.log('1. 保存Token到加密存储...');
    await storage.saveToken(mockTokenData);

    console.log('2. 从加密存储加载Token...');
    const loadedData = await storage.loadToken();

    if (!loadedData) {
      throw new Error('加载Token失败：返回null');
    }

    // 验证数据
    console.log('3. 验证加载的数据...');
    if (loadedData.accessToken !== mockTokenData.accessToken) {
      throw new Error('accessToken不匹配');
    }
    if (loadedData.refreshToken !== mockTokenData.refreshToken) {
      throw new Error('refreshToken不匹配');
    }
    if (loadedData.expiresAt !== mockTokenData.expiresAt) {
      throw new Error('expiresAt不匹配');
    }

    console.log('✓ 加密存储和加载测试通过');

    // 验证文件确实被加密了（不是明文）
    const encryptedFile = path.join(TEST_STORAGE_DIR, 'token-storage.enc');
    const fileContent = fs.readFileSync(encryptedFile, 'utf-8');
    if (fileContent.includes('test_access_token')) {
      throw new Error('文件内容未加密（包含明文Token）');
    }

    console.log('✓ 文件加密验证通过');

    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试2: 不加密存储和加载Token
 */
async function testUnencryptedStorage() {
  console.log('\n=== 测试2: 不加密存储和加载Token ===');

  cleanup(); // 清理之前的测试

  try {
    // 创建存储管理器（禁用加密）
    const storage = new TokenStorageManager({
      storageDir: TEST_STORAGE_DIR,
      enableEncryption: false
    });

    console.log('1. 保存Token到不加密存储...');
    await storage.saveToken(mockTokenData);

    console.log('2. 从不加密存储加载Token...');
    const loadedData = await storage.loadToken();

    if (!loadedData) {
      throw new Error('加载Token失败：返回null');
    }

    // 验证数据
    console.log('3. 验证加载的数据...');
    if (loadedData.accessToken !== mockTokenData.accessToken) {
      throw new Error('accessToken不匹配');
    }

    console.log('✓ 不加密存储和加载测试通过');

    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试3: Token过期检查
 */
async function testTokenExpiration() {
  console.log('\n=== 测试3: Token过期检查 ===');

  try {
    const storage = new TokenStorageManager({
      storageDir: TEST_STORAGE_DIR,
      enableEncryption: true,
      encryptionKey: TEST_ENCRYPTION_KEY
    });

    // 创建已过期的Token
    const expiredTokenData: PersistedTokenData = {
      ...mockTokenData,
      expiresAt: new Date(Date.now() - 3600 * 1000).toISOString() // 1小时前过期
    };

    console.log('1. 检查已过期的Token...');
    const isExpired = storage.isTokenExpired(expiredTokenData);
    if (!isExpired) {
      throw new Error('过期检查失败：应该返回true');
    }
    console.log('✓ 已过期Token检测正确');

    // 检查未过期的Token
    console.log('2. 检查未过期的Token...');
    const notExpired = storage.isTokenExpired(mockTokenData);
    if (notExpired) {
      throw new Error('过期检查失败：应该返回false');
    }
    console.log('✓ 未过期Token检测正确');

    // 检查缓冲时间
    console.log('3. 检查缓冲时间机制...');
    const nearExpiryData: PersistedTokenData = {
      ...mockTokenData,
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString() // 30秒后过期
    };

    const shouldRefresh = storage.isTokenExpired(nearExpiryData, 60000); // 60秒缓冲
    if (!shouldRefresh) {
      throw new Error('缓冲时间检查失败：应该返回true');
    }
    console.log('✓ 缓冲时间机制检测正确');

    console.log('✓ Token过期检查测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试4: 清除持久化Token
 */
async function testClearToken() {
  console.log('\n=== 测试4: 清除持久化Token ===');

  try {
    const storage = new TokenStorageManager({
      storageDir: TEST_STORAGE_DIR,
      enableEncryption: true,
      encryptionKey: TEST_ENCRYPTION_KEY
    });

    // 先保存Token
    console.log('1. 保存Token...');
    await storage.saveToken(mockTokenData);

    // 验证文件存在
    const storageFile = storage.getStorageFilePath();
    if (!fs.existsSync(storageFile)) {
      throw new Error('Token文件未创建');
    }
    console.log('✓ Token文件已创建');

    // 清除Token
    console.log('2. 清除Token...');
    await storage.clearToken();

    // 验证文件已删除
    if (fs.existsSync(storageFile)) {
      throw new Error('Token文件未删除');
    }
    console.log('✓ Token文件已删除');

    // 尝试加载应该返回null
    console.log('3. 验证加载返回null...');
    const loadedData = await storage.loadToken();
    if (loadedData !== null) {
      throw new Error('清除后加载应该返回null');
    }
    console.log('✓ 清除后加载正确返回null');

    console.log('✓ 清除Token测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试5: 损坏文件处理
 */
async function testCorruptedFile() {
  console.log('\n=== 测试5: 损坏文件处理 ===');

  cleanup();

  try {
    const storage = new TokenStorageManager({
      storageDir: TEST_STORAGE_DIR,
      enableEncryption: true,
      encryptionKey: TEST_ENCRYPTION_KEY
    });

    // 创建一个损坏的文件
    console.log('1. 创建损坏的Token文件...');
    const storageFile = storage.getStorageFilePath();
    if (!fs.existsSync(TEST_STORAGE_DIR)) {
      fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(storageFile, 'corrupted-data-not-valid-base64!!!', 'utf-8');

    // 尝试加载应该处理错误并返回null
    console.log('2. 尝试加载损坏的文件...');
    const loadedData = await storage.loadToken();

    if (loadedData !== null) {
      throw new Error('损坏文件应该返回null');
    }
    console.log('✓ 损坏文件处理正确');

    // 验证损坏文件已被自动删除
    if (fs.existsSync(storageFile)) {
      throw new Error('损坏文件应该被自动删除');
    }
    console.log('✓ 损坏文件已自动删除');

    console.log('✓ 损坏文件处理测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Token持久化和加密存储功能测试                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const results: boolean[] = [];

  // 清理测试环境
  cleanup();

  // 运行所有测试
  results.push(await testEncryptedStorage());
  results.push(await testUnencryptedStorage());
  results.push(await testTokenExpiration());
  results.push(await testClearToken());
  results.push(await testCorruptedFile());

  // 清理测试环境
  cleanup();

  // 汇总结果
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   测试结果汇总                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log(`总测试数: ${results.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);

  if (failed === 0) {
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n✗ 部分测试失败');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  cleanup();
  process.exit(1);
});
