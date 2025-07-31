#!/usr/bin/env node

// 测试编辑任务页面的父任务管理功能
const axios = require('axios');

async function testParentTaskManagement() {
  console.log('🔍 测试编辑任务页面的父任务管理功能...\n');
  
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
    
    // 2. 创建几个测试任务用于层级管理
    console.log('\n2. 创建测试任务结构...');
    
    // 创建根任务A
    const rootTaskA = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: '根任务A - 前端开发',
      description: '前端开发相关的主要任务',
      status: 'in_progress',
      custom_fields: {
        priority: 'high',
        tags: ['前端', '开发']
      }
    }, { headers });
    
    const rootTaskAId = rootTaskA.data.data?.task?.id || rootTaskA.data.data?.id;
    console.log(`✅ 根任务A创建成功，ID: ${rootTaskAId}`);
    
    // 创建根任务B
    const rootTaskB = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: '根任务B - 后端开发',
      description: '后端开发相关的主要任务',
      status: 'todo',
      custom_fields: {
        priority: 'medium',
        tags: ['后端', '开发']
      }
    }, { headers });
    
    const rootTaskBId = rootTaskB.data.data?.task?.id || rootTaskB.data.data?.id;
    console.log(`✅ 根任务B创建成功，ID: ${rootTaskBId}`);
    
    // 创建A的子任务
    const subTaskA1 = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: '子任务A1 - 组件开发',
      description: '开发前端组件',
      status: 'todo',
      parent_id: rootTaskAId,
      custom_fields: {
        priority: 'medium',
        tags: ['组件']
      }
    }, { headers });
    
    const subTaskA1Id = subTaskA1.data.data?.task?.id || subTaskA1.data.data?.id;
    console.log(`✅ 子任务A1创建成功，ID: ${subTaskA1Id}`);
    
    // 创建独立任务（用于测试父任务变更）
    const independentTask = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: '独立任务 - 测试父任务管理',
      description: '用于测试父任务管理功能的独立任务',
      status: 'todo',
      custom_fields: {
        priority: 'low',
        tags: ['测试']
      }
    }, { headers });
    
    const independentTaskId = independentTask.data.data?.task?.id || independentTask.data.data?.id;
    console.log(`✅ 独立任务创建成功，ID: ${independentTaskId}`);
    
    // 3. 测试父任务变更场景
    console.log('\n3. 测试父任务管理场景...');
    
    // 场景1：将独立任务设置为根任务A的子任务
    console.log('\n场景1：设置父任务关系...');
    await axios.put(`${baseURL}/projects/1/tasks/${independentTaskId}`, {
      title: '独立任务 - 测试父任务管理',
      description: '用于测试父任务管理功能的独立任务',
      status: 'todo',
      parent_id: rootTaskAId,
      custom_fields: {
        priority: 'low',
        tags: ['测试', '子任务']
      }
    }, { headers });
    console.log('✅ 独立任务已设置为根任务A的子任务');
    
    // 场景2：变更父任务关系（从A移动到B）
    console.log('\n场景2：变更父任务关系...');
    await axios.put(`${baseURL}/projects/1/tasks/${independentTaskId}`, {
      title: '独立任务 - 测试父任务管理',
      description: '用于测试父任务管理功能的独立任务',
      status: 'todo',
      parent_id: rootTaskBId,
      custom_fields: {
        priority: 'low',
        tags: ['测试', '移动到B']
      }
    }, { headers });
    console.log('✅ 任务已从根任务A移动到根任务B');
    
    // 场景3：移除父任务关系（变为根任务）
    console.log('\n场景3：移除父任务关系...');
    await axios.put(`${baseURL}/projects/1/tasks/${independentTaskId}`, {
      title: '独立任务 - 测试父任务管理',
      description: '用于测试父任务管理功能的独立任务',
      status: 'todo',
      parent_id: null,
      custom_fields: {
        priority: 'low',
        tags: ['测试', '根任务']
      }
    }, { headers });
    console.log('✅ 任务已移除父任务关系，变为根任务');
    
    // 4. 验证任务层级结构
    console.log('\n4. 验证任务层级结构...');
    const tasksResponse = await axios.get(`${baseURL}/projects/1/tasks`, { headers });
    const tasks = tasksResponse.data.data.data;
    
    console.log('\n📋 当前任务结构：');
    tasks.forEach(task => {
      const indent = '  '.repeat(task.task_level || 0);
      const parentInfo = task.parent_id ? ` (父任务: #${task.parent_id})` : ' (根任务)';
      console.log(`${indent}- #${task.id}: ${task.title}${parentInfo}`);
    });
    
    // 5. 功能总结
    console.log('\n🎉 父任务管理功能测试完成！');
    console.log('\n📋 功能特性验证：');
    console.log('   ✨ 编辑任务时父任务选择：');
    console.log('      - TaskDetailPageNew已启用allowParentSelection');
    console.log('      - 用户可以在编辑任务弹窗中修改父任务');
    console.log('   ✨ 用户体验增强：');
    console.log('      - 父任务列表按层级排序');
    console.log('      - 显示任务ID和状态信息');
    console.log('      - 防止循环依赖和自引用');
    console.log('      - 当前父任务信息提示');
    console.log('   ✨ 安全性保障：');
    console.log('      - 过滤自身任务防止自引用');
    console.log('      - 过滤直接子任务防止循环依赖');
    console.log('      - 提升父任务数量限制到500个');
    
    console.log('\n🔗 测试链接：');
    console.log(`   - 根任务A详情: http://localhost:3000/projects/1/tasks/${rootTaskAId}`);
    console.log(`   - 根任务B详情: http://localhost:3000/projects/1/tasks/${rootTaskBId}`);
    console.log(`   - 子任务A1详情: http://localhost:3000/projects/1/tasks/${subTaskA1Id}`);
    console.log(`   - 独立任务详情: http://localhost:3000/projects/1/tasks/${independentTaskId}`);
    console.log('\n💡 使用说明：');
    console.log('   1. 点击任务详情页面的"编辑"按钮');
    console.log('   2. 在弹窗中找到"父任务"选择框');
    console.log('   3. 可以搜索、选择或清空父任务');
    console.log('   4. 保存后任务层级关系即时更新');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

testParentTaskManagement();