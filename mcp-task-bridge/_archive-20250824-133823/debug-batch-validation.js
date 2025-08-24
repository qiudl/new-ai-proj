#!/usr/bin/env node

/**
 * 调试批量验证API响应
 */

import axios from 'axios';

const API_BASE = 'http://localhost';
const PROJECT_ID = 1;

let authToken = '';

// 获取认证令牌
async function authenticate() {
  try {
    const response = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      return true;
    }
  } catch (error) {
    console.log('认证失败:', error.message);
    return false;
  }
}

// 调试批量预览API
async function debugBatchValidation() {
  console.log('🔍 调试批量预览验证API响应');
  console.log('============================');
  
  const testCases = [
    {
      name: '简单测试场景',
      taskIds: [536],
      newParentId: 535
    },
    {
      name: '移动到root级别',
      taskIds: [536],
      newParentId: null
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 测试: ${testCase.name}`);
    console.log(`   任务IDs: [${testCase.taskIds.join(', ')}]`);
    console.log(`   新父任务ID: ${testCase.newParentId || 'null (root level)'}`);
    
    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/projects/${PROJECT_ID}/tasks/batch/preview`,
        {
          task_ids: testCase.taskIds,
          new_parent_id: testCase.newParentId
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      console.log('   📊 完整API响应:');
      console.log('   ', JSON.stringify(response.data, null, 4));
      
    } catch (error) {
      console.log('   ❌ API调用失败:');
      console.log('   ', error.response?.data || error.message);
    }
  }
}

async function main() {
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('认证失败，退出');
    process.exit(1);
  }
  
  await debugBatchValidation();
}

main().catch(error => {
  console.error('执行出错:', error.message);
  process.exit(1);
});