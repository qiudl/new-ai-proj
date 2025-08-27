#!/usr/bin/env node
/**
 * 权限系统完整性测试脚本
 * 验证权限数据完整性和初始化状态
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:8081';
const API_BASE = `${BACKEND_URL}/api/v1`;

// 测试配置
const TEST_CONFIG = {
  username: 'guoym',
  password: 'dummy' // 开发环境快速登录不需要真实密码
};

class PermissionIntegrityTest {
  constructor() {
    this.authToken = null;
  }

  async login() {
    try {
      console.log('🔐 正在进行开发环境快速登录...');
      const response = await axios.post(`${API_BASE}/auth/dev-quick-login`, {
        username: TEST_CONFIG.username
      });

      if (response.data.success) {
        this.authToken = response.data.data.token;
        console.log('✅ 登录成功');
        console.log(`📋 用户信息: ${response.data.data.user.username} (${response.data.data.user.role})`);
        return true;
      } else {
        console.error('❌ 登录失败:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ 登录异常:', error.message);
      return false;
    }
  }

  async getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  async testPermissionsAPI() {
    console.log('\n📋 测试权限列表API...');
    try {
      const response = await axios.get(`${API_BASE}/permissions`, {
        headers: await this.getAuthHeaders()
      });

      const permissions = response.data.permissions;
      console.log(`✅ 获取到 ${permissions.length} 个权限`);
      
      // 验证权限数据完整性
      const modules = [...new Set(permissions.map(p => p.module))];
      console.log(`📂 权限模块: ${modules.join(', ')}`);

      // 检查必要权限是否存在
      const requiredPermissions = [
        'task.create', 'task.read', 'task.update', 'task.delete',
        'project.create', 'project.read', 'project.update',
        'company.info.read', 'company.users.read'
      ];

      const missingPermissions = requiredPermissions.filter(
        required => !permissions.find(p => p.permission_code === required)
      );

      if (missingPermissions.length > 0) {
        console.log(`⚠️ 缺少权限: ${missingPermissions.join(', ')}`);
      } else {
        console.log('✅ 所有必要权限都已存在');
      }

      return permissions;
    } catch (error) {
      console.error('❌ 权限列表API测试失败:', error.response?.data || error.message);
      return null;
    }
  }

  async testRolesAPI() {
    console.log('\n👥 测试角色列表API...');
    try {
      const response = await axios.get(`${API_BASE}/permissions/roles`, {
        headers: await this.getAuthHeaders()
      });

      const roles = response.data.roles;
      console.log(`✅ 获取到 ${roles.length} 个角色`);

      // 检查系统角色
      const systemRoles = roles.filter(r => r.is_system_role);
      console.log(`🔧 系统角色数量: ${systemRoles.length}`);

      // 检查必要角色是否存在
      const requiredRoles = [
        'company_admin', 'project_manager', 'developer', 'member'
      ];

      const missingRoles = requiredRoles.filter(
        required => !roles.find(r => r.role_code === required)
      );

      if (missingRoles.length > 0) {
        console.log(`⚠️ 缺少角色: ${missingRoles.join(', ')}`);
      } else {
        console.log('✅ 所有必要角色都已存在');
      }

      return roles;
    } catch (error) {
      console.error('❌ 角色列表API测试失败:', error.response?.data || error.message);
      return null;
    }
  }

  async testRolePermissions(roleId) {
    console.log(`\n🔍 测试角色权限API (角色ID: ${roleId})...`);
    try {
      const response = await axios.get(`${API_BASE}/permissions/roles/${roleId}/permissions`, {
        headers: await this.getAuthHeaders()
      });

      const permissions = response.data.permissions;
      console.log(`✅ 角色拥有 ${permissions.length} 个权限`);
      
      // 显示前5个权限作为示例
      const samplePermissions = permissions.slice(0, 5).map(p => p.permission_code);
      console.log(`📋 示例权限: ${samplePermissions.join(', ')}`);

      return permissions;
    } catch (error) {
      console.error('❌ 角色权限API测试失败:', error.response?.data || error.message);
      return null;
    }
  }

  async testPermissionCheck() {
    console.log('\n🔍 测试权限检查API...');
    try {
      const testPermissions = ['task.create', 'project.read', 'system.admin'];
      
      for (const permissionCode of testPermissions) {
        const response = await axios.post(`${API_BASE}/permissions/check`, 
          { permission_code: permissionCode },
          { headers: await this.getAuthHeaders() }
        );

        const result = response.data.result;
        const status = result.has_permission ? '✅' : '❌';
        console.log(`${status} ${permissionCode}: ${result.reason} (${result.source})`);
      }

      return true;
    } catch (error) {
      console.error('❌ 权限检查API测试失败:', error.response?.data || error.message);
      return false;
    }
  }

  async testDatabaseIntegrity() {
    console.log('\n🗄️ 测试数据库完整性...');
    
    // 通过API检查数据一致性
    const permissions = await this.testPermissionsAPI();
    const roles = await this.testRolesAPI();
    
    if (!permissions || !roles) {
      console.error('❌ 无法获取基础数据，数据库完整性检查失败');
      return false;
    }

    // 检查至少有一个管理员角色有足够的权限
    let hasAdminRole = false;
    for (const role of roles) {
      if (role.role_code.includes('admin') || role.role_code === 'super_admin') {
        const rolePermissions = await this.testRolePermissions(role.id);
        if (rolePermissions && rolePermissions.length > 10) {
          hasAdminRole = true;
          console.log(`✅ 管理员角色 "${role.role_name}" 具有 ${rolePermissions.length} 个权限`);
          break;
        }
      }
    }

    if (!hasAdminRole) {
      console.log('⚠️ 未找到具有足够权限的管理员角色');
    }

    return true;
  }

  async runFullTest() {
    console.log('🚀 开始权限系统完整性测试\n');

    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.error('❌ 测试终止: 无法登录');
      return false;
    }

    // 2. 测试基础API
    await this.testPermissionsAPI();
    const roles = await this.testRolesAPI();

    // 3. 测试角色权限
    if (roles && roles.length > 0) {
      await this.testRolePermissions(roles[0].id);
    }

    // 4. 测试权限检查
    await this.testPermissionCheck();

    // 5. 测试数据库完整性
    await this.testDatabaseIntegrity();

    console.log('\n🎉 权限系统完整性测试完成');
    return true;
  }
}

// 运行测试
async function main() {
  const tester = new PermissionIntegrityTest();
  try {
    await tester.runFullTest();
  } catch (error) {
    console.error('❌ 测试过程中发生未捕获的异常:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PermissionIntegrityTest;
