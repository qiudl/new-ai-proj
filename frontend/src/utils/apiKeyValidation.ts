/**
 * API Key验证和安全工具类
 * 用于API Key管理界面的安全性验证
 */

export interface APIKeyValidationResult {
  valid: boolean;
  message: string;
  level: 'error' | 'warning' | 'info';
}

export interface PermissionValidationResult {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * API Key格式验证
 */
export class APIKeyValidator {
  
  /**
   * 验证API Key的基本格式
   */
  static validateFormat(apiKey: string): APIKeyValidationResult {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        valid: false,
        message: 'API Key不能为空',
        level: 'error'
      };
    }

    // 基本长度检查
    if (apiKey.length < 16) {
      return {
        valid: false,
        message: 'API Key长度不能少于16个字符',
        level: 'error'
      };
    }

    if (apiKey.length > 256) {
      return {
        valid: false,
        message: 'API Key长度不能超过256个字符',
        level: 'error'
      };
    }

    // 检查是否包含危险字符
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /eval\(/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(apiKey)) {
        return {
          valid: false,
          message: 'API Key包含不安全的字符',
          level: 'error'
        };
      }
    }

    // 检查是否为明显的测试或占位符密钥
    const testPatterns = [
      /^test/i,
      /^demo/i,
      /^example/i,
      /^placeholder/i,
      /^your_api_key/i,
      /^123456/,
      /^abc/i
    ];

    for (const pattern of testPatterns) {
      if (pattern.test(apiKey)) {
        return {
          valid: true,
          message: '检测到测试密钥，请确保在生产环境中使用真实的API Key',
          level: 'warning'
        };
      }
    }

    return {
      valid: true,
      message: 'API Key格式验证通过',
      level: 'info'
    };
  }

  /**
   * 验证API Key强度
   */
  static validateStrength(apiKey: string): APIKeyValidationResult {
    const hasLower = /[a-z]/.test(apiKey);
    const hasUpper = /[A-Z]/.test(apiKey);
    const hasNumber = /[0-9]/.test(apiKey);
    const hasSpecial = /[^a-zA-Z0-9]/.test(apiKey);
    
    let score = 0;
    let weaknesses: string[] = [];

    if (hasLower) score++;
    else weaknesses.push('缺少小写字母');

    if (hasUpper) score++;
    else weaknesses.push('缺少大写字母');

    if (hasNumber) score++;
    else weaknesses.push('缺少数字');

    if (hasSpecial) score++;
    else weaknesses.push('缺少特殊字符');

    if (apiKey.length >= 32) score++;
    else weaknesses.push('长度不足32位');

    if (score >= 4) {
      return {
        valid: true,
        message: 'API Key强度良好',
        level: 'info'
      };
    } else if (score >= 2) {
      return {
        valid: true,
        message: `API Key强度中等，建议改进：${weaknesses.join('、')}`,
        level: 'warning'
      };
    } else {
      return {
        valid: false,
        message: `API Key强度较弱：${weaknesses.join('、')}`,
        level: 'error'
      };
    }
  }

  /**
   * 检查API Key是否可能暴露
   */
  static checkExposureRisk(apiKey: string): APIKeyValidationResult {
    // 检查是否包含明显的用户信息
    const exposurePatterns = [
      /admin/i,
      /user/i,
      /test/i,
      /dev/i,
      /prod/i,
      /\d{4}-\d{2}-\d{2}/,  // 日期格式
      /\d{10,}/  // 长数字（可能是时间戳）
    ];

    for (const pattern of exposurePatterns) {
      if (pattern.test(apiKey)) {
        return {
          valid: true,
          message: 'API Key可能包含易识别信息，存在暴露风险',
          level: 'warning'
        };
      }
    }

    return {
      valid: true,
      message: 'API Key暴露风险检查通过',
      level: 'info'
    };
  }
}

/**
 * 权限验证器
 */
export class PermissionValidator {
  
  // 权限层级定义
  private static readonly PERMISSION_LEVELS = {
    'task.read': 1,
    'task.write': 2,
    'task.delete': 3,
    'project.read': 1,
    'project.write': 2,
    'user.read': 2,
    'document.write': 2,
    'timer.write': 2,
    'system.admin': 4
  };

  // 权限依赖关系
  private static readonly PERMISSION_DEPENDENCIES: Record<string, string[]> = {
    'task.write': ['task.read'],
    'task.delete': ['task.read', 'task.write'],
    'project.write': ['project.read'],
    'system.admin': ['user.read', 'project.read', 'task.read']
  };

  /**
   * 验证权限组合的合理性
   */
  static validatePermissionCombination(permissions: string[]): PermissionValidationResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 检查权限依赖关系
    for (const permission of permissions) {
      const dependencies = this.PERMISSION_DEPENDENCIES[permission];
      if (dependencies) {
        for (const dependency of dependencies) {
          if (!permissions.includes(dependency)) {
            warnings.push(`权限 "${permission}" 依赖于 "${dependency}"，建议同时添加`);
          }
        }
      }
    }

    // 检查权限层级合理性
    const maxLevel = Math.max(...permissions.map(p => this.PERMISSION_LEVELS[p] || 0));
    if (maxLevel >= 3) {
      warnings.push('包含高级权限，请确保API Key使用场景的安全性');
    }

    // 检查权限最小化原则
    if (permissions.length > 5) {
      recommendations.push('考虑权限最小化原则，仅分配必需的权限');
    }

    // 检查特殊权限组合
    if (permissions.includes('system.admin') && permissions.length > 1) {
      recommendations.push('系统管理员权限已包含大部分功能，可考虑简化权限配置');
    }

