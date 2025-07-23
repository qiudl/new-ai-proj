#!/usr/bin/env node

/**
 * 用户管理页面功能测试脚本
 * 测试 http://localhost/user-management 页面的各个按钮和CRUD操作
 */

const axios = require('axios');

// 禁用代理
axios.defaults.proxy = false;

const BASE_URL = 'http://localhost';
const API_BASE = `${BASE_URL}/api/v1`;

let authToken = '';

// 测试结果
const testResults = {
  login: false,
  getUserList: false,
  getUserStats: false,
  createUser: false,
  updateUser: false,
  resetPassword: false,
  updateStatus: false,
  deleteUser: false,
  batchOperations: false,
  exportUsers: false
};

async function login() {
  try {
    console.log('🔐 测试登录...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'qiudl',
      password: '123456'
    });
    
    if (response.data && response.data.success && response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功');
      testResults.login = true;
      return true;
    } else {
      console.log('❌ 登录失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    console.log('❌ 登录失败：', error.response?.data?.message || error.message);
    return false;
  }
}

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

async function testGetUserList() {
  try {
    console.log('\n📋 测试获取用户列表...');
    const response = await axios.get(`${API_BASE}/admin/users?page=1&page_size=20`, {
      headers: getAuthHeaders()
    });
    
    if (response.data) {
      console.log(`✅ 获取用户列表成功 - 总共 ${response.data.total || 0} 个用户`);
      testResults.getUserList = true;
      return response.data;
    } else {
      console.log('❌ 获取用户列表失败：响应格式不正确');
      return null;
    }
  } catch (error) {
    console.log('❌ 获取用户列表失败：', error.response?.status, error.response?.data?.message || error.message);
    return null;
  }
}

async function testGetUserStats() {
  try {
    console.log('\n📊 测试获取用户统计...');
    const response = await axios.get(`${API_BASE}/admin/users/stats`, {
      headers: getAuthHeaders()
    });
    
    if (response.data) {
      console.log('✅ 获取用户统计成功');
      console.log('   - 总用户数:', response.data.total || 0);
      console.log('   - 按角色统计:', JSON.stringify(response.data.by_role || {}));
      console.log('   - 按状态统计:', JSON.stringify(response.data.by_status || {}));
      testResults.getUserStats = true;
      return response.data;
    } else {
      console.log('❌ 获取用户统计失败：响应格式不正确');
      return null;
    }
  } catch (error) {
    console.log('❌ 获取用户统计失败：', error.response?.status, error.response?.data?.message || error.message);
    return null;
  }
}

async function testCreateUser() {
  try {
    console.log('\n➕ 测试创建用户...');
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
      user_type: 'system',
      role: 'developer',
      profile: {
        name: '测试用户',
        phone: '13800000000',
        department: '技术部'
      }
    };
    
    const response = await axios.post(`${API_BASE}/admin/users`, testUser, {
      headers: getAuthHeaders()
    });
    
    if (response.data) {
      console.log('✅ 创建用户成功');
      console.log('   - 用户ID:', response.data.id);
      console.log('   - 用户名:', response.data.username);
      testResults.createUser = true;
      return response.data;
    } else {
      console.log('❌ 创建用户失败：响应格式不正确');
      return null;
    }
  } catch (error) {
    console.log('❌ 创建用户失败：', error.response?.status, error.response?.data?.message || error.message);
    return null;
  }
}

async function testUpdateUser(userId) {
  try {
    console.log(`\n✏️ 测试更新用户 (ID: ${userId})...`);
    const updateData = {
      profile: {
        name: '更新的测试用户',
        phone: '13900000000',
        department: '产品部'
      },
      status: 'active'
    };
    
    const response = await axios.put(`${API_BASE}/admin/users/${userId}`, updateData, {
      headers: getAuthHeaders()
    });
    
    if (response.data) {
      console.log('✅ 更新用户成功');
      testResults.updateUser = true;
      return response.data;
    } else {
      console.log('❌ 更新用户失败：响应格式不正确');
      return null;
    }
  } catch (error) {
    console.log('❌ 更新用户失败：', error.response?.status, error.response?.data?.message || error.message);
    return null;
  }
}

