import api from './api';

// 密码修改请求接口
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

// 密码验证结果接口
export interface PasswordValidationResult {
  valid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
  errors: string[];
  suggestions: string[];
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * 密码管理服务
 * 提供密码修改和密码强度验证功能
 */
class PasswordService {
  /**
   * 修改当前用户密码
   * @param data 密码修改请求数据
   * @returns Promise<ApiResponse>
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    try {
      const response = await api.post('/users/me/change-password', data);
      return {
        success: true,
        message: response.data?.message || '密码修改成功',
        data: response.data
      };
    } catch (error: any) {
      console.error('修改密码失败:', error);

      // 处理后端返回的错误信息
      if (error.response?.data) {
        const errorData = error.response.data;
        return {
          success: false,
          error: errorData.error || {
            code: 'UNKNOWN_ERROR',
            message: errorData.message || '密码修改失败',
            details: errorData.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '网络错误，请稍后重试'
        }
      };
    }
  }

  /**
   * 验证密码强度
   * @param password 待验证的密码
   * @returns Promise<ApiResponse<PasswordValidationResult>>
   */
  async validatePasswordStrength(password: string): Promise<ApiResponse<PasswordValidationResult>> {
    try {
      const response = await api.post('/auth/validate-password', { password });
      return {
        success: true,
        data: response.data?.data,
        message: response.data?.message
      };
    } catch (error: any) {
      console.error('密码强度验证失败:', error);

      // 如果验证接口失败，返回默认的弱密码结果
      return {
        success: false,
        data: {
          valid: false,
          strength: 'weak',
          score: 0,
          errors: ['无法验证密码强度'],
          suggestions: ['请确保密码至少8个字符，包含大小写字母、数字和特殊字符']
        }
      };
    }
  }

  /**
   * 客户端密码强度校验（快速校验，无需调用API）
   * @param password 待验证的密码
   * @returns PasswordValidationResult
   */
  validatePasswordLocally(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // 检查长度
    if (password.length < 8) {
      errors.push('密码至少需要8个字符');
    } else {
      score += 20;
      if (password.length >= 12) score += 10;
      if (password.length >= 16) score += 10;
    }

    // 检查大写字母
    if (!/[A-Z]/.test(password)) {
      errors.push('密码需要包含大写字母');
      suggestions.push('添加大写字母以增强密码强度');
    } else {
      score += 15;
    }

    // 检查小写字母
    if (!/[a-z]/.test(password)) {
      errors.push('密码需要包含小写字母');
      suggestions.push('添加小写字母以增强密码强度');
    } else {
      score += 15;
    }

    // 检查数字
    if (!/\d/.test(password)) {
      errors.push('密码需要包含数字');
      suggestions.push('添加数字以增强密码强度');
    } else {
      score += 15;
    }

    // 检查特殊字符
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      errors.push('密码需要包含特殊字符');
      suggestions.push('添加特殊字符（如!@#$%）以增强密码强度');
    } else {
      score += 15;
    }

    // 检查重复字符
    if (/(.)\1{2,}/.test(password)) {
      suggestions.push('避免连续重复字符');
    } else {
      score += 10;
    }

    // 确定密码强度等级
    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score < 40) {
      strength = 'weak';
    } else if (score < 60) {
      strength = 'fair';
    } else if (score < 80) {
      strength = 'good';
    } else {
      strength = 'strong';
    }

    return {
      valid: errors.length === 0,
      strength,
      score,
      errors,
      suggestions
    };
  }

  /**
   * 检查两个密码是否匹配
   * @param password 密码
   * @param confirmPassword 确认密码
   * @returns boolean
   */
  passwordsMatch(password: string, confirmPassword: string): boolean {
    return password === confirmPassword && password.length > 0;
  }

  /**
   * 获取密码强度的颜色代码（用于UI显示）
   * @param strength 密码强度等级
   * @returns string
   */
  getStrengthColor(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
    const colorMap = {
      weak: '#ff4d4f',      // 红色
      fair: '#faad14',      // 橙色
      good: '#1890ff',      // 蓝色
      strong: '#52c41a'     // 绿色
    };
    return colorMap[strength];
  }

  /**
   * 获取密码强度的进度百分比
   * @param score 密码评分（0-100）
   * @returns number
   */
  getStrengthPercent(score: number): number {
    return Math.min(100, Math.max(0, score));
  }

  /**
   * 获取密码强度的文字描述
   * @param strength 密码强度等级
   * @returns string
   */
  getStrengthText(strength: 'weak' | 'fair' | 'good' | 'strong'): string {
    const textMap = {
      weak: '弱',
      fair: '一般',
      good: '良好',
      strong: '强'
    };
    return textMap[strength];
  }
}

// 导出单例实例
const passwordService = new PasswordService();
export default passwordService;
