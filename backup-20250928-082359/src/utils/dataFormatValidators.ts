// 数据格式验证工具函数
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  normalizedValue?: any;
}

// 基础数据类型验证
export class DataTypeValidators {
  // 验证字符串
  static validateString(
    value: any,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      trim?: boolean;
    } = {}
  ): ValidationResult {
    const { required = false, minLength, maxLength, pattern, trim = true } = options;

    if (value === null || value === undefined) {
      return {
        isValid: !required,
        message: required ? '此字段为必填项' : undefined,
      };
    }

    if (typeof value !== 'string') {
      return {
        isValid: false,
        message: '必须是字符串类型',
      };
    }

    const processedValue = trim ? value.trim() : value;

    if (required && processedValue === '') {
      return {
        isValid: false,
        message: '此字段不能为空',
      };
    }

    if (minLength !== undefined && processedValue.length < minLength) {
      return {
        isValid: false,
        message: `最少需要${minLength}个字符`,
      };
    }

    if (maxLength !== undefined && processedValue.length > maxLength) {
      return {
        isValid: false,
        message: `最多允许${maxLength}个字符`,
      };
    }

    if (pattern && !pattern.test(processedValue)) {
      return {
        isValid: false,
        message: '格式不正确',
      };
    }

    return {
      isValid: true,
      normalizedValue: processedValue,
    };
  }

  // 验证数字
  static validateNumber(
    value: any,
    options: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
      positive?: boolean;
      precision?: number;
    } = {}
  ): ValidationResult {
    const { required = false, min, max, integer = false, positive = false, precision } = options;

    if (value === null || value === undefined || value === '') {
      return {
        isValid: !required,
        message: required ? '此字段为必填项' : undefined,
      };
    }

    const numValue = typeof value === 'number' ? value : parseFloat(value);

    if (isNaN(numValue)) {
      return {
        isValid: false,
        message: '必须是有效数字',
      };
    }

    if (integer && !Number.isInteger(numValue)) {
      return {
        isValid: false,
        message: '必须是整数',
      };
    }

    if (positive && numValue <= 0) {
      return {
        isValid: false,
        message: '必须是正数',
      };
    }

    if (min !== undefined && numValue < min) {
      return {
        isValid: false,
        message: `不能小于${min}`,
      };
    }

    if (max !== undefined && numValue > max) {
      return {
        isValid: false,
        message: `不能大于${max}`,
      };
    }

    let normalizedValue = numValue;
    if (precision !== undefined) {
      normalizedValue = Math.round(numValue * Math.pow(10, precision)) / Math.pow(10, precision);
    }

    return {
      isValid: true,
      normalizedValue,
    };
  }

  // 验证日期
  static validateDate(
    value: any,
    options: {
      required?: boolean;
      minDate?: Date;
      maxDate?: Date;
      futureOnly?: boolean;
      pastOnly?: boolean;
    } = {}
  ): ValidationResult {
    const { required = false, minDate, maxDate, futureOnly = false, pastOnly = false } = options;

    if (value === null || value === undefined) {
      return {
        isValid: !required,
        message: required ? '此字段为必填项' : undefined,
      };
    }

    let dateValue: Date;
    if (value instanceof Date) {
      dateValue = value;
    } else if (typeof value === 'string') {
      dateValue = new Date(value);
    } else {
      return {
        isValid: false,
        message: '无效的日期格式',
      };
    }

    if (isNaN(dateValue.getTime())) {
      return {
        isValid: false,
        message: '无效的日期',
      };
    }

    const now = new Date();

    if (futureOnly && dateValue <= now) {
      return {
        isValid: false,
        message: '日期必须是未来时间',
      };
    }

    if (pastOnly && dateValue >= now) {
      return {
        isValid: false,
        message: '日期必须是过去时间',
      };
    }

    if (minDate && dateValue < minDate) {
      return {
        isValid: false,
        message: `日期不能早于${minDate.toLocaleDateString()}`,
      };
    }

    if (maxDate && dateValue > maxDate) {
      return {
        isValid: false,
        message: `日期不能晚于${maxDate.toLocaleDateString()}`,
      };
    }

    return {
      isValid: true,
      normalizedValue: dateValue,
    };
  }

  // 验证数组
  static validateArray(
    value: any,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      itemValidator?: (item: any, index: number) => ValidationResult;
    } = {}
  ): ValidationResult {
    const { required = false, minLength, maxLength, itemValidator } = options;

    if (value === null || value === undefined) {
      return {
        isValid: !required,
        message: required ? '此字段为必填项' : undefined,
      };
    }

    if (!Array.isArray(value)) {
      return {
        isValid: false,
        message: '必须是数组类型',
      };
    }

    if (minLength !== undefined && value.length < minLength) {
      return {
        isValid: false,
        message: `至少需要${minLength}个项目`,
      };
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return {
        isValid: false,
        message: `最多允许${maxLength}个项目`,
      };
    }

    if (itemValidator) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = itemValidator(value[i], i);
        if (!itemResult.isValid) {
          return {
            isValid: false,
            message: `第${i + 1}项：${itemResult.message}`,
          };
        }
      }
    }

    return {
      isValid: true,
      normalizedValue: value,
    };
  }
}

