#!/usr/bin/env node

/**
 * 用户类型系统API测试脚本
 * 测试新的用户类型字段和验证逻辑
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/v1';

// 测试数据
const testUsers = [
  {
    username: 'system_admin',
    email: 'admin@system.com',
    password: 'password123',
    user_type: 'system',
    role: 'admin',
    profile: { name: '系统管理员' }
  },
  {
    username: 'project_manager1',
    email: 'pm@system.com', 
    password: 'password123',
    user_type: 'system',
    role: 'project_manager',
    profile: { name: '项目经理', department: '技术部' }
  },
  {
    username: 'company_user1',
    email: 'user@company.com',
    password: 'password123',
    user_type: 'company',
    company_id: 1,
    role: 'company_user',
    profile: { name: '企业用户', department: '业务部' }
  },
  {
    username: 'invalid_user',
    email: 'invalid@test.com',
    password: 'password123',
    user_type: 'system',
    role: 'company_admin', // 这应该失败 - 系统用户不能有company_admin角色
    profile: { name: '无效用户' }
  }
];

async function testCreateUsers() {
  console.log('🧪 测试用户创建...\n');
  
  for (const [index, userData] of testUsers.entries()) {
    try {
      console.log(`📝 创建用户 ${index + 1}: ${userData.username} (${userData.user_type}/${userData.role})`);
      
      const response = await axios.post(`${API_BASE_URL}/admin/users`, userData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data.data) {
        console.log(`✅ 成功创建用户 ID: ${response.data.data.id}`);
        console.log(`   用户类型: ${response.data.data.user_type}`);
        console.log(`   角色: ${response.data.data.role}`);
        if (response.data.data.company_id) {
          console.log(`   企业ID: ${response.data.data.company_id}`);
        }
      }
      
    } catch (error) {
      if (userData.username === 'invalid_user') {
        console.log('✅ 预期的验证错误:', error.response?.data?.message || error.message);
      } else {
        console.error(`❌ 创建用户失败: ${error.response?.data?.message || error.message}`);
      }
    }
    console.log();
  }
}

async function testGetUsers() {
  console.log('📋 测试用户列表获取...\n');
  
  try {
    // 测试获取所有用户
    console.log('📝 获取所有用户');
    const allUsersResponse = await axios.get(`${API_BASE_URL}/admin/users`);
    console.log(`✅ 获取到 ${allUsersResponse.data.data?.length || 0} 个用户`);
    
    // 测试按用户类型筛选
    console.log('📝 筛选系统用户');
    const systemUsersResponse = await axios.get(`${API_BASE_URL}/admin/users?user_type=system`);
    console.log(`✅ 系统用户数量: ${systemUsersResponse.data.data?.length || 0}`);
    
    console.log('📝 筛选企业用户');  
    const companyUsersResponse = await axios.get(`${API_BASE_URL}/admin/users?user_type=company`);
    console.log(`✅ 企业用户数量: ${companyUsersResponse.data.data?.length || 0}`);
    
  } catch (error) {
    console.error(`❌ 获取用户列表失败: ${error.response?.data?.message || error.message}`);
  }
  console.log();
}

async function testUpdateUser() {
  console.log('✏️ 测试用户更新...\n');
  
  try {
    // 先获取一个用户来更新
    const usersResponse = await axios.get(`${API_BASE_URL}/admin/users?limit=1`);
    
    if (!usersResponse.data.data || usersResponse.data.data.length === 0) {
      console.log('⚠️ 没有用户可以更新');
      return;
    }
    
    const user = usersResponse.data.data[0];
    console.log(`📝 更新用户: ${user.username} (ID: ${user.id})`);
    
    // 测试有效的更新
    const updateData = {
      profile: {
        ...user.profile,
        department: '更新后的部门'
      }
    };
    
    const updateResponse = await axios.put(`${API_BASE_URL}/admin/users/${user.id}`, updateData);
    console.log('✅ 用户更新成功');
    console.log(`   新部门: ${updateResponse.data.data?.profile?.department}`);
    
    // 测试无效的角色更新（如果是系统用户，尝试设为企业角色）
    if (user.user_type === 'system') {
      try {
        console.log('📝 测试无效角色更新 (系统用户->企业角色)');
        await axios.put(`${API_BASE_URL}/admin/users/${user.id}`, { role: 'company_admin' });
        console.log('❌ 应该失败但成功了');
      } catch (error) {
        console.log('✅ 预期的验证错误:', error.response?.data?.message);
      }
    }
    
  } catch (error) {
    console.error(`❌ 更新用户失败: ${error.response?.data?.message || error.message}`);
  }
  console.log();
}

async function testUserStats() {
  console.log('📊 测试用户统计...\n');
  
  try {
    const statsResponse = await axios.get(`${API_BASE_URL}/admin/users/stats`);
    console.log('✅ 用户统计信息:');
    console.log(`   总用户数: ${statsResponse.data.data?.total || 0}`);
    console.log(`   角色分布: ${JSON.stringify(statsResponse.data.data?.by_role || {}, null, 2)}`);
    console.log(`   状态分布: ${JSON.stringify(statsResponse.data.data?.by_status || {}, null, 2)}`);
    
  } catch (error) {
    console.error(`❌ 获取用户统计失败: ${error.response?.data?.message || error.message}`);
  }
  console.log();
}

async function runTests() {
  console.log('🚀 开始用户类型系统测试\n');
  console.log('=' .repeat(50));
  
  try {
    await testCreateUsers();
    await testGetUsers();
    await testUpdateUser();
    await testUserStats();
    
    console.log('=' .repeat(50));
    console.log('🎉 测试完成！');
    
  } catch (error) {
    console.error('💥 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
