import React from 'react';
import { RuleObject } from 'antd/es/form';
import { StoreValue } from 'antd/es/form/interface';

// 扩展的验证错误接口
export interface ValidationResult {
  success: boolean;
  message?: string;
  field?: string;
}

// 异步验证函数类型
export type AsyncValidator = (value: any, callback: (error?: string) => void) => void;

// 增强的验证规则类
export class EnhancedValidators {
  // 必填字段验证
  static required(message?: string): RuleObject {
    return {
      required: true,
      message: message || '此字段为必填项',
      whitespace: true,
    };
  }

  // 字符串长度验证
  static stringLength(min: number, max: number, message?: string): RuleObject {
    return {
      min,
      max,
      message: message || `长度必须在${min}-${max}个字符之间`,
    };
  }

  // 最小长度验证
  static minLength(min: number, message?: string): RuleObject {
    return {
      min,
      message: message || `最少需要${min}个字符`,
    };
  }

  // 最大长度验证
  static maxLength(max: number, message?: string): RuleObject {
    return {
      max,
      message: message || `最多允许${max}个字符`,
    };
  }

  // 邮箱验证
  static email(message?: string): RuleObject {
    return {
      type: 'email',
      message: message || '请输入正确的邮箱格式',
    };
  }

  // URL验证
  static url(message?: string): RuleObject {
    return {
      type: 'url',
      message: message || '请输入正确的URL格式',
    };
  }

  // 数字范围验证
  static numberRange(min: number, max: number, message?: string): RuleObject {
    return {
      type: 'number',
      min,
      max,
      message: message || `数值必须在${min}-${max}之间`,
    };
  }

  // 正整数验证
  static positiveInteger(message?: string): RuleObject {
    return {
      pattern: /^[1-9]\d*$/,
      message: message || '请输入正整数',
    };
  }

  // 非负整数验证
  static nonNegativeInteger(message?: string): RuleObject {
    return {
      pattern: /^(0|[1-9]\d*)$/,
      message: message || '请输入非负整数',
    };
  }

  // 小数验证
  static decimal(decimalPlaces = 2, message?: string): RuleObject {
    const pattern = new RegExp(`^\\d+(\\.\\d{1,${decimalPlaces}})?$`);
    return {
      pattern,
      message: message || `请输入有效的小数（最多${decimalPlaces}位小数）`,
    };
  }

  // 手机号验证
  static phoneNumber(message?: string): RuleObject {
    return {
      pattern: /^1[3-9]\d{9}$/,
      message: message || '请输入正确的手机号码',
    };
  }

  // 中文姓名验证
  static chineseName(message?: string): RuleObject {
    return {
      pattern: /^[\u4e00-\u9fa5]{2,10}$/,
      message: message || '请输入2-10位中文姓名',
    };
  }

  // 英文姓名验证
  static englishName(message?: string): RuleObject {
    return {
      pattern: /^[a-zA-Z\s]{2,50}$/,
      message: message || '请输入2-50位英文姓名',
    };
  }

  // 企业代码验证
  static enterpriseCode(message?: string): RuleObject {
    return {
      pattern: /^[A-Z0-9_]{2,20}$/,
      message: message || '企业代码只能包含大写字母、数字和下划线，2-20位',
    };
  }

  // 税务识别号验证
  static taxId(message?: string): RuleObject {
    return {
      pattern: /^[0-9A-Z]{10,20}$/,
      message: message || '请输入正确的税务识别号',
    };
  }

  // 统一社会信用代码验证
  static creditCode(message?: string): RuleObject {
    return {
      pattern: /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/,
      message: message || '请输入正确的统一社会信用代码',
    };
  }

  // JSON验证
  static jsonFormat(message?: string): RuleObject {
    return {
      validator: (_: RuleObject, value: string) => {
        if (!value) return Promise.resolve();
        try {
          JSON.parse(value);
          return Promise.resolve();
        } catch {
          return Promise.reject(new Error(message || '请输入正确的JSON格式'));
        }
      },
    };
  }

  // 密码强度验证
  static passwordStrength(message?: string): RuleObject {
    return {
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      message: message || '密码必须包含大小写字母、数字和特殊字符，至少8位',
    };
  }

