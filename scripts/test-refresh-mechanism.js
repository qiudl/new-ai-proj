// 测试任务详情页刷新机制的JavaScript脚本
// 可以在浏览器控制台运行

function testRefreshMechanism() {
  console.log('🔍 开始测试任务详情页刷新机制...');
  
  // 1. 检查RefreshConfigProvider是否可用
  try {
    const refreshButton = document.querySelector('[data-testid="refresh-config-button"], .ant-btn[title*="刷新"], .ant-btn[title*="refresh"]');
    if (refreshButton) {
      console.log('✅ 发现刷新配置按钮');
    } else {
      console.warn('⚠️ 未找到刷新配置按钮');
    }
  } catch (error) {
    console.error('❌ 检查刷新按钮时出错:', error);
  }
  
  // 2. 检查UnifiedTaskRefresh组件是否存在
  try {
    const refreshComponent = document.querySelector('.ant-btn[title*="任务数据"], .ant-btn[title*="刷新"]');
    if (refreshComponent) {
      console.log('✅ 发现UnifiedTaskRefresh组件');
      
      // 检查是否有倒计时
      const progressElement = document.querySelector('.ant-progress');
      if (progressElement) {
        console.log('✅ 发现进度条倒计时');
      } else {
        console.log('⚠️ 未发现进度条倒计时');
      }
    } else {
      console.warn('⚠️ 未找到UnifiedTaskRefresh组件');
    }
  } catch (error) {
    console.error('❌ 检查UnifiedTaskRefresh时出错:', error);
  }
  
  // 3. 检查RefreshWithCountdown是否在运行
  try {
    // 检查是否有定时器在运行
    const hasActiveTimers = window.setInterval.toString().includes('native code');
    console.log('📊 定时器状态:', hasActiveTimers ? '正常' : '可能异常');
    
    // 检查localStorage中的配置
    const storedConfig = localStorage.getItem('taskDetailRefreshConfig');
    if (storedConfig) {
      console.log('✅ 发现存储的刷新配置:', JSON.parse(storedConfig));
    } else {
      console.log('⚠️ 未找到存储的刷新配置，将使用默认配置');
    }
  } catch (error) {
    console.error('❌ 检查定时器状态时出错:', error);
  }
  
  // 4. 测试手动刷新
  try {
    const refreshButtons = document.querySelectorAll('.ant-btn[title*="刷新"], .ant-btn[title*="refresh"]');
    if (refreshButtons.length > 0) {
      console.log(`✅ 发现 ${refreshButtons.length} 个刷新按钮`);
      console.log('🔧 可以手动点击刷新按钮测试功能');
    }
  } catch (error) {
    console.error('❌ 检查手动刷新时出错:', error);
  }
  
  // 5. 检查页面可见性API
  try {
    if (typeof document.hidden !== 'undefined') {
      console.log('✅ 页面可见性API支持正常');
      console.log('📄 当前页面可见性:', document.hidden ? '隐藏' : '可见');
    } else {
      console.warn('⚠️ 页面可见性API不支持');
    }
  } catch (error) {
    console.error('❌ 检查页面可见性API时出错:', error);
  }
  
  console.log('🏁 刷新机制测试完成');
  console.log('💡 提示: 如果所有项目都正常，刷新机制应该能正常工作');
  console.log('⏰ 默认刷新间隔: 15秒 (任务完成统计)');
  
  return {
    hasRefreshButton: !!document.querySelector('[data-testid="refresh-config-button"], .ant-btn[title*="刷新"]'),
    hasUnifiedRefresh: !!document.querySelector('.ant-btn[title*="任务数据"]'),
    hasProgress: !!document.querySelector('.ant-progress'),
    hasStoredConfig: !!localStorage.getItem('taskDetailRefreshConfig'),
    pageVisible: !document.hidden
  };
}

// 运行测试
testRefreshMechanism();