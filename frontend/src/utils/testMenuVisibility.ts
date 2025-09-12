// 菜单可见性测试工具
// 可以在浏览器控制台中运行这个脚本来测试菜单过滤逻辑

import { isMenuVisible, getUserType, getUserTypeFromRole, filterMenuItems, UserType } from '../config/menuVisibility';

// 测试数据：模拟的菜单项
const testMenuItems = [
  {
    key: '/workspace-management',
    label: '工作台',
    children: [
      { key: '/', label: '工作概览' },
      { key: '/time-weekly-report', label: '时间周报' }
    ]
  },
  {
    key: '/system-management',
    label: '系统管理',
    children: [
      { key: '/user-management', label: '用户管理' },
      { key: '/permissions', label: '权限管理' },
      { key: '/companies', label: '企业客户 (legacy)' },
      { key: '/enterprises', label: '企业管理' }
    ]
  }
];

// 测试函数
export function testMenuVisibility() {
  console.log('🧪 开始菜单可见性测试...\n');

  // 测试1：company_admin角色
  console.log('📋 测试1：company_admin角色 (litingting账号)');
  const companyAdminRole = 'company_admin';
  const companyAdminUserType = getUserTypeFromRole(companyAdminRole);
  
  console.log(`  用户角色: ${companyAdminRole}`);
  console.log(`  用户类型: ${companyAdminUserType}`);
  
  // 测试关键菜单项的可见性
  const testCases = [
    { key: '/workspace-management', expected: true, description: '工作台' },
    { key: '/', expected: true, description: '工作概览' },
    { key: '/system-management', expected: false, description: '系统管理菜单组' },
    { key: '/user-management', expected: false, description: '用户管理' },
    { key: '/permissions', expected: false, description: '权限管理' },
    { key: '/companies', expected: false, description: '企业客户 (legacy)' },
    { key: '/enterprises', expected: false, description: '企业管理' },
    { key: '/projects', expected: true, description: '项目列表' },
    { key: '/audit-logs', expected: false, description: '审计日志' }
  ];

  console.log('\n  菜单项可见性测试:');
  testCases.forEach(testCase => {
    // 对于company_admin，userType应该是'company'
    const result = isMenuVisible(testCase.key, 'company', companyAdminRole);
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`    ${status} ${testCase.description}: ${result ? '可见' : '隐藏'} (期望: ${testCase.expected ? '可见' : '隐藏'})`);
  });

  // 测试菜单过滤
  console.log('\n  菜单过滤测试:');
  const filteredItems = filterMenuItems(testMenuItems, 'company', companyAdminRole);
  console.log(`    原始菜单项数: ${testMenuItems.length}`);
  console.log(`    过滤后菜单项数: ${filteredItems.length}`);
  console.log('    过滤后的菜单项:', filteredItems.map(item => item.label));

  // 测试2：admin角色对比
  console.log('\n📋 测试2：admin角色对比');
  const adminRole = 'admin';
  const adminUserType = getUserTypeFromRole(adminRole);
  
  console.log(`  用户角色: ${adminRole}`);
  console.log(`  用户类型: ${adminUserType}`);
  
  const adminFilteredItems = filterMenuItems(testMenuItems, 'system', adminRole);
  console.log(`    过滤后菜单项数: ${adminFilteredItems.length}`);
  console.log('    过滤后的菜单项:', adminFilteredItems.map(item => item.label));

  console.log('\n🎉 菜单可见性测试完成!\n');
  
  return {
    companyAdmin: {
      userType: companyAdminUserType,
      filteredMenuCount: filteredItems.length,
      filteredMenus: filteredItems.map(item => item.label)
    },
    admin: {
      userType: adminUserType,
      filteredMenuCount: adminFilteredItems.length,
      filteredMenus: adminFilteredItems.map(item => item.label)
    }
  };
}

// 在开发环境下自动暴露到window对象，方便控制台调用
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // 延迟暴露，确保组件加载完成
  setTimeout(() => {
    (window as any).testMenuVisibility = testMenuVisibility;
  }, 1000);
}

export default testMenuVisibility;