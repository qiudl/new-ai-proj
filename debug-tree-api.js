#!/usr/bin/env node

// 调试任务树API的500错误
const axios = require('axios');

async function debugTreeAPI() {
  console.log('🔍 调试任务树API的500错误...\n');
  
  const baseURL = 'http://localhost:8080/api/v1';
  
  try {
    // 1. 登录获取token
    console.log('1. 登录获取token...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 测试不同的任务API端点
    console.log('\n2. 测试任务API端点...');
    
    // 2.1 测试基础任务列表
    console.log('\n2.1 测试基础任务列表 /projects/1/tasks');
    try {
      const tasksResponse = await axios.get(`${baseURL}/projects/1/tasks`, { headers });
      console.log('✅ 基础任务列表正常');
      console.log(`📊 返回任务数量: ${tasksResponse.data.data.data.length}`);
    } catch (error) {
      console.error('❌ 基础任务列表失败:', error.response?.status, error.response?.data);
    }
    
    // 2.2 测试任务树API
    console.log('\n2.2 测试任务树API /projects/1/tasks/tree');
    try {
      const treeResponse = await axios.get(`${baseURL}/projects/1/tasks/tree`, { headers });
      console.log('✅ 任务树API正常');
      console.log(`📊 返回数据:`, JSON.stringify(treeResponse.data, null, 2));
    } catch (error) {
      console.error('❌ 任务树API失败:');
      console.error('状态码:', error.response?.status);
      console.error('错误信息:', error.response?.data);
      console.error('错误详情:', error.message);
      
      // 尝试分析错误
      if (error.response?.status === 500) {
        console.log('\n🔍 500错误分析:');
        console.log('- 可能是数据库查询错误');
        console.log('- 可能是任务树构建逻辑问题');
        console.log('- 可能与parent_id修复后的数据不一致');
      }
    }
    
    // 2.3 测试根任务API
    console.log('\n2.3 测试根任务API /projects/1/tasks/root');
    try {
      const rootResponse = await axios.get(`${baseURL}/projects/1/tasks/root`, { headers });
      console.log('✅ 根任务API正常');
      console.log(`📊 返回根任务数量: ${rootResponse.data.data.length}`);
    } catch (error) {
      console.error('❌ 根任务API失败:', error.response?.status, error.response?.data);
    }
    
    // 3. 检查数据库中的任务数据一致性
    console.log('\n3. 检验数据一致性...');
    try {
      const allTasksResponse = await axios.get(`${baseURL}/projects/1/tasks?page_size=100`, { headers });
      const tasks = allTasksResponse.data.data.data;
      
      console.log('\n📋 数据一致性检查:');
      let inconsistentTasks = [];
      
      tasks.forEach(task => {
        // 检查parent_id和task_level的一致性
        if (task.parent_id && task.task_level === 0) {
          inconsistentTasks.push({
            id: task.id,
            title: task.title,
            parent_id: task.parent_id,
            task_level: task.task_level,
            issue: 'has parent_id but task_level is 0'
          });
        }
        
        if (!task.parent_id && task.task_level > 0) {
          inconsistentTasks.push({
            id: task.id,
            title: task.title,
            parent_id: task.parent_id,
            task_level: task.task_level,
            issue: 'no parent_id but task_level > 0'
          });
        }
      });
      
      if (inconsistentTasks.length > 0) {
        console.log('❌ 发现数据不一致问题:');
        inconsistentTasks.forEach(task => {
          console.log(`  - 任务#${task.id}: ${task.title}`);
          console.log(`    parent_id: ${task.parent_id}, task_level: ${task.task_level}`);
          console.log(`    问题: ${task.issue}`);
        });
      } else {
        console.log('✅ 任务数据一致性检查通过');
      }
      
      // 显示任务层级统计
      const levelStats = {};
      tasks.forEach(task => {
        const level = task.task_level || 0;
        levelStats[level] = (levelStats[level] || 0) + 1;
      });
      
      console.log('\n📊 任务层级统计:');
      Object.entries(levelStats).forEach(([level, count]) => {
        console.log(`  层级${level}: ${count}个任务`);
      });
      
    } catch (error) {
      console.error('❌ 数据一致性检查失败:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ 调试过程失败:', error.response?.data || error.message);
  }
}

debugTreeAPI();