#!/usr/bin/env node
/**
 * 测试脚本：批量修改父任务功能优化验证
 * 验证搜索支持任务ID和保存状态修复
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8888/api/v1';

async function testTaskIdSearch() {
  console.log('🔍 测试任务ID搜索功能');
  console.log('====================');
  
  try {
    // 1. 先获取一些任务ID
    console.log('1. 获取任务列表...');
    const tasksResponse = await axios.get(`${API_BASE_URL}/projects/1/tasks`);
    const tasks = tasksResponse.data?.data || [];
    
    if (tasks.length === 0) {
      console.log('❌ 没有找到任务，无法进行测试');
      return;
    }
    
    const testTaskId = tasks[0].id;
    console.log(`✅ 找到测试任务ID