  // 确认密码验证
  static confirmPassword(passwordField: string, message?: string): RuleObject {
    return {
      validator: (_: RuleObject, value: string, callback: any) => {
        const form = _.getFieldsValue && _.getFieldsValue();
        if (value && value !== form[passwordField]) {
          callback(message || '两次输入的密码不一致');
        } else {
          callback();
        }
      },
    };
  }

  // 数组长度验证
  static arrayLength(min: number, max: number, message?: string): RuleObject {
    return {
      validator: (_: RuleObject, value: any[]) => {
        if (!Array.isArray(value)) {
          return Promise.reject(new Error('值必须是数组'));
        }
        if (value.length < min || value.length > max) {
          return Promise.reject(new Error(message || `选择项数量必须在${min}-${max}之间`));
        }
        return Promise.resolve();
      },
    };
  }

  // 文件大小验证
  static fileSize(maxSizeMB: number, message?: string): RuleObject {
    return {
      validator: (_: RuleObject, fileList: any) => {
        if (!fileList || fileList.length === 0) return Promise.resolve();
        
        const files = Array.isArray(fileList) ? fileList : [fileList];
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        for (const file of files) {
          const size = file.size || file.originFileObj?.size;
          if (size && size > maxSizeBytes) {
            return Promise.reject(new Error(message || `文件大小不能超过${maxSizeMB}MB`));
          }
        }
        return Promise.resolve();
      },
    };
  }

  // 文件类型验证
  static fileType(allowedTypes: string[], message?: string): RuleObject {
    return {
      validator: (_: RuleObject, fileList: any) => {
        if (!fileList || fileList.length === 0) return Promise.resolve();
        
        const files = Array.isArray(fileList) ? fileList : [fileList];
        
        for (const file of files) {
          const fileType = file.type || file.originFileObj?.type;
          if (fileType && !allowedTypes.includes(fileType)) {
            return Promise.reject(new Error(message || `只允许上传${allowedTypes.join(', ')}格式的文件`));
          }
        }
        return Promise.resolve();
      },
    };
  }

  // 时间范围验证
  static dateRange(startField: string, message?: string): RuleObject {
    return {
      validator: (rule: RuleObject, value: any, callback: any) => {
        const form = rule.getFieldsValue && rule.getFieldsValue();
        if (value && form[startField] && value.isBefore(form[startField])) {
          callback(message || '结束时间不能早于开始时间');
        } else {
          callback();
        }
      },
    };
  }

  // 自定义异步验证
  static asyncValidator(
    validator: (value: any) => Promise<boolean>,
    message: string
  ): RuleObject {
    return {
      validator: async (_: RuleObject, value: any) => {
        if (!value) return Promise.resolve();
        
        const isValid = await validator(value);
        if (!isValid) {
          return Promise.reject(new Error(message));
        }
        return Promise.resolve();
      },
    };
  }

  // 重复值验证（异步）
  static unique(
    checkUnique: (value: string) => Promise<boolean>,
    message?: string
  ): RuleObject {
    return this.asyncValidator(checkUnique, message || '该值已存在，请使用其他值');
  }

  // 依赖字段验证
  static dependsOn(
    dependentField: string,
    condition: (dependentValue: any) => boolean,
    message?: string
  ): RuleObject {
    return {
      validator: (rule: RuleObject, value: any, callback: any) => {
        const form = rule.getFieldsValue && rule.getFieldsValue();
        const dependentValue = form[dependentField];
        
        if (condition(dependentValue) && !value) {
          callback(message || `当${dependentField}满足条件时，此字段为必填`);
        } else {
          callback();
        }
      },
    };
  }
}

// 业务相关的验证规则
export class BusinessValidators {
  // 任务标题验证
  static taskTitle(): RuleObject[] {
    return [
      EnhancedValidators.required('请输入任务标题'),
      EnhancedValidators.stringLength(1, 200, '任务标题长度在1-200个字符之间'),
      {
        pattern: /^[^\n\r]*$/,
        message: '任务标题不能包含换行符',
      },
    ];
  }

  // 任务状态验证
  static taskStatus(): RuleObject[] {
    return [
      EnhancedValidators.required('请选择任务状态'),
      {
        enum: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'],
        message: '无效的任务状态',
      },
    ];
  }

