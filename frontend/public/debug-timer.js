// 手动测试定时器的调试脚本
// 在浏览器控制台中运行这个脚本来手动启动定时器

console.log('🔧 开始定时器调试...');

// 1. 检查TimerContext是否可用
try {
  // 获取React组件树
  const reactFiberNode = document.querySelector('#root')._reactInternalInstance || 
                         document.querySelector('#root')._reactInternals;
  
  if (reactFiberNode) {
    console.log('✅ React应用已挂载');
  }
  
  // 2. 检查localStorage中的定时器状态
  const savedTimerState = localStorage.getItem('globalTimerState');
  console.log('💾 保存的定时器状态:', savedTimerState ? JSON.parse(savedTimerState) : '无');
  
  // 3. 手动设置一个测试定时器状态
  const testTimerState = {
    isRunning: true,
    taskId: 999,
    taskTitle: "测试定时器任务",
    startTime: new Date().toISOString(),
    elapsedSeconds: 30,
    formattedTime: "00:00:30",
    lastSync: new Date().toISOString()
  };
  
  console.log('🧪 设置测试定时器状态...');
  localStorage.setItem('globalTimerState', JSON.stringify(testTimerState));
  
  // 4. 触发页面刷新以应用新状态
  console.log('🔄 刷新页面以应用状态...');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
  
} catch (error) {
  console.error('❌ 调试过程中出错:', error);
}

console.log(`
📝 调试步骤:
1. 运行此脚本
2. 页面刷新后查看右上角是否出现红色调试框
3. 如果出现调试框，检查其中的状态信息
4. 如果同时看到浮动定时器，说明功能正常
5. 如果只看到调试框而没有浮动定时器，说明FloatingTimer组件有问题
`);
