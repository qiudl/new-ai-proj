/**
 * 测试跨页面计时器状态同步功能
 * 这个脚本模拟多个页面/标签页之间的计时器状态同步
 */

// 模拟localStorage storage事件
function simulateStorageEvent(key, oldValue, newValue) {
  const event = new StorageEvent('storage', {
    key: key,
    oldValue: oldValue,
    newValue: newValue,
    url: window.location.href,
    storageArea: localStorage
  });
  
  window.dispatchEvent(event);
  console.log('📡 模拟storage事件:', { key, oldValue, newValue });
}

// 测试用例1: 模拟启动计时器
function testStartTimer() {
  console.log('\n🟢 测试1: 启动计时器');
  
  const timerState = {
    isRunning: true,
    isPaused: false,
    taskId: 123,
    taskTitle: '测试任务',
    startTime: new Date().toISOString(),
    elapsedSeconds: 0,
    formattedTime: '00:00:00',
    lastSync: new Date().toISOString()
  };
  
  const oldValue = localStorage.getItem('globalTimerState');
  const newValue = JSON.stringify(timerState);
  
  localStorage.setItem('globalTimerState', newValue);
  simulateStorageEvent('globalTimerState', oldValue, newValue);
  
  return timerState;
}

// 测试用例2: 模拟暂停计时器
function testPauseTimer(currentState) {
  console.log('\n⏸️ 测试2: 暂停计时器');
  
  const pausedState = {
    ...currentState,
    isPaused: true,
    elapsedSeconds: 300, // 5分钟
    formattedTime: '00:05:00',
    lastSync: new Date().toISOString()
  };
  
  const oldValue = localStorage.getItem('globalTimerState');
  const newValue = JSON.stringify(pausedState);
  
  localStorage.setItem('globalTimerState', newValue);
  simulateStorageEvent('globalTimerState', oldValue, newValue);
  
  return pausedState;
}

// 测试用例3: 模拟恢复计时器
function testResumeTimer(currentState) {
  console.log('\n▶️ 测试3: 恢复计时器');
  
  const resumedState = {
    ...currentState,
    isPaused: false,
    lastSync: new Date().toISOString()
  };
  
  const oldValue = localStorage.getItem('globalTimerState');
  const newValue = JSON.stringify(resumedState);
  
  localStorage.setItem('globalTimerState', newValue);
  simulateStorageEvent('globalTimerState', oldValue, newValue);
  
  return resumedState;
}

// 测试用例4: 模拟停止计时器
function testStopTimer() {
  console.log('\n🔴 测试4: 停止计时器');
  
  const stoppedState = {
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    formattedTime: '00:00:00',
    lastSync: new Date().toISOString()
  };
  
  const oldValue = localStorage.getItem('globalTimerState');
  const newValue = JSON.stringify(stoppedState);
  
  localStorage.setItem('globalTimerState', newValue);
  simulateStorageEvent('globalTimerState', oldValue, newValue);
  
  return stoppedState;
}

// 测试用例5: 模拟清除localStorage
function testClearStorage() {
  console.log('\n🗑️ 测试5: 清除localStorage');
  
  const oldValue = localStorage.getItem('globalTimerState');
  localStorage.removeItem('globalTimerState');
  simulateStorageEvent('globalTimerState', oldValue, null);
}

// 监听storage事件（模拟TimerContext的行为）
function setupStorageListener() {
  console.log('🔧 设置storage事件监听器');
  
  window.addEventListener('storage', (event) => {
    if (event.key === 'globalTimerState') {
      console.log('📨 接收到storage事件:', {
        key: event.key,
        oldValue: event.oldValue ? JSON.parse(event.oldValue) : null,
        newValue: event.newValue ? JSON.parse(event.newValue) : null
      });
    }
  });
}

// 运行所有测试
function runTests() {
  console.log('🚀 开始跨页面同步测试\n');
  
  setupStorageListener();
  
  // 等待事件监听器设置完成
  setTimeout(() => {
    let state = testStartTimer();
    
    setTimeout(() => {
      state = testPauseTimer(state);
      
      setTimeout(() => {
        state = testResumeTimer(state);
        
        setTimeout(() => {
          testStopTimer();
          
          setTimeout(() => {
            testClearStorage();
            console.log('\n✅ 所有测试完成！');
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }, 100);
}

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
  console.log('📱 浏览器环境检测到，可以运行测试');
  console.log('💡 在开发者工具中运行 runTests() 来开始测试');
  
  // 导出到全局作用域
  window.runTests = runTests;
  window.testCrossPageSync = {
    testStartTimer,
    testPauseTimer, 
    testResumeTimer,
    testStopTimer,
    testClearStorage,
    setupStorageListener,
    runTests
  };
} else {
  console.log('📦 Node.js环境，跳过浏览器测试');
}

module.exports = {
  testStartTimer,
  testPauseTimer,
  testResumeTimer, 
  testStopTimer,
  testClearStorage,
  setupStorageListener,
  runTests
};