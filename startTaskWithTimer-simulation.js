#!/usr/bin/env node

/**
 * startTaskWithTimer 一体化接口模拟测试
 * 基于修复后的代码逻辑模拟执行效果
 */

const axios = require('axios').default;

const API_BASE = 'http://localhost:8081/api/v1';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5MSwidXNlcm5hbWUiOiJndW95bSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6Imd1b3ltIiwiZXhwIjoxNzU3MjEwMjU5LCJuYmYiOjE3NTY2MDU0NTksImlhdCI6MTc1NjYwNTQ1OSwianRpIjoiZTZhMDMyZDQ4NTQ0ZWFmYzA4YWJlNjUwNWUwYTA5ZTYifQ.Qzl3gnjQBeVR4GrjsnwDrqsJOH9n5vU-RSHlWbytf08';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * 模拟修复后的 startTaskWithTimer 一体化接口
 * @param {number|string} taskIdOrTitle - 任务ID或任务标题
 * @param {string} timerDescription - 计时器描述
 */
async function simulateStartTaskWithTimer(taskIdOrTitle, timerDescription) {
  console.log('🚀 开始执行一体化 startTaskWithTimer 接口...');
  console.log(`📋 输入参数: taskIdOrTitle=${taskIdOrTitle}, timerDescription="${timerDescription}"`);
  
  let taskId;
  
  try {
    // Step 1: 处理 taskIdOrTitle (模拟修复后的逻辑)
    if (typeof taskIdOrTitle === 'string') {
      console.log('🔍 检测到字符串输入，执行模糊匹配...');
      
      // 模拟通过 findTaskByName 查找任务
      const response = await axios.get(`${API_BASE}/projects/1/tasks`, { 
        headers,
        params: { search: taskIdOrTitle }
      });
      
      if (!response.data.success || !response.data.data || response.data.data.length === 0) {
        return {
          success: false,
          error: `找不到匹配标题 "${taskIdOrTitle}" 的任务`
        };
      }
      
      taskId = response.data.data[0].id;
      console.log(`✅ 找到匹配任务: ID=${taskId}, 标题="${response.data.data[0].title}"`);
    } else {
      taskId = taskIdOrTitle;
      console.log(`✅ 直接使用任务ID: ${taskId}`);
    }
    
    console.log('⏱️ 开始执行一体化操作...');
    const startTime = Date.now();
    
    // Step 2: 启动任务 (对应修复后的 this.startTask)
    console.log('📝 第1步: 启动任务...');
    const startResult = await axios.put(`${API_BASE}/projects/1/tasks/${taskId}`, {
      status: 'in_progress'
    }, { headers });
    
    if (!startResult.data.success) {
      return {
        success: false,
        error: '启动任务失败',
        details: startResult.data
      };
    }
    console.log('✅ 任务启动成功');
    
    // Step 3: 开始计时 (对应修复后的 this.startTimer)
    console.log('⏰ 第2步: 开始计时...');
    const timerResult = await axios.post(`${API_BASE}/user/timer/start`, {
      task_id: taskId,
      title: `任务${taskId}计时`,
      description: timerDescription || '一体化接口自动创建'
    }, { headers });
    
    if (!timerResult.data.success) {
      return {
        success: false,
        error: '开始计时失败',
        details: timerResult.data
      };
    }
    console.log('✅ 计时器启动成功');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 返回一体化结果
    const result = {
      success: true,
      task_id: taskId,
      task_result: startResult.data,
      timer_result: timerResult.data,
      performance: {
        total_duration_ms: duration,
        operations_count: 2,
        average_operation_ms: duration / 2
      },
      message: `🚀 任务 ${taskId} 已启动并开始计时`
    };
    
    console.log('🎉 一体化操作完成！');
    console.log(`⚡ 总耗时: ${duration}ms (平均每操作 ${duration/2}ms)`);
    
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: `启动任务和计时失败: ${error.message || error}`
    };
  }
}

/**
 * 执行验证测试
 */
async function runVerificationTest() {
  console.log('=' .repeat(80));
  console.log('🧪 startTaskWithTimer 一体化接口模拟验证测试');
  console.log('=' .repeat(80));
  
  // 测试1: 使用任务ID
  console.log('\n📊 测试1: 使用数字任务ID');
  console.log('-'.repeat(50));
  const result1 = await simulateStartTaskWithTimer(1038, '数字ID测试 - 一体化接口');
  console.log('📋 结果1:', JSON.stringify(result1, null, 2));
  
  // 停止计时器为下一个测试做准备
  if (result1.success && result1.timer_result && result1.timer_result.timer_id) {
    console.log(`⏹️ 停止计时器 ${result1.timer_result.timer_id}...`);
    try {
      await axios.post(`${API_BASE}/user/timer/${result1.timer_result.timer_id}/stop`, {}, { headers });
      console.log('✅ 计时器已停止');
    } catch (e) {
      console.log('⚠️ 停止计时器失败:', e.message);
    }
  }
  
  // 测试2: 使用任务标题模糊匹配
  console.log('\n📊 测试2: 使用字符串标题模糊匹配');
  console.log('-'.repeat(50));
  const result2 = await simulateStartTaskWithTimer('一体化接口', '字符串匹配测试 - 一体化接口');
  console.log('📋 结果2:', JSON.stringify(result2, null, 2));
  
  // 性能对比
  console.log('\n📈 性能对比分析');
  console.log('-'.repeat(50));
  
  if (result1.success && result1.performance) {
    console.log(`✅ 一体化接口耗时: ${result1.performance.total_duration_ms}ms`);
    console.log(`📊 操作数量: ${result1.performance.operations_count} (封装在1个接口内)`);
    console.log(`⚡ 平均每操作: ${result1.performance.average_operation_ms.toFixed(1)}ms`);
  }
  
  console.log('\n🎯 对比传统分步操作:');
  console.log('   传统方式: 2个独立API调用 + 用户等待时间');
  console.log('   一体化方式: 1个API调用 (内部自动完成2个操作)');
  console.log('   用户体验: 操作步骤减少50%, 无需等待中间结果');
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 验证测试完成！');
  console.log('='.repeat(80));
}

// 执行测试
if (require.main === module) {
  runVerificationTest().catch(console.error);
}

module.exports = { simulateStartTaskWithTimer };