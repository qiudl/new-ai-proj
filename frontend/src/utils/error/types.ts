/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 网络错误 - 请求失败、超时等 */
  NETWORK = 'NETWORK',

  /** 权限错误 - 401、403等 */
  PERMISSION = 'PERMISSION',

  /** 业务错误 - 数据验证失败、业务规则冲突等 */
  BUSINESS = 'BUSINESS',

  /** 系统错误 - 500、服务不可用等 */
  SYSTEM = 'SYSTEM',

  /** 客户端错误 - 参数错误、状态错误等 */
  CLIENT = 'CLIENT',

  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/**
 * 标准化错误对象
 */
export interface AppError {
  /** 错误类型 */
  type: ErrorType;

  /** 错误代码 */
  code: string;

  /** 错误消息（给用户看） */
  message: string;

  /** 详细错误信息（用于调试） */
  detail?: string;

  /** 原始错误对象 */
  originalError?: any;

  /** 建议的操作 */
  suggestion?: string;

  /** 是否可重试 */
  retryable: boolean;

  /** 时间戳 */
  timestamp: number;
}

/**
 * 错误处理器配置
 */
export interface ErrorHandlerConfig {
  /** 是否显示消息提示 */
  showMessage?: boolean;

  /** 是否记录日志 */
  logError?: boolean;

  /** 是否上报错误 */
  reportError?: boolean;

  /** 自定义错误消息 */
  customMessage?: string;

  /** 错误发生后的回调 */
  onError?: (error: AppError) => void;

  /** 重试回调 */
  onRetry?: () => void;
}

/**
 * 业务错误码
 */
export enum BusinessErrorCode {
  /** 文件夹名称重复 */
  FOLDER_NAME_DUPLICATE = 'BIZ_FOLDER_NAME_DUPLICATE',

  /** 文件夹不为空 */
  FOLDER_NOT_EMPTY = 'BIZ_FOLDER_NOT_EMPTY',

  /** 循环引用 */
  CIRCULAR_REFERENCE = 'BIZ_CIRCULAR_REFERENCE',

  /** 文件夹不存在 */
  FOLDER_NOT_FOUND = 'BIZ_FOLDER_NOT_FOUND',

  /** 文件夹已删除 */
  FOLDER_DELETED = 'BIZ_FOLDER_DELETED',

  /** 包含笔记 */
  HAS_NOTES = 'BIZ_HAS_NOTES',

  /** 包含子文件夹 */
  HAS_SUBFOLDERS = 'BIZ_HAS_SUBFOLDERS',
}