  // 任务优先级验证
  static taskPriority(): RuleObject[] {
    return [
      {
        enum: ['low', 'medium', 'high', 'urgent'],
        message: '无效的优先级',
      },
    ];
  }

  // 项目ID验证
  static projectId(): RuleObject[] {
    return [
      EnhancedValidators.required('请选择项目'),
      EnhancedValidators.positiveInteger('项目ID必须是正整数'),
    ];
  }

  // 工时验证
  static estimatedHours(): RuleObject[] {
    return [
      EnhancedValidators.numberRange(0.1, 9999, '工时必须在0.1-9999小时之间'),
      EnhancedValidators.decimal(1, '最多一位小数'),
    ];
  }

  // 进度验证
  static progress(): RuleObject[] {
    return [
      EnhancedValidators.numberRange(0, 100, '进度必须在0-100之间'),
      EnhancedValidators.nonNegativeInteger('进度必须是非负整数'),
    ];
  }

  // 企业名称验证
  static enterpriseName(): RuleObject[] {
    return [
      EnhancedValidators.required('请输入企业名称'),
      EnhancedValidators.stringLength(2, 100, '企业名称长度在2-100个字符之间'),
    ];
  }

  // 企业代码验证
  static enterpriseCode(): RuleObject[] {
    return [
      EnhancedValidators.required('请输入企业代码'),
      EnhancedValidators.enterpriseCode(),
    ];
  }

  // 用户名验证
  static username(): RuleObject[] {
    return [
      EnhancedValidators.required('请输入用户名'),
      EnhancedValidators.stringLength(3, 30, '用户名长度在3-30个字符之间'),
      {
        pattern: /^[a-zA-Z0-9_]{3,30}$/,
        message: '用户名只能包含字母、数字和下划线',
      },
    ];
  }

  // 权限代码验证
  static permissionCode(): RuleObject[] {
    return [
      EnhancedValidators.required('请输入权限代码'),
      {
        pattern: /^[a-z0-9_]+(\.[a-z0-9_]+)*$/,
        message: '权限代码格式：小写字母、数字、下划线，可用点分隔',
      },
    ];
  }
}

// 表单验证状态管理Hook
export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, RuleObject[]>
) => {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});
  const [validating, setValidating] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = async (fieldName: keyof T, value: any): Promise<string | null> => {
    const rules = validationRules[fieldName];
    if (!rules || rules.length === 0) return null;

    setValidating(prev => ({ ...prev, [fieldName]: true }));

    try {
      for (const rule of rules) {
        if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
          return rule.message || '此字段为必填项';
        }

        if (rule.pattern && value && !rule.pattern.test(value.toString())) {
          return rule.message || '格式不正确';
        }

        if (rule.validator) {
          try {
            await new Promise<void>((resolve, reject) => {
              rule.validator(rule, value, (error?: string) => {
                if (error) reject(new Error(error));
                else resolve();
              });
            });
          } catch (error) {
            return error instanceof Error ? error.message : '验证失败';
          }
        }
      }
      return null;
    } finally {
      setValidating(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const setValue = async (fieldName: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (touched[fieldName]) {
      const error = await validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const touchField = async (fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const error = await validateField(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const validateAll = async (): Promise<boolean> => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    const validationPromises = Object.keys(validationRules).map(async (fieldName) => {
      const key = fieldName as keyof T;
      const error = await validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    await Promise.all(validationPromises);

    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Record<keyof T, boolean>));

    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setValidating({});
  };

  return {
    values,
    errors,
    touched,
    validating,
    setValue,
    touchField,
    validateAll,
    reset,
    isValid: Object.keys(errors).every(key => !errors[key as keyof T]),
    isValidating: Object.values(validating).some(Boolean),
  };
};

// 验证结果显示组件
export interface ValidationMessageProps {
  error?: string;
  success?: boolean;
  className?: string;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  error,
  success,
  className = '',
}) => {
  if (!error && !success) return null;

  return React.createElement(
    'div',
    { className: `validation-message ${success ? 'success' : 'error'} ${className}` },
    error || '验证通过'
  );
};