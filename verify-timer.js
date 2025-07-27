#!/usr/bin/env node

/**
 * 定时器功能验证脚本
 * 检查定时器组件是否正确集成到应用中
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 正在检查定时器功能集成状态...\n');

const checks = [];

// 检查 FloatingTimer 组件是否存在
const floatingTimerPath = path.join(__dirname, 'frontend/src/components/FloatingTimer/index.tsx');
if (fs.existsSync(floatingTimerPath)) {
  checks.push('✅ FloatingTimer 组件文件存在');
} else {
  checks.push('❌ FloatingTimer 组件文件不存在');
}

// 检查 CSS 文件是否存在
const floatingTimerCSSPath = path.join(__dirname, 'frontend/src/components/FloatingTimer/FloatingTimer.css');
if (fs.existsSync(floatingTimerCSSPath)) {
  checks.push('✅ FloatingTimer CSS 文件存在');
} else {
  checks.push('❌ FloatingTimer CSS 文件不存在');
}

// 检查 TimerContext 是否存在
const timerContextPath = path.join(__dirname, 'frontend/src/contexts/TimerContext.tsx');
if (fs.existsSync(timerContextPath)) {
  checks.push('✅ TimerContext 文件存在');
} else {
  checks.push('❌ TimerContext 文件不存在');
}

// 检查 App.tsx 中的集成
const appPath = path.join(__dirname, 'frontend/src/App.tsx');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  if (appContent.includes('import FloatingTimer')) {
    checks.push('✅ App.tsx 中正确导入 FloatingTimer');
  } else {
    checks.push('❌ App.tsx 中未导入 FloatingTimer');
  }
  
  if (appContent.includes('<FloatingTimer')) {
    checks.push('✅ App.tsx 中正确使用 FloatingTimer 组件');
  } else {
    checks.push('❌ App.tsx 中未使用 FloatingTimer 组件');
  }
  
  if (appContent.includes('TimerProvider')) {
    checks.push('✅ App.tsx 中正确集成 TimerProvider');
  } else {
    checks.push('❌ App.tsx 中未集成 TimerProvider');
  }
} else {
  checks.push('❌ App.tsx 文件不存在');
}

// 检查 timerService 是否存在
const timerServicePath = path.join(__dirname, 'frontend/src/services/timerService.ts');
if (fs.existsSync(timerServicePath)) {
  checks.push('✅ timerService 文件存在');
} else {
  checks.push('❌ timerService 文件不存在');
}

// 输出检查结果
console.log('📋 检查结果:');
checks.forEach(check => console.log(`  ${check}`));

// 统计
const passed = checks.filter(check => check.startsWith('✅')).length;
const total = checks.length;

console.log(`\n📊 检查统计: ${passed}/${total} 项通过`);

if (passed === total) {
  console.log('\n🎉 所有检查通过！定时器功能已正确集成。');
  console.log('\n📝 接下来的验证步骤:');
  console.log('1. 启动前端项目: cd frontend && npm start');
  console.log('2. 在任务页面启动一个定时器');
  console.log('3. 确认浮动定时器窗口出现');
  console.log('4. 测试拖拽、最小化等功能');
  console.log('5. 切换页面确认定时器始终可见');
} else {
  console.log('\n⚠️  发现问题，请检查缺失的组件或配置。');
}

console.log('\n🔧 如需查看详细的定时器功能文档，请查看项目中的 timer-test-plan.md 文件。');
