#!/usr/bin/env node

/**
 * 企业API集成测试脚本
 * 
 * 此脚本测试前端用户管理页面中企业选择器与后端企业管理API的集成
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:8080';

// 企业API测试
async function testCompanyAPI() {
  console.log('🏢 测试企业API集成...\n');

  // 测试1: 获取企业列表
  console.log('1. 测试获取企业列表');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies?page=1&page_size=10&status=active`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 企业列表获取成功');
      console.log(`   - 企业数量: ${data.data.pagination.total}`);
      console.log(`   - 当前页: ${data.data.pagination.page}`);
      
      if (data.data.data.length > 0) {
        const company = data.data.data[0];
        console.log(`   - 示例企业: ${company.companyName || company.company_name || company.name || '未知'}`);
        return data.data.data;
      }
    } else {
      console.log('❌ 企业列表获取失败:', data.message);
    }
  } catch (error) {
    console.log('❌ 企业列表API调用失败:', error.message);
  }

  // 测试2: 创建测试企业（如果没有企业数据）
  console.log('\n2. 创建测试企业数据');
  try {
    const testCompany = {
      company_name: '测试企业A',
      company_code: 'TEST_COMP_A',
      industry: '软件开发',
      company_type: 'limited_company',
      business_license: '91110000000000000A',
      tax_number: '91110000000000000A',
      legal_representative: '张三',
      address: '北京市朝阳区测试大厦',
      city: '北京市',
      province: '北京市',
      postal_code: '100000',
      website: 'https://test-company-a.com',
      main_phone: '010-12345678',
      main_email: 'contact@test-company-a.com',
      status: 'active',
      priority: 'high',
      annual_contract_value: 1000000,
      start_date: '2024-01-01',
      employee_count: 50,
      company_size: 'medium'
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCompany),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 测试企业创建成功');
      console.log(`   - 企业ID: ${data.data.id}`);
      console.log(`   - 企业名称: ${data.data.companyName || data.data.company_name}`);
      return data.data;
    } else {
      console.log('❌ 测试企业创建失败:', data.message);
    }
  } catch (error) {
    console.log('❌ 创建企业API调用失败:', error.message);
  }

  // 测试3: 搜索企业
  console.log('\n3. 测试企业搜索功能');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies?search=测试&page_size=50`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 企业搜索成功');
      console.log(`   - 搜索结果数量: ${data.data.data.length}`);
      
      if (data.data.data.length > 0) {
        console.log('   - 搜索结果:');
        data.data.data.forEach((company, index) => {
          console.log(`     ${index + 1}. ${company.companyName || company.company_name || company.name || '未知'}`);
        });
      }
    } else {
      console.log('❌ 企业搜索失败:', data.message);
    }
  } catch (error) {
    console.log('❌ 搜索企业API调用失败:', error.message);
  }

  console.log('\n🏢 企业API集成测试完成\n');
}

// 用户管理API测试
async function testUserManagementAPI() {
  console.log('👥 测试用户管理API...\n');

  // 测试1: 获取用户列表
  console.log('1. 测试获取用户列表');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/users?page=1&page_size=10`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 用户列表获取成功');
      console.log(`   - 用户数量: ${data.data.pagination.total}`);
      
      if (data.data.data.length > 0) {
        console.log('   - 示例用户:');
        data.data.data.slice(0, 3).forEach((user, index) => {
          console.log(`     ${index + 1}. ${user.username} (${user.user_type || 'system'}) - ${user.role}`);
        });
      }
    } else {
      console.log('❌ 用户列表获取失败:', data.message);
    }
  } catch (error) {
    console.log('❌ 用户列表API调用失败:', error.message);
  }

  // 测试2: 创建企业用户
  console.log('\n2. 测试创建企业用户');
  try {
    const testUser = {
      username: 'testcompanyuser1',
      email: 'testuser@test-company-a.com',
      password: 'password123',
      user_type: 'company',
      company_id: 1, // 假设存在ID为1的企业
      role: 'company_user',
      profile: {
        name: '测试企业用户',
        phone: '13800138000',
        department: '测试部门'
      }
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ 企业用户创建成功');
      console.log(`   - 用户ID: ${data.data.id}`);
      console.log(`   - 用户名: ${data.data.username}`);
      console.log(`   - 用户类型: ${data.data.user_type}`);
      console.log(`   - 所属企业ID: ${data.data.company_id}`);
    } else {
      console.log('❌ 企业用户创建失败:', data.message);
      if (data.errors) {
        console.log('   - 错误详情:', JSON.stringify(data.errors, null, 2));
      }
    }
  } catch (error) {
    console.log('❌ 创建企业用户API调用失败:', error.message);
  }

  console.log('\n👥 用户管理API测试完成\n');
}

// 集成测试
async function testIntegration() {
  console.log('🔗 测试前端企业选择器集成...\n');

  // 模拟前端企业选择器的API调用流程
  console.log('1. 模拟用户管理页面加载时的API调用');
  
  try {
    // 1. 获取用户列表
    console.log('   - 获取用户列表...');
    const usersResponse = await fetch(`${API_BASE_URL}/api/v1/admin/users?page=1&page_size=20`);
    const usersData = await usersResponse.json();
    
    // 2. 获取企业列表（用于选择器）
    console.log('   - 获取企业列表...');
    const companiesResponse = await fetch(`${API_BASE_URL}/api/v1/companies?page=1&page_size=100&status=active`);
    const companiesData = await companiesResponse.json();
    
    if (usersData.success && companiesData.success) {
      console.log('✅ 前端页面数据加载模拟成功');
      console.log(`   - 用户数量: ${usersData.data.pagination.total}`);
      console.log(`   - 可选企业数量: ${companiesData.data.data.length}`);
      
      // 3. 统计企业用户关联情况
      const companyUsers = usersData.data.data.filter(user => 
        user.user_type === 'company' && user.company_id
      );
      
      console.log(`   - 企业用户数量: ${companyUsers.length}`);
      
      if (companyUsers.length > 0) {
        console.log('   - 企业用户关联情况:');
        companyUsers.forEach(user => {
          const company = companiesData.data.data.find(c => c.id === user.company_id);
          const companyName = company ? (company.companyName || company.company_name || '未知') : `企业${user.company_id}`;
          console.log(`     * ${user.username} → ${companyName}`);
        });
      }
    } else {
      console.log('❌ 前端页面数据加载失败');
      if (!usersData.success) console.log('   - 用户数据:', usersData.message);
      if (!companiesData.success) console.log('   - 企业数据:', companiesData.message);
    }
  } catch (error) {
    console.log('❌ 集成测试失败:', error.message);
  }

  console.log('\n🔗 集成测试完成\n');
}

// 检查服务器连接
async function checkServer() {
  return new Promise((resolve) => {
    const req = http.request(`${API_BASE_URL}/health`, { timeout: 5000 }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => resolve(false));
    req.end();
  });
}

// 主函数
async function main() {
  console.log('🚀 企业API集成测试开始\n');
  
  // 检查服务器连接
  console.log('检查后端服务器连接...');
  const serverOnline = await checkServer();
  
  if (!serverOnline) {
    console.log('❌ 无法连接到后端服务器');
    console.log('请确保后端服务器正在运行在 http://localhost:8080');
    console.log('\n启动命令:');
    console.log('cd backend && go run main.go');
    return;
  }
  
  console.log('✅ 后端服务器连接正常\n');

  // 执行测试
  await testCompanyAPI();
  await testUserManagementAPI();
  await testIntegration();

  console.log('🎉 企业API集成测试全部完成!');
  console.log('\n📋 验证清单:');
  console.log('  □ 企业列表API正常工作');
  console.log('  □ 企业搜索API正常工作');
  console.log('  □ 用户管理API支持企业用户');
  console.log('  □ 前端企业选择器能正确显示企业数据');
  console.log('  □ 企业用户关联正确显示');
  console.log('\n🎯 下一步: 在前端测试用户管理页面的企业选择器功能');
}

// 全局fetch支持（Node.js 18+）
if (typeof fetch === 'undefined') {
  console.log('❌ 此脚本需要 Node.js 18+ 版本（包含 fetch API）');
  console.log('或者运行: npm install node-fetch');
  process.exit(1);
}

main().catch(error => {
  console.error('💥 测试脚本执行失败:', error);
  process.exit(1);
});
