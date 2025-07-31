#!/usr/bin/env node

// 测试数据验证机制
const axios = require('axios');

async function testDataValidation() {
  console.log('🧪 测试数据验证防范机制...\n');
  
  const baseURL = 'http://localhost:8080/api/v1';
  
  try {
    // 1. 登录
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ 登录成功\n');
    
    // 2. 测试各种错误数据格式
    const testCases = [
      {
        name: '数组格式的custom_fields',
        data: {
          title: '测试任务 - 数组格式',
          description: '测试数组格式的custom_fields是否被正确处理',
          status: 'todo',
          custom_fields: [null, { priority: 'high' }, { tags: ['test'] }]
        },
        expectSuccess: true // 现在应该能正确处理
      },
      {
        name: '字符串格式的custom_fields',
        data: {
          title: '测试任务 - 字符串格式',
          description: '测试字符串格式的custom_fields是否被正确处理',
          status: 'todo',
          custom_fields: '{"priority": "medium", "tags": ["test"]}'
        },
        expectSuccess: true
      },
      {
        name: '无效的priority值',
        data: {
          title: '测试任务 - 无效priority',
          description: '测试无效priority值是否被过滤',
          status: 'todo',
          custom_fields: { priority: 'invalid_priority', tags: ['test'] }
        },
        expectSuccess: true // 应该过滤掉无效值
      },
      {
        name: '非数组的tags字段',
        data: {
          title: '测试任务 - 非数组tags',
          description: '测试非数组tags字段是否被正确处理',
          status: 'todo',
          custom_fields: { priority: 'low', tags: 'single_tag' }
        },
        expectSuccess: true // 应该转换为数组
      },
      {
        name: '无效的estimated_hours',
        data: {
          title: '测试任务 - 无效工时',
          description: '测试无效工时值是否被过滤',
          status: 'todo',
          custom_fields: { priority: 'low', estimated_hours: -5 }
        },
        expectSuccess: true // 应该过滤掉无效值
      },
      {
        name: '空标题（应该失败）',
        data: {
          title: '',
          description: '测试空标题是否被拒绝',
          status: 'todo',
          custom_fields: { priority: 'low' }
        },
        expectSuccess: false
      }
    ];
    
    console.log('🧪 开始测试各种数据格式...\n');
    
    const results = [];
    
    for (const testCase of testCases) {
      console.log(`测试: ${testCase.name}`);
      
      try {
        const response = await axios.post(`${baseURL}/projects/1/tasks`, testCase.data, { headers });
        
        if (testCase.expectSuccess) {
          console.log('✅ 成功创建任务');
          console.log(`   任务ID: ${response.data.data?.task?.id || response.data.data?.id}`);
          console.log(`   清理后的custom_fields:`, JSON.stringify(response.data.data?.task?.custom_fields || response.data.data?.custom_fields, null, 2));
          results.push({ ...testCase, result: 'success', response: response.data });
        } else {
          console.log('❌ 意外成功: 这个测试应该失败的');
          results.push({ ...testCase, result: 'unexpected_success', response: response.data });
        }
        
      } catch (error) {
        if (!testCase.expectSuccess) {
          console.log('✅ 正确拒绝了无效数据');
          console.log(`   错误信息: ${error.response?.data?.error?.message || error.message}`);
          results.push({ ...testCase, result: 'correctly_rejected', error: error.response?.data });
        } else {
          console.log('❌ 意外失败: 这个测试应该成功的');
          console.log(`   错误信息: ${error.response?.data?.error?.message || error.message}`);
          results.push({ ...testCase, result: 'unexpected_failure', error: error.response?.data });
        }
      }
      
      console.log('');
    }
    
    // 3. 生成测试报告
    console.log('📊 测试结果汇总:\n');
    
    const successCount = results.filter(r => r.result === 'success' || r.result === 'correctly_rejected').length;
    const totalCount = results.length;
    
    console.log(`✅ 通过测试: ${successCount}/${totalCount}`);
    console.log(`❌ 失败测试: ${totalCount - successCount}/${totalCount}\n`);
    
    results.forEach((result, index) => {
      const icon = (result.result === 'success' || result.result === 'correctly_rejected') ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${result.name}: ${result.result}`);
    });
    
    // 4. 验证数据一致性
    console.log('\n🔍 验证所有任务的数据一致性...');
    
    const allTasksResponse = await axios.get(`${baseURL}/projects/1/tasks?page_size=100`, { headers });
    const tasks = allTasksResponse.data.data.data;
    
    let inconsistentTasks = 0;
    tasks.forEach(task => {
      if (Array.isArray(task.custom_fields)) {
        inconsistentTasks++;
        console.log(`❌ 任务 #${task.id} 仍有数组格式的custom_fields`);
      }
    });
    
    if (inconsistentTasks === 0) {
      console.log('✅ 所有任务的custom_fields格式正确');
    } else {
      console.log(`❌ 发现 ${inconsistentTasks} 个任务的数据格式仍有问题`);
    }
    
    console.log('\n🎉 数据验证机制测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testDataValidation();