// 业务特定格式验证
export class BusinessFormatValidators {
  // 邮箱验证
  static validateEmail(value: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return DataTypeValidators.validateString(value, {
      required: true,
      maxLength: 255,
      pattern: emailRegex,
    });
  }

  // 手机号验证
  static validatePhoneNumber(value: string): ValidationResult {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return DataTypeValidators.validateString(value, {
      required: true,
      pattern: phoneRegex,
    });
  }

  // URL验证
  static validateURL(value: string): ValidationResult {
    try {
      new URL(value);
      return { isValid: true, normalizedValue: value };
    } catch {
      return { isValid: false, message: '无效的URL格式' };
    }
  }

  // 身份证验证
  static validateIDCard(value: string): ValidationResult {
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/;
    
    if (!idCardRegex.test(value)) {
      return {
        isValid: false,
        message: '身份证号码格式不正确',
      };
    }

    // 验证校验码
    const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(value[i]) * factors[i];
    }
    
    const expectedCheckCode = checkCodes[sum % 11];
    if (value[17].toUpperCase() !== expectedCheckCode) {
      return {
        isValid: false,
        message: '身份证号码校验位不正确',
      };
    }

    return {
      isValid: true,
      normalizedValue: value.toUpperCase(),
    };
  }

  // 统一社会信用代码验证
  static validateCreditCode(value: string): ValidationResult {
    const creditCodeRegex = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/;
    
    if (!creditCodeRegex.test(value)) {
      return {
        isValid: false,
        message: '统一社会信用代码格式不正确',
      };
    }

    // 这里可以添加更详细的校验逻辑
    return {
      isValid: true,
      normalizedValue: value.toUpperCase(),
    };
  }

  // 任务状态验证
  static validateTaskStatus(value: string): ValidationResult {
    const validStatuses = [
      'draft', 'planning', 'todo', 'in_progress', 'testing',
      'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'
    ];
    
    if (!validStatuses.includes(value)) {
      return {
        isValid: false,
        message: '无效的任务状态',
      };
    }

    return {
      isValid: true,
      normalizedValue: value,
    };
  }

  // 优先级验证
  static validatePriority(value: string): ValidationResult {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    
    if (!validPriorities.includes(value)) {
      return {
        isValid: false,
        message: '无效的优先级',
      };
    }

    return {
      isValid: true,
      normalizedValue: value,
    };
  }

  // 企业代码验证
  static validateEnterpriseCode(value: string): ValidationResult {
    const enterpriseCodeRegex = /^[A-Z0-9_]{2,20}$/;
    
    if (!enterpriseCodeRegex.test(value)) {
      return {
        isValid: false,
        message: '企业代码只能包含大写字母、数字和下划线，长度2-20位',
      };
    }

    return {
      isValid: true,
      normalizedValue: value.toUpperCase(),
    };
  }

  // JSON格式验证
  static validateJSON(value: string): ValidationResult {
    if (!value || value.trim() === '') {
      return { isValid: true, normalizedValue: null };
    }

    try {
      const parsed = JSON.parse(value);
      return {
        isValid: true,
        normalizedValue: parsed,
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'JSON格式不正确',
      };
    }
  }

  // 密码强度验证
  static validatePassword(value: string): ValidationResult {
    const checks = [
      { test: /.{8,}/, message: '密码长度至少8位' },
      { test: /[a-z]/, message: '必须包含小写字母' },
      { test: /[A-Z]/, message: '必须包含大写字母' },
      { test: /\d/, message: '必须包含数字' },
      { test: /[!@#$%^&*(),.?":{}|<>]/, message: '必须包含特殊字符' },
    ];

    for (const check of checks) {
      if (!check.test.test(value)) {
        return {
          isValid: false,
          message: check.message,
        };
      }
    }

    return {
      isValid: true,
      normalizedValue: value,
    };
  }
}

// 文件格式验证
export class FileValidators {
  // 文件大小验证
  static validateFileSize(file: File, maxSizeMB: number): ValidationResult {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        message: `文件大小不能超过${maxSizeMB}MB`,
      };
    }

    return {
      isValid: true,
      normalizedValue: file,
    };
  }

  // 文件类型验证
  static validateFileType(file: File, allowedTypes: string[]): ValidationResult {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type;

    const isExtensionValid = fileExtension && allowedTypes.some(type => 
      type.toLowerCase().includes(fileExtension)
    );
    const isMimeTypeValid = allowedTypes.some(type => 
      mimeType.includes(type.replace(/\./g, ''))
    );

    if (!isExtensionValid && !isMimeTypeValid) {
      return {
        isValid: false,
        message: `只允许上传${allowedTypes.join(', ')}格式的文件`,
      };
    }

    return {
      isValid: true,
      normalizedValue: file,
    };
  }

  // 图片格式验证
  static validateImageFile(file: File): ValidationResult {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        message: '只允许上传图片文件（JPG、PNG、GIF、WebP）',
      };
    }

    return this.validateFileSize(file, 5); // 限制5MB
  }

  // 文档格式验证
  static validateDocumentFile(file: File): ValidationResult {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        message: '只允许上传文档文件（PDF、Word、文本、Markdown）',
      };
    }

    return this.validateFileSize(file, 10); // 限制10MB
  }
}