async function testResetPassword(userId) {
  try {
    console.log(`\n🔑 测试重置密码 (ID: ${userId})...`);
    const passwordData = {
      new_password: 'newpassword123'
    };
    
    const response = await axios.post(`${API_BASE}/admin/users/${userId}/reset-password`, passwordData, {
      headers: getAuthHeaders()
    });
    
    if (response.data && response.data.success) {
      console.log('✅ 重置密码成功');
      testResults.resetPassword = true;
      return true;
    } else {
      console.log('❌ 重置密码失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    console.log('❌ 重置密码失败：', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function testUpdateStatus(userId, status) {
  try {
    console.log(`\n🔄 测试更新用户状态 (ID: ${userId}, 状态: ${status})...`);
    const response = await axios.put(`${API_BASE}/admin/users/${userId}/status`, {
      status: status
    }, {
      headers: getAuthHeaders()
    });
    
    if (response.data && response.data.success) {
      console.log('✅ 更新用户状态成功');
      testResults.updateStatus = true;
      return response.data.data;
    } else {
      console.log('❌ 更新用户状态失败：响应格式不正确');
      return null;
    }
  } catch (error) {
    console.log('❌ 更新用户状态失败：', error.response?.status, error.response?.data?.message || error.message);
    return null;
  }
}

async function testBatchOperations(userIds) {
  try {
    console.log(`\n🔨 测试批量操作 (用户IDs: ${userIds.join(', ')})...`);
    
    // 测试批量激活
    const response = await axios.post(`${API_BASE}/admin/users/batch`, {
      user_ids: userIds,
      action: 'activate'
    }, {
      headers: getAuthHeaders()
    });
    
    if (response.data && response.data.success) {
      console.log('✅ 批量操作成功');
      testResults.batchOperations = true;
      return true;
    } else {
      console.log('❌ 批量操作失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    console.log('❌ 批量操作失败：', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function testExportUsers() {
  try {
    console.log('\n📤 测试导出用户...');
    const response = await axios.get(`${API_BASE}/admin/users/export`, {
      headers: getAuthHeaders(),
      responseType: 'blob' // 期望二进制数据
    });
    
    if (response.data && response.status === 200) {
      console.log('✅ 导出用户成功');
      console.log('   - 文件大小:', response.data.size || 'unknown', 'bytes');
      testResults.exportUsers = true;
      return true;
    } else {
      console.log('❌ 导出用户失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    console.log('❌ 导出用户失败：', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function testDeleteUser(userId) {
  try {
    console.log(`\n🗑️ 测试删除用户 (ID: ${userId})...`);
    const response = await axios.delete(`${API_BASE}/admin/users/${userId}`, {
      headers: getAuthHeaders()
    });
    
    if (response.data && response.data.success) {
      console.log('✅ 删除用户成功');
      testResults.deleteUser = true;
      return true;
    } else {
      console.log('❌ 删除用户失败：响应格式不正确');
      return false;
    }
  } catch (error) {
    console.log('❌ 删除用户失败：', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始用户管理页面功能测试...\n');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，终止测试');
    return;
  }
  
  // 2. 获取用户列表
  const userList = await testGetUserList();
  
  // 3. 获取用户统计
  await testGetUserStats();
  
  // 4. 创建用户
  const newUser = await testCreateUser();
  
  if (newUser && newUser.id) {
    // 5. 更新用户
    await testUpdateUser(newUser.id);
    
    // 6. 重置密码
    await testResetPassword(newUser.id);
    
    // 7. 更新状态
    await testUpdateStatus(newUser.id, 'suspended');
    
    // 8. 批量操作
    await testBatchOperations([newUser.id]);
    
    // 9. 删除用户（最后执行）
    await testDeleteUser(newUser.id);
  }
  
  // 10. 导出用户
  await testExportUsers();
  
  // 显示测试结果汇总
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试结果汇总:');
  console.log('='.repeat(50));
  
  let passedTests = 0;
  let totalTests = 0;
  
  Object.entries(testResults).forEach(([test, passed]) => {
    totalTests++;
    if (passed) passedTests++;
    const status = passed ? '✅' : '❌';
    const testName = {
      login: '用户登录',
      getUserList: '获取用户列表',
      getUserStats: '获取用户统计',
      createUser: '创建用户',
      updateUser: '更新用户',
      resetPassword: '重置密码',
      updateStatus: '更新用户状态',
      deleteUser: '删除用户',
      batchOperations: '批量操作',
      exportUsers: '导出用户'
    }[test] || test;
    
    console.log(`${status} ${testName}`);
  });
  
  console.log('-'.repeat(50));
  console.log(`总共: ${totalTests} 个测试, 通过: ${passedTests} 个, 失败: ${totalTests - passedTests} 个`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试都通过了！用户管理功能正常。');
  } else {
    console.log(`\n⚠️  有 ${totalTests - passedTests} 个测试失败，请检查相关功能。`);
  }
}

// 运行测试
main().catch(console.error);