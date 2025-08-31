// 前端数据验证工具
import { CustomFields } from '../types/task';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  cleanedData?: any;
}

/**
 * 验证和清理CustomFields数据格式
 */
export function validateAndCleanCustomFields(input: unknown): ValidationResult {
  if (input === null || input === undefined) {
    return {
      isValid: true,
      cleanedData: {}
    };
  }

  // 如果输入是数组格式，转换为对象
  if (Array.isArray(input)) {
    try {
      const merged = mergeArrayToObject(input);
      return {
        isValid: true,
        cleanedData: merged
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Cannot convert array to CustomFields: ${error}`
      };
    }
  }

  // 如果输入是字符串，尝试解析
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return validateAndCleanCustomFields(parsed);
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid JSON string in CustomFields: ${error}`
      };
    }
  }

  // 如果输入是对象，验证内容
  if (typeof input === 'object') {
    try {
      const cleaned = cleanCustomFieldsObject(input);
      return {
        isValid: true,
        cleanedData: cleaned
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid CustomFields object: ${error}`
      };
    }
  }

  return {
    isValid: false,
    error: 'CustomFields must be an object, array, or JSON string'
  };
}

/**
 * 合并数组格式的数据到对象
 */
function mergeArrayToObject(arr: unknown[]): CustomFields {
  const result: CustomFields = {};
  
  for (const item of arr) {
    if (item === null || item === undefined) {
      continue;
    }
    
    if (typeof item === 'object' && !Array.isArray(item)) {
      Object.entries(item).forEach(([key, value]) => {
        if (key && value !== null && value !== undefined) {
          result[key] = value;
        }
      });
    }
  }
  
  return result;
}

/**
 * 清理CustomFields对象
 */
function cleanCustomFieldsObject(obj: unknown): CustomFields {
  const result: CustomFields = {};
  
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return result;
  }
  
  Object.entries(obj).forEach(([key, value]) => {
    if (!key || value === null || value === undefined) {
      return;
    }
    
    // 验证特定字段
    switch (key) {
      case 'priority':
        if (typeof value === 'string' && ['low', 'medium', 'high'].includes(value)) {
          result[key] = value;
        }
        break;
        
      case 'tags':
        result[key] = cleanTagsArray(value);
        break;
        
      case 'estimated_hours':
        const hours = parseFloat(value as string);
        if (!isNaN(hours) && hours >= 0) {
          result[key] = hours;
        }
        break;
        
      case 'progress':
        const progress = parseFloat(value as string);
        if (!isNaN(progress) && progress >= 0 && progress <= 100) {
          result[key] = progress;
        }
        break;
        
      default:
        // 对于其他字段，确保可以JSON序列化
        try {
          JSON.stringify(value);
          result[key] = value;
        } catch {
          console.warn(`CustomFields[${key}] is not JSON serializable, skipping`);
        }
    }
  });
  
  return result;
}

/**
 * 清理tags数组
 */
function cleanTagsArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(tag => typeof tag === 'string' && tag.trim() !== '')
      .map(tag => tag.trim());
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  
  return [];
}

/**
 * 验证TaskRequest数据
 */
export function validateTaskRequest(taskData: unknown): ValidationResult {
  if (!taskData) {
    return {
      isValid: false,
      error: 'Task data is required'
    };
  }

  const cleaned: any = { ...(taskData as any) };

  // 标题校验（可选）：如果提供则必须为非空字符串
  if (cleaned.title !== undefined) {
    if (typeof cleaned.title !== 'string' || cleaned.title.trim() === '') {
      return {
        isValid: false,
        error: 'Title must be a non-empty string if provided'
      };
    }
    // 清理title
    cleaned.title = cleaned.title.trim();
  }

  // 验证status（扩展为完整工作流，且为可选字段）
  const validStatuses = ['draft','planning','todo','in_progress','testing','completed','cancelled','on_hold','suspended','blocked','archived'];
  if (cleaned.status !== undefined && cleaned.status !== null) {
    if (typeof cleaned.status !== 'string' || !validStatuses.includes(cleaned.status)) {
      return {
        isValid: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`
      };
    }
  }

  // 验证和清理CustomFields
  if (cleaned.custom_fields !== undefined) {
    const customFieldsResult = validateAndCleanCustomFields(cleaned.custom_fields);
    if (!customFieldsResult.isValid) {
      return {
        isValid: false,
        error: customFieldsResult.error
      };
    }
    cleaned.custom_fields = customFieldsResult.cleanedData;
  }

  // 验证parent_id
  if (cleaned.parent_id !== undefined && cleaned.parent_id !== null) {
    const parentId = parseInt(String(cleaned.parent_id));
    if (isNaN(parentId) || parentId <= 0) {
      return {
        isValid: false,
        error: 'parent_id must be a positive integer or null'
      };
    }
    cleaned.parent_id = parentId;
  }

  return {
    isValid: true,
    cleanedData: cleaned
  };
}

/**
 * 在发送API请求前清理数据
 */
export function sanitizeForAPI(data: Record<string, unknown>): unknown {
  if (!data) return data;

  // 处理CustomFields
  if (data.custom_fields) {
    const result = validateAndCleanCustomFields(data.custom_fields);
    if (result.isValid) {
      data.custom_fields = result.cleanedData;
    } else {
      console.warn('Invalid custom_fields detected, setting to empty object:', result.error);
      data.custom_fields = {};
    }
  }

  return data;
}

/**
 * 从API响应中清理数据
 */
export function sanitizeFromAPI(data: Record<string, unknown>): unknown {
  if (!data) return data;

  // 如果是任务数组
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFromAPI(item));
  }

  // 如果是单个任务对象
  if (data.custom_fields) {
    const result = validateAndCleanCustomFields(data.custom_fields);
    if (result.isValid) {
      data.custom_fields = result.cleanedData;
    } else {
      console.warn('Invalid custom_fields in API response, setting to empty object:', result.error);
      data.custom_fields = {};
    }
  }

  return data;
}