// 综合验证器
export class DataValidator {
  // 批量验证多个字段
  static validateFields(data: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): {
    isValid: boolean;
    errors: Record<string, string>;
    normalizedData: Record<string, any>;
  } {
    const errors: Record<string, string> = {};
    const normalizedData: Record<string, any> = {};
    let isValid = true;

    for (const [field, validator] of Object.entries(rules)) {
      const result = validator(data[field]);
      
      if (!result.isValid) {
        errors[field] = result.message || '验证失败';
        isValid = false;
      } else if (result.normalizedValue !== undefined) {
        normalizedData[field] = result.normalizedValue;
      } else {
        normalizedData[field] = data[field];
      }
    }

    return { isValid, errors, normalizedData };
  }

  // 异步验证（用于需要服务器验证的场景）
  static async validateFieldsAsync(
    data: Record<string, any>,
    rules: Record<string, (value: any) => Promise<ValidationResult>>
  ): Promise<{
    isValid: boolean;
    errors: Record<string, string>;
    normalizedData: Record<string, any>;
  }> {
    const errors: Record<string, string> = {};
    const normalizedData: Record<string, any> = {};
    let isValid = true;

    for (const [field, validator] of Object.entries(rules)) {
      try {
        const result = await validator(data[field]);
        
        if (!result.isValid) {
          errors[field] = result.message || '验证失败';
          isValid = false;
        } else if (result.normalizedValue !== undefined) {
          normalizedData[field] = result.normalizedValue;
        } else {
          normalizedData[field] = data[field];
        }
      } catch (error) {
        errors[field] = '验证过程中发生错误';
        isValid = false;
      }
    }

    return { isValid, errors, normalizedData };
  }

  // 深度验证嵌套对象
  static validateNestedObject(
    data: any,
    schema: any
  ): ValidationResult {
    if (typeof data !== 'object' || data === null) {
      return {
        isValid: false,
        message: '必须是对象类型',
      };
    }

    const errors: string[] = [];
    const normalizedData: any = {};

    for (const [key, validator] of Object.entries(schema)) {
      if (typeof validator === 'function') {
        const result = (validator as Function)(data[key]);
        if (!result.isValid) {
          errors.push(`${key}: ${result.message}`);
        } else {
          normalizedData[key] = result.normalizedValue !== undefined 
            ? result.normalizedValue 
            : data[key];
        }
      }
    }

    return {
      isValid: errors.length === 0,
      message: errors.join('; '),
      normalizedValue: normalizedData,
    };
  }
}