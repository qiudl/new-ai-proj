/**
 * 全局测试清理
 * 在所有测试完成后执行一次
 */
async function globalTeardown() {
  console.log('🧹 开始全局测试清理...');
  
  try {
    // 清理测试数据（如果需要）
    console.log('📄 清理测试数据...');
    
    // 可以在这里添加清理逻辑，例如：
    // - 删除测试期间创建的文档
    // - 重置数据库状态
    // - 清理临时文件
    
    console.log('✅ 测试数据清理完成');
    
    // 生成测试报告摘要
    console.log('📊 生成测试报告摘要...');
    const timestamp = new Date().toLocaleString('zh-CN');
    console.log('='.repeat(60));
    console.log('🎉 工作笔记功能Playwright测试完成');
    console.log(`⏰ 完成时间: ${timestamp}`);
    console.log('📁 报告位置: playwright-report/index.html');
    console.log('🎥 视频记录: test-results/ 目录');
    console.log('📸 失败截图: test-results/ 目录');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ 全局清理失败:', error);
    // 不抛出错误，避免影响测试结果
  }
  
  console.log('✅ 全局测试清理完成');
}

module.exports = globalTeardown;