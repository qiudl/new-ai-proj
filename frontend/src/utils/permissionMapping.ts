// 权限代码到中文名称的映射
export interface PermissionMapping {
  [key: string]: {
    name: string;
    description: string;
    category: string;
  };
}

// 权限分类中文名称映射
export const PERMISSION_CATEGORIES: Record<string, string> = {
  'user': '用户管理',
  'role': '角色管理', 
  'permission': '权限管理',
  'project': '项目管理',
  'task': '任务管理',
  'document': '文档管理',
  'system': '系统管理',
  'company': '企业管理',
  'enterprise': '组织管理',
  'department': '部门管理',
  'api': 'API管理',
  'audit': '审计日志',
  'report': '报表管理',
  'finance': '财务管理',
  'notification': '通知管理'
};

// 权限映射表
export const PERMISSION_MAPPINGS: PermissionMapping = {
  // 用户管理权限
  'user.create': {
    name: '创建用户',
    description: '允许创建新用户账户',
    category: '用户管理'
  },
  'user.read': {
    name: '查看用户',
    description: '允许查看用户信息',
    category: '用户管理'
  },
  'user.update': {
    name: '编辑用户',
    description: '允许修改用户信息',
    category: '用户管理'
  },
  'user.delete': {
    name: '删除用户',
    description: '允许删除用户账户',
    category: '用户管理'
  },
  'user.manage': {
    name: '用户管理',
    description: '完整的用户管理权限',
    category: '用户管理'
  },
  'user.profile.update': {
    name: '更新用户资料',
    description: '允许用户更新自己的资料',
    category: '用户管理'
  },
  'user.password.reset': {
    name: '重置密码',
    description: '允许重置用户密码',
    category: '用户管理'
  },

  // 角色管理权限
  'role.create': {
    name: '创建角色',
    description: '允许创建新角色',
    category: '角色管理'
  },
  'role.read': {
    name: '查看角色',
    description: '允许查看角色信息',
    category: '角色管理'
  },
  'role.update': {
    name: '编辑角色',
    description: '允许修改角色信息',
    category: '角色管理'
  },
  'role.delete': {
    name: '删除角色',
    description: '允许删除角色',
    category: '角色管理'
  },
  'role.manage': {
    name: '角色管理',
    description: '完整的角色管理权限',
    category: '角色管理'
  },
  'role.assign': {
    name: '分配角色',
    description: '允许为用户分配角色',
    category: '角色管理'
  },

  // 权限管理
  'permission.create': {
    name: '创建权限',
    description: '允许创建新权限',
    category: '权限管理'
  },
  'permission.read': {
    name: '查看权限',
    description: '允许查看权限信息',
    category: '权限管理'
  },
  'permission.update': {
    name: '编辑权限',
    description: '允许修改权限设置',
    category: '权限管理'
  },
  'permission.delete': {
    name: '删除权限',
    description: '允许删除权限',
    category: '权限管理'
  },
  'permission.manage': {
    name: '权限管理',
    description: '完整的权限管理权限',
    category: '权限管理'
  },

  // 项目管理权限
  'project.create': {
    name: '创建项目',
    description: '允许创建新项目',
    category: '项目管理'
  },
  'project.read': {
    name: '查看项目',
    description: '允许查看项目信息',
    category: '项目管理'
  },
  'project.update': {
    name: '编辑项目',
    description: '允许修改项目信息',
    category: '项目管理'
  },
  'project.delete': {
    name: '删除项目',
    description: '允许删除项目',
    category: '项目管理'
  },
  'project.manage': {
    name: '项目管理',
    description: '完整的项目管理权限',
    category: '项目管理'
  },
  'project.member.manage': {
    name: '项目成员管理',
    description: '允许管理项目成员',
    category: '项目管理'
  },
  'project.settings.manage': {
    name: '项目设置管理',
    description: '允许管理项目设置',
    category: '项目管理'
  },

  // 任务管理权限
  'task.create': {
    name: '创建任务',
    description: '允许创建新任务',
    category: '任务管理'
  },
  'task.read': {
    name: '查看任务',
    description: '允许查看任务信息',
    category: '任务管理'
  },
  'task.update': {
    name: '编辑任务',
    description: '允许修改任务信息',
    category: '任务管理'
  },
  'task.delete': {
    name: '删除任务',
    description: '允许删除任务',
    category: '任务管理'
  },
  'task.manage': {
    name: '任务管理',
    description: '完整的任务管理权限',
    category: '任务管理'
  },
  'task.assign': {
    name: '分配任务',
    description: '允许为用户分配任务',
    category: '任务管理'
  },
  'task.status.update': {
    name: '更新任务状态',
    description: '允许更新任务状态',
    category: '任务管理'
  },

  // 文档管理权限
  'document.create': {
    name: '创建文档',
    description: '允许创建新文档',
    category: '文档管理'
  },
  'document.read': {
    name: '查看文档',
    description: '允许查看文档内容',
    category: '文档管理'
  },
  'document.update': {
    name: '编辑文档',
    description: '允许修改文档内容',
    category: '文档管理'
  },
  'document.delete': {
    name: '删除文档',
    description: '允许删除文档',
    category: '文档管理'
  },
  'document.manage': {
    name: '文档管理',
    description: '完整的文档管理权限',
    category: '文档管理'
  },
  'document.share': {
    name: '分享文档',
    description: '允许分享文档给其他用户',
    category: '文档管理'
  },
  'document.export': {
    name: '导出文档',
    description: '允许导出文档',
    category: '文档管理'
  },

  // 系统管理权限
  'system.config.read': {
    name: '查看系统配置',
    description: '允许查看系统配置',
    category: '系统管理'
  },
  'system.config.update': {
    name: '修改系统配置',
    description: '允许修改系统配置',
    category: '系统管理'
  },
  'system.backup': {
    name: '系统备份',
    description: '允许执行系统备份',
    category: '系统管理'
  },
  'system.monitor': {
    name: '系统监控',
    description: '允许查看系统监控信息',
    category: '系统管理'
  },
  'system.log.read': {
    name: '查看系统日志',
    description: '允许查看系统日志',
    category: '系统管理'
  },

  // 企业/组织管理权限
  'company.create': {
    name: '创建企业',
    description: '允许创建新企业',
    category: '企业管理'
  },
  'company.read': {
    name: '查看企业',
    description: '允许查看企业信息',
    category: '企业管理'
  },
  'company.update': {
    name: '编辑企业',
    description: '允许修改企业信息',
    category: '企业管理'
  },
  'company.delete': {
    name: '删除企业',
    description: '允许删除企业',
    category: '企业管理'
  },
  'company.manage': {
    name: '企业管理',
    description: '完整的企业管理权限',
    category: '企业管理'
  },
  'enterprise.create': {
    name: '创建组织',
    description: '允许创建新组织',
    category: '组织管理'
  },
  'enterprise.read': {
    name: '查看组织',
    description: '允许查看组织信息',
    category: '组织管理'
  },
  'enterprise.update': {
    name: '编辑组织',
    description: '允许修改组织信息',
    category: '组织管理'
  },
  'enterprise.delete': {
    name: '删除组织',
    description: '允许删除组织',
    category: '组织管理'
  },
  'enterprise.manage': {
    name: '组织管理',
    description: '完整的组织管理权限',
    category: '组织管理'
  },

  // 部门管理权限
  'department.create': {
    name: '创建部门',
    description: '允许创建新部门',
    category: '部门管理'
  },
  'department.read': {
    name: '查看部门',
    description: '允许查看部门信息',
    category: '部门管理'
  },
  'department.update': {
    name: '编辑部门',
    description: '允许修改部门信息',
    category: '部门管理'
  },
  'department.delete': {
    name: '删除部门',
    description: '允许删除部门',
    category: '部门管理'
  },
  'department.manage': {
    name: '部门管理',
    description: '完整的部门管理权限',
    category: '部门管理'
  },

  // API管理权限
  'api.create': {
    name: '创建API密钥',
    description: '允许创建API密钥',
    category: 'API管理'
  },
  'api.read': {
    name: '查看API密钥',
    description: '允许查看API密钥',
    category: 'API管理'
  },
  'api.update': {
    name: '编辑API密钥',
    description: '允许修改API密钥',
    category: 'API管理'
  },
  'api.delete': {
    name: '删除API密钥',
    description: '允许删除API密钥',
    category: 'API管理'
  },
  'api.manage': {
    name: 'API管理',
    description: '完整的API管理权限',
    category: 'API管理'
  },

  // 审计日志权限
  'audit.read': {
    name: '查看审计日志',
    description: '允许查看审计日志',
    category: '审计日志'
  },
  'audit.export': {
    name: '导出审计日志',
    description: '允许导出审计日志',
    category: '审计日志'
  },

  // 报表管理权限
  'report.read': {
    name: '查看报表',
    description: '允许查看报表',
    category: '报表管理'
  },
  'report.create': {
    name: '创建报表',
    description: '允许创建自定义报表',
    category: '报表管理'
  },
  'report.export': {
    name: '导出报表',
    description: '允许导出报表数据',
    category: '报表管理'
  }
};

