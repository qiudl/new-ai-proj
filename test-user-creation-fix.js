#!/usr/bin/env node

/**
 * 用户创建功能修复测试脚本
 * 测试角色选择问题的修复效果
 */

const API_BASE = 'http://localhost:5000/api';

async function testUserCreationFix() {
  console.log('🚀 开始测试用户创建功能修复...\n');

  // 测试数据
  const testUsers = [
    {
      username: 'test_system_admin',
      email: 'admin@test.com',
      password: 'test123456',
      user_type: 'system',
      role: 'admin',
      profile: {
        name: '测试系统管理员'
      }
    },
    {
      username: 'test_system_pm',
      email: 'pm@test.com',
      password: 'test123456',
      user_type: 'system',
      role: 'project_manager',
      profile: {
        name: '测试项目经理'
      }
    },
    {
      username: 'test_company_client',
      email: 'client@company.com',
      password: 'test123456',
      user_type: 'company',
      company_id: 1,
      role: 'client',
      profile: {
        name: '测试企业客户'
      }
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const userData of testUsers) {
    try {
      console.log(`📝 测试创建用户: ${userData.username} (${userData.user_type}/${userData.role})`);
      
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ 成功创建用户: ${result.username} (ID: ${result.id})`);
        successCount++;
      } else {
        const error = await response.text();
        console.log(`❌ 创建用户失败 (${response.status}): ${error}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ 网络错误: ${error.message}`);
      failCount++;
    }
    
    console.log(''); // 空行分隔
  }

  // 测试前端角色验证逻辑
  console.log('🧪 测试前端角色验证逻辑...\n');
  
  const testRoles = [
    { userType: 'system', role: 'admin', shouldPass: true },
    { userType: 'system', role: 'project_manager', shouldPass: true },
    { userType: 'system', role: 'client', shouldPass: false },
    { userType: 'company', role: 'client', shouldPass: true },
    { userType: 'company', role: 'admin', shouldPass: false }
  ];

  for (const test of testRoles) {
    // 模拟前端验证逻辑
    const systemRoles = ['admin', 'project_manager', 'developer'];
    const companyRoles = ['client', 'company_admin', 'company_user'];
    
    let isValid = false;
    if (test.userType === 'system') {
      isValid = systemRoles.includes(test.role);
    } else if (test.userType === 'company') {
      isValid = companyRoles.includes(test.role);
    }
    
    const result = isValid === test.shouldPass ? '✅' : '❌';
    console.log(`${result} ${test.userType}用户 + ${test.role}角色: ${isValid ? '有效' : '无效'} (预期: ${test.shouldPass ? '有效' : '无效'})`);
  }

  // 总结
  console.log('\n📊 测试结果总结:');
  console.log(`✅ 成功: ${successCount} 个用户`);
  console.log(`❌ 失败: ${failCount} 个用户`);
  
  if (failCount === 0) {
    console.log('\n🎉 所有测试通过！用户创建功能修复成功！');
    return true;
  } else {
    console.log('\n⚠️  部分测试失败，请检查修复效果');
    return false;
  }
}

// 清理测试数据的函数
async function cleanupTestUsers() {
  console.log('🧹 清理测试数据...');
  
  const testUsernames = ['test_system_admin', 'test_system_pm', 'test_company_client'];
  
  for (const username of testUsernames) {
    try {
      // 先查找用户
      const searchResponse = await fetch(`${API_BASE}/admin/users?search=${username}`, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
        }
      });
      
      if (searchResponse.ok) {
        const data = await searchResponse.json();
        const user = data.data?.find(u => u.username === username);
        
        if (user) {
          // 删除用户
          const deleteResponse = await fetch(`${API_BASE}/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
            }
          });
          
          if (deleteResponse.ok) {
            console.log(`🗑️  已删除测试用户: ${username}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  清理用户 ${username} 时出错: ${error.message}`);
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    await cleanupTestUsers();
    return;
  }
  
  const success = await testUserCreationFix();
  
  if (args.includes('--auto-cleanup')) {
    console.log('\n');
    await cleanupTestUsers();
  }
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testUserCreationFix, cleanupTestUsers };
