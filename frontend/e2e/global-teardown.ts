import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 全局测试环境清理
 * 在所有测试运行后执行一次
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始E2E测试环境清理...');

  try {
    // 清理临时认证文件
    const authDir = path.join(__dirname, 'auth');
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir);
      for (const file of files) {
        if (file.endsWith('-storage-state.json')) {
          const filePath = path.join(authDir, file);
          fs.unlinkSync(filePath);
          console.log(`🗑️ 已删除临时认证文件: ${file}`);
        }
      }
    }

    // 生成测试报告摘要
    const resultsPath = 'e2e-results.json';
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
      const { stats } = results;
      
      console.log('\n📊 E2E测试结果摘要:');
      console.log(`✅ 通过: ${stats.passed}`);
      console.log(`❌ 失败: ${stats.failed}`);
      console.log(`⏭️ 跳过: ${stats.skipped}`);
      console.log(`⏱️ 总耗时: ${stats.duration}ms`);
      
      // 检查是否有失败的测试
      if (stats.failed > 0) {
        console.warn('⚠️ 存在失败的E2E测试，请查看详细报告');
      }
    }

    console.log('✅ E2E测试环境清理完成');

  } catch (error) {
    console.error('❌ 全局清理失败:', error);
  }
}

export default globalTeardown;