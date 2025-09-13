/**
 * API响应数据统一处理工具
 * 处理不同的API响应格式，确保数据解析的一致性
 */

/**
 * API响应的可能格式类型
 */
export interface ApiResponseFormats {
  // 标准格式: { success: boolean, data: any }
  standard: {
    success: boolean;
    data: any;
    message?: string;
  };
  
  // 备用格式: { response: any, result?: any }
  alternative: {
    response: any;
    result?: any;
  };
  
  // 直接数据格式: 直接返回数据
  direct: any;
}

/**
 * 统一处理API响应数据
 * 支持多种响应格式的自动识别和解析
 * 
 * @param rawResponse - 原始API响应数据
 * @returns 解析后的数据，如果解析失败返回null
 */
export function extractApiData(rawResponse: any): any {
  // 如果响应为空或无效
  if (!rawResponse) {
    return null;
  }
  
  // 兼容 axios 响应拦截器已解包的返回值或原始响应结构
  let response = rawResponse;
  if (typeof rawResponse === 'object' && 'data' in rawResponse && rawResponse.data !== undefined) {
    response = rawResponse.data;
  }
  
  // 处理不同的响应格式
  
  // 格式1: { response: any, result?: any }
  if (response && typeof response === 'object' && 'response' in response) {
    return response.response;
  }
  
  // 格式2: { success: boolean, data: any }
  if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
    if (response.success) {
      return response.data;
    } else {
      // 处理错误情况
      console.warn('API响应表示操作失败:', response.message || '未知错误');
      return null;
    }
  }
  
  // 格式3: 直接数据
  return response;
}

/**
 * 统一处理API响应，确保返回数组格式
 * 
 * @param rawResponse - 原始API响应数据
 * @param fallback - 当解析失败时的默认值
 * @returns 解析后的数组数据
 */
export function extractApiArrayData<T = any>(rawResponse: any, fallback: T[] = []): T[] {
  const data = extractApiData(rawResponse);
  
  if (Array.isArray(data)) {
    return data as T[];
  }
  
  console.debug('API响应数据不是数组格式，使用默认值:', data);
  return fallback;
}

/**
 * 统一处理API响应，确保返回对象格式
 * 
 * @param rawResponse - 原始API响应数据
 * @param fallback - 当解析失败时的默认值
 * @returns 解析后的对象数据
 */
export function extractApiObjectData<T = Record<string, any>>(
  rawResponse: any, 
  fallback: T | null = null
): T | null {
  const data = extractApiData(rawResponse);
  
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as T;
  }
  
  if (data !== null) {
    console.debug('API响应数据不是对象格式，使用默认值:', data);
  }
  return fallback;
}

/**
 * 处理分页API响应
 * 
 * @param rawResponse - 原始API响应数据
 * @returns 分页数据结构
 */
export function extractApiPaginatedData<T = any>(rawResponse: any): {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
} {
  const response = extractApiData(rawResponse);
  
  const defaultPaginatedData = {
    data: [],
    total: 0,
    page: 1,
    pageSize: 10
  };
  
  if (!response || typeof response !== 'object') {
    return defaultPaginatedData;
  }
  
  // 检查标准分页格式
  if ('data' in response && Array.isArray(response.data)) {
    return {
      data: response.data as T[],
      total: response.total || response.data.length,
      page: response.page || response.current_page || 1,
      pageSize: response.pageSize || response.page_size || response.per_page || 10
    };
  }
  
  // 如果响应本身是数组，作为第一页数据处理
  if (Array.isArray(response)) {
    return {
      data: response as T[],
      total: response.length,
      page: 1,
      pageSize: response.length || 10
    };
  }
  
  return defaultPaginatedData;
}

/**
 * 安全地处理API错误响应
 * 
 * @param error - 错误对象
 * @param defaultMessage - 默认错误消息
 * @returns 格式化的错误信息
 */
export function handleApiError(error: any, defaultMessage = '操作失败'): string {
  // 如果错误对象包含响应数据
  if (error?.response?.data) {
    const errorData = error.response.data;
    
    // 检查标准错误格式
    if (errorData.message) {
      return errorData.message;
    }
    
    // 检查其他可能的错误信息字段
    if (errorData.error) {
      return errorData.error;
    }
    
    if (errorData.details) {
      return errorData.details;
    }
  }
  
  // 如果错误对象直接包含消息
  if (error?.message) {
    return error.message;
  }
  
  // 如果是字符串错误
  if (typeof error === 'string') {
    return error;
  }
  
  return defaultMessage;
}

/**
 * 创建统一的API调用包装器
 * 
 * @param apiCall - API调用函数
 * @param options - 配置选项
 * @returns 包装后的API调用结果
 */
export async function callApiWithUnifiedHandling<T>(
  apiCall: () => Promise<any>,
  options: {
    expectArray?: boolean;
    expectObject?: boolean;
    expectPaginated?: boolean;
    fallback?: any;
    errorMessage?: string;
  } = {}
): Promise<T> {
  try {
    const rawResponse = await apiCall();
    
    if (options.expectArray) {
      return extractApiArrayData(rawResponse, options.fallback) as T;
    }
    
    if (options.expectObject) {
      return extractApiObjectData(rawResponse, options.fallback) as T;
    }
    
    if (options.expectPaginated) {
      return extractApiPaginatedData(rawResponse) as T;
    }
    
    return extractApiData(rawResponse) as T;
  } catch (error) {
    const errorMessage = handleApiError(error, options.errorMessage);
    console.error('API调用失败:', errorMessage, error);
    throw new Error(errorMessage);
  }
}