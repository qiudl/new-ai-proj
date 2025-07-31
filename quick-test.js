#!/usr/bin/env node

const axios = require('axios');

async function quickTest() {
  const baseURL = 'http://localhost:8080/api/v1';
  
  try {
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('测试数组格式的custom_fields...');
    const response = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: '测试任务 - 数组格式',
      description: '测试数组格式的custom_fields',
      status: 'todo',
      custom_fields: [null, { priority: 'high' }, { tags: ['test'] }]
    }, { headers });
    
    console.log('成功:', response.data);
    
  } catch (error) {
    console.log('错误状态码:', error.response?.status);
    console.log('错误详情:', error.response?.data);
    console.log('请求数据:', error.config?.data);
  }
}

quickTest();