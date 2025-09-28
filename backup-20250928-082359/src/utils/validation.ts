import React from 'react';
import { AppError, ErrorType } from './errorTypes';

// 数据验证装饰器
export function validate<T extends any[]>(
  ...validators: Array<(args: T) => void>
) {
  return function (target: EventTarget | null, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: T) {
      // 执行所有验证器
      for (const validator of validators) {
        validator(args);
      }
      
      // 执行原始方法
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// 常用验证器
export const Validators = {
  // 验证必填字段
  required: (fieldName: string, index: number = 0) => (args: unknown[]) => {
    const value = args[index];
    if (value === null || value === undefined || value === '') {
      throw new AppError(`${fieldName}不能为空`, ErrorType.VALIDATION);
    }
  },

  // 验证字符串长度
  stringLength: (fieldName: string, min: number, max: number, index: number = 0) => (args: unknown[]) => {
    const value = args[index];
    if (typeof value === 'string') {
      const length = value.trim().length;
      if (length < min || length > max) {
        throw new AppError(
          `${fieldName}长度必须在${min}-${max}字符之间`,
          ErrorType.VALIDATION
        );
      }
    }
  },

  // 验证数字范围
  numberRange: (fieldName: string, min: number, max: number, index: number = 0) => (args: unknown[]) => {
    const value = args[index];
    if (typeof value === 'number') {
      if (value < min || value > max) {
        throw new AppError(
          `${fieldName}必须在${min}-${max}之间`,
          ErrorType.VALIDATION
        );
      }
    }
  },

  // 验证邮箱格式
  email: (fieldName: string, index: number = 0) => (args: unknown[]) => {
    const value = args[index];
    if (typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new AppError(`${fieldName}格式不正确`, ErrorType.VALIDATION);
      }
    }
  },

  // 验证数组长度
  arrayLength: (fieldName: string, min: number, max: number, index: number = 0) => (args: unknown[]) => {
    const value = args[index];
    if (Array.isArray(value)) {
      if (value.length < min || value.length > max) {
        throw new AppError(
          `${fieldName}数量必须在${min}-${max}之间`,
          ErrorType.VALIDATION
        );
      }
    }
  },

  // 验证项目ID
  projectId: (index: number = 0) => (args: unknown[]) => {
    const value = args[index];
    if (typeof value === 'number' && (value <= 0 || !Number.isInteger(value))) {
      throw new AppError('项目ID无效', ErrorType.VALIDATION);
    }
  },

  // 验证任务状态
  taskStatus: (index: number = 0) => (args: unknown[]) => {
    const value = args[index];
    const validStatuses = ['todo', 'in_progress', 'completed', 'cancelled'];
    if (typeof value === 'string' && !validStatuses.includes(value)) {
      throw new AppError('任务状态无效', ErrorType.VALIDATION);
    }
  },
};

// 数据清理和标准化
export class DataSanitizer {
  // 清理字符串
  static sanitizeString(value: any): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  // 确保数字
  static ensureNumber(value: any, defaultValue = 0): number {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  // 确保正整数
  static ensurePositiveInteger(value: any, defaultValue = 1): number {
    const num = typeof value === 'number' ? value : (parseInt(value) || defaultValue);
    return Math.max(1, Math.floor(Math.abs(num)));
  }

  // 确保布尔值
  static ensureBoolean(value: any, defaultValue = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return defaultValue;
  }

  // 清理对象
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          result[key as keyof T] = this.sanitizeString(value) as T[keyof T];
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          result[key as keyof T] = this.sanitizeObject(value) as T[keyof T];
        } else {
          result[key as keyof T] = value;
        }
      }
    }
    
    return result;
  }

  // 清理任务数据
  static sanitizeTask(task: unknown): unknown {
    const taskData = task as any; // Type assertion to handle unknown type
    return {
      ...taskData,
      title: this.sanitizeString(taskData.title),
      description: this.sanitizeString(taskData.description),
      status: taskData.status || 'todo',
      project_id: this.ensurePositiveInteger(taskData.project_id),
      assignee_id: taskData.assignee_id ? this.ensurePositiveInteger(taskData.assignee_id) : null,
      parent_id: taskData.parent_id ? this.ensurePositiveInteger(taskData.parent_id) : null,
      sort_order: this.ensureNumber(taskData.sort_order, 0),
    };
  }

  // 清理分页参数
  static sanitizePagination(params: unknown): unknown {
    const typedParams = params as { page?: number; page_size?: number } | null | undefined;
    return {
      page: this.ensurePositiveInteger(typedParams?.page, 1),
      page_size: Math.min(100, this.ensurePositiveInteger(typedParams?.page_size, 20)),
    };
  }
}

// 表单验证Hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, Array<(value: any) => void>>
) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = (fieldName: keyof T, value: any): string | null => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    try {
      for (const rule of rules) {
        rule(value);
      }
      return null;
    } catch (error) {
      if (error instanceof AppError) {
        return error.message;
      }
      return '验证失败';
    }
  };

  const setValue = (fieldName: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // 如果字段已被触摸过，立即验证
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const touchField = (fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // 触摸时验证
    const error = validateField(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const fieldName of Object.keys(validationRules) as Array<keyof T>) {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    }

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
  };

  return {
    values,
    errors,
    touched,
    setValue,
    touchField,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}