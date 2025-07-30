const axios = require('axios');

// 测试AI任务生成
async function testAIGenerate() {
  try {
    const response = await axios.post('http://localhost/api/v1/system/ai-tasks/generate', {
      provider: 'deepseek',
      input_text: '开发一个用户登录功能',
      project_id: 39,
      options: {
        max_tasks: 5,
        enable_duplicate_check: true,
        enable_dependency_analysis: false
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjozNCwidXNlcm5hbWUiOiJxaXVkbCIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6InFpdWRsIiwiZXhwIjoxNzU0NDEwODIzLCJuYmYiOjE3NTM4MDYwMjMsImlhdCI6MTc1MzgwNjAyM30.IwXv88SpLVuJyaoZJX91gE2oPCgMbiCTzzVpW0_VVg0'
      }
    });
    
    console.log('AI任务生成成功:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('AI任务生成失败:', error.response?.data || error.message);
  }
}

testAIGenerate();