#!/usr/bin/env node

// 测试新的任务详情页功能
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testTaskDetail() {
  console.log('🔍 测试新任务详情页数据获取...\n');
  
  const projectId = 1;
  const taskId = 31; // 使用已知存在的任务
  
  try {
    // 测试 1: 获取任务基本信息
    console.log('📋 测试 1: 获取任务基本信息');
    
    const taskOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/projects/${projectId}/tasks/${taskId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const taskResult = await makeRequest(taskOptions);
    if (taskResult.status === 200) {
      const task = taskResult.data?.data;
      console.log(`   ✅ 任务信息: "${task?.title}" (状态: ${task?.status})`);
      console.log(`   📅 创建时间: ${task?.created_at}`);
      console.log(`   🏷️  描述: ${task?.description || '无描述'}`);
      
      if (task?.due_date) {
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          console.log(`   ⚠️  截止时间: ${task.due_date} (已逾期 ${Math.abs(diffDays)} 天)`);
        } else if (diffDays <= 3) {
          console.log(`   🚨 截止时间: ${task.due_date} (${diffDays} 天后到期)`);
        } else {
          console.log(`   📆 截止时间: ${task.due_date} (${diffDays} 天后到期)`);
        }
      }
    } else {
      console.log('   ❌ 无法获取任务信息');
      return;
    }
    
    // 测试 2: 获取子任务信息
    console.log('\\n📋 测试 2: 获取子任务信息');
    
    const childrenOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/projects/${projectId}/tasks/${taskId}/children`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const childrenResult = await makeRequest(childrenOptions);
    if (childrenResult.status === 200) {
      const children = childrenResult.data || [];
      console.log(`   ✅ 找到 ${children.length} 个子任务`);
      
      if (children.length > 0) {
        const completedCount = children.filter(c => c.status === 'completed').length;
        const inProgressCount = children.filter(c => c.status === 'in_progress').length;
        const todoCount = children.filter(c => c.status === 'todo').length;
        const completionRate = Math.round((completedCount / children.length) * 100);
        
        console.log(`   📊 完成情况:`);
        console.log(`      🟢 已完成: ${completedCount}`);
        console.log(`      🔵 进行中: ${inProgressCount}`);
        console.log(`      ⚪ 待开始: ${todoCount}`);
        console.log(`      📈 完成率: ${completionRate}%`);
        
        // 显示前3个子任务
        console.log(`   📝 子任务列表:`);
        children.slice(0, 3).forEach((child, index) => {
          const statusIcon = child.status === 'completed' ? '✅' : 
                            child.status === 'in_progress' ? '🔄' : '⏸️';
          console.log(`      ${index + 1}. ${statusIcon} ${child.title} (${child.status})`);
        });
        
        if (children.length > 3) {
          console.log(`      ... 还有 ${children.length - 3} 个子任务`);
        }
      }
    } else {
      console.log('   ℹ️  该任务没有子任务');
    }
    
    // 测试 3: 获取更新历史
    console.log('\\n📋 测试 3: 获取更新历史');
    
    const updatesOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/projects/${projectId}/tasks/${taskId}/updates`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const updatesResult = await makeRequest(updatesOptions);
    if (updatesResult.status === 200) {
      const updates = updatesResult.data?.data || [];
      console.log(`   ✅ 找到 ${updates.length} 条更新记录`);
      
      // 显示最近的3条更新
      if (updates.length > 0) {
        console.log(`   📝 最近更新:`);
        updates.slice(0, 3).forEach((update, index) => {
          const date = new Date(update.created_at).toLocaleString('zh-CN');
          console.log(`      ${index + 1}. [${update.update_type}] ${date}`);
          if (update.notes) {
            console.log(`         备注: ${update.notes}`);
          }
        });
      }
    } else {
      console.log('   ℹ️  暂无更新历史');
    }
    
    // 测试 4: 获取时间线
    console.log('\\n📋 测试 4: 获取时间线');
    
    const timelineOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/projects/${projectId}/tasks/${taskId}/timeline`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const timelineResult = await makeRequest(timelineOptions);
    if (timelineResult.status === 200) {
      const timeline = timelineResult.data?.data || [];
      console.log(`   ✅ 找到 ${timeline.length} 个时间线事件`);
      
      if (timeline.length > 0) {
        console.log(`   📝 时间线事件:`);
        timeline.slice(0, 3).forEach((event, index) => {
          const date = new Date(event.created_at).toLocaleString('zh-CN');
          console.log(`      ${index + 1}. ${event.event_type} - ${date}`);
        });
      }
    } else {
      console.log('   ℹ️  暂无时间线数据');
    }
    
    console.log('\\n🎉 任务详情页数据测试完成！');
    console.log('\\n📋 新任务详情页设计要点:');
    console.log('   🎯 突出完成情况 - 圆形进度图和统计数字');
    console.log('   📊 可视化展示 - 状态图标和颜色编码');
    console.log('   📱 响应式布局 - 左右分栏，移动端自适应');
    console.log('   🔄 实时数据 - 并行加载所有相关数据');
    console.log('   ✨ 用户体验 - 无需Tab切换，所有信息一目了然');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testTaskDetail();