// 获取权限的中文名称
export function getPermissionName(permissionCode: string): string {
  const mapping = PERMISSION_MAPPINGS[permissionCode];
  if (mapping) {
    return mapping.name;
  }
  
  // 如果没有找到映射，尝试从权限代码推断
  const parts = permissionCode.split('.');
  if (parts.length >= 2) {
    const resource = parts[0];
    const action = parts[1];
    
    const resourceName = PERMISSION_CATEGORIES[resource] || resource;
    const actionMap: Record<string, string> = {
      'create': '创建',
      'read': '查看', 
      'update': '编辑',
      'delete': '删除',
      'manage': '管理',
      'assign': '分配',
      'export': '导出',
      'import': '导入',
      'approve': '审批',
      'reject': '拒绝'
    };
    
    const actionName = actionMap[action] || action;
    return `${actionName}${resourceName}`;
  }
  
  // 最后回退到原始代码
  return permissionCode;
}

// 获取权限描述
export function getPermissionDescription(permissionCode: string): string {
  const mapping = PERMISSION_MAPPINGS[permissionCode];
  return mapping?.description || `${getPermissionName(permissionCode)}权限`;
}

// 获取权限分类
export function getPermissionCategory(permissionCode: string): string {
  const mapping = PERMISSION_MAPPINGS[permissionCode];
  if (mapping) {
    return mapping.category;
  }
  
  // 从权限代码推断分类
  const parts = permissionCode.split('.');
  if (parts.length >= 1) {
    const resource = parts[0];
    return PERMISSION_CATEGORIES[resource] || '其他';
  }
  
  return '其他';
}

// 按分类组织权限
export function groupPermissionsByCategory(permissions: Array<{permission_code?: string; permissionCode?: string}>): Record<string, Array<any>> {
  const grouped: Record<string, Array<any>> = {};
  
  permissions.forEach(permission => {
    const code = permission.permission_code || permission.permissionCode || '';
    const category = getPermissionCategory(code);
    
    if (!grouped[category]) {
      grouped[category] = [];
    }
    
    grouped[category].push({
      ...permission,
      displayName: getPermissionName(code),
      displayDescription: getPermissionDescription(code)
    });
  });
  
  return grouped;
}