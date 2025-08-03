/**
 * Google API 配置文件
 * 集中管理 Google 服务相关配置
 */

// Google API 配置
export const GOOGLE_CONFIG = {
  // 基础配置
  CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
  API_KEY: process.env.REACT_APP_GOOGLE_API_KEY || '',
  
  // API 作用域
  SCOPES: [
    'https://www.googleapis.com/auth/documents',           // Google Docs 读写权限
    'https://www.googleapis.com/auth/drive.file',          // Google Drive 文件操作权限
    'https://www.googleapis.com/auth/drive.metadata.readonly' // Google Drive 元数据读取权限
  ],
  
  // Discovery 文档 URL
  DISCOVERY_DOCS: [
    'https://docs.googleapis.com/$discovery/rest?version=v1',          // Google Docs API
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'       // Google Drive API
  ],
  
  // GAPI 配置
  GAPI_CONFIG: {
    apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
    discoveryDocs: [
      'https://docs.googleapis.com/$discovery/rest?version=v1',
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
    ],
    scope: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ].join(' ')
  }
};

// 功能开关配置
export const FEATURE_FLAGS = {
  ENABLE_GOOGLE_DOCS: process.env.REACT_APP_ENABLE_GOOGLE_DOCS === 'true',
  ENABLE_COLLABORATION: process.env.REACT_APP_ENABLE_COLLABORATION === 'true',
  ENABLE_INTELLIGENT_SEARCH: process.env.REACT_APP_ENABLE_INTELLIGENT_SEARCH === 'true',
  DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE === 'true'
};

// Google Docs 特定配置
export const GOOGLE_DOCS_CONFIG = {
  // 文档导入配置
  IMPORT: {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_FORMATS: ['application/vnd.google-apps.document'],
    DEFAULT_ENCODING: 'UTF-8'
  },
  
  // 文档导出配置
  EXPORT: {
    DEFAULT_FORMAT: 'application/vnd.google-apps.document',
    FORMATS: {
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      PDF: 'application/pdf',
      ODT: 'application/vnd.oasis.opendocument.text',
      RTF: 'application/rtf',
      TXT: 'text/plain',
      HTML: 'text/html',
      EPUB: 'application/epub+zip'
    }
  },
  
  // 同步配置
  SYNC: {
    POLLING_INTERVAL: 5000,    // 5秒轮询间隔
    MAX_RETRIES: 3,            // 最大重试次数
    TIMEOUT: 30000             // 30秒超时
  },
  
  // 协作配置
  COLLABORATION: {
    MAX_COLLABORATORS: 100,    // 最大协作者数量
    PRESENCE_UPDATE_INTERVAL: 2000, // 2秒更新在线状态
    CURSOR_UPDATE_INTERVAL: 1000    // 1秒更新光标位置
  }
};

// API 限制和配额
export const API_LIMITS = {
  // 请求限制
  REQUESTS_PER_SECOND: 10,
  REQUESTS_PER_MINUTE: 600,
  REQUESTS_PER_DAY: 1000000,
  
  // 批量操作限制
  BATCH_SIZE: 100,
  MAX_CONCURRENT_REQUESTS: 5,
  
  // 缓存配置
  CACHE_TTL: 5 * 60 * 1000,     // 5分钟缓存
  MAX_CACHE_SIZE: 100           // 最大缓存条目数
};

// 错误处理配置
export const ERROR_CONFIG = {
  RETRY_DELAYS: [1000, 2000, 4000], // 重试延迟：1s, 2s, 4s
  MAX_RETRIES: 3,
  
  // 错误类型映射
  ERROR_MESSAGES: {
    NETWORK_ERROR: '网络连接失败，请检查网络设置',
    AUTH_ERROR: 'Google 认证失败，请重新登录',
    PERMISSION_ERROR: '权限不足，请检查文档访问权限',
    QUOTA_EXCEEDED: 'API 配额已超限，请稍后再试',
    DOCUMENT_NOT_FOUND: '文档未找到或已被删除',
    INVALID_FORMAT: '不支持的文档格式',
    FILE_TOO_LARGE: '文件大小超过限制',
    TIMEOUT_ERROR: '请求超时，请重试'
  }
};

// 开发环境配置
export const DEV_CONFIG = {
  // 日志配置
  LOG_LEVEL: process.env.REACT_APP_LOG_LEVEL || 'info',
  ENABLE_DETAILED_LOGS: FEATURE_FLAGS.DEBUG_MODE,
  
  // 模拟数据配置
  USE_MOCK_DATA: process.env.NODE_ENV === 'development' && !GOOGLE_CONFIG.CLIENT_ID,
  MOCK_DELAY: 1000,
  
  // 开发工具
  EXPOSE_SERVICES_TO_WINDOW: process.env.NODE_ENV === 'development'
};

// 验证配置完整性
export const validateGoogleConfig = (): boolean => {
  const requiredFields = [
    { key: 'CLIENT_ID', value: GOOGLE_CONFIG.CLIENT_ID },
    { key: 'API_KEY', value: GOOGLE_CONFIG.API_KEY }
  ];
  
  const missingFields = requiredFields.filter(field => !field.value);
  
  if (missingFields.length > 0) {
    console.error('Missing required Google API configuration:', 
      missingFields.map(f => f.key).join(', '));
    
    if (FEATURE_FLAGS.DEBUG_MODE) {
      }
    
    return false;
  }
  
  return true;
};

// 获取当前配置状态
export const getConfigStatus = () => {
  return {
    isConfigured: validateGoogleConfig(),
    features: FEATURE_FLAGS,
    limits: API_LIMITS,
    clientId: GOOGLE_CONFIG.CLIENT_ID ? 
      `${GOOGLE_CONFIG.CLIENT_ID.slice(0, 20)}...` : 'Not set',
    apiKey: GOOGLE_CONFIG.API_KEY ? 
      `${GOOGLE_CONFIG.API_KEY.slice(0, 10)}...` : 'Not set'
  };
};

// 默认导出配置对象
export default {
  GOOGLE_CONFIG,
  FEATURE_FLAGS,
  GOOGLE_DOCS_CONFIG,
  API_LIMITS,
  ERROR_CONFIG,
  DEV_CONFIG,
  validateGoogleConfig,
  getConfigStatus
};