    if (permissions.includes('task.delete') && !permissions.includes('task.write')) {
      warnings.push('拥有删除权限但缺少编辑权限，这可能不是预期的权限组合');
    }

    return {
      valid: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  /**
   * 获取权限描述
   */
  static getPermissionDescription(permission: string): string {
    const descriptions: Record<string, string> = {
      'task.read': '可以查看任务信息，包括任务详情、状态、分配情况等',
      'task.write': '可以创建和编辑任务，修改任务属性、状态、描述等',
      'task.delete': '可以删除任务，包括将任务移动到回收站',
      'project.read': '可以查看项目信息，包括项目详情、成员、进度等',
      'project.write': '可以创建和编辑项目，修改项目设置、添加成员等',
      'user.read': '可以查看用户信息，包括用户列表、个人资料等',
      'document.write': '可以创建、编辑和管理文档，包括任务文档和工作笔记',
      'timer.write': '可以使用计时器功能，包括启动、暂停、停止计时等',
      'system.admin': '系统管理员权限，可以访问所有功能和系统设置'
    };

    return descriptions[permission] || '未知权限';
  }

  /**
   * 获取权限安全等级
   */
  static getPermissionSecurityLevel(permission: string): 'low' | 'medium' | 'high' | 'critical' {
    const level = this.PERMISSION_LEVELS[permission] || 0;
    
    if (level >= 4) return 'critical';
    if (level >= 3) return 'high';
    if (level >= 2) return 'medium';
    return 'low';
  }
}

/**
 * API Key安全工具
 */
export class APIKeySecurity {
  
  /**
   * 生成安全的API Key掩码
   */
  static maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '*'.repeat(8);
    }

    const start = apiKey.slice(0, 4);
    const end = apiKey.slice(-4);
    const middle = '*'.repeat(Math.max(8, apiKey.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * 检查API Key是否接近过期
   */
  static checkExpirationWarning(expiresAt?: string): {
    warning: boolean;
    message: string;
    daysLeft: number;
  } {
    if (!expiresAt) {
      return {
        warning: false,
        message: '无过期时间限制',
        daysLeft: Infinity
      };
    }

    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return {
        warning: true,
        message: 'API Key已过期',
        daysLeft: 0
      };
    } else if (daysLeft <= 7) {
      return {
        warning: true,
        message: `API Key将在 ${daysLeft} 天后过期`,
        daysLeft
      };
    } else if (daysLeft <= 30) {
      return {
        warning: true,
        message: `API Key将在 ${daysLeft} 天后过期`,
        daysLeft
      };
    }

    return {
      warning: false,
      message: `API Key有效期还有 ${daysLeft} 天`,
      daysLeft
    };
  }

  /**
   * 检查使用限制警告
   */
  static checkUsageLimitWarning(usageCount: number, usageLimit?: number): {
    warning: boolean;
    message: string;
    percentage: number;
  } {
    if (!usageLimit) {
      return {
        warning: false,
        message: '无使用次数限制',
        percentage: 0
      };
    }

    const percentage = (usageCount / usageLimit) * 100;

    if (percentage >= 100) {
      return {
        warning: true,
        message: 'API Key使用次数已达上限',
        percentage: 100
      };
    } else if (percentage >= 90) {
      return {
        warning: true,
        message: `API Key使用次数已达 ${percentage.toFixed(1)}%`,
        percentage
      };
    } else if (percentage >= 75) {
      return {
        warning: true,
        message: `API Key使用次数已达 ${percentage.toFixed(1)}%`,
        percentage
      };
    }

    return {
      warning: false,
      message: `API Key使用次数 ${percentage.toFixed(1)}%`,
      percentage
    };
  }

  /**
   * 生成安全建议
   */
  static generateSecurityRecommendations(apiKey: {
    name: string;
    permissions: string[];
    expiresAt?: string;
    usageCount: number;
    usageLimit?: number;
    lastUsed?: string;
    createdAt: string;
  }): string[] {
    const recommendations: string[] = [];

    // 检查过期时间
    if (!apiKey.expiresAt) {
      recommendations.push('建议为API Key设置过期时间以提高安全性');
    }

    // 检查使用限制
    if (!apiKey.usageLimit) {
      recommendations.push('建议设置使用次数限制以防止滥用');
    }

    // 检查权限数量
    if (apiKey.permissions.length > 5) {
      recommendations.push('考虑减少权限数量，遵循最小权限原则');
    }

    // 检查高级权限
    const hasHighLevelPermissions = apiKey.permissions.some(p => 
      PermissionValidator.getPermissionSecurityLevel(p) === 'high' || 
      PermissionValidator.getPermissionSecurityLevel(p) === 'critical'
    );
    
    if (hasHighLevelPermissions) {
      recommendations.push('检测到高级权限，请确保API Key的安全存储和使用');
    }

    // 检查使用情况
    if (!apiKey.lastUsed) {
      const daysSinceCreated = Math.ceil((Date.now() - new Date(apiKey.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated > 30) {
        recommendations.push('API Key长期未使用，考虑删除以减少安全风险');
      }
    }

    // 检查创建时间
    const monthsSinceCreated = Math.ceil((Date.now() - new Date(apiKey.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (monthsSinceCreated > 6) {
      recommendations.push('API Key创建时间较久，建议定期轮换以提高安全性');
    }

    return recommendations;
  }
}

export default {
  APIKeyValidator,
  PermissionValidator,
  APIKeySecurity
};