const axios = require('axios');

const API_BASE_URL = 'http://localhost/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNCwidXNlcm5hbWUiOiJxaXVkbCIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6InFpdWRsIiwiZXhwIjoxNzU0MzYzMjkzLCJuYmYiOjE3NTM3NTg0OTMsImlhdCI6MTc1Mzc1ODQ5M30.xZnHnRtqRcg16y97Km_mahti45A3wa0_Sp5ZATA5YCI';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`
  },
});

// 模拟前端的响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('Raw response status:', response.status);
    console.log('Raw response data:', JSON.stringify(response.data, null, 2));
    return response.data;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.message);
    throw error;
  }
);

async function testGetTasks() {
  try {
    console.log('Testing getTasks API...');
    const response = await api.get('/projects/39/tasks', {
      params: { page: 1, page_size: 100 }
    });
    
    console.log('Intercepted response:', JSON.stringify(response, null, 2));
    console.log('Response success field:', response.success);
    console.log('Response data field exists:', !!response.data);
    
    // 模拟TaskService的逻辑
    if (!response || !response.success) {
      console.error('❌ Would fail: response or response.success is falsy');
      return;
    }
    
    if (!response.data) {
      console.log('⚠️  Would return empty data: response.data is falsy');
      return;
    }
    
    console.log('✅ Would succeed with data:', {
      taskCount: response.data.data?.length || 0,
      pagination: response.data.pagination
    });
    
  } catch (error) {
    console.error('❌ API call failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testGetTasks();
